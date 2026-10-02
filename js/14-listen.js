/* =========================================================
   MIRVEL HUB — 14-listen.js (подключать после 13-extras.js)
   Слушать релизы прямо на сайте: ссылка YouTube / Spotify / SoundCloud
   вставляется в встроенный плеер, без ссылки — поиск на YouTube.
   ========================================================= */
(() => {
    const findItem = id => {
        for (const type of ['cds', 'vinyls']) {
            const item = (data[type] || []).find(x => x.id === Number(id));
            if (item) return { type, item };
        }
        return null;
    };

    /* Ссылка → адрес для iframe (null — встроить нельзя) */
    function toEmbed(raw) {
        let u;
        try { u = new URL(String(raw).trim()); } catch (e) { return null; }
        const host = u.hostname.replace(/^www\.|^m\./, '');
        if (host === 'youtu.be' || host === 'youtube.com' || host === 'music.youtube.com') {
            const list = u.searchParams.get('list');
            const v = host === 'youtu.be' ? u.pathname.slice(1) : u.searchParams.get('v');
            if (v) return `https://www.youtube.com/embed/${encodeURIComponent(v)}?autoplay=1${list ? '&list=' + encodeURIComponent(list) : ''}`;
            if (list) return `https://www.youtube.com/embed/videoseries?list=${encodeURIComponent(list)}&autoplay=1`;
        }
        if (host === 'open.spotify.com') {
            const m = u.pathname.match(/\/(album|track|playlist|artist)\/([A-Za-z0-9]+)/);
            if (m) return `https://open.spotify.com/embed/${m[1]}/${m[2]}`;
        }
        if (host === 'soundcloud.com') {
            return `https://w.soundcloud.com/player/?url=${encodeURIComponent(u.href)}&auto_play=true`;
        }
        return null;
    }

    const searchUrl = item =>
        'https://www.youtube.com/results?search_query=' + encodeURIComponent(`${item.artist || ''} ${item.title} full album`.trim());

    /* ---------- Плеер ---------- */
    function buildDock() {
        const d = document.createElement('aside');
        d.id = 'listen-dock';
        d.className = 'listen-dock hidden glass no-hover';
        d.setAttribute('aria-label', 'Плеер');
        d.innerHTML = `
            <div class="flex items-center gap-2 px-3 pt-2">
                <div class="min-w-0 flex-1">
                    <p id="listen-title" class="text-sm font-bold truncate"></p>
                    <p id="listen-artist" class="text-xs text-gray-400 truncate"></p>
                </div>
                <button type="button" id="listen-edit" class="listen-x" title="Изменить ссылку" aria-label="Изменить ссылку">🔗</button>
                <button type="button" id="listen-close" class="listen-x" title="Закрыть" aria-label="Закрыть плеер">✕</button>
            </div>
            <div id="listen-frame" class="px-3 pb-3 pt-2"></div>`;
        document.body.appendChild(d);
        d.querySelector('#listen-close').onclick = closeDock;
        d.querySelector('#listen-edit').onclick = () => d.dataset.id && openLinkModal(d.dataset.id);
    }

    function closeDock() {
        const d = document.getElementById('listen-dock');
        d.classList.add('hidden');
        document.getElementById('listen-frame').innerHTML = ''; // останавливает звук
    }

    function playItem(id) {
        const found = findItem(id);
        if (!found) return;
        const { item } = found;
        const embed = item.listenUrl ? toEmbed(item.listenUrl) : null;
        if (!embed) { openLinkModal(id); return; }

        const d = document.getElementById('listen-dock');
        d.dataset.id = id;
        document.getElementById('listen-title').textContent = item.title;
        document.getElementById('listen-artist').textContent = item.artist || 'Разные исполнители';
        const spotify = embed.includes('open.spotify.com');
        document.getElementById('listen-frame').innerHTML =
            `<iframe src="${esc(embed)}" title="${esc(item.title)}" width="100%" height="${spotify ? 152 : 180}" frameborder="0"
              allow="autoplay; encrypted-media; clipboard-write; fullscreen" loading="lazy"></iframe>`;
        d.classList.remove('hidden');
    }
    window.listenTo = playItem;

    /* ---------- Окно ссылки ---------- */
    function buildLinkModal() {
        const m = document.createElement('div');
        m.id = 'listen-link-modal';
        m.className = 'hidden fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[57] p-4';
        m.setAttribute('role', 'dialog');
        m.setAttribute('aria-modal', 'true');
        m.innerHTML = `
        <div class="glass no-hover w-full max-w-md rounded-3xl p-6 space-y-4">
            <h3 id="listen-link-title" class="text-lg font-black">Где слушать</h3>
            <p class="text-sm text-gray-400">Вставьте ссылку на альбом или трек: YouTube, YouTube Music, Spotify или SoundCloud. Она сохранится у этого релиза.</p>
            <input id="listen-link-input" type="url" placeholder="https://open.spotify.com/album/…" class="w-full bg-white/5 p-3.5 rounded-xl border border-white/10 text-white text-sm focus:outline-none">
            <p id="listen-link-err" class="text-xs text-red-300 hidden">Эту ссылку нельзя встроить. Подойдут YouTube, Spotify или SoundCloud.</p>
            <div class="flex gap-2">
                <a id="listen-search" target="_blank" rel="noopener" class="flex-1 text-center bg-white/10 hover:bg-white/15 py-3 rounded-xl text-sm font-bold">Найти на YouTube</a>
                <button type="button" id="listen-save" class="flex-1 bg-purple-600 hover:bg-purple-500 py-3 rounded-xl font-bold text-white btn-neon">Сохранить и слушать</button>
            </div>
            <button type="button" class="w-full text-gray-400 hover:text-white text-sm py-1" onclick="closeModal('listen-link-modal')">Закрыть</button>
        </div>`;
        document.body.appendChild(m);
        m.querySelector('#listen-link-input').addEventListener('keydown', e => { if (e.key === 'Enter') m.querySelector('#listen-save').click(); });
        m.querySelector('#listen-save').onclick = () => {
            const id = m.dataset.id;
            const found = findItem(id);
            if (!found) return;
            const val = m.querySelector('#listen-link-input').value.trim();
            if (val && !toEmbed(val)) { m.querySelector('#listen-link-err').classList.remove('hidden'); return; }
            found.item.listenUrl = val;
            save();
            closeModal('listen-link-modal');
            if (val) playItem(id); else showToast('Ссылка удалена');
        };
    }

    function openLinkModal(id) {
        const found = findItem(id);
        if (!found) return;
        const m = document.getElementById('listen-link-modal');
        m.dataset.id = id;
        m.querySelector('#listen-link-title').textContent = `Где слушать: ${found.item.title}`;
        m.querySelector('#listen-link-input').value = found.item.listenUrl || '';
        m.querySelector('#listen-link-err').classList.add('hidden');
        m.querySelector('#listen-search').href = searchUrl(found.item);
        m.classList.remove('hidden');
        m.querySelector('#listen-link-input').focus();
    }

    /* ---------- Кнопка ▶ на карточках ---------- */
    function decorateCards() {
        document.querySelectorAll('[data-play-id]').forEach(card => {
            if (card.querySelector(':scope > .listen-btn')) return;
            const found = findItem(card.dataset.playId);
            if (!found) return;
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'listen-btn';
            b.textContent = '▶';
            b.title = found.item.listenUrl ? 'Слушать' : 'Добавить ссылку для прослушивания';
            b.setAttribute('aria-label', b.title);
            b.onclick = e => { e.stopPropagation(); playItem(card.dataset.playId); };
            card.appendChild(b);
        });
    }

    /* ---------- Подключение ---------- */
    const renderAllBase = renderAll;
    renderAll = function () { renderAllBase(); decorateCards(); };

    // «🎧» в режиме обложек и «Пластинка дня» тоже запускают плеер, если ссылка уже есть
    const logPlayBase = window.logPlay;
    window.logPlay = (type, id) => {
        logPlayBase(type, id);
        const item = (data[type] || []).find(x => x.id === Number(id));
        if (item?.listenUrl) playItem(id);
    };

    buildDock();
    buildLinkModal();
    updateUI();
})();
