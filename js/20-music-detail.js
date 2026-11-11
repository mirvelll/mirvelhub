/* =========================================================
   MIRVEL HUB — 20-music-detail.js (подключать после 19-features.js)
   Страница релиза для CD и винила (клик по карточке):
   • заметки и личное мнение (то же поле note, что раньше открывалось кнопкой 💬 — ничего не потеряется)
   • шаблоны: впечатления, об издании
   • ТРЕК-ЛИСТ (отдельный раздел): треки с оценкой ★1–5, ♥ «любимый», длительность, секции (Сторона A / Диск 2),
     вставка списком, перенос старого треклиста из заметок — поле tracks[] ({id,t,d,r,f} или {id,sep,t})
   • «Об издании» (физическая копия): кат. номер, штрихкод, страна, номер экземпляра, состояние конверта,
     запечатан / автограф / лимитка — поле phys{}
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
    let trFilter = 'all';      // фильтр трек-листа
    let trBulk = false;        // открыта ли панель «Вставить списком»
    let physOpen = false;      // открыта ли форма «Об издании»
    let lastTrack = null;      // последний удалённый трек — можно вернуть
    let seq = 0;
    const MAX_TRACKS = 120;

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

    /* =====================================================
       Трек-лист: данные
       ===================================================== */
    const tracksOf = i => (Array.isArray(i?.tracks) ? i.tracks : []);
    const newTid = () => 't' + Date.now().toString(36) + (seq++).toString(36);
    const DUR_RE = /^\d{1,2}(?::\d{2}){1,2}$/;
    const durSec = s => DUR_RE.test(s || '') ? String(s).split(':').reduce((a, n) => a * 60 + Number(n), 0) : 0;
    const fmtDur = sec => {
        const h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60), s = sec % 60;
        return h ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
    };
    const FLT = {
        all: () => true,
        fav: t => t.f,
        top: t => t.r >= 4,
        low: t => t.r >= 1 && t.r <= 2,
        none: t => !t.r
    };

    /** Разбор текста «1. Название 3:45» построчно; строка «# Сторона B» — заголовок секции */
    function parseTracks(text) {
        const out = [];
        String(text || '').split(/\r?\n/).forEach(raw => {
            let s = raw.trim();
            if (!s) return;
            if (s[0] === '#') { out.push({ id: newTid(), sep: true, t: s.replace(/^#+\s*/, '').slice(0, 80) || '—' }); return; }
            if (/^\d{1,3}[.)]?$/.test(s)) return; // пустой шаблон «1. »
            s = s.replace(/^(?:\d{1,3}|[A-Za-z]\d{1,2})\s*[.)]\s+/, '').replace(/^\d{1,3}\s+[-–—]\s+/, '');
            let d = '';
            const m = /[\s\t]+[(\[]?(\d{1,2}(?::\d{2}){1,2})[)\]]?$/.exec(s);
            if (m) { d = m[1]; s = s.slice(0, m.index).trim(); }
            s = s.slice(0, 120);
            if (s) out.push({ id: newTid(), t: s, d, r: 0, f: false });
        });
        return out;
    }

    /** Старый треклист из заметок («🎵 Треклист:» + строки до пустой строки) */
    function extractNoteTracks(note) {
        const lines = String(note || '').split('\n');
        const start = lines.findIndex(l => /^\s*🎵?\s*(трек-?лист|tracklist|track list)\s*:?\s*$/i.test(l));
        if (start < 0) return null;
        let end = start + 1;
        while (end < lines.length && lines[end].trim() && !/^\s*(💬|💿|🎵)/.test(lines[end])) end++;
        const tracks = parseTracks(lines.slice(start + 1, end).join('\n'));
        if (!tracks.length) return null;
        const rest = [...lines.slice(0, start), ...lines.slice(end)].join('\n').replace(/\n{3,}/g, '\n\n').trim();
        return { tracks, rest };
    }

    function trackStats(list) {
        const tr = list.filter(t => !t.sep);
        const rated = tr.filter(t => t.r > 0);
        const avg = rated.length ? rated.reduce((s, t) => s + t.r, 0) / rated.length : 0;
        const secs = tr.map(t => durSec(t.d));
        const total = tr.length && secs.every(s => s > 0) ? secs.reduce((a, b) => a + b, 0) : 0;
        const best = rated.reduce((b, t) => (!b || t.r > b.r ? t : b), null);
        return { count: tr.length, rated: rated.length, avg, favs: tr.filter(t => t.f).length, total, best };
    }

    function statsHTML(list) {
        const s = trackStats(list);
        if (!s.count) return '';
        return [
            `<span>${s.count} ${s.count === 1 ? 'трек' : 'треков'}</span>`,
            s.total ? `<span>⏱ ${fmtDur(s.total)}</span>` : '',
            s.rated ? `<span>★ <b>${s.avg.toFixed(1)}</b> средняя (${s.rated}/${s.count} оценено)</span>` : '<span>Оценок пока нет</span>',
            s.favs ? `<span>♥ <b style="color:#f472b6">${s.favs}</b> любимых</span>` : '',
            s.best && s.best.r >= 4 ? `<span>🔥 Лучший: <b style="color:#fff">${esc(s.best.t)}</b></span>` : ''
        ].filter(Boolean).join('');
    }

    function trackRowHTML(t, n, flt, single) {
        if (t.sep) {
            return flt === 'all' ? `<div class="tr-sep">
                <input class="tr-sep-t" data-tf="t" data-tid="${t.id}" value="${esc(t.t)}" maxlength="80" aria-label="Название секции">
                <span class="tr-ctl"><button type="button" class="tr-mini" data-act="trup" data-tid="${t.id}" aria-label="Выше">↑</button><button type="button" class="tr-mini" data-act="trdn" data-tid="${t.id}" aria-label="Ниже">↓</button><button type="button" class="tr-mini" data-act="trdel" data-tid="${t.id}" aria-label="Удалить секцию">✕</button></span>
            </div>` : '';
        }
        const r = t.r || 0;
        const cls = r >= 4 || t.f ? ' is-top' : (r >= 1 && r <= 2 ? ' is-low' : '');
        return `<div class="tr-row${cls}">
            <span class="tr-n">${n}</span>
            <input class="tr-t" data-tf="t" data-tid="${t.id}" value="${esc(t.t)}" maxlength="120" aria-label="Название трека">
            <input class="tr-d" data-tf="d" data-tid="${t.id}" value="${esc(t.d || '')}" maxlength="8" placeholder="0:00" inputmode="numeric" aria-label="Длительность">
            <span class="tr-ctl">
                <span class="tr-stars" role="group" aria-label="Оценка трека">${[1, 2, 3, 4, 5].map(k => `<button type="button" class="tr-star${r >= k ? ' is-on' : ''}" data-act="trrate" data-tid="${t.id}" data-v="${k}" aria-label="Оценка ${k}">★</button>`).join('')}</span>
                <button type="button" class="tr-fav${t.f ? ' is-on' : ''}" data-act="trfav" data-tid="${t.id}" aria-label="Любимый трек" aria-pressed="${t.f ? 'true' : 'false'}">♥</button>
                ${single || flt !== 'all' ? '' : `<button type="button" class="tr-mini" data-act="trup" data-tid="${t.id}" aria-label="Выше">↑</button><button type="button" class="tr-mini" data-act="trdn" data-tid="${t.id}" aria-label="Ниже">↓</button>`}
                <button type="button" class="tr-mini" data-act="trdel" data-tid="${t.id}" aria-label="Удалить трек">✕</button>
            </span>
        </div>`;
    }

    function tracksInner(i) {
        const list = tracksOf(i);
        const tr = list.filter(t => !t.sep);
        const imp = !tr.length ? extractNoteTracks(i.note) : null;
        const undo = lastTrack && lastTrack.key === cur?.key && lastTrack.id === i.id;
        let n = 0;
        const rows = list.map(t => {
            if (t.sep) return trackRowHTML(t, 0, trFilter, false);
            n++;
            return FLT[trFilter](t) ? trackRowHTML(t, n, trFilter, tr.length < 2) : '';
        }).join('');
        const FLT_LABELS = [['all', 'Все'], ['fav', '♥ Любимые'], ['top', '★ 4–5'], ['low', '👎 1–2'], ['none', 'Без оценки']];
        return `
            <div class="flex flex-wrap items-center justify-between gap-2 mb-2">
                <p class="gd-sec-title mb-0">🎵 Трек-лист${tr.length ? ` · ${tr.length}` : ''}
                    ${undo ? '<button type="button" class="gd-tool ml-2 normal-case tracking-normal" data-act="trundo">↩ Вернуть трек</button>' : ''}</p>
                <div class="flex flex-wrap gap-2">
                    ${imp ? `<button type="button" class="gd-tool" data-act="trimport">📥 Перенести из заметок (${imp.tracks.filter(t => !t.sep).length})</button>` : ''}
                    <button type="button" class="gd-tool" data-act="trbulk">${trBulk ? 'Скрыть' : '📋 Вставить списком'}</button>
                    <button type="button" class="gd-tool" data-act="trsep" title="Заголовок: Сторона B, Диск 2…">＋ Секция</button>
                </div>
            </div>
            ${tr.length ? `<p id="tr-stats" class="tr-sum">${statsHTML(list)}</p>` : '<p class="text-xs text-gray-500">Добавь треки — и оценивай каждый: ★ 1–5 и ♥ для любимых.</p>'}
            ${tr.length > 3 ? `<div class="tr-flt">${FLT_LABELS.map(([k, t]) => `<button type="button" class="gd-pchip${trFilter === k ? ' is-on' : ''}" data-act="trflt" data-v="${k}">${t}</button>`).join('')}</div>` : ''}
            ${rows ? `<div class="tr-list">${rows}</div>` : (tr.length ? '<p class="text-xs text-gray-500 mt-3">В этом фильтре ничего нет.</p>' : '')}
            <div class="flex gap-2 mt-3">
                <input id="tr-new" class="gd-input" maxlength="120" placeholder="Название трека — Enter, чтобы добавить" aria-label="Новый трек">
                <button type="button" class="gd-tool shrink-0" data-act="tradd">＋ Трек</button>
            </div>
            ${trBulk ? `<div class="mt-3">
                <textarea id="tr-bulk" class="gd-input gd-note" style="min-height:140px" placeholder="1. Название 3:45&#10;2. Другой трек 4:02&#10;# Сторона B&#10;3. Ещё один 2:58"></textarea>
                <p class="text-[11px] text-gray-500 mt-1">Номера и время (3:45) подхватятся сами. Строка с «#» — заголовок секции.</p>
                <div class="flex flex-wrap gap-2 mt-2">
                    <button type="button" class="gd-tool" data-act="trbulkgo" data-v="add">＋ Добавить в конец</button>
                    ${tr.length ? '<button type="button" class="gd-tool is-danger" data-act="trbulkgo" data-v="replace">Заменить список (оценки совпавших сохранятся)</button>' : ''}
                </div>
            </div>` : ''}`;
    }

    function physInner(i) {
        const p = i.phys || {};
        const chips = [
            p.cat && `<span class="gd-chip" title="Номер по каталогу">🔢 ${esc(p.cat)}</span>`,
            p.bar && `<span class="gd-chip" title="Штрихкод">🏷️ ${esc(p.bar)}</span>`,
            p.country && `<span class="gd-chip" title="Страна прессинга">🌍 ${esc(p.country)}</span>`,
            p.num && `<span class="gd-chip" title="Номер экземпляра / тираж">🔖 ${esc(p.num)}</span>`,
            p.sleeve && `<span class="gd-chip" title="Состояние конверта / обложки">🖼 Конверт ${esc(p.sleeve)}</span>`,
            p.sealed && '<span class="gd-chip is-ok">📦 Запечатан</span>',
            p.signed && '<span class="gd-chip is-gold">✍️ Автограф</span>',
            p.ltd && '<span class="gd-chip is-gold">💎 Лимитированное</span>'
        ].filter(Boolean);
        const inp = (k, label, ph, extra = '') => `<label class="block"><span class="ph-lbl">${label}</span><input class="gd-input" data-ph="${k}" maxlength="60" value="${esc(p[k] || '')}" placeholder="${ph}" ${extra}></label>`;
        const chk = (k, label) => `<label class="gd-part${p[k] ? ' is-on' : ''}"><input type="checkbox" class="hidden" data-ph="${k}"${p[k] ? ' checked' : ''}>${label}</label>`;
        const COND = ['M', 'NM', 'VG+', 'VG', 'G+', 'G', 'F', 'P'];
        return `
            <div class="flex flex-wrap items-center justify-between gap-2 mb-2">
                <p class="gd-sec-title mb-0">💿 Об издании</p>
                <button type="button" class="gd-tool" data-act="physedit">${physOpen ? '✓ Готово' : (chips.length ? '✏️ Изменить' : '＋ Заполнить')}</button>
            </div>
            ${physOpen ? `
                <div class="ph-grid">
                    ${inp('cat', 'Номер по каталогу', 'напр. 0602547 / SRX-123')}
                    ${inp('bar', 'Штрихкод', '4 006 ...')}
                    ${inp('country', 'Страна прессинга', 'EU, US, JP…')}
                    ${inp('num', 'Номер экземпляра / тираж', '123 / 500')}
                    <label class="block"><span class="ph-lbl">Состояние конверта</span><select class="gd-input" style="background:#0d0d14" data-ph="sleeve"><option value="">—</option>${COND.map(c => `<option${p.sleeve === c ? ' selected' : ''}>${c}</option>`).join('')}</select></label>
                </div>
                <div class="flex flex-wrap gap-2 mt-3">${chk('sealed', '📦 Запечатан')}${chk('signed', '✍️ Автограф')}${chk('ltd', '💎 Лимитированное')}</div>`
                : (chips.length ? `<div class="flex flex-wrap gap-2">${chips.join('')}</div>`
                    : '<p class="text-xs text-gray-500">Каталожный номер, штрихкод, номер экземпляра — всё, что делает копию именно твоей.</p>')}`;
    }

    function refreshTracks() {
        const el = $('md-tracks'), item = current();
        if (el && item) el.innerHTML = tracksInner(item);
    }
    function refreshPhys() {
        const el = $('md-phys'), item = current();
        if (el && item) el.innerHTML = physInner(item);
    }

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
                <p class="text-sm text-cyan-400 font-bold font-mono"><span${isNoPrice(i) ? ` data-custom-price="${key}:${i.id}" class="custom-price-hint" title="Нажми, чтобы указать цену"` : ''}>${esc(fmtPrice(i))}</span>${i.whereBought ? ` <span class="text-gray-500 font-sans font-medium">· ${esc(i.whereBought)}</span>` : ''}</p>
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

        <div class="gd-sec mt-5" id="md-tracks">${tracksInner(i)}</div>

        <div class="gd-sec mt-5" id="md-phys">${physInner(i)}</div>

        <div class="gd-sec mt-5">
            <div class="flex flex-wrap items-center justify-between gap-2 mb-2">
                <p class="gd-sec-title mb-0">Заметки и личное мнение</p>
                <span id="md-saved" class="text-[11px] text-gray-500"></span>
            </div>
            <textarea id="md-note" class="gd-input gd-note" placeholder="Впечатления, особенности диска и издания, что понравилось и что нет…">${esc(i.note || '')}</textarea>
            <div class="flex flex-wrap gap-2 mt-2">
                <button type="button" class="gd-tool" data-act="tpl" data-v="💬 Впечатления:\n">＋ Впечатления</button>
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
        const sc = detail.firstElementChild; const top = sc ? sc.scrollTop : 0;
        body.innerHTML = detailHTML(item, cur.key);
        if (sc) sc.scrollTop = top;
    }

    function openDetail(key, id) {
        if (!KEYS.includes(key) || !find(key, id)) return;
        if (!cur || cur.key !== key || cur.id !== Number(id)) { trFilter = 'all'; trBulk = false; physOpen = false; }
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

    /* ---------- Трек-лист и «Об издании»: правка полей и Enter ---------- */
    body.addEventListener('change', e => {
        const item = current(), el = e.target;
        if (!item) return;
        if (el.dataset.tf) {
            const t = tracksOf(item).find(x => x.id === el.dataset.tid);
            if (!t) return;
            if (el.dataset.tf === 't') {
                const v = el.value.trim().slice(0, t.sep ? 80 : 120);
                if (v) t.t = v; else el.value = t.t;
            } else {
                const v = el.value.trim();
                t.d = DUR_RE.test(v) ? v : '';
                el.value = t.d;
                const st = $('tr-stats'); if (st) st.innerHTML = statsHTML(tracksOf(item));
            }
            persistData();
        } else if (el.dataset.ph) {
            if (!item.phys || typeof item.phys !== 'object') item.phys = {};
            if (el.type === 'checkbox') { item.phys[el.dataset.ph] = el.checked; el.closest('label')?.classList.toggle('is-on', el.checked); }
            else item.phys[el.dataset.ph] = el.value.trim().slice(0, 60);
            persistData();
        }
    });
    body.addEventListener('keydown', e => {
        if (e.key === 'Enter' && e.target.id === 'tr-new') { e.preventDefault(); addTrackFromInput(); }
        else if (e.key === 'Enter' && e.target.dataset && e.target.dataset.tf) e.target.blur();
    });

    function addTrackFromInput() {
        const item = current(), inp = $('tr-new');
        if (!item || !inp) return;
        const parsed = parseTracks(inp.value).filter(t => !t.sep);
        if (!parsed.length) { inp.focus(); return; }
        const list = tracksOf(item);
        if (list.length >= MAX_TRACKS) { showToast(`Максимум ${MAX_TRACKS} треков на релиз`, 'error'); return; }
        item.tracks = [...list, ...parsed].slice(0, MAX_TRACKS);
        persistData(); refreshTracks();
        $('tr-new')?.focus();
    }

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
            /* ----- трек-лист ----- */
            case 'trrate': case 'trfav': case 'trdel': case 'trup': case 'trdn': {
                const list = [...tracksOf(item)];
                const k = list.findIndex(x => x.id === act.dataset.tid);
                if (k < 0) break;
                const t = list[k], a = act.dataset.act;
                if (a === 'trrate') t.r = t.r === Number(v) ? 0 : Number(v);
                else if (a === 'trfav') t.f = !t.f;
                else if (a === 'trdel') { lastTrack = { key: cur.key, id: item.id, track: t, idx: k }; list.splice(k, 1); }
                else {
                    const to = a === 'trup' ? k - 1 : k + 1;
                    if (to < 0 || to >= list.length) break;
                    [list[k], list[to]] = [list[to], list[k]];
                }
                item.tracks = list;
                persistData(); refreshTracks();
                break;
            }
            case 'trundo': {
                if (!lastTrack || lastTrack.key !== cur.key || lastTrack.id !== item.id) break;
                const list = [...tracksOf(item)];
                if (list.length >= MAX_TRACKS) break;
                list.splice(Math.min(lastTrack.idx, list.length), 0, lastTrack.track);
                item.tracks = list; lastTrack = null;
                persistData(); refreshTracks();
                break;
            }
            case 'tradd': addTrackFromInput(); break;
            case 'trsep': {
                const list = tracksOf(item);
                if (list.length >= MAX_TRACKS) break;
                const n = list.filter(x => x.sep).length;
                item.tracks = [...list, { id: newTid(), sep: true, t: n ? `Секция ${n + 1}` : 'Сторона A' }];
                persistData(); refreshTracks();
                break;
            }
            case 'trbulk': trBulk = !trBulk; refreshTracks(); if (trBulk) $('tr-bulk')?.focus(); break;
            case 'trbulkgo': {
                const parsed = parseTracks($('tr-bulk')?.value);
                if (!parsed.length) { showToast('Нечего добавлять — вставь список треков', 'error'); break; }
                if (v === 'replace') {
                    // оценки и ♥ у треков с тем же названием сохраняем
                    const old = new Map(tracksOf(item).filter(x => !x.sep).map(x => [x.t.toLowerCase(), x]));
                    parsed.forEach(t => { const o = !t.sep && old.get(t.t.toLowerCase()); if (o) { t.r = o.r || 0; t.f = !!o.f; if (!t.d) t.d = o.d || ''; } });
                    item.tracks = parsed.slice(0, MAX_TRACKS);
                } else item.tracks = [...tracksOf(item), ...parsed].slice(0, MAX_TRACKS);
                trBulk = false;
                persistData(); refreshTracks();
                showToast(`Треков в списке: ${tracksOf(item).filter(x => !x.sep).length} 🎵`, 'success');
                break;
            }
            case 'trimport': {
                const imp = extractNoteTracks(item.note);
                if (!imp) break;
                item.tracks = imp.tracks.slice(0, MAX_TRACKS);
                item.note = imp.rest;
                const ta = $('md-note'); if (ta) ta.value = imp.rest;
                dirty = false; clearTimeout(noteTimer);
                persistData(); refreshTracks();
                showToast(`Перенёс треков из заметок: ${imp.tracks.filter(x => !x.sep).length} 🎵`, 'success');
                break;
            }
            case 'trflt': trFilter = v; refreshTracks(); break;
            case 'physedit': physOpen = !physOpen; refreshPhys(); break;
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
        /* у игры с данными обложка меньше — внизу нужно место для статов и дополнений */
        const rich = !!(o.stats && o.stats.length);
        const tk = !rich && !!(o.tracks && o.tracks.length);   // у релиза есть оценённые треки → компактная обложка + список лучших
        const compact = rich || tk;
        const roomy = rich && !(o.dlcs && o.dlcs.length);   // без дополнений места больше — обложка крупнее
        const S = rich ? (roomy ? 640 : 500) : tk ? 560 : 840, cx = (W - S) / 2, cy = rich ? (roomy ? 150 : 110) : tk ? 120 : 250;
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
        let y = cy + S + (compact ? 76 : 84);
        c.font = `800 38px ${FONT_U}`;
        const badge = `${o.icon}  ${o.badge}`;
        const bw = Math.min(W - 160, c.measureText(badge).width + 64);
        rrect(c, (W - bw) / 2, y - 44, bw, 66, 33);
        c.fillStyle = `rgba(${rgb}, 0.28)`; c.fill(); c.lineWidth = 2; c.strokeStyle = `rgba(${rgb}, 0.8)`; c.stroke();
        c.fillStyle = '#fff'; c.fillText(badge, W / 2, y);

        /* название (подбираем размер, чтобы влезло в 3 строки) */
        y += compact ? 104 : 120;
        let size = compact ? 66 : 82, res;
        for (const s of (compact ? [66, 58, 50, 44] : [82, 70, 60, 50])) {
            size = s; c.font = `800 ${s}px ${FONT_D}`;
            res = wrap(c, o.title, 900, rich ? 2 : 3);
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
            y += compact ? 52 : 56; c.font = `500 ${compact ? 32 : 34}px ${FONT_U}`; c.fillStyle = 'rgba(255,255,255,0.55)';
            const r3 = wrap(c, o.meta, 900, 1); c.fillText(r3.lines[0], W / 2, y);
        }

        /* оценка */
        const rating = Math.max(0, Math.min(5, Number(o.rating) || 0));
        if (rating) {
            const fs = compact ? 64 : 92, step = compact ? 78 : 112;
            const sy = compact ? y + 92 : Math.max(y + 130, 1690);
            c.font = `900 ${fs}px ${FONT_U}`; c.textAlign = 'left';
            const x0 = (W - step * 5) / 2 + (compact ? 6 : 8);
            for (let i = 0; i < 5; i++) {
                c.fillStyle = i < rating ? '#facc15' : 'rgba(255,255,255,0.2)';
                if (i < rating) { c.shadowColor = 'rgba(250,204,21,0.55)'; c.shadowBlur = compact ? 18 : 26; }
                c.fillText('★', x0 + i * step, sy);
                c.shadowBlur = 0; c.shadowColor = 'transparent';
            }
            c.textAlign = 'center';
            y = sy;
        }

        /* лучшие треки (только у CD / винила): оценённые и любимые */
        if (tk) {
            const rowH = 64, rowGap = 10, foot = H - 125;
            let dy = y + (rating ? 80 : 70);
            c.textAlign = 'left'; c.font = `800 26px ${FONT_U}`; c.fillStyle = 'rgba(255,255,255,0.6)';
            c.fillText('🎵 ЛУЧШИЕ ТРЕКИ', 90, dy); dy += 24;
            const fit = Math.max(1, Math.floor((foot - dy + rowGap) / (rowH + rowGap)));
            o.tracks.slice(0, Math.min(fit, 5)).forEach((t, k) => {
                rrect(c, 90, dy, 900, rowH, 20);
                c.fillStyle = t.r >= 4 ? 'rgba(250,204,21,0.09)' : 'rgba(255,255,255,0.06)'; c.fill();
                c.lineWidth = 2; c.strokeStyle = t.r >= 4 ? 'rgba(250,204,21,0.35)' : 'rgba(255,255,255,0.12)'; c.stroke();
                c.textAlign = 'left'; c.font = `900 28px ${FONT_U}`; c.fillStyle = 'rgba(255,255,255,0.35)';
                c.fillText(String(k + 1), 118, dy + 43);
                let rx = 990 - 24; c.textAlign = 'right'; c.font = `900 30px ${FONT_U}`;
                if (t.r) { const st = '★ ' + t.r; c.fillStyle = '#facc15'; c.fillText(st, rx, dy + 43); rx -= c.measureText(st).width + 22; }
                if (t.f) { c.fillStyle = '#f472b6'; c.fillText('♥', rx, dy + 43); rx -= 52; }
                c.textAlign = 'left'; c.font = `700 30px ${FONT_U}`; c.fillStyle = '#fff';
                c.fillText(wrap(c, t.t, rx - 164, 1).lines[0], 164, dy + 43);
                dy += rowH + rowGap;
            });
            c.textAlign = 'center';
        }

        /* плитки со статами + дополнения (только у игр) */
        if (rich) {
            c.textAlign = 'left';
            const gap = 24, tw = Math.floor((900 - gap * 2) / 3), th = 158;
            const rows = Math.ceil(o.stats.length / 3);
            let ty = y + 50;
            o.stats.forEach((t, i) => {
                const r = Math.floor(i / 3), inRow = Math.min(3, o.stats.length - r * 3);
                const x = (W - (tw * inRow + gap * (inRow - 1))) / 2 + (i % 3) * (tw + gap), yy = ty + r * (th + gap);
                rrect(c, x, yy, tw, th, 28);
                c.fillStyle = 'rgba(255,255,255,0.07)'; c.fill();
                c.lineWidth = 2; c.strokeStyle = t.accent ? `rgba(${t.accent}, 0.55)` : 'rgba(255,255,255,0.14)'; c.stroke();
                c.font = `800 21px ${FONT_U}`; c.fillStyle = 'rgba(255,255,255,0.5)';
                c.fillText(String(t.label).toUpperCase(), x + 24, yy + 40, tw - 40);
                let fs = 46; c.font = `900 ${fs}px ${FONT_U}`;
                while (fs > 26 && c.measureText(t.value).width > tw - 44) { fs -= 2; c.font = `900 ${fs}px ${FONT_U}`; }
                c.fillStyle = t.color || '#fff';
                c.fillText(t.value, x + 24, yy + 96, tw - 40);
                if (t.sub) {
                    c.font = `600 22px ${FONT_U}`; c.fillStyle = 'rgba(255,255,255,0.45)';
                    c.fillText(wrap(c, t.sub, tw - 44, 1).lines[0], x + 24, yy + 134);
                }
            });
            y = ty + rows * th + (rows - 1) * gap;

            const dl = o.dlcs || [];
            if (dl.length) {
                const foot = H - 125, rowH = 54, rowGap = 8;
                let dy = y + 56;
                c.font = `800 26px ${FONT_U}`; c.fillStyle = 'rgba(255,255,255,0.6)';
                c.fillText(`🧩 ДОПОЛНЕНИЯ · ${o.dlcOwned}/${dl.length}`, 90, dy);
                dy += 22;
                let fit = Math.max(1, Math.floor((foot - dy + rowGap) / (rowH + rowGap)));
                const show = dl.length > fit ? fit - 1 : dl.length;     // последний слот — «ещё N»
                dl.slice(0, Math.max(0, show)).forEach(d => {
                    rrect(c, 90, dy, 900, rowH, 18);
                    c.fillStyle = d.owned ? 'rgba(52,211,153,0.10)' : 'rgba(255,255,255,0.04)'; c.fill();
                    c.lineWidth = 2; c.strokeStyle = d.owned ? 'rgba(52,211,153,0.4)' : 'rgba(255,255,255,0.12)';
                    if (!d.owned) c.setLineDash([8, 8]);
                    c.stroke(); c.setLineDash([]);
                    c.font = `900 30px ${FONT_U}`; c.fillStyle = d.owned ? '#34d399' : 'rgba(255,255,255,0.35)';
                    c.textAlign = 'left'; c.fillText(d.owned ? '✓' : '○', 114, dy + 37);
                    c.font = `700 28px ${FONT_U}`; c.fillStyle = d.owned ? '#fff' : 'rgba(255,255,255,0.6)';
                    let right = d.tag || '';
                    c.font = `800 22px ${FONT_U}`;
                    const rw = right ? c.measureText(right).width : 0;
                    c.font = `700 28px ${FONT_U}`;
                    c.fillText(wrap(c, d.title, 900 - 90 - rw - 40, 1).lines[0], 164, dy + 37);
                    if (right) {
                        c.font = `800 22px ${FONT_U}`; c.textAlign = 'right';
                        c.fillStyle = d.done ? '#facc15' : 'rgba(255,255,255,0.5)';
                        c.fillText(right, 990 - 24, dy + 36);
                        c.textAlign = 'left';
                    }
                    dy += rowH + rowGap;
                });
                if (show < dl.length) {
                    c.font = `700 24px ${FONT_U}`; c.fillStyle = 'rgba(255,255,255,0.5)'; c.textAlign = 'center';
                    c.fillText(`+ ещё ${dl.length - Math.max(0, show)}`, W / 2, dy + 34);
                }
            }
            c.textAlign = 'center';
        }

        /* подпись: ник из настроек (если не задан — название сайта) */
        const nick = String(data.name || '').trim() || 'MIRVEL HUB';
        let nfs = 30; c.textAlign = 'center';
        try { c.letterSpacing = '4px'; } catch (_) {}
        c.font = `800 ${nfs}px ${FONT_D}`;
        while (nfs > 18 && c.measureText(nick).width > 820) { nfs -= 2; c.font = `800 ${nfs}px ${FONT_D}`; }
        c.fillStyle = 'rgba(255,255,255,0.55)';
        c.fillText(nick, W / 2 + 2, H - 70);
        try { c.letterSpacing = '0px'; } catch (_) {}
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

    /* ---------- статы и дополнения игры для карточки ---------- */
    const G_STATUS = {
        backlog: ['🗓', 'В планах'], playing: ['▶', 'В процессе'], completed: ['✔', 'Пройдено'], online: ['🌐', 'Онлайн-игра'],
        sandbox: ['🏖', 'Песочница'], dropped: ['⏸', 'Заброшено'], skipped: ['💤', 'Не в планах'], app: ['🧩', 'Приложение']
    };
    const DLC_TYPE = { dlc: 'Дополнение', story: 'Сюжетное', pass: 'Пропуск', cosmetic: 'Косметика', ost: 'Саундтрек', other: 'Другое' };
    const hrsTxt = h => `${Math.round((Number(h) || 0) * 10) / 10} ч`;
    const dmy = s => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ''); return m ? `${m[3]}.${m[2]}.${m[1]}` : ''; };
    const dayDiff = (a, b) => Math.round((new Date(b) - new Date(a)) / 864e5);

    function gameCardData(g) {
        const stats = [];
        const hrs = Number(g.hours) || 0;
        const all = window.mhGameTotalHours ? Number(window.mhGameTotalHours(g)) || hrs : hrs;
        if (all > 0) stats.push({ label: 'Часов в игре', value: hrsTxt(all), sub: all > hrs && hrs > 0 ? `эта версия: ${hrsTxt(hrs)}` : '', accent: '139, 92, 246' });

        const st = G_STATUS[g.status];
        if (st) stats.push({ label: 'Статус', value: `${st[0]} ${st[1]}`, color: g.status === 'completed' ? '#86efac' : '#fff' });

        const tTotal = Number(g.trophyTotal) || 0, tDone = Number(g.trophyDone) || 0;
        const tFull = g.trophy === 'full' || (tTotal > 0 && tDone >= tTotal);
        if (g.trophy) {
            const fam = ((window.mhGamePlat?.PLATFORMS || []).find(p => p[0] === g.platform) || [])[2];
            stats.push({
                label: fam === 'ps' ? 'Трофеи' : 'Достижения',
                value: tFull ? (fam === 'ps' ? '🏆 Платина' : '🏆 100%') : tTotal ? `${Math.min(100, Math.round(tDone / tTotal * 100))}%` : String(tDone),
                sub: tTotal ? `${Math.min(tDone, tTotal)} из ${tTotal}` : '', color: tFull ? '#facc15' : '#fff', accent: tFull ? '250, 204, 21' : ''
            });
        }

        const dlcs = (Array.isArray(g.dlcs) ? g.dlcs : []).filter(d => d && d.title)
            .map(d => {
                const done = d.status === 'completed' || !!d.done;
                const play = d.type === 'story' || d.type === 'dlc';
                return { title: String(d.title), owned: !!d.owned, done: done && !!d.owned, tag: done && d.owned ? '✔ Пройдено' : (DLC_TYPE[d.type] || '') , play };
            })
            .sort((a, b) => (b.owned - a.owned) || (b.done - a.done));
        const dlcOwned = dlcs.filter(d => d.owned).length;
        if (dlcs.length) {
            const pl = dlcs.filter(d => d.owned && d.play), pd = pl.filter(d => d.done).length;
            stats.push({ label: 'Дополнения', value: `${dlcOwned} / ${dlcs.length}`, sub: pl.length ? `пройдено ${pd} из ${pl.length}` : 'есть / всего', accent: '52, 211, 153' });
        }

        if (g.finishedAt && dmy(g.finishedAt)) {
            const d = g.startedAt && g.startedAt !== g.finishedAt ? dayDiff(g.startedAt, g.finishedAt) : 0;
            stats.push({ label: 'Пройдено', value: dmy(g.finishedAt), sub: d > 0 ? `за ${d} дн.` : '' });
        } else if (g.startedAt && dmy(g.startedAt)) stats.push({ label: 'Начато', value: dmy(g.startedAt) });

        if (g.id && g.id > 1e12) {
            const days = Math.max(0, Math.floor((Date.now() - g.id) / 864e5));
            stats.push({ label: 'В коллекции', value: days < 1 ? 'сегодня' : days < 60 ? `${days} дн.` : `${Math.round(days / 30)} мес.`, sub: new Date(g.id).toLocaleDateString('ru-RU') });
        }
        stats.push({ label: 'Формат', value: g.digital ? '☁️ Цифра' : '💿 Диск', sub: [g.edition, g.hasOnline ? '🌐 онлайн' : '', g.coop ? '🤝 коп' : ''].filter(Boolean).join(' · ') });

        return { stats: stats.slice(0, 6), dlcs, dlcOwned };
    }

    /* оценённые или любимые треки: сначала любимые с высокой оценкой */
    function topTracks(it) {
        return (Array.isArray(it.tracks) ? it.tracks : []).filter(t => t && !t.sep && (t.r > 0 || t.f))
            .sort((a, b) => (b.r || 0) - (a.r || 0) || (b.f ? 1 : 0) - (a.f ? 1 : 0));
    }

    async function share(item, key) {
        if (!item) return;
        const isGame = key === 'games';
        const o = isGame
            ? { img: safeImg(item.img), icon: '🎮', badge: item.platform || 'Игра', title: item.title || 'Без названия', sub: '', meta: [item.year, item.developer, item.publisher].filter(Boolean).join(' • '), rating: item.rating, ...gameCardData(item) }
            : { img: safeImg(item.img), icon: key === 'cds' ? '💿' : '💽', badge: key === 'cds' ? 'CD' : 'VINYL', title: item.title || 'Без названия', sub: item.artist || '', meta: [item.year, item.label].filter(Boolean).join(' • '), rating: item.rating, tracks: topTracks(item) };
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
