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
    const LABEL = { cards: 'Вид: карточки', covers: 'Вид: обложки', list: 'Вид: список' };

    const css = document.createElement('style');
    css.textContent = `
    [data-mh-list="games"]{display:none!important}
    #game-sort-bar{gap:10px;align-items:center}
    #game-sort-bar .gsort-sel{position:absolute!important;width:1px;height:1px;opacity:0;pointer-events:none;overflow:hidden}   /* настоящий <select> остаётся — на нём держится логика */
    .gsort-chips{display:flex;flex-wrap:wrap;gap:6px;flex:1 1 auto;min-width:0}
    .gsort-chip{display:inline-flex;align-items:center;gap:7px;padding:8px 14px;border-radius:999px;font-size:12.5px;font-weight:800;color:#9ca3af;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);cursor:pointer;white-space:nowrap;transition:color .18s,background .18s,border-color .18s,transform .18s}
    .gsort-chip .gsi{font-size:15px;line-height:1}
    .gsort-chip:hover{color:#fff;background:rgba(255,255,255,.1);transform:translateY(-1px)}
    .gsort-chip.is-on{color:#fff;border-color:var(--theme-btn,#8b5cf6);background:linear-gradient(135deg,rgba(139,92,246,.38),rgba(34,211,238,.16));box-shadow:0 4px 16px rgba(139,92,246,.25)}
    #game-sort-bar .gsort-dir{display:inline-flex;align-items:center;gap:6px;padding:8px 16px;border-radius:999px;font-size:12.5px;font-weight:800;color:#fff;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.18);cursor:pointer;transition:all .2s;white-space:nowrap}
    #game-sort-bar .gsort-dir:hover{background:rgba(139,92,246,.3);border-color:var(--theme-btn,#8b5cf6)}
    @media(max-width:640px){
        #game-sort-bar{flex-wrap:nowrap!important;overflow-x:auto;scrollbar-width:none;-webkit-overflow-scrolling:touch}
        #game-sort-bar::-webkit-scrollbar{display:none}
        #game-sort-bar>*{flex-shrink:0}
        .gsort-chips{flex-wrap:nowrap;flex:0 0 auto}
    }
    `;
    document.head.appendChild(css);

    function paint() {
        const b = $('game-view-btn');
        if (!b) return;
        const m = mode();
        if (b.textContent !== LABEL[m]) b.textContent = LABEL[m];
        b.title = 'Сменить вид: карточки → обложки → список';
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

    /* ---------- сортировка: красивая панель-чипы поверх скрытого <select> ---------- */
    function buildSort() {
        const sel = $('game-sort-sel');
        if (!sel) return;
        let chips = $('gsort-chips');
        if (!chips) {
            chips = document.createElement('div');
            chips.id = 'gsort-chips'; chips.className = 'gsort-chips';
            chips.setAttribute('role', 'radiogroup'); chips.setAttribute('aria-label', 'Сортировать по');
            sel.insertAdjacentElement('afterend', chips);
            chips.addEventListener('click', e => {
                const b = e.target.closest('[data-sv]');
                if (!b || sel.value === b.dataset.sv) return;
                sel.value = b.dataset.sv;
                sel.dispatchEvent(new Event('change', { bubbles: true }));   // дальше работает прежняя логика из 16-games.js
            });
        }
        const sig = [...sel.options].map(o => o.value + o.textContent).join('|');
        if (chips.dataset.sig !== sig) {
            chips.dataset.sig = sig;
            chips.innerHTML = [...sel.options].map(o => {
                const t = o.textContent.trim(), m = t.match(/^(\S+)\s+(.*)$/);
                const ico = m ? m[1] : '', label = m ? m[2] : t;
                return `<button type="button" class="gsort-chip" role="radio" data-sv="${o.value}"><span class="gsi" aria-hidden="true">${ico}</span>${label}</button>`;
            }).join('');
        }
        chips.querySelectorAll('[data-sv]').forEach(b => {
            const on = b.dataset.sv === sel.value;
            b.classList.toggle('is-on', on); b.setAttribute('aria-checked', String(on));
        });
    }

    function init() {
        buildSort();
        const b = $('game-view-btn');
        if (!b) return;
        b.onclick = next;
        paint();
        const grid = $('games-grid');
        if (grid) new MutationObserver(() => { paint(); buildSort(); }).observe(grid, { childList: true });
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
    document.addEventListener('mirvel-ready', () => setTimeout(() => { paint(); buildSort(); }, 0), { once: true });
})();
