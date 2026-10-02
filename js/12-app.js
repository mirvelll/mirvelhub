/* =========================================================
   MIRVEL HUB — запуск приложения и новые функции
   (роутинг по #, горячие клавиши, глобальный поиск, хранилище)
   ========================================================= */

/* ---------- Хранилище: индикатор, бэкап, сброс ---------- */
const STORAGE_QUOTA_CHARS = 5 * 1024 * 1024; // ~5 МБ — типичный лимит localStorage

function getStorageUsage() {
    try {
        const used = (localStorage.getItem(STORAGE_KEY) || '').length;
        return { used, percent: Math.min(100, (used / STORAGE_QUOTA_CHARS) * 100) };
    } catch (e) {
        return { used: 0, percent: 0 };
    }
}

function countAllItems() {
    return ['cds', 'vinyls', 'games', 'stuff', 'wishlists'].reduce((n, k) => n + (data[k]?.length || 0), 0);
}

function updateStorageMeter() {
    const bar = document.getElementById('storage-meter-bar');
    const text = document.getElementById('storage-meter-text');
    const backup = document.getElementById('last-backup-text');
    if (!bar || !text) return;

    const { used, percent } = getStorageUsage();
    bar.style.width = `${Math.max(percent, used ? 1.5 : 0)}%`;
    bar.classList.toggle('is-warn', percent > 80);
    text.textContent = `${(used / 1024 / 1024).toFixed(2)} МБ из ~5 МБ (${percent.toFixed(0)}%)`;

    if (backup) {
        backup.textContent = data.lastBackup
            ? `Последний бэкап: ${new Date(data.lastBackup).toLocaleString('ru-RU', { dateStyle: 'medium', timeStyle: 'short' })}`
            : 'Бэкап ещё не делали';
    }
}

// updateStorageMeter() вызывается после каждой перерисовки
const renderAllCore = renderAll;
renderAll = function () {
    renderAllCore();
    updateStorageMeter();
};

window.resetAllData = () => {
    const ok = confirm('Удалить ВСЮ коллекцию, заметки и настройки?\n\nЭто действие нельзя отменить. Сначала сделайте экспорт (.json), если данные нужны.');
    if (!ok) return;
    localStorage.removeItem(STORAGE_KEY);
    data = { ...structuredClone(defaults) };
    applyTheme('');
    save();
    showPage('home');
    showToast('Все данные сброшены', 'success');
};

function nudgeBackup() {
    if (countAllItems() < 10) return;
    const DAY = 86400000;
    if (!data.lastBackup || Date.now() - data.lastBackup > 30 * DAY) {
        setTimeout(() => showToast('Давно не делали бэкап. Настройки → «Экспорт (.json)» 💾'), 1800);
    }
}

// Синхронизация между вкладками: если данные изменили в другой вкладке — подхватываем
window.addEventListener('storage', (e) => {
    if (e.key !== STORAGE_KEY) return;
    data = { ...structuredClone(defaults), ...loadStoredData() };
    updateUI();
});

/* ---------- Модальные окна: Esc, клик по фону, a11y ---------- */
const MODAL_SELECTOR = '[id="modal"], [id$="-modal"]';
// окна с формами не закрываем кликом по фону — чтобы случайно не потерять введённое
const NO_BACKDROP_CLOSE = ['modal', 'game-modal'];

function openModals() {
    return [...document.querySelectorAll(MODAL_SELECTOR)].filter(m => !m.classList.contains('hidden'));
}

function setupModals() {
    document.querySelectorAll(MODAL_SELECTOR).forEach(m => {
        m.setAttribute('role', 'dialog');
        m.setAttribute('aria-modal', 'true');
    });

    let downTarget = null;
    document.addEventListener('mousedown', e => { downTarget = e.target; });
    document.addEventListener('click', e => {
        const el = e.target;
        if (el === downTarget && el.matches?.(MODAL_SELECTOR) && !NO_BACKDROP_CLOSE.includes(el.id)) {
            el.classList.add('hidden');
        }
    });
}

