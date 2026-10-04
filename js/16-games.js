/* =========================================================
   MIRVEL HUB — 16-games.js (подключать после 15-price.js)
   Игры 2.0:
   • выбор платформы с бейджем-иконкой (PS2, PS5, XBOX, NSW…) + новые платформы
   • страница игры: статус, заметки, комплектность, фото диска/коробки, галерея
   • фильтры и сортировка: платформа, статус, диск/цифра, группировка по платформам
   • бонусы: полоса бэклога, «Во что поиграть?», часы, даты, CIB, достижения
   Новые поля игры: status, hours, discCode, note, photos[], parts{}, startedAt, finishedAt,
                    trophy ('' | 'some' | 'full'), trophyDone, trophyTotal
   Статусы: + «Онлайн-игра» (без финала) и «Не в планах»
   Онлайн + сюжет: флаг hasOnline и onlineHours — сюжетный статус остаётся своим, онлайн отмечается отдельно
   ========================================================= */
(() => {
    const $ = id => document.getElementById(id);

    /* =====================================================
       Платформы
       ===================================================== */
    const FAMILIES = {
        ps:    { color: '#3b82f6', glyph: '△', name: 'PlayStation' },
        xbox:  { color: '#22c55e', glyph: '✕', name: 'Xbox' },
        nin:   { color: '#ef4444', glyph: '◉', name: 'Nintendo' },
        sega:  { color: '#06b6d4', glyph: '◈', name: 'Sega' },
        pc:    { color: '#9ca3af', glyph: '▣', name: 'PC' },
        other: { color: '#a78bfa', glyph: '＋', name: 'Другое' }
    };
    const FAMILY_KEYS = ['ps', 'xbox', 'nin', 'sega', 'pc', 'other'];
    // [название (= значение в селекте), короткий код, семейство]
    const PLATFORMS = [
        ['PlayStation 1', 'PS1', 'ps'], ['PlayStation 2', 'PS2', 'ps'], ['PlayStation 3', 'PS3', 'ps'],
        ['PlayStation 4', 'PS4', 'ps'], ['PlayStation 5', 'PS5', 'ps'], ['PSP', 'PSP', 'ps'], ['PS Vita', 'VITA', 'ps'],
        ['Xbox', 'XBOX', 'xbox'], ['Xbox 360', 'X360', 'xbox'], ['Xbox One', 'XONE', 'xbox'], ['Xbox Series', 'XSX', 'xbox'],
        ['Nintendo GameCube', 'GC', 'nin'], ['Nintendo Wii', 'WII', 'nin'], ['Nintendo Wii U', 'WIIU', 'nin'],
        ['Nintendo Switch', 'NSW', 'nin'], ['Nintendo Switch 2', 'NSW2', 'nin'], ['Nintendo DS', 'DS', 'nin'], ['Nintendo 3DS', '3DS', 'nin'],
        ['Nintendo 64', 'N64', 'nin'], ['SNES', 'SNES', 'nin'], ['Game Boy', 'GB', 'nin'], ['Game Boy Advance', 'GBA', 'nin'],
        ['Sega Dreamcast', 'DC', 'sega'], ['Sega Mega Drive', 'MD', 'sega'], ['Sega Saturn', 'SAT', 'sega'],
        ['PC CD/DVD', 'PC', 'pc'], ['Steam', 'STEAM', 'pc'], ['Epic Games', 'EPIC', 'pc'], ['GOG', 'GOG', 'pc'],
        ['Другое', '•••', 'other']
    ];
    // магазины, где игра по определению цифровая
    const DIGITAL_STORES = new Set(['Steam', 'Epic Games', 'GOG']);
    // свои цвета / значки у отдельных платформ
    const PLAT_STYLE = {
        'Steam':      { color: '#1b9ad6', glyph: '♨' },
        'Epic Games': { color: '#e5e7eb', glyph: 'E' },
        'GOG':        { color: '#a855f7', glyph: 'G' }
    };
    const familyOf = name => (PLATFORMS.find(p => p[0] === name) || [])[2] || 'other';
    const platMeta = name => {
        const row = PLATFORMS.find(p => p[0] === name);
        const code = row ? row[1] : String(name || 'Другое').slice(0, 4).toUpperCase();
        return { code, ...FAMILIES[row ? row[2] : 'other'], ...(PLAT_STYLE[name] || {}) };
    };
    const platOrder = name => {
        const idx = PLATFORMS.findIndex(p => p[0] === name);
        return idx < 0 ? 999 : idx;
    };
    function platBadge(name, large = false) {
        const m = platMeta(name);
        return `<span class="plat-badge${large ? ' is-lg' : ''}" style="--pc:${m.color}" title="${esc(name || 'Другое')}"><span class="plat-ico" aria-hidden="true">${m.glyph}</span><span>${esc(m.code)}</span></span>`;
    }

    /* =====================================================
       Статусы, комплектность, сортировка
       ===================================================== */
    const STATUS = {
        backlog:   { label: 'В планах',   icon: '🗓', rank: 1 },
        playing:   { label: 'В процессе', icon: '▶',  rank: 0 },
        completed: { label: 'Пройдено',   icon: '✔',  rank: 2 },
        online:    { label: 'Онлайн-игра', icon: '🌐', rank: 2.5 },   // нет финала: Among Us, Crash Team Rumble…
        dropped:   { label: 'Заброшено',  icon: '⏸',  rank: 3 },
        skipped:   { label: 'Не в планах', icon: '💤', rank: 3.5 }
    };
    const STATUS_KEYS = ['backlog', 'playing', 'completed', 'online', 'dropped', 'skipped'];
    const CORE_STATUS = ['backlog', 'playing', 'completed', 'dropped']; // всегда видны в фильтрах и полосе
    const CYCLE = ['', ...STATUS_KEYS];
    // не участвуют в «% пройдено»: пройти их нельзя / не собираюсь
    const NOT_COUNTED = ['online', 'skipped'];

    /* Трофеи / достижения (только там, где они есть и интересны) */
    const trophyInfo = platform => {
        const f = familyOf(platform);
        if (f === 'ps')   return { title: 'Трофеи',      full: '🏆 Платина',        fullShort: 'Платина',  hint: 'Платина = все трофеи собраны' };
        if (f === 'xbox') return { title: 'Достижения',  full: '🏅 Все 1000 G',     fullShort: '1000 G',   hint: 'Все достижения Xbox' };
        if (f === 'pc')   return { title: 'Достижения',  full: '🏅 100% ачивок',    fullShort: '100%',     hint: 'Steam / Epic / GOG' };
        return { title: 'Достижения', full: '🏅 100% выбито', fullShort: '100%', hint: 'Свои цели: коллекционки, 100% карты и т.п.' };
    };
    const trophyState = i => {
        if (!i || !i.trophy) return '';
        const total = Number(i.trophyTotal) || 0;
        return (i.trophy === 'full' || (total > 0 && (Number(i.trophyDone) || 0) >= total)) ? 'full' : 'some';
    };
    const stOf = i => (i && STATUS[i.status] ? i.status : '');
    const stRank = i => (stOf(i) ? STATUS[stOf(i)].rank : 4);

    const PARTS = [
        ['box', '📦', 'Коробка'], ['disc', '💿', 'Диск'], ['manual', '📖', 'Мануал'],
        ['inserts', '🖼️', 'Вкладыши'], ['slip', '🎴', 'Слипкейс / оби']
    ];
    const isCIB = i => !!(i && !i.digital && i.parts && i.parts.box && i.parts.disc && i.parts.manual);

    const REGIONS = ['PAL', 'NTSC-U', 'NTSC-J', 'NTSC', 'Region Free'];

    const PHOTO_LABELS = ['Диск', 'Коробка (перед)', 'Коробка (зад)', 'Корешок', 'Мануал', 'Вкладыш', 'Чек / скрин', 'Другое'];
    const MAX_PHOTOS = 10;

    const SORTS = [
        ['title', '🔤', 'Алфавиту'], ['platform', '🎮', 'Платформам'], ['status', '🚦', 'Статусу'],
        ['digital', '☁️', 'Цифровые'], ['price_desc', '💸', 'Дорогие'], ['year_desc', '📅', 'Новее'],
        ['rating', '⭐', 'Оценке'], ['recent', '🕒', 'Недавно добавлены']
    ];
    const byTitle = (a, b) => (a.title || '').localeCompare(b.title || '', 'ru');
    const COMPARE = {
        title: byTitle,
        platform: (a, b) => platOrder(a.platform) - platOrder(b.platform) || (a.platform || '').localeCompare(b.platform || '', 'ru') || byTitle(a, b),
        status: (a, b) => stRank(a) - stRank(b) || byTitle(a, b),
        digital: (a, b) => (!!b.digital - !!a.digital) || byTitle(a, b),
        price_desc: (a, b) => (Number(b.price) || 0) - (Number(a.price) || 0) || byTitle(a, b),
        year_desc: (a, b) => (Number(b.year) || 0) - (Number(a.year) || 0) || byTitle(a, b),
        rating: (a, b) => (b.rating || 0) - (a.rating || 0) || byTitle(a, b),
        recent: (a, b) => (b.id || 0) - (a.id || 0)
    };

    const gs = { platform: '', status: '', format: '', trophy: '', online: '', sort: 'title' };
    const hasOnlineMode = i => !!(i && (i.hasOnline || i.status === 'online')); // есть онлайн-режим (в том числе «чисто онлайн» игры)
    const totalHours = i => Number(i?.hours) || 0;
    // раньше часы онлайна вводились отдельно — переносим их в общие часы, чтобы ничего не потерялось
    (data.games || []).forEach(x => { if (Number(x.onlineHours) > 0) x.hours = (Number(x.hours) || 0) + Number(x.onlineHours); delete x.onlineHours; });
    let lastPhoto = null; // последнее удалённое фото — можно вернуть

    /* =====================================================
       Хелперы
       ===================================================== */
    const gameById = id => (data.games || []).find(x => x.id === Number(id));
    const photosOf = i => (Array.isArray(i?.photos) ? i.photos : []);
    const imgSrc = s => {
        const v = String(s || '');
        return /^data:image\//i.test(v) ? v : safeUrl(v);
    };
    const fmtDate = s => {
        const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || '');
        return m ? `${m[3]}.${m[2]}.${m[1]}` : '';
    };
    const todayISO = () => new Date().toISOString().slice(0, 10);
    const hoursText = h => `${Math.round((Number(h) || 0) * 10) / 10} ч`;

    /** то же, что save(), но сообщает, прошла ли запись (фото могут упереться в лимит памяти) */
    function commit() {
        checkAchievements();
        const ok = persistData();
        updateUI();
        return ok;
    }

    function setStatus(item, value) {
        const prev = stOf(item);
        if (prev === value) return;
        item.status = value;
        if (value === 'playing' && !item.startedAt) item.startedAt = todayISO();
        if (value === 'completed') {
            item.finishedAt = todayISO();
            if (!item.startedAt) item.startedAt = item.finishedAt;
        } else if (prev === 'completed') {
            item.finishedAt = '';
        }
        if (value === 'completed' && !item.xpFinished) {
            item.xpFinished = true;
            addXP(100, 'игра пройдена 🏁');
        }
    }

    function readFileAsDataURL(file) {
        return new Promise((resolve, reject) => {
            const r = new FileReader();
            r.onload = () => resolve(r.result);
            r.onerror = () => reject(r.error);
            r.readAsDataURL(file);
        });
    }
    function reencode(src, max, quality) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                const scale = Math.min(1, max / Math.max(img.width, img.height));
                const c = document.createElement('canvas');
                c.width = Math.max(1, Math.round(img.width * scale));
                c.height = Math.max(1, Math.round(img.height * scale));
                const ctx = c.getContext('2d');
                ctx.fillStyle = '#0d0d14';
                ctx.fillRect(0, 0, c.width, c.height);
                ctx.drawImage(img, 0, 0, c.width, c.height);
                resolve(c.toDataURL('image/jpeg', quality));
            };
            img.onerror = () => reject(new Error('bad image'));
            img.src = src;
        });
    }
    const compressFile = (file, max = IMG_PRESETS.photo.max, q = IMG_PRESETS.photo.quality) => compressImage(file, { max, quality: q });

    function onHidden(el, fn) {
        new MutationObserver(() => { if (el.classList.contains('hidden')) fn(); })
            .observe(el, { attributes: true, attributeFilter: ['class'] });
    }

    /* =====================================================
       Страница «Игры»: каркас (вставляем недостающие блоки)
       ===================================================== */
    function setupPage() {
        // Рулетка рядом с кнопкой «Вид»
        const viewBtn = $('game-view-btn');
        if (viewBtn && !$('game-roll-btn')) {
            const b = document.createElement('button');
            b.id = 'game-roll-btn';
            b.type = 'button';
            b.className = 'bg-white/5 border border-white/10 hover:bg-white/10 text-white p-3 rounded-xl text-sm font-bold transition-all';
            b.textContent = '🎲 Во что поиграть?';
            b.onclick = () => rollGame();
            viewBtn.insertAdjacentElement('beforebegin', b);
        }

        // Полоса бэклога — над фильтрами платформ
        const platBar = $('game-platform-filters');
        if (platBar && !$('game-strip')) {
            const strip = document.createElement('div');
            strip.id = 'game-strip';
            strip.className = 'glass no-hover rounded-2xl p-5 mb-6';
            platBar.insertAdjacentElement('beforebegin', strip);
        }

        // Ряд «статус / формат» — под фильтрами платформ
        if (platBar && !$('game-filter-ext')) {
            const row = document.createElement('div');
            row.id = 'game-filter-ext';
            row.className = 'flex flex-wrap items-center gap-x-6 gap-y-3 mb-6 bg-white/5 p-3 rounded-2xl border border-white/5';
            row.innerHTML = `
                <div class="flex flex-wrap items-center gap-2"><span class="gf-label">Статус</span><span id="game-status-chips" class="contents"></span></div>
                <div class="flex flex-wrap items-center gap-2"><span class="gf-label">Формат</span><span id="game-format-chips" class="contents"></span></div>
                <div id="game-mode-group" class="hidden flex flex-wrap items-center gap-2"><span class="gf-label">Режим</span><span id="game-mode-chips" class="contents"></span></div>
                <div id="game-trophy-group" class="hidden flex flex-wrap items-center gap-2"><span class="gf-label">Ачивки</span><span id="game-trophy-chips" class="contents"></span></div>
                <button type="button" id="game-reset-filters" class="hidden text-xs font-bold text-gray-400 hover:text-white ml-auto">✕ Сбросить фильтры</button>`;
            platBar.insertAdjacentElement('afterend', row);
        }

        // Панель сортировки — перестраиваем старую
        let sortBar = $('game-sort-title')?.parentElement || $('game-sort-bar');
        if (!sortBar) {
            sortBar = document.createElement('div');
            $('games-grid').insertAdjacentElement('beforebegin', sortBar);
        }
        sortBar.id = 'game-sort-bar';
        sortBar.className = 'flex flex-wrap gap-2 items-center mb-6 bg-white/5 p-3 rounded-2xl border border-white/5';
        sortBar.innerHTML = `<span class="gf-label">Сортировать</span>` + SORTS.map(([k, ico, label]) =>
            `<button type="button" class="gsort-btn" data-sort="${k}"><span aria-hidden="true">${ico}</span>${esc(label)}</button>`).join('');

        // Клики (делегирование — элементы пересоздаются при каждой отрисовке)
        sortBar.addEventListener('click', e => {
            const b = e.target.closest('[data-sort]');
            if (b) { gs.sort = b.dataset.sort; updateUI(); }
        });
        platBar.addEventListener('click', e => {
            const b = e.target.closest('[data-plat]');
            if (b) { gs.platform = b.getAttribute('data-plat'); updateUI(); }
        });
        $('game-filter-ext').addEventListener('click', e => {
            const s = e.target.closest('[data-status]');
            const f = e.target.closest('[data-format]');
            const t = e.target.closest('[data-trophy]');
            const m = e.target.closest('[data-mode]');
            if (m) gs.online = m.getAttribute('data-mode');
            else if (s) gs.status = s.getAttribute('data-status');
            else if (f) gs.format = f.getAttribute('data-format');
            else if (t) gs.trophy = t.getAttribute('data-trophy');
            else if (e.target.closest('#game-reset-filters')) { gs.platform = ''; gs.status = ''; gs.format = ''; gs.trophy = ''; gs.online = ''; const q = $('search-games'); if (q) q.value = ''; }
            else return;
            updateUI();
        });

        const grid = $('games-grid');
        grid.addEventListener('click', e => {
            const card = e.target.closest('[data-gid]');
            if (!card) return;
            const id = Number(card.dataset.gid);
            const btn = e.target.closest('[data-act]');
            if (!btn) { openGameDetail(id); return; }
            e.stopPropagation();
            const item = gameById(id);
            if (!item) return;
            if (btn.dataset.act === 'edit') openGameModal(id);
            else if (btn.dataset.act === 'del') deleteGame(id);
            else if (btn.dataset.act === 'cycle') {
                setStatus(item, CYCLE[(CYCLE.indexOf(stOf(item)) + 1) % CYCLE.length]);
                commit();
                showToast(`<strong>${esc(item.title)}</strong>: ${stOf(item) ? STATUS[stOf(item)].icon + ' ' + STATUS[stOf(item)].label : 'статус снят'}`);
            }
        });
        grid.addEventListener('keydown', e => {
            if ((e.key === 'Enter' || e.key === ' ') && e.target.matches?.('[data-gid]')) {
                e.preventDefault();
                openGameDetail(e.target.dataset.gid);
            }
        });
    }

    /* =====================================================
       Отрисовка списка
       ===================================================== */
    function filteredGames() {
        const q = ($('search-games')?.value || '').toLowerCase().trim();
        return (data.games || []).filter(i => {
            if (gs.platform && (i.platform || 'Другое') !== gs.platform) return false;
            if (gs.status === 'none' ? stOf(i) : (gs.status && stOf(i) !== gs.status)) return false;
            if (gs.format === 'disc' && i.digital) return false;
            if (gs.format === 'digital' && !i.digital) return false;
            if (gs.trophy && trophyState(i) !== gs.trophy) return false;
            if (gs.online && !hasOnlineMode(i)) return false;
            if (!q) return true;
            const st = stOf(i) ? STATUS[stOf(i)].label : '';
            return [i.title, i.platform, platMeta(i.platform).code, i.developer, i.publisher, i.edition, i.region,
                i.year, i.discCode, i.note, st, i.digital ? 'цифровая цифра digital' : 'диск', hasOnlineMode(i) ? 'онлайн online' : '']
                .some(v => String(v ?? '').toLowerCase().includes(q));
        });
    }

    function renderStrip(all) {
        const strip = $('game-strip');
        if (!strip) return;
        if (!all.length) { strip.classList.add('hidden'); return; }
        strip.classList.remove('hidden');
        const cnt = Object.fromEntries(STATUS_KEYS.map(k => [k, all.filter(i => stOf(i) === k).length]));
        const none = all.filter(i => !stOf(i)).length;
        const total = all.length;
        const countable = total - NOT_COUNTED.reduce((n, k) => n + cnt[k], 0);
        const pct = countable ? Math.round(cnt.completed / countable * 100) : 0;
        const plat100 = all.filter(i => trophyState(i) === 'full').length;
        const hours = all.reduce((s, i) => s + totalHours(i), 0);
        const withOnline = all.filter(i => i.hasOnline).length;
        const digital = all.filter(i => i.digital).length;
        const pile = all.filter(i => stOf(i) === 'backlog').reduce((s, i) => s + (Number(i.price) || 0), 0);
        const cib = all.filter(isCIB).length;
        const seg = k => `<span class="gs-seg st-${k}" style="width:${cnt[k] / total * 100}%" title="${STATUS[k].label}: ${cnt[k]}"></span>`;
        strip.innerHTML = `
            <div class="flex flex-wrap justify-between gap-2 text-xs mb-3">
                <span class="uppercase font-black tracking-widest text-gray-500">Игровой бэклог</span>
                <span class="font-mono text-cyan-400 font-bold">${cnt.completed} из ${countable} пройдено · ${pct}%</span>
            </div>
            <div class="gs-bar" role="img" aria-label="Прогресс прохождения: ${pct}%">${['completed', 'playing', 'backlog', 'online', 'dropped', 'skipped'].map(seg).join('')}</div>
            <div class="flex flex-wrap gap-x-5 gap-y-1.5 mt-3 text-xs text-gray-400">
                ${STATUS_KEYS.filter(k => cnt[k] || CORE_STATUS.includes(k)).map(k => `<span class="st-${k}"><span style="color:var(--sc)">${STATUS[k].icon}</span> ${STATUS[k].label}: <b class="text-white">${cnt[k]}</b></span>`).join('')}
                ${plat100 ? `<span>🏆 100% ачивок: <b class="text-white">${plat100}</b></span>` : ''}
                ${none ? `<span>Без статуса: <b class="text-white">${none}</b></span>` : ''}
                <span>⏱ Наиграно: <b class="text-white">${hoursText(hours)}</b></span>
                <span>☁️ Цифровых: <b class="text-white">${digital}</b></span>
                ${cib ? `<span>📦 CIB: <b class="text-white">${cib}</b></span>` : ''}
                ${withOnline ? `<span>🌐 Сюжет + онлайн: <b class="text-white">${withOnline}</b></span>` : ''}
                ${pile ? `<span>💸 Ждёт прохождения на: <b class="text-white">${pile} ₴</b></span>` : ''}
            </div>`;
    }

    function chipHTML(attr, value, label, on, count) {
        return `<button type="button" class="gf-chip${on ? ' is-on' : ''}" ${attr}="${esc(value)}">${label}${count != null ? ` <span class="gp-count">${count}</span>` : ''}</button>`;
    }

    function renderFilters(all) {
        // платформы
        const counts = {};
        all.forEach(i => { const p = i.platform || 'Другое'; counts[p] = (counts[p] || 0) + 1; });
        const plats = Object.keys(counts).sort((a, b) => platOrder(a) - platOrder(b) || a.localeCompare(b, 'ru'));
        if (gs.platform && !counts[gs.platform]) gs.platform = '';
        const platBar = $('game-platform-filters');
        if (platBar) {
            platBar.innerHTML = `<button type="button" class="gp-chip${!gs.platform ? ' is-on' : ''}" data-plat="" style="padding-left:12px">Все <span class="gp-count">${all.length}</span></button>` +
                plats.map(p => `<button type="button" class="gp-chip${gs.platform === p ? ' is-on' : ''}" data-plat="${esc(p)}" aria-pressed="${gs.platform === p}">${platBadge(p)}<span class="gp-count">${counts[p]}</span></button>`).join('');
        }

        // статусы
        const sc = k => all.filter(i => stOf(i) === k).length;
        const noneCount = all.filter(i => !stOf(i)).length;
        if (gs.status === 'none' && !noneCount) gs.status = '';
        const statusBox = $('game-status-chips');
        if (statusBox) {
            statusBox.innerHTML = chipHTML('data-status', '', 'Все', !gs.status) +
                STATUS_KEYS.filter(k => CORE_STATUS.includes(k) || sc(k) || gs.status === k)
                    .map(k => chipHTML('data-status', k, `${STATUS[k].icon} ${STATUS[k].label}`, gs.status === k, sc(k))).join('') +
                (noneCount ? chipHTML('data-status', 'none', 'Без статуса', gs.status === 'none', noneCount) : '');
        }

        // формат
        const digitalCount = all.filter(i => i.digital).length;
        const formatBox = $('game-format-chips');
        if (formatBox) {
            formatBox.innerHTML = chipHTML('data-format', '', 'Все', !gs.format) +
                chipHTML('data-format', 'disc', '💿 Диски', gs.format === 'disc', all.length - digitalCount) +
                chipHTML('data-format', 'digital', '☁️ Цифровые', gs.format === 'digital', digitalCount);
        }

        // режим: показываем фильтр, только если есть игры с онлайном
        const onlineCount = all.filter(hasOnlineMode).length;
        if (gs.online && !onlineCount) gs.online = '';
        $('game-mode-group')?.classList.toggle('hidden', !onlineCount);
        const modeBox = $('game-mode-chips');
        if (modeBox) {
            modeBox.innerHTML = chipHTML('data-mode', '', 'Все', !gs.online) +
                chipHTML('data-mode', '1', '🌐 Есть онлайн', gs.online === '1', onlineCount);
        }

        // ачивки: показываем фильтр, только если хоть одна игра их отслеживает
        const tFull = all.filter(i => trophyState(i) === 'full').length;
        const tSome = all.filter(i => trophyState(i) === 'some').length;
        if (gs.trophy && !(gs.trophy === 'full' ? tFull : tSome)) gs.trophy = '';
        $('game-trophy-group')?.classList.toggle('hidden', !(tFull || tSome));
        const trophyBox = $('game-trophy-chips');
        if (trophyBox) {
            trophyBox.innerHTML = chipHTML('data-trophy', '', 'Все', !gs.trophy) +
                chipHTML('data-trophy', 'full', '🏆 100%', gs.trophy === 'full', tFull) +
                chipHTML('data-trophy', 'some', '🎯 Собираю', gs.trophy === 'some', tSome);
        }

        const active = gs.platform || gs.status || gs.format || gs.trophy || gs.online || ($('search-games')?.value || '').trim();
        $('game-reset-filters')?.classList.toggle('hidden', !active);

        document.querySelectorAll('#game-sort-bar [data-sort]').forEach(b => b.classList.toggle('is-on', b.dataset.sort === gs.sort));
    }

    function trophyChip(i) {
        const t = trophyState(i);
        if (!t) return '';
        if (t === 'full') return `<span class="gd-chip is-gold">${esc(trophyInfo(i.platform).full)}</span>`;
        const done = Number(i.trophyDone) || 0, total = Number(i.trophyTotal) || 0;
        return `<span class="gd-chip">🎯 ${total ? `${done}/${total}` : 'ачивки'}</span>`;
    }

    function cardHTML(i, covers) {
        const st = stOf(i);
        const src = imgSrc(i.img);
        const stInfo = st ? STATUS[st] : null;
        if (covers) {
            return `
            <div class="game-card relative aspect-square group rounded-2xl overflow-hidden glass border border-white/10 hover:border-[var(--theme-btn)] hover:scale-105 transition-all" data-gid="${i.id}" tabindex="0" role="button" aria-label="Открыть: ${esc(i.title)}">
                ${src ? `<img src="${esc(src)}" alt="" loading="lazy" class="w-full h-full object-cover">`
                      : `<div class="w-full h-full flex flex-col items-center justify-center bg-gradient-to-tr from-purple-900/40 to-cyan-900/40 p-2 text-center"><span class="text-3xl">🎮</span><span class="text-[10px] font-black truncate w-full mt-2">${esc(i.title)}</span></div>`}
                <span class="game-tile-plat">${platBadge(i.platform)}</span>
                ${st ? `<span class="st-dot st-${st}" title="${stInfo.label}"></span>` : ''}
                ${trophyState(i) === 'full' ? '<span class="absolute right-1.5 top-1.5 text-sm drop-shadow" title="100% ачивок">🏆</span>' : ''}
                ${i.hasOnline ? '<span class="absolute right-1.5 bottom-1.5 text-sm drop-shadow" title="Есть онлайн-режим">🌐</span>' : ''}
                <div class="absolute inset-0 bg-black/85 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity p-2 flex flex-col justify-between text-[10px]">
                    <div><p class="font-black truncate">${esc(i.title)}</p><p class="text-gray-400">${fmtPrice(i)}</p>${st ? `<p class="st-${st}" style="color:var(--sc)">${stInfo.icon} ${stInfo.label}</p>` : ''}</div>
                    <div class="flex gap-1 justify-end"><button type="button" data-act="edit" class="bg-white/10 rounded p-1" aria-label="Изменить">✏️</button><button type="button" data-act="del" class="bg-red-500/20 text-red-300 rounded p-1" aria-label="Удалить">✕</button></div>
                </div>
            </div>`;
        }
        const extras = [
            i.digital ? '<span class="gd-chip">☁️ Цифровая</span>' : '',
            i.hasOnline ? '<span class="gd-chip is-online">🌐 Онлайн</span>' : '',
            isCIB(i) ? '<span class="gd-chip is-ok">CIB</span>' : '',
            i.region ? `<span class="gd-chip">${esc(i.region)}</span>` : '',
            trophyChip(i)
        ].join('');
        const meta = [
            (i.note || '').trim() ? '📝' : '',
            photosOf(i).length ? `📷 ${photosOf(i).length}` : '',
            Number(i.hours) ? `⏱ ${hoursText(i.hours)}` : ''
        ].filter(Boolean).join(' · ');
        return `
        <article class="game-card glass p-4 rounded-3xl relative group border border-white/5 hover:border-[var(--theme-btn)] transition-all" data-gid="${i.id}" tabindex="0" role="button" aria-label="Открыть: ${esc(i.title)}">
            <div class="flex gap-4">
                <div class="w-24 h-24 rounded-2xl overflow-hidden shrink-0 border border-white/10 bg-gradient-to-tr from-purple-900/40 to-cyan-900/40 flex items-center justify-center text-3xl">
                    ${src ? `<img src="${esc(src)}" alt="" loading="lazy" class="w-full h-full object-cover">` : '🎮'}
                </div>
                <div class="min-w-0 flex-1">
                    <div class="flex flex-wrap items-center gap-1.5">${platBadge(i.platform)}${extras}</div>
                    <h3 class="font-black text-white text-base truncate mt-1.5" title="${esc(i.title)}">${esc(i.title)}</h3>
                    <p class="text-purple-300 text-xs mt-0.5">${fmtPrice(i)}</p>
                    <p class="text-[10px] text-gray-500 mt-1 truncate">${esc(i.developer || 'Разработчик не указан')}${i.publisher ? ' • ' + esc(i.publisher) : ''}</p>
                </div>
            </div>
            <div class="mt-3 pt-3 border-t border-white/5 text-[10px] text-gray-400 space-y-2">
                ${i.year || i.edition ? `<div>${i.year ? '📅 ' + esc(i.year) : '💿'}${i.edition ? ' • ' + esc(i.edition) : ''}${i.condition ? ` • <span class="text-cyan-400">${esc(i.condition)}</span>` : ''}</div>` : ''}
                <div class="flex flex-wrap items-center gap-2">
                    <button type="button" data-act="cycle" class="st-pill st-${st || 'none'}" title="Нажмите, чтобы сменить статус">${st ? stInfo.icon + ' ' + stInfo.label : '＋ Статус'}</button>
                    <span class="text-yellow-400">${i.rating ? '⭐'.repeat(Math.max(0, Math.min(5, Number(i.rating) || 0))) : ''}</span>
                    ${meta ? `<span class="ml-auto text-gray-500">${meta}</span>` : ''}
                </div>
            </div>
            <div class="game-act absolute right-3 top-3 flex gap-1">
                <button type="button" data-act="edit" class="bg-black/80 p-1.5 rounded-xl border border-white/10" aria-label="Изменить">✏️</button>
                <button type="button" data-act="del" class="bg-red-950/80 text-red-300 p-1.5 rounded-xl border border-red-500/20" aria-label="Удалить">✕</button>
            </div>
        </article>`;
    }

    /* Плитки над списком: «Платформ» считает 11-render.js; «Пройдено» и «Любимая платформа» — здесь */
    function renderGameTiles() {
        const all = data.games || [];
        const doneEl = $('games-owned-count'), favEl = $('games-latest-platform');
        if (doneEl) {
            const countable = all.filter(i => !NOT_COUNTED.includes(stOf(i))).length;
            const done = all.filter(i => stOf(i) === 'completed').length;
            doneEl.textContent = countable ? `${done} из ${countable}` : '—';
        }
        if (favEl) {
            const byPlat = {};
            all.forEach(i => { const p = i.platform || 'Другое'; byPlat[p] = (byPlat[p] || 0) + 1; });
            const top = Object.entries(byPlat).sort((a, b) => b[1] - a[1])[0];
            favEl.textContent = top ? `${top[0]} · ${top[1]}` : '—';
        }
    }

    function renderGamesX() {
        renderGameTiles();
        const grid = $('games-grid');
        if (!grid || $('games')?.classList.contains('hidden')) return;
        const all = data.games || [];

        renderStrip(all);
        renderFilters(all);

        const items = filteredGames().sort(COMPARE[gs.sort] || byTitle);
        const covers = data.gameViewMode === 'covers';
        grid.className = covers
            ? 'grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4 p-2'
            : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 p-2';

        if (!items.length) {
            grid.innerHTML = `<div class="col-span-full glass no-hover rounded-3xl p-12 text-center text-gray-500 italic">${
                all.length ? 'Под такие фильтры ничего не подошло. Попробуйте сбросить их 🔎' : 'Пока нет игр. Самое время добавить первый диск 🎮'}</div>`;
            return;
        }

        let html = '';
        let lastGroup = null;
        items.forEach(i => {
            if (gs.sort === 'platform') {
                const p = i.platform || 'Другое';
                if (p !== lastGroup) {
                    lastGroup = p;
                    const group = items.filter(x => (x.platform || 'Другое') === p);
                    const sum = group.reduce((s, x) => s + (Number(x.price) || 0), 0);
                    html += `<div class="col-span-full flex items-center gap-3 mt-2">${platBadge(p, true)}<span class="text-sm font-black">${esc(p)}</span><span class="text-xs text-gray-500">${group.length} шт. · ${sum} ₴</span><span class="h-px flex-1 bg-white/10"></span></div>`;
                }
            }
            html += cardHTML(i, covers);
        });
        grid.innerHTML = html;
    }

    renderGames = renderGamesX;
    window.setGameSort = mode => { gs.sort = mode; updateUI(); };
    window.setGamePlatformFilter = p => { gs.platform = p || ''; updateUI(); };

    /* =====================================================
       Форма добавления / редактирования: платформа, статус, код диска, часы
       ===================================================== */
    let mStatus = '';
    let pendingReopen = null;
    let reopenCur = null;

    function ensurePlatformOptions(extraName) {
        const sel = $('game-platform');
        const names = PLATFORMS.map(p => p[0]);
        if (extraName && !names.includes(extraName)) names.push(extraName);
        const have = new Set([...sel.options].map(o => o.value));
        names.forEach(n => {
            if (!have.has(n)) { const o = document.createElement('option'); o.textContent = n; o.value = n; sel.appendChild(o); }
        });
    }

    let pickFam = 'ps'; // какое семейство сейчас раскрыто в форме

    function setPickerValue(name, { fromClick = false } = {}) {
        const sel = $('game-platform');
        ensurePlatformOptions(name);
        if (name) sel.value = name;
        const cur = sel.value;
        pickFam = familyOf(cur);
        // выбрали Steam / Epic / GOG — игра цифровая, не заставляем ставить галочку вручную
        if (fromClick && DIGITAL_STORES.has(cur) && $('game-digital')) $('game-digital').checked = true;
        renderPicker();
    }

    function renderPicker() {
        const cur = $('game-platform').value;
        const fams = $('gx-fams');
        if (fams) {
            fams.querySelectorAll('[data-fam]').forEach(b => {
                const on = b.dataset.fam === pickFam;
                b.classList.toggle('is-on', on);
                b.setAttribute('aria-pressed', String(on));
            });
        }
        const box = $('gx-platforms');
        if (box) {
            const list = PLATFORMS.filter(p => p[2] === pickFam);
            box.innerHTML = list.map(p => `<button type=\"button\" class=\"gx-plat${p[0] === cur ? ' is-on' : ''}\" data-plat=\"${esc(p[0])}\" title=\"${esc(p[0])}\" aria-pressed=\"${p[0] === cur}\">${platBadge(p[0])}</button>`).join('');
        }
        const nameEl = $('gx-plat-name');
        if (nameEl) nameEl.textContent = cur;
    }

    function renderModalStatus() {
        const box = $('gx-status');
        if (!box) return;
        box.innerHTML = STATUS_KEYS.map(k =>
            `<button type="button" class="gx-status st-${k}${mStatus === k ? ' is-on' : ''}" data-status="${k}" aria-pressed="${mStatus === k}">${STATUS[k].icon} ${STATUS[k].label}</button>`).join('');
    }

    function setupModal() {
        const sel = $('game-platform');
        const modal = $('game-modal');
        if (!sel || !modal || $('gx-block')) return;
        ensurePlatformOptions();

        // выбор платформы: бейджи вместо выпадающего списка (select остаётся скрытым — на него опирается сохранение)
        const platCell = sel.parentElement;
        const row = platCell.parentElement;
        const picker = document.createElement('div');
        picker.id = 'gx-picker';
        picker.innerHTML = `
            <label class="text-[10px] text-gray-400 font-bold block uppercase mb-1.5">Платформа</label>
            <div id="gx-fams" class="flex flex-wrap gap-2" role="group" aria-label="Семейство платформ">
                ${FAMILY_KEYS.map(f => `<button type="button" class="gx-fam" data-fam="${f}" style="--pc:${FAMILIES[f].color}"><span class="plat-ico" aria-hidden="true">${FAMILIES[f].glyph}</span>${esc(FAMILIES[f].name)}</button>`).join('')}
            </div>
            <div id="gx-platforms" class="flex flex-wrap gap-1 mt-2.5" role="group" aria-label="Версия платформы"></div>
            <p class="text-xs text-gray-500 mt-1.5">Выбрано: <span id="gx-plat-name" class="text-white font-bold"></span></p>`;
        row.insertAdjacentElement('beforebegin', picker);
        platCell.classList.add('hidden');
        row.className = 'grid grid-cols-1 gap-3 hidden';
        // «Регион» убран из формы: задаётся на странице игры (кнопка PAL / NTSC…). Скрытый select остаётся,
        // чтобы при редактировании уже выставленный регион не затирался.
        picker.addEventListener('click', e => {
            const v = e.target.closest('[data-plat]');
            if (v) { setPickerValue(v.dataset.plat, { fromClick: true }); return; }
            const f = e.target.closest('[data-fam]');
            if (!f) return;
            pickFam = f.dataset.fam;
            // у «Другое» одна версия — выбираем сразу
            if (pickFam === 'other') setPickerValue('Другое', { fromClick: true });
            else renderPicker();
        });

        // статус, код диска, часы — перед блоком оценки
        const ratingBlock = $('game-rating-stars').parentElement;
        const block = document.createElement('div');
        block.id = 'gx-block';
        block.className = 'space-y-3';
        block.innerHTML = `
            <div>
                <label class="text-[10px] text-gray-400 font-bold block uppercase mb-1.5">Статус прохождения</label>
                <div id="gx-status" class="flex flex-wrap gap-2" role="group" aria-label="Статус"></div>
            </div>
            <div class="grid grid-cols-2 gap-3">
                <input id="gx-disc" maxlength="40" placeholder="Код диска (SLES-50382…)" class="w-full bg-white/5 p-3.5 rounded-xl border border-white/10 text-white text-sm">
                <input id="gx-hours" type="number" min="0" step="0.5" placeholder="Наиграно, часов" class="w-full bg-white/5 p-3.5 rounded-xl border border-white/10 text-white text-sm">
            </div>
            <label class="flex items-start gap-2 text-sm text-gray-300 cursor-pointer"><input type="checkbox" id="gx-online" class="accent-purple-500 mt-1"> <span>🌐 Есть онлайн-режим помимо сюжета<small class="block text-[11px] text-gray-500">Сюжетный статус остаётся как есть, а онлайн отмечается отдельно (GTA, Call of Duty, Mortal Kombat…).</small></span></label>
            <p class="text-[11px] text-gray-500">🌐 Статус «Онлайн-игра» — только для игр вообще без сюжета (Among Us, Crash Team Rumble). 💤 «Не в планах» — лежит, но сейчас не интересно.</p>
            <p class="text-[11px] text-gray-500">Заметки, комплектность, ачивки и фото — на странице игры (нажмите на карточку).</p>`;
        ratingBlock.insertAdjacentElement('beforebegin', block);
        $('gx-status').addEventListener('click', e => {
            const b = e.target.closest('[data-status]');
            if (!b) return;
            mStatus = mStatus === b.dataset.status ? '' : b.dataset.status;
            renderModalStatus();
        });

        // убираем дубль id у статуса обложки (в исходной разметке он повторяется)
        const dups = modal.querySelectorAll('#game-img-status');
        for (let k = 1; k < dups.length; k++) dups[k].remove();
    }

    const openBase = window.openGameModal;
    window.openGameModal = (id = null) => {
        const item = id ? gameById(id) : null;
        ensurePlatformOptions(item?.platform);
        openBase(id);
        setPickerValue($('game-platform').value);
        mStatus = item ? stOf(item) : '';
        renderModalStatus();
        $('gx-disc').value = item?.discCode || '';
        $('gx-hours').value = item?.hours || '';
        $('gx-online').checked = !!item?.hasOnline;
        reopenCur = pendingReopen;
        pendingReopen = null;
    };

    const saveBase = window.saveGameItem;
    window.saveGameItem = async (...args) => {
        const editId = Number($('game-edit-id').value) || null;
        const before = new Set((data.games || []).map(x => x.id));
        const ex = {
            status: mStatus,
            discCode: $('gx-disc').value.trim(),
            hours: Math.max(0, parseFloat($('gx-hours').value) || 0),
            hasOnline: $('gx-online').checked
        };
        await saveBase(...args);
        const item = editId ? gameById(editId) : (data.games || []).find(x => !before.has(x.id));
        // форма осталась открытой — сохранение не прошло (например, нет названия)
        if (!item || !$('game-modal').classList.contains('hidden')) return;
        item.discCode = ex.discCode;
        item.hours = ex.hours;
        item.hasOnline = ex.hasOnline;
        setStatus(item, ex.status);
        if (!Array.isArray(item.photos)) item.photos = [];
        if (!item.parts || typeof item.parts !== 'object') item.parts = {};
        commit();
        if (reopenCur) { const r = reopenCur; reopenCur = null; openGameDetail(r); }
    };

    /* =====================================================
       Страница игры
       ===================================================== */
    let dId = null;
    let dirty = false;
    let noteTimer = null;

    const detail = document.createElement('div');
    detail.id = 'game-detail-modal';
    detail.className = 'hidden fixed inset-0 bg-black/70 backdrop-blur-md flex items-start sm:items-center justify-center z-[54] p-3 sm:p-4';
    detail.setAttribute('role', 'dialog');
    detail.setAttribute('aria-modal', 'true');
    detail.setAttribute('aria-label', 'Страница игры');
    detail.innerHTML = `<div class="glass no-hover gd-panel w-full rounded-3xl p-5 sm:p-7 max-h-[94vh] overflow-y-auto border border-white/10 shadow-2xl"><div id="gd-body"></div></div>`;
    document.body.appendChild(detail);
    const body = detail.querySelector('#gd-body');

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.multiple = true;
    fileInput.className = 'hidden';
    document.body.appendChild(fileInput);

    function trophyHTML(i) {
        const info = trophyInfo(i.platform);
        const t = trophyState(i);
        const done = Number(i.trophyDone) || 0, total = Number(i.trophyTotal) || 0;
        const pct = total ? Math.min(100, Math.round(done / total * 100)) : (t === 'full' ? 100 : 0);
        const opt = (v, label) => `<button type="button" class="gx-status st-${v === 'full' ? 'completed' : v === 'some' ? 'playing' : 'none'}${(i.trophy || '') === v ? ' is-on' : ''}" data-act="trophy" data-v="${v}" aria-pressed="${(i.trophy || '') === v}">${label}</button>`;
        return `
        <div class="gd-sec mt-5">
            <p class="gd-sec-title">${esc(info.title)} <span class="normal-case tracking-normal font-semibold text-gray-600">· необязательно, не у всех игр они есть</span></p>
            <div class="flex flex-wrap gap-2" role="group" aria-label="${esc(info.title)}">
                ${opt('', 'Не отслеживаю')}
                ${opt('some', '🎯 Собираю')}
                ${opt('full', esc(info.full))}
            </div>
            ${i.trophy ? `
            <div class="grid grid-cols-2 gap-3 mt-3">
                <label class="text-xs text-gray-400">Получено
                    <input id="gd-tdone" data-field type="number" min="0" step="1" value="${done || ''}" class="gd-input mt-1" placeholder="0"></label>
                <label class="text-xs text-gray-400">Всего в игре
                    <input id="gd-ttotal" data-field type="number" min="0" step="1" value="${total || ''}" class="gd-input mt-1" placeholder="например, 50"></label>
            </div>
            ${total || t === 'full' ? `<div class="gs-bar mt-3" role="img" aria-label="Ачивки: ${pct}%"><span class="gs-seg" style="width:${pct}%;--sc:${t === 'full' ? '#facc15' : '#fbbf24'}"></span></div>
            <p class="text-xs text-gray-500 mt-1.5">${t === 'full' ? esc(info.hint) + ' ✓' : `${pct}% — осталось ${Math.max(0, total - done)}`}</p>` : ''}` : ''}
        </div>`;
    }

    function detailHTML(i) {
        const st = stOf(i);
        const src = imgSrc(i.img);
        const photos = photosOf(i);
        const parts = i.parts || {};
        const meta = [i.developer, i.publisher, i.year, i.edition, i.condition && `состояние ${i.condition}`].filter(Boolean).map(esc).join(' • ');
        const link = safeUrl(i.url);
        const kb = Math.round(photos.reduce((s, p) => s + String(p.src || '').length, 0) * 0.75 / 1024);
        const dates = [
            i.startedAt ? `Начато: <b class="text-white">${fmtDate(i.startedAt)}</b>` : '',
            i.finishedAt ? `Пройдено: <b class="text-white">${fmtDate(i.finishedAt)}</b>` : ''
        ].filter(Boolean).join(' · ');

        return `
        <div class="flex items-start gap-4 sm:gap-5 flex-col sm:flex-row">
            <div class="gd-cover">${src ? `<img src="${esc(src)}" alt="Обложка: ${esc(i.title)}">` : '🎮'}</div>
            <div class="min-w-0 flex-1 w-full space-y-2.5">
                <div class="flex flex-wrap items-center gap-2">
                    ${platBadge(i.platform, true)}
                    <span class="gd-chip">${i.digital ? '☁️ Цифровая копия' : '💿 Диск'}</span>
                    ${i.region ? `<span class="gd-chip">${esc(i.region)}</span>` : ''}
                    ${isCIB(i) ? '<span class="gd-chip is-ok">📦 CIB — полный комплект</span>' : ''}
                    ${i.hasOnline ? '<span class="gd-chip is-online">🌐 Есть онлайн</span>' : ''}
                </div>
                <h3 class="text-2xl sm:text-3xl font-black leading-tight break-words" style="font-family:var(--font-display)">${esc(i.title)}</h3>
                ${meta ? `<p class="text-sm text-gray-400">${meta}</p>` : ''}
                <p class="text-sm text-purple-300 font-bold">${fmtPrice(i)}</p>
                <div class="flex items-center gap-1" role="group" aria-label="Оценка">
                    ${[1, 2, 3, 4, 5].map(n => `<button type="button" class="gd-star${(i.rating || 0) >= n ? ' is-on' : ''}" data-act="rate" data-v="${n}" aria-label="Оценка ${n}">★</button>`).join('')}
                </div>
            </div>
            <div class="flex sm:flex-col gap-2 shrink-0 self-end sm:self-start">
                <button type="button" class="gd-tool" data-act="edit">✏️ Изменить</button>
                ${link ? `<a class="gd-tool text-center" href="${esc(link)}" target="_blank" rel="noopener noreferrer">🔗 Ссылка</a>` : ''}
                <button type="button" class="gd-tool is-danger" data-act="del">🗑 Удалить</button>
                <button type="button" class="gd-tool" data-act="close" aria-label="Закрыть">✕</button>
            </div>
        </div>

        <div class="gd-sec mt-5">
            <p class="gd-sec-title">Прохождение${i.hasOnline ? ' (сюжет)' : ''}</p>
            <div class="flex flex-wrap gap-2" role="group" aria-label="Статус">
                ${STATUS_KEYS.map(k => `<button type="button" class="gx-status st-${k}${st === k ? ' is-on' : ''}" data-act="status" data-v="${k}" aria-pressed="${st === k}">${STATUS[k].icon} ${STATUS[k].label}</button>`).join('')}
            </div>
            <div class="grid grid-cols-2 gap-3 mt-3">
                <label class="text-xs text-gray-400">Наиграно, часов
                    <input id="gd-hours" data-field type="number" min="0" step="0.5" value="${Number(i.hours) || ''}" class="gd-input mt-1" placeholder="0"></label>
                <label class="text-xs text-gray-400">Код диска / серийный номер
                    <input id="gd-disc" data-field maxlength="40" value="${esc(i.discCode || '')}" class="gd-input mt-1" placeholder="SLES-50382"></label>
            </div>
            ${dates ? `<p class="text-xs text-gray-500 mt-2">${dates}</p>` : ''}
            <div class="mt-4 pt-3 border-t border-white/5">
                <div class="flex flex-wrap items-center gap-2">
                    <button type="button" class="gx-status st-online${i.hasOnline ? ' is-on' : ''}" data-act="online" aria-pressed="${!!i.hasOnline}">🌐 Есть онлайн-режим</button>
                </div>
                <p class="text-[11px] text-gray-500 mt-2">${i.hasOnline
                    ? 'Статус выше — это сюжет / кампания. Игра может быть «Пройдена» и при этом оставаться в онлайне.'
                    : 'У игры есть и сюжет, и онлайн? Включите — сюжетный статус останется, а онлайн получит свою метку.'}</p>
            </div>
        </div>

        ${trophyHTML(i)}

        ${i.digital && !i.region ? '' : `
        <div class="gd-sec mt-5">
            <p class="gd-sec-title">Регион диска <span class="normal-case tracking-normal font-semibold text-gray-600">· необязательно, нажмите ещё раз — снимется</span></p>
            <div class="flex flex-wrap gap-2" role="group" aria-label="Регион">${[...REGIONS, ...(i.region && !REGIONS.includes(i.region) ? [i.region] : [])].map(r =>
                `<button type="button" class="gd-part${i.region === r ? ' is-on' : ''}" data-act="region" data-v="${esc(r)}" aria-pressed="${i.region === r}">${esc(r)}${i.region === r ? ' ✓' : ''}</button>`).join('')}</div>
        </div>`}

        <div class="gd-sec mt-5">
            <p class="gd-sec-title">${i.digital ? 'Цифровая копия' : 'Комплектность'}</p>
            ${i.digital
                ? '<p class="text-sm text-gray-500">Это цифровая версия — коробки и диска нет. Чек или скриншот библиотеки можно приложить в фото ниже.</p>'
                : `<div class="flex flex-wrap gap-2" role="group" aria-label="Комплектность">${PARTS.map(([k, ico, label]) =>
                    `<button type="button" class="gd-part${parts[k] ? ' is-on' : ''}" data-act="part" data-v="${k}" aria-pressed="${!!parts[k]}">${ico} ${label}${parts[k] ? ' ✓' : ''}</button>`).join('')}</div>`}
        </div>

        <div class="gd-sec mt-5">
            <div class="flex flex-wrap items-center justify-between gap-2 mb-2">
                <p class="gd-sec-title mb-0">Заметки и личное мнение</p>
                <span id="gd-saved" class="text-[11px] text-gray-500"></span>
            </div>
            <textarea id="gd-note" data-field class="gd-input gd-note" placeholder="Впечатления, трек-лист / OST, версия издания (NTSC-J, Greatest Hits…), особенности диска, что понравилось и что нет…">${esc(i.note || '')}</textarea>
            <div class="flex flex-wrap gap-2 mt-2">
                <button type="button" class="gd-tool" data-act="tpl" data-v="💬 Впечатления:\n">＋ Впечатления</button>
                <button type="button" class="gd-tool" data-act="tpl" data-v="🎵 Трек-лист / OST:\n1. ">＋ Трек-лист</button>
                <button type="button" class="gd-tool" data-act="tpl" data-v="💿 Издание: \n">＋ Об издании</button>
            </div>
        </div>

        <div class="gd-sec mt-5">
            <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
                <p class="gd-sec-title mb-0">Фото (${photos.length}/${MAX_PHOTOS})${kb ? ` · ~${kb} КБ` : ''}
                    ${lastPhoto && lastPhoto.gameId === i.id ? '<button type="button" class="gd-tool ml-2 normal-case tracking-normal" data-act="undophoto">↩ Вернуть фото</button>' : ''}</p>
                <label class="text-xs text-gray-400 flex items-center gap-2">Что на фото:
                    <select id="gd-photo-label" class="bg-[#0d0d14] text-white text-xs p-2 rounded-lg border border-white/10">${PHOTO_LABELS.map(l => `<option>${esc(l)}</option>`).join('')}</select>
                </label>
            </div>
            <div class="gd-photos">
                ${photos.map((p, idx) => `
                    <figure class="gd-photo" data-act="zoom" data-idx="${idx}">
                        <img src="${esc(imgSrc(p.src))}" alt="${esc(p.label || 'Фото')}" loading="lazy">
                        <figcaption class="gd-photo-cap">${esc(p.label || 'Фото')}</figcaption>
                        <div class="gd-photo-act">
                            <button type="button" data-act="cover" data-idx="${idx}" title="Сделать обложкой" aria-label="Сделать обложкой">🖼️</button>
                            <button type="button" data-act="delphoto" data-idx="${idx}" title="Удалить фото" aria-label="Удалить фото">🗑</button>
                        </div>
                    </figure>`).join('')}
                ${photos.length < MAX_PHOTOS ? `<button type="button" class="gd-photo-add" data-act="addphoto"><span aria-hidden="true">📷</span><span>Добавить фото</span></button>` : ''}
            </div>
            <p class="text-[11px] text-gray-500 mt-2">Фото сжимаются и хранятся в памяти браузера вместе с коллекцией — попадут и в бэкап (.json).</p>
        </div>`;
    }

    function renderDetail() {
        const item = gameById(dId);
        if (!item) { detail.classList.add('hidden'); return; }
        flushFields();
        body.innerHTML = detailHTML(item);
    }

    function openGameDetail(id) {
        dId = Number(id);
        if (!gameById(dId)) return;
        renderDetail();
        detail.classList.remove('hidden');
    }
    window.openGameDetail = openGameDetail;

    function flushFields() {
        clearTimeout(noteTimer);
        const item = gameById(dId);
        if (!dirty || !item) return;
        const note = $('gd-note'), disc = $('gd-disc'), hours = $('gd-hours');
        const tdone = $('gd-tdone'), ttotal = $('gd-ttotal');
        if (tdone) item.trophyDone = Math.max(0, parseInt(tdone.value) || 0);
        if (ttotal) item.trophyTotal = Math.max(0, parseInt(ttotal.value) || 0);
        if (note) item.note = note.value;
        if (disc) item.discCode = disc.value.trim();
        if (hours) item.hours = Math.max(0, parseFloat(hours.value) || 0);
        dirty = false;
        persistData();
        const flag = $('gd-saved');
        if (flag) flag.textContent = 'Сохранено ✓';
    }

    body.addEventListener('input', e => {
        if (!e.target.hasAttribute?.('data-field')) return;
        dirty = true;
        const flag = $('gd-saved');
        if (flag) flag.textContent = 'Сохраняю…';
        clearTimeout(noteTimer);
        noteTimer = setTimeout(flushFields, 600);
    });

    onHidden(detail, () => {
        const wasOpen = dId != null;
        flushFields();
        dId = null;
        if (wasOpen) updateUI();
    });
    window.addEventListener('pagehide', flushFields);

    async function addPhotos(files) {
        const item = gameById(dId);
        if (!item) return;
        flushFields();
        const list = [...files].filter(f => f.type.startsWith('image/'));
        const room = MAX_PHOTOS - photosOf(item).length;
        if (!list.length) return;
        if (room <= 0) { showToast(`Максимум ${MAX_PHOTOS} фото на игру`, 'error'); return; }
        const label = $('gd-photo-label')?.value || 'Фото';
        let added = 0;
        for (const file of list.slice(0, room)) {
            try {
                const src = await compressFile(file);
                const photo = { id: 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), src, label, ts: Date.now() };
                item.photos = [...photosOf(item), photo];
                if (!commit()) { item.photos = item.photos.slice(0, -1); break; }
                added++;
            } catch (err) {
                showToast('Не удалось обработать картинку', 'error');
            }
        }
        if (list.length > room) showToast(`Добавлено ${added}, остальные не влезли в лимит ${MAX_PHOTOS} фото`);
        else if (added) showToast(`Фото добавлено: ${added} 📷`, 'success');
        renderDetail();
    }
    fileInput.addEventListener('change', () => { addPhotos(fileInput.files); fileInput.value = ''; });

    detail.addEventListener('click', async e => {
        const act = e.target.closest('[data-act]');
        const item = gameById(dId);
        if (!act || !item) return;
        const v = act.dataset.v;
        const idx = Number(act.dataset.idx);
        switch (act.dataset.act) {
            case 'close': detail.classList.add('hidden'); break;
            case 'edit': pendingReopen = item.id; detail.classList.add('hidden'); openGameModal(item.id); break;
            case 'del':
                deleteGame(item.id);
                if (!gameById(item.id)) detail.classList.add('hidden');
                break;
            case 'rate':
                item.rating = item.rating === Number(v) ? 0 : Number(v);
                commit(); renderDetail(); break;
            case 'status':
                flushFields();
                setStatus(item, stOf(item) === v ? '' : v);
                commit(); renderDetail(); break;
            case 'online':
                flushFields();
                item.hasOnline = !item.hasOnline;
                commit(); renderDetail(); break;
            case 'trophy':
                flushFields();
                item.trophy = v;
                if (!v) { item.trophyDone = 0; item.trophyTotal = 0; }
                else if (v === 'full' && Number(item.trophyTotal) > 0) item.trophyDone = item.trophyTotal;
                commit(); renderDetail(); break;
            case 'region':
                flushFields();
                item.region = item.region === v ? '' : v;
                commit(); renderDetail(); break;
            case 'part':
                flushFields();
                item.parts = { ...(item.parts || {}), [v]: !(item.parts || {})[v] };
                commit(); renderDetail(); break;
            case 'tpl': {
                const ta = $('gd-note');
                if (!ta) break;
                ta.value = ta.value.trim() ? `${ta.value.replace(/\s+$/, '')}\n\n${v}` : v;
                ta.focus();
                ta.setSelectionRange(ta.value.length, ta.value.length);
                ta.dispatchEvent(new Event('input', { bubbles: true }));
                break;
            }
            case 'addphoto': fileInput.click(); break;
            case 'zoom':
                if (!e.target.closest('.gd-photo-act')) openLightbox(item.id, idx);
                break;
            case 'cover': {
                e.stopPropagation();
                const p = photosOf(item)[idx];
                if (!p) break;
                try {
                    item.img = await reencode(p.src, IMG_PRESETS.cover.max, IMG_PRESETS.cover.quality);
                    if (commit()) showToast('Фото стало обложкой 🖼️', 'success');
                    renderDetail();
                } catch (err) { showToast('Не удалось поставить обложку', 'error'); }
                break;
            }
            case 'delphoto': {
                // без подтверждения: удаляем сразу, а ошибочное удаление можно отменить кнопкой «↩ Вернуть фото»
                e.stopPropagation();
                const removed = photosOf(item)[idx];
                if (!removed) break;
                lastPhoto = { gameId: item.id, photo: removed, idx };
                item.photos = photosOf(item).filter((_, k) => k !== idx);
                commit(); renderDetail();
                break;
            }
            case 'undophoto': {
                if (!lastPhoto || lastPhoto.gameId !== item.id) break;
                const list = [...photosOf(item)];
                if (list.length >= MAX_PHOTOS) { showToast(`Максимум ${MAX_PHOTOS} фото на игру`, 'error'); break; }
                list.splice(Math.min(lastPhoto.idx, list.length), 0, lastPhoto.photo);
                item.photos = list;
                lastPhoto = null;
                commit(); renderDetail();
                break;
            }
        }
    });

    const deleteBase = window.deleteGame;
    window.deleteGame = id => {
        const item = gameById(id);
        if (!item) return;
        const heavy = (item.note || '').trim() || photosOf(item).length;
        if (!confirm(`Удалить «${item.title}» из коллекции?${heavy ? '\nЗаметки и фото этой игры тоже удалятся.' : ''}`)) return;
        deleteBase(id);
    };

    /* =====================================================
       Лайтбокс
       ===================================================== */
    const lightbox = document.createElement('div');
    lightbox.id = 'game-lightbox-modal';
    lightbox.className = 'hidden fixed inset-0 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center z-[60] p-4 gap-3';
    lightbox.setAttribute('role', 'dialog');
    lightbox.setAttribute('aria-modal', 'true');
    lightbox.setAttribute('aria-label', 'Просмотр фото');
    lightbox.innerHTML = `
        <img id="gl-img" class="gl-img" alt="">
        <p id="gl-cap" class="text-sm text-gray-300 font-bold text-center"></p>
        <button type="button" id="gl-prev" class="gl-nav" style="left:16px" aria-label="Предыдущее">‹</button>
        <button type="button" id="gl-next" class="gl-nav" style="right:16px" aria-label="Следующее">›</button>
        <button type="button" id="gl-close" class="absolute top-4 right-4 gd-tool" aria-label="Закрыть">✕</button>`;
    document.body.appendChild(lightbox);

    const lb = { id: null, idx: 0 };
    function renderLightbox() {
        const photos = photosOf(gameById(lb.id));
        if (!photos.length) { lightbox.classList.add('hidden'); return; }
        lb.idx = (lb.idx + photos.length) % photos.length;
        const p = photos[lb.idx];
        $('gl-img').src = imgSrc(p.src);
        $('gl-img').alt = p.label || 'Фото';
        $('gl-cap').textContent = `${p.label || 'Фото'} · ${lb.idx + 1} / ${photos.length}`;
        const multi = photos.length > 1;
        $('gl-prev').classList.toggle('hidden', !multi);
        $('gl-next').classList.toggle('hidden', !multi);
    }
    function openLightbox(id, idx) {
        lb.id = id; lb.idx = idx || 0;
        renderLightbox();
        lightbox.classList.remove('hidden');
    }
    $('gl-prev').onclick = () => { lb.idx--; renderLightbox(); };
    $('gl-next').onclick = () => { lb.idx++; renderLightbox(); };
    $('gl-close').onclick = () => lightbox.classList.add('hidden');
    onHidden(lightbox, () => { $('gl-img').removeAttribute('src'); });
    document.addEventListener('keydown', e => {
        if (lightbox.classList.contains('hidden')) return;
        if (e.key === 'ArrowLeft') { lb.idx--; renderLightbox(); }
        else if (e.key === 'ArrowRight') { lb.idx++; renderLightbox(); }
    });

    /* =====================================================
       «Во что поиграть?»
       ===================================================== */
    const roll = document.createElement('div');
    roll.id = 'game-roll-modal';
    roll.className = 'hidden fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[56] p-4';
    roll.setAttribute('role', 'dialog');
    roll.setAttribute('aria-modal', 'true');
    roll.setAttribute('aria-label', 'Случайная игра');
    roll.innerHTML = `
        <div id="roll-card" class="glass no-hover w-full max-w-md rounded-3xl p-7 text-center space-y-4 border border-white/10">
            <p class="text-xs uppercase tracking-widest text-gray-500 font-black">🎲 Во что поиграть? <span id="roll-pool" class="text-gray-400 normal-case tracking-normal font-semibold"></span></p>
            <div id="roll-cover" class="gd-cover mx-auto"></div>
            <div id="roll-plat"></div>
            <h3 id="roll-title" class="roll-title"></h3>
            <p id="roll-sub" class="text-sm text-gray-400 min-h-[1.25rem]"></p>
            <div id="roll-actions" class="flex flex-wrap gap-2 justify-center"></div>
        </div>`;
    document.body.appendChild(roll);

    let rollTimer = null;
    let rollItem = null;

    function rollPool() {
        const g = data.games || [];
        const tiers = [
            [g.filter(i => stOf(i) === 'backlog'), 'из «В планах»'],
            [g.filter(i => !stOf(i)), 'из игр без статуса'],
            [g.filter(i => stOf(i) === 'playing' || stOf(i) === 'dropped'), 'из начатых'],
            [g.filter(i => stOf(i) === 'online'), 'из онлайн-игр'],
        ];
        return tiers.find(t => t[0].length) || null;
    }
    /* Один «кадр» барабана. dur — длительность анимации смены (мс), 0 — финальный кадр.
       Анимация всегда короче паузы до следующего кадра, поэтому не обрывается на старте и не мигает. */
    function paintRoll(i, dur) {
        const src = imgSrc(i.img);
        $('roll-cover').innerHTML = src ? `<img src="${esc(src)}" alt="">` : '🎮';
        $('roll-plat').innerHTML = platBadge(i.platform, true);
        $('roll-title').textContent = i.title;
        [$('roll-title'), $('roll-cover')].forEach(el => {
            el.classList.remove('roll-spin', 'roll-land');
            el.style.animationDuration = '';
            void el.offsetWidth; // перезапуск анимации
            if (dur) { el.style.animationDuration = `${dur}ms`; el.classList.add('roll-spin'); }
            else el.classList.add('roll-land');
        });
    }
    function rollGame() {
        const pool = rollPool();
        if (!pool) { showToast('Добавьте игры в коллекцию — тогда будет из чего выбирать 🎮'); return; }
        const [list, poolLabel] = pool;
        clearTimeout(rollTimer);
        $('roll-pool').textContent = poolLabel;
        $('roll-actions').innerHTML = '';
        $('roll-sub').textContent = 'Крутим барабан…';
        $('roll-card').classList.add('is-rolling');
        roll.classList.remove('hidden');

        let finalPick = list[Math.floor(Math.random() * list.length)];
        if (list.length > 1) while (finalPick === rollItem) finalPick = list[Math.floor(Math.random() * list.length)];

        // барабан замедляется к концу: пауза между кадрами растёт от ~45 мс до ~245 мс
        const TOTAL = 16;
        let tick = 0, last = null;
        const step = () => {
            tick++;
            if (tick >= TOTAL) {
                paintRoll(finalPick, 0);
                rollItem = finalPick;
                $('roll-card').classList.remove('is-rolling');
                const meta = [finalPick.year, finalPick.developer, finalPick.edition].filter(Boolean).join(' • ');
                $('roll-sub').textContent = meta || (finalPick.digital ? 'Цифровая копия ☁️' : 'Диск 💿');
                $('roll-actions').innerHTML = `
                    <button type="button" data-roll="again" class="gd-tool">🎲 Ещё раз</button>
                    ${stOf(finalPick) !== 'playing' ? '<button type="button" data-roll="start" class="gd-tool">▶ Начать играть</button>' : ''}
                    <button type="button" data-roll="open" class="gd-tool">📖 Открыть</button>`;
                return;
            }
            let shown = list[Math.floor(Math.random() * list.length)];
            if (list.length > 1) while (shown === last) shown = list[Math.floor(Math.random() * list.length)];
            last = shown;
            const delay = 45 + Math.pow(tick / TOTAL, 2.2) * 200;
            paintRoll(shown, Math.min(150, Math.round(delay * 0.9)));
            rollTimer = setTimeout(step, delay);
        };
        step();
    }
    roll.addEventListener('click', e => {
        const b = e.target.closest('[data-roll]');
        if (!b || !rollItem) return;
        if (b.dataset.roll === 'again') rollGame();
        else if (b.dataset.roll === 'start') {
            const item = gameById(rollItem.id);
            if (item) { setStatus(item, 'playing'); commit(); showToast(`Приятной игры: <strong>${esc(item.title)}</strong> 🎮`); }
            roll.classList.add('hidden');
        } else if (b.dataset.roll === 'open') {
            roll.classList.add('hidden');
            openGameDetail(rollItem.id);
        }
    });
    onHidden(roll, () => { clearTimeout(rollTimer); $('roll-card').classList.remove('is-rolling'); });
    window.rollGame = rollGame;

    /* =====================================================
       Интеграции: палитра Ctrl+K, достижения
       ===================================================== */
    if (typeof PALETTE_ACTIONS !== 'undefined') {
        PALETTE_ACTIONS.push({ icon: '🎮', title: 'Во что поиграть?', hint: 'Случайная игра из бэклога', run: () => { showPage('games'); rollGame(); } });
    }
    if (typeof jumpToItem === 'function') {
        const jumpBase = jumpToItem;
        jumpToItem = function (sec, item) {
            if (sec.key === 'games') { showPage('games'); openGameDetail(item.id); return; }
            jumpBase(sec, item);
        };
    }

    if (typeof ACHIEVEMENTS_LIST !== 'undefined' && !ACHIEVEMENTS_LIST.some(a => a.id === 'game_shelf')) {
        const games = d => d.games || [];
        ACHIEVEMENTS_LIST.push(
            {
                id: 'game_shelf', title: 'Игровая полка', icon: '🎮', isTiered: true, getVal: d => games(d).length,
                tiers: [
                    { req: 3, label: 'Lvl 1', xp: 40, desc: 'Собрать 3 игры в коллекции' },
                    { req: 10, label: 'Lvl 2', xp: 100, desc: 'Собрать 10 игр в коллекции' },
                    { req: 25, label: 'Lvl 3', xp: 220, desc: 'Собрать 25 игр в коллекции' }
                ]
            },
            {
                id: 'game_finisher', title: 'Финальные титры', icon: '🏁', isTiered: true,
                getVal: d => games(d).filter(g => g.status === 'completed').length,
                tiers: [
                    { req: 1, label: 'Lvl 1', xp: 40, desc: 'Пройти 1 игру из коллекции' },
                    { req: 5, label: 'Lvl 2', xp: 100, desc: 'Пройти 5 игр из коллекции' },
                    { req: 15, label: 'Lvl 3', xp: 250, desc: 'Пройти 15 игр из коллекции' }
                ]
            },
            {
                id: 'trophy_hunter', title: 'Охотник за трофеями', icon: '🏆', isTiered: true,
                getVal: d => games(d).filter(g => g.trophy && (g.trophy === 'full' || ((Number(g.trophyTotal) || 0) > 0 && (Number(g.trophyDone) || 0) >= Number(g.trophyTotal)))).length,
                tiers: [
                    { req: 1, label: 'Lvl 1', xp: 60, desc: 'Выбить 100% ачивок (платину) в 1 игре' },
                    { req: 5, label: 'Lvl 2', xp: 150, desc: 'Выбить 100% ачивок в 5 играх' },
                    { req: 10, label: 'Lvl 3', xp: 300, desc: 'Выбить 100% ачивок в 10 играх' }
                ]
            },
            { id: 'platform_hopper', title: 'Мульти-платформер', desc: 'Иметь игры минимум на 4 разных платформах', icon: '🕹️', xp: 60,
              cond: d => new Set(games(d).map(g => g.platform).filter(Boolean)).size >= 4 },
            { id: 'photo_archivist', title: 'Фотоархивариус', desc: 'Добавить 5 фото к играм (диски, коробки, мануалы)', icon: '📷', xp: 50,
              cond: d => games(d).reduce((n, g) => n + (Array.isArray(g.photos) ? g.photos.length : 0), 0) >= 5 },
            { id: 'cib_keeper', title: 'Полный комплект', desc: 'Отметить 3 игры как CIB: коробка, диск и мануал на месте', icon: '📦', xp: 60,
              cond: d => games(d).filter(g => !g.digital && g.parts && g.parts.box && g.parts.disc && g.parts.manual).length >= 3 }
        );
    }

    /* ---------- Подключение ---------- */
    setupPage();
    setupModal();
    updateUI();
})();
