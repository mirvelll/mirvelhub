/* =========================================================
   MIRVEL HUB — 43-ui-custom.js (после 42-platform-settings.js)
   • лёгкая анимация открытия панелей «Настроить» (игры и остальные страницы)
   • обновлённый вид страницы настроек
   • блок «Интерфейс» (вкладка «Внешний вид»): скругление карточек, плотность, размер текста, анимации
   Данные: data.uiPrefs = { radius, dense, scale, noAnim }
   ========================================================= */
(() => {
    'use strict';
    const $ = id => document.getElementById(id);
    const DEF = { radius: 0, dense: false, scale: 100, noAnim: false };      // radius 0 = как задумано дизайном
    const prefs = () => {
        const p = data.uiPrefs && typeof data.uiPrefs === 'object' ? data.uiPrefs : (data.uiPrefs = {});
        Object.keys(DEF).forEach(k => { if (typeof p[k] !== typeof DEF[k]) p[k] = DEF[k]; });
        return p;
    };
    const commit = () => { try { persistData(); } catch (_) {} };

    const css = document.createElement('style');
    css.textContent = `
    /* --- анимация открытия панелей «Настроить» --- */
    #mh-games-panel:not(.hidden),.mh-cfg-panel:not(.hidden){transform-origin:top center;animation:mh-panel-in .32s cubic-bezier(.2,.8,.2,1)}
    @keyframes mh-panel-in{from{opacity:0;transform:translateY(-10px) scale(.985)}to{opacity:1;transform:none}}
    #mh-games-panel:not(.hidden) .mgp-row,.mh-cfg-panel:not(.hidden) .mgp-row{animation:mh-row-in .3s ease-out both}
    ${Array.from({ length: 10 }, (_, i) => `#mh-games-panel:not(.hidden) .mgp-row:nth-child(${i + 2}),.mh-cfg-panel:not(.hidden) .mgp-row:nth-child(${i + 2}){animation-delay:${(i * 0.025).toFixed(3)}s}`).join('\n    ')}
    @keyframes mh-row-in{from{opacity:0;transform:translateX(-6px)}to{opacity:1;transform:none}}
    @media(prefers-reduced-motion:reduce){#mh-games-panel,.mh-cfg-panel,.mgp-row{animation:none!important}}

    /* --- страница настроек: аккуратнее и живее --- */
    #profile .glass.rounded-3xl{position:relative;border:1px solid rgba(255,255,255,.08);transition:border-color .25s,transform .25s}
    #profile .glass.rounded-3xl:hover{border-color:rgba(var(--theme-rgb,139,92,246),.35)}
    #profile .glass.rounded-3xl > h3.font-bold{display:flex;align-items:center;gap:8px;padding-bottom:10px;border-bottom:1px solid rgba(255,255,255,.07);margin-bottom:2px}
    #profile .glass.rounded-3xl > h3.font-bold::after{content:"";flex:1}
    #profile[data-stab] [data-stab]{animation:mh-tab-in .3s ease-out}
    @keyframes mh-tab-in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
    #mh-set-tabs{position:sticky;top:0;z-index:5;backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);padding-top:8px;margin-top:-18px}

    /* --- блок «Интерфейс» --- */
    #ui-custom-card .uc-row{display:flex;flex-direction:column;gap:6px}
    #ui-custom-card .uc-lbl{display:flex;justify-content:space-between;font-size:12px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#9ca3af}
    #ui-custom-card .uc-lbl output{color:#fff;letter-spacing:0;text-transform:none}
    #ui-custom-card input[type=range]{width:100%;accent-color:var(--theme-btn,#8b5cf6)}
    #ui-custom-card .uc-sw{display:flex;align-items:center;justify-content:space-between;gap:12px;font-size:14px;color:#d1d5db;cursor:pointer;padding:6px 0}
    #ui-custom-card .uc-sw small{display:block;color:#6b7280;font-size:12px}
    #ui-custom-card .uc-sw input{appearance:none;-webkit-appearance:none;flex:0 0 auto;width:42px;height:24px;border-radius:999px;background:rgba(255,255,255,.12);position:relative;cursor:pointer;transition:background .2s}
    #ui-custom-card .uc-sw input::after{content:"";position:absolute;top:3px;left:3px;width:18px;height:18px;border-radius:50%;background:#fff;transition:transform .2s}
    #ui-custom-card .uc-sw input:checked{background:var(--theme-btn,#8b5cf6)}
    #ui-custom-card .uc-sw input:checked::after{transform:translateX(18px)}
    #ui-custom-card .uc-reset{align-self:flex-start;font-size:12px;font-weight:700;color:#9ca3af;padding:6px 12px;border-radius:999px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);cursor:pointer}
    #ui-custom-card .uc-reset:hover{color:#fff}

    /* --- применение настроек --- */
    body.mh-uc-radius .glass{border-radius:var(--mh-uc-r)!important}
    body.mh-uc-dense #profile .glass.p-8,body.mh-uc-dense .glass.p-8{padding:1rem 1.1rem!important}
    body.mh-uc-dense .space-y-6 > :not([hidden]) ~ :not([hidden]){margin-top:.9rem!important}
    body.mh-uc-noanim *,body.mh-uc-noanim *::before,body.mh-uc-noanim *::after{animation-duration:.001s!important;animation-iteration-count:1!important;transition-duration:.001s!important}
    `;
    document.head.appendChild(css);

    function apply() {
        const p = prefs(), b = document.body;
        b.classList.toggle('mh-uc-radius', p.radius > 0);
        if (p.radius > 0) b.style.setProperty('--mh-uc-r', p.radius + 'px'); else b.style.removeProperty('--mh-uc-r');
        b.classList.toggle('mh-uc-dense', !!p.dense);
        b.classList.toggle('mh-uc-noanim', !!p.noAnim);
        document.documentElement.style.fontSize = p.scale === 100 ? '' : (16 * p.scale / 100) + 'px';
    }

    function build() {
        if ($('ui-custom-card')) return true;
        const host = document.querySelector('#profile .grid > div.space-y-6:not(.glass)');
        if (!host) return false;
        const card = document.createElement('div');
        card.id = 'ui-custom-card';
        card.className = 'glass p-8 rounded-3xl space-y-4';
        card.dataset.stab = 'look';
        card.innerHTML = `<h3 class="font-bold text-xl">🧩 Интерфейс</h3>
            <div class="uc-row"><div class="uc-lbl"><span>Скругление карточек</span><output id="uc-r-out"></output></div>
                <input type="range" id="uc-radius" min="0" max="40" step="2" aria-label="Скругление карточек"></div>
            <div class="uc-row"><div class="uc-lbl"><span>Размер текста</span><output id="uc-s-out"></output></div>
                <input type="range" id="uc-scale" min="85" max="120" step="5" aria-label="Размер текста"></div>
            <label class="uc-sw"><span>Компактные блоки<small>Меньше отступов — больше помещается на экран</small></span><input type="checkbox" id="uc-dense"></label>
            <label class="uc-sw"><span>Без анимаций<small>Мгновенные переходы, меньше нагрузки на телефон</small></span><input type="checkbox" id="uc-noanim"></label>
            <button type="button" class="uc-reset" id="uc-reset">↺ Сбросить интерфейс</button>`;
        host.appendChild(card);
        const sync = () => {
            const p = prefs();
            $('uc-radius').value = p.radius; $('uc-r-out').textContent = p.radius ? p.radius + ' px' : 'по умолчанию';
            $('uc-scale').value = p.scale; $('uc-s-out').textContent = p.scale + '%';
            $('uc-dense').checked = !!p.dense; $('uc-noanim').checked = !!p.noAnim;
        };
        card.addEventListener('input', e => {
            const p = prefs();
            if (e.target.id === 'uc-radius') p.radius = Number(e.target.value) || 0;
            else if (e.target.id === 'uc-scale') p.scale = Number(e.target.value) || 100;
            else return;
            apply(); sync(); commit();
        });
        card.addEventListener('change', e => {
            const p = prefs();
            if (e.target.id === 'uc-dense') p.dense = e.target.checked;
            else if (e.target.id === 'uc-noanim') p.noAnim = e.target.checked;
            else return;
            apply(); commit();
        });
        card.addEventListener('click', e => {
            if (!e.target.closest('#uc-reset')) return;
            Object.assign(prefs(), DEF); apply(); sync(); commit();
            try { showToast('Интерфейс сброшен', 'success'); } catch (_) {}
        });
        sync();
        return true;
    }

    function init() {
        apply();
        if (!build()) { const prof = $('profile'); if (prof) { const mo = new MutationObserver(() => { if (build()) mo.disconnect(); }); mo.observe(prof, { childList: true, subtree: true }); } }
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
    document.addEventListener('mirvel-ready', () => { apply(); build(); }, { once: true });   // данные могли загрузиться позже файла
})();
