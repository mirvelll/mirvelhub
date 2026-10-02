let currentModalRating = 0;
function setRatingValue(val) {
    currentModalRating = val;
    document.getElementById('item-rating').value = val;
    const stars = document.querySelectorAll('.star-rating');
    stars.forEach((star, idx) => {
        if (idx < val) {
            star.className = "star-rating text-yellow-400 hover:scale-110 transition";
        } else {
            star.className = "star-rating text-gray-600 hover:scale-110 transition";
        }
    });
}

window.logPlay = (type, id) => {
    const item = data[type].find(x => x.id === id);
    if (!item) return;

    item.playCount = (item.playCount || 0) + 1;
    item.lastPlayed = new Date().toLocaleDateString('ru-RU', { hour: '2-digit', minute: '2-digit' });

    const cardEl = document.querySelector(`[data-play-id="${id}"]`);
    if (cardEl) {
        const anim = document.createElement('div');
        anim.className = "absolute inset-0 bg-[radial-gradient(circle,_var(--theme-btn)_0%,_transparent_70%)] pointer-events-none rounded-2xl z-30 opacity-0 play-animation-layer";
        anim.innerHTML = `
            <div class="absolute inset-0 flex items-center justify-center">
                <span class="text-6xl text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.8)] spin-slow">💿</span>
            </div>
        `;
        cardEl.appendChild(anim);
        setTimeout(() => anim.remove(), 900);
    }

    try {
        const ctx = getAudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.35);
        gain.gain.setValueAtTime(0.06, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
    } catch(e) {}

    addXP(10, "прослушивание альбома 🎧");
};

window.toggleViewMode = (type) => {
    const current = data.viewMode[type] || 'grid';
    data.viewMode[type] = (current === 'grid') ? 'covers' : 'grid';
    save();
    showToast(`Изменен вид на: <strong>${data.viewMode[type] === 'covers' ? 'Только обложки' : 'Подробный список'}</strong> 🖼️`);
};

window.setSortMode = (type, mode) => {
    if (!data.sortMode) data.sortMode = {};
    data.sortMode[type] = mode;
    save();
    showToast(`Сортировка обновлена! 📊`);
};

window.updateHobbyBudget = () => {
    const slider = document.getElementById('hobby-budget-slider');
    const display = document.getElementById('hobby-budget-display');
    if (slider && display) {
        data.hobbyBudget = parseInt(slider.value);
        display.innerText = `${data.hobbyBudget} ₴`;
        updateHobbyBudgetPlanner();
    }
};

