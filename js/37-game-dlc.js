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
    const dlcSpent = g => dlcsOf(g).filter(d => d.owned).reduce((s, d) => s + num(d.price), 0);
    window.mhDlcCount = g => dlcsOf(g).filter(d => d.owned).length;

    /* ---------- стили ---------- */
    const css = document.createElement('style');
    css.textContent = `
    #gd-body{position:relative;isolation:isolate}
    .gdx-bg{position:absolute;left:-1.75rem;right:-1.75rem;top:-1.75rem;height:300px;z-index:-1;overflow:hidden;border-radius:1.5rem 1.5rem 0 0;pointer-events:none}
    .gdx-bg i{position:absolute;inset:-30px;background-size:cover;background-position:center;filter:blur(34px) saturate(1.5);opacity:.5;transform:scale(1.15)}
    .gdx-bg::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(13,13,20,.1),rgba(13,13,20,.65) 65%,#0d0d14)}
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
            ['⏱ Часов в игре', hrs ? hoursText(hrs) : '—', hrs && owned ? `≈ ${money(spent / hrs)} за час` : ''],
            ['🧩 Дополнения', dl.length ? `${owned}<span class="text-gray-500 text-sm font-bold"> / ${dl.length}</span>` : '0', dl.length ? 'куплено / всего' : 'пока нет'],
            ['💰 Потрачено', spent ? money(spent) : '—', dlcSpent(g) ? `из них на DLC: ${money(dlcSpent(g))}` : 'игра + дополнения'],
            ...(g.trophy ? [['🏆 Ачивки', full ? '100%' : total ? `${Math.min(100, Math.round(done / total * 100))}%` : `${done}`, total ? `${done} из ${total}` : '']] : []),
            ...(days != null ? [['📅 В коллекции', days < 1 ? 'сегодня' : days < 60 ? `${days} дн.` : `${Math.round(days / 30)} мес.`, added.toLocaleDateString('ru-RU')]] : [])
        ];
        return `<div class="gdx-tiles">${tiles.map(([t, v, s]) => `<div class="gdx-tile"><small>${t}</small><b>${v}</b>${s ? `<em>${s}</em>` : ''}</div>`).join('')}</div>`;
    }

    /* ---------- дополнения ---------- */
    function dlcItemHTML(d) {
        const t = TYPES[d.type] || TYPES.dlc;
        const meta = [t.label, num(d.price) ? money(num(d.price)) : (d.owned ? 'без цены' : ''), d.date ? fmtDate(d.date) : ''].filter(Boolean).map(esc).join(' · ');
        return `<div class="gdx-item ${d.owned ? 'is-owned' : 'is-wish'}" data-dlc="${esc(d.id)}">
            <span class="gdx-ico" aria-hidden="true">${t.ico}</span>
            <div class="gdx-main"><h4>${esc(d.title)}${d.done ? ' <span class="text-emerald-400">✔</span>' : ''}</h4><p>${meta}</p></div>
            <div class="gdx-acts">
                <button type="button" class="gdx-btn${d.owned ? ' is-on' : ''}" data-act="dlc-own" aria-pressed="${!!d.owned}">${d.owned ? '✓ Куплено' : '🗓 В планах'}</button>
                ${d.owned ? `<button type="button" class="gdx-btn${d.done ? ' is-on' : ''}" data-act="dlc-done" aria-pressed="${!!d.done}" title="Прошёл это дополнение">${d.done ? '🏁 Пройдено' : '🏁'}</button>` : ''}
                <button type="button" class="gdx-btn" data-act="dlc-edit" aria-label="Изменить">✏️</button>
                <button type="button" class="gdx-btn" data-act="dlc-del" aria-label="Удалить">✕</button>
            </div></div>`;
    }

    function formHTML(g) {
        const d = editId ? dlcsOf(g).find(x => x.id === editId) : null;
        return `<div class="gdx-form" id="gdx-form">
            <input id="gdx-title" class="gd-input wide" maxlength="80" placeholder="Название дополнения" value="${esc(d?.title || '')}">
            <select id="gdx-type" class="gd-input">${Object.entries(TYPES).map(([k, v]) => `<option value="${k}"${(d?.type || 'dlc') === k ? ' selected' : ''}>${v.ico} ${v.label}</option>`).join('')}</select>
            <input id="gdx-price" class="gd-input" type="number" min="0" step="any" placeholder="Цена, ₴" value="${d?.price || ''}">
            <input id="gdx-date" class="gd-input" type="date" value="${esc(d?.date || '')}" aria-label="Дата покупки">
            <label class="text-xs text-gray-400 flex items-center gap-2"><input id="gdx-owned" type="checkbox" ${!d || d.owned ? 'checked' : ''} style="accent-color:var(--theme-btn,#8b5cf6)"> Уже куплено</label>
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
            ${sorted.length ? `<div class="gdx-list">${sorted.map(dlcItemHTML).join('')}</div>`
                : '<p class="gdx-empty">Дополнений пока нет. Докупили DLC, сезонный пропуск или саундтрек — добавьте сюда, и они попадут в «потрачено».</p>'}
            ${formOpen ? formHTML(g) : ''}
        </div>`;
    }

    /* ---------- вставка в страницу игры ---------- */
    function decorate() {
        const body = $('gd-body');
        if (!body || !body.firstElementChild || body.querySelector('#gdx-dlc')) return;
        const modal = $('game-detail-modal');
        const g = modal && !modal.classList.contains('hidden') ? currentGame() : null;
        if (!g) return;
        // фон из обложки
        const cover = body.querySelector('.gd-cover img');
        if (cover && !body.querySelector('.gdx-bg')) {
            const bg = document.createElement('div');
            bg.className = 'gdx-bg';
            bg.setAttribute('aria-hidden', 'true');
            const i = document.createElement('i');
            i.style.backgroundImage = `url("${cover.src.replace(/"/g, '%22')}")`;
            bg.appendChild(i);
            body.prepend(bg);
        }
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
        if (old) { const t = document.createElement('div'); t.innerHTML = sectionHTML(g); old.replaceWith(t.firstElementChild); }
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
            const d = row ? dlcsOf(g).find(x => x.id === row.dataset.dlc) : null;
            switch (a.dataset.act) {
                case 'dlc-new': editId = null; formOpen = true; refresh(); $('gdx-title')?.focus(); break;
                case 'dlc-cancel': editId = null; formOpen = false; refresh(); break;
                case 'dlc-edit': if (d) { editId = d.id; formOpen = true; refresh(); $('gdx-title')?.focus(); } break;
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
                        owned: $('gdx-owned').checked
                    };
                    if (rec.owned && !rec.date) rec.date = todayISO();
                    if (!Array.isArray(g.dlcs)) g.dlcs = [];
                    if (editId) { const ex = g.dlcs.find(x => x.id === editId); if (ex) Object.assign(ex, rec); }
                    else g.dlcs.push({ id: 'd' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), ...rec });
                    editId = null; formOpen = false;
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
