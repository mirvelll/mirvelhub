/* =========================================================
   MIRVEL HUB — 46-game-achievements.js (подключается после 45-wishlist-games.js)
   Список ачивок внутри игры, как в Steam / PSN:
   • на странице игры появляется блок «Список ачивок» — открывает окно со списком;
   • ачивки можно добавить пачкой (вставка текста, .txt / .csv / .json) или по одной;
   • галочка = получено (запоминается дата); фильтры «Осталось / Получено», поиск;
   • когда отмечено всё — игра сама получает 100% («платина»), это учитывает «Охотник за трофеями».
   Данные: game.achList = [{ id, n (название), d (описание), done (bool), ts (дата) }].
   Старые поля trophy / trophyDone / trophyTotal обновляются автоматически, ничего не ломается.
   ========================================================= */
(() => {
    'use strict';
    const $ = id => document.getElementById(id);
    const gameById = id => (data.games || []).find(x => x.id === Number(id));
    const MAX_LIST = 1000;

    /* Промпт для нейросети: скриншоты ачивок → готовый текст для импорта (лежит и в Настройки → Промпты) */
    window.MH_ACH_PROMPT = `Ты помогаешь перенести ачивки игры в мою коллекцию. Я пришлю скриншоты со списком ачивок. Перепиши КАЖДУЮ ачивку отдельной строкой строго в таком формате:

Название — Описание — ДД.ММ.ГГГГ

Правила:
1. Одна ачивка = одна строка. Без нумерации, маркеров, заголовков и комментариев.
2. Дата — когда ачивка получена, в формате ДД.ММ.ГГГГ. Если на скриншоте дата в другом виде (например «12 мар. 2024»), переведи её в этот формат.
3. Если ачивка не получена (серая, закрытая, без даты) — дату не пиши, оставь только «Название — Описание».
4. Если описание скрыто или его нет — оставь только «Название» (и дату, если она есть).
5. Тексты оставляй такими, как на скриншоте, на языке оригинала. Ничего не придумывай и не пропускай. Проценты редкости («12.3% игроков») не пиши.
6. Между скриншотами не должно быть повторов: если ачивка попала на два скрина, оставь её один раз.
7. Весь ответ дай одним блоком кода, чтобы я мог скопировать его целиком.`;
    const norm = s => String(s || '').toLowerCase().replace(/[™®©’'"“”«»\s]+/g, ' ').trim();
    const uid = () => 'a' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    const dateVal = ts => { try { const d = new Date(ts); const p = n => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; } catch (_) { return ''; } };
    const fmt = ts => { try { return new Date(ts).toLocaleDateString('ru-RU'); } catch (_) { return ''; } };
    const toast = (m, t) => { try { showToast(m, t); } catch (_) {} };

    const listOf = g => (g && Array.isArray(g.achList)) ? g.achList : [];
    const stats = g => {
        const l = listOf(g);
        const done = l.filter(a => a.done).length;
        return { total: l.length, done, left: l.length - done, pct: l.length ? Math.round(done / l.length * 100) : 0 };
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

    function commit(g, wasFull) {
        const s = sync(g);
        try { checkAchievements(); } catch (_) {}
        persistData();
        try { updateUI(); } catch (_) {}
        if (s.total && s.done >= s.total && !wasFull) toast(`🏆 <b>${esc(g.title)}</b> — все ${s.total} ачивок получены! Платина!`, 'success');
        return s;
    }

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

    function parseText(text, pairs) {
        let lines = String(text || '').replace(/\r/g, '').split('\n').map(s => s.trim()).filter(Boolean)
            .filter(s => !/^\d+([.,]\d+)?\s*%$/.test(s))            // «12.3%» — процент получивших (Steam)
            .filter(s => !/^(unlocked|получено|locked|не получено)\b/i.test(s));
        const out = [];
        if (pairs) {
            for (let i = 0; i < lines.length; i += 2) out.push({ n: lines[i], d: lines[i + 1] || '' });
        } else {
            lines.forEach(line => {
                line = line.replace(/^\s*(?:\d{1,3}[.)]|[-•*▪●○☐☑✔✓])\s+/, '');   // «1.» «- » «☐ »
                const parts = line.split(SEP);
                const n = (parts.shift() || '').trim();
                let ts = 0;
                if (parts.length && (ts = parseDate(parts[parts.length - 1]))) parts.pop();
                if (n) out.push({ n, d: parts.join(' — ').trim(), ts });
            });
        }
        return out.filter(a => a.n);
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
        const keep = new Map(had.map(a => [norm(a.n), a]));
        const seen = new Set(list.map(a => norm(a.n)));
        let added = 0, dup = 0, dated = 0;
        items.forEach(it => {
            const k = norm(it.n);
            if (seen.has(k)) { dup++; return; }
            if (list.length >= MAX_LIST) return;
            seen.add(k);
            const old = replace ? keep.get(k) : null;     // при замене сохраняем уже отмеченные
            const ts = old?.ts || it.ts || 0;
            list.push({ id: old?.id || uid(), n: it.n.slice(0, 120), d: (it.d || '').slice(0, 300), done: !!(old?.done || ts), ts, ...(old?.img ? { img: old.img } : {}) });
            added++;
            if (ts) dated++;
        });
        g.achList = list;
        return { added, dup, dated };
    }

    /* ================= Окно со списком ================= */
    let gid = null, filter = 'all', query = '', editId = null, view = 'list';
    const modal = document.createElement('div');
    modal.id = 'game-ach-modal';
    modal.className = 'hidden fixed inset-0 bg-black/75 backdrop-blur-md flex items-start sm:items-center justify-center z-[58] p-3 sm:p-4';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', 'Список ачивок игры');
    modal.innerHTML = '<div class="glass no-hover ga-panel w-full rounded-3xl p-5 sm:p-6 max-h-[94vh] overflow-y-auto border border-white/10 shadow-2xl"><div id="ga-body"></div></div>';
    document.body.appendChild(modal);
    const body = modal.querySelector('#ga-body');

    const fileInput = document.createElement('input');
    fileInput.type = 'file'; fileInput.accept = '.txt,.csv,.json,text/plain,application/json'; fileInput.className = 'hidden';
    document.body.appendChild(fileInput);

    function open(id, v) {
        const g = gameById(id);
        if (!g) return;
        gid = g.id; filter = 'all'; query = ''; editId = null;
        view = v || (listOf(g).length ? 'list' : 'import');
        paint();
        modal.classList.remove('hidden');
    }

    function close() {
        modal.classList.add('hidden');
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
                    ${a.done ? `<label class="ga-edit-date">Получено <input type="date" id="ga-edt" class="gd-input" value="${a.ts ? dateVal(a.ts) : ''}"></label>` : ''}
                    <div class="ga-edit-img">${a.img ? `<img src="${esc(a.img)}" alt="">` : ''}<button type="button" class="gd-tool" data-ga="pick-img">🖼 ${a.img ? 'Заменить' : 'Добавить'} картинку</button>${a.img ? '<button type="button" class="gd-tool" data-ga="rm-img">Убрать</button>' : ''}</div>
                </div>
                <div class="ga-actions"><button type="button" class="gd-tool" data-ga="save-edit">Сохранить</button><button type="button" class="gd-tool" data-ga="cancel-edit">Отмена</button></div>
            </li>` : `
            <li class="ga-row${a.done ? ' is-done' : ''}" data-aid="${esc(a.id)}">
                <button type="button" class="ga-tick" data-ga="toggle" role="checkbox" aria-checked="${!!a.done}" aria-label="Получено: ${esc(a.n)}">${a.done ? '✓' : ''}</button>
                ${a.img ? `<img class="ga-thumb" src="${esc(a.img)}" alt="" loading="lazy">` : ''}
                <div class="flex-1 min-w-0">
                    <p class="ga-name">${esc(a.n)}</p>
                    ${a.d ? `<p class="ga-desc">${esc(a.d)}</p>` : ''}
                    ${a.done && a.ts ? `<p class="ga-date">Получено ${fmt(a.ts)}</p>` : ''}
                </div>
                <div class="ga-actions"><button type="button" class="ga-ico" data-ga="edit" title="Изменить" aria-label="Изменить">✏️</button><button type="button" class="ga-ico" data-ga="del" title="Удалить" aria-label="Удалить">🗑</button></div>
            </li>`;
        return `
        <div class="gs-bar" role="img" aria-label="Ачивки: ${s.pct}%"><span class="gs-seg" style="width:${s.pct}%;--sc:${s.done >= s.total && s.total ? '#facc15' : '#fbbf24'}"></span></div>
        <p class="text-xs text-gray-400 mt-1.5">${s.total && s.done >= s.total ? '🏆 Платина! Все ачивки получены' : `Получено <b class="text-white">${s.done}</b> из ${s.total} · осталось ${s.left}`}</p>
        <div class="flex flex-wrap items-center gap-2 mt-3">
            ${chip('all', 'Все', s.total)}${chip('left', 'Осталось', s.left)}${chip('done', 'Получено', s.done)}
            <input id="ga-search" class="gd-input ga-search" type="search" placeholder="Поиск…" value="${esc(query)}" aria-label="Поиск по ачивкам">
        </div>
        <ul class="ga-list mt-3">${rows.length ? rows.map(row).join('') : `<li class="text-sm text-gray-500 py-6 text-center">${s.total ? 'Ничего не найдено' : 'Список пуст'}</li>`}</ul>
        <div class="flex flex-wrap gap-2 mt-4 pt-3 border-t border-white/5">
            <button type="button" class="gd-tool" data-ga="to-import">📥 Добавить списком</button>
            <button type="button" class="gd-tool" data-ga="add-one">➕ Добавить одну</button>
            <button type="button" class="gd-tool" data-ga="mark-all">✓ Отметить все</button>
            <button type="button" class="gd-tool" data-ga="reset">↺ Сбросить отметки</button>
            <button type="button" class="gd-tool" data-ga="clear">🗑 Удалить список</button>
        </div>`;
    }

    function paint() {
        const g = gameById(gid);
        if (!g) { modal.classList.add('hidden'); return; }
        const keepSearch = document.activeElement?.id === 'ga-search';
        body.innerHTML = `
        <div class="flex items-start justify-between gap-3 mb-4">
            <div class="min-w-0"><p class="gd-sec-title !mb-1">Список ачивок</p><h3 class="text-lg sm:text-xl font-extrabold text-white truncate">${esc(g.title)}</h3></div>
            <button type="button" class="ga-ico" data-ga="close" aria-label="Закрыть">✕</button>
        </div>
        ${view === 'import' ? importHTML() : listHTML(g)}`;
        if (keepSearch) { const el = $('ga-search'); if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); } }
    }

    function doImport(items, replace) {
        const g = gameById(gid);
        if (!g) return;
        if (!items.length) { toast('Не нашёл ни одной ачивки в тексте', 'error'); return; }
        const wasFull = g.trophy === 'full';
        const r = addMany(g, items, replace);
        commit(g, wasFull);
        toast(`Добавлено ачивок: <b>${r.added}</b>${r.dated ? `, из них отмечено получено: ${r.dated}` : ''}${r.dup ? `, повторов пропущено: ${r.dup}` : ''}`, 'success');
        view = 'list'; paint();
    }

    modal.addEventListener('click', e => {
        if (e.target === modal) { close(); return; }
        const b = e.target.closest('[data-ga]');
        if (!b) return;
        const act = b.dataset.ga;
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
            case 'toggle':
                if (!item) break;
                item.done = !item.done; item.ts = item.done ? Date.now() : 0;
                commit(g, wasFull); paint(); break;
            case 'edit': editId = aid; paint(); $('ga-en')?.focus(); break;
            case 'pick-img': keepEdit(item); imgInput.value = ''; imgInput.click(); break;
            case 'rm-img': keepEdit(item); delete item.img; persistData(); paint(); break;
            case 'copy-prompt': copyText(window.MH_ACH_PROMPT || '').then(ok => toast(ok ? 'Промпт скопирован 📋 — вставь его в нейросеть вместе со скриншотами' : 'Не удалось скопировать — открой Настройки → Промпты', ok ? 'success' : 'error')); break;
            case 'cancel-edit': editId = null; paint(); break;
            case 'save-edit': {
                const n = ($('ga-en')?.value || '').trim();
                if (!item || !n) { toast('Название не может быть пустым', 'error'); break; }
                item.n = n.slice(0, 120); item.d = ($('ga-ed')?.value || '').trim().slice(0, 300);
                const dv = $('ga-edt')?.value;
                if (item.done && dv) { const t = new Date(dv + 'T12:00:00').getTime(); if (isFinite(t)) item.ts = t; }
                editId = null; persistData(); paint(); break;
            }
            case 'del':
                if (!item) break;
                g.achList = listOf(g).filter(a => a !== item);
                if (g.achList.length) commit(g, wasFull); else { persistData(); }
                paint(); break;
            case 'add-one': {
                const n = (prompt('Название ачивки') || '').trim();
                if (!n) break;
                const d = (prompt('Описание (можно оставить пустым)') || '').trim();
                if (!Array.isArray(g.achList)) g.achList = [];
                g.achList.push({ id: uid(), n: n.slice(0, 120), d: d.slice(0, 300), done: false, ts: 0 });
                commit(g, wasFull); paint(); break;
            }
            case 'mark-all':
                listOf(g).forEach(a => { if (!a.done) { a.done = true; a.ts = Date.now(); } });
                commit(g, wasFull); paint(); break;
            case 'reset':
                if (!confirm('Снять отметки со всех ачивок этой игры?')) break;
                listOf(g).forEach(a => { a.done = false; a.ts = 0; });
                commit(g, wasFull); paint(); break;
            case 'clear':
                if (!confirm('Удалить весь список ачивок этой игры? Счётчик «получено / всего» останется как есть.')) break;
                g.achList = []; persistData(); try { updateUI(); } catch (_) {}
                view = 'import'; paint(); break;
        }
    });

    body.addEventListener('input', e => {
        if (e.target.id === 'ga-search') { query = e.target.value; paint(); }
    });
    body.addEventListener('keydown', e => {
        if (e.key === 'Enter' && (e.target.id === 'ga-en' || e.target.id === 'ga-ed')) { e.preventDefault(); body.querySelector('[data-ga="save-edit"]')?.click(); }
    });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !modal.classList.contains('hidden')) { e.stopPropagation(); close(); } }, true);

    /* ---------- картинки ачивок (необязательно) ---------- */
    const imgInput = document.createElement('input');
    imgInput.type = 'file'; imgInput.accept = 'image/*'; imgInput.className = 'hidden';
    document.body.appendChild(imgInput);

    function keepEdit(item) {      // не теряем несохранённый текст при выборе картинки
        if (!item) return;
        const n = ($('ga-en')?.value || '').trim(), d = $('ga-ed')?.value;
        if (n) item.n = n.slice(0, 120);
        if (typeof d === 'string') item.d = d.trim().slice(0, 300);
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

    function injectSection() {
        if (!detailBody || detailBody.querySelector('#ga-sec') || !detailBody.children.length) return;
        const id = currentId();
        const g = gameById(id);
        if (!g) return;
        const s = stats(g);
        const missing = listOf(g).filter(a => !a.done).slice(0, 3);
        const sec = document.createElement('div');
        sec.className = 'gd-sec mt-5';
        sec.id = 'ga-sec';
        sec.innerHTML = s.total ? `
            <p class="gd-sec-title">Список ачивок <span class="normal-case tracking-normal font-semibold text-gray-600">· ${s.done} из ${s.total}</span></p>
            <div class="gs-bar" role="img" aria-label="Ачивки: ${s.pct}%"><span class="gs-seg" style="width:${s.pct}%;--sc:${s.left ? '#fbbf24' : '#facc15'}"></span></div>
            ${s.left ? `<p class="text-xs text-gray-500 mt-1.5">Осталось ${s.left}${missing.length ? ': ' + missing.map(a => esc(a.n)).join(', ') + (s.left > missing.length ? '…' : '') : ''}</p>` : '<p class="text-xs text-gray-500 mt-1.5">🏆 Платина! Все ачивки получены ✓</p>'}
            <button type="button" class="gd-tool mt-3 ga-open" data-gaopen="${g.id}">🏆 Открыть список</button>` : `
            <p class="gd-sec-title">Список ачивок <span class="normal-case tracking-normal font-semibold text-gray-600">· необязательно</span></p>
            <p class="text-xs text-gray-500">Добавь ачивки игры списком и отмечай их по мере прохождения — потом сразу видно, чего не хватает до платины.</p>
            <button type="button" class="gd-tool mt-3 ga-open" data-gaopen="${g.id}">📥 Добавить список ачивок</button>`;
        detailBody.appendChild(sec);
    }

    if (detailBody) {
        detailBody.addEventListener('click', e => {
            const b = e.target.closest('[data-gaopen]');
            if (b) { e.stopPropagation(); open(b.dataset.gaopen); }
        });
        new MutationObserver(() => injectSection()).observe(detailBody, { childList: true });
    }
    window.openGameAchievements = open;

    /* ================= Достижения хаба ================= */
    if (typeof ACHIEVEMENTS_LIST !== 'undefined' && !ACHIEVEMENTS_LIST.some(a => a.id === 'ach_list_maker')) {
        const games = d => d.games || [];
        const ticks = d => games(d).reduce((n, g) => n + (Array.isArray(g.achList) ? g.achList.filter(a => a.done).length : 0), 0);
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

    /* Пересчёт при старте: если список правили вручную, держим счётчики в порядке */
    document.addEventListener('mirvel-ready', () => {
        let ch = false;
        (data.games || []).forEach(g => { if (listOf(g).length) { const before = g.trophyDone + '/' + g.trophyTotal + g.trophy; sync(g); if (before !== g.trophyDone + '/' + g.trophyTotal + g.trophy) ch = true; } });
        if (ch) persistData();
    }, { once: true });
})();
