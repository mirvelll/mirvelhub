let crateItems = [];
let crateCurrentIndex = 0;
let isCrateCardFlipped = false;

function openCrateDigger() {
    crateItems = [...data.cds, ...data.vinyls];
    if (crateItems.length === 0) {
        showToast("В вашей коллекции пока нет компакт-дисков или пластинок!");
        return;
    }
    crateCurrentIndex = 0;
    isCrateCardFlipped = false;
    document.getElementById('crate-modal').classList.remove('hidden');
    renderCrateCards();
    updateCrateDetails();
}

function closeCrateDigger() {
    document.getElementById('crate-modal').classList.add('hidden');
}

function renderCrateCards() {
    const container = document.getElementById('crate-cards-container');
    container.innerHTML = '';

    const maxVisible = 5;
    for (let i = 0; i < maxVisible; i++) {
        const itemIndex = (crateCurrentIndex + i) % crateItems.length;
        const item = crateItems[itemIndex];
        if (!item) continue;

        const card = document.createElement('div');
        card.className = "crate-card absolute w-64 h-64 rounded-3xl overflow-hidden glass shadow-2xl border border-white/10 flex flex-col justify-center items-center p-2 cursor-pointer";

        const offset = i;
        const scale = 1 - (offset * 0.06);
        const translateY = -offset * 12;
        const translateZ = -offset * 40;
        const rotateX = -offset * 2;
        const opacity = 1 - (offset * 0.2);

        card.style.transform = `translate3d(0, ${translateY}px, ${translateZ}px) rotateX(${rotateX}deg) scale(${scale})`;
        card.style.opacity = opacity;
        card.style.zIndex = 100 - offset;

        const inner = document.createElement('div');
        inner.className = "w-full h-full relative transition-transform duration-500 ease-out preserve-3d";
        inner.style.transformStyle = "preserve-3d";

        if (i === 0 && isCrateCardFlipped) {
            inner.style.transform = "rotateY(180deg)";
        }

        const front = document.createElement('div');
        front.className = "absolute inset-0 w-full h-full rounded-2xl overflow-hidden backface-hidden bg-black/50";
        front.style.backfaceVisibility = "hidden";
        if (item.img) {
            front.innerHTML = `<img src="${esc(item.img)}" class="w-full h-full object-cover rounded-2xl">`;
        } else {
            front.innerHTML = `
                <div class="w-full h-full bg-gradient-to-tr from-purple-900/30 to-cyan-900/20 flex flex-col items-center justify-center text-center p-4">
                    <span class="text-4xl mb-2">${crateItems[crateCurrentIndex] === item && data.cds.includes(item) ? '💿' : '💽'}</span>
                    <span class="text-xs text-gray-400 font-bold truncate w-full">${esc(item.artist || 'Разные')}</span>
                    <span class="text-sm font-black text-white w-full leading-tight mt-1 line-clamp-2">${esc(item.title)}</span>
                </div>
            `;
        }

        const back = document.createElement('div');
        back.className = "absolute inset-0 w-full h-full rounded-2xl glass border border-white/10 p-5 flex flex-col justify-between backface-hidden bg-[#0d0d14]";
        back.style.backfaceVisibility = "hidden";
        back.style.transform = "rotateY(180deg)";

        const stars = "⭐".repeat(item.rating || 0);
        back.innerHTML = `
            <div class="space-y-1.5 min-w-0 flex-1 flex flex-col justify-between h-full">
                <div>
                    <p class="text-[9px] uppercase font-bold text-cyan-400 truncate">${esc(item.artist || 'Разные исполнители')}</p>
                    <h4 class="font-black text-sm text-white truncate">${esc(item.title)}</h4>
                    <div class="text-yellow-400 text-xs mt-0.5">${stars || 'Без оценки'}</div>
                </div>
                <div class="text-[10px] text-gray-500 font-medium space-y-0.5 pt-1">
                    ${item.year ? `<div>📅 Год: <span class="text-gray-300 font-bold">${item.year}</span></div>` : ''}
                    ${item.label ? `<div>🏷️ Лейбл: <span class="text-gray-300 font-bold">${esc(item.label)}</span></div>` : ''}
                    ${item.condition ? `<div>🎨 Состояние: <span class="text-cyan-400 font-bold">${esc(item.condition)}</span></div>` : ''}
                    ${item.whereBought ? `<div>🏪 Куплено: <span class="text-purple-300 font-bold">${item.whereBought}</span></div>` : ''}
                </div>
                <p class="text-[11px] text-gray-400 italic line-clamp-3 mt-1 border-t border-white/5 pt-1 leading-relaxed">
                    ${item.note ? `💬 ${esc(item.note)}` : 'Нет рецензии.'}
                </p>
            </div>
        `;

        inner.appendChild(front);
        inner.appendChild(back);
        card.appendChild(inner);

        if (i === 0) {
            card.onclick = () => flipCrateCard();
        }

        container.appendChild(card);
    }
}

function updateCrateDetails() {
    const item = crateItems[crateCurrentIndex];
    if (!item) return;

    const labelEl = document.getElementById('crate-item-details');
    labelEl.innerHTML = `
        <h3 class="text-2xl font-black text-white truncate">${esc(item.title)}</h3>
        <p class="text-purple-400 font-bold tracking-wide italic text-sm truncate">${esc(item.artist || 'Разные исполнители')}</p>
        <div class="flex justify-center gap-2 mt-2">
            <span class="text-xs px-2.5 py-1 rounded-full bg-white/5 border border-white/5 text-gray-300">
                ${data.cds.includes(item) ? '💿 CD' : '💽 Винил'}
            </span>
            ${item.condition ? `
                <span class="text-xs px-2.5 py-1 rounded-full bg-cyan-900/20 border border-cyan-500/20 text-cyan-300 font-bold">
                    Состояние: ${esc(item.condition)}
                </span>
            ` : ''}
        </div>
    `;

    document.getElementById('crate-index-tracker').innerText = `${crateCurrentIndex + 1} / ${crateItems.length}`;
}

function shiftCrate(direction) {
    isCrateCardFlipped = false;
    crateCurrentIndex = (crateCurrentIndex + direction + crateItems.length) % crateItems.length;
    renderCrateCards();
    updateCrateDetails();
}

function flipCrateCard() {
    isCrateCardFlipped = !isCrateCardFlipped;
    renderCrateCards();
}

window.addEventListener('keydown', (e) => {
    const modal = document.getElementById('crate-modal');
    if (modal && !modal.classList.contains('hidden')) {
        if (e.key === 'ArrowRight') {
            shiftCrate(1);
        } else if (e.key === 'ArrowLeft') {
            shiftCrate(-1);
        } else if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault();
            flipCrateCard();
        }
    }
});
