/* =========================================================
   MIRVEL HUB — 30-collection-ui.js (подключать после 29-games-page.js)
   1) ⭐ Избранное: звёздка на карточках и на странице релиза + ряд «Любимое» на главной (поле item.fav)
   2) ☰ Режим «Список» для CD, винила, игр, вещей и желаемого (data.listMode)
   3) 🎛 «Настроить» для главной, CD, винила, вещей, желаемого: скрыть блоки, размер карточек (data.pageView)
      (для «Игр» то же самое делает 29-games-page.js)
   4) Плавное «приземление» новой карточки + виброотклик на телефоне
   5) Диск выезжает из-за обложки на странице релиза CD / винила
   Все поля необязательные: старые данные не ломаются.
   Зависимости: 27-design.js (.mh-btn, .mh-empty, .mh-flash), 29-games-page.js (стили .mgp-*).
   ========================================================= */
(() => {
    'use strict';
    const $ = id => document.getElementById(id);
    const E = s => (typeof esc === 'function' ? esc(s) : String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));
    const imgOk = v => { v = String(v || ''); return (/^data:image\//i.test(v) || /^https?:\/\//i.test(v)) ? v : ''; };
    const reduce = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    const save = () => { try { persistData(); } catch (_) {} };
    const toast = (m, t) => { try { showToast(m, t); } catch (_) {} };
    const K_HAPTIC = 'mirvel_haptics';
    const buzz = p => {
        let on = '1'; try { on = localStorage.getItem(K_HAPTIC); } catch (_) {}
        if (on !== '0' && navigator.vibrate) { try { navigator.vibrate(p); } catch (_) {} }
    };

    const SECTIONS = {
        cds:       { page: 'cds',       grid: 'cd-grid',       attr: 'mid', ico: '💿', label: 'CD' },
        vinyls:    { page: 'vinyls',    grid: 'vinyl-grid',    attr: 'mid', ico: '💽', label: 'Винил' },
        games:     { page: 'games',     grid: 'games-grid',    attr: 'gid', ico: '🎮', label: 'Игры' },
        stuff:     { page: 'stuff',     grid: 'stuff-grid',    attr: 'mid', ico: '📦', label: 'Вещи' },
        wishlists: { page: 'wishlists', grid: 'wishlist-grid', attr: 'mid', ico: '🎁', label: 'Желаемое' }
    };
    const itemOf = (key, id) => (data[key] || []).find(x => x.id === Number(id));
    const cardOf = (key, id) => document.querySelector(`#${SECTIONS[key].grid} [data-${SECTIONS[key].attr}="${id}"]`);

    /* ---------- стили ---------- */
    const css = document.createElement('style');
    css.textContent = `
    [data-mh-hidden]{display:none!important}

    /* избранное */
    .mh-fav{position:absolute;top:8px;left:8px;z-index:25;width:32px;height:32px;border-radius:999px;font-size:17px;line-height:1;color:#fff;
      display:flex;align-items:center;justify-content:center;cursor:pointer;background:rgba(0,0,0,.5);border:1px solid rgba(255,255,255,.22);
      -webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);opacity:0;transform:scale(.85);transition:opacity .2s,transform .25s cubic-bezier(.2,.8,.2,1),color .2s}
    *:hover > .mh-fav,.mh-fav:focus-visible,.mh-fav.is-on{opacity:1;transform:none}
    .mh-fav.is-on{color:#facc15;border-color:rgba(250,204,21,.65);box-shadow:0 0 14px rgba(250,204,21,.35)}
    @media (hover:none){.mh-fav{opacity:1;transform:none}}
    .game-card > .mh-fav{top:34px;left:6px}
    .mh-fav-row-box{padding:1.25rem 1.4rem;border-radius:1.5rem;margin-bottom:2.5rem}
    .mh-fav-scroll{display:flex;gap:.8rem;overflow-x:auto;padding:.3rem .1rem .6rem;scrollbar-width:thin}
    .mh-fav-tile{flex:0 0 auto;width:112px;text-align:left;background:none;border:0;padding:0;cursor:pointer;color:inherit}
    .mh-fav-tile .cv{position:relative;aspect-ratio:1;border-radius:.9rem;overflow:hidden;background:rgba(var(--theme-rgb),.2);display:flex;align-items:center;justify-content:center;font-size:2.2rem;
      box-shadow:0 8px 22px rgba(0,0,0,.4);transition:transform .25s cubic-bezier(.2,.8,.2,1)}
    .mh-fav-tile:hover .cv,.mh-fav-tile:focus-visible .cv{transform:translateY(-4px) scale(1.03)}
    .mh-fav-tile .cv img{width:100%;height:100%;object-fit:cover}
    .mh-fav-tile b{display:block;margin-top:.45rem;font-size:.72rem;font-weight:800;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .mh-fav-tile small{display:block;font-size:.65rem;color:#9ca3af;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}

    /* список */
    .mh-listed{display:none!important}
    .mh-list{display:flex;flex-direction:column;gap:6px;padding:.5rem .25rem}
    .mh-row{display:grid;grid-template-columns:48px minmax(0,1fr) auto auto auto auto;align-items:center;gap:12px;padding:6px 12px 6px 6px;border-radius:14px;cursor:pointer;
      background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);transition:background-color .2s,border-color .2s,transform .2s cubic-bezier(.2,.8,.2,1)}
    .mh-row:hover,.mh-row:focus-visible{background:rgba(var(--theme-rgb),.14);border-color:rgba(var(--theme-rgb),.4);transform:translateX(3px);outline:none}
    .mh-row-img{width:48px;height:48px;border-radius:10px;overflow:hidden;background:rgba(var(--theme-rgb),.2);display:flex;align-items:center;justify-content:center;font-size:1.3rem}
    .mh-row-img img{width:100%;height:100%;object-fit:cover}
    .mh-row-main{min-width:0}
    .mh-row-main b{display:block;font-size:.88rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .mh-row-main span{display:block;font-size:.72rem;color:#9ca3af;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .mh-row-year{font-size:.75rem;color:#9ca3af;font-family:ui-monospace,monospace}
    .mh-row-price{font-size:.8rem;font-weight:800;color:#22d3ee;font-family:ui-monospace,monospace;white-space:nowrap}
    .mh-row-rate{font-size:.72rem;color:#facc15;letter-spacing:1px;white-space:nowrap}
    .mh-row .mh-fav{position:static;opacity:1;transform:none;width:30px;height:30px;font-size:15px}
    @media (max-width:640px){.mh-row{grid-template-columns:44px minmax(0,1fr) auto auto;gap:10px}.mh-row-year,.mh-row-rate{display:none}}

    /* приземление новой карточки */
    @keyframes mh-land{0%{opacity:0;transform:translateY(-46px) scale(.86) rotate(-2.5deg)}55%{opacity:1;transform:translateY(8px) scale(1.03) rotate(.6deg)}78%{transform:translateY(-3px) scale(.995)}100%{opacity:1;transform:none}}
    .mh-land{animation:mh-land .85s cubic-bezier(.2,.8,.2,1) both!important;z-index:5}
    @media (prefers-reduced-motion:reduce){.mh-land{animation:none!important}}

    /* настройка страниц */
    .mh-home-tools{position:relative;height:0;margin:0;z-index:30}
    .mh-home-tools .mh-gear{position:absolute;top:12px;right:12px;width:36px;height:36px}
    /* шестерёнка «Настройки» */
    .mh-gear{position:relative;flex:none;width:40px;height:40px;border-radius:999px;display:inline-flex;align-items:center;justify-content:center;font-size:18px;line-height:1;cursor:pointer;color:#e5e7eb;
      background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);transition:background-color .2s,border-color .2s}
    .mh-gear .mh-gear-ico{display:block;transition:transform .55s cubic-bezier(.2,.8,.2,1)}
    .mh-gear:hover,.mh-gear:focus-visible{background:rgba(var(--theme-rgb),.25);border-color:rgba(var(--theme-rgb),.6);outline:none}
    .mh-gear:hover .mh-gear-ico,.mh-gear:focus-visible .mh-gear-ico{transform:rotate(90deg)}
    .mh-gear::after{content:attr(data-tip);position:absolute;top:calc(100% + 8px);right:0;padding:4px 10px;border-radius:8px;font-size:11px;font-weight:700;white-space:nowrap;color:#fff;
      background:rgba(10,10,18,.96);border:1px solid rgba(255,255,255,.14);box-shadow:0 8px 20px rgba(0,0,0,.45);opacity:0;transform:translateY(-4px);pointer-events:none;transition:opacity .15s,transform .15s;z-index:40}
    .mh-gear:hover::after,.mh-gear:focus-visible::after{opacity:1;transform:none}
    @media (prefers-reduced-motion:reduce){.mh-gear .mh-gear-ico{transition:none}}

    /* окно артиста: крестик в углу */
    #artist-stats-modal .ax-x-wrap{position:sticky;top:0;height:0;z-index:8;overflow:visible}
    #artist-stats-modal .ax-close{position:absolute;right:-8px;top:-6px;width:38px;height:38px;border-radius:999px;display:flex;align-items:center;justify-content:center;font-size:16px;line-height:1;color:#e5e7eb;cursor:pointer;
      background:rgba(14,14,24,.92);border:1px solid rgba(255,255,255,.18);transition:background-color .2s,transform .25s cubic-bezier(.2,.8,.2,1)}
    #artist-stats-modal .ax-close:hover,#artist-stats-modal .ax-close:focus-visible{background:rgba(239,68,68,.35);transform:rotate(90deg);outline:none}
    #artist-stats-modal > .glass > .ax-x-wrap + *{margin-top:0!important}
    #artist-stats-title{padding-right:44px}
    .mh-cfg-panel{margin-bottom:1.5rem;padding:1.25rem 1.4rem;border-radius:1.25rem}
    .mh-cfg-panel.hidden{display:none}
    #cds.mh-sized #cd-grid,#vinyls.mh-sized #vinyl-grid,#stuff.mh-sized #stuff-grid,#wishlists.mh-sized #wishlist-grid{
      grid-template-columns:repeat(auto-fill,minmax(min(var(--mh-card,300px),100%),1fr))!important}

    /* диск за обложкой на странице релиза */
    .mh-disc-row{position:relative}
    .mh-disc{position:absolute;z-index:-1;pointer-events:none;border-radius:50%;animation:mh-slide .95s cubic-bezier(.2,.8,.2,1) .25s both}
    .mh-disc i{display:block;width:100%;height:100%;border-radius:50%;animation:mh-spin 6s linear infinite 1.2s;box-shadow:0 10px 28px rgba(0,0,0,.55)}
    .mh-disc.is-still{animation:none;transform:translateX(var(--peek))}
    .mh-disc.is-vinyl i{background:radial-gradient(circle,var(--theme-btn,#8b5cf6) 0 17%,#07070b 18% 21%,transparent 22%),repeating-radial-gradient(circle,#0b0b10 0 2px,#1f1f2a 2px 3px)}
    .mh-disc.is-cd i{background:radial-gradient(circle,#05050a 0 8%,transparent 9%),radial-gradient(circle,rgba(255,255,255,.92) 0 19%,transparent 20%),conic-gradient(#dfe7f3,#8fa3c0,#f4f8ff,#9db0cb,#dfe7f3,#7f93b0,#f4f8ff,#dfe7f3)}
    .mh-cover-in{animation:mh-cover-in .7s cubic-bezier(.2,.8,.2,1) both}
    @keyframes mh-slide{from{transform:translateX(0) rotate(-140deg)}to{transform:translateX(var(--peek)) rotate(0)}}
    @keyframes mh-spin{to{transform:rotate(360deg)}}
    @keyframes mh-cover-in{from{opacity:0;transform:translateX(-18px) scale(.93)}to{opacity:1;transform:none}}
    @media (prefers-reduced-motion:reduce){.mh-disc{animation:none;transform:translateX(var(--peek))}.mh-disc i,.mh-cover-in{animation:none}}
    `;
    document.head.appendChild(css);

    /* =====================================================
       1. Избранное
       ===================================================== */
    function syncFavButtons() {
        document.querySelectorAll('.mh-fav').forEach(b => {
            const it = itemOf(b.dataset.k, b.dataset.id);
            const on = !!(it && it.fav);
            b.classList.toggle('is-on', on);
            b.textContent = on ? '★' : '☆';
            b.setAttribute('aria-pressed', String(on));
            b.setAttribute('aria-label', on ? 'Убрать из избранного' : 'В избранное');
        });
        document.querySelectorAll('[data-mh-fav]').forEach(b => {
            const it = itemOf(b.dataset.k, b.dataset.id);
            b.textContent = it && it.fav ? '★ В избранном' : '☆ В избранное';
        });
    }

    function decorateCards(key) {
        const cfg = SECTIONS[key], grid = $(cfg.grid);
        if (!grid) return;
        for (const card of grid.children) {
            const id = card.dataset && card.dataset[cfg.attr];
            if (!id || card.querySelector(':scope > .mh-fav')) continue;
            if (!itemOf(key, id)) continue;
            const b = document.createElement('button');
            b.type = 'button'; b.className = 'mh-fav'; b.dataset.k = key; b.dataset.id = id;
            card.appendChild(b);
            if (getComputedStyle(card).position === 'static') card.style.position = 'relative';
        }
    }

    function toggleFav(key, id) {
        const it = itemOf(key, id);
        if (!it) return;
        if (it.fav) delete it.fav; else it.fav = true;
        save();
        buzz(12);
        syncFavButtons();
        renderFavRow();
        toast(it.fav ? 'Добавлено в избранное ⭐' : 'Убрано из избранного');
    }
    document.addEventListener('click', e => {
        const t = e.target.closest && e.target.closest('.mh-fav, [data-mh-fav]');
        if (!t) return;
        e.preventDefault(); e.stopPropagation();
        toggleFav(t.dataset.k, t.dataset.id);
    }, true);

    function openItem(key, id) {
        if ((key === 'cds' || key === 'vinyls') && typeof window.openMusicDetail === 'function') {
            if (typeof showPage === 'function') showPage(SECTIONS[key].page);
            window.openMusicDetail(key, id);
            return;
        }
        if (typeof showPage === 'function') showPage(SECTIONS[key].page);
        setTimeout(() => {
            const c = cardOf(key, id);
            if (!c) return;
            c.scrollIntoView({ block: 'center', behavior: 'smooth' });
            c.classList.add('mh-flash'); setTimeout(() => c.classList.remove('mh-flash'), 1800);
            if (key === 'games') c.click();
        }, 150);
    }

    function buildFavRow() {
        const home = $('home');
        if (!home || $('mh-fav-row')) return;
        const box = document.createElement('div');
        box.id = 'mh-fav-row';
        box.className = 'glass no-hover mh-fav-row-box';
        box.hidden = true;
        const anchor = $('stat-music-col-val')?.closest('.grid');
        if (anchor) anchor.insertAdjacentElement('afterend', box); else home.appendChild(box);
        box.addEventListener('click', e => {
            const t = e.target.closest('[data-fk]');
            if (t) openItem(t.dataset.fk, t.dataset.fid);
        });
    }
    function renderFavRow() {
        const box = $('mh-fav-row');
        if (!box) return;
        const favs = [];
        ['cds', 'vinyls', 'games', 'stuff'].forEach(k => (data[k] || []).forEach(i => { if (i && i.fav) favs.push({ k, i }); }));
        box.hidden = !favs.length;
        if (!favs.length) { box.innerHTML = ''; return; }
        box.innerHTML = `<h3 class="text-gray-400 text-sm uppercase tracking-wider font-bold mb-3">⭐ Любимое <span class="text-gray-600">· ${favs.length}</span></h3>
            <div class="mh-fav-scroll">${favs.map(({ k, i }) => {
                const src = imgOk(i.img), sub = i.artist || i.platform || SECTIONS[k].label;
                return `<button type="button" class="mh-fav-tile" data-fk="${k}" data-fid="${i.id}" title="${E(i.title)}">
                    <div class="cv">${src ? `<img src="${E(src)}" alt="" loading="lazy">` : SECTIONS[k].ico}</div>
                    <b>${E(i.title || 'Без названия')}</b><small>${E(sub)}</small></button>`;
            }).join('')}</div>`;
    }

    /* кнопка ⭐ на странице релиза */
    function decorateDetail() {
        const body = $('md-body');
        if (!body) return;
        const sh = body.querySelector('[data-act="share"]');
        if (!sh || body.querySelector('[data-mh-fav]')) return;
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'gd-tool'; b.dataset.mhFav = '1'; b.dataset.k = sh.dataset.k; b.dataset.id = sh.dataset.id;
        sh.insertAdjacentElement('beforebegin', b);
        syncFavButtons();
    }

    /* =====================================================
       2. Режим «Список»
       ===================================================== */
    const listOn = k => !!(data.listMode && data.listMode[k]);
    const stars = n => { n = Math.max(0, Math.min(5, Number(n) || 0)); return n ? '★'.repeat(n) : ''; };
    function priceOf(i) {
        try { if (typeof fmtPrice === 'function') return String(fmtPrice(i)); } catch (_) {}
        return i.price ? String(i.price) : '';
    }

    function buildList(key) {
        const cfg = SECTIONS[key], grid = $(cfg.grid);
        if (!grid) return;
        const on = listOn(key);
        grid.classList.toggle('mh-listed', on);
        let box = $('mh-list-' + key);
        syncListBtn(key);
        if (!on) { box && box.remove(); return; }
        if (!box) {
            box = document.createElement('div');
            box.id = 'mh-list-' + key;
            box.className = 'mh-list';
            grid.insertAdjacentElement('afterend', box);
            const go = row => { const c = cardOf(key, row.dataset.lid); c && c.click(); };
            box.addEventListener('click', e => { const row = e.target.closest('[data-lid]'); if (row) go(row); });
            box.addEventListener('keydown', e => {
                if (e.key !== 'Enter' && e.key !== ' ') return;
                const row = e.target.closest('[data-lid]');
                if (row && e.target === row) { e.preventDefault(); go(row); }
            });
        }
        const ids = [...grid.children].filter(c => c.dataset && c.dataset[cfg.attr]).map(c => Number(c.dataset[cfg.attr]));
        const items = ids.map(id => itemOf(key, id)).filter(Boolean);
        if (!items.length) {
            box.innerHTML = `<div class="mh-empty"><span class="e-ico" aria-hidden="true">${(data[key] || []).length ? '🔎' : cfg.ico}</span><div class="e-t">${(data[key] || []).length ? 'Ничего не нашлось' : 'Пока пусто'}</div></div>`;
            return;
        }
        box.innerHTML = items.map(i => {
            const src = imgOk(i.img), sub = i.artist || i.platform || '';
            return `<div class="mh-row" role="button" tabindex="0" data-lid="${i.id}">
                <div class="mh-row-img">${src ? `<img src="${E(src)}" alt="" loading="lazy" decoding="async">` : cfg.ico}</div>
                <div class="mh-row-main"><b>${E(i.title || 'Без названия')}</b>${sub ? `<span>${E(sub)}</span>` : ''}</div>
                <span class="mh-row-year">${E(i.year || '')}</span>
                <span class="mh-row-price">${E(priceOf(i))}</span>
                <span class="mh-row-rate">${stars(i.rating)}</span>
                <button type="button" class="mh-fav" data-k="${key}" data-id="${i.id}"></button>
            </div>`;
        }).join('');
        syncFavButtons();
    }

    function ensureListBtn(key) {
        const grid = $(SECTIONS[key].grid);
        if (!grid) return;
        const section = grid.closest('section');
        if (!section || section.querySelector(`[data-mh-list="${key}"]`)) return;
        let row = section.querySelector(`[data-bulk-tools="${key}"]`) || section.querySelector('.mh-toolrow');
        if (!row) {
            row = document.createElement('div');
            row.className = 'mh-toolrow';
            grid.insertAdjacentElement('beforebegin', row);
        }
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'mh-btn'; b.dataset.mhList = key;
        row.appendChild(b);
        b.addEventListener('click', () => {
            if (!data.listMode) data.listMode = {};
            const next = !listOn(key);
            data.listMode[key] = next;
            save();
            toast(next ? 'Режим «Список»: компактные строки ☰' : 'Обычный вид');
            buildList(key);
        });
        syncListBtn(key);
    }
    function syncListBtn(key) {
        const b = document.querySelector(`[data-mh-list="${key}"]`);
        if (!b) return;
        b.classList.toggle('is-on', listOn(key));
        b.textContent = listOn(key) ? '☰ Список: вкл' : '☰ Список';
    }
    /* =====================================================
       4. Приземление новой карточки
       ===================================================== */
    const seen = {};
    function snapshot() { Object.keys(SECTIONS).forEach(k => { seen[k] = new Set((data[k] || []).map(x => x.id)); }); }
    function landing(key) {
        const cfg = SECTIONS[key], grid = $(cfg.grid);
        if (!grid || !seen[key]) return;
        const fresh = [];
        for (const c of grid.children) {
            const id = Number(c.dataset && c.dataset[cfg.attr]);
            if (!id || seen[key].has(id)) continue;
            seen[key].add(id);
            fresh.push(c);
        }
        if (!fresh.length || fresh.length > 3) return;      // много сразу = импорт / восстановление, не анимируем
        fresh.forEach(c => { c.classList.add('mh-land'); setTimeout(() => c.classList.remove('mh-land'), 1100); });
        buzz([18, 50, 18]);
    }

    /* =====================================================
       Наблюдатель за сетками
       ===================================================== */
    function watch(key) {
        const grid = $(SECTIONS[key].grid);
        if (!grid) return;
        let raf = 0;
        const run = () => {
            raf = 0;
            decorateCards(key);
            ensureListBtn(key);
            buildList(key);
            landing(key);
            syncFavButtons();
            renderFavRow();
        };
        new MutationObserver(() => { if (!raf) raf = requestAnimationFrame(run); }).observe(grid, { childList: true });
        // режим выбора из 25-bulk.js работает с обычной сеткой — на это время выключаем «Список»
        new MutationObserver(() => {
            if (grid.hasAttribute('data-bulk-active') && listOn(key)) { data.listMode[key] = false; save(); buildList(key); }
        }).observe(grid, { attributes: true, attributeFilter: ['data-bulk-active'] });
        run();
    }

    /* =====================================================
       3. «Настроить» для страниц
       ===================================================== */
    const toolsRow = key => { const s = $(SECTIONS[key].page); return s && (s.querySelector(`[data-bulk-tools="${key}"]`) || s.querySelector('.mh-toolrow')); };
    const musicLike = key => ({
        sec: SECTIONS[key].page, name: SECTIONS[key].label, grid: SECTIONS[key].grid,
        blocks: () => [
            { k: 'summary', t: 'Сумма и количество под заголовком', el: $('total-' + key)?.parentElement },
            { k: 'search', t: 'Строка поиска', el: $('search-' + key) },
            { k: 'sort', t: 'Панель сортировки', el: $('sort-' + key + '-title')?.parentElement },
            { k: 'tools', t: 'Кнопки «Список» и выбор', el: toolsRow(key) }
        ]
    });
    const PAGES = {
        home: {
            sec: 'home', name: 'Главная',
            blocks: () => {
                const g = $('stat-music-col-val')?.closest('.grid');
                const out = [
                    { k: 'banner', t: 'Приветствие, уровень, кнопки', el: $('greeting-banner') },
                    { k: 'fav', t: 'Ряд «Любимое»', el: $('mh-fav-row') },
                    { k: 'stats', t: 'ВСЕ карточки статистики сразу', el: g },
                    { k: 'month', t: 'Артист и альбом месяца', el: $('fav-artist-img-wrapper')?.closest('.grid') },
                    { k: 'artists', t: 'Статистика по артистам', el: $('artist-stats-grid')?.closest('.glass') },
                    { k: 'quote', t: 'Цитата дня', el: $('quote-card-container')?.closest('.glass') },
                    { k: 'sites', t: 'Любимые музыкальные сайты', el: $('music-sites-grid')?.closest('.glass') }
                ];
                if (g) [...g.children].forEach(c => {
                    const h = c.querySelector('h3'), p = c.querySelector('p');
                    if (h && h.id) out.push({ k: 'c:' + h.id, t: p ? p.textContent.replace(/\s+/g, ' ').trim() : h.id, el: c, group: 'Отдельные карточки статистики' });
                });
                return out;
            }
        },
        analytics: { sec: 'analytics', name: 'Статистика', blocks: () => (typeof window.mhAnalyticsBlocks === 'function' ? window.mhAnalyticsBlocks() : []) },
        cds: musicLike('cds'),
        vinyls: musicLike('vinyls'),
        stuff: musicLike('stuff'),
        wishlists: (() => {
            const p = musicLike('wishlists');
            const base = p.blocks;
            p.blocks = () => {
                const b = base().filter(x => x.k !== 'sort');
                b.splice(2, 0,
                    { k: 'budget', t: 'Планировщик бюджета', el: $('hobby-budget-slider')?.closest('.glass') },
                    { k: 'filters', t: 'Категории и теги', el: $('filter-bar') });
                return b;
            };
            return p;
        })()
    };

    const pv = page => {
        if (!data.pageView || typeof data.pageView !== 'object') data.pageView = {};
        const o = data.pageView[page] || (data.pageView[page] = {});
        if (!o.hide || typeof o.hide !== 'object') o.hide = {};
        return o;
    };

    function applyPage(page) {
        const cfg = PAGES[page], sec = $(cfg.sec);
        if (!sec) return;
        const v = (data.pageView && data.pageView[page]) || {}, hide = v.hide || {};
        cfg.blocks().forEach(b => { if (b.el) b.el.toggleAttribute('data-mh-hidden', !!hide[b.k]); });
        if (cfg.grid) {
            const card = Number(v.card) || 0;
            sec.classList.toggle('mh-sized', card > 0);
            if (card > 0) sec.style.setProperty('--mh-card', card + 'px'); else sec.style.removeProperty('--mh-card');
        }
    }

    function fillPanel(page, panel) {
        const cfg = PAGES[page], v = pv(page);
        const blocks = cfg.blocks().filter(b => b.el);
        const groups = {};
        blocks.forEach(b => { (groups[b.group || 'Показывать блоки'] = groups[b.group || 'Показывать блоки'] || []).push(b); });
        panel.querySelector('.mh-cfg-blocks').innerHTML = Object.entries(groups).map(([g, list]) =>
            `<p class="mgp-title" style="margin-top:.4rem">${E(g)}</p>` +
            list.map(b => `<label class="mgp-row"><input type="checkbox" data-k="${E(b.k)}" ${v.hide[b.k] ? '' : 'checked'}><span>${E(b.t)}</span></label>`).join('')
        ).join('');
        const rg = panel.querySelector('.mh-cfg-card');
        if (rg) {
            const card = Number(v.card) || 0;
            rg.value = card || 300;
            panel.querySelector('.mh-cfg-out').textContent = card ? card + ' px' : 'авто';
        }
    }

    /* кнопка-шестерёнка: при наведении подпись «Настройки» */
    function gearify(b) {
        b.type = 'button';
        b.className = 'mh-gear';
        b.dataset.tip = 'Настройки';
        b.setAttribute('aria-label', 'Настройки');
        b.removeAttribute('title');
        b.innerHTML = '<span class="mh-gear-ico" aria-hidden="true">⚙️</span>';
    }
    // старая кнопка «🎛 Настроить» на странице игр (из 29-games-page.js) тоже превращается в шестерёнку
    function regear() {
        document.querySelectorAll('#games button').forEach(b => {
            if (b.querySelector('.mh-gear-ico')) return;
            if (/^\s*(?:🎛\uFE0F?)?\s*Настроить\s*$/.test(b.textContent)) gearify(b);
        });
    }

    function buildPanel(page) {
        const cfg = PAGES[page], sec = $(cfg.sec);
        if (!sec || $('mh-panel-' + page)) return;
        const head = page === 'home' ? null : sec.firstElementChild;

        const panel = document.createElement('div');
        panel.id = 'mh-panel-' + page;
        panel.className = 'glass no-hover mh-cfg-panel hidden';
        panel.innerHTML = `
            <div class="mgp-head"><b>⚙️ Настройки: ${E(cfg.name)}</b>
                <button type="button" class="mh-btn" data-act="close" aria-label="Закрыть">✕</button></div>
            <div class="mgp-cols">
                <div class="mh-cfg-blocks"></div>
                ${cfg.grid ? `<div>
                    <p class="mgp-title">Размер карточек</p>
                    <div class="mgp-size"><input type="range" class="mh-cfg-card" min="160" max="520" step="10" value="300" aria-label="Размер карточек"><output class="mh-cfg-out">авто</output></div>
                    <p class="text-[11px] text-gray-500 mt-2">Меньше значение — больше карточек в ряду.</p>
                    <div class="mgp-btns"><button type="button" class="mh-btn" data-act="auto">Размер: авто</button></div>
                </div>` : ''}
            </div>
            <div class="mgp-btns"><button type="button" class="mh-btn" data-act="all">👁 Показать всё</button></div>`;

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.id = 'mh-cfg-btn-' + page;
        gearify(btn);

        if (page === 'home') {
            const bar = document.createElement('div');
            bar.className = 'mh-home-tools';
            bar.appendChild(btn);
            sec.insertBefore(bar, sec.firstChild);
            bar.insertAdjacentElement('afterend', panel);
        } else {
            const last = head && head.lastElementChild;
            const first = last && (last.tagName === 'BUTTON' ? last : last.firstElementChild);
            if (first) first.insertAdjacentElement('beforebegin', btn); else if (head) head.appendChild(btn);
            head.insertAdjacentElement('afterend', panel);
        }

        btn.addEventListener('click', () => {
            const show = panel.classList.contains('hidden');
            panel.classList.toggle('hidden', !show);
            if (show) fillPanel(page, panel);
        });
        panel.addEventListener('change', e => {
            const cb = e.target.closest('input[data-k]');
            if (!cb) return;
            pv(page).hide[cb.dataset.k] = !cb.checked;
            applyPage(page); save();
        });
        const rg = panel.querySelector('.mh-cfg-card');
        if (rg) {
            rg.addEventListener('input', () => {
                pv(page).card = Number(rg.value);
                panel.querySelector('.mh-cfg-out').textContent = rg.value + ' px';
                applyPage(page);
            });
            rg.addEventListener('change', save);
        }
        panel.addEventListener('click', e => {
            const a = e.target.closest('[data-act]');
            if (!a) return;
            const v = pv(page);
            if (a.dataset.act === 'close') { panel.classList.add('hidden'); return; }
            if (a.dataset.act === 'auto') v.card = 0;
            if (a.dataset.act === 'all') { v.hide = {}; v.card = 0; }
            applyPage(page); save(); fillPanel(page, panel);
        });
    }

    /* =====================================================
       5. Диск за обложкой на странице релиза
       ===================================================== */
    let shownFor = null;
    function disc() {
        const detail = $('music-detail-modal'), body = $('md-body');
        if (!detail || !body || detail.classList.contains('hidden')) return;
        const cover = body.querySelector('.gd-cover'), sh = body.querySelector('[data-act="share"]');
        if (!cover || !sh) return;
        const row = cover.parentElement;
        row.querySelectorAll(':scope > .mh-disc').forEach(n => n.remove());
        const rr = row.getBoundingClientRect(), cr = cover.getBoundingClientRect();
        if (!cr.width) return;
        const sig = sh.dataset.k + ':' + sh.dataset.id, first = shownFor !== sig;
        shownFor = sig;
        row.classList.add('mh-disc-row');
        if (first) cover.classList.add('mh-cover-in');
        const d = Math.round(cr.width * 0.94);
        const w = document.createElement('div');
        w.className = 'mh-disc ' + (sh.dataset.k === 'cds' ? 'is-cd' : 'is-vinyl') + (first ? '' : ' is-still');
        w.style.cssText = `width:${d}px;height:${d}px;left:${Math.round(cr.left - rr.left + (cr.width - d) / 2)}px;top:${Math.round(cr.top - rr.top + (cr.height - d) / 2)}px;--peek:${Math.round(cr.width * 0.32)}px`;
        w.innerHTML = '<i></i>';
        row.insertBefore(w, row.firstChild);
    }
    function watchDetail() {
        const detail = $('music-detail-modal'), body = $('md-body');
        if (!detail || !body) return;
        new MutationObserver(() => { decorateDetail(); requestAnimationFrame(disc); }).observe(body, { childList: true });
        let wasHidden = detail.classList.contains('hidden');
        new MutationObserver(() => {
            const h = detail.classList.contains('hidden');
            if (h === wasHidden) return;
            wasHidden = h;
            if (h) shownFor = null; else { decorateDetail(); requestAnimationFrame(() => requestAnimationFrame(disc)); }
        }).observe(detail, { attributes: true, attributeFilter: ['class'] });
    }

    /* =====================================================
       Запуск
       ===================================================== */
    function init() {
        snapshot();
        buildFavRow();
        Object.keys(SECTIONS).forEach(watch);
        Object.keys(PAGES).forEach(p => { buildPanel(p); applyPage(p); });
        watchDetail();
        renderFavRow();
        regear();
        const gp = $('games');
        if (gp) new MutationObserver(regear).observe(gp, { childList: true, subtree: true, characterData: true });
        if (data.shelfMode) { delete data.shelfMode; delete data.shelfScale; save(); }   // «Полки» больше нет
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
    document.addEventListener('mirvel-ready', () => setTimeout(() => { Object.keys(PAGES).forEach(applyPage); renderFavRow(); regear(); }, 0), { once: true });
})();
