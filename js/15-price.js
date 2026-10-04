/* =========================================================
   MIRVEL HUB — 15-price.js (подключать после 14-listen.js)
   «Примерная цена», «Не помню / в наборе» и (только у игр) «Бесплатно» в формах добавления
   Флаги у позиции: priceApprox, priceUnknown, priceFree
   ========================================================= */
(() => {
    const $ = id => document.getElementById(id);

    /* Блок с двумя галочками под полем цены */
    function injectControls(priceId, key, withFree = false, withPs = false) {
        const input = $(priceId);
        if (!input) return;
        const box = document.createElement('div');
        box.className = 'price-flags';
        box.innerHTML = `
            <label><input type="checkbox" id="${key}-approx" class="accent-purple-500"> ≈ Цена примерная</label>
            <label><input type="checkbox" id="${key}-unknown" class="accent-purple-500"> Не помню / в наборе</label>
            ${withFree ? `<label><input type="checkbox" id="${key}-free" class="accent-purple-500"> 🎁 Бесплатно / подарок</label>` : ''}
            ${withPs ? `<label id="${key}-psplus-wrap" class="hidden"><input type="checkbox" id="${key}-psplus" class="accent-purple-500"> ➕ PS Plus (игра из подписки)</label>` : ''}`;
        // под строкой с полями цены (если поле лежит в сетке — после неё)
        const anchor = input.parentElement.tagName === 'DIV' && input.parentElement.children.length > 1
            ? input.parentElement : input;
        anchor.insertAdjacentElement('afterend', box);

        const approx = $(`${key}-approx`), unknown = $(`${key}-unknown`), free = $(`${key}-free`), ps = $(`${key}-psplus`);
        if (ps) {
            ps.addEventListener('change', () => {
                if (ps.checked) { unknown.checked = false; approx.checked = false; if (free) free.checked = false; }
                syncUnknown(priceId, key);
            });
            // «PS Plus» показываем только для PlayStation (название платформы обновляет renderPicker в 16-games.js)
            const gm = $('game-modal');
            if (gm) new MutationObserver(() => syncPs(key)).observe(gm, { childList: true, characterData: true, subtree: true });
        }
        unknown.addEventListener('change', () => { if (unknown.checked) { if (free) free.checked = false; if (ps) ps.checked = false; } syncUnknown(priceId, key); });
        approx.addEventListener('change', () => {
            if (approx.checked) { unknown.checked = false; if (free) free.checked = false; if (ps) ps.checked = false; }
            syncUnknown(priceId, key);
        });
        if (free) free.addEventListener('change', () => {
            if (free.checked) { unknown.checked = false; approx.checked = false; if (ps) ps.checked = false; }
            syncUnknown(priceId, key);
        });
    }

    function syncUnknown(priceId, key) {
        const unknown = $(`${key}-unknown`), approx = $(`${key}-approx`), free = $(`${key}-free`), input = $(priceId);
        const isFree = !!free?.checked, isPs = !!$(`${key}-psplus`)?.checked;
        if (unknown.checked || isFree || isPs) { approx.checked = false; input.value = ''; }
        input.disabled = unknown.checked || isFree || isPs;
        input.placeholder = isPs ? 'PS Plus' : isFree ? 'Бесплатно' : unknown.checked ? 'Цена неизвестна' : (input.dataset.ph || input.placeholder);
    }

    const isPsPlatform = () => /playstation|^ps\d?\b|\bpsp\b|vita/i.test(($('game-platform')?.value || ''));
    function syncPs(key) {
        const wrap = $(`${key}-psplus-wrap`), ps = $(`${key}-psplus`);
        if (!wrap) return;
        const show = isPsPlatform();
        wrap.classList.toggle('hidden', !show);
        if (!show && ps.checked) { ps.checked = false; syncUnknown('game-price', key); }
    }

    function setFlags(priceId, key, item) {
        const input = $(priceId);
        if (!input.dataset.ph) input.dataset.ph = input.placeholder;
        $(`${key}-approx`).checked = !!item?.priceApprox;
        $(`${key}-unknown`).checked = !!item?.priceUnknown;
        if ($(`${key}-free`)) $(`${key}-free`).checked = !!item?.priceFree;
        if ($(`${key}-psplus`)) $(`${key}-psplus`).checked = !!item?.psPlus;
        syncUnknown(priceId, key);
        syncPs(key);
    }

    const readFlags = key => {
        const flags = {
            priceApprox: $(`${key}-approx`).checked,
            priceUnknown: $(`${key}-unknown`).checked
        };
        if ($(`${key}-free`)) flags.priceFree = $(`${key}-free`).checked;
        if ($(`${key}-psplus`)) flags.psPlus = $(`${key}-psplus`).checked && isPsPlatform();
        return flags;
    };

    function applyFlags(item, flags) {
        item.priceApprox = flags.priceApprox;
        item.priceUnknown = flags.priceUnknown;
        if ('priceFree' in flags) item.priceFree = flags.priceFree;
        if ('psPlus' in flags) item.psPlus = flags.psPlus;
        if (item.psPlus) { item.priceFree = false; item.priceUnknown = false; item.priceApprox = false; }
        if (item.priceUnknown || item.priceFree || item.psPlus) item.price = 0;
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
    injectControls('game-price', 'pf-game', true, true);

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
