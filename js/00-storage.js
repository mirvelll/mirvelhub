/* =========================================================
   MIRVEL HUB — 00-storage.js
   Подключается в index.html ПЕРВЫМ (без defer).

   Зачем: localStorage в браузере ограничен ~5 МБ и этот лимит изменить нельзя.
   Поэтому данные хаба теперь лежат в IndexedDB — там места в разы больше
   (браузер выдаёт десятки/сотни МБ и больше). Счётчик в «Настройках» показывает
   «мягкий» лимит 200 МБ (или меньше, если браузер выдал меньше места).

   Что делает файл:
   1. Открывает IndexedDB и читает данные (старые данные из localStorage
      переносятся автоматически, один раз).
   2. Если IndexedDB недоступна (редкие режимы приватности) — работает как раньше, на localStorage.
   3. Даёт window.MirvelStore: save(data), flush(), size, limit, mode.
   4. Подгружает остальные скрипты строго по порядку и сообщает событием «mirvel-ready».
   ========================================================= */
(() => {
    const DB_NAME = 'mirvel_hub';
    const STORE = 'kv';
    const KEY = 'main';
    const LS_KEY = 'mirvel_data';
    const MB = 1024 * 1024;
    const SOFT_LIMIT = 200 * MB;     // «лимит» из счётчика в настройках
    const LS_LIMIT = 5 * MB;         // типичный лимит localStorage (режим запасного хранения)
    const DEBOUNCE_MS = 250;
    const JOURNAL_KEY = 'mirvel_journal';   // «аварийная копия» правок при закрытии вкладки (см. ниже)
    const IMG_MARK = '\u0001img';
    const JOURNAL_MAX = 3 * MB;

    const SCRIPTS = [
        '00-utils.js', '01-state.js', '02-audio.js', '03-achievements.js', '04-quick-add.js', '05-quotes.js',
        '06-crate-digger.js', '07-purchase.js', '08-core.js', '09-collections.js', '10-analytics.js',
        '11-render.js', '12-app.js', '13-extras.js', '14-listen.js', '15-price.js', '16-games.js',
        '17-convenience.js', 'i18n-dict.js', 'i18n.js', '18-hub2.js', '19-features.js', '20-music-detail.js', '21-optimize.js', '22-wishlist.js', '23-sounds.js',
        '24-share-collection.js', '25-bulk.js', '26-steam.js'
    ];
    const BUILD = '16.5';   // меняется при обновлении файлов — браузер не берёт старые скрипты из кеша

    const store = {
        mode: 'ls',            // 'idb' | 'ls'
        boot: {},              // данные, прочитанные при запуске
        size: 0,               // примерный размер данных, байт
        limit: LS_LIMIT,       // лимит для счётчика, байт
        quota: 0,              // реальная квота браузера (если известна)
        failed: false,         // последняя запись не удалась
        migrated: false,
        fallbackReason: '',    // почему включился запасной режим (localStorage)
        onError: null,         // (error) => void — выставляет 08-core.js
        onExternal: null       // (data) => void — данные изменили в другой вкладке
    };
    window.MirvelStore = store;

    let db = null, current = null, dirty = false, writing = false, timer = null, bc = null;

    /* ---------- IndexedDB ---------- */
    function openDB() {
        return new Promise((resolve, reject) => {
            if (!('indexedDB' in window)) return reject(new Error('IndexedDB недоступна'));
            let req;
            try { req = indexedDB.open(DB_NAME, 1); } catch (e) { return reject(e); }
            req.onupgradeneeded = () => req.result.createObjectStore(STORE);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
            req.onblocked = () => reject(new Error('IndexedDB заблокирована'));
        });
    }
    const idbGet = key => new Promise((resolve, reject) => {
        const r = db.transaction(STORE, 'readonly').objectStore(STORE).get(key);
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(r.error);
    });
    const idbPut = (key, value) => new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).put(value, key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error || new Error('Запись отменена'));
    });

    /* ---------- localStorage (старые данные / запасной режим) ---------- */
    function readLS() {
        let raw = null;
        try {
            raw = localStorage.getItem(LS_KEY);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
        } catch (e) {
            console.warn('[MIRVEL] Не удалось прочитать данные, делаю резервную копию:', e);
            try { localStorage.setItem(`${LS_KEY}_corrupt_${Date.now()}`, raw || ''); } catch (_) {}
            return null;
        }
    }

    /* Примерный размер: сумма длин всех строк (картинки — это длинные base64-строки) */
    function approxBytes(value) {
        let total = 0;
        const stack = [value];
        while (stack.length) {
            const v = stack.pop();
            if (typeof v === 'string') total += v.length;
            else if (Array.isArray(v)) { total += 2; for (const x of v) stack.push(x); }
            else if (v && typeof v === 'object') {
                for (const k of Object.keys(v)) { total += k.length + 4; stack.push(v[k]); }
            } else total += 6;
        }
        return total;
    }

    /* ---------- Аварийный журнал ----------
       Браузер не гарантирует, что запись в IndexedDB дойдёт до конца, если вкладку закрыли/перезагрузили
       в ту же долю секунды (localStorage писал синхронно и такой проблемы не имел).
       Поэтому при выгрузке страницы, если есть несохранённые правки, мы синхронно кладём в localStorage
       лёгкую копию данных (без картинок — они помечаются). При следующем запуске она подмешивается
       к данным из IndexedDB, а картинки берутся оттуда. */
    function journalWrite() {
        if (store.mode !== 'idb' || !current || !(dirty || writing)) return;
        try {
            const text = JSON.stringify({ t: Date.now(), d: current },
                (k, v) => (typeof v === 'string' && v.length > 1000 && v.startsWith('data:')) ? IMG_MARK : v);
            if (text.length < JOURNAL_MAX) localStorage.setItem(JOURNAL_KEY, text);
        } catch (_) {}
    }
    function restoreFromJournal(j, base) {
        if (j === IMG_MARK) return typeof base === 'string' ? base : '';
        if (Array.isArray(j)) {
            const arr = Array.isArray(base) ? base : [];
            return j.map((x, i) => {
                const b = (x && typeof x === 'object' && 'id' in x) ? arr.find(y => y && y.id === x.id) : arr[i];
                return restoreFromJournal(x, b);
            });
        }
        if (j && typeof j === 'object') {
            const out = {};
            for (const k of Object.keys(j)) out[k] = restoreFromJournal(j[k], base && typeof base === 'object' ? base[k] : undefined);
            return out;
        }
        return j;
    }
    function takeJournal() {
        let raw = null;
        try { raw = localStorage.getItem(JOURNAL_KEY); } catch (_) {}
        if (!raw) return null;
        try { localStorage.removeItem(JOURNAL_KEY); } catch (_) {}
        try { const j = JSON.parse(raw); return j && j.d && typeof j.d === 'object' ? j.d : null; } catch (_) { return null; }
    }

    /* ---------- Запись ---------- */
    function fail(e) {
        store.failed = true;
        console.error('[MIRVEL] Ошибка записи:', e);
        try { store.onError && store.onError(e); } catch (_) {}
    }

    function writeNow() {
        if (!current) return Promise.resolve(true);
        dirty = false;
        writing = true;
        store.size = approxBytes(current);

        let p;
        if (store.mode === 'idb') {
            p = idbPut(KEY, current);
        } else {
            p = new Promise((resolve, reject) => {
                try { localStorage.setItem(LS_KEY, JSON.stringify(current)); resolve(); } catch (e) { reject(e); }
            });
        }
        return p.then(() => {
            store.failed = false;
            try { localStorage.removeItem(JOURNAL_KEY); } catch (_) {}
            try { bc && bc.postMessage({ t: Date.now() }); } catch (_) {}
            return true;
        }).catch(e => { fail(e); return false; })
          .finally(() => { writing = false; if (dirty) schedule(0); });
    }

    function schedule(delay = DEBOUNCE_MS) {
        clearTimeout(timer);
        timer = setTimeout(() => { timer = null; if (!writing) writeNow(); else dirty = true; }, delay);
    }

    /** Вызывается из persistData(). IndexedDB: запись откладывается на ~250 мс (пачка изменений = одна запись). */
    store.save = function (data) {
        current = data;
        dirty = true;
        if (store.mode === 'ls') {          // как раньше: сразу и с результатом
            let ok = true;
            store.size = approxBytes(data);
            try { localStorage.setItem(LS_KEY, JSON.stringify(data)); store.failed = false; }
            catch (e) { ok = false; fail(e); }
            dirty = false;
            return ok;
        }
        schedule();
        return !store.failed;
    };

    /** Дописать на диск прямо сейчас (при сворачивании вкладки / закрытии) */
    store.flush = function () {
        if (timer) { clearTimeout(timer); timer = null; }
        if (dirty && !writing) return writeNow();
        return Promise.resolve(true);
    };

    store.refreshQuota = async function () {
        try {
            if (store.mode !== 'idb' || !navigator.storage?.estimate) return;
            const est = await navigator.storage.estimate();
            if (est.quota) {
                store.quota = est.quota;
                store.limit = Math.min(SOFT_LIMIT, Math.floor(est.quota * 0.9));
            }
        } catch (_) {}
    };

    /* Слушатели вешаем ПОСЛЕ загрузки всех скриптов: у 16-games и 20-music-detail свои обработчики pagehide,
       которые дописывают последнюю правку заметки — сброс на диск должен сработать уже после них. */
    function armFlush() {
        document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') { journalWrite(); store.flush(); } });
        window.addEventListener('pagehide', () => { journalWrite(); store.flush(); });
    }

    /* ---------- Синхронизация между вкладками ---------- */
    function setupSync() {
        if (store.mode === 'idb' && 'BroadcastChannel' in window) {
            bc = new BroadcastChannel('mirvel_hub_sync');
            bc.onmessage = async () => {
                if (dirty || writing) return;        // у этой вкладки есть несохранённые правки — не затираем
                try {
                    const v = await idbGet(KEY);
                    if (v && store.onExternal) store.onExternal(v);
                } catch (_) {}
            };
        } else {
            window.addEventListener('storage', e => {
                if (e.key !== LS_KEY || !e.newValue) return;
                try { const v = JSON.parse(e.newValue); if (v && store.onExternal) store.onExternal(v); } catch (_) {}
            });
        }
    }

    /* ---------- Запуск ---------- */
    async function boot() {
        try {
            db = await openDB();
            let value = await idbGet(KEY);
            if (!value) {
                const legacy = readLS();
                if (legacy) {
                    // переносим из localStorage и проверяем, что записалось целиком
                    await idbPut(KEY, legacy);
                    const back = await idbGet(KEY);
                    if (back && JSON.stringify(back).length === JSON.stringify(legacy).length) {
                        store.migrated = true;
                        try { localStorage.removeItem(LS_KEY); } catch (_) {}
                    }
                    value = legacy;
                }
            }
            store.mode = 'idb';
            store.limit = SOFT_LIMIT;
            const journal = takeJournal();
            if (journal && value) {                        // правки, которые не успели записаться при закрытии вкладки
                value = restoreFromJournal(journal, value);
                try { await idbPut(KEY, value); } catch (e) { console.warn('[MIRVEL] журнал: не записался', e); }
                console.info('[MIRVEL] Восстановлены правки из аварийного журнала');
            }
            store.boot = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
            try { navigator.storage?.persist?.(); } catch (_) {}   // просим браузер не вычищать данные
        } catch (e) {
            console.warn('[MIRVEL] IndexedDB недоступна, работаю на localStorage:', e);
            db = null;
            store.fallbackReason = String((e && e.message) || e);
            store.mode = 'ls';
            store.limit = LS_LIMIT;
            store.boot = readLS() || {};
        }
        store.size = approxBytes(store.boot);
        setupSync();
        store.refreshQuota();
    }

    function loadScripts(i) {
        if (i >= SCRIPTS.length) { armFlush(); document.dispatchEvent(new Event('mirvel-ready')); return; }
        const s = document.createElement('script');
        s.src = 'js/' + SCRIPTS[i] + '?v=' + BUILD;
        s.onload = () => loadScripts(i + 1);
        s.onerror = () => { console.warn('[MIRVEL] Не загрузился скрипт:', SCRIPTS[i]); loadScripts(i + 1); };
        document.body.appendChild(s);
    }

    boot().then(() => loadScripts(0));
})();
