const ACHIEVEMENTS_LIST = [
    {
        id: 'cd_collector',
        title: 'CD-Магнат',
        icon: '💿',
        isTiered: true,
        getVal: d => d.cds?.length || 0,
        tiers: [
            { req: 3, label: 'Lvl 1', xp: 50, desc: 'Собрать 3 CD диска в коллекции' },
            { req: 7, label: 'Lvl 2', xp: 100, desc: 'Собрать 7 CD дисков в коллекции' },
            { req: 15, label: 'Lvl 3', xp: 200, desc: 'Собрать 15 CD дисков в коллекции' },
            { req: 30, label: 'Lvl 4', xp: 350, desc: 'Собрать 30 CD дисков в коллекции' }
        ]
    },
    {
        id: 'vinyl_collector',
        title: 'Виниловый Эстет',
        icon: '💽',
        isTiered: true,
        getVal: d => d.vinyls?.length || 0,
        tiers: [
            { req: 2, label: 'Lvl 1', xp: 50, desc: 'Собрать 2 виниловые пластинки' },
            { req: 5, label: 'Lvl 2', xp: 120, desc: 'Собрать 5 виниловых пластинок' },
            { req: 10, label: 'Lvl 3', xp: 220, desc: 'Собрать 10 виниловых пластинок' },
            { req: 20, label: 'Lvl 4', xp: 380, desc: 'Собрать 20 виниловых пластинок' }
        ]
    },
    {
        id: 'stuff_collector',
        title: 'Ценитель Вещей',
        icon: '📦',
        isTiered: true,
        getVal: d => d.stuff?.length || 0,
        tiers: [
            { req: 1, label: 'Lvl 1', xp: 40, desc: 'Собрать 1 предмет мерча или техники' },
            { req: 4, label: 'Lvl 2', xp: 100, desc: 'Собрать 4 предмета мерча или девайсов' },
            { req: 10, label: 'Lvl 3', xp: 200, desc: 'Собрать 10 предметов мерча в коллекции' }
        ]
    },
    {
        id: 'rich_collector',
        title: 'Драгоценный Стек',
        icon: '💎',
        isTiered: true,
        getVal: d => ((d.cds?.reduce((s, i) => s + i.price, 0) || 0) + (d.vinyls?.reduce((s, i) => s + i.price, 0) || 0) + (d.stuff?.reduce((s, i) => s + i.price, 0) || 0)),
        tiers: [
            { req: 1500, label: 'Lvl 1', xp: 50, desc: 'Общая стоимость коллекции превышает 1 500 ₴' },
            { req: 5000, label: 'Lvl 2', xp: 150, desc: 'Общая стоимость коллекции превышает 5 000 ₴' },
            { req: 12000, label: 'Lvl 3', xp: 300, desc: 'Общая стоимость коллекции превышает 12 000 ₴' }
        ]
    },
    {
        id: 'music_listener',
        title: 'Аудиофил-Практик',
        icon: '🎧',
        isTiered: true,
        getVal: d => [...(d.cds || []), ...(d.vinyls || [])].reduce((acc, i) => acc + (i.playCount || 0), 0),
        tiers: [
            { req: 5, label: 'Lvl 1', xp: 40, desc: 'Запустить проигрывание релиза 5 раз' },
            { req: 20, label: 'Lvl 2', xp: 100, desc: 'Запустить проигрывание релиза 20 раз' },
            { req: 50, label: 'Lvl 3', xp: 250, desc: 'Запустить проигрывание релиза 50 раз' }
        ]
    },
    {
        id: 'merch_lord',
        title: 'Властелин Мерча',
        icon: '👕',
        isTiered: true,
        getVal: d => (d.stuff || []).filter(i => i.category === 'clothing').length,
        tiers: [
            { req: 1, label: 'Lvl 1', xp: 40, desc: 'Добавить 1 предмет одежды или музыкального мерча' },
            { req: 3, label: 'Lvl 2', xp: 80, desc: 'Собрать 3 предмета одежды или музыкального мерча' },
            { req: 6, label: 'Lvl 3', xp: 150, desc: 'Собрать 6 предметов одежды или музыкального мерча' }
        ]
    },
    { id: 'first_item', title: 'Первая игла / Луч', desc: 'Добавьте ваш первый музыкальный релиз в коллекцию (CD или Винил)', icon: '⭐', xp: 50, cond: d => ((d.cds?.length || 0) + (d.vinyls?.length || 0)) >= 1 },
    { id: 'goal_completed', title: 'Целеустремлённый', desc: 'Отметьте хотя бы одну выполненную коллекционную цель (CD или Винил)', icon: '🎯', xp: 100, cond: d => (d.goals || []).some(g => g.hasCd || g.hasVinyl) },
    { id: 'theme_customizer', title: 'Стиляга', desc: 'Переключите стандартную цветовую тему хаба на любую другую', icon: '🎨', xp: 30, cond: d => !!d.selectedTheme },
    { id: 'custom_cd', title: 'Особый ценитель', desc: 'Добавьте в хаб хотя бы один кастомный CD диск ✨', icon: '✨', xp: 75, cond: d => (d.cds || []).some(c => c.isCustom) },
    { id: 'free_music', title: 'Сладкая халява', desc: 'Добавьте бесплатный релиз (0 ₴) или подарок в коллекцию', icon: '🎈', xp: 50, cond: d => [...(d.cds || []), ...(d.vinyls || [])].some(i => (i.price === 0 && !i.priceUnknown && !i.priceBundle) || i.isGift) },
    { id: 'super_wish', title: 'Элитное желание', desc: 'Добавьте в Wishlist вещь стоимостью 5000 ₴ или выше', icon: '💸', xp: 100, cond: d => (d.wishlists || []).some(i => i.price >= 5000) },
    { id: 'decade_hopper', title: 'Эпоха за эпохой', desc: 'Собрать релизы как минимум из 3 разных десятилетий (например, 80-е, 90-е, 00-е)', icon: '🕰️', xp: 80, cond: d => {
        const decades = new Set();
        [...(d.cds || []), ...(d.vinyls || [])].forEach(i => {
            const y = parseInt(i.year);
            if (y && y > 1900 && y < 2100) decades.add(Math.floor(y / 10) * 10);
        });
        return decades.size >= 3;
    }},
    { id: 'rating_critic', title: 'Строгий критик', desc: 'Поставить оценку 5 звёзд как минимум 5 вашим релизам', icon: '🌟', xp: 60, cond: d => [...(d.cds || []), ...(d.vinyls || [])].filter(i => (i.rating || 0) === 5).length >= 5 },
    { id: 'budget_master', title: 'Инвестор в хобби', desc: 'Настроить планировщик бюджета в Wishlist на сумму более 5000 ₴', icon: '📈', xp: 40, cond: d => (d.hobbyBudget || 0) > 5000 },
    { id: 'social_collector', title: 'Цифровой меломан', desc: 'Добавить ссылки на маркетплейсы/источники (URL) как минимум к 3 релизам или желаниям', icon: '🌐', xp: 50, cond: d => [...(d.cds || []), ...(d.vinyls || []), ...(d.stuff || []), ...(d.wishlists || [])].filter(i => (i.url || '').trim().length > 0).length >= 3 },
    { id: 'high_fidelity', title: 'Hi-Fi Аудиофил', desc: 'Добавить хотя бы одно устройство в категорию аудиотехники/девайсов (gear)', icon: '🔌', xp: 60, cond: d => (d.stuff || []).some(i => i.category === 'gear') }
];