function updateHobbyBudgetPlanner() {
    const timeEl = document.getElementById('wishlist-completion-time');
    const itemsEl = document.getElementById('items-per-month-est');
    const breakdownEl = document.getElementById('category-budget-breakdown');
    if (!timeEl || !itemsEl || !breakdownEl) return;

    const wishlists = data.wishlists || [];
    const wishVal = wishlists.reduce((s, i) => s + i.price, 0);
    const budget = data.hobbyBudget || 2500;

    if (wishVal === 0) {
        timeEl.innerText = "0 мес.";
        itemsEl.innerText = "0 шт.";
        breakdownEl.innerHTML = `<p class="col-span-full text-center text-[11px] text-gray-500 italic py-2">Ваш список желаний пуст</p>`;
        return;
    }

    const totalMonths = (wishVal / budget).toFixed(1);
    timeEl.innerText = `${totalMonths} мес.`;

    const averageItemPrice = wishVal / (wishlists.length || 1);
    const itemsPerMonth = (budget / (averageItemPrice || 1)).toFixed(1);
    itemsEl.innerText = `~${itemsPerMonth} шт.`;

    // Расчет стоимости хотелок покатегорийно
    const categories = [
        { id: 'music', label: '💿 Музыка', color: 'text-purple-400', barBg: 'bg-purple-500' },
        { id: 'clothing', label: '👕 Одежда', color: 'text-teal-400', barBg: 'bg-teal-500' },
        { id: 'gear', label: '🔌 Техника', color: 'text-amber-400', barBg: 'bg-amber-500' },
        { id: 'other', label: '🎁 Другое', color: 'text-pink-400', barBg: 'bg-pink-500' }
    ];

    const breakdownHTML = categories.map(cat => {
        // Отбираем элементы конкретной категории из Wishlist
        const catItems = wishlists.filter(i => {
            // Если категория не прописана, по умолчанию "music"
            const itemCat = i.category || 'music';
            return itemCat === cat.id;
        });

        const catSum = catItems.reduce((s, i) => s + i.price, 0);
        const catCount = catItems.length;

        // Сколько месяцев копить только на эту категорию
        const soloMonths = catSum > 0 ? (catSum / budget).toFixed(1) : 0;

        // Пропорциональная доля (сколько от месячного бюджета уходит на категорию относительно её веса)
        const sharePercent = wishVal > 0 ? Math.round((catSum / wishVal) * 100) : 0;

        return `
            <div class="glass p-3 rounded-2xl border border-white/5 flex flex-col justify-between hover:border-white/10 transition-colors">
                <div>
                    <div class="flex justify-between items-center text-[10px] font-black uppercase tracking-wider mb-1">
                        <span class="${cat.color}">${cat.label}</span>
                        <span class="text-gray-500">${catCount} шт.</span>
                    </div>
                    <p class="font-mono text-xs font-bold text-white">${catSum} ₴</p>
                </div>
                <div class="mt-3 pt-2 border-t border-white/5 space-y-1">
                    <div class="flex justify-between text-[9px] text-gray-500">
                        <span>Доля в списке:</span>
                        <span class="font-bold text-gray-300">${sharePercent}%</span>
                    </div>
                    <div class="w-full bg-white/5 h-1.5 rounded-full overflow-hidden mb-1">
                        <div class="${cat.barBg} h-full" style="width: ${sharePercent}%"></div>
                    </div>
                    <div class="text-[9px] text-gray-400 leading-tight">
                        ⏱️ Копить соло: <span class="text-white font-mono font-bold">${soloMonths} мес.</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    breakdownEl.innerHTML = breakdownHTML;
}

window.toggleCategoryFields = () => {
    const category = document.getElementById('item-category').value;
    const musicContainer = document.getElementById('music-fields-container');
    const clothingContainer = document.getElementById('clothing-fields-container');
    const gearContainer = document.getElementById('gear-fields-container');
    const ratingStarsWrapper = document.getElementById('rating-stars-wrapper');

    musicContainer.classList.add('hidden');
    clothingContainer.classList.add('hidden');
    gearContainer.classList.add('hidden');
    ratingStarsWrapper.classList.add('hidden');

    if (category === 'music') {
        musicContainer.classList.remove('hidden');
        ratingStarsWrapper.classList.remove('hidden');
    } else if (category === 'clothing') {
        clothingContainer.classList.remove('hidden');
    } else if (category === 'gear') {
        gearContainer.classList.remove('hidden');
    }
};

function persistData() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        return true;
    } catch (e) {
        console.error('[MIRVEL] localStorage error:', e);
        showToast('Память браузера заполнена — данные НЕ сохранены. Сделайте экспорт (.json) и уберите тяжёлые обложки.', 'error');
        return false;
    }
}

function save() {
    checkAchievements();
    persistData();
    updateUI();
}

function closeModal(id) { document.getElementById(id)?.classList.add('hidden'); }

const VALID_PAGES = ['home', 'cds', 'vinyls', 'games', 'stuff', 'wishlists', 'analytics', 'achievements', 'profile'];

function showPage(id, { fromHash = false } = {}) {
    if (!VALID_PAGES.includes(id)) id = 'home';

    document.querySelectorAll('main > section').forEach(s => {
        const isTarget = s.id === id;
        s.classList.toggle('hidden', !isTarget);
        s.classList.remove('page-enter');
        if (isTarget) {
            void s.offsetWidth; // перезапуск CSS-анимации
            s.classList.add('page-enter');
        }
    });

    document.querySelectorAll('.nav-btn').forEach(btn => {
        const active = btn.id === `nav-${id}`;
        btn.classList.toggle('is-active', active);
        if (active) btn.setAttribute('aria-current', 'page'); else btn.removeAttribute('aria-current');
    });

    if (!fromHash && location.hash !== `#${id}`) history.pushState(null, '', `#${id}`);
    document.title = `${PAGE_TITLES[id] || 'MIRVEL HUB'} · MIRVEL HUB`;
    document.querySelector('main')?.scrollTo?.({ top: 0 });
    window.scrollTo({ top: 0 });
    updateUI();
}

const PAGE_TITLES = {
    home: 'Главная', cds: 'CD', vinyls: 'Винил', games: 'Игры', stuff: 'Вещи',
    wishlists: 'Желаемое', analytics: 'Статистика', achievements: 'Достижения', profile: 'Настройки'
};

const TOAST_ICONS = { info: 'ℹ️', success: '✅', error: '⚠️' };

/** message — HTML-строка; пользовательские данные внутри должны быть пропущены через esc() */
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    // не плодим больше 4 уведомлений одновременно
    while (container.children.length >= 4) container.firstElementChild.remove();

    const toast = document.createElement('div');
    toast.className = 'toast glass';
    toast.setAttribute('role', type === 'error' ? 'alert' : 'status');
    if (type === 'error') toast.classList.add('toast-error');
    toast.innerHTML = `<span class="toast-icon">${TOAST_ICONS[type] || TOAST_ICONS.info}</span><span>${message}</span>`;
    container.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add('is-visible'));
    const ttl = type === 'error' ? 6000 : 3000;
    setTimeout(() => {
        toast.classList.remove('is-visible');
        setTimeout(() => toast.remove(), 300);
    }, ttl);
}

