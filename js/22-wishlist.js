/* MIRVEL HUB — 22-wishlist.js: оформление «Желаемого» (панель бюджета, цветные теги) */
(() => {
    const $ = id => document.getElementById(id);
    // фон тега из inline-стиля → переменная --tc, дальше рисует wishlist.css
    function tint() {
        document.querySelectorAll('#filter-tags button, #available-tags-list button, #manage-tags-list span[style], #wishlist-grid .release-card span[style*="background-color"]').forEach(el => {
            const c = el.style.backgroundColor;
            if (!c) return;
            el.style.setProperty('--tc', c);
            el.style.backgroundColor = '';
            el.classList.add('wl-tag');
        });
    }
    $('hobby-budget-slider')?.closest('.glass')?.classList.add('wl-budget');
    const obs = new MutationObserver(tint);
    ['filter-tags', 'available-tags-list', 'manage-tags-list', 'wishlist-grid'].forEach(id => $(id) && obs.observe($(id), { childList: true }));
    tint();
})();
