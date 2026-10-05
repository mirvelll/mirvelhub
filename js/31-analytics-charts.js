/* =========================================================
   MIRVEL HUB — 31-analytics-charts.js (подключать после 30-collection-ui.js)
   Три графика на странице «Аналитика»:
   1) кольцо «по форматам» (CD / винил / игры / вещи) — количество и сумма
   2) линия «траты по месяцам» (6 мес. / 12 мес. / всё время)
   3) тепловая карта «когда покупал» (календарь за последний год, как на GitHub)
   У предметов нет отдельной даты покупки, поэтому дата берётся из id (момент добавления в хаб).
   Новые поля в data не пишутся. Старые данные не затрагиваются.
   ========================================================= */
(() => {
    'use strict';
    const $ = id => document.getElementById(id);
    const E = s => (typeof esc === 'function' ? esc(s) : String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));

    const KINDS = [
        { key: 'cds',    label: '💿 CD',    color: '#a855f7' },
        { key: 'vinyls', label: '💽 Винил', color: '#22d3ee' },
        { key: 'games',  label: '🎮 Игры',  color: '#fbbf24' },
        { key: 'stuff',  label: '📦 Вещи',  color: '#34d399' }
    ];
    const MONTHS = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
    const DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
    const money = n => Math.round(n).toLocaleString('ru-RU') + ' ₴';

    let range = 12;   // 6 | 12 | 0 (всё время)

    /* ---------- стили ---------- */
    const css = document.createElement('style');
    css.textContent = `
    .ac-sec{margin-bottom:2.5rem}
    .ac-head{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px}
    .ac-note{font-size:11px;color:#6b7280;margin-top:4px}
    .ac-donut{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:18px}
    .ac-donut svg{width:150px;height:150px;flex:none}
    .ac-leg{display:flex;flex-direction:column;gap:8px;min-width:150px;flex:1}
    .ac-leg div{display:flex;align-items:center;gap:8px;font-size:12px;color:#d1d5db}
    .ac-leg i{width:10px;height:10px;border-radius:50%;flex:none}
    .ac-leg b{margin-left:auto;font-family:ui-monospace,monospace;color:#fff}
    .ac-leg small{color:#6b7280;font-family:ui-monospace,monospace}
    .ac-seg{cursor:default;transition:opacity .2s}
    .ac-seg:hover{opacity:.75}
    .ac-btns{display:flex;gap:6px}
    .ac-btn{padding:4px 12px;border-radius:999px;font-size:12px;font-weight:700;color:#9ca3af;cursor:pointer;
        background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);transition:background-color .2s,color .2s,border-color .2s}
    .ac-btn:hover{color:#fff;background:rgba(255,255,255,.09)}
    .ac-btn.is-on{color:#fff;border-color:rgba(var(--theme-rgb),.8);background:rgba(var(--theme-rgb),.25)}
    .ac-line{width:100%;height:auto;display:block;overflow:visible}
    .ac-line .dot{cursor:default;transition:r .15s}
    .ac-line .dot:hover{r:6}
    .ac-readout{min-height:20px;font-size:12px;color:#9ca3af;margin-top:6px}
    .ac-readout b{color:#fff}
    .ac-scroll{overflow-x:auto;padding-bottom:6px}
    .ac-heat{display:block;min-width:640px;width:100%;height:auto}
    .ac-cell{cursor:default}
    .ac-cell:hover{stroke:#fff;stroke-width:1}
    .ac-lbl{fill:#6b7280;font-size:9px;font-family:ui-monospace,monospace}
    .ac-empty{padding:34px 10px;text-align:center;font-size:12px;font-style:italic;color:#6b7280}
    `;
    document.head.appendChild(css);

    /* ---------- данные ---------- */
    // Все предметы с датой (дата = момент создания id). Подозрительные id (не похожие на дату) пропускаются.
    function collect() {
        const now = Date.now(), min = new Date(2000, 0, 1).getTime(), max = now + 86400000;
        const out = [];
        KINDS.forEach(k => (data[k.key] || []).forEach(it => {
            const id = Number(it && it.id);
            const price = Number(it && it.price) || 0;
            out.push({ kind: k.key, price, ts: (id >= min && id <= max) ? id : null });
        }));
        return out;
    }
    const monthKey = d => d.getFullYear() * 12 + d.getMonth();

    /* ---------- каркас на странице ---------- */
    function ensureShell() {
        if ($('ac-root')) return true;
        const page = $('analytics');
        const anchor = $('analytics-categories');
        if (!page || !anchor) return false;
        const firstGrid = anchor.closest('.grid');
        if (!firstGrid) return false;
        const root = document.createElement('div');
        root.id = 'ac-root';
        root.className = 'ac-sec';
        root.innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <div class="glass p-6 rounded-3xl">
                <h3 class="text-lg font-black text-white mb-4">🍩 По форматам</h3>
                <div id="ac-donut" class="ac-donut"></div>
            </div>
            <div class="glass p-6 rounded-3xl lg:col-span-2">
                <div class="ac-head">
                    <div>
                        <h3 class="text-lg font-black text-white">📈 Траты по месяцам</h3>
                        <p class="ac-note">Дата берётся из момента добавления предмета в хаб.</p>
                    </div>
                    <div class="ac-btns" id="ac-range">
                        <button type="button" class="ac-btn" data-r="6">6 мес.</button>
                        <button type="button" class="ac-btn" data-r="12">12 мес.</button>
                        <button type="button" class="ac-btn" data-r="0">Всё время</button>
                    </div>
                </div>
                <div id="ac-line" class="mt-4"></div>
                <div id="ac-readout" class="ac-readout"></div>
            </div>
        </div>
        <div class="glass p-6 rounded-3xl">
            <h3 class="text-lg font-black text-white">🔥 Когда я покупал</h3>
            <p class="ac-note mb-3">Каждая клетка — один день за последний год. Чем ярче, тем больше предметов добавлено.</p>
            <div id="ac-heat" class="ac-scroll"></div>
        </div>`;
        firstGrid.after(root);
        $('ac-range').addEventListener('click', e => {
            const b = e.target.closest('.ac-btn');
            if (!b) return;
            range = Number(b.dataset.r);
            drawLine(collect());
        });
        return true;
    }

    /* ---------- 1. кольцо ---------- */
    function drawDonut(items) {
        const box = $('ac-donut');
        if (!box) return;
        const rows = KINDS.map(k => {
            const list = items.filter(i => i.kind === k.key);
            return { ...k, n: list.length, sum: list.reduce((s, i) => s + i.price, 0) };
        });
        const total = rows.reduce((s, r) => s + r.n, 0);
        if (!total) { box.innerHTML = '<p class="ac-empty">Пока нет предметов в коллекции</p>'; return; }

        const R = 56, C = 2 * Math.PI * R;
        let offset = 0;
        const segs = rows.filter(r => r.n).map(r => {
            const len = (r.n / total) * C;
            const gap = rows.filter(x => x.n).length > 1 ? 2 : 0;
            const s = `<circle class="ac-seg" cx="75" cy="75" r="${R}" fill="none" stroke="${r.color}" stroke-width="18"
                stroke-dasharray="${Math.max(0, len - gap)} ${C}" stroke-dashoffset="${-offset}" transform="rotate(-90 75 75)">
                <title>${E(r.label)}: ${r.n} шт. (${Math.round(r.n / total * 100)}%)</title></circle>`;
            offset += len;
            return s;
        }).join('');

        box.innerHTML = `
        <svg viewBox="0 0 150 150" role="img" aria-label="Распределение по форматам">
            <circle cx="75" cy="75" r="${R}" fill="none" stroke="rgba(255,255,255,.06)" stroke-width="18"/>
            ${segs}
            <text x="75" y="73" text-anchor="middle" fill="#fff" font-size="26" font-weight="900">${total}</text>
            <text x="75" y="90" text-anchor="middle" fill="#6b7280" font-size="9" font-weight="700">ПРЕДМЕТОВ</text>
        </svg>
        <div class="ac-leg">${rows.map(r => `
            <div><i style="background:${r.color}"></i>${E(r.label)}<b>${r.n}</b><small>${money(r.sum)}</small></div>`).join('')}
        </div>`;
    }

    /* ---------- 2. линия трат ---------- */
    function drawLine(items) {
        const box = $('ac-line'), ro = $('ac-readout');
        if (!box) return;
        document.querySelectorAll('#ac-range .ac-btn').forEach(b => b.classList.toggle('is-on', Number(b.dataset.r) === range));
        if (ro) ro.innerHTML = '';

        const dated = items.filter(i => i.ts);
        if (!dated.length) { box.innerHTML = '<p class="ac-empty">Добавьте предметы с ценой, и здесь появится график трат</p>'; return; }

        const nowD = new Date(), nowK = monthKey(nowD);
        let startK = range ? nowK - (range - 1) : Math.min(...dated.map(i => monthKey(new Date(i.ts))));
        if (!range && nowK - startK > 59) startK = nowK - 59;   // не больше 5 лет, чтобы график читался
        const n = nowK - startK + 1;
        const sums = new Array(n).fill(0), cnt = new Array(n).fill(0);
        dated.forEach(i => {
            const idx = monthKey(new Date(i.ts)) - startK;
            if (idx >= 0 && idx < n) { sums[idx] += i.price; cnt[idx]++; }
        });
        const labels = sums.map((_, i) => { const k = startK + i; return { m: MONTHS[k % 12], y: Math.floor(k / 12) }; });
        const maxV = Math.max(...sums, 1);

        const W = 640, H = 200, pl = 8, pr = 8, pt = 14, pb = 28;
        const iw = W - pl - pr, ih = H - pt - pb;
        const x = i => pl + (n === 1 ? iw / 2 : (i / (n - 1)) * iw);
        const y = v => pt + ih - (v / maxV) * ih;
        const pts = sums.map((v, i) => [x(i), y(v)]);
        const path = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
        const area = `${path} L${x(n - 1).toFixed(1)} ${pt + ih} L${x(0).toFixed(1)} ${pt + ih} Z`;
        const step = Math.max(1, Math.ceil(n / 12));

        const grid = [0, .5, 1].map(f => `<line x1="${pl}" x2="${W - pr}" y1="${pt + ih - f * ih}" y2="${pt + ih - f * ih}" stroke="rgba(255,255,255,.07)"/>`).join('');
        const ticks = labels.map((l, i) => (i % step === 0 || i === n - 1)
            ? `<text class="ac-lbl" x="${x(i)}" y="${H - 8}" text-anchor="middle">${l.m}${(l.m === 'янв' || i === 0) ? ' ' + String(l.y).slice(2) : ''}</text>` : '').join('');
        const dots = pts.map((p, i) => `<circle class="dot" cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="${sums[i] ? 4 : 2.5}"
            fill="${sums[i] ? '#fff' : 'rgba(255,255,255,.25)'}" stroke="var(--theme-btn,#8b5cf6)" stroke-width="2.5" data-i="${i}"><title>${labels[i].m} ${labels[i].y}: ${money(sums[i])}</title></circle>`).join('');

        box.innerHTML = `
        <svg class="ac-line" viewBox="0 0 ${W} ${H}" role="img" aria-label="Траты по месяцам">
            <defs><linearGradient id="ac-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stop-color="var(--theme-btn,#8b5cf6)" stop-opacity=".45"/>
                <stop offset="1" stop-color="var(--theme-btn,#8b5cf6)" stop-opacity="0"/></linearGradient></defs>
            ${grid}
            <path d="${area}" fill="url(#ac-grad)"/>
            <path d="${path}" fill="none" stroke="var(--theme-btn,#8b5cf6)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
            ${dots}${ticks}
        </svg>`;

        const total = sums.reduce((a, b) => a + b, 0), best = sums.indexOf(maxV);
        const def = () => {
            if (!ro) return;
            ro.innerHTML = total
                ? `За период: <b>${money(total)}</b> · пик: <b>${labels[best].m} ${labels[best].y}</b> (${money(maxV)})`
                : 'За этот период трат нет';
        };
        def();
        box.querySelectorAll('.dot').forEach(d => {
            const i = Number(d.dataset.i);
            d.addEventListener('mouseenter', () => { if (ro) ro.innerHTML = `<b>${labels[i].m} ${labels[i].y}</b>: ${money(sums[i])} · предметов: ${cnt[i]}`; });
            d.addEventListener('mouseleave', def);
        });
    }

    /* ---------- 3. тепловая карта ---------- */
    function drawHeat(items) {
        const box = $('ac-heat');
        if (!box) return;
        const dated = items.filter(i => i.ts);
        if (!dated.length) { box.innerHTML = '<p class="ac-empty">Здесь появится календарь, когда добавите первые предметы</p>'; return; }

        const dayKey = d => d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
        const byDay = {};
        dated.forEach(i => { const k = dayKey(new Date(i.ts)); byDay[k] = (byDay[k] || 0) + 1; });

        // 53 недели, последняя колонка = текущая неделя (с понедельника)
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const dow = (today.getDay() + 6) % 7;                    // 0 = Пн
        const start = new Date(today); start.setDate(start.getDate() - dow - 52 * 7);
        const cell = 11, gap = 3, left = 22, top = 16;
        const W = left + 53 * (cell + gap), H = top + 7 * (cell + gap);
        const maxC = Math.max(...Object.values(byDay), 1);
        const shade = c => {
            if (!c) return 'rgba(255,255,255,.06)';
            const a = 0.28 + 0.72 * Math.min(1, c / Math.max(maxC, 3));
            return `rgba(var(--theme-rgb,139,92,246),${a.toFixed(2)})`;
        };

        let rects = '', monthLbl = '', lastM = -1;
        for (let w = 0; w < 53; w++) {
            for (let d = 0; d < 7; d++) {
                const dt = new Date(start); dt.setDate(start.getDate() + w * 7 + d);
                if (dt > today) continue;
                const c = byDay[dayKey(dt)] || 0;
                const label = dt.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
                rects += `<rect class="ac-cell" x="${left + w * (cell + gap)}" y="${top + d * (cell + gap)}" width="${cell}" height="${cell}" rx="3" fill="${shade(c)}"><title>${label}: ${c ? c + ' шт.' : 'ничего'}</title></rect>`;
            }
            const first = new Date(start); first.setDate(start.getDate() + w * 7);
            if (first.getMonth() !== lastM && first.getDate() <= 7) {
                lastM = first.getMonth();
                monthLbl += `<text class="ac-lbl" x="${left + w * (cell + gap)}" y="10">${MONTHS[lastM]}</text>`;
            }
        }
        const dayLbl = [0, 2, 4].map(d => `<text class="ac-lbl" x="0" y="${top + d * (cell + gap) + cell - 2}">${DAYS[d]}</text>`).join('');

        const activeDays = Object.keys(byDay).length;
        const topDow = new Array(7).fill(0);
        dated.forEach(i => { topDow[(new Date(i.ts).getDay() + 6) % 7]++; });
        const bestDow = topDow.indexOf(Math.max(...topDow));
        box.innerHTML = `
        <svg class="ac-heat" viewBox="0 0 ${W} ${H}" role="img" aria-label="Календарь покупок">${monthLbl}${dayLbl}${rects}</svg>
        <p class="ac-note">Дней с пополнением: <b style="color:#fff">${activeDays}</b> · чаще всего вы добавляете предметы в <b style="color:#fff">${['понедельник', 'вторник', 'среду', 'четверг', 'пятницу', 'субботу', 'воскресенье'][bestDow]}</b></p>`;
    }

    /* ---------- общий рендер ---------- */
    function render() {
        try {
            if (!ensureShell()) return;
            const items = collect();
            drawDonut(items);
            drawLine(items);
            drawHeat(items);
        } catch (e) { console.warn('[MIRVEL] Графики аналитики:', e); }
    }

    // Подцепляемся к существующей отрисовке вкладки (её вызывает renderAll из 11-render.js)
    const orig = window.renderAnalyticsTab;
    window.renderAnalyticsTab = function () {
        let r;
        if (typeof orig === 'function') r = orig.apply(this, arguments);
        render();
        return r;
    };
    // Если вкладка уже отрисована до загрузки модуля — дорисовать сразу
    if (typeof data !== 'undefined') render();
})();
