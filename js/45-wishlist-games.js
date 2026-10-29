/* =========================================================
   MIRVEL HUB — 45-wishlist-games.js  («Желаемое» под игры)
   Ничего в старых файлах не ломает — только достраивает поверх:
   • новая категория «🎮 Игры» в «Желаемом»: платформа (семейство → версия, как в играх),
     диск / цифра, дата выхода, «куплю при цене ≤», издание
   • кнопка «🎮 + Игра» в шапке — сразу открывает форму игры
   • карточка игры: логотип платформы, плашки «выходит через N дн.» и «цена в цель!»,
     полоска «сколько осталось до целевой цены»
   • панель над списком: сводка, фильтр по платформам, сортировка (релиз / скидки / дешевле / приоритет)
   • «📥 В коллекцию» для игры переносит её в раздел «Игры» (платформа, цена, цифра/диск, обложка, ссылка, статус)
   • в бюджет-планировщике появилась плитка «🎮 Игры»
   Новые поля игры в желаемом: category:'games', platform, digital, releaseDate ('ГГГГ-ММ-ДД'), targetPrice, edition
   Откат: убрать '45-wishlist-games.js' из списка в 00-storage.js (или удалить файл).
   ========================================================= */
(() => {
    'use strict';
    const $ = id => document.getElementById(id);
    const E = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const num = v => Number(v) || 0;
    const wl = () => (data.wishlists || []);
    const isG = i => !!i && i.category === 'games';
    const gp = () => window.mhGamePlat || { PLATFORMS: [], FAMILIES: {}, FAMILY_KEYS: [], DIGITAL_STORES: new Set() };
    const famOf = n => ((gp().PLATFORMS.find(p => p[0] === n)) || [])[2] || 'other';
    const logo = (n, px) => { try { return window.mhPlatLogo ? window.mhPlatLogo.svg(n, px) : ''; } catch (_) { return ''; } };
    const pill = n => { try { return window.mhPlatLogo && window.mhPlatLogo.pill ? window.mhPlatLogo.pill(n) : E(n); } catch (_) { return E(n); } };
    const fmtD = d => d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });

    let fOn = false;          // включён фильтр «🎮 Игры»
    let fPlat = '';           // фильтр по платформе внутри игр
    let sortM = '';           // '' = как в общей сортировке | release | deal | cheap | prio

    /* ---------- стили ---------- */
    const css = document.createElement('style');
    css.textContent = `
    #wishlists > div:first-child{flex-wrap:wrap}
    #wishlists > div:first-child h2{white-space:nowrap}
    .wg-in{width:100%;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:13px 14px;color:#fff;font-size:14px;outline:none;color-scheme:dark;transition:border-color .2s}
    .wg-in:focus{border-color:rgba(139,92,246,.6)}
    select.wg-in{background:#0d0d14;color:#d1d5db}
    .wg-lbl{display:block;font-size:10px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:#9ca3af;margin:0 0 5px}
    #wg-fields{display:flex;flex-direction:column;gap:12px;padding:14px;border-radius:16px;background:rgba(139,92,246,.07);border:1px dashed rgba(139,92,246,.35)}
    #wg-fields.hidden{display:none}
    .wg-row{display:grid;grid-template-columns:1fr 1fr;gap:10px}
    .wg-seg{display:grid;grid-template-columns:1fr 1fr;gap:6px;padding:4px;border-radius:12px;background:rgba(0,0,0,.35);border:1px solid rgba(255,255,255,.08)}
    .wg-seg button{padding:10px;border-radius:9px;font-size:13px;font-weight:800;color:#9ca3af;cursor:pointer;transition:all .2s}
    .wg-seg button.is-on{color:#fff;background:linear-gradient(135deg,rgba(139,92,246,.7),rgba(34,211,238,.4));box-shadow:0 4px 14px rgba(139,92,246,.3)}

    #wg-panel{margin:0 0 22px;padding:16px 18px;border-radius:24px;background:linear-gradient(160deg,rgba(139,92,246,.1),rgba(34,211,238,.04));border:1px solid rgba(255,255,255,.08)}
    #wg-panel.hidden{display:none}
    .wg-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px}
    .wg-stat{padding:11px 14px;border-radius:16px;background:rgba(0,0,0,.28);border:1px solid rgba(255,255,255,.07)}
    .wg-stat small{display:block;font-size:10px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:#6b7280}
    .wg-stat b{display:block;margin-top:3px;font-size:1.2rem;font-weight:900;color:#fff;font-family:var(--font-display,inherit);line-height:1.15}
    .wg-stat b.is-hot{color:#6ee7b7}
    .wg-stat em{display:block;font-style:normal;font-size:10px;color:#9ca3af;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .wg-line{display:flex;flex-wrap:wrap;align-items:center;gap:7px;margin-top:12px}
    .wg-line > span.t{font-size:10px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#6b7280;min-width:78px}
    .wg-chip{display:inline-flex;align-items:center;gap:6px;padding:6px 13px;border-radius:999px;font-size:12px;font-weight:700;color:#9ca3af;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);cursor:pointer;transition:all .2s}
    .wg-chip:hover{color:#fff;background:rgba(255,255,255,.1)}
    .wg-chip.is-on{color:#fff;border-color:rgba(var(--theme-rgb,139,92,246),.85);background:rgba(var(--theme-rgb,139,92,246),.28)}
    .wg-chip svg{display:block;flex:0 0 auto}
    .wg-chip i{font-style:normal;font-size:10px;opacity:.7}
    .wg-empty{margin-top:12px;padding:18px;border-radius:16px;text-align:center;font-size:13px;color:#9ca3af;background:rgba(0,0,0,.25);border:1px dashed rgba(255,255,255,.12)}
    .wg-empty button{margin-top:10px;padding:9px 18px;border-radius:12px;font-weight:800;font-size:13px;color:#fff;background:linear-gradient(135deg,var(--theme-btn,#8b5cf6),#06b6d4);cursor:pointer}

    #wishlist-grid .release-container.wg-game .media-disc{display:none}
    #wishlist-grid .wg-game .release-card{background-image:linear-gradient(160deg,rgba(139,92,246,.12),transparent 55%)}
    #wishlist-grid .wg-game.is-hot .release-card{border-color:rgba(52,211,153,.5);box-shadow:0 0 0 1px rgba(52,211,153,.25),0 12px 34px rgba(16,185,129,.14)}
    .wg-meta{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin-top:12px}
    .wg-tag{display:inline-flex;align-items:center;gap:5px;padding:3px 9px;border-radius:999px;font-size:10px;font-weight:800;color:#d1d5db;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.1);white-space:nowrap}
    .wg-tag.is-soon{color:#fcd34d;background:rgba(245,158,11,.14);border-color:rgba(245,158,11,.4)}
    .wg-tag.is-out{color:#a5b4fc;background:rgba(99,102,241,.14);border-color:rgba(99,102,241,.4)}
    .wg-tag.is-hot{color:#6ee7b7;background:rgba(16,185,129,.16);border-color:rgba(52,211,153,.5)}
    .wg-goal{margin-top:10px}
    .wg-goal > div{display:flex;justify-content:space-between;gap:8px;font-size:10px;color:#9ca3af}
    .wg-goal b{color:#fff;font-family:var(--font-display,inherit)}
    .wg-bar{height:5px;border-radius:5px;background:rgba(255,255,255,.1);margin-top:5px;overflow:hidden}
    .wg-bar i{display:block;height:100%;border-radius:5px;background:linear-gradient(90deg,#8b5cf6,#22d3ee);transition:width .4s}
    .wg-bar.is-hot i{background:linear-gradient(90deg,#10b981,#34d399)}

    #wg-buy{position:fixed;inset:0;z-index:60;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(0,0,0,.6);backdrop-filter:blur(10px)}
    #wg-buy.hidden{display:none}
    #wg-buy .wg-box{width:100%;max-width:440px;max-height:92vh;overflow-y:auto;padding:26px;border-radius:26px;display:flex;flex-direction:column;gap:13px;border:1px solid rgba(255,255,255,.1);box-shadow:0 30px 80px rgba(0,0,0,.6)}
    #wg-buy .wg-head{display:flex;gap:14px;align-items:center}
    #wg-buy .wg-head .pic{width:64px;height:64px;border-radius:14px;overflow:hidden;flex:0 0 auto;background:rgba(255,255,255,.07);display:flex;align-items:center;justify-content:center;font-size:28px;border:1px solid rgba(255,255,255,.1)}
    #wg-buy .wg-head .pic img{width:100%;height:100%;object-fit:cover}
    #wg-buy .wg-head h3{font-weight:900;font-size:1.15rem;line-height:1.2;overflow-wrap:anywhere}
    #wg-buy .wg-head p{font-size:11px;color:#9ca3af;margin-top:2px}
    #wg-buy .wg-acts{display:flex;gap:10px;margin-top:4px}
    #wg-buy .wg-acts button{flex:1;padding:13px;border-radius:14px;font-weight:800;font-size:14px;color:#fff;background:rgba(255,255,255,.1);cursor:pointer}
    #wg-buy .wg-acts button.go{flex:1.6;background:linear-gradient(135deg,#10b981,#06b6d4)}
    `;
    document.head.appendChild(css);

    /* ---------- платформы ---------- */
    function platOptions(sel) {
        const { PLATFORMS, FAMILIES, FAMILY_KEYS } = gp();
        const pr = data.platPrefs || {};
        const hid = n => (pr.hiddenPlats || []).includes(n) || (famOf(n) !== 'other' && (pr.hiddenFams || []).includes(famOf(n)));
        return FAMILY_KEYS.map(f => {
            const rows = PLATFORMS.filter(p => p[2] === f && (!hid(p[0]) || p[0] === sel));
            if (!rows.length) return '';
            return `<optgroup label="${E((FAMILIES[f] || {}).name || f)}">${rows.map(p => `<option value="${E(p[0])}"${p[0] === sel ? ' selected' : ''}>${E(p[0])}</option>`).join('')}</optgroup>`;
        }).join('');
    }

    /* ---------- форма добавления / редактирования ---------- */
    function ensureModal() {
        if ($('wg-fields') || !$('gear-fields-container')) return;
        const sel = $('item-category');
        if (sel && !sel.querySelector('option[value="games"]')) {
            const o = document.createElement('option'); o.value = 'games'; o.textContent = '🎮 Игры';
            sel.insertBefore(o, sel.firstChild);
        }
        const box = document.createElement('div');
        box.id = 'wg-fields'; box.className = 'hidden';
        box.innerHTML = `
            <div><label class="wg-lbl" for="wg-platform">Платформа</label><select id="wg-platform" class="wg-in"></select></div>
            <div><span class="wg-lbl">Формат</span>
                <div class="wg-seg" id="wg-format" data-v="digital"><button type="button" data-v="digital">☁️ Цифровая</button><button type="button" data-v="disc">💿 Диск</button></div></div>
            <div class="wg-row">
                <div><label class="wg-lbl" for="wg-release">Дата выхода</label><input id="wg-release" type="date" class="wg-in"></div>
                <div><label class="wg-lbl" for="wg-target">Куплю при цене ≤ (₴)</label><input id="wg-target" type="number" min="0" placeholder="например, 300" class="wg-in"></div>
            </div>
            <div><label class="wg-lbl" for="wg-edition">Издание</label><input id="wg-edition" maxlength="60" placeholder="Deluxe, GOTY, Collector's…" class="wg-in"></div>`;
        $('gear-fields-container').insertAdjacentElement('afterend', box);
        $('wg-format').addEventListener('click', e => { const b = e.target.closest('button[data-v]'); if (b) setFmt(b.dataset.v); });
        $('wg-platform').addEventListener('change', () => { if (gp().DIGITAL_STORES.has($('wg-platform').value)) setFmt('digital'); });
    }
    function setFmt(v) {
        const seg = $('wg-format'); if (!seg) return;
        seg.dataset.v = v;
        seg.querySelectorAll('button').forEach(b => b.classList.toggle('is-on', b.dataset.v === v));
    }
    function syncModal() {
        ensureModal();
        const sel = $('item-category'); if (!sel) return;
        const g = sel.value === 'games';
        $('wg-fields')?.classList.toggle('hidden', !g);
        $('item-artist')?.classList.toggle('hidden', g);
        const t = $('item-title'); if (t) t.placeholder = g ? 'Название игры' : 'Название альбома / Товара';
        const w = $('item-where-bought'); if (w) w.placeholder = g ? 'Магазин (Steam, PS Store…)' : 'Магазин / Покупка';
        const pr = $('item-price'); if (pr) pr.placeholder = g ? 'Цена сейчас (₴)' : 'Цена (₴)';
        const aa = $('aa-row'); if (aa) aa.style.display = g ? 'none' : '';
        if (g) ['music-fields-container', 'clothing-fields-container', 'gear-fields-container', 'rating-stars-wrapper'].forEach(id => $(id)?.classList.add('hidden'));
    }
    function fillModal(type, id) {
        ensureModal();
        const sel = $('item-category');
        const opt = sel && sel.querySelector('option[value="games"]');
        if (opt) { opt.disabled = type !== 'wishlists'; opt.hidden = type !== 'wishlists'; }
        if (type === 'wishlists' && sel) {
            const item = id ? wl().find(x => x.id === parseInt(id)) : null;
            const preset = !id && (window.__wgPreset || fOn);
            window.__wgPreset = false;
            if (isG(item) || preset) {
                sel.value = 'games';
                const plat = (item && item.platform) || data.wgLastPlat || 'Steam';
                $('wg-platform').innerHTML = platOptions(plat);
                $('wg-platform').value = plat;
                setFmt(item ? (item.digital ? 'digital' : 'disc') : (gp().DIGITAL_STORES.has(plat) ? 'digital' : 'disc'));
                $('wg-release').value = (item && item.releaseDate) || '';
                $('wg-target').value = (item && item.targetPrice) || '';
                $('wg-edition').value = (item && item.edition) || '';
            }
        }
        syncModal();
    }
    function readFields() {
        return {
            platform: $('wg-platform').value,
            digital: $('wg-format').dataset.v === 'digital',
            releaseDate: $('wg-release').value || '',
            targetPrice: Math.max(0, parseFloat($('wg-target').value) || 0),
            edition: $('wg-edition').value.trim()
        };
    }

    /* ---------- обёртки над старыми функциями ---------- */
    const origToggle = window.toggleCategoryFields;
    if (typeof origToggle === 'function') window.toggleCategoryFields = function () { const r = origToggle.apply(this, arguments); try { syncModal(); } catch (_) {} return r; };

    const origOpen = window.openModal;
    if (typeof origOpen === 'function') window.openModal = function (type, id) {
        const r = origOpen.apply(this, arguments);
        try { fillModal(type, id); } catch (e) { console.warn('[wishlist-games]', e); }
        return r;
    };

    const origSave = window.saveItem;
    if (typeof origSave === 'function') window.saveItem = async function () {
        let f = null, idStr = '', before = null;
        try {
            if ($('edit-type').value === 'wishlists' && $('item-category').value === 'games') {
                f = readFields(); idStr = $('edit-id').value;
                before = new Set(wl().map(x => x.id));
            }
        } catch (_) {}
        const r = await origSave.apply(this, arguments);
        if (f) {
            const item = idStr ? wl().find(x => x.id === parseInt(idStr)) : wl().find(x => !before.has(x.id));
            if (item) {
                Object.assign(item, f, { artist: '' });
                if (f.releaseDate) item.year = parseInt(f.releaseDate) || item.year;
                data.wgLastPlat = f.platform;
                try { persistData(); updateUI(); } catch (_) {}
            }
        }
        return r;
    };

    const origFilter = window.setFilter;
    if (typeof origFilter === 'function') window.setFilter = function (t) {
        if (t === 'games') { fOn = true; return origFilter.call(this, null); }
        fOn = false; fPlat = ''; sortM = '';
        return origFilter.apply(this, arguments);
    };

    const origBuy = window.openPurchaseMoveModal;
    if (typeof origBuy === 'function') window.openPurchaseMoveModal = function (id) {
        const item = wl().find(w => w.id === id);
        if (isG(item)) return openBuy(item);
        return origBuy.apply(this, arguments);
    };

    const origBudget = window.updateHobbyBudgetPlanner;
    if (typeof origBudget === 'function') window.updateHobbyBudgetPlanner = function () {
        const r = origBudget.apply(this, arguments);
        try {
            const el = $('category-budget-breakdown');
            const gs = wl().filter(isG);
            if (!el || !gs.length) return r;
            const budget = data.hobbyBudget || 2500;
            const total = wl().reduce((s, i) => s + num(i.price), 0);
            const sum = gs.reduce((s, i) => s + num(i.price), 0);
            const share = total ? Math.round(sum / total * 100) : 0;
            const div = document.createElement('div');
            div.className = 'glass p-3 rounded-2xl border border-white/5 flex flex-col justify-between hover:border-white/10 transition-colors';
            div.dataset.cat = 'games';
            div.innerHTML = `
                <div><div class="flex justify-between items-center text-[10px] font-black uppercase tracking-wider mb-1"><span style="color:#a78bfa">🎮 Игры</span><span class="text-gray-500">${gs.length} шт.</span></div>
                <p class="font-mono text-xs font-bold text-white">${Math.round(sum)} ₴</p></div>
                <div class="mt-3 pt-2 border-t border-white/5 space-y-1">
                    <div class="flex justify-between text-[9px] text-gray-500"><span>Доля в списке:</span><span class="font-bold text-gray-300">${share}%</span></div>
                    <div class="w-full bg-white/5 h-1.5 rounded-full overflow-hidden mb-1"><div class="h-full" style="width:${share}%;background:#8b5cf6"></div></div>
                    <div class="text-[9px] text-gray-400 leading-tight">⏱️ Копить соло: <span class="text-white font-mono font-bold">${sum > 0 ? (sum / budget).toFixed(1) : 0} мес.</span></div>
                </div>`;
            el.appendChild(div);
        } catch (_) {}
        return r;
    };

    /* ---------- перенос в «Игры» ---------- */
    function ensureBuy() {
        if ($('wg-buy')) return;
        const m = document.createElement('div');
        m.id = 'wg-buy'; m.className = 'hidden'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true');
        m.innerHTML = `<div class="glass no-hover wg-box">
            <div class="wg-head"><div class="pic" id="wg-b-pic"></div><div><h3 id="wg-b-title"></h3><p>Куплено — переносим в «Игры»</p></div></div>
            <div><label class="wg-lbl" for="wg-b-plat">Платформа</label><select id="wg-b-plat" class="wg-in"></select></div>
            <div><span class="wg-lbl">Формат</span><div class="wg-seg" id="wg-b-fmt" data-v="digital"><button type="button" data-v="digital">☁️ Цифровая</button><button type="button" data-v="disc">💿 Диск</button></div></div>
            <div class="wg-row">
                <div><label class="wg-lbl" for="wg-b-price">Заплатил, ₴</label><input id="wg-b-price" type="number" min="0" class="wg-in"></div>
                <div><label class="wg-lbl" for="wg-b-where">Где купил</label><input id="wg-b-where" class="wg-in" placeholder="магазин"></div>
            </div>
            <div><label class="wg-lbl" for="wg-b-status">Статус в коллекции</label>
                <select id="wg-b-status" class="wg-in"><option value="backlog">🗓 В планах</option><option value="playing">▶ В процессе</option><option value="">Без статуса</option></select></div>
            <input type="hidden" id="wg-b-id">
            <div class="wg-acts"><button type="button" id="wg-b-cancel">Отмена</button><button type="button" class="go" id="wg-b-go">📥 В коллекцию</button></div>
        </div>`;
        document.body.appendChild(m);
        m.addEventListener('click', e => { if (e.target === m) m.classList.add('hidden'); });
        $('wg-b-cancel').onclick = () => m.classList.add('hidden');
        $('wg-b-fmt').addEventListener('click', e => {
            const b = e.target.closest('button[data-v]'); if (!b) return;
            $('wg-b-fmt').dataset.v = b.dataset.v;
            $('wg-b-fmt').querySelectorAll('button').forEach(x => x.classList.toggle('is-on', x === b));
        });
        $('wg-b-plat').addEventListener('change', () => {
            if (gp().DIGITAL_STORES.has($('wg-b-plat').value)) {
                $('wg-b-fmt').dataset.v = 'digital';
                $('wg-b-fmt').querySelectorAll('button').forEach(x => x.classList.toggle('is-on', x.dataset.v === 'digital'));
            }
        });
        $('wg-b-go').onclick = confirmBuy;
        document.addEventListener('keydown', e => { if (e.key === 'Escape' && !m.classList.contains('hidden')) m.classList.add('hidden'); });
    }
    function openBuy(item) {
        ensureBuy();
        $('wg-b-id').value = item.id;
        $('wg-b-title').textContent = item.title;
        $('wg-b-pic').innerHTML = item.img ? `<img src="${E(item.img)}" alt="">` : '🎮';
        const plat = item.platform || 'Steam';
        $('wg-b-plat').innerHTML = platOptions(plat);
        $('wg-b-plat').value = plat;
        const dg = item.digital != null ? !!item.digital : gp().DIGITAL_STORES.has(plat);
        $('wg-b-fmt').dataset.v = dg ? 'digital' : 'disc';
        $('wg-b-fmt').querySelectorAll('button').forEach(x => x.classList.toggle('is-on', x.dataset.v === (dg ? 'digital' : 'disc')));
        $('wg-b-price').value = num(item.price) || '';
        $('wg-b-where').value = item.whereBought || '';
        $('wg-b-status').value = 'backlog';
        $('wg-buy').classList.remove('hidden');
    }
    function confirmBuy() {
        const id = parseInt($('wg-b-id').value);
        const idx = wl().findIndex(w => w.id === id);
        if (idx < 0) { $('wg-buy').classList.add('hidden'); return; }
        const w = data.wishlists[idx];
        if (!Array.isArray(data.games)) data.games = [];
        let gid = Date.now(); while (data.games.some(x => x.id === gid)) gid++;
        const game = {
            id: gid, platform: $('wg-b-plat').value, title: w.title,
            developer: '', publisher: '', year: w.year || '', price: Math.max(0, parseFloat($('wg-b-price').value) || 0),
            condition: '', edition: w.edition || '', region: '', url: w.url || '', rating: 0,
            digital: $('wg-b-fmt').dataset.v === 'digital', img: w.img || '', note: w.note || '', fromWish: true
        };
        const where = $('wg-b-where').value.trim(); if (where) game.whereBought = where;
        const st = $('wg-b-status').value; if (st) game.status = st;
        data.games.push(game);
        data.wishlists.splice(idx, 1);
        $('wg-buy').classList.add('hidden');
        try { addXP(150, 'покупка из желаемого 📥'); } catch (_) {}
        try { save(); } catch (_) { try { persistData(); updateUI(); } catch (__) {} }
        try { showToast(`🎮 «${E(w.title)}» теперь в коллекции игр`); } catch (_) {}
    }

    /* ---------- данные карточки ---------- */
    function release(i) {
        if (!i.releaseDate) return null;
        const d = new Date(i.releaseDate + 'T00:00:00'); if (isNaN(d)) return null;
        const t = new Date(); t.setHours(0, 0, 0, 0);
        return { days: Math.round((d - t) / 864e5), d };
    }
    const hit = i => num(i.targetPrice) > 0 && num(i.price) > 0 && num(i.price) <= num(i.targetPrice);
    const PRIO = { '🔥 Высокий': 0, '⚡ Средний': 1, '⏳ Низкий': 2 };

    function decorate() {
        const grid = $('wishlist-grid'); if (!grid) return;
        grid.querySelectorAll('.release-container').forEach(wrap => {
            const item = wl().find(x => String(x.id) === String(wrap.dataset.mid));
            wrap.classList.remove('wg-game', 'is-hot');
            wrap.style.display = ''; wrap.style.order = '';
            if (!isG(item)) { if (fOn) wrap.style.display = 'none'; return; }
            // фильтры
            if (fOn && fPlat && item.platform !== fPlat) { wrap.style.display = 'none'; return; }
            wrap.classList.add('wg-game');
            const card = wrap.querySelector('.release-card'); if (!card) return;
            if (hit(item)) wrap.classList.add('is-hot');
            if (!card.querySelector('.wg-meta')) {
                // бейдж категории → «Игра»
                const cb = card.querySelector('.uppercase.tracking-wider');
                if (cb) { cb.textContent = '🎮 Игра'; cb.className = 'px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-violet-500/20 text-violet-300 border border-violet-500/20'; }
                const r = release(item);
                const tags = [];
                if (item.platform) tags.push(`<span style="--pc:${E((gp().FAMILIES[famOf(item.platform)] || {}).color || '#a78bfa')}">${pill(item.platform)}</span>`);
                tags.push(`<span class="wg-tag">${item.digital ? '☁️ Цифра' : '💿 Диск'}</span>`);
                if (item.edition) tags.push(`<span class="wg-tag">✨ ${E(item.edition)}</span>`);
                if (r) {
                    if (r.days > 1) tags.push(`<span class="wg-tag is-soon" title="${E(fmtD(r.d))}">⏳ Выход через ${r.days} дн.</span>`);
                    else if (r.days === 1) tags.push(`<span class="wg-tag is-soon">⏳ Выходит завтра</span>`);
                    else if (r.days === 0) tags.push(`<span class="wg-tag is-soon">🎉 Выходит сегодня</span>`);
                    else tags.push(`<span class="wg-tag is-out" title="${E(fmtD(r.d))}">✅ Уже вышла</span>`);
                }
                if (hit(item)) tags.push(`<span class="wg-tag is-hot">🔥 Цена в цель!</span>`);
                const meta = document.createElement('div');
                meta.className = 'wg-meta'; meta.innerHTML = tags.join('');
                card.firstElementChild.insertAdjacentElement('afterend', meta);
                // «сколько осталось до целевой цены»
                if (num(item.targetPrice) > 0 && num(item.price) > 0) {
                    const hot = hit(item), pct = hot ? 100 : Math.max(4, Math.round(num(item.targetPrice) / num(item.price) * 100));
                    const goal = document.createElement('div');
                    goal.className = 'wg-goal';
                    goal.innerHTML = `<div><span>Цель: <b>${num(item.targetPrice)} ₴</b></span><span>${hot ? 'можно брать 👍' : `ещё −${Math.round(num(item.price) - num(item.targetPrice))} ₴`}</span></div><div class="wg-bar${hot ? ' is-hot' : ''}"><i style="width:${pct}%"></i></div>`;
                    meta.insertAdjacentElement('afterend', goal);
                }
            }
            // порядок
            if (fOn && sortM) wrap.style.order = String(order(item));
        });
    }
    function order(i) {
        const r = release(i);
        if (sortM === 'release') return r ? (r.days >= 0 ? r.days : 5000 - r.days) : 99999;
        if (sortM === 'deal') return hit(i) ? -100000 + num(i.price) : (num(i.targetPrice) > 0 && num(i.price) > 0 ? Math.round(num(i.price) - num(i.targetPrice)) : 99999);
        if (sortM === 'cheap') return num(i.price) || 99999;
        if (sortM === 'prio') return (PRIO[i.priority] != null ? PRIO[i.priority] : 3) * 1000 + (r && r.days >= 0 ? Math.min(r.days, 999) : 999);
        return 0;
    }

    /* ---------- панель над списком ---------- */
    function panel() {
        let p = $('wg-panel');
        const grid = $('wishlist-grid'); if (!grid) return null;
        if (!p) {
            p = document.createElement('div'); p.id = 'wg-panel'; p.className = 'hidden';
            grid.insertAdjacentElement('beforebegin', p);
            p.addEventListener('click', e => {
                const c = e.target.closest('[data-wp],[data-ws],[data-wadd]'); if (!c) return;
                if (c.dataset.wadd) { window.mhWishAddGame(); return; }
                if (c.hasAttribute('data-wp')) fPlat = c.dataset.wp;
                if (c.hasAttribute('data-ws')) sortM = c.dataset.ws;
                refresh();
            });
        }
        return p;
    }
    function paintPanel() {
        const p = panel(); if (!p) return;
        const allBtn = $('filter-cat-all'), gBtn = $('filter-cat-games');
        const ON = 'px-3 py-1 rounded-full border border-purple-500 text-xs bg-purple-500/20 text-white transition-all ring-1 ring-purple-500/50';
        const OFF = 'px-3 py-1 rounded-full border border-white/10 text-xs bg-white/5 hover:bg-white/10 text-gray-300 transition-all';
        if (gBtn) gBtn.className = fOn ? ON : OFF;
        if (fOn && allBtn) allBtn.className = OFF;
        if (!fOn) { p.classList.add('hidden'); return; }
        const gs = wl().filter(isG);
        p.classList.remove('hidden');
        const sum = gs.reduce((s, i) => s + num(i.price), 0);
        const hot = gs.filter(hit);
        const next = gs.map(i => ({ i, r: release(i) })).filter(x => x.r && x.r.days >= 0).sort((a, b) => a.r.days - b.r.days)[0];
        const plats = {}; gs.forEach(i => { const n = i.platform || 'Другое'; plats[n] = (plats[n] || 0) + 1; });
        const pk = Object.keys(plats).sort((a, b) => plats[b] - plats[a]);
        if (fPlat && !plats[fPlat]) fPlat = '';
        const sorts = [['', '🔀', 'Как обычно'], ['prio', '⭐', 'Приоритет'], ['release', '📅', 'Скоро выход'], ['deal', '🔥', 'Цена в цель'], ['cheap', '🪙', 'Дешевле']];
        const shown = gs.filter(i => !fPlat || i.platform === fPlat).length;
        p.innerHTML = `
            <div class="wg-stats">
                <div class="wg-stat"><small>Игр в списке</small><b>${gs.length}</b></div>
                <div class="wg-stat"><small>Нужно накопить</small><b>${Math.round(sum)} ₴</b></div>
                <div class="wg-stat"><small>Цена в цель</small><b class="${hot.length ? 'is-hot' : ''}">${hot.length}</b>${hot.length ? `<em>${E(hot[0].title)}${hot.length > 1 ? ` +${hot.length - 1}` : ''}</em>` : ''}</div>
                <div class="wg-stat"><small>Ближайший выход</small><b>${next ? (next.r.days === 0 ? 'Сегодня' : `${next.r.days} дн.`) : '—'}</b>${next ? `<em>${E(next.i.title)}</em>` : ''}</div>
            </div>
            ${pk.length > 1 ? `<div class="wg-line"><span class="t">Платформа:</span>
                <button type="button" class="wg-chip${fPlat ? '' : ' is-on'}" data-wp="">Все</button>
                ${pk.map(n => `<button type="button" class="wg-chip${fPlat === n ? ' is-on' : ''}" data-wp="${E(n)}">${logo(n, 16)}${E(n)} <i>${plats[n]}</i></button>`).join('')}</div>` : ''}
            <div class="wg-line"><span class="t">Для игр:</span>
                ${sorts.map(s => `<button type="button" class="wg-chip${sortM === s[0] ? ' is-on' : ''}" data-ws="${s[0]}">${s[1]} ${s[2]}</button>`).join('')}</div>
            ${shown ? '' : `<div class="wg-empty">${gs.length ? 'На этой платформе пока ничего.' : 'Список игр пуст — добавь первую хотелку.'}<br><button type="button" data-wadd="1">🎮 + Игра</button></div>`}`;
    }

    let busy = false;
    function refresh() { if (busy) return; busy = true; try { decorate(); paintPanel(); } finally { busy = false; } }

    /* ---------- кнопки: «🎮 Игры» в фильтре и «🎮 + Игра» в шапке ---------- */
    window.mhWishAddGame = () => { window.__wgPreset = true; if (typeof window.openModal === 'function') window.openModal('wishlists'); };

    function mount() {
        const fb = $('filter-bar');
        if (fb && !$('filter-cat-games')) {
            const other = $('filter-cat-other');
            const b = document.createElement('button');
            b.id = 'filter-cat-games'; b.type = 'button';
            b.className = 'px-3 py-1 rounded-full border border-white/10 text-xs bg-white/5 text-gray-300';
            b.textContent = '🎮 Игры';
            b.onclick = () => window.setFilter('games');
            if (other) other.insertAdjacentElement('beforebegin', b); else fb.firstElementChild?.appendChild(b);
        }
        const add = document.querySelector('#wishlists button[onclick*="openModal(\'wishlists\')"]');
        if (add && !$('wg-add-game')) {
            const b = document.createElement('button');
            b.id = 'wg-add-game'; b.type = 'button';
            b.className = add.className;
            b.textContent = '🎮 + Игра';
            b.onclick = () => window.mhWishAddGame();
            add.insertAdjacentElement('beforebegin', b);
            b.style.cssText = 'background:rgba(139,92,246,.22);color:#e9d5ff;border:1px solid rgba(139,92,246,.5)';
        }
    }

    function init() {
        mount(); ensureModal(); panel();
        const grid = $('wishlist-grid');
        if (grid) new MutationObserver(refresh).observe(grid, { childList: true });
        refresh();
    }
    if ($('wishlist-grid')) init(); else document.addEventListener('DOMContentLoaded', init);
})();
