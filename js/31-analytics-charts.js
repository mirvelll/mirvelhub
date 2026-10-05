/* =========================================================
   MIRVEL HUB — 31-analytics-charts.js (подключать после 30-collection-ui.js)
   Страница «Статистика»:
   1) три новых графика: кольцо «по форматам», линия «траты по месяцам», календарь «когда покупал»
   2) все блоки страницы собраны в одну доску; их можно двигать (кнопка «Перемещать блоки»)
      с плавной анимацией, порядок запоминается: data.pageView.analytics.order
   3) шестерёнка «Настройки» (создаётся в 30-collection-ui.js) прячет ненужные блоки
   Дата покупки берётся из id (момент добавления в хаб). Старые данные не затрагиваются.
   ========================================================= */
(() => {
    'use strict';
    const $ = id => document.getElementById(id);
    const E = s => (typeof esc === 'function' ? esc(s) : String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));
    const reduce = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    const toast = (m, t) => { try { showToast(m, t); } catch (_) {} };
    const persist = () => { try { persistData(); } catch (_) {} };

    const KINDS = [
        { key: 'cds',    label: '💿 CD',    color: '#a855f7' },
        { key: 'vinyls', label: '💽 Винил', color: '#22d3ee' },
        { key: 'games',  label: '🎮 Игры',  color: '#fbbf24' },
        { key: 'stuff',  label: '📦 Вещи',  color: '#34d399' }
    ];
    const MONTHS = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
    const DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
    const money = n => Math.round(n).toLocaleString('ru-RU') + ' ₴';

    let range = 12;   // 6 | 12 | 0 (всё время)

    /* ---------- стили ---------- */
    const css = document.createElement('style');
    css.textContent = `
    /* графики */
    .ac-note{font-size:11px;color:#6b7280;margin-top:4px}
    .ac-head{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px}
    .ac-donut{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:18px}
    .ac-donut svg{width:150px;height:150px;flex:none}
    .ac-leg{display:flex;flex-direction:column;gap:8px;min-width:140px;flex:1}
    .ac-leg div{display:flex;align-items:center;gap:8px;font-size:12px;color:#d1d5db}
    .ac-leg i{width:10px;height:10px;border-radius:50%;flex:none}
    .ac-leg b{margin-left:auto;font-family:ui-monospace,monospace;color:#fff}
    .ac-leg small{color:#6b7280;font-family:ui-monospace,monospace}
    .ac-seg{cursor:default;transition:opacity .2s}
    .ac-seg:hover{opacity:.75}
    .ac-btns{display:flex;gap:6px}
    .ac-btn{padding:4px 12px;border-radius:999px;font-size:12px;font-weight:700;color:#9ca3af;cursor:pointer;
        background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);transition:background-color .2s,color .2s,border-color .2s}
    .ac-btn:hover{color:#fff;background:rgba(255,255,255,.09)}
    .ac-btn.is-on{color:#fff;border-color:rgba(var(--theme-rgb),.8);background:rgba(var(--theme-rgb),.25)}
    .ac-line{width:100%;height:auto;display:block;overflow:visible}
    .ac-line .dot{cursor:default;transition:r .15s}
    .ac-line .dot:hover{r:6}
    .ac-readout{min-height:20px;font-size:12px;color:#9ca3af;margin-top:6px}
    .ac-readout b{color:#fff}
    .ac-scroll{overflow-x:auto;padding-bottom:6px}
    .ac-heat{display:block;min-width:640px;width:100%;height:auto}
    .ac-cell{cursor:default}
    .ac-cell:hover{stroke:#fff;stroke-width:1}
    .ac-lbl{fill:#6b7280;font-size:9px;font-family:ui-monospace,monospace}
    .ac-empty{padding:34px 10px;text-align:center;font-size:12px;font-style:italic;color:#6b7280}

    /* заголовок страницы с кнопками справа */
    .an-head{display:flex;flex-wrap:wrap;align-items:flex-start;justify-content:space-between;gap:12px}
    .an-tools{display:flex;align-items:center;gap:10px;margin-left:auto}
    .an-move{display:inline-flex;align-items:center;gap:8px;height:40px;padding:0 16px;border-radius:999px;font-size:12px;font-weight:800;color:#e5e7eb;cursor:pointer;
        background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);transition:background-color .2s,border-color .2s,color .2s}
    .an-move:hover{background:rgba(255,255,255,.12)}
    .an-move.is-on{color:#fff;border-color:rgba(var(--theme-rgb),.85);background:rgba(var(--theme-rgb),.3);box-shadow:0 0 18px rgba(var(--theme-rgb),.3)}

    /* доска блоков */
    #an-board{position:relative;display:grid;grid-template-columns:repeat(6,minmax(0,1fr));grid-auto-flow:row dense;gap:1.5rem}
    #an-board > .an-card{grid-column:span var(--an-span,3);position:relative;min-width:0;margin:0!important}
    @media (max-width:1023px){#an-board{grid-template-columns:minmax(0,1fr)}#an-board > .an-card{grid-column:auto}}
    .an-handle{display:none;position:absolute;top:10px;right:12px;z-index:6;width:30px;height:30px;border-radius:10px;align-items:center;justify-content:center;font-size:15px;color:#fff;
        background:rgba(0,0,0,.6);border:1px solid rgba(255,255,255,.22);cursor:grab;touch-action:none;user-select:none}
    #an-board.an-edit .an-handle{display:flex}

    /* режим перемещения */
    #an-board.an-edit > .an-card{cursor:grab;user-select:none;-webkit-user-select:none;outline:2px dashed rgba(var(--theme-rgb),.5);outline-offset:-2px;animation:an-wig 1s ease-in-out infinite}
    #an-board.an-edit > .an-card:nth-child(even){animation-delay:-.5s;animation-direction:reverse}
    #an-board.an-edit > .an-card:focus-visible{outline:2px solid #22d3ee}
    #an-board.an-edit > .an-card > *:not(.an-handle){pointer-events:none}
    @keyframes an-wig{0%,100%{transform:rotate(-.35deg)}50%{transform:rotate(.35deg)}}
    #an-board > .an-card.an-drag{z-index:60;cursor:grabbing;animation:none!important;transition:none!important;transform-origin:0 0;outline:2px solid rgba(var(--theme-rgb),.9);
        box-shadow:0 34px 70px rgba(0,0,0,.6),0 0 40px rgba(var(--theme-rgb),.35);will-change:transform}
    #an-board > .an-card.an-drop{z-index:60}
    .an-ghost{position:absolute;left:0;top:0;pointer-events:none;border-radius:1.5rem;border:2px dashed rgba(var(--theme-rgb),.75);background:rgba(var(--theme-rgb),.1);opacity:0;z-index:0}
    .an-ghost.is-ready{opacity:1;transition:left .38s cubic-bezier(.2,.8,.2,1),top .38s cubic-bezier(.2,.8,.2,1),width .38s cubic-bezier(.2,.8,.2,1),height .38s cubic-bezier(.2,.8,.2,1),opacity .2s}
    .an-ghost.is-out{opacity:0;transition:opacity .25s}
    @media (prefers-reduced-motion:reduce){#an-board.an-edit > .an-card{animation:none}.an-ghost.is-ready{transition:none}}
    `;
    document.head.appendChild(css);

    /* ---------- данные ---------- */
    // Все предметы с датой (дата = момент создания id). Подозрительные id (не похожие на дату) пропускаются.
    function collect() {
        const now = Date.now(), min = new Date(2000, 0, 1).getTime(), max = now + 86400000;
        const out = [];
        KINDS.forEach(k => (data[k.key] || []).forEach(it => {
            const id = Number(it && it.id);
            const price = Number(it && it.price) || 0;
            out.push({ kind: k.key, price, ts: (id >= min && id <= max) ? id : null });
        }));
        return out;
    }
    const monthKey = d => d.getFullYear() * 12 + d.getMonth();

    /* ---------- блоки доски ---------- */
    const mk = html => { const d = document.createElement('div'); d.className = 'glass p-6 rounded-3xl'; d.innerHTML = html; return d; };
    // span — ширина в шестых долях (6 = вся строка)
    const CARDS = [
        { k: 'budget',    t: 'Бюджет по категориям',        span: 4, find: () => $('analytics-categories') },
        { k: 'media',     t: 'Соотношение CD и винила',     span: 2, find: () => $('analytics-total-music') },
        { k: 'donut',     t: 'Кольцо «по форматам»',        span: 2, make: () => mk(`<h3 class="text-lg font-black text-white mb-4">🍩 По форматам</h3><div id="ac-donut" class="ac-donut"></div>`) },
        { k: 'spend',     t: 'Траты по месяцам',            span: 4, make: () => mk(`
            <div class="ac-head">
                <div><h3 class="text-lg font-black text-white">📈 Траты по месяцам</h3><p class="ac-note">Дата берётся из момента добавления предмета в хаб.</p></div>
                <div class="ac-btns" id="ac-range">
                    <button type="button" class="ac-btn" data-r="6">6 мес.</button>
                    <button type="button" class="ac-btn" data-r="12">12 мес.</button>
                    <button type="button" class="ac-btn" data-r="0">Всё время</button>
                </div>
            </div>
            <div id="ac-line" class="mt-4"></div><div id="ac-readout" class="ac-readout"></div>`) },
        { k: 'heat',      t: 'Календарь «когда покупал»',   span: 6, make: () => mk(`
            <h3 class="text-lg font-black text-white">🔥 Когда я покупал</h3>
            <p class="ac-note mb-3">Каждая клетка — один день за последний год. Чем ярче, тем больше предметов добавлено.</p>
            <div id="ac-heat" class="ac-scroll"></div>`) },
        { k: 'epochs',    t: 'Музыкальные эпохи',           span: 4, find: () => $('analytics-decades-chart') },
        { k: 'volume',    t: 'Физический объём полок',      span: 2, find: () => $('shelf-width-est') },
        { k: 'expensive', t: 'Самые дорогие приобретения',  span: 3, find: () => $('analytics-top-expensive') },
        { k: 'played',    t: 'Топ прослушиваний',           span: 3, find: () => $('analytics-top-played') }
    ];
    window.mhAnalyticsBlocks = () => CARDS.filter(c => c.el).map(c => ({ k: c.k, t: c.t, el: c.el }));

    const view = () => {
        if (!data.pageView || typeof data.pageView !== 'object') data.pageView = {};
        const o = data.pageView.analytics || (data.pageView.analytics = {});
        if (!o.hide || typeof o.hide !== 'object') o.hide = {};
        return o;
    };
    let board = null, moveBtn = null, edit = false, drag = null;
    const cardsInDom = () => [...board.children].filter(el => el.classList.contains('an-card') && !el.hasAttribute('data-mh-hidden'));

    function applyHidden() {
        const hide = (data.pageView && data.pageView.analytics && data.pageView.analytics.hide) || {};
        CARDS.forEach(c => { if (c.el) c.el.toggleAttribute('data-mh-hidden', !!hide[c.k]); });
    }
    function applyOrder() {
        const saved = Array.isArray(view().order) ? view().order : [];
        const known = CARDS.filter(c => c.el).map(c => c.k);
        const seq = [...saved.filter(k => known.includes(k)), ...known.filter(k => !saved.includes(k))];
        seq.forEach(k => board.appendChild(CARDS.find(c => c.k === k).el));
    }
    function saveOrder() {
        view().order = [...board.children].filter(el => el.classList.contains('an-card')).map(el => el.dataset.an);
        persist();
    }

    /* ---------- сборка страницы ---------- */
    function buildBoard() {
        if ($('an-board')) return true;
        const page = $('analytics');
        const head = page && page.firstElementChild;
        if (!head) return false;

        board = document.createElement('div');
        board.id = 'an-board';
        const parents = new Set();
        CARDS.forEach(c => {
            let el = null;
            if (c.find) {
                const inner = c.find();
                el = inner && inner.closest('.glass');
                if (!el) return;
                if (el.parentElement) parents.add(el.parentElement);
            } else el = c.make();
            el.classList.add('an-card');
            el.dataset.an = c.k;
            el.style.setProperty('--an-span', c.span);
            const h = document.createElement('span');
            h.className = 'an-handle'; h.setAttribute('aria-hidden', 'true'); h.textContent = '⠿';
            el.appendChild(h);
            c.el = el;
            board.appendChild(el);
        });
        parents.forEach(p => { if (p !== page && p !== board && !p.querySelector(':scope > .glass')) p.remove(); });

        // шапка: заголовок слева, кнопки справа
        head.classList.add('an-head');
        const title = document.createElement('div');
        while (head.firstChild) title.appendChild(head.firstChild);
        head.appendChild(title);
        const tools = document.createElement('div');
        tools.className = 'an-tools';
        moveBtn = document.createElement('button');
        moveBtn.type = 'button'; moveBtn.className = 'an-move';
        moveBtn.addEventListener('click', () => setEdit(!edit));
        tools.appendChild(moveBtn);
        head.appendChild(tools);
        const gear = $('mh-cfg-btn-analytics');       // шестерёнку создал 30-collection-ui.js
        if (gear) tools.appendChild(gear);
        syncMoveBtn();

        (($('mh-panel-analytics')) || head).insertAdjacentElement('afterend', board);
        applyOrder();
        applyHidden();

        // кнопка «Сбросить порядок» в панели настроек
        const panelBtns = document.querySelector('#mh-panel-analytics .mgp-btns');
        if (panelBtns && !$('an-reset-order')) {
            const r = document.createElement('button');
            r.type = 'button'; r.id = 'an-reset-order'; r.className = 'mh-btn'; r.textContent = '↺ Сбросить порядок';
            r.addEventListener('click', () => {
                delete view().order;
                applyOrder(); persist();
                toast('Порядок блоков сброшен');
            });
            panelBtns.appendChild(r);
        }
        // «Показать всё» и галочки из панели настроек — применить скрытие
        const panel = $('mh-panel-analytics');
        if (panel) {
            panel.addEventListener('click', () => setTimeout(applyHidden, 0));
            panel.addEventListener('change', () => setTimeout(applyHidden, 0));
        }

        const rg = $('ac-range');
        if (rg) rg.addEventListener('click', e => {
            const b = e.target.closest('.ac-btn');
            if (!b) return;
            range = Number(b.dataset.r);
            drawLine(collect());
        });
        initDrag();
        return true;
    }

    /* =====================================================
       Перетаскивание блоков
       ===================================================== */
    function syncMoveBtn() {
        if (!moveBtn) return;
        moveBtn.classList.toggle('is-on', edit);
        moveBtn.setAttribute('aria-pressed', String(edit));
        moveBtn.innerHTML = edit ? '✓ Готово' : '<span aria-hidden="true">↕</span> Перемещать блоки';
    }
    function setEdit(on) {
        if (!board) return;
        edit = !!on;
        board.classList.toggle('an-edit', edit);
        board.querySelectorAll(':scope > .an-card').forEach(c => { if (edit) c.setAttribute('tabindex', '0'); else c.removeAttribute('tabindex'); });
        syncMoveBtn();
        if (edit) toast('Тяни блоки мышью (на телефоне за значок ⠿). Стрелки на клавиатуре тоже работают', 'info');
        else toast('Порядок сохранён ✨', 'success');
    }

    // «перелёт» остальных блоков на новые места (FLIP)
    function swapWith(card, target) {
        const kids = cardsInDom();
        const others = kids.filter(c => c !== card);
        const first = new Map(others.map(c => [c, c.getBoundingClientRect()]));
        others.forEach(c => c.getAnimations().forEach(a => { if (!('animationName' in a)) a.cancel(); }));
        if (kids.indexOf(card) < kids.indexOf(target)) target.after(card); else target.before(card);
        if (reduce()) return;
        others.forEach(c => {
            const f = first.get(c), l = c.getBoundingClientRect();
            const dx = f.left - l.left, dy = f.top - l.top;
            const sx = l.width ? f.width / l.width : 1, sy = l.height ? f.height / l.height : 1;
            if (Math.abs(dx) < 1 && Math.abs(dy) < 1 && Math.abs(sx - 1) < 0.01 && Math.abs(sy - 1) < 0.01) return;
            c.animate(
                [{ transformOrigin: '0 0', transform: `translate(${dx}px,${dy}px) scale(${sx},${sy})` }, { transformOrigin: '0 0', transform: 'none' }],
                { duration: 380, easing: 'cubic-bezier(.2,.8,.2,1)' });
        });
    }

    function place() {
        const d = drag, c = d.card;
        c.style.transform = 'none';
        const r = c.getBoundingClientRect();
        d.tf = `translate(${d.x - d.offX - r.left}px,${d.y - d.offY - r.top}px) scale(1.02) rotate(-.6deg)`;
        c.style.transform = d.tf;
        if (d.ghost) {
            const b = board.getBoundingClientRect();
            const key = [r.left - b.left, r.top - b.top, r.width, r.height].map(Math.round).join();
            if (key !== d.ghKey) {
                d.ghKey = key;
                Object.assign(d.ghost.style, { left: (r.left - b.left) + 'px', top: (r.top - b.top) + 'px', width: r.width + 'px', height: r.height + 'px' });
            }
        }
    }
    function check() {
        const d = drag, now = performance.now();
        if (now - d.last < 160) return;
        const t = cardsInDom().find(c => {
            if (c === d.card) return false;
            const r = c.getBoundingClientRect(), px = r.width * 0.18, py = r.height * 0.18;
            return d.x > r.left + px && d.x < r.right - px && d.y > r.top + py && d.y < r.bottom - py;
        });
        if (!t) return;
        d.last = now;
        swapWith(d.card, t);
    }
    function tick() {
        if (!drag || !drag.on) return;
        const sc = $('main');
        const scrolls = sc && sc.scrollHeight > sc.clientHeight + 2;
        const sr = scrolls ? sc.getBoundingClientRect() : { top: 0, bottom: window.innerHeight };
        const edge = 70;
        let v = 0;
        if (drag.y < sr.top + edge) v = -(1 - Math.max(0, drag.y - sr.top) / edge) * 18;
        else if (drag.y > sr.bottom - edge) v = (1 - Math.max(0, sr.bottom - drag.y) / edge) * 18;
        if (v) { if (scrolls) sc.scrollTop += v; else window.scrollBy(0, v); }
        place();
        check();
        drag.raf = requestAnimationFrame(tick);
    }
    function begin() {
        const d = drag;
        d.on = true;
        d.card.classList.add('an-drag');
        board.classList.add('an-dragging');
        d.ghost = document.createElement('div');
        d.ghost.className = 'an-ghost';
        board.appendChild(d.ghost);
        place();
        requestAnimationFrame(() => d.ghost && d.ghost.classList.add('is-ready'));
        d.raf = requestAnimationFrame(tick);
    }
    function onMove(e) {
        if (!drag || e.pointerId !== drag.pid) return;
        drag.x = e.clientX; drag.y = e.clientY;
        if (!drag.on && Math.hypot(drag.x - drag.sx, drag.y - drag.sy) > 5) begin();
    }
    function onUp(e) {
        if (!drag || e.pointerId !== drag.pid) return;
        const d = drag, card = d.card;
        card.removeEventListener('pointermove', onMove);
        card.removeEventListener('pointerup', onUp);
        card.removeEventListener('pointercancel', onUp);
        try { card.releasePointerCapture(d.pid); } catch (_) {}
        drag = null;
        if (!d.on) return;
        cancelAnimationFrame(d.raf);
        const from = card.style.transform || 'none';
        card.classList.remove('an-drag');
        card.style.transform = '';
        board.classList.remove('an-dragging');
        if (d.ghost) { d.ghost.classList.add('is-out'); setTimeout(() => d.ghost.remove(), 260); }
        if (reduce()) saveOrder();
        else {
            card.classList.add('an-drop');
            const a = card.animate(
                [{ transformOrigin: '0 0', transform: from }, { transformOrigin: '0 0', transform: 'none' }],
                { duration: 380, easing: 'cubic-bezier(.2,.8,.2,1)' });
            a.onfinish = a.oncancel = () => card.classList.remove('an-drop');
            saveOrder();
        }
    }
    function initDrag() {
        board.addEventListener('pointerdown', e => {
            if (!edit || drag || e.button > 0) return;
            const card = e.target.closest('.an-card');
            if (!card || card.parentElement !== board) return;
            if (e.pointerType === 'touch' && !e.target.closest('.an-handle')) return;   // на телефоне тянем только за ⠿, чтобы страница листалась
            const r = card.getBoundingClientRect();
            drag = { card, pid: e.pointerId, x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, offX: e.clientX - r.left, offY: e.clientY - r.top, on: false, last: 0, raf: 0, ghost: null, ghKey: '', tf: '' };
            try { card.setPointerCapture(e.pointerId); } catch (_) {}
            card.addEventListener('pointermove', onMove);
            card.addEventListener('pointerup', onUp);
            card.addEventListener('pointercancel', onUp);
            if (e.pointerType !== 'touch') e.preventDefault();
        });
        // с клавиатуры: стрелки двигают выбранный блок
        board.addEventListener('keydown', e => {
            if (!edit || !e.target.classList || !e.target.classList.contains('an-card')) return;
            const dir = { ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1 }[e.key];
            if (!dir) return;
            e.preventDefault();
            const kids = cardsInDom(), i = kids.indexOf(e.target), t = kids[i + dir];
            if (!t) return;
            swapWith(e.target, t);
            e.target.focus();
            saveOrder();
        });
        window.addEventListener('keydown', e => { if (e.key === 'Escape' && edit && !drag) setEdit(false); });
    }

    /* ---------- 1. кольцо ---------- */
    function drawDonut(items) {
        const box = $('ac-donut');
        if (!box) return;
        const rows = KINDS.map(k => {
            const list = items.filter(i => i.kind === k.key);
            return { ...k, n: list.length, sum: list.reduce((s, i) => s + i.price, 0) };
        });
        const total = rows.reduce((s, r) => s + r.n, 0);
        if (!total) { box.innerHTML = '<p class="ac-empty">Пока нет предметов в коллекции</p>'; return; }

        const R = 56, C = 2 * Math.PI * R;
        const active = rows.filter(r => r.n);
        let offset = 0;
        const segs = active.map(r => {
            const len = (r.n / total) * C, gap = active.length > 1 ? 2 : 0;
            const s = `<circle class="ac-seg" cx="75" cy="75" r="${R}" fill="none" stroke="${r.color}" stroke-width="18"
                stroke-dasharray="${Math.max(0, len - gap)} ${C}" stroke-dashoffset="${-offset}" transform="rotate(-90 75 75)">
                <title>${E(r.label)}: ${r.n} шт. (${Math.round(r.n / total * 100)}%)</title></circle>`;
            offset += len;
            return s;
        }).join('');

        box.innerHTML = `
        <svg viewBox="0 0 150 150" role="img" aria-label="Распределение по форматам">
            <circle cx="75" cy="75" r="${R}" fill="none" stroke="rgba(255,255,255,.06)" stroke-width="18"/>
            ${segs}
            <text x="75" y="73" text-anchor="middle" fill="#fff" font-size="26" font-weight="900">${total}</text>
            <text x="75" y="90" text-anchor="middle" fill="#6b7280" font-size="9" font-weight="700">ПРЕДМЕТОВ</text>
        </svg>
        <div class="ac-leg">${rows.map(r => `
            <div><i style="background:${r.color}"></i>${E(r.label)}<b>${r.n}</b><small>${money(r.sum)}</small></div>`).join('')}
        </div>`;
    }

    /* ---------- 2. линия трат ---------- */
    function drawLine(items) {
        const box = $('ac-line'), ro = $('ac-readout');
        if (!box) return;
        document.querySelectorAll('#ac-range .ac-btn').forEach(b => b.classList.toggle('is-on', Number(b.dataset.r) === range));
        if (ro) ro.innerHTML = '';

        const dated = items.filter(i => i.ts);
        if (!dated.length) { box.innerHTML = '<p class="ac-empty">Добавьте предметы с ценой, и здесь появится график трат</p>'; return; }

        const nowK = monthKey(new Date());
        let startK = range ? nowK - (range - 1) : Math.min(...dated.map(i => monthKey(new Date(i.ts))));
        if (!range && nowK - startK > 59) startK = nowK - 59;   // не больше 5 лет, чтобы график читался
        const n = nowK - startK + 1;
        const sums = new Array(n).fill(0), cnt = new Array(n).fill(0);
        dated.forEach(i => {
            const idx = monthKey(new Date(i.ts)) - startK;
            if (idx >= 0 && idx < n) { sums[idx] += i.price; cnt[idx]++; }
        });
        const labels = sums.map((_, i) => { const k = startK + i; return { m: MONTHS[k % 12], y: Math.floor(k / 12) }; });
        const maxV = Math.max(...sums, 1);

        const W = 640, H = 200, pl = 8, pr = 8, pt = 14, pb = 28;
        const iw = W - pl - pr, ih = H - pt - pb;
        const x = i => pl + (n === 1 ? iw / 2 : (i / (n - 1)) * iw);
        const y = v => pt + ih - (v / maxV) * ih;
        const pts = sums.map((v, i) => [x(i), y(v)]);
        const path = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
        const area = `${path} L${x(n - 1).toFixed(1)} ${pt + ih} L${x(0).toFixed(1)} ${pt + ih} Z`;
        const step = Math.max(1, Math.ceil(n / 12));

        const grid = [0, .5, 1].map(f => `<line x1="${pl}" x2="${W - pr}" y1="${pt + ih - f * ih}" y2="${pt + ih - f * ih}" stroke="rgba(255,255,255,.07)"/>`).join('');
        const ticks = labels.map((l, i) => (i % step === 0 || i === n - 1)
            ? `<text class="ac-lbl" x="${x(i)}" y="${H - 8}" text-anchor="middle">${l.m}${(l.m === 'янв' || i === 0) ? ' ' + String(l.y).slice(2) : ''}</text>` : '').join('');
        const dots = pts.map((p, i) => `<circle class="dot" cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="${sums[i] ? 4 : 2.5}"
            fill="${sums[i] ? '#fff' : 'rgba(255,255,255,.25)'}" stroke="var(--theme-btn,#8b5cf6)" stroke-width="2.5" data-i="${i}"><title>${labels[i].m} ${labels[i].y}: ${money(sums[i])}</title></circle>`).join('');

        box.innerHTML = `
        <svg class="ac-line" viewBox="0 0 ${W} ${H}" role="img" aria-label="Траты по месяцам">
            <defs><linearGradient id="ac-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stop-color="var(--theme-btn,#8b5cf6)" stop-opacity=".45"/>
                <stop offset="1" stop-color="var(--theme-btn,#8b5cf6)" stop-opacity="0"/></linearGradient></defs>
            ${grid}
            <path d="${area}" fill="url(#ac-grad)"/>
            <path d="${path}" fill="none" stroke="var(--theme-btn,#8b5cf6)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
            ${dots}${ticks}
        </svg>`;

        const total = sums.reduce((a, b) => a + b, 0), best = sums.indexOf(maxV);
        const def = () => {
            if (!ro) return;
            ro.innerHTML = total
                ? `За период: <b>${money(total)}</b> · пик: <b>${labels[best].m} ${labels[best].y}</b> (${money(maxV)})`
                : 'За этот период трат нет';
        };
        def();
        box.querySelectorAll('.dot').forEach(d => {
            const i = Number(d.dataset.i);
            d.addEventListener('mouseenter', () => { if (ro) ro.innerHTML = `<b>${labels[i].m} ${labels[i].y}</b>: ${money(sums[i])} · предметов: ${cnt[i]}`; });
            d.addEventListener('mouseleave', def);
        });
    }

    /* ---------- 3. тепловая карта ---------- */
    function drawHeat(items) {
        const box = $('ac-heat');
        if (!box) return;
        const dated = items.filter(i => i.ts);
        if (!dated.length) { box.innerHTML = '<p class="ac-empty">Здесь появится календарь, когда добавите первые предметы</p>'; return; }

        const dayKey = d => d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
        const byDay = {};
        dated.forEach(i => { const k = dayKey(new Date(i.ts)); byDay[k] = (byDay[k] || 0) + 1; });

        const today = new Date(); today.setHours(0, 0, 0, 0);
        const dow = (today.getDay() + 6) % 7;                    // 0 = Пн
        const start = new Date(today); start.setDate(start.getDate() - dow - 52 * 7);
        const cell = 11, gap = 3, left = 22, top = 16;
        const W = left + 53 * (cell + gap), H = top + 7 * (cell + gap);
        const maxC = Math.max(...Object.values(byDay), 1);
        const shade = c => {
            if (!c) return 'rgba(255,255,255,.06)';
            const a = 0.28 + 0.72 * Math.min(1, c / Math.max(maxC, 3));
            return `rgba(var(--theme-rgb,139,92,246),${a.toFixed(2)})`;
        };

        let rects = '', monthLbl = '', lastM = -1;
        for (let w = 0; w < 53; w++) {
            for (let d = 0; d < 7; d++) {
                const dt = new Date(start); dt.setDate(start.getDate() + w * 7 + d);
                if (dt > today) continue;
                const c = byDay[dayKey(dt)] || 0;
                const label = dt.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
                rects += `<rect class="ac-cell" x="${left + w * (cell + gap)}" y="${top + d * (cell + gap)}" width="${cell}" height="${cell}" rx="3" fill="${shade(c)}"><title>${label}: ${c ? c + ' шт.' : 'ничего'}</title></rect>`;
            }
            const first = new Date(start); first.setDate(start.getDate() + w * 7);
            if (first.getMonth() !== lastM && first.getDate() <= 7) {
                lastM = first.getMonth();
                monthLbl += `<text class="ac-lbl" x="${left + w * (cell + gap)}" y="10">${MONTHS[lastM]}</text>`;
            }
        }
        const dayLbl = [0, 2, 4].map(d => `<text class="ac-lbl" x="0" y="${top + d * (cell + gap) + cell - 2}">${DAYS[d]}</text>`).join('');

        const activeDays = Object.keys(byDay).length;
        const topDow = new Array(7).fill(0);
        dated.forEach(i => { topDow[(new Date(i.ts).getDay() + 6) % 7]++; });
        const bestDow = topDow.indexOf(Math.max(...topDow));
        box.innerHTML = `
        <svg class="ac-heat" viewBox="0 0 ${W} ${H}" role="img" aria-label="Календарь покупок">${monthLbl}${dayLbl}${rects}</svg>
        <p class="ac-note">Дней с пополнением: <b style="color:#fff">${activeDays}</b> · чаще всего вы добавляете предметы в <b style="color:#fff">${['понедельник', 'вторник', 'среду', 'четверг', 'пятницу', 'субботу', 'воскресенье'][bestDow]}</b></p>`;
    }

    /* ---------- общий рендер ---------- */
    function render() {
        try {
            if (!buildBoard()) return;
            const items = collect();
            drawDonut(items);
            drawLine(items);
            drawHeat(items);
        } catch (e) { console.warn('[MIRVEL] Статистика:', e); }
    }

    // Подцепляемся к существующей отрисовке вкладки (её вызывает renderAll из 11-render.js)
    const orig = window.renderAnalyticsTab;
    window.renderAnalyticsTab = function () {
        let r;
        if (typeof orig === 'function') r = orig.apply(this, arguments);
        render();
        return r;
    };
    if (typeof data !== 'undefined') render();
})();
