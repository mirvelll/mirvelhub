/* =========================================================
   MIRVEL HUB — 19-features.js (подключать после 18-hub2.js)
   7. Окна всегда открываются сверху (раньше помнили прокрутку)
   8. Коллекции игр: «FNAF», «Resident Evil»… у игры может быть несколько коллекций
        data.gameCollections = [{ id, name }]      game.collections = [id, …]
   9. Аватарки артистов: data.artistAvatars = { 'имя артиста в нижнем регистре': 'data:image/jpeg…' }
   ========================================================= */
(() => {
    const $ = id => document.getElementById(id);
    const lc = s => String(s ?? '').trim().toLowerCase();

    /* данные могут подмениться (импорт, другая вкладка) — поэтому проверяем при каждом обращении */
    function ensure() {
        if (!Array.isArray(data.gameCollections)) data.gameCollections = [];
        if (!data.artistAvatars || typeof data.artistAvatars !== 'object' || Array.isArray(data.artistAvatars)) data.artistAvatars = {};
    }

    /* =====================================================
       7. Окна открываются сверху
       ===================================================== */
    const OVERLAYS = '[id="modal"], [id$="-modal"], #command-palette';
    const wasOpen = new WeakMap();

    function scrollToTop(m) {
        const go = () => {
            m.scrollTop = 0;
            m.querySelectorAll('*').forEach(el => { if (el.scrollTop) el.scrollTop = 0; });
        };
        go();
        requestAnimationFrame(go); // ещё раз — когда окно уже отрисовано
    }

    new MutationObserver(muts => {
        for (const mu of muts) {
            const m = mu.target;
            if (!(m instanceof Element) || !m.matches(OVERLAYS)) continue;
            const open = !m.classList.contains('hidden');
            const prev = wasOpen.get(m) || false;
            wasOpen.set(m, open);
            if (open && !prev) scrollToTop(m);
        }
    }).observe(document.body, { subtree: true, attributes: true, attributeFilter: ['class'] });

    /* =====================================================
       8. Коллекции игр
       ===================================================== */
    let colSel = '';            // выбранная коллекция на странице игр ('' — все, 'none' — без коллекции)
    let formSel = new Set();    // коллекции, отмеченные в форме игры
    let pickId = null;          // игра, для которой открыто окно «В какие коллекции»

    const gameById = id => (data.games || []).find(x => x.id === Number(id));
    const itemCols = g => (Array.isArray(g?.collections) ? g.collections : []);
    const colList = () => { ensure(); return data.gameCollections; };
    const colById = id => colList().find(c => c.id === id);
    const colCount = id => (data.games || []).filter(g => itemCols(g).includes(id)).length;

    function addCollection(name) {
        name = String(name || '').trim().slice(0, 40);
        if (!name) return null;
        const ex = colList().find(c => lc(c.name) === lc(name));
        if (ex) return ex;
        const c = { id: 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), name };
        data.gameCollections.push(c);
        return c;
    }

    function deleteCollection(id) {
        const c = colById(id);
        if (!c) return;
        if (!confirm(`Удалить коллекцию «${c.name}»?\nИгры останутся в библиотеке — пропадёт только эта группировка.`)) return;
        data.gameCollections = colList().filter(x => x.id !== id);
        (data.games || []).forEach(g => { if (Array.isArray(g.collections)) g.collections = g.collections.filter(x => x !== id); });
        if (colSel === id) colSel = '';
        formSel.delete(id);
        save();
        renderManage();
        renderFormChips();
    }

    const chipBtns = selected => colList().map(c =>
        `<button type="button" class="col-chip${selected.has(c.id) ? ' is-on' : ''}" data-cid="${esc(c.id)}" aria-pressed="${selected.has(c.id)}">📁 ${esc(c.name)}</button>`
    ).join('') || '<span class="text-xs text-gray-500 italic">Коллекций пока нет — создайте первую ниже</span>';

    /* ---------- Панель коллекций над списком игр ---------- */
    function ensureBar() {
        let bar = $('game-collections-bar');
        if (bar) return bar;
        const anchor = $('game-strip') || $('game-platform-filters');
        if (!anchor) return null;
        bar = document.createElement('div');
        bar.id = 'game-collections-bar';
        bar.className = 'col-bar';
        anchor.insertAdjacentElement('beforebegin', bar);
        bar.addEventListener('click', e => {
            if (e.target.closest('[data-col-manage]')) { openManage(); return; }
            const b = e.target.closest('[data-col]');
            if (!b) return;
            colSel = b.getAttribute('data-col');
            updateUI();
        });
        return bar;
    }

    function paintBar() {
        const bar = ensureBar();
        if (!bar) return;
        const all = data.games || [];
        const cols = colList();
        const loose = all.filter(g => !itemCols(g).some(id => colById(id))).length;
        const chip = (val, label, n) =>
            `<button type="button" class="gf-chip${colSel === val ? ' is-on' : ''}" data-col="${esc(val)}">${label} <span class="gp-count">${n}</span></button>`;
        bar.innerHTML = `<span class="gf-label">Коллекции</span>` +
            chip('', 'Все', all.length) +
            cols.map(c => chip(c.id, '📁 ' + esc(c.name), colCount(c.id))).join('') +
            (cols.length && loose ? chip('none', 'Без коллекции', loose) : '') +
            `<button type="button" class="gf-chip is-manage" data-col-manage>${cols.length ? '⚙ Управлять' : '＋ Создать коллекцию'}</button>`;
    }

    /* ---------- Кнопка 📁 и метки на карточках ---------- */
    function decorateCards() {
        const grid = $('games-grid');
        if (!grid) return;
        if (!grid.dataset.colBound) {
            grid.dataset.colBound = '1';
            grid.addEventListener('click', e => {
                const b = e.target.closest('[data-act="collect"]');
                const card = b?.closest('[data-gid]');
                if (card) openPicker(Number(card.dataset.gid));
            });
        }
        grid.querySelectorAll('[data-gid]').forEach(card => {
            if (card.querySelector('[data-act="collect"]')) return;
            const g = gameById(card.dataset.gid);
            if (!g) return;
            const edit = card.querySelector('[data-act="edit"]');
            if (edit) {
                const b = document.createElement('button');
                b.type = 'button';
                b.dataset.act = 'collect';
                b.className = 'col-btn';
                b.textContent = '📁';
                b.title = 'Коллекции';
                b.setAttribute('aria-label', 'Коллекции');
                edit.parentElement.insertBefore(b, edit);
            }
            const names = itemCols(g).map(colById).filter(Boolean);
            const main = card.querySelector(':scope > .flex .min-w-0.flex-1');
            if (names.length && main) {
                const t = document.createElement('div');
                t.className = 'col-tags';
                t.innerHTML = names.slice(0, 3).map(c => `<span class="col-tag" title="${esc(c.name)}">📁 ${esc(c.name)}</span>`).join('') +
                    (names.length > 3 ? `<span class="col-tag">+${names.length - 3}</span>` : '');
                main.appendChild(t);
            }
        });
    }

    /* Фильтр по коллекции: на время отрисовки подставляем в data.games только нужные игры —
       заодно полоса бэклога и счётчики фильтров показывают цифры именно по этой коллекции. */
    const renderGamesBase = renderGames;
    renderGames = function () {
        ensure();
        if (colSel && colSel !== 'none' && !colById(colSel)) colSel = '';
        const real = data.games;
        const filtered = colSel
            ? real.filter(g => colSel === 'none' ? !itemCols(g).some(id => colById(id)) : itemCols(g).includes(colSel))
            : null;
        try {
            if (filtered) data.games = filtered;
            renderGamesBase();
        } finally {
            data.games = real;
        }
        if ($('games')?.classList.contains('hidden')) return;
        paintBar();
        if (filtered && !filtered.length && $('games-grid')) {
            $('games-grid').innerHTML = `<div class="col-span-full glass no-hover rounded-3xl p-12 text-center text-gray-500 italic">В этой коллекции пока пусто. Добавьте игры кнопкой 📁 на карточке или в форме игры.</div>`;
        }
        decorateCards();
    };

    /* ---------- Окно «В какие коллекции добавить игру» ---------- */
    function buildPicker() {
        const m = document.createElement('div');
        m.id = 'game-collect-modal';
        m.className = 'hidden fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[58] p-4';
        m.setAttribute('role', 'dialog');
        m.setAttribute('aria-modal', 'true');
        m.innerHTML = `
        <div class="glass no-hover w-full max-w-md rounded-3xl p-6 space-y-4">
            <h3 id="gc-title" class="text-lg font-black truncate">Коллекции</h3>
            <p class="text-sm text-gray-400">Нажмите на коллекцию, чтобы добавить или убрать игру. Одна игра может быть в нескольких.</p>
            <div id="gc-list" class="flex flex-wrap gap-2"></div>
            <div class="flex gap-2">
                <input id="gc-new" maxlength="40" placeholder="Новая коллекция (FNAF, Resident Evil…)" class="w-full bg-white/5 p-3 rounded-xl border border-white/10 text-white text-sm">
                <button type="button" id="gc-add" class="gd-tool">＋</button>
            </div>
            <div class="flex gap-2">
                <button type="button" id="gc-manage" class="flex-1 bg-white/10 hover:bg-white/15 py-3 rounded-xl text-sm font-bold">⚙ Управлять</button>
                <button type="button" class="flex-1 bg-purple-600 hover:bg-purple-500 py-3 rounded-xl font-bold text-white btn-neon" onclick="closeModal('game-collect-modal')">Готово</button>
            </div>
        </div>`;
        document.body.appendChild(m);

        m.querySelector('#gc-list').addEventListener('click', e => {
            const b = e.target.closest('[data-cid]');
            const g = gameById(pickId);
            if (!b || !g) return;
            const set = new Set(itemCols(g));
            set.has(b.dataset.cid) ? set.delete(b.dataset.cid) : set.add(b.dataset.cid);
            g.collections = [...set];
            save();
            renderPicker();
        });
        const add = () => {
            const g = gameById(pickId);
            const c = addCollection($('gc-new').value);
            if (!c || !g) return;
            g.collections = [...new Set([...itemCols(g), c.id])];
            $('gc-new').value = '';
            save();
            renderPicker();
        };
        m.querySelector('#gc-add').onclick = add;
        m.querySelector('#gc-new').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); add(); } });
        m.querySelector('#gc-manage').onclick = () => { closeModal('game-collect-modal'); openManage(); };
    }

    function renderPicker() {
        const g = gameById(pickId);
        if (!g) return;
        $('gc-title').textContent = `📁 ${g.title}`;
        $('gc-list').innerHTML = chipBtns(new Set(itemCols(g)));
    }

    function openPicker(id) {
        if (!gameById(id)) return;
        pickId = id;
        renderPicker();
        $('game-collect-modal').classList.remove('hidden');
        $('gc-new').focus();
    }

    /* ---------- Окно «Управление коллекциями» ---------- */
    function buildManage() {
        const m = document.createElement('div');
        m.id = 'collections-modal';
        m.className = 'hidden fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[58] p-4';
        m.setAttribute('role', 'dialog');
        m.setAttribute('aria-modal', 'true');
        m.innerHTML = `
        <div class="glass no-hover w-full max-w-md rounded-3xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 class="text-lg font-black">📁 Коллекции игр</h3>
            <div class="flex gap-2">
                <input id="cm-new" maxlength="40" placeholder="Название новой коллекции…" class="w-full bg-white/5 p-3 rounded-xl border border-white/10 text-white text-sm">
                <button type="button" id="cm-add" class="gd-tool">＋ Создать</button>
            </div>
            <div id="cm-list" class="space-y-2"></div>
            <p class="text-[11px] text-gray-500">Игры добавляются в коллекции кнопкой 📁 на карточке или в форме игры. Переименовать — измените название и нажмите Enter.</p>
            <button type="button" class="w-full bg-white/10 hover:bg-white/15 py-3 rounded-xl text-sm font-bold" onclick="closeModal('collections-modal')">Закрыть</button>
        </div>`;
        document.body.appendChild(m);

        const add = () => {
            const c = addCollection($('cm-new').value);
            if (!c) return;
            $('cm-new').value = '';
            save();
            renderManage();
            renderFormChips();
        };
        m.querySelector('#cm-add').onclick = add;
        m.querySelector('#cm-new').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); add(); } });
        m.querySelector('#cm-list').addEventListener('click', e => {
            const d = e.target.closest('.col-del');
            if (d) deleteCollection(d.closest('[data-row]').dataset.row);
        });
        m.querySelector('#cm-list').addEventListener('change', e => {
            const row = e.target.closest('[data-row]');
            const c = row && colById(row.dataset.row);
            if (!c || !e.target.matches('input')) return;
            const name = e.target.value.trim().slice(0, 40);
            const dup = colList().some(x => x.id !== c.id && lc(x.name) === lc(name));
            if (!name || dup) { e.target.value = c.name; if (dup) showToast('Коллекция с таким названием уже есть'); return; }
            c.name = name;
            save();
            renderFormChips();
        });
        m.querySelector('#cm-list').addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.matches('input')) e.target.blur(); });
    }

    function renderManage() {
        const box = $('cm-list');
        if (!box) return;
        box.innerHTML = colList().map(c =>
            `<div class="col-row" data-row="${esc(c.id)}"><span aria-hidden="true">📁</span><input value="${esc(c.name)}" maxlength="40" aria-label="Название коллекции">
             <span class="col-n">${colCount(c.id)} игр</span><button type="button" class="col-del" aria-label="Удалить коллекцию" title="Удалить коллекцию">✕</button></div>`
        ).join('') || '<p class="text-xs text-gray-500 italic py-2">Коллекций пока нет. Например: «FNAF», «Resident Evil», «Любимые на ночь».</p>';
    }

    function openManage() {
        renderManage();
        $('collections-modal').classList.remove('hidden');
        $('cm-new').focus();
    }

    /* ---------- Коллекции в форме игры ---------- */
    function renderFormChips() {
        const box = $('gx-col-chips');
        if (box) box.innerHTML = chipBtns(formSel);
    }

    function buildFormBlock() {
        if ($('gx-collections')) return;
        const anchor = $('gx-block');
        if (!anchor) return;
        const box = document.createElement('div');
        box.id = 'gx-collections';
        box.innerHTML = `
            <label class="text-[10px] text-gray-400 font-bold block uppercase mb-1.5">Коллекции</label>
            <div id="gx-col-chips" class="flex flex-wrap gap-2"></div>
            <div class="flex gap-2 mt-2">
                <input id="gx-col-new" maxlength="40" placeholder="Новая коллекция…" class="w-full bg-white/5 p-2.5 rounded-xl border border-white/10 text-white text-sm">
                <button type="button" id="gx-col-add" class="gd-tool">＋</button>
            </div>`;
        anchor.insertAdjacentElement('afterend', box);

        box.querySelector('#gx-col-chips').addEventListener('click', e => {
            const b = e.target.closest('[data-cid]');
            if (!b) return;
            formSel.has(b.dataset.cid) ? formSel.delete(b.dataset.cid) : formSel.add(b.dataset.cid);
            renderFormChips();
        });
        const add = () => {
            const c = addCollection($('gx-col-new').value);
            if (!c) return;
            formSel.add(c.id);
            $('gx-col-new').value = '';
            persistData();
            renderFormChips();
            updateUI();
        };
        box.querySelector('#gx-col-add').onclick = add;
        box.querySelector('#gx-col-new').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); add(); } });
    }

    const openGameBase = window.openGameModal;
    window.openGameModal = (id = null) => {
        openGameBase(id);
        ensure();
        const item = id ? gameById(id) : null;
        formSel = new Set(itemCols(item).filter(colById));
        renderFormChips();
    };

    const saveGameBase = window.saveGameItem;
    window.saveGameItem = async (...args) => {
        ensure();
        const editId = Number($('game-edit-id').value) || null;
        const before = new Set((data.games || []).map(x => x.id));
        const sel = [...formSel];
        await saveGameBase(...args);
        const item = editId ? gameById(editId) : (data.games || []).find(x => !before.has(x.id));
        // форма осталась открытой — сохранение не прошло (например, нет названия)
        if (!item || !$('game-modal').classList.contains('hidden')) return;
        item.collections = sel.filter(colById);
        persistData();
        updateUI();
    };

    /* =====================================================
       9. Аватарки артистов
       ===================================================== */
    const avatarOf = name => {
        ensure();
        const v = data.artistAvatars[lc(name)];
        return typeof v === 'string' && /^data:image\//i.test(v) ? v : '';
    };

    /** Файл → квадратная JPEG-миниатюра (обрезка по центру), ~5–12 КБ — localStorage не забивается */
    function cropSquare(file, size = 160) {
        return new Promise((resolve, reject) => {
            const r = new FileReader();
            r.onerror = () => reject(r.error);
            r.onload = () => {
                const img = new Image();
                img.onerror = () => reject(new Error('bad image'));
                img.onload = () => {
                    const side = Math.min(img.width, img.height);
                    const c = document.createElement('canvas');
                    c.width = c.height = size;
                    const ctx = c.getContext('2d');
                    ctx.fillStyle = '#0d0d14';
                    ctx.fillRect(0, 0, size, size);
                    ctx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, size, size);
                    resolve(c.toDataURL('image/jpeg', 0.82));
                };
                img.src = r.result;
            };
            r.readAsDataURL(file);
        });
    }

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.className = 'hidden';
    document.body.appendChild(fileInput);
    let onFile = null;
    fileInput.addEventListener('change', async () => {
        const f = fileInput.files[0];
        fileInput.value = '';
        if (!f || !onFile) return;
        try { onFile(await cropSquare(f)); }
        catch (e) { showToast('Не удалось прочитать картинку', 'error'); }
    });
    const pickPhoto = cb => { onFile = cb; fileInput.click(); };

    function paintAva(el, name, src = avatarOf(name)) {
        if (src) {
            el.classList.add('has-img');
            el.innerHTML = `<img src="${esc(src)}" alt="">`;
        } else {
            el.classList.remove('has-img');
            el.textContent = (String(name || '').trim()[0] || '🎤').toUpperCase();
        }
    }

    /* ---------- Список артистов на главной ---------- */
    function paintArtistList() {
        document.querySelectorAll('#artist-stats-grid .art-row[data-art]').forEach(row => {
            const ava = row.querySelector('.hx-ava');
            const src = avatarOf(row.dataset.art);
            if (ava && src) paintAva(ava, row.dataset.art, src);
        });
    }

    // сортировка / поиск / «Показать всех» перерисовывают список мимо renderAll — докрашиваем аватарки сами
    const artGrid = $('artist-stats-grid');
    if (artGrid) new MutationObserver(() => { try { paintArtistList(); } catch (e) {} }).observe(artGrid, { childList: true });

    const renderAllBase = renderAll;
    renderAll = function () {
        renderAllBase();
        try { paintArtistList(); } catch (e) { console.warn('[MIRVEL] avatars:', e); }
    };

    /* ---------- Окно артиста: загрузить / убрать фото ---------- */
    let curArtist = '';
    function setAvatar(name, src) {
        ensure();
        const key = lc(name);
        const prev = data.artistAvatars[key];
        if (src) data.artistAvatars[key] = src; else delete data.artistAvatars[key];
        if (!persistData()) { // память заполнена — откатываем
            if (prev) data.artistAvatars[key] = prev; else delete data.artistAvatars[key];
            return false;
        }
        updateUI();
        return true;
    }

    function ensureArtistCtl() {
        let ctl = $('artist-ava-ctl');
        if (ctl) return ctl;
        const h = $('artist-stats-title');
        if (!h) return null;
        ctl = document.createElement('div');
        ctl.id = 'artist-ava-ctl';
        h.insertAdjacentElement('afterend', ctl);
        ctl.addEventListener('click', e => {
            if (e.target.closest('[data-ava-set]')) {
                const name = curArtist;
                pickPhoto(src => { if (setAvatar(name, src)) { showToast('Фото артиста сохранено 📷', 'success'); window.showArtistStats(name); } });
            } else if (e.target.closest('[data-ava-del]')) {
                if (setAvatar(curArtist, '')) window.showArtistStats(curArtist);
            }
        });
        return ctl;
    }

    const showArtistBase = window.showArtistStats;
    window.showArtistStats = name => {
        showArtistBase(name);
        try {
            curArtist = name;
            const src = avatarOf(name);
            const ava = $('artist-stats-title')?.querySelector('.hx-ava');
            if (ava && src) paintAva(ava, name, src);
            const ctl = ensureArtistCtl();
            if (ctl) ctl.innerHTML = `<button type="button" class="gd-tool" data-ava-set>📷 ${src ? 'Сменить фото' : 'Добавить фото'}</button>` +
                (src ? `<button type="button" class="gd-tool is-danger" data-ava-del>Убрать</button>` : '');
        } catch (e) { console.warn('[MIRVEL] artist modal avatar:', e); }
    };

    /* ---------- Фото артиста прямо в форме релиза ---------- */
    let pendAva = '';       // выбранное, но ещё не сохранённое фото
    let pendClear = false;  // «Убрать» нажато — удалить при сохранении

    function paintFormAva() {
        const row = $('aa-row');
        if (!row) return;
        const name = $('item-artist').value;
        const src = pendAva || (pendClear ? '' : avatarOf(name));
        paintAva($('aa-prev'), name, src);
        $('aa-prev').style.setProperty('--h', [...String(name)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 360, 7));
        $('aa-clear').classList.toggle('hidden', !src);
        $('aa-pick').textContent = src ? '📷 Сменить фото артиста' : '📷 Фото артиста';
        $('aa-note').textContent = pendAva ? 'Сохранится вместе с релизом' : pendClear ? 'Фото будет удалено при сохранении' : '';
    }

    function buildFormAva() {
        const input = $('item-artist');
        if (!input || $('aa-row')) return;
        const row = document.createElement('div');
        row.id = 'aa-row';
        row.className = 'aa-row';
        row.innerHTML = `<span id="aa-prev" class="hx-ava" aria-hidden="true"></span>
            <button type="button" id="aa-pick" class="gd-tool">📷 Фото артиста</button>
            <button type="button" id="aa-clear" class="gd-tool is-danger hidden">Убрать</button>
            <small id="aa-note"></small>`;
        input.insertAdjacentElement('afterend', row);
        input.addEventListener('input', paintFormAva);
        $('aa-pick').onclick = () => pickPhoto(src => { pendAva = src; pendClear = false; paintFormAva(); });
        $('aa-clear').onclick = () => { pendAva = ''; pendClear = true; paintFormAva(); };
    }

    const openItemBase = window.openModal;
    window.openModal = (type, id = null) => {
        openItemBase(type, id);
        pendAva = '';
        pendClear = false;
        paintFormAva();
    };

    const saveItemBase = window.saveItem;
    window.saveItem = async (...args) => {
        const artist = $('item-artist').value.trim();
        const photo = pendAva, clear = pendClear;
        await saveItemBase(...args);
        // форма осталась открытой — сохранение не прошло
        if (!$('modal').classList.contains('hidden') || !artist) return;
        if (photo) { if (setAvatar(artist, photo)) pendAva = ''; }
        else if (clear && avatarOf(artist)) { setAvatar(artist, ''); pendClear = false; }
    };

    /* =====================================================
       12. Избранное на главной: кнопка «свернуть до первого ряда»
       data.spotCollapsed = true/false (запоминается)
       ===================================================== */
    function applyFold() {
        const sec = $('spot-section');
        if (!sec) return;
        const cards = [...sec.querySelectorAll('.sp-grid > .sp-card')];
        cards.forEach(c => c.classList.remove('sp-fold'));
        const real = cards.filter(c => !c.classList.contains('sp-add'));
        const btn = sec.querySelector('[data-sp-fold]');
        if (btn) {
            btn.classList.toggle('hidden', real.length < 2);
            btn.textContent = data.spotCollapsed ? `▾ Показать все (${real.length})` : '▴ Только первый ряд';
            btn.setAttribute('aria-pressed', String(!!data.spotCollapsed));
        }
        if (!data.spotCollapsed || !real.length) return;
        cards.filter(c => c.classList.contains('sp-add')).forEach(c => c.classList.add('sp-fold')); // «＋» есть в шапке
        if (real[0].offsetParent === null) return; // страница скрыта — досчитаем, когда появится (ResizeObserver ниже)
        const top = real[0].offsetTop;
        real.forEach(c => { if (c.offsetTop > top + 2) c.classList.add('sp-fold'); });
    }

    function paintFold() {
        const sec = $('spot-section');
        if (!sec) return;
        if (!sec.dataset.foldBound) {
            sec.dataset.foldBound = '1';
            sec.addEventListener('click', e => {
                if (!e.target.closest('[data-sp-fold]')) return;
                data.spotCollapsed = !data.spotCollapsed;
                persistData();
                applyFold();
            });
            let w = 0;
            new ResizeObserver(() => {
                const nw = Math.round(sec.getBoundingClientRect().width);
                if (nw !== w) { w = nw; applyFold(); } // следим только за шириной — иначе свёртка сама вызовет пересчёт
            }).observe(sec);
        }
        if (!sec.querySelector('[data-sp-fold]')) {
            const add = sec.querySelector('.flex > [data-sp-add]');
            if (add) {
                const wrap = document.createElement('div');
                wrap.className = 'flex items-center gap-2 shrink-0';
                const b = document.createElement('button');
                b.type = 'button';
                b.className = 'hx-btn';
                b.dataset.spFold = '';
                b.style.padding = '7px 11px';
                b.style.fontSize = '12px';
                add.insertAdjacentElement('beforebegin', wrap);
                wrap.append(b, add);
            }
        }
        applyFold();
    }

    const renderAllFold = renderAll;
    renderAll = function () {
        renderAllFold();
        try { paintFold(); } catch (e) { console.warn('[MIRVEL] spot fold:', e); }
    };

    /* =====================================================
       Подключение
       ===================================================== */
    buildPicker();
    buildManage();
    buildFormBlock();
    buildFormAva();
    ensure();
    updateUI();
})();
