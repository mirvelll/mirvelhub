/* =========================================================
   MIRVEL HUB — 24-share-collection.js (подключать последним, после 23-sounds.js)
   «📤 Поделиться» на страницах CD / Винил / Игры: картинка 1080×1920 для истории
   с мозаикой обложек всей коллекции и её цифрами.

   В окне предпросмотра можно выбрать:
   • порядок: лучшие по оценке / недавно добавленные / по алфавиту
   • размер сетки: авто, 3×3, 4×4, 5×5, 6×6
   • для игр — платформу и статус (например, только «PS5» или только «Пройдено»)
   • показывать ли сумму трат и своё имя (сумма по умолчанию выключена)
   Картинка пересобирается сразу при каждом изменении.

   Доступно: window.shareCollection('cds' | 'vinyls' | 'games')
   ========================================================= */
(() => {
    'use strict';
    const W = 1080, H = 1920;
    const $ = id => document.getElementById(id);
    const FONT_D = "'Unbounded', 'Inter', system-ui, sans-serif";
    const FONT_U = "'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif";
    const LANGS = ['ru', 'en', 'uk'];
    const lang = () => { try { return LANGS.includes(data.lang) ? data.lang : 'ru'; } catch (_) { return 'ru'; } };
    const locale = () => ({ ru: 'ru-RU', en: 'en-US', uk: 'uk-UA' })[lang()];
    const num = v => Number(v) || 0;
    const lc = s => String(s || '').trim().toLowerCase();

    /* ---------- Тексты на самой картинке ---------- */
    const KINDS = {
        cds:    { icon: '💿', title: { ru: 'CD', en: 'CD', uk: 'CD' } },
        vinyls: { icon: '💽', title: { ru: 'ВИНИЛ', en: 'VINYL', uk: 'ВІНІЛ' } },
        games:  { icon: '🎮', title: { ru: 'ИГРЫ', en: 'GAMES', uk: 'ІГРИ' } }
    };
    const T = {
        ru: { label: 'МОЯ КОЛЛЕКЦИЯ', more: n => `и ещё ${n}`, done: 'пройдено', avg: 'средняя оценка', spent: 'потрачено',
              releases: ['релиз', 'релиза', 'релизов'], artists: ['исполнитель', 'исполнителя', 'исполнителей'], games: ['игра', 'игры', 'игр'] },
        en: { label: 'MY COLLECTION', more: n => `and ${n} more`, done: 'completed', avg: 'avg. rating', spent: 'spent',
              releases: ['release', 'releases', 'releases'], artists: ['artist', 'artists', 'artists'], games: ['game', 'games', 'games'] },
        uk: { label: 'МОЯ КОЛЕКЦІЯ', more: n => `і ще ${n}`, done: 'пройдено', avg: 'середня оцінка', spent: 'витрачено',
              releases: ['реліз', 'релізи', 'релізів'], artists: ['виконавець', 'виконавці', 'виконавців'], games: ['гра', 'гри', 'ігор'] }
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

    /* ---------- Рисование ---------- */
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
        if (imgCache.size > 120) imgCache.clear();
        imgCache.set(src, p);
        return p;
    }
    function rrect(c, x, y, w, h, r) {
        c.beginPath(); c.moveTo(x + r, y);
        c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
        c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
    }
    function drawCover(c, im, x, y, w, h) {
        const s = Math.max(w / im.width, h / im.height), dw = im.width * s, dh = im.height * s;
        c.drawImage(im, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
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

    const autoCols = n => Math.max(1, Math.min(6, Math.ceil(Math.sqrt(n))));

    function drawTile(c, item, im, x, y, s, o) {
        const r = Math.round(s * 0.07);
        c.save();
        c.shadowColor = 'rgba(0,0,0,0.5)'; c.shadowBlur = Math.max(8, s * 0.09); c.shadowOffsetY = Math.max(3, s * 0.03);
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
            const fs = Math.max(13, Math.round(s * 0.105));
            c.font = `800 ${fs}px ${FONT_U}`; c.fillStyle = 'rgba(255,255,255,0.92)';
            const lines = wrap(c, item.title || '', s - s * 0.16, s >= 200 ? 3 : 4);
            const lh = fs * 1.2, top = ty - ((lines.length - 1) * lh) / 2;
            lines.forEach((ln, i) => c.fillText(ln, x + s / 2, top + i * lh));
        }
        c.restore();
        rrect(c, x, y, s, s, r); c.lineWidth = 2; c.strokeStyle = 'rgba(255,255,255,0.14)'; c.stroke();

        /* оценка — маленьким значком (только на крупных плитках) */
        if (s >= 215 && num(item.rating) > 0) {
            const fs = Math.round(s * 0.095), txt = `★ ${Math.min(5, num(item.rating))}`;
            c.font = `800 ${fs}px ${FONT_U}`; c.textAlign = 'left'; c.textBaseline = 'middle';
            const w = c.measureText(txt).width + fs * 1.1, h = fs * 1.7, bx = x + s * 0.05, by = y + s - h - s * 0.05;
            rrect(c, bx, by, w, h, h / 2); c.fillStyle = 'rgba(0,0,0,0.72)'; c.fill();
            c.fillStyle = '#facc15'; c.fillText(txt, bx + fs * 0.55, by + h / 2 + 1);
        }
        c.textBaseline = 'alphabetic';
    }

    async function build(o) {
        try { await Promise.race([Promise.all([`800 80px Unbounded`, `700 40px Inter`].map(f => document.fonts.load(f, 'Аa').catch(() => {}))), new Promise(r => setTimeout(r, 1200))]); } catch (_) {}
        const t = T[lang()];
        const rgb = (getComputedStyle(document.body).getPropertyValue('--theme-rgb') || '139, 92, 246').trim();
        const imgs = await Promise.all(o.items.map(i => loadImg(safeImg(i.img))));

        const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
        const c = cv.getContext('2d');
        c.imageSmoothingQuality = 'high';

        /* фон: размытая обложка (грубое уменьшение → мягкие цветовые пятна) или градиент темы */
        c.fillStyle = '#05050a'; c.fillRect(0, 0, W, H);
        const bg = imgs.find(Boolean);
        if (bg) {
            const tiny = document.createElement('canvas'); tiny.width = 18; tiny.height = 32;
            tiny.getContext('2d').drawImage(bg, 0, 0, 18, 32);
            const mid = document.createElement('canvas'); mid.width = 90; mid.height = 160;
            const mc = mid.getContext('2d'); mc.imageSmoothingQuality = 'high'; mc.drawImage(tiny, 0, 0, 90, 160);
            c.drawImage(mid, 0, 0, W, H);
        } else {
            const g = c.createLinearGradient(0, 0, W, H);
            g.addColorStop(0, `rgba(${rgb}, 0.55)`); g.addColorStop(1, 'rgba(6, 182, 212, 0.35)');
            c.fillStyle = g; c.fillRect(0, 0, W, H);
        }
        const shade = c.createLinearGradient(0, 0, 0, H);
        shade.addColorStop(0, 'rgba(3,3,7,0.6)'); shade.addColorStop(0.5, 'rgba(3,3,7,0.7)'); shade.addColorStop(1, 'rgba(3,3,7,0.92)');
        c.fillStyle = shade; c.fillRect(0, 0, W, H);
        const glow = c.createRadialGradient(W / 2, 420, 60, W / 2, 420, 700);
        glow.addColorStop(0, `rgba(${rgb}, 0.3)`); glow.addColorStop(1, `rgba(${rgb}, 0)`);
        c.fillStyle = glow; c.fillRect(0, 0, W, H);

        /* заголовок */
        c.textAlign = 'center'; c.textBaseline = 'alphabetic';
        try { c.letterSpacing = '8px'; } catch (_) {}
        c.font = `800 28px ${FONT_U}`; c.fillStyle = 'rgba(255,255,255,0.55)';
        c.fillText(t.label, W / 2, 138);
        try { c.letterSpacing = '0px'; } catch (_) {}

        const title = `${o.kind.icon} ${o.kind.title[lang()]}`;
        fit(c, title, 800, FONT_D, 124, 60, 940);
        c.fillStyle = '#fff'; c.fillText(title, W / 2, 285);

        let y = 285;
        if (o.sub) {
            y += 70; fit(c, o.sub, 700, FONT_U, 44, 26, 900);
            c.fillStyle = '#c4b5fd'; c.fillText(o.sub, W / 2, y);
        }

        /* панель с цифрами */
        const py = y + 56, ph = 176;
        if (o.stats.length) {
            rrect(c, 60, py, W - 120, ph, 40);
            c.fillStyle = 'rgba(255,255,255,0.07)'; c.fill();
            c.lineWidth = 2; c.strokeStyle = 'rgba(255,255,255,0.14)'; c.stroke();
            const cw = (W - 120) / o.stats.length;
            o.stats.forEach((s, i) => {
                const cx = 60 + cw * i + cw / 2;
                if (i) { c.beginPath(); c.moveTo(60 + cw * i, py + 36); c.lineTo(60 + cw * i, py + ph - 36); c.strokeStyle = 'rgba(255,255,255,0.12)'; c.lineWidth = 2; c.stroke(); }
                fit(c, s.v, 800, FONT_D, 74, 28, cw - 36);
                c.fillStyle = s.color || '#fff'; c.fillText(s.v, cx, py + 92);
                fit(c, s.l, 600, FONT_U, 28, 18, cw - 28);
                c.fillStyle = 'rgba(255,255,255,0.6)'; c.fillText(s.l, cx, py + 138);
            });
        }

        /* мозаика обложек */
        const gridTop = (o.stats.length ? py + ph : y) + 56;
        const AREA = 960, gap = [0, 24, 24, 20, 16, 12, 10][o.cols] || 12;
        const cell = Math.floor((AREA - gap * (o.cols - 1)) / o.cols);
        const rows = Math.ceil(o.items.length / o.cols);
        const gridH = rows * cell + Math.max(0, rows - 1) * gap;
        const gy = gridTop + Math.max(0, (AREA - gridH) / 2);
        if (!o.items.length) {      // фильтр игр ничего не нашёл (например, платформа + статус без совпадений)
            c.textAlign = 'center'; c.font = `700 40px ${FONT_U}`; c.fillStyle = 'rgba(255,255,255,0.5)';
            c.fillText('—', W / 2, gridTop + AREA / 2);
        }
        o.items.forEach((item, i) => {
            const r = Math.floor(i / o.cols), col = i % o.cols;
            const inRow = r === rows - 1 ? o.items.length - r * o.cols : o.cols;
            const rowW = inRow * cell + (inRow - 1) * gap;
            drawTile(c, item, imgs[i], (W - rowW) / 2 + col * (cell + gap), gy + r * (cell + gap), cell, o);
        });

        if (o.hidden > 0) {
            c.textAlign = 'center'; c.font = `700 34px ${FONT_U}`; c.fillStyle = 'rgba(255,255,255,0.7)';
            c.fillText(t.more(o.hidden), W / 2, Math.min(H - 150, gridTop + AREA + 70));
        }

        /* подпись */
        c.font = `800 30px ${FONT_D}`; c.fillStyle = 'rgba(255,255,255,0.4)'; c.textAlign = 'center';
        try { c.letterSpacing = '6px'; } catch (_) {}
        c.fillText('MIRVEL HUB', W / 2, H - 70);
        try { c.letterSpacing = '0px'; } catch (_) {}
        return cv;
    }

    /* ---------- Данные для карточки ---------- */
    const opt = { key: 'vinyls', order: 'best', grid: 'auto', platform: '', status: '', price: false, name: true };
    const STATUS_LABEL = { backlog: 'В планах', playing: 'В процессе', completed: 'Пройдено', online: 'Онлайн-игра', sandbox: 'Песочница', dropped: 'Заброшено', skipped: 'Не в планах', app: 'Приложение' };

    function filtered() {
        let list = (data[opt.key] || []).slice();
        if (opt.key === 'games') {
            if (opt.platform) list = list.filter(g => (g.platform || '') === opt.platform);
            if (opt.status) list = list.filter(g => (g.status || '') === opt.status);
        }
        return list;
    }
    function ordered(list) {
        const hasImg = i => (safeImg(i.img) ? 1 : 0);
        const byTitle = (a, b) => String(a.title || '').localeCompare(String(b.title || ''), locale());
        const sorters = {
            best: (a, b) => num(b.rating) - num(a.rating) || hasImg(b) - hasImg(a) || num(b.id) - num(a.id),
            recent: (a, b) => num(b.id) - num(a.id),
            alpha: byTitle
        };
        return list.sort(sorters[opt.order] || sorters.best);
    }

    function describe() {
        const all = filtered(), t = T[lang()], isGames = opt.key === 'games';
        const sorted = ordered(all.slice());
        const cols = opt.grid === 'auto' ? autoCols(sorted.length) : Math.min(Number(opt.grid), autoCols(sorted.length));   // вручную можно только уменьшить: у маленькой коллекции не бывает пустых клеток
        const shown = sorted.slice(0, cols * cols);
        const rated = all.filter(i => num(i.rating) > 0);
        const spent = all.reduce((s, i) => s + num(i.price), 0);
        const stats = [{ v: String(all.length), l: plural(all.length, isGames ? t.games : t.releases) }];
        if (isGames) {
            const done = all.filter(g => g.status === 'completed').length;
            if (done) stats.push({ v: String(done), l: t.done, color: '#34d399' });
        } else {
            const artists = new Set(all.map(i => lc(i.artist)).filter(Boolean)).size;
            if (artists) stats.push({ v: String(artists), l: plural(artists, t.artists) });
        }
        if (rated.length) stats.push({ v: `${(rated.reduce((s, i) => s + num(i.rating), 0) / rated.length).toFixed(1)} ★`, l: t.avg, color: '#facc15' });
        if (opt.price && spent > 0) stats.push({ v: `${Math.round(spent).toLocaleString(locale())} ₴`, l: t.spent, color: '#22d3ee' });

        const subParts = [];
        if (isGames && opt.platform) subParts.push(opt.platform);
        if (isGames && opt.status) subParts.push(tr(STATUS_LABEL[opt.status] || opt.status));
        if (opt.name) { const n = String(data.name || '').trim(); if (n) subParts.push(n); }
        return { kind: KINDS[opt.key], icon: KINDS[opt.key].icon, items: shown, hidden: Math.max(0, sorted.length - shown.length), cols, stats, sub: subParts.join(' · ') };
    }

    /* ---------- Окно предпросмотра ---------- */
    let modal = null, url = null, blob = null, token = 0, timer = null;

    const seg = (id, rows) => `<div class="hx-seg flex-wrap" id="${id}">${rows.map(([k, l]) => `<button type="button" data-v="${k}">${l}</button>`).join('')}</div>`;
    const LBL = 'text-[10px] uppercase font-black tracking-widest text-gray-500 mb-2';
    const SEL = 'w-full bg-white/5 p-2.5 rounded-xl border border-white/10 text-white text-sm';

    function ensureModal() {
        if (modal) return modal;
        modal = document.createElement('div');
        modal.id = 'share-collection-modal';
        modal.className = 'hidden fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[70] p-4';
        modal.setAttribute('role', 'dialog'); modal.setAttribute('aria-modal', 'true');
        modal.innerHTML = `
            <div class="glass no-hover w-full max-w-3xl rounded-3xl p-5 sm:p-6 max-h-[96vh] overflow-y-auto">
                <div class="flex items-center justify-between gap-3 mb-4">
                    <h3 class="text-lg font-black">Картинка для истории</h3>
                    <button type="button" class="text-gray-400 hover:text-white px-2 py-1" onclick="closeModal('share-collection-modal')" aria-label="Закрыть">✕</button>
                </div>
                <div class="flex flex-col sm:flex-row gap-5">
                    <div class="sm:w-[300px] shrink-0 mx-auto w-full max-w-[300px]">
                        <img id="sc-img" alt="" class="w-full rounded-2xl border border-white/10 transition-opacity" style="aspect-ratio:9/16; object-fit:contain; background:#05050a">
                    </div>
                    <div class="flex-1 min-w-0 space-y-4">
                        <div><p class="${LBL}">Порядок</p>${seg('sc-order', [['best', 'Лучшие по оценке'], ['recent', 'Недавно добавленные'], ['alpha', 'По алфавиту']])}</div>
                        <div><p class="${LBL}">Размер сетки</p>${seg('sc-grid', [['auto', 'Авто'], ['3', '3×3'], ['4', '4×4'], ['5', '5×5'], ['6', '6×6']])}</div>
                        <div id="sc-games" class="space-y-3 hidden">
                            <div><p class="${LBL}">Платформа</p><select id="sc-platform" class="${SEL}"></select></div>
                            <div><p class="${LBL}">Статус</p><select id="sc-status" class="${SEL}"></select></div>
                        </div>
                        <div class="space-y-2">
                            <label class="flex items-center gap-2 text-sm text-gray-300 cursor-pointer"><input type="checkbox" id="sc-name" class="accent-purple-500"> Показать моё имя</label>
                            <label class="flex items-center gap-2 text-sm text-gray-300 cursor-pointer"><input type="checkbox" id="sc-price" class="accent-purple-500"> Показать сумму трат</label>
                        </div>
                        <div class="flex gap-2 pt-1">
                            <button type="button" id="sc-save" class="flex-1 bg-purple-600 hover:bg-purple-500 py-3 rounded-xl font-bold text-white btn-neon">⬇ Скачать PNG</button>
                            <button type="button" id="sc-send" class="hidden flex-1 bg-white/10 hover:bg-white/15 py-3 rounded-xl font-bold">📤 Поделиться</button>
                        </div>
                    </div>
                </div>
            </div>`;
        document.body.appendChild(modal);

        $('sc-order').addEventListener('click', e => { const b = e.target.closest('[data-v]'); if (b) { opt.order = b.dataset.v; syncControls(); refresh(); } });
        $('sc-grid').addEventListener('click', e => { const b = e.target.closest('[data-v]'); if (b) { opt.grid = b.dataset.v; syncControls(); refresh(); } });
        $('sc-platform').addEventListener('change', e => { opt.platform = e.target.value; refresh(); });
        $('sc-status').addEventListener('change', e => { opt.status = e.target.value; refresh(); });
        $('sc-name').addEventListener('change', e => { opt.name = e.target.checked; refresh(); });
        $('sc-price').addEventListener('change', e => { opt.price = e.target.checked; refresh(); });
        $('sc-save').onclick = () => {
            if (!blob) return;
            const a = document.createElement('a'); a.href = url; a.download = `mirvel-${opt.key}.png`;
            document.body.appendChild(a); a.click(); a.remove();
        };
        $('sc-send').onclick = async () => {
            if (!blob) return;
            try { await navigator.share({ files: [new File([blob], `mirvel-${opt.key}.png`, { type: 'image/png' })] }); }
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
        $('sc-order').querySelectorAll('[data-v]').forEach(b => b.classList.toggle('is-on', b.dataset.v === opt.order));
        $('sc-grid').querySelectorAll('[data-v]').forEach(b => b.classList.toggle('is-on', b.dataset.v === opt.grid));
        $('sc-name').checked = opt.name;
        $('sc-price').checked = opt.price;
    }

    function fillGameFilters() {
        const box = $('sc-games');
        const isGames = opt.key === 'games';
        box.classList.toggle('hidden', !isGames);
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
        timer = setTimeout(render, 90);
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
            b.title = 'Картинка для истории';
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
