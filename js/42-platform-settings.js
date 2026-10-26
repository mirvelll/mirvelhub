/* =========================================================
   MIRVEL HUB — 42-platform-settings.js (подключается после 41-fav-carousel.js)
   1) Настройки сайта по вкладкам: 👤 Профиль · 🎨 Внешний вид · 🎮 Игры · 🔊 Атмосфера · 💾 Данные
      (блоки раскладываются автоматически по заголовкам, в том числе созданные другими скриптами)
   2) Блок «Платформы» (вкладка «Игры»):
      • свой логотип для любой платформы — картинка автоматически становится кружком
        (по умолчанию — встроенные логотипы из 34-platform-logos.js)
      • скрыть ненужные платформы и целые семейства (Nintendo, Sega…) из выбора при добавлении игры;
        вернуть можно в любой момент; уже добавленные игры не удаляются и не прячутся
   Данные: data.platPrefs = { hiddenPlats: [], hiddenFams: [], logos: { 'Название платформы': dataURL } }
   ========================================================= */
(() => {
    'use strict';
    const $ = id => document.getElementById(id);
    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const prefs = () => {
        const p = data.platPrefs && typeof data.platPrefs === 'object' ? data.platPrefs : (data.platPrefs = {});
        if (!Array.isArray(p.hiddenPlats)) p.hiddenPlats = [];
        if (!Array.isArray(p.hiddenFams)) p.hiddenFams = [];
        if (!p.logos || typeof p.logos !== 'object') p.logos = {};
        return p;
    };
    const commit = () => { try { persistData(); } catch (_) {} try { updateUI(); } catch (_) {} };
    const TABS = [['profile', '👤', 'Профиль'], ['look', '🎨', 'Внешний вид'], ['games', '🎮', 'Игры'], ['sound', '🔊', 'Атмосфера'], ['prompts', '📝', 'Промпты'], ['data', '💾', 'Данные']];
    let tab = 'profile';
    try { const t = sessionStorage.getItem('mh-set-tab'); if (TABS.some(x => x[0] === t)) tab = t; } catch (_) {}

    const css = document.createElement('style');
    css.textContent = `
    .plat-ico:has(> svg),.plat-ico:has(> img){background:transparent!important}
    .plat-ico > svg,.plat-ico > img{width:100%;height:100%;display:block}
    #mh-set-tabs{display:flex;gap:8px;overflow-x:auto;scrollbar-width:none;margin:-14px 0 22px;padding:2px 0 6px;-webkit-overflow-scrolling:touch}
    #mh-set-tabs::-webkit-scrollbar{display:none}
    .mhst{flex:0 0 auto;display:inline-flex;align-items:center;gap:7px;padding:9px 16px;border-radius:999px;font-size:13px;font-weight:800;color:#9ca3af;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);cursor:pointer;transition:color .2s,background .2s,border-color .2s,transform .2s}
    .mhst:hover{color:#fff;transform:translateY(-1px)}
    .mhst.is-on{color:#fff;border-color:var(--theme-btn,#8b5cf6);background:linear-gradient(135deg,rgba(139,92,246,.35),rgba(34,211,238,.14));box-shadow:0 4px 16px rgba(139,92,246,.22)}
    #profile[data-stab] [data-stab]{display:none!important}
    ${TABS.map(t => `#profile[data-stab="${t[0]}"] [data-stab="${t[0]}"]{display:block!important}`).join('\n    ')}
    #profile:not([data-stab="profile"]) > .grid{grid-template-columns:minmax(0,1fr)!important;max-width:980px}
    #profile .glass.p-8{padding:1.4rem 1.6rem!important}
    @keyframes mhstIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
    #profile [data-stab]{animation:mhstIn .28s ease both}
    /* платформы */
    .ps-intro{font-size:12.5px;color:#9ca3af;line-height:1.55}
    .ps-fam{border-radius:16px;padding:12px 14px;background:rgba(255,255,255,.035);border:1px solid rgba(255,255,255,.08);transition:opacity .2s}
    .ps-fam-h{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px;font-size:13px;font-weight:900;color:#e5e7eb}
    .ps-fam.is-off .ps-fam-h{color:#6b7280}
    .ps-list{display:flex;flex-wrap:wrap;gap:8px}
    .ps-plat{display:inline-flex;align-items:center;gap:6px;padding:4px 6px 4px 4px;border-radius:999px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);transition:opacity .2s,background .2s}
    .ps-plat.is-off{opacity:.42;background:transparent;border-style:dashed}
    .ps-plat.is-off .ps-name{text-decoration:line-through}
    .ps-logo{width:30px;height:30px;border-radius:50%;padding:0;overflow:hidden;position:relative;flex:0 0 auto;border:0;background:transparent;cursor:pointer}
    .ps-logo:hover::after{content:'⬆';position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.6);color:#fff;font-size:13px}
    .ps-name{font-size:12px;font-weight:800;color:#e5e7eb;padding:2px 4px;background:none;border:0;cursor:pointer}
    .ps-x{width:20px;height:20px;border-radius:50%;font-size:10px;color:#fca5a5;background:rgba(239,68,68,.15);border:0;cursor:pointer}
    .ps-sw{position:relative;display:inline-block;width:38px;height:22px;flex:0 0 auto}
    .ps-sw input{position:absolute;inset:0;opacity:0;cursor:pointer;margin:0}
    .ps-sw i{position:absolute;inset:0;border-radius:999px;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.18);transition:background .2s;pointer-events:none}
    .ps-sw i::after{content:'';position:absolute;top:2px;left:2px;width:16px;height:16px;border-radius:50%;background:#e5e7eb;transition:transform .2s}
    .ps-sw input:checked + i{background:linear-gradient(135deg,#8b5cf6,#22d3ee);border-color:transparent}
    .ps-sw input:checked + i::after{transform:translateX(16px);background:#fff}
    .ps-reset{align-self:flex-start;padding:8px 16px;border-radius:12px;font-size:12px;font-weight:800;color:#e5e7eb;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.16);cursor:pointer}
    `;
    document.head.appendChild(css);

    /* ---------- блок «Платформы» ---------- */
    function renderCard() {
        const card = $('plat-settings-card'); const G = window.mhGamePlat;
        if (!card || !G) return;
        const p = prefs(), L = window.mhPlatLogo;
        const famOff = f => f !== 'other' && p.hiddenFams.includes(f);
        card.querySelector('#ps-body').innerHTML = G.FAMILY_KEYS.map(f => {
            const fam = G.FAMILIES[f], list = G.PLATFORMS.filter(x => x[2] === f);
            const off = famOff(f);
            return `<div class="ps-fam${off ? ' is-off' : ''}">
                <div class="ps-fam-h"><span>${esc(fam.glyph)} ${esc(fam.name)}</span>
                    ${f === 'other' ? '<span class="text-[11px] text-gray-500 font-semibold">всегда доступно</span>' : `<label class="ps-sw" title="Показывать семейство при добавлении игры"><input type="checkbox" data-pf="${f}" ${off ? '' : 'checked'}><i></i></label>`}</div>
                <div class="ps-list">${list.map(([name]) => {
                    const pOff = off || p.hiddenPlats.includes(name);
                    const has = L && L.hasCustom(name);
                    return `<div class="ps-plat${pOff ? ' is-off' : ''}">
                        <button type="button" class="ps-logo" data-up="${esc(name)}" title="Загрузить свой логотип">${L ? L.svg(name, 30) : ''}</button>
                        <button type="button" class="ps-name" data-tg="${esc(name)}" title="${pOff ? 'Показывать при добавлении' : 'Скрыть при добавлении'}">${esc(name)}</button>
                        ${has ? `<button type="button" class="ps-x" data-rs="${esc(name)}" title="Вернуть встроенный логотип">✕</button>` : ''}</div>`;
                }).join('')}</div></div>`;
        }).join('');
    }
    function toCircle(file) {
        return new Promise((res, rej) => {
            const fr = new FileReader();
            fr.onerror = () => rej(new Error('read'));
            fr.onload = () => {
                const im = new Image();
                im.onerror = () => rej(new Error('img'));
                im.onload = () => {
                    const S = 160, c = document.createElement('canvas'); c.width = c.height = S;
                    const g = c.getContext('2d'); g.imageSmoothingQuality = 'high';
                    const k = Math.max(S / im.width, S / im.height), w = im.width * k, h = im.height * k;
                    g.beginPath(); g.arc(S / 2, S / 2, S / 2, 0, Math.PI * 2); g.clip();
                    g.drawImage(im, (S - w) / 2, (S - h) / 2, w, h);
                    res(c.toDataURL('image/png'));
                };
                im.src = fr.result;
            };
            fr.readAsDataURL(file);
        });
    }
    function buildCard() {
        if ($('plat-settings-card')) return true;
        const host = document.querySelector('#profile .grid > div.space-y-6:not(.glass)');
        if (!host || !window.mhGamePlat) return false;
        const card = document.createElement('div');
        card.id = 'plat-settings-card';
        card.className = 'glass p-8 rounded-3xl space-y-4';
        card.dataset.stab = 'games';
        card.innerHTML = `<h3 class="font-bold text-xl">🎮 Платформы</h3>
            <p class="ps-intro">Нажми на <b>кружок</b>, чтобы загрузить свой логотип — картинка сама станет круглой. Нажми на <b>название</b> или выключи семейство, чтобы убрать платформу из выбора при добавлении игры. Уже добавленные игры остаются на месте.</p>
            <div id="ps-body" class="space-y-3"></div>
            <button type="button" class="ps-reset" id="ps-reset">↺ Показать все платформы</button>
            <input type="file" id="ps-file" accept="image/*" class="hidden">`;
        host.appendChild(card);
        let target = '';
        card.addEventListener('click', e => {
            const up = e.target.closest('[data-up]'), tg = e.target.closest('[data-tg]'), rs = e.target.closest('[data-rs]');
            const p = prefs();
            if (up) { target = up.dataset.up; $('ps-file').value = ''; $('ps-file').click(); return; }
            if (tg) { const n = tg.dataset.tg, i = p.hiddenPlats.indexOf(n); i < 0 ? p.hiddenPlats.push(n) : p.hiddenPlats.splice(i, 1); commit(); renderCard(); return; }
            if (rs) { delete p.logos[rs.dataset.rs]; commit(); renderCard(); return; }
            if (e.target.closest('#ps-reset')) { p.hiddenPlats = []; p.hiddenFams = []; commit(); renderCard(); try { showToast('Все платформы снова доступны ✅', 'success'); } catch (_) {} }
        });
        card.addEventListener('change', async e => {
            const f = e.target.closest('[data-pf]');
            if (f) {
                const p = prefs(), k = f.dataset.pf, i = p.hiddenFams.indexOf(k);
                if (f.checked) { if (i >= 0) p.hiddenFams.splice(i, 1); } else if (i < 0) p.hiddenFams.push(k);
                commit(); renderCard(); return;
            }
            if (e.target.id === 'ps-file') {
                const file = e.target.files && e.target.files[0];
                if (!file || !target) return;
                if (!/^image\//.test(file.type) || file.size > 8 * 1024 * 1024) { try { showToast('Нужна картинка до 8 МБ', 'error'); } catch (_) {} return; }
                try { prefs().logos[target] = await toCircle(file); commit(); renderCard(); try { showToast('Логотип сохранён ✨', 'success'); } catch (_) {} }
                catch (_) { try { showToast('Не удалось прочитать картинку', 'error'); } catch (__) {} }
            }
        });
        renderCard();
        return true;
    }

    /* ---------- вкладки ---------- */
    function tabOf(b) {
        if (b.id === 'plat-settings-card') return 'games';
        if (b.id === 'prompts-card') return 'prompts';
        if (b.id === 'appearance-card' || b.id === 'ui-custom-card') return 'look';
        const t = ((b.querySelector('h3, h2')?.textContent) || '') + ' ' + b.id;
        if (/Артист месяца|Альбом месяца/i.test(t)) return 'none';   // блоки больше не нужны — скрыты (поля остаются в DOM)
        if (/Аккаунт/i.test(t)) return 'profile';
        if (/Внешний вид|Оформление|Тема/i.test(t)) return 'look';
        if (/атмосфер|проигрыв/i.test(t)) return 'sound';
        if (/Платформ|Копировать|Steam|игр/i.test(t)) return 'games';
        return 'data';
    }
    function organize() {
        const prof = $('profile'); if (!prof) return;
        buildCard();
        const grid = prof.querySelector(':scope > .grid'); if (!grid) return;
        const blocks = [...grid.querySelectorAll(':scope > .glass, :scope > div:not(.glass) > *')].filter(b => b.querySelector('h2,h3') || b.id);
        const count = {};
        blocks.forEach(b => { const t = tabOf(b); b.dataset.stab = t; count[t] = (count[t] || 0) + 1; });
        let nav = $('mh-set-tabs');
        if (!nav) {
            nav = document.createElement('nav'); nav.id = 'mh-set-tabs'; nav.setAttribute('role', 'tablist');
            prof.querySelector(':scope > h2')?.insertAdjacentElement('afterend', nav);
            nav.addEventListener('click', e => {
                const b = e.target.closest('[data-t]'); if (!b) return;
                tab = b.dataset.t; try { sessionStorage.setItem('mh-set-tab', tab); } catch (_) {}
                organize();
            });
        }
        const shown = TABS.filter(t => count[t[0]]);
        if (!shown.some(t => t[0] === tab)) tab = shown[0] ? shown[0][0] : 'profile';
        const sig = shown.map(t => t[0]).join();
        if (nav.dataset.sig !== sig) {
            nav.dataset.sig = sig;
            nav.innerHTML = shown.map(t => `<button type="button" class="mhst" role="tab" data-t="${t[0]}">${t[1]} ${t[2]}</button>`).join('');
        }
        nav.querySelectorAll('[data-t]').forEach(b => { const on = b.dataset.t === tab; b.classList.toggle('is-on', on); b.setAttribute('aria-selected', String(on)); });
        if (prof.dataset.stab !== tab) prof.dataset.stab = tab;
    }

    let q = 0;
    const schedule = () => { if (q) return; q = requestAnimationFrame(() => { q = 0; organize(); }); };
    function init() {
        const prof = $('profile'); if (!prof) return;
        organize();
        new MutationObserver(schedule).observe(prof, { childList: true, subtree: true });
        let n = 0; const iv = setInterval(() => { organize(); if (++n > 10) clearInterval(iv); }, 800);   // блоки, которые другие скрипты добавляют позже
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
    document.addEventListener('mirvel-ready', () => setTimeout(() => { organize(); try { updateUI(); } catch (_) {} }, 0), { once: true });
})();
