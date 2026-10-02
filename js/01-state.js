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
