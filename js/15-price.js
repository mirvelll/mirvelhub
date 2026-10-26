/* =========================================================
   MIRVEL HUB — 15-price.js (подключать после 14-listen.js)
   Пометки цены в формах добавления:
     • у всех: «Цена примерная», «Не помню», «В наборе»
     • только у игр: «Бесплатно», «Подарок», «Семья», «Активировано кодом», «PS Plus»
   Флаги у позиции: priceApprox, priceUnknown, priceBundle, priceFree, priceGift, priceFamily, priceCode, psPlus
   Любая из пометок (кроме «примерной») обнуляет цену; пометки исключают друг друга.
   ========================================================= */
(() => {
    const $ = id => document.getElementById(id);

    /* вид → [поле у позиции, подпись галочки, подсказка в поле цены] */
    const KIND = {
        unknown: ['priceUnknown', 'Не помню', 'Цена неизвестна'],
        bundle:  ['priceBundle',  'В наборе', 'В наборе'],
        free:    ['priceFree',    '🆓 Бесплатно', 'Бесплатно'],
        gift:    ['priceGift',    '🎁 Подарок', 'Подарок'],
        code:    ['priceCode',    '🔑 Активировано кодом', 'Активировано кодом'],
        family:  ['priceFamily',  '👨‍👩‍👧 Семья (Family Sharing / аккаунт друга)', 'Семья'],
        psplus:  ['psPlus',       '➕ PS Plus (игра из подписки)', 'PS Plus']
    };
    const FORMS = {};                              // key -> { priceId, kinds }

    const isPsPlatform = () => /playstation|^ps\d?\b|\bpsp\b|vita/i.test(($('game-platform')?.value || ''));
    const kindBox = (key, k) => $(`${key}-${k}`);

    /* Блок с галочками под полем цены */
    function injectControls(priceId, key, kinds) {
        const input = $(priceId);
        if (!input) return;
        FORMS[key] = { priceId, kinds };
        const box = document.createElement('div');
        box.className = 'price-flags';
        box.id = `${key}-flags`;
        box.innerHTML = `<label><input type="checkbox" id="${key}-approx" class="accent-purple-500"> ≈ Цена примерная</label>` +
            kinds.map(k => {
                const cb = `<input type="checkbox" id="${key}-${k}" class="accent-purple-500"> ${KIND[k][1]}`;
                return k === 'psplus' ? `<label id="${key}-psplus-wrap" class="hidden">${cb}</label>` : `<label>${cb}</label>`;
            }).join('');
        // под строкой с полями цены (если поле лежит в сетке — после неё)
        const anchor = input.parentElement.tagName === 'DIV' && input.parentElement.children.length > 1
            ? input.parentElement : input;
        anchor.insertAdjacentElement('afterend', box);

        const approx = $(`${key}-approx`);
        kinds.forEach(k => kindBox(key, k).addEventListener('change', () => {
            if (kindBox(key, k).checked) {
                kinds.forEach(o => { if (o !== k) kindBox(key, o).checked = false; });
                approx.checked = false;
            }
            sync(key);
        }));
        approx.addEventListener('change', () => {
            if (approx.checked) kinds.forEach(k => { kindBox(key, k).checked = false; });
            sync(key);
        });
        if (kinds.includes('psplus')) {
            // «PS Plus» показываем только для PlayStation (название платформы обновляет renderPicker в 16-games.js)
            const gm = $('game-modal');
            if (gm) new MutationObserver(() => syncPs(key)).observe(gm, { childList: true, characterData: true, subtree: true });
        }
    }

    /* Выбрана любая пометка → поле цены очищается и блокируется */
    function sync(key) {
        const { priceId, kinds } = FORMS[key];
        const input = $(priceId), approx = $(`${key}-approx`);
        const active = kinds.find(k => kindBox(key, k).checked);
        if (active) { approx.checked = false; input.value = ''; }
        input.disabled = !!active;
        input.placeholder = active ? KIND[active][2] : (input.dataset.ph || input.placeholder);
    }

    function syncPs(key) {
        const wrap = $(`${key}-psplus-wrap`), ps = kindBox(key, 'psplus');
        if (!wrap) return;
        const show = isPsPlatform();
        wrap.classList.toggle('hidden', !show);
        if (!show && ps.checked) { ps.checked = false; sync(key); }
    }

    function setFlags(key, item) {
        const { priceId, kinds } = FORMS[key];
        const input = $(priceId);
        if (!input.dataset.ph) input.dataset.ph = input.placeholder;
        $(`${key}-approx`).checked = !!item?.priceApprox;
        kinds.forEach(k => { kindBox(key, k).checked = !!item?.[KIND[k][0]]; });
        sync(key);
        syncPs(key);
    }

    const readFlags = key => {
        const flags = { priceApprox: $(`${key}-approx`).checked };
        FORMS[key].kinds.forEach(k => {
            const on = kindBox(key, k).checked;
            flags[KIND[k][0]] = k === 'psplus' ? on && isPsPlatform() : on;
        });
        return flags;
    };

    function applyFlags(item, flags) {
        Object.assign(item, flags);
        const any = Object.keys(KIND).some(k => item[KIND[k][0]]);
        if (any) { item.priceApprox = false; item.price = 0; }
        // пометки, которых нет в этой форме (например «Бесплатно» из быстрого добавления), снимаются, если задали обычную цену
        Object.keys(KIND).forEach(k => {
            const prop = KIND[k][0];
            if (!(prop in flags) && item[prop] && Number(item.price) > 0) delete item[prop];
        });
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
    injectControls('item-price', 'pf-item', ['unknown', 'bundle']);
    injectControls('game-price', 'pf-game', ['unknown', 'bundle', 'free', 'gift', 'family', 'code', 'psplus']);

    /* I: у самодельного CD цена по умолчанию не показывается (кнопка «Указать цену») */
    let priceOpen = false;
    const priceBtn = document.createElement('button');
    priceBtn.type = 'button'; priceBtn.id = 'item-price-show'; priceBtn.className = 'hidden w-full text-left p-3.5 rounded-xl border border-dashed border-white/15 text-gray-400 text-sm hover:text-white hover:border-white/30';
    priceBtn.textContent = '＋ Указать цену (необязательно)';
    $('item-price').insertAdjacentElement('afterend', priceBtn);
    function syncCustomPrice() {
        const cb = $('item-custom-cd'), inp = $('item-price'), flags = $('pf-item-flags'), wrap = $('custom-cd-container');
        if (!cb || !inp) return;
        const custom = cb.checked && wrap && !wrap.classList.contains('hidden');
        const flagOn = ['unknown', 'bundle'].some(k => kindBox('pf-item', k)?.checked);
        const hide = custom && !priceOpen && !(Number(inp.value) > 0) && !flagOn;
        inp.classList.toggle('hidden', hide);
        if (flags) flags.classList.toggle('hidden', hide);
        priceBtn.classList.toggle('hidden', !hide);
    }
    priceBtn.addEventListener('click', () => { priceOpen = true; syncCustomPrice(); $('item-price').focus(); });
    $('item-custom-cd')?.addEventListener('change', () => { priceOpen = false; syncCustomPrice(); });

    const openBase = window.openModal;
    window.openModal = (type, id = null) => {
        openBase(type, id);
        const item = id ? (data[type] || []).find(x => x.id === parseInt(id)) : null;
        setFlags('pf-item', item);
        priceOpen = false;
        syncCustomPrice();
    };

    /* I: клик по «самодельный» → вводим цену прямо на месте, дальше она считается как обычная */
    document.addEventListener('click', async e => {
        const el = e.target.closest && e.target.closest('[data-custom-price]');
        if (!el) return;
        e.preventDefault(); e.stopPropagation();
        const [list, rawId] = String(el.dataset.customPrice || '').split(':');
        const item = (data[list] || []).find(x => x.id === Number(rawId));
        if (!item) return;
        const v = await mhPrompt('Сколько стоил этот диск? Цена будет учитываться как обычная.', { title: 'Цена самодельного диска', placeholder: 'например 150', okText: 'Сохранить', maxLength: 9 });
        if (v === null || String(v).trim() === '') return;
        const n = parseFloat(String(v).replace(',', '.'));
        if (!(n > 0)) { try { showToast('Нужно число больше нуля', 'error'); } catch (_) {} return; }
        item.price = n;
        persistData(); updateUI();
        if (el.isConnected) { el.textContent = fmtPrice(item); el.removeAttribute('data-custom-price'); el.classList.remove('custom-price-hint'); el.removeAttribute('title'); }
    }, true);

    const openGameBase = window.openGameModal;
    window.openGameModal = (id = null) => {
        openGameBase(id);
        const item = id ? (data.games || []).find(x => x.id === Number(id)) : null;
        setFlags('pf-game', item);
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
