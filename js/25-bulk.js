/* =========================================================
   MIRVEL HUB — 25-bulk.js
   Режим «Выбрать»: массовое удаление и перенос между разделами (с «Отменить»)
   Подключается после 24-share-collection.js (см. 00-storage.js).
   Ничего не ломает в остальных файлах: работает поверх готовой разметки.
   ========================================================= */
(() => {
    'use strict';

    const SECTIONS = {
        cds:       { grid: 'cd-grid',       title: 'CD' },
        vinyls:    { grid: 'vinyl-grid',    title: 'Винил' },
        stuff:     { grid: 'stuff-grid',    title: 'Вещи' },
        wishlists: { grid: 'wishlist-grid', title: 'Желаемое' },
        games:     { grid: 'games-grid',    title: 'Игры' }
    };
    const KEYS = Object.keys(SECTIONS);
    const MOVE_TARGETS = { cds: '💿 CD', vinyls: '💽 Винил', stuff: '📦 Вещи', wishlists: '🎁 Желаемое' };
    const $ = id => document.getElementById(id);

    let selKey = null;            // раздел, в котором включён режим выбора
    const sel = new Set();        // id выбранных предметов
    let lastId = null;            // для выбора диапазона по Shift

    /* ---------- стили ---------- */
    const style = document.createElement('style');
    style.textContent = `
    .bulk-tools{display:flex;flex-wrap:wrap;gap:.5rem;align-items:center;margin:0 0 1.25rem}
    .bulk-tools button{font-size:.75rem;padding:.45rem .85rem;border-radius:.7rem;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.05);color:#d1d5db;font-weight:700;cursor:pointer;transition:all .15s}
    .bulk-tools button:hover{color:#fff;background:rgba(255,255,255,.1)}
    .bulk-tools button.is-on{border-color:#8b5cf6;background:rgba(139,92,246,.2);color:#fff}
    .bulk-hint{font-size:.7rem;color:#9ca3af}
    [data-bulk-active] > [data-mid], [data-bulk-active] > .game-card{cursor:pointer;user-select:none;-webkit-user-select:none}
    [data-bulk-active] .group-hover\\:opacity-100, [data-bulk-active] .game-ov, [data-bulk-active] .game-act{display:none!important}
    .bulk-check{position:absolute;left:.5rem;top:.5rem;width:1.6rem;height:1.6rem;border-radius:999px;border:2px solid rgba(255,255,255,.75);background:rgba(0,0,0,.55);z-index:40;display:none;align-items:center;justify-content:center;font-size:.9rem;font-weight:900;color:#fff;pointer-events:none}
    [data-bulk-active] .bulk-check{display:flex}
    .bulk-sel{outline:3px solid #22d3ee;outline-offset:4px;border-radius:1.25rem}
    .bulk-sel .bulk-check{background:#06b6d4;border-color:#06b6d4}
    .bulk-sel .bulk-check::after{content:'✓'}
    .bulk-bar{position:fixed;left:50%;bottom:calc(1rem + env(safe-area-inset-bottom,0px));transform:translateX(-50%);z-index:65;display:flex;flex-wrap:wrap;gap:.5rem;align-items:center;justify-content:center;max-width:calc(100vw - 1.5rem);padding:.6rem .8rem;background:rgba(17,17,27,.94);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);border:1px solid rgba(255,255,255,.12);border-radius:1.1rem;box-shadow:0 10px 40px rgba(0,0,0,.5)}
    .bulk-bar.hidden,.bulk-undo.hidden{display:none}
    .bulk-bar .bulk-count{font-size:.8rem;font-weight:800;color:#67e8f9;padding:0 .4rem}
    .bulk-bar button,.bulk-bar select,.bulk-undo button{font-size:.75rem;padding:.5rem .8rem;border-radius:.7rem;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.07);color:#e5e7eb;font-weight:700;cursor:pointer}
    .bulk-bar select option{background:#1a1a2e;color:#fff}
    .bulk-bar button:hover:not(:disabled),.bulk-undo button:hover{background:rgba(255,255,255,.15)}
    .bulk-bar button:disabled,.bulk-bar select:disabled{opacity:.4;cursor:not-allowed}
    .bulk-bar .is-danger{background:rgba(239,68,68,.2);border-color:rgba(239,68,68,.4);color:#fca5a5}
    .bulk-undo{position:fixed;left:50%;bottom:calc(5.5rem + env(safe-area-inset-bottom,0px));transform:translateX(-50%);z-index:66;display:flex;gap:.75rem;align-items:center;padding:.6rem .9rem;background:rgba(17,17,27,.96);border:1px solid rgba(255,255,255,.12);border-radius:1rem;font-size:.8rem;color:#e5e7eb;box-shadow:0 10px 40px rgba(0,0,0,.5)}
    @media (max-width:767px){.bulk-bar{bottom:calc(5rem + env(safe-area-inset-bottom,0px))}.bulk-undo{bottom:calc(9.5rem + env(safe-area-inset-bottom,0px))}}
    `;
    document.head.appendChild(style);

    /* ---------- вспомогательное ---------- */
    const toast = (m, t) => { try { showToast(m, t); } catch (_) {} };
    const gridOf = key => $(SECTIONS[key].grid);
    const CARD_SEL = '[data-mid], .game-card';

    function cardOf(target, grid) {
        if (!target || !target.closest || !grid) return null;
        let el = target.closest(CARD_SEL);
        while (el && el.parentElement !== grid) el = el.parentElement && el.parentElement.closest(CARD_SEL);
        return el && grid.contains(el) ? el : null;
    }
    const idOf = (el, key) => Number(key === 'games' ? el.dataset.gid : el.dataset.mid);
    function cards(key) {
        const g = gridOf(key);
        return g ? [...g.children].filter(el => el.matches && el.matches(CARD_SEL)) : [];
    }
    const visibleIds = key => cards(key).map(el => idOf(el, key)).filter(Number.isFinite);
    const sectionOf = el => { const s = el.closest && el.closest('main > section'); return s && SECTIONS[s.id] ? s.id : null; };
    const plural = n => { const m = n % 10, c = n % 100; return (m === 1 && c !== 11) ? 'предмет' : (m >= 2 && m <= 4 && (c < 12 || c > 14)) ? 'предмета' : 'предметов'; };

    /* ---------- режим выбора ---------- */
    function mark() {
        KEYS.forEach(key => {
            const g = gridOf(key);
            if (!g) return;
            const active = selKey === key;
            g.toggleAttribute('data-bulk-active', active);
            cards(key).forEach(el => {
                if (active) {
                    if (!el.querySelector(':scope > .bulk-check')) {
                        const c = document.createElement('span');
                        c.className = 'bulk-check';
                        c.setAttribute('aria-hidden', 'true');
                        el.appendChild(c);
                    }
                    el.classList.toggle('bulk-sel', sel.has(idOf(el, key)));
                } else {
                    el.classList.remove('bulk-sel');
                    el.querySelector(':scope > .bulk-check')?.remove();
                }
            });
        });
    }

    function enter(key) {
        if (selKey) exit();
        selKey = key; sel.clear(); lastId = null;
        buildMoveOptions();
        mark(); renderBar(); refreshAll();
    }
    function exit() {
        selKey = null; sel.clear(); lastId = null;
        mark(); renderBar(); refreshAll();
    }
    function toggle(id, shift) {
        if (shift && lastId != null && lastId !== id) {
            const ids = visibleIds(selKey), a = ids.indexOf(lastId), b = ids.indexOf(id);
            if (a > -1 && b > -1) ids.slice(Math.min(a, b), Math.max(a, b) + 1).forEach(x => sel.add(x));
        } else {
            sel.has(id) ? sel.delete(id) : sel.add(id);
        }
        lastId = id;
        mark(); renderBar();
    }

    /* ---------- нижняя панель ---------- */
    function renderBar() {
        let bar = $('bulk-bar');
        if (!selKey) { bar && bar.classList.add('hidden'); return; }
        if (!bar) {
            bar = document.createElement('div');
            bar.id = 'bulk-bar';
            bar.className = 'bulk-bar hidden';
            bar.setAttribute('role', 'toolbar');
            bar.setAttribute('aria-label', 'Массовые действия');
            bar.innerHTML = `
                <span class="bulk-count" id="bulk-count" aria-live="polite"></span>
                <button type="button" data-b="all">Выбрать все</button>
                <button type="button" data-b="none">Снять</button>
                <select id="bulk-move" aria-label="Перенести выбранное"></select>
                <button type="button" data-b="hide">🙈 Скрыть</button>
                <button type="button" data-b="unhide">👁 Вернуть</button>
                <button type="button" data-b="del" class="is-danger">🗑 Удалить</button>
                <button type="button" data-b="exit">Готово</button>`;
            document.body.appendChild(bar);
            bar.addEventListener('click', e => {
                const b = e.target.closest('[data-b]');
                if (!b) return;
                if (b.dataset.b === 'all') { visibleIds(selKey).forEach(x => sel.add(x)); mark(); renderBar(); }
                else if (b.dataset.b === 'none') { sel.clear(); mark(); renderBar(); }
                else if (b.dataset.b === 'hide' || b.dataset.b === 'unhide') hideSelected(b.dataset.b === 'hide');
                else if (b.dataset.b === 'del') removeSelected();
                else if (b.dataset.b === 'exit') exit();
            });
            bar.querySelector('#bulk-move').addEventListener('change', e => {
                const dest = e.target.value;
                e.target.value = '';
                if (dest) moveSelected(dest);
            });
        }
        bar.classList.remove('hidden');
        const n = sel.size;
        $('bulk-count').textContent = n ? `Выбрано: ${n}` : 'Нажимайте на карточки';
        bar.querySelector('[data-b="del"]').disabled = !n;
        const mv = $('bulk-move');
        mv.disabled = !n;
        mv.style.display = selKey === 'games' ? 'none' : '';
        // «Скрыть» / «Вернуть» — только для игр; «Вернуть» имеет смысл, когда скрытые видны (фильтр «Показывать скрытые»)
        const hb = bar.querySelector('[data-b="hide"]'), ub = bar.querySelector('[data-b="unhide"]');
        hb.style.display = selKey === 'games' ? '' : 'none';
        ub.style.display = selKey === 'games' && window.mhShowHidden ? '' : 'none';
        hb.disabled = ub.disabled = !n;
    }
    function hideSelected(flag) {
        if (selKey !== 'games' || !sel.size || !window.MirvelHidden) return;
        const ids = [...sel];
        sel.clear();
        MirvelHidden.set(ids, flag);
    }
    function buildMoveOptions() {
        renderBar();
        const mv = $('bulk-move');
        if (!mv || selKey === 'games') return;
        mv.innerHTML = '<option value="">Перенести в…</option>' +
            Object.keys(MOVE_TARGETS).filter(k => k !== selKey).map(k => `<option value="${k}">${MOVE_TARGETS[k]}</option>`).join('');
    }

    /* ---------- «Отменить» ---------- */
    let undoTimer = null;
    function showUndo(msg, fn) {
        let el = $('bulk-undo');
        if (!el) { el = document.createElement('div'); el.id = 'bulk-undo'; el.className = 'bulk-undo hidden'; document.body.appendChild(el); }
        el.innerHTML = '';
        const span = document.createElement('span'); span.textContent = msg;
        const btn = document.createElement('button'); btn.type = 'button'; btn.textContent = '↩ Отменить';
        btn.onclick = () => { clearTimeout(undoTimer); el.classList.add('hidden'); fn(); };
        el.append(span, btn);
        el.classList.remove('hidden');
        clearTimeout(undoTimer);
        undoTimer = setTimeout(() => el.classList.add('hidden'), 10000);
    }

    /* ---------- массовое удаление ---------- */
    function removeSelected() {
        const key = selKey, ids = new Set(sel);
        if (!key || !ids.size) return;
        const removed = [];
        data[key].forEach((it, idx) => { if (ids.has(it.id)) removed.push({ it, idx }); });
        data[key] = data[key].filter(it => !ids.has(it.id));
        sel.clear();
        window.__mirvelBulkOp = true;      // свою кнопку «Отменить» показываем сами — одиночную «Вернуть» (17-convenience.js) глушим
        try { save(); } finally { window.__mirvelBulkOp = false; }
        toast(`Удалено: ${removed.length}`);
        showUndo(`Удалено: ${removed.length}`, () => {
            removed.sort((a, b) => a.idx - b.idx).forEach(({ it, idx }) => data[key].splice(Math.min(idx, data[key].length), 0, it));
            save();
            toast('Возвращено ↩');
        });
    }

    /* ---------- массовый перенос ---------- */
    function uniqueId(arr) { let id = Date.now(); while (arr.some(x => x.id === id)) id++; return id; }

    function moveSelected(dest) {
        const src = selKey, ids = new Set(sel);
        if (!src || !ids.size || !MOVE_TARGETS[dest] || dest === src) return;
        if (!Array.isArray(data[dest])) data[dest] = [];
        const target = data[dest];
        const moved = [];
        data[src].forEach((it, idx) => { if (ids.has(it.id)) moved.push({ orig: it, idx }); });

        moved.forEach(m => {
            const n = { ...m.orig };
            if (target.some(x => x.id === n.id)) n.id = uniqueId(target);
            if (dest === 'cds' || dest === 'vinyls') {
                n.category = 'music';
                if (n.playCount == null) n.playCount = 0;
                if (n.lastPlayed == null) n.lastPlayed = '';
                if (n.note == null) n.note = '';
                if (!n.imgPos) n.imgPos = 'center';
            } else if (dest === 'stuff') {
                if (!n.category || n.category === 'music') n.category = 'other';
                if (n.note == null) n.note = '';
            } else if (dest === 'wishlists') {
                if (!n.tags) n.tags = [];
                if (n.priority == null) n.priority = '';
            }
            m.copy = n;
            target.push(n);
        });
        data[src] = data[src].filter(it => !ids.has(it.id));
        sel.clear();
        save();
        const label = MOVE_TARGETS[dest];
        toast(`Перенесено в «${label}»: ${moved.length}`, 'success');
        showUndo(`Перенесено в «${label}»: ${moved.length}`, () => {
            const copies = new Set(moved.map(m => m.copy));
            data[dest] = data[dest].filter(x => !copies.has(x));
            moved.sort((a, b) => a.idx - b.idx).forEach(m => data[src].splice(Math.min(m.idx, data[src].length), 0, m.orig));
            save();
            toast('Возвращено ↩');
        });
    }

    /* ---------- интерфейс в разделах ---------- */
    function ensureTools() {
        KEYS.forEach(key => {
            const grid = gridOf(key);
            const section = grid && grid.closest('section');
            if (!grid || !section || section.querySelector(`[data-bulk-tools="${key}"]`)) return;
            const row = document.createElement('div');
            row.className = 'bulk-tools';
            row.dataset.bulkTools = key;
            row.innerHTML = `<button type="button" data-b="select">☑️ Выбрать</button>`;
            grid.insertAdjacentElement('beforebegin', row);
        });
    }

    function refresh(key) {
        const grid = gridOf(key);
        if (!grid) return;
        if (selKey === key) {
            const vis = new Set(visibleIds(key));
            [...sel].forEach(id => { if (!vis.has(id)) sel.delete(id); });   // выбранное, что пропало с экрана (фильтр/поиск), не трогаем
            mark(); renderBar();
        }
        const row = grid.closest('section')?.querySelector(`[data-bulk-tools="${key}"]`);
        if (row) {
            const selBtn = row.querySelector('[data-b="select"]');
            if (selBtn) { selBtn.classList.toggle('is-on', selKey === key); selBtn.textContent = selKey === key ? '✕ Отмена выбора' : '☑️ Выбрать'; }
        }
    }
    const refreshAll = () => KEYS.forEach(refresh);

    /* ---------- события ---------- */
    window.addEventListener('click', e => {
        const t = e.target;
        if (!t || !t.closest) return;

        // кнопки в строке инструментов раздела
        const tool = t.closest('[data-bulk-tools] [data-b]');
        if (tool) {
            const key = tool.closest('[data-bulk-tools]').dataset.bulkTools;
            if (tool.dataset.b === 'select') selKey === key ? exit() : enter(key);
            return;
        }

        // в режиме выбора клик по карточке только отмечает её
        if (!selKey) return;
        const card = cardOf(t, gridOf(selKey));
        if (!card) return;
        e.preventDefault(); e.stopPropagation();
        const id = idOf(card, selKey);
        if (Number.isFinite(id)) toggle(id, e.shiftKey);
    }, true);

    window.addEventListener('keydown', e => {
        if (!selKey) return;
        if (e.key === 'Escape' && !document.querySelector('.fixed:not(.hidden)[role="dialog"]')) { exit(); return; }
        if (e.key !== 'Enter' && e.key !== ' ') return;
        const card = cardOf(e.target, gridOf(selKey));
        if (card && e.target === card) {
            e.preventDefault(); e.stopPropagation();
            const id = idOf(card, selKey);
            if (Number.isFinite(id)) toggle(id, e.shiftKey);
        }
    }, true);

    // уходим со страницы — выключаем режим выбора
    const origShowPage = window.showPage;
    if (typeof origShowPage === 'function') {
        window.showPage = function (id, ...rest) {
            if (selKey && id !== selKey) exit();
            const r = origShowPage.call(this, id, ...rest);
            ensureTools();
            return r;
        };
    }

    // сетки перерисовываются на каждый updateUI() — после каждой перерисовки возвращаем отметки
    function init() {
        // если раньше был включён «Мой порядок» — возвращаем обычную сортировку
        if (data.sortMode) Object.keys(data.sortMode).forEach(k => {
            if (data.sortMode[k] === 'manual') data.sortMode[k] = k === 'wishlists' ? 'priority' : 'title';
        });
        ensureTools();
        KEYS.forEach(key => {
            const g = gridOf(key);
            if (g) new MutationObserver(() => { ensureTools(); refresh(key); }).observe(g, { childList: true });
        });
        refreshAll();
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

    window.MirvelBulk = { enter, exit, selected: () => [...sel], undo: showUndo };
})();
