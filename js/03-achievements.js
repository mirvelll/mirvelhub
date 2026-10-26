/* =========================================================
   MIRVEL HUB — 03-achievements.js  (v2)
   Достижения: обычные и многоуровневые, категории, редкость, секретные,
   «Платина хаба», всплывающие карточки при получении (как в Steam / PlayStation).
   Как добавить своё достижение: см. ACHIEVEMENTS_LIST ниже.
     • обычное:        { id, title, desc, icon, xp, cond: d => bool, prog?: d => [текущее, цель] }
     • многоуровневое: { id, title, icon, isTiered: true, getVal: d => число, tiers: [{ req, xp, desc }] }
     • секретное:      добавить secret: true (+ hint — подсказка)
   Категорию задаёт ACH_CAT ниже (по умолчанию «Хаб»).
   ========================================================= */

/** Мелкие помощники для условий достижений (чтобы условие и прогресс считались одинаково). */
const AchHelpers = {
    music: d => [...(d.cds || []), ...(d.vinyls || [])],
    artistSet(d) {
        const s = new Set();
        AchHelpers.music(d).forEach(i => {
            const a = String(i.artist || '').trim().toLowerCase();
            if (a && a !== 'неизвестный исполнитель') s.add(a);
        });
        return s;
    },
    topArtistCount(d) {
        const m = new Map();
        AchHelpers.music(d).forEach(i => {
            const a = String(i.artist || '').trim().toLowerCase();
            if (a && a !== 'неизвестный исполнитель') m.set(a, (m.get(a) || 0) + 1);
        });
        return m.size ? Math.max(...m.values()) : 0;
    },
    tagged: d => [...(d.cds || []), ...(d.vinyls || []), ...(d.stuff || []), ...(d.wishlists || [])]
        .filter(i => Array.isArray(i.tags) && i.tags.length > 0).length,
    stuffCats: d => new Set((d.stuff || []).map(i => i.category).filter(c => ['clothing', 'gear', 'other'].includes(c))).size,
    ownQuotes: d => (d.quotes || []).filter(q => !(typeof defaultQuotes !== 'undefined' && defaultQuotes.some(x => x.id === q.id))).length,
    decades(d) {
        const s = new Set();
        AchHelpers.music(d).forEach(i => { const y = parseInt(i.year); if (y > 1900 && y < 2100) s.add(Math.floor(y / 10) * 10); });
        return s.size;
    }
};

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
        getVal: d => [...(d.cds || []), ...(d.vinyls || []), ...(d.stuff || [])].reduce((s, i) => s + (Number(i.price) || 0), 0),
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
    { id: 'dream_come_true', title: 'Мечта сбылась', desc: 'Купить предмет из списка «Желаемое» (кнопка покупки в Wishlist)', icon: '🎯', xp: 100, cond: d => [...(d.cds || []), ...(d.vinyls || []), ...(d.stuff || [])].some(i => i.fromWish || i.whereBought === FROM_WISH_MARK) },
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
    { id: 'high_fidelity', title: 'Hi-Fi Аудиофил', desc: 'Добавить хотя бы одно устройство в категорию аудиотехники/девайсов (gear)', icon: '🔌', xp: 60, cond: d => (d.stuff || []).some(i => i.category === 'gear') },

    /* ================= НОВЫЕ ДОСТИЖЕНИЯ (v2) ================= */
    // ---- Музыка ----
    { id: 'both_formats', title: 'Два формата', desc: 'Иметь в коллекции хотя бы 1 CD и 1 виниловую пластинку', icon: '🔀', xp: 40,
      prog: d => [Math.min(1, (d.cds || []).length) + Math.min(1, (d.vinyls || []).length), 2],
      cond: d => (d.cds || []).length >= 1 && (d.vinyls || []).length >= 1 },
    { id: 'artist_fan', title: 'Преданный фанат', desc: 'Собрать 5 релизов одного исполнителя', icon: '🎤', xp: 70,
      prog: d => [AchHelpers.topArtistCount(d), 5], cond: d => AchHelpers.topArtistCount(d) >= 5 },
    { id: 'diverse_artists', title: 'Всеядный слушатель', desc: 'Собрать релизы 10 разных исполнителей', icon: '🌍', xp: 70,
      prog: d => [AchHelpers.artistSet(d).size, 10], cond: d => AchHelpers.artistSet(d).size >= 10 },
    { id: 'rare_vintage', title: 'Старая школа', desc: 'Добавить релиз, выпущенный до 1980 года', icon: '📻', xp: 60,
      cond: d => AchHelpers.music(d).some(i => { const y = parseInt(i.year); return y > 1900 && y < 1980; }) },
    { id: 'gift_receiver', title: 'Подарок судьбы', desc: 'Получить 3 релиза в подарок (отметка «Подарок» в карточке)', icon: '🎁', xp: 50,
      prog: d => [AchHelpers.music(d).filter(i => i.isGift).length, 3], cond: d => AchHelpers.music(d).filter(i => i.isGift).length >= 3 },
    { id: 'tag_master', title: 'Мастер тегов', desc: 'Проставить теги минимум у 5 предметов', icon: '🏷️', xp: 40,
      prog: d => [AchHelpers.tagged(d), 5], cond: d => AchHelpers.tagged(d) >= 5 },
    { id: 'top_lot', title: 'Королевский лот', desc: 'Иметь в коллекции релиз стоимостью от 3 000 ₴', icon: '👑', xp: 80,
      cond: d => AchHelpers.music(d).some(i => (Number(i.price) || 0) >= 3000) },
    { id: 'worn_record', title: 'Заезженная пластинка', desc: 'Поставить релизу 5★ и прослушать его 10 раз', icon: '🔥', xp: 90, secret: true,
      hint: 'Любимый релиз заслуживает много прослушиваний…',
      cond: d => AchHelpers.music(d).some(i => (i.rating || 0) === 5 && (i.playCount || 0) >= 10) },

    // ---- Коллекция ----
    { id: 'archive_keeper', title: 'Хранитель Архива', icon: '🗄️', isTiered: true,
      getVal: d => (d.cds || []).length + (d.vinyls || []).length + (d.stuff || []).length + (d.games || []).length,
      tiers: [
        { req: 10, label: 'Lvl 1', xp: 40, desc: 'Собрать 10 предметов в хабе (музыка, вещи и игры вместе)' },
        { req: 25, label: 'Lvl 2', xp: 80, desc: 'Собрать 25 предметов в хабе (музыка, вещи и игры вместе)' },
        { req: 50, label: 'Lvl 3', xp: 150, desc: 'Собрать 50 предметов в хабе (музыка, вещи и игры вместе)' },
        { req: 100, label: 'Lvl 4', xp: 260, desc: 'Собрать 100 предметов в хабе (музыка, вещи и игры вместе)' },
        { req: 250, label: 'Lvl 5', xp: 450, desc: 'Собрать 250 предметов в хабе (музыка, вещи и игры вместе)' }
      ] },
    { id: 'wish_dreamer', title: 'Мечтатель', icon: '🌠', isTiered: true, getVal: d => (d.wishlists || []).length,
      tiers: [
        { req: 3, label: 'Lvl 1', xp: 30, desc: 'Добавить 3 вещи в «Желаемое»' },
        { req: 10, label: 'Lvl 2', xp: 70, desc: 'Добавить 10 вещей в «Желаемое»' },
        { req: 25, label: 'Lvl 3', xp: 140, desc: 'Добавить 25 вещей в «Желаемое»' }
      ] },
    { id: 'stuff_variety', title: 'Всего понемногу', desc: 'Иметь вещи во всех трёх категориях: мерч, техника и «другое»', icon: '🧩', xp: 60,
      prog: d => [AchHelpers.stuffCats(d), 3], cond: d => AchHelpers.stuffCats(d) >= 3 },
    { id: 'note_keeper', title: 'Блокнот коллекционера', icon: '📝', isTiered: true, getVal: d => (d.quickNotes || []).length,
      tiers: [
        { req: 1, label: 'Lvl 1', xp: 20, desc: 'Создать первую быструю заметку' },
        { req: 5, label: 'Lvl 2', xp: 50, desc: 'Создать 5 быстрых заметок' },
        { req: 15, label: 'Lvl 3', xp: 100, desc: 'Создать 15 быстрых заметок' }
      ] },
    { id: 'quote_collector', title: 'Цитатник', desc: 'Добавить 3 собственные цитаты', icon: '💬', xp: 40,
      prog: d => [AchHelpers.ownQuotes(d), 3], cond: d => AchHelpers.ownQuotes(d) >= 3 },

    // ---- Игры ----
    { id: 'hours_played', title: 'Часы за экраном', icon: '⏱️', isTiered: true,
      getVal: d => Math.floor((d.games || []).reduce((s, g) => s + (Number(g.hours) || 0), 0)),
      tiers: [
        { req: 25, label: 'Lvl 1', xp: 40, desc: 'Наиграть 25 часов в играх из коллекции' },
        { req: 100, label: 'Lvl 2', xp: 100, desc: 'Наиграть 100 часов в играх из коллекции' },
        { req: 300, label: 'Lvl 3', xp: 220, desc: 'Наиграть 300 часов в играх из коллекции' },
        { req: 1000, label: 'Lvl 4', xp: 400, desc: 'Наиграть 1000 часов в играх из коллекции' }
      ] },
    { id: 'dlc_collector', title: 'Охотник за DLC', icon: '🧩', isTiered: true,
      getVal: d => (d.games || []).reduce((s, g) => s + (Array.isArray(g.dlcs) ? g.dlcs.filter(x => x && x.owned).length : 0), 0),
      tiers: [
        { req: 1, label: 'Lvl 1', xp: 40, desc: 'Иметь 1 дополнение (DLC) к играм' },
        { req: 5, label: 'Lvl 2', xp: 100, desc: 'Иметь 5 дополнений (DLC) к играм' },
        { req: 15, label: 'Lvl 3', xp: 220, desc: 'Иметь 15 дополнений (DLC) к играм' }
      ] },
    { id: 'digital_native', title: 'Цифровой житель', desc: 'Иметь 5 цифровых игр', icon: '☁️', xp: 40,
      prog: d => [(d.games || []).filter(g => g.digital).length, 5], cond: d => (d.games || []).filter(g => g.digital).length >= 5 },
    { id: 'physical_fan', title: 'Любитель дисков', desc: 'Иметь 5 физических игр (диск или картридж)', icon: '📀', xp: 40,
      prog: d => [(d.games || []).filter(g => !g.digital).length, 5], cond: d => (d.games || []).filter(g => !g.digital).length >= 5 },
    { id: 'edition_collector', title: 'Коллекционное издание', desc: 'Иметь 3 игры с особым изданием (поле «Издание»)', icon: '🏆', xp: 60,
      prog: d => [(d.games || []).filter(g => String(g.edition || '').trim()).length, 3], cond: d => (d.games || []).filter(g => String(g.edition || '').trim()).length >= 3 },
    { id: 'game_critic', title: 'Игровой критик', desc: 'Поставить 5★ трём играм', icon: '🧐', xp: 50,
      prog: d => [(d.games || []).filter(g => (g.rating || 0) === 5).length, 3], cond: d => (d.games || []).filter(g => (g.rating || 0) === 5).length >= 3 },
    { id: 'online_player', title: 'Онлайн-боец', desc: 'Отметить игру как имеющую онлайн-режим', icon: '🛰️', xp: 30,
      cond: d => (d.games || []).some(g => g.hasOnline || g.status === 'online') },
    { id: 'bundle_buyer', title: 'Выгодный набор', desc: 'Добавить набор игр (бандл) с общей ценой', icon: '🛍️', xp: 50,
      cond: d => (d.gameBundles || []).length >= 1 },

    // ---- Хаб ----
    { id: 'level_up', title: 'Прокачка', icon: '⚡', isTiered: true, getVal: d => Math.floor((Number(d.xp) || 0) / 500) + 1,
      tiers: [
        { req: 3, label: 'Lvl 1', xp: 50, desc: 'Достичь 3 уровня коллекционера' },
        { req: 5, label: 'Lvl 2', xp: 100, desc: 'Достичь 5 уровня коллекционера' },
        { req: 10, label: 'Lvl 3', xp: 200, desc: 'Достичь 10 уровня коллекционера' },
        { req: 20, label: 'Lvl 4', xp: 400, desc: 'Достичь 20 уровня коллекционера' }
      ] },
    { id: 'veteran', title: 'Стаж', icon: '📅', isTiered: true,
      getVal: d => d.since ? Math.max(0, Math.floor((Date.now() - Number(d.since)) / 864e5)) : 0,
      tiers: [
        { req: 7, label: 'Lvl 1', xp: 30, desc: 'Пользоваться хабом 7 дней' },
        { req: 30, label: 'Lvl 2', xp: 80, desc: 'Пользоваться хабом 30 дней' },
        { req: 100, label: 'Lvl 3', xp: 160, desc: 'Пользоваться хабом 100 дней' },
        { req: 365, label: 'Lvl 4', xp: 300, desc: 'Пользоваться хабом целый год' }
      ] },
    { id: 'backup_hero', title: 'Страховка', desc: 'Сделать резервную копию (экспорт в .json)', icon: '🛟', xp: 40, cond: d => !!d.lastBackup },
    { id: 'profile_set', title: 'Визитка', desc: 'Указать своё имя и описание в профиле', icon: '🪪', xp: 40,
      cond: d => !!(d.name && d.name !== 'Коллекционер' && String(d.description || '').trim()) },
    { id: 'avatar_set', title: 'Лицо хаба', desc: 'Загрузить аватар и баннер профиля', icon: '🖼️', xp: 50, cond: d => !!(d.avatar && d.bannerImg) },
    { id: 'fav_set', title: 'Любимчики', desc: 'Выбрать любимого исполнителя и любимый альбом', icon: '❤️', xp: 40,
      cond: d => !!((d.favArtist?.name && d.favAlbum?.name) || (d.spotlights || []).length >= 2) },
    { id: 'tier_maker', title: 'Тир-мейкер', desc: 'Создать свой первый тир-лист', icon: '🏅', xp: 60, cond: d => (d.tierLists || []).length >= 1 },

    // ---- Секретные ----
    { id: 'night_owl', title: 'Ночная сова', desc: 'Зайти в хаб глубокой ночью (с 00:00 до 05:00)', icon: '🦉', xp: 50, secret: true,
      hint: 'Некоторые коллекционеры не спят по ночам…', cond: () => new Date().getHours() < 5 },

    // ---- Платина: открывается, когда получено всё остальное ----
    { id: 'platinum_hub', title: 'ПЛАТИНА ХАБА', desc: 'Получить абсолютно все достижения хаба', icon: '💠', xp: 500, meta: 'platinum',
      cond: () => false }

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


