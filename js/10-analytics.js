function renderAnalyticsTab() {
    const totalCdsPrice = (data.cds || []).reduce((s, i) => s + i.price, 0);
    const totalVinylsPrice = (data.vinyls || []).reduce((s, i) => s + i.price, 0);
    const totalStuffPrice = (data.stuff || []).reduce((s, i) => s + i.price, 0);

    const categoriesCost = {
        music: totalCdsPrice + totalVinylsPrice,
        clothing: (data.stuff || []).filter(i => i.category === 'clothing').reduce((s, i) => s + i.price, 0),
        gear: (data.stuff || []).filter(i => i.category === 'gear').reduce((s, i) => s + i.price, 0),
        other: (data.stuff || []).filter(i => i.category === 'other').reduce((s, i) => s + i.price, 0),
    };

    const maxBudget = Math.max(...Object.values(categoriesCost), 1);
    const categoriesHTML = [
        { id: 'music', name: '💿 Музыкальная полка', cost: categoriesCost.music, barColor: 'from-purple-500 to-indigo-500' },
        { id: 'clothing', name: '👕 Коллекция Одежды & Мерча', cost: categoriesCost.clothing, barColor: 'from-teal-500 to-emerald-500' },
        { id: 'gear', name: '🔌 Аудиотехника & Девайсы', cost: categoriesCost.gear, barColor: 'from-amber-500 to-orange-500' },
        { id: 'other', name: '🎁 Другие предметы коллекции', cost: categoriesCost.other, barColor: 'from-pink-500 to-rose-500' }
    ].map(cat => {
        const pct = Math.round((cat.cost / maxBudget) * 100);
        return `
            <div class="space-y-1.5">
                <div class="flex justify-between items-center text-xs">
                    <span class="text-gray-300 font-medium">${cat.name}</span>
                    <span class="font-bold font-mono text-white">${cat.cost} ₴</span>
                </div>
                <div class="w-full bg-white/5 h-3 rounded-full overflow-hidden p-0.5 border border-white/5">
                    <div class="bg-gradient-to-r ${cat.barColor} h-full rounded-full transition-all duration-700" style="width: ${pct}%"></div>
                </div>
            </div>
        `;
    }).join('');

    const catContainer = document.getElementById('analytics-categories');
    if (catContainer) catContainer.innerHTML = categoriesHTML;

    const totalMusicCount = (data.cds?.length || 0) + (data.vinyls?.length || 0);
    const cdPct = totalMusicCount > 0 ? Math.round((data.cds?.length || 0) / totalMusicCount * 100) : 0;
    const vinylPct = totalMusicCount > 0 ? Math.round((data.vinyls?.length || 0) / totalMusicCount * 100) : 0;

    const totalMusEl = document.getElementById('analytics-total-music');
    if (totalMusEl) totalMusEl.innerText = totalMusicCount;
    const cdPctEl = document.getElementById('analytics-cd-pct');
    if (cdPctEl) cdPctEl.innerText = `${cdPct}% (${data.cds?.length || 0} шт.)`;
    const vinylPctEl = document.getElementById('analytics-vinyl-pct');
    if (vinylPctEl) vinylPctEl.innerText = `${vinylPct}% (${data.vinyls?.length || 0} шт.)`;

    // Улучшенные показатели ширины/веса полок
    const totalCds = data.cds?.length || 0;
    const totalVinyls = data.vinyls?.length || 0;
    const shelfWidth = (totalCds * 1.0) + (totalVinyls * 0.4); // CD ~ 1см, винил ~ 0.4см
    const totalWeight = (totalCds * 0.1) + (totalVinyls * 0.23); // CD ~ 100г, винил ~ 230г

    document.getElementById('shelf-width-est').innerText = `${shelfWidth.toFixed(1)} см`;
    document.getElementById('shelf-weight-est').innerText = `${totalWeight.toFixed(1)} кг`;

    // Анализ десятилетий выхода релизов
    const decades = {};
    [...(data.cds || []), ...(data.vinyls || [])].forEach(i => {
        const year = parseInt(i.year);
        if (year && year > 1900 && year < 2100) {
            const decade = Math.floor(year / 10) * 10;
            decades[decade] = (decades[decade] || 0) + 1;
        }
    });

    const maxDecadeCount = Math.max(...Object.values(decades), 1);
    const sortedDecades = Object.keys(decades).sort();
    const decadesChartContainer = document.getElementById('analytics-decades-chart');
    if (decadesChartContainer) {
        if (sortedDecades.length === 0) {
            decadesChartContainer.innerHTML = `<p class="text-gray-500 text-xs italic w-full text-center py-10">Добавьте года релизов в коллекцию для построения графика...</p>`;
        } else {
            decadesChartContainer.innerHTML = sortedDecades.map(dec => {
                const val = decades[dec];
                const pctHeight = Math.max(10, Math.round((val / maxDecadeCount) * 100));
                return `
                    <div class="flex-grow flex flex-col items-center group relative h-full justify-end cursor-pointer" onclick="filterCollectionByDecade(${dec})">
                        <span class="absolute -top-6 text-[10px] font-bold text-cyan-400 opacity-0 group-hover:opacity-100 transition duration-300">${val} шт.</span>
                        <div class="w-8 bg-gradient-to-t from-purple-600 to-cyan-400 rounded-t-lg transition-all duration-1000 group-hover:brightness-125" style="height: ${pctHeight}%"></div>
                        <span class="text-[10px] text-gray-400 mt-2 font-bold font-mono group-hover:text-white">${dec.toString().substring(2)}s</span>
                    </div>
                `;
            }).join('');
        }
    }

    const allAcquisitions = [...(data.cds || []), ...(data.vinyls || []), ...(data.stuff || [])];
    const topExpensive = [...allAcquisitions].sort((a, b) => b.price - a.price).slice(0, 5);

    const expensiveContainer = document.getElementById('analytics-top-expensive');
    if (expensiveContainer) {
        expensiveContainer.innerHTML = topExpensive.map((item, idx) => `
            <div class="flex justify-between items-center bg-white/5 p-3 rounded-2xl border border-white/5 text-xs">
                <div class="flex items-center gap-3 truncate">
                    <span class="font-bold text-yellow-500 font-mono w-4">${idx + 1}.</span>
                    <div class="truncate">
                        <p class="font-bold text-white truncate">${esc(item.title)}</p>
                        <p class="text-gray-400 text-[10px] truncate">${esc(item.artist || 'Мерч / Девайс')}</p>
                    </div>
                </div>
                <span class="text-cyan-400 font-black font-mono ml-2 shrink-0">${fmtPrice(item)}</span>
            </div>
        `).join('') || `<p class="text-gray-500 text-xs italic py-4">Нет приобретенных предметов</p>`;
    }

    const topPlayed = [...(data.cds || []), ...(data.vinyls || [])]
        .filter(i => (i.playCount || 0) > 0)
        .sort((a, b) => b.playCount - a.playCount)
        .slice(0, 5);

    const playedContainer = document.getElementById('analytics-top-played');
    if (playedContainer) {
        playedContainer.innerHTML = topPlayed.map((item, idx) => `
            <div class="flex justify-between items-center bg-white/5 p-3 rounded-2xl border border-white/5 text-xs">
                <div class="flex items-center gap-3 truncate">
                    <span class="font-bold text-purple-400 font-mono w-4">${idx + 1}.</span>
                    <div class="truncate">
                        <p class="font-bold text-white truncate">${esc(item.title)}</p>
                        <p class="text-gray-400 text-[10px] truncate">${esc(item.artist || 'Вещь / Одежда')}</p>
                    </div>
                </div>
                <div class="text-right ml-2 shrink-0">
                    <span class="bg-purple-500/10 text-purple-300 font-bold px-2 py-1 rounded-lg font-mono">${item.playCount} 🎧</span>
                </div>
            </div>
        `).join('') || `<p class="text-gray-500 text-xs italic py-4">Статистика активности пуста.</p>`;
    }
}
