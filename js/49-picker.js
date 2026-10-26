/* =========================================================
   MIRVEL HUB — 49-picker.js (этап J)
   Одно окно для «🎲 Что послушать?» и «🎮 Во что поиграть?»:
   карточка результата с обложкой, фильтры-чипами, кнопки «Ещё вариант» / «Открыть» / «Слушать» или «Начать играть».
   Работает с главной и со страницы «Игры». Данные не меняет (кроме статуса игры по кнопке «Начать играть»).
   window.mhPicker.open('music' | 'games')
   ========================================================= */
(() => {
    'use strict';
    const $ = id => document.getElementById(id);
    const E = s => (typeof esc === 'function' ? esc(s) : String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));
    const reduce = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    const cover = v => { v = String(v || ''); return /^data:image\//i.test(v) || /^https?:\/\//i.test(v) ? v : ''; };

    /* ---------- стили ---------- */
    const css = document.createElement('style');
    css.textContent = `
    body:has(.mhp-ov:not(.hidden)) #main{overflow:hidden}
    .mhp-ov{position:fixed;inset:0;z-index:100000;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(0,0,0,.66);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);overscroll-behavior:contain}
    .mhp-ov.hidden{display:none}
    .mhp-box{width:100%;max-width:460px;max-height:92vh;overflow:auto;overscroll-behavior:contain;border-radius:26px;padding:20px;color:#e5e7eb;background:rgba(22,22,30,.97);border:1px solid rgba(255,255,255,.1);box-shadow:0 24px 70px rgba(0,0,0,.6)}
    .mhp-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px}
    .mhp-head h3{font-size:19px;font-weight:900;color:#fff}
    .mhp-x{width:30px;height:30px;border-radius:9px;color:#9ca3af;font-size:13px}
    .mhp-x:hover{color:#fff;background:rgba(255,255,255,.1)}
    .mhp-grp{display:flex;align-items:center;gap:8px;margin-top:8px}
    .mhp-lbl{flex:none;width:74px;font-size:11px;font-weight:700;color:#6b7280}
    .mhp-chips{display:flex;gap:6px;overflow-x:auto;padding-bottom:2px;scrollbar-width:none;flex:1;min-width:0}
    .mhp-chips::-webkit-scrollbar{display:none}
    .mhp-chip{flex:none;padding:5px 11px;border-radius:999px;font-size:12px;font-weight:700;color:#cbd5e1;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);cursor:pointer;transition:background .15s,border-color .15s,color .15s}
    .mhp-chip:hover{color:#fff;background:rgba(255,255,255,.12)}
    .mhp-chip.is-on{color:#fff;background:rgba(var(--theme-rgb,139,92,246),.32);border-color:var(--theme-btn,#8b5cf6)}
    .mhp-card{position:relative;display:flex;gap:16px;align-items:center;margin-top:16px;padding:16px;border-radius:20px;overflow:hidden;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.09);min-height:150px}
    .mhp-card>*:not(.mhp-bg){position:relative;z-index:1}
    .mhp-bg{position:absolute;inset:0;z-index:0;overflow:hidden;border-radius:inherit}
    .mhp-bg img{width:100%;height:100%;object-fit:cover;filter:blur(24px) saturate(1.2);transform:scale(1.3);opacity:.4}
    .mhp-bg::after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(14,14,20,.85),rgba(14,14,20,.4))}
    .mhp-cover{flex:none;width:108px;height:108px;border-radius:14px;overflow:hidden;display:grid;place-items:center;background:rgba(255,255,255,.08);box-shadow:0 10px 28px rgba(0,0,0,.55);font-size:36px}
    .mhp-card[data-kind=games] .mhp-cover{height:144px}
    .mhp-cover img{width:100%;height:100%;object-fit:cover;display:block}
    .mhp-info{min-width:0;flex:1}
    .mhp-sub{font-size:12px;font-weight:700;color:var(--theme-btn,#a78bfa);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .mhp-title{font-size:22px;font-weight:900;line-height:1.15;color:#fff;margin-top:3px;overflow-wrap:anywhere}
    .mhp-meta{font-size:12px;color:#c7cbd3;margin-top:6px;line-height:1.4}
    .mhp-empty{padding:30px 10px;text-align:center;font-size:13px;color:#9ca3af;line-height:1.5}
    .mhp-card.is-rolling .mhp-title,.mhp-card.is-rolling .mhp-cover{animation:mhpSpin .16s ease-out}
    .mhp-card.is-land .mhp-cover{animation:mhpLand .45s cubic-bezier(.2,.9,.3,1.2)}
    .mhp-card.is-land .mhp-title{animation:mhpFade .35s ease-out}
    @keyframes mhpSpin{from{opacity:.2;transform:translateY(-8px)}to{opacity:1;transform:none}}
    @keyframes mhpLand{from{transform:scale(.85) rotate(-3deg)}to{transform:none}}
    @keyframes mhpFade{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
    .mhp-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}
    .mhp-btn{flex:1 1 auto;padding:10px 14px;border-radius:14px;font-size:13px;font-weight:800;color:#e5e7eb;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.14);cursor:pointer;text-align:center}
    .mhp-btn:hover{color:#fff;background:rgba(255,255,255,.16)}
    .mhp-btn.is-main{color:#fff;background:rgba(var(--theme-rgb,139,92,246),.5);border-color:var(--theme-btn,#8b5cf6)}
    .mhp-btn:disabled{opacity:.45;cursor:default}
    .mhp-note{margin-top:10px;font-size:11px;color:#6b7280;text-align:center}
    .mhp-home-btn{background:rgba(255,255,255,.08)!important;border:1px solid rgba(255,255,255,.14)!important}
    .mhp-home-btn:hover{background:rgba(255,255,255,.16)!important}
    @media (max-width:480px){
        .mhp-ov{align-items:flex-end;padding:8px}
        .mhp-box{max-width:none;padding:16px;border-radius:22px}
        .mhp-cover{width:88px;height:88px}
        .mhp-card[data-kind=games] .mhp-cover{height:118px}
        .mhp-title{font-size:19px}
        .mhp-lbl{width:70px;font-size:10.5px}
    }
    @media (prefers-reduced-motion:reduce){.mhp-card.is-rolling .mhp-title,.mhp-card.is-rolling .mhp-cover,.mhp-card.is-land .mhp-cover,.mhp-card.is-land .mhp-title{animation:none}}
    `;
    document.head.appendChild(css);

    /* ---------- окно ---------- */
    const ov = document.createElement('div');
    ov.id = 'mh-pick';
    ov.className = 'mhp-ov hidden';
    ov.setAttribute('role', 'dialog');
    ov.setAttribute('aria-modal', 'true');
    ov.innerHTML = `<div class="mhp-box"><div class="mhp-head"><h3 id="mhp-title"></h3><button type="button" class="mhp-x" data-p="close" aria-label="Закрыть">✕</button></div>
        <div id="mhp-filters"></div><div id="mhp-card" class="mhp-card"></div><div id="mhp-actions" class="mhp-actions"></div><p id="mhp-note" class="mhp-note"></p></div>`;
    document.body.appendChild(ov);

    /* ---------- состояние (живёт, пока открыта страница) ---------- */
    const F = {
        music: { fmt: 'all', fresh: false },
        games: { st: 'auto', plat: '' }
    };
    let kind = 'music', cur = null, timer = null, rolling = false;

    const stOf = g => (g && g.status) || '';
    const lists = () => (kind === 'music'
        ? [...(data.cds || []).map(i => ({ i, key: 'cds' })), ...(data.vinyls || []).map(i => ({ i, key: 'vinyls' }))]
        : (data.games || []).filter(g => !g.hidden && !['app', 'skipped'].includes(stOf(g))).map(i => ({ i, key: 'games' })));

    /** пул по фильтрам → { list, label } */
    function pool() {
        const all = lists();
        if (kind === 'music') {
            const f = F.music;
            const list = all.filter(x => (f.fmt === 'all' || x.key === f.fmt) && (!f.fresh || !(x.i.playCount > 0)));
            return { list, label: list.length ? `${list.length} в пуле` : '' };
        }
        const f = F.games;
        let base = all.filter(x => !f.plat || x.i.platform === f.plat);
        if (f.st === 'backlog') base = base.filter(x => stOf(x.i) === 'backlog');
        else if (f.st === 'playing') base = base.filter(x => ['playing', 'dropped'].includes(stOf(x.i)));
        else if (f.st === 'any') { /* всё */ }
        else {      // «Авто»: сначала «В планах», потом игры без статуса, потом начатые, онлайн, песочницы
            const tiers = [['backlog'], [''], ['playing', 'dropped'], ['online'], ['sandbox']];
            const t = tiers.map(ts => base.filter(x => ts.includes(stOf(x.i)))).find(a => a.length);
            base = t || [];
            return { list: base, label: base.length ? `${base.length} в пуле · сначала «В планах»` : '' };
        }
        return { list: base, label: base.length ? `${base.length} в пуле` : '' };
    }

    const chip = (grp, val, text, on) => `<button type="button" class="mhp-chip${on ? ' is-on' : ''}" data-p="f" data-g="${grp}" data-v="${E(val)}" aria-pressed="${on ? 'true' : 'false'}">${E(text)}</button>`;
    function paintFilters() {
        const box = $('mhp-filters');
        if (kind === 'music') {
            const f = F.music;
            box.innerHTML = `<div class="mhp-grp"><span class="mhp-lbl">Формат</span><div class="mhp-chips">${chip('fmt', 'all', 'Всё', f.fmt === 'all')}${chip('fmt', 'cds', '💿 CD', f.fmt === 'cds')}${chip('fmt', 'vinyls', '💽 Винил', f.fmt === 'vinyls')}</div></div>
                <div class="mhp-grp"><span class="mhp-lbl">Что брать</span><div class="mhp-chips">${chip('fresh', '0', 'Любое', !f.fresh)}${chip('fresh', '1', 'Ещё не слушал', f.fresh)}</div></div>`;
        } else {
            const f = F.games;
            const plats = [...new Set((data.games || []).filter(g => !g.hidden && g.platform).map(g => g.platform))].sort((a, b) => String(a).localeCompare(String(b), 'ru'));
            box.innerHTML = `<div class="mhp-grp"><span class="mhp-lbl">Статус</span><div class="mhp-chips">${[['auto', 'Авто'], ['backlog', 'В планах'], ['playing', 'Начатые'], ['any', 'Любая']].map(([v, t]) => chip('st', v, t, f.st === v)).join('')}</div></div>
                ${plats.length > 1 ? `<div class="mhp-grp"><span class="mhp-lbl">Платформа</span><div class="mhp-chips">${chip('plat', '', 'Все', !f.plat)}${plats.map(p => chip('plat', p, p, f.plat === p)).join('')}</div></div>` : ''}`;
        }
    }

    function metaOf(x) {
        const i = x.i;
        if (kind === 'music') {
            return [x.key === 'vinyls' ? '💽 Винил' : '💿 CD', i.year, i.label, i.playCount > 0 ? `слушал ${i.playCount} ${(() => { const n = i.playCount, m = n % 100, k = n % 10; return (m > 10 && m < 20) ? 'раз' : (k >= 2 && k <= 4) ? 'раза' : 'раз'; })()}` : 'ещё не слушал'].filter(Boolean).join(' · ');
        }
        const ST = { backlog: 'В планах', playing: 'В процессе', completed: 'Пройдено', dropped: 'Заброшено', online: 'Онлайн-игра', sandbox: 'Песочница' };
        return [ST[stOf(i)], i.year, i.developer, i.hours ? `${i.hours} ч` : ''].filter(Boolean).join(' · ');
    }
    function paintCard(x, anim) {
        const card = $('mhp-card'), i = x.i, src = cover(i.img);
        card.dataset.kind = kind;
        card.className = 'mhp-card' + (anim ? ' ' + anim : '');
        const sub = kind === 'music' ? (i.artist || 'Разные исполнители') : (i.platform || '');
        card.innerHTML = `<div class="mhp-bg">${src ? `<img src="${E(src)}" alt="">` : ''}</div>
            <span class="mhp-cover">${src ? `<img src="${E(src)}" alt="">` : (kind === 'music' ? '💿' : '🎮')}</span>
            <div class="mhp-info"><p class="mhp-sub">${E(sub)}</p><p class="mhp-title">${E(i.title || 'Без названия')}</p><p class="mhp-meta">${E(kind === 'music' ? metaOf(x) : metaOf(x))}</p></div>`;
    }
    function paintActions(x) {
        const box = $('mhp-actions');
        if (!x) { box.innerHTML = ''; return; }
        const main = kind === 'music'
            ? `<button type="button" class="mhp-btn is-main" data-p="play">▶ Слушать</button>`
            : (stOf(x.i) !== 'playing' ? `<button type="button" class="mhp-btn is-main" data-p="play">▶ Начать играть</button>` : '');
        box.innerHTML = `<button type="button" class="mhp-btn" data-p="again">🎲 Ещё вариант</button><button type="button" class="mhp-btn" data-p="open">Открыть</button>${main}`;
    }

    function roll() {
        clearTimeout(timer);
        const { list, label } = pool();
        const note = $('mhp-note');
        if (!list.length) {
            cur = null; rolling = false;
            $('mhp-card').className = 'mhp-card';
            $('mhp-card').innerHTML = `<p class="mhp-empty" style="width:100%">${kind === 'music'
                ? (lists().length ? 'Под эти фильтры ничего не подошло. Сними «Ещё не слушал» или выбери другой формат.' : 'В коллекции пока нет релизов.')
                : (lists().length ? 'Под эти фильтры игр нет. Выбери другой статус или платформу.' : 'Добавь игры в коллекцию, тогда будет из чего выбирать.')}</p>`;
            paintActions(null); note.textContent = '';
            return;
        }
        note.textContent = label;
        let pick = list[Math.floor(Math.random() * list.length)];
        if (list.length > 1) while (cur && pick.i === cur.i) pick = list[Math.floor(Math.random() * list.length)];
        if (reduce() || list.length === 1) { cur = pick; rolling = false; paintCard(pick, 'is-land'); paintActions(pick); return; }
        rolling = true;
        $('mhp-actions').querySelectorAll('button').forEach(b => { b.disabled = true; });
        const TOTAL = 12; let tick = 0, last = null;
        const step = () => {
            tick++;
            if (tick >= TOTAL) { cur = pick; rolling = false; paintCard(pick, 'is-land'); paintActions(pick); return; }
            let shown = list[Math.floor(Math.random() * list.length)];
            if (list.length > 1) while (shown === last) shown = list[Math.floor(Math.random() * list.length)];
            last = shown;
            paintCard(shown, 'is-rolling');
            timer = setTimeout(step, 50 + Math.pow(tick / TOTAL, 2) * 170);
        };
        step();
    }

    function close() { clearTimeout(timer); rolling = false; ov.classList.add('hidden'); }
    function open(k) {
        kind = k === 'games' ? 'games' : 'music';
        if (!lists().length) { try { showToast(kind === 'music' ? 'У вас пока нет релизов в коллекции!' : 'Добавьте игры в коллекцию, тогда будет из чего выбирать 🎮'); } catch (_) {} return; }
        cur = null;
        $('mhp-title').textContent = kind === 'music' ? '🎲 Что послушать?' : '🎮 Во что поиграть?';
        ov.setAttribute('aria-label', kind === 'music' ? 'Что послушать' : 'Во что поиграть');
        paintFilters();
        ov.classList.remove('hidden');
        roll();
        setTimeout(() => { const b = ov.querySelector('[data-p=again]'); if (b && !b.disabled) b.focus(); }, 0);
    }

    ov.addEventListener('click', e => {
        if (e.target === ov) return close();
        const b = e.target.closest('[data-p]');
        if (!b || b.disabled) return;
        const act = b.dataset.p;
        if (act === 'close') return close();
        if (act === 'f') {
            const g = b.dataset.g, v = b.dataset.v;
            if (g === 'fmt') F.music.fmt = v;
            else if (g === 'fresh') F.music.fresh = v === '1';
            else if (g === 'st') F.games.st = v;
            else if (g === 'plat') F.games.plat = v;
            paintFilters(); roll(); return;
        }
        if (rolling) return;
        if (act === 'again') return roll();
        if (!cur) return;
        const id = cur.i.id;
        if (act === 'open') {
            close();
            if (kind === 'music') { if (typeof window.openMusicDetail === 'function') window.openMusicDetail(cur.key, id); }
            else if (typeof window.openGameDetail === 'function') { if (typeof showPage === 'function') showPage('games'); window.openGameDetail(id); }
        } else if (act === 'play') {
            if (kind === 'music') { close(); if (typeof window.listenTo === 'function') window.listenTo(id); }
            else {
                const title = cur.i.title;
                if (typeof window.mhSetGameStatus === 'function' && window.mhSetGameStatus(id, 'playing')) { try { showToast(`Приятной игры: <strong>${E(title)}</strong> 🎮`); } catch (_) {} }
                close();
            }
        }
    });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !ov.classList.contains('hidden')) { e.stopPropagation(); close(); } }, true);

    window.mhPicker = { open, close };

    /* Старые точки входа (главная, палитра Ctrl+K) теперь ведут в новое окно */
    const oldRelease = window.getRandomRelease;
    window.getRandomRelease = function () { try { open('music'); } catch (e) { if (typeof oldRelease === 'function') oldRelease(); } };
})();
