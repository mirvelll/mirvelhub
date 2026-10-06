/* =========================================================
   MIRVEL HUB — 13-extras.js (подключать после 12-app.js)
   1. Быстрое добавление списком (кнопка ＋, клавиша N, Ctrl+K)
   2. «Пластинка дня» на главной
   ========================================================= */
(() => {
    /* ---------- Быстрое добавление ---------- */
    const QA_TYPES = [
        { id: 'auto', label: 'Авто', icon: '✨' },
        { id: 'cds', label: 'CD', icon: '💿' },
        { id: 'vinyls', label: 'Винил', icon: '💽' },
        { id: 'games', label: 'Игра', icon: '🎮' },
        { id: 'stuff', label: 'Вещь', icon: '📦' },
        { id: 'wishlists', label: 'Желаемое', icon: '🎁' }
    ];
    const ICON = Object.fromEntries(QA_TYPES.map(t => [t.id, t.icon]));
    const W = src => new RegExp(`(?<![\\p{L}\\d])(?:${src})(?![\\p{L}\\d])`, 'iu');
    const VINYL = W('2?lp|vinyl|винил\\p{L}*|пластинк\\p{L}*');
    const CD = W('cd|сд|компакт\\p{L}*');
    // [шаблон, название, надёжно ли определять в режиме «Авто»] — «ds», «gb», «gba», «dc» слишком похожи на обычные слова
    const PLATFORMS = [
        [W('ps ?1|psx|playstation ?1'), 'PlayStation 1', 1], [W('ps ?2|playstation ?2'), 'PlayStation 2', 1],
        [W('ps ?3|playstation ?3'), 'PlayStation 3', 1], [W('ps ?4|playstation ?4'), 'PlayStation 4', 1],
        [W('ps ?5|playstation ?5'), 'PlayStation 5', 1], [W('psp'), 'PSP', 1], [W('ps ?vita|vita'), 'PS Vita', 1],
        [W('xbox ?360'), 'Xbox 360', 1], [W('xbox ?one'), 'Xbox One', 1], [W('xbox ?series'), 'Xbox Series', 1], [W('xbox'), 'Xbox', 1],
        [W('gc|gamecube'), 'Nintendo GameCube', 1], [W('wii ?u'), 'Nintendo Wii U', 1], [W('wii'), 'Nintendo Wii', 1],
        [W('switch ?2'), 'Nintendo Switch 2', 1], [W('switch'), 'Nintendo Switch', 1],
        [W('3ds'), 'Nintendo 3DS', 1], [W('ds'), 'Nintendo DS', 0], [W('n64|nintendo ?64'), 'Nintendo 64', 1], [W('snes'), 'SNES', 1],
        [W('gba'), 'Game Boy Advance', 0], [W('gb'), 'Game Boy', 0],
        [W('dreamcast'), 'Sega Dreamcast', 1], [W('dc'), 'Sega Dreamcast', 0], [W('mega ?drive|genesis'), 'Sega Mega Drive', 1], [W('saturn'), 'Sega Saturn', 1],
        [W('steam'), 'Steam', 1], [W('epic( games)?'), 'Epic Games', 0], [W('gog'), 'GOG', 1],
        [W('pc'), 'PC CD/DVD', 1]
    ];
    const REGION_RE = W('region ?free|ntsc-?j|ntsc-?u|ntsc|pal');
    const REGION_MAP = { pal: 'PAL', ntscu: 'NTSC-U', ntscj: 'NTSC-J', ntsc: 'NTSC', regionfree: 'Region Free' };
    const DIGITAL_RE = W('digital|цифр\\p{L}*|eshop|psn');
    const DIGITAL_PLATFORMS = ['Steam', 'Epic Games', 'GOG'];
    const NO_REGION = ['Steam'];                       // у Steam региона нет — поле «Регион» не показываем и в игру не пишем
    const PS_RE = /playstation|^ps\d?\b|\bpsp\b|vita/i;
    /* Что можно написать вместо цены (в конце строки): бесплатно, подарок, код, не помню, в наборе, PS Plus */
    const KIND_WORDS = {
        free: 'бесплатно|free',
        gift: 'подарок|подарил\\p{L}*|подарен\\p{L}*|gift',
        family: 'семья|семейн\\p{L}*|в\\s+семье|family(?:\\s+sharing)?|шеринг|аккаунт\\s+друга|у\\s+друга',
        code: 'активирован\\p{L}*(?:\\s+(?:по\\s+)?код\\p{L}*)?|по\\s+коду|кодом|activated(?:\\s+by)?\\s+code|redeemed',
        unknown: 'не\\s+помню',
        bundle: 'в\\s+наборе|в\\s+бандле|bundle',
        psplus: 'ps\\s*plus|psplus'
    };
    const SEP = '(?:\\s*[,;|]\\s*|\\s+)';
    const KIND_END = Object.fromEntries(Object.entries(KIND_WORDS).map(([k, src]) => [k, new RegExp(`${SEP}(?:${src})\\s*$`, 'iu')]));
    /* часы: «2.1 часа», «10 ч», «5h», «сыграно 3.5», «2 часа сыграно» — любые дроби, не только .5 */
    const HOURS_END = new RegExp(`${SEP}(?:(?:сыграно|наиграно)\\s*)?(\\d+(?:[.,]\\d+)?)\\s*(?:ч(?![\\p{L}\\d])|час\\p{L}*|h(?![\\p{L}\\d])|hrs?(?![\\p{L}\\d])|hours?(?![\\p{L}\\d]))(?:\\s*(?:сыграно|наиграно))?\\s*$`, 'iu');
    const HOURS_WORD_END = new RegExp(`${SEP}(?:сыграно|наиграно)\\s*(\\d+(?:[.,]\\d+)?)\\s*$`, 'iu');
    /* «16/17» (получено/всего), по желанию со словом «ачивки / трофеи / достижения» перед числом. Даты вроде 12/05/2024 не трогаем */
    const TROPHY_RE = /(?:(?:ачивк\p{L}*|трофе\p{L}*|достижен\p{L}*|achievements?|trophies)\s*[:\-]?\s*)?(?<![\d\/.])(\d{1,4})\s*\/\s*(\d{1,4})(?![\d\/])(?:\s*(?:ачивк\p{L}*|трофе\p{L}*|достижен\p{L}*|achievements?|trophies))?/iu;
    const PLATINUM_RE = W('платин\\p{L}*|platinum|100%\\s*ачивок');
    /* Набор: строка «Набор: Название платформа, цена», ниже — игры набора по одной в строке, пустая строка завершает набор */
    const BUNDLE_RE = /^\s*(?:набор|пак|бандл|комплект|сет|bundle|pack)\s*[:：]\s*(.+?)\s*$/iu;
    const BULLET_RE = /^\s*(?:[-–—•*+]|\d{1,2}[.)])\s+/;
    const SET_KINDS = ['free', 'gift', 'family', 'code'];     // как получен весь набор (вместо цены)
    const SET_KIND_LABEL = { free: '🆓 Бесплатно', gift: '🎁 Подарок', family: '👨‍👩‍👧 Семья', code: '🔑 Кодом' };
    const setPriceText = b => b.kind ? SET_KIND_LABEL[b.kind] : b.unknown ? 'цена неизвестна' : `${b.approx ? '~' : ''}${b.price} ₴`;
    const KIND_OPTIONS = [['', 'Из текста строки'], ['free', '🆓 Бесплатно'], ['gift', '🎁 Подарок'], ['family', '👨‍👩‍👧 Семья'], ['code', '🔑 Активировано кодом'], ['unknown', 'Не помню'], ['bundle', 'В наборе']];
    const kindFlags = p => ({ priceFree: p.kind === 'free', priceGift: p.kind === 'gift', priceFamily: p.kind === 'family', priceCode: p.kind === 'code', priceUnknown: p.kind === 'unknown', priceBundle: p.kind === 'bundle', psPlus: p.kind === 'psplus' });
    const GAME_STATUSES = [['', 'Без статуса'], ['backlog', '🗓 В планах'], ['playing', '▶ В процессе'], ['completed', '✔ Пройдено'],
        ['online', '🌐 Онлайн-игра'], ['sandbox', '🏖 Песочница'], ['dropped', '⏸ Заброшено'], ['skipped', '💤 Не в планах'], ['app', '🧩 Приложение']];
    const STATUS_LABEL = Object.fromEntries(GAME_STATUSES);
    const REGIONS = ['PAL', 'NTSC-U', 'NTSC-J', 'NTSC', 'Region Free'];
    const CONDITIONS = ['M', 'NM', 'VG+', 'VG', 'G+', 'G', 'F', 'P'];
    const PRIORITIES = [['', 'Без приоритета'], ['🔥 Высокий', '🔥 Высокий'], ['⚡ Средний', '⚡ Средний'], ['⏳ Низкий', '⏳ Низкий']];
    const HELP = {
        auto: 'Одна строка — одна позиция: «Исполнитель - Название, цена». «Авто» — это не ИИ, а простой разбор текста прямо в браузере, поэтому работает без интернета и на GitHub Pages. Слова LP, винил, PS2, Switch сами определяют тип. Год — в скобках: (1991). Цена: «650», «~650» (примерная), «бесплатно», «подарок», «не помню», «в наборе».',
        games: 'Одна строка — одна игра: «Название платформа (год), цена». Платформа, регион и «digital» читаются из текста: «Silent Hill 2 ps2 PAL (2001), 900». Что не указано в строке — берётся из полей выше. Цена: «900», «~900» (примерная). Вместо цены можно написать «бесплатно», «подарок», «семья», «активировано кодом», «не помню» или «в наборе». Часы: «2.1 часа», «10 ч». Ачивки: «16/17» (получено/всего) или «платина». Набор: строка «Набор: Сталкер Трилогия steam, 95», под ней игры набора по одной в строке, пустая строка — конец набора. Цена набора считается один раз; если цены не помнишь — просто не пиши её.',
        other: 'Одна строка — одна позиция: «Исполнитель - Название, цена». Год — в скобках: (1991). Цена: «650», «~650» (примерная), «бесплатно», «подарок», «не помню», «в наборе».'
    };
    const HOLDER = {
        auto: 'Nirvana - Nevermind, 650\nKendrick Lamar - GNX LP, 1800\nSilent Hill 2 ps2, 900',
        games: 'Silent Hill 2 ps2 PAL (2001), 900, 12/48\nZelda: Tears of the Kingdom switch, ~1800\nHades steam, бесплатно, 2.1 ч, 16/17\nPortal 2 steam, семья, 51/51\n\nНабор: Сталкер Трилогия steam, 95\nS.T.A.L.K.E.R.: Shadow of Chernobyl\nS.T.A.L.K.E.R.: Clear Sky\nS.T.A.L.K.E.R.: Call of Pripyat',
        other: 'Nirvana - Nevermind, 650\nRadiohead - OK Computer (1997), ~900\nPink Floyd - The Wall, подарок'
    };
    const OPTS_KEY = 'mirvel_qa_opts';
    // поля над строками: запоминаем только то, что обычно не меняется (платформа, регион, состояние)
    const qaOpts = { platform: '', region: '', condition: 'NM', status: '', digital: false, priority: '', kind: '' };
    try { const o = JSON.parse(localStorage.getItem(OPTS_KEY) || '{}'); ['platform', 'region', 'condition'].forEach(k => { if (typeof o[k] === 'string') qaOpts[k] = o[k]; }); } catch (e) {}
    const saveOpts = () => { try { localStorage.setItem(OPTS_KEY, JSON.stringify({ platform: qaOpts.platform, region: qaOpts.region, condition: qaOpts.condition })); } catch (e) {} };
    const SHOP_KEY = 'mirvel_qa_shop';
    let qaMode = 'auto';
    let lastAdded = [], lastBundles = [], lastXp = 0;

    function parseLine(raw, mode, isSetName) {
        let s = raw.trim();
        if (!s) return null;
        let url = '', price = 0, year = '', approx = false, kind = '', region = '', digital = false, hours = 0, hadPrice = false;
        s = s.replace(/https?:\/\/\S+/i, m => { url = m; return ' '; });

        /* ачивки / трофеи: «16/17», «ачивки 16/17», «трофеи 3/50», «платина» — в любом месте строки (только для игр) */
        let trophy = '', trophyDone = 0, trophyTotal = 0;
        if (mode === 'auto' || mode === 'games') {
            const tm = s.match(TROPHY_RE);
            if (tm) {
                trophyDone = parseInt(tm[1], 10); trophyTotal = parseInt(tm[2], 10);
                trophy = trophyTotal > 0 && trophyDone >= trophyTotal ? 'full' : 'some';
                s = s.replace(tm[0], ' ');
            } else if (PLATINUM_RE.test(s)) {
                trophy = 'full';
                s = s.replace(PLATINUM_RE, ' ');
            }
            // после вырезания не должно остаться «висячих» запятых — иначе цена и пометки в конце строки не распознаются
            if (trophy) s = s.replace(/\s*[,;|]\s*(?:[,;|]\s*)+/g, ', ').replace(/[\s,;|]+$/, '');
        }

        const takePrice = re => {
            const m = s.match(re);
            if (!m) return false;
            approx = !!m[1];   // «~650» / «≈650»
            price = parseFloat(m[2].replace(/\s/g, '').replace(',', '.')) || 0;
            hadPrice = true;
            s = s.slice(0, m.index);
            return true;
        };
        // с конца строки по одной снимаем «хвосты» в любом порядке: пометка (бесплатно / подарок / код / не помню / в наборе), часы, цена
        for (let guard = 0; guard < 8; guard++) {
            let hit = false;
            if (!kind) {
                for (const k in KIND_END) {
                    const m = s.match(KIND_END[k]);
                    if (m) { kind = k; s = s.slice(0, m.index); hit = true; break; }
                }
            }
            if (hit) continue;
            if (!hours && (mode === 'auto' || mode === 'games')) {
                const m = s.match(HOURS_END) || s.match(HOURS_WORD_END);
                if (m) { hours = parseFloat(m[1].replace(',', '.')) || 0; s = s.slice(0, m.index); continue; }
            }
            if (!hadPrice && (
                takePrice(/\s*[,;|]\s*([~≈])?\s*(\d[\d ]*(?:[.,]\d+)?)\s*(?:₴|грн\.?|uah)?\s*$/i) ||
                takePrice(/\s+([~≈])?\s*(\d[\d ]*(?:[.,]\d+)?)\s*(?:₴|грн\.?|uah)\s*$/i))) continue;
            break;
        }
        if (kind) { price = 0; approx = false; }

        const ym = s.match(/\((\d{4})\)/);
        if (ym && +ym[1] > 1900 && +ym[1] < 2100) { year = +ym[1]; s = s.replace(ym[0], ' '); }

        let type = mode, platform = '';
        if (mode === 'auto' || mode === 'games') {
            let found = false;
            if (isSetName) {   // название набора: платформа убирается, только если стоит в конце («… steam»); «PS4 игры» остаётся названием
                for (const [re, name] of PLATFORMS) {
                    const endRe = new RegExp(`(?:${re.source})\\s*$`, re.flags);
                    if (endRe.test(s)) { platform = name; s = s.replace(endRe, ' '); found = true; break; }
                }
                if (!found) for (const [re, name] of PLATFORMS) { if (re.test(s)) { platform = name; found = true; break; } }
            }
            if (!found) for (const [re, name, sure] of PLATFORMS) {
                if (mode === 'auto' && !sure) continue;
                if (re.test(s)) { platform = name; s = s.replace(re, ' '); if (mode === 'auto') type = 'games'; break; }
            }
        }
        if (type === 'games') {
            const rm = s.match(REGION_RE);
            if (rm) { region = REGION_MAP[rm[0].toLowerCase().replace(/[\s-]/g, '')] || ''; s = s.replace(rm[0], ' '); }
            if (DIGITAL_RE.test(s)) { digital = true; s = s.replace(DIGITAL_RE, ' '); }
        }
        if (type === 'auto') type = VINYL.test(s) ? 'vinyls' : 'cds';
        const vinylHint = VINYL.test(s);
        if (type === 'vinyls') s = s.replace(VINYL, ' ');
        if (type === 'cds') s = s.replace(CD, ' ');

        s = s.replace(/\(\s*\)|\[\s*\]/g, ' ').replace(/\s+/g, ' ').replace(/^[\s,;|\-–—]+|[\s,;|\-–—]+$/g, '').trim();

        let artist = '', title = s;
        if (['cds', 'vinyls', 'wishlists'].includes(type)) {
            const m = s.match(/\s[-–—]\s/);
            if (m) { artist = s.slice(0, m.index).trim(); title = s.slice(m.index + m[0].length).trim(); }
        }
        if (!title) return { error: true, raw };

        let category = 'music';
        if (type === 'stuff') {
            const low = raw.toLowerCase();
            category = /худи|футболк|свитшот|кепк|куртк|толстовк|шапк|hoodie|shirt/.test(low) ? 'clothing'
                : /наушник|плеер|проигрыват|колонк|кабел|усилит|turntable|headphone|speaker/.test(low) ? 'gear' : 'other';
        }
        return { type, title, artist, price, year, url, platform, category, vinylHint, approx, kind, hadPrice, hours, region, digital, trophy, trophyDone, trophyTotal };
    }

    const isDuplicate = p => (data[p.type] || []).some(x =>
        (x.title || '').toLowerCase() === p.title.toLowerCase() && (x.artist || '').toLowerCase() === (p.artist || '').toLowerCase() &&
        (p.type !== 'games' || x.platform === p.platform));   // одна игра на разных платформах — не дубль

    const todayISO = () => new Date().toISOString().slice(0, 10);

    function makeItem(p, i, shop) {
        const id = Date.now() + i;
        if (p.type === 'games') {
            const g = { id, platform: p.platform || 'Другое', region: p.region || '', title: p.title, developer: '', publisher: '', year: p.year,
                price: p.price, condition: '', edition: '', url: p.url || '', rating: 0, digital: !!p.digital, img: '',
                priceApprox: !!p.approx, ...kindFlags(p) };
            if (p.hours) g.hours = p.hours;
            if (p.trophy) { g.trophy = p.trophy; g.trophyDone = p.trophyDone || 0; g.trophyTotal = p.trophyTotal || 0; }
            if (p.status) {
                g.status = p.status;
                if (p.status === 'playing') g.startedAt = todayISO();
                if (p.status === 'completed') { g.startedAt = g.finishedAt = todayISO(); g.xpFinished = true; }   // как при смене статуса вручную: +100 XP один раз
            }
            return g;
        }
        return {
            id, category: p.category, title: p.title, artist: p.artist, price: p.price, whereBought: shop, year: p.year,
            label: '', condition: p.condition || 'NM',
            formatDetails: p.type === 'vinyls' || p.vinylHint ? 'Виниловая пластинка' : p.type === 'cds' ? 'CD диск' : '',
            size: '', style: '', brand: '', priority: p.priority || '', url: p.url, isGift: p.type !== 'wishlists' && p.kind === 'gift', isCustom: false, rating: 0,
            priceApprox: !!p.approx, priceFree: p.kind === 'free', priceUnknown: p.kind === 'unknown', priceBundle: p.kind === 'bundle', priceCode: p.kind === 'code',
            playCount: 0, lastPlayed: '', tags: [], img: '', imgPos: 'center', note: ''
        };
    }

    /* Строки → позиции; то, чего нет в строке, берём из полей над ней (только в режиме «Игра»).
       Строка «Набор: …» открывает набор: следующие строки до пустой — его игры (цена у них общая, на набор). */
    function parseAll() {
        const useOpts = qaMode === 'games';
        const canBundle = qaMode === 'games' || qaMode === 'auto';
        const out = [];
        let cur = null;
        document.getElementById('qa-text').value.split('\n').forEach(rawLine => {
            if (!rawLine.trim()) { cur = null; return; }
            const hm = canBundle ? rawLine.match(BUNDLE_RE) : null;
            if (hm) {
                const h = parseLine(hm[1], 'games', true);
                if (!h || h.error) { out.push({ error: true, raw: rawLine }); cur = null; return; }
                let kind = h.kind || (!h.hadPrice && useOpts ? qaOpts.kind : '');
                if (!SET_KINDS.includes(kind)) kind = '';
                cur = { isBundle: true, type: 'bundle', title: h.title, platform: h.platform, price: kind ? 0 : h.price,
                        approx: !!h.approx && !kind, kind, unknown: !kind && !(h.price > 0) };
                out.push(cur);
                return;
            }
            const line = cur ? rawLine.replace(BULLET_RE, '') : rawLine;
            const p = parseLine(line, cur ? 'games' : qaMode);
            if (!p) return;
            if (!p.error && cur) p.bundle = cur;
            out.push(p);
        });
        return out.map(p => {
            if (p.error || p.isBundle) return p;
            if (p.type === 'games') {
                if (!p.platform && p.bundle && p.bundle.platform) p.platform = p.bundle.platform;   // платформа набора
                if (!p.platform) p.platform = (useOpts && qaOpts.platform) || 'Другое';
                if (useOpts) { p.region = p.region || qaOpts.region; p.status = qaOpts.status; }
                if (NO_REGION.includes(p.platform)) p.region = '';                       // Steam: региона нет
                if (useOpts && qaOpts.kind && !p.kind && !p.hadPrice) p.kind = qaOpts.kind;   // «Цена / как получена» из полей выше
                if (p.kind === 'psplus' && !PS_RE.test(p.platform)) p.kind = '';             // «PS Plus» — только для PlayStation
                p.digital = p.digital || DIGITAL_PLATFORMS.includes(p.platform) || (useOpts && qaOpts.digital);
                if (p.bundle) { p.price = 0; p.approx = false; p.kind = ''; }                // цену игры задаёт набор
            } else if (p.type === 'cds' || p.type === 'vinyls') p.condition = qaOpts.condition || 'NM';
            else if (p.type === 'wishlists') p.priority = qaOpts.priority;
            return p;
        });
    }

    /* Поля над строками — зависят от выбранного типа */
    function selectHTML(id, label, options, value) {
        return `<label class="block min-w-0"><span class="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">${label}</span>
            <select id="${id}" class="w-full bg-[#0d0d14] p-2.5 rounded-xl border border-white/10 text-white text-sm">${options.map(([v, t]) =>
                `<option value="${esc(v)}"${v === value ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select></label>`;
    }
    function renderOpts() {
        const box = document.getElementById('qa-opts');
        let html = '';
        if (qaMode === 'games') {
            const plats = [...document.getElementById('game-platform').options].map(o => o.value);
            html = selectHTML('qa-o-platform', 'Платформа', [['', 'Из текста строки (иначе «Другое»)'], ...plats.map(n => [n, n])], qaOpts.platform) +
                selectHTML('qa-o-status', 'Статус', GAME_STATUSES, qaOpts.status) +
                (NO_REGION.includes(qaOpts.platform) ? '' : selectHTML('qa-o-region', 'Регион', [['', 'Не указан'], ...REGIONS.map(r => [r, r])], qaOpts.region)) +
                selectHTML('qa-o-kind', 'Цена / как получена', KIND_OPTIONS, qaOpts.kind) +
                `<label class="flex items-center gap-2 text-sm text-gray-300 self-end pb-2.5 cursor-pointer"><input type="checkbox" id="qa-o-digital" class="accent-purple-500"${qaOpts.digital ? ' checked' : ''}> ☁️ Цифровые (не диск)</label>`;
        } else if (qaMode === 'cds' || qaMode === 'vinyls') {
            html = selectHTML('qa-o-condition', 'Состояние носителя', CONDITIONS.map(c => [c, c]), qaOpts.condition);
        } else if (qaMode === 'wishlists') {
            html = selectHTML('qa-o-priority', 'Приоритет', PRIORITIES, qaOpts.priority);
        }
        box.innerHTML = html;
        box.classList.toggle('hidden', !html);
        document.getElementById('qa-shop').classList.toggle('hidden', qaMode === 'games');   // у игр нет поля «где куплено»
        const kind = qaMode === 'games' ? 'games' : qaMode === 'auto' ? 'auto' : 'other';
        document.getElementById('qa-help').textContent = HELP[kind];
        document.getElementById('qa-text').placeholder = HOLDER[kind];
    }
    function readOpts() {
        const v = id => document.getElementById(id);
        if (v('qa-o-platform')) qaOpts.platform = v('qa-o-platform').value;
        if (v('qa-o-status')) qaOpts.status = v('qa-o-status').value;
        if (v('qa-o-region')) qaOpts.region = v('qa-o-region').value;
        if (v('qa-o-kind')) qaOpts.kind = v('qa-o-kind').value;
        if (v('qa-o-digital')) qaOpts.digital = v('qa-o-digital').checked;
        if (v('qa-o-condition')) qaOpts.condition = v('qa-o-condition').value;
        if (v('qa-o-priority')) qaOpts.priority = v('qa-o-priority').value;
        saveOpts();
    }

    function buildModal() {
        const m = document.createElement('div');
        m.id = 'quick-add-modal';
        m.className = 'hidden fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[56] p-4';
        m.setAttribute('role', 'dialog');
        m.setAttribute('aria-modal', 'true');
        m.setAttribute('aria-labelledby', 'qa-title');
        m.innerHTML = `
        <div class="glass no-hover w-full max-w-xl rounded-3xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div class="flex items-center justify-between">
                <h3 id="qa-title" class="text-xl font-black">Быстро добавить</h3>
                <button type="button" class="text-gray-400 hover:text-white p-1" aria-label="Закрыть" onclick="closeModal('quick-add-modal')">✕</button>
            </div>
            <div id="qa-chips" class="flex flex-wrap gap-2" role="group" aria-label="Тип позиции"></div>
            <div id="qa-opts" class="hidden grid grid-cols-2 gap-3"></div>
            <textarea id="qa-text" rows="5" class="w-full bg-white/5 p-3.5 rounded-xl border border-white/10 text-white text-sm focus:outline-none"
                placeholder="Nirvana - Nevermind, 650&#10;Kendrick Lamar - GNX LP, 1800&#10;Silent Hill 2 ps2, 900"></textarea>
            <p id="qa-help" class="text-xs text-gray-500">Одна строка — одна позиция: «Исполнитель - Название, цена». «Авто» — это не ИИ, а простой разбор текста прямо в браузере, поэтому работает без интернета и на GitHub Pages. В этом режиме слова LP, винил, PS2, Switch сами определяют тип. Год — в скобках: (1991).</p>
            <div id="qa-preview" class="space-y-1.5" aria-live="polite"></div>
            <input id="qa-shop" placeholder="Где куплено (необязательно)" class="w-full bg-white/5 p-3 rounded-xl border border-white/10 text-white text-sm focus:outline-none">
            <div class="flex gap-2">
                <button type="button" id="qa-undo" class="hidden bg-white/10 hover:bg-white/15 px-4 py-3 rounded-xl text-sm font-bold">↩ Отменить</button>
                <button type="button" id="qa-submit" class="flex-1 bg-purple-600 hover:bg-purple-500 py-3 rounded-xl font-bold text-white btn-neon">Добавить</button>
            </div>
            <p class="text-[11px] text-gray-500 text-center"><kbd>Ctrl</kbd><kbd>Enter</kbd> — добавить, <kbd>Esc</kbd> — закрыть</p>
        </div>`;
        document.body.appendChild(m);

        m.querySelector('#qa-chips').addEventListener('click', e => {
            const b = e.target.closest('[data-mode]');
            if (b) { qaMode = b.dataset.mode; renderChips(); renderOpts(); renderPreview(); }
        });
        const text = m.querySelector('#qa-text');
        text.addEventListener('input', debounce(renderPreview, 80));
        text.addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); submit(); } });
        m.querySelector('#qa-submit').onclick = submit;
        m.querySelector('#qa-undo').onclick = undoLast;
        m.querySelector('#qa-opts').addEventListener('change', e => { readOpts(); if (e.target.id === 'qa-o-platform') renderOpts(); renderPreview(); });   // у Steam поле «Регион» пропадает
    }

    function renderChips() {
        document.getElementById('qa-chips').innerHTML = QA_TYPES.map(t =>
            `<button type="button" data-mode="${t.id}" class="qa-chip${t.id === qaMode ? ' is-on' : ''}" aria-pressed="${t.id === qaMode}">${t.icon} ${t.label}</button>`).join('');
    }

    function renderPreview() {
        const parsed = parseAll();
        const ok = parsed.filter(p => !p.error && !p.isBundle);
        document.getElementById('qa-preview').innerHTML = parsed.map(p => {
            if (p.isBundle) {
                const n = parsed.filter(x => x.bundle === p).length;
                return `<div class="qa-row" style="background:rgba(139,92,246,.14)"><span aria-hidden="true">📦</span>
                    <span class="truncate flex-1">Набор <b>${esc(p.title)}</b>${p.platform ? ' · ' + esc(p.platform) : ''} · ${n ? n + ' игр' : 'пока пусто'}</span>
                    <span class="font-mono text-cyan-400 shrink-0">${esc(setPriceText(p))}</span></div>`;
            }
            if (p.error) return `<div class="qa-row is-error">⚠️ Не удалось разобрать: ${esc(p.raw)}</div>`;
            const tags = [p.platform, p.region, p.digital ? '☁️' : '', p.status ? STATUS_LABEL[p.status] : '', p.year, p.hours ? p.hours + ' ч' : '', p.trophy ? (p.trophyTotal ? `🏆 ${p.trophyDone}/${p.trophyTotal}` : '🏆 100%') : ''].filter(Boolean).map(esc).join(' · ');
            return `<div class="qa-row"${p.bundle ? ' style="margin-left:14px"' : ''}><span aria-hidden="true">${ICON[p.type]}</span>
                 <span class="truncate flex-1">${esc(p.artist ? p.artist + ' — ' : '')}<b>${esc(p.title)}</b>${tags ? ' · ' + tags : ''}</span>
                 ${isDuplicate(p) ? '<span class="qa-dup">уже есть</span>' : ''}
                 ${p.bundle ? '<span class="font-mono text-gray-500 shrink-0">в наборе</span>' : `<span class="font-mono text-cyan-400 shrink-0">${fmtPrice({ price: p.price, priceApprox: p.approx, ...kindFlags(p) })}</span>`}</div>`;
        }).join('');
        document.getElementById('qa-submit').textContent = ok.length ? `Добавить (${ok.length})` : 'Добавить';
    }

    function submit() {
        const parsed = parseAll().filter(p => !p.error);
        const games = parsed.filter(p => !p.isBundle);
        if (!games.length) { showToast('Введите хотя бы одну позицию: «Исполнитель - Название, цена»', 'error'); return; }
        const shop = document.getElementById('qa-shop').value.trim();
        try { localStorage.setItem(SHOP_KEY, shop); } catch (e) {}

        const ITEM_XP = typeof XP_RULES !== 'undefined' ? XP_RULES.ITEM : 25;
        const FINISH_XP = typeof XP_RULES !== 'undefined' ? XP_RULES.GAME_FINISHED : 100;
        lastAdded = []; lastBundles = []; let xpItems = 0, finished = 0;
        const recs = new Map();                       // строка «Набор:» → запись набора в data.gameBundles
        parsed.forEach((p, i) => {
            if (p.isBundle) return;
            const item = makeItem(p, i, shop);
            if (p.bundle) {
                let rec = recs.get(p.bundle);
                if (!rec) {
                    rec = { id: Date.now() + 100000 + recs.size, name: p.bundle.title, price: p.bundle.price,
                            approx: p.bundle.approx, unknown: p.bundle.unknown, kind: p.bundle.kind };
                    recs.set(p.bundle, rec);
                    if (!Array.isArray(data.gameBundles)) data.gameBundles = [];
                    data.gameBundles.push(rec);
                    lastBundles.push(rec.id);
                }
                item.bundleId = rec.id;
            }
            data[p.type].push(item);
            lastAdded.push({ type: p.type, id: item.id });
            if (p.type === 'games') { if (item.xpFinished) finished++; }   // за добавление игры опыт не даётся — как в обычной форме
            else if (p.type !== 'wishlists') xpItems++;
        });
        lastXp = xpItems * ITEM_XP + finished * FINISH_XP;
        if (window.syncGameBundles) window.syncGameBundles();           // разложить цену набора по его играм

        document.getElementById('qa-text').value = '';
        renderPreview();
        document.getElementById('qa-undo').classList.remove('hidden');
        if (lastXp) addXP(lastXp, `добавлено: ${games.length}`); else save();
        showToast(`Добавлено позиций: <strong>${games.length}</strong>${recs.size ? `, наборов: <strong>${recs.size}</strong>` : ''}`, 'success');
        document.getElementById('qa-text').focus();
    }

    function undoLast() {
        if (!lastAdded.length) return;
        lastAdded.forEach(({ type, id }) => { data[type] = data[type].filter(x => x.id !== id); });
        if (lastBundles.length) data.gameBundles = (data.gameBundles || []).filter(b => !lastBundles.includes(b.id));
        data.xp = Math.max(0, (data.xp || 0) - lastXp);
        showToast(`Отменено: <strong>${lastAdded.length}</strong>`);
        lastAdded = []; lastBundles = []; lastXp = 0;
        document.getElementById('qa-undo').classList.add('hidden');
        save();
    }

    window.openQuickAdd = () => {
        const current = VALID_PAGES.find(p => !document.getElementById(p).classList.contains('hidden'));
        qaMode = QA_TYPES.some(t => t.id === current) ? current : 'auto';
        let shop = '';
        try { shop = localStorage.getItem(SHOP_KEY) || ''; } catch (e) {}
        document.getElementById('qa-shop').value = shop;
        document.getElementById('qa-undo').classList.toggle('hidden', !lastAdded.length);
        renderChips();
        renderOpts();
        renderPreview();
        document.getElementById('quick-add-modal').classList.remove('hidden');
        document.getElementById('qa-text').focus();
    };

    /* ---------- Пластинка дня ---------- */
    let potdShift = 0, potdCurrent = null;

    function renderPotd() {
        const banner = document.getElementById('greeting-banner');
        if (!banner) return;
        let el = document.getElementById('potd-widget');
        if (!el) {
            el = document.createElement('section');
            el.id = 'potd-widget';
            el.className = 'glass potd';
            el.setAttribute('aria-label', 'Пластинка дня');
            banner.insertAdjacentElement('afterend', el);
        }
        const pool = [...(data.cds || []).map(i => ['cds', i]), ...(data.vinyls || []).map(i => ['vinyls', i])]
            .sort((a, b) => a[1].id - b[1].id);

        if (!pool.length) {
            potdCurrent = null;
            el.innerHTML = `<div class="potd-art" aria-hidden="true"><div class="potd-disc"></div><div class="potd-sleeve">💿</div></div>
                <div class="flex-1"><h3 class="font-black text-lg">Здесь появится пластинка дня</h3>
                <p class="text-gray-400 text-sm mt-1">Добавьте первые релизы — каждый день хаб будет предлагать один из них.</p>
                <button type="button" class="potd-btn is-primary mt-3" onclick="openQuickAdd()">＋ Добавить релизы</button></div>`;
            return;
        }
        const day = Math.floor(Date.now() / 864e5);
        const [type, item] = pool[(day * 7919 + potdShift) % pool.length];
        potdCurrent = { type, id: item.id };
        el.innerHTML = `
            <div class="potd-art" aria-hidden="true"><div class="potd-disc"></div>
                <div class="potd-sleeve">${item.img ? `<img src="${esc(item.img)}" alt="">` : (type === 'cds' ? '💿' : '💽')}</div></div>
            <div class="min-w-0 flex-1">
                <p class="text-xs text-gray-400 flex items-center gap-2">Пластинка дня <span class="potd-fmt ${type === 'cds' ? 'is-cd' : 'is-vinyl'}" title="${type === 'cds' ? 'Компакт-диск' : 'Виниловая пластинка'}">${type === 'cds' ? '💿 CD' : '💽 Vinyl'}</span></p>
                <h3 class="font-black text-xl truncate" title="${esc(item.title)}">${esc(item.title)}</h3>
                <p class="text-purple-300 text-sm truncate">${esc(item.artist || 'Разные исполнители')}${item.year ? ' · ' + esc(item.year) : ''}</p>
                <div class="flex gap-2 mt-3 flex-wrap">
                    <button type="button" class="potd-btn is-primary" onclick="potdListen()">▶ Слушать</button>
                    <button type="button" class="potd-btn" onclick="potdShuffle()">🔀 Другую</button>
                </div>
            </div>`;
    }
    window.potdListen = () => {
        if (!potdCurrent) return;
        if (data.showScrobble) logPlay(potdCurrent.type, potdCurrent.id);   // скробблинг (сам запустит плеер, если есть ссылка)
        else window.listenTo?.(potdCurrent.id);                            // иначе просто плеер / окно ссылки
    };
    window.potdShuffle = () => { potdShift += 1; renderPotd(); };

    /* ---------- Подключение ---------- */
    const renderAllBase = renderAll;
    renderAll = function () { renderAllBase(); renderPotd(); };

    buildModal();
    PALETTE_ACTIONS.unshift({ icon: '⚡', title: 'Быстро добавить', hint: 'Список позиций (клавиша N)', run: () => openQuickAdd() });

    const notesBtn = document.querySelector('button[title="Быстрые заметки"]');
    const fab = document.createElement('button');
    fab.type = 'button';
    fab.className = 'fab-add';
    fab.title = 'Быстро добавить (N)';
    fab.setAttribute('aria-label', 'Быстро добавить');
    fab.textContent = '＋';
    fab.onclick = () => openQuickAdd();
    notesBtn?.insertAdjacentElement('beforebegin', fab);

    document.addEventListener('keydown', e => {
        if (e.code !== 'KeyN' || e.ctrlKey || e.metaKey || e.altKey || isTyping(e.target)) return;
        if (openModals().length || !document.getElementById('command-palette').classList.contains('hidden')) return;
        e.preventDefault();
        openQuickAdd();
    });

    updateUI();
})();
