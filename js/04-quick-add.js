// Функция быстрого бесшовного добавления (БЕЗ ИИ)
function handleQuickAdd(targetKey) {
    const inputEl = document.getElementById(`quick-add-${targetKey}-input`);
    if (!inputEl) return;
    const rawText = inputEl.value.trim();
    if (!rawText) {
        showToast("Пожалуйста, введите текст для добавления!");
        return;
    }

    // Парсим строку: Исполнитель - Альбом, Цена
    let artist = "";
    let album = "";
    let price = 0;

    // Ищем запятую для цены
    const parts = rawText.split(',');
    if (parts.length > 1) {
        price = parseFloat(parts[parts.length - 1].replace(/[^\d.]/g, '')) || 0;
        // Все что до запятой - исполнитель и альбом
        const musicPart = parts.slice(0, -1).join(',');
        const hyphenIndex = musicPart.indexOf('-');
        if (hyphenIndex > -1) {
            artist = musicPart.substring(0, hyphenIndex).trim();
            album = musicPart.substring(hyphenIndex + 1).trim();
        } else {
            album = musicPart.trim();
        }
    } else {
        // Если запятой нет, пробуем искать просто дефис
        const hyphenIndex = rawText.indexOf('-');
        if (hyphenIndex > -1) {
            artist = rawText.substring(0, hyphenIndex).trim();
            album = rawText.substring(hyphenIndex + 1).trim();
        } else {
            album = rawText.trim();
        }
    }

    if (!album) {
        showToast("Ошибка разбора! Не указано название альбома.");
        return;
    }

    const newItem = {
        id: Date.now(),
        category: 'music',
        title: album,
        artist: artist || 'Неизвестный исполнитель',
        price: price,
        whereBought: 'Быстрое добавление ⚡',
year: '',
        label: '',
        condition: 'NM',
        formatDetails: targetKey === 'cds' ? 'CD диск' : 'Виниловая пластинка',
        size: '',
        style: '',
        brand: '',
        priority: '',
        url: '',
        isGift: false,
        isCustom: false,
        rating: 0,
        playCount: 0,
        lastPlayed: '',
        tags: [],
        img: '',
        imgPos: 'center',
        note: ''
    };

    data[targetKey].push(newItem);
    inputEl.value = "";
    save();
    addXP(25, "Быстрое добавление релиза ⚡");
    showToast(`Успешно добавлено: <strong>${esc(newItem.artist)} - ${esc(newItem.title)}</strong> (${price} ₴)`);
}

// Прямой переключатель приоритетов из карточек в Wishlist
function cyclePriority(id) {
    const item = data.wishlists.find(x => x.id === id);
    if (!item) return;

    const priorities = ["🔥 Высокий", "⚡ Средний", "⏳ Низкий", ""];
    let currentIdx = priorities.indexOf(item.priority || "");
    let nextIdx = (currentIdx + 1) % priorities.length;
    item.priority = priorities[nextIdx];

    save();
    showToast(`Приоритет изменен на: <strong>${item.priority || 'Не указан'}</strong>`);
}

// Фильтрация коллекций по десятилетию при клике на графике статистики
function filterCollectionByDecade(decade) {
    currentFilter = null; // сбрасываем теги
    const decString = decade.toString().substring(0, 3); // "199" для "1990"

    // Задаем строку поиска на обеих вкладках компакт-дисков и винила
    const cdsSearch = document.getElementById('search-cds');
    if (cdsSearch) cdsSearch.value = decString;

    const vinylSearch = document.getElementById('search-vinyls');
    if (vinylSearch) vinylSearch.value = decString;

    showPage('cds'); // Открываем вкладку CD
    showToast(`Показана музыка из эпохи: <strong>${decade}-х</strong> 🕰️`);
}