/* ---------- Категории, редкость, прогресс ---------- */
const ACH_CATS = [
    { id: 'all', label: 'Все', icon: '🏆' },
    { id: 'music', label: 'Музыка', icon: '🎧' },
    { id: 'collection', label: 'Коллекция', icon: '📦' },
    { id: 'games', label: 'Игры', icon: '🎮' },
    { id: 'hub', label: 'Хаб', icon: '⚙️' },
    { id: 'secret', label: 'Секретные', icon: '🕵️' }
];
const ACH_CAT = {
    music: ['cd_collector', 'vinyl_collector', 'music_listener', 'first_item', 'free_music', 'decade_hopper', 'rating_critic', 'custom_cd',
            'both_formats', 'artist_fan', 'diverse_artists', 'rare_vintage', 'gift_receiver', 'tag_master', 'top_lot'],
    collection: ['stuff_collector', 'rich_collector', 'merch_lord', 'high_fidelity', 'super_wish', 'social_collector',
                 'archive_keeper', 'wish_dreamer', 'stuff_variety', 'dream_come_true'],
    games: ['game_shelf', 'game_finisher', 'trophy_hunter', 'platform_hopper', 'photo_archivist', 'cib_keeper',
            'hours_played', 'dlc_collector', 'digital_native', 'physical_fan', 'edition_collector', 'game_critic', 'online_player', 'bundle_buyer'],
    hub: ['theme_customizer', 'budget_master', 'note_keeper', 'quote_collector', 'level_up', 'veteran', 'backup_hero', 'profile_set', 'avatar_set', 'fav_set', 'tier_maker']
};
const achCatOf = ach => {
    if (ach.meta) return 'platinum';
    if (ach.secret) return 'secret';
    for (const k in ACH_CAT) if (ACH_CAT[k].includes(ach.id)) return k;
    return 'hub';
};
// достижения, которые имеют смысл только при включённом скробблинге (подсчёте прослушиваний)
const ACH_SCROBBLE_ONLY = new Set(['music_listener', 'worn_record']);
const isAchVisible = ach => data.showScrobble || !ACH_SCROBBLE_ONLY.has(ach.id);
const visibleAchievements = () => ACHIEVEMENTS_LIST.filter(isAchVisible);

