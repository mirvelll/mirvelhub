/* =========================================================
   MIRVEL HUB — 33-hidden-games.js (подключать в самом конце, после 32-game-bundles.js)
   Скрытие игр: у игры поле hidden = true.
   • 🙈 на карточке и «🙈 Скрыть» на странице игры (data-act="hidegame"), «☑️ Выбрать» → «🙈 Скрыть» (25-bulk.js)
   • фильтр «Скрытые → Показывать скрытые N» в панели фильтров страницы «Игры»
   • «↩ Отменить» после скрытия / возврата

   Пока фильтр выключен, скрытых игр нет ни в списках, ни в счётчиках, ни в статистике, ни в «Игре дня»:
   на время отрисовки (renderAll) data.games подменяется списком только видимых игр, потом возвращается.
   Данные при этом не теряются: пока список подменён, запись на диск откладывается до конца отрисовки.
   Полный список всегда доступен через mhAllGames().
   ========================================================= */
(() => {
    const $ = id => document.getElementById(id);

    let real = null;              // полный список игр, пока data.games подменён на время отрисовки
    let depth = 0;
    let pendingPersist = false;   // кто-то попросил сохранить, пока список был подменён

    window.mhShowHidden = false;
    window.mhAllGames = () => real || (data && data.games) || [];

    const hiddenCount = () => mhAllGames().filter(g => g && g.hidden).length;

    /* ---------- Защита от потери данных ---------- */
    // Пока data.games подменён, на диск ничего не пишем: иначе скрытые игры пропали бы из сохранения.
    if (typeof persistData === 'function') {
        const persistBase = persistData;
        persistData = function (...args) {
            if (real) { pendingPersist = true; return true; }
            return persistBase.apply(this, args);
        };
    }
    if (window.MirvelStore && typeof MirvelStore.save === 'function') {
        const saveBase = MirvelStore.save;
        MirvelStore.save = function (...args) {
            if (real) { pendingPersist = true; return true; }
            return saveBase.apply(this, args);
        };
    }

    /* ---------- Отрисовка без скрытых игр ---------- */
    const renderBase = renderAll;
    renderAll = function (...args) {
        if (window.mhShowHidden && !hiddenCount()) window.mhShowHidden = false;   // скрытых не осталось — обычный режим

        const d = data;
        const list = d && d.games;
        const needSwap = depth === 0 && !window.mhShowHidden && Array.isArray(list) && list.some(g => g && g.hidden);
        if (!needSwap) {
            const res = renderBase.apply(this, args);
            afterRender();
            return res;
        }

        real = list;
        depth++;
        d.games = list.filter(g => !(g && g.hidden));
        try {
            return renderBase.apply(this, args);
        } finally {
            d.games = real;            // игры всегда возвращаются на место, даже если отрисовка упала
            real = null;
            depth--;
            if (pendingPersist) { pendingPersist = false; try { persistData(); } catch (e) { console.warn('[MIRVEL]', e); } }
            afterRender();
        }
    };

    /* ---------- Скрыть / вернуть ---------- */
    const gameTitle = g => String(g.title || 'Без названия');

    function set(ids, flag) {
        const want = new Set([...ids].map(Number));
        const changed = mhAllGames().filter(g => g && want.has(Number(g.id)) && !!g.hidden !== !!flag);
        if (!changed.length) return 0;
        changed.forEach(g => { if (flag) g.hidden = true; else delete g.hidden; });
        save();

        const n = changed.length;
        const msg = flag
            ? (n === 1 ? `Скрыта: ${gameTitle(changed[0])}` : `Скрыто игр: ${n}`)
            : (n === 1 ? `Возвращена в список: ${gameTitle(changed[0])}` : `Возвращено игр: ${n}`);
        showUndo(msg, () => set(changed.map(g => g.id), !flag));
        return n;
    }

    window.MirvelHidden = {
        set,
        hide: ids => set(ids, true),
        show: ids => set(ids, false),
        toggle: id => { const g = mhAllGames().find(x => Number(x.id) === Number(id)); return g ? set([g.id], !g.hidden) : 0; },
        count: hiddenCount
    };

    /* ---------- «↩ Отменить» ---------- */
    let undoTimer = null;
    function showUndo(msg, fn) {
        let el = $('mh-undo');
        if (!el) {
            el = document.createElement('div');
            el.id = 'mh-undo';
            el.className = 'mh-undo hidden';
            el.setAttribute('role', 'status');
            document.body.appendChild(el);
        }
        el.textContent = '';
        const span = document.createElement('span');
        span.textContent = msg;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = '↩ Отменить';
        btn.onclick = () => { clearTimeout(undoTimer); el.classList.add('hidden'); fn(); };
        el.append(span, btn);
        el.classList.remove('hidden');
        clearTimeout(undoTimer);
        undoTimer = setTimeout(() => el.classList.add('hidden'), 10000);
    }

    /* ---------- Клики по 🙈 (карточка и страница игры) ---------- */
    document.addEventListener('click', e => {
        const btn = e.target.closest && e.target.closest('[data-act="hidegame"]');
        if (!btn) return;
        e.preventDefault();
        e.stopPropagation();          // чтобы клик не открыл страницу игры и не ушёл в другие обработчики
        const id = btn.dataset.id || btn.closest('[data-gid]')?.dataset.gid;
        if (id == null) return;
        const inDetail = !!btn.closest('#game-detail-modal');
        const game = mhAllGames().find(x => Number(x.id) === Number(id));
        if (!game) return;
        const hiding = !game.hidden;
        set([game.id], hiding);
        if (inDetail) {
            if (hiding && !window.mhShowHidden) $('game-detail-modal')?.classList.add('hidden');   // скрытая игра исчезает из списка — закрываем её страницу
            else if (typeof window.openGameDetail === 'function') window.openGameDetail(game.id);  // перерисовать кнопку
        }
    }, true);

    /* ---------- Фильтр «Показывать скрытые» ---------- */
    function ensureFilter() {
        const row = $('game-filter-ext');
        if (!row) return null;
        let grp = $('mh-group');
        if (!grp) {
            grp = document.createElement('div');
            grp.id = 'mh-group';
            grp.className = 'hidden flex flex-wrap items-center gap-2';
            grp.innerHTML = '<span class="gf-label">Скрытые</span><button type="button" id="mh-toggle" class="gf-chip" aria-pressed="false"></button>';
            row.insertBefore(grp, $('game-reset-filters') || null);
            grp.addEventListener('click', e => {
                if (!e.target.closest('#mh-toggle')) return;
                window.mhShowHidden = !window.mhShowHidden;
                updateUI();
            });
        }
        return grp;
    }

    function afterRender() {
        try {
            const grp = ensureFilter();
            if (!grp) return;
            const n = hiddenCount();
            grp.classList.toggle('hidden', n === 0);
            const b = $('mh-toggle');
            if (b) {
                b.textContent = `🙈 Показывать скрытые ${n}`;
                b.classList.toggle('is-on', !!window.mhShowHidden);
                b.setAttribute('aria-pressed', String(!!window.mhShowHidden));
            }
        } catch (e) { console.warn('[MIRVEL] скрытые игры: фильтр не отрисован', e); }
    }

    /* ---------- Стили ---------- */
    const st = document.createElement('style');
    st.textContent = `
    .game-card.is-hidden-game { opacity: .55; filter: grayscale(.55); border-style: dashed; }
    .game-card.is-hidden-game:hover, .game-card.is-hidden-game:focus-within { opacity: 1; filter: none; }
    .game-hid-badge { position: absolute; left: 50%; bottom: 6px; transform: translateX(-50%); z-index: 2; white-space: nowrap;
        padding: 2px 8px; border-radius: 999px; font-size: 9px; font-weight: 800; color: #e5e7eb;
        background: rgba(0,0,0,.78); border: 1px solid rgba(255,255,255,.2); }
    .mh-undo { position: fixed; left: 50%; bottom: 84px; transform: translateX(-50%); z-index: 75;
        display: flex; align-items: center; gap: 12px; max-width: min(92vw, 460px);
        padding: 10px 12px 10px 16px; border-radius: 16px; font-size: 13px; color: #fff;
        background: rgba(10,10,18,.96); border: 1px solid rgba(255,255,255,.14); box-shadow: 0 16px 44px rgba(0,0,0,.55); }
    .mh-undo.hidden { display: none; }
    .mh-undo span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .mh-undo button { flex-shrink: 0; padding: 7px 14px; border-radius: 10px; font-size: 12px; font-weight: 800; color: #fff; background: var(--theme-btn, #7c3aed); }
    .mh-undo button:hover { filter: brightness(1.12); }
    @media print { .mh-undo { display: none !important; } }`;
    document.head.appendChild(st);

    updateUI();
})();
