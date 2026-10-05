/* =========================================================
   MIRVEL HUB — 27-design.js
   Дизайн-модуль. Работает поверх готовой разметки, не меняя остальные файлы.
   1) Прогресс-бары по платформам в «Играх»
   2) Нижняя панель навигации на телефоне
   3) Плавное появление карточек при входе на страницу
   4) Красивые пустые состояния в разделах
   5) Конфетти при новом достижении и новом уровне
   6) Режим «Полка» (корешки) для CD и винила
   7) «Стена обложек» (кнопка на главной)
   ========================================================= */
(() => {
    'use strict';
    const $ = id => document.getElementById(id);
    const E = s => (typeof esc === 'function' ? esc(s) : String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));
    const imgOk = v => { v = String(v || ''); return (/^data:image\//i.test(v) || /^https?:\/\//i.test(v)) ? v : ''; };
    const reduce = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ---------- стили ---------- */
    const css = document.createElement('style');
    css.textContent = `
    /* 1. прогресс по платформам */
    .mh-plat{margin-bottom:1.5rem}
    .mh-plat.hidden{display:none}
    .mh-plat-head{display:flex;flex-wrap:wrap;justify-content:space-between;gap:.5rem;font-size:.75rem;margin-bottom:.9rem}
    .mh-plat-head b{text-transform:uppercase;letter-spacing:.12em;color:#6b7280;font-weight:900}
    .mh-plat-head span{font-family:ui-monospace,monospace;font-weight:700;color:#22d3ee}
    .mh-plat-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:.55rem .9rem}
    .mh-plat-row{display:block;width:100%;text-align:left;background:none;border:0;padding:.4rem .5rem;border-radius:.7rem;cursor:pointer;color:inherit;transition:background .15s}
    .mh-plat-row:hover,.mh-plat-row:focus-visible{background:rgba(255,255,255,.06);outline:none}
    .mh-plat-top{display:flex;justify-content:space-between;gap:.5rem;font-size:.75rem;margin-bottom:.35rem}
    .mh-plat-top b{font-weight:800;color:#e5e7eb;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .mh-plat-top span{color:#9ca3af;font-family:ui-monospace,monospace;white-space:nowrap}
    .mh-bar{height:.5rem;border-radius:999px;background:rgba(255,255,255,.07);overflow:hidden}
    .mh-bar i{display:block;height:100%;border-radius:999px;background:var(--pc,#8b5cf6);transition:width .8s cubic-bezier(.2,.8,.2,1)}
    .mh-bar.is-done i{box-shadow:0 0 10px var(--pc,#8b5cf6)}

    /* 2. мобильная навигация */
    .mh-float{transition:bottom .2s}
    @media (max-width:767px){
      .nav-list{position:fixed!important;left:0;right:0;bottom:0;top:auto!important;z-index:50;display:flex!important;flex-direction:row!important;gap:.2rem!important;overflow-x:auto;
        padding:.4rem .5rem calc(.4rem + env(safe-area-inset-bottom,0px))!important;margin:0!important;background:rgba(12,12,20,.94);
        -webkit-backdrop-filter:blur(16px);backdrop-filter:blur(16px);border-top:1px solid rgba(255,255,255,.09);scrollbar-width:none}
      .nav-list::-webkit-scrollbar{display:none}
      .nav-list .nav-btn{flex:0 0 auto;width:auto!important;display:flex!important;flex-direction:column!important;align-items:center;justify-content:center;gap:.1rem!important;
        min-width:3.7rem;padding:.35rem .5rem!important;border:0;border-radius:.8rem;background:transparent;color:#9ca3af;font-size:.6rem!important;font-weight:700;line-height:1.1;text-align:center;cursor:pointer}
      .nav-list .nav-btn .nav-ico{font-size:1.25rem;line-height:1}
      .nav-list .nav-btn.is-active{background:color-mix(in srgb,var(--theme-btn,#8b5cf6) 28%,transparent);color:#fff}
      main{padding-bottom:6rem!important}
      .mh-float{bottom:calc(4.8rem + env(safe-area-inset-bottom,0px))!important}
    }

    /* 3. появление карточек */
    @keyframes mh-rise{from{opacity:0;transform:translateY(14px) scale(.98)}to{opacity:1;transform:none}}
    @media (prefers-reduced-motion:no-preference){
      .mh-stagger [id$="-grid"] > *{animation:mh-rise .45s cubic-bezier(.2,.8,.2,1) backwards}
      ${Array.from({ length: 12 }, (_, i) => `.mh-stagger [id$="-grid"] > *:nth-child(${i + 1}){animation-delay:${i * 45}ms}`).join('\n')}
    }

    /* 4. пустые состояния */
    .mh-empty{grid-column:1/-1;text-align:center;padding:3rem 1.5rem;border-radius:1.5rem;border:1px dashed rgba(255,255,255,.14);background:rgba(255,255,255,.03)}
    .mh-empty .e-ico{font-size:3rem;line-height:1;display:block;margin-bottom:.8rem;animation:mh-float 3.5s ease-in-out infinite}
    .mh-empty .e-t{font-weight:900;font-size:1.05rem;color:#e5e7eb}
    .mh-empty .e-s{font-size:.8rem;color:#9ca3af;margin-top:.3rem}
    @keyframes mh-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
    @media (prefers-reduced-motion:reduce){.mh-empty .e-ico{animation:none}}

    /* кнопки модуля */
    .mh-btn{font-size:.75rem;padding:.45rem .85rem;border-radius:.7rem;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.05);color:#d1d5db;font-weight:700;cursor:pointer;transition:all .15s}
    .mh-btn:hover{color:#fff;background:rgba(255,255,255,.1)}
    .mh-btn.is-on{border-color:#8b5cf6;background:rgba(139,92,246,.2);color:#fff}
    .mh-toolrow{display:flex;flex-wrap:wrap;gap:.5rem;margin:0 0 1.25rem}

    /* 6. полка */
    .mh-shelf{--H:200px;display:flex;flex-wrap:wrap;align-items:flex-start;align-content:flex-start;column-gap:3px;row-gap:12px;padding:14px .75rem 0;border-radius:1rem;
      background-origin:content-box;background-repeat:repeat-y;
      background-image:repeating-linear-gradient(to bottom,transparent 0,transparent var(--H),#6b4423 var(--H),#3a2312 calc(var(--H) + 12px))}
    .mh-slot{display:flex;align-items:flex-end;height:var(--H)}
    .mh-endline{flex:0 0 100%;height:1px}
    .mh-spine{position:relative;display:block;padding:0;border:0;border-radius:3px 3px 1px 1px;cursor:pointer;overflow:visible;
      box-shadow:1px 0 0 rgba(255,255,255,.08) inset,-1px 0 0 rgba(0,0,0,.35) inset;transition:transform .2s cubic-bezier(.2,.8,.2,1)}
    .mh-spine::before{content:'';position:absolute;inset:0;border-radius:inherit;pointer-events:none;background:linear-gradient(90deg,rgba(0,0,0,.38),transparent 22%,transparent 78%,rgba(0,0,0,.32))}
    .mh-spine:hover,.mh-spine:focus-visible{transform:translateY(-14px);z-index:5;outline:none}
    .mh-spine:focus-visible{box-shadow:0 0 0 2px #22d3ee}
    .mh-spine-t{position:absolute;inset:6px 0;display:flex;align-items:center;justify-content:center;writing-mode:vertical-rl;transform:rotate(180deg);
      font-size:10px;font-weight:800;letter-spacing:.02em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;pointer-events:none}
    .mh-spine-cv{position:absolute;bottom:calc(100% + 8px);left:50%;width:130px;height:130px;object-fit:cover;border-radius:10px;box-shadow:0 10px 30px rgba(0,0,0,.6);
      opacity:0;transform:translateX(-50%) scale(.9);transition:all .18s;pointer-events:none;z-index:6;border:1px solid rgba(255,255,255,.2)}
    .mh-spine:hover .mh-spine-cv,.mh-spine:focus-visible .mh-spine-cv{opacity:1;transform:translateX(-50%) scale(1)}
    .mh-shelf-range{width:110px;align-self:center;accent-color:var(--theme-btn,#8b5cf6);cursor:pointer}
    /* стеллаж: доска с текстурой дерева, табличка, блики и фактура корешков */
    .mh-shelf{background-image:repeating-linear-gradient(to bottom,transparent 0,transparent var(--H),#7a4f2a var(--H),#5a3a1e calc(var(--H) + 3px),#3a2312 calc(var(--H) + 12px));
      box-shadow:inset 0 14px 22px -14px rgba(0,0,0,.55),inset 0 -2px 0 rgba(255,255,255,.04);background-color:rgba(0,0,0,.18)}
    .mh-plate{flex:0 0 100%;display:flex;justify-content:center;margin:-4px 0 6px}
    .mh-plate span{display:inline-flex;align-items:center;gap:.6rem;padding:.2rem 1rem;border-radius:.35rem;font-size:.62rem;font-weight:900;letter-spacing:.22em;text-transform:uppercase;color:#3b2a10;
      background:linear-gradient(180deg,#f3d98b,#c9a24a 55%,#a57f2f);box-shadow:0 2px 6px rgba(0,0,0,.5),inset 0 1px 0 rgba(255,255,255,.55)}
    .mh-plate i{font-style:normal;font-family:ui-monospace,monospace;letter-spacing:.05em;opacity:.7}
    .mh-spine::after{content:'';position:absolute;inset:0;border-radius:inherit;pointer-events:none;mix-blend-mode:soft-light}
    /* картон винила: зерно + светлая кромка сверху */
    #mh-shelf-vinyls .mh-spine::after{background:repeating-linear-gradient(0deg,rgba(255,255,255,.07) 0 1px,transparent 1px 3px),linear-gradient(180deg,rgba(255,255,255,.35),transparent 18%)}
    /* пластик CD: глянцевая вертикальная полоса и «шарнир» */
    #mh-shelf-cds .mh-spine::after{background:linear-gradient(90deg,transparent 12%,rgba(255,255,255,.5) 24%,transparent 38%),linear-gradient(180deg,rgba(255,255,255,.25),transparent 12%,transparent 88%,rgba(255,255,255,.18))}
    /* коробка игры: цветная верхняя планка */
    #mh-shelf-games .mh-spine::after{background:linear-gradient(180deg,rgba(255,255,255,.4) 0,rgba(255,255,255,.4) 7%,transparent 7%),linear-gradient(90deg,rgba(255,255,255,.18),transparent 30%)}
    .mh-spine:hover,.mh-spine:focus-visible{filter:brightness(1.18);box-shadow:0 0 0 1px rgba(var(--theme-rgb,139,92,246),.7),0 10px 22px rgba(0,0,0,.5),1px 0 0 rgba(255,255,255,.08) inset}
    .mh-shelf-note{font-size:.7rem;color:#9ca3af;margin:0 0 .6rem}

    /* 7. стена обложек */
    .mh-wall{position:fixed;inset:0;z-index:85;background:rgba(6,6,12,.97);display:flex;flex-direction:column}
    .mh-wall.hidden{display:none}
    .mh-wall-top{display:flex;flex-wrap:wrap;gap:.5rem;align-items:center;padding:.8rem 1rem;border-bottom:1px solid rgba(255,255,255,.08)}
    .mh-wall-top b{font-weight:900;margin-right:auto}
    .mh-wall-body{flex:1;overflow-y:auto;padding:4px;display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:4px;align-content:start}
    .mh-tile{position:relative;aspect-ratio:1;padding:0;border:0;background:#111;overflow:hidden;cursor:pointer;border-radius:4px}
    .mh-tile img{width:100%;height:100%;object-fit:cover;display:block;transition:transform .3s}
    .mh-tile:hover img,.mh-tile:focus-visible img{transform:scale(1.12)}
    .mh-tile:focus-visible{outline:2px solid #22d3ee;z-index:2}
    .mh-tile span{position:absolute;left:0;right:0;bottom:0;padding:1.4rem .4rem .35rem;font-size:10px;font-weight:800;text-align:left;color:#fff;
      background:linear-gradient(transparent,rgba(0,0,0,.85));opacity:0;transition:opacity .2s;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .mh-tile:hover span,.mh-tile:focus-visible span{opacity:1}
    .mh-flash{outline:3px solid #22d3ee;outline-offset:4px;border-radius:1.25rem;transition:outline-color .4s}
    `;
    document.head.appendChild(css);

    /* =========================================================
       1. Прогресс по платформам
       ========================================================= */
    const NOT_COUNTED = ['online', 'sandbox', 'skipped', 'app'];
    const platColor = n => {
        n = String(n || '');
        if (/^(playstation|ps\b|psp)/i.test(n)) return '#3b82f6';
        if (/^xbox/i.test(n)) return '#22c55e';
        if (/nintendo|wii|switch|snes|game boy|\bds\b|3ds/i.test(n)) return '#ef4444';
        if (/sega/i.test(n)) return '#06b6d4';
        if (/^steam/i.test(n)) return '#1b9ad6';
        if (/epic|gog|^pc/i.test(n)) return '#9ca3af';
        return '#a78bfa';
    };

    function renderPlat() {
        const grid = $('games-grid');
        if (!grid) return;
        let box = $('mh-plat');
        const games = Array.isArray(data.games) ? data.games : [];
        if (!games.length) { box && box.classList.add('hidden'); return; }
        if (!box) {
            box = document.createElement('div');
            box.id = 'mh-plat';
            box.className = 'glass no-hover rounded-2xl p-5 mh-plat';
            const strip = $('game-strip');
            const ref = strip || $('game-platform-filters') || grid;
            ref.insertAdjacentElement(strip ? 'afterend' : 'beforebegin', box);
            box.addEventListener('click', e => {
                const row = e.target.closest('[data-plat-name]');
                if (!row) return;
                const name = row.dataset.platName;
                const btn = [...document.querySelectorAll('#game-platform-filters [data-plat]')].find(b => b.getAttribute('data-plat') === name);
                if (btn) btn.click();
                $('game-platform-filters')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            });
        }
        box.classList.remove('hidden');

        const by = new Map();
        games.forEach(g => {
            const p = g.platform || 'Другое';
            const r = by.get(p) || { name: p, total: 0, countable: 0, done: 0 };
            r.total++;
            if (!NOT_COUNTED.includes(g.status)) { r.countable++; if (g.status === 'completed') r.done++; }
            by.set(p, r);
        });
        const rows = [...by.values()].sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, 'ru'));
        const all = rows.reduce((s, r) => ({ c: s.c + r.countable, d: s.d + r.done }), { c: 0, d: 0 });
        const pctAll = all.c ? Math.round(all.d / all.c * 100) : 0;

        box.innerHTML = `
            <div class="mh-plat-head"><b>Прогресс по платформам</b><span>Всего пройдено: ${all.d} из ${all.c} · ${pctAll}%</span></div>
            <div class="mh-bar ${pctAll === 100 ? 'is-done' : ''}" style="--pc:#22d3ee;margin-bottom:1rem" role="img" aria-label="Всего пройдено ${pctAll}%"><i style="width:${pctAll}%"></i></div>
            <div class="mh-plat-grid">${rows.map(r => {
                const pct = r.countable ? Math.round(r.done / r.countable * 100) : 0;
                const extra = r.total - r.countable;
                return `<button type="button" class="mh-plat-row" data-plat-name="${E(r.name)}" title="Показать только ${E(r.name)}">
                    <div class="mh-plat-top"><b>${E(r.name)}</b><span>${r.done} из ${r.countable}${extra ? ` (+${extra})` : ''} · ${pct}%</span></div>
                    <div class="mh-bar ${pct === 100 ? 'is-done' : ''}" style="--pc:${platColor(r.name)}"><i style="width:${pct}%"></i></div>
                </button>`;
            }).join('')}</div>`;
    }

    /* =========================================================
       2. Мобильная навигация: переносим .nav-list в body (у .sidebar может быть blur,
          из-за него fixed-элементы внутри «прилипают» к сайдбару)
       ========================================================= */
    function setupNav() {
        const nav = document.querySelector('.nav-list');
        if (!nav || !nav.parentNode) return;
        const ph = document.createComment('nav-list');
        nav.parentNode.insertBefore(ph, nav);
        const mq = window.matchMedia('(max-width:767px)');
        const place = () => {
            if (mq.matches) document.body.appendChild(nav);
            else if (ph.parentNode) ph.parentNode.insertBefore(nav, ph.nextSibling);
        };
        (mq.addEventListener ? mq.addEventListener('change', place) : mq.addListener(place));
        place();
        document.querySelector('button[onclick="toggleNotes()"]')?.parentElement?.classList.add('mh-float');
    }

    /* =========================================================
       4. Пустые состояния
       ========================================================= */
    const EMPTY = {
        cds:       { grid: 'cd-grid',       ico: '💿', t: 'На полке пока тихо',       s: 'Добавь первый диск кнопкой «+ Новый CD»' },
        vinyls:    { grid: 'vinyl-grid',    ico: '💽', t: 'Виниловая полка пуста',     s: 'Нажми «+ Новая пластинка», чтобы поставить первую' },
        stuff:     { grid: 'stuff-grid',    ico: '📦', t: 'Здесь пока нет вещей',      s: 'Мерч, техника и всё остальное добавляется кнопкой «+ Новый предмет»' },
        wishlists: { grid: 'wishlist-grid', ico: '🎁', t: 'Список желаний пуст',       s: 'Добавь то, о чём мечтаешь, и сайт посчитает, за сколько месяцев это реально' }
    };
    function syncEmpty(key) {
        const cfg = EMPTY[key], g = $(cfg.grid);
        if (!g) return;
        const real = [...g.children].filter(c => !c.classList.contains('mh-empty'));
        const ex = g.querySelector(':scope > .mh-empty');
        if (real.length) { ex && ex.remove(); return; }
        const filtered = (data[key] || []).length > 0;
        const k = filtered ? 'f' : 'e';
        if (ex && ex.dataset.k === k) return;
        ex && ex.remove();
        const d = document.createElement('div');
        d.className = 'mh-empty';
        d.dataset.k = k;
        d.innerHTML = filtered
            ? `<span class="e-ico" aria-hidden="true">🔎</span><div class="e-t">Ничего не нашлось</div><div class="e-s">Попробуй изменить поиск или сбросить фильтры</div>`
            : `<span class="e-ico" aria-hidden="true">${cfg.ico}</span><div class="e-t">${cfg.t}</div><div class="e-s">${cfg.s}</div>`;
        g.appendChild(d);
    }

    /* =========================================================
       5. Конфетти
       ========================================================= */
    function confetti() {
        if (reduce()) return;
        const c = document.createElement('canvas');
        c.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:95';
        c.width = innerWidth; c.height = innerHeight;
        document.body.appendChild(c);
        const ctx = c.getContext('2d');
        const theme = (getComputedStyle(document.body).getPropertyValue('--theme-btn') || '').trim();
        const colors = [theme || '#8b5cf6', '#22d3ee', '#f472b6', '#facc15', '#34d399', '#ffffff'];
        const P = Array.from({ length: 150 }, () => ({
            x: innerWidth / 2 + (Math.random() - .5) * 240, y: innerHeight * .4,
            vx: (Math.random() - .5) * 15, vy: -Math.random() * 14 - 4,
            s: 5 + Math.random() * 7, r: Math.random() * 6.28, vr: (Math.random() - .5) * .4,
            c: colors[(Math.random() * colors.length) | 0]
        }));
        const t0 = performance.now(), DUR = 2800;
        (function frame(t) {
            const dt = t - t0;
            ctx.clearRect(0, 0, c.width, c.height);
            P.forEach(p => {
                p.vy += .36; p.x += p.vx; p.y += p.vy; p.vx *= .99; p.r += p.vr;
                ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r);
                ctx.globalAlpha = Math.max(0, 1 - dt / DUR); ctx.fillStyle = p.c;
                ctx.fillRect(-p.s / 2, -p.s / 3, p.s, p.s * .6); ctx.restore();
            });
            if (dt < DUR) requestAnimationFrame(frame); else c.remove();
        })(t0);
    }
    let base = null;
    const snap = () => ({ lvl: Math.floor((Number(data.xp) || 0) / 500) + 1, ach: (data.unlockedAchievements || []).length });
    function milestones() {
        if (!base) return;
        const now = snap();
        const up = now.lvl > base.lvl || now.ach > base.ach;
        base = now;
        if (up) confetti();
    }
    ['save', 'addXP'].forEach(name => {
        const orig = window[name];
        if (typeof orig !== 'function') return;
        window[name] = function (...a) { const r = orig.apply(this, a); try { milestones(); } catch (_) {} return r; };
    });
    document.addEventListener('mirvel-ready', () => { base = snap(); }, { once: true });

    /* =========================================================
       Цвет обложки (для корешков)
       ========================================================= */
    const colorCache = new Map();
    function domColor(src, cb) {
        if (colorCache.has(src)) return cb(colorCache.get(src));
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            let res = null;
            try {
                const cv = document.createElement('canvas'); cv.width = cv.height = 24;
                const cx = cv.getContext('2d', { willReadFrequently: true });
                cx.drawImage(img, 0, 0, 24, 24);
                const d = cx.getImageData(0, 0, 24, 24).data;
                let r = 0, g = 0, b = 0, w = 0;
                for (let i = 0; i < d.length; i += 4) {
                    const mx = Math.max(d[i], d[i + 1], d[i + 2]), mn = Math.min(d[i], d[i + 1], d[i + 2]), l = (mx + mn) / 2;
                    if (d[i + 3] < 128 || l < 25 || l > 235) continue;
                    const k = (mx - mn) + 12;
                    r += d[i] * k; g += d[i + 1] * k; b += d[i + 2] * k; w += k;
                }
                if (w) {
                    r = Math.round(r / w); g = Math.round(g / w); b = Math.round(b / w);
                    res = { css: `rgb(${r},${g},${b})`, dark: (0.299 * r + 0.587 * g + 0.114 * b) < 150 };
                }
            } catch (_) { /* картинка с чужого сайта без CORS — берём запасной цвет */ }
            colorCache.set(src, res); cb(res);
        };
        img.onerror = () => { colorCache.set(src, null); cb(null); };
        img.src = src;
    }
    const hash = s => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); };

    /* =========================================================
       6. Режим «Полка»
       ========================================================= */
    const SHELF = { cds: { grid: 'cd-grid', w: 22, h: 175 }, vinyls: { grid: 'vinyl-grid', w: 13, h: 215 }, games: { grid: 'games-grid', w: 16, h: 190, attr: 'gid' } };
    const PLATE = { cds: 'CD', vinyls: 'Винил', games: 'Игры' };
    const shelfScale = k => { const v = Number(data.shelfScale && data.shelfScale[k]); return v >= 0.5 && v <= 1.8 ? v : 1; };
    const shelfOn = k => !!(data.shelfMode && data.shelfMode[k]);

    function buildShelf(key) {
        const cfg = SHELF[key], grid = $(cfg.grid);
        if (!grid) return;
        let box = $('mh-shelf-' + key);
        const on = shelfOn(key);
        grid.style.display = on ? 'none' : '';
        if (!on) { box && box.remove(); return; }
        if (!box) {
            box = document.createElement('div');
            box.id = 'mh-shelf-' + key;
            grid.insertAdjacentElement('afterend', box);
            box.addEventListener('click', e => {
                const sp = e.target.closest('[data-sid]');
                if (!sp) return;
                const card = document.querySelector(`#${cfg.grid} [data-${cfg.attr || 'mid'}="${sp.dataset.sid}"]`);
                card && card.click();
            });
        }
        const attr = cfg.attr || 'mid', sc = shelfScale(key);
        const ids = [...grid.children].filter(c => c.dataset && c.dataset[attr]).map(c => Number(c.dataset[attr]));
        const items = ids.map(id => (data[key] || []).find(x => x.id === id)).filter(Boolean);
        if (!items.length) {
            box.className = '';
            box.removeAttribute('style');
            const em = EMPTY[key] || { ico: '🎮', t: 'Игр пока нет' };
            box.innerHTML = `<div class="mh-empty"><span class="e-ico" aria-hidden="true">${(data[key] || []).length ? '🔎' : em.ico}</span><div class="e-t">${(data[key] || []).length ? 'Ничего не нашлось' : em.t}</div></div>`;
            return;
        }
        box.className = 'mh-shelf';
        box.dataset.k = key;
        box.style.setProperty('--H', Math.round(cfg.h * sc) + 'px');
        box.innerHTML = `<div class="mh-plate"><span>${E(PLATE[key] || key)} <i>${items.length}</i></span></div>` + items.map(i => {
            const title = String(i.title || ''), artist = String(i.artist || '');
            const plat = key === 'games' ? String(i.platform || '') : '';
            const full = artist ? `${artist} — ${title}` : (plat ? `${title} (${plat})` : title);
            const h = hash(full);
            const w = Math.round((cfg.w + (h % 7) - 3) * sc);
            const hh = Math.round((cfg.h - 10 - (h % 5) * 6) * sc);
            const bg = plat ? `color-mix(in srgb, ${platColor(plat)} 55%, #000)` : `hsl(${h % 360} 42% 30%)`;
            const src = imgOk(i.img);
            return `<div class="mh-slot"><button type="button" class="mh-spine" data-sid="${i.id}" title="${E(full)}" aria-label="${E(full)}"
                style="width:${Math.max(9, w)}px;height:${hh}px;background:${bg};color:#fff">
                <span class="mh-spine-t">${E(full)}</span>${src ? `<img class="mh-spine-cv" src="${E(src)}" alt="" loading="lazy">` : ''}</button></div>`;
        }).join('') + '<div class="mh-endline"></div>';
        items.forEach(i => {
            const src = imgOk(i.img);
            if (!src) return;
            domColor(src, c => {
                if (!c) return;
                const el = box.querySelector(`[data-sid="${i.id}"]`);
                if (el) { el.style.background = c.css; el.style.color = c.dark ? '#fff' : '#111'; }
            });
        });
    }

    function ensureShelfBtn(key) {
        const grid = $(SHELF[key].grid);
        if (!grid) return;
        const section = grid.closest('section');
        if (!section || section.querySelector(`[data-mh-shelf="${key}"]`)) return;
        let row = section.querySelector(`[data-bulk-tools="${key}"]`) || section.querySelector('.mh-toolrow');
        if (!row) {
            row = document.createElement('div');
            row.className = 'mh-toolrow';
            grid.insertAdjacentElement('beforebegin', row);
        }
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'mh-btn';
        b.dataset.mhShelf = key;
        row.appendChild(b);
        const r = document.createElement('input');
        r.type = 'range'; r.min = '60'; r.max = '160'; r.step = '5';
        r.className = 'mh-shelf-range'; r.dataset.mhShelfSize = key;
        r.title = 'Размер корешков'; r.setAttribute('aria-label', 'Размер корешков');
        r.value = String(Math.round(shelfScale(key) * 100));
        row.appendChild(r);
        r.addEventListener('input', () => {
            if (!data.shelfScale) data.shelfScale = {};
            data.shelfScale[key] = Number(r.value) / 100;
            cancelAnimationFrame(r._f);
            r._f = requestAnimationFrame(() => buildShelf(key));
        });
        r.addEventListener('change', () => { try { persistData(); } catch (_) {} });
        b.addEventListener('click', () => {
            if (!data.shelfMode) data.shelfMode = {};
            data.shelfMode[key] = !shelfOn(key);
            try { persistData(); } catch (_) {}
            if (typeof showToast === 'function') showToast(shelfOn(key) ? 'Режим «Полка»: наведи на корешок, нажми, чтобы открыть 📚' : 'Обычный вид');
            syncShelfBtn(key); buildShelf(key);
        });
        syncShelfBtn(key);
    }
    function syncShelfBtn(key) {
        const b = document.querySelector(`[data-mh-shelf="${key}"]`);
        if (!b) return;
        b.classList.toggle('is-on', shelfOn(key));
        b.textContent = shelfOn(key) ? '📚 Полка: вкл' : '📚 Полка';
        const r = document.querySelector(`[data-mh-shelf-size="${key}"]`);
        if (r) r.style.display = shelfOn(key) ? '' : 'none';
    }

    /* =========================================================
       7. Стена обложек
       ========================================================= */
    const WALL_SECTIONS = [['cds', '💿 CD'], ['vinyls', '💽 Винил'], ['games', '🎮 Игры'], ['stuff', '📦 Вещи'], ['wishlists', '🎁 Желаемое']];
    let wall = null, wallFilter = '', wallShuffle = false;

    function wallItems() {
        const out = [];
        WALL_SECTIONS.forEach(([k]) => {
            if (wallFilter && wallFilter !== k) return;
            (data[k] || []).forEach(i => { const s = imgOk(i.img); if (s) out.push({ k, id: i.id, src: s, t: i.artist ? `${i.artist} — ${i.title}` : (i.title || '') }); });
        });
        if (wallShuffle) for (let i = out.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [out[i], out[j]] = [out[j], out[i]]; }
        return out;
    }
    function renderWall() {
        if (!wall) return;
        const items = wallItems();
        wall.querySelector('.mh-wall-top').innerHTML = `<b>🖼 Стена обложек · ${items.length}</b>` +
            [['', 'Все'], ...WALL_SECTIONS].map(([k, l]) => `<button type="button" class="mh-btn ${wallFilter === k ? 'is-on' : ''}" data-wf="${k}">${l}</button>`).join('') +
            `<button type="button" class="mh-btn" data-wshuffle>🔀 Перемешать</button><button type="button" class="mh-btn" data-wfull>⛶ На весь экран</button><button type="button" class="mh-btn" data-wclose aria-label="Закрыть">✕</button>`;
        wall.querySelector('.mh-wall-body').innerHTML = items.length
            ? items.map(t => `<button type="button" class="mh-tile" data-wk="${t.k}" data-wid="${t.id}" title="${E(t.t)}"><img src="${E(t.src)}" alt="" loading="lazy"><span>${E(t.t)}</span></button>`).join('')
            : `<div class="mh-empty" style="grid-column:1/-1;margin:1rem"><span class="e-ico">🖼</span><div class="e-t">Пока нет обложек</div><div class="e-s">Добавь обложки к своим предметам, и здесь появится мозаика</div></div>`;
    }
    function openWall() {
        if (!wall) {
            wall = document.createElement('div');
            wall.className = 'mh-wall hidden';
            wall.setAttribute('role', 'dialog'); wall.setAttribute('aria-modal', 'true'); wall.setAttribute('aria-label', 'Стена обложек');
            wall.innerHTML = '<div class="mh-wall-top"></div><div class="mh-wall-body"></div>';
            document.body.appendChild(wall);
            wall.addEventListener('click', e => {
                const t = e.target;
                const tile = t.closest('[data-wk]');
                if (tile) return openItem(tile.dataset.wk, Number(tile.dataset.wid));
                const f = t.closest('[data-wf]');
                if (f) { wallFilter = f.dataset.wf; return renderWall(); }
                if (t.closest('[data-wshuffle]')) { wallShuffle = true; return renderWall(); }
                if (t.closest('[data-wfull]')) { (document.fullscreenElement ? document.exitFullscreen() : wall.requestFullscreen?.())?.catch?.(() => {}); return; }
                if (t.closest('[data-wclose]')) closeWall();
            });
        }
        wallShuffle = false;
        renderWall();
        wall.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }
    function closeWall() {
        if (!wall) return;
        if (document.fullscreenElement) document.exitFullscreen?.().catch?.(() => {});
        wall.classList.add('hidden');
        document.body.style.overflow = '';
    }
    window.addEventListener('keydown', e => { if (e.key === 'Escape' && wall && !wall.classList.contains('hidden')) closeWall(); });

    function openItem(key, id) {
        closeWall();
        if (typeof showPage === 'function') showPage(key);
        let tries = 0;
        const timer = setInterval(() => {
            const el = document.querySelector(key === 'games' ? `.game-card[data-gid="${id}"]` : `[data-mid="${id}"][data-mkey="${key}"]`);
            if (el) {
                clearInterval(timer);
                el.scrollIntoView({ block: 'center', behavior: reduce() ? 'auto' : 'smooth' });
                el.classList.add('mh-flash');
                setTimeout(() => el.classList.remove('mh-flash'), 1800);
                if (key === 'cds' || key === 'vinyls' || key === 'games') setTimeout(() => el.click(), 350);
            } else if (++tries > 25) clearInterval(timer);
        }, 80);
    }

    function addWallBtn() {
        if ($('mh-wall-btn')) return;
        const crate = document.querySelector('button[onclick="openCrateDigger()"]');
        if (!crate || !crate.parentElement) return;
        const b = document.createElement('button');
        b.id = 'mh-wall-btn';
        b.type = 'button';
        b.className = 'mh-btn';
        b.style.cssText = 'flex:1 1 auto;padding:.75rem 1.25rem;border-radius:1rem;font-size:.875rem';
        b.textContent = '🖼 Стена обложек';
        b.onclick = openWall;
        crate.parentElement.appendChild(b);
    }

    /* =========================================================
       Запуск
       ========================================================= */
    // плавное появление при смене страницы
    const origShowPage = window.showPage;
    if (typeof origShowPage === 'function') {
        window.showPage = function (id, ...rest) {
            const r = origShowPage.call(this, id, ...rest);
            const sec = $(id);
            if (sec && !reduce()) {
                sec.classList.add('mh-stagger');
                setTimeout(() => sec.classList.remove('mh-stagger'), 900);
            }
            return r;
        };
    }

    function init() {
        setupNav();
        addWallBtn();
        Object.keys(SHELF).forEach(ensureShelfBtn);

        const games = $('games-grid');
        if (games) { new MutationObserver(renderPlat).observe(games, { childList: true }); renderPlat(); }

        Object.keys(EMPTY).forEach(key => {
            const g = $(EMPTY[key].grid);
            if (!g) return;
            new MutationObserver(() => { syncEmpty(key); if (SHELF[key]) { ensureShelfBtn(key); buildShelf(key); } }).observe(g, { childList: true });
            syncEmpty(key);
        });
        if (games) new MutationObserver(() => { ensureShelfBtn('games'); buildShelf('games'); }).observe(games, { childList: true });
        // режим выбора из 25-bulk.js работает с обычной сеткой — на время выбора выключаем «Полку»
        Object.keys(SHELF).forEach(key => {
            const g = $(SHELF[key].grid);
            if (!g) return;
            new MutationObserver(() => {
                if (g.hasAttribute('data-bulk-active') && shelfOn(key)) {
                    data.shelfMode[key] = false;
                    try { persistData(); } catch (_) {}
                    syncShelfBtn(key); buildShelf(key);
                }
            }).observe(g, { attributes: true, attributeFilter: ['data-bulk-active'] });
            buildShelf(key);
        });
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
