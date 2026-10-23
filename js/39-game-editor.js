/* =========================================================
   MIRVEL HUB — 39-game-editor.js (подключается после 38-game-sync.js)
   Логика «карандаш / страница игры»:
   • ✏️ карандаш = ВСЁ редактирование игры: платформа, название, цена, обложка, статус, часы,
     онлайн, регион, комплектность, ачивки, заметки, оценка
   • страница игры = просмотр: компактно показывает только то, что у игры есть
     (на странице остались только фото и дополнения — их удобно добавлять прямо там)
   Новых полей нет: пишет в те же game.trophy / trophyDone / trophyTotal / parts / note / region.
   ========================================================= */
(() => {
    'use strict';
    const $ = id => document.getElementById(id);
    const gameById = id => (data.games || []).find(x => x.id === Number(id));
    const PARTS = [['box', '📦', 'Коробка'], ['disc', '💿', 'Диск'], ['manual', '📖', 'Мануал'], ['inserts', '🖼️', 'Вкладыши'], ['slip', '🎴', 'Слипкейс / оби']];
    const stars = n => '★'.repeat(n) + '☆'.repeat(5 - n);

    /* ================= КАРАНДАШ: дополнительные поля ================= */
    let mTrophy = '', mParts = {};

    function setupEditor() {
        const modal = $('game-modal'), blk = $('gx-block');
        if (!modal || !blk || $('gx-more')) return false;

        const more = document.createElement('div');
        more.id = 'gx-more';
        more.className = 'space-y-3';
        more.innerHTML = `
            <label class="gxm-check"><input type="checkbox" id="gx-coop" class="accent-purple-500"> <span>🤝 Кооператив<small class="block text-[11px] text-gray-500">Можно играть вдвоём / командой — игра попадёт в фильтр «Режим»</small></span></label>
            <div id="gx-parts-box">
                <label class="text-[10px] text-gray-400 font-bold block uppercase mb-1.5">Комплектность <span class="normal-case font-semibold text-gray-600">· только для дисков</span></label>
                <div id="gx-parts" class="flex flex-wrap gap-2" role="group" aria-label="Комплектность"></div>
            </div>
            <div>
                <label class="text-[10px] text-gray-400 font-bold block uppercase mb-1.5">🏆 Ачивки / трофеи <span class="normal-case font-semibold text-gray-600">· необязательно</span></label>
                <div id="gx-trophy" class="flex flex-wrap gap-2" role="group" aria-label="Ачивки"></div>
                <div id="gx-tnums" class="grid grid-cols-2 gap-3 mt-2 hidden">
                    <input id="gx-tdone" type="number" min="0" step="1" placeholder="Получено" class="w-full bg-white/5 p-3.5 rounded-xl border border-white/10 text-white text-sm">
                    <input id="gx-ttotal" type="number" min="0" step="1" placeholder="Всего в игре" class="w-full bg-white/5 p-3.5 rounded-xl border border-white/10 text-white text-sm">
                </div>
            </div>
            <div>
                <label class="text-[10px] text-gray-400 font-bold block uppercase mb-1.5">Заметки и личное мнение</label>
                <textarea id="gx-note" rows="4" placeholder="Впечатления, версия издания, особенности диска, что понравилось…" class="w-full bg-white/5 p-3.5 rounded-xl border border-white/10 text-white text-sm"></textarea>
            </div>
            <p class="text-[11px] text-gray-500">Фото диска и дополнения (DLC) добавляются на странице игры.</p>`;
        blk.insertAdjacentElement('afterend', more);

        $('gx-parts').addEventListener('click', e => {
            const b = e.target.closest('[data-p]'); if (!b) return;
            mParts[b.dataset.p] = !mParts[b.dataset.p]; paintParts();
        });
        $('gx-trophy').addEventListener('click', e => {
            const b = e.target.closest('[data-t]'); if (!b) return;
            mTrophy = b.dataset.t; paintTrophy();
        });
        $('game-digital')?.addEventListener('change', syncDigital);
        $('gx-picker')?.addEventListener('click', () => setTimeout(syncDigital, 0));
        layoutModal(modal, more);
        return true;
    }

    /* ---------- раскладка окна: широкое, две колонки, карточки ---------- */
    function syncDigital() {
        const dig = !!$('game-digital')?.checked;
        $('gx-parts-box')?.classList.toggle('hidden', dig);
        $('gxm-parts-card')?.classList.toggle('hidden', dig);
        const rc = $('gxm-region'); if (rc) rc.classList.toggle('hidden', dig);   // у цифровых игр регион не нужен
        paintParts();
    }
    function layoutModal(modal, more) {
        const panel = modal.firstElementChild;
        panel.classList.remove('space-y-4', 'p-8');
        panel.style.cssText += ';max-width:min(1100px,96vw);padding:1.5rem 1.75rem;';
        panel.classList.add('gxm-panel');
        const header = panel.firstElementChild;
        const card = (title, ...nodes) => {
            const c = document.createElement('section'); c.className = 'gxm-card';
            if (title) c.insertAdjacentHTML('afterbegin', `<h3 class="gxm-t">${title}</h3>`);
            nodes.filter(Boolean).forEach(n => c.appendChild(n));
            return c;
        };
        const wrap = nodes => { const d = document.createElement('div'); d.className = 'gxm-fields'; nodes.filter(Boolean).forEach(n => d.appendChild(n)); return d; };
        const g = id => $(id);
        const rowOf = id => g(id)?.parentElement;

        // регион: отдельная ячейка, показывается только для дисков
        const regionCell = g('game-region')?.parentElement;
        if (regionCell) { regionCell.id = 'gxm-region'; regionCell.querySelector('label').textContent = 'Регион диска'; }
        const digitalLabel = g('game-digital')?.closest('label');
        const coverBtn = [...panel.querySelectorAll('button')].find(b => /Обложка/.test(b.textContent) && b.getAttribute('onclick')?.includes('game-img'));
        const coverFile = g('game-img'), coverStatus = g('game-img-status');
        const saveBtn = [...panel.querySelectorAll('button')].find(b => b.getAttribute('onclick') === 'saveGameItem()');
        const cancelBtn = [...panel.querySelectorAll('button')].find(b => b.getAttribute('onclick') === "closeModal('game-modal')" && b.textContent.trim() === 'Отмена');
        const ratingBlock = g('game-rating-stars')?.parentElement;
        const picker = g('gx-picker'), blk = g('gx-block');
        const coopLabel = g('gx-coop')?.closest('label');
        const platRow = g('game-platform')?.closest('.grid');

        // скрываем длинные подсказки
        blk?.querySelectorAll(':scope > p').forEach(p => p.classList.add('hidden'));
        more.querySelectorAll(':scope > p').forEach(p => p.classList.add('hidden'));
        if (coverBtn) { coverBtn.className = 'gxm-btn'; }
        digitalLabel?.classList.add('gxm-check');

        const cThumb = document.createElement('div'); cThumb.id = 'gxm-thumb'; cThumb.className = 'gxm-thumb';
        const coverRow = document.createElement('div'); coverRow.className = 'flex items-center gap-3';
        coverRow.append(cThumb); const cr = document.createElement('div'); cr.className = 'flex-1 space-y-2'; [coverBtn, coverStatus].forEach(n => n && cr.appendChild(n)); coverRow.append(cr);

        const left = document.createElement('div'); left.className = 'gxm-col';
        left.append(
            card('📝 Основное', wrap([g('game-title'), rowOf('game-developer'), rowOf('game-year'), g('game-edition'), g('game-url')])),
            card('🎮 Платформа и формат', picker, digitalLabel, regionCell),
            card('🖼 Обложка', coverRow, coverFile)
        );
        const right = document.createElement('div'); right.className = 'gxm-col';
        const pBlock = more.querySelector('#gx-parts-box'), tBlock = more.querySelector('#gx-trophy')?.parentElement, nBlock = more.querySelector('#gx-note')?.parentElement;
        right.append(
            card('🚦 Прохождение', blk, coopLabel, ratingBlock),
            card('🏆 Ачивки', tBlock),
            card('📦 Комплектность', pBlock),
            card('💬 Заметки', nBlock)
        );
        // убираем подписи, которые теперь дублируют заголовки карточек
        tBlock?.querySelector(':scope > label')?.remove(); pBlock?.querySelector(':scope > label')?.remove(); nBlock?.querySelector(':scope > label')?.remove();
        if (pBlock) pBlock.closest('.gxm-card').id = 'gxm-parts-card';

        const grid = document.createElement('div'); grid.className = 'gxm-wrap'; grid.append(left, right);
        const foot = document.createElement('div'); foot.className = 'gxm-foot';
        [cancelBtn, saveBtn].forEach(b => { if (b) { b.classList.add('gxm-fbtn'); foot.appendChild(b); } });
        [...panel.children].forEach(n => { if (n !== header && n.type !== 'hidden' && n.id !== 'game-edit-id') n.remove?.(); });
        // hidden-инпут и скрытая платформа (select) остаются в DOM — на них опирается сохранение
        if (platRow) { platRow.className = 'hidden'; panel.appendChild(platRow); }
        panel.append(grid, foot);
    }

    function paintParts() {
        const dig = $('game-digital')?.checked;
        $('gx-parts').innerHTML = PARTS.map(([k, ico, l]) => `<button type="button" class="gd-part${mParts[k] ? ' is-on' : ''}" data-p="${k}" aria-pressed="${!!mParts[k]}">${ico} ${l}${mParts[k] ? ' ✓' : ''}</button>`).join('');
    }
    function paintTrophy() {
        const opt = (v, l) => `<button type="button" class="gx-status st-${v === 'full' ? 'completed' : v === 'some' ? 'playing' : 'none'}${mTrophy === v ? ' is-on' : ''}" data-t="${v}" aria-pressed="${mTrophy === v}">${l}</button>`;
        $('gx-trophy').innerHTML = opt('', 'Не отслеживаю') + opt('some', '🎯 Собираю') + opt('full', '🏆 Всё получено (100%)');
        $('gx-tnums').classList.toggle('hidden', !mTrophy);
    }

    function wrapModal() {
        const openPrev = window.openGameModal;
        window.openGameModal = (id = null) => {
            openPrev(id);
            setupEditor();
            const g = id ? gameById(id) : null;
            mTrophy = g?.trophy || '';
            mParts = { ...(g?.parts || {}) };
            if ($('gx-more')) {
                $('gx-tdone').value = g?.trophyDone || '';
                $('gx-ttotal').value = g?.trophyTotal || '';
                $('gx-note').value = g?.note || '';
                $('gx-coop').checked = !!g?.coop;
                paintTrophy(); syncDigital();
                const th = $('gxm-thumb');
                if (th) { const u = String(g?.img || ''); th.innerHTML = /^(data:image\/|https?:\/\/)/i.test(u) ? `<img src="${esc(u)}" alt="">` : '🎮'; }
            }
        };
        const savePrev = window.saveGameItem;
        window.saveGameItem = async (...args) => {
            const editId = Number($('game-edit-id')?.value) || null;
            const before = new Set((data.games || []).map(x => x.id));
            const ex = $('gx-more') ? {
                trophy: mTrophy,
                trophyDone: Math.max(0, parseInt($('gx-tdone').value) || 0),
                trophyTotal: Math.max(0, parseInt($('gx-ttotal').value) || 0),
                note: $('gx-note').value,
                coop: $('gx-coop').checked,
                parts: { ...mParts }
            } : null;
            await savePrev(...args);
            const item = editId ? gameById(editId) : (data.games || []).find(x => !before.has(x.id));
            if (!ex || !item || !$('game-modal').classList.contains('hidden')) return;   // форма осталась открытой — сохранение не прошло
            item.trophy = ex.trophy;
            item.trophyDone = ex.trophy ? ex.trophyDone : 0;
            item.trophyTotal = ex.trophy ? ex.trophyTotal : 0;
            item.note = ex.note;
            item.coop = !!ex.coop;
            item.parts = item.digital ? (item.parts || {}) : ex.parts;
            try { checkAchievements(); } catch (_) {}
            persistData();
            try { updateUI(); } catch (_) {}
            const det = $('game-detail-modal');
            if (det && !det.classList.contains('hidden') && typeof window.openGameDetail === 'function') window.openGameDetail(item.id);
        };
    }

    /* ================= СТРАНИЦА ИГРЫ: только просмотр ================= */
    const css = document.createElement('style');
    css.textContent = `.gv-line{font-size:13px;color:#d1d5db;display:flex;flex-wrap:wrap;gap:6px 16px}.gv-line b{color:#fff}
    .gv-note{white-space:pre-wrap;overflow-wrap:anywhere;font-size:14px;line-height:1.6;color:#e5e7eb;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:12px 14px}
    .gv-st{pointer-events:none}
    .gxm-wrap{display:grid;grid-template-columns:1fr;gap:16px;margin-top:14px}
    @media(min-width:860px){.gxm-wrap{grid-template-columns:1.1fr 1fr;align-items:start}}
    .gxm-col{display:flex;flex-direction:column;gap:14px;min-width:0}
    .gxm-card{display:flex;flex-direction:column;gap:12px;padding:16px;border-radius:18px;background:rgba(255,255,255,.035);border:1px solid rgba(255,255,255,.08)}
    .gxm-t{font-size:11px;font-weight:900;letter-spacing:.12em;text-transform:uppercase;color:#9ca3af}
    .gxm-fields{display:flex;flex-direction:column;gap:10px}
    .gxm-fields .grid{display:grid}
    .gxm-thumb{width:84px;height:84px;border-radius:16px;overflow:hidden;background:rgba(255,255,255,.06);display:flex;align-items:center;justify-content:center;font-size:30px;flex-shrink:0;border:1px solid rgba(255,255,255,.1)}
    .gxm-thumb img{width:100%;height:100%;object-fit:cover}
    .gxm-btn{width:100%;padding:10px;border-radius:12px;font-weight:800;font-size:13px;color:#fff;background:rgba(6,182,212,.7);cursor:pointer}
    .gxm-check{display:flex;align-items:center;gap:8px;font-size:13px;color:#d1d5db;padding:10px 12px;border-radius:12px;background:rgba(255,255,255,.04)}
    .gxm-foot{position:sticky;bottom:-1.5rem;display:flex;gap:10px;justify-content:flex-end;margin:16px -1.75rem -1.5rem;padding:14px 1.75rem;background:rgba(13,13,20,.88);backdrop-filter:blur(10px);border-top:1px solid rgba(255,255,255,.08)}
    .gxm-fbtn{flex:0 0 auto;width:auto!important;padding:11px 26px!important;border-radius:12px!important;font-weight:800}
    .gxm-foot .gxm-fbtn:last-child{flex:1 1 auto;max-width:340px}
    @media(max-width:600px){.gxm-foot{justify-content:stretch}.gxm-fbtn{flex:1!important;max-width:none!important}}
    /* страница игры: шире и компактнее */
    @media(min-width:900px){#game-detail-modal .gd-panel{max-width:min(1180px,96vw)!important}}
    .gv-grid{display:grid;grid-template-columns:1fr;gap:14px;margin-top:20px}
    @media(min-width:860px){.gv-grid{grid-template-columns:repeat(2,minmax(0,1fr));align-items:start}}
    .gv-grid > .gd-sec{margin-top:0!important;padding:14px 16px;border-radius:18px;background:rgba(255,255,255,.035);border:1px solid rgba(255,255,255,.07)}
    `;
    document.head.appendChild(css);

    function secBy(body, sel) { const el = body.querySelector(sel); return el ? el.closest('.gd-sec') : null; }

    function viewMode() {
        const body = $('gd-body');
        const modal = $('game-detail-modal');
        if (!body || !body.firstElementChild || body.dataset.gvDone === '1' || !modal || modal.classList.contains('hidden')) return;
        const idEl = body.querySelector('[data-act="share"][data-id]');
        const g = idEl ? gameById(idEl.dataset.id) : null;
        if (!g) return;
        body.dataset.gvDone = '1';

        // оценка — только показ
        const rg = body.querySelector('[data-act="rate"]')?.parentElement;
        if (rg) { if (g.rating) rg.outerHTML = `<div class="text-xl text-yellow-400" aria-label="Оценка ${g.rating} из 5">${stars(g.rating)}</div>`; else rg.remove(); }

        // «Прохождение»
        const st = secBy(body, '[data-act="status"]');
        if (st) {
            const btns = st.querySelectorAll('[data-act="status"]');
            let any = false;
            btns.forEach(b => { if (b.classList.contains('is-on')) { any = true; b.removeAttribute('data-act'); b.classList.add('gv-st'); } else b.remove(); });
            if (!any) st.querySelector('[role="group"]').innerHTML = '<span class="text-sm text-gray-500">Статус не выбран</span>';
            st.querySelector('.grid')?.remove();
            const online = st.querySelector('[data-act="online"]')?.closest('.border-t');
            online?.remove();
            const lines = [];
            if (Number(g.hours)) lines.push(`⏱ Наиграно: <b>${Math.round(Number(g.hours) * 10) / 10} ч</b>`);
            if (g.discCode) lines.push(`💿 Код диска: <b>${esc(g.discCode)}</b>`);
            if (lines.length) st.insertAdjacentHTML('beforeend', `<div class="gv-line mt-3">${lines.map(l => `<span>${l}</span>`).join('')}</div>`);
            if (!st.querySelector('[role=group] > *')) st.querySelector('[role=group]').remove();
        }
        // ачивки
        const tr = secBy(body, '[data-act="trophy"]');
        if (tr) {
            if (!g.trophy) tr.remove();
            else {
                tr.querySelectorAll('[data-act="trophy"]').forEach(b => { if (b.classList.contains('is-on')) { b.removeAttribute('data-act'); b.classList.add('gv-st'); } else b.remove(); });
                tr.querySelector('.grid')?.remove();
                const d = Number(g.trophyDone) || 0, t = Number(g.trophyTotal) || 0;
                if (t) tr.querySelector('.gd-sec-title')?.insertAdjacentHTML('afterend', '');
                if (t) tr.insertAdjacentHTML('beforeend', `<p class="text-xs text-gray-400 mt-1">Получено: <b class="text-white">${d}</b> из ${t}</p>`);
            }
        }
        // регион — уже есть чипом в шапке
        secBy(body, '[data-act="region"]')?.remove();
        // комплектность
        const pt = secBy(body, '[data-act="part"]');
        if (pt) {
            const on = [...pt.querySelectorAll('[data-act="part"].is-on')];
            pt.querySelectorAll('[data-act="part"]').forEach(b => { if (b.classList.contains('is-on')) { b.removeAttribute('data-act'); b.classList.add('gv-st'); } else b.remove(); });
            if (!on.length) pt.remove();
        }
        // заметки
        const nt = secBy(body, '#gd-note');
        let ntEl = nt;
        if (nt) {
            if (!String(g.note || '').trim()) { nt.remove(); ntEl = null; }
            else nt.innerHTML = `<p class="gd-sec-title">Заметки и личное мнение</p><div class="gv-note">${esc(g.note)}</div>`;
        }
        // прохождение + ачивки в одну линию, комплектность + заметки — следующая линия
        const items = [st, tr && tr.isConnected ? tr : null, pt && pt.isConnected ? pt : null, ntEl].filter(Boolean);
        if (items.length) {
            const grid = document.createElement('div'); grid.className = 'gv-grid';
            const anchor = body.querySelector('.gdx-tiles') || body.querySelector(':scope > .flex');
            if (anchor) anchor.after(grid); else body.prepend(grid);
            items.forEach(el => { grid.appendChild(el); if (el === ntEl || el === pt) { /* заметки на всю ширину, если одни */ } });
            if (ntEl && items.length % 2 === 1 && items[items.length - 1] === ntEl) ntEl.style.gridColumn = '1 / -1';
        }
    }

    function init() {
        const body = $('gd-body');
        if (body) new MutationObserver(() => { body.dataset.gvDone = ''; viewMode(); }).observe(body, { childList: true });
    }

    wrapModal();
    if ($('gd-body')) init(); else document.addEventListener('DOMContentLoaded', init);
})();
