/* =========================================================
   MIRVEL HUB — 57-wish-budget.js (подключается после 56-wish-groups.js)
   «Желаемое» → «⏳ Накопление по категориям» стало слишком большим (10 плиток по 5 в ряд).
   Теперь:
   • самые «тяжёлые» категории (по сумме) остаются крупными плитками — по умолчанию 4, можно выбрать 2 / 4 / все;
   • остальные — маленькие плитки в одну строку (иконка, название, штук, сумма);
   • заголовок блока — кнопка: нажатие сворачивает / разворачивает блок (плавно); выбор запоминается.
   Нажатие на плитку по-прежнему включает фильтр (55-wish-cats.js).
   Откат: убрать '57-wish-budget.js' из списка в 00-storage.js.
   ========================================================= */
(() => {
    'use strict';
    const box = document.getElementById('category-budget-breakdown');
    if (!box) return;
    const K_COLL = 'mh_bb_collapsed', K_BIG = 'mh_bb_big';
    const lsGet = k => { try { return localStorage.getItem(k); } catch (_) { return null; } };
    const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (_) {} };
    const reduce = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

    let collapsed = lsGet(K_COLL) === '1';
    let big = ['2', '4', '99'].includes(lsGet(K_BIG)) ? Number(lsGet(K_BIG)) : 4;

    const css = document.createElement('style');
    css.textContent = `
    #category-budget-breakdown.bb-flex{display:flex;flex-wrap:wrap;gap:10px;align-items:stretch}
    #category-budget-breakdown.bb-flex > p{flex:1 1 100%}
    #category-budget-breakdown .bb-big{order:0;flex:1 1 calc(100% / var(--bb-n, 4) - 10px);min-width:136px}
    #category-budget-breakdown .bb-big > div:first-child > div{flex-wrap:wrap;gap:0 8px}
    @media (max-width:520px){#category-budget-breakdown .bb-big{flex-basis:calc(50% - 10px)}#category-budget-breakdown .bb-big{padding:10px !important}}
    #category-budget-breakdown .bb-small{order:2;flex:0 1 auto;flex-direction:row !important;align-items:center;gap:10px;padding:7px 12px !important;border-radius:999px !important;min-height:0}
    #category-budget-breakdown .bb-small > div:first-child{display:flex;align-items:center;gap:10px}
    #category-budget-breakdown .bb-small > div:first-child > div{margin:0 !important;gap:8px}
    #category-budget-breakdown .bb-small > div:first-child > p{margin:0}
    #category-budget-breakdown .bb-small > .mt-3{display:none}
    #category-budget-breakdown .bb-small.bb-zero{opacity:.55}
    .bb-head{display:flex;flex-wrap:wrap;align-items:center;gap:8px 14px;margin-bottom:.75rem}
    .bb-head > p{margin:0 !important}
    .bb-toggle{display:inline-flex;align-items:center;gap:8px;min-height:32px;padding:4px 6px;margin:-4px -6px;border-radius:10px;background:none;border:0;color:inherit;cursor:pointer;text-align:left;transition:background-color .2s}
    .bb-toggle:hover{background:rgba(255,255,255,.05)}
    .bb-toggle:focus-visible,.bb-seg button:focus-visible{outline:2px solid var(--theme-btn,#8b5cf6);outline-offset:2px}
    .bb-chev{font-size:13px;line-height:1;color:#9ca3af;transition:transform .25s ease}
    .bb-toggle[aria-expanded="false"] .bb-chev{transform:rotate(-90deg)}
    .bb-seg{margin-left:auto;display:inline-flex;align-items:center;gap:3px;padding:3px;border-radius:999px;background:rgba(0,0,0,.3);border:1px solid rgba(255,255,255,.08)}
    .bb-seg > span{font-size:10px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#6b7280;padding:0 6px 0 8px}
    .bb-seg button{min-height:26px;min-width:28px;padding:2px 10px;border-radius:999px;font-size:12px;font-weight:700;color:#9ca3af;cursor:pointer;border:1px solid transparent;transition:background-color .2s,color .2s}
    .bb-seg button:hover{color:#fff;background:rgba(255,255,255,.08)}
    .bb-seg button.is-on{color:#fff;background:rgba(var(--theme-rgb),.35);border-color:rgba(var(--theme-rgb),.7)}
    .bb-seg[hidden]{display:none}
    .bb-fold{display:grid;grid-template-rows:1fr;transition:grid-template-rows .25s ease,opacity .25s ease}
    .bb-fold > div{min-height:0;overflow:hidden}
    .bb-fold.is-closed{grid-template-rows:0fr;opacity:0}
    @media (max-width:520px){.bb-seg{margin-left:0}}
    @media (prefers-reduced-motion:reduce){.bb-fold,.bb-chev{transition:none}}`;
    document.head.appendChild(css);

    /* ---------- заголовок-кнопка и «складка» ---------- */
    const wrap = box.parentElement;                       // <div class="mt-4 pt-4 border-t …">
    const title = wrap && wrap.querySelector(':scope > p');
    const head = document.createElement('div');
    head.className = 'bb-head';
    const toggle = document.createElement('button');
    toggle.type = 'button'; toggle.className = 'bb-toggle';
    toggle.setAttribute('aria-controls', 'bb-fold');
    const chev = document.createElement('span'); chev.className = 'bb-chev'; chev.setAttribute('aria-hidden', 'true'); chev.textContent = '▾';
    if (title) { toggle.appendChild(title); } else { const t = document.createElement('span'); t.textContent = '⏳ Накопление по категориям'; toggle.appendChild(t); }
    toggle.appendChild(chev);
    const seg = document.createElement('div');
    seg.className = 'bb-seg'; seg.setAttribute('role', 'group'); seg.setAttribute('aria-label', 'Сколько крупных плиток');
    seg.innerHTML = '<span>Крупных:</span><button type="button" data-n="2">2</button><button type="button" data-n="4">4</button><button type="button" data-n="99">Все</button>';
    head.appendChild(toggle); head.appendChild(seg);
    const fold = document.createElement('div');
    fold.className = 'bb-fold'; fold.id = 'bb-fold';
    const foldIn = document.createElement('div');
    wrap.insertBefore(head, box); wrap.insertBefore(fold, box);
    fold.appendChild(foldIn); foldIn.appendChild(box);

    function paintHead() {
        toggle.setAttribute('aria-expanded', String(!collapsed));
        toggle.title = collapsed ? 'Развернуть' : 'Свернуть';
        fold.classList.toggle('is-closed', collapsed);
        if (collapsed) foldIn.setAttribute('inert', ''); else foldIn.removeAttribute('inert');
        seg.hidden = collapsed;
        seg.querySelectorAll('button').forEach(b => { const on = Number(b.dataset.n) === big; b.classList.toggle('is-on', on); b.setAttribute('aria-pressed', String(on)); });
    }
    toggle.addEventListener('click', () => { collapsed = !collapsed; lsSet(K_COLL, collapsed ? '1' : '0'); paintHead(); });
    seg.addEventListener('click', e => {
        const b = e.target.closest('button[data-n]'); if (!b) return;
        big = Number(b.dataset.n); lsSet(K_BIG, String(big)); paintHead(); arrange();
    });

    /* ---------- раскладка плиток ---------- */
    const sumOf = el => { const p = el.querySelector('p.font-mono, p'); const n = p ? parseInt(String(p.textContent).replace(/[^\d]/g, ''), 10) : 0; return Number.isFinite(n) ? n : 0; };
    let busy = false, raf = 0;
    function arrange() {
        busy = true;
        try {
            const tiles = [...box.children].filter(el => el.dataset && el.dataset.cat);
            box.classList.toggle('bb-flex', tiles.length > 0);
            if (!tiles.length) return;
            const ranked = tiles.map((el, i) => ({ el, i, s: sumOf(el) })).sort((a, b) => b.s - a.s || a.i - b.i);
            const bigN = Math.max(1, Math.min(big, ranked.filter(x => x.s > 0).length || 1));
            box.style.setProperty('--bb-n', String(Math.min(bigN, 5)));
            ranked.forEach((x, k) => {
                const isBig = k < bigN && (x.s > 0 || k === 0);
                x.el.classList.toggle('bb-big', isBig);
                x.el.classList.toggle('bb-small', !isBig);
                x.el.classList.toggle('bb-zero', !isBig && x.s === 0);
                x.el.style.order = isBig ? String(k) : String(100 + (x.s > 0 ? 0 : 50) + k);
            });
        } finally { if (typeof mo !== 'undefined') mo.takeRecords(); busy = false; }
    }
    const mo = new MutationObserver(() => { if (!busy && !raf) raf = requestAnimationFrame(() => { raf = 0; arrange(); }); });
    mo.observe(box, { childList: true });
    paintHead();
    arrange();
})();
