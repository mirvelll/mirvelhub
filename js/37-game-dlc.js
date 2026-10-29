/* =========================================================
   MIRVEL HUB — 37-game-dlc.js (подключается после 36-tierlist.js)
   Дополнения (DLC) и «красивая» страница игры:
   • крупная обложка с размытым фоном
   • плитки: часы · дополнения · потрачено · ачивки · в коллекции с…
   • список дополнений: куплено / в планах, цена, дата, пройдено
   Данные: game.dlcs = [{ id, title, type, price, approx, owned, date, status, done, free, giftFrom, from, ... }]
     status — статус прохождения (backlog | playing | completed | dropped | skipped), только у сюжетных/играбельных
     free   — как получено, те же пометки, что у игр: free | gift | code | family | bundle | unknown | psplus
              (пусто = куплено за деньги); старые записи читаются как раньше
     done   — дублирует status === 'completed' (для совместимости со старыми данными и синхронизацией версий)
   Платформы-источники берутся из настроек («Настройки → Игры → Платформы»): скрытые там не предлагаются.
   Поле необязательное — попадает в бэкап вместе с игрой.
   ========================================================= */
(() => {
    'use strict';
    const $ = id => document.getElementById(id);
    const TYPES = {
        dlc:      { ico: '🧩', label: 'Дополнение' },
        story:    { ico: '📖', label: 'Сюжетное' },
        pass:     { ico: '🎟', label: 'Сезонный пропуск' },
        cosmetic: { ico: '🎨', label: 'Косметика' },
        ost:      { ico: '🎵', label: 'Саундтрек' },
        other:    { ico: '✨', label: 'Другое' }
    };
    /* как получено — те же пометки, что у игр (js/15-price.js) */
    const KINDS = {
        free:    { ico: '🆓', short: 'Бесплатно',   label: 'Бесплатно' },
        gift:    { ico: '🎁', short: 'Подарок',     label: 'Подарок' },
        code:    { ico: '🔑', short: 'Кодом',       label: 'Активировано кодом' },
        family:  { ico: '👨‍👩‍👧', short: 'Семья',       label: 'Семья / аккаунт друга' },
        bundle:  { ico: '📦', short: 'В наборе',    label: 'В наборе' },
        unknown: { ico: '❔', short: 'Не помню',    label: 'Не помню' },
        psplus:  { ico: '➕', short: 'PS Plus',     label: 'PS Plus' }
    };
    /* статус прохождения — как у игр */
    const ST = {
        backlog:   { ico: '🗓', label: 'В планах' },
        playing:   { ico: '▶',  label: 'В процессе' },
        completed: { ico: '✔',  label: 'Пройдено' },
        dropped:   { ico: '⏸',  label: 'Заброшено' },
        skipped:   { ico: '💤', label: 'Не в планах' }
    };
    const PLAYABLE = ['story', 'dlc'];                 // у каких типов бывает прохождение
    const NEED_OWNED = ['playing', 'completed', 'dropped'];   // без наличия дополнения невозможны
    const PS_RE = /playstation|^ps\d?\b|\bpsp\b|vita/i;
    const kindOf = d => (KINDS[d?.free] ? d.free : '');
    const stOf = d => (ST[d?.status] ? d.status : (d?.done ? 'completed' : ''));
    const playable = d => PLAYABLE.includes(d?.type);
    const gameById = id => (data.games || []).find(x => x.id === Number(id));
    const dlcsOf = g => (Array.isArray(g?.dlcs) ? g.dlcs : []);
    const num = v => Math.max(0, Number(v) || 0);
    const money = n => `${Math.round(n * 100) / 100} ₴`;
    const hoursText = h => `${Math.round((Number(h) || 0) * 10) / 10} ч`;
    const fmtDate = s => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ''); return m ? `${m[3]}.${m[2]}.${m[1]}` : ''; };
    const todayISO = () => new Date().toISOString().slice(0, 10);

    /** сколько потрачено на саму игру (только реальная цена, без подарков/наборов/подписки) */
    function basePrice(g) {
        if (!g || g.bundleId != null || g.psPlus || g.priceFree || g.priceGift || g.priceCode || g.priceFamily || g.priceBundle || g.priceUnknown) return 0;
        return num(g.price);
    }
    const dlcSpent = g => dlcsOf(g).filter(d => d.owned && !d.free).reduce((s, d) => s + num(d.price), 0);
    window.mhDlcCount = g => dlcsOf(g).filter(d => d.owned).length;

    /* ---------- стили ---------- */
    const css = document.createElement('style');
    css.textContent = `
    #gd-body{position:relative;isolation:isolate}
    #gd-body .gd-cover{width:200px;height:200px;border-radius:24px;box-shadow:0 22px 50px rgba(0,0,0,.7),0 0 0 1px rgba(255,255,255,.12)}
    @media(max-width:640px){#gd-body .gd-cover{width:100%;height:auto;aspect-ratio:1/1;max-width:260px;margin:0 auto}}
    .gdx-tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(112px,1fr));gap:10px;margin-top:20px}
    .gdx-tile{padding:12px 14px;border-radius:16px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);backdrop-filter:blur(8px)}
    .gdx-tile b{display:block;font-size:1.25rem;font-weight:900;color:#fff;line-height:1.15;margin-top:2px}
    .gdx-tile small{display:block;font-size:10px;letter-spacing:.1em;text-transform:uppercase;font-weight:800;color:#6b7280}
    .gdx-tile em{display:block;font-style:normal;font-size:10px;color:#9ca3af;margin-top:2px}
    .gdx-list{display:flex;flex-direction:column;gap:8px}
    .gdx-item{display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:14px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);transition:border-color .2s,background-color .2s}
    .gdx-item.is-owned{border-color:rgba(52,211,153,.35);background:rgba(52,211,153,.06)}
    .gdx-item.is-wish{border-style:dashed}
    .gdx-ico{width:38px;height:38px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:18px;background:rgba(255,255,255,.07);flex-shrink:0}
    .gdx-main{min-width:0;flex:1}
    .gdx-main h4{font-weight:800;font-size:.9rem;color:#fff;overflow-wrap:anywhere}
    .gdx-main p{font-size:11px;color:#9ca3af;margin-top:1px}
    .gdx-acts{display:flex;gap:6px;flex-shrink:0;flex-wrap:wrap;justify-content:flex-end}
    .gdx-btn{padding:5px 10px;border-radius:10px;font-size:11px;font-weight:800;cursor:pointer;color:#d1d5db;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.1);transition:all .2s}
    .gdx-btn:hover{background:rgba(255,255,255,.14)}
    .gdx-btn.is-on{color:#34d399;border-color:rgba(52,211,153,.5);background:rgba(52,211,153,.12)}
    .gdx-form{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px;margin-top:12px;padding:12px;border-radius:14px;background:rgba(255,255,255,.03);border:1px dashed rgba(255,255,255,.14)}
    .gdx-form .wide{grid-column:1/-1}
    .gdx-form select{background:#0d0d14}
    .gdx-empty{font-size:12px;color:#6b7280;padding:6px 2px}
    @media(max-width:520px){.gdx-item{flex-wrap:wrap}.gdx-acts{width:100%;justify-content:flex-start}}
    #gd-body .gd-cover{width:240px;height:240px}
    .gdx-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:12px}
    .gdx-card{position:relative;display:flex;flex-direction:column;border-radius:18px;overflow:hidden;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.09);transition:transform .2s,border-color .2s}
    .gdx-card:hover{transform:translateY(-2px)}
    .gdx-card.is-owned{border-color:rgba(52,211,153,.35)}
    .gdx-card.is-wish{border-style:dashed}
    .gdx-pic{position:relative;aspect-ratio:16/9;background:rgba(255,255,255,.05);display:flex;align-items:center;justify-content:center;font-size:34px;overflow:hidden}
    .gdx-pic img{width:100%;height:100%;object-fit:cover}
    .gdx-badges{position:absolute;left:8px;top:8px;display:flex;gap:4px;flex-wrap:wrap;max-width:90%}
    .gdx-tag{font-size:10px;font-weight:900;padding:3px 8px;border-radius:99px;background:rgba(0,0,0,.7);color:#fff;border:1px solid rgba(255,255,255,.15)}
    .gdx-tag.gift{color:#f9a8d4;border-color:rgba(249,168,212,.5)}
    .gdx-tag.free{color:#86efac;border-color:rgba(134,239,172,.5)}
    .gdx-tag.ok{color:#34d399}
    .gdx-cbody{padding:10px 12px 12px;display:flex;flex-direction:column;gap:6px;flex:1}
    .gdx-cbody h4{font-weight:800;font-size:.92rem;color:#fff;overflow-wrap:anywhere}
    .gdx-cbody p{font-size:11px;color:#9ca3af}
    .gdx-from{display:flex;gap:4px;flex-wrap:wrap;align-items:center}
    .gdx-note{font-size:11px;color:#d1d5db;background:rgba(255,255,255,.04);border-radius:10px;padding:6px 8px;white-space:pre-wrap;overflow-wrap:anywhere}
    .gdx-form .pic{display:flex;gap:10px;align-items:center}
    .gdx-form .pic img{width:96px;height:54px;object-fit:cover;border-radius:10px}
    @media(min-width:1100px){.gd-panel{max-width:1040px!important}}
    .gdx-tag.k-free,.gdx-tag.st-completed{color:#86efac;border-color:rgba(134,239,172,.5)}
    .gdx-tag.k-gift{color:#f9a8d4;border-color:rgba(249,168,212,.5)}
    .gdx-tag.k-family{color:#c4b5fd;border-color:rgba(196,181,253,.5)}
    .gdx-tag.k-code,.gdx-tag.k-bundle,.gdx-tag.k-psplus{color:#67e8f9;border-color:rgba(103,232,249,.45)}
    .gdx-tag.k-unknown,.gdx-tag.st-skipped{color:#9ca3af}
    .gdx-tag.st-playing{color:#60a5fa;border-color:rgba(96,165,250,.5)}
    .gdx-tag.st-backlog{color:#fbbf24;border-color:rgba(251,191,36,.5)}
    .gdx-tag.st-dropped{color:#f87171;border-color:rgba(248,113,113,.5)}
    .gdx-card.is-done{border-color:rgba(250,204,21,.5);box-shadow:0 0 0 1px rgba(250,204,21,.15) inset}
    .gdx-card.is-skipped{opacity:.62}
    .gdx-card.is-skipped:hover{opacity:1}
    .gdx-btn.plat{display:inline-flex;align-items:center;gap:6px}
    .gdx-btn.plat svg,.gdx-btn.plat img{width:16px;height:16px;flex-shrink:0}
    .gdx-flt{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px}
    .gdx-sum{display:flex;flex-wrap:wrap;gap:6px 14px;align-items:center;font-size:11px;color:#9ca3af;margin:-4px 0 12px}
    .gdx-bar{flex:1 1 120px;min-width:90px;max-width:220px;height:6px;border-radius:99px;background:rgba(255,255,255,.08);overflow:hidden}
    .gdx-bar i{display:block;height:100%;border-radius:99px;background:linear-gradient(90deg,#34d399,#facc15)}
    `;
    document.head.appendChild(css);

    let editId = null;      // id редактируемого дополнения
    let formOpen = false;

    /* ---------- сводка ---------- */
    function tilesHTML(g) {
        const dl = dlcsOf(g), owned = dl.filter(d => d.owned).length;
        const spent = basePrice(g) + dlcSpent(g);
        const hrs = num(g.hours);
        const total = num(g.trophyTotal), done = num(g.trophyDone);
        const full = g.trophy === 'full';
        const added = g.id && g.id > 1e12 ? new Date(g.id) : null;
        const days = added ? Math.max(0, Math.floor((Date.now() - added.getTime()) / 864e5)) : null;
        const tiles = [
            (() => {
                const sibs = window.mhGameSiblings ? window.mhGameSiblings(g) : [];
                const all = window.mhGameTotalHours ? window.mhGameTotalHours(g) : hrs;
                if (sibs.length && all > hrs) return ['⏱ Часов во всех версиях', hoursText(all), `эта версия: ${hoursText(hrs)} · версий: ${sibs.length + 1}`];
                return ['⏱ Часов в игре', hrs ? hoursText(hrs) : '—', hrs && owned ? `≈ ${money(spent / hrs)} за час` : ''];
            })(),
            ['🧩 Дополнения', dl.length ? `${owned}<span class="text-gray-500 text-sm font-bold"> / ${dl.length}</span>` : '0', dl.length ? 'есть / всего' : 'пока нет'],
            ...(() => {
                const pl = dl.filter(d => d.owned && playable(d));
                if (!pl.length) return [];
                const dn = pl.filter(d => stOf(d) === 'completed').length;
                return [['🏁 Пройдено', `${dn}<span class="text-gray-500 text-sm font-bold"> / ${pl.length}</span>`, 'сюжетных и допов']];
            })(),
            ['💰 Потрачено', spent ? money(spent) : '—', dlcSpent(g) ? `из них на DLC: ${money(dlcSpent(g))}` : 'игра + дополнения'],
            ...(g.trophy ? [['🏆 Ачивки', full ? '100%' : total ? `${Math.min(100, Math.round(done / total * 100))}%` : `${done}`, total ? `${done} из ${total}` : '']] : []),
            ...(days != null ? [['📅 В коллекции', days < 1 ? 'сегодня' : days < 60 ? `${days} дн.` : `${Math.round(days / 30)} мес.`, added.toLocaleDateString('ru-RU')]] : [])
        ];
        return `<div class="gdx-tiles">${tiles.map(([t, v, s]) => `<div class="gdx-tile"><small>${t}</small><b>${v}</b>${s ? `<em>${s}</em>` : ''}</div>`).join('')}</div>`;
    }

    /* ---------- дополнения ---------- */
    // короткий список «по умолчанию»; кнопка «Все платформы» открывает остальные. Скрытые в настройках не показываются
    const SRC = ['Steam', 'Epic Games', 'GOG', 'PlayStation 4', 'PlayStation 5', 'Xbox One', 'Xbox Series', 'Nintendo Switch', 'PC CD/DVD', 'Другое'];
    const pill = n => window.mhPlatLogo ? window.mhPlatLogo.pill(n) : `<span class="gdx-tag">${esc(n)}</span>`;
    const stars = n => '★'.repeat(n) + '☆'.repeat(5 - n);
    let formImg = '';        // картинка в форме (dataURL)
    let formFrom = [];       // платформы-источники в форме
    let formKind = '';       // как получено: '' = куплено, иначе ключ из KINDS
    let formApprox = false;  // цена примерная
    let formMore = false;    // показать все платформы
    let flt = 'all';         // фильтр списка: all | owned | wish | ключ статуса

    /** платформы для выбора — синхронно с «Настройки → Игры → Платформы» */
    function platChoices(g) {
        const G = window.mhGamePlat, pr = data.platPrefs || {};
        const hidP = pr.hiddenPlats || [], hidF = pr.hiddenFams || [];
        const all = G ? G.PLATFORMS.map(x => x[0]) : SRC;
        const famOf = n => ((G ? G.PLATFORMS.find(x => x[0] === n) : null) || [])[2] || 'other';
        const hidden = n => hidP.includes(n) || (famOf(n) !== 'other' && hidF.includes(famOf(n)));
        const keep = [g.platform, ...formFrom].filter(Boolean);             // уже выбранные остаются, даже если платформу скрыли
        const set = new Set([...(formMore ? all : SRC).filter(n => !hidden(n)), ...keep]);
        return { list: [...all.filter(n => set.has(n)), ...[...set].filter(n => !all.includes(n))], hidden };
    }
    const priceText = d => { const n = num(d.price); return n ? `${d.approx ? '~' : ''}${money(n)}` : (d.owned && !kindOf(d) ? 'без цены' : ''); };

    function dlcItemHTML(d, g) {
        const t = TYPES[d.type] || TYPES.dlc;
        const from = Array.isArray(d.from) && d.from.length ? d.from : (g && g.platform ? [g.platform] : []);   // пусто → платформа самой версии
        const others = (window.mhDlcOtherVersions && g ? window.mhDlcOtherVersions(g, d) : []);
        const k = kindOf(d), st = stOf(d), S = st ? ST[st] : null;
        const meta = [t.label, k ? '' : priceText(d), d.date ? fmtDate(d.date) : ''].filter(Boolean).map(esc).join(' · ');
        const link = d.url && /^https?:\/\//i.test(d.url) ? d.url : '';
        const who = d.giftFrom && (k === 'gift' || k === 'family') ? `<p>${k === 'gift' ? '🎁 от' : '👨‍👩‍👧 аккаунт'}: ${esc(d.giftFrom)}</p>` : '';
        const showSt = playable(d) || !!st;
        return `<div class="gdx-card ${d.owned ? 'is-owned' : 'is-wish'}${st === 'completed' ? ' is-done' : ''}${st === 'skipped' ? ' is-skipped' : ''}" data-dlc="${esc(d.id)}">
            <div class="gdx-pic">${d.img ? `<img src="${esc(d.img)}" alt="" loading="lazy">` : t.ico}
                <div class="gdx-badges">${d.owned ? '<span class="gdx-tag ok">✓ Есть</span>' : '<span class="gdx-tag">🛒 Хочу купить</span>'}${S ? `<span class="gdx-tag st-${st}">${S.ico} ${S.label}</span>` : ''}${k ? `<span class="gdx-tag k-${k}">${KINDS[k].ico} ${KINDS[k].short}</span>` : ''}</div>
            </div>
            <div class="gdx-cbody">
                <h4>${esc(d.title)}${d.rating ? ` <span class="text-yellow-400 text-xs">${stars(d.rating)}</span>` : ''}</h4>
                <p>${meta}</p>
                ${who}
                ${from.length ? `<div class="gdx-from"><span class="text-[10px] text-gray-500">из</span>${from.map(pill).join('')}</div>` : ''}
                ${others.length ? `<div class="gdx-from"><span class="text-[10px] text-gray-500">на других версиях</span>${others.map(o => `${pill(o.platform)}<span class="text-[11px] font-black" style="color:${o.owned ? '#34d399' : '#9ca3af'}">${o.owned ? '✓' : '✗'}</span>`).join('')}</div>` : ''}
                ${d.note ? `<div class="gdx-note">${esc(d.note)}</div>` : ''}
                <div class="gdx-acts mt-auto" style="justify-content:flex-start">
                    <button type="button" class="gdx-btn${d.owned ? ' is-on' : ''}" data-act="dlc-own" aria-pressed="${!!d.owned}" title="Есть ли дополнение в библиотеке">${d.owned ? '✓ Есть' : '🛒 Хочу купить'}</button>
                    ${showSt ? `<button type="button" class="gdx-btn${st === 'completed' ? ' is-on' : ''}" data-act="dlc-status" title="Статус прохождения — нажми, чтобы сменить">${S ? `${S.ico} ${S.label}` : '＋ Статус'}</button>` : ''}
                    ${link ? `<a class="gdx-btn" href="${esc(link)}" target="_blank" rel="noopener noreferrer" title="Ссылка">🔗</a>` : ''}
                    <button type="button" class="gdx-btn" data-act="dlc-edit" aria-label="Изменить">✏️</button>
                    <button type="button" class="gdx-btn" data-act="dlc-del" aria-label="Удалить">✕</button>
                </div></div></div>`;
    }

    function formHTML(g) {
        const d = editId ? dlcsOf(g).find(x => x.id === editId) : null;
        const cur = draft || {};
        const type = cur.type ?? d?.type ?? 'dlc';
        const owned = cur.owned ?? (!d || !!d.owned);
        const stNow = cur.status ?? (d ? stOf(d) : '');
        const canPlay = PLAYABLE.includes(type);
        const stKeys = Object.keys(ST).filter(k => owned || !NEED_OWNED.includes(k));
        const ps = [g.platform, ...formFrom].some(p => PS_RE.test(p || ''));
        const kinds = Object.entries(KINDS).filter(([k]) => k !== 'psplus' || ps || formKind === 'psplus');
        const who = formKind === 'gift' || formKind === 'family';
        const L = window.mhPlatLogo, pc = platChoices(g);
        return `<div class="gdx-form" id="gdx-form">
            <input id="gdx-title" class="gd-input wide" maxlength="80" placeholder="Название дополнения" value="${esc(d?.title || '')}">
            <div class="wide pic">${formImg ? `<img src="${esc(formImg)}" alt="">` : '<span class="text-2xl">🖼️</span>'}
                <button type="button" class="gd-tool" data-act="dlc-img">${formImg ? 'Заменить картинку' : '＋ Картинка / обложка'}</button>
                ${formImg ? '<button type="button" class="gd-tool" data-act="dlc-imgdel">Убрать</button>' : ''}</div>
            <select id="gdx-type" class="gd-input" aria-label="Тип">${Object.entries(TYPES).map(([k, v]) => `<option value="${k}"${type === k ? ' selected' : ''}>${v.ico} ${v.label}</option>`).join('')}</select>
            <select id="gdx-status" class="gd-input" aria-label="Статус прохождения"${canPlay ? '' : ' style="display:none"'}><option value="">🚦 Статус: не задан</option>${stKeys.map(k => `<option value="${k}"${stNow === k ? ' selected' : ''}>${ST[k].ico} ${ST[k].label}</option>`).join('')}</select>
            <div class="wide"><p class="text-[11px] text-gray-500 mb-1">Как получено:</p>
                <div class="flex flex-wrap gap-2">
                    <button type="button" class="gdx-btn${!formKind ? ' is-on' : ''}" data-act="dlc-kind" data-v="">💳 Куплено</button>
                    ${kinds.map(([k, v]) => `<button type="button" class="gdx-btn${formKind === k ? ' is-on' : ''}" data-act="dlc-kind" data-v="${k}">${v.ico} ${esc(v.label)}</button>`).join('')}
                    ${formKind ? '' : `<button type="button" class="gdx-btn${formApprox ? ' is-on' : ''}" data-act="dlc-approx">≈ Цена примерная</button>`}
                </div></div>
            <input id="gdx-price" class="gd-input" type="number" min="0" step="any" placeholder="${formKind ? esc(KINDS[formKind].label) : 'Цена, ₴'}" value="${d?.price || ''}"${formKind ? ' disabled' : ''}>
            <input id="gdx-giftfrom" class="gd-input" maxlength="60" placeholder="${formKind === 'family' ? 'Чей аккаунт (друг)' : 'От кого подарок'}" value="${esc(d?.giftFrom || '')}"${who ? '' : ' style="display:none"'}>
            <input id="gdx-date" class="gd-input" type="date" value="${esc(d?.date || '')}" aria-label="Дата получения">
            <select id="gdx-rating" class="gd-input"><option value="0">★ Оценка: нет</option>${[1, 2, 3, 4, 5].map(n => `<option value="${n}"${d?.rating === n ? ' selected' : ''}>${stars(n)}</option>`).join('')}</select>
            <input id="gdx-url" class="gd-input wide" placeholder="Ссылка (магазин, гайд…)" value="${esc(d?.url || '')}">
            <div class="wide"><p class="text-[11px] text-gray-500 mb-1">Откуда дополнение (платформы):</p>
                <div class="flex flex-wrap gap-2">${pc.list.map(p => `<button type="button" class="gdx-btn plat${formFrom.includes(p) ? ' is-on' : ''}" data-act="dlc-from" data-v="${esc(p)}"${pc.hidden(p) ? ' title="Скрыта в настройках платформ"' : ''}>${L ? L.svg(p, 16) : ''}${esc(p)}</button>`).join('')}
                    <button type="button" class="gdx-btn" data-act="dlc-more">${formMore ? '↑ Меньше' : '＋ Все платформы'}</button></div>
                <p class="text-[10px] text-gray-600 mt-1">Список синхронизирован с «Настройки → Игры → Платформы».</p></div>
            <textarea id="gdx-note" class="gd-input wide" rows="2" maxlength="400" placeholder="Заметка">${esc(d?.note || '')}</textarea>
            <label class="text-xs text-gray-400 flex items-center gap-2"><input id="gdx-owned" type="checkbox" ${owned ? 'checked' : ''} style="accent-color:var(--theme-btn,#8b5cf6)"> Уже есть в библиотеке</label>
            <div class="wide flex gap-2"><button type="button" class="gd-tool" data-act="dlc-save">${d ? '💾 Сохранить' : '＋ Добавить'}</button><button type="button" class="gd-tool" data-act="dlc-cancel">Отмена</button></div>
        </div>`;
    }

    function sectionHTML(g) {
        const dl = dlcsOf(g);
        const ownedN = dl.filter(d => d.owned).length;
        const play = dl.filter(d => d.owned && playable(d));
        const doneN = play.filter(d => stOf(d) === 'completed').length;
        const spent = dlcSpent(g);
        const counts = { all: dl.length, owned: ownedN, wish: dl.length - ownedN };
        Object.keys(ST).forEach(k => { counts[k] = dl.filter(d => stOf(d) === k).length; });
        if (!(counts[flt] > 0)) flt = 'all';
        const shown = dl.filter(d => flt === 'all' || (flt === 'owned' ? d.owned : flt === 'wish' ? !d.owned : stOf(d) === flt));
        const sorted = [...shown].sort((a, b) => (b.owned - a.owned) || String(a.date || '9').localeCompare(String(b.date || '9')));
        const chips = dl.length >= 3 ? [['all', 'Все'], ['owned', '✓ Есть'], ['wish', '🛒 Хочу купить'], ...Object.entries(ST).map(([k, v]) => [k, `${v.ico} ${v.label}`])]
            .filter(([k]) => counts[k] > 0)
            .map(([k, l]) => `<button type="button" class="gdx-btn${flt === k ? ' is-on' : ''}" data-act="dlc-flt" data-v="${k}">${esc(l)} <span style="opacity:.6">${counts[k]}</span></button>`).join('') : '';
        const sum = [play.length ? `🏁 пройдено <b class="text-white">${doneN}</b> из ${play.length}` : '', spent ? `💰 на DLC: <b class="text-white">${money(spent)}</b>` : ''].filter(Boolean);
        return `<div class="gd-sec mt-5" id="gdx-dlc">
            <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
                <p class="gd-sec-title mb-0">🧩 Дополнения и DLC${dl.length ? ` · ${ownedN}/${dl.length}` : ''}</p>
                ${formOpen ? '' : '<button type="button" class="gd-tool" data-act="dlc-new">＋ Добавить дополнение</button>'}
            </div>
            ${sum.length ? `<div class="gdx-sum">${sum.map(x => `<span>${x}</span>`).join('')}${play.length ? `<span class="gdx-bar" title="Пройдено ${doneN} из ${play.length}"><i style="width:${Math.round(doneN / play.length * 100)}%"></i></span>` : ''}</div>` : ''}
            ${chips ? `<div class="gdx-flt">${chips}</div>` : ''}
            ${sorted.length ? `<div class="gdx-grid">${sorted.map(d => dlcItemHTML(d, g)).join('')}</div>`
                : '<p class="gdx-empty">Дополнений пока нет. Появилось DLC, сезонный пропуск или саундтрек — добавьте сюда. Подарки, бесплатные, из семьи/аккаунта друга, по коду и из наборов в «потрачено» не считаются.</p>'}
            ${formOpen ? formHTML(g) : ''}
        </div>`;
    }

    function pickImage() {
        const inp = document.createElement('input');
        inp.type = 'file'; inp.accept = 'image/*';
        inp.onchange = () => {
            const f = inp.files && inp.files[0]; if (!f) return;
            const r = new FileReader();
            r.onload = () => {
                const im = new Image();
                im.onload = () => {
                    const k = Math.min(1, 640 / Math.max(im.width, im.height));
                    const c = document.createElement('canvas'); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
                    c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
                    formImg = c.toDataURL('image/jpeg', 0.82); keepForm(); refresh();
                };
                im.src = r.result;
            };
            r.readAsDataURL(f);
        };
        inp.click();
    }
    // перед перерисовкой формы запоминаем введённое
    let draft = null;
    function keepForm() {
        const f = $('gdx-form'); if (!f) return;
        draft = { title: $('gdx-title').value, type: $('gdx-type').value, status: $('gdx-status').value, price: $('gdx-price').value, giftFrom: $('gdx-giftfrom').value,
            date: $('gdx-date').value, rating: $('gdx-rating').value, url: $('gdx-url').value, note: $('gdx-note').value, owned: $('gdx-owned').checked };
    }
    function restoreForm() {
        if (!draft || !$('gdx-form')) return;
        const m = { title: 'gdx-title', type: 'gdx-type', price: 'gdx-price', giftFrom: 'gdx-giftfrom', date: 'gdx-date', rating: 'gdx-rating', url: 'gdx-url', note: 'gdx-note' };
        Object.entries(m).forEach(([k, id]) => { $(id).value = draft[k]; });
        const sel = $('gdx-status');
        sel.value = [...sel.options].some(o => o.value === draft.status) ? draft.status : '';
        $('gdx-owned').checked = draft.owned;
    }

    /* ---------- вставка в страницу игры ---------- */
    function decorate() {
        const body = $('gd-body');
        if (!body || !body.firstElementChild || body.querySelector('#gdx-dlc')) return;
        const modal = $('game-detail-modal');
        const g = modal && !modal.classList.contains('hidden') ? currentGame() : null;
        if (!g) return;
        // плитки — сразу под шапкой
        const head = body.querySelector(':scope > .flex');
        if (head && !body.querySelector('.gdx-tiles')) head.insertAdjacentHTML('afterend', tilesHTML(g));
        // дополнения — перед прохождением, чтобы были на виду
        const first = body.querySelector(':scope > .gd-sec');
        const sec = document.createElement('div');
        sec.innerHTML = sectionHTML(g);
        if (first) first.before(sec.firstElementChild); else body.appendChild(sec.firstElementChild);
    }

    // какая игра открыта: берём по заголовку + платформе нельзя, поэтому ловим id из кнопок страницы
    function currentGame() {
        const el = document.querySelector('#gd-body [data-act="share"][data-id]');
        return el ? gameById(el.dataset.id) : null;
    }

    function refresh(fresh) {
        const g = currentGame();
        if (!g) return;
        if (formOpen && !fresh) keepForm();   // не терять набранное при любых перерисовках (кроме открытия новой формы)
        const old = $('gdx-dlc');
        const tiles = document.querySelector('#gd-body .gdx-tiles');
        if (tiles) tiles.outerHTML = tilesHTML(g);
        if (old) { const t = document.createElement('div'); t.innerHTML = sectionHTML(g); old.replaceWith(t.firstElementChild); restoreForm(); }
    }

    function persist() {
        try { window.mhAchSyncAll && window.mhAchSyncAll(); } catch (_) {}   // «куплено» у DLC влияет на зачёт групп ачивок (46-game-achievements.js)
        try { checkAchievements(); } catch (_) {}
        const ok = persistData();
        try { updateUI(); } catch (_) {}
        return ok;
    }

    function init() {
        const body = $('gd-body');
        const modal = $('game-detail-modal');
        if (!body || !modal) return;
        new MutationObserver(() => decorate()).observe(body, { childList: true });
        modal.addEventListener('click', e => {
            const a = e.target.closest('[data-act^="dlc-"]');
            if (!a) return;
            const g = currentGame();
            if (!g) return;
            const row = a.closest('[data-dlc]');
            const act = a.dataset.act;
            const d = row ? dlcsOf(g).find(x => x.id === row.dataset.dlc) : null;
            switch (a.dataset.act) {
                case 'dlc-img': pickImage(); break;
                case 'dlc-imgdel': keepForm(); formImg = ''; refresh(); break;
                case 'dlc-from': { keepForm(); const v = a.dataset.v; formFrom = formFrom.includes(v) ? formFrom.filter(x => x !== v) : [...formFrom, v]; refresh(); break; }
                case 'dlc-kind': { keepForm(); const v = a.dataset.v; formKind = v && formKind !== v ? v : ''; if (formKind) formApprox = false; refresh(); break; }
                case 'dlc-approx': keepForm(); formApprox = !formApprox; refresh(); break;
                case 'dlc-more': keepForm(); formMore = !formMore; refresh(); break;
                case 'dlc-flt': flt = a.dataset.v || 'all'; refresh(); break;
                case 'dlc-new': editId = null; formOpen = true; formImg = ''; draft = null; formKind = ''; formApprox = false; formMore = false; formFrom = g.platform ? [g.platform] : []; refresh(true); $('gdx-title')?.focus(); break;
                case 'dlc-cancel': editId = null; formOpen = false; draft = null; refresh(true); break;
                case 'dlc-edit': if (d) { editId = d.id; formOpen = true; draft = null; formImg = d.img || ''; formKind = kindOf(d); formApprox = !!d.approx && !formKind; formMore = false; formFrom = Array.isArray(d.from) ? [...d.from] : []; refresh(true); $('gdx-title')?.focus(); } break;
                case 'dlc-own':
                    if (d) {
                        d.owned = !d.owned;
                        if (d.owned && !d.date) d.date = todayISO();
                        if (!d.owned && NEED_OWNED.includes(stOf(d))) { d.status = ''; d.done = false; }   // без дополнения его не пройти
                        persist(); refresh();
                    }
                    break;
                case 'dlc-status':
                    if (d) {
                        const seq = ['', ...Object.keys(ST).filter(k => d.owned || !NEED_OWNED.includes(k))];
                        const next = seq[(Math.max(0, seq.indexOf(stOf(d))) + 1) % seq.length];
                        d.status = next; d.done = next === 'completed';
                        persist(); refresh();
                    }
                    break;
                case 'dlc-del':
                    if (d) {
                        const idx = g.dlcs.indexOf(d);
                        g.dlcs = g.dlcs.filter(x => x !== d);
                        persist(); refresh();
                        showToast(`Дополнение «${d.title}» удалено`);
                        window.__mhLastDlc = { gid: g.id, d, idx };
                    }
                    break;
                case 'dlc-save': {
                    const title = $('gdx-title').value.trim();
                    if (!title) { showToast('Введите название дополнения', 'error'); $('gdx-title').focus(); break; }
                    const rec = {
                        title,
                        type: $('gdx-type').value,
                        price: num($('gdx-price').value),
                        approx: formApprox,
                        date: $('gdx-date').value || '',
                        owned: $('gdx-owned').checked,
                        img: formImg || '',
                        from: [...formFrom],
                        free: formKind,
                        giftFrom: $('gdx-giftfrom').value.trim(),
                        rating: Math.min(5, num($('gdx-rating').value)),
                        url: $('gdx-url').value.trim(),
                        note: $('gdx-note').value.trim()
                    };
                    if (rec.free) { rec.price = 0; rec.approx = false; }
                    if (rec.free !== 'gift' && rec.free !== 'family') rec.giftFrom = '';
                    // статус прохождения — только у сюжетных/играбельных, и только если дополнение есть
                    rec.status = playable(rec) ? $('gdx-status').value : '';
                    if (!rec.owned && NEED_OWNED.includes(rec.status)) rec.status = '';
                    rec.done = rec.status === 'completed';
                    if (rec.owned && !rec.date) rec.date = todayISO();
                    if (!Array.isArray(g.dlcs)) g.dlcs = [];
                    if (editId) { const ex = g.dlcs.find(x => x.id === editId); if (ex) Object.assign(ex, rec); }
                    else g.dlcs.push({ id: 'd' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), ...rec });
                    editId = null; formOpen = false; draft = null; formImg = '';
                    persist(); refresh(true);
                    showToast('Дополнение сохранено 🧩', 'success');
                    break;
                }
            }
        });
        // тип и «есть в библиотеке» меняют набор полей формы (статус прохождения)
        modal.addEventListener('change', e => { if (e.target.id === 'gdx-type' || e.target.id === 'gdx-owned') { keepForm(); refresh(); } });
        // Enter в поле названия = добавить
        modal.addEventListener('keydown', e => {
            if (e.key === 'Enter' && e.target.id === 'gdx-title') { e.preventDefault(); modal.querySelector('[data-act="dlc-save"]')?.click(); }
        });
        // при закрытии страницы сбрасываем форму
        new MutationObserver(() => { if (modal.classList.contains('hidden')) { editId = null; formOpen = false; flt = 'all'; draft = null; } })
            .observe(modal, { attributes: true, attributeFilter: ['class'] });
    }

    if (document.getElementById('gd-body')) init();
    else document.addEventListener('DOMContentLoaded', init);
})();
