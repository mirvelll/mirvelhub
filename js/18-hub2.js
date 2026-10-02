/* =========================================================
   MIRVEL HUB — 18-hub2.js (подключать ПОСЛЕ 17-convenience.js)
   1. Заметки: плавающая панель (двигается, меняет размер, поиск, закрепление, цвета)
   2. Главная: приветствие, чипы коллекции, «Избранное» (трек, клип, игра, любая ссылка), «Игра дня»
   3. Рейтинг артистов и обновлённое окно артиста
   4. Расширенная статистика (игры, оценки, месяцы, магазины, желаемое)
   5. Язык: русский / English / Українська
   6. Настройки интерфейса («Слушать» по умолчанию скрыто)
   Новые поля data: spotlights[], lang, showScrobble, since; у заметок: pinned, color, ts
   ========================================================= */
(() => {
    const $ = id => document.getElementById(id);
    const LSK = 'mirvel_ui2';
    const ui = {
        get(k, d) { try { const v = JSON.parse(localStorage.getItem(LSK + k)); return v ?? d; } catch (e) { return d; } },
        set(k, v) { try { localStorage.setItem(LSK + k, JSON.stringify(v)); } catch (e) {} }
    };
    const persistSoon = debounce(() => persistData(), 350);
    const num = v => Number(v) || 0;
    const lc = s => String(s || '').trim().toLowerCase();
    const imgSrc = s => { const v = String(s || ''); return /^data:image\//i.test(v) ? v : safeUrl(v); };
    const hue = s => [...String(s)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 360, 7);
    const LOCALE = { ru: 'ru-RU', en: 'en-US', uk: 'uk-UA' };
    const loc = () => LOCALE[data.lang] || 'ru-RU';

    function ensure() {
        if (!data.since) data.since = Date.now();
        if (!data.lang) data.lang = 'ru';
        if (data.showScrobble === undefined) data.showScrobble = false;
        if (!Array.isArray(data.quickNotes)) data.quickNotes = [];
        if (!Array.isArray(data.spotlights)) {
            data.spotlights = [];
            const a = data.favArtist || {}, b = data.favAlbum || {};
            if (a.name) data.spotlights.push({ id: Date.now(), kind: 'artist', title: a.name, sub: '', url: a.url || '', img: a.img || '' });
            if (b.name) data.spotlights.push({ id: Date.now() + 1, kind: 'album', title: b.name, sub: '', url: b.url || '', img: b.img || '' });
        }
    }
    ensure();

    function compress(file, max = 420) {
        return new Promise((res, rej) => {
            const r = new FileReader();
            r.onload = () => {
                const im = new Image();
                im.onload = () => {
                    const s = Math.min(1, max / Math.max(im.width, im.height));
                    const c = document.createElement('canvas');
                    c.width = Math.round(im.width * s) || 1; c.height = Math.round(im.height * s) || 1;
                    c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
                    res(c.toDataURL('image/jpeg', 0.72));
                };
                im.onerror = rej; im.src = r.result;
            };
            r.onerror = rej; r.readAsDataURL(file);
        });
    }

    /* =====================================================
       1. ЗАМЕТКИ
       ===================================================== */
    const NCOL = ['', '#fbbf24', '#34d399', '#60a5fa', '#f472b6', '#a78bfa'];
    let nSel = null, nQ = '', lastDel = null, undoTimer = null;
    const nTitle = n => (String(n.text || '').split('\n').find(l => l.trim()) || 'Пустая заметка').trim().slice(0, 48);
    const nSorted = () => [...data.quickNotes]
        .filter(n => !nQ || lc(n.text).includes(nQ))
        .sort((a, b) => (!!b.pinned - !!a.pinned) || num(b.ts || b.id) - num(a.ts || a.id));
    const nCur = () => data.quickNotes.find(n => n.id === nSel);

    function buildNotes() {
        const p = document.createElement('aside');
        p.id = 'notes-panel';
        p.className = 'np glass no-hover hidden';
        p.setAttribute('aria-label', 'Заметки');
        p.innerHTML = `
        <div class="np-head" id="np-drag">
            <span class="font-black text-sm">📝 Заметки <small id="np-count" class="text-gray-500 font-semibold"></small></span>
            <span class="flex-1"></span>
            <button type="button" data-np="export" title="Скачать все заметки (.txt)" aria-label="Скачать все заметки">⤓</button>
            <button type="button" data-np="min" title="Свернуть" aria-label="Свернуть">—</button>
            <button type="button" data-np="close" title="Закрыть (M)" aria-label="Закрыть">✕</button>
        </div>
        <div class="np-body">
            <div class="np-side">
                <input id="np-search" type="search" class="np-in" placeholder="Поиск…" aria-label="Поиск по заметкам">
                <button type="button" class="np-new" data-np="new">＋ Новая заметка</button>
                <div id="np-list" class="np-list"></div>
            </div>
            <div class="np-edit">
                <textarea id="np-text" class="np-text" placeholder="Пишите здесь. Первая строка станет заголовком."></textarea>
                <div class="np-tools">
                    <span id="np-colors"></span>
                    <button type="button" data-np="pin" title="Закрепить">📌</button>
                    <button type="button" data-np="date" title="Вставить дату и время">🕒</button>
                    <button type="button" data-np="todo" title="Пункт списка">☑</button>
                    <button type="button" data-np="copy" title="Копировать текст">📋</button>
                    <button type="button" data-np="del" title="Удалить заметку">🗑</button>
                    <span class="flex-1"></span><small id="np-meta"></small>
                </div>
            </div>
        </div>
        <div id="np-undo" class="np-undo hidden"><span>Заметка удалена</span><button type="button" data-np="undo">↩ Вернуть</button></div>`;
        document.body.appendChild(p);

        const st = ui.get('np', {});
        if (st.w) p.style.width = st.w + 'px';
        if (st.h) p.style.height = st.h + 'px';

        p.addEventListener('click', e => {
            const dot = e.target.closest('[data-c]');
            if (dot) { const n = nCur(); if (n) { n.color = dot.dataset.c; n.ts = Date.now(); persistSoon(); renderNotes(); } return; }
            const item = e.target.closest('[data-id]');
            if (item) { selectNote(Number(item.dataset.id)); return; }
            const b = e.target.closest('[data-np]');
            if (b) noteAction(b.dataset.np);
        });
        $('np-search').addEventListener('input', e => { nQ = lc(e.target.value); renderNotes(); });
        $('np-text').addEventListener('input', e => {
            const n = nCur(); if (!n) return;
            n.text = e.target.value; n.ts = Date.now(); persistSoon(); renderNotes(true);
        });
        $('np-text').addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); noteAction('new'); } });
        p.addEventListener('keydown', e => { if (e.key === 'Escape') closeNotes(); });

        // перетаскивание за заголовок
        const head = $('np-drag');
        let off = null;
        head.addEventListener('pointerdown', e => {
            if (e.target.closest('button') || innerWidth <= 640) return;
            const r = p.getBoundingClientRect();
            off = { x: e.clientX - r.left, y: e.clientY - r.top };
            head.setPointerCapture(e.pointerId);
        });
        head.addEventListener('pointermove', e => { if (off) placeNotes(e.clientX - off.x, e.clientY - off.y); });
        head.addEventListener('pointerup', () => { if (off) { off = null; saveNotesRect(); } });
        head.addEventListener('dblclick', e => { if (!e.target.closest('button')) noteAction('min'); });

        if ('ResizeObserver' in window) new ResizeObserver(() => { if (!p.classList.contains('hidden') && !p.classList.contains('is-min')) saveNotesRect(); }).observe(p);
        addEventListener('resize', () => { if (!p.classList.contains('hidden')) { const r = p.getBoundingClientRect(); placeNotes(r.left, r.top); } });
    }

    function placeNotes(x, y) {
        const p = $('notes-panel'), r = p.getBoundingClientRect();
        p.style.left = Math.max(8, Math.min(innerWidth - Math.min(r.width, 120) - 8, x)) + 'px';
        p.style.top = Math.max(8, Math.min(innerHeight - 60, y)) + 'px';
    }
    function saveNotesRect() {
        const p = $('notes-panel'), r = p.getBoundingClientRect();
        if (p.classList.contains('is-min')) { ui.set('np', { ...ui.get('np', {}), x: r.left, y: r.top }); return; }
        ui.set('np', { x: r.left, y: r.top, w: Math.round(r.width), h: Math.round(r.height) });
    }

    function openNotes() {
        ensure();
        const p = $('notes-panel');
        const first = p.classList.contains('hidden');
        p.classList.remove('hidden');
        if (first) {
            const st = ui.get('np', {}), r = p.getBoundingClientRect();
            placeNotes(st.x ?? innerWidth - r.width - 24, st.y ?? innerHeight - r.height - 100);
            if (nSel === null || !nCur()) nSel = (nSorted()[0] || {}).id ?? null;
            renderNotes();
            selectNote(nSel, true);
        }
    }
    function closeNotes() { persistData(); $('notes-panel').classList.add('hidden'); }
    window.openNotes = openNotes;
    window.toggleNotes = () => $('notes-panel').classList.contains('hidden') ? openNotes() : closeNotes();

    function selectNote(id, noFocus) {
        nSel = id;
        const n = nCur();
        $('np-text').value = n ? n.text || '' : '';
        $('np-text').disabled = !n;
        renderNotes();
        if (n && !noFocus && innerWidth > 640) $('np-text').focus();
    }

    function renderNotes(listOnly) {
        const list = nSorted(), cur = nCur();
        $('np-count').textContent = data.quickNotes.length ? `· ${data.quickNotes.length}` : '';
        $('np-list').innerHTML = list.map(n => {
            const body = String(n.text || '').split('\n').filter(l => l.trim()).slice(1).join(' ');
            return `<button type="button" class="np-item${n.id === nSel ? ' is-sel' : ''}" data-id="${n.id}" style="--c:${esc(n.color || '')}">
                <span>${n.pinned ? '📌 ' : ''}${esc(nTitle(n))}</span><small>${esc(body || new Date(n.ts || n.id).toLocaleDateString(loc()))}</small></button>`;
        }).join('') || `<p class="text-[11px] text-gray-500 italic p-2">${nQ ? 'Ничего не найдено' : 'Заметок пока нет'}</p>`;
        $('np-colors').innerHTML = NCOL.map(c => `<i class="np-dot${cur && (cur.color || '') === c ? ' is-on' : ''}" data-c="${c}" style="--c:${c}" role="button" aria-label="Цвет"></i>`).join('');
        const pin = $('notes-panel').querySelector('[data-np="pin"]');
        pin.classList.toggle('is-on', !!(cur && cur.pinned));
        const t = cur ? String(cur.text || '') : '';
        $('np-meta').textContent = cur ? `${t.trim() ? t.trim().split(/\s+/).length : 0} сл. · ${t.length} зн.` : '';
    }

    function noteAction(a) {
        const p = $('notes-panel'), n = nCur(), ta = $('np-text');
        if (a === 'close') return closeNotes();
        if (a === 'min') { p.classList.toggle('is-min'); return; }
        if (a === 'new') {
            const note = { id: Date.now(), text: '', pinned: false, color: '', ts: Date.now() };
            data.quickNotes.push(note); nQ = ''; $('np-search').value = '';
            persistSoon(); selectNote(note.id); return;
        }
        if (a === 'export') {
            if (!data.quickNotes.length) return showToast('Заметок пока нет');
            downloadFile(`mirvel_notes_${todayStamp()}.txt`, data.quickNotes.map(x => x.text).join('\n\n----------\n\n'), 'text/plain;charset=utf-8');
            return;
        }
        if (a === 'undo' && lastDel) {
            data.quickNotes.push(lastDel); const id = lastDel.id; lastDel = null;
            $('np-undo').classList.add('hidden'); persistSoon(); selectNote(id); return;
        }
        if (!n) return;
        if (a === 'pin') { n.pinned = !n.pinned; persistSoon(); renderNotes(); }
        else if (a === 'copy') { navigator.clipboard?.writeText(n.text || '').then(() => showToast('Заметка скопирована 📋', 'success'), () => showToast('Не удалось скопировать', 'error')); }
        else if (a === 'date' || a === 'todo') {
            const add = a === 'date' ? new Date().toLocaleString(loc(), { dateStyle: 'medium', timeStyle: 'short' }) : '- [ ] ';
            const s = ta.selectionStart ?? ta.value.length;
            ta.value = ta.value.slice(0, s) + add + ta.value.slice(ta.selectionEnd ?? s);
            ta.selectionStart = ta.selectionEnd = s + add.length; ta.focus();
            n.text = ta.value; n.ts = Date.now(); persistSoon(); renderNotes();
        } else if (a === 'del') {
            const next = nSorted().find(x => x.id !== n.id);
            lastDel = n; data.quickNotes = data.quickNotes.filter(x => x.id !== n.id);
            persistSoon(); selectNote(next ? next.id : null, true);
            $('np-undo').classList.remove('hidden');
            clearTimeout(undoTimer); undoTimer = setTimeout(() => $('np-undo').classList.add('hidden'), 6000);
        }
    }

    /* =====================================================
       2. ГЛАВНАЯ: приветствие, чипы, избранное, игра дня
       ===================================================== */
    function facts() {
        const cds = data.cds || [], vin = data.vinyls || [], games = data.games || [], stuff = data.stuff || [];
        const music = [...cds, ...vin], all = [...music, ...games, ...stuff];
        const out = [], priced = all.filter(i => num(i.price) > 0);
        if (priced.length) out.push(`💡 Средняя цена позиции в коллекции — ${Math.round(priced.reduce((s, i) => s + num(i.price), 0) / priced.length)} ₴`);
        const top = artistRows().sort((a, b) => b.count - a.count)[0];
        if (top && top.count > 1) out.push(`💡 Больше всего релизов у ${top.name}: ${top.count}`);
        const dated = music.filter(i => num(i.year) > 1900).sort((a, b) => a.year - b.year);
        if (dated.length) out.push(`💡 Самый старый релиз: «${dated[0].title}», ${dated[0].year} год`);
        const hrs = games.reduce((s, g) => s + num(g.hours), 0);
        if (hrs) out.push(`💡 В играх проведено ${Math.round(hrs)} ч`);
        const bl = games.filter(g => g.status === 'backlog').length;
        if (bl) out.push(`💡 В бэклоге ${bl} игр — может, сегодня одну из них?`);
        const last = [...all].sort((a, b) => num(b.id) - num(a.id))[0];
        if (last) out.push(`💡 Последнее добавление: «${last.title}»`);
        return out.length ? out : ['💡 Добавьте первые позиции — здесь появятся факты о вашей коллекции'];
    }
    let factIdx = 0;

    function renderHero() {
        const box = document.querySelector('#greeting-banner .relative.z-10.flex-grow');
        if (!box) return;
        const nameEl = $('display-name');
        let g = $('hero-greet');
        if (!g) {
            g = document.createElement('p'); g.id = 'hero-greet'; g.className = 'hero-greet';
            nameEl.closest('h2').insertAdjacentElement('beforebegin', g);
            $('display-artists')?.parentElement.classList.add('hidden');
        }
        const h = new Date().getHours();
        g.textContent = h < 5 ? 'Доброй ночи 🌙' : h < 12 ? 'Доброе утро ☀️' : h < 18 ? 'Добрый день 👋' : 'Добрый вечер 🌆';

        let ex = $('hero-extra');
        if (!ex) {
            ex = document.createElement('div'); ex.id = 'hero-extra'; box.appendChild(ex);
            ex.addEventListener('click', e => {
                const c = e.target.closest('[data-go]');
                if (c) return showPage(c.dataset.go);
                const a = e.target.closest('[data-artist]');
                if (a) { openCommandPalette(); $('palette-input').value = a.dataset.artist; renderPalette(); return; }
                if (e.target.closest('.hero-fact')) { factIdx++; renderHero(); }
            });
        }
        const days = Math.max(1, Math.ceil((Date.now() - num(data.since)) / 864e5));
        const cnt = k => (data[k] || []).length;
        const chips = [['cds', '💿'], ['vinyls', '💽'], ['games', '🎮'], ['stuff', '📦'], ['wishlists', '🎁']]
            .map(([k, ic]) => `<button type="button" class="hero-chip" data-go="${k}" title="${esc(PAGE_TITLES[k])}">${ic} ${cnt(k)}</button>`).join('');
        const arts = splitArtists(data.favoriteArtists).slice(0, 6)
            .map(a => `<button type="button" class="hero-chip is-artist" data-artist="${esc(a)}">♪ ${esc(a)}</button>`).join('');
        const fl = facts();
        ex.innerHTML = `<div class="hero-chips">${chips}<span class="hero-chip" style="cursor:default">📅 ${days} дн.</span></div>
            ${arts ? `<div class="hero-chips">${arts}</div>` : ''}
            <p class="hero-fact" title="Нажмите — другой факт">${esc(fl[factIdx % fl.length])}</p>`;
    }

    /* ---- «Игра дня» рядом с «Пластинкой дня» ---- */
    let gShift = 0, gCur = null;
    const GST = { backlog: '🗓 В планах', playing: '▶ В процессе', completed: '✔ Пройдено', online: '🌐 Онлайн', dropped: '⏸ Заброшено', skipped: '💤 Не в планах' };

    function dailyRow() {
        let row = $('daily-row');
        if (!row) {
            const potd = $('potd-widget');
            if (!potd) return null;
            row = document.createElement('div'); row.id = 'daily-row'; row.className = 'daily-row';
            potd.insertAdjacentElement('beforebegin', row); row.appendChild(potd);
        }
        return row;
    }

    function renderGotd() {
        const row = dailyRow(); if (!row) return;
        let el = $('gotd-widget');
        if (!el) { el = document.createElement('section'); el.id = 'gotd-widget'; el.className = 'glass gotd'; el.setAttribute('aria-label', 'Игра дня'); row.appendChild(el); }
        const games = [...(data.games || [])].sort((a, b) => a.id - b.id);
        const open = games.filter(g => !['completed', 'skipped', 'online'].includes(g.status));
        const pool = open.length ? open : games;
        if (!pool.length) {
            gCur = null;
            el.innerHTML = `<div class="gotd-cover" aria-hidden="true">🎮</div><div class="min-w-0 flex-1 relative"><h3 class="font-black text-lg">Здесь появится игра дня</h3>
                <p class="text-gray-400 text-sm mt-1">Добавьте игры — хаб будет предлагать, во что сыграть сегодня.</p>
                <button type="button" class="potd-btn is-primary mt-3" onclick="openGameModal()">＋ Добавить игру</button></div>`;
            return;
        }
        const g = pool[(Math.floor(Date.now() / 864e5) * 104729 + gShift) % pool.length];
        gCur = g.id;
        const src = imgSrc(g.img);
        el.innerHTML = `<div class="gotd-cover" aria-hidden="true">${src ? `<img src="${esc(src)}" alt="">` : '🎮'}</div>
            <div class="min-w-0 flex-1 relative">
                <p class="text-xs text-gray-400">Игра дня</p>
                <h3 class="font-black text-xl truncate" title="${esc(g.title)}">${esc(g.title)}</h3>
                <p class="text-cyan-300 text-sm truncate">${esc(g.platform || 'Другое')}${g.year ? ' · ' + esc(g.year) : ''}${GST[g.status] ? ' · ' + GST[g.status] : ''}</p>
                <div class="flex gap-2 mt-3 flex-wrap">
                    <button type="button" class="potd-btn is-primary" onclick="gotdOpen()">📖 Открыть</button>
                    <button type="button" class="potd-btn" onclick="gotdShuffle()">🔀 Другую</button>
                </div>
            </div>`;
    }
    window.gotdOpen = () => { if (gCur != null) { showPage('games'); window.openGameDetail?.(gCur); } };
    window.gotdShuffle = () => { gShift++; renderGotd(); };

    /* ---- Избранное ---- */
    const KINDS = {
        artist: ['🏅', 'Артист месяца'], album: ['💿', 'Альбом месяца'], track: ['🎵', 'Трек месяца'], game: ['🎮', 'Игра месяца'],
        song: ['❤️', 'Любимая песня'], clip: ['🎬', 'Клип'], link: ['🔗', 'Ссылка'], other: ['✨', 'Другое']
    };
    const ytId = u => {
        try {
            const x = new URL(u), h = x.hostname.replace(/^www\.|^m\./, '');
            if (h === 'youtu.be') return x.pathname.slice(1);
            if (/(^|\.)youtube\.com$/.test(h)) return x.searchParams.get('v') || '';
        } catch (e) {}
        return '';
    };
    const spotImg = s => imgSrc(s.img) || (ytId(s.url) ? `https://i.ytimg.com/vi/${encodeURIComponent(ytId(s.url))}/hqdefault.jpg` : '');

    function renderSpots() {
        let sec = $('spot-section');
        if (!sec) {
            const old = $('fav-link-artist')?.closest('.grid');
            if (!old) return;
            old.classList.add('hidden');
            sec = document.createElement('section'); sec.id = 'spot-section'; sec.className = 'glass p-6 md:p-8 rounded-3xl mb-10';
            old.insertAdjacentElement('beforebegin', sec);
            sec.addEventListener('click', e => {
                const ed = e.target.closest('[data-sp-edit]');
                if (ed) { e.preventDefault(); e.stopPropagation(); return openSpot(Number(ed.dataset.spEdit)); }
                if (e.target.closest('[data-sp-add]')) openSpot(null);
            });
            ['fav-input-artist', 'fav-input-album'].forEach(id => $(id)?.closest('.glass')?.classList.add('hidden'));
        }
        const list = data.spotlights || [];
        const cards = list.map(s => {
            const [ic, lab] = KINDS[s.kind] || KINDS.other, src = spotImg(s), url = safeUrl(s.url);
            const inner = `<span class="sp-cover" aria-hidden="true">${src ? `<img src="${esc(src)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : ic}</span>
                <span class="sp-body"><span class="sp-kind">${ic} ${esc(lab)}</span><span class="sp-title block">${esc(s.title)}</span>${s.sub ? `<span class="sp-sub block">${esc(s.sub)}</span>` : ''}</span>
                <button type="button" class="sp-edit" data-sp-edit="${s.id}" aria-label="Изменить">✏️</button>`;
            return url ? `<a class="sp-card" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${inner}</a>` : `<div class="sp-card" data-sp-edit="${s.id}" role="button" tabindex="0">${inner}</div>`;
        }).join('');
        sec.innerHTML = `<div class="flex items-center justify-between gap-3 mb-5">
            <div><h3 class="text-gray-400 text-sm uppercase tracking-wider font-bold">⭐ Избранное</h3><p class="text-xs text-gray-500">Артист, альбом, трек, клип, игра или любая ссылка</p></div>
            <button type="button" class="hx-btn is-primary" data-sp-add>＋ Добавить</button></div>
            <div class="sp-grid">${cards}<button type="button" class="sp-card sp-add" data-sp-add>＋ Добавить в избранное</button></div>`;
    }

    let spEdit = null, spKind = 'artist', spImgData = '';
    function buildSpot() {
        const m = document.createElement('div');
        m.id = 'spot-modal';
        m.className = 'hidden fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4';
        m.innerHTML = `<div class="glass no-hover w-full max-w-md p-7 space-y-4 max-h-[92vh] overflow-y-auto">
            <div class="flex items-center justify-between"><h2 id="sp-h" class="font-black">Избранное</h2>
                <button type="button" class="text-gray-400 hover:text-white text-xl" onclick="closeModal('spot-modal')" aria-label="Закрыть">✕</button></div>
            <div id="sp-kinds" class="flex flex-wrap gap-2"></div>
            <input id="sp-title" class="hx-in" placeholder="Название: трек, игра, клип…">
            <input id="sp-sub" class="hx-in" placeholder="Исполнитель или подпись (необязательно)">
            <input id="sp-url" class="hx-in" placeholder="🔗 Ссылка: YouTube, Spotify, Steam… (необязательно)">
            <div class="flex gap-2 items-center"><button type="button" id="sp-pick" class="hx-btn">📷 Картинка</button><button type="button" id="sp-clear" class="hx-btn hidden">Убрать</button>
                <span id="sp-note" class="text-[11px] text-gray-500">Для YouTube обложка подтянется сама</span></div>
            <input type="file" id="sp-file" accept="image/*" class="hidden">
            <div class="flex gap-2"><button type="button" id="sp-del" class="hx-btn is-danger hidden">Удалить</button><button type="button" id="sp-save" class="hx-btn is-primary flex-1">Сохранить</button></div></div>`;
        document.body.appendChild(m);
        $('sp-kinds').addEventListener('click', e => { const b = e.target.closest('[data-k]'); if (b) { spKind = b.dataset.k; paintKinds(); } });
        $('sp-pick').onclick = () => $('sp-file').click();
        $('sp-file').onchange = async e => {
            const f = e.target.files[0]; if (!f) return;
            try { spImgData = await compress(f); $('sp-note').textContent = 'Картинка готова ✨'; $('sp-clear').classList.remove('hidden'); }
            catch (err) { showToast('Не удалось прочитать картинку', 'error'); }
            e.target.value = '';
        };
        $('sp-clear').onclick = () => { spImgData = ''; $('sp-clear').classList.add('hidden'); $('sp-note').textContent = 'Картинка убрана'; };
        $('sp-save').onclick = saveSpot;
        $('sp-del').onclick = () => { data.spotlights = data.spotlights.filter(x => x.id !== spEdit); save(); closeModal('spot-modal'); showToast('Удалено из избранного'); };
    }
    function paintKinds() {
        $('sp-kinds').innerHTML = Object.entries(KINDS).map(([k, [ic, lab]]) => `<button type="button" data-k="${k}" class="sp-kinds-btn${k === spKind ? ' is-on' : ''}">${ic} ${esc(lab)}</button>`).join('');
    }
    function openSpot(id) {
        const s = id ? data.spotlights.find(x => x.id === id) : null;
        spEdit = s ? s.id : null; spKind = s ? s.kind : 'track'; spImgData = s ? s.img || '' : '';
        $('sp-h').textContent = s ? 'Изменить избранное' : 'Добавить в избранное';
        $('sp-title').value = s ? s.title : ''; $('sp-sub').value = s ? s.sub || '' : ''; $('sp-url').value = s ? s.url || '' : '';
        $('sp-del').classList.toggle('hidden', !s); $('sp-clear').classList.toggle('hidden', !spImgData);
        $('sp-note').textContent = 'Для YouTube обложка подтянется сама';
        paintKinds();
        $('spot-modal').classList.remove('hidden');
        $('sp-title').focus();
    }
    function saveSpot() {
        const title = $('sp-title').value.trim();
        let url = $('sp-url').value.trim();
        if (!title && !url) return showToast('Введите название или ссылку', 'error');
        if (url && !/^https?:\/\//i.test(url)) url = 'https://' + url;
        const rec = { kind: spKind, title: title || url.replace(/^https?:\/\/(www\.)?/, '').slice(0, 60), sub: $('sp-sub').value.trim(), url: safeUrl(url), img: spImgData };
        if (spEdit) Object.assign(data.spotlights.find(x => x.id === spEdit) || {}, rec);
        else data.spotlights.push({ id: Date.now(), ...rec });
        if (!commitOk()) return;
        closeModal('spot-modal');
        showToast('Сохранено в избранное ⭐', 'success');
    }
    const commitOk = () => { checkAchievements(); const ok = persistData(); updateUI(); return ok; };

    /* =====================================================
       3. РЕЙТИНГ АРТИСТОВ + ОКНО АРТИСТА
       ===================================================== */
    const art = { sort: 'count', q: '', all: false };
    function artistRows() {
        const m = new Map();
        [['cds', data.cds], ['vinyls', data.vinyls]].forEach(([t, arr]) => (arr || []).forEach(i => {
            const n = (i.artist || '').trim(); if (!n) return;
            const r = m.get(lc(n)) || { name: n, count: 0, spent: 0, rs: 0, rn: 0 };
            r.count++; r.spent += num(i.price);
            if (i.rating) { r.rs += i.rating; r.rn++; }
            m.set(lc(n), r);
        }));
        return [...m.values()];
    }

    function renderArtists() {
        const grid = $('artist-stats-grid'); if (!grid) return;
        if (!$('art-ctl')) {
            const ctl = document.createElement('div'); ctl.id = 'art-ctl'; ctl.className = 'art-ctl';
            ctl.innerHTML = `<input id="art-q" type="search" placeholder="Найти артиста…" aria-label="Найти артиста">
                <div class="hx-seg" id="art-sort"><button type="button" data-s="count">Релизы</button><button type="button" data-s="spent">Потрачено</button><button type="button" data-s="rating">Оценка</button></div>`;
            grid.insertAdjacentElement('beforebegin', ctl);
            $('art-q').addEventListener('input', e => { art.q = lc(e.target.value); renderArtists(); });
            $('art-sort').addEventListener('click', e => { const b = e.target.closest('[data-s]'); if (b) { art.sort = b.dataset.s; renderArtists(); } });
            grid.addEventListener('click', e => {
                if (e.target.closest('[data-more]')) { art.all = !art.all; return renderArtists(); }
                const r = e.target.closest('[data-art]'); if (r) window.showArtistStats(r.dataset.art);
            });
        }
        grid.className = 'art-list';
        $('art-sort').querySelectorAll('[data-s]').forEach(b => b.classList.toggle('is-on', b.dataset.s === art.sort));
        let rows = artistRows().filter(r => !art.q || lc(r.name).includes(art.q));
        const key = { count: r => r.count, spent: r => r.spent, rating: r => (r.rn ? r.rs / r.rn : 0) }[art.sort];
        rows.sort((a, b) => key(b) - key(a) || b.count - a.count || a.name.localeCompare(b.name));
        if (!rows.length) { grid.innerHTML = `<p class="hx-empty text-center">${art.q ? 'Никого не нашли' : 'Укажите исполнителей ваших релизов…'}</p>`; return; }
        const mx = Math.max(1, ...rows.map(key)), shown = art.all ? rows : rows.slice(0, 8);
        grid.innerHTML = shown.map(r => `<button type="button" class="art-row" data-art="${esc(r.name)}">
            <span class="hx-ava" style="--h:${hue(r.name)}">${esc(r.name[0].toUpperCase())}</span>
            <span class="art-main"><b>${esc(r.name)}</b><i class="art-bar"><u style="width:${Math.max(4, key(r) / mx * 100)}%"></u></i></span>
            <span class="art-num"><b>${r.count}</b> рел.</span>
            <span class="art-sub">${r.spent} ₴${r.rn ? ` · ★ ${(r.rs / r.rn).toFixed(1)}` : ''}</span></button>`).join('')
            + (rows.length > 8 ? `<button type="button" class="hx-btn mt-2 self-center" data-more>${art.all ? 'Свернуть' : `Показать всех (${rows.length})`}</button>` : '');
    }

    const showArtistBase = window.showArtistStats;
    window.showArtistStats = name => {
        showArtistBase(name);
        try {
            const n = lc(name);
            const rel = [...(data.cds || []).map(i => ({ ...i, _i: '💿' })), ...(data.vinyls || []).map(i => ({ ...i, _i: '💽' }))]
                .filter(i => lc(i.artist) === n).sort((a, b) => (num(a.year) || 9999) - (num(b.year) || 9999));
            $('artist-stats-title').innerHTML = `<span class="hx-ava" style="--h:${hue(name)}">${esc(name[0].toUpperCase())}</span> ${esc(name)}`;
            const rated = rel.filter(i => i.rating), yrs = rel.map(i => num(i.year)).filter(y => y > 1900);
            const tiles = [
                ['Ср. оценка', rated.length ? '★ ' + (rated.reduce((s, i) => s + i.rating, 0) / rated.length).toFixed(1) : '—'],
                ['Ср. цена', rel.length ? Math.round(rel.reduce((s, i) => s + num(i.price), 0) / rel.length) + ' ₴' : '—'],
                ['Годы', yrs.length ? (Math.min(...yrs) === Math.max(...yrs) ? Math.min(...yrs) : `${Math.min(...yrs)}–${Math.max(...yrs)}`) : '—'],
                ...(data.showScrobble ? [['Прослушано', rel.reduce((s, i) => s + num(i.playCount), 0) + ' раз']] : [])
            ];
            let ex = $('artist-extra');
            if (!ex) {
                const box = $('artist-stats-count').closest('.space-y-4');
                ex = document.createElement('div'); ex.id = 'artist-extra'; ex.className = 'grid grid-cols-2 gap-3';
                box.insertBefore(ex, box.children[1]);
            }
            ex.innerHTML = tiles.map(([l, v]) => `<div class="ax-tile"><small>${l}</small><b>${esc(v)}</b></div>`).join('');
            $('artist-releases-list').innerHTML = rel.map(i => `<div class="ax-rel"><span>${i._i}</span><span title="${esc(i.title)}">${esc(i.title)}</span>
                <em>${i.year ? esc(i.year) : ''}${i.rating ? ' · ★' + i.rating : ''}</em><b class="font-mono text-cyan-400">${esc(fmtPrice(i))}</b></div>`).join('')
                || '<p class="text-gray-500 text-xs italic">Релизов нет</p>';
        } catch (e) { console.warn('[hub2] artist modal:', e); }
    };

    /* =====================================================
       4. РАСШИРЕННАЯ СТАТИСТИКА
       ===================================================== */
    const SC = { backlog: ['#60a5fa', 'В планах'], playing: ['#fbbf24', 'В процессе'], completed: ['#34d399', 'Пройдено'], online: ['#a78bfa', 'Онлайн'], dropped: ['#f87171', 'Заброшено'], skipped: ['#64748b', 'Не трогал'], '': ['#9ca3af', 'Без статуса'] };
    const bars = (rows, color = 'linear-gradient(90deg, rgb(var(--theme-rgb)), #06b6d4)') => {
        const mx = Math.max(1, ...rows.map(r => r[1]));
        return rows.map(([l, v, t]) => `<div class="hx-row"><span class="hx-l" title="${esc(l)}">${esc(l)}</span><div class="hx-bar"><i style="width:${Math.max(3, v / mx * 100)}%;background:${color}"></i></div><b>${esc(t ?? v)}</b></div>`).join('')
            || '<p class="hx-empty">Пока нет данных</p>';
    };
    const card = (title, body) => `<div class="glass hx-card rounded-3xl"><h4>${title}</h4>${body}</div>`;

    function renderStatsPlus() {
        const root = $('analytics-plus'); if (!root) return;
        const cds = data.cds || [], vin = data.vinyls || [], games = data.games || [], stuff = data.stuff || [], wish = data.wishlists || [];
        const music = [...cds, ...vin], all = [...music, ...games, ...stuff];
        const value = all.reduce((s, i) => s + num(i.price), 0), priced = all.filter(i => num(i.price) > 0);
        const counted = games.filter(g => !['online', 'skipped'].includes(g.status));
        const done = counted.filter(g => g.status === 'completed').length;
        const hours = games.reduce((s, g) => s + num(g.hours), 0);
        const wishVal = wish.reduce((s, i) => s + num(i.price), 0);

        const tiles = [
            ['Всего позиций', all.length], ['Общая стоимость', value + ' ₴'], ['Средняя цена', priced.length ? Math.round(value / priced.length) + ' ₴' : '—'],
            ['Игр пройдено', counted.length ? `${done} / ${counted.length}` : '—'], ['Часов в играх', hours ? Math.round(hours) : '—'], ['В желаемом', wishVal + ' ₴']
        ].map(([l, v]) => `<div class="glass hx-tile"><small>${l}</small><b>${esc(v)}</b></div>`).join('');

        // игры по статусам
        const st = {};
        games.forEach(g => { const k = SC[g.status] ? g.status : ''; st[k] = (st[k] || 0) + 1; });
        const stEntries = Object.entries(st).sort((a, b) => b[1] - a[1]);
        const statusCard = card('🎮 Игры по статусам', games.length
            ? `<div class="hx-seg-bar">${stEntries.map(([k, n]) => `<i style="width:${n / games.length * 100}%;background:${SC[k][0]}" title="${SC[k][1]}: ${n}"></i>`).join('')}</div>
               <div class="hx-legend">${stEntries.map(([k, n]) => `<span style="--c:${SC[k][0]}">${SC[k][1]} · ${n}</span>`).join('')}</div>`
            : '<p class="hx-empty">Добавьте игры, чтобы увидеть бэклог</p>');

        const pl = {}; games.forEach(g => { const p = g.platform || 'Другое'; pl[p] = (pl[p] || 0) + 1; });
        const platCard = card('🕹 Игры по платформам', bars(Object.entries(pl).sort((a, b) => b[1] - a[1]).slice(0, 6)));

        // оценки
        const rc = [0, 0, 0, 0, 0, 0];
        [...music, ...games].forEach(i => { if (i.rating >= 1 && i.rating <= 5) rc[i.rating]++; });
        const rmx = Math.max(1, ...rc);
        const rateCard = card('⭐ Распределение оценок', `<div class="hx-cols">${[1, 2, 3, 4, 5].map(n => `<div class="hx-col"><b>${rc[n]}</b><i style="height:${rc[n] / rmx * 100}%"></i>${n}★</div>`).join('')}</div>`);

        // пополнение по месяцам
        const now = new Date(), mk = [];
        for (let k = 11; k >= 0; k--) { const d = new Date(now.getFullYear(), now.getMonth() - k, 1); mk.push({ key: d.getFullYear() * 12 + d.getMonth(), label: d.toLocaleDateString(loc(), { month: 'short' }), n: 0 }); }
        all.forEach(i => { if (num(i.id) < 1.4e12) return; const d = new Date(i.id), m = mk.find(x => x.key === d.getFullYear() * 12 + d.getMonth()); if (m) m.n++; });
        const mmx = Math.max(1, ...mk.map(m => m.n));
        const monthCard = card('📈 Пополнение по месяцам', `<div class="hx-cols">${mk.map(m => `<div class="hx-col"><b>${m.n || ''}</b><i style="height:${m.n / mmx * 100}%"></i>${esc(m.label.slice(0, 3))}</div>`).join('')}</div>`);

        // магазины
        const shops = new Map();
        all.forEach(i => { const w = (i.whereBought || '').trim(); if (!w || /^(Быстрое добавление|Перенос из)/.test(w)) return; const r = shops.get(lc(w)) || { n: w, c: 0, s: 0 }; r.c++; r.s += num(i.price); shops.set(lc(w), r); });
        const shopCard = card('🏪 Где покупаете', bars([...shops.values()].sort((a, b) => b.c - a.c).slice(0, 6).map(r => [r.n, r.c, `${r.c} · ${r.s}₴`])));

        const spendCard = card('💸 Артисты по тратам', bars(artistRows().sort((a, b) => b.spent - a.spent).slice(0, 5).filter(r => r.spent > 0).map(r => [r.name, r.spent, r.spent + '₴']), 'linear-gradient(90deg,#f59e0b,#ef4444)'));

        // желаемое
        const budget = num(data.hobbyBudget) || 2500, pr = {};
        wish.forEach(w => { const k = w.priority || 'Без приоритета'; pr[k] = (pr[k] || 0) + 1; });
        const wishCard = card('🎁 Желаемое', wish.length
            ? `<p class="text-xs text-gray-400 mb-3">${wish.length} поз. на ${wishVal} ₴ — при бюджете ${budget} ₴/мес. это ≈ ${(wishVal / budget).toFixed(1)} мес.</p>${bars(Object.entries(pr).sort((a, b) => b[1] - a[1]), 'linear-gradient(90deg,#f472b6,#a78bfa)')}`
            : '<p class="hx-empty">Список желаний пуст</p>');

        const catCard = card('🧮 Состав коллекции', bars([['💿 CD', cds.length], ['💽 Винил', vin.length], ['🎮 Игры', games.length], ['📦 Вещи', stuff.length], ['🎁 Желаемое', wish.length]]));

        root.innerHTML = `<div class="hx-head"><h3 class="text-2xl font-black">✨ Расширенная статистика</h3><span class="text-xs text-gray-500">Игры, оценки, покупки, динамика</span></div>
            <div class="hx-tiles">${tiles}</div>
            <div class="hx-grid">${statusCard}${platCard}${catCard}${rateCard}${monthCard}${shopCard}${spendCard}${wishCard}</div>`;
    }

    /* =====================================================
       5. ЯЗЫК (RU / EN / UK) — интерфейс, заголовки, кнопки
       ===================================================== */
    const DICT = [
        ['Главная', 'Home', 'Головна'], ['Винил', 'Vinyl', 'Вініл'], ['Игры', 'Games', 'Ігри'], ['Вещи', 'Stuff', 'Речі'],
        ['Желаемое', 'Wishlist', 'Бажане'], ['Статистика', 'Stats', 'Статистика'], ['Достижения', 'Achievements', 'Досягнення'], ['Настройки', 'Settings', 'Налаштування'],
        ['🔍 Поиск по всему хабу', '🔍 Search the hub', '🔍 Пошук по хабу'], ['Цветовая тема', 'Color theme', 'Колір теми'],
        ['📦 Перебрать полки', '📦 Browse shelves', '📦 Переглянути полиці'], ['🎲 Что послушать?', '🎲 What to play?', '🎲 Що послухати?'],
        ['Доброй ночи 🌙', 'Good night 🌙', 'Доброї ночі 🌙'], ['Доброе утро ☀️', 'Good morning ☀️', 'Доброго ранку ☀️'], ['Добрый день 👋', 'Good afternoon 👋', 'Добрий день 👋'], ['Добрый вечер 🌆', 'Good evening 🌆', 'Добрий вечір 🌆'],
        ['Пластинка дня', 'Record of the day', 'Платівка дня'], ['Игра дня', 'Game of the day', 'Гра дня'], ['📖 Открыть', '📖 Open', '📖 Відкрити'], ['🔀 Другую', '🔀 Another', '🔀 Іншу'], ['🎧 Поставить', '🎧 Play it', '🎧 Поставити'],
        ['Муз. коллекция 💿', 'Music 💿', 'Муз. колекція 💿'], ['Игровая коллекция 🎮', 'Games 🎮', 'Ігри 🎮'], ['Коллекция вещей 📦', 'Stuff 📦', 'Речі 📦'], ['Желаемое 🎁', 'Wishlist 🎁', 'Бажане 🎁'],
        ['Всего предметов', 'Total items', 'Усього предметів'], ['Ср. оценка ⭐', 'Avg rating ⭐', 'Серед. оцінка ⭐'], ['Общая стоимость 💰', 'Total value 💰', 'Загальна вартість 💰'],
        ['Прослушиваний 🎧', 'Plays 🎧', 'Прослуховувань 🎧'], ['Оценено ⭐', 'Rated ⭐', 'Оцінено ⭐'], ['Самый дорогой 💎', 'Most expensive 💎', 'Найдорожчий 💎'],
        ['⭐ Избранное', '⭐ Favorites', '⭐ Обране'], ['＋ Добавить', '＋ Add', '＋ Додати'], ['Статистика релизов по артистам', 'Releases by artist', 'Релізи за артистами'],
        ['Релизы', 'Releases', 'Релізи'], ['Потрачено', 'Spent', 'Витрачено'], ['Оценка', 'Rating', 'Оцінка'], ['💬 Цитата дня', '💬 Quote of the day', '💬 Цитата дня'],
        ['🌐 Перевод', '🌐 Translate', '🌐 Переклад'], ['🎲 Случайная', '🎲 Random', '🎲 Випадкова'], ['⚙️ Управление', '⚙️ Manage', '⚙️ Керування'],
        ['🛒 Любимые музыкальные сайты', '🛒 Favorite music sites', '🛒 Улюблені музичні сайти'], ['+ Добавить сайт', '+ Add site', '+ Додати сайт'],
        ['CD Коллекция', 'CD collection', 'CD колекція'], ['Виниловая полка 💽', 'Vinyl shelf 💽', 'Вінілова полиця 💽'], ['Игровая коллекция 🎮', 'Game collection 🎮', 'Ігрова колекція 🎮'],
        ['Мерч и Вещи 📦', 'Merch & stuff 📦', 'Мерч і речі 📦'], ['Лист Желаний 🎁', 'Wishlist 🎁', 'Список бажань 🎁'], ['Настройки хаба', 'Hub settings', 'Налаштування хабу'],
        ['Аналитика коллекции 📊', 'Collection analytics 📊', 'Аналітика колекції 📊'], ['Коллекционные достижения 🏆', 'Collector achievements 🏆', 'Колекційні досягнення 🏆'],
        ['✨ Расширенная статистика', '✨ Extended stats', '✨ Розширена статистика'], ['Всего позиций', 'Total entries', 'Усього позицій'], ['Средняя цена', 'Average price', 'Середня ціна'],
        ['+ Новый CD', '+ New CD', '+ Новий CD'], ['+ Новая пластинка', '+ New record', '+ Нова платівка'], ['+ Новый диск', '+ New game', '+ Нова гра'], ['+ Новый предмет', '+ New item', '+ Новий предмет'], ['+ Добавить', '+ Add', '+ Додати'],
        ['🖼️ Вид', '🖼️ View', '🖼️ Вигляд'], ['Сортировать по:', 'Sort by:', 'Сортувати за:'], ['Сортировать:', 'Sort:', 'Сортувати:'],
        ['Алфавиту 🔤', 'Name 🔤', 'Назвою 🔤'], ['Названию 🔤', 'Name 🔤', 'Назвою 🔤'], ['Сначала дорогие 💸', 'Priciest first 💸', 'Спочатку дорогі 💸'], ['Сначала дешевые 🪙', 'Cheapest first 🪙', 'Спочатку дешеві 🪙'],
        ['Оценке ⭐', 'Rating ⭐', 'Оцінкою ⭐'], ['Прослушиваниям 🎧', 'Plays 🎧', 'Прослуховуваннями 🎧'], ['Исполнителю 🎤', 'Artist 🎤', 'Виконавцем 🎤'], ['Недавно добавленные 🆕', 'Recently added 🆕', 'Нещодавно додані 🆕'],
        ['Сохранить изменения', 'Save changes', 'Зберегти зміни'], ['Сохранить', 'Save', 'Зберегти'], ['Закрыть', 'Close', 'Закрити'], ['Отмена', 'Cancel', 'Скасувати'], ['Аккаунт', 'Account', 'Акаунт'],
        ['Экспорт (.json)', 'Export (.json)', 'Експорт (.json)'], ['Импорт (.json)', 'Import (.json)', 'Імпорт (.json)'], ['Редактор релиза', 'Release editor', 'Редактор релізу'],
        ['📝 Заметки', '📝 Notes', '📝 Нотатки'], ['＋ Новая заметка', '＋ New note', '＋ Нова нотатка'], ['🌐 Интерфейс', '🌐 Interface', '🌐 Інтерфейс'], ['Язык', 'Language', 'Мова'],
        ['Сумма:', 'Total:', 'Сума:'], ['| Предметов:', '| Items:', '| Предметів:'], ['| Дисков:', '| Discs:', '| Дисків:'],
        ['🔍 Быстрое добавление...', '🔍 Quick add...', '🔍 Швидке додавання...'], ['🔍 Быстрый поиск...', '🔍 Quick search...', '🔍 Швидкий пошук...'], ['Поиск…', 'Search…', 'Пошук…'], ['Найти артиста…', 'Find an artist…', 'Знайти виконавця…']
    ];
    const MAP = { en: new Map(), uk: new Map() };
    DICT.forEach(([ru, en, uk]) => { MAP.en.set(ru, en); MAP.uk.set(ru, uk); });
    const trRec = new WeakMap();
    let langObs = null, langBusy = false;

    function translateTree(lang) {
        const map = MAP[lang];
        const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
            acceptNode: n => /^(SCRIPT|STYLE|TEXTAREA)$/.test(n.parentNode?.nodeName) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT
        });
        let n;
        while ((n = w.nextNode())) {
            const rec = trRec.get(n), raw = n.nodeValue;
            const src = rec && raw === rec.out ? rec.src : raw;
            const t = src.trim();
            if (!t) continue;
            const to = map ? map.get(t) : null;
            if (to) { const out = src.replace(t, to); if (raw !== out) n.nodeValue = out; trRec.set(n, { src, out }); }
            else if (rec && raw === rec.out) { n.nodeValue = rec.src; trRec.delete(n); }
        }
        document.querySelectorAll('[placeholder],[title]').forEach(el => {
            ['placeholder', 'title'].forEach(a => {
                if (!el.hasAttribute(a)) return;
                const k = '_o_' + a, cur = el.getAttribute(a);
                if (el[k] === undefined || (el[k + 'o'] !== undefined && cur !== el[k + 'o'])) el[k] = cur;
                const to = map ? map.get(el[k]) : null;
                el[k + 'o'] = to || el[k];
                if (el.getAttribute(a) !== el[k + 'o']) el.setAttribute(a, el[k + 'o']);
            });
        });
    }

    let translated = false;
    function applyLang() {
        const lang = data.lang || 'ru';
        document.documentElement.lang = lang;
        document.querySelectorAll('[data-lang]').forEach(b => b.classList.toggle('is-on', b.dataset.lang === lang));
        if (!langObs) langObs = new MutationObserver(() => { if (!langBusy) queueLang(); });
        if (lang === 'ru' && !translated) return;
        langBusy = true; langObs.disconnect();
        try { translateTree(lang); translated = lang !== 'ru'; }
        finally { langBusy = false; if (lang !== 'ru') langObs.observe(document.body, { childList: true, subtree: true, characterData: true }); }
    }
    let langQ = false;
    function queueLang() { if (langQ) return; langQ = true; requestAnimationFrame(() => { langQ = false; applyLang(); }); }
    window.setLang = l => { data.lang = l; persistData(); applyLang(); updateUI(); };

    /* =====================================================
       6. НАСТРОЙКИ ИНТЕРФЕЙСА + СКРОББЛИНГ
       ===================================================== */
    function buildSettings() {
        const side = $('atm-btn-vinyl')?.closest('.glass')?.parentElement;
        if (side && !$('ui-card')) {
            const c = document.createElement('div');
            c.id = 'ui-card'; c.className = 'glass p-8 rounded-3xl space-y-4';
            c.innerHTML = `<h3 class="font-bold text-xl">🌐 Интерфейс</h3>
                <div><p class="text-xs text-gray-400 mb-2">Язык</p><div class="hx-seg"><button type="button" data-lang="ru">Русский</button><button type="button" data-lang="en">English</button><button type="button" data-lang="uk">Українська</button></div>
                <p class="text-[11px] text-gray-500 mt-2">Переводятся меню, заголовки и основные кнопки. Названия ваших релизов и уведомления остаются как есть.</p></div>
                <label class="flex items-start gap-3 text-sm text-gray-300 cursor-pointer"><input type="checkbox" id="opt-scrobble" class="accent-purple-500 mt-1">
                <span>Скробблинг прослушиваний 🎧<small class="block text-[11px] text-gray-500">Счётчик «Прослушано», кнопка 🎧, топ и сортировка по прослушиваниям. По умолчанию скрыт.</small></span></label>`;
            side.prepend(c);
            c.addEventListener('click', e => { const b = e.target.closest('[data-lang]'); if (b) setLang(b.dataset.lang); });
            $('opt-scrobble').addEventListener('change', e => { data.showScrobble = e.target.checked; save(); });
        }
        const sbar = document.querySelector('.sidebar .hidden.md\\:block.mt-auto');
        if (sbar && !$('lang-pill')) {
            const p = document.createElement('div'); p.id = 'lang-pill'; p.className = 'lang-pill';
            p.innerHTML = '<button type="button" data-lang="ru">RU</button><button type="button" data-lang="en">EN</button><button type="button" data-lang="uk">UA</button>';
            p.addEventListener('click', e => { const b = e.target.closest('[data-lang]'); if (b) setLang(b.dataset.lang); });
            sbar.appendChild(p);
        }
        const cb = $('opt-scrobble'); if (cb) cb.checked = !!data.showScrobble;
        document.body.classList.toggle('show-scrobble', !!data.showScrobble);
    }

    /* =====================================================
       Подключение
       ===================================================== */
    const renderBase = renderAll;
    renderAll = function () {
        renderBase();
        try {
            ensure(); buildSettings(); renderHero(); renderGotd(); renderSpots(); renderArtists(); renderStatsPlus(); applyLang();
        } catch (e) { console.warn('[hub2]', e); }
    };

    buildNotes();
    buildSpot();

    // «Статистика»: контейнер для расширенных блоков
    const an = $('analytics');
    if (an && !$('analytics-plus')) { const d = document.createElement('div'); d.id = 'analytics-plus'; d.className = 'mt-10'; an.appendChild(d); }

    // подсветка карточек под курсором
    let glowQ = null;
    document.addEventListener('pointermove', e => {
        if (glowQ || e.pointerType === 'touch') return;
        glowQ = requestAnimationFrame(() => {
            glowQ = null;
            const g = e.target.closest?.('main .glass');
            if (!g) return;
            const r = g.getBoundingClientRect();
            g.style.setProperty('--mx', `${e.clientX - r.left}px`);
            g.style.setProperty('--my', `${e.clientY - r.top}px`);
        });
    }, { passive: true });

    // палитра команд и горячая клавиша «M»
    const noteAct = PALETTE_ACTIONS.find(a => a.title === 'Быстрые заметки');
    if (noteAct) { noteAct.title = 'Заметки'; noteAct.hint = 'Плавающая панель (клавиша M)'; noteAct.run = () => openNotes(); }
    PALETTE_ACTIONS.push({ icon: '🎮', title: 'Игра дня', hint: 'Открыть выбранную на сегодня игру', run: () => { showPage('home'); setTimeout(() => window.gotdOpen(), 50); } });
    document.addEventListener('keydown', e => {
        if (e.code !== 'KeyM' || e.ctrlKey || e.metaKey || e.altKey || isTyping(e.target)) return;
        if (openModals().length || !$('command-palette').classList.contains('hidden')) return;
        e.preventDefault(); toggleNotes();
    });

    updateUI();
})();
