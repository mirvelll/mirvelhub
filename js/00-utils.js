/* =========================================================
   MIRVEL HUB — утилиты (загружается первым)
   ========================================================= */

const STORAGE_KEY = 'mirvel_data';

/** Экранирование пользовательского текста для вставки в innerHTML / атрибуты */
function esc(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/** Разрешает только http(s)/mailto-ссылки (защита от javascript: в импортированных данных) */
function safeUrl(url) {
    const value = String(url ?? '').trim();
    if (!value) return '';
    try {
        const parsed = new URL(value, location.href);
        return ['http:', 'https:', 'mailto:'].includes(parsed.protocol) ? value : '';
    } catch (e) {
        return '';
    }
}

function debounce(fn, delay = 150) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    };
}

/** Безопасное чтение сохранённых данных: битый JSON не должен ломать весь сайт */
function loadStoredData() {
    let raw = null;
    try {
        raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return {};
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch (e) {
        console.warn('[MIRVEL] Не удалось прочитать данные, делаю резервную копию:', e);
        try { localStorage.setItem(`${STORAGE_KEY}_corrupt_${Date.now()}`, raw || ''); } catch (_) {}
        return {};
    }
}

/** Единый AudioContext — браузеры ограничивают их количество (~6), раньше создавался новый на каждый звук */
function getAudioCtx() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
}

function downloadFile(filename, content, type = 'application/json') {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function todayStamp() {
    return new Date().toISOString().slice(0, 10);
}

/** Цена для показа: «650 ₴», «~650 ₴» (примерная) или «цена ?» (не помню / в наборе) */
function fmtPrice(item) {
    if (!item) return '0 ₴';
    if (item.priceUnknown) return 'цена ?';
    const n = Number(item.price) || 0;
    return `${item.priceApprox ? '~' : ''}${n} ₴`;
}
