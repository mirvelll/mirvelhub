/* =========================================================
   MIRVEL HUB — 51-recap.js (подключать последним, после 50-toolbar.js)
   «Рекап»: слайды-итоги за выбранный год или за всё время. Каждый слайд — картинка 1080×1920 (PNG).
   Кнопка «🎞 Рекап» — в шапке страницы «Статистика». Данные не хранит и ничего не меняет.
   Работает с неполными данными: берёт любые доступные даты (finishedAt, startedAt, a.ts, platAt, метка в id),
   слайды без данных пропускает, нули не показывает, при малом объёме данных пишет аккуратную пометку.
   Доступно: window.openRecap([год])
   ========================================================= */
(() => {
    'use strict';
    const $ = id => document.getElementById(id);
    const W = 1080, H = 1920;
    const FD = "'Unbounded', 'Inter', system-ui, sans-serif", FU = "'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif";
    const num = v => Number(v) || 0;
    const MONTHS = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
    const pl = (n, f) => { n = Math.abs(Math.round(n)); const a = n % 10, b = n % 100; return a === 1 && b !== 11 ? f[0] : a >= 2 && a <= 4 && (b < 12 || b > 14) ? f[1] : f[2]; };
    const fmtN = n => Math.round(n).toLocaleString('ru-RU');
    const isoTs = v => { const m = String(v || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? new Date(+m[1], +m[2] - 1, +m[3], 12).getTime() : 0; };
    const idTs = id => { const n = Number(id); return n > 1e12 && n < 4e12 ? n : 0; };
    const hidden = g => { try { return typeof isGameHidden === 'function' && isGameHidden(g); } catch (_) { return false; } };
    const safeImg = s => { const v = String(s || ''); return /^data:image\//i.test(v) ? v : (typeof safeUrl === 'function' ? safeUrl(v) : ''); };
    const cache = new Map();
    const loadImg = src => {
        if (!src) return Promise.resolve(null);
        if (cache.has(src)) return cache.get(src);
        const p = new Promise(res => { const im = new Image(); if (!/^data:/i.test(src)) im.crossOrigin = 'anonymous'; im.onload = () => res(im); im.onerror = () => res(null); im.src = src; });
        if (cache.size > 300) cache.clear();
        cache.set(src, p); return p;
    };

    /* ---------- Сбор данных за период (y = год или 0 = всё время) ---------- */
    function collect(y) {
        const A = y ? new Date(y, 0, 1).getTime() : -Infinity, B = y ? new Date(y + 1, 0, 1).getTime() : Infinity;
        const inP = ts => ts > 0 && ts >= A && ts < B;
        const ev = [];                                   // события для «активных месяцев»
        const games = (data.games || []).filter(g => !hidden(g));
        const D = { y, ev, years: new Set() };
        const yr = ts => { if (ts) D.years.add(new Date(ts).getFullYear()); };

        const added = [];
        [['cds', '💿'], ['vinyls', '💽'], ['games', '🎮'], ['stuff', '📦']].forEach(([k, ic]) => (data[k] || []).forEach(it => {
            if (k === 'games' && hidden(it)) return;
            const ts = idTs(it.id); yr(ts);
            if (y ? inP(ts) : true) { added.push({ k, it }); if (ts) ev.push(ts); }
        }));
        D.added = added;
        D.spent = added.reduce((s, a) => s + num(a.it.price), 0);
        D.addedBy = { cds: 0, vinyls: 0, games: 0, stuff: 0 }; added.forEach(a => D.addedBy[a.k]++);

        let ach = 0, plats = [], dlcPlats = 0, relevant = new Set();
        games.forEach(g => {
            const st = isoTs(g.startedAt), fi = isoTs(g.finishedAt); yr(st); yr(fi);
            if (inP(st)) { ev.push(st); relevant.add(g); }
            if (inP(fi)) { ev.push(fi); relevant.add(g); }
            if (!y && (st || fi || g.status === 'completed' || num(g.hours) > 0)) relevant.add(g);
            if (y && inP(idTs(g.id))) relevant.add(g);
            (g.achList || []).forEach(a => { if (a && a.done) { if (a.ts) yr(a.ts); if (y ? inP(a.ts) : true) { ach++; if (a.ts) ev.push(a.ts); relevant.add(g); } } });
            if (g.trophy === 'full' && num(g.trophyTotal) > 0) { const t = num(g.platAt); yr(t); if (y ? inP(t) : true) { plats.push({ g, ts: t }); if (t) ev.push(t); } }
            (g.achGroups || []).forEach(x => { if (x.platAt && x.key !== 'base' && (y ? inP(x.platAt) : true)) { dlcPlats++; ev.push(x.platAt); } });
        });
        D.ach = ach; D.plats = plats.sort((a, b) => b.ts - a.ts); D.dlcPlats = dlcPlats;
        D.finished = games.filter(g => y ? inP(isoTs(g.finishedAt)) : (g.status === 'completed' || isoTs(g.finishedAt)));
        const rel = [...relevant];
        D.hours = rel.reduce((s, g) => s + num(g.hours), 0);
        D.longest = rel.filter(g => num(g.hours) > 0).sort((a, b) => num(b.hours) - num(a.hours)).slice(0, 5);
        const cnt = (arr, f) => { const m = new Map(); arr.forEach(x => { const k = f(x); if (!k) return; const e = m.get(k.toLowerCase()) || { name: k, n: 0 }; e.n++; m.set(k.toLowerCase(), e); }); return [...m.values()].sort((a, b) => b.n - a.n).slice(0, 5); };
        D.artists = cnt(added.filter(a => a.k === 'cds' || a.k === 'vinyls'), a => String(a.it.artist || '').trim());
        D.platforms = cnt(rel, g => String(g.platform || '').trim()).slice(0, 4);
        // месяцы: для года — 12 столбцов, для всего времени — по годам
        if (y) { D.buckets = MONTHS.map((m, i) => ({ l: m, n: ev.filter(t => new Date(t).getMonth() === i).length })); }
        else { const ys = [...D.years].filter(v => v > 1990).sort(); D.buckets = ys.slice(-8).map(v => ({ l: String(v), n: ev.filter(t => new Date(t).getFullYear() === v).length })); }
        D.eventsTotal = ev.length + (y ? 0 : added.length - ev.length);
        return D;
    }

    /* ---------- Рисование ---------- */
    function rrect(c, x, y, w, h, r) { r = Math.max(0, Math.min(r, w / 2, h / 2)); c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
    function clip(c, t, maxW) { t = String(t == null ? '' : t); if (c.measureText(t).width <= maxW) return t; while (t.length > 1 && c.measureText(t + '…').width > maxW) t = t.slice(0, -1); return t.replace(/[\s.,;:–-]+$/, '') + '…'; }
    function fit(c, t, wt, fam, size, min, maxW) { for (let s = size; s >= min; s -= 2) { c.font = `${wt} ${s}px ${fam}`; if (c.measureText(t).width <= maxW) return; } c.font = `${wt} ${min}px ${fam}`; }
    function cover(c, im, x, y, w, h) { const iw = im.naturalWidth || im.width, ih = im.naturalHeight || im.height; if (!iw || !ih) return; const s = Math.max(w / iw, h / ih), sw = w / s, sh = h / s; c.imageSmoothingQuality = 'high'; c.drawImage(im, (iw - sw) / 2, (ih - sh) / 2, sw, sh, x, y, w, h); }
    const hueOf = s => [...String(s)].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) % 360, 7);
    const spaced = (c, px) => { try { c.letterSpacing = px + 'px'; } catch (_) {} };

    function frame(c, rgb, idx, label, title) {
        c.fillStyle = '#05050a'; c.fillRect(0, 0, W, H);
        const hues = [['139,92,246', '6,182,212'], ['234,179,8', '236,72,153'], ['16,185,129', '59,130,246'], ['244,63,94', '168,85,247']][idx % 4];
        const g1 = c.createRadialGradient(W * 0.2, 260, 40, W * 0.2, 260, 1100); g1.addColorStop(0, `rgba(${idx ? hues[0] : rgb},0.42)`); g1.addColorStop(1, 'rgba(0,0,0,0)');
        c.fillStyle = g1; c.fillRect(0, 0, W, H);
        const g2 = c.createRadialGradient(W * 0.9, H * 0.85, 40, W * 0.9, H * 0.85, 1100); g2.addColorStop(0, `rgba(${hues[1]},0.28)`); g2.addColorStop(1, 'rgba(0,0,0,0)');
        c.fillStyle = g2; c.fillRect(0, 0, W, H);
        c.textAlign = 'center'; c.textBaseline = 'alphabetic';
        spaced(c, 8); c.font = `800 28px ${FU}`; c.fillStyle = 'rgba(255,255,255,0.55)'; c.fillText(clip(c, label, 960), W / 2, 130); spaced(c, 0);
        fit(c, title, 800, FD, 96, 40, 940); c.fillStyle = '#fff'; c.fillText(clip(c, title, 940), W / 2, 270);
        spaced(c, 6); c.font = `800 30px ${FD}`; c.fillStyle = 'rgba(255,255,255,0.4)'; c.fillText('MIRVEL HUB', W / 2, 1850); spaced(c, 0);
    }
    function card(c, x, y, w, h) { rrect(c, x, y, w, h, 40); c.fillStyle = 'rgba(255,255,255,0.07)'; c.fill(); c.lineWidth = 2; c.strokeStyle = 'rgba(255,255,255,0.14)'; c.stroke(); }
    function bigStats(c, list, y0) {
        const h = list.length <= 3 ? 240 : 200, gap = 30; let y = y0;
        list.forEach(s => {
            card(c, 80, y, W - 160, h); c.textAlign = 'center';
            fit(c, s.v, 800, FD, 110, 40, W - 220); c.fillStyle = s.color || '#fff'; c.fillText(clip(c, s.v, W - 220), W / 2, y + h * 0.58);
            fit(c, s.l, 600, FU, 36, 20, W - 220); c.fillStyle = 'rgba(255,255,255,0.65)'; c.fillText(clip(c, s.l, W - 220), W / 2, y + h * 0.86);
            y += h + gap;
        });
        return y;
    }
    async function coverGrid(c, items, x, y, w, h, sub) {      // items: [{title,img,sub}]
        const n = items.length; if (!n) return;
        const cols = n === 1 ? 1 : (n === 2 || n === 4) ? 2 : 3, rows = Math.ceil(n / cols), gap = 24;
        const capH = sub ? 100 : 60;
        const cell = Math.floor(Math.min((w - gap * (cols - 1)) / cols, (h - rows * capH - gap * (rows - 1)) / rows, 420));
        const gw = cols * cell + (cols - 1) * gap, gh = rows * (cell + capH) + (rows - 1) * gap, x0 = x + (w - gw) / 2, y0 = y + Math.max(0, (h - gh) / 2);
        const ims = await Promise.all(items.map(i => loadImg(safeImg(i.img))));
        items.forEach((it, i) => {
            const r = Math.floor(i / cols), col = i % cols, inRow = r === rows - 1 ? n - r * cols : cols, rowW = inRow * cell + (inRow - 1) * gap;
            const cx = x + (w - rowW) / 2 + col * (cell + gap), cy = y0 + r * (cell + capH + gap);
            c.save(); c.shadowColor = 'rgba(0,0,0,0.5)'; c.shadowBlur = 24; c.shadowOffsetY = 8; rrect(c, cx, cy, cell, cell, 28); c.fillStyle = '#0d0d14'; c.fill(); c.restore();
            c.save(); rrect(c, cx, cy, cell, cell, 28); c.clip();
            if (ims[i]) cover(c, ims[i], cx, cy, cell, cell);
            else { const hh = hueOf(it.title), g = c.createLinearGradient(cx, cy, cx + cell, cy + cell); g.addColorStop(0, `hsl(${hh} 55% 30%)`); g.addColorStop(1, `hsl(${(hh + 45) % 360} 60% 16%)`); c.fillStyle = g; c.fillRect(cx, cy, cell, cell); }
            c.restore(); rrect(c, cx, cy, cell, cell, 28); c.lineWidth = 2; c.strokeStyle = 'rgba(255,255,255,0.14)'; c.stroke();
            c.textAlign = 'center'; c.font = `800 ${cell > 250 ? 30 : 24}px ${FU}`; c.fillStyle = '#fff'; c.fillText(clip(c, it.title, cell), cx + cell / 2, cy + cell + 38);
            if (it.sub) { c.font = `700 ${cell > 250 ? 26 : 22}px ${FU}`; c.fillStyle = '#67e8f9'; c.fillText(clip(c, it.sub, cell), cx + cell / 2, cy + cell + 76); }
        });
    }
    function bars(c, rows, y0, color) {       // rows: [{label,value,text}]
        const max = Math.max(1, ...rows.map(r => r.value)), rh = 150; let y = y0;
        rows.forEach((r, i) => {
            card(c, 80, y, W - 160, rh - 20);
            c.textAlign = 'left'; c.font = `800 36px ${FU}`; c.fillStyle = '#fff'; c.fillText(clip(c, `${i + 1}. ${r.label}`, W - 160 - 60 - 220), 120, y + 56);
            c.textAlign = 'right'; c.font = `800 36px ${FD}`; c.fillStyle = color; c.fillText(r.text, W - 120, y + 56);
            rrect(c, 120, y + 80, W - 240, 18, 9); c.fillStyle = 'rgba(255,255,255,0.1)'; c.fill();
            rrect(c, 120, y + 80, Math.max(18, (W - 240) * r.value / max), 18, 9); c.fillStyle = color; c.fill();
            y += rh;
        });
        c.textAlign = 'center';
    }
    function monthBars(c, bk, y0) {
        const x0 = 90, w = W - 180, h = 700, n = bk.length, gap = n > 8 ? 14 : 24, bw = (w - gap * (n - 1)) / n, max = Math.max(1, ...bk.map(b => b.n));
        card(c, 60, y0 - 40, W - 120, h + 200);
        let top = 0;
        bk.forEach((b, i) => { if (b.n > bk[top].n) top = i; });
        bk.forEach((b, i) => {
            const bh = b.n ? Math.max(14, (h - 60) * b.n / max) : 6, x = x0 + i * (bw + gap), y = y0 + h - bh;
            rrect(c, x, y, bw, bh, Math.min(16, bw / 2)); c.fillStyle = i === top ? '#fbbf24' : 'rgba(167,139,250,0.75)'; c.fill();
            c.textAlign = 'center'; if (b.n) { c.font = `800 ${n > 8 ? 26 : 32}px ${FU}`; c.fillStyle = '#fff'; c.fillText(String(b.n), x + bw / 2, y - 14); }
            c.font = `700 ${n > 8 ? 24 : 30}px ${FU}`; c.fillStyle = 'rgba(255,255,255,0.6)'; c.fillText(b.l, x + bw / 2, y0 + h + 50);
        });
        return top;
    }

    /* ---------- Слайды ---------- */
    function buildSlides(D) {
        const S = [], per = D.y ? String(D.y) : 'ВСЁ ВРЕМЯ';
        const lowData = D.eventsTotal < 15;
        const hasAny = D.added.length || D.ach || D.plats.length || D.finished.length || D.hours;
        if (!hasAny) return S;
        const intro = [];
        if (D.added.length) intro.push({ v: fmtN(D.added.length), l: pl(D.added.length, ['позиция добавлена', 'позиции добавлено', 'позиций добавлено']), color: '#c4b5fd' });
        if (D.finished.length) intro.push({ v: fmtN(D.finished.length), l: pl(D.finished.length, ['игра пройдена', 'игры пройдено', 'игр пройдено']), color: '#34d399' });
        const pc = D.plats.length + D.dlcPlats; if (pc) intro.push({ v: fmtN(pc), l: pl(pc, ['платина', 'платины', 'платин']), color: '#67e8f9' });
        if (D.ach) intro.push({ v: fmtN(D.ach), l: pl(D.ach, ['ачивка получена', 'ачивки получено', 'ачивок получено']), color: '#fbbf24' });
        S.push({ key: 'intro', name: 'Итоги', async draw(c, rgb) {
            frame(c, rgb, 0, 'MIRVEL РЕКАП', per);
            const end = bigStats(c, intro.slice(0, 4), 360);
            if (lowData) { c.textAlign = 'center'; c.font = `600 32px ${FU}`; c.fillStyle = 'rgba(255,255,255,0.55)'; c.fillText('Данных пока мало — дополняй коллекцию,', W / 2, Math.min(end + 30, 1760)); c.fillText('и рекап станет полнее.', W / 2, Math.min(end + 76, 1806)); }
        } });
        if (D.plats.length || D.ach) {
            const st = []; const pc2 = D.plats.length + D.dlcPlats;
            if (pc2) st.push({ v: fmtN(pc2), l: pl(pc2, ['платина', 'платины', 'платин']), color: '#67e8f9' });
            if (D.ach) st.push({ v: fmtN(D.ach), l: pl(D.ach, ['ачивка', 'ачивки', 'ачивок']), color: '#fbbf24' });
            S.push({ key: 'plat', name: 'Платины', async draw(c, rgb) {
                frame(c, rgb, 1, per, '🏆 ДОСТИЖЕНИЯ');
                const end = bigStats(c, st, 360);
                const top = D.plats.filter(p => p.g).slice(0, 3).map(p => ({ title: p.g.title, img: p.g.img, sub: p.ts ? new Date(p.ts).toLocaleDateString('ru-RU') : '' }));
                if (top.length) await coverGrid(c, top, 60, end + 10, W - 120, 1790 - end - 20, true);
            } });
        }
        if (D.finished.length) S.push({ key: 'done', name: 'Пройдено', async draw(c, rgb) {
            frame(c, rgb, 2, per, '✅ ПРОЙДЕНО');
            c.textAlign = 'center'; fit(c, String(D.finished.length), 800, FD, 200, 80, 800); c.fillStyle = '#34d399'; c.fillText(String(D.finished.length), W / 2, 500);
            c.font = `700 40px ${FU}`; c.fillStyle = 'rgba(255,255,255,0.65)'; c.fillText(pl(D.finished.length, ['игра', 'игры', 'игр']), W / 2, 565);
            const items = D.finished.slice().sort((a, b) => isoTs(b.finishedAt) - isoTs(a.finishedAt)).slice(0, 6).map(g => ({ title: g.title, img: g.img, sub: g.finishedAt ? new Date(isoTs(g.finishedAt)).toLocaleDateString('ru-RU') : '' }));
            await coverGrid(c, items, 60, 620, W - 120, 1170, true);
        } });
        if (D.hours >= 1) S.push({ key: 'hours', name: 'Часы', async draw(c, rgb) {
            frame(c, rgb, 3, per, '⏱ НАИГРАНО');
            c.textAlign = 'center'; fit(c, fmtN(D.hours), 800, FD, 180, 70, 900); c.fillStyle = '#fb7185'; c.fillText(fmtN(D.hours), W / 2, 480);
            c.font = `700 40px ${FU}`; c.fillStyle = 'rgba(255,255,255,0.65)'; c.fillText(pl(D.hours, ['час', 'часа', 'часов']) + (D.hours >= 48 ? ` · это ${(D.hours / 24).toFixed(1).replace('.0', '')} сут.` : ''), W / 2, 545);
            c.font = `800 30px ${FU}`; spaced(c, 4); c.fillStyle = 'rgba(255,255,255,0.5)'; c.fillText('САМЫЕ ДОЛГИЕ', W / 2, 650); spaced(c, 0);
            bars(c, D.longest.map(g => ({ label: g.title, value: num(g.hours), text: fmtN(num(g.hours)) + ' ч' })), 690, '#fb7185');
        } });
        if (D.added.length) S.push({ key: 'added', name: 'Коллекция', async draw(c, rgb) {
            frame(c, rgb, 2, per, '📦 КОЛЛЕКЦИЯ');
            const L = [['cds', '💿', 'CD'], ['vinyls', '💽', 'винил'], ['games', '🎮', 'игры'], ['stuff', '📦', 'вещи']].filter(x => D.addedBy[x[0]]);
            const st = [{ v: fmtN(D.added.length), l: pl(D.added.length, ['позиция добавлена', 'позиции добавлено', 'позиций добавлено']), color: '#c4b5fd' }];
            if (D.spent > 0) st.push({ v: fmtN(D.spent) + ' ₴', l: 'потрачено', color: '#22d3ee' });
            const end = bigStats(c, st, 360);
            const rows = L.map(x => ({ label: `${x[1]} ${x[2]}`, value: D.addedBy[x[0]], text: String(D.addedBy[x[0]]) }));
            if (rows.length > 1) bars(c, rows, end + 20, '#a78bfa');
        } });
        if (D.artists.length || D.platforms.length > 1) S.push({ key: 'fav', name: 'Любимое', async draw(c, rgb) {
            frame(c, rgb, 0, per, '❤ ЛЮБИМОЕ');
            let y = 340;
            if (D.artists.length) { c.textAlign = 'center'; c.font = `800 30px ${FU}`; spaced(c, 4); c.fillStyle = 'rgba(255,255,255,0.5)'; c.fillText('ИСПОЛНИТЕЛИ', W / 2, y); spaced(c, 0); bars(c, D.artists.map(a => ({ label: a.name, value: a.n, text: '×' + a.n })), y + 30, '#f472b6'); y += 30 + D.artists.length * 150 + 40; }
            if (D.platforms.length > 1 && y < 1300) { c.textAlign = 'center'; c.font = `800 30px ${FU}`; spaced(c, 4); c.fillStyle = 'rgba(255,255,255,0.5)'; c.fillText('ПЛАТФОРМЫ', W / 2, y); spaced(c, 0); bars(c, D.platforms.slice(0, Math.max(1, Math.floor((1800 - y - 30) / 150))).map(a => ({ label: a.name, value: a.n, text: '×' + a.n })), y + 30, '#34d399'); }
        } });
        if (D.buckets.filter(b => b.n).length >= 2 && D.ev.length >= 3) S.push({ key: 'months', name: 'Активность', async draw(c, rgb) {
            frame(c, rgb, 1, per, '📅 АКТИВНОСТЬ');
            const top = monthBars(c, D.buckets, 520);
            c.textAlign = 'center'; c.font = `700 38px ${FU}`; c.fillStyle = 'rgba(255,255,255,0.7)';
            c.fillText(`${D.y ? 'Самый активный месяц' : 'Самый активный год'}: ${D.buckets[top].l}`, W / 2, 1460);
            c.font = `600 28px ${FU}`; c.fillStyle = 'rgba(255,255,255,0.45)'; c.fillText('ачивки, прохождения, добавленное — по датам, которые есть', W / 2, 1512);
        } });
        return S;
    }

    async function renderSlide(s, rgb) {
        try { await Promise.race([Promise.all([`800 80px Unbounded`, `700 40px Inter`].map(f => document.fonts.load(f, 'Аa').catch(() => {}))), new Promise(r => setTimeout(r, 1200))]); } catch (_) {}
        const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const c = cv.getContext('2d');
        await s.draw(c, rgb);
        return new Promise(res => cv.toBlob(res, 'image/png'));
    }

    /* ---------- Окно ---------- */
    let modal = null, D = null, slides = [], idx = 0, blobs = [], urls = [], tok = 0, curYear = 0;
    const BTN = 'bg-white/5 border border-white/10 hover:bg-white/10 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-all';
    function years() { const ys = [...collect(0).years].filter(v => v > 1990).sort((a, b) => b - a); return ys; }
    function ensure() {
        if (modal) return;
        modal = document.createElement('div'); modal.id = 'recap-modal';
        modal.className = 'hidden fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[70] p-3';
        modal.setAttribute('role', 'dialog'); modal.setAttribute('aria-modal', 'true');
        modal.innerHTML = `<div class="glass no-hover w-full max-w-md rounded-3xl p-4 sm:p-5 max-h-[96vh] overflow-y-auto">
            <div class="flex items-center justify-between gap-3 mb-3"><h3 class="text-lg font-black">🎞 Mirvel Рекап</h3>
                <button type="button" class="text-gray-400 hover:text-white px-2 py-1" id="rc-x" aria-label="Закрыть">✕</button></div>
            <div id="rc-years" class="hx-seg flex-wrap mb-3"></div>
            <div class="relative"><img id="rc-img" alt="" class="w-full rounded-2xl border border-white/10 transition-opacity" style="aspect-ratio:9/16;max-height:62vh;object-fit:contain;background:#05050a;margin:0 auto;width:auto;display:block">
                <div id="rc-empty" class="hidden absolute inset-0 flex items-center justify-center text-center text-sm text-gray-400 p-6">Пока нечего показывать за этот период. Добавляй игры, ачивки и даты — рекап соберётся сам.</div></div>
            <div class="flex items-center justify-between gap-2 mt-3">
                <button type="button" id="rc-prev" class="${BTN}" aria-label="Назад">←</button>
                <div class="text-center min-w-0"><p id="rc-name" class="text-sm font-bold truncate"></p><p id="rc-dots" class="text-xs text-gray-500"></p></div>
                <button type="button" id="rc-next" class="${BTN}" aria-label="Дальше">→</button></div>
            <div class="flex gap-2 mt-3"><button type="button" id="rc-save" class="flex-1 bg-purple-600 hover:bg-purple-500 py-3 rounded-xl font-bold text-white btn-neon">⬇ Скачать слайд</button>
                <button type="button" id="rc-all" class="${BTN}" title="Скачать все слайды">⬇ Все</button></div>
            <p class="text-[11px] text-gray-500 mt-2">Если данных мало — слайды без данных пропускаются. Даты берутся из прохождений, ачивок и добавления позиций.</p></div>`;
        document.body.appendChild(modal);
        $('rc-x').onclick = () => closeModal('recap-modal');
        modal.addEventListener('mousedown', e => { if (e.target === modal) closeModal('recap-modal'); });
        document.addEventListener('keydown', e => { if (modal.classList.contains('hidden')) return; if (e.key === 'Escape') closeModal('recap-modal'); if (e.key === 'ArrowRight') go(1); if (e.key === 'ArrowLeft') go(-1); });
        $('rc-prev').onclick = () => go(-1); $('rc-next').onclick = () => go(1);
        $('rc-years').addEventListener('click', e => { const b = e.target.closest('[data-y]'); if (b) load(Number(b.dataset.y)); });
        $('rc-save').onclick = () => save(idx);
        $('rc-all').onclick = async () => { for (let i = 0; i < slides.length; i++) { await save(i); await new Promise(r => setTimeout(r, 350)); } };
        new MutationObserver(() => { if (modal.classList.contains('hidden')) { tok++; urls.forEach(u => u && URL.revokeObjectURL(u)); urls = []; blobs = []; } }).observe(modal, { attributes: true, attributeFilter: ['class'] });
    }
    async function save(i) {
        const b = await getBlob(i); if (!b) return;
        const u = urls[i], a = document.createElement('a'); a.href = u; a.download = `mirvel-recap-${curYear || 'all'}-${i + 1}-${slides[i].key}.png`;
        document.body.appendChild(a); a.click(); a.remove();
    }
    async function getBlob(i) {
        if (blobs[i]) return blobs[i];
        let rgb = '139, 92, 246'; try { rgb = (getComputedStyle(document.body).getPropertyValue('--theme-rgb') || rgb).trim() || rgb; } catch (_) {}
        const b = await renderSlide(slides[i], rgb); if (!b) return null;
        blobs[i] = b; urls[i] = URL.createObjectURL(b); return b;
    }
    function go(d) { if (!slides.length) return; idx = (idx + d + slides.length) % slides.length; show(); }
    async function show() {
        const my = ++tok, img = $('rc-img');
        $('rc-empty').classList.toggle('hidden', slides.length > 0); img.classList.toggle('hidden', !slides.length);
        ['rc-prev', 'rc-next', 'rc-save', 'rc-all'].forEach(id => { $(id).disabled = !slides.length; $(id).style.opacity = slides.length ? '' : '.4'; });
        $('rc-name').textContent = slides.length ? slides[idx].name : ''; $('rc-dots').textContent = slides.length ? slides.map((_, i) => i === idx ? '●' : '○').join(' ') : '';
        if (!slides.length) return;
        img.style.opacity = '0.45';
        try { const b = await getBlob(idx); if (my !== tok || !b) return; img.src = urls[idx]; } catch (e) { console.warn('[MIRVEL] recap:', e); if (typeof showToast === 'function') showToast('Не удалось собрать слайд', 'error'); }
        finally { if (my === tok) img.style.opacity = '1'; }
    }
    function load(y) {
        curYear = y; urls.forEach(u => u && URL.revokeObjectURL(u)); urls = []; blobs = []; idx = 0;
        D = collect(y); slides = buildSlides(D);
        const ys = years();
        $('rc-years').innerHTML = [...ys.slice(0, 6).map(v => [v, String(v)]), [0, 'За всё время']].map(([v, l]) => `<button type="button" data-y="${v}" class="${v === y ? 'is-on' : ''}">${l}</button>`).join('');
        show();
    }
    function open(year) {
        ensure();
        const ys = years();
        const y = year !== undefined ? Number(year) : (ys.includes(new Date().getFullYear()) ? new Date().getFullYear() : (ys[0] || 0));
        modal.classList.remove('hidden'); load(y);
    }
    window.openRecap = open;

    function addButton() {
        const head = document.querySelector('#analytics > div:first-child');
        if (!head || head.querySelector('[data-recap]')) return;
        const b = document.createElement('button'); b.type = 'button'; b.dataset.recap = '1';
        b.className = 'mt-4 ' + BTN; b.textContent = '🎞 Рекап'; b.title = 'Итоги года картинками';
        b.onclick = () => open(); head.appendChild(b);
    }
    const base = window.renderAll; if (typeof renderAll === 'function') { const rb = renderAll; renderAll = function () { rb(); addButton(); }; }
    addButton();
})();
