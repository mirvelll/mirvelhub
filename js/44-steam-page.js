/* =========================================================
   MIRVEL HUB — 44-steam-page.js  («Steam-вид» страницы игры)
   Только оформление поверх существующей страницы игры: данные и логику не трогает.
   • баннер из размытой обложки + подсветка цветом обложки
   • кнопки действий — рядом в углу, статус — большой пилюлей как «ИГРАТЬ» в Steam
   • плитки статистики — одной полосой, у ачивок тонкий прогресс-бар
   Переключатель «Steam-вид / Классика» — в левом верхнем углу страницы игры.
   Откат: убрать '44-steam-page.js' из списка в 00-storage.js (или просто удалить этот файл).
   ========================================================= */
(() => {
    'use strict';
    const KEY = 'mh_steam_view';           // '0' = классический вид
    const $ = id => document.getElementById(id);
    const on = () => { try { return localStorage.getItem(KEY) !== '0'; } catch (_) { return true; } };

    const css = document.createElement('style');
    css.textContent = `
    #game-detail-modal .stm-hero{display:none}
    #game-detail-modal .stm-switch{position:absolute;left:14px;top:12px;z-index:5;padding:5px 11px;border-radius:999px;font-size:11px;font-weight:800;color:#d1d5db;background:rgba(0,0,0,.5);border:1px solid rgba(255,255,255,.14);backdrop-filter:blur(8px);cursor:pointer;transition:background .2s,color .2s}
    #game-detail-modal .stm-switch:hover{background:rgba(0,0,0,.75);color:#fff}
    #game-detail-modal.mh-steam{--stm-rgb:139,92,246}
    #game-detail-modal.mh-steam .gd-panel{position:relative;padding:0!important;overflow-x:hidden}
    #game-detail-modal.mh-steam .stm-hero{display:block;position:absolute;left:0;right:0;top:0;height:310px;overflow:hidden;pointer-events:none;z-index:0}
    .stm-bg{width:100%;height:100%;object-fit:cover;filter:blur(24px) saturate(1.4) brightness(.72);transform:scale(1.3)}
    .stm-glow{position:absolute;inset:0;background:radial-gradient(110% 90% at 15% 0%,rgba(var(--stm-rgb),.6),transparent 62%),radial-gradient(70% 70% at 100% 0%,rgba(var(--stm-rgb),.25),transparent 70%)}
    .stm-fade{position:absolute;inset:0;background:linear-gradient(to bottom,rgba(8,8,14,.05),rgba(8,8,14,.5) 58%,rgba(13,13,20,.97) 100%)}
    #game-detail-modal.mh-steam #gd-body{position:relative;z-index:1;padding:84px 28px 28px}
    @media(max-width:640px){#game-detail-modal.mh-steam #gd-body{padding:70px 14px 20px}}
    #game-detail-modal.mh-steam #gd-body .gd-cover{width:230px;height:230px;box-shadow:0 24px 60px rgba(0,0,0,.75),0 0 0 1px rgba(255,255,255,.14),0 0 50px rgba(var(--stm-rgb),.35)}
    @media(max-width:640px){#game-detail-modal.mh-steam #gd-body .gd-cover{width:100%;height:auto;max-width:240px}}
    #game-detail-modal.mh-steam #gd-body h3{text-shadow:0 2px 18px rgba(0,0,0,.75)}
    /* кнопки действий — компактно в правом верхнем углу */
    #game-detail-modal.mh-steam #gd-body > .flex > .flex.shrink-0{position:absolute;top:-62px;right:0;flex-direction:row!important;flex-wrap:wrap;justify-content:flex-end;max-width:72%;align-self:auto}
    @media(max-width:640px){#game-detail-modal.mh-steam #gd-body > .flex > .flex.shrink-0{top:-56px;max-width:100%}}
    #game-detail-modal.mh-steam #gd-body > .flex{position:relative}
    #game-detail-modal.mh-steam .gd-tool{background:rgba(0,0,0,.5);border:1px solid rgba(255,255,255,.14);backdrop-filter:blur(8px);padding:6px 11px;font-size:12px}
    #game-detail-modal.mh-steam .gd-tool:hover{background:rgba(var(--stm-rgb),.45);border-color:rgba(var(--stm-rgb),.7)}
    /* статус — как кнопка «ИГРАТЬ» */
    .stm-pill{pointer-events:none;display:inline-flex;align-items:center;gap:8px;padding:11px 26px!important;border-radius:10px!important;font-size:15px!important;font-weight:900!important;letter-spacing:.06em;text-transform:uppercase;box-shadow:0 8px 24px rgba(0,0,0,.35)}
    /* плитки статистики одной полосой */
    #game-detail-modal.mh-steam .gdx-tiles{display:flex;flex-wrap:wrap;gap:0;margin-top:22px;padding:14px 6px;border-radius:14px;background:rgba(0,0,0,.4);border:1px solid rgba(255,255,255,.07)}
    #game-detail-modal.mh-steam .gdx-tile{flex:1 1 130px;background:none;border:0;border-left:1px solid rgba(255,255,255,.09);border-radius:0;padding:2px 18px;backdrop-filter:none}
    #game-detail-modal.mh-steam .gdx-tile:first-child{border-left:0}
    @media(max-width:640px){#game-detail-modal.mh-steam .gdx-tile{flex-basis:45%;border-left:0;padding:8px 12px}}
    .stm-bar{height:3px;border-radius:3px;background:rgba(255,255,255,.12);margin-top:7px;overflow:hidden}
    .stm-bar i{display:block;height:100%;border-radius:3px;background:linear-gradient(90deg,#fbbf24,#f59e0b)}
    /* секции */
    #game-detail-modal.mh-steam .gd-sec{background:rgba(0,0,0,.28);border:1px solid rgba(255,255,255,.06);border-radius:16px;padding:16px 18px}
    #game-detail-modal.mh-steam .gd-sec-title{border-left:3px solid rgb(var(--stm-rgb));padding-left:10px}
    `;
    document.head.appendChild(css);

    let hero, bg, sw;

    function build() {
        const m = $('game-detail-modal');
        const panel = m && m.querySelector('.gd-panel');
        if (!panel) return false;
        if (m.dataset.stm === '1') return true;
        m.dataset.stm = '1';
        hero = document.createElement('div'); hero.className = 'stm-hero'; hero.setAttribute('aria-hidden', 'true');
        hero.innerHTML = '<img class="stm-bg" alt=""><div class="stm-glow"></div><div class="stm-fade"></div>';
        bg = hero.firstElementChild;
        sw = document.createElement('button'); sw.type = 'button'; sw.className = 'stm-switch';
        sw.addEventListener('click', () => { try { localStorage.setItem(KEY, on() ? '0' : '1'); } catch (_) {} apply(); });
        panel.prepend(sw); panel.prepend(hero);
        apply();
        return true;
    }

    function apply() {
        const m = $('game-detail-modal'); if (!m) return;
        m.classList.toggle('mh-steam', on());
        if (sw) sw.textContent = on() ? '🎨 Классический вид' : '🎨 Steam-вид';
    }

    // средний насыщенный цвет обложки → акцент страницы
    function tint(src) {
        const m = $('game-detail-modal'); if (!m) return;
        m.style.removeProperty('--stm-rgb');
        const im = new Image();
        if (/^https?:/i.test(src)) im.crossOrigin = 'anonymous';
        im.onload = () => {
            try {
                const c = document.createElement('canvas'); c.width = c.height = 16;
                const x = c.getContext('2d'); x.drawImage(im, 0, 0, 16, 16);
                const d = x.getImageData(0, 0, 16, 16).data;
                let r = 0, g = 0, b = 0, w = 0;
                for (let i = 0; i < d.length; i += 4) {
                    const mx = Math.max(d[i], d[i + 1], d[i + 2]), mn = Math.min(d[i], d[i + 1], d[i + 2]);
                    const sat = mx ? (mx - mn) / mx : 0, wt = sat * sat * (mx / 255) + 0.02;
                    r += d[i] * wt; g += d[i + 1] * wt; b += d[i + 2] * wt; w += wt;
                }
                if (!w) return;
                let R = r / w, G = g / w, B = b / w;
                const k = 150 / Math.max(R, G, B, 1);            // подтягиваем яркость, чтобы тёмные обложки тоже давали заметный цвет
                if (k > 1) { R *= k; G *= k; B *= k; }
                m.style.setProperty('--stm-rgb', `${Math.round(R)},${Math.round(G)},${Math.round(B)}`);
            } catch (_) { /* картинка с чужого домена — остаётся фиолетовый */ }
        };
        im.src = src;
    }

    function sync() {
        if (!build()) return;
        const body = $('gd-body'); if (!body) return;
        const img = body.querySelector('.gd-cover img');
        if (img && img.src) { if (bg.getAttribute('src') !== img.src) { bg.src = img.src; tint(img.src); } bg.style.display = ''; }
        else { bg.removeAttribute('src'); bg.style.display = 'none'; $('game-detail-modal').style.removeProperty('--stm-rgb'); }
        // остальные скрипты достраивают страницу чуть позже — ждём
        setTimeout(decorate, 80);
    }

    function decorate() {
        const body = $('gd-body'); if (!body || !body.firstElementChild) return;
        // большая пилюля статуса под ценой
        if (!body.querySelector('.stm-pill')) {
            const st = body.querySelector('.gx-status.is-on');
            const price = body.querySelector(':scope > .flex .text-purple-300.font-bold');
            if (st && price) {
                const p = document.createElement('div');
                p.className = (st.className.replace(/\bgv-st\b/, '') + ' stm-pill').trim();
                p.textContent = st.textContent.trim();
                price.insertAdjacentElement('afterend', p);
            }
        }
        // прогресс-бар у плитки ачивок
        body.querySelectorAll('.gdx-tile').forEach(t => {
            if (t.querySelector('.stm-bar') || !/🏆/.test(t.textContent)) return;
            const pct = parseInt(t.querySelector('b')?.textContent, 10);
            if (pct >= 0) t.insertAdjacentHTML('beforeend', `<div class="stm-bar"><i style="width:${Math.min(100, pct)}%"></i></div>`);
        });
    }

    function init() {
        const body = $('gd-body'); if (!body) return;
        build();
        new MutationObserver(sync).observe(body, { childList: true });
    }
    if ($('gd-body')) init(); else document.addEventListener('DOMContentLoaded', init);
})();