const defaultSites = [
    { id: 1, name: 'Discogs', url: 'https://www.discogs.com', emoji: '💿' },
    { id: 2, name: 'Bandcamp', url: 'https://www.bandcamp.com', emoji: '🎸' },
    { id: 3, name: 'eBay', url: 'https://www.ebay.com', emoji: '📦' },
    { id: 4, name: 'MusicStack', url: 'https://www.musicstack.com', emoji: '🛒' }
];
if (!data.musicSites || data.musicSites.length === 0) {
    data.musicSites = [...defaultSites];
}

function playUnlockSound() {
    try {
        const ctx = getAudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.connect(gain);
        gain.connect(ctx.destination);

        const now = ctx.currentTime;
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.setValueAtTime(659.25, now + 0.08);
        osc.frequency.setValueAtTime(783.99, now + 0.16);
        osc.frequency.setValueAtTime(1046.50, now + 0.24);

        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

        osc.start(now);
        osc.stop(now + 0.5);
    } catch (e) { console.error('AudioContext error:', e); }
}

function playLevelUpSound() {
    try {
        const ctx = getAudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.connect(gain);
        gain.connect(ctx.destination);

        const now = ctx.currentTime;
        osc.frequency.setValueAtTime(261.63, now);
        osc.frequency.setValueAtTime(329.63, now + 0.1);
        osc.frequency.setValueAtTime(392.00, now + 0.2);
        osc.frequency.setValueAtTime(523.25, now + 0.3);
        osc.frequency.setValueAtTime(659.25, now + 0.4);
        osc.frequency.setValueAtTime(783.99, now + 0.5);
        osc.frequency.setValueAtTime(1046.50, now + 0.6);

        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

        osc.start(now);
        osc.stop(now + 1.2);
    } catch (e) { console.error(e); }
}

