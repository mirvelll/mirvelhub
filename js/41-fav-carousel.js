/* =========================================================
   MIRVEL HUB — 41-fav-carousel.js (подключается после 40-games-extras.js)
   «⭐ Любимое» на главной:
   • лента бесконечно плавно едет вправо по кругу (без обрыва: карточки зациклены)
   • останавливается, пока наводишь мышь / трогаешь / листаешь сам, потом продолжает
   • автопрокрутку можно выключить — тогда появляются стрелки ◀ ▶ и полоса прокрутки
   • раздел: Всё · 🎵 Музыка · 🎮 Игры · 🛍 Вещи
   • порядок: как добавлено · 🎲 случайно · А–Я · по разделам · новые сверху
   • «▦ Рядами» — показать всё сеткой без ленты
   • версии одной игры (Steam + Epic …) сворачиваются в одну карточку с подписью «Steam · Epic Games»;
     показывается обложка ⭐ главной версии (её выбирают в блоке «Версии игры»)
   Настройки: data.favView (необязательное поле, попадает в бэкап).
   ========================================================= */
(() => {
    'use strict';
    const $ = id => document.getElementById(id);
    const DEF = { auto: true, rows: false, speed: 1, order: 'default', kind: 'all' };
    const view = () => (data.favView = { ...DEF, ...(data.favView || {}) });
    const SPEED = [['🐢', 24], ['🚶', 45], ['🐇', 85]];
    const ORDERS = [['default', 'Как добавлено'], ['random', '🎲 Случайно'], ['title', 'А–Я'], ['type', 'По разделам'], ['recent', 'Новые сверху']];
    const KINDS = [['all', 'Всё', null], ['music', '🎵 Музыка', ['cds', 'vinyls']], ['games', '🎮 Игры', ['games']], ['stuff', '🛍 Вещи', ['stuff']]];
    let seed = Math.random();
    let box = null, obs = null, raf = 0;
    let pos = 0, holdUntil = 0, lastSet = 0, last = 0, curSc = null;

    const css = document.createElement('style');
    css.textContent = `
    .fv-bar{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin:-4px 0 10px}
    .fv-sep{width:1px;height:18px;background:rgba(255,255,255,.12);margin:0 4px}
    .fv-b{padding:5px 11px;border-radius:999px;font-size:11px;font-weight:800;color:#9ca3af;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);cursor:pointer;transition:all .2s}
    .fv-b:hover{color:#fff}.fv-b.is-on{color:#fff;border-color:var(--theme-btn,#8b5cf6);background:rgba(139,92,246,.2)}
    .fv-sel{padding:5px 8px;border-radius:999px;font-size:11px;font-weight:800;color:#d1d5db;background:#0d0d14;border:1px solid rgba(255,255,255,.1)}
    #mh-fav-row.fv-rows .mh-fav-scroll{flex-wrap:wrap;overflow:visible;justify-content:flex-start}
    #mh-fav-row[data-auto="1"]:not(.fv-rows) .mh-fav-scroll{scrollbar-width:none;mask-image:linear-gradient(90deg,transparent,#000 24px,#000 calc(100% - 24px),transparent);-webkit-mask-image:linear-gradient(90deg,transparent,#000 24px,#000 calc(100% - 24px),transparent)}
    #mh-fav-row[data-auto="1"]:not(.fv-rows) .mh-fav-scroll::-webkit-scrollbar{display:none}
    #mh-fav-row[data-auto="0"]:not(.fv-rows) .mh-fav-scroll{scrollbar-width:thin;padding-bottom:.9rem}
    .mh-fav-tile .fv-ver{display:block;font-size:.62rem;color:var(--theme-btn,#a78bfa);font-weight:800;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    `;
    document.head.appendChild(css);

    const save2 = () => { try { persistData(); } catch (_) {} };
    const quiet = fn => { if (obs) obs.disconnect(); try { fn(); } finally { if (obs && box) obs.observe(box, { childList: true }); } };
    function rnd(n) { const x = Math.sin(n * 9301 + seed * 49297) * 233280; return x - Math.floor(x); }
    const itemOf = t => (data[t.dataset.fk] || []).find(x => x.id === Number(t.dataset.fid));

    /* ---------- версии одной игры → одна карточка ---------- */
    function mergeVersions(sc) {
        const tiles = [...sc.querySelectorAll('.mh-fav-tile[data-fk="games"]:not(.fv-clone)')];
        if (tiles.length < 1 || !window.mhGameSiblings) return;
        const byId = new Map(tiles.map(t => [Number(t.dataset.fid), t]));
        const seen = new Set();
        tiles.forEach(t => {
            const id = Number(t.dataset.fid);
            if (seen.has(id)) return;
            const g = itemOf(t); if (!g) return;
            const members = [g, ...window.mhGameSiblings(g)].filter(x => byId.has(x.id));
            members.forEach(m => seen.add(m.id));
            const prim = window.mhGamePrimary ? window.mhGamePrimary(g) : null;
            const rep = members.find(m => prim && m.id === prim.id) || members[0];
            const plats = [...new Set(members.map(m => m.platform).filter(Boolean))];
            const repTile = byId.get(rep.id);
            const small = repTile.querySelector('small');
            if (small && plats.length) small.innerHTML = plats.length > 1 ? `<span class="fv-ver">${plats.map(esc).join(' · ')}</span>` : esc(plats[0]);
            members.forEach(m => { if (m.id !== rep.id) byId.get(m.id).remove(); });
        });
    }
    function sortTiles(sc) {
        const o = view().order;
        const arr = [...sc.querySelectorAll('.mh-fav-tile:not(.fv-clone)')].map((t, idx) => { const it = itemOf(t) || {}; return { t, idx, k: t.dataset.fk, id: Number(t.dataset.fid), title: String(it.title || '') }; });
        if (o === 'random') arr.sort((a, b) => rnd(a.id + a.idx) - rnd(b.id + b.idx));
        else if (o === 'title') arr.sort((a, b) => a.title.localeCompare(b.title, 'ru'));
        else if (o === 'type') arr.sort((a, b) => a.k.localeCompare(b.k) || a.title.localeCompare(b.title, 'ru'));
        else if (o === 'recent') arr.sort((a, b) => b.id - a.id);
        else return;
        arr.forEach(x => sc.appendChild(x.t));
    }
    function applyKind(sc) {
        const k = KINDS.find(x => x[0] === view().kind) || KINDS[0];
        sc.querySelectorAll('.mh-fav-tile:not(.fv-clone)').forEach(t => { t.style.display = !k[2] || k[2].includes(t.dataset.fk) ? '' : 'none'; });
    }
    const realTiles = sc => [...sc.querySelectorAll('.mh-fav-tile:not(.fv-clone)')].filter(t => t.style.display !== 'none');

    /* ---------- зацикливание: копии карточек в конце ленты ---------- */
    function dropClones(sc) { sc.querySelectorAll('.fv-clone').forEach(c => c.remove()); sc._fvc = false; sc._fvp = 0; }
    function ensureClones(sc) {
        if (sc._fvc && (sc._fvp === 0 || sc.querySelector('.fv-clone'))) return true;
        const v = view();
        if (!v.auto || v.rows || !sc.clientWidth) return false;
        const tiles = realTiles(sc);
        if (!tiles.length) return false;
        const lastT = tiles[tiles.length - 1];
        const content = lastT.offsetLeft + lastT.offsetWidth - tiles[0].offsetLeft;
        if (content <= sc.clientWidth + 8) { sc._fvc = true; sc._fvp = 0; return true; }   // всё и так помещается — крутить нечего
        const copies = Math.ceil(sc.clientWidth / content) + 1;
        quiet(() => {
            sc.querySelectorAll('.fv-clone').forEach(c => c.remove());
            for (let c = 0; c < copies; c++) tiles.forEach(t => { const n = t.cloneNode(true); n.classList.add('fv-clone'); n.setAttribute('aria-hidden', 'true'); n.tabIndex = -1; sc.appendChild(n); });
        });
        const first = sc.querySelector('.fv-clone');
        sc._fvp = first ? first.offsetLeft - tiles[0].offsetLeft : 0;
        sc._fvc = true;
        return true;
    }

    /* ---------- панель ---------- */
    function counts() {
        const all = [...box.querySelectorAll('.mh-fav-tile:not(.fv-clone)')];
        return k => !k[2] ? all.length : all.filter(t => k[2].includes(t.dataset.fk)).length;
    }
    function buildBar(sc) {
        if (box.querySelector('.fv-bar')) return;
        const bar = document.createElement('div');
        bar.className = 'fv-bar';
        bar.innerHTML = `<span data-fv-kinds class="contents"></span><span class="fv-sep"></span>
            <button type="button" class="fv-b" data-fv="auto" title="Бесконечная автопрокрутка"></button>
            <button type="button" class="fv-b" data-fv="speed" title="Скорость"></button>
            <button type="button" class="fv-b" data-fv="prev" title="Назад">◀</button>
            <button type="button" class="fv-b" data-fv="next" title="Вперёд">▶</button>
            <button type="button" class="fv-b" data-fv="rows"></button>
            <select class="fv-sel" data-fv="order" aria-label="Порядок">${ORDERS.map(([k, l]) => `<option value="${k}">${l}</option>`).join('')}</select>
            <button type="button" class="fv-b" data-fv="shuffle" title="Перемешать">🎲</button>`;
        sc.insertAdjacentElement('beforebegin', bar);
    }
    function paintBar() {
        const v = view(), bar = box.querySelector('.fv-bar'); if (!bar) return;
        const q = k => bar.querySelector(`[data-fv="${k}"]`);
        const cnt = counts();
        bar.querySelector('[data-fv-kinds]').innerHTML = KINDS.filter(k => k[0] === 'all' || cnt(k) > 0).map(k => `<button type="button" class="fv-b${v.kind === k[0] ? ' is-on' : ''}" data-fv="kind" data-v="${k[0]}">${k[1]} <small>${cnt(k)}</small></button>`).join('');
        q('auto').textContent = v.auto ? '⏸ Автопрокрутка' : '▶ Автопрокрутка';
        q('auto').classList.toggle('is-on', v.auto);
        q('auto').style.display = v.rows ? 'none' : '';
        q('speed').style.display = v.auto && !v.rows ? '' : 'none';
        q('speed').textContent = SPEED[v.speed][0];
        q('prev').style.display = q('next').style.display = !v.auto && !v.rows ? '' : 'none';
        q('rows').textContent = v.rows ? '↔ Лентой' : '▦ Рядами';
        q('order').value = v.order;
        q('shuffle').style.display = v.order === 'random' ? '' : 'none';
        box.dataset.auto = v.auto ? '1' : '0';
        box.classList.toggle('fv-rows', v.rows);
    }
    function decorate() {
        if (!box || box.hidden) return;
        const sc = box.querySelector('.mh-fav-scroll'); if (!sc) return;
        quiet(() => {
            sc._fvc = false; sc._fvp = 0;
            mergeVersions(sc);
            sortTiles(sc);
            applyKind(sc);
            buildBar(sc);
            paintBar();
        });
        if (view().rows) sc.scrollLeft = 0;
    }
    function redo() {                   // после смены настройки
        const sc = box.querySelector('.mh-fav-scroll'); if (!sc) return;
        quiet(() => { dropClones(sc); sortTiles(sc); applyKind(sc); paintBar(); });
        pos = 0; sc.scrollLeft = 0; lastSet = 0; holdUntil = 0; curSc = sc;   // тумблер действует сразу: без паузы и без ожидания прокрутки
    }

    function onClick(e) {
        const b = e.target.closest('[data-fv]'); if (!b || b.tagName === 'SELECT') return;
        const v = view(), sc = box.querySelector('.mh-fav-scroll');
        e.stopPropagation();
        switch (b.dataset.fv) {
            case 'kind': v.kind = b.dataset.v; break;
            case 'auto': v.auto = !v.auto; break;
            case 'speed': v.speed = (v.speed + 1) % SPEED.length; break;
            case 'rows': v.rows = !v.rows; break;
            case 'shuffle': seed = Math.random(); break;
            case 'prev': sc.scrollBy({ left: -sc.clientWidth * .8, behavior: 'smooth' }); return;
            case 'next': sc.scrollBy({ left: sc.clientWidth * .8, behavior: 'smooth' }); return;
        }
        save2(); redo();
    }

    /* ---------- движение ---------- */
    function tick(ts) {
        raf = requestAnimationFrame(tick);
        const dt = Math.min(0.1, Math.max(0, (ts - (last || ts)) / 1000)); last = ts;
        const v = view();
        const sc = box && box.querySelector('.mh-fav-scroll');
        if (!sc || box.hidden || !v.auto || v.rows || document.hidden || !box.offsetParent) return;
        if (sc !== curSc) { curSc = sc; lastSet = -1; }        // блок перерисовался — возвращаем ленту туда, где она была
        if (!ensureClones(sc) || !sc._fvp) return;
        const period = sc._fvp;
        if (lastSet < 0) { sc.scrollLeft = pos; lastSet = sc.scrollLeft; }
        if (Math.abs(sc.scrollLeft - lastSet) > 3) { pos = sc.scrollLeft; holdUntil = ts + 2500; }   // листаешь сам — не мешаем
        if (ts < holdUntil || sc.matches(':hover')) return;
        pos += SPEED[v.speed][1] * dt;
        if (pos >= period) pos -= period;
        sc.scrollLeft = pos;
        lastSet = sc.scrollLeft;
        if (Math.abs(lastSet - pos) > 2) pos = lastSet;   // браузер не принял значение — синхронизируемся
    }

    function attach() {
        box = $('mh-fav-row');
        if (!box) return false;
        if (box._fv) return true;
        box._fv = true;
        box.addEventListener('click', onClick, true);
        box.addEventListener('change', e => { const s = e.target.closest('select[data-fv="order"]'); if (!s) return; view().order = s.value; save2(); redo(); });
        const hold = ms => e => { if (e.target.closest && e.target.closest('.fv-bar')) return; holdUntil = performance.now() + ms; };
        box.addEventListener('touchstart', hold(3500), { passive: true });
        box.addEventListener('wheel', hold(2500), { passive: true });
        box.addEventListener('pointerdown', e => { if (!e.target.closest('.fv-bar')) holdUntil = performance.now() + 2500; }, { passive: true });
        document.addEventListener('visibilitychange', () => { last = 0; holdUntil = performance.now() + 300; lastSet = -1; });
        obs = new MutationObserver(() => decorate());
        obs.observe(box, { childList: true });
        decorate();
        if (!raf) raf = requestAnimationFrame(tick);
        return true;
    }
    function init() {
        if (attach()) return;
        let tries = 0;
        const iv = setInterval(() => { if (attach() || ++tries > 60) clearInterval(iv); }, 500);
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
    document.addEventListener('mirvel-ready', () => setTimeout(init, 0), { once: true });
})();
