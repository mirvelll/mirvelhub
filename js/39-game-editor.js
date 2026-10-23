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
        modal.firstElementChild.style.maxWidth = '620px';
        // регион снова виден (раньше был спрятан)
        const reg = $('game-region');
        if (reg) { const row = reg.closest('.grid'); if (row) { row.classList.remove('hidden'); row.className = 'grid grid-cols-1 gap-3'; } }

        const more = document.createElement('div');
        more.id = 'gx-more';
        more.className = 'space-y-3';
        more.innerHTML = `
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
        $('game-digital')?.addEventListener('change', paintParts);
        return true;
    }
    function paintParts() {
        const dig = $('game-digital')?.checked;
        $('gx-parts-box').classList.toggle('hidden', !!dig);
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
                paintParts(); paintTrophy();
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
                parts: { ...mParts }
            } : null;
            await savePrev(...args);
            const item = editId ? gameById(editId) : (data.games || []).find(x => !before.has(x.id));
            if (!ex || !item || !$('game-modal').classList.contains('hidden')) return;   // форма осталась открытой — сохранение не прошло
            item.trophy = ex.trophy;
            item.trophyDone = ex.trophy ? ex.trophyDone : 0;
            item.trophyTotal = ex.trophy ? ex.trophyTotal : 0;
            item.note = ex.note;
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
    .gv-st{pointer-events:none}`;
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
        if (nt) {
            if (!String(g.note || '').trim()) nt.remove();
            else nt.innerHTML = `<p class="gd-sec-title">Заметки и личное мнение</p><div class="gv-note">${esc(g.note)}</div>`;
        }
    }

    function init() {
        const body = $('gd-body');
        if (body) new MutationObserver(() => { body.dataset.gvDone = ''; viewMode(); }).observe(body, { childList: true });
    }

    wrapModal();
    if ($('gd-body')) init(); else document.addEventListener('DOMContentLoaded', init);
})();
