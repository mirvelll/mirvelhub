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

/** Данные при запуске. Их уже прочитал 00-storage.js (IndexedDB, старые данные из localStorage переносятся автоматически).
 *  Если файл по какой-то причине не подключён — читаем localStorage, как раньше. */
function loadStoredData() {
    if (window.MirvelStore) return window.MirvelStore.boot || {};
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

/* ---------- Фото: автоматическое сжатие ----------
   Любая картинка (хоть 4K / 20 МБ) уменьшается в браузере до нужного размера и сохраняется как JPEG.
   Размеры можно поменять здесь: max — длинная сторона в пикселях, quality — качество JPEG (0–1). */
const IMG_PRESETS = {
    cover:     { max: 480,  quality: 0.8 },   // обложки CD / винила / вещей / игр
    avatar:    { max: 480,  quality: 0.8 },   // аватар профиля
    spotlight: { max: 480,  quality: 0.8 },   // любимый артист / альбом
    banner:    { max: 1280, quality: 0.75 },  // баннер профиля (широкий)
    photo:     { max: 1100, quality: 0.66 }   // фото в галерее игры
};

function fmtBytes(n) {
    n = Number(n) || 0;
    if (n >= 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} МБ`;
    return `${Math.max(1, Math.round(n / 1024))} КБ`;
}

async function decodeImageFile(file) {
    if (window.createImageBitmap) {
        try { return await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch (e) {}
        try { return await createImageBitmap(file); } catch (e) {}
    }
    const url = URL.createObjectURL(file);
    try {
        return await new Promise((resolve, reject) => {
            const im = new Image();
            im.onload = () => resolve(im);
            im.onerror = () => reject(new Error('Не удалось прочитать картинку'));
            im.src = url;
        });
    } finally { setTimeout(() => URL.revokeObjectURL(url), 3000); }
}

/** File → JPEG data-URL нужного размера. preset: имя из IMG_PRESETS или { max, quality }. */
async function compressImage(file, preset = 'cover') {
    const { max, quality } = typeof preset === 'string' ? (IMG_PRESETS[preset] || IMG_PRESETS.cover) : preset;
    const src = await decodeImageFile(file);
    const sw = src.width || src.naturalWidth, sh = src.height || src.naturalHeight;
    if (!sw || !sh) throw new Error('Пустая картинка');

    const scale = Math.min(1, max / Math.max(sw, sh));
    const tw = Math.max(1, Math.round(sw * scale)), th = Math.max(1, Math.round(sh * scale));

    // уменьшаем ступенями (вдвое за шаг) — так 4K → 480 получается чётким, а не «лесенкой»
    let cur = src, cw = sw, ch = sh;
    while (cw / 2 >= tw && ch / 2 >= th && cw > 1 && ch > 1) {
        const nw = Math.ceil(cw / 2), nh = Math.ceil(ch / 2);
        const step = document.createElement('canvas');
        step.width = nw; step.height = nh;
        const sctx = step.getContext('2d');
        sctx.imageSmoothingQuality = 'high';
        sctx.drawImage(cur, 0, 0, nw, nh);
        if (cur !== src) { cur.width = 0; cur.height = 0; }
        cur = step; cw = nw; ch = nh;
    }

    const out = document.createElement('canvas');
    out.width = tw; out.height = th;
    const ctx = out.getContext('2d');
    ctx.fillStyle = '#0d0d14';          // у PNG с прозрачностью фон станет тёмным, а не чёрным пятном
    ctx.fillRect(0, 0, tw, th);
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(cur, 0, 0, tw, th);
    const result = out.toDataURL('image/jpeg', quality);

    if (cur !== src) { cur.width = 0; cur.height = 0; }
    out.width = 0; out.height = 0;
    if (src.close) src.close();
    return result;
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

/** Цена для показа: «650 ₴», «~650 ₴» (примерная), «Бесплатно» или «цена ?» (не помню / в наборе) */
function fmtPrice(item) {
    if (!item) return '0 ₴';
    if (item.priceFree) return 'Бесплатно';
    if (item.priceUnknown) return 'цена ?';
    const n = Number(item.price) || 0;
    return `${item.priceApprox ? '~' : ''}${n} ₴`;
}

/** Список исполнителей из строки профиля. Разделители: «;», перенос строки или запятая.
 *  Известные имена с запятой внутри («Tyler, The Creator») не режутся. */
const COMMA_ARTISTS = ['Tyler, The Creator', 'Earth, Wind & Fire', 'Crosby, Stills, Nash & Young', 'Crosby, Stills & Nash', 'Emerson, Lake & Palmer', 'Florence, The Machine', 'Mike, The Situation'];
function splitArtists(str) {
    let s = String(str ?? '');
    const keep = [];
    COMMA_ARTISTS.forEach(name => {
        const re = new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/, /g, ',\\s*'), 'gi');
        s = s.replace(re, () => { keep.push(name); return `\u0000${keep.length - 1}\u0000`; });
    });
    const sep = /[;\n]/.test(s) ? /[;\n]+/ : /,/;
    return s.split(sep)
        .map(x => x.replace(/\u0000(\d+)\u0000/g, (_, i) => keep[i]).trim())
        .filter(Boolean);
}
