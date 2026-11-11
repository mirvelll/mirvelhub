/* =========================================================
   MIRVEL HUB — 55-wish-cats.js (подключается после 54-tags.js)
   «Желаемое»: плитки «Накопление по категориям» кликабельны — нажатие включает фильтр
   по этой категории (повторное нажатие сбрасывает). Сами категории — WISH_CATS в 01-state.js.
   ========================================================= */
(() => {
    'use strict';
    // разовая раскладка старой «Музыки» в желаемом по CD / Винил (правило — см. wishCat в 01-state.js); потом категорию можно менять вручную
    (function migrate() {
        if (!Array.isArray(data.wishlists)) return;
        let n = 0;
        data.wishlists.forEach(i => { if (!i.category || i.category === 'music') { i.category = wishCat(i); n++; } });
        if (n) { try { persistData(); } catch (_) {} try { updateUI(); } catch (_) {} }
    })();
    try { if (typeof currentFilter !== 'undefined' && currentFilter === 'music') window.setFilter(null); } catch (_) {}
    const box = document.getElementById('category-budget-breakdown');
    if (!box) return;
    const css = document.createElement('style');
    css.textContent = `#category-budget-breakdown [data-cat]{cursor:pointer}
    #category-budget-breakdown [data-cat]:hover{border-color:rgba(255,255,255,.28)!important;transform:translateY(-1px)}
    #category-budget-breakdown [data-cat].is-sel{border-color:rgba(168,85,247,.7)!important;background:rgba(168,85,247,.08)}`;
    document.head.appendChild(css);
    const apply = () => box.querySelectorAll('[data-cat]').forEach(el => {
        const c = el.dataset.cat;
        el.title = 'Показать только эту категорию';
        el.classList.toggle('is-sel', typeof currentFilter !== 'undefined' && currentFilter === c);
    });
    new MutationObserver(apply).observe(box, { childList: true });
    box.addEventListener('click', e => {
        const el = e.target.closest('[data-cat]'); if (!el) return;
        const c = el.dataset.cat;
        const on = typeof currentFilter !== 'undefined' && currentFilter === c;
        window.setFilter(on ? null : c);
        document.getElementById('filter-bar')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
    apply();
    /* ---------- «Набор покупки»: отмечаешь хотелки 🛒 → снизу видно, что в наборе (напр. «2 винила»), сумму и на сколько месяцев бюджета ---------- */
    const grid = document.getElementById('wishlist-grid');
    if (!grid) return;
    const LSK = 'mh_wish_plan';
    let plan = new Set();
    try { plan = new Set((JSON.parse(localStorage.getItem(LSK)) || []).map(Number)); } catch (_) {}
    let only = false;
    const save = () => { try { localStorage.setItem(LSK, JSON.stringify([...plan])); } catch (_) {} };
    const items = () => (typeof data !== 'undefined' && Array.isArray(data.wishlists)) ? data.wishlists : [];
    const isVinyl = i => wishCat(i) === 'vinyl';
    const isCd = i => wishCat(i) === 'cd';
    const pl = (n, a, b, c) => { const m = n % 10, k = n % 100; return (m === 1 && k !== 11) ? a : (m >= 2 && m <= 4 && (k < 12 || k > 14)) ? b : c; };
    const money = n => Math.round(n).toLocaleString('ru-RU') + ' ₴';

    const css2 = document.createElement('style');
    css2.textContent = `
    .wp-btn{position:absolute;left:.5rem;top:.5rem;z-index:30;width:2rem;height:2rem;border-radius:999px;display:flex;align-items:center;justify-content:center;font-size:.95rem;cursor:pointer;
        background:rgba(0,0,0,.55);border:1px solid rgba(255,255,255,.25);opacity:.55;transition:all .15s}
    [data-mid]:hover>.wp-btn,.wp-btn:focus-visible{opacity:1}
    .wp-btn:hover{background:rgba(var(--theme-rgb),.5)}
    .wp-in>.wp-btn{opacity:1;background:#06b6d4;border-color:#06b6d4}
    .wp-in{outline:2px solid rgba(34,211,238,.7);outline-offset:3px;border-radius:1.5rem}
    #wishlist-grid>[data-mid]{position:relative}
    [data-bulk-active] .wp-btn{display:none}
    #wishlist-grid.wp-only>[data-mid]:not(.wp-in){display:none}
    .wp-bar{position:fixed;left:50%;bottom:calc(1rem + env(safe-area-inset-bottom,0px));transform:translateX(-50%);z-index:60;display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:.5rem .75rem;
        max-width:calc(100vw - 1.5rem);padding:.65rem .9rem;border-radius:1.1rem;background:rgba(14,14,24,.96);border:1px solid rgba(34,211,238,.45);box-shadow:0 14px 40px rgba(0,0,0,.55);backdrop-filter:blur(12px)}
    .wp-bar.hidden{display:none}
    .wp-bar b{font-size:.8rem;color:#67e8f9;font-weight:800}
    .wp-bar .wp-sum{font-size:.95rem;font-weight:900;color:#fff;font-family:ui-monospace,SFMono-Regular,Menlo,monospace}
    .wp-bar small{font-size:.7rem;color:#9ca3af}
    .wp-bar button{font-size:.75rem;padding:.45rem .8rem;border-radius:.7rem;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.07);color:#e5e7eb;font-weight:700;cursor:pointer}
    .wp-bar button:hover{background:rgba(255,255,255,.15)}
    .wp-bar button.is-on{background:rgba(6,182,212,.25);border-color:rgba(34,211,238,.6);color:#fff}
    #wishlist-grid .release-card{transition:transform .2s ease,box-shadow .2s ease,border-color .2s ease}
    #wishlist-grid>[data-mid]:hover .release-card{transform:translateY(-3px);box-shadow:0 14px 34px rgba(0,0,0,.45),0 0 0 1px rgba(var(--theme-rgb),.35)}
    #category-budget-breakdown [data-cat]{border-radius:1.1rem;background-image:linear-gradient(160deg,rgba(255,255,255,.04),transparent 60%)}
    .wp-bar button[data-wp="copy"]{background:rgba(var(--theme-rgb),.28);border-color:rgba(var(--theme-rgb),.55);color:#fff}
    .wp-sub{margin-top:.25rem;font-size:9px;font-weight:700;color:#9ca3af;line-height:1.35}
    @media (max-width:767px){.wp-bar{bottom:calc(5rem + env(safe-area-inset-bottom,0px))}}`;
    document.head.appendChild(css2);

    const bar = document.createElement('div');
    bar.className = 'wp-bar hidden'; bar.setAttribute('role', 'region'); bar.setAttribute('aria-label', 'Набор покупки');
    document.body.appendChild(bar);

    function summary() {
        const sel = items().filter(i => plan.has(Number(i.id)));
        const v = sel.filter(isVinyl).length, c = sel.filter(isCd).length, rest = {};
        sel.filter(i => !isVinyl(i) && !isCd(i)).forEach(i => { const k = i.category || 'other'; rest[k] = (rest[k] || 0) + 1; });
        const parts = [];
        if (v) parts.push(`💽 ${v} ${pl(v, 'винил', 'винила', 'винилов')}`);
        if (c) parts.push(`💿 ${c} CD`);
        Object.keys(rest).forEach(k => { const wc = (typeof WISH_CATS !== 'undefined' && WISH_CATS.find(x => x.id === k)) || { ico: '🎁', name: 'Другое' }; parts.push(`${wc.ico} ${wc.name.toLowerCase()} ×${rest[k]}`); });
        return { sel, parts, total: sel.reduce((s, i) => s + (Number(i.price) || 0), 0) };
    }

    function decorate() {
        const ids = new Set(items().map(i => Number(i.id)));
        [...plan].forEach(id => { if (!ids.has(id)) plan.delete(id); });
        [...grid.children].forEach(el => {
            if (!el.matches || !el.matches('[data-mid]')) return;
            const id = Number(el.dataset.mid), on = plan.has(id);
            el.classList.toggle('wp-in', on);
            let b = el.querySelector(':scope > .wp-btn');
            if (!b) {
                b = document.createElement('button'); b.type = 'button'; b.className = 'wp-btn'; b.textContent = '🛒';
                el.appendChild(b);
            }
            b.title = on ? 'Убрать из набора' : 'Добавить в набор покупки';
            b.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        grid.classList.toggle('wp-only', only && plan.size > 0);
        paintBar();
    }

    function paintBar() {
        const visible = plan.size > 0 && grid.offsetParent !== null;
        bar.classList.toggle('hidden', !visible);
        if (!visible) return;
        const { sel, parts, total } = summary();
        const budget = (typeof data !== 'undefined' && data.hobbyBudget) || 2500;
        bar.style.marginBottom = document.getElementById('bulk-bar')?.classList.contains('hidden') === false ? '3.8rem' : '';
        bar.innerHTML = `<span>🛒 <b>Набор:</b> <b style="color:#fff">${parts.join(' · ') || '—'}</b></span>
            <span class="wp-sum">${money(total)}</span><small>≈ ${(total / budget).toFixed(1)} мес. бюджета</small>
            <button type="button" data-wp="only" class="${only ? 'is-on' : ''}">${only ? '👁 Показать все' : '👁 Только набор'}</button>
            <button type="button" data-wp="setcd" title="Поставить категорию «CD» всем музыкальным в наборе">→ 💿 CD</button>
            <button type="button" data-wp="setvinyl" title="Поставить категорию «Винил» всем музыкальным в наборе">→ 💽 Винил</button>
            <button type="button" data-wp="copy" title="Скопировать список набора текстом">📋 Скопировать</button>
            <button type="button" data-wp="clear">Очистить</button>`;
    }

    grid.addEventListener('click', e => {
        const b = e.target.closest('.wp-btn'); if (!b) return;
        e.stopPropagation(); e.preventDefault();
        const el = b.closest('[data-mid]'), id = Number(el.dataset.mid);
        plan.has(id) ? plan.delete(id) : plan.add(id);
        save(); decorate();
    }, true);
    bar.addEventListener('click', e => {
        const b = e.target.closest('[data-wp]'); if (!b) return;
        if (b.dataset.wp === 'copy') {
            const { sel, parts, total } = summary();
            const txt = sel.map(i => `• ${i.artist ? i.artist + ' — ' : ''}${i.title} — ${money(Number(i.price) || 0)}`).join('\n') + `\n\n${parts.join(' · ')}\nИтого: ${money(total)}`;
            (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(() => { try { showToast('Набор скопирован 📋', 'success'); } catch (_) {} }, () => { try { showToast('Не удалось скопировать', 'error'); } catch (_) {} });
            return;
        }
        if (b.dataset.wp === 'setcd' || b.dataset.wp === 'setvinyl') {
            const to = b.dataset.wp === 'setcd' ? 'cd' : 'vinyl';
            const mus = items().filter(i => plan.has(Number(i.id)) && (isCd(i) || isVinyl(i)));
            if (!mus.length) { try { showToast('В наборе нет CD / винила', 'info'); } catch (_) {} return; }
            mus.forEach(i => { i.category = to; });
            try { window.save(); } catch (_) {}
            try { showToast(`Категория «${to === 'cd' ? 'CD' : 'Винил'}»: ${mus.length} шт.`, 'success'); } catch (_) {}
            return;
        }
        if (b.dataset.wp === 'clear') { plan.clear(); only = false; save(); }
        else only = !only;
        decorate();
    });

    new MutationObserver(decorate).observe(grid, { childList: true });
    addEventListener('hashchange', () => setTimeout(paintBar, 60));
    document.addEventListener('click', () => setTimeout(paintBar, 80));
    decorate();

})();
