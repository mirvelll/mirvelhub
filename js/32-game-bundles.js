/* =========================================================
   MIRVEL HUB — 32-game-bundles.js (подключать в самом конце списка скриптов)
   Наборы игр: несколько игр с ОДНОЙ общей ценой (Сталкер ×3 за 95 ₴, диски PS4 из комплекта, паки Steam).

   Данные:
     data.gameBundles = [{ id, name, price, approx, unknown, kind }]
        unknown — цену набора не помню;  kind — '' | 'free' | 'gift' | 'family' | 'code' (как получен весь набор)
     игра из набора: game.bundleId = id набора
   Цена набора делится между его играми (целыми, если цена целая), поэтому суммы по коллекции
   считают набор ровно один раз — остальной код трогать не нужно. Пересчёт идёт при каждом сохранении.
   Создать набор можно: в «＋ Быстро добавить» (строка «Набор: …»), на странице «Игры» → «Наборы»,
   или со страницы самой игры.
   ========================================================= */
(() => {
    const $ = id => document.getElementById(id);

    const KIND_LABEL = { free: '🆓 Бесплатно', gift: '🎁 Подарок', family: '👨‍👩‍👧 Семья', code: '🔑 Активировано кодом' };
    const KIND_PROP = { free: 'priceFree', gift: 'priceGift', family: 'priceFamily', code: 'priceCode' };
    const ALL_FLAGS = ['priceFree', 'priceGift', 'priceFamily', 'priceCode', 'priceBundle', 'priceUnknown', 'psPlus'];

    const bundles = () => { if (!Array.isArray(data.gameBundles)) data.gameBundles = []; return data.gameBundles; };
    const bundleById = id => bundles().find(b => b.id === id);
    const membersOf = id => (data.games || []).filter(g => g.bundleId === id);
    const gameById = id => (data.games || []).find(g => String(g.id) === String(id));

    const priceText = b => KIND_LABEL[b.kind] || (b.unknown || !(Number(b.price) > 0)
        ? 'цена неизвестна' : `${b.approx ? '~' : ''}${Number(b.price)} ₴ за набор`);
    const gamesWord = n => `${n} ${n % 10 === 1 && n % 100 !== 11 ? 'игра' : (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) ? 'игры' : 'игр'}`;

    /* =====================================================
       Пересчёт: цена набора → цены его игр
       ===================================================== */
    function sync() {
        const list = bundles();
        const games = data.games || [];
        const byId = new Map();
        games.forEach(g => {
            if (g.bundleId == null) return;
            if (!byId.has(g.bundleId)) byId.set(g.bundleId, []);
            byId.get(g.bundleId).push(g);
        });
        data.gameBundles = list.filter(b => b && byId.has(b.id));       // набор без игр исчезает
        const alive = new Set(data.gameBundles.map(b => b.id));
        games.forEach(g => { if (g.bundleId != null && !alive.has(g.bundleId)) delete g.bundleId; });

        data.gameBundles.forEach(b => {
            const m = byId.get(b.id).sort((x, y) => (x.id || 0) - (y.id || 0));
            const kind = KIND_PROP[b.kind] ? b.kind : '';
            const total = (b.unknown || kind) ? 0 : Math.max(0, Number(b.price) || 0);
            const scale = Number.isInteger(total) ? 1 : 100;            // целая цена делится целыми — суммы не «плывут»
            const units = Math.round(total * scale);
            const base = Math.floor(units / m.length), rem = units - base * m.length;
            m.forEach((g, idx) => {
                g.price = (base + (idx < rem ? 1 : 0)) / scale;
                ALL_FLAGS.forEach(f => { delete g[f]; });
                if (kind) g[KIND_PROP[kind]] = true;
                else if (b.unknown || total === 0) g.priceUnknown = true;
                if (b.approx && !kind && !b.unknown) g.priceApprox = true; else delete g.priceApprox;
            });
        });
    }
    window.syncGameBundles = sync;

    /* =====================================================
       Окно «Набор»: создать / изменить
       ===================================================== */
    let editId = null;            // id изменяемого набора (null — новый)
    let picked = new Set();       // выбранные игры (строки id)
    let syncPriceInput = () => {};   // блокировка поля цены при «Не помню» / «Подарок» и т.п. (задаётся в buildModal)

    function buildModal() {
        const m = document.createElement('div');
        m.id = 'game-bundle-modal';
        m.className = 'hidden fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[57] p-4';
        m.setAttribute('role', 'dialog');
        m.setAttribute('aria-modal', 'true');
        m.innerHTML = `
        <div class="glass no-hover w-full max-w-md rounded-3xl p-6 space-y-3 max-h-[92vh] overflow-y-auto border border-white/10">
            <div class="flex items-center justify-between">
                <h3 id="gb-title" class="text-xl font-black">📦 Набор</h3>
                <button type="button" class="text-gray-400 hover:text-white p-1" aria-label="Закрыть" onclick="closeModal('game-bundle-modal')">✕</button>
            </div>
            <input id="gb-name" maxlength="80" placeholder="Название набора (например, Сталкер Трилогия)" class="w-full bg-white/5 p-3.5 rounded-xl border border-white/10 text-white text-sm focus:outline-none">
            <div class="grid grid-cols-2 gap-3">
                <input id="gb-price" type="number" min="0" step="any" placeholder="Цена набора ₴" class="w-full bg-white/5 p-3.5 rounded-xl border border-white/10 text-white text-sm focus:outline-none">
                <select id="gb-kind" class="w-full bg-[#0d0d14] p-3.5 rounded-xl border border-white/10 text-white text-sm">
                    <option value="">Обычная цена</option>
                    <option value="gift">🎁 Подарок</option>
                    <option value="family">👨‍👩‍👧 Семья</option>
                    <option value="free">🆓 Бесплатно</option>
                    <option value="code">🔑 Активировано кодом</option>
                </select>
            </div>
            <div class="flex flex-wrap gap-x-5 gap-y-1 text-sm text-gray-300">
                <label class="flex items-center gap-2"><input type="checkbox" id="gb-unknown" class="accent-purple-500"> Не помню цену</label>
                <label class="flex items-center gap-2"><input type="checkbox" id="gb-approx" class="accent-purple-500"> ≈ примерная</label>
            </div>
            <p class="text-[11px] text-gray-500">Цена набора считается в коллекции один раз — она делится между играми внутри набора.</p>
            <input id="gb-search" type="search" placeholder="🔍 Найти игру…" class="w-full bg-white/5 p-3 rounded-xl border border-white/10 text-white text-sm focus:outline-none">
            <div id="gb-list" class="max-h-56 overflow-y-auto space-y-1 pr-1"></div>
            <p id="gb-picked" class="text-xs text-gray-400"></p>
            <div class="flex gap-2">
                <button type="button" id="gb-cancel" class="flex-1 bg-white/10 hover:bg-white/15 py-3 rounded-xl text-sm font-bold">Отмена</button>
                <button type="button" id="gb-save" class="flex-1 bg-purple-600 hover:bg-purple-500 py-3 rounded-xl font-bold text-white">Сохранить набор</button>
            </div>
        </div>`;
        document.body.appendChild(m);

        m.querySelector('#gb-cancel').onclick = () => closeModal('game-bundle-modal');
        m.querySelector('#gb-save').onclick = saveModal;
        m.querySelector('#gb-search').addEventListener('input', renderPickList);
        m.querySelector('#gb-list').addEventListener('change', e => {
            const cb = e.target.closest('input[data-gid]');
            if (!cb) return;
            cb.checked ? picked.add(cb.dataset.gid) : picked.delete(cb.dataset.gid);
            updatePickedText();
        });
        syncPriceInput = () => {
            const off = $('gb-unknown').checked || !!$('gb-kind').value;
            const price = $('gb-price');
            price.disabled = off;
            if (off) price.value = '';
            if (off) $('gb-approx').checked = false;
            $('gb-approx').disabled = off;
        };
        $('gb-unknown').addEventListener('change', () => { if ($('gb-unknown').checked) $('gb-kind').value = ''; syncPriceInput(); });
        $('gb-kind').addEventListener('change', () => { if ($('gb-kind').value) $('gb-unknown').checked = false; syncPriceInput(); });
    }

    function updatePickedText() {
        const el = $('gb-picked');
        if (el) el.textContent = picked.size ? `Выбрано: ${gamesWord(picked.size)}` : 'Отметьте игры, которые входят в набор';
    }

    function renderPickList() {
        const q = ($('gb-search').value || '').trim().toLowerCase();
        const games = [...(data.games || [])].sort((a, b) => (a.title || '').localeCompare(b.title || '', 'ru'));
        const rows = games
            .filter(g => picked.has(String(g.id)) || !q || (g.title || '').toLowerCase().includes(q) || (g.platform || '').toLowerCase().includes(q))
            .map(g => {
                const other = g.bundleId != null && g.bundleId !== editId ? bundleById(g.bundleId) : null;
                return `<label class="flex items-center gap-2 p-2 rounded-lg text-sm ${other ? 'opacity-50' : 'hover:bg-white/5 cursor-pointer'}">
                    <input type="checkbox" class="accent-purple-500" data-gid="${esc(g.id)}"${picked.has(String(g.id)) ? ' checked' : ''}${other ? ' disabled' : ''}>
                    <span class="truncate flex-1">${esc(g.title)}</span>
                    <span class="text-[10px] text-gray-500 shrink-0">${other ? 'в наборе «' + esc(other.name) + '»' : esc(g.platform || '')}</span></label>`;
            }).join('');
        $('gb-list').innerHTML = rows || '<p class="text-xs text-gray-500 italic p-2">Игры не найдены. Сначала добавьте игры в коллекцию.</p>';
        updatePickedText();
    }

    function openModal(id, preselect = []) {
        editId = id == null ? null : id;
        const b = editId != null ? bundleById(editId) : null;
        picked = new Set(b ? membersOf(b.id).map(g => String(g.id)) : preselect.map(String));
        $('gb-title').textContent = b ? '📦 Изменить набор' : '📦 Новый набор';
        $('gb-name').value = b ? b.name : '';
        $('gb-kind').value = b && KIND_PROP[b.kind] ? b.kind : '';
        $('gb-unknown').checked = !!(b && b.unknown && !b.kind);
        $('gb-approx').checked = !!(b && b.approx);
        $('gb-price').value = b && !b.unknown && !b.kind && Number(b.price) > 0 ? b.price : '';
        $('gb-search').value = '';
        syncPriceInput();
        renderPickList();
        $('game-bundle-modal').classList.remove('hidden');
        $('gb-name').focus();
    }
    window.openGameBundleModal = openModal;

    function saveModal() {
        const name = $('gb-name').value.trim();
        if (!name) { showToast('Дайте набору название', 'error'); $('gb-name').focus(); return; }
        if (!picked.size) { showToast('Отметьте хотя бы одну игру набора', 'error'); return; }
        const kind = $('gb-kind').value;
        const price = Math.max(0, parseFloat($('gb-price').value) || 0);
        const unknown = !kind && ($('gb-unknown').checked || !price);
        let b = editId != null ? bundleById(editId) : null;
        if (!b) { b = { id: Date.now() }; bundles().push(b); }
        Object.assign(b, { name, kind, unknown, price: kind || unknown ? 0 : price, approx: !kind && !unknown && $('gb-approx').checked });

        (data.games || []).forEach(g => {
            const on = picked.has(String(g.id));
            if (on) g.bundleId = b.id;
            else if (g.bundleId === b.id) delete g.bundleId;       // игра осталась с той ценой, что досталась ей от набора
        });
        closeModal('game-bundle-modal');
        sync();
        save();
        showToast(`Набор «${esc(name)}» сохранён`, 'success');
        refreshDetail();
    }

    function removeFromBundle(gid) {
        const g = gameById(gid);
        if (!g) return;
        delete g.bundleId;
        save();
        refreshDetail();
    }

    function dissolve(id) {
        const b = bundleById(id);
        if (!b || !confirm(`Распустить набор «${b.name}»?\n\nИгры останутся в коллекции и сохранят цены, которые им досталась от набора.`)) return;
        membersOf(id).forEach(g => { delete g.bundleId; });
        save();
        refreshDetail();
    }

    function openGame(gid) {
        const g = gameById(gid);
        if (!g) return;
        if (typeof window.openGameDetail === 'function') { window.openGameDetail(g.id); return; }
        const q = $('search-games');
        if (q) { q.value = g.title || ''; updateUI(); }
    }

    /* =====================================================
       Панель «Наборы» на странице игр
       ===================================================== */
    let rootOpen = false, lastPanel = '';

    function platTag(g) { return `<span class="gb-plat">${esc(g.platform || '')}</span>`; }

    function panelHTML() {
        const sets = bundles();
        const inSets = sets.reduce((n, b) => n + membersOf(b.id).length, 0);
        const body = sets.map(b => {
            const m = membersOf(b.id).sort((x, y) => (x.title || '').localeCompare(y.title || '', 'ru'));
            return `<div class="gb-set">
                <div class="gb-set-head">
                    <div class="min-w-0"><b class="gb-name">📦 ${esc(b.name)}</b>
                        <span class="gd-chip">${esc(priceText(b))}</span><span class="gd-chip">${gamesWord(m.length)}</span></div>
                    <div class="gb-actions">
                        <button type="button" class="gd-tool" data-gb="edit" data-id="${esc(b.id)}" aria-label="Изменить набор">✏️</button>
                        <button type="button" class="gd-tool is-danger" data-gb="dissolve" data-id="${esc(b.id)}" aria-label="Распустить набор">🗑</button>
                    </div>
                </div>
                <ul class="gb-games">${m.map(g => `<li>
                    <button type="button" class="gb-open" data-gb="open" data-gid="${esc(g.id)}">${esc(g.title)}</button>${platTag(g)}
                    <button type="button" class="gb-x" data-gb="remove" data-gid="${esc(g.id)}" aria-label="Убрать из набора" title="Убрать из набора">✕</button></li>`).join('')}</ul>
            </div>`;
        }).join('');
        return `<details class="gb-root"${rootOpen ? ' open' : ''}>
            <summary class="gb-sum"><span>📦 Наборы</span><span class="gd-chip">${sets.length}</span>
                <span class="gb-hint">${sets.length ? `игр в наборах: ${inSets}` : 'несколько игр с одной общей ценой'}</span></summary>
            <div class="gb-body">
                ${body || '<p class="gb-empty">Наборов пока нет. Их можно добавить списком в «＋ Быстро добавить»: строка «Набор: Название платформа, цена», ниже игры набора.</p>'}
                <button type="button" class="gd-tool" data-gb="new">＋ Новый набор</button>
            </div>
        </details>`;
    }

    function ensurePanel() {
        let el = $('game-bundles-panel');
        if (el && el.isConnected) return el;
        const anchor = $('game-platform-filters') || $('games-grid');
        if (!anchor || !anchor.parentElement) return null;
        el = document.createElement('div');
        el.id = 'game-bundles-panel';
        el.className = 'gb-panel';
        anchor.parentElement.insertBefore(el, anchor);
        el.addEventListener('toggle', e => { if (e.target.classList.contains('gb-root')) rootOpen = e.target.open; }, true);
        el.addEventListener('click', e => {
            const b = e.target.closest('[data-gb]');
            if (!b) return;
            const act = b.dataset.gb;
            if (act === 'new') openModal(null);
            else if (act === 'edit') openModal(Number(b.dataset.id));
            else if (act === 'dissolve') dissolve(Number(b.dataset.id));
            else if (act === 'remove') removeFromBundle(b.dataset.gid);
            else if (act === 'open') openGame(b.dataset.gid);
        });
        lastPanel = '';
        return el;
    }

    function renderPanel() {
        const el = ensurePanel();
        if (!el) return;
        const html = panelHTML();
        if (html === lastPanel && el.firstChild) return;     // не перерисовываем зря — раскрытая панель не схлопнется
        lastPanel = html;
        el.innerHTML = html;
    }

    /* =====================================================
       Блок «Набор» на странице игры
       ===================================================== */
    function detailBlock(g) {
        const b = g.bundleId != null ? bundleById(g.bundleId) : null;
        if (b) {
            const m = membersOf(b.id).sort((x, y) => (x.title || '').localeCompare(y.title || '', 'ru'));
            return `<p class="gd-sec-title">Набор</p>
                <div class="flex flex-wrap items-center gap-2">
                    <span class="gd-chip is-online">📦 ${esc(b.name)}</span><span class="gd-chip">${esc(priceText(b))}</span>
                    <button type="button" class="gd-tool" data-gb="edit" data-id="${esc(b.id)}">✏️ Изменить набор</button>
                    <button type="button" class="gd-tool" data-gb="remove" data-gid="${esc(g.id)}">Убрать игру из набора</button>
                </div>
                <p class="text-xs text-gray-500 mt-3 mb-1.5">В набор входят (${m.length}):</p>
                <div class="flex flex-wrap gap-2">${m.map(x => x.id === g.id
                    ? `<span class="gd-chip is-ok">${esc(x.title)} · эта игра</span>`
                    : `<button type="button" class="gd-chip gb-chip-btn" data-gb="open" data-gid="${esc(x.id)}">${esc(x.title)}</button>`).join('')}</div>`;
        }
        const sets = bundles();
        return `<p class="gd-sec-title">Набор <span class="normal-case tracking-normal font-semibold text-gray-600">· необязательно</span></p>
            <div class="flex flex-wrap items-center gap-2">
                <button type="button" class="gd-tool" data-gb="new-with" data-gid="${esc(g.id)}">📦 Создать набор с этой игрой</button>
                ${sets.length ? `<select id="gb-detail-pick" class="gd-input !w-auto" aria-label="Добавить в набор">
                    <option value="">Добавить в набор…</option>${sets.map(s => `<option value="${esc(s.id)}">${esc(s.name)}</option>`).join('')}</select>` : ''}
            </div>`;
    }

    function decorateDetail() {
        const modal = $('game-detail-modal');
        if (!modal || modal.classList.contains('hidden')) return;
        const body = modal.querySelector('#gd-body') || modal;
        if (body.querySelector('#gb-detail')) return;
        const share = body.querySelector('[data-act="share"][data-id]');
        const anchor = body.querySelector('.gd-sec');
        const g = share && gameById(share.dataset.id);
        if (!g || !anchor) return;
        const sec = document.createElement('div');
        sec.id = 'gb-detail';
        sec.className = 'gd-sec mt-5';
        sec.innerHTML = detailBlock(g);
        sec.addEventListener('click', e => {
            const b = e.target.closest('[data-gb]');
            if (!b) return;
            const act = b.dataset.gb;
            if (act === 'edit') openModal(Number(b.dataset.id));
            else if (act === 'remove') removeFromBundle(b.dataset.gid);
            else if (act === 'open') openGame(b.dataset.gid);
            else if (act === 'new-with') openModal(null, [b.dataset.gid]);
        });
        sec.addEventListener('change', e => {
            if (e.target.id !== 'gb-detail-pick' || !e.target.value) return;
            g.bundleId = Number(e.target.value);
            save();
            refreshDetail();
        });
        anchor.insertAdjacentElement('beforebegin', sec);
    }

    function refreshDetail() {
        $('gb-detail')?.remove();
        decorateDetail();
    }

    /* =====================================================
       Стили и подключение
       ===================================================== */
    function addStyles() {
        const st = document.createElement('style');
        st.textContent = `
        .gb-panel { margin-bottom: 1.25rem; }
        .gb-root { border-radius: 1rem; background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.08); padding: .7rem 1rem; }
        .gb-sum { cursor: pointer; display: flex; flex-wrap: wrap; align-items: center; gap: .6rem; font-weight: 800; font-size: .85rem; list-style: none; }
        .gb-sum::-webkit-details-marker { display: none; }
        .gb-hint { color: #6b7280; font-weight: 600; font-size: .75rem; }
        .gb-body { margin-top: .8rem; display: grid; gap: .6rem; }
        .gb-empty { color: #6b7280; font-size: .8rem; font-style: italic; }
        .gb-set { padding: .7rem .8rem; border-radius: .9rem; background: rgba(139,92,246,.08); border: 1px solid rgba(139,92,246,.22); }
        .gb-set-head { display: flex; justify-content: space-between; align-items: flex-start; gap: .6rem; flex-wrap: wrap; }
        .gb-set-head .gd-chip { margin-left: .4rem; }
        .gb-name { font-size: .9rem; }
        .gb-actions { display: flex; gap: .4rem; flex-shrink: 0; }
        .gb-games { list-style: none; margin: .55rem 0 0; padding: 0; display: grid; gap: .25rem; }
        .gb-games li { display: flex; align-items: center; gap: .5rem; font-size: .8rem; }
        .gb-open { text-align: left; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #e5e7eb; }
        .gb-open:hover, .gb-chip-btn:hover { color: #fff; text-decoration: underline; }
        .gb-plat { font-size: .65rem; color: #6b7280; flex-shrink: 0; }
        .gb-x { margin-left: auto; color: #9ca3af; font-size: .7rem; padding: .1rem .35rem; border-radius: .4rem; }
        .gb-x:hover { color: #fca5a5; background: rgba(239,68,68,.15); }
        .gb-chip-btn { cursor: pointer; }
        `;
        document.head.appendChild(st);
    }

    // пересчёт цен при каждом сохранении (persistData вызывают save(), быстрое добавление, формы игр…)
    if (typeof persistData === 'function') {
        const persistBase = persistData;
        persistData = function (...args) {
            try { sync(); } catch (e) { console.warn('[MIRVEL] наборы: пересчёт не удался', e); }
            return persistBase.apply(this, args);
        };
    }

    const renderAllBase = renderAll;
    renderAll = function () {
        try { sync(); } catch (e) { console.warn('[MIRVEL] наборы: пересчёт не удался', e); }
        renderAllBase();
        try { renderPanel(); decorateDetail(); } catch (e) { console.warn('[MIRVEL] наборы: панель не отрисована', e); }
    };

    addStyles();
    buildModal();

    // страница игры перерисовывается сама (смена статуса, оценки…) — возвращаем блок «Набор»
    const dm = $('game-detail-modal');
    if (dm) new MutationObserver(() => decorateDetail()).observe(dm, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });

    updateUI();
})();