// прогресс для обычных достижений, у которых он считается (иначе — просто «есть/нет»)
const ACH_PROG = {
    rating_critic: d => [AchHelpers.music(d).filter(i => (i.rating || 0) === 5).length, 5],
    decade_hopper: d => [AchHelpers.decades(d), 3],
    social_collector: d => [[...(d.cds || []), ...(d.vinyls || []), ...(d.stuff || []), ...(d.wishlists || [])].filter(i => (i.url || '').trim().length > 0).length, 3],
    platform_hopper: d => [new Set((d.games || []).map(g => g.platform).filter(Boolean)).size, 4],
    photo_archivist: d => [(d.games || []).reduce((n, g) => n + (Array.isArray(g.photos) ? g.photos.length : 0), 0), 5],
    cib_keeper: d => [(d.games || []).filter(g => !g.digital && g.parts && g.parts.box && g.parts.disc && g.parts.manual).length, 3]
};

const ACH_RARITY = {
    common: 'Обычное', uncommon: 'Необычное', rare: 'Редкое', epic: 'Эпическое', legendary: 'Легендарное', platinum: 'Платина'
};
const achRarityByXp = xp => xp < 50 ? 'common' : xp < 100 ? 'uncommon' : xp < 200 ? 'rare' : xp < 350 ? 'epic' : 'legendary';
const achRarity = ach => ach.meta === 'platinum' ? 'platinum'
    : achRarityByXp(ach.isTiered ? Math.max(...ach.tiers.map(t => t.xp)) : ach.xp);