function getRandomRelease() {
    const all = [...data.cds, ...data.vinyls];
    if (all.length === 0) {
        showToast("У вас пока нет релизов в коллекции!");
        return;
    }
    const randomItem = all[Math.floor(Math.random() * all.length)];
    document.getElementById('random-artist').innerText = randomItem.artist || 'Разные исполнители';
    document.getElementById('random-title').innerText = randomItem.title || 'Без названия';
    document.getElementById('random-modal').classList.remove('hidden');
}

const THEMES = ['theme-blue', 'theme-green', 'theme-pink'];

function applyTheme(theme) {
    document.body.classList.remove(...THEMES);
    if (theme && THEMES.includes(theme)) document.body.classList.add(theme);
    const color = { 'theme-blue': '#3b82f6', 'theme-green': '#22c55e', 'theme-pink': '#ec4899' }[theme] || '#8b5cf6';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', color);
    document.querySelectorAll('[data-theme-btn]').forEach(b => {
        b.classList.toggle('is-selected', (b.dataset.themeBtn || '') === (theme || ''));
        b.setAttribute('aria-pressed', String((b.dataset.themeBtn || '') === (theme || '')));
    });
}

function setTheme(theme) {
    applyTheme(theme);
    data.selectedTheme = theme;
    save();
}

window.exportData = () => {
    downloadFile(`mirvel_backup_${todayStamp()}.json`, JSON.stringify(data, null, 2));
    data.lastBackup = Date.now();
    persistData();
    showToast('Бэкап скачан 💾', 'success');
};

window.exportCSV = () => {
    const rows = [['Раздел', 'Исполнитель/Платформа', 'Название', 'Год', 'Цена', 'Оценка', 'Прослушиваний', 'Состояние']];
    const sections = { cds: 'CD', vinyls: 'Винил', games: 'Игры', stuff: 'Вещи', wishlists: 'Желаемое' };
    Object.entries(sections).forEach(([key, label]) => {
        (data[key] || []).forEach(i => rows.push([
            label, i.artist || i.platform || i.brand || '', i.title || '', i.year || '',
            Number(i.price) || 0, i.rating || '', i.playCount || '', i.condition || ''
        ]));
    });
    const cell = v => `"${String(v).replace(/"/g, '""')}"`;
    // BOM — чтобы Excel правильно открыл кириллицу
    downloadFile(`mirvel_collection_${todayStamp()}.csv`, '\ufeff' + rows.map(r => r.map(cell).join(';')).join('\r\n'), 'text/csv;charset=utf-8');
    showToast('Коллекция выгружена в CSV 📊', 'success');
};

