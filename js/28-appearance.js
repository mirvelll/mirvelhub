/* =========================================================
   MIRVEL HUB — 28-appearance.js (подключать после 27-design.js)
   1) Тема страницы релиза от цвета обложки
   2) Светлая тема (тёмная / светлая / как в системе)
   3) Свой цвет акцента (палитра + любой цвет)
   4) Красивая страница коллекции одним HTML-файлом (скачать и выложить куда угодно)
   Настройки лежат в localStorage (не в data), старые данные не затрагиваются.
   ========================================================= */
(() => {
    'use strict';
    const $ = id => document.getElementById(id);
    const E = s => (typeof esc === 'function' ? esc(s) : String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));
    const LS = {
        get: k => { try { return localStorage.getItem(k); } catch (_) { return null; } },
        set: (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (_) {} }
    };
    const K_ACCENT = 'mirvel_accent', K_SCHEME = 'mirvel_scheme', K_COVER = 'mirvel_cover_theme';

    /* ---------- цвет ---------- */
    const hexToRgb = h => { const m = /^#?([0-9a-f]{6})$/i.exec(String(h || '').trim()); if (!m) return null; const n = parseInt(m[1], 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
    const rgbToHex = ([r, g, b]) => '#' + [r, g, b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
    function rgbToHsl(r, g, b) {
        r /= 255; g /= 255; b /= 255;
        const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
        let h = 0, s = 0;
        if (d) {
            s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn);
            h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
            h /= 6;
        }
        return [h, s, l];
    }
    function hslToRgb(h, s, l) {
        const f = (p, q, t) => { if (t < 0) t += 1; if (t > 1) t -= 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < .5 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
        if (!s) return [l * 255, l * 255, l * 255];
        const q = l < .5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
        return [f(p, q, h + 1 / 3) * 255, f(p, q, h) * 255, f(p, q, h - 1 / 3) * 255];
    }
    /* делаем цвет «акцентным»: достаточно яркий и насыщенный, чтобы читался на тёмном фоне */
    function tune(rgb, minS = .5, light = .58) {
        const [h, s, l] = rgbToHsl(...rgb);
        return hslToRgb(h, Math.max(s, minS), Math.min(Math.max(l, light - .08), light + .08));
    }
    const lighten = rgb => { const [h, s, l] = rgbToHsl(...rgb); return hslToRgb(h, s, Math.min(.8, l + .16)); };

    /* ---------- стили ---------- */
    const css = document.createElement('style');
    css.textContent = `
    /* светлая тема: инвертируем страницу, картинки возвращаем обратно */
    html.mh-light{filter:invert(1) hue-rotate(180deg);background:#030307}
    html.mh-light img,html.mh-light video,html.mh-light canvas,html.mh-light iframe,html.mh-light [style*="background-image"]{filter:invert(1) hue-rotate(180deg)}
    html.mh-light .glass{box-shadow:inset 0 1px 1px rgba(255,255,255,.05),0 8px 30px rgba(0,0,0,.45)}

    /* свой цвет акцента: то же, что делают body.theme-blue/green/pink */
    body.theme-custom .text-purple-400{color:rgb(var(--theme-rgb))!important}
    body.theme-custom .text-purple-300{color:var(--accent-light)!important}
    body.theme-custom .bg-purple-600{background-color:var(--theme-btn)!important}
    body.theme-custom .bg-purple-600:hover{filter:brightness(1.12)}
    body.theme-custom .border-purple-500\\/30{border-color:rgba(var(--theme-rgb),.3)!important}
    body.theme-custom .from-purple-400{--tw-gradient-from:var(--accent-light)!important;--tw-gradient-stops:var(--tw-gradient-from),var(--tw-gradient-to)!important}
    body.theme-custom .logo{background-image:linear-gradient(90deg,var(--accent-light),#22d3ee)}

    /* страница релиза: подкрашивается от обложки */
    #music-detail-modal .gd-panel{transition:background .5s,border-color .5s,box-shadow .5s}
    #music-detail-modal.mh-tinted .gd-panel{border-color:rgba(var(--theme-rgb),.45);box-shadow:0 30px 90px rgba(var(--theme-rgb),.28)}
    #music-detail-modal.mh-tinted .text-purple-300{color:var(--accent-light)!important}
    #music-detail-modal.mh-tinted .gd-cover{box-shadow:0 18px 50px rgba(var(--theme-rgb),.45)}

    /* карточка в настройках */
    .ap-row{display:flex;flex-wrap:wrap;align-items:center;gap:8px}
    .ap-swatch{width:30px;height:30px;border-radius:999px;border:1px solid rgba(255,255,255,.25);cursor:pointer;transition:transform .2s}
    .ap-swatch:hover{transform:scale(1.15)}
    .ap-swatch.is-on{box-shadow:0 0 0 2px #030307,0 0 0 4px rgba(255,255,255,.85)}
    .ap-color{width:44px;height:34px;padding:0;border:0;background:none;cursor:pointer}
    `;
    document.head.appendChild(css);

    /* =====================================================
       Светлая тема
       ===================================================== */
    const mq = window.matchMedia ? matchMedia('(prefers-color-scheme: light)') : null;
    function applyScheme() {
        const s = LS.get(K_SCHEME) || 'dark';
        const light = s === 'light' || (s === 'auto' && mq && mq.matches);
        document.documentElement.classList.toggle('mh-light', light);
        document.querySelectorAll('[data-ap-scheme]').forEach(b => b.classList.toggle('is-on', b.dataset.apScheme === s));
    }
    if (mq && mq.addEventListener) mq.addEventListener('change', applyScheme);

    /* =====================================================
       Свой цвет акцента
       ===================================================== */
    const PRESETS = ['#8b5cf6', '#3b82f6', '#06b6d4', '#22c55e', '#eab308', '#f97316', '#ef4444', '#ec4899'];
    function applyAccent() {
        const b = document.body, hex = LS.get(K_ACCENT), rgb = hexToRgb(hex);
        if (!rgb) {
            b.classList.remove('theme-custom');
            ['--theme-rgb', '--theme-btn', '--theme-color', '--neon-shadow', '--accent-light'].forEach(p => b.style.removeProperty(p));
        } else {
            const t = tune(rgb, .35, .55), l = lighten(t);
            b.classList.add('theme-custom');
            b.style.setProperty('--theme-rgb', t.map(Math.round).join(', '));
            b.style.setProperty('--theme-btn', `rgb(${t.map(Math.round).join(', ')})`);
            b.style.setProperty('--theme-color', `rgba(${t.map(Math.round).join(', ')}, 0.4)`);
            b.style.setProperty('--neon-shadow', `0 0 15px rgba(${t.map(Math.round).join(', ')}, 0.4)`);
            b.style.setProperty('--accent-light', rgbToHex(l));
        }
        document.querySelectorAll('.ap-swatch').forEach(s => s.classList.toggle('is-on', !!hex && s.dataset.hex === hex));
        const ci = $('ap-color'); if (ci && hex) ci.value = hex;
    }
    /* выбрал готовую тему-кружок в боковой панели → свой цвет выключается */
    document.addEventListener('click', e => {
        if (e.target.closest && e.target.closest('[data-theme-btn]') && LS.get(K_ACCENT)) { LS.set(K_ACCENT, null); applyAccent(); }
    }, true);

    /* =====================================================
       Тема страницы релиза от обложки
       ===================================================== */
    const detail = $('music-detail-modal');
    const colorCache = new Map();
    const keyOf = s => s.length + ':' + s.slice(-40);

    function dominant(src) {
        const k = keyOf(src);
        if (colorCache.has(k)) return Promise.resolve(colorCache.get(k));
        return new Promise(res => {
            const im = new Image();
            im.crossOrigin = 'anonymous';
            im.onload = () => {
                let out = null;
                try {
                    const N = 24, c = document.createElement('canvas'); c.width = c.height = N;
                    const x = c.getContext('2d'); x.drawImage(im, 0, 0, N, N);
                    const d = x.getImageData(0, 0, N, N).data;
                    let r = 0, g = 0, b = 0, w = 0;
                    for (let i = 0; i < d.length; i += 4) {
                        const [, s, l] = rgbToHsl(d[i], d[i + 1], d[i + 2]);
                        const wt = (s * s + .02) * (1 - Math.abs(l - .5) * 1.4 > 0 ? 1 - Math.abs(l - .5) * 1.4 : .05);
                        r += d[i] * wt; g += d[i + 1] * wt; b += d[i + 2] * wt; w += wt;
                    }
                    if (w) out = [r / w, g / w, b / w];
                } catch (_) { out = null; }
                colorCache.set(k, out); res(out);
            };
            im.onerror = () => { colorCache.set(k, null); res(null); };
            im.src = src;
        });
    }
    function paint(rgb) {
        const panel = detail.querySelector('.gd-panel');
        if (!panel) return;
        if (!rgb) { unpaint(); return; }
        const t = tune(rgb, .45, .58).map(Math.round), l = rgbToHex(lighten(t)), s = t.join(', ');
        detail.classList.add('mh-tinted');
        detail.style.setProperty('--theme-rgb', s);
        detail.style.setProperty('--theme-btn', `rgb(${s})`);
        detail.style.setProperty('--accent-light', l);
        detail.style.background = `radial-gradient(ellipse at 50% 0%, rgba(${s}, 0.38), rgba(0,0,0,0.8) 70%)`;
        panel.style.backgroundImage = `linear-gradient(165deg, rgba(${s}, 0.26), rgba(3,3,7,0.55) 55%)`;
    }
    function unpaint() {
        if (!detail) return;
        detail.classList.remove('mh-tinted');
        ['--theme-rgb', '--theme-btn', '--accent-light', 'background'].forEach(p => detail.style.removeProperty(p));
        const panel = detail.querySelector('.gd-panel'); if (panel) panel.style.backgroundImage = '';
    }
    async function tint() {
        if (!detail || detail.classList.contains('hidden')) return;
        if (LS.get(K_COVER) === '0') { unpaint(); return; }
        const img = detail.querySelector('.gd-cover img');
        if (!img || !img.getAttribute('src')) { unpaint(); return; }
        const src = img.getAttribute('src');
        const hit = colorCache.get(keyOf(src));
        if (hit !== undefined) { paint(hit); return; }
        const rgb = await dominant(src);
        if (!detail.classList.contains('hidden')) paint(rgb);
    }
    if (detail) {
        const body = detail.querySelector('#md-body');
        if (body) new MutationObserver(tint).observe(body, { childList: true });
        new MutationObserver(() => { if (detail.classList.contains('hidden')) unpaint(); else tint(); }).observe(detail, { attributes: true, attributeFilter: ['class'] });
    }

    /* =====================================================
       Страница коллекции (один HTML-файл)
       ===================================================== */
    const imgOk = v => { v = String(v || ''); return (/^data:image\//i.test(v) || /^https?:\/\//i.test(v)) ? v : ''; };
    function thumb(src) {
        return new Promise(res => {
            if (!src) return res('');
            const im = new Image(); im.crossOrigin = 'anonymous';
            im.onload = () => {
                try {
                    const sc = Math.min(1, 320 / Math.max(im.width, im.height)), c = document.createElement('canvas');
                    c.width = Math.max(1, Math.round(im.width * sc)); c.height = Math.max(1, Math.round(im.height * sc));
                    c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
                    res(c.toDataURL('image/jpeg', 0.78));
                } catch (_) { res(/^https?:/i.test(src) ? src : ''); }
            };
            im.onerror = () => res(/^https?:/i.test(src) ? src : '');
            im.src = src;
        });
    }
    const stars = n => { n = Math.max(0, Math.min(5, Number(n) || 0)); return n ? '★'.repeat(n) + '☆'.repeat(5 - n) : ''; };

    async function exportPage() {
        const sections = [
            { key: 'cds', name: '💿 CD' }, { key: 'vinyls', name: '💽 Винил' }, { key: 'games', name: '🎮 Игры' }
        ].map(s => ({ ...s, items: (data[s.key] || []) })).filter(s => s.items.length);
        if (!sections.length) { showToast('В коллекции пока пусто', 'error'); return; }
        showToast('Собираю страницу коллекции…');
        const owner = ($('display-name')?.textContent || '').trim() || 'Моя коллекция';
        const rgb = (getComputedStyle(document.body).getPropertyValue('--theme-rgb') || '139, 92, 246').trim();
        let tabs = '', grids = '', total = 0;
        for (let si = 0; si < sections.length; si++) {
            const s = sections[si];
            const cards = [];
            for (const it of s.items) {
                const src = await thumb(imgOk(it.img));
                const sub = s.key === 'games' ? (it.platform || '') : (it.artist || '');
                const meta = [it.year].filter(Boolean).join(' • ');
                const hay = [it.title, sub, it.year].join(' ').toLowerCase();
                cards.push(`<article class="c" data-h="${E(hay)}"><div class="a">${src ? `<img src="${E(src)}" alt="" loading="lazy">` : `<span>${s.name.slice(0, 2)}</span>`}</div><h3>${E(it.title || 'Без названия')}</h3>${sub ? `<p class="s">${E(sub)}</p>` : ''}${meta ? `<p class="m">${E(meta)}</p>` : ''}${it.rating ? `<p class="r">${stars(it.rating)}</p>` : ''}</article>`);
            }
            total += cards.length;
            tabs += `<button class="t${si ? '' : ' on'}" data-t="${s.key}">${E(s.name)} <b>${cards.length}</b></button>`;
            grids += `<section class="g${si ? ' off' : ''}" id="g-${s.key}">${cards.join('')}</section>`;
        }
        const html = `<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${E(owner)} — коллекция</title>
<style>
:root{--a:${rgb}}*{box-sizing:border-box}body{margin:0;background:#030307;color:#fff;font-family:Inter,system-ui,-apple-system,'Segoe UI',sans-serif;min-height:100vh}
body:before{content:'';position:fixed;inset:-20vmax auto auto -20vmax;width:70vmax;height:70vmax;border-radius:50%;background:radial-gradient(circle,rgba(var(--a),.22),transparent 65%);z-index:-1}
header{max-width:1100px;margin:0 auto;padding:48px 20px 16px}h1{margin:0;font-size:clamp(1.8rem,5vw,3rem);letter-spacing:-.02em}header p{color:#9ca3af;margin:8px 0 0}
.bar{max-width:1100px;margin:0 auto;padding:12px 20px;display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.t{padding:9px 16px;border-radius:999px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.05);color:#d1d5db;font-weight:700;cursor:pointer}.t b{opacity:.6;margin-left:4px}
.t.on{background:rgba(var(--a),.3);border-color:rgb(var(--a));color:#fff}
input{flex:1;min-width:180px;padding:10px 16px;border-radius:999px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.05);color:#fff;font-size:14px}
.g{max-width:1100px;margin:0 auto;padding:12px 20px 60px;display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:16px}.off{display:none}
.c{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:18px;padding:10px;transition:transform .25s,border-color .25s}.c:hover{transform:translateY(-4px);border-color:rgba(var(--a),.6)}
.a{aspect-ratio:1;border-radius:12px;overflow:hidden;background:rgba(var(--a),.2);display:flex;align-items:center;justify-content:center;font-size:2.4rem}.a img{width:100%;height:100%;object-fit:cover}
h3{margin:10px 2px 2px;font-size:14px;line-height:1.25;overflow-wrap:anywhere}.s{margin:0 2px;font-size:12px;color:#c4b5fd}.m{margin:2px;font-size:11px;color:#6b7280}.r{margin:4px 2px 0;font-size:12px;color:#facc15}
footer{text-align:center;color:#4b5563;font-size:12px;padding:0 0 40px}
</style></head><body>
<header><h1>${E(owner)}</h1><p>Коллекция: ${total} шт.</p></header>
<div class="bar">${tabs}<input id="q" type="search" placeholder="Поиск…" aria-label="Поиск"></div>
${grids}<footer>MIRVEL HUB</footer>
<script>
(function(){var tabs=document.querySelectorAll('.t'),q=document.getElementById('q');
function cur(){var t=document.querySelector('.t.on');return t?t.getAttribute('data-t'):''}
function f(){var v=q.value.trim().toLowerCase();document.querySelectorAll('.c').forEach(function(c){c.style.display=!v||c.getAttribute('data-h').indexOf(v)>-1?'':'none'})}
tabs.forEach(function(b){b.onclick=function(){tabs.forEach(function(x){x.classList.remove('on')});b.classList.add('on');document.querySelectorAll('.g').forEach(function(g){g.classList.toggle('off',g.id!=='g-'+b.getAttribute('data-t'))});f()}});
q.oninput=f})();
<\/script></body></html>`;
        const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob), a = document.createElement('a');
        a.href = url; a.download = 'mirvel-collection.html';
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 4000);
        showToast(`Страница готова (${Math.round(blob.size / 1024)} КБ) 🌐`, 'success');
    }
    window.exportCollectionPage = exportPage;

    /* =====================================================
       Карточка «Внешний вид» в настройках
       ===================================================== */
    function buildCard() {
        const host = document.querySelector('#profile .grid > div.space-y-6:not(.glass)');
        if (!host || $('appearance-card')) return !!$('appearance-card');
        const card = document.createElement('div');
        card.id = 'appearance-card';
        card.className = 'glass p-8 rounded-3xl space-y-6';
        card.innerHTML = `
            <h3 class="font-bold text-xl">Внешний вид</h3>
            <div>
                <label class="text-xs text-gray-400 font-bold block mb-2 uppercase">Оформление</label>
                <div class="hx-seg">
                    <button type="button" data-ap-scheme="dark">🌙 Тёмная</button>
                    <button type="button" data-ap-scheme="light">☀️ Светлая</button>
                    <button type="button" data-ap-scheme="auto">🖥 Как в системе</button>
                </div>
            </div>
            <div>
                <label class="text-xs text-gray-400 font-bold block mb-2 uppercase">Свой цвет акцента</label>
                <div class="ap-row">
                    ${PRESETS.map(h => `<button type="button" class="ap-swatch" data-hex="${h}" style="background:${h}" aria-label="Цвет ${h}"></button>`).join('')}
                    <input type="color" id="ap-color" class="ap-color" value="#8b5cf6" aria-label="Любой цвет">
                    <button type="button" id="ap-reset" class="text-xs text-gray-400 hover:text-white px-2 py-1">Сбросить</button>
                </div>
            </div>
            <label class="flex items-start gap-3 text-sm text-gray-300 cursor-pointer">
                <input type="checkbox" id="ap-cover" class="mt-1">
                <span>Страница релиза окрашивается в цвет обложки</span>
            </label>
            <div class="pt-4 border-t border-white/10 space-y-3">
                <p class="text-sm text-gray-400">Красивая страница коллекции: один HTML-файл с обложками и поиском. Скачай и выложи куда угодно (GitHub Pages, любой хостинг) или просто отправь файл другу.</p>
                <button type="button" id="ap-export" class="w-full bg-purple-600 hover:bg-purple-500 py-3 rounded-xl font-bold text-white btn-neon">🌐 Скачать страницу коллекции</button>
            </div>`;
        host.insertBefore(card, host.firstChild);
        card.addEventListener('click', e => {
            const sch = e.target.closest('[data-ap-scheme]');
            if (sch) { LS.set(K_SCHEME, sch.dataset.apScheme); applyScheme(); return; }
            const sw = e.target.closest('.ap-swatch');
            if (sw) { LS.set(K_ACCENT, sw.dataset.hex); applyAccent(); return; }
            if (e.target.closest('#ap-reset')) { LS.set(K_ACCENT, null); applyAccent(); return; }
            if (e.target.closest('#ap-export')) exportPage();
        });
        $('ap-color').addEventListener('input', e => { LS.set(K_ACCENT, e.target.value); applyAccent(); });
        const cb = $('ap-cover');
        cb.checked = LS.get(K_COVER) !== '0';
        cb.addEventListener('change', () => { LS.set(K_COVER, cb.checked ? '1' : '0'); tint(); });
        applyScheme(); applyAccent();
        return true;
    }

    applyScheme();
    applyAccent();
    if (!buildCard()) {
        const prof = $('profile');
        if (prof) { const mo = new MutationObserver(() => { if (buildCard()) mo.disconnect(); }); mo.observe(prof, { childList: true, subtree: true }); }
    }
    /* на случай, если другой модуль сбросит классы темы при старте */
    document.addEventListener('mirvel-ready', () => setTimeout(() => { applyAccent(); applyScheme(); }, 300), { once: true });
})();
