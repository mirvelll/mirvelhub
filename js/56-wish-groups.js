/* =========================================================
   MIRVEL HUB — 56-wish-groups.js (подключается после 55-wish-cats.js)
   «Желаемое»:
   1) Вид «По группам / Общим списком»: категории показываются разделами прямо на странице —
      заголовок (иконка, название, число хотелок, сумма) и под ним карточки. Заголовок сворачивает группу.
      Выбор вида и свёрнутые группы запоминаются (localStorage, в try/catch). Кнопки «Свернуть все / Развернуть все».
      Карточки остаются прямыми детьми #wishlist-grid — сортировка, поиск, набор 🛒 и массовый режим работают как раньше.
   2) Меню выбора приоритета по нажатию на цветную плашку (вместо клика по кругу).
   3) Необязательные поля хотелки: заметка (wishNote), «хочу к…» / дата события (wantBy), место события (eventPlace).
   Откат: убрать '56-wish-groups.js' из списка в 00-storage.js.
   ========================================================= */
(() => {
    'use strict';
    const $ = id => document.getElementById(id);
    const E = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const reduce = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    const wl = () => (typeof data !== 'undefined' && Array.isArray(data.wishlists)) ? data.wishlists : [];
    const money = n => Math.round(n).toLocaleString('ru-RU') + ' ₴';
    const pl = (n, a, b, c) => { const m = n % 10, k = n % 100; return (m === 1 && k !== 11) ? a : (m >= 2 && m <= 4 && (k < 12 || k > 14)) ? b : c; };

    const K_MODE = 'mh_wish_group_mode', K_COLL = 'mh_wish_group_collapsed';
    const lsGet = k => { try { return localStorage.getItem(k); } catch (_) { return null; } };
    const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (_) {} };

    const GAMES = { id: 'games', ico: '🎮', name: 'Игры', hex: '#8b5cf6' };
    const groupMeta = id => id === 'games' ? GAMES : (typeof WISH_CATS !== 'undefined' && WISH_CATS.find(c => c.id === id)) || { id, ico: '🎁', name: 'Другое', hex: '#94a3b8' };
    const groupOf = it => it && it.category === 'games' ? 'games' : wishCat(it);
    // порядок групп: как в WISH_CATS, «Игры» — перед «Другое»
    const ORDER = (() => {
        const ids = WISH_CATS.map(c => c.id), k = ids.indexOf('other');
        ids.splice(k < 0 ? ids.length : k, 0, 'games');
        return ids;
    })();

    let mode = lsGet(K_MODE) === 'flat' ? 'flat' : 'groups';          // по умолчанию — по группам
    let collapsed = new Set();
    try { collapsed = new Set(JSON.parse(lsGet(K_COLL) || '[]')); } catch (_) {}
    const saveColl = () => lsSet(K_COLL, JSON.stringify([...collapsed]));

    function init() {
        const grid = $('wishlist-grid');
        if (!grid) return;

        /* ---------- 1. Группы ---------- */
        let busy = false;
        const obs = new MutationObserver(() => { if (!busy) arrange(); });
        const obs2 = new MutationObserver(() => { if (!busy) schedSync(); });
        let raf = 0;
        const schedSync = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; sync(); }); };

        const cardEls = () => [...grid.children].filter(el => el.matches && el.matches('[data-mid]'));
        const headEls = () => [...grid.children].filter(el => el.classList && el.classList.contains('wl-ghead'));
        const itemOf = el => wl().find(x => String(x.id) === String(el.dataset.mid));
        const cardsOf = g => cardEls().filter(c => c.dataset.wlg === g);
        const isShown = c => c.style.display !== 'none' && !(grid.classList.contains('wp-only') && !c.classList.contains('wp-in'));

        function arrange() {
            busy = true;
            try {
                headEls().forEach(h => h.remove());
                const cards = cardEls();
                grid.classList.toggle('wl-grouped', mode === 'groups');
                if (mode !== 'groups') {
                    cards.forEach(c => { c.removeAttribute('data-wlg'); c.removeAttribute('data-wlc'); c.classList.remove('wl-out'); });
                    paintBar(); return;
                }
                const buckets = new Map();
                cards.forEach(c => {
                    const it = itemOf(c); const g = it ? groupOf(it) : 'other';
                    c.dataset.wlg = g;
                    if (!buckets.has(g)) buckets.set(g, []);
                    buckets.get(g).push(c);
                });
                const frag = document.createDocumentFragment();
                ORDER.concat([...buckets.keys()].filter(k => !ORDER.includes(k))).forEach(g => {
                    const list = buckets.get(g); if (!list || !list.length) return;
                    const h = document.createElement('button');
                    h.type = 'button'; h.className = 'wl-ghead'; h.dataset.g = g;
                    h.innerHTML = `<span class="wl-gico"></span><span class="wl-gname"></span><span class="wl-gcount"></span><span class="wl-gsum"></span><span class="wl-gchev" aria-hidden="true">▾</span>`;
                    frag.appendChild(h);
                    list.forEach(c => {
                        if (collapsed.has(g)) c.setAttribute('data-wlc', ''); else c.removeAttribute('data-wlc');
                        c.classList.remove('wl-out');
                        frag.appendChild(c);
                    });
                });
                grid.appendChild(frag);
                sync();
            } finally {
                obs.takeRecords(); obs2.takeRecords();
                busy = false;
            }
            paintBar();
        }

        // заголовки: число и сумма по тому, что сейчас видно (учитывает фильтр «Игры», «Только набор»)
        function sync() {
            if (mode !== 'groups') return;
            busy = true;
            try {
                headEls().forEach(h => {
                    const g = h.dataset.g, m = groupMeta(g), cs = cardsOf(g).filter(isShown);
                    const sum = cs.reduce((s, c) => { const it = itemOf(c); return s + (it ? Number(it.price) || 0 : 0); }, 0);
                    const open = !collapsed.has(g);
                    h.style.setProperty('--gc', m.hex);
                    h.querySelector('.wl-gico').textContent = m.ico;
                    h.querySelector('.wl-gname').textContent = m.name;
                    h.querySelector('.wl-gcount').textContent = `${cs.length} ${pl(cs.length, 'хотелка', 'хотелки', 'хотелок')}`;
                    h.querySelector('.wl-gsum').textContent = sum > 0 ? money(sum) : '';
                    h.setAttribute('aria-expanded', String(open));
                    h.setAttribute('aria-label', `${m.name}: ${cs.length}${sum > 0 ? ', ' + money(sum) : ''}. ${open ? 'Свернуть группу' : 'Развернуть группу'}`);
                    h.classList.toggle('is-collapsed', !open);
                    h.hidden = cs.length === 0;
                });
            } finally { obs.takeRecords(); obs2.takeRecords(); busy = false; }
            paintBar();
        }

        function setCollapsed(g, on, animate = true) {
            if (on) collapsed.add(g); else collapsed.delete(g);
            saveColl();
            const cs = cardsOf(g);
            busy = true;
            try {
                if (!animate || reduce()) {
                    cs.forEach(c => { c.classList.remove('wl-out'); if (on) c.setAttribute('data-wlc', ''); else c.removeAttribute('data-wlc'); });
                } else if (on) {
                    cs.forEach(c => c.classList.add('wl-out'));
                    setTimeout(() => {
                        if (!collapsed.has(g)) return;
                        busy = true;
                        cs.forEach(c => c.setAttribute('data-wlc', ''));
                        obs.takeRecords(); obs2.takeRecords(); busy = false;
                    }, 230);
                } else {
                    cs.forEach(c => { c.classList.add('wl-out'); c.removeAttribute('data-wlc'); });
                    void grid.offsetWidth;
                    requestAnimationFrame(() => { busy = true; cs.forEach(c => c.classList.remove('wl-out')); obs.takeRecords(); obs2.takeRecords(); busy = false; });
                }
            } finally { obs.takeRecords(); obs2.takeRecords(); busy = false; }
            sync();
        }

        grid.addEventListener('click', e => {
            const h = e.target.closest('.wl-ghead'); if (!h) return;
            e.preventDefault();
            setCollapsed(h.dataset.g, !collapsed.has(h.dataset.g));
        });

        /* ---------- панель вида ---------- */
        function bar() {
            let b = $('wl-gbar');
            if (b) return b;
            b = document.createElement('div');
            b.id = 'wl-gbar'; b.className = 'wl-gbar';
            b.innerHTML = `<span class="wl-gbar-t">Вид:</span>
                <div class="wl-seg" role="group" aria-label="Вид списка">
                    <button type="button" data-gm="groups">🗂 По группам</button>
                    <button type="button" data-gm="flat">▦ Общим списком</button>
                </div>
                <span class="wl-gall"><button type="button" data-gall="collapse">⏷ Свернуть все</button><button type="button" data-gall="expand">⏶ Развернуть все</button></span>`;
            const anchor = $('wg-panel') || grid;
            anchor.insertAdjacentElement('beforebegin', b);
            b.addEventListener('click', e => {
                const m = e.target.closest('[data-gm]'), a = e.target.closest('[data-gall]');
                if (m) {
                    if (m.dataset.gm === mode) return;
                    mode = m.dataset.gm; lsSet(K_MODE, mode);
                    paintBar(); arrange();
                } else if (a) {
                    const present = [...new Set(cardEls().map(c => c.dataset.wlg).filter(Boolean))];
                    present.forEach(g => setCollapsed(g, a.dataset.gall === 'collapse'));
                }
            });
            return b;
        }
        function paintBar() {
            const b = bar();
            b.querySelectorAll('[data-gm]').forEach(x => { const on = x.dataset.gm === mode; x.classList.toggle('is-on', on); x.setAttribute('aria-pressed', String(on)); });
            const all = b.querySelector('.wl-gall'); if (all) all.hidden = mode !== 'groups';
        }

        obs.observe(grid, { childList: true });
        obs2.observe(grid, { attributes: true, attributeFilter: ['class', 'style'], subtree: true });
        bar(); paintBar(); arrange();

        /* ---------- 2. Меню приоритета ---------- */
        let menu = null;
        function closeMenu() {
            if (!menu) return;
            const m = menu; menu = null;
            m.classList.remove('is-in');
            setTimeout(() => m.remove(), reduce() ? 0 : 140);
        }
        function openMenu(btn) {
            closeMenu();
            const it = wl().find(x => String(x.id) === String(btn.dataset.wlPrio)); if (!it) return;
            const m = document.createElement('div');
            m.className = 'wl-pmenu'; m.setAttribute('role', 'menu'); m.setAttribute('aria-label', 'Приоритет покупки');
            m.innerHTML = WISH_PRIOS.map(p => `<button type="button" role="menuitemradio" aria-checked="${it.priority === p.v}" class="${it.priority === p.v ? 'is-on' : ''}" data-v="${E(p.v)}" style="--pc:${p.hex}"><span class="ico">${p.ico}</span>${E(p.short)}</button>`).join('')
                + `<button type="button" role="menuitemradio" aria-checked="${!it.priority}" class="is-none${it.priority ? '' : ' is-on'}" data-v="">✕ Без приоритета</button>`;
            document.body.appendChild(m);
            const r = btn.getBoundingClientRect(), mw = m.offsetWidth, mh = m.offsetHeight;
            let left = Math.min(Math.max(8, r.left), window.innerWidth - mw - 8);
            let top = r.bottom + 6; if (top + mh > window.innerHeight - 8) top = Math.max(8, r.top - mh - 6);
            m.style.left = left + 'px'; m.style.top = top + 'px';
            menu = m; m.dataset.id = it.id; menuY = window.scrollY || 0;
            requestAnimationFrame(() => m.classList.add('is-in'));
            const cur = m.querySelector('.is-on') || m.querySelector('button'); cur && cur.focus({ preventScroll: true });
        }
        grid.addEventListener('click', e => {
            const b = e.target.closest('.wl-prio'); if (!b) return;
            e.stopPropagation(); e.preventDefault();
            if (menu && menu.dataset.id === String(b.dataset.wlPrio)) closeMenu(); else openMenu(b);
        }, true);
        document.addEventListener('click', e => {
            if (!menu) return;
            const o = e.target.closest && e.target.closest('.wl-pmenu');
            if (o) {
                const b = e.target.closest('button[data-v]'); if (!b) return;
                const it = wl().find(x => String(x.id) === menu.dataset.id);
                closeMenu();
                if (it) { it.priority = b.dataset.v; try { save(); } catch (_) {} }
            } else if (!(e.target.closest && e.target.closest('.wl-prio'))) closeMenu();
        });
        document.addEventListener('keydown', e => {
            if (!menu) return;
            if (e.key === 'Escape') { const id = menu.dataset.id; closeMenu(); const b = grid.querySelector(`.wl-prio[data-wl-prio="${id}"]`); b && b.focus(); }
            else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                e.preventDefault();
                const bs = [...menu.querySelectorAll('button')], k = bs.indexOf(document.activeElement);
                bs[(k + (e.key === 'ArrowDown' ? 1 : -1) + bs.length) % bs.length].focus();
            }
        });
        // закрываем меню только при заметной прокрутке (небольшой сдвиг страницы при нажатии его не закрывает)
        let menuY = 0;
        window.addEventListener('scroll', () => { if (menu && Math.abs((window.scrollY || 0) - menuY) > 40) closeMenu(); }, { passive: true });
        window.addEventListener('resize', closeMenu);

        /* ---------- 3. Доп. поля хотелки: заметка, «хочу к…», место ---------- */
        ensureFields();
        const origOpen = window.openModal;
        if (typeof origOpen === 'function') window.openModal = function (type, id) {
            const r = origOpen.apply(this, arguments);
            try {
                const it = (type === 'wishlists' && id) ? wl().find(x => x.id === parseInt(id)) : null;
                $('wx-note').value = (it && it.wishNote) || '';
                $('wx-date').value = (it && it.wantBy) || '';
                $('wx-place').value = (it && it.eventPlace) || '';
                syncFields();
            } catch (e) { console.warn('[wish-groups]', e); }
            return r;
        };
        const origToggle = window.toggleCategoryFields;
        if (typeof origToggle === 'function') window.toggleCategoryFields = function () {
            const r = origToggle.apply(this, arguments);
            try { syncFields(); } catch (_) {}
            return r;
        };
        const origSave = window.saveItem;
        if (typeof origSave === 'function') window.saveItem = async function () {
            let f = null, idStr = '', before = null;
            try {
                if ($('edit-type').value === 'wishlists' && $('item-category').value !== 'games') {
                    const d = $('wx-date').value || '';
                    f = {
                        wishNote: $('wx-note').value.trim().slice(0, 140),
                        wantBy: /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : '',
                        eventPlace: $('item-category').value === 'event' ? $('wx-place').value.trim().slice(0, 80) : ''
                    };
                    idStr = $('edit-id').value;
                    before = new Set(wl().map(x => x.id));
                }
            } catch (_) {}
            const r = await origSave.apply(this, arguments);
            if (f) {
                const item = idStr ? wl().find(x => x.id === parseInt(idStr)) : wl().find(x => !before.has(x.id));
                if (item) {
                    ['wishNote', 'wantBy', 'eventPlace'].forEach(k => { if (f[k]) item[k] = f[k]; else delete item[k]; });
                    try { persistData(); updateUI(); } catch (_) {}
                }
            }
            return r;
        };
    }

    function ensureFields() {
        if ($('wx-fields')) return;
        const url = $('item-url'); if (!url) return;
        const box = document.createElement('div');
        box.id = 'wx-fields'; box.className = 'hidden space-y-3';
        box.innerHTML = `
            <input id="wx-note" maxlength="140" placeholder="Заметка: где продаётся, какая версия…" aria-label="Заметка к хотелке" class="w-full bg-white/5 p-3.5 rounded-xl border border-white/10 text-white focus:outline-none focus:border-purple-500/50 text-sm">
            <div class="grid grid-cols-1 gap-1">
                <label id="wx-date-l" for="wx-date" class="text-[10px] text-gray-400 font-bold block uppercase tracking-wider">Хочу к… (необязательно)</label>
                <input id="wx-date" type="date" class="w-full bg-white/5 p-3 rounded-xl border border-white/10 text-white focus:outline-none focus:border-purple-500/50 text-sm" style="color-scheme:dark">
            </div>
            <input id="wx-place" maxlength="80" placeholder="Место события (город, клуб)" aria-label="Место события" class="w-full bg-white/5 p-3.5 rounded-xl border border-white/10 text-white focus:outline-none focus:border-purple-500/50 text-sm hidden">`;
        url.insertAdjacentElement('afterend', box);
    }
    function syncFields() {
        const box = $('wx-fields'); if (!box) return;
        const isWish = $('edit-type') && $('edit-type').value === 'wishlists';
        const cat = $('item-category') ? $('item-category').value : '';
        box.classList.toggle('hidden', !isWish || cat === 'games');
        const ev = cat === 'event';
        const l = $('wx-date-l'); if (l) l.textContent = ev ? 'Дата события' : 'Хочу к… (день рождения, праздник — необязательно)';
        const p = $('wx-place'); if (p) p.classList.toggle('hidden', !ev);
    }

    if ($('wishlist-grid')) init(); else document.addEventListener('DOMContentLoaded', init);
})();