/* ---------- Глобальный поиск (Ctrl/⌘ + K) ---------- */
const SEARCH_SECTIONS = [
    { key: 'cds', page: 'cds', icon: '💿', label: 'CD' },
    { key: 'vinyls', page: 'vinyls', icon: '💽', label: 'Винил' },
    { key: 'games', page: 'games', icon: '🎮', label: 'Игры' },
    { key: 'stuff', page: 'stuff', icon: '📦', label: 'Вещи' },
    { key: 'wishlists', page: 'wishlists', icon: '🎁', label: 'Желаемое' }
];

const PALETTE_ACTIONS = [
    { icon: '🎲', title: 'Что послушать?', hint: 'Случайный релиз', run: () => getRandomRelease() },
    { icon: '📦', title: 'Перебрать полки', hint: 'Режим Crate Digger', run: () => openCrateDigger() },
    { icon: '💾', title: 'Скачать бэкап', hint: 'Экспорт .json', run: () => exportData() },
    { icon: '📊', title: 'Экспорт в CSV', hint: 'Таблица для Excel', run: () => exportCSV() },
    { icon: '📝', title: 'Быстрые заметки', hint: '', run: () => document.getElementById('quick-notes-modal').classList.remove('hidden') }
];

let paletteEntries = [];
let paletteIndex = 0;

function buildPaletteEntries(query) {
    const q = query.trim().toLowerCase();
    const entries = [];

    const pages = VALID_PAGES
        .map(p => ({ icon: '↗', title: PAGE_TITLES[p], hint: 'Перейти на страницу', group: 'Страницы', run: () => showPage(p), hay: PAGE_TITLES[p].toLowerCase() }))
        .filter(p => !q || p.hay.includes(q));
    const actions = PALETTE_ACTIONS
        .map(a => ({ ...a, group: 'Действия', hay: a.title.toLowerCase() }))
        .filter(a => !q || a.hay.includes(q));

    if (q) {
        SEARCH_SECTIONS.forEach(sec => {
            (data[sec.key] || [])
                .filter(i => [i.title, i.artist, i.platform, i.brand, i.label, i.year, i.developer]
                    .some(v => String(v ?? '').toLowerCase().includes(q)))
                .slice(0, 6)
                .forEach(i => entries.push({
                    icon: sec.icon,
                    title: i.title || 'Без названия',
                    hint: `${sec.label}${i.artist || i.platform ? ' · ' + (i.artist || i.platform) : ''}${i.price ? ' · ' + i.price + ' ₴' : ''}`,
                    group: 'Коллекция',
                    run: () => jumpToItem(sec, i)
                }));
        });
    }
    return [...entries, ...pages, ...actions];
}

function jumpToItem(sec, item) {
    showPage(sec.page);
    const input = document.getElementById(`search-${sec.key}`);
    if (input) {
        input.value = item.title || '';
        updateUI();
    }
}

function renderPalette() {
    const box = document.getElementById('palette-results');
    const query = document.getElementById('palette-input').value;
    paletteEntries = buildPaletteEntries(query);
    paletteIndex = Math.min(paletteIndex, Math.max(0, paletteEntries.length - 1));

    if (!paletteEntries.length) {
        box.innerHTML = '<div class="palette-empty">Ничего не найдено</div>';
        return;
    }

    let lastGroup = '';
    box.innerHTML = paletteEntries.map((e, idx) => {
        const head = e.group !== lastGroup ? `<div class="palette-group">${esc(e.group)}</div>` : '';
        lastGroup = e.group;
        return `${head}<button type="button" role="option" class="palette-item${idx === paletteIndex ? ' is-selected' : ''}" data-idx="${idx}">
            <span class="p-ico" aria-hidden="true">${esc(e.icon)}</span>
            <span class="p-main"><span>${esc(e.title)}</span>${e.hint ? `<small>${esc(e.hint)}</small>` : ''}</span>
        </button>`;
    }).join('');
    box.querySelector('.is-selected')?.scrollIntoView({ block: 'nearest' });
}

