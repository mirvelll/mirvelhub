/* =========================================================
   MIRVEL HUB — 41-fav-carousel.js (подключается после 40-games-extras.js)
   «⭐ Любимое» на главной:
   • лента сама плавно едет вправо-влево («туда-обратно»), на краях делает паузу
   • останавливается, пока наводишь мышь / трогаешь / листаешь сам, потом продолжает
   • панель настроек: ▶/⏸ автопрокрутка, скорость, «Лентой / Рядами», порядок
     (как добавлено · 🎲 случайно · А–Я · по разделам · новые сверху), кнопка «Перемешать»
   Настройки хранятся в data.favView (необязательное поле, попадает в бэкап).
   Автопрокрутка по умолчанию ВКЛЮЧЕНА; при системной настройке «уменьшить анимацию» — выключена.
   ========================================================= */
(() => {
    'use strict';
    const $ = id => document.getElementById(id);
    const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    const DEF = { auto: !reduce, rows: false, speed: 1, order: 'default' };
    const view = () => (data.favView = { ...DEF, ...(data.favView || {}) });
    const SPEED = [['🐢', 22], ['🚶', 40], ['🐇', 75]];
    const ORDERS = [['default', 'Как добавлено'], ['random', '🎲 Случайно'], ['title', 'А–Я'], ['type', 'По разделам'], ['recent', 'Новые сверху']];
    let seed = Math.random();
    let box = null, obs = null, raf = 0;
    let pos = 0, dir = 1, holdUntil = 0, lastSet = 0, last = 0, hover = false;

    const css = document.createElement('style');
    css.textContent = `
    .fv-bar{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin:-4px 0 10px}
    .fv-b{padding:5px 11px;border-radius:999px;font-size:11px;font-weight:800;color:#9ca3af;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);cursor:pointer;transition:all .2s}
    .fv-b:hover{color:#fff}.fv-b.is-on{color:#fff;border-color:var(--theme-btn,#8b5cf6);background:rgba(139,92,246,.2)}
    .fv-sel{padding:5px 8px;border-radius:999px;font-size:11px;font-weight:800;color:#d1d5db;background:#0d0d14;border:1px solid rgba(255,255,255,.1)}
    #mh-fav-row.fv-rows .mh-fav-scroll{flex-wrap:wrap;overflow:visible;justify-content:flex-start}
    #mh-fav-row:not(.fv-rows) .mh-fav-scroll{scrollbar-width:none;mask-image:linear-gradient(90deg,transparent,#000 24px,#000 calc(100% - 24px),transparent);-webkit-mask-image:linear-gradient(90deg,transparent,#000 24px,#000 calc(100% - 24px),transparent)}
    #mh-fav-row:not(.fv-rows) .mh-fav-scroll::-webkit-scrollbar{display:none}
    `;
    document.head.appendChild(css);

    function rnd(n) { const x = Math.sin(n * 9301 + seed * 49297) * 233280; return x - Math.floor(x); }
    function sortTiles(sc) {
        const o = view().order;
        const tiles = [...sc.children];
        const info = t => { const k = t.dataset.fk, id = Number(t.dataset.fid); const it = (data[k] || []).find(x => x.id === id) || {}; return { k, id, title: String(it.title || '') }; };
        let arr = tiles.map((t, idx) => ({ t, idx, ...info(t) }));
        if (o === 'random') arr.sort((a, b) => rnd(a.id + a.idx) - rnd(b.id + b.idx));
        else if (o === 'title') arr.sort((a, b) => a.title.localeCompare(b.title, 'ru'));
        else if (o === 'type') arr.sort((a, b) => a.k.localeCompare(b.k) || a.title.localeCompare(b.title, 'ru'));
        else if (o === 'recent') arr.sort((a, b) => b.id - a.id);
        else return;
        arr.forEach(x => sc.appendChild(x.t));
    }

    function decorate() {
        if (!box || box.hidden) return;
        const sc = box.querySelector('.mh-fav-scroll');
        if (!sc) return;
        const v = view();
        if (!box.querySelector('.fv-bar')) {
            const bar = document.createElement('div');
            bar.className = 'fv-bar';
            bar.innerHTML = `
                <button type="button" class="fv-b" data-fv="auto" title="Автопрокрутка туда-обратно"></button>
                <button type="button" class="fv-b" data-fv="speed" title="Скорость"></button>
                <button type="button" class="fv-b" data-fv="rows"></button>
                <select class="fv-sel" data-fv="order" aria-label="Порядок">${ORDERS.map(([k, l]) => `<option value="${k}">${l}</option>`).join('')}</select>
                <button type="button" class="fv-b" data-fv="shuffle" title="Перемешать">🎲</button>`;
            sc.insertAdjacentElement('beforebegin', bar);
        }
        sortTiles(sc);
        paintBar();
        box.classList.toggle('fv-rows', v.rows);
        if (v.rows) sc.scrollLeft = 0;
        pos = sc.scrollLeft; lastSet = pos;
    }
    function paintBar() {
        const v = view(), bar = box.querySelector('.fv-bar');
        if (!bar) return;
        const q = k => bar.querySelector(`[data-fv="${k}"]`);
        q('auto').textContent = v.auto ? '⏸ Автопрокрутка' : '▶ Автопрокрутка';
        q('auto').classList.toggle('is-on', v.auto);
        q('speed').textContent = SPEED[v.speed][0];
        q('speed').style.display = v.auto && !v.rows ? '' : 'none';
        q('auto').style.display = v.rows ? 'none' : '';
        q('rows').textContent = v.rows ? '↔ Лентой' : '▦ Рядами';
        q('order').value = v.order;
        q('shuffle').style.display = v.order === 'random' ? '' : 'none';
    }
    function save2() { try { persistData(); } catch (_) {} }

    function onClick(e) {
        const b = e.target.closest('[data-fv]'); if (!b || b.tagName === 'SELECT') return;
        const v = view();
        switch (b.dataset.fv) {
            case 'auto': v.auto = !v.auto; break;
            case 'speed': v.speed = (v.speed + 1) % SPEED.length; break;
            case 'rows': v.rows = !v.rows; break;
            case 'shuffle': seed = Math.random(); decorateNow(); return;
        }
        save2(); decorateNow(); e.stopPropagation();
    }
    function decorateNow() {
        const sc = box.querySelector('.mh-fav-scroll'); if (!sc) return;
        sortTiles(sc); paintBar();
        box.classList.toggle('fv-rows', view().rows);
        if (obs) obs.takeRecords();
    }

    /* ---------- движение туда-обратно ---------- */
    function tick(ts) {
        raf = requestAnimationFrame(tick);
        const dt = Math.min(0.1, (ts - (last || ts)) / 1000); last = ts;
        const v = view();
        const sc = box && box.querySelector('.mh-fav-scroll');
        if (!sc || box.hidden || !v.auto || v.rows || hover || document.hidden || !box.offsetParent) return;
        const max = sc.scrollWidth - sc.clientWidth;
        if (max <= 4) return;
        if (Math.abs(sc.scrollLeft - lastSet) > 2) { pos = sc.scrollLeft; holdUntil = ts + 2500; }   // пользователь листает сам — не мешаем
        if (ts < holdUntil) return;
        pos += dir * SPEED[v.speed][1] * dt;
        if (pos >= max) { pos = max; dir = -1; holdUntil = ts + 1200; }
        else if (pos <= 0) { pos = 0; dir = 1; holdUntil = ts + 1200; }
        sc.scrollLeft = pos; lastSet = sc.scrollLeft;
    }

    function attach() {
        box = $('mh-fav-row');
        if (!box || box._fv) return !!box;
        box._fv = true;
        box.addEventListener('click', onClick, true);
        box.addEventListener('change', e => { const s = e.target.closest('select[data-fv="order"]'); if (!s) return; view().order = s.value; save2(); decorateNow(); });
        box.addEventListener('mouseenter', () => { hover = true; });
        box.addEventListener('mouseleave', () => { hover = false; holdUntil = performance.now() + 800; });
        box.addEventListener('touchstart', () => { holdUntil = performance.now() + 3500; }, { passive: true });
        box.addEventListener('wheel', () => { holdUntil = performance.now() + 2500; }, { passive: true });
        obs = new MutationObserver(() => { obs.disconnect(); decorate(); obs.observe(box, { childList: true }); });
        obs.observe(box, { childList: true });
        decorate();
        if (!raf) raf = requestAnimationFrame(tick);
        return true;
    }

    function init() {
        if (attach()) return;
        let tries = 0;
        const iv = setInterval(() => { if (attach() || ++tries > 40) clearInterval(iv); }, 500);
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
    document.addEventListener('mirvel-ready', () => setTimeout(init, 0), { once: true });
})();