const achLevel = xp => Math.floor((Number(xp) || 0) / 500) + 1;
const isAchFullyUnlocked = (ach, set) => ach.isTiered ? set.has(`${ach.id}_${ach.tiers.length - 1}`) : set.has(ach.id);

/** Состояние одного достижения для отрисовки: done / progress / locked + числа прогресса. */
function achState(ach, set) {
    const clamp = n => Math.max(0, Math.min(100, n));
    if (ach.meta === 'platinum') {
        const others = visibleAchievements().filter(a => !a.meta);
        const got = others.filter(a => isAchFullyUnlocked(a, set)).length;
        const done = set.has(ach.id);
        return { kind: 'static', done, cur: done ? others.length : got, target: others.length, pct: done ? 100 : clamp(got / Math.max(1, others.length) * 100),
                 state: done ? 'done' : (got > 0 ? 'progress' : 'locked') };
    }
    if (ach.isTiered) {
        const val = Number(ach.getVal(data)) || 0;
        let active = -1;
        ach.tiers.forEach((t, i) => { if (set.has(`${ach.id}_${i}`)) active = i; });
        const maxed = active === ach.tiers.length - 1;
        const next = maxed ? null : ach.tiers[active + 1];
        return { kind: 'tiered', val, active, maxed, next,
                 cur: maxed ? ach.tiers[active].req : val, target: maxed ? ach.tiers[active].req : next.req,
                 pct: maxed ? 100 : clamp(val / next.req * 100),
                 state: maxed ? 'done' : (active >= 0 || val > 0 ? 'progress' : 'locked') };
    }
    const open = set.has(ach.id);
    const pf = ach.prog || ACH_PROG[ach.id];
    let cur = null, target = null, pct = open ? 100 : 0;
    if (pf) {
        try { const r = pf(data); target = r[1]; cur = Math.min(Number(r[0]) || 0, target); if (!open) pct = clamp(cur / target * 100); } catch (_) {}
    }
    return { kind: 'static', done: open, cur, target, pct, state: open ? 'done' : (pct > 0 ? 'progress' : 'locked') };
}