function runPaletteEntry(idx) {
    const entry = paletteEntries[idx];
    if (!entry) return;
    closeCommandPalette();
    entry.run();
}

window.openCommandPalette = () => {
    const palette = document.getElementById('command-palette');
    const input = document.getElementById('palette-input');
    palette.classList.remove('hidden');
    input.value = '';
    paletteIndex = 0;
    renderPalette();
    input.focus();
};

function closeCommandPalette() {
    document.getElementById('command-palette').classList.add('hidden');
}

function setupPalette() {
    const palette = document.getElementById('command-palette');
    const input = document.getElementById('palette-input');
    const results = document.getElementById('palette-results');

    input.addEventListener('input', debounce(() => { paletteIndex = 0; renderPalette(); }, 80));
    results.addEventListener('click', e => {
        const btn = e.target.closest('.palette-item');
        if (btn) runPaletteEntry(Number(btn.dataset.idx));
    });
    results.addEventListener('mousemove', e => {
        const btn = e.target.closest('.palette-item');
        if (btn && Number(btn.dataset.idx) !== paletteIndex) {
            paletteIndex = Number(btn.dataset.idx);
            results.querySelectorAll('.palette-item').forEach(el => el.classList.toggle('is-selected', el === btn));
        }
    });
    palette.addEventListener('click', e => { if (e.target === palette) closeCommandPalette(); });

    input.addEventListener('keydown', e => {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            const n = paletteEntries.length;
            if (!n) return;
            paletteIndex = (paletteIndex + (e.key === 'ArrowDown' ? 1 : -1) + n) % n;
            renderPalette();
        } else if (e.key === 'Enter') {
            e.preventDefault();
            runPaletteEntry(paletteIndex);
        }
    });
}

/* ---------- Горячие клавиши ---------- */
function isTyping(el) {
    return el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);
}

function setupShortcuts() {
    document.addEventListener('keydown', e => {
        const palette = document.getElementById('command-palette');
        const paletteOpen = !palette.classList.contains('hidden');

        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
            e.preventDefault();
            paletteOpen ? closeCommandPalette() : openCommandPalette();
            return;
        }

        if (e.key === 'Escape') {
            if (paletteOpen) { closeCommandPalette(); return; }
            const opened = openModals();
            if (opened.length) opened[opened.length - 1].classList.add('hidden');
            return;
        }

        // «/» — фокус на поиск текущей страницы
        if (e.key === '/' && !isTyping(e.target) && !paletteOpen && !openModals().length) {
            const page = VALID_PAGES.find(p => !document.getElementById(p).classList.contains('hidden'));
            const input = document.getElementById(`search-${page}`);
            if (input) { e.preventDefault(); input.focus(); input.select(); }
            else { e.preventDefault(); openCommandPalette(); }
        }
    });
}

/* ---------- Запуск ---------- */
function initApp() {
    applyTheme(data.selectedTheme || '');
    setupModals();
    setupPalette();
    setupShortcuts();

    sanitizeUnlockedAchievements();
    checkAchievements();

    const start = location.hash.slice(1);
    showPage(VALID_PAGES.includes(start) ? start : 'home', { fromHash: true });

    // кнопки «Назад/Вперёд» и ссылки вида #profile
    window.addEventListener('hashchange', () => {
        const id = location.hash.slice(1);
        if (VALID_PAGES.includes(id)) showPage(id, { fromHash: true });
    });

    nudgeBackup();
}

// defer-скрипты выполняются при readyState === 'interactive' — раньше, чем загрузятся 13–17.
// Поэтому ждём DOMContentLoaded: иначе достижения, добавленные поздними файлами (игры), «забывались» при старте.
if (document.readyState === 'complete') {
    initApp();
} else {
    document.addEventListener('DOMContentLoaded', initApp);
}
