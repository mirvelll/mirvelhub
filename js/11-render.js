function renderAll() {
    const cdsVal = (data.cds || []).reduce((s, i) => s + (Number(i.price) || 0), 0);
    const vinylsVal = (data.vinyls || []).reduce((s, i) => s + (Number(i.price) || 0), 0);
    const stuffVal = (data.stuff || []).reduce((s, i) => s + (Number(i.price) || 0), 0);
    const wishVal = (data.wishlists || []).reduce((s, i) => s + (Number(i.price) || 0), 0);
    const gamesVal = (data.games || []).reduce((s, i) => s + (Number(i.price) || 0), 0);
    const collectionItems = [...(data.cds || []), ...(data.vinyls || []), ...(data.games || []), ...(data.stuff || [])];
    const totalCollectionValue = collectionItems.reduce((s, i) => s + (Number(i.price) || 0), 0);
    const totalPlays = [...(data.cds || []), ...(data.vinyls || [])].reduce((s, i) => s + (Number(i.playCount) || 0), 0);
    const ratedCount = [...(data.cds || []), ...(data.vinyls || []), ...(data.games || [])].filter(i => (Number(i.rating) || 0) > 0).length;

    document.getElementById('display-name').innerText = data.name || 'Коллекционер';
    document.getElementById('display-desc').innerText = data.description || '';
    document.getElementById('display-artists').innerText = data.favoriteArtists || '-';

    setFieldValue('profile-name', data.name || '');
    setFieldValue('profile-desc', data.description || '');
    setFieldValue('profile-artists', data.favoriteArtists || '');

    setFieldValue('fav-input-artist', data.favArtist.name || '');
    setFieldValue('fav-input-artist-url', data.favArtist.url || '');
    setFieldValue('fav-input-album', data.favAlbum.name || '');
    setFieldValue('fav-input-album-url', data.favAlbum.url || '');

    const xpVal = data.xp || 0;
    const lvl = Math.floor(xpVal / 500) + 1;
    const currentLvlXP = xpVal % 500;
    const progressPercent = (currentLvlXP / 500) * 100;

    document.getElementById('user-lvl').innerText = lvl;
    document.getElementById('user-xp-display').innerText = currentLvlXP;
    document.getElementById('xp-progress-bar').style.width = `${progressPercent}%`;

    document.getElementById('stat-music-col-val').innerText = (cdsVal + vinylsVal) + ' ₴';
    document.getElementById('stat-stuff-col-val').innerText = stuffVal + ' ₴';
    const gamesStatEl = document.getElementById('stat-games-col-val');
    if (gamesStatEl) gamesStatEl.innerText = gamesVal + ' ₴';
    document.getElementById('stat-wish-val').innerText = wishVal + ' ₴';
    document.getElementById('stat-count-val').innerText = (data.cds?.length || 0) + (data.vinyls?.length || 0) + (data.games?.length || 0) + (data.stuff?.length || 0);

    const allRatedItems = [...(data.cds || []), ...(data.vinyls || [])].filter(i => (i.rating || 0) > 0);
    const averageRating = allRatedItems.length > 0
        ? (allRatedItems.reduce((acc, i) => acc + i.rating, 0) / allRatedItems.length).toFixed(1)
        : '0.0';
    // «Добавлено за месяц»: дата добавления берётся из id (он равен времени создания), как в расширенной статистике
    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
    const addedThisMonth = [...(data.cds || []), ...(data.vinyls || []), ...(data.games || []), ...(data.stuff || [])]
        .filter(i => Number(i.id) >= 1.4e12 && Number(i.id) >= monthStart.getTime()).length;
    const addedEl = document.getElementById('stat-added-month');
    if (addedEl) addedEl.innerText = addedThisMonth;
    document.getElementById('stat-total-value').innerText = totalCollectionValue + ' ₴';
    document.getElementById('stat-total-plays').innerText = totalPlays;
    // «Игр пройдено»: онлайн-игры и «не в планах» в зачёт не идут (как на странице игр)
    const countableGames = (data.games || []).filter(g => !['online', 'skipped'].includes(g.status));
    const doneGames = countableGames.filter(g => g.status === 'completed').length;
    const gamesDoneEl = document.getElementById('stat-games-done');
    if (gamesDoneEl) gamesDoneEl.innerText = countableGames.length ? `${doneGames} / ${countableGames.length}` : '—';

    document.getElementById('total-cds').innerText = cdsVal;
    document.getElementById('count-cds').innerText = data.cds.length;
    document.getElementById('total-vinyls').innerText = vinylsVal;
    document.getElementById('count-vinyls').innerText = data.vinyls.length;
    document.getElementById('total-stuff').innerText = stuffVal;
    document.getElementById('count-stuff').innerText = data.stuff.length;
    const totalGamesEl = document.getElementById('total-games');
    const countGamesEl = document.getElementById('count-games');
    if (totalGamesEl) totalGamesEl.innerText = gamesVal;
    if (countGamesEl) countGamesEl.innerText = data.games.length;
    const gameRatings = data.games.filter(i => (i.rating || 0) > 0);
    const gameAvgEl = document.getElementById('games-avg-rating');
    if (gameAvgEl) gameAvgEl.innerText = gameRatings.length ? (gameRatings.reduce((s,i)=>s+(i.rating||0),0)/gameRatings.length).toFixed(1) : '0.0';
    const gamePlatformCountEl = document.getElementById('games-platform-count');
    if (gamePlatformCountEl) gamePlatformCountEl.innerText = new Set(data.games.map(i=>i.platform).filter(Boolean)).size;
    const latestPlatformEl = document.getElementById('games-latest-platform');
    if (latestPlatformEl) {
        const latest = [...data.games].sort((a,b)=>(b.year||0)-(a.year||0))[0];
        latestPlatformEl.innerText = latest?.platform || '—';
    }

    document.getElementById('total-wishlists').innerText = wishVal;
    document.getElementById('count-wishlists').innerText = data.wishlists.length;

    // Бюджет и планировщик
    const budgetSlider = document.getElementById('hobby-budget-slider');
    const budgetDisplay = document.getElementById('hobby-budget-display');
    if (budgetSlider && budgetDisplay) {
        budgetSlider.value = data.hobbyBudget || 2500;
        budgetDisplay.innerText = `${data.hobbyBudget || 2500} ₴`;
    }
    updateHobbyBudgetPlanner();

    renderAnalyticsTab();

    const currentMode = data.cozyAtmosphereMode || 'vinyl';

    ['vinyl', 'vinyl_pure', 'vinyl_old', 'rain', 'space', 'tape'].forEach(m => {
        const btn = document.getElementById(`atm-btn-${m}`);
        if (btn) {
            if (m === currentMode) {
                btn.className = "p-3 rounded-xl border border-purple-500 bg-purple-600/20 text-white font-bold transition duration-300 ring-2 ring-purple-500/50 scale-105 shadow-[0_0_15px_rgba(139,92,246,0.3)]";
            } else {
                btn.className = "p-3 rounded-xl border border-white/5 bg-white/5 text-gray-400 font-bold hover:bg-white/10 hover:text-white hover:scale-102 transition duration-300";
            }
        }
    });

    // Рендер достижений
    const achGrid = document.getElementById('achievements-grid');
    if (achGrid) {
        // Жёсткая санация перед выводом на экран для предотвращения бага "38 / 23 (100%)"
        sanitizeUnlockedAchievements();
        const unlocked = data.unlockedAchievements;

        const total = getTotalAchievementsCount();
        const countUnlocked = unlocked.length;
        const percent = total > 0 ? Math.min(100, Math.round((countUnlocked / total) * 100)) : 0;

        document.getElementById('achievements-progress-text').innerText = `${countUnlocked} / ${total} (${percent}%)`;
        document.getElementById('achievements-progress-bar').style.width = `${percent}%`;

        achGrid.innerHTML = ACHIEVEMENTS_LIST.filter(a => data.showScrobble || a.id !== 'music_listener').map(ach => {
            if (ach.isTiered) {
                let activeTierIdx = -1;
                ach.tiers.forEach((tier, idx) => {
                    if (unlocked.includes(`${ach.id}_${idx}`)) {
                        activeTierIdx = idx;
                    }
                });

                const currentVal = ach.getVal(data);
                const isUnlockedAtLeastOnce = activeTierIdx >= 0;
                const isMaxedOut = activeTierIdx === ach.tiers.length - 1;
                const nextTier = isMaxedOut ? null : ach.tiers[activeTierIdx + 1];

                let starsHtml = '';
                for(let s = 0; s < ach.tiers.length; s++) {
                    starsHtml += s <= activeTierIdx ? '<span class="text-yellow-400">★</span>' : '<span class="text-gray-600">☆</span>';
                }

                let progressPercent = 100;
                let progressText = 'Максимум!';
                if (!isMaxedOut) {
                    progressPercent = Math.min(100, Math.max(0, (currentVal / nextTier.req) * 100));
                    progressText = `${currentVal} / ${nextTier.req}`;
                }

                const borderStyle = isUnlockedAtLeastOnce ? `border-color: var(--theme-btn); box-shadow: 0 4px 20px var(--theme-color)` : `border-color: rgba(255,255,255,0.05);`;

                return `
                    <div class="glass p-6 rounded-3xl border transition-all duration-500 ${isUnlockedAtLeastOnce ? 'opacity-100 hover:scale-[1.02]' : 'opacity-40 grayscale'}" style="${borderStyle}">
                        <div class="flex items-center justify-between mb-4">
                            <div class="flex items-center gap-4">
                                <span class="text-4xl filter drop-shadow-[0_0_8px_rgba(255,255,255,0.2)] select-none">${ach.icon}</span>
                                <div>
                                    <h4 class="font-black text-white text-base">${ach.title}</h4>
                                    <div class="flex gap-1 text-sm mt-0.5">${starsHtml}</div>
                                </div>
                            </div>
                            <span class="text-[10px] font-bold tracking-wider uppercase bg-purple-500/10 text-purple-300 px-2.5 py-1 rounded-full border border-purple-500/20 shrink-0">
                                ${isMaxedOut ? '👑 МАКС' : `${activeTierIdx + 1} / ${ach.tiers.length} Ур.`}
                            </span>
                        </div>
                        <p class="text-xs text-gray-400 leading-relaxed min-h-[32px] mb-3">
                            ${isMaxedOut ? 'Все уровни этого испытания успешно выполнены!' : `Текущая цель: ${nextTier.desc}`}
                        </p>
                        <div class="space-y-1.5">
                            <div class="flex justify-between items-center text-[10px] font-bold text-gray-500 uppercase">
                                <span>Прогресс</span>
                                <span class="font-mono text-cyan-400">${progressText}</span>
                            </div>
                            <div class="w-full bg-white/5 h-2 rounded-full overflow-hidden p-0.5 border border-white/5">
                                <div class="bg-gradient-to-r from-purple-500 to-cyan-500 h-full rounded-full transition-all duration-500" style="width: ${progressPercent}%"></div>
                            </div>
                        </div>
                    </div>
                `;
            } else {
                const isOpen = unlocked.includes(ach.id);
                return `
                    <div class="glass p-6 rounded-3xl border transition-all duration-500 ${isOpen ? 'border-[var(--theme-btn)] opacity-100 hover:scale-[1.02]' : 'border-white/5 opacity-40 grayscale'}" style="${isOpen ? 'box-shadow: 0 4px 20px var(--theme-color)' : ''}">
                        <div class="flex items-center gap-4 mb-4">
                            <span class="text-4xl filter drop-shadow-[0_0_8px_rgba(255,255,255,0.2)] select-none">${isOpen ? ach.icon : '🔒'}</span>
                            <div>
                                <h4 class="font-black text-white text-base ${isOpen ? '' : 'text-gray-400'}">${ach.title}</h4>
                                <span class="text-[10px] font-bold tracking-wider uppercase ${isOpen ? 'text-yellow-400' : 'text-gray-500'}">🏆 +${ach.xp} XP</span>
                            </div>
                        </div>
                        <p class="text-xs text-gray-400 leading-relaxed min-h-[32px]">${ach.desc}</p>
                    </div>
                `;
            }
        }).join('');
    }

    const artImg = document.getElementById('fav-artist-img');
    const artPlc = document.getElementById('fav-artist-placeholder');
    document.getElementById('fav-artist-text').innerText = data.favArtist.name || 'Нажмите, чтобы настроить';
    { const link = document.getElementById('fav-link-artist'); const url = safeUrl(data.favArtist.url); link.href = url || '#profile'; link.target = url ? '_blank' : '_self'; }
    if (data.favArtist.img) {
        artImg.src = data.favArtist.img;
        artImg.classList.remove('hidden');
        artPlc.classList.add('hidden');
    } else {
        artImg.classList.add('hidden');
        artPlc.classList.remove('hidden');
    }

    const albImg = document.getElementById('fav-album-img');
    const albPlc = document.getElementById('fav-album-placeholder');
    document.getElementById('fav-album-text').innerText = data.favAlbum.name || 'Нажмите, чтобы настроить';
    { const link = document.getElementById('fav-link-album'); const url = safeUrl(data.favAlbum.url); link.href = url || '#profile'; link.target = url ? '_blank' : '_self'; }
    if (data.favAlbum.img) {
        albImg.src = data.favAlbum.img;
        albImg.classList.remove('hidden');
        albPlc.classList.add('hidden');
    } else {
        albImg.classList.add('hidden');
        albPlc.classList.remove('hidden');
    }

    const banner = document.getElementById('banner-bg');
    if(data.bannerImg) { banner.style.backgroundImage = `url(${data.bannerImg})`; }

    ['all', 'music', 'clothing', 'gear', 'other'].forEach(cat => {
        const btn = document.getElementById(`filter-cat-${cat}`);
        if (btn) {
            if (currentFilter === cat || (cat === 'all' && currentFilter === null)) {
                btn.className = "px-3 py-1 rounded-full border border-purple-500 text-xs bg-purple-500/20 text-white transition-all ring-1 ring-purple-500/50";
            } else {
                btn.className = "px-3 py-1 rounded-full border border-white/10 text-xs bg-white/5 hover:bg-white/10 text-gray-300 transition-all";
            }
        }
    });

    document.getElementById('filter-tags').innerHTML = (data.availableTags || []).map(t => {
        const isSelected = currentFilter === t.text;
        return `<button onclick="setFilter(${esc(JSON.stringify(t.text))})" class="px-3 py-1 rounded-full text-xs transition-all ${isSelected ? 'ring-2 ring-white scale-105 font-bold' : 'opacity-70 hover:opacity-100'}" style="background-color: ${esc(t.color)}">${esc(t.text)}</button>`;
    }).join('');

    const realSpentReleases = [...(data.cds || []), ...(data.vinyls || []), ...(data.stuff || [])];
    let mostExpensive = null;
    if (realSpentReleases.length > 0) {
        mostExpensive = realSpentReleases.reduce((max, item) => (item.price > max.price) ? item : max, realSpentReleases[0]);
    }
    const expEl = document.getElementById('stat-most-expensive');
    if (expEl) {
        if (mostExpensive) {
            expEl.innerHTML = `
                <span class="text-xs text-gray-400 block truncate" title="${esc(mostExpensive.artist || 'Вещь / Девайс')} — ${esc(mostExpensive.title)}">${esc(mostExpensive.artist || 'Вещь')} — ${esc(mostExpensive.title)}</span>
                <span class="text-xl font-black text-yellow-400 font-mono block mt-1">${fmtPrice(mostExpensive)}</span>
            `;
        } else {
            expEl.innerText = 'Нет релизов';
        }
    }

    const renderGrid = (key, id) => {
        let items = [...(data[key] || [])];

        // Фильтрация
        if(key === 'wishlists' && currentFilter) {
            if (['music', 'clothing', 'gear', 'other'].includes(currentFilter)) {
                items = items.filter(i => (i.category || 'music') === currentFilter);
            } else {
                items = items.filter(i => (i.tags || []).find(t => t.text === currentFilter));
            }
        }
        const searchInput = document.getElementById(`search-${key}`);
        const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
        if (query) {
            items = items.filter(i =>
                (i.title || '').toLowerCase().includes(query) ||
                (i.artist || '').toLowerCase().includes(query) ||
                (i.label || '').toLowerCase().includes(query) ||
                (i.whereBought || '').toLowerCase().includes(query) ||
                (i.formatDetails || '').toLowerCase().includes(query) ||
                (i.tags || []).some(t => (t.text || '').toLowerCase().includes(query)) ||
                (i.year || '').toString().includes(query)
            );
        }

        // Логика Сортировки
        let activeSort = (data.sortMode && data.sortMode[key]) || 'title';
        if (activeSort === 'playCount' && !data.showScrobble) activeSort = 'title';

        // Стили подсветки активной кнопки сортировки
        ['title', 'artist', 'priority', 'recent', 'year_desc', 'price_desc', 'price_asc', 'rating', 'playCount'].forEach(sOpt => {
            const btn = document.getElementById(`sort-${key}-${sOpt}`);
            if (btn) {
                if (activeSort === sOpt) {
                    btn.className = "text-xs px-3 py-1.5 rounded-lg border border-purple-500 bg-purple-500/20 text-white font-bold";
                } else {
                    btn.className = "text-xs px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 text-gray-400 hover:text-white";
                }
            }
        });

        items.sort((a, b) => {
            if (activeSort === 'title') {
                return (a.title || '').localeCompare(b.title || '');
            } else if (activeSort === 'price_desc') {
                return (b.price || 0) - (a.price || 0);
            } else if (activeSort === 'price_asc') {
                return (a.price || 0) - (b.price || 0);
            } else if (activeSort === 'rating') {
                return (b.rating || 0) - (a.rating || 0);
            } else if (activeSort === 'playCount') {
                return (b.playCount || 0) - (a.playCount || 0);
            } else if (activeSort === 'artist') {
                return (a.artist || '\uffff').localeCompare(b.artist || '\uffff', 'ru') || (a.title || '').localeCompare(b.title || '', 'ru');
            } else if (activeSort === 'recent') {
                return (b.id || 0) - (a.id || 0);
            } else if (activeSort === 'year_desc') {
                return (parseInt(b.year) || 0) - (parseInt(a.year) || 0);
            } else if (activeSort === 'priority') {
                // 🔥 Высокий → ⚡ Средний → ⏳ Низкий → без приоритета; внутри — дешёвые первыми
                const rank = x => ({ '🔥 Высокий': 0, '⚡ Средний': 1, '⏳ Низкий': 2 }[x.priority] ?? 3);
                return rank(a) - rank(b) || (a.price || 0) - (b.price || 0);
            }
            return 0;
        });

        const gridEl = document.getElementById(id);
        gridEl.innerHTML = '';

        const isCoversMode = data.viewMode && data.viewMode[key] === 'covers';

        // Настройка сетки для разных видов
        if (isCoversMode) {
            gridEl.className = "grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4 overflow-visible p-2";
        } else {
            gridEl.className = "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10 overflow-visible p-2";
        }

        items.forEach(i => {
            if (isCoversMode) {
                const coverWrap = document.createElement('div');
                coverWrap.className = "relative aspect-square group rounded-2xl overflow-hidden glass border border-white/10 cursor-pointer hover:border-[var(--theme-btn)] hover:scale-105 transition-all duration-300";
                coverWrap.title = `${i.artist || 'Разные'} - ${i.title}`;
                coverWrap.dataset.mid = i.id;
                coverWrap.dataset.mkey = key;

                if (i.img) {
                    coverWrap.innerHTML = `<img src="${esc(i.img)}" class="w-full h-full object-cover">`;
                } else {
                    coverWrap.innerHTML = `
                        <div class="w-full h-full bg-gradient-to-tr from-purple-900/40 to-cyan-900/40 flex flex-col items-center justify-center text-center p-2">
                            <span class="text-2xl">${key === 'cds' ? '💿' : '💽'}</span>
                            <span class="text-[9px] text-gray-400 truncate w-full mt-1">${esc(i.artist || '')}</span>
                            <span class="text-[10px] text-white font-black truncate w-full mt-0.5">${esc(i.title)}</span>
                        </div>
                    `;
                }

                // Тонкий полупрозрачный оверлей с кнопками
                const overlay = document.createElement('div');
                overlay.className = "absolute inset-0 bg-black/80 flex flex-col justify-between p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20 text-[9px]";

                overlay.innerHTML = `
                    <div class="truncate">
                        <p class="text-[8px] font-bold text-purple-400 truncate uppercase">${esc(i.artist || 'Разные')}</p>
                        <p class="font-black text-white truncate leading-tight">${esc(i.title)}</p>
                        <p class="text-cyan-400 font-mono font-bold mt-0.5">${fmtPrice(i)}</p>
                    </div>
                    <div class="flex gap-1 justify-end">
                        <button onclick="event.stopPropagation(); logPlay('${key}', ${i.id})" class="scrobble-ui bg-purple-600 hover:bg-purple-500 text-white rounded p-1" title="Скробблинг">🎧</button>
                        <button onclick="event.stopPropagation(); openModal('${key}', ${i.id})" class="bg-white/10 hover:bg-white/25 text-white rounded p-1">✏️</button>
                    </div>
                `;
                coverWrap.appendChild(overlay);
                gridEl.appendChild(coverWrap);

            } else {
                const wrap = document.createElement('div');
                wrap.className = "release-container relative w-full min-h-[220px] overflow-visible mb-6 group";
                wrap.setAttribute('data-play-id', i.id);
                wrap.dataset.mid = i.id;
                wrap.dataset.mkey = key;

                const disc = document.createElement('div');
                disc.className = "media-disc absolute left-4 top-4 w-36 h-36 rounded-full flex items-center justify-center pointer-events-none z-0 shadow-2xl spin-slow";

                const itemCat = i.category || 'music';

                if (key === 'cds' || (key === 'wishlists' && itemCat === 'music' && !i.formatDetails?.toLowerCase().includes('винил'))) {
                    disc.className += " bg-gradient-to-tr from-zinc-850 via-zinc-200 to-zinc-650 border-4 border-zinc-900";
                    disc.innerHTML = `
                        <div class="w-12 h-12 rounded-full bg-zinc-900 border border-white/20 flex items-center justify-center">
                            <div class="w-4 h-4 rounded-full bg-black"></div>
                        </div>
                    `;
                } else if (key === 'vinyls' || (key === 'wishlists' && itemCat === 'music' && i.formatDetails?.toLowerCase().includes('винил'))) {
                    disc.className += " bg-zinc-950 border-4 border-zinc-900";
                    disc.innerHTML = `
                        <div class="w-14 h-14 rounded-full bg-purple-500/20 border border-purple-500/40 flex items-center justify-center">
                            <div class="w-4 h-4 rounded-full bg-black"></div>
                        </div>
                    `;
                } else if (itemCat === 'clothing') {
                    disc.className += " bg-teal-900 border-2 border-teal-500/30 flex items-center justify-center";
                    disc.innerHTML = `<span class="text-3xl">👕</span>`;
                } else if (itemCat === 'gear') {
                    disc.className += " bg-amber-900 border-2 border-amber-500/30 flex items-center justify-center";
                    disc.innerHTML = `<span class="text-3xl">🔌</span>`;
                } else {
                    disc.className += " bg-zinc-900 border-2 border-white/10";
                    disc.innerHTML = `<span class="text-xs text-gray-500">Wish</span>`;
                }

                const card = document.createElement('div');
                card.className = "release-card glass p-4 rounded-3xl relative z-10 w-full h-full hover:border-[var(--theme-btn)] transition-all duration-300 flex flex-col justify-between overflow-hidden min-h-[200px]";

                const headerRow = document.createElement('div');
                headerRow.className = "flex gap-4 items-start";

                const imgContainer = document.createElement('div');
                imgContainer.className = "w-24 h-24 bg-white/5 rounded-2xl overflow-hidden shrink-0 border border-white/5 relative";
                if (i.img) {
                    const img = document.createElement('img');
                    img.src = i.img;
                    img.className = "w-full h-full object-cover object-center";
                    imgContainer.appendChild(img);
                } else {
                    const noPhoto = document.createElement('div');
                    noPhoto.className = "h-full flex items-center justify-center opacity-30 text-[10px]";
                    noPhoto.innerText = "Без фото";
                    imgContainer.appendChild(noPhoto);
                }

                if (itemCat === 'music' && i.rating > 0) {
                    const ratingBadge = document.createElement('div');
                    ratingBadge.className = "absolute bottom-1 right-1 bg-black/75 px-1.5 py-0.5 rounded text-[9px] text-yellow-400 font-bold border border-yellow-500/20";
                    ratingBadge.innerText = `⭐ ${i.rating}`;
                    imgContainer.appendChild(ratingBadge);
                }

                const infoContainer = document.createElement('div');
                infoContainer.className = "flex-grow min-w-0";

                if (i.artist) {
                    const artistEl = document.createElement('p');
                    artistEl.className = "text-[10px] uppercase font-bold text-purple-400 truncate";
                    artistEl.innerText = i.artist;
                    infoContainer.appendChild(artistEl);
                }

                const titleEl = document.createElement('h3');
                titleEl.className = i.artist ? "font-bold text-sm truncate text-white mt-0.5" : "font-black text-base truncate text-white mt-2 leading-tight";
                titleEl.title = i.title;
                titleEl.innerText = i.title + (i.isGift ? ' 🎁' : '') + (i.isCustom ? ' ✨' : '');
                infoContainer.appendChild(titleEl);

                const priceEl = document.createElement('p');
                priceEl.className = "text-cyan-400 font-mono text-sm mt-1 font-bold";
                priceEl.innerText = `${fmtPrice(i)}`;
                infoContainer.appendChild(priceEl);

                if (i.whereBought) {
                    const boughtEl = document.createElement('p');
                    boughtEl.className = "text-[10px] text-purple-300 font-medium truncate mt-0.5";
                    boughtEl.innerText = (key === 'wishlists' ? `🏪 Где: ${i.whereBought}` : `🏪 Куплено в: ${i.whereBought}`);
                    infoContainer.appendChild(boughtEl);
                }

                const metaDetails = document.createElement('div');
                metaDetails.className = "text-[10px] text-gray-500 mt-2 space-y-0.5 font-medium";

                if (itemCat === 'music') {
                    if (i.year || i.label || i.condition || i.formatDetails || i.priority) {
                        let metaString = '';
                        if (i.year) metaString += `📅 ${i.year} `;
                        if (i.label) metaString += `• 🏷️ ${i.label}`;

                        if (metaString) {
                            const mainMeta = document.createElement('div');
                            mainMeta.className = "truncate text-gray-400";
                            mainMeta.innerText = metaString;
                            metaDetails.appendChild(mainMeta);
                        }

                        if (i.formatDetails) {
                            const fmtDetails = document.createElement('div');
                            fmtDetails.className = "truncate text-purple-300";
                            fmtDetails.innerText = `🎨 ${i.formatDetails}`;
                            metaDetails.appendChild(fmtDetails);
                        }

                        if (i.condition) {
                            const condDetails = document.createElement('span');
                            condDetails.className = "inline-block bg-cyan-950/40 text-cyan-400 border border-cyan-500/20 px-1.5 py-0.5 rounded text-[8px] font-bold mt-1";
                            condDetails.innerText = `Состояние: ${i.condition}`;
                            metaDetails.appendChild(condDetails);
                        }
                    }
                } else if (itemCat === 'clothing') {
                    if (i.size || i.style) {
                        const clothDetails = document.createElement('div');
                        clothDetails.className = "text-teal-400 font-semibold";
                        clothDetails.innerText = `👕 Размер: ${i.size || 'Не указан'} ${i.style ? `(${i.style})` : ''}`;
                        metaDetails.appendChild(clothDetails);
                    }
                } else if (itemCat === 'gear') {
                    if (i.brand) {
                        const gearDetails = document.createElement('div');
                        gearDetails.className = "text-amber-400 font-semibold truncate";
                        gearDetails.innerText = `🔌 Девайс: ${i.brand}`;
                        metaDetails.appendChild(gearDetails);
                    }
                }
if (key === 'wishlists' && i.priority) {
                    // Кликабельный приоритет
                    const prioDetails = document.createElement('button');
                    prioDetails.className = "inline-block bg-white/5 border border-white/10 hover:border-purple-500/50 hover:bg-white/10 px-2 py-1 rounded-xl text-[8px] font-bold mt-1 text-yellow-400 transition-all active:scale-95";
                    prioDetails.title = "Нажмите, чтобы изменить";
                    prioDetails.innerHTML = `${esc(i.priority)} 🔄`;
                    prioDetails.onclick = (e) => { e.stopPropagation(); cyclePriority(i.id); };
                    metaDetails.appendChild(prioDetails);
                }

                infoContainer.appendChild(metaDetails);

                if (i.url) {
                    const linkEl = document.createElement('a');
                    linkEl.href = safeUrl(i.url) || '#';
                    linkEl.rel = 'noopener noreferrer';
                    linkEl.target = "_blank";
                    linkEl.className = "text-[10px] text-blue-400 hover:underline inline-block mt-2 font-bold";
                    linkEl.innerText = "🔗 Посмотреть на сайте";
                    infoContainer.appendChild(linkEl);
                }

                headerRow.appendChild(imgContainer);
                headerRow.appendChild(infoContainer);
                card.appendChild(headerRow);

                const footerContainer = document.createElement('div');
                footerContainer.className = "mt-3 space-y-1.5";

                const badgesRow = document.createElement('div');
                badgesRow.className = "flex flex-wrap gap-1 items-center";

                if (key === 'wishlists' || key === 'stuff') {
                    const catBadge = document.createElement('span');
                    catBadge.className = "px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider";
                    if (itemCat === 'music') {
                        catBadge.className += " bg-purple-500/20 text-purple-300 border border-purple-500/20";
                        catBadge.innerText = "💿 Музыка";
                    } else if (itemCat === 'clothing') {
                        catBadge.className += " bg-teal-500/20 text-teal-300 border border-teal-500/20";
                        catBadge.innerText = "👕 Одежда";
                    } else if (itemCat === 'gear') {
                        catBadge.className += " bg-amber-500/20 text-amber-300 border border-amber-500/20";
                        catBadge.innerText = "🔌 Техника";
                    } else {
                        catBadge.className += " bg-gray-500/20 text-gray-300 border border-gray-500/20";
                        catBadge.innerText = "🎁 Другое";
                    }
                    badgesRow.appendChild(catBadge);
                }

                if (i.tags && i.tags.length > 0) {
                    i.tags.forEach(t => {
                        const tagSpan = document.createElement('span');
                        tagSpan.className = "px-1.5 py-0.5 rounded text-[8px]";
                        tagSpan.style.backgroundColor = t.color;
                        tagSpan.innerText = t.text;
                        badgesRow.appendChild(tagSpan);
                    });
                }
                footerContainer.appendChild(badgesRow);

                if (key !== 'wishlists' && key !== 'stuff' && itemCat === 'music') {
                    const listenerRow = document.createElement('div');
                    listenerRow.className = "scrobble-ui flex justify-between items-center bg-white/5 p-2 rounded-2xl border border-white/5 text-[10px] text-gray-400 font-medium";

                    const statsDiv = document.createElement('div');
                    statsDiv.className = "space-y-0.5";

                    statsDiv.innerHTML = `
                        <div>Прослушано: <span class="text-purple-300 font-black font-mono">${i.playCount || 0}</span> раз(а)</div>
                        ${i.lastPlayed ? `<div class="text-[9px] text-gray-500">Последний: ${esc(i.lastPlayed)}</div>` : ''}
                    `;
                    const playBtn = document.createElement('button');
                    playBtn.className = "bg-purple-600/30 hover:bg-purple-600/70 border border-purple-500/30 text-purple-200 px-2.5 py-1 rounded-xl transition font-black flex items-center gap-1 active:scale-95";
                    playBtn.innerHTML = "🎧 Скробблинг";
                    playBtn.onclick = (e) => { e.stopPropagation(); logPlay(key, i.id); };

                    listenerRow.appendChild(statsDiv);
                    listenerRow.appendChild(playBtn);
                    footerContainer.appendChild(listenerRow);
                }

                if (key === 'wishlists') {
                    const buyMoveBtn = document.createElement('button');
                    buyMoveBtn.className = "w-full bg-green-600/20 hover:bg-green-600/40 border border-green-500/30 text-green-300 text-xs py-2 rounded-xl transition-all font-bold mt-1 flex items-center justify-center gap-1.5 active:scale-95";
                    buyMoveBtn.innerHTML = "📥 В коллекцию (Куплено)";
                    buyMoveBtn.onclick = (e) => { e.stopPropagation(); openPurchaseMoveModal(i.id); };
                    footerContainer.appendChild(buyMoveBtn);
                }

                if (i.note) {
                    const notePreview = document.createElement('div');
                    notePreview.className = "text-[11px] text-gray-400 italic bg-white/5 p-2 rounded-xl border border-white/5 line-clamp-2 mt-1 leading-relaxed relative overflow-hidden";
                    notePreview.innerText = `💬 ${i.note}`;
                    footerContainer.appendChild(notePreview);
                }

                card.appendChild(footerContainer);

                const actionsContainer = document.createElement('div');
                actionsContainer.className = "absolute right-3 top-3 flex gap-1 opacity-0 group-hover:opacity-100 transition duration-350 z-20";

                const openNoteBtn = document.createElement('button');
                openNoteBtn.className = "bg-black/80 hover:bg-black p-1.5 rounded-xl text-xs border border-white/10";
                openNoteBtn.title = "Рецензия";
                openNoteBtn.innerText = "💬";
                openNoteBtn.onclick = (e) => { e.stopPropagation(); openNote(key, i.id); };

                const editBtn = document.createElement('button');
                editBtn.className = "bg-black/80 hover:bg-black p-1.5 rounded-xl text-xs border border-white/10";
                editBtn.title = "Редактировать";
                editBtn.innerText = "✏️";
                editBtn.onclick = (e) => { e.stopPropagation(); openModal(key, i.id); };

                const delBtn = document.createElement('button');
                delBtn.className = "bg-red-950/80 hover:bg-red-900 p-1.5 rounded-xl text-red-400 text-xs border border-red-500/25";
                delBtn.title = "Удалить";
                delBtn.innerText = "✕";
                delBtn.onclick = (e) => {
                    e.stopPropagation();
                    data[key] = data[key].filter(x => x.id !== i.id);
                    save();
                };

                // у CD и винила заметки живут на странице релиза (клик по карточке) — там кнопка 💬 не нужна
                if (key !== 'cds' && key !== 'vinyls') actionsContainer.appendChild(openNoteBtn);
                actionsContainer.appendChild(editBtn);
                actionsContainer.appendChild(delBtn);
                card.appendChild(actionsContainer);

                wrap.appendChild(disc);
                wrap.appendChild(card);
                gridEl.appendChild(wrap);
            }
        });
    };

    renderGrid('cds', 'cd-grid');
    renderGrid('vinyls', 'vinyl-grid');
    renderGrid('stuff', 'stuff-grid');
    renderGrid('wishlists', 'wishlist-grid');
    renderGames();
    renderQuickNotes();
    updateQuoteUI();

    const avatar = document.getElementById('main-avatar');
    if(data.avatar) { avatar.src = data.avatar; avatar.classList.remove('hidden'); }

    const stats = {};
    [...data.cds, ...data.vinyls].forEach(item => {
        const artistName = (item.artist || '').trim();
        if (artistName) {
            stats[artistName] = (stats[artistName] || 0) + 1;
        }
    });

    const sortedStats = Object.entries(stats).sort((a, b) => b[1] - a[1]);
    const statsEl = document.getElementById('artist-stats-grid');
    if (statsEl) {
        statsEl.innerHTML = '';
        if (sortedStats.length === 0) {
            statsEl.innerHTML = `<p class="text-gray-500 text-sm italic col-span-full text-center py-4">Укажите исполнителей ваших релизов...</p>`;
        } else {
            sortedStats.forEach(stat => {
                const artist = stat[0];
                const count = stat[1];

                const div = document.createElement('div');
                div.className = "bg-white/5 p-4 rounded-2xl border border-white/5 flex justify-between items-center cursor-pointer hover:border-[var(--theme-btn)] hover:bg-white/10 hover:scale-[1.02] transition-all";
                div.onclick = () => showArtistStats(artist);

                const nameSpan = document.createElement('span');
                nameSpan.className = "font-medium truncate mr-2 text-sm";
                nameSpan.innerText = artist;

                const countSpan = document.createElement('span');
                countSpan.className = "bg-purple-500/20 text-purple-300 text-xs font-bold px-2 py-0.5 rounded-lg shrink-0";
                countSpan.innerText = `${count} рел.`;

                div.appendChild(nameSpan);
                div.appendChild(countSpan);
                statsEl.appendChild(div);
            });
        }
    }

    const sitesGrid = document.getElementById('music-sites-grid');
    if (sitesGrid) {
        sitesGrid.innerHTML = '';
        const sitesList = data.musicSites || [];
        if (sitesList.length === 0) {
            sitesGrid.innerHTML = `<p class="text-gray-500 text-sm italic col-span-full">Добавьте сайты для быстрого перехода...</p>`;
        } else {
            sitesList.forEach(s => {
                const card = document.createElement('div');
                card.className = "glass p-5 rounded-3xl border border-white/5 flex flex-col justify-between hover:border-[var(--theme-btn)] hover:bg-white/10 hover:scale-[1.02] transition-all relative group h-28";

                const link = document.createElement('a');
                link.href = safeUrl(s.url) || '#';
                    link.rel = 'noopener noreferrer';
                link.target = "_blank";
                link.className = "flex items-center gap-4 h-full w-full";

                const emojiSpan = document.createElement('span');
                emojiSpan.className = "text-3xl filter drop-shadow-[0_0_8px_rgba(255,255,255,0.2)] select-none";
                emojiSpan.innerText = s.emoji || '🌐';

                const infoDiv = document.createElement('div');
                infoDiv.className = "truncate";

                const title = document.createElement('h4');
                title.className = "font-black text-white text-base truncate";
                title.innerText = s.name;

                const subtitle = document.createElement('p');
                subtitle.className = "text-[10px] text-gray-500 truncate mt-0.5";
                subtitle.innerText = s.url.replace(/^https?:\/\/(www\.)?/, '');

                infoDiv.appendChild(title);
                infoDiv.appendChild(subtitle);

                link.appendChild(emojiSpan);
                link.appendChild(infoDiv);

                const delBtn = document.createElement('button');
                delBtn.className = "absolute top-4 right-4 bg-red-500/10 text-red-400 p-1.5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/30";
                delBtn.innerText = "✕";
                delBtn.onclick = (event) => { deleteMusicSite(s.id, event); };

                card.appendChild(link);
                card.appendChild(delBtn);
                sitesGrid.appendChild(card);
            });
        }
    }
}

/** Не затираем поле, пока пользователь в нём печатает */
function setFieldValue(id, value) {
    const el = document.getElementById(id);
    if (el && document.activeElement !== el) el.value = value;
}

/* updateUI() можно вызывать сколько угодно раз подряд — перерисовка выполняется один раз за кадр */
let uiRenderQueued = false;
function updateUI() {
    if (uiRenderQueued) return;
    uiRenderQueued = true;
    requestAnimationFrame(() => {
        uiRenderQueued = false;
        renderAll();
    });
}