window.importData = (e) => {
    const file = e.target.files[0]; if(!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
        try {
            const parsed = JSON.parse(ev.target.result);
            if (typeof parsed !== 'object' || parsed === null) {
                throw new Error("Неверный формат JSON");
            }

            data = { ...structuredClone(defaults), ...parsed };

            if (!Array.isArray(data.cds)) data.cds = [];
            if (!Array.isArray(data.vinyls)) data.vinyls = [];
            if (!Array.isArray(data.stuff)) data.stuff = [];
            if (!Array.isArray(data.games)) data.games = [];
            if (!Array.isArray(data.wishlists)) data.wishlists = [];
            if (!Array.isArray(data.availableTags)) data.availableTags = [];
            if (!Array.isArray(data.quotes)) data.quotes = [...defaultQuotes];
            if (!Array.isArray(data.quickNotes)) data.quickNotes = [];
            if (!Array.isArray(data.unlockedAchievements)) data.unlockedAchievements = [];
            if (!Array.isArray(data.musicSites)) data.musicSites = [...defaultSites];

            data.xp = Number(data.xp) || 0;
            if (!data.gameViewMode) data.gameViewMode = 'grid';

            // Санируем дубликаты при импорте сторонних данных
            data.unlockedAchievements = [...new Set(data.unlockedAchievements)];

            save();
            updateUI();
            showToast("Коллекция успешно импортирована! 📥");
        } catch(err) {
            showToast("Ошибка при импорте бэкапа: убедитесь в корректности JSON.");
        } finally {
            e.target.value = '';
        }
    };
    reader.readAsText(file);
};

