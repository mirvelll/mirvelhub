/* =========================================================
   MIRVEL HUB — i18n.js (подключать после i18n-dict.js, до 18-hub2.js)
   Перевод всего интерфейса RU / EN / UK.

   Как работает:
   • словарь window.MIRVEL_DICT (файл i18n-dict.js): [русский, English, Українська]
   • переводит ВСЕ текстовые узлы страницы, а также placeholder / title / aria-label / alt
   • строки с подстановками: «Найдено фото: {0}» — число/название подставится само
   • следит за страницей: всё, что JS нарисует позже (карточки, окна, тосты), переводится сразу,
     до отрисовки — без мигания русским текстом
   • оборачивает alert / confirm / prompt
   • при переключении на RU возвращает оригинальный текст

   Отладка: в консоли браузера MirvelI18n.report() — покажет строки, которых нет в словаре.
   ========================================================= */
(() => {
    'use strict';

    const CYR = /[А-Яа-яЁёІіЇїЄєҐґ]/;
    const CYR_G = /[А-Яа-яЁёІіЇїЄєҐґ]/g;
    const ATTRS = ['placeholder', 'title', 'aria-label', 'alt'];
    const ATTR_SEL = ATTRS.map(a => `[${a}]`).join(',');
    const LOCALES = { ru: 'ru-RU', en: 'en-US', uk: 'uk-UA' };
    const NUM = '([\\d.,\\s~≈%×x·/+:-]+?)';
    const ANY = '([\\s\\S]*?)';

    const exact = new Map();            // ru -> { en, uk }
    let pats = [];                      // шаблоны с {0}
    const cache = { en: new Map(), uk: new Map() };
    const missing = new Set();

    const curLang = () => { try { return data.lang || 'ru'; } catch (_) { return 'ru'; } };
    const norm = s => String(s).replace(/\s+/g, ' ').trim();
    const escRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    /* ---------- Словарь ---------- */
    function add(rows) {
        for (const row of rows || []) {
            const [ru, en, uk] = row;
            if (!ru) continue;
            const key = norm(ru);
            if (!/\{\d+\}/.test(key)) { exact.set(key, { en, uk }); continue; }
            const parts = key.split(/\{(\d+)\}/);
            const staticText = parts.filter((_, i) => i % 2 === 0).join('');
            const cyr = (staticText.match(CYR_G) || []).length;
            // короткие шаблоны вида «{0} см» / «{0} из {1}» — только для чисел, чтобы не задеть чужой текст
            const grp = (key.startsWith('{') && cyr > 0 && cyr <= 4) ? NUM : ANY;
            let src = '^';
            const order = [];
            parts.forEach((p, i) => {
                if (i % 2 === 0) src += escRe(p);
                else { order.push(Number(p)); src += grp; }
            });
            src += '$';
            pats.push({ re: new RegExp(src), order, en, uk, weight: staticText.length });
        }
        pats.sort((a, b) => b.weight - a.weight || b.order.length - a.order.length);
        cache.en.clear(); cache.uk.clear();
    }

    /* ---------- Склонение: {0?game|games} (EN) и {0?гра|гри|ігор} (UK) ---------- */
    function pluralForm(n, forms, lang) {
        const f = forms.split('|');
        n = Math.abs(parseInt(n, 10) || 0);
        if (lang === 'uk' && f.length >= 3) {
            const m10 = n % 10, m100 = n % 100;
            if (m10 === 1 && m100 !== 11) return f[0];
            if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return f[1];
            return f[2];
        }
        return n === 1 ? f[0] : (f[1] ?? f[0]);
    }
    function fill(tpl, caps, lang) {
        return tpl
            .replace(/\{(\d+)\?([^}]*)\}/g, (_, i, forms) => pluralForm(caps[i], forms, lang))
            .replace(/\{(\d+)\}/g, (_, i) => caps[i] ?? '');
    }

    /* ---------- Перевод одной строки (null — перевода нет) ---------- */
    function tr(text, lang, depth = 0) {
        if (lang !== 'en' && lang !== 'uk') return null;
        const key = norm(text);
        if (!key || !CYR.test(key)) return null;
        const c = cache[lang];
        if (c.has(key)) return c.get(key);

        let out = null;
        const hit = exact.get(key);
        if (hit && hit[lang]) out = hit[lang];
        else if (depth < 3) {
            for (const p of pats) {
                const m = key.match(p.re);
                if (!m || !p[lang]) continue;
                const caps = {};
                p.order.forEach((idx, i) => {
                    const raw = m[i + 1];
                    caps[idx] = (depth < 3 && raw ? tr(raw, lang, depth + 1) : null) ?? raw;
                });
                const res = fill(p[lang], caps, lang);
                if (res !== key) { out = res; break; }
            }
        }
        if (out == null && depth < 4) out = fallback(key, lang, depth);
        if (c.size > 6000) c.clear();
        c.set(key, out);
        return out;
    }

    /* Запасные правила для составных строк, которые нельзя описать одним шаблоном:
       «🔥 Высокий 🔄» (эмодзи по краям), «PlayStation 2 · ✔ Пройдено» (разделители),
       «В планах: 0» / «👕 Размер: L» (подпись: значение) */
    function exactOnly(k, lang) { const h = exact.get(k); return h && h[lang] ? h[lang] : null; }
    function fallback(key, lang, depth) {
        // 1) символы/эмодзи по краям: сначала только хвост, потом только начало, потом оба края
        const e = key.match(/^([^\p{L}\p{N}]*)([\s\S]*?)([^\p{L}\p{N}]*)$/u);
        if (e && e[2] && (e[1] || e[3])) {
            const variants = [];
            if (e[3]) variants.push([e[1] + e[2], '', e[3]]);
            if (e[1]) variants.push([e[2] + e[3], e[1], '']);
            if (e[1] && e[3]) variants.push([e[2], e[1], e[3]]);
            for (const [core, pre, post] of variants) {
                if (core === key) continue;
                const t = tr(core, lang, depth + 1);
                if (t != null) return pre + t + post;
            }
        }
        // 2) части через « · » / « • » / « | »
        for (const sep of [' · ', ' • ', ' | ']) {
            if (!key.includes(sep)) continue;
            let changed = false;
            const parts = key.split(sep).map(x => { const t = tr(x, lang, depth + 1); if (t != null) changed = true; return t ?? x; });
            if (changed) return parts.join(sep);
        }
        // 3) «подпись: значение»
        const c = key.match(/^([^:]{1,60}:)\s*([\s\S]*)$/);
        if (c) {
            const lt = exactOnly(c[1], lang) ?? (exactOnly(c[1].slice(0, -1), lang) != null ? exactOnly(c[1].slice(0, -1), lang) + ':' : null);
            const rt = c[2] ? tr(c[2], lang, depth + 1) : null;
            if (lt != null || rt != null) return (lt ?? c[1]) + (c[2] ? ' ' + (rt ?? c[2]) : '');
        }
        return null;
    }

    /* Многострочный текст (alert/confirm/placeholder): переводим построчно */
    function trMulti(text, lang) {
        if (lang !== 'en' && lang !== 'uk') return null;
        const s = String(text ?? '');
        if (!CYR.test(s)) return null;
        let changed = false;
        const out = s.split('\n').map(line => {
            const m = line.match(/^(\s*)([\s\S]*?)(\s*)$/);
            const t = m[2] && CYR.test(m[2]) ? tr(m[2], lang) : null;
            if (t == null) return line;
            changed = true;
            return m[1] + t + m[3];
        }).join('\n');
        return changed ? out : null;
    }

    /* ---------- Применение к DOM ---------- */
    const nodeRec = new WeakMap();      // текстовый узел -> { src, out }
    const attrRec = new WeakMap();      // элемент -> { attr: { src, out } }
    const trackedNodes = new Set();
    const trackedEls = new Set();

    function doText(n, lang) {
        const raw = n.nodeValue;
        const rec = nodeRec.get(n);
        const src = rec && raw === rec.out ? rec.src : raw;   // исходный (русский) текст
        let out = null;
        if (lang !== 'ru' && CYR.test(src)) {
            const m = src.match(/^(\s*)([\s\S]*?)(\s*)$/);
            let t = tr(m[2], lang);
            if (t == null && /\n/.test(m[2])) t = null;
            if (t != null) out = m[1] + t + m[3];
            else if (missing.size < 500) missing.add(norm(src));
        }
        if (out != null) {
            if (raw !== out) n.nodeValue = out;
            nodeRec.set(n, { src, out });
            trackedNodes.add(n);
        } else if (rec && raw === rec.out) {
            n.nodeValue = rec.src;
            nodeRec.delete(n);
            trackedNodes.delete(n);
        }
    }

    function doAttr(el, attr, lang) {
        if (!el.hasAttribute || !el.hasAttribute(attr)) return;
        const raw = el.getAttribute(attr);
        const recs = attrRec.get(el) || {};
        const rec = recs[attr];
        const src = rec && raw === rec.out ? rec.src : raw;
        let out = null;
        if (lang !== 'ru' && CYR.test(src)) {
            out = trMulti(src, lang);
            if (out == null && missing.size < 500) missing.add(norm(src));
        }
        if (out != null) {
            if (raw !== out) el.setAttribute(attr, out);
            recs[attr] = { src, out };
            attrRec.set(el, recs);
            trackedEls.add(el);
        } else if (rec && raw === rec.out) {
            el.setAttribute(attr, rec.src);
            delete recs[attr];
        }
    }

    const SKIP_PARENT = /^(SCRIPT|STYLE|TEXTAREA|NOSCRIPT)$/;
    function walk(root, lang) {
        if (!root) return;
        if (root.nodeType === 3) {
            if (!SKIP_PARENT.test(root.parentNode?.nodeName || '')) doText(root, lang);
            return;
        }
        if (root.nodeType !== 1 && root.nodeType !== 9 && root.nodeType !== 11) return;
        if (root.nodeType === 1) {
            if (root.closest?.('[data-no-i18n]')) return;
            ATTRS.forEach(a => doAttr(root, a, lang));
        }
        const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
            acceptNode: n => SKIP_PARENT.test(n.parentNode?.nodeName || '') || n.parentNode?.closest?.('[data-no-i18n]')
                ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT
        });
        let n;
        while ((n = w.nextNode())) doText(n, lang);
        if (root.querySelectorAll) root.querySelectorAll(ATTR_SEL).forEach(el => {
            if (!el.closest('[data-no-i18n]')) ATTRS.forEach(a => doAttr(el, a, lang));
        });
    }

    function restoreAll() {
        trackedNodes.forEach(n => {
            if (!n.isConnected) { trackedNodes.delete(n); return; }
            const rec = nodeRec.get(n);
            if (rec && n.nodeValue === rec.out) n.nodeValue = rec.src;
            nodeRec.delete(n); trackedNodes.delete(n);
        });
        trackedEls.forEach(el => {
            const recs = attrRec.get(el);
            if (el.isConnected && recs) for (const a in recs) {
                if (el.getAttribute(a) === recs[a].out) el.setAttribute(a, recs[a].src);
            }
            attrRec.delete(el); trackedEls.delete(el);
        });
    }

    /* ---------- Слежение за страницей ---------- */
    let bodyObs = null, titleObs = null;
    function onBodyMutations(records) {
        const lang = curLang();
        if (lang === 'ru') return;
        const nodes = new Set(), els = new Set();
        for (const r of records) {
            if (r.type === 'childList') r.addedNodes.forEach(n => nodes.add(n));
            else if (r.type === 'characterData') nodes.add(r.target);
            else if (r.type === 'attributes') els.add(r.target);
        }
        nodes.forEach(n => { if (n.isConnected) walk(n, lang); });
        els.forEach(el => { if (el.isConnected) ATTRS.forEach(a => doAttr(el, a, lang)); });
        bodyObs.takeRecords();          // выбрасываем изменения, сделанные нами самими
        if (trackedNodes.size > 6000) trackedNodes.forEach(n => { if (!n.isConnected) trackedNodes.delete(n); });
        if (trackedEls.size > 3000) trackedEls.forEach(e => { if (!e.isConnected) trackedEls.delete(e); });
    }
    function onTitleMutations() {
        const lang = curLang();
        if (lang === 'ru') return;
        const t = document.querySelector('title');
        if (t) walk(t, lang);
        titleObs.takeRecords();
    }
    function startObservers() {
        if (!bodyObs) {
            bodyObs = new MutationObserver(onBodyMutations);
            bodyObs.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
        }
        if (!titleObs) {
            const t = document.querySelector('title');
            if (t) { titleObs = new MutationObserver(onTitleMutations); titleObs.observe(t, { childList: true, characterData: true, subtree: true }); }
        }
    }

    function apply(lang = curLang()) {
        document.documentElement.lang = lang;
        startObservers();
        if (bodyObs) bodyObs.takeRecords();
        if (lang === 'ru') { restoreAll(); }
        else {
            walk(document.body, lang);
            const t = document.querySelector('title');
            if (t) walk(t, lang);
        }
        if (bodyObs) bodyObs.takeRecords();
        if (titleObs) titleObs.takeRecords();
    }

    /* ---------- alert / confirm / prompt ---------- */
    ['alert', 'confirm', 'prompt'].forEach(name => {
        const orig = window[name];
        if (typeof orig !== 'function') return;
        window[name] = function (msg, ...rest) {
            const t = trMulti(msg, curLang());
            return orig.call(window, t == null ? msg : t, ...rest);
        };
    });

    /* ---------- Публичный интерфейс ---------- */
    window.MirvelI18n = {
        apply,
        add: rows => { add(rows); apply(); },
        tr: (text, lang = curLang()) => tr(text, lang) ?? text,
        lang: curLang,
        locale: () => LOCALES[curLang()] || 'ru-RU',
        report() {
            const list = [...missing].filter(s => CYR.test(s)).sort();
            console.info(`[MIRVEL i18n] строк без перевода: ${list.length} (в списке могут быть и ваши данные — названия, заметки)`);
            console.table(list.map(s => ({ text: s })));
            return list;
        }
    };
    window.mirvelLocale = () => LOCALES[curLang()] || 'ru-RU';

    add(window.MIRVEL_DICT || []);
    if (curLang() !== 'ru') apply();      // сразу, пока страница ещё не перерисована
})();
