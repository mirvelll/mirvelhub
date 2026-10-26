/* =========================================================
   MIRVEL HUB — 46-game-achievements.js (подключается после 45-wishlist-games.js)
   Список ачивок внутри игры, как в Steam / PSN:
   • на странице игры появляется блок «Список ачивок» — открывает окно со списком;
   • ачивки можно добавить пачкой (вставка текста, .txt / .csv / .json) или по одной;
   • галочка = получено (запоминается дата); фильтры «Осталось / Получено», поиск;
   • когда отмечено всё — игра сама получает 100% («платина»), это учитывает «Охотник за трофеями».
   Данные: game.achList = [{ id, n (название), d (описание), done (bool), ts (дата), g (ключ группы, у «Основной игры» не пишется) }].
   Группы: game.achGroups = [{ key, title, dlcId|null }]; группа 'base' = «Основная игра» (хранить не нужно).
   Группа, привязанная к дополнению (dlcId), которое не куплено (dlc.owned !== true), «🔒 заблокирована»:
   ачивки видно, отметить нельзя, в общий зачёт 100% она не входит. Старые списки без групп работают как раньше.
   Старые поля trophy / trophyDone / trophyTotal обновляются автоматически, ничего не ломается.
   ========================================================= */
(() => {
    'use strict';
    const $ = id => document.getElementById(id);
    const gameById = id => (data.games || []).find(x => x.id === Number(id));
    const MAX_LIST = 1000;

    /* Промпт для нейросети: скриншоты ачивок → готовый текст для импорта (лежит и в Настройки → Промпты) */
    /* Предыдущий встроенный текст — нужен только чтобы понять, правил ли ты сохранённую копию в «Промптах» */
    window.MH_ACH_PROMPT_OLD = `Ты помогаешь перенести ачивки игры в мою коллекцию. Я пришлю скриншоты со списком ачивок. Перепиши КАЖДУЮ ачивку отдельной строкой строго в таком формате:

Название — Описание — ДД.ММ.ГГГГ

Правила:
1. Одна ачивка = одна строка. Без нумерации, маркеров, заголовков и комментариев.
2. Дата — когда ачивка получена, в формате ДД.ММ.ГГГГ. Если на скриншоте дата в другом виде (например «12 мар. 2024»), переведи её в этот формат.
3. Если ачивка не получена (серая, закрытая, без даты) — дату не пиши, оставь только «Название — Описание».
4. Если описание скрыто или его нет — оставь только «Название» (и дату, если она есть).
5. Тексты оставляй такими, как на скриншоте, на языке оригинала. Ничего не придумывай и не пропускай. Проценты редкости («12.3% игроков») не пиши.
6. Между скриншотами не должно быть повторов: если ачивка попала на два скрина, оставь её один раз.
7. Весь ответ дай одним блоком кода, чтобы я мог скопировать его целиком.`;
    window.MH_ACH_PROMPT = `Ты переносишь ачивки игры в мою коллекцию. Я пришлю скриншоты со списком ачивок. Твоя задача — переписать их в текст СТРОГО по правилам ниже. Время не ограничено: работай внимательно, лучше медленно, но точно.

ШАГ 0 — ПРОВЕРКА В ИНТЕРНЕТЕ (ОБЯЗАТЕЛЬНО, если у тебя есть доступ к поиску):
На скриншотах часто НЕ написано, что ачивка относится к DLC (например, «Завершить оба пути» может быть из дополнения). Поэтому:
1. Определи игру по скриншотам и найди в интернете полный список её ачивок с разбивкой на основную игру и DLC (Steam: страница ачивок игры, PSNProfiles, TrueAchievements, Exophase, Steam Community Guides, wiki игры).
2. Узнай, какие у игры есть DLC и сколько в них ачивок.
3. Сверь КАЖДУЮ ачивку со скриншотов с этим списком по названию и описанию и определи, к какой группе она принадлежит. Не полагайся на то, что на скриншоте нет пометки «DLC».
4. Если интернета нет или данные не нашлись — действуй по правилам ниже и в конце ответа (ВНЕ блока кода) одной строкой напиши, что группы не удалось проверить.

ФОРМАТ ОДНОЙ АЧИВКИ (одна строка):
Название — Описание — ДД.ММ.ГГГГ

ГРУППЫ (ОСНОВНАЯ ИГРА И DLC) — ОБЯЗАТЕЛЬНО:
Перед каждой группой ачивок пиши строку-заголовок, начинающуюся с символа # и пробела:
# Основная игра
# DLC: <название дополнения>
Правила для групп:
- Ачивки DLC НЕ смешивай с основной игрой: на каждое дополнение свой заголовок «# DLC: …» и его ачивки под ним — даже если на скриншоте нет никакой пометки, но проверка в интернете показала, что ачивка из DLC.
- Платиновый трофей / ачивку «получить все» относи к той группе, к которой она принадлежит (платина DLC — к DLC, платина игры — к основной игре).
- Если ты не смог определить группу — отнеси к «# Основная игра».
- Если у игры нет DLC, всё равно начни ответ со строки «# Основная игра».
- Заголовки с # пиши всегда.

ДРУГИЕ ПРАВИЛА:
1. Одна ачивка = одна строка, без нумерации и маркеров.
2. Дата — когда ачивка получена, формат ДД.ММ.ГГГГ. Если на скриншоте дата в другом виде («12 мар. 2024», «March 12, 2024»), переведи её.
3. Не получена (серая, закрытая, без даты) — дату не пиши: «Название — Описание».
4. Описание скрыто или отсутствует — оставь «Название» (в интернете можно уточнить описание, но не выдумывай).
5. Тексты оставляй как на скриншоте, на языке оригинала. Не пропускай ачивки со скриншотов. Проценты редкости («12.3% игроков») не пиши.
6. Если ачивка попала на два скриншота, оставь её один раз.
7. Не добавляй пояснений, приветствий и итогов (кроме строки из шага 0, если группы не удалось проверить).
8. Основной ответ дай ОДНИМ блоком кода (тройные обратные кавычки), чтобы символы # не превратились в заголовки.`;
    /* Шаблон «Гайд по оставшимся ачивкам»: {игра} {платформа} {памятка} {список} подставляет кнопка «Скопировать оставшиеся для гайда» (этап F2) */
    window.MH_ACH_GUIDE = `Помоги мне добить платину в игре {игра} ({платформа}).

Моя памятка: {памятка или «нет»}

Оставшиеся ачивки (группа — название — описание, счётчик если есть):
{список}

Что нужно:
1. Проверь в интернете (гайды, Steam/PSNProfiles/TrueAchievements, wiki), какие из этих ачивок можно ПРОПУСТИТЬ БЕЗ ВОЗВРАТА (привязаны к главе, выбору, одноразовому событию) и отметь их ⚠️.
2. Составь короткий маршрут добивания: что и в каком порядке выгоднее делать (что можно совместить, что отдельным прохождением, что сначала).
3. Для сложных ачивок дай конкретные советы (как получить, где искать), без воды.
4. Если часть ачивок относится к DLC, которое у меня не куплено («DLC не куплено»), вынеси их в отдельный блок в конце.
5. Ответь по шагам, коротко, без вступлений.`;
    const norm = s => String(s || '').toLowerCase().replace(/[™®©’'"“”«»\s]+/g, ' ').trim();
    const uid = () => 'a' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    const dateVal = ts => { try { const d = new Date(ts); const p = n => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; } catch (_) { return ''; } };
    const fmt = ts => { try { return new Date(ts).toLocaleDateString('ru-RU'); } catch (_) { return ''; } };
    const toast = (m, t) => { try { showToast(m, t); } catch (_) {} };

    const listOf = g => (g && Array.isArray(g.achList)) ? g.achList : [];
    const nk = x => norm(x).replace(/[^a-z0-9а-яёіїєґ]+/gi, '');            // сравнение названий без знаков и регистра
    const dlcList = g => (g && Array.isArray(g.dlcs)) ? g.dlcs : [];
    const BASE = 'base', BASE_TITLE = 'Основная игра';
    const keyOf = a => (a && a.g) || BASE;

    /* ---------- группы ---------- */
    const storedGroups = g => (g && Array.isArray(g.achGroups)) ? g.achGroups : [];
    /** Все группы игры: «Основная игра» первой, дальше сохранённые (и «осиротевшие» ключи из самих ачивок) */
    function groupsOf(g) {
        const out = [{ key: BASE, title: BASE_TITLE, dlcId: null }];
        const seen = new Set([BASE]);
        storedGroups(g).forEach(x => { if (x && x.key && !seen.has(x.key)) { seen.add(x.key); out.push({ key: x.key, title: x.title || 'Группа', dlcId: x.dlcId || null }); } });
        listOf(g).forEach(a => { const k = keyOf(a); if (!seen.has(k)) { seen.add(k); out.push({ key: k, title: 'Группа', dlcId: null }); } });
        return out;
    }
    /** Привязанное дополнение группы (если оно есть в game.dlcs) */
    const dlcOfGroup = (g, grp) => (grp && grp.dlcId) ? (dlcList(g).find(d => d.id === grp.dlcId) || null) : null;
    /** 🔒 Группа привязана к дополнению, которое не куплено. Если дополнение удалено — группа считается обычной. */
    const isLocked = (g, grp) => { const d = dlcOfGroup(g, grp); return !!d && d.owned !== true; };
    const lockedKey = (g, key) => { const grp = groupsOf(g).find(x => x.key === key); return !!grp && isLocked(g, grp); };

    function groupStats(g, grp) {
        const l = listOf(g).filter(a => keyOf(a) === grp.key);
        const done = l.filter(a => a.done).length;
        return { total: l.length, done, left: l.length - done, pct: l.length ? Math.round(done / l.length * 100) : 0,
                 full: l.length > 0 && done >= l.length, locked: isLocked(g, grp) };
    }
    /** Общий прогресс: только учитываемые группы (основная игра + купленные DLC + группы без привязки) */
    const stats = g => {
        let total = 0, done = 0, lockedN = 0;
        groupsOf(g).forEach(grp => {
            const s = groupStats(g, grp);
            if (s.locked) { lockedN += s.total; return; }
            total += s.total; done += s.done;
        });
        return { total, done, left: total - done, pct: total ? Math.round(done / total * 100) : 0, locked: lockedN };
    };

    /* Приводит прежние поля (trophy / done / total) в соответствие со списком */
    function sync(g) {
        const s = stats(g);
        if (!s.total) return s;
        g.trophyTotal = s.total;
        g.trophyDone = s.done;
        g.trophy = s.done >= s.total ? 'full' : 'some';
        return s;
    }
    /** Пересчёт счётчиков для всех игр со списками: вызывается, когда меняется «куплено» у DLC (37-game-dlc.js, 38-game-sync.js). */
    function syncAll() {
        let ch = false;
        (data.games || []).forEach(g => {
            if (!listOf(g).length) return;
            const before = g.trophyDone + '/' + g.trophyTotal + g.trophy;
            sync(g);
            if (before !== g.trophyDone + '/' + g.trophyTotal + g.trophy) ch = true;
        });
        return ch;
    }
    window.mhAchSync = g => (g ? sync(g) : syncAll());
    window.mhAchSyncAll = syncAll;

    /** Создаёт дополнение «в планах» (не куплено); поля как у формы в 37-game-dlc.js */
    function newDlc(g, title) {
        const d = { id: 'd' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), title: String(title).slice(0, 120), type: 'dlc', price: 0, approx: false,
                    date: '', owned: false, img: '', from: [], free: '', giftFrom: '', rating: 0, url: '', note: '', status: '', done: false };
        if (!Array.isArray(g.dlcs)) g.dlcs = [];
        g.dlcs.push(d);
        return d;
    }
    /** Запись группы в g.achGroups (создаётся, если группа пока «осиротевшая»); для «Основной игры» не нужна */
    function storedGroup(g, key) {
        if (!Array.isArray(g.achGroups)) g.achGroups = [];
        let x = g.achGroups.find(y => y.key === key);
        if (!x) {
            const src = groupsOf(g).find(y => y.key === key);
            x = { key, title: src ? src.title : 'Группа', dlcId: null };
            g.achGroups.push(x);
        }
        return x;
    }

    /* Находит (или создаёт) группу по названию и возвращает её ключ; для DLC-группы ещё привязывает/создаёт дополнение */
    function ensureGroup(g, grp, stat) {
        if (!grp || grp.base) return BASE;
        if (!Array.isArray(g.achGroups)) g.achGroups = [];
        const k = nk(grp.title);
        let ex = g.achGroups.find(x => nk(x.title) === k);
        if (!ex) {
            let key = 'x-' + (norm(grp.title).replace(/[^a-z0-9а-яёіїєґ]+/gi, '-').replace(/^-|-$/g, '').slice(0, 40) || 'g');
            while (g.achGroups.some(x => x.key === key) || key === BASE) key += '_';
            ex = { key, title: grp.title.slice(0, 80), dlcId: null };
            g.achGroups.push(ex);
            stat.groups++;
        }
        if (grp.dlc && !(ex.dlcId && dlcList(g).some(d => d.id === ex.dlcId))) {
            let d = dlcList(g).find(x => nk(x.title) === k);
            if (!d) {
                d = newDlc(g, grp.title);   // дополнения ещё нет — создаём «в планах»
                stat.dlcs++;
            }
            ex.dlcId = d.id;
        }
        return ex.key;
    }

    function commit(g, wasFull) {
        const s = sync(g);
        try { checkAchievements(); } catch (_) {}
        persistData();
        try { updateUI(); } catch (_) {}
        if (s.total && s.done >= s.total && !wasFull) toast(`🏆 <b>${esc(g.title)}</b> — все ${s.total} ачивок получены! Платина!`, 'success');
        return s;
    }

    /* ================= F1: тип трофея, очки, уровень ================= */
    const TT = { bronze: { pts: 15, ico: '🥉', name: 'Бронза' }, silver: { pts: 30, ico: '🥈', name: 'Серебро' }, gold: { pts: 90, ico: '🥇', name: 'Золото' }, platinum: { pts: 300, ico: '💎', name: 'Платина' } };
    const TT_ALIAS = { bronze: 'bronze', bronz: 'bronze', 'бронза': 'bronze', silver: 'silver', 'серебро': 'silver', gold: 'gold', 'золото': 'gold', platinum: 'platinum', plat: 'platinum', 'платина': 'platinum' };
    const ttOf = a => (a && TT[a.tt] ? a.tt : '');
    const lvlCum = L => Math.round(100 * Math.pow(Math.max(0, L - 1), 1.6));        // сколько очков нужно, чтобы достичь уровня L
    /** Очки считаются каждый раз из текущего состояния: сумма по полученным ачивкам с типом (группы некупленных DLC не считаются) */
    function trophyPoints(g) {
        let pts = 0, max = 0;
        const by = { bronze: 0, silver: 0, gold: 0, platinum: 0 };
        (g ? [g] : (data.games || [])).forEach(x => listOf(x).forEach(a => {
            const t = ttOf(a); if (!t || lockedKey(x, keyOf(a))) return;
            max += TT[t].pts;
            if (a.done) { pts += TT[t].pts; by[t]++; }
        }));
        let L = Math.min(999, Math.floor(Math.pow(pts / 100, 1 / 1.6)) + 1);
        const lo = lvlCum(L), hi = lvlCum(L + 1);
        return { pts, max, by, level: L, pct: hi > lo ? Math.max(0, Math.min(100, Math.round((pts - lo) / (hi - lo) * 100))) : 100, next: hi - pts, any: max > 0 };
    }
    window.mhTrophyPoints = trophyPoints;
    const ttTagRe = /\s*[\[(]\s*(bronze|bronz|silver|gold|platinum|plat|бронза|серебро|золото|платина)\s*[\])]\s*$/i;

    /* ================= Разбор импорта ================= */
    const SEP = /\s+[—–-]\s+|\s*\|\s*|\t+|\s*;\s+/;

    /* Дата в конце строки: 12.03.2024, 12/03/2024, 2024-03-12 (можно со временем) → timestamp или 0 */
    function parseDate(str) {
        const t = String(str || '').trim();
        let m = t.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})(?:[ ,T]+(\d{1,2}):(\d{2}))?$/);
        let y, mo, d, h = 0, mi = 0;
        if (m) { d = +m[1]; mo = +m[2]; y = +m[3]; h = +(m[4] || 0); mi = +(m[5] || 0); }
        else if ((m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T]+(\d{1,2}):(\d{2}))?/))) { y = +m[1]; mo = +m[2]; d = +m[3]; h = +(m[4] || 0); mi = +(m[5] || 0); }
        else return 0;
        if (mo < 1 || mo > 12 || d < 1 || d > 31) return 0;
        const ts = new Date(y, mo - 1, d, h, mi).getTime();
        return isFinite(ts) && ts <= Date.now() + 864e5 ? ts : 0;
    }

    /* Строка-заголовок группы: «# …», «## …», «=== … ===», «[DLC: …]».
       «Основная игра» / «Base game» → base; «DLC: Название» → группа дополнения; любой другой заголовок → обычная группа без привязки. */
    function parseHeader(line) {
        let m, t = null;
        if ((m = line.match(/^#{1,6}\s+(\S.*)$/))) t = m[1];
        else if ((m = line.match(/^={2,}\s*(\S.*?)\s*=*$/))) t = m[1];
        else if ((m = line.match(/^\[\s*(DLC\s*[:：].+?)\s*\]$/i))) t = m[1];
        if (t == null) return null;
        t = t.replace(/\s*#+\s*$/, '').trim();
        if (!t) return null;
        if (/^(основн[а-яёa-z]*(\s+игра)?|base(\s+game)?|main(\s+game)?|игра)$/i.test(t)) return { base: true };
        const d = t.match(/^(?:dlc|дополнени[ея]|доп\.?)\s*[:：\-–—]\s*(.+)$/i);
        if (d && d[1].trim()) return { title: d[1].trim().slice(0, 80), dlc: true };
        return { title: t.slice(0, 80), dlc: false };
    }

    function parseText(text, pairs) {
        let lines = String(text || '').replace(/\r/g, '').split('\n').map(s => s.trim()).filter(Boolean)
            .filter(s => !/^\d+([.,]\d+)?\s*%$/.test(s))            // «12.3%» — процент получивших (Steam)
            .filter(s => !/^(unlocked|получено|locked|не получено)\b/i.test(s));
        // делим на блоки по заголовкам групп; до первого заголовка — «Основная игра»
        const segs = [{ grp: { base: true }, lines: [] }];
        lines.forEach(line => {
            const h = parseHeader(line);
            if (h) segs.push({ grp: h, lines: [] }); else segs[segs.length - 1].lines.push(line);
        });
        const out = [];
        segs.forEach(seg => {
            const push = it => { if (it.n) out.push({ ...it, grp: seg.grp }); };
            if (pairs) {
                for (let i = 0; i < seg.lines.length; i += 2) push({ n: seg.lines[i], d: seg.lines[i + 1] || '' });
            } else {
                seg.lines.forEach(line => {
                    line = line.replace(/^\s*(?:\d{1,3}[.)]|[-•*▪●○☐☑✔✓])\s+/, '');   // «1.» «- » «☐ »
                    let tt = '';
                    line = line.replace(ttTagRe, (_, w) => { tt = TT_ALIAS[w.toLowerCase()] || ''; return ''; });   // «… — 12.03.2024 [gold]»
                    const parts = line.split(SEP);
                    const n = (parts.shift() || '').trim();
                    let ts = 0;
                    if (parts.length && (ts = parseDate(parts[parts.length - 1]))) parts.pop();
                    push({ n, d: parts.join(' — ').trim(), ts, ...(tt ? { tt } : {}) });
                });
            }
        });
        return out;
    }

    function parseJson(json) {
        // Steam GetSchemaForGame: game.availableGameStats.achievements[{displayName, description}]
        const steam = json?.game?.availableGameStats?.achievements;
        let arr = Array.isArray(steam) ? steam : Array.isArray(json) ? json : (Array.isArray(json?.achievements) ? json.achievements : null);
        if (!arr) return [];
        return arr.map(x => typeof x === 'string' ? { n: x, d: '' } : ({
            n: String(x.displayName || x.name || x.title || '').trim(),
            d: String(x.description || x.desc || x.d || '').trim()
        })).filter(a => a.n);
    }

    function addMany(g, items, replace) {
        const had = listOf(g);
        let list = replace ? [] : had.slice();
        if (replace) g.achGroups = [];
        const gk = a => keyOf(a) + '|' + norm(a.n);                  // одинаковые названия в разных группах — не повторы
        const keep = new Map(had.map(a => [gk(a), a]));
        const seen = new Set(list.map(gk));
        const st = { added: 0, dup: 0, dated: 0, groups: 0, dlcs: 0 };
        items.forEach(it => {
            const key = ensureGroup(g, it.grp, st);
            const k = key + '|' + norm(it.n);
            if (seen.has(k)) { st.dup++; return; }
            if (list.length >= MAX_LIST) return;
            seen.add(k);
            const old = replace ? keep.get(k) : null;     // при замене сохраняем уже отмеченные
            const ts = old?.ts || it.ts || 0;
            list.push({ id: old?.id || uid(), n: it.n.slice(0, 120), d: (it.d || '').slice(0, 300), done: !!(old?.done || ts), ts,
                        ...(key !== BASE ? { g: key } : {}), ...((old?.img || it.img) ? { img: old?.img || it.img } : {}),
                        ...((old?.tt || it.tt) && TT[old?.tt || it.tt] ? { tt: old?.tt || it.tt } : {}),
                        ...((old?.pm || it.pm) ? { pm: old?.pm || it.pm, p: old?.p || 0 } : {}) });
            st.added++;
            if (ts) st.dated++;
        });
        g.achList = list;
        return st;
    }

    /* ================= Окно со списком ================= */
    let gid = null, filter = 'all', query = '', editId = null, view = 'list';
    let tab = 'all', sort = 'list', editMode = false, menuOpen = false;   // вкладка группы, сортировка, режим правки, меню «⋯»
    const collapsed = new Set();      // ключи свёрнутых групп (только на время, пока окно открыто)
    let linkOv = null;                // окно «Привязать к DLC»
    const modal = document.createElement('div');
    modal.id = 'game-ach-modal';
    modal.className = 'hidden fixed inset-0 bg-black/75 backdrop-blur-md flex items-start sm:items-center justify-center z-[58] p-3 sm:p-4';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', 'Список ачивок игры');
    modal.innerHTML = '<div class="glass no-hover ga-panel w-full border border-white/10 shadow-2xl"><div id="ga-body"></div></div>';
    document.body.appendChild(modal);
    const body = modal.querySelector('#ga-body');

    const fileInput = document.createElement('input');
    fileInput.type = 'file'; fileInput.accept = '.txt,.csv,.json,text/plain,application/json'; fileInput.className = 'hidden';
    document.body.appendChild(fileInput);

    function open(id, v) {
        const g = gameById(id);
        if (!g) return;
        gid = g.id; filter = 'all'; query = ''; editId = null; collapsed.clear(); closeLink(); tab = 'all'; sort = 'list'; editMode = false; menuOpen = false;
        try { if (listOf(g).length && syncAll()) persistData(); } catch (_) {}   // «куплено» у DLC могли поменять после прошлого открытия
        view = v || (listOf(g).length ? 'list' : 'import');
        paint();
        modal.classList.remove('hidden');
    }

    function close() {
        closeLink();
        modal.classList.add('hidden');
        try { renderGamesBlock(); } catch (_) {}
        const g = gameById(gid);
        gid = null;
        if (g) { try { const d = $('game-detail-modal'); if (d && !d.classList.contains('hidden')) window.openGameDetail?.(g.id); } catch (_) {} }
    }

    function importHTML() {
        return `
        <p class="text-sm text-gray-300 mb-2">Вставь список ачивок — по одной на строку. Формат строки: <b>Название — описание — дата получения</b> (описание и дату можно не писать; если дата есть, ачивка сразу отметится как полученная).</p>
        <textarea id="ga-text" class="gd-input ga-textarea" rows="9" placeholder="Первая кровь — Победить первого врага — 12.03.2024&#10;Коллекционер — Найти все сокровища&#10;Платина — Получить все ачивки"></textarea>
        <label class="ga-check"><input type="checkbox" id="ga-pairs"> Каждые две строки = название и описание (так копируется со страницы Steam)</label>
        <div class="flex flex-wrap items-center gap-2 mt-3">
            <button type="button" class="gx-status st-completed is-on" data-ga="do-import">Добавить в список</button>
            <button type="button" class="gx-status st-none" data-ga="pick-file">📄 Из файла (.txt / .csv / .json)</button>
            ${copyCands(gameById(gid)).length ? '<button type="button" class="gx-status st-none" data-ga="copy-from">📑 Скопировать с другой версии</button>' : ''}
            <button type="button" class="gx-status st-none" data-ga="copy-prompt">📝 Скопировать промпт для скриншотов</button>
            ${listOf(gameById(gid)).length ? '<button type="button" class="gx-status st-none" data-ga="back">← К списку</button>' : ''}
        </div>
        <details class="ga-help mt-4"><summary>Где взять список ачивок игры?</summary>
            <ul>
                <li><b>Steam:</b> открой страницу ачивок игры (steamcommunity.com/stats/<i>ID игры</i>/achievements), выдели всё, скопируй и вставь сюда с галочкой «каждые две строки».</li>
                <li><b>PlayStation / Xbox:</b> PSNProfiles, TrueAchievements, Exophase — скопируй таблицу трофеев и вставь. Лишние строки с процентами отбрасываются сами.</li>
                <li><b>JSON из Steam API</b> (<i>ISteamUserStats/GetSchemaForGame</i>) — загрузи файлом, названия и описания подтянутся сами.</li>
                <li><b>Скриншоты:</b> скопируй промпт (кнопка выше), отправь его нейросети вместе со скринами ачивок, а ответ вставь сюда. Все промпты лежат в Настройки → 📝 Промпты.</li>
                <li>Если часть строк не подошла — просто удали их в списке 🗑 или поправь ✏️.</li>
            </ul>
        </details>`;
    }

    function listHTML(g) {
        const s = stats(g);
        const l = listOf(g);
        const q = norm(query);
        const rows = l.filter(a => (filter === 'all' || (filter === 'done' ? a.done : !a.done)) && (!q || norm(a.n + ' ' + a.d).includes(q)));
        const chip = (v, label, n) => `<button type="button" class="ach-chip${filter === v ? ' is-on' : ''}" data-ga="filter" data-v="${v}">${label} <em>${n}</em></button>`;
        const row = a => a.id === editId ? `
            <li class="ga-row is-edit" data-aid="${esc(a.id)}">
                <div class="flex-1 min-w-0 space-y-2">
                    <input class="gd-input" id="ga-en" value="${esc(a.n)}" maxlength="120" placeholder="Название">
                    <input class="gd-input" id="ga-ed" value="${esc(a.d)}" maxlength="300" placeholder="Описание">
                    <label class="ga-edit-date">Группа <select id="ga-eg" class="gd-input">${groupsOf(g).map(x => `<option value="${esc(x.key)}"${x.key === keyOf(a) ? ' selected' : ''}>${esc(x.title)}</option>`).join('')}<option value="__new">➕ Новая группа…</option></select></label>
                    <label class="ga-edit-date">Тип трофея <select id="ga-ett" class="gd-input"><option value="">— не задан —</option>${Object.keys(TT).map(k => `<option value="${k}"${a.tt === k ? ' selected' : ''}>${TT[k].ico} ${TT[k].name} · ${TT[k].pts}</option>`).join('')}</select></label>
                    <label class="ga-edit-date">Счётчик (необязательно) <span class="ga-cin"><input type="number" min="0" max="999999" id="ga-ep" class="gd-input" value="${a.pm ? (a.p || 0) : ''}" placeholder="сейчас"> / <input type="number" min="0" max="999999" id="ga-epm" class="gd-input" value="${a.pm || ''}" placeholder="нужно"></span></label>
                    ${a.done ? `<label class="ga-edit-date">Получено <input type="date" id="ga-edt" class="gd-input" value="${a.ts ? dateVal(a.ts) : ''}"></label>` : ''}
                    <div class="ga-edit-img">${a.img ? `<img src="${esc(a.img)}" alt="">` : ''}<button type="button" class="gd-tool" data-ga="pick-img">🖼 ${a.img ? 'Заменить' : 'Добавить'} картинку</button>${a.img ? '<button type="button" class="gd-tool" data-ga="rm-img">Убрать</button>' : ''}</div>
                </div>
                <div class="ga-actions"><button type="button" class="gd-tool" data-ga="save-edit">Сохранить</button><button type="button" class="gd-tool" data-ga="cancel-edit">Отмена</button></div>
            </li>` : `
            <li class="ga-row${a.done ? ' is-done' : ''}${lockedKey(g, keyOf(a)) ? ' is-locked' : ''}${ttOf(a) ? ' tt-' + a.tt : ''}" data-aid="${esc(a.id)}">
                <button type="button" class="ga-tick" data-ga="toggle" role="checkbox" aria-checked="${!!a.done}" aria-label="Получено: ${esc(a.n)}"${lockedKey(g, keyOf(a)) ? ' aria-disabled="true" title="Сначала отметь DLC купленным"' : ''}>${a.done ? '✓' : (lockedKey(g, keyOf(a)) ? '🔒' : '')}</button>
                ${a.img ? `<img class="ga-thumb" src="${esc(a.img)}" alt="" loading="lazy">` : ''}
                <div class="flex-1 min-w-0">
                    <p class="ga-name">${ttOf(a) ? `<span class="ga-tt" title="${TT[a.tt].name} · ${TT[a.tt].pts} очков">${TT[a.tt].ico}</span> ` : ''}${esc(a.n)}</p>
                    ${a.d ? `<p class="ga-desc">${esc(a.d)}</p>` : ''}
                    ${a.pm > 0 ? `<div class="ga-cnt"><span class="ga-cbar"><i style="width:${Math.min(100, Math.round((a.p || 0) / a.pm * 100))}%"></i></span><b>${a.p || 0} / ${a.pm}</b>${editMode && !a.done ? '<button type="button" class="ga-cb" data-ga="p-dec" aria-label="Минус">−</button><button type="button" class="ga-cb" data-ga="p-inc" aria-label="Плюс">+</button>' : ''}</div>` : ''}
                    ${a.done && a.ts ? `<p class="ga-date">Получено ${fmt(a.ts)}</p>` : ''}
                </div>
                ${editMode ? '<div class="ga-actions"><button type="button" class="ga-ico" data-ga="edit" title="Изменить" aria-label="Изменить">✏️</button><button type="button" class="ga-ico" data-ga="del" title="Удалить" aria-label="Удалить">🗑</button></div>' : ''}
            </li>`;
        const grps = groupsOf(g);
        const multi = grps.length > 1;
        if (tab !== 'all' && !grps.some(x => x.key === tab)) tab = 'all';
        const solo = multi && tab !== 'all' ? grps.find(x => x.key === tab) : null;
        const ordered = arr => sort === 'date' ? [...arr].sort((a, b) => (b.done ? (b.ts || 1) : 0) - (a.done ? (a.ts || 1) : 0)) : arr;
        const groupBlock = (grp, single) => {
            const inGroup = ordered(rows.filter(a => keyOf(a) === grp.key));
            if (!inGroup.length) return '';
            if (!multi) return inGroup.map(row).join('');
            const gs = groupStats(g, grp), dlc = dlcOfGroup(g, grp);
            const hide = !single && collapsed.has(grp.key) && !q;      // при поиске группы раскрываются сами
            const badge = dlc ? `<span class="ga-gtag ${gs.locked ? 'is-lock' : 'is-own'}">${gs.locked ? '🔒' : '🧩'} ${esc(dlc.title)} · ${dlc.owned === true ? 'куплено' : 'в планах'}</span>` : '';
            const link = grp.key === BASE ? '' : `<button type="button" class="ga-glink" data-ga="glink" data-gk="${esc(grp.key)}">🔗 ${grp.dlcId ? 'Сменить DLC' : 'Привязать к DLC'}</button>`;
            const note = gs.locked && !hide ? `<p class="ga-gnote">В общий зачёт не входит. Чтобы отмечать ачивки, отметь дополнение «${esc(dlc.title)}» купленным в блоке «Дополнения» на странице игры.</p>` : '';
            const ttl = single ? `<span class="ga-gtitle">${esc(grp.title)}</span>`
                : `<button type="button" class="ga-gtoggle" data-ga="gtoggle" data-gk="${esc(grp.key)}" aria-expanded="${!hide}" title="${hide ? 'Развернуть' : 'Свернуть'}"><span class="ga-garrow">${hide ? '▸' : '▾'}</span><span class="ga-gtitle">${esc(grp.title)}</span></button>`;
            return `<li class="ga-group${gs.locked ? ' is-locked' : ''}${gs.full ? ' is-full' : ''}"><div class="ga-ghead">${ttl}${badge}${link}<span class="ga-gcount">${gs.full ? '🏆 ' : ''}${gs.done} / ${gs.total}</span></div>${note}</li>`
                + (hide ? '' : inGroup.map(row).join(''));
        };
        const full = s.total > 0 && s.done >= s.total;
        const sc = solo ? groupStats(g, solo) : s;
        const lockedLine = s.locked ? ` · 🔒 ещё ${s.locked} в некупленных DLC (не в зачёте)` : '';
        const tabBtn = (k, label, gs) => `<button type="button" class="ga-tab${tab === k ? ' is-on' : ''}" data-ga="tab" data-gk="${esc(k)}">${gs && gs.locked ? '🔒 ' : ''}${gs && gs.full ? '🏆 ' : ''}${esc(label)}${gs ? ` <em>${gs.done}/${gs.total}</em>` : ''}</button>`;
        const tabs = multi ? `<div class="ga-tabs" role="tablist">${tabBtn('all', 'Все', null)}${grps.filter(x => groupStats(g, x).total).map(x => tabBtn(x.key, x.title, groupStats(g, x))).join('')}</div>` : '';
        const menu = menuOpen ? `<div class="ga-menu" role="menu">
            <button type="button" role="menuitem" data-ga="to-import">📥 Добавить списком</button>
            <button type="button" role="menuitem" data-ga="add-one">➕ Добавить одну</button>
            <button type="button" role="menuitem" data-ga="copy-from">📑 Скопировать с другой версии</button>
            <button type="button" role="menuitem" data-ga="copy-text">📋 Скопировать список текстом</button>
            <button type="button" role="menuitem" data-ga="mark-all">✓ Отметить все</button>
            <button type="button" role="menuitem" data-ga="reset">↺ Сбросить отметки</button>
            <button type="button" role="menuitem" class="is-danger" data-ga="clear">🗑 Удалить список</button></div>` : '';
        const list = solo ? groupBlock(solo, true) : grps.map(x => groupBlock(x, false)).join('');
        return `
        <div class="ga-top">
            <div class="min-w-0"><p class="gd-sec-title !mb-1">Список ачивок</p><h3 class="ga-h">${esc(g.title)}</h3></div>
            <div class="ga-topbtns">
                <button type="button" class="ga-pill${editMode ? ' is-on' : ''}" data-ga="edit-mode">${editMode ? '✓ Готово' : '✏️ Редактировать'}</button>
                <div class="ga-menuwrap"><button type="button" class="ga-pill" data-ga="menu" aria-haspopup="true" aria-expanded="${menuOpen}" aria-label="Ещё действия">⋯</button>${menu}</div>
                <button type="button" class="ga-ico" data-ga="close" aria-label="Закрыть">✕</button>
            </div>
        </div>
        <div class="ga-hero${full ? ' is-plat' : ''}">
            <div class="ga-big"><b>${s.done}</b><span> / ${s.total}</span></div>
            <div class="ga-hero-r">
                <div class="gs-bar" role="img" aria-label="Ачивки: ${s.pct}%"><span class="gs-seg" style="width:${s.pct}%;--sc:${full ? '#facc15' : '#fbbf24'}"></span></div>
                <p class="text-xs text-gray-400 mt-1.5">${full ? '🏆 Платина! Все ачивки получены' : `${s.pct}% · осталось ${s.left}`}${lockedLine}</p>
            </div>
            ${full ? '<span class="ga-plat">🏆 Платина</span>' : ''}
        </div>
        ${tabs}
        <div class="ga-tools">
            ${chip('all', 'Все', sc.total)}${chip('left', 'Осталось', sc.left)}${chip('done', 'Получено', sc.done)}
            <input id="ga-search" class="gd-input ga-search" type="search" placeholder="Поиск…" value="${esc(query)}" aria-label="Поиск по ачивкам">
            <select id="ga-sort" class="gd-input ga-sort" aria-label="Сортировка"><option value="list"${sort === 'list' ? ' selected' : ''}>По списку</option><option value="date"${sort === 'date' ? ' selected' : ''}>По дате получения</option></select>
        </div>
        <div class="ga-scroll"><ul class="ga-list">${rows.length && list ? list : `<li class="text-sm text-gray-500 py-6 text-center">${l.length ? 'Ничего не найдено' : 'Список пуст'}</li>`}</ul></div>`;
    }

    function paint() {
        const g = gameById(gid);
        if (!g) { modal.classList.add('hidden'); return; }
        const keepSearch = document.activeElement?.id === 'ga-search';
        const sc = body.querySelector('.ga-scroll'), top = sc ? sc.scrollTop : 0;
        body.innerHTML = view === 'import' ? `
        <div class="ga-top"><div class="min-w-0"><p class="gd-sec-title !mb-1">Список ачивок</p><h3 class="ga-h">${esc(g.title)}</h3></div>
            <div class="ga-topbtns"><button type="button" class="ga-ico" data-ga="close" aria-label="Закрыть">✕</button></div></div>
        <div class="ga-scroll">${importHTML()}</div>` : listHTML(g);
        const sc2 = body.querySelector('.ga-scroll'); if (sc2 && view !== 'import') sc2.scrollTop = top;
        if (keepSearch) { const el = $('ga-search'); if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); } }
    }

    function doImport(items, replace) {
        const g = gameById(gid);
        if (!g) return;
        if (!items.length) { toast('Не нашёл ни одной ачивки в тексте', 'error'); return; }
        const wasFull = g.trophy === 'full';
        const r = addMany(g, items, replace);
        commit(g, wasFull);
        toast(`Добавлено ачивок: <b>${r.added}</b>${r.dated ? `, из них отмечено получено: ${r.dated}` : ''}${r.dup ? `, повторов пропущено: ${r.dup}` : ''}${r.groups ? `<br>Групп: ${r.groups}` : ''}${r.dlcs ? `<br>🧩 Создано дополнений «в планах»: ${r.dlcs} — отметь купленными в блоке «Дополнения», и группа войдёт в зачёт` : ''}`, 'success');
        view = 'list'; paint();
    }

    modal.addEventListener('click', async e => {
        if (e.target === modal) { close(); return; }
        const b = e.target.closest('[data-ga]');
        if (!b) { if (menuOpen) { menuOpen = false; paint(); } return; }
        const act = b.dataset.ga;
        if (menuOpen && act !== 'menu') { menuOpen = false; paint(); }
        const g = gameById(gid);
        if (!g) return;
        const aid = b.closest('[data-aid]')?.dataset.aid;
        const item = aid ? listOf(g).find(a => a.id === aid) : null;
        const wasFull = g.trophy === 'full';
        switch (act) {
            case 'close': close(); break;
            case 'back': view = 'list'; paint(); break;
            case 'to-import': view = 'import'; paint(); break;
            case 'pick-file': fileInput.value = ''; fileInput.click(); break;
            case 'do-import': doImport(parseText($('ga-text')?.value, $('ga-pairs')?.checked), false); break;
            case 'filter': filter = b.dataset.v; paint(); break;
            case 'copy-text': {
                const t = exportText(g);
                if (!t) { toast('Список пуст — копировать нечего', 'info'); break; }
                copyText(t).then(ok => toast(ok ? `Список скопирован 📋 (${listOf(g).length} ачивок) — формат как у импорта, его можно вставить обратно` : 'Не удалось скопировать', ok ? 'success' : 'error'));
                break;
            }
            case 'copy-from': await copyFrom(g); break;
            case 'tab': tab = b.dataset.gk; paint(); break;
            case 'menu': menuOpen = !menuOpen; paint(); break;
            case 'edit-mode': editMode = !editMode; if (!editMode) editId = null; paint(); break;
            case 'gtoggle': { const k = b.dataset.gk; if (collapsed.has(k)) collapsed.delete(k); else collapsed.add(k); paint(); break; }
            case 'glink': openLink(b.dataset.gk); break;
            case 'toggle':
                if (!item) break;
                if (lockedKey(g, keyOf(item))) { toast('🔒 Сначала отметь DLC купленным (блок «Дополнения» на странице игры)', 'info'); break; }
                item.done = !item.done; item.ts = item.done ? Date.now() : 0;
                commit(g, wasFull); paint(); break;
            case 'edit': editId = aid; if (item) collapsed.delete(keyOf(item)); paint(); $('ga-en')?.focus(); break;
            case 'pick-img': keepEdit(item); imgInput.value = ''; imgInput.click(); break;
            case 'rm-img': keepEdit(item); delete item.img; persistData(); paint(); break;
            case 'copy-prompt': copyText(window.MH_ACH_PROMPT || '').then(ok => toast(ok ? 'Промпт скопирован 📋 — вставь его в нейросеть вместе со скриншотами' : 'Не удалось скопировать — открой Настройки → Промпты', ok ? 'success' : 'error')); break;
            case 'cancel-edit': editId = null; paint(); break;
            case 'save-edit': {
                const n = ($('ga-en')?.value || '').trim();
                if (!item || !n) { toast('Название не может быть пустым', 'error'); break; }
                const dsc = ($('ga-ed')?.value || '').trim().slice(0, 300), dv = $('ga-edt')?.value, gv = $('ga-eg')?.value;
                let nkey = keyOf(item);
                if (gv === '__new') {
                    const t = ((await mhPrompt('Название новой группы', { title: 'Новая группа', placeholder: 'Например: Season Pass', required: true, maxLength: 80 })) || '').trim();
                    if (!t) break;                                  // отменили — остаёмся в правке, ничего не меняется
                    nkey = nk(t) === nk(BASE_TITLE) ? BASE : ensureGroup(g, { title: t, dlc: false }, { groups: 0, dlcs: 0 });
                } else if (gv && groupsOf(g).some(x => x.key === gv)) nkey = gv;
                item.n = n.slice(0, 120); item.d = dsc;
                const ttv = $('ga-ett')?.value;
                if (TT[ttv]) item.tt = ttv; else delete item.tt;
                const pmv = Math.max(0, Math.min(999999, parseInt($('ga-epm')?.value, 10) || 0)), pv = Math.max(0, Math.min(999999, parseInt($('ga-ep')?.value, 10) || 0));
                if (pmv > 0) { item.pm = pmv; item.p = pv; } else { delete item.pm; delete item.p; }
                if (item.done && dv) { const t = new Date(dv + 'T12:00:00').getTime(); if (isFinite(t)) item.ts = t; }
                const moved = nkey !== keyOf(item);
                if (moved) { if (nkey === BASE) delete item.g; else item.g = nkey; collapsed.delete(nkey); }
                editId = null;
                if (moved) commit(g, wasFull); else persistData();
                paint();
                await offerDone(g, item);
                break;
            }
            case 'p-inc': case 'p-dec':
                if (!item || !(item.pm > 0)) break;
                item.p = Math.max(0, Math.min(item.pm, (item.p || 0) + (act === 'p-inc' ? 1 : -1)));
                persistData(); paint();
                if (act === 'p-inc') await offerDone(g, item);
                break;
            case 'del':
                if (!item) break;
                g.achList = listOf(g).filter(a => a !== item);
                if (g.achList.length) commit(g, wasFull); else { persistData(); }
                paint(); break;
            case 'add-one': {
                const n = ((await mhPrompt('Название ачивки', { title: 'Новая ачивка', placeholder: 'Например: Первая кровь', required: true, maxLength: 120 })) || '').trim();
                if (!n) break;
                const d = ((await mhPrompt('Описание (можно оставить пустым)', { title: 'Описание ачивки', multiline: true, maxLength: 300, okText: 'Добавить' })) || '').trim();
                if (!Array.isArray(g.achList)) g.achList = [];
                g.achList.push({ id: uid(), n: n.slice(0, 120), d: d.slice(0, 300), done: false, ts: 0 });
                commit(g, wasFull); paint(); break;
            }
            case 'mark-all':
                listOf(g).forEach(a => { if (!a.done && !lockedKey(g, keyOf(a))) { a.done = true; a.ts = Date.now(); } });
                commit(g, wasFull); paint(); break;
            case 'reset':
                if (!(await mhConfirm('Снять отметки со всех ачивок этой игры?', { title: 'Сбросить отметки?', okText: 'Сбросить', danger: true }))) break;
                listOf(g).forEach(a => { a.done = false; a.ts = 0; });
                commit(g, wasFull); paint(); break;
            case 'clear':
                if (!(await mhConfirm('Удалить весь список ачивок этой игры? Счётчик «получено / всего» останется как есть.', { title: 'Удалить список?', okText: 'Удалить', danger: true }))) break;
                g.achList = []; g.achGroups = []; persistData(); try { updateUI(); } catch (_) {}
                view = 'import'; paint(); break;
        }
    });

    body.addEventListener('change', e => { if (e.target.id === 'ga-sort') { sort = e.target.value; paint(); } });
    body.addEventListener('input', e => {
        if (e.target.id === 'ga-search') { query = e.target.value; paint(); }
    });
    body.addEventListener('keydown', e => {
        if (e.key === 'Enter' && (e.target.id === 'ga-en' || e.target.id === 'ga-ed')) { e.preventDefault(); body.querySelector('[data-ga="save-edit"]')?.click(); }
    });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !modal.classList.contains('hidden')) { e.stopPropagation(); if (linkOv) closeLink(); else if (menuOpen) { menuOpen = false; paint(); } else close(); } }, true);

    /* ---------- картинки ачивок (необязательно) ---------- */
    const imgInput = document.createElement('input');
    imgInput.type = 'file'; imgInput.accept = 'image/*'; imgInput.className = 'hidden';
    document.body.appendChild(imgInput);

    function keepEdit(item) {      // не теряем несохранённый текст при выборе картинки
        if (!item) return;
        const n = ($('ga-en')?.value || '').trim(), d = $('ga-ed')?.value;
        if (n) item.n = n.slice(0, 120);
        if (typeof d === 'string') item.d = d.trim().slice(0, 300);
        const tv = $('ga-ett')?.value; if (tv !== undefined) { if (TT[tv]) item.tt = tv; else delete item.tt; }
        const pmv = parseInt($('ga-epm')?.value, 10) || 0; if ($('ga-epm')) { if (pmv > 0) { item.pm = pmv; item.p = parseInt($('ga-ep')?.value, 10) || 0; } else { delete item.pm; delete item.p; } }
        const gv = $('ga-eg')?.value, g = gameById(gid);
        if (g && gv && gv !== '__new' && gv !== keyOf(item) && groupsOf(g).some(x => x.key === gv)) { if (gv === BASE) delete item.g; else item.g = gv; sync(g); }
    }

    /* ---------- C2: экспорт текстом и копирование списка с другой версии ---------- */
    const dmy = ts => { const d = new Date(ts), p = n => String(n).padStart(2, '0'); return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()}`; };
    /** Список в том же формате, что и импорт: «# группа» + «Название — Описание — ДД.ММ.ГГГГ» */
    function exportText(g) {
        const out = [];
        groupsOf(g).forEach(grp => {
            const items = listOf(g).filter(a => keyOf(a) === grp.key);
            if (!items.length) return;
            out.push(grp.key === BASE ? '# ' + BASE_TITLE : (dlcOfGroup(g, grp) ? '# DLC: ' : '# ') + grp.title);
            items.forEach(a => {
                const n = String(a.n).replace(/^#+\s*/, '').replace(/\s+[—–-]\s+/g, ', '), d = String(a.d || '').replace(/\s*\n+\s*/g, ' ').trim();
                out.push([n, d, a.done && a.ts ? dmy(a.ts) : ''].filter((x, i) => i === 0 || x).join(' — ') + (ttOf(a) ? ' [' + a.tt + ']' : ''));
            });
        });
        return out.join('\n');
    }
    /** Структура списка источника для addMany: без отметок и дат; DLC-группы перепривязываются по названию */
    const copyItems = src => groupsOf(src).flatMap(grp => {
        const gp = grp.key === BASE ? { base: true } : { title: grp.title, dlc: !!dlcOfGroup(src, grp) };
        return listOf(src).filter(a => keyOf(a) === grp.key).map(a => ({ n: a.n, d: a.d || '', ts: 0, img: a.img, ...(ttOf(a) ? { tt: a.tt } : {}), ...(a.pm ? { pm: a.pm } : {}), grp: gp }));
    });
    /** Небольшое окно выбора из нескольких вариантов → id или null (Esc / клик по фону) */
    function pickOverlay(title, sub, rowsArr) {
        return new Promise(resolve => {
            closeLink();
            const ov = document.createElement('div');
            ov.className = 'gl-ov';
            ov.innerHTML = `<div class="gl-box" role="dialog" aria-modal="true" aria-label="${esc(title)}"><p class="gl-title">${esc(title)}</p><p class="gl-sub">${esc(sub)}</p>
                <div class="gl-list">${rowsArr.map(r => `<button type="button" class="gl-item" data-gl="pick" data-id="${esc(r.id)}"><span>${esc(r.label)}</span><em>${esc(r.hint)}</em></button>`).join('')}</div>
                <div class="gl-row"><button type="button" class="gl-btn" data-gl="cancel">Отмена</button></div></div>`;
            ov._done = resolve;
            ov.addEventListener('click', e => {
                const b = e.target.closest('[data-gl]');
                if (e.target !== ov && !b) return;
                const id = b && b.dataset.gl === 'pick' ? b.dataset.id : null;
                const cb = ov._done; ov._done = null; closeLink(); cb(id);
            });
            document.body.appendChild(ov); linkOv = ov;
            ov.querySelector('.gl-item')?.focus();
        });
    }
    const copyCands = g => g ? (data.games || []).filter(x => x.id !== g.id && listOf(x).length && nk(x.title) === nk(g.title)) : [];
    async function copyFrom(g) {
        const cands = copyCands(g);
        if (!cands.length) { toast('Не нашёл другую версию этой игры со списком ачивок (ищу игры с тем же названием)', 'info'); return; }
        const lbl = x => `${x.platform || x.platforms || 'без платформы'}`;
        let src = cands[0];
        if (cands.length > 1) {
            const id = await pickOverlay('Откуда скопировать?', 'Отметки и даты не переносятся', cands.map(x => ({ id: String(x.id), label: `${x.title} · ${lbl(x)}`, hint: `${listOf(x).length} ачивок` })));
            src = id && cands.find(x => String(x.id) === id);
            if (!src) return;
        } else if (!(await mhConfirm(`Скопировать список с версии «${src.title}» (${lbl(src)}): ${listOf(src).length} ачивок?\nОтметки и даты не переносятся, DLC-группы привяжутся к дополнениям этой версии по названию.`, { title: 'Скопировать список?', okText: 'Скопировать' }))) return;
        const wasFull = g.trophy === 'full';
        const r = addMany(g, copyItems(src), false);
        commit(g, wasFull);
        toast(`Скопировано ачивок: <b>${r.added}</b>${r.dup ? `, уже были: ${r.dup}` : ''}${r.dlcs ? `<br>🧩 Создано дополнений «в планах»: ${r.dlcs}` : ''}`, 'success');
        view = 'list'; tab = 'all'; paint();
    }

    /* ---------- окно «Привязать группу к DLC» ---------- */
    function closeLink() { if (linkOv) { const cb = linkOv._done; linkOv.remove(); linkOv = null; if (cb) cb(null); } }
    function openLink(key) {
        const g = gameById(gid);
        const grp = g && key !== BASE ? groupsOf(g).find(x => x.key === key) : null;
        if (!grp) return;
        closeLink();
        const cur = dlcOfGroup(g, grp), dl = dlcList(g);
        const hasSame = dl.some(d => nk(d.title) === nk(grp.title));
        const ov = document.createElement('div');
        ov.className = 'gl-ov';
        ov.innerHTML = `<div class="gl-box" role="dialog" aria-modal="true" aria-label="Привязать группу к DLC">
            <p class="gl-title">🔗 Привязать к DLC</p>
            <p class="gl-sub">Группа «${esc(grp.title)}»${cur ? ` · сейчас: ${esc(cur.title)}` : ''}</p>
            <div class="gl-list">
                ${dl.map(d => `<button type="button" class="gl-item${cur && cur.id === d.id ? ' is-cur' : ''}" data-gl="pick" data-id="${esc(d.id)}"><span>🧩 ${esc(d.title)}</span><em>${cur && cur.id === d.id ? '✓ ' : ''}${d.owned === true ? 'куплено' : 'в планах'}</em></button>`).join('') || '<p class="gl-empty">В этой игре пока нет дополнений</p>'}
                ${hasSame ? '' : `<button type="button" class="gl-item gl-new" data-gl="new"><span>➕ Создать DLC «${esc(grp.title)}»</span><em>в планах</em></button>`}
            </div>
            <div class="gl-row">${grp.dlcId ? '<button type="button" class="gl-btn gl-danger" data-gl="unlink">Отвязать</button>' : ''}<button type="button" class="gl-btn" data-gl="cancel">Отмена</button></div></div>`;
        ov.addEventListener('click', e => {
            if (e.target === ov) { closeLink(); return; }
            const b = e.target.closest('[data-gl]');
            if (!b) return;
            const gg = gameById(gid);
            if (!gg) { closeLink(); return; }
            const act = b.dataset.gl, wasFull = gg.trophy === 'full', sg = storedGroup(gg, key);
            if (act === 'cancel') { closeLink(); return; }
            let msg = '';
            if (act === 'pick') { sg.dlcId = b.dataset.id; msg = 'Группа привязана к дополнению'; }
            else if (act === 'new') { sg.dlcId = newDlc(gg, sg.title).id; msg = `🧩 Создано дополнение «${esc(sg.title)}» в планах — отметь его купленным в блоке «Дополнения»`; }
            else if (act === 'unlink') { sg.dlcId = null; msg = 'Группа отвязана от DLC и снова входит в зачёт'; }
            else return;
            closeLink();
            commit(gg, wasFull);
            toast(msg, 'success');
            paint();
        });
        document.body.appendChild(ov);
        linkOv = ov;
        (ov.querySelector('.gl-item.is-cur') || ov.querySelector('.gl-item') || ov.querySelector('.gl-btn'))?.focus();
    }

    async function smallImage(file) {
        const url = URL.createObjectURL(file);
        try {
            const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
            const S = 96, c = document.createElement('canvas'); c.width = c.height = S;
            const side = Math.min(img.width, img.height), sx = (img.width - side) / 2, sy = (img.height - side) / 2;
            c.getContext('2d').drawImage(img, sx, sy, side, side, 0, 0, S, S);
            let out = c.toDataURL('image/webp', 0.8);
            if (!out.startsWith('data:image/webp')) out = c.toDataURL('image/jpeg', 0.8);
            return out;
        } finally { URL.revokeObjectURL(url); }
    }

    imgInput.addEventListener('change', async () => {
        const f = imgInput.files && imgInput.files[0];
        const g = gameById(gid), item = listOf(g).find(a => a.id === editId);
        if (!f || !item) return;
        if (!/^image\//.test(f.type) || f.size > 8 * 1024 * 1024) { toast('Нужна картинка до 8 МБ', 'error'); return; }
        try { item.img = await smallImage(f); persistData(); paint(); }
        catch (_) { toast('Не удалось прочитать картинку', 'error'); }
    });

    /** Счётчик дошёл до нужного — предлагаем отметить полученной (не молча) */
    async function offerDone(g, item) {
        if (!item || item.done || !(item.pm > 0) || (item.p || 0) < item.pm || lockedKey(g, keyOf(item))) return;
        if (!(await mhConfirm(`Счётчик «${item.n}» дошёл до ${item.p} / ${item.pm}. Отметить ачивку полученной?`, { title: 'Ачивка выполнена?', okText: 'Отметить', cancelText: 'Пока нет' }))) return;
        const wasFull = g.trophy === 'full';
        item.done = true; item.ts = Date.now();
        commit(g, wasFull); paint();
    }

    async function copyText(t) {
        try { await navigator.clipboard.writeText(t); return true; } catch (_) {}
        try { const ta = document.createElement('textarea'); ta.value = t; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); const ok = document.execCommand('copy'); ta.remove(); return ok; } catch (_) { return false; }
    }

    fileInput.addEventListener('change', async () => {
        const f = fileInput.files && fileInput.files[0];
        if (!f) return;
        try {
            const text = await f.text();
            let items;
            if (/\.json$/i.test(f.name) || /^\s*[\[{]/.test(text)) { try { items = parseJson(JSON.parse(text)); } catch (_) { items = parseText(text, false); } }
            else items = parseText(text, false);
            doImport(items, false);
        } catch (_) { toast('Не удалось прочитать файл', 'error'); }
    });

    /* ================= Блок на странице игры ================= */
    const detailBody = $('gd-body');
    const currentId = () => {
        const el = detailBody?.querySelector('[data-act="hidegame"][data-id], [data-act="share"][data-id]');
        return el ? Number(el.dataset.id) : null;
    };

    function secEl(g) {
        const s = stats(g), full = s.total > 0 && s.done >= s.total;
        const plats = (full ? ['🏆 Платина игры'] : []).concat(groupsOf(g).filter(x => x.key !== BASE).map(x => ({ x, st: groupStats(g, x) })).filter(o => o.st.full && !o.st.locked).map(o => `🏆 ${o.x.title}`));
        const sec = document.createElement('div');
        sec.className = 'gd-sec mt-5 ga-card' + (full ? ' is-plat' : '');
        sec.id = 'ga-sec';
        sec.innerHTML = (s.total || s.locked) ? `
            <div class="ga-card-top"><p class="gd-sec-title !mb-0">🏆 Список ачивок</p><div class="ga-card-num"><b>${s.done}</b> / ${s.total}</div></div>
            <div class="gs-bar mt-2" role="img" aria-label="Ачивки: ${s.pct}%"><span class="gs-seg" style="width:${s.pct}%;--sc:${full ? '#facc15' : '#fbbf24'}"></span></div>
            ${plats.length ? `<div class="ga-plats">${plats.map(t => `<span class="ga-plat-chip">${esc(t)}</span>`).join('')}</div>` : ''}
            ${(() => { const t = trophyPoints(g); return t.any ? `<p class="ga-tp">🏅 Трофейные очки: <b>${t.pts}</b> из ${t.max}</p>` : ''; })()}
            <p class="text-xs text-gray-400 mt-2">${s.left ? `Осталось ${s.left}` : '✓ Все ачивки получены'}${s.locked ? ` · 🔒 ${s.locked} в некупленных DLC — не в зачёте` : ''}</p>
            <button type="button" class="ga-open-big ga-open" data-gaopen="${g.id}">Открыть список</button>` : `
            <div class="ga-card-top"><p class="gd-sec-title !mb-0">🏆 Список ачивок</p><span class="text-xs text-gray-600">необязательно</span></div>
            <p class="text-xs text-gray-500 mt-2">Добавь ачивки игры списком и отмечай их по мере прохождения — потом сразу видно, чего не хватает до платины.</p>
            <button type="button" class="ga-open-big ga-open" data-gaopen="${g.id}">＋ Добавить список</button>`;
        return sec;
    }

    function injectSection() {
        if (!detailBody || detailBody.querySelector('#ga-sec') || !detailBody.children.length) return;
        const g = gameById(currentId());
        if (g) detailBody.appendChild(secEl(g));
    }

    /* после смены «куплено» у DLC карточка пересчитывается на месте */
    function refreshSection() {
        const old = detailBody && detailBody.querySelector('#ga-sec');
        const g = old && gameById(currentId());
        if (g) old.replaceWith(secEl(g));
    }
    document.addEventListener('click', e => { if (e.target.closest && e.target.closest('[data-act^="dlc-"]')) setTimeout(refreshSection, 0); });

    if (detailBody) {
        detailBody.addEventListener('click', e => {
            const b = e.target.closest('[data-gaopen]');
            if (b) { e.stopPropagation(); open(b.dataset.gaopen); }
        });
        new MutationObserver(() => injectSection()).observe(detailBody, { childList: true });
    }

    /* ================= D: блок «Ачивки игр» на вкладке «Достижения» ================= */
    let gbFilter = 'all';
    const gbCover = v => { v = String(v || ''); return /^data:image\//i.test(v) || /^https?:\/\//i.test(v) ? v : ''; };
    function renderGamesBlock() {
        const host = $('ach-games-block');
        if (!host) return;
        const games = (data.games || []).filter(g => listOf(g).length);
        if (!games.length) { host.innerHTML = ''; return; }
        const rows = games.map(g => {
            const s = stats(g), gs = groupsOf(g).map(grp => ({ grp, st: groupStats(g, grp) })).filter(x => x.st.total && !x.st.locked);
            const plats = gs.filter(x => x.st.full).length;
            return { g, s, gs, plats, full: s.total > 0 && s.done >= s.total };
        });
        const totalPlat = rows.reduce((n, r) => n + r.plats, 0), fullGames = rows.filter(r => r.full).length;
        const cnt = f => rows.filter(r => f === 'all' || (f === 'full' ? r.full : !r.full)).length;
        const shown = rows.filter(r => gbFilter === 'all' || (gbFilter === 'full' ? r.full : !r.full))
            .sort((a, b) => (a.full - b.full) || (b.s.pct - a.s.pct) || String(a.g.title).localeCompare(String(b.g.title), 'ru'));
        const chip = (id, l) => `<button type="button" class="ach-chip is-sm${gbFilter === id ? ' is-on' : ''}" data-gbf="${id}">${l} <em>${cnt(id)}</em></button>`;
        const card = r => {
            const cv = gbCover(r.g.img), multi = r.gs.length > 1;
            const dl = multi ? `<div class="agb-groups">${r.gs.map(x => `<span class="agb-g${x.st.full ? ' is-full' : ''}" title="${esc(x.st.done + ' / ' + x.st.total)}">${x.st.full ? '🏆' : '▫️'} ${esc(x.grp.key === BASE ? 'Игра' : x.grp.title)}</span>`).join('')}</div>` : '';
            return `<button type="button" class="agb-card${r.full ? ' is-full' : ''}" data-gbopen="${r.g.id}">
                <span class="agb-cover">${cv ? `<img src="${esc(cv)}" alt="" loading="lazy">` : '<i>🎮</i>'}${r.plats ? `<b class="agb-plat">🏆${r.plats > 1 ? ' ×' + r.plats : ''}</b>` : ''}</span>
                <span class="agb-info"><b class="agb-t">${esc(r.g.title)}</b><em class="agb-p">${esc(r.g.platform || '')}</em>
                <span class="agb-bar"><i style="width:${r.s.pct}%"></i></span>
                <span class="agb-n">${r.s.done} / ${r.s.total} · ${r.s.pct}%${r.s.locked ? ` · 🔒 ${r.s.locked}` : ''}${(() => { const t = trophyPoints(r.g); return t.any ? ` · 🏅 ${t.pts}` : ''; })()}</span>${dl}</span></button>`;
        };
        const tp = trophyPoints();
        const lvl = tp.any ? `<div class="agb-lvl"><div class="agb-lv-n"><span>Трофейный уровень</span><b>${tp.level}</b></div>
            <div class="agb-lv-m"><div class="agb-bar"><i style="width:${tp.pct}%"></i></div><p><b>${tp.pts}</b> очков · до следующего уровня ${tp.next}</p>
            <p class="agb-tt">${Object.keys(TT).filter(k => tp.by[k]).map(k => `<span>${TT[k].ico} ${tp.by[k]}</span>`).join('')}</p></div></div>` : '';
        host.innerHTML = lvl + `<div class="agb-head"><div><h3 class="agb-h">🎮 Ачивки игр</h3><p class="agb-sub">Платин: <b>${totalPlat}</b> · игр со списком: <b>${rows.length}</b>${fullGames ? ` · закрыто полностью: <b>${fullGames}</b>` : ''}</p></div>
            <div class="ach-chips">${chip('all', 'Все')}${chip('prog', 'В процессе')}${chip('full', 'С платиной')}</div></div>
            <div class="agb-grid">${shown.length ? shown.map(card).join('') : '<div class="ach-empty">Здесь пока пусто — попробуйте другой фильтр 🔎</div>'}</div>`;
    }
    document.addEventListener('click', e => {
        const f = e.target.closest && e.target.closest('[data-gbf]');
        if (f) { gbFilter = f.dataset.gbf; renderGamesBlock(); return; }
        const o = e.target.closest && e.target.closest('[data-gbopen]');
        if (o) open(o.dataset.gbopen);
    });
    if (typeof window.renderAchievementsPage === 'function') {
        const base = window.renderAchievementsPage;
        window.renderAchievementsPage = function () { const r = base.apply(this, arguments); try { renderGamesBlock(); } catch (_) {} return r; };
    }
    window.mhRenderGamesBlock = renderGamesBlock;
    window.openGameAchievements = open;

    /* ================= Достижения хаба ================= */
    if (typeof ACHIEVEMENTS_LIST !== 'undefined' && !ACHIEVEMENTS_LIST.some(a => a.id === 'ach_list_maker')) {
        const games = d => d.games || [];
        const ticks = d => games(d).reduce((n, g) => n + (Array.isArray(g.achList) ? g.achList.filter(a => a.done && !lockedKey(g, keyOf(a))).length : 0), 0);
        ACHIEVEMENTS_LIST.push(
            { id: 'ach_list_maker', title: 'Составитель списка', desc: 'Добавить игре список из 10+ ачивок', icon: '📋', xp: 50,
              cond: d => games(d).some(g => Array.isArray(g.achList) && g.achList.length >= 10) },
            { id: 'ach_ticker', title: 'Галочки за прохождение', icon: '✅', isTiered: true, getVal: ticks,
              tiers: [
                  { req: 10, label: 'Lvl 1', xp: 40, desc: 'Отметить 10 ачивок в играх' },
                  { req: 50, label: 'Lvl 2', xp: 100, desc: 'Отметить 50 ачивок в играх' },
                  { req: 200, label: 'Lvl 3', xp: 250, desc: 'Отметить 200 ачивок в играх' }
              ] }
        );
        if (typeof ACH_CAT !== 'undefined' && ACH_CAT.games) ACH_CAT.games.push('ach_list_maker', 'ach_ticker');
    }

    /* Пересчёт при старте: если список правили вручную или меняли «куплено» у DLC, держим счётчики в порядке */
    document.addEventListener('mirvel-ready', () => { if (syncAll()) persistData(); }, { once: true });

    /* ---------- стили групп (встроены, чтобы не трогать css-файлы) ---------- */
    const gcss = document.createElement('style');
    gcss.textContent = `
    .ga-group{list-style:none;margin-top:6px}
    .ga-ghead{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:6px 4px 2px}
    .ga-gtitle{font-size:12px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:#e5e7eb}
    .ga-gcount{margin-left:auto;font-size:12px;font-weight:800;color:#fbbf24}
    .ga-group.is-full .ga-gcount{color:#facc15}
    .ga-gtag{font-size:10px;font-weight:800;padding:2px 8px;border-radius:99px;border:1px solid rgba(255,255,255,.12);color:#9ca3af;background:rgba(255,255,255,.05)}
    .ga-gtag.is-lock{color:#fca5a5;border-color:rgba(248,113,113,.35);background:rgba(248,113,113,.1)}
    .ga-gtag.is-own{color:#6ee7b7;border-color:rgba(52,211,153,.35);background:rgba(52,211,153,.1)}
    .ga-gnote{font-size:11px;color:#9ca3af;padding:0 4px 4px;line-height:1.4}
    .ga-gtoggle{display:inline-flex;align-items:center;gap:6px;background:none;border:0;padding:2px 4px 2px 0;cursor:pointer;color:inherit;min-width:0;text-align:left}
    .ga-gtoggle:focus-visible,.ga-glink:focus-visible,.gl-item:focus-visible,.gl-btn:focus-visible{outline:2px solid var(--theme-btn,#8b5cf6);outline-offset:2px}
    .ga-garrow{font-size:11px;color:#9ca3af;width:12px;flex:none}
    .ga-gtag{max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .ga-glink{font-size:11px;font-weight:700;padding:2px 9px;border-radius:99px;cursor:pointer;color:#c4b5fd;background:rgba(139,92,246,.12);border:1px solid rgba(139,92,246,.3)}
    .ga-glink:hover{background:rgba(139,92,246,.22)}
    .gl-ov{position:fixed;inset:0;z-index:100000;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(0,0,0,.62);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}
    .gl-box{width:100%;max-width:420px;max-height:88vh;overflow:auto;border-radius:20px;padding:20px;color:#e5e7eb;background:rgba(24,24,32,.96);border:1px solid rgba(255,255,255,.1);box-shadow:0 20px 60px rgba(0,0,0,.55)}
    .gl-title{font-size:15px;font-weight:800;color:#fff;margin:0}
    .gl-sub{font-size:12px;color:#9ca3af;margin:4px 0 12px;word-break:break-word}
    .gl-list{display:flex;flex-direction:column;gap:6px}
    .gl-item{display:flex;align-items:center;justify-content:space-between;gap:10px;width:100%;padding:10px 12px;border-radius:12px;font-size:13px;font-weight:600;text-align:left;cursor:pointer;color:#e5e7eb;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1)}
    .gl-item:hover{background:rgba(255,255,255,.1)}
    .gl-item em{font-style:normal;font-size:11px;color:#9ca3af;flex:none}
    .gl-item.is-cur{border-color:var(--theme-btn,#8b5cf6);background:rgba(139,92,246,.14)}
    .gl-new{border-style:dashed}
    .gl-empty{font-size:12px;color:#9ca3af;padding:4px 2px}
    .gl-row{display:flex;gap:8px;justify-content:flex-end;margin-top:14px;flex-wrap:wrap}
    .gl-btn{padding:9px 16px;border-radius:12px;font-size:13px;font-weight:700;cursor:pointer;color:#e5e7eb;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12)}
    .gl-btn:hover{background:rgba(255,255,255,.12)}
    .gl-danger{background:#dc2626;border-color:transparent;color:#fff}
    @media (max-width:480px){.gl-ov{align-items:flex-end;padding:10px}.gl-box{max-width:none}.gl-row .gl-btn{flex:1}}
    #game-ach-modal{padding:16px;align-items:center}
    #game-ach-modal .ga-panel{max-width:min(1080px,96vw);width:100%;height:min(94vh,980px);max-height:94vh;display:flex;flex-direction:column;overflow:hidden;border-radius:26px;padding:20px 22px}
    #ga-body{display:flex;flex-direction:column;flex:1;min-height:0}
    .ga-scroll{flex:1;min-height:0;overflow-y:auto;margin:10px -6px 0;padding:0 6px 8px}
    #game-ach-modal .ga-list{max-height:none;overflow:visible;gap:8px}
    .ga-top{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap}
    .ga-h{font-size:clamp(18px,3vw,26px);font-weight:900;color:#fff;line-height:1.15;word-break:break-word}
    .ga-topbtns{display:flex;align-items:center;gap:8px;flex:none}
    .ga-pill{padding:7px 14px;border-radius:99px;font-size:12px;font-weight:800;cursor:pointer;color:#e5e7eb;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.14);transition:background .15s}
    .ga-pill:hover{background:rgba(255,255,255,.14)}
    .ga-pill.is-on{background:var(--theme-btn,#8b5cf6);border-color:transparent;color:#fff}
    .ga-menuwrap{position:relative}
    .ga-menu{position:absolute;right:0;top:calc(100% + 6px);z-index:5;min-width:210px;display:flex;flex-direction:column;padding:6px;border-radius:14px;background:rgba(24,24,32,.98);border:1px solid rgba(255,255,255,.12);box-shadow:0 14px 40px rgba(0,0,0,.55)}
    .ga-menu button{padding:10px 12px;border-radius:9px;font-size:13px;font-weight:600;text-align:left;cursor:pointer;color:#e5e7eb;background:none;border:0}
    .ga-menu button:hover{background:rgba(255,255,255,.08)}
    .ga-menu .is-danger{color:#fca5a5}
    .ga-hero{display:flex;align-items:center;gap:18px;flex-wrap:wrap;margin-top:14px;padding:14px 16px;border-radius:18px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08)}
    .ga-hero.is-plat{background:linear-gradient(135deg,rgba(250,204,21,.16),rgba(250,204,21,.04));border-color:rgba(250,204,21,.4)}
    .ga-big{font-size:clamp(30px,6vw,44px);font-weight:900;color:#fbbf24;line-height:1;white-space:nowrap}
    .ga-big span{font-size:.5em;color:#9ca3af;font-weight:800}
    .ga-hero-r{flex:1;min-width:160px}
    .ga-plat{padding:6px 14px;border-radius:99px;font-size:13px;font-weight:900;color:#422006;background:linear-gradient(135deg,#fde68a,#facc15)}
    .ga-tabs{display:flex;gap:6px;overflow-x:auto;margin-top:12px;padding-bottom:2px}
    .ga-tab{flex:none;padding:8px 14px;border-radius:12px;font-size:12px;font-weight:800;cursor:pointer;color:#cbd5e1;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);white-space:nowrap}
    .ga-tab em{font-style:normal;color:#9ca3af;margin-left:4px}
    .ga-tab.is-on{color:#fff;border-color:var(--theme-btn,#8b5cf6);background:color-mix(in srgb,var(--theme-btn,#8b5cf6) 22%,transparent)}
    .ga-tools{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-top:12px}
    .ga-sort{padding:6px 10px !important;font-size:12px;width:auto}
    #game-ach-modal .ga-row{padding:12px 14px;border-radius:16px}
    #game-ach-modal .ga-row.is-done{border-left:4px solid #facc15}
    #game-ach-modal .ga-actions{opacity:1}
    .ga-card{padding:16px;border-radius:18px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08)}
    .ga-card.is-plat{background:linear-gradient(135deg,rgba(250,204,21,.14),rgba(250,204,21,.03));border-color:rgba(250,204,21,.4)}
    .ga-card-top{display:flex;align-items:baseline;justify-content:space-between;gap:10px}
    .ga-card-num{font-size:14px;color:#9ca3af}.ga-card-num b{font-size:24px;color:#fbbf24;font-weight:900}
    .ga-plats{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}
    .ga-plat-chip{padding:3px 10px;border-radius:99px;font-size:11px;font-weight:800;color:#422006;background:linear-gradient(135deg,#fde68a,#facc15)}
    .ga-open-big{display:block;width:100%;margin-top:12px;padding:12px;border-radius:14px;font-size:14px;font-weight:800;cursor:pointer;color:#fff;background:var(--theme-btn,#8b5cf6);border:0;transition:filter .15s,transform .1s}
    .ga-open-big:hover{filter:brightness(1.12)}.ga-open-big:active{transform:scale(.99)}
    @media (max-width:640px){.ga-menu{right:auto;left:0}#game-ach-modal{padding:0}#game-ach-modal .ga-panel{max-width:none;width:100%;height:100dvh;max-height:100dvh;border-radius:0;padding:14px}.ga-hero{gap:10px}}
    .ga-tt{font-size:13px}
    .ga-row.tt-bronze{box-shadow:inset 0 0 0 1px rgba(205,127,50,.5)}
    .ga-row.tt-silver{box-shadow:inset 0 0 0 1px rgba(203,213,225,.5)}
    .ga-row.tt-gold{box-shadow:inset 0 0 0 1px rgba(250,204,21,.55)}
    .ga-row.tt-platinum{box-shadow:inset 0 0 0 1px rgba(103,232,249,.65)}
    .ga-cnt{display:flex;align-items:center;gap:8px;margin-top:6px}
    .ga-cbar{flex:1;max-width:220px;height:5px;border-radius:999px;background:rgba(255,255,255,.1);overflow:hidden}
    .ga-cbar i{display:block;height:100%;border-radius:999px;background:linear-gradient(90deg,var(--theme-btn,#a855f7),#22d3ee)}
    .ga-cnt b{font:700 11px ui-monospace,monospace;color:#9ca3af}
    .ga-cb{width:26px;height:26px;border-radius:8px;font-weight:900;color:#fff;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12)}
    .ga-cin{display:flex;align-items:center;gap:6px}.ga-cin input{width:100px}
    .ga-tp{font-size:12px;color:#fbbf24;margin-top:8px}
    .ga-row.is-locked{opacity:.55}
    .ga-row.is-locked .ga-tick{cursor:not-allowed;font-size:13px;background:rgba(255,255,255,.04)}
    .ga-row.is-locked .ga-tick:hover{transform:none;border-color:rgba(255,255,255,.25)}`;
    document.head.appendChild(gcss);
})();
