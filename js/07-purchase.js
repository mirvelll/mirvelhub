window.openPurchaseMoveModal = (id) => {
    const item = data.wishlists.find(w => w.id === id);
    if (!item) return;

    document.getElementById('buy-confirm-id').value = id;
    document.getElementById('buy-confirm-price').value = item.price || 0;
    document.getElementById('buy-confirm-where').value = item.whereBought || '';

    const selectEl = document.getElementById('buy-confirm-format');
    if (item.category === 'clothing' || item.category === 'gear' || item.category === 'other') {
        selectEl.value = 'stuff';
    } else if (item.formatDetails?.toLowerCase().includes('винил')) {
        selectEl.value = 'vinyls';
    } else {
        selectEl.value = 'cds';
    }

    document.getElementById('buy-confirm-modal').classList.remove('hidden');
};

window.confirmPurchaseMove = () => {
    const id = parseInt(document.getElementById('buy-confirm-id').value);
    const targetFormat = document.getElementById('buy-confirm-format').value;
    const price = parseFloat(document.getElementById('buy-confirm-price').value) || 0;
    const where = document.getElementById('buy-confirm-where').value.trim();

    const idx = data.wishlists.findIndex(w => w.id === id);
    if (idx === -1) return;

    const wishItem = data.wishlists[idx];

    data.wishlists.splice(idx, 1);

    const newItem = {
        id: Date.now(),
        category: wishItem.category || 'music',
        title: wishItem.title,
        artist: wishItem.artist || '',
        price: price,
        whereBought: where || 'Перенос из Желаемого',
year: wishItem.year || '',
        label: wishItem.label || '',
        condition: wishItem.condition || 'NM',
        formatDetails: wishItem.formatDetails || (targetFormat === 'vinyls' ? 'Черный винил' : 'Standart CD'),
        size: wishItem.size || '',
        style: wishItem.style || '',
        brand: wishItem.brand || '',
        priority: '',
        url: '',
        fromWish: true,
        isGift: wishItem.isGift || false,
        isCustom: wishItem.isCustom || false,
        rating: wishItem.rating || 0,
        playCount: 0,
        lastPlayed: '',
        tags: wishItem.tags || [],
        img: wishItem.img || '',
        imgPos: 'center',
        note: wishItem.note || ''
    };

    data[targetFormat].push(newItem);

    closeModal('buy-confirm-modal');
    addXP(150, "покупка из желаемого 📥");
};
