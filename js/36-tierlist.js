/* =========================================================
   MIRVEL HUB — 36-tierlist.js (подключать в самом конце, после 35-copy-games.js)
   Новая страница «Тир-листы 🏅» — как на TierMaker:
   • тиры S/A/B/C/D/F: свои названия, цвета, порядок, можно добавлять и удалять
   • игры и музыка (CD + винил) из вашей коллекции, свои картинки (файлом или ссылкой, в т.ч. ссылка Spotify)
   • импорт данных Spotify (StreamingHistory / Streaming_History_Audio / YourLibrary .json) → топ исполнителей / треков / альбомов
   • перетаскивание мышью и пальцем, сохранение в data.tierLists (попадает в бэкап), экспорт в PNG
   ========================================================= */
(() => {
    'use strict';
    const $ = id => document.getElementById(id);
    const E = s => (typeof esc === 'function' ? esc(s) : String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));
    const toast = (m, t) => { try { showToast(m, t); } catch (_) {} };
    const uid = () => 't' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const save = () => { try { persistData(); } catch (_) {} };
    const imgSrc = s => { const v = String(s || ''); return /^data:image\//i.test(v) ? v : (typeof safeUrl === 'function' ? safeUrl(v) : ''); };

    const COLORS = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e', '#06b6d4', '#6366f1', '#d946ef'];
    const mkTiers = labels => labels.map((t, i) => ({ id: uid() + i, label: t, color: COLORS[i % COLORS.length] }));
    const lists = () => { if (!Array.isArray(data.tierLists)) data.tierLists = []; return data.tierLists; };
    const L = () => lists().find(l => l.id === data.tierActive) || lists()[0];
    const fg = hex => { const n = parseInt(hex.slice(1), 16); return ((n >> 16) * .299 + ((n >> 8) & 255) * .587 + (n & 255) * .114) > 150 ? '#111' : '#fff'; };
    const hue = s => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) % 360; return h; };

    let tab = 'games', q = '', addOpen = false;
    const pick = new Set();

    /* ---------- Предметы ---------- */
    function info(it) {
        if (it.src === 'custom') return { t: it.t, sub: it.sub, img: it.img };
        const o = (data[it.src] || []).find(x => String(x.id) === String(it.ref));
        return o ? { t: o.title, sub: it.src === 'games' ? o.platform : o.artist, img: o.img } : null;
    }
    const SIZES = [60, 76, 92, 112, 136];
    const SIZE_NAMES = ['Очень мелко', 'Мелко', 'Стандарт', 'Крупно', 'Очень крупно'];
    let dedupe = data.tierDedupe !== false;
    const newIds = new Set();
    const normT = t => String(t || '').replace(/[™®©℠]/g, '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/&/g, ' and ').replace(/[^\p{L}\p{N}]+/gu, '');
    const keyOf = it => { const i = info(it); if (!i) return ''; return it.src === 'games' ? normT(i.t) : normT((i.sub || '') + '|' + i.t); };
    const uniq = arr => { const seen = new Set(); return arr.filter(a => { const k = keyOf(a); if (!k) return true; if (seen.has(k)) return false; seen.add(k); return true; }); };
    const GROUPS = ['PlayStation', 'Xbox', 'Nintendo', 'Sega', 'Steam', 'Epic Games', 'GOG', 'PC (диск)', 'Другое'];
    const groupOf = p => {
        p = String(p || '');
        if (/^(PlayStation|PS\d|PS\b|PSP)/i.test(p)) return 'PlayStation';
        if (/^Xbox/i.test(p)) return 'Xbox';
        if (/^(Nintendo|SNES|Game Boy)/i.test(p)) return 'Nintendo';
        if (/^Sega/i.test(p)) return 'Sega';
        if (/^Steam/i.test(p)) return 'Steam';
        if (/^Epic/i.test(p)) return 'Epic Games';
        if (/^GOG/i.test(p)) return 'GOG';
        if (/^PC/i.test(p)) return 'PC (диск)';
        return 'Другое';
    };

    // новые карточки встают в начало списка (в «Не размещено» они сверху)
    function addItems(l, arr) {
        const fresh = [];
        arr.forEach(a => {
            const all = [...fresh, ...l.items];
            if (a.src !== 'custom' && all.some(x => x.src === a.src && String(x.ref) === String(a.ref))) return;
            if (a.src === 'custom' && a.key && all.some(x => x.key === a.key)) return;
            fresh.push({ id: uid(), tier: '', ...a });
        });
        l.items = [...fresh, ...l.items];
        fresh.forEach(x => newIds.add(x.id));
        return fresh.length;
    }
    const fromCollection = (src, o) => ({ src, ref: o.id });
    const allMusic = () => [...(data.cds || []).map(o => ['cds', o]), ...(data.vinyls || []).map(o => ['vinyls', o])];

    function createList(name, kind, dd) {
        const l = { id: uid(), name: name || 'Мой тир-лист', shape: kind === 'games' ? 'pt' : 'sq', caps: false, sz: 3, tiers: mkTiers(['S', 'A', 'B', 'C', 'D', 'F']), items: [] };
        const fix = a => (dd ? uniq(a) : a);
        if (kind === 'games') addItems(l, fix((data.games || []).map(o => fromCollection('games', o))));
        if (kind === 'music') addItems(l, fix(allMusic().map(([s, o]) => fromCollection(s, o))));
        newIds.clear();
        lists().push(l); data.tierActive = l.id; save();
        return l;
    }

    /* ---------- Каркас страницы ---------- */
    const css = document.createElement('style');
    css.textContent = `
    #tiers{--tl-s:92px}
    .tl-bar{display:flex;flex-wrap:wrap;gap:.6rem;align-items:center;padding:.8rem 1rem;border-radius:1.2rem;margin:1rem 0}
    .tl-bar .sp{flex:1}
    .tl-sel,.tl-in{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);color:#fff;border-radius:.8rem;padding:.55rem .8rem;font-size:.85rem;outline:none;min-width:0}
    .tl-sel option{background:#17171f}
    .tl-in:focus,.tl-sel:focus{border-color:rgb(var(--theme-rgb,139,92,246))}
    .tl-b{font-size:.78rem;font-weight:800;padding:.55rem .9rem;border-radius:.8rem;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.05);color:#d1d5db;cursor:pointer;transition:all .18s;white-space:nowrap}
    .tl-b:hover{background:rgba(255,255,255,.12);color:#fff;transform:translateY(-1px)}
    .tl-b.on{background:rgba(var(--theme-rgb,139,92,246),.3);border-color:rgb(var(--theme-rgb,139,92,246));color:#fff}
    .tl-b.main{background:linear-gradient(135deg,rgb(var(--theme-rgb,139,92,246)),#06b6d4);border:0;color:#fff}
    .tl-new{display:none;gap:.5rem;flex-wrap:wrap;align-items:center;width:100%;padding-top:.4rem;animation:tl-in .3s}
    .tl-new.open{display:flex}
    @keyframes tl-in{from{opacity:0;transform:translateY(-6px)}}
    .tl-board{border-radius:1.2rem;overflow:hidden;border:1px solid rgba(255,255,255,.08);background:rgba(0,0,0,.25)}
    .tl-row{display:flex;border-bottom:2px solid #0b0b10;min-height:calc(var(--tl-s)*var(--tl-r,1) + 14px)}
    .tl-row:last-child{border-bottom:0}
    .tl-lab{position:relative;flex:none;width:6.2rem;display:flex;align-items:center;justify-content:center;padding:.4rem}
    .tl-lab-in{width:100%;background:transparent;border:0;outline:0;text-align:center;font-weight:900;font-size:1.25rem;color:inherit;word-break:break-word}
    .tl-ctl{position:absolute;inset:auto 0 3px 0;display:flex;justify-content:center;gap:2px;opacity:0;transition:opacity .2s}
    .tl-lab:hover .tl-ctl,.tl-lab:focus-within .tl-ctl{opacity:1}
    @media (hover:none){.tl-ctl{opacity:.85}}
    .tl-ctl button,.tl-ctl label{width:1.3rem;height:1.3rem;font-size:.65rem;border-radius:.4rem;background:rgba(0,0,0,.4);color:#fff;cursor:pointer;display:grid;place-items:center;border:0}
    .tl-ctl input{position:absolute;opacity:0;width:0;height:0}
    .tl-zone{flex:1;display:flex;flex-wrap:wrap;align-content:flex-start;gap:5px;padding:7px;min-width:0;transition:background .2s,box-shadow .2s}
    .tl-zone.is-over{background:rgba(var(--theme-rgb,139,92,246),.16);box-shadow:inset 0 0 0 2px rgba(var(--theme-rgb,139,92,246),.7)}
    .tl-tile{position:relative;flex:none;width:var(--tl-s);height:calc(var(--tl-s)*var(--tl-r,1));border-radius:.55rem;overflow:hidden;cursor:grab;touch-action:none;user-select:none;-webkit-user-select:none;background:#1a1a24;box-shadow:0 2px 8px rgba(0,0,0,.4);transition:transform .15s,box-shadow .15s}
    .tl-tile:hover{transform:translateY(-3px) scale(1.04);box-shadow:0 8px 20px rgba(0,0,0,.55);z-index:2}
    .tl-tile.is-drag{opacity:.25}
    .tl-tile.tl-pop{animation:tl-pop .4s cubic-bezier(.3,1.6,.5,1)}
    @keyframes tl-pop{from{transform:scale(.6);opacity:0}}
    .tl-tile img,.tl-fb{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;pointer-events:none}
    .tl-fb{display:flex;align-items:center;justify-content:center;text-align:center;padding:.3rem;font-size:.68rem;font-weight:800;line-height:1.15;color:#fff;overflow:hidden}
    .tl-cap{position:absolute;left:0;right:0;bottom:0;padding:.9rem .3rem .25rem;font-size:.6rem;font-weight:700;line-height:1.1;text-align:center;color:#fff;background:linear-gradient(transparent,rgba(0,0,0,.85));opacity:0;transition:opacity .2s;pointer-events:none;overflow:hidden;max-height:60%}
    .tl-tile:hover .tl-cap,#tiers.tl-caps .tl-cap{opacity:1}
    .tl-x{position:absolute;top:2px;right:2px;width:1.2rem;height:1.2rem;border-radius:50%;border:0;background:rgba(0,0,0,.65);color:#fff;font-size:.6rem;cursor:pointer;opacity:0;transition:opacity .15s}
    .tl-tile:hover .tl-x{opacity:1}
    .tl-ghost{position:fixed;z-index:90;pointer-events:none;transform:translate(-50%,-50%) scale(1.1) rotate(4deg);box-shadow:0 18px 40px rgba(0,0,0,.6);opacity:.95}
    .tl-ins{flex:none;width:4px;height:calc(var(--tl-s)*var(--tl-r,1));border-radius:2px;background:rgb(var(--theme-rgb,139,92,246));box-shadow:0 0 12px rgb(var(--theme-rgb,139,92,246));animation:tl-in .15s}
    body.tl-dragging,body.tl-dragging *{cursor:grabbing!important}
    .tl-pool{border-radius:1.2rem;margin-top:1.2rem;overflow:hidden}
    .tl-pool .tl-zone{min-height:calc(var(--tl-s)*var(--tl-r,1) + 20px)}
    .tl-ph{display:flex;flex-wrap:wrap;gap:.6rem;align-items:center;padding:.8rem 1rem;border-bottom:1px solid rgba(255,255,255,.07)}
    .tl-ph b{font-weight:900}
    .tl-tabs{display:flex;gap:.4rem;flex-wrap:wrap;margin-bottom:.9rem}
    .tl-cands{display:grid;grid-template-columns:repeat(auto-fill,minmax(78px,1fr));gap:6px;max-height:19rem;overflow-y:auto;margin:.8rem 0;padding:2px}
    .tl-cand{position:relative;aspect-ratio:3/4;border-radius:.5rem;overflow:hidden;cursor:pointer;background:#1a1a24;outline:2px solid transparent;transition:all .15s}
    .tl-cand:hover{transform:scale(1.05)}
    .tl-cand.sel{outline-color:rgb(var(--theme-rgb,139,92,246));transform:scale(.94)}
    .tl-cand.sel::after{content:"✓";position:absolute;top:3px;right:3px;width:1.1rem;height:1.1rem;border-radius:50%;background:rgb(var(--theme-rgb,139,92,246));display:grid;place-items:center;font-size:.65rem;font-weight:900}
    .tl-row2{display:flex;flex-wrap:wrap;gap:.5rem;align-items:center;margin-top:.6rem}
    .tl-hint{font-size:.75rem;color:#9ca3af;margin-top:.5rem;line-height:1.5}
    .tl-empty{padding:1.2rem;color:#6b7280;font-size:.85rem;width:100%;text-align:center}
    .tl-add{padding:1.1rem 1.2rem;border-radius:1.2rem}
    .tl-addwrap{display:grid;grid-template-rows:0fr;opacity:0;transition:grid-template-rows .5s cubic-bezier(.25,1,.35,1),opacity .35s}
    .tl-addwrap.open{grid-template-rows:1fr;opacity:1;margin-bottom:1.2rem}
    .tl-addwrap>div{min-height:0;overflow:hidden}
    .tl-seg{display:inline-flex;gap:2px;padding:2px;border-radius:.9rem;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1)}
    .tl-seg .tl-b{border:0;padding:.4rem .75rem;background:transparent}
    .tl-seg .tl-b.on{background:rgba(var(--theme-rgb,139,92,246),.45)}
    .tl-b.danger{background:rgba(239,68,68,.3);border-color:#ef4444;color:#fff}
    .tl-ask{display:inline-flex;gap:.4rem;align-items:center;font-size:.8rem;font-weight:700;animation:tl-in .25s}
    .tl-cand img,.tl-ed-th img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
    .tl-mine{display:flex;flex-direction:column;gap:.6rem;max-height:26rem;overflow-y:auto;padding:2px}
    .tl-ed{display:flex;flex-wrap:wrap;gap:.7rem;align-items:flex-start;padding:.7rem;border-radius:1rem;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08)}
    .tl-ed.flash{animation:tl-flash 1.8s}
    @keyframes tl-flash{0%,60%{box-shadow:0 0 0 2px rgb(var(--theme-rgb,139,92,246)),0 0 24px rgba(var(--theme-rgb,139,92,246),.5)}}
    .tl-ed-img{position:relative;flex:none;width:68px;height:68px;border-radius:.6rem;overflow:hidden;cursor:pointer;background:#1a1a24}
    .tl-ed-th{position:relative;display:block;width:100%;height:100%}
    .tl-ed-img i{position:absolute;right:2px;bottom:2px;font-style:normal;font-size:.7rem;background:rgba(0,0,0,.65);border-radius:.4rem;padding:1px 4px}
    .tl-ed-f{flex:1;min-width:150px;display:flex;flex-direction:column;gap:.4rem}
    .tl-ed-b{display:flex;gap:.4rem;flex-wrap:wrap}
    .tl-ed-res{flex-basis:100%;display:flex;flex-direction:column;gap:.5rem}
    .tl-ed-res:empty{display:none}
    .tl-picks{display:flex;flex-wrap:wrap;gap:.4rem}
    .tl-pk{width:64px;height:64px;border-radius:.5rem;overflow:hidden;border:2px solid transparent;cursor:pointer;padding:0;background:#1a1a24;transition:all .15s}
    .tl-pk:hover{border-color:rgb(var(--theme-rgb,139,92,246));transform:scale(1.08)}
    .tl-pk.busy{opacity:.4}
    .tl-pk img{width:100%;height:100%;object-fit:cover}
    @media (max-width:640px){.tl-lab{width:4.2rem}.tl-lab-in{font-size:1rem}}
    @media (prefers-reduced-motion:reduce){.tl-tile,.tl-zone,.tl-cap{transition:none!important}.tl-tile.tl-pop,.tl-new,.tl-ed.flash{animation:none!important}.tl-addwrap{transition:none!important}}`;
    document.head.appendChild(css);

    /* ---------- Редизайн (v3): перекрывает базовые стили выше ---------- */
    const css3 = document.createElement('style');
    css3.textContent = `
    #tiers{--tl-ink:rgb(var(--theme-rgb,139,92,246))}
    .tl-hero{display:flex;align-items:flex-end;justify-content:space-between;gap:1rem;flex-wrap:wrap}
    .tl-hero h2{font-family:'Unbounded','Inter',system-ui,sans-serif;font-weight:800;letter-spacing:-.01em;background:linear-gradient(120deg,#fff 30%,var(--tl-ink));-webkit-background-clip:text;background-clip:text;color:transparent}
    .tl-bar{position:relative;gap:.55rem;padding:.7rem .8rem;border-radius:1.4rem;background:linear-gradient(180deg,rgba(255,255,255,.05),rgba(255,255,255,.02));border:1px solid rgba(255,255,255,.09);box-shadow:0 10px 30px rgba(0,0,0,.25)}
    .tl-b{border-radius:999px;padding:.5rem 1rem;font-weight:700;letter-spacing:.01em}
    .tl-b.main{box-shadow:0 6px 18px rgba(var(--theme-rgb,139,92,246),.35)}
    .tl-sel,.tl-in{border-radius:999px;padding:.5rem 1rem}
    .tl-seg{border-radius:999px}
    .tl-seg .tl-b{padding:.35rem .7rem}

    .tl-sum{display:flex;align-items:center;gap:.9rem 1.2rem;flex-wrap:wrap;margin:.2rem 0 1rem;padding:.8rem 1rem;border-radius:1.2rem;background:rgba(255,255,255,.035);border:1px solid rgba(255,255,255,.07)}
    .tl-sum-t{font-size:.85rem;color:#9ca3af;white-space:nowrap}
    .tl-sum-t b{font-size:1.35rem;font-weight:900;color:#fff;margin-right:.15rem}
    .tl-prog{flex:1 1 160px;min-width:120px;height:8px;border-radius:99px;background:rgba(255,255,255,.08);overflow:hidden}
    .tl-prog i{display:block;height:100%;border-radius:99px;background:linear-gradient(90deg,var(--tl-ink),#22d3ee);transition:width .6s cubic-bezier(.25,1,.35,1)}
    .tl-chips{display:flex;gap:.35rem;flex-wrap:wrap}
    .tl-chip{display:inline-flex;align-items:center;gap:.35rem;padding:.2rem .6rem .2rem .25rem;border-radius:99px;background:rgba(255,255,255,.05);font-size:.75rem;font-weight:800;color:#d1d5db}
    .tl-chip u{text-decoration:none;display:grid;place-items:center;min-width:1.35rem;height:1.35rem;padding:0 .3rem;border-radius:99px;font-size:.7rem;font-weight:900}

    .tl-board{display:flex;flex-direction:column;gap:.6rem;border:0;background:transparent;border-radius:0;overflow:visible}
    .tl-row{--tc:#6366f1;position:relative;border:1px solid color-mix(in srgb,var(--tc) 28%,transparent);border-radius:1.3rem;overflow:hidden;background:linear-gradient(90deg,color-mix(in srgb,var(--tc) 14%,#0f0f16),color-mix(in srgb,var(--tc) 4%,#0c0c12) 70%);box-shadow:0 8px 24px rgba(0,0,0,.28);transition:border-color .25s,box-shadow .25s}
    .tl-row:last-child{border-bottom:1px solid color-mix(in srgb,var(--tc) 28%,transparent)}
    .tl-row:hover{border-color:color-mix(in srgb,var(--tc) 55%,transparent)}
    .tl-lab{width:6.6rem;background:linear-gradient(160deg,color-mix(in srgb,var(--tc) 100%,#fff 22%),var(--tc) 45%,color-mix(in srgb,var(--tc) 72%,#000));box-shadow:6px 0 28px -6px color-mix(in srgb,var(--tc) 60%,transparent);text-shadow:0 2px 10px rgba(0,0,0,.25)}
    .tl-lab::after{content:"";position:absolute;inset:0;background:radial-gradient(circle at 20% 0%,rgba(255,255,255,.28),transparent 55%);pointer-events:none}
    .tl-lab-in{position:relative;z-index:1;font-family:'Unbounded','Inter',system-ui,sans-serif;font-weight:800;font-size:1.7rem}
    .tl-ctl{z-index:2}
    .tl-ctl button,.tl-ctl label{border-radius:99px;background:rgba(0,0,0,.45);backdrop-filter:blur(4px)}
    .tl-zone{gap:7px;padding:9px 10px}
    .tl-row .tl-zone:empty::before{content:"Перетащите карточки сюда";align-self:center;margin:auto;padding:.4rem 1rem;font-size:.75rem;font-weight:700;color:color-mix(in srgb,var(--tc) 55%,#9ca3af);opacity:.55}
    .tl-zone.is-over{background:color-mix(in srgb,var(--tc,#8b5cf6) 22%,transparent);box-shadow:inset 0 0 0 2px color-mix(in srgb,var(--tc,#8b5cf6) 80%,transparent)}
    .tl-tile{border-radius:.85rem;box-shadow:0 4px 12px rgba(0,0,0,.45),0 0 0 1px rgba(255,255,255,.08)}
    .tl-tile:hover{box-shadow:0 14px 28px rgba(0,0,0,.6),0 0 0 2px color-mix(in srgb,var(--tc,#fff) 70%,#fff)}
    .tl-cap{padding:1.2rem .35rem .3rem;font-size:.62rem}
    .tl-x{backdrop-filter:blur(4px)}
    .tl-pool{border-radius:1.4rem;border:1.5px dashed rgba(255,255,255,.16);background:rgba(255,255,255,.02)}
    .tl-pool .tl-ph{background:rgba(255,255,255,.03)}
    .tl-add{border-radius:1.4rem}
    @media (max-width:640px){.tl-lab{width:4.4rem}.tl-lab-in{font-size:1.15rem}.tl-sum{padding:.7rem .8rem}}`;
    document.head.appendChild(css3);

    const main = $('main') || document.querySelector('main');
    const sec = document.createElement('section');
    sec.id = 'tiers';
    sec.className = 'page hidden';
    sec.innerHTML = `
        <div class="tl-hero"><div>
            <h2 class="text-4xl font-bold">Тир-листы 🏅</h2>
            <p class="text-gray-500">Расставляйте игры и музыку по рангам — перетаскивайте карточки в нужный тир</p>
        </div></div>
        <div class="tl-bar glass no-hover">
            <span id="tl-namebox"></span>
            <button class="tl-b main" data-a="new">＋ Новый</button>
            <span id="tl-acts"></span>
            <span class="sp"></span>
            <button class="tl-b main" data-a="toggleadd">＋ Добавить игры / музыку</button>
            <button class="tl-b" data-a="mycards">✏️ Мои карточки</button>
            <button class="tl-b" data-a="shape" id="tl-shape"></button>
            <button class="tl-b" data-a="caps" id="tl-caps">🏷 Подписи</button>
            <span id="tl-sizebox" style="display:inline-flex;align-items:center;gap:.4rem;white-space:nowrap"><span class="tl-hint" style="margin:0">Размер</span><span class="tl-seg" id="tl-szg"></span></span>
            <button class="tl-b main" data-a="export">🖼 Скачать PNG</button>
            <div class="tl-new" id="tl-new">
                <input class="tl-in" id="tl-nname" placeholder="Название, например «Топ игр»" maxlength="60" style="flex:1;min-width:160px">
                <select class="tl-sel" id="tl-nkind"><option value="games">🎮 Все мои игры</option><option value="music">🎵 Вся моя музыка (CD + винил)</option><option value="empty">Пустой (добавлю сам)</option></select>
                <label class="tl-hint" style="margin:0;display:flex;gap:.4rem;align-items:center;cursor:pointer"><input type="checkbox" id="tl-ndd" checked> 🧹 Убрать повторки</label>
                <button class="tl-b main" data-a="create">Создать</button>
            </div>
        </div>
        <div class="tl-addwrap" id="tl-addp"><div id="tl-addin"></div></div>
        <div id="tl-body"></div>`;
    main.appendChild(sec);
    if (!VALID_PAGES.includes('tiers')) VALID_PAGES.push('tiers');
    PAGE_TITLES.tiers = 'Тир-листы';
    const navGames = $('nav-games');
    if (navGames) {
        const nb = document.createElement('button');
        nb.type = 'button'; nb.id = 'nav-tiers'; nb.className = 'nav-btn';
        nb.setAttribute('onclick', "showPage('tiers')");
        nb.innerHTML = '<span class="nav-ico" aria-hidden="true">🏅</span><span>Тир-листы</span>';
        (navGames.nextElementSibling ? navGames.parentElement.insertBefore(nb, navGames.nextElementSibling) : navGames.parentElement.appendChild(nb));
    }
    const origShow = window.showPage;
    window.showPage = function (id, o) { const r = origShow.apply(this, arguments); if (id === 'tiers') render(); return r; };

    /* ---------- Отрисовка ---------- */
    function tileHTML(it, pop) {
        const i = info(it); if (!i) return '';
        const src = imgSrc(i.img), h = hue(i.t);
        return `<div class="tl-tile${pop ? ' tl-pop' : ''}" data-id="${it.id}" title="${E(i.t)}${i.sub ? ' — ' + E(i.sub) : ''}">
            <div class="tl-fb" style="background:linear-gradient(135deg,hsl(${h} 55% 38%),hsl(${(h + 50) % 360} 55% 20%))">${E(i.t)}</div>
            ${src ? `<img src="${E(src)}" alt="" draggable="false" loading="lazy" onerror="this.remove()">` : ''}
            <span class="tl-cap">${E(i.t)}</span><button class="tl-x" data-a="rm" title="Убрать из тир-листа">✕</button></div>`;
    }

    let popId = null, renaming = false, delAsk = false, addT = 0, aq = '', hiddenDup = 0;
    const pg = new Set();
    const thumb = x => { const s = imgSrc(x.img), h = hue(x.t); return `<div class="tl-fb" style="background:linear-gradient(135deg,hsl(${h} 55% 38%),hsl(${(h + 50) % 360} 55% 20%))">${E(x.t)}</div>${s ? `<img src="${E(s)}" alt="" onerror="this.remove()">` : ''}`; };

    function renderBar() {
        const l = L(), box = $('tl-namebox'), acts = $('tl-acts');
        if (renaming && l) {
            box.innerHTML = `<input class="tl-in" id="tl-rn" value="${E(l.name)}" maxlength="60" style="min-width:210px;font-weight:800" aria-label="Название тир-листа">`;
            const i = $('tl-rn'); i.focus(); i.select();
            let done = false;
            const fin = ok => { if (done) return; done = true; renaming = false; if (ok && i.value.trim()) { l.name = i.value.trim().slice(0, 60); save(); } renderBar(); };
            i.addEventListener('keydown', e => { if (e.key === 'Enter') fin(true); else if (e.key === 'Escape') fin(false); });
            i.addEventListener('blur', () => fin(true));
        } else {
            box.innerHTML = `<select class="tl-sel" id="tl-sel" aria-label="Тир-лист">${lists().map(x => `<option value="${x.id}"${l && x.id === l.id ? ' selected' : ''}>${E(x.name)}</option>`).join('') || '<option>— нет тир-листов —</option>'}</select>`;
        }
        acts.innerHTML = !l ? '' : delAsk
            ? `<span class="tl-ask">Удалить «${E(l.name)}»? <button class="tl-b danger" data-a="delyes">Да</button><button class="tl-b" data-a="delno">Нет</button></span>`
            : `<button class="tl-b${renaming ? ' on' : ''}" data-a="rename" title="Переименовать">✎</button><button class="tl-b" data-a="delete" title="Удалить тир-лист">🗑</button>`;
    }

    function render() {
        renderBar();
        const l = L();
        const body = $('tl-body');
        sec.classList.toggle('tl-nolist', !l);
        if (!l) {
            body.innerHTML = `<div class="glass no-hover" style="padding:2.5rem;border-radius:1.4rem;text-align:center">
                <p style="font-size:3rem">🏅</p><p style="font-weight:900;font-size:1.2rem;margin:.4rem 0">Создайте первый тир-лист</p>
                <p class="tl-hint">Можно сразу загрузить все ваши игры или музыку и расставить по рангам.</p>
                <div class="tl-row2" style="justify-content:center"><button class="tl-b main" data-a="quick-games">🎮 Тир-лист по моим играм</button><button class="tl-b" data-a="quick-music">🎵 По моей музыке</button><button class="tl-b" data-a="toggleadd">✏️ Пустой + свои карточки</button></div>
                <p class="tl-hint" style="margin-top:1rem">Кнопка «Добавить игры / музыку» открывает панель: платформы, «Убрать повторки?», свои картинки, Spotify и вкладка «✏️ Мои карточки» для правки названий и обложек.</p></div>`;
            return;
        }
        data.tierActive = l.id;
        if (!l.sz) l.sz = SIZES.reduce((b, v, i) => Math.abs(v - (l.size || 92)) < Math.abs(SIZES[b] - (l.size || 92)) ? i : b, 0) + 1;
        sec.classList.toggle('tl-caps', !!l.caps);
        sec.style.setProperty('--tl-s', SIZES[l.sz - 1] + 'px');
        sec.style.setProperty('--tl-r', l.shape === 'pt' ? 1.33 : 1);
        $('tl-shape').textContent = l.shape === 'pt' ? '▯ Портрет' : '▢ Квадрат';
        $('tl-caps').classList.toggle('on', !!l.caps);
        $('tl-szg').innerHTML = SIZE_NAMES.map((n, i) => `<button class="tl-b${l.sz === i + 1 ? ' on' : ''}" data-a="size" data-v="${i + 1}" title="${n}${i === 2 ? ' (по умолчанию)' : ''}">${i + 1}</button>`).join('');
        const pop = id => popId === id || newIds.has(id);
        const pool = l.items.filter(x => !x.tier && (!q || (info(x)?.t || '').toLowerCase().includes(q.toLowerCase())));
        const poolAll = l.items.filter(x => !x.tier).length;
        const total = l.items.length, placed = total - poolAll, pct = total ? Math.round(placed / total * 100) : 0;
        body.innerHTML = `
        ${total ? `<div class="tl-sum"><div class="tl-sum-t"><b>${placed}</b> из ${total} размещено</div>
            <div class="tl-prog" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><i style="width:${pct}%"></i></div>
            <div class="tl-chips">${l.tiers.map(t => `<span class="tl-chip"><u style="background:${t.color};color:${fg(t.color)}">${E(t.label.slice(0, 3))}</u>${l.items.filter(x => x.tier === t.id).length}</span>`).join('')}</div></div>` : ''}
        <div class="tl-board">${l.tiers.map(t => `
            <div class="tl-row" data-tid="${t.id}" style="--tc:${t.color}">
                <div class="tl-lab" style="color:${fg(t.color)}">
                    <input class="tl-lab-in" value="${E(t.label)}" maxlength="24" data-tl="${t.id}" aria-label="Название тира">
                    <div class="tl-ctl"><label title="Цвет">🎨<input type="color" value="${t.color}" data-col="${t.id}"></label><button data-a="up" title="Выше">↑</button><button data-a="dn" title="Ниже">↓</button><button data-a="deltier" title="Удалить тир">✕</button></div>
                </div>
                <div class="tl-zone" data-tier="${t.id}">${l.items.filter(x => x.tier === t.id).map(x => tileHTML(x, pop(x.id))).join('')}</div>
            </div>`).join('')}
        </div>
        <div style="margin-top:.7rem"><button class="tl-b" data-a="addtier">＋ Добавить тир</button></div>
        <div class="tl-pool glass no-hover">
            <div class="tl-ph"><b>Не размещено · ${poolAll}</b>
                <input class="tl-in" id="tl-q" placeholder="🔍 Поиск" value="${E(q)}" style="width:150px">
                <span style="flex:1"></span>
                <button class="tl-b${addOpen ? ' on' : ''}" data-a="toggleadd">＋ Добавить игры / музыку</button>
                <button class="tl-b" data-a="reset" title="Вернуть все карточки вниз">↺ Сбросить</button></div>
            <div class="tl-zone" data-tier="">${pool.map(x => tileHTML(x, pop(x.id))).join('') || `<div class="tl-empty">${poolAll ? 'Ничего не найдено' : 'Здесь появятся карточки — нажмите «Добавить игры / музыку»'}</div>`}</div>
        </div>`;
        popId = null; newIds.clear();
    }

    /* ---------- Панель «Добавить» (выезжает сверху) ---------- */
    function setAdd(on) {
        if (on && !L()) { createList('Мой тир-лист', 'empty', dedupe); render(); }   // нет тир-листа — создаём пустой и сразу открываем панель
        addOpen = on;
        const w = $('tl-addp'); clearTimeout(addT);
        if (on) { renderAdd(); requestAnimationFrame(() => requestAnimationFrame(() => w.classList.add('open'))); main.scrollTo({ top: 0, behavior: 'smooth' }); }
        else { w.classList.remove('open'); addT = setTimeout(() => { if (!addOpen) $('tl-addin').innerHTML = ''; }, 520); }
        sec.querySelectorAll('[data-a="toggleadd"]').forEach(b => b.classList.toggle('on', on));
    }

    function renderAdd() {
        const host = $('tl-addin'), l = L();
        if (!host || !l || !addOpen) return;
        const mine = l.items.filter(x => x.src === 'custom').length;
        host.innerHTML = `<div class="tl-add glass no-hover">
            <div class="tl-tabs">${[['games', '🎮 Игры'], ['music', '🎵 Музыка'], ['custom', '🖼 Своё'], ['mine', `✏️ Мои карточки${mine ? ' · ' + mine : ''}`], ['spotify', '🟢 Spotify']].map(([k, t]) => `<button class="tl-b${tab === k ? ' on' : ''}" data-a="tab" data-v="${k}">${t}</button>`).join('')}
                <button class="tl-b" data-a="toggleadd" style="margin-left:auto" title="Закрыть">✕</button></div>
            <div id="tl-tabbody"></div></div>`;
        renderTab();
    }

    function candidates() {
        const l = L(), have = new Set(l.items.filter(x => x.src !== 'custom').map(x => x.src + ':' + x.ref));
        const seen = new Set(dedupe ? l.items.map(keyOf) : []);
        const k = aq.toLowerCase(); hiddenDup = 0;
        const src = tab === 'games' ? (data.games || []).map(o => ['games', o]) : allMusic();
        return src.filter(([s, o]) => {
            if (have.has(s + ':' + o.id)) return false;
            if (tab === 'games' && pg.size && !pg.has(groupOf(o.platform))) return false;
            if (k && !((o.title || '') + ' ' + (o.artist || '')).toLowerCase().includes(k)) return false;
            if (dedupe) { const key = keyOf({ src: s, ref: o.id }); if (key) { if (seen.has(key)) { hiddenDup++; return false; } seen.add(key); } }
            return true;
        });
    }

    function renderCands() {
        const box = $('tl-candbox'); if (!box) return;
        const c = candidates();
        [...pick].forEach(k => { if (!c.some(([s, o]) => s + ':' + o.id === k)) pick.delete(k); });
        const nt = $('tl-dd-note'); if (nt) nt.textContent = dedupe && hiddenDup ? `скрыто повторок: ${hiddenDup}` : '';
        box.innerHTML = c.length ? `<div class="tl-hint">Нажимайте на карточки, чтобы выбрать. Доступно: ${c.length}</div>
            <div class="tl-cands">${c.map(([s, o]) => `<div class="tl-cand${pick.has(s + ':' + o.id) ? ' sel' : ''}" data-pk="${s}:${o.id}" title="${E(o.title)}">${thumb({ t: o.title, img: o.img })}</div>`).join('')}</div>
            <div class="tl-row2"><button class="tl-b main" data-a="addsel">Добавить выбранные (${pick.size})</button><button class="tl-b" data-a="addall">Добавить все (${c.length})</button></div>`
            : `<div class="tl-empty">${hiddenDup ? 'Остались только повторки — отключите «Убрать повторки»' : 'Нечего добавлять: всё уже в тир-листе или ничего не подходит под фильтр'}</div>`;
    }

    function renderMineList() {
        const box = $('tl-minebox'); if (!box) return;
        const k = aq.toLowerCase();
        const list = L().items.filter(x => x.src === 'custom' && (!k || ((x.t || '') + ' ' + (x.sub || '')).toLowerCase().includes(k)));
        box.innerHTML = list.map(x => `<div class="tl-ed" data-eid="${x.id}">
            <label class="tl-ed-img" title="Заменить картинку файлом"><span class="tl-ed-th">${thumb(x)}</span><i>📁</i><input type="file" accept="image/*" hidden data-edfile="1"></label>
            <div class="tl-ed-f"><input class="tl-in" data-ef="t" value="${E(x.t)}" placeholder="Название" maxlength="120"><input class="tl-in" data-ef="sub" value="${E(x.sub || '')}" placeholder="Исполнитель / подпись" maxlength="120"></div>
            <div class="tl-ed-b"><button class="tl-b" data-a="edfind">🔎 Другая обложка</button><button class="tl-b" data-a="edclr" title="Убрать картинку">🚫</button><button class="tl-b" data-a="edrm" title="Удалить карточку">🗑</button></div>
            <div class="tl-ed-res"></div></div>`).join('') || '<div class="tl-empty">Пока пусто. Добавьте картинки во вкладке «🖼 Своё» или импортируйте Spotify.</div>';
    }

    function renderTab() {
        const b = $('tl-tabbody'); if (!b) return;
        if (tab === 'games' || tab === 'music') {
            const l = L(), have = new Set(l.items.filter(x => x.src !== 'custom').map(x => x.src + ':' + x.ref)), cnt = new Map();
            if (tab === 'games') (data.games || []).forEach(o => { if (!have.has('games:' + o.id)) { const g = groupOf(o.platform); cnt.set(g, (cnt.get(g) || 0) + 1); } });
            b.innerHTML = `<div class="tl-row2" style="margin-top:0"><span class="tl-hint" style="margin:0">🧹 Убрать повторки?</span>
                <span class="tl-seg"><button class="tl-b${dedupe ? ' on' : ''}" data-a="dd" data-v="1">Да</button><button class="tl-b${dedupe ? '' : ' on'}" data-a="dd" data-v="0">Нет</button></span>
                <span class="tl-hint" id="tl-dd-note" style="margin:0"></span></div>
                ${tab === 'games' ? `<div class="tl-row2"><span class="tl-hint" style="margin:0">Платформа:</span><button class="tl-b${pg.size ? '' : ' on'}" data-a="pg" data-v="">Все</button>${GROUPS.filter(g => cnt.has(g)).map(g => `<button class="tl-b${pg.has(g) ? ' on' : ''}" data-a="pg" data-v="${E(g)}">${E(g)} · ${cnt.get(g)}</button>`).join('')}</div>` : ''}
                <input class="tl-in" id="tl-aq" placeholder="🔍 Поиск" value="${E(aq)}" style="width:100%;margin:.7rem 0 0">
                <div id="tl-candbox"></div>`;
            renderCands();
        } else if (tab === 'mine') {
            b.innerHTML = `<div class="tl-hint">Все карточки, которые вы добавили сами или импортировали из Spotify. Здесь можно поправить название, исполнителя и картинку — например, если iTunes нашёл не ту обложку. Новые — сверху.</div>
                <input class="tl-in" id="tl-aq" placeholder="🔍 Поиск по карточкам" value="${E(aq)}" style="width:100%;margin:.6rem 0">
                <div class="tl-mine" id="tl-minebox"></div>`;
            renderMineList();
        } else if (tab === 'custom') {
            b.innerHTML = `<div class="tl-hint">Свои картинки для тир-листа: загрузите файлы (можно сразу много) или вставьте ссылку на картинку / трек / альбом Spotify. Потом всё можно поправить во вкладке «Мои карточки».</div>
                <div class="tl-row2"><label class="tl-b main" style="cursor:pointer">📁 Загрузить картинки<input type="file" id="tl-files" accept="image/*" multiple hidden></label></div>
                <div class="tl-row2"><input class="tl-in" id="tl-cn" placeholder="Название" style="flex:1;min-width:140px"><input class="tl-in" id="tl-cs" placeholder="Исполнитель / подпись" style="flex:1;min-width:140px"></div>
                <div class="tl-row2"><input class="tl-in" id="tl-cu" placeholder="Ссылка на картинку или Spotify" style="flex:2;min-width:200px"><button class="tl-b main" data-a="addurl">Добавить</button></div>
                <div class="tl-hint">Для ссылки Spotify название и обложка подтянутся сами, если Spotify разрешит запрос из браузера. Иначе вставьте прямую ссылку на картинку или загрузите файл.</div>`;
        } else {
            b.innerHTML = `<div class="tl-hint">В Spotify: Аккаунт → Конфиденциальность → «Скачать данные». Загрузите сюда файлы <b>StreamingHistory*.json</b>, <b>Streaming_History_Audio*.json</b> или <b>YourLibrary.json</b>.</div>
                <div class="tl-row2"><label class="tl-b main" style="cursor:pointer">📁 Выбрать .json<input type="file" id="tl-sp" accept=".json,application/json" multiple hidden></label>
                <select class="tl-sel" id="tl-spm"><option value="artist">Топ исполнителей</option><option value="track">Топ треков</option><option value="album">Топ альбомов</option></select>
                <select class="tl-sel" id="tl-spn"><option>30</option><option selected>50</option><option>100</option><option>200</option></select></div>
                <div class="tl-row2"><button class="tl-b" data-a="covers">🖼 Подтянуть обложки (iTunes)</button><span class="tl-hint" id="tl-spst"></span></div>
                <div class="tl-hint">В Spotify-выгрузке нет картинок, поэтому карточки сначала без обложек. Кнопка выше ищет обложки в iTunes (лимит около 20 запросов в минуту — если остановится, нажмите ещё раз через минуту). Если нашлась не та обложка — поправьте её во вкладке «Мои карточки». Для «Топ альбомов» нужен расширенный файл Streaming_History_Audio.</div>`;
        }
    }

    /* ---------- Картинки ---------- */
    function compress(src, max = 420) {
        return new Promise((res, rej) => {
            const im = new Image();
            im.onload = () => {
                const k = Math.min(1, max / Math.max(im.width, im.height)), c = document.createElement('canvas');
                c.width = Math.max(1, Math.round(im.width * k)); c.height = Math.max(1, Math.round(im.height * k));
                c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
                res(c.toDataURL('image/jpeg', .82));
            };
            im.onerror = rej; im.src = src;
        });
    }
    const readFile = f => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(f); });
    async function toDataUrl(url) {   // пытаемся сохранить картинку у себя; если сайт не разрешает — оставим ссылку
        try { const b = await (await fetch(url)).blob(); return await compress(await readFile(b)); } catch (_) { return url; }
    }

    /* ---------- Spotify ---------- */
    async function importSpotify(files) {
        const mode = $('tl-spm').value, top = +$('tl-spn').value, agg = new Map();
        const add = (name, artist, album, ms, plays) => {
            const nm = mode === 'artist' ? artist : mode === 'album' ? album : name;
            if (!nm) return;
            const key = (nm + '|' + (mode === 'artist' ? '' : artist || '')).toLowerCase();
            const a = agg.get(key) || { t: nm, sub: mode === 'artist' ? '' : artist || '', ms: 0, n: 0 };
            a.ms += ms; a.n += plays; agg.set(key, a);
        };
        for (const f of files) {
            let j; try { j = JSON.parse(await f.text()); } catch (_) { toast(`Не удалось прочитать ${E(f.name)}`, 'error'); continue; }
            if (Array.isArray(j)) j.forEach(r => {
                const ms = Number(r.msPlayed ?? r.ms_played ?? 0);
                add(r.trackName || r.master_metadata_track_name, r.artistName || r.master_metadata_album_artist_name, r.master_metadata_album_album_name, ms, ms >= 30000 ? 1 : 0);
            });
            else {
                (j.tracks || []).forEach(t => add(t.track, t.artist, t.album, 0, 1));
                (j.albums || []).forEach(t => { if (mode === 'album') add('', t.artist, t.album, 0, 1); });
                (j.artists || []).forEach(t => { if (mode === 'artist') add('', t.name, '', 0, 1); });
            }
        }
        const sorted = [...agg.values()].filter(a => a.n > 0 || a.ms > 0).sort((a, b) => b.ms - a.ms || b.n - a.n).slice(0, top);
        if (!sorted.length) { toast(mode === 'album' ? 'Альбомов не найдено — нужен файл Streaming_History_Audio или YourLibrary' : 'В файлах ничего не нашлось', 'error'); return; }
        const n = addItems(L(), sorted.map(a => ({ src: 'custom', t: a.t, sub: a.sub, img: '', kind: mode, key: 'sp:' + mode + ':' + (a.t + '|' + a.sub).toLowerCase() })));
        save(); render();
        toast(`Добавлено: <b>${n}</b>. Теперь можно подтянуть обложки 🖼`, 'success');
    }

    let covering = false;
    async function fetchCovers() {
        if (covering) return;
        const l = L(), todo = l.items.filter(x => x.src === 'custom' && !x.img && x.kind && !x.noCover);
        const st = $('tl-spst');
        if (!todo.length) { toast('Нет карточек без обложек', 'info'); return; }
        covering = true; let ok = 0;
        for (let i = 0; i < todo.length; i++) {
            const it = todo[i];
            if (st) st.textContent = `Ищу обложки: ${i + 1} / ${todo.length}`;
            try {
                const ent = it.kind === 'track' ? 'song' : 'album';
                const r = await fetch(`https://itunes.apple.com/search?limit=1&media=music&entity=${ent}&term=${encodeURIComponent((it.sub + ' ' + it.t).trim())}`);
                if (!r.ok) throw new Error('limit');
                const art = (await r.json()).results?.[0]?.artworkUrl100;
                if (art) { it.img = await toDataUrl(art.replace('100x100bb', '400x400bb')); ok++; } else it.noCover = true;
            } catch (_) { toast('iTunes остановил запросы (лимит или нет доступа). Нажмите ещё раз через минуту', 'error'); break; }
            if (i % 5 === 4) { save(); render(); }
            await new Promise(r => setTimeout(r, 3100));
        }
        covering = false; save(); render();
        toast(`Обложек найдено: <b>${ok}</b>`, ok ? 'success' : 'info');
    }

    /* ---------- Действия ---------- */
    async function fromLink(u) {   // → { img, title } из ссылки на картинку или на Spotify
        if (/spotify\.com/i.test(u)) {
            const o = await (await fetch('https://open.spotify.com/oembed?url=' + encodeURIComponent(u))).json();
            return { img: await toDataUrl(o.thumbnail_url), title: o.title };
        }
        if (/^data:image\//i.test(u)) return { img: u };
        if (/^https?:/i.test(u)) return { img: await toDataUrl(u) };
        throw new Error('bad link');
    }
    const itemOf = el => L()?.items.find(x => x.id === el.closest('.tl-ed')?.dataset.eid);
    const setThumb = (row, it) => { const th = row?.querySelector('.tl-ed-th'); if (th) th.innerHTML = thumb(it); };

    async function onClick(e) {
        const t = e.target;
        const pk = t.closest('[data-pk]');
        if (pk) { const k = pk.dataset.pk; pick.has(k) ? pick.delete(k) : pick.add(k); pk.classList.toggle('sel', pick.has(k)); const bt = document.querySelector('[data-a="addsel"]'); if (bt) bt.textContent = `Добавить выбранные (${pick.size})`; return; }
        const a = t.closest('[data-a]'); if (!a) return;
        const act = a.dataset.a, l = L(), trow = a.closest('.tl-row');
        const tier = trow && l?.tiers.find(x => x.id === trow.dataset.tid);
        switch (act) {
            case 'new': { $('tl-ndd').checked = dedupe; $('tl-new').classList.toggle('open'); $('tl-nname').focus(); return; }
            case 'create': { const k = $('tl-nkind').value; createList($('tl-nname').value.trim(), k, $('tl-ndd').checked); $('tl-new').classList.remove('open'); $('tl-nname').value = ''; render(); if (k === 'empty') setAdd(true); else if (addOpen) renderAdd(); return; }
            case 'quick-games': createList('Мой топ игр', 'games', dedupe); return render();
            case 'quick-music': createList('Мой топ музыки', 'music', dedupe); return render();
            case 'rename': renaming = true; delAsk = false; return renderBar();
            case 'delete': delAsk = true; renaming = false; return renderBar();
            case 'delno': delAsk = false; return renderBar();
            case 'delyes': { delAsk = false; if (l) { data.tierLists = lists().filter(x => x !== l); data.tierActive = ''; save(); } render(); if (addOpen) renderAdd(); return; }
            case 'shape': l.shape = l.shape === 'pt' ? 'sq' : 'pt'; break;
            case 'caps': l.caps = !l.caps; break;
            case 'size': l.sz = +a.dataset.v; break;
            case 'export': return exportPng();
            case 'addtier': l.tiers.push({ id: uid(), label: 'Новый', color: COLORS[l.tiers.length % COLORS.length] }); break;
            case 'deltier': { if (l.tiers.length <= 1) return toast('Нужен хотя бы один тир', 'error'); l.items.forEach(x => { if (x.tier === tier.id) x.tier = ''; }); l.tiers = l.tiers.filter(x => x !== tier); break; }
            case 'up': case 'dn': { const i = l.tiers.indexOf(tier), j = act === 'up' ? i - 1 : i + 1; if (j < 0 || j >= l.tiers.length) return; [l.tiers[i], l.tiers[j]] = [l.tiers[j], l.tiers[i]]; break; }
            case 'rm': { const id = t.closest('.tl-tile').dataset.id; l.items = l.items.filter(x => x.id !== id); break; }
            case 'reset': l.items.forEach(x => { x.tier = ''; }); break;
            case 'mycards': tab = 'mine'; pick.clear(); aq = ''; if (!addOpen) return setAdd(true); return renderAdd();
            case 'toggleadd': return setAdd(!addOpen);
            case 'tab': tab = a.dataset.v; pick.clear(); aq = ''; return renderAdd();
            case 'dd': dedupe = a.dataset.v === '1'; data.tierDedupe = dedupe; save(); return renderTab();
            case 'pg': { const v = a.dataset.v; if (!v) pg.clear(); else if (pg.has(v)) pg.delete(v); else pg.add(v); return renderTab(); }
            case 'addsel': { const n = addItems(l, [...pick].map(k => { const [s, id] = k.split(':'); return { src: s, ref: id }; })); pick.clear(); toast(`Добавлено: <b>${n}</b> — они сверху в «Не размещено»`, 'success'); break; }
            case 'addall': { const n = addItems(l, candidates().map(([s, o]) => ({ src: s, ref: o.id }))); pick.clear(); toast(`Добавлено: <b>${n}</b> — они сверху в «Не размещено»`, 'success'); break; }
            case 'addurl': {
                const u = $('tl-cu').value.trim(), sub = $('tl-cs').value.trim(); let name = $('tl-cn').value.trim(), img = '';
                if (!u && !name) return toast('Вставьте ссылку или введите название', 'error');
                if (u) { try { const r = await fromLink(u); img = r.img; name = name || r.title || ''; } catch (_) { toast('Не получилось взять картинку по ссылке. Для Spotify вставьте прямую ссылку на картинку или загрузите файл', 'error'); if (!name) return; } }
                addItems(l, [{ src: 'custom', t: name || 'Без названия', sub, img }]);
                ['tl-cu', 'tl-cn', 'tl-cs'].forEach(i => { $(i).value = ''; });
                toast('Добавлено. Править можно во вкладке «Мои карточки»', 'success');
                break;
            }
            case 'covers': return fetchCovers();
            /* --- редактор своих карточек --- */
            case 'edfind': {
                const row = a.closest('.tl-ed'), it = itemOf(a), res = row.querySelector('.tl-ed-res');
                if (res.innerHTML) { res.innerHTML = ''; return; }
                res.innerHTML = `<div class="tl-row2" style="margin:0"><input class="tl-in" data-q="1" value="${E(((it.sub || '') + ' ' + it.t).trim())}" style="flex:1;min-width:150px"><button class="tl-b main" data-a="edsearch">Искать в iTunes</button></div>
                    <div class="tl-row2" style="margin:0"><input class="tl-in" data-u="1" placeholder="…или ссылка на картинку / Spotify" style="flex:1;min-width:150px"><button class="tl-b" data-a="edurl">Применить</button></div>
                    <div class="tl-picks"></div>`;
                return;
            }
            case 'edsearch': {
                const row = a.closest('.tl-ed'), it = itemOf(a), qv = row.querySelector('[data-q]').value.trim(), box = row.querySelector('.tl-picks');
                if (!qv) return;
                box.innerHTML = '<span class="tl-hint">Ищу…</span>';
                try {
                    const r = await fetch(`https://itunes.apple.com/search?limit=8&media=music&entity=${it.kind === 'track' ? 'song' : 'album'}&term=${encodeURIComponent(qv)}`);
                    if (!r.ok) throw new Error('limit');
                    const res = (await r.json()).results.filter(x => x.artworkUrl100);
                    box.innerHTML = res.length ? res.map(x => `<button type="button" class="tl-pk" data-a="edpick" data-src="${E(x.artworkUrl100.replace('100x100bb', '400x400bb'))}" title="${E((x.artistName || '') + ' — ' + (x.collectionName || x.trackName || ''))}"><img src="${E(x.artworkUrl100)}" alt=""></button>`).join('') : '<span class="tl-hint">Ничего не нашлось — измените запрос</span>';
                } catch (_) { box.innerHTML = '<span class="tl-hint">iTunes не ответил (лимит или нет доступа). Загрузите картинку файлом или вставьте ссылку</span>'; }
                return;
            }
            case 'edpick': { const it = itemOf(a), row = a.closest('.tl-ed'); a.classList.add('busy'); it.img = await toDataUrl(a.dataset.src); it.noCover = false; save(); setThumb(row, it); render(); toast('Обложка заменена', 'success'); a.classList.remove('busy'); return; }
            case 'edurl': {
                const it = itemOf(a), row = a.closest('.tl-ed'), u = row.querySelector('[data-u]').value.trim();
                if (!u) return;
                try { const r = await fromLink(u); it.img = r.img; it.noCover = false; if (r.title && !it.t) it.t = r.title; save(); setThumb(row, it); render(); toast('Картинка заменена', 'success'); }
                catch (_) { toast('Не получилось взять картинку по ссылке', 'error'); }
                return;
            }
            case 'edclr': { const it = itemOf(a); it.img = ''; it.noCover = true; save(); setThumb(a.closest('.tl-ed'), it); render(); return; }
            case 'edrm': { l.items = l.items.filter(x => x !== itemOf(a)); save(); render(); return renderAdd(); }
            default: return;
        }
        save(); render();
        if (addOpen && ['rm', 'reset', 'addsel', 'addall', 'addurl'].includes(act)) renderAdd();
    }

    async function onChange(e) {
        const t = e.target, l = L();
        if (t.id === 'tl-sel') { data.tierActive = t.value; save(); return render(); }
        if (t.dataset.tl) { const x = l.tiers.find(z => z.id === t.dataset.tl); if (x) { x.label = t.value; save(); } return; }
        if (t.dataset.col) { const x = l.tiers.find(z => z.id === t.dataset.col); if (x) { x.color = t.value; save(); render(); } return; }
        if (t.dataset.ef) {
            const it = itemOf(t); if (!it) return;
            if (t.dataset.ef === 't' && !t.value.trim()) { t.value = it.t; return; }
            it[t.dataset.ef] = t.value.trim(); save(); render(); return;
        }
        if (t.dataset.edfile) {
            const it = itemOf(t); if (!it || !t.files[0]) return;
            try { it.img = await compress(await readFile(t.files[0])); it.noCover = false; save(); setThumb(t.closest('.tl-ed'), it); render(); toast('Картинка заменена', 'success'); }
            catch (_) { toast('Не удалось прочитать картинку', 'error'); }
            return;
        }
        if (t.id === 'tl-files') {
            const arr = [];
            for (const f of t.files) { try { arr.push({ src: 'custom', t: f.name.replace(/\.[^.]+$/, ''), sub: '', img: await compress(await readFile(f)) }); } catch (_) {} }
            const n = addItems(l, arr); save(); render(); renderAdd(); toast(`Добавлено картинок: <b>${n}</b>. Название и картинку можно поправить во вкладке «Мои карточки»`, 'success');
        }
        if (t.id === 'tl-sp') { await importSpotify([...t.files]); renderAdd(); }
    }

    sec.addEventListener('click', onClick);
    sec.addEventListener('change', onChange);
    sec.addEventListener('input', e => {
        if (e.target.id === 'tl-q') { q = e.target.value; render(); const i = $('tl-q'); i.focus(); i.setSelectionRange(q.length, q.length); }
        else if (e.target.id === 'tl-aq') { aq = e.target.value; tab === 'mine' ? renderMineList() : renderCands(); }
    });
    sec.addEventListener('dblclick', e => {   // двойной клик по своей карточке — открыть её в редакторе
        const tile = e.target.closest('.tl-tile'); if (!tile) return;
        const it = L().items.find(x => x.id === tile.dataset.id); if (!it || it.src !== 'custom') return;
        tab = 'mine'; aq = '';
        if (addOpen) renderAdd(); else setAdd(true);
        setTimeout(() => { const r = sec.querySelector(`.tl-ed[data-eid="${it.id}"]`); if (r) { r.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); r.classList.add('flash'); r.querySelector('[data-ef="t"]')?.focus(); } }, 140);
    });

    /* ---------- Перетаскивание (мышь и палец) ---------- */
    let drag = null, ins = null;
    sec.addEventListener('pointerdown', e => {
        const tile = e.target.closest('.tl-tile');
        if (!tile || e.target.closest('.tl-x') || (e.pointerType === 'mouse' && e.button !== 0)) return;
        drag = { id: tile.dataset.id, tile, x: e.clientX, y: e.clientY, on: false, zone: null, before: null };
    });
    window.addEventListener('pointermove', e => {
        if (!drag) return;
        if (!drag.on) {
            if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 7) return;
            drag.on = true;
            const g = drag.tile.cloneNode(true); g.classList.add('tl-ghost'); g.style.width = drag.tile.offsetWidth + 'px'; g.style.height = drag.tile.offsetHeight + 'px';
            document.body.appendChild(g); drag.ghost = g; drag.tile.classList.add('is-drag'); document.body.classList.add('tl-dragging');
            ins = document.createElement('div'); ins.className = 'tl-ins';
        }
        e.preventDefault();
        drag.ghost.style.left = e.clientX + 'px'; drag.ghost.style.top = e.clientY + 'px';
        if (e.clientY < 70) main.scrollBy(0, -14); else if (e.clientY > innerHeight - 70) main.scrollBy(0, 14);
        const z = document.elementFromPoint(e.clientX, e.clientY)?.closest('.tl-zone');
        sec.querySelectorAll('.tl-zone.is-over').forEach(x => { if (x !== z) x.classList.remove('is-over'); });
        drag.zone = z || null; drag.before = null;
        if (!z) { ins.remove(); return; }
        z.classList.add('is-over');
        const tiles = [...z.querySelectorAll('.tl-tile:not(.is-drag)')];
        const nxt = tiles.find(t => { const r = t.getBoundingClientRect(); return e.clientY < r.top || (e.clientY <= r.bottom && e.clientX < r.left + r.width / 2); });
        drag.before = nxt ? nxt.dataset.id : null;
        nxt ? z.insertBefore(ins, nxt) : z.appendChild(ins);
    }, { passive: false });
    const endDrag = () => {
        if (!drag) return;
        const d = drag; drag = null;
        if (!d.on) return;
        d.ghost.remove(); ins?.remove(); document.body.classList.remove('tl-dragging');
        sec.querySelectorAll('.tl-zone.is-over').forEach(x => x.classList.remove('is-over'));
        if (!d.zone) { d.tile.classList.remove('is-drag'); return; }
        const l = L(), i = l.items.findIndex(x => x.id === d.id); if (i < 0) return;
        const [it] = l.items.splice(i, 1); it.tier = d.zone.dataset.tier;
        let j = d.before ? l.items.findIndex(x => x.id === d.before) : -1;
        if (j < 0) { let last = -1; l.items.forEach((x, k) => { if (x.tier === it.tier) last = k; }); j = last + 1; }
        l.items.splice(j, 0, it); popId = it.id; save(); render();
    };
    window.addEventListener('pointerup', endDrag);
    window.addEventListener('pointercancel', endDrag);

    /* ---------- Экспорт в PNG ---------- */
    const loadImg = src => new Promise(res => { const im = new Image(); im.crossOrigin = 'anonymous'; im.onload = () => res(im); im.onerror = () => res(null); im.src = src; });
    function wrap(ctx, text, maxW) {
        const out = []; let line = '';
        String(text).split(/\s+/).forEach(w => { const t = line ? line + ' ' + w : w; if (ctx.measureText(t).width > maxW && line) { out.push(line); line = w; } else line = t; });
        if (line) out.push(line); return out;
    }
    async function exportPng() {
        const l = L(); if (!l) return;
        toast('Рисую картинку…', 'info');
        const S = 120, G = 6, LAB = 150, W = 1280, P = 32, RG = 12, TH = l.shape === 'pt' ? Math.round(S * 1.33) : S, cols = Math.floor((W - P * 2 - LAB - 12) / (S + G));
        const FD = "800 %spx 'Unbounded','Inter',system-ui,sans-serif", FU = "%s %spx 'Inter',system-ui,sans-serif";
        try { await Promise.all(['800 40px Unbounded', '700 20px Inter'].map(f => document.fonts.load(f, 'Аa').catch(() => {}))); } catch (_) {}
        const rgb = (getComputedStyle(document.documentElement).getPropertyValue('--theme-rgb') || getComputedStyle(document.body).getPropertyValue('--theme-rgb') || '139, 92, 246').trim();
        const imgs = new Map();
        await Promise.all([...new Set(l.items.filter(x => x.tier).map(x => imgSrc(info(x)?.img)).filter(Boolean))].map(async s => imgs.set(s, await loadImg(s))));
        const rowH = n => Math.max(1, Math.ceil(n / cols)) * (TH + G) + G;
        const rows = l.tiers.map(t => ({ t, items: l.items.filter(x => x.tier === t.id) }));
        const HEAD = 128, FOOT = 64;
        const H = HEAD + rows.reduce((s, r) => s + Math.max(rowH(r.items.length), 84) + RG, 0) - RG + FOOT;
        const c = document.createElement('canvas'); c.width = W; c.height = H;
        const x = c.getContext('2d');
        const rr = (px, py, w, h, r) => { x.beginPath(); x.roundRect(px, py, w, h, r); };

        /* фон + мягкое свечение цвета темы */
        x.fillStyle = '#0b0b11'; x.fillRect(0, 0, W, H);
        let g0 = x.createRadialGradient(W * 0.15, 0, 20, W * 0.15, 0, 760); g0.addColorStop(0, `rgba(${rgb}, 0.32)`); g0.addColorStop(1, `rgba(${rgb}, 0)`);
        x.fillStyle = g0; x.fillRect(0, 0, W, H);
        g0 = x.createRadialGradient(W, H, 20, W, H, 700); g0.addColorStop(0, 'rgba(6,182,212,0.16)'); g0.addColorStop(1, 'rgba(6,182,212,0)');
        x.fillStyle = g0; x.fillRect(0, 0, W, H);

        /* шапка: название + сводка */
        const total = l.items.length, placed = l.items.filter(i => i.tier).length;
        x.textBaseline = 'alphabetic'; x.textAlign = 'left';
        let ts = 46; x.font = FD.replace('%s', ts);
        while (ts > 26 && x.measureText(l.name).width > W - P * 2 - 260) { ts -= 2; x.font = FD.replace('%s', ts); }
        x.fillStyle = '#fff'; x.fillText(l.name, P, 70);
        x.font = FU.replace('%s', '600').replace('%s', 22); x.fillStyle = 'rgba(255,255,255,0.5)';
        x.fillText(`${placed} из ${total} размещено · ${l.tiers.length} тиров`, P, 104);
        if (total) {   // полоска прогресса справа
            const bw = 220, bx = W - P - bw, by = 62;
            rr(bx, by, bw, 10, 5); x.fillStyle = 'rgba(255,255,255,0.1)'; x.fill();
            if (placed) { const gp = x.createLinearGradient(bx, 0, bx + bw, 0); gp.addColorStop(0, `rgb(${rgb})`); gp.addColorStop(1, '#22d3ee'); rr(bx, by, Math.max(10, bw * placed / total), 10, 5); x.fillStyle = gp; x.fill(); }
            x.textAlign = 'right'; x.font = FU.replace('%s', '800').replace('%s', 22); x.fillStyle = '#fff';
            x.fillText(`${Math.round(placed / total * 100)}%`, W - P, 48); x.textAlign = 'left';
        }

        let y = HEAD, missed = 0;
        rows.forEach(({ t, items }) => {
            const h = Math.max(rowH(items.length), 84), RW = W - P * 2, R = 24;
            /* полоса тира: тонированный фон + рамка цвета тира */
            x.save(); rr(P, y, RW, h, R); x.clip();
            x.fillStyle = '#12121a'; x.fillRect(P, y, RW, h);
            const tint = x.createLinearGradient(P, 0, P + RW, 0); tint.addColorStop(0, t.color + '30'); tint.addColorStop(0.7, t.color + '0d');
            x.fillStyle = tint; x.fillRect(P, y, RW, h);
            /* ярлык тира */
            const lg = x.createLinearGradient(P, y, P + LAB, y + h); lg.addColorStop(0, t.color); lg.addColorStop(1, t.color);
            x.fillStyle = lg; x.fillRect(P, y, LAB, h);
            const sh = x.createLinearGradient(0, y, 0, y + h); sh.addColorStop(0, 'rgba(255,255,255,0.28)'); sh.addColorStop(0.5, 'rgba(255,255,255,0)'); sh.addColorStop(1, 'rgba(0,0,0,0.22)');
            x.fillStyle = sh; x.fillRect(P, y, LAB, h);
            x.restore();
            rr(P + 1, y + 1, RW - 2, h - 2, R); x.lineWidth = 2; x.strokeStyle = t.color + '55'; x.stroke();

            x.fillStyle = fg(t.color); x.textAlign = 'center'; x.textBaseline = 'middle';
            const n = String(t.label).length, fs = n <= 2 ? 58 : n <= 5 ? 38 : 26;
            x.font = FD.replace('%s', fs);
            const ls = wrap(x, t.label, LAB - 20); ls.forEach((s, i) => x.fillText(s, P + LAB / 2, y + h / 2 + (i - (ls.length - 1) / 2) * (fs + 6)));
            x.textAlign = 'left'; x.textBaseline = 'alphabetic';

            items.forEach((it, i) => {
                const inf = info(it) || { t: '' }, px = P + LAB + G + 6 + (i % cols) * (S + G), py = y + G + Math.floor(i / cols) * (TH + G);
                const im = imgs.get(imgSrc(inf.img));
                x.save(); x.shadowColor = 'rgba(0,0,0,0.5)'; x.shadowBlur = 10; x.shadowOffsetY = 3; rr(px, py, S, TH, 12); x.fillStyle = '#1a1a24'; x.fill(); x.restore();
                x.save(); rr(px, py, S, TH, 12); x.clip();
                if (im) { const k = Math.max(S / im.width, TH / im.height), w = im.width * k, hh = im.height * k; x.drawImage(im, px + (S - w) / 2, py + (TH - hh) / 2, w, hh); }
                else {
                    if (imgSrc(inf.img)) missed++;
                    const g = x.createLinearGradient(px, py, px + S, py + TH), hh = hue(inf.t); g.addColorStop(0, `hsl(${hh} 55% 38%)`); g.addColorStop(1, `hsl(${(hh + 50) % 360} 55% 20%)`);
                    x.fillStyle = g; x.fillRect(px, py, S, TH); x.fillStyle = '#fff'; x.font = FU.replace('%s', '700').replace('%s', 13); x.textAlign = 'center';
                    const ls2 = wrap(x, inf.t, S - 12).slice(0, 5); ls2.forEach((s, k) => x.fillText(s, px + S / 2, py + TH / 2 + (k - (ls2.length - 1) / 2) * 15)); x.textAlign = 'left';
                }
                if (l.caps && inf.t) {
                    const g = x.createLinearGradient(0, py + TH - 38, 0, py + TH); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.88)');
                    x.fillStyle = g; x.fillRect(px, py + TH - 38, S, 38); x.fillStyle = '#fff'; x.font = FU.replace('%s', '700').replace('%s', 11); x.textAlign = 'center';
                    x.fillText(wrap(x, inf.t, S - 8)[0], px + S / 2, py + TH - 10, S - 8); x.textAlign = 'left';
                }
                x.restore();
                rr(px + 0.5, py + 0.5, S - 1, TH - 1, 12); x.lineWidth = 1; x.strokeStyle = 'rgba(255,255,255,0.12)'; x.stroke();
            });
            if (!items.length) { x.fillStyle = 'rgba(255,255,255,0.22)'; x.font = FU.replace('%s', '700').replace('%s', 18); x.textAlign = 'center'; x.fillText('пусто', P + LAB + (RW - LAB) / 2, y + h / 2 + 6); x.textAlign = 'left'; }
            y += h + RG;
        });
        /* подпись: ник из настроек (если не задан — название сайта) */
        const nick = String(data.name || '').trim() || 'MIRVEL HUB';
        x.textAlign = 'center'; x.textBaseline = 'alphabetic';
        try { x.letterSpacing = '4px'; } catch (_) {}
        let nf = 20; x.font = FD.replace('%s', nf);
        while (nf > 12 && x.measureText(nick).width > W - P * 2) { nf -= 1; x.font = FD.replace('%s', nf); }
        x.fillStyle = 'rgba(255,255,255,0.5)'; x.fillText(nick, W / 2 + 2, H - 24);
        try { x.letterSpacing = '0px'; } catch (_) {}
        c.toBlob(b => {
            if (!b) return toast('Не удалось создать картинку', 'error');
            const u = URL.createObjectURL(b), a = document.createElement('a');
            a.href = u; a.download = (l.name || 'tierlist').replace(/[^\p{L}\p{N}_-]+/gu, '_') + '.png';
            document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 1500);
            toast(missed ? `PNG сохранён. Картинок с чужих сайтов не загрузилось: ${missed} — загрузите их файлом` : 'PNG сохранён 🖼', missed ? 'info' : 'success');
        }, 'image/png');
    }

    if (location.hash === '#tiers') window.showPage('tiers', { fromHash: true });
})();