/** Сводка для счётчиков: считаются только видимые достижения (раньше скрытый «Аудиофил-Практик» ломал «38 / 23»). */
function getAchievementStats() {
    const set = new Set(data.unlockedAchievements || []);
    const vis = visibleAchievements();
    let total = 0, count = 0, xpEarned = 0, xpTotal = 0;
    vis.forEach(ach => {
        const tiers = ach.isTiered ? ach.tiers.map((t, i) => ({ id: `${ach.id}_${i}`, xp: t.xp })) : [{ id: ach.id, xp: ach.xp }];
        tiers.forEach(t => { total++; xpTotal += t.xp; if (set.has(t.id)) { count++; xpEarned += t.xp; } });
    });
    return { total, count, xpEarned, xpTotal, percent: total ? Math.min(100, Math.round(count / total * 100)) : 0 };
}

function getTotalAchievementsCount() { return getAchievementStats().total; }

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
    const oldLvl = achLevel(data.xp);
    data.xp = (data.xp || 0) + amount;
    const newLvl = achLevel(data.xp);

    if (newLvl > oldLvl) {
        playLevelUpSound();
        showToast(`🎉 <strong>УРОВЕНЬ ПОВЫШЕН!</strong> Теперь вы на <strong>${newLvl} уровне</strong>! 🚀`);
    } else if (reason) {
        showToast(`✨ Получено <strong>+${amount} XP</strong> (${reason})`);
    }
    save();
}

