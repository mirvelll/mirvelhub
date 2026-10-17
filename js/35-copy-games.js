/* =========================================================
   MIRVEL HUB — 35-copy-games.js (подключать в самом конце, после 34-platform-logos.js)
   Кнопка «📋 Копировать» на странице «Игры»: копирует названия игр одним кликом — чтобы закинуть в нейросеть.
   • галочка «Убрать повторки?» — находит одинаковые игры (регистр, знаки, ™/®, дефисы не мешают);
     «умное сравнение» заодно склеивает издания: Deluxe, GOTY, Complete, Definitive…
   • повторки подсвечиваются в списке, любую строку можно вручную убрать / вернуть кликом
   • формат: по строкам, нумерованный, маркеры, через запятую, JSON
   • выбор платформ, сортировка, приписка платформы и года
   • готовые вступления для нейросети («Что поиграть дальше?», «Похожие игры», «Разбор вкуса») или свой текст
   • счётчик символов и ориентировочных токенов, скачивание .txt / .json
   • Ctrl/Cmd + Enter — копировать, Esc — закрыть
   Настройки хранятся в data.copyGamesCfg (необязательное поле, попадает в бэкап).
   ========================================================= */
(() => {
    'use strict';
    const $ = id => document.getElementById(id);
    const E = s => (typeof esc === 'function' ? esc(s)
        : String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));
    const toast = (m, t) => { try { showToast(m, t); } catch (_) {} };

    /* ---------- Настройки ---------- */
    const DEF = { format: 'lines', sort: 'alpha', dedupe: true, smart: false, plat: false, year: false, hidden: false, preset: 'none', custom: '' };
    let S = { ...DEF };
    const plats = new Set();          // выбранные платформы (пусто = все)
    const manual = new Map();         // id → 'keep' | 'drop' — ручной выбор строк
    let rows = [];                    // строки текущего списка
    let tab = 'list';
    let lastFocus = null;
    let closeTimer = null;

    const FORMATS = [['lines', 'Строки'], ['numbered', '1. 2. 3.'], ['bullets', '• Маркеры'], ['comma', 'Через запятую'], ['json', 'JSON']];
    const SORTS = [['alpha', 'А → Я'], ['coll', 'Как в коллекции'], ['plat', 'По платформам']];
    const PRESETS = {
        none:      { l: 'Без вступления' },
        recommend: { l: '🎯 Во что поиграть дальше', t: n => `Вот список игр из моей коллекции (${n} шт.). Посоветуй, во что мне поиграть дальше, и коротко объясни почему:` },
        similar:   { l: '🔎 Похожие игры', t: n => `Вот игры из моей коллекции (${n} шт.). Посоветуй 10 похожих игр, которых в этом списке нет:` },
        taste:     { l: '🧠 Разбор моего вкуса', t: n => `Вот игры из моей коллекции (${n} шт.). Проанализируй мой игровой вкус: какие жанры и серии я люблю, и чего мне не хватает?` },
        custom:    { l: '✍️ Свой текст' }
    };

    const loadCfg = () => ({ ...DEF, ...((data && typeof data.copyGamesCfg === 'object' && data.copyGamesCfg) || {}) });
    const saveCfg = () => { try { data.copyGamesCfg = { ...S }; persistData(); } catch (_) {} };

    /* ---------- Поиск повторок ---------- */
    const EDITION_WORDS = /\b(deluxe|goty|game of the year|complete|definitive|ultimate|standard|collector'?s|special|gold|premium|director'?s cut|legendary|anniversary|edition|издание|полное|расширенное)\b/g;
    function normTitle(t, smart) {
        let s = String(t || '').replace(/[™®©℠]/g, '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
        s = s.replace(/&/g, ' and ');
        if (smart) s = s.replace(/[(\[][^)\]]*[)\]]/g, ' ').replace(/^the\s+/, '').replace(EDITION_WORDS, ' ');
        return s.replace(/[^\p{L}\p{N}]+/gu, '');
    }

    /* ---------- Данные ---------- */
    const allGames = () => (typeof window.mhAllGames === 'function' ? window.mhAllGames() : (data.games || []));
    function baseGames() {
        return allGames().filter(g => g && String(g.title || '').trim() && (S.hidden || !g.hidden));
    }

    function buildRows() {
        const base = baseGames().map((g, i) => ({ g, i }));
        const list = plats.size ? base.filter(x => plats.has(x.g.platform || 'Другое')) : base;
        const cmpTitle = (a, b) => String(a.g.title).localeCompare(String(b.g.title), ['ru', 'en'], { numeric: true, sensitivity: 'base' });
        if (S.sort === 'alpha') list.sort(cmpTitle);
        else if (S.sort === 'plat') list.sort((a, b) => String(a.g.platform || '').localeCompare(String(b.g.platform || ''), 'ru') || cmpTitle(a, b));
        const groups = new Map();
        rows = list.map(({ g }) => {
            const key = normTitle(g.title, S.smart) || ('#' + g.id);
            const r = { id: String(g.id), title: String(g.title).trim(), plat: g.platform || 'Другое', year: String(g.year || '').trim(), key, first: true, count: 1, all: [] };
            const grp = groups.get(key);
            if (grp) { r.first = false; grp.count++; grp.rows.push(r); } else groups.set(key, { count: 1, rows: [r], head: r });
            return r;
        });
        groups.forEach(grp => {
            grp.rows.forEach(r => { r.count = grp.count; r.head = grp.head; });
            grp.head.all = [...new Set(grp.rows.map(r => r.plat))];
        });
    }

    const kept = r => {
        const m = manual.get(r.id);
        if (m) return m === 'keep';
        return !(S.dedupe && !r.first);
    };

    /* ---------- Текст для копирования ---------- */
    function buildText(list) {
        const items = list.map(r => {
            const p = S.plat ? (S.dedupe ? r.head.all.join(' / ') : r.plat) : '';
            return { title: r.title, platform: p, year: S.year ? r.year : '' };
        });
        const line = it => {
            const extra = [it.platform, it.year].filter(Boolean).join(', ');
            return extra ? `${it.title} (${extra})` : it.title;
        };
        let body = '';
        if (S.format === 'json') {
            body = JSON.stringify(S.plat || S.year ? items.map(it => Object.fromEntries(Object.entries(it).filter(([, v]) => v))) : items.map(it => it.title), null, 2);
        } else if (S.format === 'comma') body = items.map(line).join(', ');
        else if (S.format === 'numbered') body = items.map((it, i) => `${i + 1}. ${line(it)}`).join('\n');
        else if (S.format === 'bullets') body = items.map(it => `- ${line(it)}`).join('\n');
        else body = items.map(line).join('\n');
        let head = '';
        if (S.preset === 'custom') head = String(S.custom || '').replace(/\{n\}/g, list.length).trim();
        else if (PRESETS[S.preset]?.t) head = PRESETS[S.preset].t(list.length);
        return head ? head + '\n\n' + body : body;
    }

    /* ---------- Стили ---------- */
    const css = document.createElement('style');
    css.textContent = `
    body.cg-lock{overflow:hidden}
    #cg-root{position:fixed;inset:0;z-index:49;display:none;align-items:center;justify-content:center;padding:1rem}
    #cg-root.is-mounted{display:flex}
    .cg-back{position:absolute;inset:0;background:rgba(5,5,10,.62);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);opacity:0;transition:opacity .25s}
    #cg-root.is-open .cg-back{opacity:1}
    .cg-card{position:relative;width:100%;max-width:760px;max-height:min(880px,94vh);display:flex;flex-direction:column;overflow:hidden;border-radius:1.6rem;
        background:linear-gradient(180deg,rgba(28,28,40,.97),rgba(15,15,22,.98));border:1px solid rgba(255,255,255,.1);
        box-shadow:0 30px 80px rgba(0,0,0,.6),0 0 0 1px rgba(var(--theme-rgb,139,92,246),.12),0 0 70px rgba(var(--theme-rgb,139,92,246),.14);
        opacity:0;transform:translateY(22px) scale(.95);transition:transform .38s cubic-bezier(.2,1.2,.3,1),opacity .25s;outline:none}
    #cg-root.is-open .cg-card{opacity:1;transform:none}
    .cg-card::before{content:"";position:absolute;inset:0 0 auto 0;height:3px;background:linear-gradient(90deg,transparent,rgb(var(--theme-rgb,139,92,246)),#22d3ee,transparent);background-size:200% 100%;animation:cg-flow 4s linear infinite}
    @keyframes cg-flow{to{background-position:-200% 0}}
    .cg-head{display:flex;justify-content:space-between;align-items:flex-start;gap:1rem;padding:1.3rem 1.5rem .6rem}
    .cg-head h3{font-size:1.35rem;font-weight:900;line-height:1.2}
    .cg-head p{font-size:.78rem;color:#9ca3af;margin-top:.2rem}
    .cg-x{flex:none;width:2.1rem;height:2.1rem;border-radius:.7rem;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.05);color:#d1d5db;cursor:pointer;transition:all .2s}
    .cg-x:hover{background:rgba(255,255,255,.12);color:#fff;transform:rotate(90deg)}
    .cg-body{flex:1 1 auto;min-height:0;overflow-y:auto;overscroll-behavior:contain;padding:.4rem 1.5rem 1rem;display:flex;flex-direction:column;gap:.95rem}
    .cg-lbl{font-size:10px;letter-spacing:.12em;text-transform:uppercase;font-weight:800;color:#9ca3af;margin-bottom:.4rem}

    /* главная галочка */
    .cg-dd{display:flex;align-items:center;gap:.85rem;padding:.85rem 1rem;border-radius:1.1rem;cursor:pointer;user-select:none;
        background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);transition:border-color .25s,background .25s,box-shadow .25s}
    .cg-dd:hover{background:rgba(255,255,255,.07)}
    .cg-dd.is-on{border-color:rgba(var(--theme-rgb,139,92,246),.55);background:rgba(var(--theme-rgb,139,92,246),.12);box-shadow:0 0 26px rgba(var(--theme-rgb,139,92,246),.16)}
    .cg-dd input{position:absolute;opacity:0;pointer-events:none}
    .cg-box{flex:none;width:1.65rem;height:1.65rem;border-radius:.55rem;border:2px solid rgba(255,255,255,.25);display:grid;place-items:center;transition:all .25s cubic-bezier(.3,1.5,.5,1)}
    .cg-box svg{width:1rem;height:1rem;stroke:#fff;stroke-width:3.5;fill:none;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:24;stroke-dashoffset:24;transition:stroke-dashoffset .3s .08s}
    .cg-dd.is-on .cg-box,.cg-opt.is-on .cg-box{background:rgb(var(--theme-rgb,139,92,246));border-color:transparent;transform:scale(1.08)}
    .cg-dd.is-on .cg-box svg,.cg-opt.is-on .cg-box svg{stroke-dashoffset:0}
    .cg-dd b{display:block;font-weight:900;font-size:.98rem}
    .cg-dd small{display:block;font-size:.76rem;color:#9ca3af;margin-top:.1rem}
    .cg-found{margin-left:auto;flex:none;font-size:.72rem;font-weight:900;padding:.3rem .65rem;border-radius:999px;white-space:nowrap;background:rgba(255,255,255,.07);color:#9ca3af;transition:all .25s}
    .cg-found.has{background:rgba(251,191,36,.16);color:#fbbf24;animation:cg-pulse 2s ease-in-out infinite}
    @keyframes cg-pulse{50%{box-shadow:0 0 0 6px rgba(251,191,36,0)}0%{box-shadow:0 0 0 0 rgba(251,191,36,.4)}}

    /* мелкие опции */
    .cg-opts{display:flex;flex-wrap:wrap;gap:.45rem}
    .cg-opt{display:inline-flex;align-items:center;gap:.5rem;font-size:.78rem;font-weight:700;color:#d1d5db;padding:.4rem .75rem .4rem .5rem;border-radius:.75rem;cursor:pointer;user-select:none;
        border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);transition:all .2s}
    .cg-opt:hover{background:rgba(255,255,255,.09);color:#fff}
    .cg-opt.is-on{border-color:rgba(var(--theme-rgb,139,92,246),.5);color:#fff}
    .cg-opt input{position:absolute;opacity:0;pointer-events:none}
    .cg-opt .cg-box{width:1.1rem;height:1.1rem;border-radius:.35rem;border-width:1.5px}
    .cg-opt .cg-box svg{width:.7rem;height:.7rem}

    /* сегменты и чипы */
    .cg-seg{display:flex;flex-wrap:wrap;gap:.35rem}
    .cg-seg button,.cg-chip{font-size:.76rem;font-weight:700;padding:.4rem .75rem;border-radius:.7rem;cursor:pointer;color:#c4c8d0;
        border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);transition:all .18s}
    .cg-seg button:hover,.cg-chip:hover{background:rgba(255,255,255,.1);color:#fff;transform:translateY(-1px)}
    .cg-seg button.is-on,.cg-chip.is-on{background:rgba(var(--theme-rgb,139,92,246),.25);border-color:rgb(var(--theme-rgb,139,92,246));color:#fff}
    .cg-chip i{font-style:normal;opacity:.55;margin-left:.3rem;font-size:.68rem}
    .cg-chips{display:flex;flex-wrap:wrap;gap:.35rem;max-height:6.2rem;overflow-y:auto}
    .cg-select,.cg-ta{width:100%;font-size:.82rem;color:#fff;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:.8rem;padding:.6rem .8rem;outline:none;transition:border-color .2s}
    .cg-select:focus,.cg-ta:focus{border-color:rgba(var(--theme-rgb,139,92,246),.6)}
    .cg-select option{background:#17171f}
    .cg-ta{resize:vertical;min-height:3.4rem;margin-top:.45rem;font-family:inherit}
    .cg-two{display:grid;grid-template-columns:1fr 1fr;gap:.95rem}

    /* просмотр */
    .cg-tabs{position:relative;display:inline-flex;padding:.2rem;border-radius:.85rem;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08)}
    .cg-tabs button{position:relative;z-index:1;font-size:.76rem;font-weight:800;padding:.4rem 1rem;color:#9ca3af;cursor:pointer;transition:color .2s}
    .cg-tabs button.is-on{color:#fff}
    .cg-tabs .cg-ind{position:absolute;top:.2rem;bottom:.2rem;left:.2rem;width:calc(50% - .2rem);border-radius:.65rem;background:rgba(var(--theme-rgb,139,92,246),.4);transition:transform .3s cubic-bezier(.3,1.3,.5,1)}
    .cg-tabs.is-text .cg-ind{transform:translateX(100%)}
    .cg-prev-head{display:flex;justify-content:space-between;align-items:center;gap:.6rem;flex-wrap:wrap}
    .cg-reset{font-size:.72rem;color:#a78bfa;cursor:pointer;text-decoration:underline;text-underline-offset:3px}
    .cg-list{list-style:none;margin:0;padding:.35rem;border-radius:1rem;background:rgba(0,0,0,.28);border:1px solid rgba(255,255,255,.07);max-height:15.5rem;overflow-y:auto;overscroll-behavior:contain}
    .cg-row{display:flex;align-items:center;gap:.6rem;padding:.42rem .6rem;border-radius:.65rem;cursor:pointer;font-size:.83rem;transition:background .15s,opacity .3s,transform .3s}
    .cg-row:hover{background:rgba(255,255,255,.06)}
    .cg-list.cg-enter .cg-row{animation:cg-in .38s both;animation-delay:calc(var(--i,0)*18ms)}
    @keyframes cg-in{from{opacity:0;transform:translateX(-12px)}}
    .cg-n{flex:none;width:1.9rem;text-align:right;font-size:.68rem;color:#6b7280;font-variant-numeric:tabular-nums}
    .cg-main{flex:1;min-width:0}
    .cg-t{display:block;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;position:relative;width:fit-content;max-width:100%}
    .cg-t::after{content:"";position:absolute;left:0;top:52%;height:2px;width:100%;background:#f87171;transform:scaleX(0);transform-origin:left;transition:transform .35s}
    .cg-m{display:block;font-size:.68rem;color:#6b7280;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .cg-m .all{display:none}
    #cg-root.is-dd .cg-m .all{display:inline}
    #cg-root.is-dd .cg-m .own.has-all{display:none}
    .cg-bd{flex:none;font-size:.62rem;font-weight:900;padding:.15rem .45rem;border-radius:999px;background:rgba(251,191,36,.16);color:#fbbf24}
    .cg-bd.ghost{background:rgba(248,113,113,.14);color:#f87171}
    .cg-tick{flex:none;width:1.1rem;height:1.1rem;border-radius:50%;display:grid;place-items:center;background:rgb(var(--theme-rgb,139,92,246));transition:all .25s cubic-bezier(.3,1.5,.5,1)}
    .cg-tick::after{content:"✓";font-size:.65rem;font-weight:900;color:#fff}
    .cg-row.is-off{opacity:.42}
    .cg-row.is-off .cg-t::after{transform:scaleX(1)}
    .cg-row.is-off .cg-tick{background:transparent;border:1.5px solid rgba(255,255,255,.22)}
    .cg-row.is-off .cg-tick::after{content:""}
    .cg-empty{padding:2rem 1rem;text-align:center;color:#6b7280;font-size:.85rem}
    .cg-out{width:100%;height:15.5rem;resize:none;font:12px/1.55 ui-monospace,SFMono-Regular,Menlo,monospace;color:#e5e7eb;background:rgba(0,0,0,.35);border:1px solid rgba(255,255,255,.08);border-radius:1rem;padding:.8rem 1rem;outline:none}
    .cg-pane{animation:cg-fade .25s}
    @keyframes cg-fade{from{opacity:0;transform:translateY(6px)}}

    /* низ */
    .cg-foot{display:flex;align-items:center;gap:.7rem;flex-wrap:wrap;padding:.9rem 1.5rem 1.2rem;border-top:1px solid rgba(255,255,255,.07);background:rgba(0,0,0,.18)}
    .cg-stats{flex:1 1 150px;font-size:.75rem;color:#9ca3af;line-height:1.45}
    .cg-stats b{color:#fff;font-weight:900;font-size:1rem;font-variant-numeric:tabular-nums}
    .cg-sec{font-size:.8rem;font-weight:800;padding:.7rem 1rem;border-radius:.9rem;cursor:pointer;color:#d1d5db;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.05);transition:all .2s}
    .cg-sec:hover{background:rgba(255,255,255,.12);color:#fff}
    .cg-copy{position:relative;display:inline-flex;align-items:center;gap:.5rem;font-weight:900;font-size:.9rem;padding:.8rem 1.6rem;border-radius:1rem;cursor:pointer;color:#fff;border:0;overflow:visible;
        background:linear-gradient(135deg,rgb(var(--theme-rgb,139,92,246)),#06b6d4);box-shadow:0 8px 26px rgba(var(--theme-rgb,139,92,246),.4);transition:transform .2s,box-shadow .2s,background .3s}
    .cg-copy:hover{transform:translateY(-2px) scale(1.03);box-shadow:0 12px 34px rgba(var(--theme-rgb,139,92,246),.55)}
    .cg-copy:active{transform:scale(.96)}
    .cg-copy.is-done{background:linear-gradient(135deg,#10b981,#22c55e);box-shadow:0 8px 26px rgba(16,185,129,.45)}
    .cg-copy.is-empty{opacity:.45;cursor:not-allowed;animation:cg-shake .4s}
    @keyframes cg-shake{25%{transform:translateX(-5px)}75%{transform:translateX(5px)}}
    .cg-copy .ico{display:inline-grid;width:1.1rem;height:1.1rem}
    .cg-copy .ico>*{grid-area:1/1;transition:transform .3s,opacity .3s}
    .cg-copy .ico .ok{opacity:0;transform:scale(.3) rotate(-60deg)}
    .cg-copy.is-done .ico .cp{opacity:0;transform:scale(.3) rotate(60deg)}
    .cg-copy.is-done .ico .ok{opacity:1;transform:none}
    .cg-spark{position:absolute;left:50%;top:50%;width:7px;height:7px;border-radius:50%;pointer-events:none;background:var(--c);animation:cg-spark .75s ease-out forwards}
    @keyframes cg-spark{to{transform:translate(var(--x),var(--y)) scale(.2);opacity:0}}
    .cg-btn-copy-main{gap:.4rem}

    @media (max-width:640px){
        #cg-root{align-items:flex-end;padding:0}
        .cg-card{max-width:none;max-height:94vh;border-radius:1.6rem 1.6rem 0 0;transform:translateY(100%)}
        .cg-two{grid-template-columns:1fr}
        .cg-head,.cg-body,.cg-foot{padding-left:1rem;padding-right:1rem}
        .cg-copy{flex:1 1 100%;justify-content:center}
    }
    @media (prefers-reduced-motion:reduce){
        .cg-card,.cg-back,.cg-row,.cg-box,.cg-tick,.cg-ind,.cg-t::after{transition:none!important}
        .cg-card::before,.cg-found.has,.cg-list.cg-enter .cg-row,.cg-pane{animation:none!important}
    }`;
    document.head.appendChild(css);

    /* ---------- Каркас окна ---------- */
    const CHECK = '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7"/></svg>';
    const seg = (name, arr) => `<div class="cg-seg" data-seg="${name}">${arr.map(([v, t]) => `<button type="button" data-v="${v}">${t}</button>`).join('')}</div>`;
    const opt = (k, t) => `<label class="cg-opt" data-opt="${k}"><input type="checkbox" data-k="${k}"><span class="cg-box">${CHECK}</span>${t}</label>`;

    function ensure() {
        if ($('cg-root')) return;
        const root = document.createElement('div');
        root.id = 'cg-root';
        root.setAttribute('role', 'dialog');
        root.setAttribute('aria-modal', 'true');
        root.setAttribute('aria-label', 'Копировать список игр');
        root.innerHTML = `
        <div class="cg-back" data-act="close"></div>
        <div class="cg-card" id="cg-card" tabindex="-1">
            <div class="cg-head">
                <div><h3>📋 Копировать список игр</h3><p>Соберите названия и отправьте в ChatGPT, Claude, Gemini — одним кликом</p></div>
                <button type="button" class="cg-x" data-act="close" aria-label="Закрыть">✕</button>
            </div>
            <div class="cg-body">
                <label class="cg-dd" id="cg-dd">
                    <input type="checkbox" data-k="dedupe">
                    <span class="cg-box">${CHECK}</span>
                    <span><b>Убрать повторки?</b><small id="cg-dd-sub">Одинаковые игры попадут в список только один раз</small></span>
                    <span class="cg-found" id="cg-found">—</span>
                </label>

                <div class="cg-opts">
                    ${opt('smart', '🧠 Умное сравнение (Deluxe, GOTY, Complete = та же игра)')}
                    ${opt('plat', '🎮 Добавить платформу')}
                    ${opt('year', '📅 Добавить год')}
                    <span id="cg-hid-wrap">${opt('hidden', '🙈 Включить скрытые')}</span>
                </div>

                <div><p class="cg-lbl">Платформы <span id="cg-plat-hint" style="text-transform:none;letter-spacing:0;font-weight:600"></span></p><div class="cg-chips" id="cg-plats"></div></div>

                <div class="cg-two">
                    <div><p class="cg-lbl">Формат</p>${seg('format', FORMATS)}</div>
                    <div><p class="cg-lbl">Порядок</p>${seg('sort', SORTS)}</div>
                </div>

                <div>
                    <p class="cg-lbl">Вступление для нейросети</p>
                    <select class="cg-select" id="cg-preset">${Object.entries(PRESETS).map(([k, p]) => `<option value="${k}">${p.l}</option>`).join('')}</select>
                    <textarea class="cg-ta" id="cg-custom" rows="2" placeholder="Ваш текст. {n} — подставит количество игр" style="display:none"></textarea>
                </div>

                <div>
                    <div class="cg-prev-head">
                        <div class="cg-tabs" id="cg-tabs"><span class="cg-ind"></span>
                            <button type="button" data-tab="list" class="is-on">Список</button><button type="button" data-tab="text">Текст</button></div>
                        <span class="cg-reset" id="cg-reset" data-act="reset" style="display:none">↺ сбросить ручной выбор</span>
                    </div>
                    <p style="font-size:.7rem;color:#6b7280;margin:.45rem 0" id="cg-tip">Нажмите на строку, чтобы убрать или вернуть игру вручную</p>
                    <div class="cg-pane" id="cg-pane"></div>
                </div>
            </div>
            <div class="cg-foot">
                <div class="cg-stats" id="cg-stats"></div>
                <button type="button" class="cg-sec" data-act="download">⬇ Файл</button>
                <button type="button" class="cg-copy" id="cg-copy" data-act="copy">
                    <span class="ico">
                        <svg class="cp" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="12" height="12" rx="2.5"/><path d="M5 15V6a2 2 0 0 1 2-2h8"/></svg>
                        <svg class="ok" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7"/></svg>
                    </span><span id="cg-copy-t">Копировать</span>
                </button>
            </div>
        </div>`;
        document.body.appendChild(root);

        root.addEventListener('click', onClick);
        root.addEventListener('change', onChange);
        root.addEventListener('input', e => {
            if (e.target.id === 'cg-custom') { S.custom = e.target.value; saveCfg(); paint(); }
        });
        document.addEventListener('keydown', e => {
            if (!root.classList.contains('is-open')) return;
            if (e.key === 'Escape') { e.preventDefault(); close(); }
            else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); doCopy(); }
        });
    }

    /* ---------- События ---------- */
    function onClick(e) {
        const t = e.target;
        const act = t.closest('[data-act]');
        if (act) {
            const a = act.dataset.act;
            if (a === 'close') return close();
            if (a === 'copy') return doCopy();
            if (a === 'download') return doDownload();
            if (a === 'reset') { manual.clear(); return paint(); }
        }
        const sg = t.closest('[data-seg] button');
        if (sg) { S[sg.parentElement.dataset.seg] = sg.dataset.v; saveCfg(); rebuild(); return; }
        const chip = t.closest('.cg-chip');
        if (chip) {
            const v = chip.dataset.p;
            if (v === '') plats.clear(); else if (plats.has(v)) plats.delete(v); else plats.add(v);
            return rebuild();
        }
        const tb = t.closest('[data-tab]');
        if (tb) { tab = tb.dataset.tab; return paintPane(true); }
        const row = t.closest('.cg-row');
        if (row) {
            const r = rows.find(x => x.id === row.dataset.id);
            if (r) { manual.set(r.id, kept(r) ? 'drop' : 'keep'); paint(); }
        }
    }

    function onChange(e) {
        const el = e.target;
        if (el.dataset.k) {
            S[el.dataset.k] = el.checked;
            saveCfg();
            if (el.dataset.k === 'dedupe' || el.dataset.k === 'plat' || el.dataset.k === 'year') { syncControls(); paint(); }
            else rebuild();
        } else if (el.id === 'cg-preset') {
            S.preset = el.value; saveCfg(); syncControls(); paint();
        }
    }

    /* ---------- Отрисовка ---------- */
    function syncControls() {
        const root = $('cg-root');
        root.querySelectorAll('input[data-k]').forEach(i => {
            i.checked = !!S[i.dataset.k];
            i.closest('.cg-dd,.cg-opt')?.classList.toggle('is-on', i.checked);
        });
        root.querySelectorAll('[data-seg]').forEach(g => g.querySelectorAll('button').forEach(b => b.classList.toggle('is-on', S[g.dataset.seg] === b.dataset.v)));
        $('cg-preset').value = S.preset;
        const ta = $('cg-custom');
        ta.style.display = S.preset === 'custom' ? '' : 'none';
        if (document.activeElement !== ta) ta.value = S.custom || '';
        root.classList.toggle('is-dd', !!S.dedupe);
        $('cg-hid-wrap').style.display = allGames().some(g => g && g.hidden) ? '' : 'none';
    }

    function renderChips() {
        const base = baseGames();
        const cnt = new Map();
        base.forEach(g => { const p = g.platform || 'Другое'; cnt.set(p, (cnt.get(p) || 0) + 1); });
        [...plats].forEach(p => { if (!cnt.has(p)) plats.delete(p); });
        const list = [...cnt.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ru'));
        $('cg-plats').innerHTML = `<button type="button" class="cg-chip${plats.size ? '' : ' is-on'}" data-p="">Все<i>${base.length}</i></button>` +
            list.map(([p, n]) => `<button type="button" class="cg-chip${plats.has(p) ? ' is-on' : ''}" data-p="${E(p)}">${E(p)}<i>${n}</i></button>`).join('');
        $('cg-plat-hint').textContent = plats.size ? `· выбрано ${plats.size}` : '';
    }

    function rebuild(animate) {
        buildRows();
        renderChips();
        syncControls();
        const pane = $('cg-pane');
        pane.dataset.built = '';
        paintPane(!!animate, true);
        paint();
    }

    function paintPane(animate, force) {
        const pane = $('cg-pane');
        $('cg-tabs').classList.toggle('is-text', tab === 'text');
        $('cg-tabs').querySelectorAll('button').forEach(b => b.classList.toggle('is-on', b.dataset.tab === tab));
        $('cg-tip').style.display = tab === 'list' ? '' : 'none';
        if (tab === 'text') {
            pane.innerHTML = '<textarea class="cg-out" id="cg-out" readonly spellcheck="false"></textarea>';
            $('cg-out').addEventListener('focus', e => e.target.select());
            if (animate) { pane.classList.remove('cg-pane'); void pane.offsetWidth; pane.classList.add('cg-pane'); }
            paint();
            return;
        }
        if (!rows.length) { pane.innerHTML = '<div class="cg-empty">Игр не найдено 🕳️<br>Добавьте диски или измените выбор платформ</div>'; return; }
        pane.innerHTML = `<ul class="cg-list${animate ? ' cg-enter' : ''}">` + rows.map((r, n) => {
            const dup = r.count > 1;
            const hasAll = r.first && r.all.length > 1;
            const meta = `<span class="own${hasAll ? ' has-all' : ''}">${E(r.plat)}</span>${hasAll ? `<span class="all">${r.all.map(E).join(' · ')}</span>` : ''}${r.year ? ' · ' + E(r.year) : ''}`;
            return `<li class="cg-row" data-id="${E(r.id)}" style="--i:${Math.min(n, 24)}">
                <span class="cg-n">${n + 1}</span>
                <span class="cg-main"><span class="cg-t">${E(r.title)}</span><span class="cg-m">${meta}</span></span>
                ${dup ? (r.first ? `<span class="cg-bd" title="Эта игра встречается ${r.count} р.">×${r.count}</span>` : '<span class="cg-bd ghost">повтор</span>') : ''}
                <span class="cg-tick"></span></li>`;
        }).join('') + '</ul>';
        paint();
    }

    function paint() {
        const root = $('cg-root');
        if (!root) return;
        const keptRows = rows.filter(kept);
        // строки списка
        root.querySelectorAll('.cg-row').forEach(el => {
            const r = rows.find(x => x.id === el.dataset.id);
            if (r) el.classList.toggle('is-off', !kept(r));
        });
        // повторки
        const groups = new Set(rows.filter(r => r.count > 1).map(r => r.key));
        const extra = rows.filter(r => !r.first).length;
        const found = $('cg-found');
        found.classList.toggle('has', extra > 0);
        found.textContent = extra ? `найдено: ${extra}` : 'повторов нет ✨';
        $('cg-dd-sub').textContent = extra
            ? (S.dedupe ? `Уберём ${extra} лишн. из ${groups.size} игр${S.smart ? '' : ' — включите «умное сравнение» для изданий'}` : `${groups.size} игр встречаются несколько раз — они подсвечены в списке`)
            : 'Одинаковые игры попадут в список только один раз';
        // текст и статистика
        const text = buildText(keptRows);
        const out = $('cg-out');
        if (out) out.value = text;
        const chars = text.length;
        const tokens = Math.round(chars / 3.6);
        $('cg-stats').innerHTML = `<b>${keptRows.length}</b> из ${rows.length} игр<br>${chars.toLocaleString('ru-RU')} симв. · ≈ ${tokens.toLocaleString('ru-RU')} токенов`;
        $('cg-reset').style.display = manual.size ? '' : 'none';
        $('cg-copy').classList.toggle('is-empty', !keptRows.length);
        root._text = text;
        root._count = keptRows.length;
    }

    /* ---------- Копирование ---------- */
    async function writeClipboard(text) {
        try {
            if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(text); return true; }
        } catch (_) {}
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0';
        document.body.appendChild(ta);
        ta.focus(); ta.select();
        let ok = false;
        try { ok = document.execCommand('copy'); } catch (_) {}
        ta.remove();
        return ok;
    }

    function burst(btn) {
        const colors = ['#fbbf24', '#22d3ee', '#a78bfa', '#34d399', '#f472b6', '#fff'];
        for (let i = 0; i < 16; i++) {
            const s = document.createElement('span');
            s.className = 'cg-spark';
            const a = (Math.PI * 2 * i) / 16 + Math.random() * .4, d = 46 + Math.random() * 36;
            s.style.setProperty('--x', Math.cos(a) * d + 'px');
            s.style.setProperty('--y', Math.sin(a) * d + 'px');
            s.style.setProperty('--c', colors[i % colors.length]);
            btn.appendChild(s);
            setTimeout(() => s.remove(), 800);
        }
    }

    let doneTimer = null;
    async function doCopy() {
        const root = $('cg-root'), btn = $('cg-copy');
        if (!root._count) {
            btn.classList.remove('is-empty'); void btn.offsetWidth; btn.classList.add('is-empty');
            toast('Список пуст — нечего копировать', 'error');
            return;
        }
        const ok = await writeClipboard(root._text);
        if (!ok) { toast('Не удалось скопировать. Откройте вкладку «Текст» и скопируйте вручную', 'error'); return; }
        btn.classList.add('is-done');
        $('cg-copy-t').textContent = 'Скопировано!';
        burst(btn);
        toast(`Скопировано игр: <b>${root._count}</b> 📋 Вставляйте в нейросеть`, 'success');
        clearTimeout(doneTimer);
        doneTimer = setTimeout(() => { btn.classList.remove('is-done'); $('cg-copy-t').textContent = 'Копировать'; }, 2200);
    }

    function doDownload() {
        const root = $('cg-root');
        if (!root._count) { toast('Список пуст', 'error'); return; }
        const ext = S.format === 'json' ? 'json' : 'txt';
        const blob = new Blob([root._text], { type: ext === 'json' ? 'application/json' : 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `mirvel-games-${new Date().toISOString().slice(0, 10)}.${ext}`;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        toast('Файл сохранён ⬇', 'success');
    }

    /* ---------- Открыть / закрыть ---------- */
    function open() {
        ensure();
        clearTimeout(closeTimer);
        S = loadCfg();
        manual.clear(); plats.clear(); tab = 'list';
        lastFocus = document.activeElement;
        const root = $('cg-root');
        root.classList.add('is-mounted');
        document.body.classList.add('cg-lock');
        rebuild(true);
        requestAnimationFrame(() => requestAnimationFrame(() => { root.classList.add('is-open'); $('cg-card').focus({ preventScroll: true }); }));
    }

    function close() {
        const root = $('cg-root');
        if (!root) return;
        root.classList.remove('is-open');
        document.body.classList.remove('cg-lock');
        closeTimer = setTimeout(() => root.classList.remove('is-mounted'), 320);
        try { lastFocus?.focus?.({ preventScroll: true }); } catch (_) {}
    }

    window.openCopyGames = open;

    /* ---------- Кнопка на странице «Игры» ---------- */
    function addButton() {
        const sec = $('games');
        if (!sec || $('mh-copy-games-btn')) return;
        const viewBtn = $('game-view-btn');
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.id = 'mh-copy-games-btn';
        btn.className = viewBtn ? viewBtn.className : 'mh-btn';
        btn.title = 'Скопировать названия игр (например, для нейросети)';
        btn.textContent = '📋 Копировать';
        btn.addEventListener('click', open);
        if (viewBtn) viewBtn.insertAdjacentElement('beforebegin', btn);
        else (sec.firstElementChild || sec).appendChild(btn);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', addButton); else addButton();
})();
