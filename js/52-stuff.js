/* =========================================================
   MIRVEL HUB — 52-stuff.js (подключать последним, после 51-recap.js)
   Вкладка «Вещи» (этап O): новая сетка карточек, фильтр по типам чипами, сортировка, «Вид: …»,
   меню «⋯» вместо россыпи кнопок, страница вещи по клику (фото, цена, где куплено, состояние, заметка, теги, оценка).
   Данные те же (data.stuff, data.sortMode.stuff, data.viewMode.stuff, data.listMode.stuff) — ничего не мигрирует.
   Карточки сохраняют data-mid, поэтому избранное ❤ и режим «список» из 30-collection-ui.js работают как раньше.
   Старые кнопки на карточке: 📝 заметка, ✏️ правка, ✕ удалить — теперь в меню «⋯» (удаление с подтверждением).
   ========================================================= */
(() => {
    'use strict';
    const $ = id => document.getElementById(id);
    const E = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const num = v => Number(v) || 0;
    const CATS = { music: { ico: '🎵', name: 'Мерч', bg: 'rgba(168,85,247,.22)', fg: '#d8b4fe' }, clothing: { ico: '👕', name: 'Одежда', bg: 'rgba(20,184,166,.22)', fg: '#5eead4' },
        gear: { ico: '🎧', name: 'Техника', bg: 'rgba(245,158,11,.22)', fg: '#fcd34d' }, other: { ico: '📦', name: 'Другое', bg: 'rgba(148,163,184,.22)', fg: '#cbd5e1' } };
    const catOf = i => { const c = i.category || 'music'; return CATS[c] ? c : 'other'; };
    const SORTS = [['title', 'По названию'], ['price_desc', 'Сначала дорогие'], ['price_asc', 'Сначала дешёвые'], ['recent', 'Недавно добавленные'], ['rating', 'По оценке']];
    const LS = 'mirvel_stuff_cat';
    let cat = 'all'; try { cat = localStorage.getItem(LS) || 'all'; } catch (_) {}
    const safeImg = s => { const v = String(s || ''); return /^data:image\//i.test(v) ? v : (typeof safeUrl === 'function' ? safeUrl(v) : ''); };
    const price = i => { try { return String(fmtPrice(i)); } catch (_) { return i.price ? String(i.price) : ''; } };
    const noPrice = i => { try { return typeof isNoPrice === 'function' && isNoPrice(i); } catch (_) { return false; } };
    const stars = n => { n = Math.max(0, Math.min(5, num(n))); return n ? '★'.repeat(n) : ''; };
    const idDate = id => { const n = num(id); return n > 1e12 && n < 4e12 ? new Date(n).toLocaleDateString('ru-RU') : ''; };
    const find = id => (data.stuff || []).find(x => x.id === Number(id));
    const listOn = () => !!(data.listMode && data.listMode.stuff);
    const viewOf = () => listOn() ? 'list' : (data.viewMode && data.viewMode.stuff === 'covers' ? 'covers' : 'cards');
    const VLABEL = { cards: 'Вид: карточки', covers: 'Вид: обложки', list: 'Вид: список' };

    const css = document.createElement('style'); css.id = 'mh-stuff-css';
    css.textContent = `
    [data-mh-list="stuff"]{display:none!important}
    .mh-st-bar{display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between;margin-bottom:18px}
    .mh-st-chips{display:flex;flex-wrap:wrap;gap:8px}
    .mh-st-chip{display:inline-flex;align-items:center;gap:6px;min-height:38px;padding:0 14px;border-radius:999px;font-size:13px;font-weight:700;color:#cbd5e1;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);cursor:pointer;transition:all .2s}
    .mh-st-chip:hover{background:rgba(255,255,255,.1);color:#fff}
    .mh-st-chip.is-on{color:#fff;background:rgba(139,92,246,.22);border-color:var(--theme-btn,#8b5cf6);box-shadow:0 0 0 1px var(--theme-btn,#8b5cf6) inset}
    .mh-st-chip small{opacity:.6;font-weight:800}
    .mh-st-ctl{display:flex;gap:8px;align-items:center}
    .mh-st-ctl select,.mh-st-ctl button{min-height:38px;border-radius:12px;font-size:13px;font-weight:700;color:#e5e7eb;background:#0d0d14;border:1px solid rgba(255,255,255,.12);padding:0 12px;cursor:pointer}
    .mh-st-ctl button:hover,.mh-st-ctl select:hover{border-color:var(--theme-btn,#8b5cf6)}
    .mh-st-grid{align-items:stretch;display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:18px;padding:4px;overflow:visible}
    .mh-st-grid.is-covers{grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:12px}
    @media(max-width:560px){.mh-st-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.mh-st-grid.is-covers{grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.mh-st-bar{align-items:stretch}.mh-st-ctl{width:100%}.mh-st-ctl select{flex:1;min-width:0}}
    .mh-st-card{height:100%;position:relative;display:flex;flex-direction:column;border-radius:22px;overflow:hidden;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);cursor:pointer;transition:transform .25s,border-color .25s,box-shadow .25s;outline:none}
    .mh-st-card:hover,.mh-st-card:focus-visible{transform:translateY(-3px);border-color:var(--theme-btn,#8b5cf6);box-shadow:0 12px 30px rgba(0,0,0,.35)}
    .mh-st-img{position:relative;aspect-ratio:4/3;background:linear-gradient(135deg,rgba(139,92,246,.25),rgba(6,182,212,.18));display:flex;align-items:center;justify-content:center;font-size:44px;overflow:hidden}
    .is-covers .mh-st-img{aspect-ratio:1/1;font-size:34px}
    .mh-st-img img{width:100%;height:100%;object-fit:cover}
    .mh-st-cat{position:absolute;left:10px;bottom:10px;padding:3px 9px;border-radius:999px;font-size:10px;font-weight:800;letter-spacing:.03em;backdrop-filter:blur(6px)}
    .mh-st-body{padding:12px 14px 14px;display:flex;flex-direction:column;gap:4px;min-width:0}
    .mh-st-sub{font-size:10px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#c4b5fd;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .mh-st-title{font-size:15px;font-weight:800;color:#fff;line-height:1.25;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;margin:0}
    .mh-st-row{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-top:2px}
    .mh-st-price{font-family:ui-monospace,monospace;font-weight:800;font-size:14px;color:#22d3ee}
    .mh-st-stars{font-size:12px;color:#facc15;letter-spacing:1px}
    .mh-st-tags{display:flex;flex-wrap:wrap;gap:5px;margin-top:6px}
    .mh-st-tags span{padding:2px 8px;border-radius:999px;font-size:10px;font-weight:700;color:#e5e7eb;background:rgba(255,255,255,.08)}
    .mh-st-more{position:absolute;top:8px;right:8px;width:34px;height:34px;border-radius:999px;background:rgba(0,0,0,.6);border:1px solid rgba(255,255,255,.15);color:#fff;font-size:18px;line-height:1;cursor:pointer;z-index:26;opacity:0;transition:opacity .2s}
    .mh-st-card:hover .mh-st-more,.mh-st-more:focus-visible{opacity:1}
    @media(hover:none){.mh-st-more{opacity:1}}
    .is-covers .mh-st-body{display:none}
    .is-covers .mh-st-card::after{content:attr(data-t);position:absolute;left:0;right:0;bottom:0;padding:22px 8px 8px;font-size:11px;font-weight:800;color:#fff;background:linear-gradient(transparent,rgba(0,0,0,.85));white-space:nowrap;overflow:hidden;text-overflow:ellipsis;pointer-events:none}
    .mh-st-empty{grid-column:1/-1;text-align:center;padding:48px 16px;border:1px dashed rgba(255,255,255,.14);border-radius:24px;color:#9ca3af}
    .mh-st-empty b{display:block;font-size:18px;color:#fff;margin:8px 0 4px}
    .mh-st-empty button{margin-top:14px;padding:10px 20px;border-radius:14px;font-weight:800;background:#fff;color:#000;border:0;cursor:pointer}
    .mh-st-menu{position:fixed;z-index:90;min-width:200px;padding:6px;border-radius:16px;background:rgba(17,15,28,.98);border:1px solid rgba(255,255,255,.14);box-shadow:0 18px 40px rgba(0,0,0,.5)}
    .mh-st-menu button{display:flex;gap:10px;align-items:center;width:100%;text-align:left;padding:10px 12px;border-radius:10px;border:0;background:none;color:#e5e7eb;font-size:13.5px;font-weight:700;cursor:pointer}
    .mh-st-menu button:hover{background:rgba(255,255,255,.09);color:#fff}
    .mh-st-menu .is-danger{color:#f87171}
    #stuff-detail-modal dl{display:grid;grid-template-columns:auto 1fr;gap:8px 14px;font-size:13px;margin:0}
    #stuff-detail-modal dt{color:#9ca3af;font-weight:700}
    #stuff-detail-modal dd{margin:0;color:#fff;font-weight:700;word-break:break-word}
    .mh-st-stars-in{display:inline-flex;gap:2px}.mh-st-stars-in button{font-size:24px;line-height:1;color:rgba(255,255,255,.2);background:none;border:0;cursor:pointer;padding:0 1px}.mh-st-stars-in button.on{color:#facc15}
    `;
    document.head.appendChild(css);

    /* ---------- Панель: чипы типов, сортировка, вид ---------- */
    function ensureBar(grid) {
        let bar = $('mh-stuff-bar');
        if (bar) return bar;
        const old = $('sort-stuff-title'); if (old && old.parentElement) old.parentElement.style.display = 'none';
        bar = document.createElement('div'); bar.id = 'mh-stuff-bar'; bar.className = 'mh-st-bar';
        bar.innerHTML = `<div class="mh-st-chips" id="mh-st-chips"></div>
            <div class="mh-st-ctl"><select id="mh-st-sort" aria-label="Сортировка">${SORTS.map(([k, l]) => `<option value="${k}">${l}</option>`).join('')}</select>
            <button type="button" id="mh-st-view"></button></div>`;
        grid.insertAdjacentElement('beforebegin', bar);
        $('mh-st-chips').addEventListener('click', e => {
            const b = e.target.closest('[data-c]'); if (!b) return;
            cat = b.dataset.c; try { localStorage.setItem(LS, cat); } catch (_) {}
            render();
        });
        $('mh-st-sort').addEventListener('change', e => { if (!data.sortMode) data.sortMode = {}; data.sortMode.stuff = e.target.value; save(); });
        $('mh-st-view').addEventListener('click', () => {
            if (!data.viewMode) data.viewMode = {}; if (!data.listMode) data.listMode = {};
            const m = viewOf();
            if (m === 'cards') data.viewMode.stuff = 'covers';
            else if (m === 'covers') { data.viewMode.stuff = 'grid'; data.listMode.stuff = true; }
            else { data.listMode.stuff = false; data.viewMode.stuff = 'grid'; }
            save();
        });
        return bar;
    }

    function sorted(list) {
        const mode = (data.sortMode && data.sortMode.stuff) || 'title';
        const byT = (a, b) => String(a.title || '').localeCompare(String(b.title || ''), 'ru');
        const f = { title: byT, price_desc: (a, b) => num(b.price) - num(a.price) || byT(a, b), price_asc: (a, b) => num(a.price) - num(b.price) || byT(a, b),
            recent: (a, b) => num(b.id) - num(a.id), rating: (a, b) => num(b.rating) - num(a.rating) || byT(a, b) }[mode] || byT;
        return list.sort(f);
    }

    function chipsOf(i) {
        const c = catOf(i), out = [];
        if (c === 'clothing') { if (i.size) out.push('Размер ' + i.size); if (i.style) out.push(i.style); }
        if (c === 'music') { if (i.year) out.push(String(i.year)); if (i.formatDetails) out.push(i.formatDetails); }
        if (i.condition) out.push(i.condition);
        if (i.whereBought) out.push('🛒 ' + i.whereBought);
        return out.slice(0, 3);
    }

    function cardHTML(i) {
        const c = catOf(i), m = CATS[c], src = safeImg(i.img), sub = i.brand || i.artist || '';
        const tags = (i.tags || []).slice(0, 3).map(t => `<span style="background:${E(t.color || 'rgba(255,255,255,.1)')}">${E(t.text)}</span>`).join('') + ((i.tags || []).length > 3 ? `<span>+${i.tags.length - 3}</span>` : '');
        const info = chipsOf(i).map(t => `<span>${E(t)}</span>`).join('');
        const np = noPrice(i);
        return `<div class="mh-st-card" data-mid="${i.id}" data-mkey="stuff" data-t="${E(i.title || '')}" role="button" tabindex="0">
            <div class="mh-st-img">${src ? `<img src="${E(src)}" alt="" loading="lazy" decoding="async">` : m.ico}<span class="mh-st-cat" style="background:${m.bg};color:${m.fg}">${m.ico} ${m.name}</span></div>
            <div class="mh-st-body">
                ${sub ? `<p class="mh-st-sub">${E(sub)}</p>` : ''}
                <h3 class="mh-st-title" title="${E(i.title || '')}">${E(i.title || 'Без названия')}${i.isGift ? ' 🎁' : ''}${i.isCustom ? ' 💿' : ''}</h3>
                <div class="mh-st-row"><span class="mh-st-price${np ? ' custom-price-hint' : ''}"${np ? ` data-custom-price="stuff:${i.id}" title="Нажми, чтобы указать цену"` : ''}>${E(price(i))}</span><span class="mh-st-stars">${stars(i.rating)}</span></div>
                ${info || tags ? `<div class="mh-st-tags">${info}${tags}</div>` : ''}
            </div>
            <button type="button" class="mh-st-more" data-more="${i.id}" aria-label="Действия" aria-haspopup="menu">⋯</button>
        </div>`;
    }

    function render() {
        const grid = $('stuff-grid'); if (!grid) return;
        ensureBar(grid);
        const all = data.stuff || [];
        const q = String(($('search-stuff') || {}).value || '').toLowerCase().trim();
        const counts = { all: all.length }; Object.keys(CATS).forEach(k => { counts[k] = all.filter(i => catOf(i) === k).length; });
        if (cat !== 'all' && !counts[cat]) cat = 'all';
        $('mh-st-chips').innerHTML = [['all', 'Все']].concat(Object.keys(CATS).filter(k => counts[k]).map(k => [k, `${CATS[k].ico} ${CATS[k].name}`]))
            .map(([k, l]) => `<button type="button" class="mh-st-chip${k === cat ? ' is-on' : ''}" data-c="${k}">${l} <small>${counts[k]}</small></button>`).join('');
        const sel = $('mh-st-sort'); const mode = (data.sortMode && data.sortMode.stuff) || 'title'; if (sel.value !== mode && SORTS.some(s => s[0] === mode)) sel.value = mode;
        $('mh-st-view').textContent = VLABEL[viewOf()];
        let items = all.filter(i => (cat === 'all' || catOf(i) === cat) && (!q || [i.title, i.artist, i.brand, i.whereBought, i.size, i.style, i.condition, i.formatDetails, i.label, i.note, String(i.year || '')].concat((i.tags || []).map(t => t.text)).some(v => String(v || '').toLowerCase().includes(q))));
        items = sorted(items.slice());
        grid.className = 'mh-st-grid' + (viewOf() === 'covers' ? ' is-covers' : '') + (listOn() ? ' mh-listed' : '');
        if (!items.length) {
            grid.innerHTML = all.length ? `<div class="mh-st-empty"><div style="font-size:36px">🔍</div><b>Ничего не найдено</b>Попробуй другой тип или поиск</div>`
                : `<div class="mh-st-empty"><div style="font-size:40px">🧥</div><b>Пока нет вещей</b>Одежда, мерч, техника — всё, что не диск и не игра<br><button type="button" data-add="1">+ Новый предмет</button></div>`;
            return;
        }
        grid.innerHTML = items.map(cardHTML).join('');
    }

    /* ---------- Меню «⋯» ---------- */
    let menu = null, menuAt = 0;
    function closeMenu() { if (menu) { menu.remove(); menu = null; } }
    function openMenu(btn, id) {
        closeMenu();
        menuAt = Date.now();
        menu = document.createElement('div'); menu.className = 'mh-st-menu'; menu.setAttribute('role', 'menu');
        menu.innerHTML = `<button data-a="open" role="menuitem">👁 Открыть</button><button data-a="edit" role="menuitem">✏️ Редактировать</button><button data-a="note" role="menuitem">📝 Заметка</button><button data-a="del" class="is-danger" role="menuitem">🗑 Удалить</button>`;
        document.body.appendChild(menu);
        const r = btn.getBoundingClientRect(), w = menu.offsetWidth, h = menu.offsetHeight;
        menu.style.left = Math.max(8, Math.min(innerWidth - w - 8, r.right - w)) + 'px';
        menu.style.top = (r.bottom + 6 + h > innerHeight ? Math.max(8, r.top - h - 6) : r.bottom + 6) + 'px';
        menu.addEventListener('click', e => { const b = e.target.closest('[data-a]'); if (!b) return; closeMenu(); act(b.dataset.a, id); });
    }
    async function act(a, id) {
        const it = find(id); if (!it) return;
        if (a === 'open') openDetail(id);
        else if (a === 'edit') { closeDetail(); openModal('stuff', it.id); }
        else if (a === 'note') { closeDetail(); if (typeof openNote === 'function') openNote('stuff', it.id); }
        else if (a === 'del') {
            const ok = typeof mhConfirm === 'function' ? await mhConfirm(`Удалить «${it.title || 'вещь'}»? Это нельзя отменить.`, { title: 'Удалить вещь', okText: 'Удалить', cancelText: 'Отмена', danger: true }) : false;
            if (!ok) return;
            closeDetail(); data.stuff = (data.stuff || []).filter(x => x.id !== it.id); save();
            if (typeof showToast === 'function') showToast('Вещь удалена');
        }
    }

    /* ---------- Страница вещи ---------- */
    let dm = null, curId = null;
    function closeDetail() { if (dm) dm.classList.add('hidden'); curId = null; }
    function ensureDetail() {
        if (dm) return;
        dm = document.createElement('div'); dm.id = 'stuff-detail-modal';
        dm.className = 'hidden fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[70] p-3';
        dm.setAttribute('role', 'dialog'); dm.setAttribute('aria-modal', 'true');
        document.body.appendChild(dm);
        dm.addEventListener('mousedown', e => { if (e.target === dm) closeDetail(); });
        dm.addEventListener('click', e => {
            if (e.target.closest('[data-x]')) return closeDetail();
            const a = e.target.closest('[data-a]'); if (a) return act(a.dataset.a, curId);
            const s = e.target.closest('[data-star]');
            if (s) { const it = find(curId); if (!it) return; const v = Number(s.dataset.star); it.rating = num(it.rating) === v ? 0 : v; save(); paint(); }
        });
        document.addEventListener('keydown', e => { if (e.key === 'Escape' && dm && !dm.classList.contains('hidden')) closeDetail(); });
    }
    function paint() {
        const i = find(curId); if (!i) return closeDetail();
        const c = catOf(i), m = CATS[c], src = safeImg(i.img);
        const rows = [['Цена', price(i)], ['Где куплено', i.whereBought], ['Тип', `${m.ico} ${m.name}`], ['Артист', i.artist], ['Бренд', i.brand], ['Размер', i.size], ['Стиль / цвет', i.style],
            ['Год', i.year], ['Лейбл', i.label], ['Формат', i.formatDetails], ['Состояние', i.condition], ['Подарок', i.isGift ? 'Да 🎁' : ''], ['Добавлено', idDate(i.id)]]
            .filter(r => r[1] !== undefined && r[1] !== null && String(r[1]).trim() !== '');
        const url = i.url ? safeUrl(i.url) : '';
        const tags = (i.tags || []).map(t => `<span class="px-2.5 py-1 rounded-full text-xs font-bold text-white" style="background:${E(t.color || 'rgba(255,255,255,.1)')}">${E(t.text)}</span>`).join('');
        dm.innerHTML = `<div class="glass no-hover w-full rounded-3xl p-4 sm:p-6 overflow-y-auto" style="max-width:780px;max-height:94vh">
            <div class="flex justify-between items-start gap-3 mb-4"><div class="min-w-0">
                <p class="text-[11px] font-black tracking-widest uppercase" style="color:${m.fg}">${m.ico} ${m.name}</p>
                <h3 class="text-2xl font-black leading-tight break-words">${E(i.title || 'Без названия')}</h3></div>
                <button type="button" data-x class="text-gray-400 hover:text-white px-2 py-1 text-xl" aria-label="Закрыть">✕</button></div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div class="rounded-2xl overflow-hidden border border-white/10 flex items-center justify-center" style="background:#05050a;min-height:200px;max-height:46vh">${src ? `<img src="${E(src)}" alt="" class="w-full h-full object-contain" style="max-height:46vh">` : `<span style="font-size:72px">${m.ico}</span>`}</div>
                <div class="space-y-4 min-w-0">
                    <div><p class="text-[10px] uppercase font-black tracking-widest text-gray-500 mb-1">Оценка</p><div class="mh-st-stars-in">${[1, 2, 3, 4, 5].map(n => `<button type="button" data-star="${n}" class="${n <= num(i.rating) ? 'on' : ''}" aria-label="Оценка ${n}">★</button>`).join('')}</div></div>
                    <dl>${rows.map(r => `<dt>${r[0]}</dt><dd>${E(r[1])}</dd>`).join('')}</dl>
                    ${url ? `<a href="${E(url)}" target="_blank" rel="noopener noreferrer" class="inline-block text-sm font-bold text-blue-400 hover:underline">🔗 Ссылка на вещь</a>` : ''}
                    ${tags ? `<div class="flex flex-wrap gap-2">${tags}</div>` : ''}
                </div></div>
            ${i.note ? `<div class="mt-5 p-4 rounded-2xl bg-white/5 border border-white/10"><p class="text-[10px] uppercase font-black tracking-widest text-gray-500 mb-1">Заметка</p><p class="text-sm text-gray-200 whitespace-pre-wrap break-words">${E(i.note)}</p></div>` : ''}
            <div class="flex flex-wrap gap-2 mt-5">
                <button type="button" data-a="edit" class="flex-1 bg-purple-600 hover:bg-purple-500 py-3 rounded-xl font-bold text-white">✏️ Редактировать</button>
                <button type="button" data-a="note" class="bg-white/5 border border-white/10 hover:bg-white/10 px-4 py-3 rounded-xl font-bold">📝 Заметка</button>
                <button type="button" data-a="del" class="bg-red-950/60 border border-red-500/25 hover:bg-red-900/70 text-red-300 px-4 py-3 rounded-xl font-bold">🗑</button></div>
        </div>`;
    }
    function openDetail(id) { if (!find(id)) return; ensureDetail(); curId = Number(id); paint(); dm.classList.remove('hidden'); }
    window.openStuffDetail = openDetail;

    /* ---------- События ---------- */
    document.addEventListener('click', e => {
        if (menu && !e.target.closest('.mh-st-menu')) closeMenu();
        const grid = $('stuff-grid'); if (!grid || !grid.contains(e.target)) return;
        if (e.target.closest('[data-add]')) { openModal('stuff'); return; }
        const more = e.target.closest('[data-more]');
        if (more) { e.stopPropagation(); openMenu(more, more.dataset.more); return; }
        if (e.target.closest('.mh-fav') || e.target.closest('[data-custom-price]')) return;
        const card = e.target.closest('.mh-st-card'); if (card) openDetail(card.dataset.mid);
    });
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') closeMenu();
        if ((e.key === 'Enter' || e.key === ' ') && e.target.classList && e.target.classList.contains('mh-st-card')) { e.preventDefault(); openDetail(e.target.dataset.mid); }
    });
    window.addEventListener('scroll', () => { if (Date.now() - menuAt > 500) closeMenu(); }, true);

    const rb = renderAll; renderAll = function () { rb(); render(); };
    render();
})();
