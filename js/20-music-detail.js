/* =========================================================
   MIRVEL HUB — 20-music-detail.js (подключать после 19-features.js)
   Страница релиза для CD и винила (клик по карточке):
   • заметки и личное мнение (то же поле note, что раньше открывалось кнопкой 💬 — ничего не потеряется)
   • шаблоны: впечатления, треклист, об издании
   • фото (диск, конверт, буклет…) с галереей — поле photos[]
   • оценка, «Изменить», «Удалить» (с возвратом через «↩ Вернуть» внизу)
   Без статусов, ачивок и комплектности — это только для игр.
   ========================================================= */
(() => {
    const $ = id => document.getElementById(id);
    const KEYS = ['cds', 'vinyls'];
    const NAME = { cds: 'CD', vinyls: 'Винил' };
    const ICON = { cds: '💿', vinyls: '💽' };
    const MAX_PHOTOS = 10;
    const PHOTO_LABELS = ['Обложка', 'Задник', 'Внутри конверта', 'Диск / пластинка', 'Буклет / вкладыш', 'Корешок', 'Чек', 'Другое'];

    let cur = null;            // { key, id } открытого релиза
    let dirty = false;
    let noteTimer = null;
    let lastPhoto = null;      // последнее удалённое фото — можно вернуть
    let pendingReopen = null;  // после «Изменить» → «Сохранить» снова открываем страницу релиза

    const find = (key, id) => (data[key] || []).find(x => x.id === Number(id));
    const current = () => (cur ? find(cur.key, cur.id) : null);
    const photosOf = i => (Array.isArray(i?.photos) ? i.photos : []);
    const imgSrc = s => {
        const v = String(s || '');
        return /^data:image\//i.test(v) ? v : safeUrl(v);
    };

    /** как save(), но сообщает, прошла ли запись (фото могут упереться в лимит памяти) */
    function commit() {
        checkAchievements();
        const ok = persistData();
        updateUI();
        return ok;
    }

    function onHidden(el, fn) {
        new MutationObserver(() => { if (el.classList.contains('hidden')) fn(); })
            .observe(el, { attributes: true, attributeFilter: ['class'] });
    }

    function readFileAsDataURL(file) {
        return new Promise((resolve, reject) => {
            const r = new FileReader();
            r.onload = () => resolve(r.result);
            r.onerror = () => reject(r.error);
            r.readAsDataURL(file);
        });
    }
    function reencode(src, max, quality) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                const scale = Math.min(1, max / Math.max(img.width, img.height));
                const c = document.createElement('canvas');
                c.width = Math.max(1, Math.round(img.width * scale));
                c.height = Math.max(1, Math.round(img.height * scale));
                const ctx = c.getContext('2d');
                ctx.fillStyle = '#0d0d14';
                ctx.fillRect(0, 0, c.width, c.height);
                ctx.drawImage(img, 0, 0, c.width, c.height);
                resolve(c.toDataURL('image/jpeg', quality));
            };
            img.onerror = () => reject(new Error('bad image'));
            img.src = src;
        });
    }
    const compressFile = (file, max = IMG_PRESETS.photo.max, q = IMG_PRESETS.photo.quality) => compressImage(file, { max, quality: q });

    /* =====================================================
       Окно страницы релиза
       ===================================================== */
    const detail = document.createElement('div');
    detail.id = 'music-detail-modal';
    detail.className = 'hidden fixed inset-0 bg-black/70 backdrop-blur-md flex items-start sm:items-center justify-center z-[54] p-3 sm:p-4';
    detail.setAttribute('role', 'dialog');
    detail.setAttribute('aria-modal', 'true');
    detail.setAttribute('aria-label', 'Страница релиза');
    detail.innerHTML = '<div class="glass no-hover gd-panel w-full rounded-3xl p-5 sm:p-7 max-h-[94vh] overflow-y-auto border border-white/10 shadow-2xl"><div id="md-body"></div></div>';
    document.body.appendChild(detail);
    const body = detail.querySelector('#md-body');

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.multiple = true;
    fileInput.className = 'hidden';
    document.body.appendChild(fileInput);

    function detailHTML(i, key) {
        const src = imgSrc(i.img);
        const photos = photosOf(i);
        const meta = [i.year, i.label, i.formatDetails, i.condition && `состояние ${i.condition}`].filter(Boolean).map(esc).join(' • ');
        const link = safeUrl(i.url);
        const kb = Math.round(photos.reduce((s, p) => s + String(p.src || '').length, 0) * 0.75 / 1024);
        return `
        <div class="flex items-start gap-4 sm:gap-5 flex-col sm:flex-row">
            <div class="gd-cover">${src ? `<img src="${esc(src)}" alt="Обложка: ${esc(i.title)}">` : ICON[key]}</div>
            <div class="min-w-0 flex-1 w-full space-y-2.5">
                <div class="flex flex-wrap items-center gap-2">
                    <span class="gd-chip">${ICON[key]} ${NAME[key]}</span>
                    ${i.isCustom ? '<span class="gd-chip">✨ Кастомный</span>' : ''}
                    ${i.isGift ? '<span class="gd-chip">🎁 Подарок</span>' : ''}
                </div>
                <h3 class="text-2xl sm:text-3xl font-black leading-tight break-words" style="font-family:var(--font-display)">${esc(i.title)}</h3>
                ${i.artist ? `<p class="text-base text-purple-300 font-bold">${esc(i.artist)}</p>` : ''}
                ${meta ? `<p class="text-sm text-gray-400">${meta}</p>` : ''}
                <p class="text-sm text-cyan-400 font-bold font-mono">${esc(fmtPrice(i))}${i.whereBought ? ` <span class="text-gray-500 font-sans font-medium">· ${esc(i.whereBought)}</span>` : ''}</p>
                <div class="flex items-center gap-1" role="group" aria-label="Оценка">
                    ${[1, 2, 3, 4, 5].map(n => `<button type="button" class="gd-star${(i.rating || 0) >= n ? ' is-on' : ''}" data-act="rate" data-v="${n}" aria-label="Оценка ${n}">★</button>`).join('')}
                </div>
            </div>
            <div class="flex sm:flex-col gap-2 shrink-0 self-end sm:self-start">
                <button type="button" class="gd-tool" data-act="share" data-k="${key}" data-id="${i.id}">📤 Поделиться</button>
                <button type="button" class="gd-tool" data-act="edit">✏️ Изменить</button>
                ${link ? `<a class="gd-tool text-center" href="${esc(link)}" target="_blank" rel="noopener noreferrer">🔗 Ссылка</a>` : ''}
                <button type="button" class="gd-tool is-danger" data-act="del">🗑 Удалить</button>
                <button type="button" class="gd-tool" data-act="close" aria-label="Закрыть">✕</button>
            </div>
        </div>

        <div class="gd-sec mt-5">
            <div class="flex flex-wrap items-center justify-between gap-2 mb-2">
                <p class="gd-sec-title mb-0">Заметки и личное мнение</p>
                <span id="md-saved" class="text-[11px] text-gray-500"></span>
            </div>
            <textarea id="md-note" class="gd-input gd-note" placeholder="Впечатления, треклист, об издании (лейбл, номер по каталогу, страна прессинга), особенности диска, что понравилось и что нет…">${esc(i.note || '')}</textarea>
            <div class="flex flex-wrap gap-2 mt-2">
                <button type="button" class="gd-tool" data-act="tpl" data-v="💬 Впечатления:\n">＋ Впечатления</button>
                <button type="button" class="gd-tool" data-act="tpl" data-v="🎵 Треклист:\n1. ">＋ Треклист</button>
                <button type="button" class="gd-tool" data-act="tpl" data-v="💿 Об издании:\nЛейбл: \nНомер по каталогу: \nСтрана / год прессинга: \n">＋ Об издании</button>
            </div>
        </div>

        <div class="gd-sec mt-5">
            <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
                <p class="gd-sec-title mb-0">Фото (${photos.length}/${MAX_PHOTOS})${kb ? ` · ~${kb} КБ` : ''}
                    ${lastPhoto && lastPhoto.key === key && lastPhoto.id === i.id ? '<button type="button" class="gd-tool ml-2 normal-case tracking-normal" data-act="undophoto">↩ Вернуть фото</button>' : ''}</p>
                <label class="text-xs text-gray-400 flex items-center gap-2">Что на фото:
                    <select id="md-photo-label" class="bg-[#0d0d14] text-white text-xs p-2 rounded-lg border border-white/10">${PHOTO_LABELS.map(l => `<option>${esc(l)}</option>`).join('')}</select>
                </label>
            </div>
            <div class="gd-photos">
                ${photos.map((p, idx) => `
                    <figure class="gd-photo" data-act="zoom" data-idx="${idx}">
                        <img src="${esc(imgSrc(p.src))}" alt="${esc(p.label || 'Фото')}" loading="lazy">
                        <figcaption class="gd-photo-cap">${esc(p.label || 'Фото')}</figcaption>
                        <div class="gd-photo-act">
                            <button type="button" data-act="cover" data-idx="${idx}" title="Сделать обложкой" aria-label="Сделать обложкой">🖼️</button>
                            <button type="button" data-act="delphoto" data-idx="${idx}" title="Удалить фото" aria-label="Удалить фото">🗑</button>
                        </div>
                    </figure>`).join('')}
                ${photos.length < MAX_PHOTOS ? '<button type="button" class="gd-photo-add" data-act="addphoto"><span aria-hidden="true">📷</span><span>Добавить фото</span></button>' : ''}
            </div>
            <p class="text-[11px] text-gray-500 mt-2">Фото сжимаются и хранятся в памяти браузера вместе с коллекцией — попадут и в бэкап (.json).</p>
        </div>`;
    }

    function renderDetail() {
        const item = current();
        if (!item) { detail.classList.add('hidden'); return; }
        flushNote();
        body.innerHTML = detailHTML(item, cur.key);
    }

    function openDetail(key, id) {
        if (!KEYS.includes(key) || !find(key, id)) return;
        cur = { key, id: Number(id) };
        renderDetail();
        detail.classList.remove('hidden');
    }
    window.openMusicDetail = openDetail;

    function flushNote() {
        clearTimeout(noteTimer);
        const item = current();
        if (!dirty || !item) { dirty = false; return; }
        const ta = $('md-note');
        if (ta) item.note = ta.value;
        dirty = false;
        persistData();
        const flag = $('md-saved');
        if (flag) flag.textContent = 'Сохранено ✓';
    }

    body.addEventListener('input', e => {
        if (e.target.id !== 'md-note') return;
        dirty = true;
        const flag = $('md-saved');
        if (flag) flag.textContent = 'Сохраняю…';
        clearTimeout(noteTimer);
        noteTimer = setTimeout(flushNote, 600);
    });

    onHidden(detail, () => {
        const wasOpen = cur != null;
        flushNote();
        cur = null;
        if (wasOpen) updateUI();
    });
    window.addEventListener('pagehide', flushNote);

    async function addPhotos(files) {
        const item = current();
        if (!item) return;
        flushNote();
        const list = [...files].filter(f => f.type.startsWith('image/'));
        const room = MAX_PHOTOS - photosOf(item).length;
        if (!list.length) return;
        if (room <= 0) { showToast(`Максимум ${MAX_PHOTOS} фото на релиз`, 'error'); return; }
        const label = $('md-photo-label')?.value || 'Фото';
        let added = 0;
        for (const file of list.slice(0, room)) {
            try {
                const src = await compressFile(file);
                const photo = { id: 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), src, label, ts: Date.now() };
                item.photos = [...photosOf(item), photo];
                if (!commit()) { item.photos = item.photos.slice(0, -1); break; }
                added++;
            } catch (err) {
                showToast('Не удалось обработать картинку', 'error');
            }
        }
        if (list.length > room) showToast(`Добавлено ${added}, остальные не влезли в лимит ${MAX_PHOTOS} фото`);
        else if (added) showToast(`Фото добавлено: ${added} 📷`, 'success');
        renderDetail();
    }
    fileInput.addEventListener('change', () => { addPhotos(fileInput.files); fileInput.value = ''; });

    detail.addEventListener('click', async e => {
        const act = e.target.closest('[data-act]');
        const item = current();
        if (!act || !item) return;
        const v = act.dataset.v;
        const idx = Number(act.dataset.idx);
        switch (act.dataset.act) {
            case 'close': detail.classList.add('hidden'); break;
            case 'edit': {
                const k = cur.key, id = item.id;
                pendingReopen = { key: k, id };
                detail.classList.add('hidden');
                openModal(k, id);
                break;
            }
            case 'del': {
                // без подтверждения: ошибочное удаление можно вернуть кнопкой «↩ Вернуть» внизу экрана
                const k = cur.key, id = item.id;
                dirty = false;
                detail.classList.add('hidden');
                data[k] = (data[k] || []).filter(x => x.id !== id);
                save();
                break;
            }
            case 'rate':
                item.rating = item.rating === Number(v) ? 0 : Number(v);
                commit(); renderDetail(); break;
            case 'tpl': {
                const ta = $('md-note');
                if (!ta) break;
                ta.value = ta.value.trim() ? `${ta.value.replace(/\s+$/, '')}\n\n${v}` : v;
                ta.focus();
                ta.setSelectionRange(ta.value.length, ta.value.length);
                ta.dispatchEvent(new Event('input', { bubbles: true }));
                break;
            }
            case 'addphoto': fileInput.click(); break;
            case 'zoom':
                if (!e.target.closest('.gd-photo-act')) openLightbox(cur.key, item.id, idx);
                break;
            case 'cover': {
                e.stopPropagation();
                const p = photosOf(item)[idx];
                if (!p) break;
                try {
                    item.img = await reencode(p.src, IMG_PRESETS.cover.max, IMG_PRESETS.cover.quality);
                    if (commit()) showToast('Фото стало обложкой 🖼️', 'success');
                    renderDetail();
                } catch (err) { showToast('Не удалось поставить обложку', 'error'); }
                break;
            }
            case 'delphoto': {
                e.stopPropagation();
                const removed = photosOf(item)[idx];
                if (!removed) break;
                lastPhoto = { key: cur.key, id: item.id, photo: removed, idx };
                item.photos = photosOf(item).filter((_, k) => k !== idx);
                commit(); renderDetail();
                break;
            }
            case 'undophoto': {
                if (!lastPhoto || lastPhoto.key !== cur.key || lastPhoto.id !== item.id) break;
                const list = [...photosOf(item)];
                if (list.length >= MAX_PHOTOS) { showToast(`Максимум ${MAX_PHOTOS} фото на релиз`, 'error'); break; }
                list.splice(Math.min(lastPhoto.idx, list.length), 0, lastPhoto.photo);
                item.photos = list;
                lastPhoto = null;
                commit(); renderDetail();
                break;
            }
        }
    });

    /* =====================================================
       Лайтбокс
       ===================================================== */
    const lightbox = document.createElement('div');
    lightbox.id = 'music-lightbox-modal';
    lightbox.className = 'hidden fixed inset-0 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center z-[60] p-4 gap-3';
    lightbox.setAttribute('role', 'dialog');
    lightbox.setAttribute('aria-modal', 'true');
    lightbox.setAttribute('aria-label', 'Просмотр фото');
    lightbox.innerHTML = `
        <img id="ml-img" class="gl-img" alt="">
        <p id="ml-cap" class="text-sm text-gray-300 font-bold text-center"></p>
        <button type="button" id="ml-prev" class="gl-nav" style="left:16px" aria-label="Предыдущее">‹</button>
        <button type="button" id="ml-next" class="gl-nav" style="right:16px" aria-label="Следующее">›</button>
        <button type="button" id="ml-close" class="absolute top-4 right-4 gd-tool" aria-label="Закрыть">✕</button>`;
    document.body.appendChild(lightbox);

    const lb = { key: null, id: null, idx: 0 };
    function renderLightbox() {
        const photos = photosOf(find(lb.key, lb.id));
        if (!photos.length) { lightbox.classList.add('hidden'); return; }
        lb.idx = (lb.idx + photos.length) % photos.length;
        const p = photos[lb.idx];
        $('ml-img').src = imgSrc(p.src);
        $('ml-img').alt = p.label || 'Фото';
        $('ml-cap').textContent = `${p.label || 'Фото'} · ${lb.idx + 1} / ${photos.length}`;
        const multi = photos.length > 1;
        $('ml-prev').classList.toggle('hidden', !multi);
        $('ml-next').classList.toggle('hidden', !multi);
    }
    function openLightbox(key, id, idx) {
        lb.key = key; lb.id = id; lb.idx = idx || 0;
        renderLightbox();
        lightbox.classList.remove('hidden');
    }
    $('ml-prev').onclick = () => { lb.idx--; renderLightbox(); };
    $('ml-next').onclick = () => { lb.idx++; renderLightbox(); };
    $('ml-close').onclick = () => lightbox.classList.add('hidden');
    onHidden(lightbox, () => { $('ml-img').removeAttribute('src'); });
    document.addEventListener('keydown', e => {
        if (lightbox.classList.contains('hidden')) return;
        if (e.key === 'ArrowLeft') { lb.idx--; renderLightbox(); }
        else if (e.key === 'ArrowRight') { lb.idx++; renderLightbox(); }
    });

    /* =====================================================
       Подключение: клик по карточке, возврат после редактирования, поиск Ctrl+K
       ===================================================== */
    ['cd-grid', 'vinyl-grid'].forEach(gid => {
        $(gid)?.addEventListener('click', e => {
            if (e.target.closest('button, a, input, select, textarea')) return;
            const card = e.target.closest('[data-mid]');
            if (card) openDetail(card.dataset.mkey, card.dataset.mid);
        });
    });

    const saveItemBase = window.saveItem;
    window.saveItem = async (...args) => {
        const key = $('edit-type').value;
        const id = Number($('edit-id').value) || null;
        const re = pendingReopen && pendingReopen.key === key && pendingReopen.id === id ? pendingReopen : null;
        await saveItemBase(...args);
        // форма закрылась — сохранение прошло, возвращаемся на страницу релиза
        if (re && $('modal').classList.contains('hidden')) {
            pendingReopen = null;
            openDetail(re.key, re.id);
        }
    };

    if (typeof jumpToItem === 'function') {
        const jumpBase = jumpToItem;
        jumpToItem = function (sec, item) {
            if (KEYS.includes(sec.key)) { showPage(sec.page); openDetail(sec.key, item.id); return; }
            jumpBase(sec, item);
        };
    }

    updateUI();
})();

