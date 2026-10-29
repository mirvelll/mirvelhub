/* =========================================================
   MIRVEL HUB — 53-forms.js (подключается после 52-stuff.js)
   Формы добавления «по месту»:
   • CD / Винил — поле «Категория» скрыто (значение music ставится само);
   • Вещи — выбор ТИПА вещи (Одежда / Мерч / Техника / Другое), без «музыки»;
   • «Исполнитель» показывается только там, где он имеет смысл (музыка и музыкальный мерч);
     у остальных — «Бренд / производитель» (у техники — «Бренд и модель»).
   Данные не меняются: те же поля category / artist / brand. Старые записи читаются как раньше.
   ========================================================= */
(() => {
    'use strict';
    const $ = id => document.getElementById(id);
    const origOpen = window.openModal, origToggle = window.toggleCategoryFields;
    if (typeof origOpen !== 'function' || typeof origToggle !== 'function') return;

    // подписи пунктов в списке: для вещей и общие (для желаемого)
    const STUFF = { clothing: '👕 Одежда', music: '🎵 Мерч (музыкальный)', gear: '🎧 Техника / Аудио', other: '📦 Другое' };
    const BRAND_PH = { clothing: 'Бренд (опционально)', gear: 'Бренд и модель устройства', other: 'Бренд / производитель (опционально)' };
    let mode = '';           // cds | vinyls | stuff | wishlists

    function arrange() {
        const sel = $('item-category'); if (!sel) return;
        const wrap = sel.parentElement, label = wrap && wrap.querySelector('label');
        wrap && wrap.classList.toggle('hidden', mode === 'cds' || mode === 'vinyls');
        if (label) { if (!label.dataset.orig) label.dataset.orig = label.textContent; label.textContent = mode === 'stuff' ? 'Тип вещи' : label.dataset.orig; }
        [...sel.options].forEach(o => {
            if (!o.dataset.orig) o.dataset.orig = o.textContent;
            if (mode === 'stuff') o.textContent = STUFF[o.value] || o.dataset.orig; else o.textContent = o.dataset.orig;
        });
        const h = document.querySelector('#modal h2');
        if (h) { if (!h.dataset.orig) h.dataset.orig = h.textContent; h.textContent = mode === 'stuff' ? 'Редактор вещи' : h.dataset.orig; }
    }

    function apply() {
        const cat = $('item-category') && $('item-category').value;
        if (!cat || cat === 'games') return;                         // «Игры» в желаемом настраивает 45-wishlist-games.js
        const artist = $('item-artist'), brand = $('item-brand'), gearBox = $('gear-fields-container');
        const music = cat === 'music';
        const keepArtist = artist && artist.value.trim() && !music;  // старые данные не прячем
        artist && artist.classList.toggle('hidden', !music && !keepArtist);
        // бренд: у одежды, техники и «другого» (поле лежит в блоке техники)
        if (gearBox && brand) {
            gearBox.classList.toggle('hidden', music);
            brand.placeholder = BRAND_PH[cat] || BRAND_PH.other;
        }
        const aa = $('aa-row'); if (aa) aa.style.display = (music || keepArtist) ? '' : 'none';   // «Фото артиста» — только для музыки
        const t = $('item-title');
        if (t) t.placeholder = music ? (mode === 'stuff' || mode === 'wishlists' ? 'Название мерча / релиза' : 'Название альбома') : 'Название вещи';
        if (artist) artist.placeholder = 'Исполнитель / Артист (опционально)';
    }

    window.toggleCategoryFields = function () {
        const r = origToggle.apply(this, arguments);
        try { apply(); } catch (e) { console.warn('[forms]', e); }
        return r;
    };

    window.openModal = function (type, id) {
        mode = type;
        try { arrange(); } catch (_) {}
        const r = origOpen.apply(this, arguments);
        try {
            const sel = $('item-category');
            if (type === 'stuff' && !id) {
                // новая вещь: тип берём из выбранного чипа на вкладке «Вещи»
                let c = ''; try { c = localStorage.getItem('mirvel_stuff_cat') || ''; } catch (_) {}
                sel.value = STUFF[c] ? c : 'clothing';
            }
            if (type === 'stuff' && id) {
                // техника со старым «Исполнителем» → показываем в «Бренде»
                const it = (data.stuff || []).find(x => x.id === parseInt(id));
                if (it && it.category === 'gear' && it.artist && !it.brand) { $('item-brand').value = it.artist; $('item-artist').value = ''; }
            }
            if ((type === 'cds' || type === 'vinyls') && !id) sel.value = 'music';
            window.toggleCategoryFields();
        } catch (e) { console.warn('[forms]', e); }
        return r;
    };
})();
