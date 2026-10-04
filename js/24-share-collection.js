/* =========================================================
   MIRVEL HUB — 24-share-collection.js (подключать последним, после 23-sounds.js)
   «📤 Поделиться» на страницах CD / Винил / Игры: картинка с мозаикой обложек
   всей коллекции и её цифрами — для истории или для рабочего стола.

   Формат: 📱 телефон 1080×1920  или  🖥 ПК 1920×1080.

   В окне предпросмотра четыре вкладки:
   • Основное — формат, порядок (в т.ч. по цене и случайно), размер сетки до 12×12 или «Все»,
     для игр фильтр по платформе и статусу, минимальная оценка, «только с обложками»
   • Фон — размытая обложка (настоящее размытие, без «квадратиков»), СВОЁ ФОТО (не сжимается,
     хранится в браузере), градиент или один цвет; размытие, затемнение, акцентный цвет
   • Плитки — форма (квадрат / мягкие / круглые / круг), расстояние, названия на плитках,
     оценка ★, платформа, отметка «пройдено» ✓
   • Текст — свой заголовок и подпись, панель с цифрами, имя, сумма трат
   Картинка пересобирается сразу при каждом изменении, настройки запоминаются.

   Доступно: window.shareCollection('cds' | 'vinyls' | 'games')
   ========================================================= */