function getTotalAchievementsCount() {
    let count = 0;
    ACHIEVEMENTS_LIST.forEach(ach => {
        if (ach.isTiered) {
            count += ach.tiers.length;
        } else {
            count += 1;
        }
    });
    return count;
}

function getValidAchievementIDs() {
    const valid = new Set();
    ACHIEVEMENTS_LIST.forEach(ach => {
        if (ach.isTiered) {
            ach.tiers.forEach((tier, idx) => {
                valid.add(`${ach.id}_${idx}`);
            });
        } else {
            valid.add(ach.id);
        }
    });
    return valid;
}

function sanitizeUnlockedAchievements() {
    if (!data.unlockedAchievements) data.unlockedAchievements = [];
    const valid = getValidAchievementIDs();
    // Отбрасываем ID, которых нет в текущей версии Achievements List
    data.unlockedAchievements = data.unlockedAchievements.filter(id => valid.has(id));
    // Исключаем дубликаты
    data.unlockedAchievements = [...new Set(data.unlockedAchievements)];
}

/* ---------- Награды за действия (единая таблица: аудит считает ровно то, что начисляется) ---------- */
const XP_RULES = {
    ITEM: 25,            // новый CD / винил / вещь (форма, быстрое добавление, массовый ввод)
    WISH_PURCHASE: 150,  // покупка из «Желаемого» (вместо награды за новый предмет)
    PLAY: 10,            // прослушивание релиза
    GAME_FINISHED: 100   // игра пройдена (один раз на игру)
};
const FROM_WISH_MARK = 'Перенос из Желаемого'; // так подписывались покупки до появления флага fromWish

/** Пересчёт опыта «с нуля» по текущим данным хаба. Возвращает итог и разбивку по источникам. */
function computeAuditedXP() {
    const unlocked = new Set(data.unlockedAchievements || []);
    let achievements = 0;
    ACHIEVEMENTS_LIST.forEach(ach => {
        if (ach.isTiered) ach.tiers.forEach((tier, idx) => { if (unlocked.has(`${ach.id}_${idx}`)) achievements += tier.xp; });
        else if (unlocked.has(ach.id)) achievements += ach.xp;
    });

    const music = [...(data.cds || []), ...(data.vinyls || [])];
    const plays = music.reduce((n, i) => n + (Number(i.playCount) || 0), 0) * XP_RULES.PLAY;

    let items = 0;
    [...music, ...(data.stuff || [])].forEach(i => {
        items += (i.fromWish || i.whereBought === FROM_WISH_MARK) ? XP_RULES.WISH_PURCHASE : XP_RULES.ITEM;
    });

    const games = (data.games || []).filter(g => g.xpFinished || g.status === 'completed').length * XP_RULES.GAME_FINISHED;

    return { total: achievements + plays + items + games, achievements, plays, items, games };
}

