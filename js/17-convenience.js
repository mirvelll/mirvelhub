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
            if (removed.length === 1 && added === 0) showUndo(removed[0].key, removed[0].item, removed[0].index);
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

    updateUI();
})();
