/* =========================================================
   MIRVEL HUB — 40-games-extras.js (подключается после 39-game-editor.js)
   1) Одна кнопка «Вид» на странице «Игры» вместо двух (раньше были «🖼️ Вид» и «☰ Список»):
      клик переключает по кругу  🗂 Карточки → 🖼 Обложки → ☰ Список
   2) Оформление панели сортировки (по часам, обратный порядок — логика в 16-games.js)
   Своих данных не хранит: использует те же data.gameViewMode и data.listMode.games.
   ========================================================= */
(() => {
    'use strict';
    const $ = id => document.getElementById(id);
    const listOn = () => !!(data.listMode && data.listMode.games);
    const mode = () => listOn() ? 'list' : (data.gameViewMode === 'covers' ? 'covers' : 'cards');
    const LABEL = { cards: '🗂 Карточки', covers: '🖼 Обложки', list: '☰ Список' };

    const css = document.createElement('style');
    css.textContent = `
    [data-mh-list="games"]{display:none!important}
    #game-sort-bar{gap:8px}
    #game-sort-bar .gsort-btn{border-radius:999px;padding:6px 14px;transition:all .2s}
    #game-sort-bar .gsort-btn.is-on{background:linear-gradient(135deg,var(--theme-btn,#8b5cf6),#06b6d4);color:#fff;border-color:transparent;box-shadow:0 6px 18px rgba(139,92,246,.35)}
    #game-sort-bar .gsort-btn.is-on::after{content:" ↓";font-weight:900}
    #game-sort-bar[data-dir="up"] .gsort-btn.is-on::after{content:" ↑"}
    #game-sort-bar .gsort-dir{margin-left:auto;padding:6px 14px;border-radius:999px;font-size:12px;font-weight:800;color:#9ca3af;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);cursor:pointer;transition:all .2s}
    #game-sort-bar .gsort-dir.is-on{color:#fff;border-color:var(--theme-btn,#8b5cf6);background:rgba(139,92,246,.18)}
    @media(max-width:640px){#game-sort-bar{flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none}#game-sort-bar::-webkit-scrollbar{display:none}#game-sort-bar>*{flex-shrink:0}}
    `;
    document.head.appendChild(css);

    function paint() {
        const b = $('game-view-btn');
        if (!b) return;
        const m = mode();
        if (b.textContent !== LABEL[m]) b.textContent = LABEL[m];
        b.title = 'Вид списка игр: карточки → обложки → список';
    }
    function setList(on) {
        if (listOn() === on) return;
        const lb = document.querySelector('[data-mh-list="games"]');
        if (lb) { lb.click(); return; }
        if (!data.listMode) data.listMode = {};
        data.listMode.games = on; save();
    }
    function next() {
        const m = mode();
        if (m === 'cards') { data.gameViewMode = 'covers'; save(); }
        else if (m === 'covers') { data.gameViewMode = 'grid'; save(); setList(true); }
        else { setList(false); data.gameViewMode = 'grid'; save(); }
        paint();
    }

    function init() {
        const b = $('game-view-btn');
        if (!b) return;
        b.onclick = next;
        paint();
        const grid = $('games-grid');
        if (grid) new MutationObserver(paint).observe(grid, { childList: true });
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
    document.addEventListener('mirvel-ready', () => setTimeout(paint, 0), { once: true });
})();
