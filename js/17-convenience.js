/* =========================================================
   MIRVEL HUB — 17-convenience.js (подключать после 16-games.js)
   Удобства для всех коллекций:
   • «↩ Вернуть» после удаления релиза / вещи / желаемого / игры (без окон подтверждения)
   • новые сортировки: по исполнителю, по году, «недавно добавленные»
   • сортировка по приоритету в «Листе желаний» (раньше была выбрана по умолчанию, но не работала)
   • предупреждение о дубле при добавлении
   ========================================================= */
(() => {
    const $ = id => document.getElementById(id);
    const KEYS = ['cds', 'vinyls', 'games', 'stuff', 'wishlists'];
    const LABELS = { cds: 'CD', vinyls: 'Винил', games: 'Игра', stuff: 'Вещь', wishlists: 'Желаемое' };
    const BTN = 'text-xs px-3 py-1.5 rounded-lg border border-white/10 bg-white/5';

    /* ---------- Кнопки сортировки ---------- */
    function addSortButtons(key, defs) {
        const anchor = $(`sort-${key}-title`);
        if (!anchor) return;
        defs.forEach(([mode, label]) => {
            if ($(`sort-${key}-${mode}`)) return;
            const b = document.createElement('button');
            b.type = 'button';
            b.id = `sort-${key}-${mode}`;
            b.className = BTN;
            b.textContent = label;
            b.onclick = () => setSortMode(key, mode);
            anchor.parentElement.appendChild(b);
        });
    }

    function buildWishlistSortBar() {
        if ($('sort-wishlists-title')) return;
        const after = $('filter-bar');
        if (!after) return;
        const bar = document.createElement('div');
        bar.className = 'flex flex-wrap gap-2 items-center mb-6 bg-white/5 p-3 rounded-2xl border border-white/5';
        bar.innerHTML = '<span class="text-xs text-gray-500 uppercase font-black tracking-widest mr-2">Сортировать по:</span>';
        after.insertAdjacentElement('afterend', bar);
        [['priority', 'Приоритету 🔥'], ['title', 'Алфавиту 🔤'], ['price_desc', 'Сначала дорогие 💸'],
         ['price_asc', 'Сначала дешевые 🪙'], ['recent', 'Недавно добавленные 🆕']].forEach(([mode, label]) => {
            const b = document.createElement('button');
            b.type = 'button';
            b.id = `sort-wishlists-${mode}`;
            b.className = BTN;
            b.textContent = label;
            b.onclick = () => setSortMode('wishlists', mode);
            bar.appendChild(b);
        });
    }

    const MUSIC_EXTRA = [['artist', 'Исполнителю 🎤'], ['year_desc', 'Новее 📅'], ['recent', 'Недавно добавленные 🆕']];
    addSortButtons('cds', MUSIC_EXTRA);
    addSortButtons('vinyls', MUSIC_EXTRA);
    addSortButtons('stuff', [['recent', 'Недавно добавленные 🆕']]);
    buildWishlistSortBar();

    /* ---------- «Вернуть» после удаления ---------- */
    const bar = document.createElement('div');
    bar.className = 'undo-bar';
    bar.setAttribute('role', 'status');
    bar.setAttribute('aria-live', 'polite');
    bar.innerHTML = '<span id="undo-text"></span><button type="button" id="undo-btn">↩ Вернуть</button>';
    document.body.appendChild(bar);

    let timer = null;
    let pending = null;

    const hideBar = () => { bar.classList.remove('is-visible'); pending = null; };

    function showUndo(key, item, index) {
        pending = { key, item, index };
        $('undo-text').textContent = `🗑 ${LABELS[key]} удалён(а): «${item.title || 'Без названия'}»`;
        bar.classList.add('is-visible');
        clearTimeout(timer);
        timer = setTimeout(hideBar, 8000);
    }

    $('undo-btn').onclick = () => {
        if (!pending) return;
        const { key, item, index } = pending;
        hideBar();
        if (!Array.isArray(data[key])) data[key] = [];
        if (data[key].some(x => x.id === item.id)) return;
        data[key].splice(Math.min(index, data[key].length), 0, item);
        save();
        showToast(`Вернул: <strong>${esc(item.title || 'Без названия')}</strong> ↩`, 'success');
    };

    const takeSnap = () => Object.fromEntries(KEYS.map(k => [k, Array.isArray(data[k]) ? data[k].slice() : []]));
    let snap = takeSnap();

    /* save() вызывают все разделы, поэтому отслеживаем удаление здесь: пропал ровно один предмет и ничего
       не добавилось → это удаление. Перенос «Желаемое → Коллекция» (удалено + добавлено) и массовый импорт/сброс не считаются. */
    const saveBase = save;
    save = function (...args) {
        const before = snap;
        const result = saveBase.apply(this, args);
        try {
            const removed = [];
            let added = 0;
            KEYS.forEach(k => {
                const now = Array.isArray(data[k]) ? data[k] : [];
                const nowIds = new Set(now.map(x => x.id));
                const oldIds = new Set(before[k].map(x => x.id));
                before[k].forEach((x, idx) => { if (!nowIds.has(x.id)) removed.push({ key: k, item: x, index: idx }); });
                now.forEach(x => { if (!oldIds.has(x.id)) added++; });
            });
            if (removed.length === 1 && added === 0 && !window.__mirvelBulkOp) showUndo(removed[0].key, removed[0].item, removed[0].index);
        } catch (e) { console.warn('[MIRVEL] undo tracker:', e); }
        snap = takeSnap();
        return result;
    };
    // данные могли подменить снаружи (другая вкладка, сброс) — обновляем снимок при возврате на вкладку
    document.addEventListener('mirvel-external', () => { snap = takeSnap(); });
    window.addEventListener('storage', () => { snap = takeSnap(); });

    /* ---------- Предупреждение о дубле ---------- */
    const norm = s => String(s || '').trim().toLowerCase();
    const saveItemBase = window.saveItem;
    window.saveItem = async (...args) => {
        const type = $('edit-type').value;
        const editing = !!$('edit-id').value;
        const title = norm($('item-title').value);
        const artist = norm($('item-artist').value);
        let dupIn = '';
        if (!editing && title) {
            const lists = type === 'wishlists' ? ['cds', 'vinyls', 'wishlists'] : [type];
            const hit = lists.find(k => (data[k] || []).some(x => norm(x.title) === title && norm(x.artist) === artist));
            if (hit) dupIn = hit;
        }
        await saveItemBase(...args);
        if (dupIn && $('modal').classList.contains('hidden')) {
            showToast(`⚠️ Похоже на дубль: такой релиз уже есть в разделе «${LABELS[dupIn]}»`);
        }
    };

/* ---------- Окна редактирования: шапка | прокручиваемое тело | панель «Сохранить / Отмена» ----------
       Раньше кнопки были «липкими» (position: sticky) внутри прокручиваемого окна — из-за этого панель
       могла уезжать вниз и оставлять пустое место. Теперь окно — колонка: прокручивается только тело,
       кнопки всегда прижаты к низу. У окна игры тело разложено на две колонки (стили — в hub2.css). */
    ['modal', 'game-modal'].forEach(id => {
        const card = $(id)?.firstElementChild;
        if (!card || card.classList.contains('modal-ready')) return;
        const kids = [...card.children];
        const cancel = kids[kids.length - 1], saveBtn = kids[kids.length - 2];
        if (kids.length < 4 || saveBtn?.tagName !== 'BUTTON' || cancel?.tagName !== 'BUTTON') return;

        const body = document.createElement('div');
        body.className = 'modal-body';
        const middle = kids.slice(1, -2);

        if (id === 'game-modal') {
            // левая колонка — всё до ссылки включительно (платформа, название, цена…), правая — статус, оценка, обложка
            const urlAt = middle.findIndex(k => k.id === 'game-url' || k.querySelector?.('#game-url'));
            if (urlAt > -1) {
                const left = document.createElement('div'), right = document.createElement('div');
                left.className = right.className = 'modal-col';
                middle.forEach((k, i) => (i <= urlAt ? left : right).appendChild(k));
                body.classList.add('is-cols');
                body.append(left, right);
            }
        }
        if (!body.children.length) middle.forEach(k => body.appendChild(k));

        const foot = document.createElement('div');
        foot.className = 'modal-foot';
        foot.append(saveBtn, cancel);
        card.append(body, foot);
        card.classList.add('modal-ready');
    });

    /* ---------- Пока открыто окно — страница под ним не прокручивается ----------
       Следим за всеми окнами (и теми, что создаются скриптами позже) и вешаем на <html> класс has-modal.
       Ширину полосы прокрутки запоминаем, чтобы страница не «дёргалась» при открытии. */
    const OVERLAYS = '[id="modal"], [id$="-modal"], #command-palette';
    let lockQueued = false;
    function syncScrollLock() {
        lockQueued = false;
        const root = document.documentElement;
        const anyOpen = [...document.querySelectorAll(OVERLAYS)].some(m => !m.classList.contains('hidden'));
        if (anyOpen === root.classList.contains('has-modal')) return;
        if (anyOpen) root.style.setProperty('--sbw', `${Math.max(0, window.innerWidth - root.clientWidth)}px`);
        root.classList.toggle('has-modal', anyOpen);
    }
    new MutationObserver(() => {
        if (lockQueued) return;
        lockQueued = true;
        requestAnimationFrame(syncScrollLock);
    }).observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'] });
    syncScrollLock();

    /* Колесо мыши над активным числовым полем не должно менять число вместо прокрутки окна */
    document.addEventListener('wheel', e => {
        const t = e.target;
        if (t instanceof HTMLInputElement && t.type === 'number' && document.activeElement === t) t.blur();
    }, { passive: true });

    updateUI();
})();

