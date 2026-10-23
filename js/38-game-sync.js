/* =========================================================
   MIRVEL HUB — 38-game-sync.js (подключается после 37-game-dlc.js)
   Синхронизация версий одной игры (Steam / Epic / PS / Xbox …).
   • версии ищутся автоматически по названию; можно привязать вручную или отвязать
   • часы остаются у каждой версии свои — в блоке видно разбивку по платформам и общий итог
   • дополнения (DLC) объединяются между версиями
   • достижения по умолчанию НЕ синхронизируются (включается переключателем)
   Данные: game.sync = { hours, dlcs, trophies, links:[id], ignore:[id] } — необязательное поле,
   у старых игр его нет — работают значения по умолчанию. Попадает в бэкап вместе с игрой.
   ========================================================= */
(() => {
    'use strict';
    const $ = id => document.getElementById(id);
    const gameById = id => (data.games || []).find(x => x.id === Number(id));
    const num = v => Math.max(0, Number(v) || 0);
    const hrs = h => `${Math.round(num(h) * 10) / 10} ч`;
    const normT = t => String(t || '').replace(/[™®©℠]/g, '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/&/g, ' and ').replace(/[^\p{L}\p{N}]+/gu, '');
    const dlcsOf = g => (Array.isArray(g?.dlcs) ? g.dlcs : []);

    const opts = g => ({ hours: true, dlcs: true, trophies: false, links: [], ignore: [], ...(g?.sync || {}) });
    function setOpt(g, patch) { g.sync = { ...opts(g), ...patch }; }

    /** все версии этой же игры (без неё самой) */
    function siblings(g) {
        const o = opts(g), key = normT(g.title);
        const out = new Map();
        (data.games || []).forEach(x => {
            if (x.id === g.id || o.ignore.includes(x.id)) return;
            if (opts(x).ignore.includes(g.id)) return;
            if (key && normT(x.title) === key) out.set(x.id, { g: x, auto: true });
        });
        o.links.forEach(id => { const x = gameById(id); if (x && x.id !== g.id && !out.has(id)) out.set(id, { g: x, auto: false }); });
        (data.games || []).forEach(x => { if (x.id !== g.id && opts(x).links.includes(g.id) && !out.has(x.id) && !o.ignore.includes(x.id)) out.set(x.id, { g: x, auto: false }); });
        return [...out.values()];
    }

    /* ---------- слияние ---------- */
    const DLC_FIELDS = ['title', 'type', 'price', 'date', 'owned', 'done', 'note', 'url', 'img', 'from', 'free', 'giftFrom', 'rating'];
    function copyDlc(src, from) { const r = { id: 'd' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5) }; DLC_FIELDS.forEach(k => { if (src[k] !== undefined) r[k] = Array.isArray(src[k]) ? [...src[k]] : src[k]; }); if (!r.from || !r.from.length) r.from = from && from.platform ? [from.platform] : []; return r; }

    /** источник правды — g: добавляет недостающие дополнения и обновляет совпавшие по названию */
    function pushDlcs(g, overwrite) {
        if (!opts(g).dlcs) return 0;
        let changed = 0;
        siblings(g).forEach(({ g: s }) => {
            if (!opts(s).dlcs) return;
            if (!Array.isArray(s.dlcs)) s.dlcs = [];
            dlcsOf(g).forEach(d => {
                const ex = s.dlcs.find(x => normT(x.title) === normT(d.title));
                if (!ex) { s.dlcs.push(copyDlc(d, g)); changed++; }
                else if (overwrite) { DLC_FIELDS.forEach(k => { if (k === 'from') return; if (d[k] !== undefined && ex[k] !== d[k]) { ex[k] = d[k]; changed++; } }); }
                else DLC_FIELDS.forEach(k => { if ((ex[k] === undefined || ex[k] === '' || ex[k] === 0) && d[k]) { ex[k] = d[k]; changed++; } });
            });
        });
        return changed;
    }
    /** полная синхронизация: сначала собираем недостающее со всех, потом раздаём */
    function syncAll(g) {
        let n = 0;
        if (opts(g).dlcs) {
            siblings(g).forEach(({ g: s }) => { if (opts(s).dlcs) n += pushDlcs(s, false); });
            n += pushDlcs(g, false);
        }
        if (opts(g).trophies) {
            const src = [g, ...siblings(g).map(x => x.g)].filter(x => opts(x).trophies && x.trophy)
                .sort((a, b) => num(b.trophyDone) - num(a.trophyDone))[0];
            if (src) [g, ...siblings(g).map(x => x.g)].forEach(x => {
                if (!opts(x).trophies || x === src) return;
                x.trophy = src.trophy; x.trophyDone = src.trophyDone; x.trophyTotal = src.trophyTotal; n++;
            });
        }
        return n;
    }

    function persist() { try { checkAchievements(); } catch (_) {} const ok = persistData(); try { updateUI(); } catch (_) {} return ok; }

    /* ---------- стили ---------- */
    const css = document.createElement('style');
    css.textContent = `
    .gsy-row{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:14px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08)}
    .gsy-row.is-me{border-color:rgba(139,92,246,.5);background:rgba(139,92,246,.08)}
    .gsy-row .gsy-h{margin-left:auto;text-align:right;font-weight:900;color:#fff;white-space:nowrap}
    .gsy-row .gsy-h small{display:block;font-size:10px;color:#9ca3af;font-weight:700}
    .gsy-bar{height:6px;border-radius:99px;background:rgba(255,255,255,.08);overflow:hidden;margin-top:6px}
    .gsy-bar i{display:block;height:100%;background:var(--theme-btn,#8b5cf6)}
    .gsy-set{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}
    .gsy-tg{padding:6px 12px;border-radius:12px;font-size:12px;font-weight:800;cursor:pointer;color:#9ca3af;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);transition:all .2s}
    .gsy-tg.is-on{color:#34d399;border-color:rgba(52,211,153,.5);background:rgba(52,211,153,.12)}
    .gsy-x{padding:4px 8px;border-radius:8px;font-size:11px;cursor:pointer;color:#9ca3af;background:rgba(255,255,255,.06)}
    .gsy-x:hover{color:#fca5a5}
    `;
    document.head.appendChild(css);

    let panelOpen = false;

    function sectionHTML(g) {
        const sib = siblings(g), o = opts(g);
        const all = [{ g, me: true }, ...sib.map(s => ({ g: s.g, auto: s.auto }))];
        const total = all.reduce((s, x) => s + num(x.g.hours), 0);
        const rows = all.map(x => {
            const h = num(x.g.hours), pct = total ? Math.round(h / total * 100) : 0;
            const dl = dlcsOf(x.g).filter(d => d.owned).length;
            return `<div class="gsy-row${x.me ? ' is-me' : ''}" ${x.me ? '' : `data-sid="${x.g.id}"`}>
                <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-2 flex-wrap">${window.mhPlatLogo ? window.mhPlatLogo.pill(x.g.platform || 'Другое') : esc(x.g.platform || '')}
                        <span class="text-sm font-bold text-white">${x.me ? 'Эта версия' : esc(x.g.title)}</span>
                        ${x.me ? '' : `<span class="text-[10px] text-gray-500">${x.auto ? 'найдена по названию' : 'добавлена вручную'}</span>`}</div>
                    <div class="gsy-bar"><i style="width:${pct}%"></i></div>
                    <p class="text-[11px] text-gray-500 mt-1">🧩 ${dl} доп.${x.g.trophy ? ` · 🏆 ${x.g.trophy === 'full' ? '100%' : `${num(x.g.trophyDone)}/${num(x.g.trophyTotal) || '?'}`}` : ''}</p>
                </div>
                <div class="gsy-h">${h ? hrs(h) : '—'}<small>${h && total ? pct + '%' : 'нет часов'}</small></div>
                ${x.me ? '' : `<button type="button" class="gsy-x" data-act="gsy-open" title="Открыть эту версию">↗</button><button type="button" class="gsy-x" data-act="gsy-unlink" title="Отвязать">✕</button>`}
            </div>`;
        }).join('');
        const used = new Set([g.id, ...sib.map(s => s.g.id)]);
        const cand = (data.games || []).filter(x => !used.has(x.id)).sort((a, b) => String(a.title).localeCompare(String(b.title), 'ru'));
        const tg = (k, label) => `<button type="button" class="gsy-tg${o[k] ? ' is-on' : ''}" data-act="gsy-tg" data-k="${k}" aria-pressed="${!!o[k]}">${o[k] ? '✓ ' : ''}${label}</button>`;
        return `<div class="gd-sec mt-5" id="gsy">
            <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
                <p class="gd-sec-title mb-0">🔗 Версии игры${sib.length ? ` · ${all.length}` : ''}</p>
                <div class="flex gap-2 flex-wrap">${sib.length ? '<button type="button" class="gd-tool" data-act="gsy-sync">🔄 Синхронизировать</button>' : ''}<button type="button" class="gd-tool" data-act="gsy-panel">${panelOpen ? 'Скрыть' : '＋ Привязать версию'}</button></div>
            </div>
            ${sib.length ? `<div class="space-y-2">${rows}</div>
                <p class="text-xs text-gray-400 mt-3">Всего по всем версиям: <b class="text-white">${total ? hrs(total) : '—'}</b></p>`
                : '<p class="text-xs text-gray-500">Других версий этой игры в коллекции не найдено. Добавьте игру на другой платформе с тем же названием — она подтянется сама, или привяжите вручную.</p>'}
            <div class="gsy-set" role="group" aria-label="Что синхронизировать">
                <span class="text-[11px] text-gray-500 self-center">Синхронизировать:</span>
                ${tg('hours', '⏱ Часы (разбивка и итог)')}${tg('dlcs', '🧩 Дополнения')}${tg('trophies', '🏆 Достижения')}
            </div>
            ${panelOpen ? `<div class="mt-3 flex gap-2 flex-wrap"><select id="gsy-pick" class="gd-input" style="max-width:100%;background:#0d0d14"><option value="">— выберите игру из коллекции —</option>${cand.map(x => `<option value="${x.id}">${esc(x.title)} · ${esc(x.platform || '')}</option>`).join('')}</select>
                <button type="button" class="gd-tool" data-act="gsy-link">Привязать</button></div>
                <p class="text-[11px] text-gray-500 mt-2">Нужной версии нет в списке? Сначала добавьте игру обычной кнопкой «＋», потом вернитесь сюда — если название совпадает, она привяжется автоматически.</p>` : ''}
        </div>`;
    }

    function decorate() {
        const body = $('gd-body');
        if (!body || !body.firstElementChild || body.querySelector('#gsy')) return;
        const modal = $('game-detail-modal');
        if (!modal || modal.classList.contains('hidden')) return;
        const g = current();
        if (!g) return;
        const t = document.createElement('div');
        t.innerHTML = sectionHTML(g);
        const dlc = body.querySelector('#gdx-dlc');
        const tiles = body.querySelector('.gdx-tiles');
        if (dlc) dlc.before(t.firstElementChild);
        else if (tiles) tiles.after(t.firstElementChild);
        else { const first = body.querySelector(':scope > .gd-sec'); if (first) first.before(t.firstElementChild); else body.appendChild(t.firstElementChild); }
    }
    function current() { const el = document.querySelector('#gd-body [data-act="share"][data-id]'); return el ? gameById(el.dataset.id) : null; }
    function rerender() { const g = current(); if (g && typeof window.openGameDetail === 'function') window.openGameDetail(g.id); else refresh(); }
    function refresh() { const g = current(); const old = $('gsy'); if (!g || !old) return; const t = document.createElement('div'); t.innerHTML = sectionHTML(g); old.replaceWith(t.firstElementChild); }

    function init() {
        const body = $('gd-body'), modal = $('game-detail-modal');
        if (!body || !modal) return;
        new MutationObserver(() => decorate()).observe(body, { childList: true });
        modal.addEventListener('click', e => {
            const a = e.target.closest('[data-act^="gsy-"]');
            if (a) {
                const g = current(); if (!g) return;
                const sid = Number(a.closest('[data-sid]')?.dataset.sid);
                switch (a.dataset.act) {
                    case 'gsy-panel': panelOpen = !panelOpen; refresh(); break;
                    case 'gsy-tg': { const k = a.dataset.k; setOpt(g, { [k]: !opts(g)[k] }); persist(); rerender(); break; }
                    case 'gsy-sync': { const n = syncAll(g); persist(); rerender(); showToast(n ? `Синхронизировано: ${n} изм. 🔄` : 'Всё уже совпадает ✓', 'success'); break; }
                    case 'gsy-link': {
                        const id = Number($('gsy-pick')?.value); if (!id) { showToast('Выберите игру', 'error'); break; }
                        const o = opts(g); setOpt(g, { links: [...new Set([...o.links, id])], ignore: o.ignore.filter(x => x !== id) });
                        const s = gameById(id); if (s) setOpt(s, { ignore: opts(s).ignore.filter(x => x !== g.id) });
                        const n = syncAll(g); persist(); panelOpen = false; rerender(); showToast(`Версия привязана 🔗${n ? ` · синхронизировано: ${n}` : ''}`, 'success'); break;
                    }
                    case 'gsy-unlink': {
                        if (!sid) break;
                        const o = opts(g); setOpt(g, { links: o.links.filter(x => x !== sid), ignore: [...new Set([...o.ignore, sid])] });
                        const s = gameById(sid); if (s) setOpt(s, { links: opts(s).links.filter(x => x !== g.id) });
                        persist(); rerender(); showToast('Версия отвязана'); break;
                    }
                    case 'gsy-open': if (sid && typeof window.openGameDetail === 'function') window.openGameDetail(sid); break;
                }
                return;
            }
            // удаление дополнения: убираем его и у других версий (если у них включена синхронизация дополнений)
            if (e.target.closest('[data-act="dlc-del"]')) {
                setTimeout(() => {
                    const g = current(), l = window.__mhLastDlc;
                    if (!g || !l || l.gid !== g.id || !opts(g).dlcs || dlcsOf(g).some(x => x.id === l.d.id)) return;
                    let n = 0;
                    siblings(g).forEach(({ g: s }) => {
                        if (!opts(s).dlcs || !Array.isArray(s.dlcs)) return;
                        const before = s.dlcs.length;
                        s.dlcs = s.dlcs.filter(x => normT(x.title) !== normT(l.d.title));
                        n += before - s.dlcs.length;
                    });
                    window.__mhLastDlc = null;
                    if (n) persist();
                    refresh();
                }, 0);
                return;
            }
            // после любого действия с дополнением (обработчик 37-game-dlc.js уже отработал) — раздаём изменения версиям
            if (e.target.closest('[data-act="dlc-save"],[data-act="dlc-own"],[data-act="dlc-done"]')) {
                setTimeout(() => { const g = current(); if (g && siblings(g).length && pushDlcs(g, true)) persist(); refresh(); }, 0);
            }
        });
        new MutationObserver(() => { if (modal.classList.contains('hidden')) panelOpen = false; }).observe(modal, { attributes: true, attributeFilter: ['class'] });
    }

    window.mhGameSiblings = g => siblings(g).map(s => s.g);
    window.mhGameTotalHours = g => opts(g).hours ? [g, ...siblings(g).filter(s => opts(s.g).hours).map(s => s.g)].reduce((s, x) => s + num(x.hours), 0) : num(g.hours);

    if ($('gd-body')) init(); else document.addEventListener('DOMContentLoaded', init);
})();
