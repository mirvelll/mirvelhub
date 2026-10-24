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
    #game-detail-modal .stm-switch{position:absolute;left:14px;top:12px;z-index:5;padding:6px 12px;border-radius:999px;font-size:11px;font-weight:800;color:#d1d5db;background:rgba(0,0,0,.45);border:1px solid rgba(255,255,255,.14);backdrop-filter:blur(10px);cursor:pointer;transition:background .2s,color .2s}
    #game-detail-modal .stm-switch:hover{background:rgba(0,0,0,.75);color:#fff}
    #game-detail-modal.mh-steam{--stm-rgb:139,92,246;--stm-acc:color-mix(in srgb,rgb(var(--stm-rgb)) 62%,#fff)}
    #game-detail-modal.mh-steam .gd-panel{position:relative;padding:0!important;overflow-x:hidden;background:#0b0b12!important}

    /* ---------- баннер: высота подгоняется под шапку (см. fit() в JS), обложка всегда целиком внутри ---------- */
    #game-detail-modal.mh-steam .stm-hero{display:block;position:absolute;left:0;right:0;top:0;height:340px;overflow:hidden;pointer-events:none;z-index:0}
    .stm-bg{width:100%;height:100%;object-fit:cover;filter:blur(30px) saturate(1.5) brightness(.8);transform:scale(1.35)}
    .stm-glow{position:absolute;inset:0;background:radial-gradient(90% 120% at 12% 0%,rgba(var(--stm-rgb),.55),transparent 62%),radial-gradient(60% 80% at 100% 0%,rgba(var(--stm-rgb),.22),transparent 70%)}
    .stm-fade{position:absolute;inset:0;background:linear-gradient(to bottom,rgba(8,8,14,.25) 0%,rgba(8,8,14,.15) 40%,rgba(11,11,18,.82) 82%,#0b0b12 100%)}
    .stm-line{position:absolute;left:0;right:0;bottom:0;height:1px;background:linear-gradient(90deg,transparent,rgba(var(--stm-rgb),.8) 25%,rgba(var(--stm-rgb),.8) 75%,transparent);opacity:.7}

    #game-detail-modal.mh-steam #gd-body{position:relative;z-index:1;padding:58px 30px 30px}
    @media(max-width:640px){#game-detail-modal.mh-steam #gd-body{padding:58px 14px 20px}}
    #game-detail-modal.mh-steam #gd-body > .flex:first-child{position:relative;align-items:stretch;gap:26px}

    /* обложка */
    #game-detail-modal.mh-steam #gd-body .gd-cover{width:220px;height:220px;flex:0 0 auto;border-radius:16px;overflow:hidden;
        box-shadow:0 22px 50px rgba(0,0,0,.7),0 0 0 1px rgba(255,255,255,.16),0 0 46px rgba(var(--stm-rgb),.38);transition:transform .35s cubic-bezier(.2,.8,.2,1),box-shadow .35s}
    #game-detail-modal.mh-steam #gd-body .gd-cover:hover{transform:translateY(-3px) scale(1.015);box-shadow:0 28px 60px rgba(0,0,0,.75),0 0 0 1px rgba(255,255,255,.22),0 0 60px rgba(var(--stm-rgb),.55)}
    #game-detail-modal.mh-steam #gd-body .gd-cover img{width:100%;height:100%;object-fit:cover;display:block}
    @media(max-width:640px){#game-detail-modal.mh-steam #gd-body .gd-cover{width:100%;height:auto;aspect-ratio:1/1;max-width:240px;margin:0 auto}}

    /* инфо справа от обложки — по центру её высоты */
    #game-detail-modal.mh-steam #gd-body > .flex:first-child > .min-w-0{align-self:stretch;display:flex;flex-direction:column;justify-content:center;gap:10px;padding-right:0}
    #game-detail-modal.mh-steam #gd-body > .flex:first-child > .min-w-0 > *{margin:0!important}
    #game-detail-modal.mh-steam #gd-body h3{font-size:clamp(1.9rem,4vw,2.9rem)!important;line-height:1.04;letter-spacing:-.025em;text-shadow:0 3px 22px rgba(0,0,0,.8)}
    #game-detail-modal.mh-steam #gd-body h3::after{content:'';display:block;width:54px;height:4px;margin-top:12px;border-radius:999px;background:linear-gradient(90deg,rgb(var(--stm-rgb)),transparent);box-shadow:0 0 16px rgba(var(--stm-rgb),.6)}
    #game-detail-modal.mh-steam #gd-body .text-purple-300.font-bold{font-size:1.15rem!important;color:var(--stm-acc)!important;font-weight:900;letter-spacing:.01em;text-shadow:0 2px 12px rgba(0,0,0,.6)}
    #game-detail-modal.mh-steam .gd-chip{background:rgba(0,0,0,.4);border:1px solid rgba(255,255,255,.14);backdrop-filter:blur(8px)}

    /* кнопки действий — в правом верхнем углу, на одной линии с переключателем вида */
    #game-detail-modal.mh-steam #gd-body > .flex:first-child > .flex.shrink-0{position:absolute;top:-48px;right:0;flex-direction:row!important;flex-wrap:wrap;justify-content:flex-end;max-width:72%;align-self:auto}
    @media(max-width:640px){#game-detail-modal.mh-steam #gd-body > .flex:first-child > .flex.shrink-0{top:-50px;max-width:100%}}
    #game-detail-modal.mh-steam .gd-tool{background:rgba(0,0,0,.45);border:1px solid rgba(255,255,255,.14);backdrop-filter:blur(10px);padding:6px 12px;font-size:12px}
    #game-detail-modal.mh-steam .gd-tool:hover{background:rgba(var(--stm-rgb),.45);border-color:rgba(var(--stm-rgb),.75)}

    /* статус — как кнопка «ИГРАТЬ» */
    .stm-pill{pointer-events:none;align-self:flex-start;display:inline-flex;align-items:center;gap:9px;padding:12px 28px!important;border-radius:10px!important;font-size:15px!important;font-weight:900!important;letter-spacing:.07em;text-transform:uppercase;
        box-shadow:0 10px 28px rgba(0,0,0,.4),inset 0 1px 0 rgba(255,255,255,.2),inset 0 -2px 0 rgba(0,0,0,.18)}

    /* плитки статистики — одной полосой под баннером */
    #game-detail-modal.mh-steam .gdx-tiles{display:flex;flex-wrap:wrap;gap:0;margin-top:30px;padding:16px 8px;border-radius:16px;background:linear-gradient(180deg,rgba(255,255,255,.045),rgba(0,0,0,.35));border:1px solid rgba(255,255,255,.09);box-shadow:0 14px 40px rgba(0,0,0,.35)}
    #game-detail-modal.mh-steam .gdx-tile{flex:1 1 130px;background:none;border:0;border-left:1px solid rgba(255,255,255,.09);border-radius:0;padding:2px 20px;backdrop-filter:none}
    #game-detail-modal.mh-steam .gdx-tile:first-child{border-left:0}
    #game-detail-modal.mh-steam .gdx-tile small{color:color-mix(in srgb,rgb(var(--stm-rgb)) 55%,#9ca3af)}
    #game-detail-modal.mh-steam .gdx-tile b{font-size:1.55rem}
    @media(max-width:640px){#game-detail-modal.mh-steam .gdx-tile{flex-basis:45%;border-left:0;padding:8px 12px}}
    .stm-bar{height:4px;border-radius:4px;background:rgba(255,255,255,.12);margin-top:8px;overflow:hidden}
    .stm-bar i{display:block;height:100%;border-radius:4px;background:linear-gradient(90deg,#fbbf24,#f59e0b)}

    /* секции */
    #game-detail-modal.mh-steam .gd-sec{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:18px;padding:18px 20px}
    #game-detail-modal.mh-steam .gd-sec-title{display:flex;align-items:center;gap:10px}
    #game-detail-modal.mh-steam .gd-sec-title::before{content:'';width:4px;height:16px;border-radius:3px;background:linear-gradient(180deg,rgb(var(--stm-rgb)),transparent);flex:0 0 auto}
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
        hero.innerHTML = '<img class="stm-bg" alt=""><div class="stm-glow"></div><div class="stm-fade"></div><div class="stm-line"></div>';
        bg = hero.firstElementChild;
        sw = document.createElement('button'); sw.type = 'button'; sw.className = 'stm-switch';
        sw.addEventListener('click', () => { try { localStorage.setItem(KEY, on() ? '0' : '1'); } catch (_) {} apply(); });
        panel.prepend(sw); panel.prepend(hero);
        apply();
        return true;
    }

    // высота баннера = низ шапки (обложка + инфо) + запас: обложка всегда лежит целиком внутри баннера
    function fit() {
        const m = $('game-detail-modal'), body = $('gd-body');
        if (!m || !body || !hero || !m.classList.contains('mh-steam')) return;
        const hdr = body.firstElementChild;
        if (!hdr) return;
        hero.style.height = Math.min(560, Math.max(250, hdr.offsetTop + hdr.offsetHeight + 36)) + 'px';
    }

    function apply() {
        const m = $('game-detail-modal'); if (!m) return;
        m.classList.toggle('mh-steam', on());
        if (sw) sw.textContent = on() ? '🎨 Классический вид' : '🎨 Steam-вид';
        fit();
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
        fit();
        const ci = body.querySelector('.gd-cover img');
        if (ci && !ci.complete) ci.addEventListener('load', fit, { once: true });
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
        window.addEventListener('resize', fit);
        if (window.ResizeObserver) new ResizeObserver(fit).observe(body);
    }
    if ($('gd-body')) init(); else document.addEventListener('DOMContentLoaded', init);
})();
