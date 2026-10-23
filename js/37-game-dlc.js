/* =========================================================
   MIRVEL HUB — 37-game-dlc.js (подключается после 36-tierlist.js)
   Дополнения (DLC) и «красивая» страница игры:
   • крупная обложка с размытым фоном
   • плитки: часы · дополнения · потрачено · ачивки · в коллекции с…
   • список дополнений: куплено / в планах, цена, дата, пройдено
   Данные: game.dlcs = [{ id, title, type, price, owned, date, done, note }]
   Поле необязательное — попадает в бэкап вместе с игрой.
   ========================================================= */
(() => {
    'use strict';
    const $ = id => document.getElementById(id);
    const TYPES = {
        dlc:      { ico: '🧩', label: 'Дополнение' },
        story:    { ico: '📖', label: 'Сюжетное' },
        pass:     { ico: '🎟', label: 'Сезонный пропуск' },
        cosmetic: { ico: '🎨', label: 'Косметика' },
        ost:      { ico: '🎵', label: 'Саундтрек' },
        other:    { ico: '✨', label: 'Другое' }
    };
    const gameById = id => (data.games || []).find(x => x.id === Number(id));
    const dlcsOf = g => (Array.isArray(g?.dlcs) ? g.dlcs : []);
    const num = v => Math.max(0, Number(v) || 0);
    const money = n => `${Math.round(n * 100) / 100} ₴`;
    const hoursText = h => `${Math.round((Number(h) || 0) * 10) / 10} ч`;
    const fmtDate = s => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ''); return m ? `${m[3]}.${m[2]}.${m[1]}` : ''; };
    const todayISO = () => new Date().toISOString().slice(0, 10);

    /** сколько потрачено на саму игру (только реальная цена, без подарков/наборов/подписки) */
    function basePrice(g) {
        if (!g || g.bundleId != null || g.psPlus || g.priceFree || g.priceGift || g.priceCode || g.priceFamily || g.priceBundle || g.priceUnknown) return 0;
        return num(g.price);
    }
    const dlcSpent = g => dlcsOf(g).filter(d => d.owned && !d.free).reduce((s, d) => s + num(d.price), 0);
    window.mhDlcCount = g => dlcsOf(g).filter(d => d.owned).length;

    /* ---------- стили ---------- */
    const css = document.createElement('style');
    css.textContent = `
    #gd-body{position:relative;isolation:isolate}
    #gd-body .gd-cover{width:200px;height:200px;border-radius:24px;box-shadow:0 22px 50px rgba(0,0,0,.7),0 0 0 1px rgba(255,255,255,.12)}
    @media(max-width:640px){#gd-body .gd-cover{width:100%;height:auto;aspect-ratio:1/1;max-width:260px;margin:0 auto}}
    .gdx-tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(112px,1fr));gap:10px;margin-top:20px}
    .gdx-tile{padding:12px 14px;border-radius:16px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);backdrop-filter:blur(8px)}
    .gdx-tile b{display:block;font-size:1.25rem;font-weight:900;color:#fff;line-height:1.15;margin-top:2px}
    .gdx-tile small{display:block;font-size:10px;letter-spacing:.1em;text-transform:uppercase;font-weight:800;color:#6b7280}
    .gdx-tile em{display:block;font-style:normal;font-size:10px;color:#9ca3af;margin-top:2px}
    .gdx-list{display:flex;flex-direction:column;gap:8px}
    .gdx-item{display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:14px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);transition:border-color .2s,background-color .2s}
    .gdx-item.is-owned{border-color:rgba(52,211,153,.35);background:rgba(52,211,153,.06)}
    .gdx-item.is-wish{border-style:dashed}
    .gdx-ico{width:38px;height:38px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:18px;background:rgba(255,255,255,.07);flex-shrink:0}
    .gdx-main{min-width:0;flex:1}
    .gdx-main h4{font-weight:800;font-size:.9rem;color:#fff;overflow-wrap:anywhere}
    .gdx-main p{font-size:11px;color:#9ca3af;margin-top:1px}
    .gdx-acts{display:flex;gap:6px;flex-shrink:0;flex-wrap:wrap;justify-content:flex-end}
    .gdx-btn{padding:5px 10px;border-radius:10px;font-size:11px;font-weight:800;cursor:pointer;color:#d1d5db;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.1);transition:all .2s}
    .gdx-btn:hover{background:rgba(255,255,255,.14)}
    .gdx-btn.is-on{color:#34d399;border-color:rgba(52,211,153,.5);background:rgba(52,211,153,.12)}
    .gdx-form{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px;margin-top:12px;padding:12px;border-radius:14px;background:rgba(255,255,255,.03);border:1px dashed rgba(255,255,255,.14)}
    .gdx-form .wide{grid-column:1/-1}
    .gdx-form select{background:#0d0d14}
    .gdx-empty{font-size:12px;color:#6b7280;padding:6px 2px}
    @media(max-width:520px){.gdx-item{flex-wrap:wrap}.gdx-acts{width:100%;justify-content:flex-start}}
    #gd-body .gd-cover{width:240px;height:240px}
    .gdx-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:12px}
    .gdx-card{position:relative;display:flex;flex-direction:column;border-radius:18px;overflow:hidden;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.09);transition:transform .2s,border-color .2s}
    .gdx-card:hover{transform:translateY(-2px)}
    .gdx-card.is-owned{border-color:rgba(52,211,153,.35)}
    .gdx-card.is-wish{border-style:dashed}
    .gdx-pic{position:relative;aspect-ratio:16/9;background:rgba(255,255,255,.05);display:flex;align-items:center;justify-content:center;font-size:34px;overflow:hidden}
    .gdx-pic img{width:100%;height:100%;object-fit:cover}
    .gdx-badges{position:absolute;left:8px;top:8px;display:flex;gap:4px;flex-wrap:wrap;max-width:90%}
    .gdx-tag{font-size:10px;font-weight:900;padding:3px 8px;border-radius:99px;background:rgba(0,0,0,.7);color:#fff;border:1px solid rgba(255,255,255,.15)}
    .gdx-tag.gift{color:#f9a8d4;border-color:rgba(249,168,212,.5)}
    .gdx-tag.free{color:#86efac;border-color:rgba(134,239,172,.5)}
    .gdx-tag.ok{color:#34d399}
    .gdx-cbody{padding:10px 12px 12px;display:flex;flex-direction:column;gap:6px;flex:1}
    .gdx-cbody h4{font-weight:800;font-size:.92rem;color:#fff;overflow-wrap:anywhere}
    .gdx-cbody p{font-size:11px;color:#9ca3af}
    .gdx-from{display:flex;gap:4px;flex-wrap:wrap;align-items:center}
    .gdx-note{font-size:11px;color:#d1d5db;background:rgba(255,255,255,.04);border-radius:10px;padding:6px 8px;white-space:pre-wrap;overflow-wrap:anywhere}
    .gdx-form .pic{display:flex;gap:10px;align-items:center}
    .gdx-form .pic img{width:96px;height:54px;object-fit:cover;border-radius:10px}
    @media(min-width:1100px){.gd-panel{max-width:1040px!important}}
    `;
    document.head.appendChild(css);

    let editId = null;      // id редактируемого дополнения
    let formOpen = false;

    /* ---------- сводка ---------- */
    function tilesHTML(g) {
        const dl = dlcsOf(g), owned = dl.filter(d => d.owned).length;
        const spent = basePrice(g) + dlcSpent(g);
        const hrs = num(g.hours);
        const total = num(g.trophyTotal), done = num(g.trophyDone);
        const full = g.trophy === 'full';
        const added = g.id && g.id > 1e12 ? new Date(g.id) : null;
        const days = added ? Math.max(0, Math.floor((Date.now() - added.getTime()) / 864e5)) : null;
        const tiles = [
            (() => {
                const sibs = window.mhGameSiblings ? window.mhGameSiblings(g) : [];
                const all = window.mhGameTotalHours ? window.mhGameTotalHours(g) : hrs;
                if (sibs.length && all > hrs) return ['⏱ Часов во всех версиях', hoursText(all), `эта версия: ${hoursText(hrs)} · версий: ${sibs.length + 1}`];
                return ['⏱ Часов в игре', hrs ? hoursText(hrs) : '—', hrs && owned ? `≈ ${money(spent / hrs)} за час` : ''];
            })(),
            ['🧩 Дополнения', dl.length ? `${owned}<span class="text-gray-500 text-sm font-bold"> / ${dl.length}</span>` : '0', dl.length ? 'куплено / всего' : 'пока нет'],
            ['💰 Потрачено', spent ? money(spent) : '—', dlcSpent(g) ? `из них на DLC: ${money(dlcSpent(g))}` : 'игра + дополнения'],
            ...(g.trophy ? [['🏆 Ачивки', full ? '100%' : total ? `${Math.min(100, Math.round(done / total * 100))}%` : `${done}`, total ? `${done} из ${total}` : '']] : []),
            ...(days != null ? [['📅 В коллекции', days < 1 ? 'сегодня' : days < 60 ? `${days} дн.` : `${Math.round(days / 30)} мес.`, added.toLocaleDateString('ru-RU')]] : [])
        ];
        return `<div class="gdx-tiles">${tiles.map(([t, v, s]) => `<div class="gdx-tile"><small>${t}</small><b>${v}</b>${s ? `<em>${s}</em>` : ''}</div>`).join('')}</div>`;
    }

    /* ---------- дополнения ---------- */
    const SRC = ['Steam', 'Epic Games', 'GOG', 'PlayStation 4', 'PlayStation 5', 'Xbox One', 'Xbox Series', 'Nintendo Switch', 'PC CD/DVD', 'Другое'];
    const pill = n => window.mhPlatLogo ? window.mhPlatLogo.pill(n) : `<span class="gdx-tag">${esc(n)}</span>`;
    const stars = n => '★'.repeat(n) + '☆'.repeat(5 - n);
    let formImg = '';        // картинка в форме (dataURL)
    let formFrom = [];       // платформы-источники в форме

    function dlcItemHTML(d) {
        const t = TYPES[d.type] || TYPES.dlc;
        const from = Array.isArray(d.from) ? d.from : [];
        const price = d.free === 'gift' ? '🎁 Подарок' : d.free === 'free' ? '🆓 Бесплатно' : (num(d.price) ? money(num(d.price)) : (d.owned ? 'без цены' : ''));
        const meta = [t.label, price, d.date ? fmtDate(d.date) : ''].filter(Boolean).map(esc).join(' · ');
        const link = d.url && /^https?:\/\//i.test(d.url) ? d.url : '';
        return `<div class="gdx-card ${d.owned ? 'is-owned' : 'is-wish'}" data-dlc="${esc(d.id)}">
            <div class="gdx-pic">${d.img ? `<img src="${esc(d.img)}" alt="" loading="lazy">` : t.ico}
                <div class="gdx-badges">${d.owned ? '<span class="gdx-tag ok">✓ Куплено</span>' : '<span class="gdx-tag">🗓 В планах</span>'}${d.done ? '<span class="gdx-tag ok">🏁 Пройдено</span>' : ''}${d.free === 'gift' ? '<span class="gdx-tag gift">🎁</span>' : d.free === 'free' ? '<span class="gdx-tag free">🆓</span>' : ''}</div>
            </div>
            <div class="gdx-cbody">
                <h4>${esc(d.title)}${d.rating ? ` <span class="text-yellow-400 text-xs">${stars(d.rating)}</span>` : ''}</h4>
                <p>${meta}</p>
                ${d.free === 'gift' && d.giftFrom ? `<p>🎁 от: ${esc(d.giftFrom)}</p>` : ''}
                ${from.length ? `<div class="gdx-from"><span class="text-[10px] text-gray-500">из</span>${from.map(pill).join('')}</div>` : ''}
                ${d.note ? `<div class="gdx-note">${esc(d.note)}</div>` : ''}
                <div class="gdx-acts mt-auto" style="justify-content:flex-start">
                    <button type="button" class="gdx-btn${d.owned ? ' is-on' : ''}" data-act="dlc-own" aria-pressed="${!!d.owned}">${d.owned ? '✓ Куплено' : '🗓 В планах'}</button>
                    ${d.owned ? `<button type="button" class="gdx-btn${d.done ? ' is-on' : ''}" data-act="dlc-done" aria-pressed="${!!d.done}" title="Прошёл это дополнение">🏁</button>` : ''}
                    ${link ? `<a class="gdx-btn" href="${esc(link)}" target="_blank" rel="noopener noreferrer" title="Ссылка">🔗</a>` : ''}
                    <button type="button" class="gdx-btn" data-act="dlc-edit" aria-label="Изменить">✏️</button>
                    <button type="button" class="gdx-btn" data-act="dlc-del" aria-label="Удалить">✕</button>
                </div></div></div>`;
    }

    function formHTML(g) {
        const d = editId ? dlcsOf(g).find(x => x.id === editId) : null;
        const srcAll = [...new Set([...SRC, g.platform, ...formFrom].filter(Boolean))];
        const free = d?.free || '';
        return `<div class="gdx-form" id="gdx-form">
            <input id="gdx-title" class="gd-input wide" maxlength="80" placeholder="Название дополнения" value="${esc(d?.title || '')}">
            <div class="wide pic">${formImg ? `<img src="${esc(formImg)}" alt="">` : '<span class="text-2xl">🖼️</span>'}
                <button type="button" class="gd-tool" data-act="dlc-img">${formImg ? 'Заменить картинку' : '＋ Картинка / обложка'}</button>
                ${formImg ? '<button type="button" class="gd-tool" data-act="dlc-imgdel">Убрать</button>' : ''}</div>
            <select id="gdx-type" class="gd-input">${Object.entries(TYPES).map(([k, v]) => `<option value="${k}"${(d?.type || 'dlc') === k ? ' selected' : ''}>${v.ico} ${v.label}</option>`).join('')}</select>
            <select id="gdx-free" class="gd-input"><option value=""${!free ? ' selected' : ''}>💳 Куплено за деньги</option><option value="gift"${free === 'gift' ? ' selected' : ''}>🎁 Подарок</option><option value="free"${free === 'free' ? ' selected' : ''}>🆓 Бесплатно</option></select>
            <input id="gdx-price" class="gd-input" type="number" min="0" step="any" placeholder="Цена, ₴" value="${d?.price || ''}">
            <input id="gdx-giftfrom" class="gd-input" maxlength="60" placeholder="От кого подарок" value="${esc(d?.giftFrom || '')}">
            <input id="gdx-date" class="gd-input" type="date" value="${esc(d?.date || '')}" aria-label="Дата покупки">
            <select id="gdx-rating" class="gd-input"><option value="0">★ Оценка: нет</option>${[1, 2, 3, 4, 5].map(n => `<option value="${n}"${d?.rating === n ? ' selected' : ''}>${stars(n)}</option>`).join('')}</select>
            <input id="gdx-url" class="gd-input wide" placeholder="Ссылка (магазин, гайд…)" value="${esc(d?.url || '')}">
            <div class="wide"><p class="text-[11px] text-gray-500 mb-1">Откуда дополнение (платформы):</p>
                <div class="flex flex-wrap gap-2">${srcAll.map(p => `<button type="button" class="gdx-btn${formFrom.includes(p) ? ' is-on' : ''}" data-act="dlc-from" data-v="${esc(p)}">${esc(p)}</button>`).join('')}</div></div>
            <textarea id="gdx-note" class="gd-input wide" rows="2" maxlength="400" placeholder="Заметка">${esc(d?.note || '')}</textarea>
            <label class="text-xs text-gray-400 flex items-center gap-2"><input id="gdx-owned" type="checkbox" ${!d || d.owned ? 'checked' : ''} style="accent-color:var(--theme-btn,#8b5cf6)"> Уже куплено / есть</label>
            <div class="wide flex gap-2"><button type="button" class="gd-tool" data-act="dlc-save">${d ? '💾 Сохранить' : '＋ Добавить'}</button><button type="button" class="gd-tool" data-act="dlc-cancel">Отмена</button></div>
        </div>`;
    }

    function sectionHTML(g) {
        const dl = dlcsOf(g);
        const sorted = [...dl].sort((a, b) => (b.owned - a.owned) || String(a.date || '9').localeCompare(String(b.date || '9')));
        return `<div class="gd-sec mt-5" id="gdx-dlc">
            <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
                <p class="gd-sec-title mb-0">🧩 Дополнения и DLC${dl.length ? ` · ${dl.filter(d => d.owned).length}/${dl.length}` : ''}</p>
                ${formOpen ? '' : '<button type="button" class="gd-tool" data-act="dlc-new">＋ Добавить дополнение</button>'}
            </div>
            ${sorted.length ? `<div class="gdx-grid">${sorted.map(dlcItemHTML).join('')}</div>`
                : '<p class="gdx-empty">Дополнений пока нет. Докупили DLC, сезонный пропуск или саундтрек — добавьте сюда, и они попадут в «потрачено» (подарки и бесплатные не считаются).</p>'}
            ${formOpen ? formHTML(g) : ''}
        </div>`;
    }

    function pickImage() {
        const inp = document.createElement('input');
        inp.type = 'file'; inp.accept = 'image/*';
        inp.onchange = () => {
            const f = inp.files && inp.files[0]; if (!f) return;
            const r = new FileReader();
            r.onload = () => {
                const im = new Image();
                im.onload = () => {
                    const k = Math.min(1, 640 / Math.max(im.width, im.height));
                    const c = document.createElement('canvas'); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
                    c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
                    formImg = c.toDataURL('image/jpeg', 0.82); keepForm(); refresh();
                };
                im.src = r.result;
            };
            r.readAsDataURL(f);
        };
        inp.click();
    }
    // перед перерисовкой формы запоминаем введённое
    let draft = null;
    function keepForm() {
        const f = $('gdx-form'); if (!f) return;
        draft = { title: $('gdx-title').value, type: $('gdx-type').value, free: $('gdx-free').value, price: $('gdx-price').value, giftFrom: $('gdx-giftfrom').value,
            date: $('gdx-date').value, rating: $('gdx-rating').value, url: $('gdx-url').value, note: $('gdx-note').value, owned: $('gdx-owned').checked };
    }
    function restoreForm() {
        if (!draft || !$('gdx-form')) return;
        const m = { title: 'gdx-title', type: 'gdx-type', free: 'gdx-free', price: 'gdx-price', giftFrom: 'gdx-giftfrom', date: 'gdx-date', rating: 'gdx-rating', url: 'gdx-url', note: 'gdx-note' };
        Object.entries(m).forEach(([k, id]) => { $(id).value = draft[k]; });
        $('gdx-owned').checked = draft.owned;
    }

    /* ---------- вставка в страницу игры ---------- */
    function decorate() {
        const body = $('gd-body');
        if (!body || !body.firstElementChild || body.querySelector('#gdx-dlc')) return;
        const modal = $('game-detail-modal');
        const g = modal && !modal.classList.contains('hidden') ? currentGame() : null;
        if (!g) return;
        // плитки — сразу под шапкой
        const head = body.querySelector(':scope > .flex');
        if (head && !body.querySelector('.gdx-tiles')) head.insertAdjacentHTML('afterend', tilesHTML(g));
        // дополнения — перед прохождением, чтобы были на виду
        const first = body.querySelector(':scope > .gd-sec');
        const sec = document.createElement('div');
        sec.innerHTML = sectionHTML(g);
        if (first) first.before(sec.firstElementChild); else body.appendChild(sec.firstElementChild);
    }

    // какая игра открыта: берём по заголовку + платформе нельзя, поэтому ловим id из кнопок страницы
    function currentGame() {
        const el = document.querySelector('#gd-body [data-act="share"][data-id]');
        return el ? gameById(el.dataset.id) : null;
    }

    function refresh() {
        const g = currentGame();
        if (!g) return;
        const old = $('gdx-dlc');
        const tiles = document.querySelector('#gd-body .gdx-tiles');
        if (tiles) tiles.outerHTML = tilesHTML(g);
        if (old) { const t = document.createElement('div'); t.innerHTML = sectionHTML(g); old.replaceWith(t.firstElementChild); restoreForm(); }
    }

    function persist() {
        try { checkAchievements(); } catch (_) {}
        const ok = persistData();
        try { updateUI(); } catch (_) {}
        return ok;
    }

    function init() {
        const body = $('gd-body');
        const modal = $('game-detail-modal');
        if (!body || !modal) return;
        new MutationObserver(() => decorate()).observe(body, { childList: true });
        modal.addEventListener('click', e => {
            const a = e.target.closest('[data-act^="dlc-"]');
            if (!a) return;
            const g = currentGame();
            if (!g) return;
            const row = a.closest('[data-dlc]');
            const act = a.dataset.act;
            const d = row ? dlcsOf(g).find(x => x.id === row.dataset.dlc) : null;
            switch (a.dataset.act) {
                case 'dlc-img': pickImage(); break;
                case 'dlc-imgdel': keepForm(); formImg = ''; refresh(); break;
                case 'dlc-from': { keepForm(); const v = a.dataset.v; formFrom = formFrom.includes(v) ? formFrom.filter(x => x !== v) : [...formFrom, v]; refresh(); break; }
                case 'dlc-new': editId = null; formOpen = true; formImg = ''; draft = null; formFrom = g.platform ? [g.platform] : []; refresh(); $('gdx-title')?.focus(); break;
                case 'dlc-cancel': editId = null; formOpen = false; draft = null; refresh(); break;
                case 'dlc-edit': if (d) { editId = d.id; formOpen = true; draft = null; formImg = d.img || ''; formFrom = Array.isArray(d.from) ? [...d.from] : []; refresh(); $('gdx-title')?.focus(); } break;
                case 'dlc-own':
                    if (d) { d.owned = !d.owned; if (d.owned && !d.date) d.date = todayISO(); if (!d.owned) d.done = false; persist(); refresh(); }
                    break;
                case 'dlc-done': if (d) { d.done = !d.done; persist(); refresh(); } break;
                case 'dlc-del':
                    if (d) {
                        const idx = g.dlcs.indexOf(d);
                        g.dlcs = g.dlcs.filter(x => x !== d);
                        persist(); refresh();
                        showToast(`Дополнение «${d.title}» удалено`);
                        window.__mhLastDlc = { gid: g.id, d, idx };
                    }
                    break;
                case 'dlc-save': {
                    const title = $('gdx-title').value.trim();
                    if (!title) { showToast('Введите название дополнения', 'error'); $('gdx-title').focus(); break; }
                    const rec = {
                        title,
                        type: $('gdx-type').value,
                        price: num($('gdx-price').value),
                        date: $('gdx-date').value || '',
                        owned: $('gdx-owned').checked,
                        img: formImg || '',
                        from: [...formFrom],
                        free: $('gdx-free').value,
                        giftFrom: $('gdx-giftfrom').value.trim(),
                        rating: Math.min(5, num($('gdx-rating').value)),
                        url: $('gdx-url').value.trim(),
                        note: $('gdx-note').value.trim()
                    };
                    if (rec.free) rec.price = 0;
                    if (rec.free !== 'gift') rec.giftFrom = '';
                    if (rec.owned && !rec.date) rec.date = todayISO();
                    if (!Array.isArray(g.dlcs)) g.dlcs = [];
                    if (editId) { const ex = g.dlcs.find(x => x.id === editId); if (ex) Object.assign(ex, rec); }
                    else g.dlcs.push({ id: 'd' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), ...rec });
                    editId = null; formOpen = false; draft = null; formImg = '';
                    persist(); refresh();
                    showToast('Дополнение сохранено 🧩', 'success');
                    break;
                }
            }
        });
        // Enter в поле названия = добавить
        modal.addEventListener('keydown', e => {
            if (e.key === 'Enter' && e.target.id === 'gdx-title') { e.preventDefault(); modal.querySelector('[data-act="dlc-save"]')?.click(); }
        });
        // при закрытии страницы сбрасываем форму
        new MutationObserver(() => { if (modal.classList.contains('hidden')) { editId = null; formOpen = false; } })
            .observe(modal, { attributes: true, attributeFilter: ['class'] });
    }

    if (document.getElementById('gd-body')) init();
    else document.addEventListener('DOMContentLoaded', init);
})();
