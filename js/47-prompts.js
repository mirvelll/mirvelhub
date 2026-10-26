/* =========================================================
   MIRVEL HUB — 47-prompts.js (подключается после 46-game-achievements.js)
   Вкладка «📝 Промпты» в настройках: твои заготовки текста для нейросетей.
   • в начале уже лежит промпт «Ачивки по скриншотам» (скрины → строки для импорта в игру);
   • «Скопировать» — в буфер обмена; ✏️ — править; 🗑 — удалить; «➕ Новый промпт» — добавить свой.
   Данные: data.prompts = [{ id, title, text }] (входят в бэкап вместе с остальным).
   ========================================================= */
(() => {
    'use strict';
    const $ = id => document.getElementById(id);
    const toast = (m, t) => { try { showToast(m, t); } catch (_) {} };
    const uid = () => 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const list = () => Array.isArray(data.prompts) ? data.prompts : (data.prompts = []);
    let editId = null;

    function seed() {
        if (data.promptsSeeded || !window.MH_ACH_PROMPT) return;
        data.promptsSeeded = true;
        if (!list().some(p => p.id === 'ach-screens')) list().unshift({ id: 'ach-screens', title: 'Ачивки по скриншотам', text: window.MH_ACH_PROMPT });
        try { persistData(); } catch (_) {}
    }

    async function copy(t) {
        try { await navigator.clipboard.writeText(t); return true; } catch (_) {}
        try { const ta = document.createElement('textarea'); ta.value = t; ta.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(ta); ta.select(); const ok = document.execCommand('copy'); ta.remove(); return ok; } catch (_) { return false; }
    }

    function paint() {
        const body = $('pr-body');
        if (!body) return;
        const items = list();
        body.innerHTML = (items.length ? items.map(p => p.id === editId ? `
            <div class="pr-item is-edit" data-pid="${esc(p.id)}">
                <input class="gd-input" id="pr-title" maxlength="80" value="${esc(p.title)}" placeholder="Название промпта">
                <textarea class="gd-input pr-text" id="pr-text" rows="8" placeholder="Текст промпта">${esc(p.text)}</textarea>
                <div class="flex gap-2"><button type="button" class="gd-tool" data-pr="save">Сохранить</button><button type="button" class="gd-tool" data-pr="cancel">Отмена</button></div>
            </div>` : `
            <details class="pr-item" data-pid="${esc(p.id)}">
                <summary><span class="pr-title">${esc(p.title || 'Без названия')}</span><span class="pr-meta">${(p.text || '').length} симв.</span></summary>
                <pre class="pr-pre">${esc(p.text)}</pre>
                <div class="flex flex-wrap gap-2 mt-2">
                    <button type="button" class="gd-tool" data-pr="copy">📋 Скопировать</button>
                    <button type="button" class="gd-tool" data-pr="edit">✏️ Изменить</button>
                    <button type="button" class="gd-tool" data-pr="del">🗑 Удалить</button>
                </div>
            </details>`).join('') : '<p class="text-sm text-gray-500">Пока пусто. Добавь свой первый промпт.</p>')
            + '<button type="button" class="gd-tool mt-2" data-pr="new">➕ Новый промпт</button>';
    }

    function build() {
        if ($('prompts-card')) return true;
        const host = document.querySelector('#profile .grid > div.space-y-6:not(.glass)');
        if (!host) return false;
        seed();
        const card = document.createElement('div');
        card.id = 'prompts-card';
        card.className = 'glass p-8 rounded-3xl space-y-4';
        card.dataset.stab = 'prompts';
        card.innerHTML = `<h3 class="font-bold text-xl">📝 Промпты</h3>
            <p class="text-sm text-gray-400">Заготовки текста для нейросетей: скопировал, вставил в чат вместе со скриншотами — получил готовый результат. Сюда можно добавлять свои промпты на будущее.</p>
            <div id="pr-body" class="space-y-2"></div>`;
        host.appendChild(card);
        card.addEventListener('click', async e => {
            const b = e.target.closest('[data-pr]');
            if (!b) return;
            const id = b.closest('[data-pid]')?.dataset.pid;
            const p = list().find(x => x.id === id);
            switch (b.dataset.pr) {
                case 'copy': if (p) toast((await copy(p.text)) ? 'Промпт скопирован 📋' : 'Не удалось скопировать', 'info'); break;
                case 'edit': editId = id; paint(); break;
                case 'cancel': editId = null; if (list().some(x => x.id === 'new-tmp')) data.prompts = list().filter(x => x.id !== 'new-tmp'); paint(); break;
                case 'new': { const n = { id: 'new-tmp', title: '', text: '' }; list().push(n); editId = n.id; paint(); $('pr-title')?.focus(); break; }
                case 'save': {
                    const t = ($('pr-title')?.value || '').trim(), x = ($('pr-text')?.value || '').trim();
                    if (!p || !x) { toast('Напиши текст промпта', 'error'); break; }
                    p.title = t.slice(0, 80) || 'Без названия'; p.text = x.slice(0, 20000);
                    if (p.id === 'new-tmp') p.id = uid();
                    editId = null; try { persistData(); } catch (_) {} paint(); break;
                }
                case 'del':
                    if (!p || !(await mhConfirm(`Удалить промпт «${p.title}»?`, { title: 'Удалить промпт?', okText: 'Удалить', danger: true }))) break;
                    data.prompts = list().filter(x => x !== p); try { persistData(); } catch (_) {} paint(); break;
            }
        });
        paint();
        return true;
    }

    // карточка вставляется, когда настройки уже построены (как у 42-platform-settings.js)
    function init() {
        if (build()) return;
        let n = 0; const iv = setInterval(() => { if (build() || ++n > 15) clearInterval(iv); }, 600);
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
    document.addEventListener('mirvel-ready', () => setTimeout(init, 0), { once: true });
})();
