// Категории «Желаемого» (общий список: фильтр, бюджет, карточки). 'music' — диски, остальное — вещи.
const WISH_CATS = [
    { id: 'cd', ico: '💿', name: 'CD', hex: '#a855f7' },
    { id: 'vinyl', ico: '💽', name: 'Винил', hex: '#6366f1' },
    { id: 'merch', ico: '🎤', name: 'Мерч', hex: '#ec4899' },
    { id: 'clothing', ico: '👕', name: 'Одежда', hex: '#14b8a6' },
    { id: 'gear', ico: '🔌', name: 'Техника', hex: '#f59e0b' },
    { id: 'collectible', ico: '🗿', name: 'Коллекционки', hex: '#38bdf8' },
    { id: 'event', ico: '🎟', name: 'Концерты', hex: '#84cc16' },
    { id: 'book', ico: '📚', name: 'Книги', hex: '#fb923c' },
    { id: 'other', ico: '🎁', name: 'Другое', hex: '#94a3b8' }
];
const WISH_CAT_IDS = WISH_CATS.map(c => c.id);
// «Музыка» в желаемом разделена на CD и Винил. Старое значение 'music' (или пусто) определяем так: в формате написано «винил» или цена ≥ 1000 ₴ → винил, иначе CD.
const WISH_VINYL_FROM = 1000;
function wishCat(i) {
    const c = i && i.category;
    if (c && c !== 'music') return c;
    return /винил|vinyl/i.test(String((i && i.formatDetails) || '')) || (Number(i && i.price) || 0) >= WISH_VINYL_FROM ? 'vinyl' : 'cd';
}
// Приоритет покупки (поле priority — строка как раньше; старые значения продолжают работать, пустое = «без приоритета»)
const WISH_PRIOS = [
    { v: '🚨 Очень нужно', ico: '🚨', short: 'Очень нужно', hex: '#ef4444' },
    { v: '🔥 Высокий', ico: '🔥', short: 'Высокий', hex: '#f97316' },
    { v: '⚡ Средний', ico: '⚡', short: 'Средний', hex: '#eab308' },
    { v: '⏳ Низкий', ico: '⏳', short: 'Низкий', hex: '#38bdf8' },
    { v: '🤷 Не обязательно', ico: '🤷', short: 'Не обязательно', hex: '#94a3b8' }
];
function wishPrioRank(i) { const k = WISH_PRIOS.findIndex(p => p.v === (i && i.priority)); return k < 0 ? WISH_PRIOS.length : k; }
const isMusCat = c => c === 'music' || c === 'cd' || c === 'vinyl';
const defaultQuotes = [
    { id: 1, author: "Kurt Cobain", textOriginal: "Wanting to be someone else is a waste of the person you are.", textTranslation: "Желание быть кем-то другим — это растрата того, кто ты есть.", song: "" },
    { id: 2, author: "Lana Del Rey", textOriginal: "Live fast. Die young. Be wild. And have fun.", textTranslation: "Живи быстро. Умри молодым. Будь диким. И веселись.", song: "Ride" },
    { id: 3, author: "Tyler, The Creator", textOriginal: "I'm a step-by-step person.", textTranslation: "Я человек, который идет шаг за шагом.", song: "" },
    { id: 4, author: "Eminem", textOriginal: "You only get one shot, do not miss your chance to blow.", textTranslation: "У тебя есть только один шанс, не упусти возможность заявить о себе.", song: "Lose Yourself" },
    { id: 5, author: "Kanye West", textOriginal: "My greatest pain in life is that I will never be able to see myself perform live.", textTranslation: "Моя самая большая боль в жизни заключается в том, что я никогда не смогу увидеть свое собственное живое выступление.", song: "" }
];

// Default structures
const defaults = {
    cds: [],
    vinyls: [],
    games: [],
    stuff: [],
    wishlists: [],
    availableTags: [],
    name: 'Коллекционер',
    description: '',
    favoriteArtists: '',
    xp: 0,
    avatar: '',
    bannerImg: '',
    favArtist: {name:'', url:'', img:''},
    favAlbum: {name:'', url:'', img:''},
    quickNotes: [],
    selectedTheme: '',
    musicSites: [],
    unlockedAchievements: [],
    achievementDates: {},
    quotes: defaultQuotes,
    quoteLanguage: 'ru',
    currentQuoteId: 1,
    cozyAtmosphereMode: 'vinyl',
    hobbyBudget: 2500,
    sortMode: {
        cds: 'title',
        vinyls: 'title',
        stuff: 'title',
        wishlists: 'priority'
    },
    viewMode: {
        cds: 'grid',
        vinyls: 'grid'
    },
    gameViewMode: 'grid'
};

let data = { ...structuredClone(defaults), ...loadStoredData() };

// Safety Fallbacks
if (!data.stuff) data.stuff = [];
if (!Array.isArray(data.games)) data.games = [];
if (!data.sortMode) data.sortMode = { ...defaults.sortMode };
if (!data.viewMode) data.viewMode = { ...defaults.viewMode };
if (!data.gameViewMode) data.gameViewMode = 'grid';
if (!data.hobbyBudget) data.hobbyBudget = 2500;
if (!data.quotes || data.quotes.length === 0) {
    data.quotes = [...defaultQuotes];
    data.currentQuoteId = 1;
}
if (!data.cozyAtmosphereMode) data.cozyAtmosphereMode = 'vinyl';

// Принудительное очищение от исторических дублей в массиве достижений при запуске
if (data.unlockedAchievements) {
    data.unlockedAchievements = [...new Set(data.unlockedAchievements)];
} else {
    data.unlockedAchievements = [];
}

let tempTags = [];
let currentFilter = null;
let editingNoteId = null;

let audioCtx = null;
let isSoundPlaying = false;
let cozyNodes = [];