window.auditAndSyncXP = () => {
    const oldXP = Number(data.xp) || 0;
    const oldAch = (data.unlockedAchievements || []).length;

    // 1. чистим устаревшие ID и открываем всё, что уже выполнено (в том числе достижения из раздела «Игры»)
    sanitizeUnlockedAchievements();
    checkAchievements();
    sanitizeUnlockedAchievements();
    const newAch = data.unlockedAchievements.length - oldAch;

    // 2. пересчитываем опыт по уже актуальному списку достижений
    const r = computeAuditedXP();
    data.xp = r.total;

    // 3. сохраняем напрямую (save() снова запускал бы проверку достижений поверх уже посчитанного)
    persistData();
    updateUI();

    const lvl = Math.floor(r.total / 500) + 1;
    const diff = r.total - oldXP;
    const diffText = diff === 0 ? 'без изменений' : `${diff > 0 ? '+' : ''}${diff} XP`;
    showToast(`🔄 Синхронизировано: <strong>${r.total} XP</strong> (${diffText}), уровень <strong>${lvl}</strong>` +
        (newAch > 0 ? `<br>🏆 Открыто достижений: <strong>${newAch}</strong>` : ''));
};

function addXP(amount, reason) {
    if (!amount || amount <= 0) return;
    const oldLvl = Math.floor((data.xp || 0) / 500) + 1;
    data.xp = (data.xp || 0) + amount;
    const newLvl = Math.floor(data.xp / 500) + 1;

    if (newLvl > oldLvl) {
        playLevelUpSound();
        showToast(`🎉 <strong>УРОВЕНЬ ПОВЫШЕН!</strong> Теперь вы на <strong>${newLvl} уровне</strong>! 🚀`);
    } else if (reason) {
        showToast(`✨ Получено <strong>+${amount} XP</strong> (${reason})`);
    }
    save();
}

let isCheckingAchievements = false;
function checkAchievements() {
    if (isCheckingAchievements) return;
    isCheckingAchievements = true;

    // Очищаем и нормализуем массив до пересчета
    sanitizeUnlockedAchievements();

    ACHIEVEMENTS_LIST.forEach(ach => {
        if (ach.isTiered) {
            const currentVal = ach.getVal(data);
            ach.tiers.forEach((tier, idx) => {
                const tierId = `${ach.id}_${idx}`;
                const isAlreadyUnlocked = data.unlockedAchievements.includes(tierId);
                if (!isAlreadyUnlocked && currentVal >= tier.req) {
                    data.unlockedAchievements.push(tierId);
                    playUnlockSound();
                    data.xp = (data.xp || 0) + tier.xp;
                    showToast(`🏆 Достигнут уровень ${idx + 1} в "${ach.title}" (+${tier.xp} XP)!`);
                }
            });
        } else {
            const isAlreadyUnlocked = data.unlockedAchievements.includes(ach.id);
            if (!isAlreadyUnlocked && ach.cond(data)) {
                data.unlockedAchievements.push(ach.id);
                playUnlockSound();
                data.xp = (data.xp || 0) + ach.xp;
                showToast(`🏆 Открыто достижение: "${ach.title}" (+${ach.xp} XP)!`);
            }
        }
    });

    // Повторная санация для стабильности сохранения
    sanitizeUnlockedAchievements();
    isCheckingAchievements = false;
}
