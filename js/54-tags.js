/* =========================================================
   MIRVEL HUB — 54-tags.js (подключается после 53-forms.js)
   Теги: современное окно управления, чипы в форме, компактный фильтр.
   • окно «Тэги»: поиск, сортировка, создание в одну строку (палитра + свой цвет),
     переименование, смена цвета, объединение двух тегов, удаление с подтверждением,
     счётчик «где используется»;
   • в форме добавления: теги чипами + создание нового тега прямо там;
   • фильтр по тегам на странице «Желаемое»: свёрнут, «Показать все».
   Данные те же: data.availableTags = [{text,color}], у записей item.tags = [{text,color}].
   Переименование / цвет / объединение / удаление применяются ко всем записям (желаемое, CD, винилы, вещи).
   ========================================================= */
(() => {
    'use strict';
    const $ = id => document.getElementById(id);
    const E = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const PAL = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#3b82f6', '#8b5cf6', '#ec4899', '#64748b'];
    const COLS = [['wishlists', 'Желаемое'], ['cds', 'CD'], ['vinyls', 'Винил'], ['stuff', 'Вещи']];
    const LS = 'mirvel_tags_sort';
    const safeColor = c => (/^#[0-9a-f]{3,8}$/i.test(String(c || '')) || /^(rgb|hsl)a?\([\d\s.,%]+\)$/i.test(String(c || ''))) ? c : '#8b5cf6';
    const tags = () => { if (!Array.isArray(data.availableTags)) data.availableTags = []; return data.availableTags; };
    const same = (a, b) => String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();
    const findTag = text => tags().find(t => same(t.text, text));
    const eachItem = fn => COLS.forEach(([k]) => (data[k] || []).forEach(i => { if (i && Array.isArray(i.tags)) fn(i); }));
    const toast = (m, t) => { try { showToast(m, t); } catch (_) {} };
    function usage(text) {
        const parts = [];
        let total = 0;
        COLS.forEach(([k, name]) => { const n = (data[k] || []).filter(i => (i.tags || []).some(t => t.text === text)).length; if (n) { parts.push(`${name} ${n}`); total += n; } });
        return { parts, total };
    }
    const commit = () => { try { save(); } catch (_) {} };

    /* ---------- стили ---------- */
    const css = document.createElement('style');
    css.textContent = `
    .tg-box{padding:22px;border-radius:24px;width:100%;max-width:480px;max-height:92vh;overflow-y:auto;border:1px solid rgba(255,255,255,.1);box-shadow:0 20px 60px rgba(0,0,0,.5)}
    @media(max-width:640px){.tg-box{max-height:80vh;padding:18px}}
    .tg-chip{display:inline-flex;align-items:center;gap:6px;padding:5px 12px;border-radius:999px;font-size:12px;font-weight:800;color:#fff;background:var(--c,#8b5cf6);max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .tg-row{display:flex;align-items:center;gap:8px;padding:9px 10px;border-radius:14px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07)}
    .tg-row .tg-use{flex:1;min-width:0;font-size:11px;color:#9ca3af;text-align:right;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .tg-row .tg-use.is-zero{opacity:.5}
    .tg-ib{display:inline-flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:10px;background:rgba(255,255,255,.06);color:#d1d5db;font-size:13px;cursor:pointer;border:0;position:relative;flex:none}
    .tg-ib:hover{background:rgba(255,255,255,.14);color:#fff}
    .tg-ib.is-del:hover{background:rgba(239,68,68,.2);color:#fca5a5}
    .tg-ib input[type=color]{position:absolute;inset:0;opacity:0;width:100%;height:100%;cursor:pointer;padding:0;border:0}
    .tg-dot{width:16px;height:16px;border-radius:50%;background:var(--c);border:2px solid rgba(255,255,255,.35)}
    .tg-tools{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0}
    .tg-in{flex:1;min-width:0;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:9px 12px;color:#fff;font-size:13px;outline:none}
    .tg-in:focus{border-color:rgba(139,92,246,.6)}
    select.tg-in{flex:none;background:#0d0d14;color:#d1d5db}
    .tg-new{padding:12px;border-radius:16px;background:rgba(139,92,246,.07);border:1px solid rgba(139,92,246,.25)}
    .tg-sw{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-top:10px}
    .tg-sw button,.tg-sw label{width:24px;height:24px;border-radius:50%;background:var(--c);border:2px solid transparent;cursor:pointer;padding:0;position:relative}
    .tg-sw button.is-on,.tg-sw label.is-on{border-color:#fff;transform:scale(1.15)}
    .tg-sw label{background:conic-gradient(#ef4444,#eab308,#22c55e,#3b82f6,#ec4899,#ef4444);overflow:hidden}
    .tg-sw label input{position:absolute;inset:0;opacity:0;cursor:pointer;width:100%;height:100%;padding:0;border:0}
    .tg-merge{padding:12px;border-radius:14px;background:rgba(250,204,21,.08);border:1px solid rgba(250,204,21,.35);margin-bottom:10px;font-size:12px;color:#fde68a}
    .tg-merge .tg-chip{cursor:pointer;margin:4px 4px 0 0}
    .tg-pick{padding:5px 12px;border-radius:999px;font-size:12px;font-weight:800;color:#fff;background:var(--c);border:2px solid transparent;opacity:.45;cursor:pointer;transition:all .15s}
    .tg-pick.is-on{opacity:1;border-color:#fff}
    .tg-quick{display:flex;gap:8px;margin-top:8px}
    .tg-more{padding:4px 12px;border-radius:999px;font-size:11px;font-weight:800;color:#c4b5fd;background:rgba(139,92,246,.14);border:1px solid rgba(139,92,246,.4);cursor:pointer}
    `;
    document.head.appendChild(css);

    /* ---------- окно управления ---------- */
    let sortMode = 'name', query = '', mergeFrom = null, newColor = PAL[5];
    try { sortMode = localStorage.getItem(LS) || 'name'; } catch (_) {}

    function build() {
        const modal = $('tags-manager-modal'); if (!modal || modal.dataset.tgBuilt) return;
        modal.dataset.tgBuilt = '1';
        modal.innerHTML = `<div class="glass tg-box" role="dialog" aria-label="Управление тегами">
            <div class="flex items-center justify-between gap-3">
                <h2 class="text-2xl font-bold">🏷️ Теги <span id="tg-count" class="text-sm text-gray-500 font-bold"></span></h2>
                <button type="button" class="tg-ib" id="tg-close" aria-label="Закрыть">✕</button>
            </div>
            <div class="tg-new mt-4">
                <div class="flex gap-2"><input id="new-tag-text" class="tg-in" maxlength="30" placeholder="Новый тег — название, Enter" autocomplete="off"><button type="button" class="tg-ib" id="tg-add" style="width:auto;padding:0 14px;font-weight:800;background:var(--theme-btn,#8b5cf6);color:#fff">＋</button></div>
                <div class="tg-sw" id="tg-sw"></div>
            </div>
            <div class="tg-tools"><input id="tg-search" class="tg-in" placeholder="🔍 Найти тег" autocomplete="off">
                <select id="tg-sort" class="tg-in" aria-label="Сортировка"><option value="name">А–Я</option><option value="use">По использованию</option><option value="new">Сначала новые</option></select></div>
            <div id="tg-merge"></div>
            <div id="manage-tags-list" class="space-y-2"></div>
        </div>`;
        $('tg-sort').value = sortMode;
        modal.addEventListener('click', e => { if (e.target === modal) close(); });
        $('tg-close').onclick = close;
        $('tg-add').onclick = createFromInput;
        $('new-tag-text').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); createFromInput(); } });
        $('tg-search').addEventListener('input', e => { query = e.target.value; renderList(); });
        $('tg-sort').addEventListener('change', e => { sortMode = e.target.value; try { localStorage.setItem(LS, sortMode); } catch (_) {} renderList(); });
        $('tg-sw').addEventListener('click', e => { const b = e.target.closest('button[data-c]'); if (b) { newColor = b.dataset.c; renderSwatches(); } });
        $('tg-sw').addEventListener('input', e => { if (e.target.type === 'color') { newColor = e.target.value; renderSwatches(); } });
        const list = $('manage-tags-list');
        list.addEventListener('click', onListClick);
        list.addEventListener('change', e => { const row = e.target.closest('[data-t]'); if (row && e.target.type === 'color') recolor(row.dataset.t, e.target.value); });
        $('tg-merge').addEventListener('click', onMergeClick);
    }
    const close = () => { mergeFrom = null; try { closeModal('tags-manager-modal'); } catch (_) { $('tags-manager-modal').classList.add('hidden'); } };

    function renderSwatches() {
        const custom = !PAL.includes(newColor);
        $('tg-sw').innerHTML = PAL.map(c => `<button type="button" data-c="${c}" style="--c:${c}" class="${newColor === c ? 'is-on' : ''}" aria-label="Цвет ${c}"></button>`).join('')
            + `<label class="${custom ? 'is-on' : ''}" title="Свой цвет"${custom ? ` style="background:${E(safeColor(newColor))}"` : ''}><input type="color" value="${/^#[0-9a-f]{6}$/i.test(newColor) ? newColor : '#8b5cf6'}"></label>`;
    }

    function renderMerge() {
        const box = $('tg-merge'); if (!box) return;
        if (mergeFrom == null) { box.innerHTML = ''; return; }
        const others = tags().filter(t => t.text !== mergeFrom);
        box.innerHTML = `<div class="tg-merge">Объединить <b>${E(mergeFrom)}</b> с… (выберите тег, который останется)<br>
            ${others.length ? others.map(t => `<span class="tg-chip" data-m="${E(t.text)}" style="--c:${E(safeColor(t.color))}">${E(t.text)}</span>`).join('') : '<i>Других тегов нет</i>'}
            <br><button type="button" class="tg-more mt-2" data-m-cancel="1" style="margin-top:8px">Отмена</button></div>`;
    }

    function renderList() {
        const list = $('manage-tags-list'); if (!list) return;
        let arr = tags().map((t, i) => ({ t, i, u: usage(t.text) }));
        const q = query.trim().toLowerCase();
        if (q) arr = arr.filter(x => x.t.text.toLowerCase().includes(q));
        arr.sort(sortMode === 'use' ? (a, b) => b.u.total - a.u.total || a.t.text.localeCompare(b.t.text, 'ru')
            : sortMode === 'new' ? (a, b) => b.i - a.i
            : (a, b) => a.t.text.localeCompare(b.t.text, 'ru'));
        $('tg-count').textContent = tags().length ? `· ${tags().length}` : '';
        list.innerHTML = arr.length ? arr.map(({ t, u }) => `<div class="tg-row" data-t="${E(t.text)}">
            <span class="tg-chip" style="--c:${E(safeColor(t.color))}">${E(t.text)}</span>
            <span class="tg-use${u.total ? '' : ' is-zero'}">${u.total ? E(u.parts.join(' · ')) : 'не используется'}</span>
            <label class="tg-ib" title="Цвет"><span class="tg-dot" style="--c:${E(safeColor(t.color))}"></span><input type="color" value="${/^#[0-9a-f]{6}$/i.test(t.color) ? t.color : '#8b5cf6'}"></label>
            <button type="button" class="tg-ib" data-a="ren" title="Переименовать">✎</button>
            <button type="button" class="tg-ib" data-a="merge" title="Объединить с другим тегом">🔀</button>
            <button type="button" class="tg-ib is-del" data-a="del" title="Удалить">🗑</button></div>`).join('')
            : `<p class="text-sm text-gray-500 text-center py-6">${tags().length ? 'Ничего не найдено' : 'Тегов пока нет. Создайте первый строкой выше.'}</p>`;
        renderMerge();
    }

    function createTag(text, color) {
        text = String(text || '').trim().replace(/\s+/g, ' ');
        if (!text) return null;
        const ex = findTag(text);
        if (ex) return { tag: ex, existed: true };
        const tag = { text, color: safeColor(color) };
        tags().push(tag); commit();
        return { tag, existed: false };
    }
    function createFromInput() {
        const inp = $('new-tag-text'); const r = createTag(inp.value, newColor);
        if (!r) { inp.focus(); return; }
        if (r.existed) { toast(`Тег «${r.tag.text}» уже есть`, 'error'); return; }
        inp.value = ''; inp.focus(); renderList(); renderModalTags(); toast('Тег создан 🏷️', 'success');
    }

    function recolor(text, color) {
        const t = findTag(text); if (!t) return;
        color = safeColor(color); t.color = color;
        eachItem(i => i.tags.forEach(x => { if (x.text === text) x.color = color; }));
        commit(); renderList(); renderModalTags();
    }
    async function rename(text) {
        const next = await mhPrompt('Новое название тега', { title: 'Переименовать тег', value: text, required: true, maxLength: 30, okText: 'Сохранить' });
        if (next == null) return;
        const nv = String(next).trim().replace(/\s+/g, ' '); if (!nv || nv === text) return;
        const clash = tags().find(t => t.text !== text && same(t.text, nv));
        if (clash) { toast(`Тег «${clash.text}» уже есть. Используйте «Объединить».`, 'error'); return; }
        const t = findTag(text); if (!t) return; t.text = nv;
        eachItem(i => { i.tags = i.tags.map(x => x.text === text ? { ...x, text: nv } : x); });
        if (typeof currentFilter !== 'undefined' && currentFilter === text) currentFilter = nv;
        commit(); renderList(); renderModalTags(); toast('Тег переименован ✎', 'success');
    }
    async function remove(text) {
        const u = usage(text);
        const ok = await mhConfirm(u.total ? `Удалить тег «${text}»? Он будет снят с записей (${u.parts.join(', ')}). Сами записи останутся.` : `Удалить тег «${text}»?`,
            { title: 'Удаление тега', okText: 'Удалить', cancelText: 'Отмена', danger: true });
        if (!ok) return;
        data.availableTags = tags().filter(t => t.text !== text);
        eachItem(i => { i.tags = i.tags.filter(x => x.text !== text); });
        if (typeof currentFilter !== 'undefined' && currentFilter === text) currentFilter = null;
        commit(); renderList(); renderModalTags(); toast('Тег удалён');
    }
    async function merge(from, to) {
        const u = usage(from);
        const ok = await mhConfirm(`Объединить «${from}» в «${to}»? ${u.total ? `У ${u.total} записей тег «${from}» заменится на «${to}».` : ''} Тег «${from}» исчезнет.`,
            { title: 'Объединение тегов', okText: 'Объединить', cancelText: 'Отмена' });
        if (!ok) return;
        const target = findTag(to); if (!target) return;
        eachItem(i => {
            if (!i.tags.some(x => x.text === from)) return;
            const has = i.tags.some(x => x.text === to);
            i.tags = i.tags.filter(x => x.text !== from);
            if (!has) i.tags.push({ text: target.text, color: target.color });
        });
        data.availableTags = tags().filter(t => t.text !== from);
        if (typeof currentFilter !== 'undefined' && currentFilter === from) currentFilter = to;
        mergeFrom = null; commit(); renderList(); renderModalTags(); toast('Теги объединены 🔀', 'success');
    }
    function onListClick(e) {
        const b = e.target.closest('[data-a]'); if (!b) return;
        const text = b.closest('[data-t]')?.dataset.t; if (text == null) return;
        if (b.dataset.a === 'ren') rename(text);
        else if (b.dataset.a === 'del') remove(text);
        else if (b.dataset.a === 'merge') { mergeFrom = text; renderMerge(); $('tg-merge').scrollIntoView({ block: 'nearest' }); }
    }
    function onMergeClick(e) {
        if (e.target.closest('[data-m-cancel]')) { mergeFrom = null; renderMerge(); return; }
        const c = e.target.closest('[data-m]'); if (c && mergeFrom != null) merge(mergeFrom, c.dataset.m);
    }

    window.openTagsManager = () => { build(); mergeFrom = null; query = ''; const s = $('tg-search'); if (s) s.value = ''; renderSwatches(); renderList(); $('tags-manager-modal').classList.remove('hidden'); };
    window.renderManageTagsList = () => { if ($('tg-count')) renderList(); };
    window.addGlobalTag = () => { build(); createFromInput(); };
    window.deleteTag = text => remove(text);

    /* ---------- выбор тегов в форме ---------- */
    window.toggleTag = tag => {
        const i = tempTags.findIndex(t => t.text === tag.text);
        if (i > -1) tempTags.splice(i, 1); else tempTags.push({ text: tag.text, color: tag.color });
        renderModalTags();
    };
    function ensureQuick() {
        const list = $('available-tags-list');
        if (!list || $('tg-quick')) return;
        const q = document.createElement('div');
        q.id = 'tg-quick'; q.className = 'tg-quick';
        q.innerHTML = '<input id="tg-quick-in" class="tg-in" maxlength="30" placeholder="＋ Новый тег (Enter)" autocomplete="off"><button type="button" class="tg-more" id="tg-quick-add">Добавить</button>';
        list.insertAdjacentElement('afterend', q);
        const go = () => {
            const inp = $('tg-quick-in'); const r = createTag(inp.value, PAL[tags().length % PAL.length]);
            if (!r) return;
            if (!tempTags.some(t => t.text === r.tag.text)) tempTags.push({ text: r.tag.text, color: r.tag.color });
            inp.value = ''; renderModalTags(); if ($('tg-count')) renderList();
        };
        $('tg-quick-add').onclick = go;
        $('tg-quick-in').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); go(); } });
    }
    window.renderModalTags = () => {
        const list = $('available-tags-list'); if (!list) return;
        ensureQuick();
        list.innerHTML = '';
        tags().forEach(t => {
            const on = tempTags.some(x => x.text === t.text);
            const b = document.createElement('button');
            b.type = 'button'; b.className = 'tg-pick' + (on ? ' is-on' : '');
            b.style.setProperty('--c', safeColor(t.color));
            b.textContent = (on ? '✓ ' : '') + t.text;
            b.setAttribute('aria-pressed', on);
            b.onclick = () => window.toggleTag(t);
            list.appendChild(b);
        });
        if (!tags().length) list.innerHTML = '<span class="text-xs text-gray-500">Тегов ещё нет — создайте первый ниже.</span>';
    };
    // редактирование записи не должно менять её теги «на лету» (до нажатия «Сохранить»)
    const origOpen = window.openModal;
    if (typeof origOpen === 'function') window.openModal = function () { const r = origOpen.apply(this, arguments); try { tempTags = (tempTags || []).map(t => ({ text: t.text, color: t.color })); window.renderModalTags(); } catch (_) {} return r; };

    /* ---------- компактный фильтр на странице ---------- */
    const LIM = 8; let showAll = false;
    function compact() {
        const box = $('filter-tags'); if (!box) return;
        const bs = [...box.children];
        let more = $('tg-more');
        if (bs.length <= LIM) { more && more.remove(); return; }
        bs.forEach((b, i) => { b.style.display = (showAll || i < LIM || /ring-2/.test(b.className)) ? '' : 'none'; });
        if (!more) {
            more = document.createElement('button'); more.id = 'tg-more'; more.type = 'button'; more.className = 'tg-more';
            more.onclick = () => { showAll = !showAll; compact(); };
            box.insertAdjacentElement('afterend', more);
        }
        more.textContent = showAll ? 'Свернуть' : `Показать все (${bs.length})`;
    }
    function init() { const box = $('filter-tags'); if (!box) return; new MutationObserver(compact).observe(box, { childList: true }); compact(); }
    if ($('filter-tags')) init(); else document.addEventListener('DOMContentLoaded', init);
})();
