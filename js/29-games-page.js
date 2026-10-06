/* =========================================================
   MIRVEL HUB — 29-games-page.js (подключать после 28-appearance.js)
   Настройка страницы «Игры»: кнопка «🎛 Настроить» рядом с «Вид».
   • можно скрыть любой блок: статистика, прогресс по платформам, фильтры, сортировка
   • быстрые наборы «Компактно» / «Показать всё»
   Настройки хранятся в data.gamesView (необязательное поле, попадает в бэкап).
   Размер корешков «Полки» настраивается ползунком рядом с кнопкой «📚 Полка» (27-design.js).
   ========================================================= */
(() => {
    'use strict';
    const $ = id => document.getElementById(id);
    const BLOCKS = [
        { k: 'stats',   t: 'Карточки статистики (платформы, пройдено, оценка)' },
        { k: 'plat',    t: 'Прогресс по платформам' },
        { k: 'filters', t: 'Фильтр по платформам' },
        { k: 'sort',    t: 'Сортировка' },
        { k: 'strip',   t: 'Полоса над списком', optional: 'game-strip' }
    ];
    const COMPACT = ['stats', 'plat', 'strip'];

    const css = document.createElement('style');
    css.textContent = `
    #games.mh-h-stats .mh-blk-stats,
    #games.mh-h-plat #mh-plat,
    #games.mh-h-filters #game-platform-filters,
    #games.mh-h-sort .mh-blk-sort,
    #games.mh-h-strip #game-strip{display:none!important}
    #mh-games-panel{margin-bottom:1.5rem;padding:1.25rem 1.4rem;border-radius:1.25rem}
    #mh-games-panel.hidden{display:none}
    .mgp-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:.9rem}
    .mgp-head b{font-weight:900}
    .mgp-cols{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:1.2rem 2rem}
    .mgp-title{font-size:10px;letter-spacing:.12em;text-transform:uppercase;font-weight:800;color:#9ca3af;margin-bottom:.5rem}
    .mgp-row{display:flex;align-items:center;gap:.6rem;font-size:.85rem;color:#d1d5db;padding:.25rem 0;cursor:pointer}
    .mgp-row input{accent-color:var(--theme-btn,#8b5cf6);width:16px;height:16px;cursor:pointer}
    .mgp-btns{display:flex;flex-wrap:wrap;gap:.5rem;margin-top:.9rem}
    `;
    document.head.appendChild(css);

    const view = () => {
        if (!data.gamesView || typeof data.gamesView !== 'object') data.gamesView = {};
        if (!data.gamesView.hide || typeof data.gamesView.hide !== 'object') data.gamesView.hide = {};
        return data.gamesView;
    };
    const save = () => { try { persistData(); } catch (_) {} };

    function apply() {
        const sec = $('games');
        if (!sec) return;
        const v = data.gamesView || {}, hide = v.hide || {};
        BLOCKS.forEach(b => sec.classList.toggle('mh-h-' + b.k, !!hide[b.k]));
        sec.classList.remove('mh-sized');            // размер карточек убран из настроек — на случай старого сохранённого значения
        sec.style.removeProperty('--mh-card');
    }

    function sync(panel) {
        const v = view();
        panel.querySelectorAll('[data-blk]').forEach(cb => { cb.checked = !v.hide[cb.dataset.blk]; });
        panel.querySelectorAll('[data-blk-row]').forEach(r => {
            const opt = BLOCKS.find(b => b.k === r.dataset.blkRow)?.optional;
            r.style.display = opt && !$(opt) ? 'none' : '';
        });
    }

    function build() {
        const sec = $('games');
        if (!sec || $('mh-games-panel')) return;
        const head = sec.firstElementChild;
        const viewBtn = $('game-view-btn');
        if (!head) return;

        const panel = document.createElement('div');
        panel.id = 'mh-games-panel';
        panel.className = 'glass no-hover hidden';
        panel.innerHTML = `
            <div class="mgp-head"><b>🎛 Настроить страницу «Игры»</b>
                <button type="button" class="mh-btn" data-mgp="close" aria-label="Закрыть">✕</button></div>
            <div class="mgp-cols">
                <div>
                    <p class="mgp-title">Показывать блоки</p>
                    ${BLOCKS.map(b => `<label class="mgp-row" data-blk-row="${b.k}"><input type="checkbox" data-blk="${b.k}"><span>${b.t}</span></label>`).join('')}
                </div>
            </div>
            <div class="mgp-btns">
                <button type="button" class="mh-btn" data-mgp="compact">🧹 Компактно</button>
                <button type="button" class="mh-btn" data-mgp="all">👁 Показать всё</button>
            </div>`;
        head.insertAdjacentElement('afterend', panel);

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.id = 'mh-games-cfg-btn';
        btn.className = viewBtn ? viewBtn.className : 'mh-btn';
        btn.textContent = '🎛 Настроить';
        if (viewBtn) viewBtn.insertAdjacentElement('beforebegin', btn); else head.appendChild(btn);
        btn.addEventListener('click', () => {
            const show = panel.classList.contains('hidden');
            panel.classList.toggle('hidden', !show);
            if (show) sync(panel);
        });

        panel.addEventListener('change', e => {
            const cb = e.target.closest('[data-blk]');
            if (!cb) return;
            view().hide[cb.dataset.blk] = !cb.checked;
            apply(); save();
        });
        panel.addEventListener('click', e => {
            const a = e.target.closest('[data-mgp]');
            if (!a) return;
            const v = view();
            switch (a.dataset.mgp) {
                case 'close': panel.classList.add('hidden'); return;
                case 'compact': BLOCKS.forEach(b => { v.hide[b.k] = COMPACT.includes(b.k); }); break;
                case 'all': BLOCKS.forEach(b => { v.hide[b.k] = false; }); break;
            }
            apply(); save(); sync(panel);
        });
    }

    function tag() {
        $('games-platform-count')?.closest('.grid')?.classList.add('mh-blk-stats');
        $('game-sort-title')?.parentElement?.classList.add('mh-blk-sort');
    }

    function init() { tag(); build(); apply(); }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
    document.addEventListener('mirvel-ready', () => setTimeout(apply, 0), { once: true });
})();
