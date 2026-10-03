/* =========================================================
   MIRVEL HUB — 15-price.js (подключать после 14-listen.js)
   «Примерная цена», «Не помню / в наборе» и (только у игр) «Бесплатно» в формах добавления
   Флаги у позиции: priceApprox, priceUnknown, priceFree
   ========================================================= */
(() => {
    const $ = id => document.getElementById(id);

    /* Блок с двумя галочками под полем цены */
    function injectControls(priceId, key, withFree = false) {
        const input = $(priceId);
        if (!input) return;
        const box = document.createElement('div');
        box.className = 'price-flags';
        box.innerHTML = `
            <label><input type="checkbox" id="${key}-approx" class="accent-purple-500"> ≈ Цена примерная</label>
            <label><input type="checkbox" id="${key}-unknown" class="accent-purple-500"> Не помню / в наборе</label>
            ${withFree ? `<label><input type="checkbox" id="${key}-free" class="accent-purple-500"> 🎁 Бесплатно / подарок</label>` : ''}`;
        // под строкой с полями цены (если поле лежит в сетке — после неё)
        const anchor = input.parentElement.tagName === 'DIV' && input.parentElement.children.length > 1
            ? input.parentElement : input;
        anchor.insertAdjacentElement('afterend', box);

        const approx = $(`${key}-approx`), unknown = $(`${key}-unknown`), free = $(`${key}-free`);
        unknown.addEventListener('change', () => { if (unknown.checked && free) free.checked = false; syncUnknown(priceId, key); });
        approx.addEventListener('change', () => {
            if (approx.checked) { unknown.checked = false; if (free) free.checked = false; }
            syncUnknown(priceId, key);
        });
        if (free) free.addEventListener('change', () => {
            if (free.checked) { unknown.checked = false; approx.checked = false; }
            syncUnknown(priceId, key);
        });
    }

    function syncUnknown(priceId, key) {
        const unknown = $(`${key}-unknown`), approx = $(`${key}-approx`), free = $(`${key}-free`), input = $(priceId);
        const isFree = !!free?.checked;
        if (unknown.checked || isFree) { approx.checked = false; input.value = ''; }
        input.disabled = unknown.checked || isFree;
        input.placeholder = isFree ? 'Бесплатно' : unknown.checked ? 'Цена неизвестна' : (input.dataset.ph || input.placeholder);
    }

    function setFlags(priceId, key, item) {
        const input = $(priceId);
        if (!input.dataset.ph) input.dataset.ph = input.placeholder;
        $(`${key}-approx`).checked = !!item?.priceApprox;
        $(`${key}-unknown`).checked = !!item?.priceUnknown;
        if ($(`${key}-free`)) $(`${key}-free`).checked = !!item?.priceFree;
        syncUnknown(priceId, key);
    }

    const readFlags = key => {
        const flags = {
            priceApprox: $(`${key}-approx`).checked,
            priceUnknown: $(`${key}-unknown`).checked
        };
        if ($(`${key}-free`)) flags.priceFree = $(`${key}-free`).checked;
        return flags;
    };

    function applyFlags(item, flags) {
        item.priceApprox = flags.priceApprox;
        item.priceUnknown = flags.priceUnknown;
        if ('priceFree' in flags) item.priceFree = flags.priceFree;
        if (item.priceUnknown || item.priceFree) item.price = 0;
    }

    /* Пока базовое сохранение работает, проверку достижений откладываем:
       иначе позиция с ценой 0 успеет засчитаться как «бесплатная» до выставления флага */
    const checkBase = checkAchievements;
    let holdAchievements = false;
    checkAchievements = function () { if (!holdAchievements) checkBase(); };

    function wrapSave(name, { getList, getEditId, modalId, key }) {
        const base = window[name];
        window[name] = async (...args) => {
            const list = getList();
            const editId = getEditId();
            const before = new Set((data[list] || []).map(x => x.id));
            const flags = readFlags(key);
            holdAchievements = true;
            try { await base(...args); } finally { holdAchievements = false; }
            const item = editId
                ? (data[list] || []).find(x => x.id === editId)
                : (data[list] || []).find(x => !before.has(x.id));
            // форма осталась открытой — сохранение не прошло (например, нет названия)
            if (!item || !$(modalId).classList.contains('hidden')) return;
            applyFlags(item, flags);
            checkAchievements();
            persistData();
            updateUI();
        };
    }

    /* ---------- Подключение ---------- */
    injectControls('item-price', 'pf-item');
    injectControls('game-price', 'pf-game', true);

    const openBase = window.openModal;
    window.openModal = (type, id = null) => {
        openBase(type, id);
        const item = id ? (data[type] || []).find(x => x.id === parseInt(id)) : null;
        setFlags('item-price', 'pf-item', item);
    };

    const openGameBase = window.openGameModal;
    window.openGameModal = (id = null) => {
        openGameBase(id);
        const item = id ? (data.games || []).find(x => x.id === Number(id)) : null;
        setFlags('game-price', 'pf-game', item);
    };

    wrapSave('saveItem', {
        getList: () => $('edit-type').value,
        getEditId: () => parseInt($('edit-id').value) || null,
        modalId: 'modal',
        key: 'pf-item'
    });
    wrapSave('saveGameItem', {
        getList: () => 'games',
        getEditId: () => Number($('game-edit-id').value) || null,
        modalId: 'game-modal',
        key: 'pf-game'
    });

    updateUI();
})();