async function processImage(e, target) {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
        const img = new Image(); img.onload = () => {
            const canvas = document.createElement('canvas'); const max = 600;
            const scale = Math.min(1, max / Math.max(img.width, img.height));
            canvas.width = img.width * scale; canvas.height = img.height * scale;
            canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
            const base64 = canvas.toDataURL('image/jpeg', 0.7);
            if (target === 'avatar') { data.avatar = base64; }
            else if (target === 'banner') { data.bannerImg = base64; }
            else if (target === 'fav-artist') { data.favArtist.img = base64; }
            else if (target === 'fav-album') { data.favAlbum.img = base64; }
            else if (target === 'game') {
                window.tempGameImg = base64;
                const gameImgStatus = document.getElementById('game-img-status');
                if (gameImgStatus) { gameImgStatus.innerText = 'Обложка готова! ✨'; gameImgStatus.classList.remove('hidden'); }
            }
            else {
                window.tempImg = base64;
                document.getElementById('item-img-status').innerText = 'Изображение готово! ✨';
            }
            save(); updateUI();
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
}


// =========================
// Игровая коллекция
// =========================
let gamePlatformFilter = '';
let gameSortMode = 'title';

const GAME_PLATFORM_GROUPS = [
    'PlayStation 1','PlayStation 2','PlayStation 3','PlayStation 4','PlayStation 5',
    'Xbox','Xbox 360','Xbox One','Xbox Series',
    'Nintendo GameCube','Nintendo Wii','Nintendo Wii U','Nintendo Switch','PC CD/DVD','Другое'
];

window.openGameModal = (id = null) => {
    document.getElementById('game-edit-id').value = id || '';
    document.getElementById('game-modal-title').innerText = id ? 'Редактировать игру 🎮' : 'Игровой диск 🎮';
    window.tempGameImg = '';
    const gameImgStatus = document.getElementById('game-img-status');
    if (gameImgStatus) { gameImgStatus.classList.add('hidden'); gameImgStatus.innerText = ''; }

    const fields = ['game-title','game-developer','game-publisher','game-year','game-price','game-edition','game-url'];
    fields.forEach(id => document.getElementById(id).value = '');
    document.getElementById('game-platform').value = 'PlayStation 2';
    document.getElementById('game-region').value = '';
    document.getElementById('game-condition').value = '';
    document.getElementById('game-rating').value = 0;
    document.getElementById('game-digital').checked = false;
    setGameRating(0);

    if (id) {
        const item = data.games.find(x => x.id === Number(id));
        if (!item) return;
        document.getElementById('game-platform').value = item.platform || 'PlayStation 2';
        document.getElementById('game-region').value = item.region || '';
        document.getElementById('game-title').value = item.title || '';
        document.getElementById('game-developer').value = item.developer || '';
        document.getElementById('game-publisher').value = item.publisher || '';
        document.getElementById('game-year').value = item.year || '';
        document.getElementById('game-price').value = item.price || 0;
        document.getElementById('game-condition').value = item.condition || '';
        document.getElementById('game-edition').value = item.edition || '';
document.getElementById('game-url').value = item.url || '';
        document.getElementById('game-rating').value = item.rating || 0;
        document.getElementById('game-digital').checked = !!item.digital;
        setGameRating(item.rating || 0);
    }
    document.getElementById('game-modal').classList.remove('hidden');
};

window.setGameRating = (value) => {
    document.getElementById('game-rating').value = value;
    document.querySelectorAll('.game-star').forEach((s, i) => {
        s.className = `game-star ${i < value ? 'text-yellow-400' : 'text-gray-600'} hover:scale-110 transition`;
    });
};

window.saveGameItem = () => {
    const id = Number(document.getElementById('game-edit-id').value) || null;
    const item = {
        id: id || Date.now(),
        platform: document.getElementById('game-platform').value,
        region: document.getElementById('game-region').value,
        title: document.getElementById('game-title').value.trim(),
        developer: document.getElementById('game-developer').value.trim(),
        publisher: document.getElementById('game-publisher').value.trim(),
        year: parseInt(document.getElementById('game-year').value) || '',
        price: Math.max(0, parseFloat(document.getElementById('game-price').value) || 0),
        condition: document.getElementById('game-condition').value,
        edition: document.getElementById('game-edition').value.trim(),
url: document.getElementById('game-url').value.trim(),
        rating: parseInt(document.getElementById('game-rating').value) || 0,
        digital: document.getElementById('game-digital').checked,
        img: window.tempGameImg || ''
    };
    if (!item.title) {
        showToast('Название игры обязательно к заполнению!');
        return;
    }
    if (id) {
        const index = data.games.findIndex(x => x.id === id);
        if (index >= 0) {
            item.img = window.tempGameImg || data.games[index].img || '';
            data.games[index] = {...data.games[index], ...item};
        }
    } else {
        data.games.push(item);
    }
    save();
    closeModal('game-modal');
    showToast(id ? 'Игра обновлена 🎮' : 'Игра добавлена в коллекцию 🎮');
};

window.deleteGame = (id) => {
    data.games = (data.games || []).filter(x => x.id !== id);
    save();
    showToast('Игра удалена');
};

window.setGamePlatformFilter = (platform) => {
    gamePlatformFilter = platform || '';
    updateUI();
};

window.setGameSort = (mode) => {
    gameSortMode = mode;
    updateUI();
};

window.toggleGameView = () => {
    data.gameViewMode = data.gameViewMode === 'covers' ? 'grid' : 'covers';
    save();
};

function renderGames() {
    const grid = document.getElementById('games-grid');
    if (!grid) return;
    let items = [...(data.games || [])];
    const q = (document.getElementById('search-games')?.value || '').toLowerCase().trim();

    if (gamePlatformFilter) items = items.filter(i => i.platform === gamePlatformFilter);
    if (q) items = items.filter(i =>
        [i.title, i.platform, i.developer, i.publisher, i.edition, i.region, i.year]
        .some(v => String(v || '').toLowerCase().includes(q))
    );

    items.sort((a,b) => {
        if (gameSortMode === 'price_desc') return (b.price||0)-(a.price||0);
        if (gameSortMode === 'year_desc') return (b.year||0)-(a.year||0);
        if (gameSortMode === 'rating') return (b.rating||0)-(a.rating||0);
        return (a.title||'').localeCompare(b.title||'', 'ru');
    });

    const platformCounts = {};
    (data.games || []).forEach(i => platformCounts[i.platform] = (platformCounts[i.platform] || 0) + 1);
    const filterBar = document.getElementById('game-platform-filters');
    if (filterBar) {
        filterBar.innerHTML = '';
        const allBtn = document.createElement('button');
        allBtn.className = `px-3 py-1.5 rounded-full text-xs font-bold border ${!gamePlatformFilter ? 'border-purple-500 bg-purple-500/20 text-white' : 'border-white/10 bg-white/5 text-gray-400'}`;
        allBtn.innerText = `Все (${data.games.length})`;
        allBtn.onclick = () => setGamePlatformFilter('');
        filterBar.appendChild(allBtn);
        Object.entries(platformCounts).sort().forEach(([platform,count]) => {
            const btn = document.createElement('button');
            btn.className = `px-3 py-1.5 rounded-full text-xs font-bold border ${gamePlatformFilter===platform ? 'border-cyan-500 bg-cyan-500/20 text-white' : 'border-white/10 bg-white/5 text-gray-400'}`;
            btn.innerText = `${platform} (${count})`;
            btn.onclick = () => setGamePlatformFilter(platform);
            filterBar.appendChild(btn);
        });
    }

    ['title','price_desc','year_desc','rating'].forEach(m => {
        const b = document.getElementById(`game-sort-${m}`);
        if (b) b.className = `text-xs px-3 py-1.5 rounded-lg border ${gameSortMode===m ? 'border-purple-500 bg-purple-500/20 text-white font-bold' : 'border-white/10 bg-white/5 text-gray-400'}`;
    });

    const isCovers = data.gameViewMode === 'covers';
    grid.className = isCovers
        ? 'grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4 p-2'
        : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 p-2';
    grid.innerHTML = '';

    if (!items.length) {
        grid.innerHTML = `<div class="col-span-full glass rounded-3xl p-12 text-center text-gray-500 italic">Пока нет подходящих игр. Самое время добавить первый диск 🎮</div>`;
        return;
    }

    items.forEach(i => {
        const card = document.createElement('div');
        if (isCovers) {
            card.className = 'relative aspect-square group rounded-2xl overflow-hidden glass border border-white/10 hover:border-[var(--theme-btn)] hover:scale-105 transition-all';
            card.innerHTML = i.img
                ? `<img src="${esc(i.img)}" class="w-full h-full object-cover">`
                : `<div class="w-full h-full flex flex-col items-center justify-center bg-gradient-to-tr from-purple-900/40 to-cyan-900/40 p-2 text-center"><span class="text-3xl">🎮</span><span class="text-[9px] text-cyan-300 mt-2 truncate w-full">${esc(i.platform)}</span><span class="text-[10px] font-black truncate w-full">${esc(i.title)}</span></div>`;
            const overlay=document.createElement('div');
            overlay.className='absolute inset-0 bg-black/85 opacity-0 group-hover:opacity-100 transition-opacity p-2 flex flex-col justify-between text-[9px]';
            overlay.innerHTML=`<div><p class="text-cyan-400 font-bold">${esc(i.platform)}</p><p class="font-black truncate">${esc(i.title)}</p><p>${fmtPrice(i)}</p></div><div class="flex gap-1 justify-end"><button class="bg-white/10 rounded p-1">✏️</button><button class="bg-red-500/20 text-red-300 rounded p-1">✕</button></div>`;
            overlay.children[1].children[0].onclick=(e)=>{e.stopPropagation();openGameModal(i.id)};
            overlay.children[1].children[1].onclick=(e)=>{e.stopPropagation();deleteGame(i.id)};
            card.appendChild(overlay);
        } else {
            card.className='glass p-4 rounded-3xl relative group border border-white/5 hover:border-[var(--theme-btn)] transition-all';
            const img=i.img ? `<img src="${esc(i.img)}" class="w-24 h-24 rounded-2xl object-cover border border-white/10 shrink-0">` : `<div class="w-24 h-24 rounded-2xl bg-gradient-to-tr from-purple-900/40 to-cyan-900/40 flex items-center justify-center text-3xl shrink-0">🎮</div>`;
            card.innerHTML=`
                <div class="flex gap-4">
                    ${img}
                    <div class="min-w-0 flex-1">
                        <p class="text-[10px] uppercase font-black text-cyan-400">${esc(i.platform || 'Другое')}${i.region ? ' • '+esc(i.region) : ''}</p>
                        <h3 class="font-black text-white text-base truncate mt-1" title="${esc(i.title)}">${esc(i.title)}</h3>
                        <p class="text-purple-300 text-xs mt-1">${fmtPrice(i)}</p>
                        <p class="text-[10px] text-gray-500 mt-1 truncate">${esc(i.developer || 'Разработчик не указан')}${i.publisher ? ' • '+esc(i.publisher) : ''}</p>
                    </div>
                </div>
                <div class="mt-3 pt-3 border-t border-white/5 text-[10px] text-gray-400 space-y-1">
                    ${i.year ? `<div>📅 ${esc(i.year)}${i.edition ? ' • '+esc(i.edition) : ''}</div>` : (i.edition ? `<div>💿 ${esc(i.edition)}</div>` : '')}
                    ${i.condition ? `<span class="inline-block bg-cyan-950/40 text-cyan-400 border border-cyan-500/20 px-1.5 py-0.5 rounded">Состояние: ${esc(i.condition)}</span>` : ''}
                    <div class="text-yellow-400">${i.rating ? '⭐ '.repeat(Math.max(0, Math.min(5, Number(i.rating) || 0))) : 'Без оценки'}</div>
                </div>
                <div class="absolute right-3 top-3 flex gap-1 opacity-0 group-hover:opacity-100 transition">
                    <button class="bg-black/80 p-1.5 rounded-xl border border-white/10">✏️</button>
                    <button class="bg-red-950/80 text-red-300 p-1.5 rounded-xl border border-red-500/20">✕</button>
                </div>`;
            const buttons=card.querySelectorAll('button');
            buttons[0].onclick=()=>openGameModal(i.id);
            buttons[1].onclick=()=>deleteGame(i.id);
        }
        grid.appendChild(card);
    });
}

window.openModal = (type, id = null) => {
    document.getElementById('edit-type').value = type; document.getElementById('edit-id').value = id || '';
    document.getElementById('item-url').classList.toggle('hidden', type !== 'wishlists');
    document.getElementById('gift-container').classList.toggle('hidden', type === 'wishlists');
    document.getElementById('custom-cd-container').classList.toggle('hidden', type !== 'cds');
    document.getElementById('tags-selector').classList.toggle('hidden', type !== 'wishlists');

    document.getElementById('item-priority').classList.toggle('hidden', type !== 'wishlists');
    document.getElementById('item-img-status').classList.add('hidden');
    document.getElementById('item-img-status').innerText = '';
    window.tempImg = ''; tempTags = [];

    if(id) {
        const item = data[type].find(x => x.id === parseInt(id));
        document.getElementById('item-category').value = item.category || 'music';
        document.getElementById('item-title').value = item.title;
        document.getElementById('item-artist').value = item.artist || '';
        document.getElementById('item-price').value = item.price;
        document.getElementById('item-where-bought').value = item.whereBought || '';
document.getElementById('item-year').value = item.year || '';
        document.getElementById('item-label').value = item.label || '';
        document.getElementById('item-condition').value = item.condition || '';
        document.getElementById('item-format-details').value = item.formatDetails || '';

        document.getElementById('item-size').value = item.size || '';
        document.getElementById('item-style').value = item.style || '';
        document.getElementById('item-brand').value = item.brand || '';

        document.getElementById('item-priority').value = item.priority || '';
        document.getElementById('item-url').value = item.url || '';
        document.getElementById('item-gift').checked = !!item.isGift;
        document.getElementById('item-custom-cd').checked = !!item.isCustom;
        setRatingValue(item.rating || 0);
        tempTags = item.tags || [];
        if (item.img) {
            document.getElementById('item-img-status').innerText = 'Установлена кастомная обложка';
            document.getElementById('item-img-status').classList.remove('hidden');
        }
    } else {
        if (type === 'stuff') {
            document.getElementById('item-category').value = 'clothing';
        } else {
            document.getElementById('item-category').value = 'music';
        }

        document.getElementById('item-title').value = '';
        document.getElementById('item-artist').value = '';
        document.getElementById('item-price').value = '';
        document.getElementById('item-where-bought').value = '';
document.getElementById('item-year').value = '';
        document.getElementById('item-label').value = '';
        document.getElementById('item-condition').value = '';
        document.getElementById('item-format-details').value = '';
        document.getElementById('item-size').value = '';
        document.getElementById('item-style').value = '';
        document.getElementById('item-brand').value = '';

        document.getElementById('item-priority').value = '';
        document.getElementById('item-url').value = '';
        document.getElementById('item-gift').checked = false;
        document.getElementById('item-custom-cd').checked = false;
        setRatingValue(0);
    }
    toggleCategoryFields();
    renderModalTags();
    document.getElementById('modal').classList.remove('hidden');
};

window.saveItem = async () => {
    const type = document.getElementById('edit-type').value;
    const idStr = document.getElementById('edit-id').value;

    const category = document.getElementById('item-category').value;
    const title = document.getElementById('item-title').value.trim();
    const artist = document.getElementById('item-artist').value.trim();
    const price = Math.max(0, parseFloat(document.getElementById('item-price').value) || 0);
    const whereBought = document.getElementById('item-where-bought').value.trim();
const year = parseInt(document.getElementById('item-year').value) || '';
    const label = document.getElementById('item-label').value.trim();
    const condition = document.getElementById('item-condition').value;
    const formatDetails = document.getElementById('item-format-details').value.trim();

    const size = document.getElementById('item-size').value.trim();
    const style = document.getElementById('item-style').value.trim();
    const brand = document.getElementById('item-brand').value.trim();

    const priority = document.getElementById('item-priority').value;
    const url = document.getElementById('item-url').value.trim();
    const isGift = document.getElementById('item-gift').checked;
    const isCustom = document.getElementById('item-custom-cd').checked;
    const rating = parseInt(document.getElementById('item-rating').value) || 0;

    if (!title) {
        showToast("Название обязательно к заполнению!");
        return;
    }

    if(idStr) {
        const item = data[type].find(x => x.id === parseInt(idStr));
        if (!item) {
            showToast('Не удалось найти этот предмет.');
            return;
        }
        Object.assign(item, {
            category, title, artist, price, whereBought,
year, label, condition, formatDetails,
            size, style, brand, priority, url, isGift, isCustom, rating,
            tags: [...tempTags], img: window.tempImg || item.img
        });
        save(); closeModal('modal');
    } else {
        data[type].push({
            id: Date.now(), category, title, artist, price, whereBought,
year, label, condition, formatDetails,
            size, style, brand, priority, url, isGift, isCustom, rating,
            playCount: 0, lastPlayed: '',
            tags: [...tempTags], img: window.tempImg, imgPos: 'center', note: ''
        });
        closeModal('modal');
        save();
        if (type !== 'wishlists') {
            addXP(50, "новый предмет в коллекции ✨");
        }
    }
};