/* ---------- Проверка и выдача ---------- */
let isCheckingAchievements = false;
function checkAchievements() {
    if (isCheckingAchievements) return;
    isCheckingAchievements = true;
    try {
        sanitizeUnlockedAchievements();
        if (!data.achievementDates || typeof data.achievementDates !== 'object') data.achievementDates = {};
        const unlocked = data.unlockedAchievements;
        const lvlBefore = achLevel(data.xp);
        const fresh = [];

        const grant = (id, ach, xp, title, tierLabel) => {
            unlocked.push(id);
            data.achievementDates[id] = Date.now();
            data.xp = (data.xp || 0) + xp;
            fresh.push({ ach, xp, title, tierLabel, icon: ach.icon, rarity: ach.meta ? 'platinum' : achRarityByXp(xp), platinum: ach.meta === 'platinum' });
        };

        // несколько проходов: награда за один уровень («Прокачка» зависит от XP) может открыть следующий
        for (let pass = 0; pass < 4; pass++) {
            const before = unlocked.length;
            ACHIEVEMENTS_LIST.forEach(ach => {
                if (ach.meta) return;
                try {
                    if (ach.isTiered) {
                        const val = Number(ach.getVal(data)) || 0;
                        ach.tiers.forEach((tier, idx) => {
                            const tid = `${ach.id}_${idx}`;
                            if (!unlocked.includes(tid) && val >= tier.req) grant(tid, ach, tier.xp, ach.title, `${idx + 1} / ${ach.tiers.length}`);
                        });
                    } else if (!unlocked.includes(ach.id) && ach.cond(data)) {
                        grant(ach.id, ach, ach.xp, ach.title, '');
                    }
                } catch (e) { console.warn('[achievements]', ach.id, e); }
            });
            if (unlocked.length === before) break;
        }

        // Платина — когда получено всё остальное (скрытые без скробблинга не требуются)
        const plat = ACHIEVEMENTS_LIST.find(a => a.meta === 'platinum');
        if (plat && !unlocked.includes(plat.id)) {
            const need = visibleAchievements().filter(a => !a.meta);
            const set = new Set(unlocked);
            if (need.length && need.every(a => isAchFullyUnlocked(a, set))) grant(plat.id, plat, plat.xp, plat.title, '');
        }

        if (fresh.length) {
            const normal = fresh.filter(f => !f.platinum);
            const gold = fresh.filter(f => f.platinum);
            playUnlockSound();
            if (normal.length <= 3) normal.forEach(showAchievementPopup);
            else showAchievementPopup({ summary: true, count: normal.length, xp: normal.reduce((s, f) => s + f.xp, 0), icon: '🏆', rarity: 'epic' });
            gold.forEach(showAchievementPopup);
            if (gold.length) setTimeout(playLevelUpSound, 500);
            const lvlAfter = achLevel(data.xp);
            if (lvlAfter > lvlBefore) {
                setTimeout(playLevelUpSound, gold.length ? 1400 : 300);
                showToast(`🎉 <strong>УРОВЕНЬ ПОВЫШЕН!</strong> Теперь вы на <strong>${lvlAfter} уровне</strong>! 🚀`);
            }
            // сохраняем сразу: при запуске приложения проверка идёт без save(), и награды иначе выдавались бы повторно
            try { if (typeof persistData === 'function') persistData(); } catch (_) {}
        }
    } finally {
        sanitizeUnlockedAchievements();
        isCheckingAchievements = false;
    }
}

