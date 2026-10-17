/* =========================================================
   MIRVEL HUB — 36-tierlist.js (подключать в самом конце, после 35-copy-games.js)
   Новая страница «Тир-листы 🏅» — как на TierMaker:
   • тиры S/A/B/C/D/F: свои названия, цвета, порядок, можно добавлять и удалять
   • игры и музыка (CD + винил) из вашей коллекции, свои картинки (файлом или ссылкой, в т.ч. ссылка Spotify)
   • импорт данных Spotify (StreamingHistory / Streaming_History_Audio / YourLibrary .json) → топ исполнителей / треков / альбомов
   • перетаскивание мышью и пальцем, сохранение в data.tierLists (попадает в бэкап), экспорт в PNG
   ========================================================= */
(() => {
    'use strict';
    const $ = id => document.getElementById(id);
    const E = s => (typeof esc === 'function' ? esc(s) : String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));
    const toast = (m, t) => { try { showToast(m, t); } catch (_) {} };
    const uid = () => 't' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const save = () => { try { persistData(); } catch (_) {} };
    const imgSrc = s => { const v = String(s || ''); return /^data:image\//i.test(v) ? v : (typeof safeUrl === 'function' ? safeUrl(v) : ''); };

    const COLORS = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e', '#06b6d4', '#6366f1', '#d946ef'];
    const mkTiers = labels => labels.map((t, i) => ({ id: uid() + i, label: t, color: COLORS[i % COLORS.length] }));
    const lists = () => { if (!Array.isArray(data.tierLists)) data.tierLists = []; return data.tierLists; };
    const L = () => lists().find(l => l.id === data.tierActive) || lists()[0];
    const fg = hex => { const n = parseInt(hex.slice(1), 16); return ((n >> 16) * .299 + ((n >> 8) & 255) * .587 + (n & 255) * .114) > 150 ? '#111' : '#fff'; };
    const hue = s => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) % 360; return h; };

    let tab = 'games', q = '', addOpen = false;
    const pick = new Set();

    /* ---------- Предметы ---------- */
    function info(it) {
        if (it.src === 'custom') return { t: it.t, sub: it.sub, img: it.img };
        const o = (data[it.src] || []).find(x => String(x.id) === String(it.ref));
        return o ? { t: o.title, sub: it.src === 'games' ? o.platform : o.artist, img: o.img } : null;
    }
    function addItems(l, arr) {
        let n = 0;
        arr.forEach(a => {
            if (a.src !== 'custom' && l.items.some(x => x.src === a.src && String(x.ref) === String(a.ref))) return;
            if (a.src === 'custom' && a.key && l.items.some(x => x.key === a.key)) return;
            l.items.push({ id: uid(), tier: '', ...a }); n++;
        });
        return n;
    }
    const fromCollection = (src, o) => ({ src, ref: o.id });
    const allMusic = () => [...(data.cds || []).map(o => ['cds', o]), ...(data.vinyls || []).map(o => ['vinyls', o])];

    function createList(name, kind) {
        const l = { id: uid(), name: name || 'Мой тир-лист', shape: kind === 'games' ? 'pt' : 'sq', caps: false, size: 92, tiers: mkTiers(['S', 'A', 'B', 'C', 'D', 'F']), items: [] };
        if (kind === 'games') addItems(l, (data.games || []).map(o => fromCollection('games', o)));
        if (kind === 'music') addItems(l, allMusic().map(([s, o]) => fromCollection(s, o)));
        lists().push(l); data.tierActive = l.id; save();
        return l;
    }

    /* ---------- Каркас страницы ---------- */
    const css = document.createElement('style');
    css.textContent = `
    #tiers{--tl-s:92px}
    .tl-bar{display:flex;flex-wrap:wrap;gap:.6rem;align-items:center;padding:.8rem 1rem;border-radius:1.2rem;margin:1rem 0}
    .tl-bar .sp{flex:1}
    .tl-sel,.tl-in{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);color:#fff;border-radius:.8rem;padding:.55rem .8rem;font-size:.85rem;outline:none;min-width:0}
    .tl-sel option{background:#17171f}
    .tl-in:focus,.tl-sel:focus{border-color:rgb(var(--theme-rgb,139,92,246))}
    .tl-b{font-size:.78rem;font-weight:800;padding:.55rem .9rem;border-radius:.8rem;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.05);color:#d1d5db;cursor:pointer;transition:all .18s;white-space:nowrap}
    .tl-b:hover{background:rgba(255,255,255,.12);color:#fff;transform:translateY(-1px)}
    .tl-b.on{background:rgba(var(--theme-rgb,139,92,246),.3);border-color:rgb(var(--theme-rgb,139,92,246));color:#fff}
    .tl-b.main{background:linear-gradient(135deg,rgb(var(--theme-rgb,139,92,246)),#06b6d4);border:0;color:#fff}
    .tl-new{display:none;gap:.5rem;flex-wrap:wrap;align-items:center;width:100%;padding-top:.4rem;animation:tl-in .3s}
    .tl-new.open{display:flex}
    @keyframes tl-in{from{opacity:0;transform:translateY(-6px)}}
    .tl-board{border-radius:1.2rem;overflow:hidden;border:1px solid rgba(255,255,255,.08);background:rgba(0,0,0,.25)}
    .tl-row{display:flex;border-bottom:2px solid #0b0b10;min-height:calc(var(--tl-s)*var(--tl-r,1) + 14px)}
    .tl-row:last-child{border-bottom:0}
    .tl-lab{position:relative;flex:none;width:6.2rem;display:flex;align-items:center;justify-content:center;padding:.4rem}
    .tl-lab-in{width:100%;background:transparent;border:0;outline:0;text-align:center;font-weight:900;font-size:1.25rem;color:inherit;word-break:break-word}
    .tl-ctl{position:absolute;inset:auto 0 3px 0;display:flex;justify-content:center;gap:2px;opacity:0;transition:opacity .2s}
    .tl-lab:hover .tl-ctl,.tl-lab:focus-within .tl-ctl{opacity:1}
    @media (hover:none){.tl-ctl{opacity:.85}}
    .tl-ctl button,.tl-ctl label{width:1.3rem;height:1.3rem;font-size:.65rem;border-radius:.4rem;background:rgba(0,0,0,.4);color:#fff;cursor:pointer;display:grid;place-items:center;border:0}
    .tl-ctl input{position:absolute;opacity:0;width:0;height:0}
    .tl-zone{flex:1;display:flex;flex-wrap:wrap;align-content:flex-start;gap:5px;padding:7px;min-width:0;transition:background .2s,box-shadow .2s}
    .tl-zone.is-over{background:rgba(var(--theme-rgb,139,92,246),.16);box-shadow:inset 0 0 0 2px rgba(var(--theme-rgb,139,92,246),.7)}
    .tl-tile{position:relative;flex:none;width:var(--tl-s);height:calc(var(--tl-s)*var(--tl-r,1));border-radius:.55rem;overflow:hidden;cursor:grab;touch-action:none;user-select:none;-webkit-user-select:none;background:#1a1a24;box-shadow:0 2px 8px rgba(0,0,0,.4);transition:transform .15s,box-shadow .15s}
    .tl-tile:hover{transform:translateY(-3px) scale(1.04);box-shadow:0 8px 20px rgba(0,0,0,.55);z-index:2}
    .tl-tile.is-drag{opacity:.25}
    .tl-tile.tl-pop{animation:tl-pop .4s cubic-bezier(.3,1.6,.5,1)}
    @keyframes tl-pop{from{transform:scale(.6);opacity:0}}
    .tl-tile img,.tl-fb{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;pointer-events:none}
    .tl-fb{display:flex;align-items:center;justify-content:center;text-align:center;padding:.3rem;font-size:.68rem;font-weight:800;line-height:1.15;color:#fff;overflow:hidden}
    .tl-cap{position:absolute;left:0;right:0;bottom:0;padding:.9rem .3rem .25rem;font-size:.6rem;font-weight:700;line-height:1.1;text-align:center;color:#fff;background:linear-gradient(transparent,rgba(0,0,0,.85));opacity:0;transition:opacity .2s;pointer-events:none;overflow:hidden;max-height:60%}
    .tl-tile:hover .tl-cap,#tiers.tl-caps .tl-cap{opacity:1}
    .tl-x{position:absolute;top:2px;right:2px;width:1.2rem;height:1.2rem;border-radius:50%;border:0;background:rgba(0,0,0,.65);color:#fff;font-size:.6rem;cursor:pointer;opacity:0;transition:opacity .15s}
    .tl-tile:hover .tl-x{opacity:1}
    .tl-ghost{position:fixed;z-index:90;pointer-events:none;transform:translate(-50%,-50%) scale(1.1) rotate(4deg);box-shadow:0 18px 40px rgba(0,0,0,.6);opacity:.95}
    .tl-ins{flex:none;width:4px;height:calc(var(--tl-s)*var(--tl-r,1));border-radius:2px;background:rgb(var(--theme-rgb,139,92,246));box-shadow:0 0 12px rgb(var(--theme-rgb,139,92,246));animation:tl-in .15s}
    body.tl-dragging,body.tl-dragging *{cursor:grabbing!important}
    .tl-pool{border-radius:1.2rem;margin-top:1.2rem;overflow:hidden}
    .tl-pool .tl-zone{min-height:calc(var(--tl-s)*var(--tl-r,1) + 20px)}
    .tl-ph{display:flex;flex-wrap:wrap;gap:.6rem;align-items:center;padding:.8rem 1rem;border-bottom:1px solid rgba(255,255,255,.07)}
    .tl-ph b{font-weight:900}
    .tl-add{margin-top:1.2rem;padding:1.1rem 1.2rem;border-radius:1.2rem;animation:tl-in .3s}
    .tl-tabs{display:flex;gap:.4rem;flex-wrap:wrap;margin-bottom:.9rem}
    .tl-cands{display:grid;grid-template-columns:repeat(auto-fill,minmax(78px,1fr));gap:6px;max-height:19rem;overflow-y:auto;margin:.8rem 0;padding:2px}
    .tl-cand{position:relative;aspect-ratio:3/4;border-radius:.5rem;overflow:hidden;cursor:pointer;background:#1a1a24;outline:2px solid transparent;transition:all .15s}
    .tl-cand:hover{transform:scale(1.05)}
    .tl-cand.sel{outline-color:rgb(var(--theme-rgb,139,92,246));transform:scale(.94)}
    .tl-cand.sel::after{content:"✓";position:absolute;top:3px;right:3px;width:1.1rem;height:1.1rem;border-radius:50%;background:rgb(var(--theme-rgb,139,92,246));display:grid;place-items:center;font-size:.65rem;font-weight:900}
    .tl-row2{display:flex;flex-wrap:wrap;gap:.5rem;align-items:center;margin-top:.6rem}
    .tl-hint{font-size:.75rem;color:#9ca3af;margin-top:.5rem;line-height:1.5}
    .tl-empty{padding:1.2rem;color:#6b7280;font-size:.85rem;width:100%;text-align:center}
    @media (max-width:640px){.tl-lab{width:4.2rem}.tl-lab-in{font-size:1rem}}
    @media (prefers-reduced-motion:reduce){.tl-tile,.tl-zone,.tl-cap{transition:none!important}.tl-tile.tl-pop,.tl-add,.tl-new{animation:none!important}}`;
    document.head.appendChild(css);

    const main = $('main') || document.querySelector('main');
    const sec = document.createElement('section');
    sec.id = 'tiers';
    sec.className = 'page hidden';
    sec.innerHTML = `
        <h2 class="text-4xl font-bold">Тир-листы 🏅</h2>
        <p class="text-gray-500">Расставляйте игры и музыку по рангам — перетаскивайте карточки в нужный тир</p>
        <div class="tl-bar glass no-hover">
            <select class="tl-sel" id="tl-sel" aria-label="Тир-лист"></select>
            <button class="tl-b main" data-a="new">＋ Новый</button>
            <button class="tl-b" data-a="rename" title="Переименовать">✎</button>
            <button class="tl-b" data-a="delete" title="Удалить тир-лист">🗑</button>
            <span class="sp"></span>
            <button class="tl-b" data-a="shape" id="tl-shape"></button>
            <button class="tl-b" data-a="caps" id="tl-caps">🏷 Подписи</button>
            <label class="tl-hint" style="margin:0">Размер <input type="range" id="tl-size" min="56" max="150" style="width:90px;vertical-align:middle"></label>
            <button class="tl-b main" data-a="export">🖼 Скачать PNG</button>
            <div class="tl-new" id="tl-new">
                <input class="tl-in" id="tl-nname" placeholder="Название, например «Топ игр»" maxlength="60" style="flex:1;min-width:160px">
                <select class="tl-sel" id="tl-nkind"><option value="games">🎮 Все мои игры</option><option value="music">🎵 Вся моя музыка (CD + винил)</option><option value="empty">Пустой (добавлю сам)</option></select>
                <button class="tl-b main" data-a="create">Создать</button>
            </div>
        </div>
        <div id="tl-body"></div>`;
    main.appendChild(sec);
    if (!VALID_PAGES.includes('tiers')) VALID_PAGES.push('tiers');
    PAGE_TITLES.tiers = 'Тир-листы';
    const navGames = $('nav-games');
    if (navGames) {
        const nb = document.createElement('button');
        nb.type = 'button'; nb.id = 'nav-tiers'; nb.className = 'nav-btn';
        nb.setAttribute('onclick', "showPage('tiers')");
        nb.innerHTML = '<span class="nav-ico" aria-hidden="true">🏅</span><span>Тир-листы</span>';
        (navGames.nextElementSibling ? navGames.parentElement.insertBefore(nb, navGames.nextElementSibling) : navGames.parentElement.appendChild(nb));
    }
    const origShow = window.showPage;
    window.showPage = function (id, o) { const r = origShow.apply(this, arguments); if (id === 'tiers') render(); return r; };

    /* ---------- Отрисовка ---------- */
    function tileHTML(it, pop) {
        const i = info(it); if (!i) return '';
        const src = imgSrc(i.img), h = hue(i.t);
        return `<div class="tl-tile${pop ? ' tl-pop' : ''}" data-id="${it.id}" title="${E(i.t)}${i.sub ? ' — ' + E(i.sub) : ''}">
            <div class="tl-fb" style="background:linear-gradient(135deg,hsl(${h} 55% 38%),hsl(${(h + 50) % 360} 55% 20%))">${E(i.t)}</div>
            ${src ? `<img src="${E(src)}" alt="" draggable="false" loading="lazy" onerror="this.remove()">` : ''}
            <span class="tl-cap">${E(i.t)}</span><button class="tl-x" data-a="rm" title="Убрать из тир-листа">✕</button></div>`;
    }

    let popId = null;
    function render() {
        let l = L();
        const sel = $('tl-sel');
        sel.innerHTML = lists().map(x => `<option value="${x.id}"${l && x.id === l.id ? ' selected' : ''}>${E(x.name)}</option>`).join('') || '<option>— нет тир-листов —</option>';
        const body = $('tl-body');
        if (!l) {
            body.innerHTML = `<div class="glass no-hover" style="padding:2.5rem;border-radius:1.4rem;text-align:center">
                <p style="font-size:3rem">🏅</p><p style="font-weight:900;font-size:1.2rem;margin:.4rem 0">Создайте первый тир-лист</p>
                <p class="tl-hint">Можно сразу загрузить все ваши игры или музыку и расставить по рангам.</p>
                <div class="tl-row2" style="justify-content:center"><button class="tl-b main" data-a="quick-games">🎮 Тир-лист по моим играм</button><button class="tl-b" data-a="quick-music">🎵 По моей музыке</button></div></div>`;
            return;
        }
        data.tierActive = l.id;
        sec.classList.toggle('tl-caps', !!l.caps);
        sec.style.setProperty('--tl-s', (l.size || 92) + 'px');
        sec.style.setProperty('--tl-r', l.shape === 'pt' ? 1.33 : 1);
        $('tl-size').value = l.size || 92;
        $('tl-shape').textContent = l.shape === 'pt' ? '▯ Портрет' : '▢ Квадрат';
        $('tl-caps').classList.toggle('on', !!l.caps);
        const pool = l.items.filter(x => !x.tier && (!q || (info(x)?.t || '').toLowerCase().includes(q.toLowerCase())));
        const poolAll = l.items.filter(x => !x.tier).length;
        body.innerHTML = `
        <div class="tl-board">${l.tiers.map(t => `
            <div class="tl-row" data-tid="${t.id}">
                <div class="tl-lab" style="background:${t.color};color:${fg(t.color)}">
                    <input class="tl-lab-in" value="${E(t.label)}" maxlength="24" data-tl="${t.id}" aria-label="Название тира">
                    <div class="tl-ctl"><label title="Цвет">🎨<input type="color" value="${t.color}" data-col="${t.id}"></label><button data-a="up" title="Выше">↑</button><button data-a="dn" title="Ниже">↓</button><button data-a="deltier" title="Удалить тир">✕</button></div>
                </div>
                <div class="tl-zone" data-tier="${t.id}">${l.items.filter(x => x.tier === t.id).map(x => tileHTML(x, x.id === popId)).join('')}</div>
            </div>`).join('')}
        </div>
        <div style="margin-top:.7rem"><button class="tl-b" data-a="addtier">＋ Добавить тир</button></div>
        <div class="tl-pool glass no-hover">
            <div class="tl-ph"><b>Не размещено · ${poolAll}</b>
                <input class="tl-in" id="tl-q" placeholder="🔍 Поиск" value="${E(q)}" style="width:150px">
                <span style="flex:1"></span>
                <button class="tl-b${addOpen ? ' on' : ''}" data-a="toggleadd">＋ Добавить игры / музыку</button>
                <button class="tl-b" data-a="reset" title="Вернуть все карточки вниз">↺ Сбросить</button></div>
            <div class="tl-zone" data-tier="">${pool.map(x => tileHTML(x, x.id === popId)).join('') || `<div class="tl-empty">${poolAll ? 'Ничего не найдено' : 'Здесь появятся карточки — нажмите «Добавить игры / музыку»'}</div>`}</div>
        </div>
        <div id="tl-addp"></div>`;
        popId = null;
        renderAdd();
    }

    function renderAdd() {
        const host = $('tl-addp'); if (!host) return;
        const l = L();
        if (!addOpen || !l) { host.innerHTML = ''; return; }
        host.innerHTML = `<div class="tl-add glass no-hover">
            <div class="tl-tabs">${[['games', '🎮 Игры'], ['music', '🎵 Музыка'], ['custom', '🖼 Своё'], ['spotify', '🟢 Spotify']].map(([k, t]) => `<button class="tl-b${tab === k ? ' on' : ''}" data-a="tab" data-v="${k}">${t}</button>`).join('')}</div>
            <div id="tl-tabbody"></div></div>`;
        renderTab();
    }

    const candidates = () => {
        const l = L(), have = new Set(l.items.filter(x => x.src !== 'custom').map(x => x.src + ':' + x.ref));
        const src = tab === 'games' ? (data.games || []).map(o => ['games', o]) : allMusic();
        const k = q.toLowerCase();
        return src.filter(([s, o]) => !have.has(s + ':' + o.id) && (!k || (o.title || '').toLowerCase().includes(k) || (o.artist || '').toLowerCase().includes(k)));
    };

    function renderTab() {
        const b = $('tl-tabbody'); if (!b) return;
        if (tab === 'games' || tab === 'music') {
            const c = candidates();
            b.innerHTML = c.length ? `<div class="tl-hint">Нажимайте на карточки, чтобы выбрать. Осталось не добавлено: ${c.length}</div>
                <div class="tl-cands">${c.map(([s, o]) => { const src = imgSrc(o.img), h = hue(o.title); return `<div class="tl-cand${pick.has(s + ':' + o.id) ? ' sel' : ''}" data-pk="${s}:${o.id}" title="${E(o.title)}"><div class="tl-fb" style="background:linear-gradient(135deg,hsl(${h} 55% 38%),hsl(${(h + 50) % 360} 55% 20%))">${E(o.title)}</div>${src ? `<img src="${E(src)}" alt="" loading="lazy" onerror="this.remove()">` : ''}</div>`; }).join('')}</div>
                <div class="tl-row2"><button class="tl-b main" data-a="addsel">Добавить выбранные (${[...pick].length})</button><button class="tl-b" data-a="addall">Добавить все (${c.length})</button></div>`
                : `<div class="tl-empty">${tab === 'games' ? 'Все игры уже в тир-листе (или их нет в коллекции)' : 'Вся музыка уже в тир-листе (или её нет в коллекции)'}</div>`;
        } else if (tab === 'custom') {
            b.innerHTML = `<div class="tl-hint">Свои картинки для тир-листа: загрузите файлы (можно сразу много) или вставьте ссылку на картинку / трек / альбом Spotify.</div>
                <div class="tl-row2"><label class="tl-b main" style="cursor:pointer">📁 Загрузить картинки<input type="file" id="tl-files" accept="image/*" multiple hidden></label></div>
                <div class="tl-row2"><input class="tl-in" id="tl-cn" placeholder="Название" style="flex:1;min-width:140px"><input class="tl-in" id="tl-cs" placeholder="Исполнитель / подпись" style="flex:1;min-width:140px"></div>
                <div class="tl-row2"><input class="tl-in" id="tl-cu" placeholder="Ссылка на картинку или Spotify" style="flex:2;min-width:200px"><button class="tl-b main" data-a="addurl">Добавить</button></div>
                <div class="tl-hint">Для ссылки Spotify название и обложка подтянутся сами, если Spotify разрешит запрос из браузера. Иначе вставьте прямую ссылку на картинку или загрузите файл.</div>`;
        } else {
            b.innerHTML = `<div class="tl-hint">В Spotify: Аккаунт → Конфиденциальность → «Скачать данные». Загрузите сюда файлы <b>StreamingHistory*.json</b>, <b>Streaming_History_Audio*.json</b> или <b>YourLibrary.json</b>.</div>
                <div class="tl-row2"><label class="tl-b main" style="cursor:pointer">📁 Выбрать .json<input type="file" id="tl-sp" accept=".json,application/json" multiple hidden></label>
                <select class="tl-sel" id="tl-spm"><option value="artist">Топ исполнителей</option><option value="track">Топ треков</option><option value="album">Топ альбомов</option></select>
                <select class="tl-sel" id="tl-spn"><option>30</option><option selected>50</option><option>100</option><option>200</option></select></div>
                <div class="tl-row2"><button class="tl-b" data-a="covers">🖼 Подтянуть обложки (iTunes)</button><span class="tl-hint" id="tl-spst"></span></div>
                <div class="tl-hint">В Spotify-выгрузке нет картинок, поэтому карточки сначала без обложек. Кнопка выше ищет обложки в iTunes (у него лимит около 20 запросов в минуту — если остановится, нажмите ещё раз через минуту, продолжит с того же места). Для «Топ альбомов» нужен расширенный файл Streaming_History_Audio.</div>`;
        }
    }

    /* ---------- Картинки ---------- */
    function compress(src, max = 420) {
        return new Promise((res, rej) => {
            const im = new Image();
            im.onload = () => {
                const k = Math.min(1, max / Math.max(im.width, im.height)), c = document.createElement('canvas');
                c.width = Math.max(1, Math.round(im.width * k)); c.height = Math.max(1, Math.round(im.height * k));
                c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
                res(c.toDataURL('image/jpeg', .82));
            };
            im.onerror = rej; im.src = src;
        });
    }
    const readFile = f => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(f); });
    async function toDataUrl(url) {   // пытаемся сохранить картинку у себя; если сайт не разрешает — оставим ссылку
        try { const b = await (await fetch(url)).blob(); return await compress(await readFile(b)); } catch (_) { return url; }
    }

    /* ---------- Spotify ---------- */
    async function importSpotify(files) {
        const mode = $('tl-spm').value, top = +$('tl-spn').value, agg = new Map();
        const add = (name, artist, album, ms, plays) => {
            const nm = mode === 'artist' ? artist : mode === 'album' ? album : name;
            if (!nm) return;
            const key = (nm + '|' + (mode === 'artist' ? '' : artist || '')).toLowerCase();
            const a = agg.get(key) || { t: nm, sub: mode === 'artist' ? '' : artist || '', ms: 0, n: 0 };
            a.ms += ms; a.n += plays; agg.set(key, a);
        };
        for (const f of files) {
            let j; try { j = JSON.parse(await f.text()); } catch (_) { toast(`Не удалось прочитать ${E(f.name)}`, 'error'); continue; }
            if (Array.isArray(j)) j.forEach(r => {
                const ms = Number(r.msPlayed ?? r.ms_played ?? 0);
                add(r.trackName || r.master_metadata_track_name, r.artistName || r.master_metadata_album_artist_name, r.master_metadata_album_album_name, ms, ms >= 30000 ? 1 : 0);
            });
            else {
                (j.tracks || []).forEach(t => add(t.track, t.artist, t.album, 0, 1));
                (j.albums || []).forEach(t => { if (mode === 'album') add('', t.artist, t.album, 0, 1); });
                (j.artists || []).forEach(t => { if (mode === 'artist') add('', t.name, '', 0, 1); });
            }
        }
        const sorted = [...agg.values()].filter(a => a.n > 0 || a.ms > 0).sort((a, b) => b.ms - a.ms || b.n - a.n).slice(0, top);
        if (!sorted.length) { toast(mode === 'album' ? 'Альбомов не найдено — нужен файл Streaming_History_Audio или YourLibrary' : 'В файлах ничего не нашлось', 'error'); return; }
        const n = addItems(L(), sorted.map(a => ({ src: 'custom', t: a.t, sub: a.sub, img: '', kind: mode, key: 'sp:' + mode + ':' + (a.t + '|' + a.sub).toLowerCase() })));
        save(); render();
        toast(`Добавлено: <b>${n}</b>. Теперь можно подтянуть обложки 🖼`, 'success');
    }

    let covering = false;
    async function fetchCovers() {
        if (covering) return;
        const l = L(), todo = l.items.filter(x => x.src === 'custom' && !x.img && x.kind && !x.noCover);
        const st = $('tl-spst');
        if (!todo.length) { toast('Нет карточек без обложек', 'info'); return; }
        covering = true; let ok = 0;
        for (let i = 0; i < todo.length; i++) {
            const it = todo[i];
            if (st) st.textContent = `Ищу обложки: ${i + 1} / ${todo.length}`;
            try {
                const ent = it.kind === 'track' ? 'song' : 'album';
                const r = await fetch(`https://itunes.apple.com/search?limit=1&media=music&entity=${ent}&term=${encodeURIComponent((it.sub + ' ' + it.t).trim())}`);
                if (!r.ok) throw new Error('limit');
                const art = (await r.json()).results?.[0]?.artworkUrl100;
                if (art) { it.img = await toDataUrl(art.replace('100x100bb', '400x400bb')); ok++; } else it.noCover = true;
            } catch (_) { toast('iTunes остановил запросы (лимит или нет доступа). Нажмите ещё раз через минуту', 'error'); break; }
            if (i % 5 === 4) { save(); render(); }
            await new Promise(r => setTimeout(r, 3100));
        }
        covering = false; save(); render();
        toast(`Обложек найдено: <b>${ok}</b>`, ok ? 'success' : 'info');
    }

    /* ---------- Действия ---------- */
    async function onClick(e) {
        const t = e.target;
        const pk = t.closest('[data-pk]');
        if (pk) { const k = pk.dataset.pk; pick.has(k) ? pick.delete(k) : pick.add(k); pk.classList.toggle('sel', pick.has(k)); const bt = document.querySelector('[data-a="addsel"]'); if (bt) bt.textContent = `Добавить выбранные (${pick.size})`; return; }
        const a = t.closest('[data-a]'); if (!a) return;
        const act = a.dataset.a, l = L(), row = a.closest('.tl-row');
        const tier = row && l?.tiers.find(x => x.id === row.dataset.tid);
        switch (act) {
            case 'new': $('tl-new').classList.toggle('open'); $('tl-nname').focus(); return;
            case 'create': { const k = $('tl-nkind').value; createList($('tl-nname').value.trim(), k); $('tl-new').classList.remove('open'); $('tl-nname').value = ''; addOpen = k === 'empty'; render(); return; }
            case 'quick-games': createList('Мой топ игр', 'games'); return render();
            case 'quick-music': createList('Мой топ музыки', 'music'); return render();
            case 'rename': { if (!l) return; const n = prompt('Название тир-листа', l.name); if (n && n.trim()) { l.name = n.trim().slice(0, 60); save(); render(); } return; }
            case 'delete': { if (l && confirm(`Удалить тир-лист «${l.name}»?`)) { data.tierLists = lists().filter(x => x !== l); data.tierActive = ''; save(); render(); } return; }
            case 'shape': l.shape = l.shape === 'pt' ? 'sq' : 'pt'; break;
            case 'caps': l.caps = !l.caps; break;
            case 'export': return exportPng();
            case 'addtier': l.tiers.push({ id: uid(), label: 'Новый', color: COLORS[l.tiers.length % COLORS.length] }); break;
            case 'deltier': { if (l.tiers.length <= 1) return toast('Нужен хотя бы один тир', 'error'); l.items.forEach(x => { if (x.tier === tier.id) x.tier = ''; }); l.tiers = l.tiers.filter(x => x !== tier); break; }
            case 'up': case 'dn': { const i = l.tiers.indexOf(tier), j = act === 'up' ? i - 1 : i + 1; if (j < 0 || j >= l.tiers.length) return; [l.tiers[i], l.tiers[j]] = [l.tiers[j], l.tiers[i]]; break; }
            case 'rm': { const id = t.closest('.tl-tile').dataset.id; l.items = l.items.filter(x => x.id !== id); break; }
            case 'reset': l.items.forEach(x => { x.tier = ''; }); break;
            case 'toggleadd': addOpen = !addOpen; break;
            case 'tab': tab = a.dataset.v; pick.clear(); return renderAdd();
            case 'addsel': { const n = addItems(l, [...pick].map(k => { const [s, id] = k.split(':'); return { src: s, ref: id }; })); pick.clear(); toast(`Добавлено: <b>${n}</b>`, 'success'); break; }
            case 'addall': { const n = addItems(l, candidates().map(([s, o]) => ({ src: s, ref: o.id }))); pick.clear(); toast(`Добавлено: <b>${n}</b>`, 'success'); break; }
            case 'addurl': {
                let u = $('tl-cu').value.trim(), name = $('tl-cn').value.trim(), sub = $('tl-cs').value.trim(), img = '';
                if (!u && !name) return toast('Вставьте ссылку или введите название', 'error');
                if (/spotify\.com/i.test(u)) {
                    try { const o = await (await fetch('https://open.spotify.com/oembed?url=' + encodeURIComponent(u))).json(); img = await toDataUrl(o.thumbnail_url); name = name || o.title; }
                    catch (_) { toast('Spotify не отдал данные. Вставьте прямую ссылку на картинку или загрузите файл', 'error'); if (!name) return; }
                } else if (u) img = /^https?:/i.test(u) ? await toDataUrl(u) : '';
                addItems(l, [{ src: 'custom', t: name || 'Без названия', sub, img }]);
                ['tl-cu', 'tl-cn', 'tl-cs'].forEach(i => { $(i).value = ''; });
                break;
            }
            case 'covers': return fetchCovers();
            default: return;
        }
        save(); render();
    }

    async function onChange(e) {
        const t = e.target, l = L();
        if (t.id === 'tl-sel') { data.tierActive = t.value; save(); return render(); }
        if (t.id === 'tl-size') { l.size = +t.value; sec.style.setProperty('--tl-s', t.value + 'px'); return save(); }
        if (t.dataset.tl) { const x = l.tiers.find(z => z.id === t.dataset.tl); if (x) { x.label = t.value; save(); } return; }
        if (t.dataset.col) { const x = l.tiers.find(z => z.id === t.dataset.col); if (x) { x.color = t.value; save(); render(); } return; }
        if (t.id === 'tl-files') {
            const arr = [];
            for (const f of t.files) { try { arr.push({ src: 'custom', t: f.name.replace(/\.[^.]+$/, ''), sub: '', img: await compress(await readFile(f)) }); } catch (_) {} }
            const n = addItems(l, arr); save(); render(); toast(`Добавлено картинок: <b>${n}</b>. Двойной клик по карточке — переименовать`, 'success');
        }
        if (t.id === 'tl-sp') { await importSpotify([...t.files]); }
    }

    sec.addEventListener('click', onClick);
    sec.addEventListener('change', onChange);
    sec.addEventListener('input', e => { if (e.target.id === 'tl-q') { q = e.target.value; const l = L(); const pz = sec.querySelector('.tl-pool .tl-zone'); render(); const i = $('tl-q'); i.focus(); i.setSelectionRange(q.length, q.length); } });
    sec.addEventListener('dblclick', e => {
        const tile = e.target.closest('.tl-tile'); if (!tile) return;
        const it = L().items.find(x => x.id === tile.dataset.id); if (!it || it.src !== 'custom') return;
        const n = prompt('Название', it.t); if (n && n.trim()) { it.t = n.trim(); save(); render(); }
    });

    /* ---------- Перетаскивание (мышь и палец) ---------- */
    let drag = null, ins = null;
    sec.addEventListener('pointerdown', e => {
        const tile = e.target.closest('.tl-tile');
        if (!tile || e.target.closest('.tl-x') || (e.pointerType === 'mouse' && e.button !== 0)) return;
        drag = { id: tile.dataset.id, tile, x: e.clientX, y: e.clientY, on: false, zone: null, before: null };
    });
    window.addEventListener('pointermove', e => {
        if (!drag) return;
        if (!drag.on) {
            if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 7) return;
            drag.on = true;
            const g = drag.tile.cloneNode(true); g.classList.add('tl-ghost'); g.style.width = drag.tile.offsetWidth + 'px'; g.style.height = drag.tile.offsetHeight + 'px';
            document.body.appendChild(g); drag.ghost = g; drag.tile.classList.add('is-drag'); document.body.classList.add('tl-dragging');
            ins = document.createElement('div'); ins.className = 'tl-ins';
        }
        e.preventDefault();
        drag.ghost.style.left = e.clientX + 'px'; drag.ghost.style.top = e.clientY + 'px';
        if (e.clientY < 70) main.scrollBy(0, -14); else if (e.clientY > innerHeight - 70) main.scrollBy(0, 14);
        const z = document.elementFromPoint(e.clientX, e.clientY)?.closest('.tl-zone');
        sec.querySelectorAll('.tl-zone.is-over').forEach(x => { if (x !== z) x.classList.remove('is-over'); });
        drag.zone = z || null; drag.before = null;
        if (!z) { ins.remove(); return; }
        z.classList.add('is-over');
        const tiles = [...z.querySelectorAll('.tl-tile:not(.is-drag)')];
        const nxt = tiles.find(t => { const r = t.getBoundingClientRect(); return e.clientY < r.top || (e.clientY <= r.bottom && e.clientX < r.left + r.width / 2); });
        drag.before = nxt ? nxt.dataset.id : null;
        nxt ? z.insertBefore(ins, nxt) : z.appendChild(ins);
    }, { passive: false });
    const endDrag = () => {
        if (!drag) return;
        const d = drag; drag = null;
        if (!d.on) return;
        d.ghost.remove(); ins?.remove(); document.body.classList.remove('tl-dragging');
        sec.querySelectorAll('.tl-zone.is-over').forEach(x => x.classList.remove('is-over'));
        if (!d.zone) { d.tile.classList.remove('is-drag'); return; }
        const l = L(), i = l.items.findIndex(x => x.id === d.id); if (i < 0) return;
        const [it] = l.items.splice(i, 1); it.tier = d.zone.dataset.tier;
        let j = d.before ? l.items.findIndex(x => x.id === d.before) : -1;
        if (j < 0) { let last = -1; l.items.forEach((x, k) => { if (x.tier === it.tier) last = k; }); j = last + 1; }
        l.items.splice(j, 0, it); popId = it.id; save(); render();
    };
    window.addEventListener('pointerup', endDrag);
    window.addEventListener('pointercancel', endDrag);

    /* ---------- Экспорт в PNG ---------- */
    const loadImg = src => new Promise(res => { const im = new Image(); im.crossOrigin = 'anonymous'; im.onload = () => res(im); im.onerror = () => res(null); im.src = src; });
    function wrap(ctx, text, maxW) {
        const out = []; let line = '';
        String(text).split(/\s+/).forEach(w => { const t = line ? line + ' ' + w : w; if (ctx.measureText(t).width > maxW && line) { out.push(line); line = w; } else line = t; });
        if (line) out.push(line); return out;
    }
    async function exportPng() {
        const l = L(); if (!l) return;
        toast('Рисую картинку…', 'info');
        const S = 120, G = 6, LAB = 150, W = 1280, TH = l.shape === 'pt' ? Math.round(S * 1.33) : S, cols = Math.floor((W - LAB - 12) / (S + G));
        const imgs = new Map();
        await Promise.all([...new Set(l.items.filter(x => x.tier).map(x => imgSrc(info(x)?.img)).filter(Boolean))].map(async s => imgs.set(s, await loadImg(s))));
        const rowH = n => Math.max(1, Math.ceil(n / cols)) * (TH + G) + G;
        const rows = l.tiers.map(t => ({ t, items: l.items.filter(x => x.tier === t.id) }));
        const H = 80 + rows.reduce((s, r) => s + rowH(r.items.length) + 3, 0) + 36;
        const c = document.createElement('canvas'); c.width = W; c.height = H;
        const x = c.getContext('2d');
        x.fillStyle = '#0e0e14'; x.fillRect(0, 0, W, H);
        x.fillStyle = '#fff'; x.font = '900 36px sans-serif'; x.textBaseline = 'middle'; x.fillText(l.name, 24, 42);
        let y = 80, missed = 0;
        rows.forEach(({ t, items }) => {
            const h = rowH(items.length);
            x.fillStyle = t.color; x.fillRect(0, y, LAB, h);
            x.fillStyle = fg(t.color); x.font = '900 30px sans-serif'; x.textAlign = 'center';
            const ls = wrap(x, t.label, LAB - 16); ls.forEach((s, i) => x.fillText(s, LAB / 2, y + h / 2 + (i - (ls.length - 1) / 2) * 34));
            x.textAlign = 'left'; x.fillStyle = '#1a1a24'; x.fillRect(LAB, y, W - LAB, h);
            items.forEach((it, i) => {
                const inf = info(it) || { t: '' }, px = LAB + G + (i % cols) * (S + G), py = y + G + Math.floor(i / cols) * (TH + G);
                const im = imgs.get(imgSrc(inf.img));
                x.save(); x.beginPath(); x.roundRect(px, py, S, TH, 8); x.clip();
                if (im) { const k = Math.max(S / im.width, TH / im.height), w = im.width * k, hh = im.height * k; x.drawImage(im, px + (S - w) / 2, py + (TH - hh) / 2, w, hh); }
                else {
                    if (imgSrc(inf.img)) missed++;
                    const g = x.createLinearGradient(px, py, px + S, py + TH), hh = hue(inf.t); g.addColorStop(0, `hsl(${hh} 55% 38%)`); g.addColorStop(1, `hsl(${(hh + 50) % 360} 55% 20%)`);
                    x.fillStyle = g; x.fillRect(px, py, S, TH); x.fillStyle = '#fff'; x.font = '700 13px sans-serif'; x.textAlign = 'center';
                    const ls = wrap(x, inf.t, S - 12).slice(0, 5); ls.forEach((s, k) => x.fillText(s, px + S / 2, py + TH / 2 + (k - (ls.length - 1) / 2) * 15)); x.textAlign = 'left';
                }
                if (l.caps && inf.t) {
                    const g = x.createLinearGradient(0, py + TH - 34, 0, py + TH); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.85)');
                    x.fillStyle = g; x.fillRect(px, py + TH - 34, S, 34); x.fillStyle = '#fff'; x.font = '700 11px sans-serif'; x.textAlign = 'center';
                    x.fillText(wrap(x, inf.t, S - 8)[0], px + S / 2, py + TH - 10, S - 8); x.textAlign = 'left';
                }
                x.restore();
            });
            y += h + 3;
        });
        x.fillStyle = '#6b7280'; x.font = '600 14px sans-serif'; x.textAlign = 'right'; x.fillText('MIRVEL HUB', W - 20, H - 16);
        c.toBlob(b => {
            if (!b) return toast('Не удалось создать картинку', 'error');
            const u = URL.createObjectURL(b), a = document.createElement('a');
            a.href = u; a.download = (l.name || 'tierlist').replace(/[^\p{L}\p{N}_-]+/gu, '_') + '.png';
            document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 1500);
            toast(missed ? `PNG сохранён. Картинок с чужих сайтов не загрузилось: ${missed} — загрузите их файлом` : 'PNG сохранён 🖼', missed ? 'info' : 'success');
        }, 'image/png');
    }

    if (location.hash === '#tiers') window.showPage('tiers', { fromHash: true });
})();
