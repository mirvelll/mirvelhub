/* =========================================================
   MIRVEL HUB — 34-platform-logos.js (подключать в самом конце, после 33-hidden-games.js)
   Логотипы платформ (Steam, PlayStation, Xbox, Epic, GOG, Nintendo, Sega, PC) в виде SVG.
   Один источник для двух мест:
   • «Игра дня» на главной (HTML-плашка с логотипом и названием платформы)
   • картинка «Поделиться» (рисуется на canvas рядом с каждой игрой)

   Доступно: window.mhPlatLogo = { meta(name), svg(name, px), pill(name), load(names) }
   ========================================================= */
(() => {
    'use strict';
    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

    /* ---------- Короткие коды (как в 16-games.js) ---------- */
    const CODES = {
        'PlayStation 1': 'PS1', 'PlayStation 2': 'PS2', 'PlayStation 3': 'PS3', 'PlayStation 4': 'PS4', 'PlayStation 5': 'PS5',
        'PSP': 'PSP', 'PS Vita': 'VITA', 'Xbox': 'XBOX', 'Xbox 360': 'X360', 'Xbox One': 'XONE', 'Xbox Series': 'XSX',
        'Nintendo GameCube': 'GC', 'Nintendo Wii': 'WII', 'Nintendo Wii U': 'WIIU', 'Nintendo Switch': 'NSW', 'Nintendo Switch 2': 'NSW2',
        'Nintendo DS': 'DS', 'Nintendo 3DS': '3DS', 'Nintendo 64': 'N64', 'SNES': 'SNES', 'Game Boy': 'GB', 'Game Boy Advance': 'GBA',
        'Sega Dreamcast': 'DC', 'Sega Mega Drive': 'MD', 'Sega Saturn': 'SAT',
        'PC CD/DVD': 'PC', 'Steam': 'STEAM', 'Epic Games': 'EPIC', 'GOG': 'GOG'
    };

    /* ---------- Логотипы: круг 64×64 + знак (упрощённые, нарисованы вручную) ---------- */
    const F = 'font-family="Arial, Helvetica, sans-serif" font-weight="900" fill="#fff" text-anchor="middle"';
    const LOGOS = {
        steam: { color: '#1b9ad6', body:
            '<circle cx="32" cy="32" r="32" fill="#171a21"/>' +
            '<circle cx="40" cy="25" r="10" fill="none" stroke="#fff" stroke-width="5"/>' +
            '<path d="M24 41 L33 33" stroke="#fff" stroke-width="6" stroke-linecap="round"/>' +
            '<circle cx="22" cy="43" r="8" fill="#fff"/><circle cx="22" cy="43" r="3" fill="#171a21"/>' },
        ps: { color: '#3b82f6', body:
            '<circle cx="32" cy="32" r="32" fill="#003791"/>' +
            `<text x="32" y="41" font-size="27" font-style="italic" ${F}>PS</text>` },
        xbox: { color: '#22c55e', body:
            '<circle cx="32" cy="32" r="32" fill="#107c10"/>' +
            '<circle cx="32" cy="32" r="22" fill="none" stroke="#fff" stroke-width="4"/>' +
            '<path d="M22 22 L42 42 M42 22 L22 42" stroke="#fff" stroke-width="6" stroke-linecap="round"/>' },
        nin: { color: '#ef4444', body:
            '<circle cx="32" cy="32" r="32" fill="#e60012"/>' +
            '<rect x="14" y="20" width="36" height="24" rx="12" fill="none" stroke="#fff" stroke-width="5"/>' +
            '<circle cx="25" cy="32" r="4.5" fill="#fff"/><circle cx="39" cy="32" r="2.5" fill="#fff"/>' },
        epic: { color: '#e5e7eb', body:
            '<circle cx="32" cy="32" r="32" fill="#2b2b2b"/>' +
            '<path d="M18 15 H46 V37 L32 50 L18 37 Z" fill="#fff"/>' +
            `<text x="32" y="38" font-size="22" ${F.replace('fill="#fff"', 'fill="#2b2b2b"')}>E</text>` },
        gog: { color: '#a855f7', body:
            '<circle cx="32" cy="32" r="32" fill="#86328a"/>' +
            `<text x="32" y="39" font-size="21" ${F}>GOG</text>` },
        sega: { color: '#06b6d4', body:
            '<circle cx="32" cy="32" r="32" fill="#0057b8"/>' +
            `<text x="32" y="38" font-size="16" font-style="italic" ${F}>SEGA</text>` },
        pc: { color: '#9ca3af', body:
            '<circle cx="32" cy="32" r="32" fill="#4b5563"/>' +
            '<rect x="15" y="17" width="34" height="23" rx="3" fill="none" stroke="#fff" stroke-width="4"/>' +
            '<path d="M25 48 H39 M32 40 V48" stroke="#fff" stroke-width="4" stroke-linecap="round"/>' },
        other: { color: '#a78bfa', body:
            '<circle cx="32" cy="32" r="32" fill="#7c3aed"/>' +
            '<path d="M32 18 V46 M18 32 H46" stroke="#fff" stroke-width="6" stroke-linecap="round"/>' }
    };

    function keyOf(name) {
        const n = String(name || '').toLowerCase();
        if (/steam/.test(n)) return 'steam';
        if (/epic/.test(n)) return 'epic';
        if (/gog/.test(n)) return 'gog';
        if (/playstation|^ps\d?\b|^psp|vita/.test(n)) return 'ps';
        if (/xbox/.test(n)) return 'xbox';
        if (/nintendo|switch|wii|\bds\b|3ds|game ?boy|snes|n64|gamecube/.test(n)) return 'nin';
        if (/sega|dreamcast|saturn|mega drive/.test(n)) return 'sega';
        if (/\bpc\b/.test(n)) return 'pc';
        return 'other';
    }
    function meta(name) {
        const key = keyOf(name);
        const label = String(name || '').trim() || 'Другое';
        return { key, color: LOGOS[key].color, label, code: CODES[name] || label.slice(0, 5).toUpperCase() };
    }
    const svgText = (key, px) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="${px}" height="${px}">${LOGOS[key].body}</svg>`;
    const svg = (name, px = 20) => svgText(keyOf(name), px);

    /* HTML-плашка: логотип + название платформы (для «Игры дня») */
    function pill(name, cls = '') {
        const m = meta(name);
        return `<span class="mh-plat-pill ${cls}" style="--pc:${m.color}" title="${esc(m.label)}">${svgText(m.key, 22)}<span>${esc(m.label)}</span></span>`;
    }

    /* Картинки для canvas: SVG → Image (data-URL не «портит» холст). Кеш по ключу логотипа. */
    const cache = new Map();
    function loadKey(key) {
        if (cache.has(key)) return cache.get(key);
        const p = new Promise(res => {
            const im = new Image();
            im.onload = () => res(im);
            im.onerror = () => res(null);
            im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgText(key, 128));
        });
        cache.set(key, p);
        return p;
    }
    /* names → { [key]: Image|null } */
    async function load(names) {
        const keys = [...new Set((names || []).map(keyOf))];
        const imgs = await Promise.all(keys.map(loadKey));
        const out = {};
        keys.forEach((k, i) => { out[k] = imgs[i]; });
        return out;
    }

    window.mhPlatLogo = { meta, keyOf, svg, pill, load };

    const st = document.createElement('style');
    st.textContent = `
    .mh-plat-pill { display: inline-flex; align-items: center; gap: 6px; max-width: 100%; vertical-align: middle;
        padding: 2px 10px 2px 3px; border-radius: 999px; font-size: 12px; font-weight: 800; color: #fff; white-space: nowrap;
        background: color-mix(in srgb, var(--pc) 18%, transparent); border: 1px solid color-mix(in srgb, var(--pc) 55%, transparent); }
    .mh-plat-pill svg { flex-shrink: 0; display: block; }
    .mh-plat-pill span { overflow: hidden; text-overflow: ellipsis; }`;
    document.head.appendChild(st);

    /* «Игра дня» могла отрисоваться раньше, чем загрузился этот файл — перерисуем с логотипом */
    try { if (typeof window.gotdRender === 'function') window.gotdRender(); } catch (_) {}
})();