/* ---------- Всплывающая карточка «Достижение получено» ---------- */
const achPop = { queue: [], busy: false };
function showAchievementPopup(o) {
    achPop.queue.push(o);
    if (!achPop.busy) achPopNext();
}
function achPopNext() {
    const o = achPop.queue.shift();
    if (!o) { achPop.busy = false; return; }
    achPop.busy = true;
    let host = document.getElementById('ach-pop-host');
    if (!host) { host = document.createElement('div'); host.id = 'ach-pop-host'; document.body.appendChild(host); }
    const el = document.createElement('div');
    el.className = `ach-pop rar-${o.rarity || 'common'}${o.platinum ? ' is-platinum' : ''}`;
    el.setAttribute('role', 'status');
    const head = o.platinum ? '💠 Платина получена!' : (o.summary ? '🏆 Новые достижения' : 'Достижение получено');
    const title = o.summary ? `Открыто достижений: ${o.count}` : esc(o.title);
    const sub = o.summary ? '' : (o.tierLabel ? `Уровень ${o.tierLabel}` : ACH_RARITY[o.rarity] || '');
    el.innerHTML = `<div class="ach-pop-medal">${o.icon || '🏆'}</div>
        <div class="ach-pop-body">
            <div class="ach-pop-head">${head}</div>
            <div class="ach-pop-title">${title}</div>
            <div class="ach-pop-sub">${sub ? `<span>${sub}</span>` : ''}<b>+${o.xp} XP</b></div>
        </div>`;
    host.appendChild(el);
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('is-in')));
    let done = false;
    const close = () => {
        if (done) return; done = true;
        el.classList.remove('is-in'); el.classList.add('is-out');
        setTimeout(() => { el.remove(); achPopNext(); }, 380);
    };
    el.addEventListener('click', () => { try { showPage('achievements'); } catch (_) {} close(); });
    setTimeout(close, o.platinum ? 7000 : 4200);
}

/* ---------- Страница «Достижения» ---------- */
window.achUI = window.achUI || { cat: 'all', status: 'all' };
window.setAchFilter = (kind, val) => { window.achUI[kind] = val; renderAchievementsPage(); };

function achDateText(id) {
    const ts = data.achievementDates && data.achievementDates[id];
    if (!ts) return '';
    try { return new Date(ts).toLocaleDateString(window.mirvelLocale ? mirvelLocale() : 'ru-RU', { day: 'numeric', month: 'short', year: 'numeric' }); }
    catch (_) { return ''; }
}

function achCardHTML(ach, set) {
    const st = achState(ach, set);
    const rar = achRarity(ach);
    const secretLocked = ach.secret && !st.done;
    const icon = secretLocked ? '❓' : ach.icon;
    const title = secretLocked ? 'Секретное достижение' : ach.title;

    let desc, xpText, dateId;
    if (st.kind === 'tiered') {
        desc = secretLocked ? '' : (st.maxed ? 'Все уровни этого испытания успешно выполнены!' : `Текущая цель: ${st.next.desc}`);
        xpText = st.maxed ? ach.tiers.reduce((s, t) => s + t.xp, 0) : st.next.xp;
        dateId = st.active >= 0 ? `${ach.id}_${st.active}` : '';
    } else {
        desc = secretLocked ? (ach.hint || 'Условие скрыто. Продолжайте пользоваться хабом…') : ach.desc;
        xpText = ach.xp;
        dateId = ach.id;
    }

    let pips = '';
    if (st.kind === 'tiered') {
        pips = '<div class="ach-pips">' + ach.tiers.map((t, i) => `<i class="${i <= st.active ? 'on' : ''}"></i>`).join('') + '</div>';
    }

    let bar = '';
    if (!secretLocked && (st.kind === 'tiered' || (st.target != null && !st.done))) {
        const txt = st.kind === 'tiered' && st.maxed ? 'Максимум!' : `${st.cur} / ${st.target}`;
        bar = `<div class="ach-prog"><div class="ach-prog-row"><span>Прогресс</span><b>${txt}</b></div><div class="ach-bar"><i style="width:${st.pct}%"></i></div></div>`;
    }

    const badge = st.kind === 'tiered'
        ? (st.maxed ? '<span class="ach-tag is-max">👑 МАКС</span>' : `<span class="ach-tag">${st.active + 1} / ${ach.tiers.length} Ур.</span>`)
        : (st.done ? '<span class="ach-tag is-done">✓ Получено</span>' : '');
    const date = st.state !== 'locked' || st.done ? achDateText(dateId) : '';

    return `<div class="ach-card rar-${rar} is-${st.state}${secretLocked ? ' is-secret' : ''}">
        <div class="ach-medal">${icon}</div>
        <div class="ach-main">
            <div class="ach-top"><h4 class="ach-title">${esc(title)}</h4>${badge}</div>
            ${pips}
            <p class="ach-desc">${esc(desc)}</p>
            ${bar}
            <div class="ach-foot"><span class="ach-rar">${ACH_RARITY[rar]}</span><span class="ach-xp">+${xpText} XP</span>${date ? `<span class="ach-date">${date}</span>` : ''}</div>
        </div>
    </div>`;
}