/* =========================================================
   Панели «⚙ Настройки: …» (шестерёнка на каждой странице)
   • ✕ стоит левее шестерёнки и больше не перекрывается ею
   • единый красивый вид панели на ВСЕХ страницах (включая «Игры»)
   • «Показывать блоки» и «Отдельные карточки статистики» лежат рядом — панель низкая
   • пункт «Размер карточек» убран (кнопка «Размер: авто» и пояснение к ней)
   • в «Вещах» (и везде, где так же) кнопка ⚙ стоит рядом с кнопкой «+ Новый …»
   Всё определяется по тексту и по поведению элементов, а не по конкретной разметке страницы.
   ========================================================= */
(() => {
    const style = document.createElement('style');
    style.textContent = `
    .hs-panel{position:relative;padding:1.5rem 1.75rem 1.6rem!important;border-radius:1.5rem!important;border:1px solid rgba(255,255,255,.12)!important;
        background:linear-gradient(135deg,rgba(139,92,246,.13),rgba(34,211,238,.05) 55%,rgba(255,255,255,.02))!important;box-shadow:0 18px 50px rgba(0,0,0,.35)}
    .hs-title{display:flex!important;align-items:center;gap:.55rem;margin:0 0 1.15rem!important;padding-right:7rem;font-size:1.1rem!important;font-weight:900!important;letter-spacing:.01em;color:#fff}
    /* ✕ всегда закреплён у правого края панели, но левее шестерёнки (она занимает ~47px от края) */
    .hs-panel .hs-close{position:absolute!important;top:.8rem!important;right:3.8rem!important;left:auto!important;bottom:auto!important;display:inline-flex!important;align-items:center;justify-content:center;
        width:2.25rem;height:2.25rem;padding:0!important;margin:0!important;border-radius:999px!important;border:1px solid rgba(255,255,255,.16)!important;
        background:rgba(255,255,255,.07)!important;color:#e5e7eb!important;cursor:pointer;transition:background .15s,border-color .15s,color .15s;z-index:5}
    .hs-panel .hs-close:hover{background:rgba(239,68,68,.22)!important;border-color:rgba(239,68,68,.5)!important;color:#fecaca!important}
    .hs-groups{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:1.25rem 2.25rem;align-items:start}
    .hs-groups[data-n="2"]{grid-template-columns:minmax(0,2fr) minmax(0,3fr)}
    .hs-group-title{display:flex!important;align-items:center;gap:.7rem;margin:0 0 .7rem!important;font-size:.68rem!important;font-weight:900!important;letter-spacing:.14em;text-transform:uppercase;color:var(--accent,#a78bfa)!important}
    .hs-group-title::after{content:'';flex:1;height:1px;background:linear-gradient(90deg,rgba(255,255,255,.16),transparent)}
    .hs-list{display:grid;grid-template-columns:repeat(auto-fill,minmax(215px,1fr));gap:.5rem}
    .hs-row{display:flex!important;align-items:center;gap:.6rem;min-width:0;margin:0!important;padding:.55rem .8rem!important;border-radius:.85rem;border:1px solid rgba(255,255,255,.08);
        background:rgba(255,255,255,.04);font-size:.8rem!important;font-weight:600;color:#cbd5e1;cursor:pointer;transition:background .15s,border-color .15s,color .15s}
    .hs-row:hover{background:rgba(255,255,255,.09);border-color:rgba(255,255,255,.2);color:#fff}
    .hs-row:has(input:checked){background:rgba(139,92,246,.17);border-color:rgba(139,92,246,.5);color:#fff}
    .hs-row input[type=checkbox]{flex-shrink:0;width:1rem;height:1rem;accent-color:var(--accent,#8b5cf6);cursor:pointer}
    .hs-tail{margin-top:1.15rem}
    .hs-btn{display:inline-flex!important;align-items:center;gap:.4rem;padding:.55rem 1.05rem!important;border-radius:.85rem!important;border:1px solid rgba(255,255,255,.16)!important;
        background:rgba(255,255,255,.07)!important;color:#e5e7eb!important;font-size:.75rem!important;font-weight:800!important;cursor:pointer;transition:background .15s}
    .hs-btn:hover{background:rgba(255,255,255,.15)!important}
    .hs-panel select,.hs-panel input[type=text],.hs-panel input[type=number],.hs-panel input[type=search]{padding:.5rem .8rem;border-radius:.75rem;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.06);color:#e5e7eb;font-size:.8rem}
    .hs-panel input[type=range],.hs-panel input[type=radio]{accent-color:var(--accent,#8b5cf6)}
    .hs-actions{display:flex;align-items:center;gap:.75rem;flex-shrink:0}
    @media (max-width:900px){.hs-groups[data-n="2"]{grid-template-columns:1fr}.hs-panel{padding:1.1rem 1rem 1.2rem!important}.hs-title{padding-right:6rem}}
    @media (max-width:767px){.hs-actions{width:100%}.hs-actions > :last-child{flex:1 1 auto}}
    `;
    document.head.appendChild(style);

    const addCls = (el, c) => { if (!el.classList.contains(c)) el.classList.add(c); };
    const CLOSE_RE = /^[✕✖×xXхХ]$/;
    const GEAR_RE = /⚙/;
    const CTRL = 'button,[role="button"],a,[onclick]';
    const FIELDS = 'input,select,textarea,button,[role="button"],[role="switch"],[role="radio"]';
    let gearRef = null;

    const textNodes = (root, test) => {
        const out = [];
        const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: n => test(n.data) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT });
        for (let n = w.nextNode(); n; n = w.nextNode()) if (!n.parentElement.closest('script,style,textarea')) out.push(n);
        return out;
    };

    /* ---------- панели настроек ---------- */
    function panelOf(title) {
        let p = title.parentElement;
        for (let i = 0; p && i < 6 && p !== document.body && !p.matches('main,section.page'); i++, p = p.parentElement) {
            if (p.querySelector('input[type="checkbox"]')) return p;
            if (/glass|card|panel|rounded/.test(p.className || '') && p.querySelectorAll(FIELDS).length >= 2) return p;
        }
        return null;
    }
    function findPanels() {
        const res = [], seen = new Set();
        textNodes(document.body, d => d.includes('Настройки:') || d.includes('Настроить страницу')).forEach(n => {
            const title = n.parentElement, panel = panelOf(title);
            if (panel && !seen.has(panel)) { seen.add(panel); res.push({ panel, title }); }
        });
        return res;
    }

    function restructure(panel, title) {
        const boxes = [...panel.querySelectorAll('input[type="checkbox"]:not(.hs-cb)')];
        if (!boxes.length) return;
        const rows = boxes.map(cb => cb.closest('label') || cb.parentElement);
        boxes.forEach(cb => addCls(cb, 'hs-cb'));
        rows.forEach(r => addCls(r, 'hs-row'));

        let host = rows[0].parentElement;
        while (host && !rows.every(r => host.contains(r))) host = host.parentElement;
        if (!host || !rows.every(r => r.parentElement === host)) return;     // нестандартная разметка — оставляем только «плашки»

        const kids = [...host.children];
        const hasCtrl = k => k.matches('button') || !!k.querySelector('input,button');
        const first = kids.findIndex(k => rows.includes(k));
        let last = -1;
        kids.forEach((k, i) => { if (rows.includes(k)) last = i; });
        let start = first;
        const prev = kids[first - 1];
        if (prev && !hasCtrl(prev) && prev !== title && !prev.contains(title)) start = first - 1;   // заголовок первой группы

        const groups = [];
        let cur = null;
        kids.slice(start, last + 1).forEach(k => {
            if (rows.includes(k)) { if (!cur) { cur = { head: null, rows: [] }; groups.push(cur); } cur.rows.push(k); }
            else if (!hasCtrl(k)) { cur = { head: k, rows: [] }; groups.push(cur); }
        });
        const full = groups.filter(g => g.rows.length);
        if (!full.length) return;

        const wrap = document.createElement('div');
        wrap.className = 'hs-groups';
        wrap.dataset.n = String(full.length);
        host.insertBefore(wrap, kids[start]);
        full.forEach(g => {
            const col = document.createElement('section');
            col.className = 'hs-group';
            if (g.head) { addCls(g.head, 'hs-group-title'); col.appendChild(g.head); }
            const list = document.createElement('div');
            list.className = 'hs-list';
            g.rows.forEach(r => list.appendChild(r));
            col.appendChild(list);
            wrap.appendChild(col);
        });
        kids.slice(last + 1).filter(hasCtrl).forEach(t => addCls(t, 'hs-tail'));
    }

    function findClose(panel) {
        const byBtn = [...panel.querySelectorAll(CTRL)].find(b => CLOSE_RE.test((b.textContent || '').trim()) || /закр|close/i.test((b.getAttribute('aria-label') || '') + (b.title || '')));
        if (byBtn) return byBtn;
        // ✕ может быть обычным <span>/<div> с обработчиком клика
        const n = textNodes(panel, d => CLOSE_RE.test(d.trim()))[0];
        return n ? (n.parentElement.closest(CTRL) || n.parentElement) : null;
    }

    function decorate({ panel, title }) {
        addCls(panel, 'hs-panel');
        addCls(title, 'hs-title');
        restructure(panel, title);
        const close = findClose(panel);
        if (close) { addCls(close, 'hs-close'); panel._hsClose = close; }
        panel.querySelectorAll('button').forEach(b => { if (b !== close && !b.closest('label') && !b.contains(close)) addCls(b, 'hs-btn'); });
    }

    /* ---------- «Размер карточек» — убираем (кнопка «Размер: авто», пояснение к ней и подпись) ---------- */
    const isGone = el => el.hasAttribute('data-hs-gone') || el.style.display === 'none';
    const hideEl = el => { el.setAttribute('data-hs-gone', ''); el.style.setProperty('display', 'none', 'important'); };
    function collapseEmpty(el, stop) {          // если после скрытия контейнер опустел — прячем и его
        for (let p = el.parentElement; p && p !== stop && !p.matches('main,section.page,body'); p = p.parentElement) {
            const hasText = [...p.childNodes].some(n => n.nodeType === 3 && n.data.trim());
            if (hasText || ![...p.children].every(isGone)) break;
            hideEl(p);
        }
    }
    function hideCardSize(panels) {
        panels.forEach(({ panel }) => {
            textNodes(panel, d => /меньше значение|больше карточек в ряду|^\s*размер:\s*\S/i.test(d) || /размер\s+карточ/i.test(d)).forEach(n => {
                const el = n.parentElement;
                if (isGone(el) || el.closest('[data-hs-gone]')) return;
                const ctrl = el.closest('button,[role="button"]');
                const target = ctrl && panel.contains(ctrl) ? ctrl : el;
                if ((target.textContent || '').trim().length > 400) return;            // слишком большой контейнер — не трогаем
                hideEl(target);
                collapseEmpty(target, panel);
            });
        });
    }

    /* ---------- ✕ не под шестерёнкой ---------- */
    function dodgeGear(panel) {
        const close = panel._hsClose;
        if (!close || !panel.getClientRects().length) return;
        const dx0 = Number(close.dataset.hsDx || 0);
        const r = close.getBoundingClientRect();
        if (!r.width) return;
        const left = r.left + dx0, right = r.right + dx0;      // положение без нашего сдвига

        let gear = gearRef && gearRef.isConnected && gearRef.getClientRects().length ? gearRef : null;
        if (!gear) {
            const g = textNodes(document.body, d => GEAR_RE.test(d) && d.trim().length <= 3)
                .map(n => n.parentElement)
                .filter(el => !panel.contains(el) || el.closest(CTRL))
                .map(el => el.closest(CTRL) || el)
                .find(el => el !== close && !close.contains(el) && el.getClientRects().length);
            gear = g || null;
            if (!gear) {
                const stack = document.elementsFromPoint(r.left + r.width / 2, r.top + r.height / 2);
                gear = stack.find(el => el !== close && !close.contains(el) && !el.contains(close) && el.getBoundingClientRect().width < 90) || null;
                if (gear) gear = gear.closest(CTRL) || gear;
            }
            if (gear) { gearRef = gear; gear.setAttribute('data-hs-gear', ''); }
        }
        let dx = 0;
        if (gear) {
            const g = gear.getBoundingClientRect();
            if (g.width && g.right > left && g.left < right && g.bottom > r.top && g.top < r.bottom) dx = Math.ceil(right - g.left + 10);
        }
        if (dx !== dx0) {
            close.dataset.hsDx = String(dx);
            if (dx) close.style.setProperty('translate', `${-dx}px 0`, 'important'); else close.style.removeProperty('translate');
        }
    }

    /* ---------- кнопка ⚙ рядом с «+ Новый …» ---------- */
    function groupHeaderButtons() {
        document.querySelectorAll('main > section.page').forEach(sec => {
            const header = sec.firstElementChild;
            if (!header || header.classList.contains('hs-actions')) return;
            const kids = [...header.children];
            const gear = kids.find(k => k.matches(CTRL) && GEAR_RE.test(k.textContent || '') && (k.textContent || '').trim().length < 30 && !/управлен/i.test(k.textContent));
            const add = kids.find(k => k !== gear && k.matches('button') && (k.textContent || '').trim().startsWith('+'));
            if (!gear || !add) return;
            const box = document.createElement('div');
            box.className = 'hs-actions';
            header.insertBefore(box, add);
            box.append(gear, add);
        });
    }

    let queued = false;
    function run() {
        queued = false;
        const panels = findPanels();
        panels.forEach(decorate);
        groupHeaderButtons();
        hideCardSize(panels);
        panels.forEach(({ panel }) => dodgeGear(panel));
    }
    const queue = () => { if (!queued) { queued = true; requestAnimationFrame(run); } };
    new MutationObserver(queue).observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['class', 'hidden'] });
    window.addEventListener('resize', queue);
    queue();
})();
