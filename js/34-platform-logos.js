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
        'PC CD/DVD': 'PC', 'Steam': 'STEAM', 'Epic Games': 'EPIC', 'GOG': 'GOG',
        'Battle.net': 'BNET', 'EA App': 'EA', 'Ubisoft Connect': 'UBI', 'Xbox App': 'XAPP', 'Rockstar Launcher': 'RSG', 'itch.io': 'ITCH', 'iOS': 'IOS', 'Android': 'AND'
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
        bnet: { color: '#148eff', body:
            '<circle cx="32" cy="32" r="32" fill="#0b1d33"/><path d="M32 14 C40 20 46 28 44 36 C42 44 34 48 32 52 C30 48 22 44 20 36 C18 28 24 20 32 14Z" fill="none" stroke="#38a3ff" stroke-width="4" stroke-linejoin="round"/>' },
        ea: { color: '#ff4747', body:
            '<circle cx="32" cy="32" r="32" fill="#1b1b1f"/><text x="32" y="40" font-size="24" ' + F + '>EA</text>' },
        ubi: { color: '#0070ff', body:
            '<circle cx="32" cy="32" r="32" fill="#0b2a5a"/><circle cx="32" cy="32" r="14" fill="none" stroke="#fff" stroke-width="4"/><path d="M32 32 m-6 3 a8 8 0 1 0 8-8" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round"/>' },
        rock: { color: '#fcaf17', body:
            '<circle cx="32" cy="32" r="32" fill="#fcaf17"/><text x="32" y="43" font-size="30" font-family="Arial, Helvetica, sans-serif" font-weight="900" fill="#111" text-anchor="middle">R</text>' },
        itch: { color: '#fa5c5c', body:
            '<circle cx="32" cy="32" r="32" fill="#fa5c5c"/><path d="M18 26 L22 18 H42 L46 26 V30 H18Z M20 32 H44 V46 H20Z" fill="#fff"/>' },
        ios: { color: '#e5e7eb', body:
            '<circle cx="32" cy="32" r="32" fill="#2b2b30"/><path d="M32 20 C36 14 42 16 42 16 C42 21 38 24 34 24 M32 26 C28 24 22 26 22 34 C22 42 27 50 31 50 C33 50 33 49 35 49 C37 49 37 50 39 50 C43 50 47 43 47 38 C41 36 41 29 46 27 C44 24 38 23 32 26Z" fill="#fff"/>' },
        android: { color: '#3ddc84', body:
            '<circle cx="32" cy="32" r="32" fill="#143d27"/><path d="M18 38 A14 14 0 0 1 46 38Z" fill="#3ddc84"/><circle cx="26" cy="33" r="1.8" fill="#143d27"/><circle cx="38" cy="33" r="1.8" fill="#143d27"/><path d="M22 24 L26 29 M42 24 L38 29" stroke="#3ddc84" stroke-width="2.6" stroke-linecap="round"/>' },
        other: { color: '#a78bfa', body:
            '<circle cx="32" cy="32" r="32" fill="#7c3aed"/>' +
            '<path d="M32 18 V46 M18 32 H46" stroke="#fff" stroke-width="6" stroke-linecap="round"/>' }
    };

    /* свои логотипы (загружаются в настройках): data.platPrefs.logos[название] = dataURL круглой картинки */
    const custom = name => { try { return (data.platPrefs && data.platPrefs.logos && data.platPrefs.logos[name]) || ''; } catch (_) { return ''; } };
    function keyOf(name, noCustom) {
        const n = String(name || '').toLowerCase();
        if (!noCustom && custom(name)) return 'c:' + name;
        if (/battle\.?net/.test(n)) return 'bnet';
        if (/^ea\b|ea app|origin/.test(n)) return 'ea';
        if (/ubisoft|uplay/.test(n)) return 'ubi';
        if (/rockstar/.test(n)) return 'rock';
        if (/itch/.test(n)) return 'itch';
        if (/^ios$|iphone|ipad/.test(n)) return 'ios';
        if (/android/.test(n)) return 'android';
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
        const base = key.startsWith('c:') ? keyOf(name, true) : key;
        return { key, color: LOGOS[base].color, label, code: CODES[name] || label.slice(0, 5).toUpperCase() };
    }
    const svgText = (key, px) => {
        if (key.startsWith('c:')) {
            const u = custom(key.slice(2));
            return `<img src="${esc(u)}" alt="" width="${px}" height="${px}" style="width:${px}px;height:${px}px;border-radius:50%;object-fit:cover;display:block">`;
        }
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="${px}" height="${px}">${LOGOS[key].body}</svg>`;
    };
    const svg = (name, px = 20) => svgText(keyOf(name), px);

    /* HTML-плашка: логотип + название платформы (для «Игры дня») */
    function pill(name, cls = '') {
        const m = meta(name);
        return `<span class="mh-plat-pill ${cls}" style="--pc:${m.color}" title="${esc(m.label)}">${svgText(m.key, 22)}<span>${esc(m.label)}</span></span>`;
    }

    /* Картинки для canvas: SVG → Image (data-URL не «портит» холст). Кеш по ключу логотипа. */
    const cache = new Map();
    function loadKey(key) {
        const ck = key.startsWith('c:') ? key + '|' + custom(key.slice(2)) : key;
        if (cache.has(ck)) return cache.get(ck);
        const p = new Promise(res => {
            const im = new Image();
            im.onerror = () => res(null);
            if (key.startsWith('c:')) {
                im.onload = () => {                       // уже круглая картинка → рисуем на холсте 128×128
                    const c = document.createElement('canvas'); c.width = c.height = 128;
                    const g = c.getContext('2d'); g.imageSmoothingQuality = 'high';
                    g.beginPath(); g.arc(64, 64, 64, 0, Math.PI * 2); g.clip(); g.drawImage(im, 0, 0, 128, 128);
                    res(c);
                };
                im.src = custom(key.slice(2));
            } else {
                im.onload = () => res(im);
                im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgText(key, 128));
            }
        });
        cache.set(ck, p);
        return p;
    }
    /* names → { [key]: Image|null } */
    async function load(names) {
        const keys = [...new Set((names || []).map(n => keyOf(n)))];
        const imgs = await Promise.all(keys.map(loadKey));
        const out = {};
        keys.forEach((k, i) => { out[k] = imgs[i]; });
        return out;
    }

    window.mhPlatLogo = { meta, keyOf, svg, pill, load, hasCustom: custom };

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