(() => {
    'use strict';
    const FORMATS = { story: { w: 1080, h: 1920 }, wide: { w: 1920, h: 1080 } };
    const $ = id => document.getElementById(id);
    const FONT_D = "'Unbounded', 'Inter', system-ui, sans-serif";
    const FONT_U = "'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif";
    const LANGS = ['ru', 'en', 'uk'];
    const lang = () => { try { return LANGS.includes(data.lang) ? data.lang : 'ru'; } catch (_) { return 'ru'; } };
    const locale = () => ({ ru: 'ru-RU', en: 'en-US', uk: 'uk-UA' })[lang()];
    const num = v => Number(v) || 0;
    const lc = s => String(s || '').trim().toLowerCase();
    const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

    /* ---------- Тексты на самой картинке ---------- */
    const KINDS = {
        cds:    { icon: '💿', title: { ru: 'CD', en: 'CD', uk: 'CD' } },
        vinyls: { icon: '💽', title: { ru: 'ВИНИЛ', en: 'VINYL', uk: 'ВІНІЛ' } },
        games:  { icon: '🎮', title: { ru: 'ИГРЫ', en: 'GAMES', uk: 'ІГРИ' } }
    };
    const T = {
        ru: { label: 'МОЯ КОЛЛЕКЦИЯ', more: n => `и ещё ${n}`, done: 'пройдено', avg: 'средняя оценка', spent: 'потрачено',
              releases: ['релиз', 'релиза', 'релизов'], artists: ['исполнитель', 'исполнителя', 'исполнителей'], games: ['игра', 'игры', 'игр'],
              platforms: ['платформа', 'платформы', 'платформ'] },
        en: { label: 'MY COLLECTION', more: n => `and ${n} more`, done: 'completed', avg: 'avg. rating', spent: 'spent',
              releases: ['release', 'releases', 'releases'], artists: ['artist', 'artists', 'artists'], games: ['game', 'games', 'games'],
              platforms: ['platform', 'platforms', 'platforms'] },
        uk: { label: 'МОЯ КОЛЕКЦІЯ', more: n => `і ще ${n}`, done: 'пройдено', avg: 'середня оцінка', spent: 'витрачено',
              releases: ['реліз', 'релізи', 'релізів'], artists: ['виконавець', 'виконавці', 'виконавців'], games: ['гра', 'гри', 'ігор'],
              platforms: ['платформа', 'платформи', 'платформ'] }
    };
    function plural(n, forms) {
        n = Math.abs(Math.round(n));
        if (lang() === 'en') return n === 1 ? forms[0] : forms[1];
        const m10 = n % 10, m100 = n % 100;
        if (m10 === 1 && m100 !== 11) return forms[0];
        if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return forms[1];
        return forms[2];
    }
    const tr = s => { try { return window.MirvelI18n ? window.MirvelI18n.tr(s) : s; } catch (_) { return s; } };

    /* ---------- Загрузка картинок ---------- */
    const safeImg = s => { const v = String(s || ''); return /^data:image\//i.test(v) ? v : (typeof safeUrl === 'function' ? safeUrl(v) : ''); };
    const imgCache = new Map();
    function loadImg(src) {
        if (!src) return Promise.resolve(null);
        if (imgCache.has(src)) return imgCache.get(src);
        const p = new Promise(res => {
            const im = new Image();
            if (!/^data:/i.test(src)) im.crossOrigin = 'anonymous';     // без CORS картинка «испортила» бы холст — тогда просто рисуем заглушку
            im.onload = () => res(im);
            im.onerror = () => res(null);
            im.src = src;
        });
        if (imgCache.size > 400) imgCache.clear();
        imgCache.set(src, p);
        return p;
    }

    /* ---------- Своё фото для фона (хранится отдельно от данных сайта и НЕ сжимается) ---------- */
    const photo = { img: null, url: null };
    let photoReady = null;
    function bgDb() {
        return new Promise((res, rej) => {
            if (!window.indexedDB) return rej(new Error('no idb'));
            const r = indexedDB.open('mirvel_share_bg', 1);
            r.onupgradeneeded = () => r.result.createObjectStore('kv');
            r.onsuccess = () => res(r.result);
            r.onerror = () => rej(r.error);
        });
    }
    async function bgGet() {
        try {
            const db = await bgDb();
            return await new Promise(res => {
                const q = db.transaction('kv', 'readonly').objectStore('kv').get('photo');
                q.onsuccess = () => res(q.result || null);
                q.onerror = () => res(null);
            });
        } catch (_) { return null; }
    }
    async function bgPut(blob) {
        try {
            const db = await bgDb();
            await new Promise((res, rej) => {
                const tx = db.transaction('kv', 'readwrite');
                if (blob) tx.objectStore('kv').put(blob, 'photo'); else tx.objectStore('kv').delete('photo');
                tx.oncomplete = () => res();
                tx.onerror = () => rej(tx.error);
                tx.onabort = () => rej(tx.error);
            });
            return true;
        } catch (_) { return false; }
    }
    function setPhoto(blob) {
        return new Promise(res => {
            const u = URL.createObjectURL(blob);
            const im = new Image();
            im.onload = () => { if (photo.url) URL.revokeObjectURL(photo.url); photo.url = u; photo.img = im; res(true); };
            im.onerror = () => { URL.revokeObjectURL(u); res(false); };
            im.src = u;
        });
    }
    function ensurePhoto() {
        if (!photoReady) photoReady = (async () => { const b = await bgGet(); if (b) await setPhoto(b); })().then(() => { if (modal) syncControls(); });
        return photoReady;
    }

    /* ---------- Рисование ---------- */
    function rrect(c, x, y, w, h, r) {
        r = Math.max(0, Math.min(r, w / 2, h / 2));
        c.beginPath(); c.moveTo(x + r, y);
        c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
        c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
    }
    /* «cover»-вставка. Большие картинки сначала уменьшаются вдвое по шагам — так нет зубцов и «шакалов» даже в Safari/Firefox */
    function drawCover(c, im, x, y, w, h) {
        const iw = im.naturalWidth || im.width, ih = im.naturalHeight || im.height;
        if (!iw || !ih) return;
        const s = Math.max(w / iw, h / ih), sw = w / s, sh = h / s;
        let src = im, cx = (iw - sw) / 2, cy = (ih - sh) / 2, cw = sw, ch = sh;
        while (cw > w * 2 && ch > h * 2) {
            const nw = Math.max(1, Math.ceil(cw / 2)), nh = Math.max(1, Math.ceil(ch / 2));
            const t = document.createElement('canvas'); t.width = nw; t.height = nh;
            const tc = t.getContext('2d'); tc.imageSmoothingQuality = 'high';
            tc.drawImage(src, cx, cy, cw, ch, 0, 0, nw, nh);
            src = t; cx = 0; cy = 0; cw = nw; ch = nh;
        }
        c.imageSmoothingQuality = 'high';
        c.drawImage(src, cx, cy, cw, ch, x, y, w, h);
    }
    /* Быстрое размытие по Гауссу: три прохода «коробочного» размытия на уменьшенной копии */
    function blurH(src, dst, w, h, r) {
        const d = r * 2 + 1;
        for (let y = 0; y < h; y++) {
            const row = y * w * 4;
            for (let ch = 0; ch < 3; ch++) {
                let sum = 0;
                for (let i = -r; i <= r; i++) sum += src[row + Math.min(w - 1, Math.max(0, i)) * 4 + ch];
                for (let x = 0; x < w; x++) {
                    dst[row + x * 4 + ch] = sum / d;
                    sum += src[row + Math.min(w - 1, x + r + 1) * 4 + ch] - src[row + Math.max(0, x - r) * 4 + ch];
                }
            }
        }
    }
    function blurV(src, dst, w, h, r) {
        const d = r * 2 + 1, st = w * 4;
        for (let x = 0; x < w; x++) {
            for (let ch = 0; ch < 3; ch++) {
                const col = x * 4 + ch;
                let sum = 0;
                for (let i = -r; i <= r; i++) sum += src[Math.min(h - 1, Math.max(0, i)) * st + col];
                for (let y = 0; y < h; y++) {
                    dst[y * st + col] = sum / d;
                    sum += src[Math.min(h - 1, y + r + 1) * st + col] - src[Math.max(0, y - r) * st + col];
                }
            }
        }
    }
    function boxBlur(ctx, w, h, r, passes) {
        let id;
        try { id = ctx.getImageData(0, 0, w, h); } catch (_) { return false; }
        const a = id.data, b = new Uint8ClampedArray(a.length);
        for (let i = 3; i < b.length; i += 4) b[i] = 255;
        for (let p = 0; p < passes; p++) { blurH(a, b, w, h, r); blurV(b, a, w, h, r); }
        ctx.putImageData(id, 0, 0);
        return true;
    }
    function blurInto(c, im, W, H, blur) {
        const k = blur < 14 ? 2 : blur < 30 ? 4 : 7;
        const sw = Math.ceil(W / k), sh = Math.ceil(H / k);
        const t = document.createElement('canvas'); t.width = sw; t.height = sh;
        const tc = t.getContext('2d');
        tc.fillStyle = '#05050a'; tc.fillRect(0, 0, sw, sh);
        drawCover(tc, im, 0, 0, sw, sh);
        const ok = boxBlur(tc, sw, sh, Math.max(1, Math.round(blur / k)), 3);
        if (!ok && 'filter' in c) {          // запасной путь, если браузер не дал прочитать пиксели
            c.filter = `blur(${blur}px)`;
            drawCover(c, im, -blur * 2, -blur * 2, W + blur * 4, H + blur * 4);
            c.filter = 'none';
            return;
        }
        c.imageSmoothingQuality = 'high';
        c.drawImage(t, 0, 0, W, H);
    }
    /* лёгкое «зерно» поверх размытия — убирает полосы в плавных градиентах */
    function addNoise(c, W, H) {
        const n = document.createElement('canvas'); n.width = n.height = 128;
        const nc = n.getContext('2d'), id = nc.createImageData(128, 128);
        for (let i = 0; i < id.data.length; i += 4) { const v = (Math.random() * 255) | 0; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 9; }
        nc.putImageData(id, 0, 0);
        c.fillStyle = c.createPattern(n, 'repeat'); c.fillRect(0, 0, W, H);
    }
    function wrap(c, text, maxW, maxLines) {
        const words = String(text).split(/\s+/).filter(Boolean), lines = [];
        let line = '';
        for (const w of words) {
            const t = line ? line + ' ' + w : w;
            if (c.measureText(t).width <= maxW || !line) line = t; else { lines.push(line); line = w; }
        }
        if (line) lines.push(line);
        if (lines.length <= maxLines) return lines;
        const cut = lines.slice(0, maxLines);
        let last = cut[maxLines - 1];
        while (last.length > 1 && c.measureText(last + '…').width > maxW) last = last.slice(0, -1);
        cut[maxLines - 1] = last.replace(/[\s.,;:–-]+$/, '') + '…';
        return cut;
    }
    /* подбирает размер шрифта, чтобы строка влезла в maxW */
    function fit(c, text, weight, family, size, minSize, maxW) {
        for (let s = size; s >= minSize; s -= 2) { c.font = `${weight} ${s}px ${family}`; if (c.measureText(text).width <= maxW) return s; }
        c.font = `${weight} ${minSize}px ${family}`; return minSize;
    }
    const hue = s => [...String(s)].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) % 360, 7);
    const hexToRgb = h => { const m = /^#?([0-9a-f]{6})$/i.exec(h || ''); if (!m) return ''; const n = parseInt(m[1], 16); return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`; };
    const rgbToHex = s => '#' + String(s).split(',').map(v => clamp(Number(v) || 0, 0, 255).toString(16).padStart(2, '0')).join('');

    /* Подбирает столбцы×строки так, чтобы плитки получились как можно крупнее */
    function layoutGrid(n, bw, bh, gap, maxCell) {
        let best = null;
        for (let cols = 1; cols <= n; cols++) {
            const rows = Math.ceil(n / cols);
            const cell = Math.floor(Math.min((bw - gap * (cols - 1)) / cols, (bh - gap * (rows - 1)) / rows));
            if (cell < 1) continue;
            const fill = n / (cols * rows);
            if (!best || cell > best.cell || (cell === best.cell && fill > best.fill)) best = { cols, rows, cell, fill };
        }
        if (!best) { const cols = Math.min(n, 20); best = { cols, rows: Math.ceil(n / cols), cell: 10, fill: 1 }; }
        best.cell = Math.min(best.cell, maxCell);
        return best;
    }

    function chip(c, txt, x, y, fs, color, anchor) {
        c.font = `800 ${fs}px ${FONT_U}`; c.textAlign = 'left'; c.textBaseline = 'middle';
        const w = c.measureText(txt).width + fs * 1.1, h = fs * 1.7;
        const bx = anchor === 'center' ? x - w / 2 : anchor === 'right' ? x - w : x;
        rrect(c, bx, y, w, h, h / 2); c.fillStyle = 'rgba(0,0,0,0.72)'; c.fill();
        c.fillStyle = color; c.fillText(txt, bx + fs * 0.55, y + h / 2 + 1);
        c.textBaseline = 'alphabetic';
    }
    function drawCheck(c, cx, cy, r) {
        c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.fillStyle = '#10b981'; c.fill();
        c.lineWidth = Math.max(1.5, r * 0.14); c.strokeStyle = 'rgba(0,0,0,0.35)'; c.stroke();
        c.beginPath(); c.moveTo(cx - r * 0.42, cy + r * 0.02); c.lineTo(cx - r * 0.1, cy + r * 0.34); c.lineTo(cx + r * 0.46, cy - r * 0.3);
        c.lineWidth = Math.max(2, r * 0.24); c.lineCap = 'round'; c.lineJoin = 'round'; c.strokeStyle = '#fff'; c.stroke();
        c.lineCap = 'butt';
    }

    const ROUND = { sq: 0, soft: 0.07, round: 0.2 };
    function drawTile(c, item, im, x, y, s, o) {
        const circle = o.round === 'circle';
        const r = circle ? s / 2 : Math.round(s * (ROUND[o.round] ?? 0.07));
        c.save();
        c.shadowColor = 'rgba(0,0,0,0.5)'; c.shadowBlur = Math.max(6, s * 0.09); c.shadowOffsetY = Math.max(2, s * 0.03);
        rrect(c, x, y, s, s, r); c.fillStyle = '#0d0d14'; c.fill();
        c.restore();
        c.save(); rrect(c, x, y, s, s, r); c.clip();
        if (im) drawCover(c, im, x, y, s, s);
        else {
            const h = hue(item.title || '');
            const g = c.createLinearGradient(x, y, x + s, y + s);
            g.addColorStop(0, `hsl(${h} 55% 30%)`); g.addColorStop(1, `hsl(${(h + 45) % 360} 60% 16%)`);
            c.fillStyle = g; c.fillRect(x, y, s, s);
            c.textAlign = 'center'; c.textBaseline = 'middle';
            let ty = y + s / 2;
            if (s >= 200) { c.font = `${Math.round(s * 0.26)}px ${FONT_U}`; c.fillStyle = 'rgba(255,255,255,0.9)'; c.fillText(o.icon, x + s / 2, y + s * 0.34); ty = y + s * 0.66; }
            const fs = Math.max(11, Math.round(s * 0.105));
            c.font = `800 ${fs}px ${FONT_U}`; c.fillStyle = 'rgba(255,255,255,0.92)';
            const lines = wrap(c, item.title || '', s * (circle ? 0.62 : 0.84), s >= 200 ? 3 : 4);
            const lh = fs * 1.2, top = ty - ((lines.length - 1) * lh) / 2;
            lines.forEach((ln, i) => c.fillText(ln, x + s / 2, top + i * lh));
            c.textBaseline = 'alphabetic';
        }

        /* названия на плитках (внизу, на тёмной подложке) */
        const captions = o.titles && !circle && s >= 110;
        if (captions) {
            const fs = Math.max(12, Math.round(s * 0.085)), pad = Math.round(s * 0.05);
            c.font = `800 ${fs}px ${FONT_U}`; c.textAlign = 'center'; c.textBaseline = 'alphabetic';
            const rows = wrap(c, item.title || '', s * 0.88, s >= 260 ? 2 : 1).map(t => ({ t, f: fs, w: 800, col: '#fff' }));
            const subTxt = o.isGames ? (item.platform || '') : (item.artist || '');
            if (subTxt && s >= 200) {
                const sf = Math.round(fs * 0.82);
                c.font = `700 ${sf}px ${FONT_U}`;
                rows.push({ t: wrap(c, subTxt, s * 0.88, 1)[0], f: sf, w: 700, col: 'rgba(255,255,255,0.72)' });
            }
            const lh = f => f * 1.22, total = rows.reduce((a, q) => a + lh(q.f), 0), gh = total + pad * 2.4;
            const gr = c.createLinearGradient(0, y + s - gh, 0, y + s);
            gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.55, 'rgba(0,0,0,0.6)'); gr.addColorStop(1, 'rgba(0,0,0,0.88)');
            c.fillStyle = gr; c.fillRect(x, y + s - gh, s, gh);
            let yy = y + s - pad - total;
            rows.forEach(q => { c.font = `${q.w} ${q.f}px ${FONT_U}`; c.fillStyle = q.col; yy += lh(q.f); c.fillText(q.t, x + s / 2, yy - q.f * 0.22); });
        }
        c.restore();
        rrect(c, x, y, s, s, r); c.lineWidth = 2; c.strokeStyle = 'rgba(255,255,255,0.14)'; c.stroke();

        /* значки */
        if (o.rating && s >= 110 && num(item.rating) > 0) {
            const fs = Math.max(12, Math.round(s * 0.095)), txt = `★ ${Math.min(5, num(item.rating))}`;
            if (circle) chip(c, txt, x + s / 2, y + s * 0.07, fs, '#facc15', 'center');
            else chip(c, txt, x + s * 0.05, y + s * 0.05, fs, '#facc15', 'left');
        }
        if (o.isGames && o.completed && s >= 90 && item.status === 'completed') {
            const rr = Math.max(9, s * 0.062);
            if (circle) drawCheck(c, x + s * 0.85, y + s * 0.15, rr);
            else drawCheck(c, x + s - s * 0.05 - rr, y + s * 0.05 + rr, rr);
        }
        if (o.isGames && o.platformChip && !captions && s >= 130 && item.platform) {
            const fs = Math.max(12, Math.round(s * 0.075));
            c.font = `800 ${fs}px ${FONT_U}`;
            const txt = wrap(c, item.platform, s * 0.8 - fs * 1.1, 1)[0];
            if (circle) chip(c, txt, x + s / 2, y + s * 0.8, fs, '#c4b5fd', 'center');
            else chip(c, txt, x + s * 0.05, y + s - fs * 1.7 - s * 0.05, fs, '#c4b5fd', 'left');
        }
        c.textBaseline = 'alphabetic';
    }

    function drawBackground(c, W, H, o, imgs, rgb) {
        c.fillStyle = o.bg === 'solid' ? o.bgColor : '#05050a'; c.fillRect(0, 0, W, H);
        let src = null, sharp = false;
        if (o.bg === 'photo') src = photo.img;
        if (o.bg === 'cover' || (o.bg === 'photo' && !src)) src = imgs.find(Boolean) || null;
        if (src) {
            const blur = (o.bg === 'photo' && photo.img) ? o.blur.photo : o.blur.cover;
            if (blur < 1) { drawCover(c, src, 0, 0, W, H); sharp = true; }
            else blurInto(c, src, W, H, blur);
        } else if (o.bg !== 'solid') {
            const g = c.createLinearGradient(0, 0, W, H);
            g.addColorStop(0, `rgba(${rgb}, 0.55)`); g.addColorStop(1, 'rgba(6, 182, 212, 0.35)');
            c.fillStyle = g; c.fillRect(0, 0, W, H);
        }
        const d = clamp(o.dim, 0, 100) / 100;
        const shade = c.createLinearGradient(0, 0, 0, H);
        shade.addColorStop(0, `rgba(3,3,7,${Math.max(0, d - 0.1)})`);
        shade.addColorStop(0.5, `rgba(3,3,7,${d})`);
        shade.addColorStop(1, `rgba(3,3,7,${Math.min(0.97, d + 0.22)})`);
        c.fillStyle = shade; c.fillRect(0, 0, W, H);
        const gx = W > H ? W * 0.5 : W / 2, gy = W > H ? H * 0.5 : 420, gr = W > H ? 900 : 700;
        const glow = c.createRadialGradient(gx, gy, 60, gx, gy, gr);
        glow.addColorStop(0, `rgba(${rgb}, 0.3)`); glow.addColorStop(1, `rgba(${rgb}, 0)`);
        c.fillStyle = glow; c.fillRect(0, 0, W, H);
        if (!sharp) addNoise(c, W, H);
    }

    function statsRow(c, stats, W, py, ph) {
        rrect(c, 60, py, W - 120, ph, 40);
        c.fillStyle = 'rgba(255,255,255,0.07)'; c.fill();
        c.lineWidth = 2; c.strokeStyle = 'rgba(255,255,255,0.14)'; c.stroke();
        const cw = (W - 120) / stats.length;
        stats.forEach((s, i) => {
            const cx = 60 + cw * i + cw / 2;
            if (i) { c.beginPath(); c.moveTo(60 + cw * i, py + 36); c.lineTo(60 + cw * i, py + ph - 36); c.strokeStyle = 'rgba(255,255,255,0.12)'; c.lineWidth = 2; c.stroke(); }
            fit(c, s.v, 800, FONT_D, 74, 28, cw - 36);
            c.fillStyle = s.color || '#fff'; c.fillText(s.v, cx, py + 92);
            fit(c, s.l, 600, FONT_U, 28, 18, cw - 28);
            c.fillStyle = 'rgba(255,255,255,0.6)'; c.fillText(s.l, cx, py + 138);
        });
    }
    function statsCol(c, stats, x, y, w) {
        const ch = 124, gap = 16;
        stats.forEach((s, i) => {
            const yy = y + i * (ch + gap), cx = x + w / 2;
            rrect(c, x, yy, w, ch, 32);
            c.fillStyle = 'rgba(255,255,255,0.07)'; c.fill();
            c.lineWidth = 2; c.strokeStyle = 'rgba(255,255,255,0.14)'; c.stroke();
            fit(c, s.v, 800, FONT_D, 60, 26, w - 40);
            c.fillStyle = s.color || '#fff'; c.fillText(s.v, cx, yy + 70);
            fit(c, s.l, 600, FONT_U, 26, 16, w - 40);
            c.fillStyle = 'rgba(255,255,255,0.6)'; c.fillText(s.l, cx, yy + 106);
        });
    }

    async function build(o) {
        try { await Promise.race([Promise.all([`800 80px Unbounded`, `700 40px Inter`].map(f => document.fonts.load(f, 'Аa').catch(() => {}))), new Promise(r => setTimeout(r, 1200))]); } catch (_) {}
        const t = T[lang()];
        const { w: W, h: H } = FORMATS[o.format] || FORMATS.story;
        const wide = W > H;
        const themeRgb = (getComputedStyle(document.body).getPropertyValue('--theme-rgb') || '139, 92, 246').trim();
        const rgb = hexToRgb(o.accent) || themeRgb;
        const light = rgb.split(',').map(v => Math.round((Number(v) || 0) + (255 - (Number(v) || 0)) * 0.55)).join(', ');
        const imgs = await Promise.all(o.items.map(i => loadImg(safeImg(i.img))));
        if (o.bg === 'photo') await ensurePhoto();

        const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
        const c = cv.getContext('2d');
        c.imageSmoothingQuality = 'high';
        drawBackground(c, W, H, o, imgs, rgb);

        const titleText = (o.title || '').trim() || `${o.kind.icon} ${o.kind.title[lang()]}`;
        let grid, moreAt, brandAt;
        c.textBaseline = 'alphabetic';

        if (!wide) {
            c.textAlign = 'center';
            try { c.letterSpacing = '8px'; } catch (_) {}
            c.font = `800 28px ${FONT_U}`; c.fillStyle = 'rgba(255,255,255,0.55)';
            c.fillText(t.label, W / 2, 138);
            try { c.letterSpacing = '0px'; } catch (_) {}
            fit(c, titleText, 800, FONT_D, 124, 50, 940);
            c.fillStyle = '#fff'; c.fillText(titleText, W / 2, 285);
            let y = 285;
            if (o.sub) { y += 70; fit(c, o.sub, 700, FONT_U, 44, 24, 900); c.fillStyle = `rgb(${light})`; c.fillText(o.sub, W / 2, y); }
            const py = y + 56, ph = 176;
            if (o.stats.length) statsRow(c, o.stats, W, py, ph);
            const gridTop = (o.stats.length ? py + ph : y) + 56;
            const bottom = o.hidden > 0 ? 200 : 145;
            grid = { x: 60, y: gridTop, w: W - 120, h: H - bottom - gridTop };
            moreAt = [W / 2, H - 135]; brandAt = [W / 2, H - 70];
        } else {
            const px = 80, pw = 520, cx = px + pw / 2;
            c.textAlign = 'center';
            try { c.letterSpacing = '8px'; } catch (_) {}
            c.font = `800 26px ${FONT_U}`; c.fillStyle = 'rgba(255,255,255,0.55)';
            c.fillText(t.label, cx, 120);
            try { c.letterSpacing = '0px'; } catch (_) {}
            fit(c, titleText, 800, FONT_D, 100, 38, pw);
            c.fillStyle = '#fff'; c.fillText(titleText, cx, 238);
            let y = 238;
            if (o.sub) { y += 62; fit(c, o.sub, 700, FONT_U, 38, 20, pw); c.fillStyle = `rgb(${light})`; c.fillText(o.sub, cx, y); }
            if (o.stats.length) statsCol(c, o.stats, px, y + 44, pw);
            grid = { x: 680, y: 70, w: W - 680 - 70, h: H - 140 };
            moreAt = [cx, H - 120]; brandAt = [cx, H - 58];
        }

        /* мозаика обложек */
        const n = o.items.length;
        if (!n) {      // фильтр ничего не нашёл
            c.textAlign = 'center'; c.font = `700 40px ${FONT_U}`; c.fillStyle = 'rgba(255,255,255,0.5)';
            c.fillText('—', grid.x + grid.w / 2, grid.y + grid.h / 2);
        } else {
            const gapBase = n <= 4 ? 28 : n <= 16 ? 20 : n <= 36 ? 14 : n <= 64 ? 10 : n <= 120 ? 7 : 5;
            const gap = Math.max(2, Math.round(gapBase * ({ tight: 0.45, normal: 1, wide: 1.7 }[o.gap] || 1)));
            const L = layoutGrid(n, grid.w, grid.h, gap, 480);
            const gridH = L.rows * L.cell + (L.rows - 1) * gap;
            const gy = grid.y + Math.max(0, (grid.h - gridH) / 2);
            o.items.forEach((item, i) => {
                const r = Math.floor(i / L.cols), col = i % L.cols;
                const inRow = r === L.rows - 1 ? n - r * L.cols : L.cols;
                const rowW = inRow * L.cell + (inRow - 1) * gap;
                const x0 = grid.x + (grid.w - rowW) / 2;
                drawTile(c, item, imgs[i], x0 + col * (L.cell + gap), gy + r * (L.cell + gap), L.cell, o);
            });
        }

        c.textAlign = 'center'; c.textBaseline = 'alphabetic';
        if (o.hidden > 0) {
            c.font = `700 ${wide ? 30 : 34}px ${FONT_U}`; c.fillStyle = 'rgba(255,255,255,0.7)';
            c.fillText(t.more(o.hidden), moreAt[0], moreAt[1]);
        }
        /* подпись */
        c.font = `800 30px ${FONT_D}`; c.fillStyle = 'rgba(255,255,255,0.4)';
        try { c.letterSpacing = '6px'; } catch (_) {}
        c.fillText('MIRVEL HUB', brandAt[0], brandAt[1]);
        try { c.letterSpacing = '0px'; } catch (_) {}
        return cv;
    }

    /* ---------- Настройки (запоминаются в браузере) ---------- */
    const LS_OPTS = 'mirvel_share_opts';
    const DEF = {
        format: 'story', order: 'best', seed: 1, grid: 'auto', gap: 'normal', round: 'soft',
        bg: 'cover', blur: { cover: 60, photo: 0 }, dim: 70, bgColor: '#0b0b14', accent: '',
        titles: false, rating: true, platformChip: true, completed: true, withCover: false, minRating: 0,
        stats: true, price: false, name: true, title: '', caption: ''
    };
    const ENUM = {
        format: Object.keys(FORMATS), order: ['best', 'recent', 'alpha', 'price', 'random'],
        grid: ['auto', '3', '4', '5', '6', '7', '8', '10', '12', 'all'],
        gap: ['tight', 'normal', 'wide'], round: ['sq', 'soft', 'round', 'circle'], bg: ['cover', 'photo', 'grad', 'solid']
    };
    const clone = v => JSON.parse(JSON.stringify(v));
    const opt = Object.assign(clone(DEF), { key: 'vinyls', platform: '', status: '' });
    (function loadOpts() {
        try {
            const s = JSON.parse(localStorage.getItem(LS_OPTS) || 'null');
            if (!s || typeof s !== 'object') return;
            for (const k of Object.keys(DEF)) {
                if (!(k in s)) continue;
                if (k === 'blur') {
                    if (s.blur && typeof s.blur === 'object') opt.blur = { cover: clamp(num(s.blur.cover), 0, 100), photo: clamp(num(s.blur.photo), 0, 100) };
                } else if (typeof s[k] === typeof DEF[k] && (!ENUM[k] || ENUM[k].includes(s[k]))) opt[k] = s[k];
            }
            opt.dim = clamp(num(opt.dim), 0, 95);
            if (!/^#[0-9a-f]{6}$/i.test(opt.bgColor)) opt.bgColor = DEF.bgColor;
            if (opt.accent && !/^#[0-9a-f]{6}$/i.test(opt.accent)) opt.accent = '';
            opt.title = String(opt.title).slice(0, 24); opt.caption = String(opt.caption).slice(0, 40);
        } catch (_) {}
    })();
    function saveOpts() {
        try { const o = {}; for (const k of Object.keys(DEF)) o[k] = opt[k]; localStorage.setItem(LS_OPTS, JSON.stringify(o)); } catch (_) {}
    }

    /* ---------- Данные для карточки ---------- */
    const STATUS_LABEL = { backlog: 'В планах', playing: 'В процессе', completed: 'Пройдено', online: 'Онлайн-игра', sandbox: 'Песочница', dropped: 'Заброшено', skipped: 'Не в планах', app: 'Приложение' };

    function filtered() {
        let list = (data[opt.key] || []).slice();
        if (opt.key === 'games') {
            if (opt.platform) list = list.filter(g => (g.platform || '') === opt.platform);
            if (opt.status) list = list.filter(g => (g.status || '') === opt.status);
        }
        if (opt.minRating > 0) list = list.filter(i => num(i.rating) >= opt.minRating);
        if (opt.withCover) list = list.filter(i => safeImg(i.img));
        return list;
    }
    function prng(seed) {
        let a = seed >>> 0;
        return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    }
    function ordered(list) {
        const hasImg = i => (safeImg(i.img) ? 1 : 0);
        const byTitle = (a, b) => String(a.title || '').localeCompare(String(b.title || ''), locale());
        const sorters = {
            best: (a, b) => num(b.rating) - num(a.rating) || hasImg(b) - hasImg(a) || num(b.id) - num(a.id),
            recent: (a, b) => num(b.id) - num(a.id),
            alpha: byTitle,
            price: (a, b) => num(b.price) - num(a.price) || byTitle(a, b)
        };
        if (opt.order === 'random') {
            const r = prng(opt.seed * 7919 + 13);
            for (let i = list.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [list[i], list[j]] = [list[j], list[i]]; }
            return list;
        }
        return list.sort(sorters[opt.order] || sorters.best);
    }

    function describe() {
        const all = filtered(), t = T[lang()], isGames = opt.key === 'games';
        const sorted = ordered(all.slice());
        const cap = opt.grid === 'auto' ? 49 : opt.grid === 'all' ? 300 : Number(opt.grid) ** 2;
        const shown = sorted.slice(0, cap);
        const rated = all.filter(i => num(i.rating) > 0);
        const spent = all.reduce((s, i) => s + num(i.price), 0);
        const stats = [{ v: String(all.length), l: plural(all.length, isGames ? t.games : t.releases) }];
        if (isGames) {
            const done = all.filter(g => g.status === 'completed').length;
            if (done) stats.push({ v: String(done), l: t.done, color: '#34d399' });
            const plats = new Set(all.map(g => lc(g.platform)).filter(Boolean)).size;
            if (!opt.platform && plats > 1) stats.push({ key: 'platforms', v: String(plats), l: plural(plats, t.platforms), color: '#c4b5fd' });
        } else {
            const artists = new Set(all.map(i => lc(i.artist)).filter(Boolean)).size;
            if (artists) stats.push({ v: String(artists), l: plural(artists, t.artists) });
        }
        if (rated.length) stats.push({ v: `${(rated.reduce((s, i) => s + num(i.rating), 0) / rated.length).toFixed(1)} ★`, l: t.avg, color: '#facc15' });
        if (opt.price && spent > 0) stats.push({ v: `${Math.round(spent).toLocaleString(locale())} ₴`, l: t.spent, color: '#22d3ee' });
        if (stats.length > 4) { const i = stats.findIndex(s => s.key === 'platforms'); if (i >= 0) stats.splice(i, 1); }

        const subParts = [];
        if (isGames && opt.platform) subParts.push(opt.platform);
        if (isGames && opt.status) subParts.push(tr(STATUS_LABEL[opt.status] || opt.status));
        if (opt.caption.trim()) subParts.push(opt.caption.trim());
        if (opt.name) { const n = String(data.name || '').trim(); if (n) subParts.push(n); }
        return {
            kind: KINDS[opt.key], icon: KINDS[opt.key].icon, isGames, format: opt.format,
            items: shown, hidden: Math.max(0, sorted.length - shown.length),
            stats: opt.stats ? stats : [], sub: subParts.join(' · '),
            order: opt.order, gap: opt.gap, round: opt.round, bg: opt.bg, blur: opt.blur, dim: opt.dim, bgColor: opt.bgColor, accent: opt.accent,
            titles: opt.titles, rating: opt.rating, platformChip: opt.platformChip, completed: opt.completed, title: opt.title
        };
    }

    /* ---------- Окно предпросмотра ---------- */
    let modal = null, url = null, blob = null, token = 0, timer = null;

    const seg = (id, rows) => `<div class="hx-seg flex-wrap" id="${id}">${rows.map(([k, l]) => `<button type="button" data-v="${k}">${l}</button>`).join('')}</div>`;
    const chk = (id, label, cls = '') => `<label class="flex items-center gap-2 text-sm text-gray-300 cursor-pointer ${cls}"><input type="checkbox" id="${id}" class="accent-purple-500"> ${label}</label>`;
    const LBL = 'text-[10px] uppercase font-black tracking-widest text-gray-500 mb-2';
    const SEL = 'w-full bg-white/5 p-2.5 rounded-xl border border-white/10 text-white text-sm';
    const BTN = 'bg-white/5 border border-white/10 hover:bg-white/10 text-white px-3 py-2 rounded-xl text-sm font-bold transition-all';

    const SEGS = { 'sc-format': 'format', 'sc-order': 'order', 'sc-grid': 'grid', 'sc-bg': 'bg', 'sc-round': 'round', 'sc-gap': 'gap' };
    const CHKS = { 'sc-titles': 'titles', 'sc-rating': 'rating', 'sc-chip': 'platformChip', 'sc-done': 'completed', 'sc-cover': 'withCover', 'sc-stats': 'stats', 'sc-name': 'name', 'sc-price': 'price' };
    const TXTS = { 'sc-title': 'title', 'sc-caption': 'caption' };

    function ensureModal() {
        if (modal) return modal;
        modal = document.createElement('div');
        modal.id = 'share-collection-modal';
        modal.className = 'hidden fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[70] p-4';
        modal.setAttribute('role', 'dialog'); modal.setAttribute('aria-modal', 'true');
        modal.innerHTML = `
            <div class="glass no-hover w-full max-w-5xl rounded-3xl p-5 sm:p-6 max-h-[96vh] overflow-y-auto">
                <div class="flex items-center justify-between gap-3 mb-4">
                    <h3 class="text-lg font-black">Картинка для истории и рабочего стола</h3>
                    <button type="button" class="text-gray-400 hover:text-white px-2 py-1" onclick="closeModal('share-collection-modal')" aria-label="Закрыть">✕</button>
                </div>
                <div class="flex flex-col sm:flex-row gap-5">
                    <div id="sc-prev" class="shrink-0 mx-auto w-full" style="max-width:300px">
                        <img id="sc-img" alt="" class="w-full rounded-2xl border border-white/10 transition-opacity" style="aspect-ratio:9/16; object-fit:contain; background:#05050a">
                    </div>
                    <div class="flex-1 min-w-0 space-y-4">
                        ${seg('sc-tabs', [['main', 'Основное'], ['bg', 'Фон'], ['tiles', 'Плитки'], ['text', 'Текст']])}

                        <div data-panel="main" class="space-y-4">
                            <div><p class="${LBL}">Формат</p>${seg('sc-format', [['story', '📱 Телефон 1080×1920'], ['wide', '🖥 ПК 1920×1080']])}</div>
                            <div><p class="${LBL}">Порядок</p>${seg('sc-order', [['best', 'Лучшие по оценке'], ['recent', 'Недавно добавленные'], ['alpha', 'По алфавиту'], ['price', 'Сначала дорогие'], ['random', '🎲 Случайно']])}</div>
                            <div><p class="${LBL}">Сколько обложек (сетка)</p>${seg('sc-grid', [['auto', 'Авто'], ['3', '3×3'], ['4', '4×4'], ['5', '5×5'], ['6', '6×6'], ['7', '7×7'], ['8', '8×8'], ['10', '10×10'], ['12', '12×12'], ['all', 'Все']])}</div>
                            <div id="sc-games" class="sc-only-games grid grid-cols-2 gap-3 hidden">
                                <div><p class="${LBL}">Платформа</p><select id="sc-platform" class="${SEL}"></select></div>
                                <div><p class="${LBL}">Статус</p><select id="sc-status" class="${SEL}"></select></div>
                            </div>
                            <div class="grid grid-cols-2 gap-3 items-end">
                                <div><p class="${LBL}">Оценка</p><select id="sc-minrating" class="${SEL}"><option value="0">Любая</option><option value="3">★ 3 и выше</option><option value="4">★ 4 и выше</option><option value="5">Только ★ 5</option></select></div>
                                ${chk('sc-cover', 'Только с обложками', 'pb-2.5')}
                            </div>
                        </div>

                        <div data-panel="bg" class="space-y-4 hidden">
                            <div><p class="${LBL}">Фон</p>${seg('sc-bg', [['cover', 'Размытая обложка'], ['photo', '🖼 Своё фото'], ['grad', 'Градиент'], ['solid', 'Цвет']])}</div>
                            <div id="sc-photo-box" class="space-y-2 hidden">
                                <div class="flex flex-wrap gap-2">
                                    <button type="button" id="sc-photo-pick" class="${BTN}">📁 Выбрать фото</button>
                                    <button type="button" id="sc-photo-del" class="${BTN} hidden">✕ Убрать</button>
                                    <input type="file" id="sc-photo-file" accept="image/*" class="hidden">
                                </div>
                                <p class="text-[11px] text-gray-500">Фото хранится только в этом браузере и не сжимается. Для чёткого фона лучше крупное (от 1920 px).</p>
                            </div>
                            <div id="sc-blur-box"><p class="${LBL}">Размытие: <span id="sc-blur-v"></span></p><input type="range" id="sc-blur" min="0" max="100" class="w-full accent-purple-500"></div>
                            <div><p class="${LBL}">Затемнение: <span id="sc-dim-v"></span></p><input type="range" id="sc-dim" min="0" max="95" class="w-full accent-purple-500"></div>
                            <div id="sc-color-box" class="hidden"><p class="${LBL}">Цвет фона</p><input type="color" id="sc-bgcolor" class="w-14 h-10 rounded-lg bg-transparent border border-white/10 cursor-pointer"></div>
                            <div><p class="${LBL}">Акцентный цвет</p>
                                <div class="flex items-center gap-2"><input type="color" id="sc-accent" class="w-14 h-10 rounded-lg bg-transparent border border-white/10 cursor-pointer"><button type="button" id="sc-accent-reset" class="${BTN}">Как в теме</button></div>
                            </div>
                        </div>

                        <div data-panel="tiles" class="space-y-4 hidden">
                            <div><p class="${LBL}">Форма плиток</p>${seg('sc-round', [['sq', 'Квадрат'], ['soft', 'Мягкие'], ['round', 'Круглые'], ['circle', 'Круг']])}</div>
                            <div><p class="${LBL}">Расстояние</p>${seg('sc-gap', [['tight', 'Плотно'], ['normal', 'Обычное'], ['wide', 'Свободно']])}</div>
                            <div class="space-y-2">
                                ${chk('sc-titles', 'Названия на плитках')}
                                ${chk('sc-rating', 'Оценка ★ на плитках')}
                                ${chk('sc-chip', 'Платформа на плитках (игры)', 'sc-only-games hidden')}
                                ${chk('sc-done', 'Отметка ✓ у пройденных (игры)', 'sc-only-games hidden')}
                            </div>
                            <p class="text-[11px] text-gray-500">Значки и названия появляются только на достаточно крупных плитках — на мелких мозаиках они не нужны.</p>
                        </div>

                        <div data-panel="text" class="space-y-4 hidden">
                            <div><p class="${LBL}">Свой заголовок</p><input type="text" id="sc-title" maxlength="24" placeholder="по умолчанию — название раздела" class="${SEL}"></div>
                            <div><p class="${LBL}">Своя подпись</p><input type="text" id="sc-caption" maxlength="40" placeholder="например: топ 2026" class="${SEL}"></div>
                            <div class="space-y-2">
                                ${chk('sc-stats', 'Показать панель с цифрами')}
                                ${chk('sc-name', 'Показать моё имя')}
                                ${chk('sc-price', 'Показать сумму трат')}
                            </div>
                        </div>

                        <div class="flex gap-2 pt-1">
                            <button type="button" id="sc-save" class="flex-1 bg-purple-600 hover:bg-purple-500 py-3 rounded-xl font-bold text-white btn-neon">⬇ Скачать PNG</button>
                            <button type="button" id="sc-send" class="hidden flex-1 bg-white/10 hover:bg-white/15 py-3 rounded-xl font-bold">📤 Поделиться</button>
                            <button type="button" id="sc-reset" class="${BTN}" title="Сбросить настройки картинки">↺</button>
                        </div>
                    </div>
                </div>
            </div>`;
        document.body.appendChild(modal);

        $('sc-tabs').addEventListener('click', e => {
            const b = e.target.closest('[data-v]'); if (!b) return;
            $('sc-tabs').querySelectorAll('[data-v]').forEach(x => x.classList.toggle('is-on', x === b));
            modal.querySelectorAll('[data-panel]').forEach(p => p.classList.toggle('hidden', p.dataset.panel !== b.dataset.v));
        });
        $('sc-tabs').querySelector('[data-v="main"]').classList.add('is-on');

        Object.keys(SEGS).forEach(id => $(id).addEventListener('click', e => {
            const b = e.target.closest('[data-v]'); if (!b) return;
            const k = SEGS[id];
            if (k === 'order' && b.dataset.v === 'random' && opt.order === 'random') opt.seed++;     // повторное нажатие — перемешать заново
            opt[k] = b.dataset.v; saveOpts(); syncControls(); refresh();
        }));
        Object.keys(CHKS).forEach(id => $(id).addEventListener('change', e => { opt[CHKS[id]] = e.target.checked; saveOpts(); refresh(); }));
        Object.keys(TXTS).forEach(id => $(id).addEventListener('input', e => { opt[TXTS[id]] = e.target.value; saveOpts(); refresh(); }));
        $('sc-platform').addEventListener('change', e => { opt.platform = e.target.value; refresh(); });
        $('sc-status').addEventListener('change', e => { opt.status = e.target.value; refresh(); });
        $('sc-minrating').addEventListener('change', e => { opt.minRating = Number(e.target.value) || 0; saveOpts(); refresh(); });
        $('sc-blur').addEventListener('input', e => { opt.blur[opt.bg === 'photo' && photo.img ? 'photo' : 'cover'] = Number(e.target.value); $('sc-blur-v').textContent = e.target.value; saveOpts(); refresh(); });
        $('sc-dim').addEventListener('input', e => { opt.dim = Number(e.target.value); $('sc-dim-v').textContent = e.target.value + '%'; saveOpts(); refresh(); });
        $('sc-bgcolor').addEventListener('input', e => { opt.bgColor = e.target.value; saveOpts(); refresh(); });
        $('sc-accent').addEventListener('input', e => { opt.accent = e.target.value; saveOpts(); refresh(); });
        $('sc-accent-reset').addEventListener('click', () => { opt.accent = ''; saveOpts(); syncControls(); refresh(); });

        $('sc-photo-pick').addEventListener('click', () => $('sc-photo-file').click());
        $('sc-photo-file').addEventListener('change', async e => {
            const f = e.target.files && e.target.files[0]; e.target.value = '';
            if (!f) return;
            if (!/^image\//i.test(f.type)) { showToast('Нужна картинка (JPG, PNG, WebP)', 'error'); return; }
            if (!(await setPhoto(f))) { showToast('Не удалось открыть это фото', 'error'); return; }
            await bgPut(f);
            photoReady = Promise.resolve();
            opt.bg = 'photo'; saveOpts(); syncControls(); refresh();
        });
        $('sc-photo-del').addEventListener('click', async () => {
            if (photo.url) URL.revokeObjectURL(photo.url);
            photo.img = null; photo.url = null;
            await bgPut(null);
            if (opt.bg === 'photo') opt.bg = 'cover';
            saveOpts(); syncControls(); refresh();
        });

        $('sc-reset').addEventListener('click', () => { Object.assign(opt, clone(DEF)); saveOpts(); syncControls(); refresh(); });
        $('sc-save').onclick = () => {
            if (!blob) return;
            const a = document.createElement('a'); a.href = url; a.download = `mirvel-${opt.key}-${opt.format}.png`;
            document.body.appendChild(a); a.click(); a.remove();
        };
        $('sc-send').onclick = async () => {
            if (!blob) return;
            try { await navigator.share({ files: [new File([blob], `mirvel-${opt.key}-${opt.format}.png`, { type: 'image/png' })] }); }
            catch (e) { if (e && e.name !== 'AbortError') showToast('Не удалось поделиться — скачайте картинку', 'error'); }
        };
        modal.addEventListener('mousedown', e => { if (e.target === modal) closeModal('share-collection-modal'); });
        document.addEventListener('keydown', e => { if (e.key === 'Escape' && !modal.classList.contains('hidden')) closeModal('share-collection-modal'); });
        new MutationObserver(() => {
            if (modal.classList.contains('hidden')) token++;
            if (modal.classList.contains('hidden') && url) { URL.revokeObjectURL(url); url = null; blob = null; $('sc-img').removeAttribute('src'); }
        }).observe(modal, { attributes: true, attributeFilter: ['class'] });
        return modal;
    }

    function syncControls() {
        if (!modal) return;
        Object.keys(SEGS).forEach(id => $(id).querySelectorAll('[data-v]').forEach(b => b.classList.toggle('is-on', b.dataset.v === opt[SEGS[id]])));
        Object.keys(CHKS).forEach(id => { $(id).checked = !!opt[CHKS[id]]; });
        Object.keys(TXTS).forEach(id => { if ($(id).value !== opt[TXTS[id]]) $(id).value = opt[TXTS[id]]; });
        $('sc-minrating').value = String(opt.minRating);
        const bk = opt.bg === 'photo' && photo.img ? 'photo' : 'cover';
        $('sc-blur').value = opt.blur[bk]; $('sc-blur-v').textContent = opt.blur[bk];
        $('sc-dim').value = opt.dim; $('sc-dim-v').textContent = opt.dim + '%';
        $('sc-bgcolor').value = opt.bgColor;
        let themeRgb = '139, 92, 246';
        try { themeRgb = (getComputedStyle(document.body).getPropertyValue('--theme-rgb') || themeRgb).trim() || themeRgb; } catch (_) {}
        $('sc-accent').value = opt.accent || rgbToHex(themeRgb);
        $('sc-photo-box').classList.toggle('hidden', opt.bg !== 'photo');
        $('sc-photo-del').classList.toggle('hidden', !photo.img);
        $('sc-blur-box').classList.toggle('hidden', opt.bg !== 'cover' && opt.bg !== 'photo');
        $('sc-color-box').classList.toggle('hidden', opt.bg !== 'solid');
        const wide = opt.format === 'wide';
        $('sc-prev').style.maxWidth = wide ? '480px' : '300px';
        $('sc-img').style.aspectRatio = wide ? '16/9' : '9/16';
    }

    function fillGameFilters() {
        const isGames = opt.key === 'games';
        modal.querySelectorAll('.sc-only-games').forEach(el => el.classList.toggle('hidden', !isGames));
        if (!isGames) return;
        const games = data.games || [];
        const plats = [...new Set(games.map(g => g.platform).filter(Boolean))].sort((a, b) => a.localeCompare(b, locale()));
        const sts = Object.keys(STATUS_LABEL).filter(k => games.some(g => g.status === k));
        if (opt.platform && !plats.includes(opt.platform)) opt.platform = '';
        if (opt.status && !sts.includes(opt.status)) opt.status = '';
        const optH = (v, l, cur) => `<option value="${esc(v)}"${v === cur ? ' selected' : ''}>${esc(l)}</option>`;
        $('sc-platform').innerHTML = optH('', 'Все платформы', opt.platform) + plats.map(p => optH(p, p, opt.platform)).join('');
        $('sc-status').innerHTML = optH('', 'Любой статус', opt.status) + sts.map(k => optH(k, STATUS_LABEL[k], opt.status)).join('');
    }

    function refresh() {
        clearTimeout(timer);
        timer = setTimeout(render, 110);
    }
    async function render() {
        const my = ++token;
        const img = $('sc-img');
        img.style.opacity = '0.45';
        try {
            const cv = await build(describe());
            const b = await new Promise(res => cv.toBlob(res, 'image/png'));
            if (!b) throw new Error('toBlob');
            if (my !== token || modal.classList.contains('hidden')) return;     // выбрали другую версию или окно уже закрыли
            if (url) URL.revokeObjectURL(url);
            blob = b; url = URL.createObjectURL(b);
            img.src = url;
            const canSend = !!(navigator.canShare && navigator.canShare({ files: [new File([b], 'x.png', { type: 'image/png' })] }));
            $('sc-send').classList.toggle('hidden', !canSend);
        } catch (e) {
            console.warn('[MIRVEL] share collection:', e);
            showToast('Не удалось собрать карточку', 'error');
        } finally { if (my === token) img.style.opacity = '1'; }
    }

    function open(key) {
        if (!KINDS[key]) return;
        if (!(data[key] || []).length) { showToast('В коллекции пока пусто'); return; }
        if (opt.key !== key) { opt.platform = ''; opt.status = ''; }
        opt.key = key;
        ensureModal();
        fillGameFilters();
        syncControls();
        modal.classList.remove('hidden');
        ensurePhoto();
        render();
    }
    window.shareCollection = open;

    /* ---------- Кнопка «Поделиться» в шапках страниц ---------- */
    function addButtons() {
        ['cds', 'vinyls', 'games'].forEach(key => {
            const bar = document.querySelector(`#${key} > div:first-child > div:last-child`);
            if (!bar || bar.querySelector('[data-share-col]')) return;
            const b = document.createElement('button');
            b.type = 'button';
            b.dataset.shareCol = key;
            b.className = 'bg-white/5 border border-white/10 hover:bg-white/10 text-white p-3 rounded-xl text-sm font-bold transition-all';
            b.title = 'Картинка для истории и рабочего стола';
            b.textContent = '📤 Поделиться';
            b.addEventListener('click', () => open(key));
            bar.insertBefore(b, bar.firstChild);
        });
    }

    const renderBase = renderAll;
    renderAll = function () { renderBase(); addButtons(); };
    addButtons();
    updateUI();
})();