/* =========================================================
   «Поделиться»: красивая карточка для истории (1080×1920) из обложки, названия и оценки.
   Кнопка есть на странице релиза и на странице игры (data-act="share" data-k="cds|vinyls|games" data-id).
   ========================================================= */
(() => {
    const W = 1080, H = 1920;
    const $ = id => document.getElementById(id);
    const FONT_D = "'Unbounded', 'Inter', system-ui, sans-serif";
    const FONT_U = "'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif";
    const safeImg = s => { const v = String(s || ''); return /^data:image\//i.test(v) ? v : safeUrl(v); };
    const load = src => new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = src; });

    function rrect(c, x, y, w, h, r) {
        c.beginPath(); c.moveTo(x + r, y);
        c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
        c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
    }
    /* картинка «cover»: заполняет прямоугольник без искажений */
    function drawCover(c, im, x, y, w, h) {
        const s = Math.max(w / im.width, h / im.height), dw = im.width * s, dh = im.height * s;
        c.drawImage(im, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
    }
    /* перенос по словам; false во втором значении — не поместилось в maxLines */
    function wrap(c, text, maxW, maxLines) {
        const words = String(text).split(/\s+/).filter(Boolean), lines = [];
        let line = '';
        for (const w of words) {
            const t = line ? line + ' ' + w : w;
            if (c.measureText(t).width <= maxW || !line) line = t; else { lines.push(line); line = w; }
        }
        if (line) lines.push(line);
        if (lines.length <= maxLines) return { lines, ok: true };
        const cut = lines.slice(0, maxLines);
        let last = cut[maxLines - 1];
        while (last.length > 1 && c.measureText(last + '…').width > maxW) last = last.slice(0, -1);
        cut[maxLines - 1] = last.replace(/[\s.,;:–-]+$/, '') + '…';
        return { lines: cut, ok: false };
    }

    async function build(o) {
        try { await Promise.all([`800 80px Unbounded`, `700 46px Inter`].map(f => document.fonts.load(f, 'Аa').catch(() => {}))); } catch (_) {}
        let cover = null;
        if (o.img) { try { cover = await load(o.img); } catch (_) {} }
        const rgb = (getComputedStyle(document.body).getPropertyValue('--theme-rgb') || '139, 92, 246').trim();

        const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
        const c = cv.getContext('2d');
        c.imageSmoothingQuality = 'high';

        /* фон: размытая обложка (уменьшаем и растягиваем — работает и там, где нет ctx.filter) */
        c.fillStyle = '#05050a'; c.fillRect(0, 0, W, H);
        if (cover) {
            let tiny = document.createElement('canvas'); tiny.width = 18; tiny.height = 32;
            tiny.getContext('2d').drawImage(cover, 0, 0, 18, 32);        // грубо — зато вся картинка превращается в мягкие цветовые пятна
            const mid = document.createElement('canvas'); mid.width = 90; mid.height = 160;
            const mc = mid.getContext('2d'); mc.imageSmoothingQuality = 'high'; mc.drawImage(tiny, 0, 0, 90, 160);
            c.drawImage(mid, 0, 0, W, H);
        } else {
            const g = c.createLinearGradient(0, 0, W, H);
            g.addColorStop(0, `rgba(${rgb}, 0.55)`); g.addColorStop(1, 'rgba(6, 182, 212, 0.35)');
            c.fillStyle = g; c.fillRect(0, 0, W, H);
        }
        const shade = c.createLinearGradient(0, 0, 0, H);
        shade.addColorStop(0, 'rgba(3,3,7,0.55)'); shade.addColorStop(0.5, 'rgba(3,3,7,0.62)'); shade.addColorStop(1, 'rgba(3,3,7,0.9)');
        c.fillStyle = shade; c.fillRect(0, 0, W, H);
        const glow = c.createRadialGradient(W / 2, 700, 80, W / 2, 700, 760);
        glow.addColorStop(0, `rgba(${rgb}, 0.28)`); glow.addColorStop(1, `rgba(${rgb}, 0)`);
        c.fillStyle = glow; c.fillRect(0, 0, W, H);

        /* обложка */
        const S = 840, cx = (W - S) / 2, cy = 250;
        c.save();
        c.shadowColor = 'rgba(0,0,0,0.65)'; c.shadowBlur = 90; c.shadowOffsetY = 36;
        rrect(c, cx, cy, S, S, 44); c.fillStyle = '#0d0d14'; c.fill();
        c.restore();
        c.save(); rrect(c, cx, cy, S, S, 44); c.clip();
        if (cover) drawCover(c, cover, cx, cy, S, S);
        else {
            const g = c.createLinearGradient(cx, cy, cx + S, cy + S);
            g.addColorStop(0, `rgba(${rgb}, 0.6)`); g.addColorStop(1, 'rgba(6, 182, 212, 0.4)');
            c.fillStyle = g; c.fillRect(cx, cy, S, S);
            c.font = `300px ${FONT_U}`; c.textAlign = 'center'; c.textBaseline = 'middle';
            c.fillStyle = '#fff'; c.fillText(o.icon, W / 2, cy + S / 2 + 10);
        }
        c.restore();
        rrect(c, cx, cy, S, S, 44); c.lineWidth = 3; c.strokeStyle = 'rgba(255,255,255,0.18)'; c.stroke();

        /* значок формата / платформы */
        c.textBaseline = 'alphabetic'; c.textAlign = 'center';
        let y = cy + S + 84;
        c.font = `800 38px ${FONT_U}`;
        const badge = `${o.icon}  ${o.badge}`;
        const bw = Math.min(W - 160, c.measureText(badge).width + 64);
        rrect(c, (W - bw) / 2, y - 44, bw, 66, 33);
        c.fillStyle = `rgba(${rgb}, 0.28)`; c.fill(); c.lineWidth = 2; c.strokeStyle = `rgba(${rgb}, 0.8)`; c.stroke();
        c.fillStyle = '#fff'; c.fillText(badge, W / 2, y);

        /* название (подбираем размер, чтобы влезло в 3 строки) */
        y += 120;
        let size = 82, res;
        for (const s of [82, 70, 60, 50]) {
            size = s; c.font = `800 ${s}px ${FONT_D}`;
            res = wrap(c, o.title, 900, 3);
            if (res.ok) break;
        }
        c.fillStyle = '#fff';
        res.lines.forEach((ln, i) => c.fillText(ln, W / 2, y + i * size * 1.18));
        y += (res.lines.length - 1) * size * 1.18;

        if (o.sub) {
            y += 76; c.font = `700 48px ${FONT_U}`; c.fillStyle = '#c4b5fd';
            const r2 = wrap(c, o.sub, 900, 1); c.fillText(r2.lines[0], W / 2, y);
        }
        if (o.meta) {
            y += 56; c.font = `500 34px ${FONT_U}`; c.fillStyle = 'rgba(255,255,255,0.55)';
            const r3 = wrap(c, o.meta, 900, 1); c.fillText(r3.lines[0], W / 2, y);
        }

        /* оценка */
        const rating = Math.max(0, Math.min(5, Number(o.rating) || 0));
        if (rating) {
            const sy = Math.max(y + 130, 1690);
            c.font = `900 92px ${FONT_U}`; c.textAlign = 'left';
            const step = 112, x0 = (W - step * 5) / 2 + 8;
            for (let i = 0; i < 5; i++) {
                c.fillStyle = i < rating ? '#facc15' : 'rgba(255,255,255,0.2)';
                if (i < rating) { c.shadowColor = 'rgba(250,204,21,0.55)'; c.shadowBlur = 26; }
                c.fillText('★', x0 + i * step, sy);
                c.shadowBlur = 0; c.shadowColor = 'transparent';
            }
            c.textAlign = 'center';
        }

        /* подпись */
        c.font = `800 30px ${FONT_D}`; c.fillStyle = 'rgba(255,255,255,0.4)'; c.textAlign = 'center';
        try { c.letterSpacing = '6px'; } catch (_) {}
        c.fillText('MIRVEL HUB', W / 2, H - 70);
        return cv;
    }

    /* ---------- Окно предпросмотра ---------- */
    let modal = null, url = null, blob = null, fileName = 'card.png';
    function ensureModal() {
        if (modal) return modal;
        modal = document.createElement('div');
        modal.id = 'share-card-modal';
        modal.className = 'hidden fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[70] p-4';
        modal.setAttribute('role', 'dialog'); modal.setAttribute('aria-modal', 'true');
        modal.innerHTML = `
            <div class="glass no-hover w-full max-w-sm rounded-3xl p-5 space-y-3 max-h-[96vh] overflow-y-auto">
                <h3 class="text-lg font-black">Карточка для истории</h3>
                <img id="share-card-img" alt="Карточка для истории" class="w-full rounded-2xl border border-white/10" style="max-height:62vh; object-fit:contain; background:#05050a">
                <div class="flex gap-2">
                    <button type="button" id="share-card-save" class="flex-1 bg-purple-600 hover:bg-purple-500 py-3 rounded-xl font-bold text-white btn-neon">⬇ Скачать PNG</button>
                    <button type="button" id="share-card-send" class="hidden flex-1 bg-white/10 hover:bg-white/15 py-3 rounded-xl font-bold">📤 Поделиться</button>
                </div>
                <button type="button" class="w-full text-gray-400 hover:text-white text-sm py-1" onclick="closeModal('share-card-modal')">Закрыть</button>
            </div>`;
        document.body.appendChild(modal);
        $('share-card-save').onclick = () => {
            if (!blob) return;
            const a = document.createElement('a'); a.href = url; a.download = fileName;
            document.body.appendChild(a); a.click(); a.remove();
        };
        $('share-card-send').onclick = async () => {
            if (!blob) return;
            try { await navigator.share({ files: [new File([blob], fileName, { type: 'image/png' })] }); }
            catch (e) { if (e && e.name !== 'AbortError') showToast('Не удалось поделиться — скачайте картинку', 'error'); }
        };
        new MutationObserver(() => {
            if (modal.classList.contains('hidden') && url) { URL.revokeObjectURL(url); url = null; blob = null; $('share-card-img').removeAttribute('src'); }
        }).observe(modal, { attributes: true, attributeFilter: ['class'] });
        return modal;
    }

    async function share(item, key) {
        if (!item) return;
        const isGame = key === 'games';
        const o = isGame
            ? { img: safeImg(item.img), icon: '🎮', badge: item.platform || 'Игра', title: item.title || 'Без названия', sub: '', meta: [item.year, item.developer].filter(Boolean).join(' • '), rating: item.rating }
            : { img: safeImg(item.img), icon: key === 'cds' ? '💿' : '💽', badge: key === 'cds' ? 'CD' : 'VINYL', title: item.title || 'Без названия', sub: item.artist || '', meta: [item.year, item.label].filter(Boolean).join(' • '), rating: item.rating };
        try {
            showToast('Собираю карточку…');
            const cv = await build(o);
            const b = await new Promise(res => cv.toBlob(res, 'image/png'));
            if (!b) throw new Error('toBlob');
            ensureModal();
            if (url) URL.revokeObjectURL(url);
            blob = b; url = URL.createObjectURL(b);
            fileName = `${(o.sub ? o.sub + ' - ' : '') + o.title}`.replace(/[\\/:*?"<>|]+/g, '').trim().slice(0, 80) + '.png';
            $('share-card-img').src = url;
            const canSend = !!(navigator.canShare && navigator.canShare({ files: [new File([b], 'x.png', { type: 'image/png' })] }));
            $('share-card-send').classList.toggle('hidden', !canSend);
            modal.classList.remove('hidden');
        } catch (e) {
            console.warn('[MIRVEL] share card:', e);
            showToast('Не удалось собрать карточку', 'error');
        }
    }
    window.shareCard = share;

    document.addEventListener('click', e => {
        const btn = e.target.closest?.('[data-act="share"]');
        if (!btn || !btn.closest('#music-detail-modal, #game-detail-modal')) return;
        const key = btn.dataset.k;
        share((data[key] || []).find(x => x.id === Number(btn.dataset.id)), key);
    });
})();
