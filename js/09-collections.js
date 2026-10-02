window.openMusicSiteModal = () => {
    document.getElementById('site-name').value = '';
    document.getElementById('site-url').value = '';
    document.getElementById('site-emoji').value = '🛒';
    document.getElementById('music-site-modal').classList.remove('hidden');
};

window.saveMusicSite = () => {
    const name = document.getElementById('site-name').value.trim();
    let url = document.getElementById('site-url').value.trim();
    const emoji = document.getElementById('site-emoji').value.trim() || '🌐';

    if (!name || !url) return;
    if (!/^https?:\/\//i.test(url)) {
        url = 'https://' + url;
    }

    if (!data.musicSites) data.musicSites = [];
    data.musicSites.push({ id: Date.now(), name, url, emoji });
    save();
    closeModal('music-site-modal');
    showToast("Сайт добавлен в панель!");
};

window.deleteMusicSite = (id, event) => {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    data.musicSites = (data.musicSites || []).filter(s => s.id !== id);
    save();
    showToast("Маркетплейс удален");
};

window.addGlobalTag = () => {
    const text = document.getElementById('new-tag-text').value; const color = document.getElementById('new-tag-color').value;
    if(!text) return; data.availableTags.push({ text, color }); renderManageTagsList(); renderModalTags(); save();
};

window.deleteTag = (text) => {
    data.availableTags = data.availableTags.filter(t => t.text !== text);
    data.wishlists.forEach(item => { if(item.tags) item.tags = item.tags.filter(t => t.text !== text); });
    save(); renderManageTagsList(); updateUI();
};

window.toggleTag = (tag) => {
    const idx = tempTags.findIndex(t => t.text === tag.text);
    if(idx > -1) tempTags.splice(idx, 1); else tempTags.push(tag); renderModalTags();
};

window.renderModalTags = () => {
    const listEl = document.getElementById('available-tags-list');
    listEl.innerHTML = '';
    data.availableTags.forEach(t => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `px-2 py-1 rounded text-xs border ${tempTags.find(x => x.text === t.text) ? 'opacity-100 ring-2 ring-white' : 'opacity-40'}`;
        btn.style.backgroundColor = t.color;
        btn.innerText = t.text;
        btn.onclick = () => { toggleTag(t); };
        listEl.appendChild(btn);
    });
};

window.openTagsManager = () => { renderManageTagsList(); document.getElementById('tags-manager-modal').classList.remove('hidden'); };

window.renderManageTagsList = () => {
    const listEl = document.getElementById('manage-tags-list');
    listEl.innerHTML = '';
    data.availableTags.forEach(t => {
        const row = document.createElement('div');
        row.className = "flex justify-between items-center p-2 rounded-lg bg-white/5";

        const span = document.createElement('span');
        span.className = "px-2 py-1 rounded text-xs";
        span.style.backgroundColor = t.color;
        span.innerText = t.text;

        const delBtn = document.createElement('button');
        delBtn.className = "text-red-500 hover:text-red-400";
        delBtn.innerHTML = "✕";
        delBtn.onclick = () => deleteTag(t.text);

        row.appendChild(span);
        row.appendChild(delBtn);
        listEl.appendChild(row);
    });
};

window.openNote = (type, id) => {
    document.getElementById('note-text').dataset.type = type;
    document.getElementById('note-text').dataset.id = id;
    document.getElementById('note-text').value = data[type].find(x => x.id === id).note || '';
    document.getElementById('note-modal').classList.remove('hidden');
};

window.showArtistStats = (artistName) => {
    const artistCds = (data.cds || []).filter(i => (i.artist || '').trim().toLowerCase() === artistName.trim().toLowerCase());
    const artistVinyls = (data.vinyls || []).filter(i => (i.artist || '').trim().toLowerCase() === artistName.trim().toLowerCase());
    const allReleases = [...artistCds, ...artistVinyls];
    const totalSpent = allReleases.reduce((sum, item) => sum + (parseFloat(item.price) || 0), 0);

    document.getElementById('artist-stats-title').innerText = artistName;
    document.getElementById('artist-stats-count').innerText = allReleases.length;
    document.getElementById('artist-stats-cds').innerText = artistCds.length;
    document.getElementById('artist-stats-vinyls').innerText = artistVinyls.length;
    document.getElementById('artist-stats-spent').innerText = totalSpent + ' ₴';

    const listEl = document.getElementById('artist-releases-list');
    if (allReleases.length === 0) {
        listEl.innerHTML = '<p class="text-gray-500 text-xs italic">Релизов нет</p>';
    } else {
        listEl.innerHTML = '';
        allReleases.forEach(i => {
            const icon = artistCds.includes(i) ? '💿' : '💽';
            const customBadge = (artistCds.includes(i) && i.isCustom) ? ' ✨' : '';

            const itemRow = document.createElement('div');
            itemRow.className = "bg-white/5 p-3 rounded-xl text-xs flex justify-between items-center border border-white/5";

            const titleSpan = document.createElement('span');
            titleSpan.className = "truncate font-medium text-gray-200";
            titleSpan.innerText = `${icon} ${i.title}${customBadge}`;

            const priceSpan = document.createElement('span');
            priceSpan.className = "text-cyan-400 font-mono font-bold shrink-0";
            priceSpan.innerText = `${i.price} ₴`;

            itemRow.appendChild(titleSpan);
            itemRow.appendChild(priceSpan);
            listEl.appendChild(itemRow);
        });
    }
    document.getElementById('artist-stats-modal').classList.remove('hidden');
};

window.saveNote = () => {
    const type = document.getElementById('note-text').dataset.type;
    const id = parseInt(document.getElementById('note-text').dataset.id);
    data[type].find(x => x.id === id).note = document.getElementById('note-text').value;
    save(); closeModal('note-modal');
};
window.saveQuickNote = () => {
    const val = document.getElementById('new-quick-note').value;
    if(!val) return;
    if (editingNoteId) { data.quickNotes.find(n => n.id === editingNoteId).text = val; editingNoteId = null; }
    else { data.quickNotes.push({ id: Date.now(), text: val }); }
    document.getElementById('new-quick-note').value = ''; save();
};
window.editQuickNote = (id) => { editingNoteId = id; document.getElementById('new-quick-note').value = data.quickNotes.find(n => n.id === id).text; };
window.deleteQuickNote = (id) => { data.quickNotes = data.quickNotes.filter(n => n.id !== id); save(); };
window.renderQuickNotes = () => {
    document.getElementById('quick-notes-list').innerHTML = data.quickNotes.map(n => `
        <div class="bg-white/5 p-3 rounded-xl text-sm flex justify-between items-start gap-2">
            <span class="break-words w-full text-gray-200">${esc(n.text)}</span>
            <div class="flex gap-1 shrink-0"><button onclick="editQuickNote(${n.id})" class="text-gray-400">✏️</button><button onclick="deleteQuickNote(${n.id})" class="text-red-400">✕</button></div>
        </div>
    `).join('');
};

window.saveProfile = () => {
    data.name = document.getElementById('profile-name').value;
    data.description = document.getElementById('profile-desc').value;
    data.favoriteArtists = document.getElementById('profile-artists').value;
    data.favArtist.name = document.getElementById('fav-input-artist').value;
    data.favArtist.url = document.getElementById('fav-input-artist-url').value;
    data.favAlbum.name = document.getElementById('fav-input-album').value;
    data.favAlbum.url = document.getElementById('fav-input-album-url').value;
    save();
    showToast("Данные профиля обновлены!");
};

window.setFilter = (tagText) => { currentFilter = tagText; updateUI(); };
