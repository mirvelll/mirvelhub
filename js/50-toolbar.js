/* =========================================================
   MIRVEL HUB — 50-toolbar.js (подключается последним)
   Верхняя панель страниц «Игры», «CD», «Винил» (этап K):
   1) Одинаковая кнопка «Вид: карточки / обложки / список» на всех трёх страницах (по кругу).
      Данные те же: data.viewMode[key] / data.gameViewMode и data.listMode[key]. Старая кнопка «☰ Список» скрыта.
   2) Редкие кнопки («Поделиться», «Настроить», «Список для нейросети») убраны в меню «⋯».
      Сами кнопки остаются в DOM (скрыты) — меню просто нажимает их, поэтому вся логика прежняя.
   3) На телефоне главная кнопка («+ Новый …») на всю ширину, под ней «Вид», «Во что поиграть?» и «⋯».
   Своих данных не хранит.
   ========================================================= */
(() => {
    'use strict';
    const $ = id => document.getElementById(id);
    const PAGES = ['games', 'cds', 'vinyls'];
    const LABEL = { cards: 'Вид: карточки', covers: 'Вид: обложки', list: 'Вид: список' };
    const NEXT = { cards: 'обложки', covers: 'список', list: 'карточки' };

    const css = document.createElement('style');
    css.textContent = `
    [data-mh-list="games"],[data-mh-list="cds"],[data-mh-list="vinyls"]{display:none!important}
    .mh-tb{position:relative;align-items:center;flex-wrap:wrap;max-width:100%;flex-shrink:1!important}
    .mh-tb>.mh-tb-src{display:none!important}
    .mh-tb>.mh-tb-view,.mh-tb>.mh-tb-roll,.mh-tb>.mh-tb-more{display:inline-flex;align-items:center;justify-content:center;gap:6px;box-sizing:border-box;min-height:46px;padding:0 16px;border-radius:14px;font-size:13px;font-weight:800;line-height:1.15;color:#fff;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);cursor:pointer;white-space:nowrap;transition:background .18s,border-color .18s,transform .18s}
    .mh-tb>.mh-tb-view:hover,.mh-tb>.mh-tb-roll:hover,.mh-tb>.mh-tb-more:hover,.mh-tb>.mh-tb-more[aria-expanded="true"]{background:rgba(255,255,255,.11);border-color:var(--theme-btn,#8b5cf6)}
    .mh-tb>.mh-tb-more{padding:0 14px;font-size:20px;letter-spacing:1px}
    .mh-tb>.mh-tb-roll{order:1}
    .mh-tb>.mh-tb-view{order:2}
    .mh-tb>.mh-tb-more{order:3}
    .mh-tb>.mh-tb-main{order:4;min-height:46px;display:inline-flex;align-items:center;justify-content:center;white-space:nowrap;padding-top:0;padding-bottom:0}
    .mh-tb-menu{position:absolute;right:0;top:calc(100% + 8px);z-index:70;min-width:230px;max-width:calc(100vw - 32px);padding:6px;border-radius:16px;background:rgba(17,15,28,.97);border:1px solid rgba(255,255,255,.14);box-shadow:0 18px 50px rgba(0,0,0,.55);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);animation:mhTbIn .14s ease-out}
    .mh-tb-menu[hidden]{display:none}
    .mh-tb-menu button{display:flex;align-items:center;gap:10px;width:100%;text-align:left;padding:11px 14px;border-radius:11px;font-size:13.5px;font-weight:700;color:#e5e7eb;background:none;border:0;cursor:pointer}
    .mh-tb-menu button:hover,.mh-tb-menu button:focus-visible{background:rgba(255,255,255,.09);color:#fff;outline:none}
    .mh-tb-menu small{display:block;font-size:11px;font-weight:600;color:#9ca3af;margin-top:1px}
    @keyframes mhTbIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:none}}
    @media(max-width:767px){
        .mh-tb{width:100%;gap:10px}
        .mh-tb>.mh-tb-main{order:0;flex:1 1 100%;width:100%}
        .mh-tb>.mh-tb-view,.mh-tb>.mh-tb-roll{flex:1 1 0;min-width:0;padding:0 10px;font-size:12.5px;white-space:normal;text-align:center}
        .mh-tb>.mh-tb-more{flex:0 0 48px}
        .mh-tb-menu{left:0;right:0;max-width:none}
    }
    @media(min-width:768px){
        #games>div:first-child,#cds>div:first-child,#vinyls>div:first-child{flex-wrap:wrap}
        #games>div:first-child>div:first-child,#cds>div:first-child>div:first-child,#vinyls>div:first-child>div:first-child{flex-wrap:wrap;max-width:100%}
        #games>div:first-child input,#cds>div:first-child input,#vinyls>div:first-child input{max-width:100%}
        #games>div:first-child>div:last-child,#cds>div:first-child>div:last-child,#vinyls>div:first-child>div:last-child{margin-left:auto}
    }
    @media(prefers-reduced-motion:reduce){.mh-tb-menu{animation:none}}
    `;
    document.head.appendChild(css);

    /* ---------- «Вид: …» ---------- */
    const listOn = k => !!(data.listMode && data.listMode[k]);
    const modeOf = k => listOn(k) ? 'list'
        : ((k === 'games' ? data.gameViewMode : (data.viewMode || {})[k]) === 'covers' ? 'covers' : 'cards');

    function setList(k, on) {
        if (listOn(k) === on) return;
        const lb = document.querySelector(`[data-mh-list="${k}"]`);
        if (lb) { lb.click(); return; }
        if (!data.listMode) data.listMode = {};
        data.listMode[k] = on; save();
    }
    function nextView(k) {
        // игры крутит 40-games-extras.js (его кнопка #game-view-btn) — здесь только CD и винил
        if (!data.viewMode) data.viewMode = {};
        const m = modeOf(k);
        if (m === 'cards') { data.viewMode[k] = 'covers'; save(); }
        else if (m === 'covers') { data.viewMode[k] = 'grid'; save(); setList(k, true); }
        else { setList(k, false); data.viewMode[k] = 'grid'; save(); }
        paint(k);
    }
    function paint(k) {
        const b = document.querySelector(`#${k} .mh-tb-view`);
        if (!b) return;
        const m = modeOf(k);
        if (k !== 'games' && b.textContent !== LABEL[m]) b.textContent = LABEL[m];
        b.title = 'Сменить вид: сейчас ' + LABEL[m].replace('Вид: ', '') + ', дальше — ' + NEXT[m];
    }

    /* ---------- меню «⋯» ---------- */
    function closeMenus(except) {
        document.querySelectorAll('.mh-tb-menu').forEach(m => {
            if (m === except) return;
            m.hidden = true;
            const t = m.previousElementSibling; t && t.classList && t.classList.contains('mh-tb-more') && t.setAttribute('aria-expanded', 'false');
        });
    }
    function menuItems(key, bar) {
        const items = [];
        const share = bar.querySelector('[data-share-col]');
        const cfg = bar.querySelector('.mh-gear');
        const copy = bar.querySelector('#mh-copy-games-btn');
        if (share) items.push({ ico: '📤', t: 'Поделиться', s: 'Картинка-мозаика коллекции', el: share });
        if (cfg) items.push({ ico: '🎛', t: 'Настроить страницу', s: 'Какие блоки показывать', el: cfg });
        if (copy) items.push({ ico: '📋', t: 'Список для нейросети', s: 'Скопировать названия игр', el: copy });
        return items;
    }
    function buildMenu(key, bar) {
        const items = menuItems(key, bar);
        let more = bar.querySelector('.mh-tb-more'), menu = bar.querySelector('.mh-tb-menu');
        const sig = items.map(i => i.t).join('|');
        if (!items.length) { more && more.remove(); menu && menu.remove(); return; }
        if (!more) {
            more = document.createElement('button');
            more.type = 'button'; more.className = 'mh-tb-more';
            more.textContent = '⋯';
            more.title = 'Ещё'; more.setAttribute('aria-label', 'Ещё');
            more.setAttribute('aria-haspopup', 'true'); more.setAttribute('aria-expanded', 'false');
            menu = document.createElement('div');
            menu.className = 'mh-tb-menu'; menu.hidden = true; menu.setAttribute('role', 'menu');
            bar.append(more, menu);
            more.addEventListener('click', e => {
                e.stopPropagation();
                const open = menu.hidden;
                closeMenus(open ? menu : null);
                menu.hidden = !open;
                more.setAttribute('aria-expanded', String(open));
                if (open) menu.querySelector('button')?.focus({ preventScroll: true });
            });
            menu.addEventListener('click', e => {
                const b = e.target.closest('[data-i]');
                if (!b) return;
                const it = menu._items[Number(b.dataset.i)];
                closeMenus();
                more.focus({ preventScroll: true });
                if (it && it.el.isConnected) it.el.click();
            });
        }
        menu._items = items;
        if (menu.dataset.sig !== sig) {
            menu.dataset.sig = sig;
            menu.innerHTML = items.map((i, n) =>
                `<button type="button" role="menuitem" data-i="${n}"><span aria-hidden="true">${i.ico}</span><span>${i.t}<small>${i.s}</small></span></button>`).join('');
        }
    }

    /* ---------- сборка панели ---------- */
    function sync(key) {
        const sec = $(key);
        if (!sec) return;
        const bar = sec.querySelector(':scope > div:first-child > div:last-child');
        if (!bar) return;
        bar.classList.add('mh-tb');

        // скрываем «редкие» кнопки: их нажимает меню
        bar.querySelectorAll('[data-share-col], .mh-gear, #mh-copy-games-btn').forEach(b => b.classList.add('mh-tb-src'));

        // «Вид»
        let view = key === 'games' ? $('game-view-btn') : bar.querySelector('button[onclick^="toggleViewMode"], .mh-tb-view');
        if (view && !view.classList.contains('mh-tb-view')) {
            view.classList.add('mh-tb-view');
            if (key !== 'games') {
                view.removeAttribute('onclick');
                view.onclick = () => nextView(key);
            }
        }
        // «Во что поиграть?»
        const roll = $('game-roll-btn');
        if (key === 'games' && roll) roll.classList.add('mh-tb-roll');
        // главная кнопка («+ Новый …») — последняя белая
        const main = [...bar.children].filter(c => c.tagName === 'BUTTON' && c.classList.contains('bg-white') && !c.classList.contains('mh-tb-src')).pop();
        if (main) main.classList.add('mh-tb-main');

        buildMenu(key, bar);
        paint(key);
    }

    function init() {
        PAGES.forEach(key => {
            const sec = $(key);
            if (!sec) return;
            sync(key);
            const bar = sec.querySelector(':scope > div:first-child > div:last-child');
            if (bar) new MutationObserver(() => sync(key)).observe(bar, { childList: true });
            const grid = $(key === 'cds' ? 'cd-grid' : key === 'vinyls' ? 'vinyl-grid' : 'games-grid');
            if (grid) {
                const repaint = () => paint(key);
                new MutationObserver(repaint).observe(grid, { childList: true, attributes: true, attributeFilter: ['class'] });
            }
        });
        document.addEventListener('click', e => { if (!e.target.closest('.mh-tb-menu, .mh-tb-more')) closeMenus(); });
        document.addEventListener('keydown', e => {
            if (e.key !== 'Escape') return;
            const open = document.querySelector('.mh-tb-menu:not([hidden])');
            if (!open) return;
            const t = open.previousElementSibling;
            closeMenus(); t && t.focus && t.focus({ preventScroll: true });
        });
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
    document.addEventListener('mirvel-ready', () => setTimeout(() => PAGES.forEach(sync), 0), { once: true });
})();
