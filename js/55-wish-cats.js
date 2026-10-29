/* =========================================================
   MIRVEL HUB — 55-wish-cats.js (подключается после 54-tags.js)
   «Желаемое»: плитки «Накопление по категориям» кликабельны — нажатие включает фильтр
   по этой категории (повторное нажатие сбрасывает). Сами категории — WISH_CATS в 01-state.js.
   ========================================================= */
(() => {
    'use strict';
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
})();