function renderAchievementsPage() {
    const grid = document.getElementById('achievements-grid');
    if (!grid) return;
    sanitizeUnlockedAchievements();
    const set = new Set(data.unlockedAchievements || []);
    const stats = getAchievementStats();

    const txt = document.getElementById('achievements-progress-text');
    const bar = document.getElementById('achievements-progress-bar');
    if (txt) txt.innerText = `${stats.count} / ${stats.total} (${stats.percent}%)`;
    if (bar) bar.style.width = `${stats.percent}%`;

    const vis = visibleAchievements();
    const items = vis.filter(a => !a.meta).map(a => ({ a, st: achState(a, set), cat: achCatOf(a) }));
    const plat = vis.find(a => a.meta === 'platinum');

    /* --- сводка: платина + «почти у цели» --- */
    const sum = document.getElementById('achievements-summary');
    if (sum) {
        let html = '';
        if (plat) {
            const ps = achState(plat, set);
            html += `<div class="ach-plat ${ps.done ? 'is-done' : ''}">
                <div class="ach-plat-medal">${plat.icon}</div>
                <div class="ach-plat-main">
                    <div class="ach-plat-title">${ps.done ? 'Платина хаба получена!' : 'Платина хаба'}</div>
                    <p>${ps.done ? `Вы открыли абсолютно все достижения. Легенда! ${achDateText(plat.id)}` : 'Откройте все достижения хаба — и получите главный трофей (+500 XP).'}</p>
                    <div class="ach-bar"><i style="width:${ps.pct}%"></i></div>
                    <div class="ach-plat-count">${ps.done ? '100%' : `${ps.cur} / ${ps.target}`}</div>
                </div>
            </div>`;
        }
        const near = items.filter(x => x.st.state === 'progress' && x.st.target != null && x.st.pct >= 40).sort((x, y) => y.st.pct - x.st.pct).slice(0, 3);
        html += `<div class="ach-stats">
            <div class="ach-stat"><b>${stats.xpEarned}</b><span>XP за достижения</span></div>
            <div class="ach-stat"><b>${items.filter(x => x.st.done).length}</b><span>Полностью выполнено</span></div>
            <div class="ach-stat"><b>${items.filter(x => x.st.state === 'progress').length}</b><span>В процессе</span></div>
        </div>`;
        if (near.length) {
            html += `<div class="ach-near"><div class="ach-near-title">🎯 Почти у цели</div>` + near.map(x => {
                const t = x.a.title;
                return `<div class="ach-near-item"><span class="ach-near-ico">${x.a.icon}</span><div><div class="ach-near-name">${esc(t)}</div>
                    <div class="ach-bar"><i style="width:${x.st.pct}%"></i></div></div><b>${x.st.cur} / ${x.st.target}</b></div>`;
            }).join('') + `</div>`;
        }
        sum.innerHTML = html;
    }

    /* --- фильтры --- */
    const flt = document.getElementById('achievements-filters');
    const ui = window.achUI;
    if (flt) {
        const cnt = id => items.filter(x => id === 'all' || x.cat === id).length;
        const catChips = ACH_CATS.map(c => `<button type="button" class="ach-chip${ui.cat === c.id ? ' is-on' : ''}" onclick="setAchFilter('cat','${c.id}')">${c.icon} ${c.label} <em>${cnt(c.id)}</em></button>`).join('');
        const STATUSES = [['all', 'Все'], ['done', 'Получены'], ['progress', 'В процессе'], ['locked', 'Закрыты']];
        const stChips = STATUSES.map(([id, l]) => `<button type="button" class="ach-chip is-sm${ui.status === id ? ' is-on' : ''}" onclick="setAchFilter('status','${id}')">${l}</button>`).join('');
        flt.innerHTML = `<div class="ach-chips">${catChips}</div><div class="ach-chips">${stChips}</div>`;
    }

    /* --- сетка --- */
    const order = ACH_CATS.map(c => c.id);
    const shown = items
        .filter(x => (ui.cat === 'all' || x.cat === ui.cat) && (ui.status === 'all' || x.st.state === ui.status))
        .sort((x, y) => order.indexOf(x.cat) - order.indexOf(y.cat));
    grid.innerHTML = shown.length
        ? shown.map(x => achCardHTML(x.a, set)).join('')
        : '<div class="ach-empty">Здесь пока пусто — попробуйте другой фильтр 🔎</div>';
}
