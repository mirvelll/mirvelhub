/* =========================================================
   MIRVEL HUB — 47-prompts.js (подключается после 46-game-achievements.js)
   • «Правило версии сайта» — шаблон для ИИ: как повышать метку v20.xx при каждом обновлении;
   Вкладка «📝 Промпты» в настройках: твои заготовки текста для нейросетей.
   • в начале уже лежит промпт «Ачивки по скриншотам» (скрины → строки для импорта в игру);
   • «Скопировать» — в буфер обмена; ✏️ — править; 🗑 — удалить; «➕ Новый промпт» — добавить свой.
   • промпты лежат в ГРУППАХ (поле group): Ачивки / Музыка / Для сайта / свои — группу можно задать или выбрать при правке;
   • «Трек-лист альбома»: пишешь рядом с промптом название альбома (например «Extension?») — нейросеть отвечает
     списком в формате сайта, его вставляешь в «Вставить списком» на странице CD / винила.
   Данные: data.prompts = [{ id, title, text, group }] (входят в бэкап вместе с остальным).
   ========================================================= */
(() => {
    'use strict';
    const $ = id => document.getElementById(id);
    const toast = (m, t) => { try { showToast(m, t); } catch (_) {} };
    const uid = () => 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const list = () => Array.isArray(data.prompts) ? data.prompts : (data.prompts = []);
    let editId = null;
    const closedGroups = new Set();   // свёрнутые группы (только на время сессии)
    const NO_GROUP = 'Без группы';

    function seed() {
        if (data.promptsSeeded || !window.MH_ACH_PROMPT) return;
        data.promptsSeeded = true;
        if (!list().some(p => p.id === 'ach-screens')) list().unshift({ id: 'ach-screens', title: 'Ачивки по скриншотам', text: window.MH_ACH_PROMPT });
        try { persistData(); } catch (_) {}
    }

    /* Этап E: обновление встроенных промптов без перезаписи твоих правок (один раз, флаг data.promptsV2) */
    function upgrade() {
        if (data.promptsV2 || !window.MH_ACH_PROMPT) return;
        data.promptsV2 = true;
        const n = s => String(s || '').replace(/\s+/g, ' ').trim();
        const cur = list().find(p => p.id === 'ach-screens');
        let kept = false;
        if (cur && n(cur.text) === n(window.MH_ACH_PROMPT_OLD)) cur.text = window.MH_ACH_PROMPT;
        else if (cur) kept = true;
        else if (!data.promptsSeeded) list().unshift({ id: 'ach-screens', title: 'Ачивки по скриншотам', text: window.MH_ACH_PROMPT });
        if (!list().some(p => p.id === 'ach-guide') && window.MH_ACH_GUIDE) list().push({ id: 'ach-guide', title: 'Гайд по оставшимся ачивкам', text: window.MH_ACH_GUIDE });
        try { persistData(); } catch (_) {}
        if (kept) setTimeout(() => toast('📝 Промпт «Ачивки по скриншотам» ты правил — я его не трогал. Новый текст всё равно копируется кнопкой в окне импорта ачивок.', 'info'), 2500);
    }

    /* Этап F2: ещё два встроенных шаблона (один раз, флаг data.promptsV3; удалённые не возвращаются, твои правки не затираются) */
    function upgrade3() {
        if (data.promptsV3 || !window.MH_ACH_UPDATE) return;
        data.promptsV3 = true;
        const add = (id, title, text) => { if (text && !list().some(p => p.id === id)) list().push({ id, title, text }); };
        add('ach-screens-tt', 'Ачивки по скриншотам (с типами трофеев)', window.MH_ACH_PROMPT);
        add('ach-update', 'Обновить мой промпт под формат сайта', window.MH_ACH_UPDATE);
        try { persistData(); } catch (_) {}
    }


    /* Этап G: правило версии сайта (один раз, флаг data.promptsV4; удалённый не возвращается, твои правки не затираются) */
    const SITE_VERSION_PROMPT = `ПРАВИЛО ВЕРСИИ САЙТА — выполняй при КАЖДОМ обновлении сайта, даже если я об этом не напоминаю.

В левом нижнем углу сайта висит маленькая метка версии, например v20.27. После каждого обновления её нужно повышать: было v20.27 — стало v20.28.

Как это делается:
1. Открой js/00-storage.js, найди строку const BUILD = '20.27'; и увеличь число на 0.01 (20.27 → 20.28, 20.99 → 21.00). Метка в углу берётся из этой константы, и по ней же браузер подгружает свежие js-файлы (?v=BUILD). Без повышения мои правки могут не дойти до браузера из-за кэша.
2. В index.html в строке <script src="js/00-storage.js?v=…"> поставь то же самое число.
3. Если правил CSS-файл — в index.html у его <link href="css/….css?v=…"> тоже поставь новое число (то же, что BUILD).
4. Если создал НОВЫЙ js-файл — обязательно добавь его имя в массив SCRIPTS в js/00-storage.js (в нужное место порядка загрузки). Иначе файл не подключится.
5. Версию повышай один раз за одно обновление (одна порция правок = +0.01), даже если правок много. Если в этом же обновлении ты её уже повысил — второй раз не повышай.
6. В конце ответа напиши: «Версия сайта: v…» и коротко перечисли, что изменилось.`;
    function upgrade4() {
        if (data.promptsV4) return;
        data.promptsV4 = true;
        if (!list().some(p => p.id === 'site-version')) list().push({ id: 'site-version', title: 'Правило версии сайта (v20.xx) — для ИИ', text: SITE_VERSION_PROMPT });
        try { persistData(); } catch (_) {}
    }

    /* Этап H: группы + промпт «Трек-лист альбома» (один раз, флаг data.promptsV5; удалённый не возвращается, твои правки не затираются) */
    const TRACKLIST_PROMPT = `ТРЕК-ЛИСТ АЛЬБОМА ДЛЯ МОЕГО САЙТА — найди треклист и выдай его в формате моего сайта.

Название альбома (и исполнителя, если я его указал) я пишу в этом же сообщении — в самом начале или в самом конце, например «Extension?». Это и есть запрос.

Что сделать:
1. Определи альбом. Если исполнитель не указан — возьми самый известный альбом с таким названием. Если вариантов несколько и неясно какой — всё равно выбери самый вероятный и ОДНОЙ строкой перед блоком напиши, какой именно взял (исполнитель, год). Если есть поиск в интернете — сверься с ним.
2. Выдай список ОДНИМ блоком кода (чтобы я скопировал его кнопкой), строго в таком виде:
1. Название трека 3:45
2. Название трека 4:02
3. Название трека 2:58

Правила формата:
• одна строка = один трек, номер с точкой: «1.», «2.», …; нумерация сквозная
• длительность в конце строки через пробел, формат М:СС (3:45). Если точно не знаешь — пиши трек БЕЗ длительности, цифры не выдумывай
• названия как на оригинальном релизе (язык и написание), без перевода и пометок вроде [Explicit]; фиты оставляй в названии: «(feat. Имя)»
• несколько дисков или сторон винила — перед каждой группой отдельная строка с решёткой: «# Диск 2», «# Сторона B»
• бонус-треки — отдельной секцией «# Бонус-треки»
• в блоке никаких звёздочек, markdown, комментариев и пояснений — только строки списка

3. Вне блока кода больше ничего не пиши (кроме одной строки про выбранный альбом из пункта 1).
4. Не уверен в списке — скажи это одной строкой и не придумывай треки.

Дальше я вставлю блок на сайте: страница релиза → «Трек-лист» → «📋 Вставить списком».`;
    const BUILTIN_GROUPS = { 'ach-screens': 'Ачивки', 'ach-screens-tt': 'Ачивки', 'ach-update': 'Ачивки', 'ach-guide': 'Ачивки', 'site-version': 'Для сайта', 'tracklist': 'Музыка' };
    function upgrade5() {
        if (data.promptsV5) return;
        data.promptsV5 = true;
        if (!list().some(p => p.id === 'tracklist')) list().push({ id: 'tracklist', title: 'Трек-лист альбома (для вставки списком)', text: TRACKLIST_PROMPT, group: 'Музыка' });
        list().forEach(p => { if (!p.group && BUILTIN_GROUPS[p.id]) p.group = BUILTIN_GROUPS[p.id]; });
        try { persistData(); } catch (_) {}
    }

    const groupOf = p => String((p && p.group) || '').trim() || NO_GROUP;

    async function copy(t) {
        try { await navigator.clipboard.writeText(t); return true; } catch (_) {}
        try { const ta = document.createElement('textarea'); ta.value = t; ta.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(ta); ta.select(); const ok = document.execCommand('copy'); ta.remove(); return ok; } catch (_) { return false; }
    }

    function itemHTML(p) {
        return p.id === editId ? `
            <div class="pr-item is-edit" data-pid="${esc(p.id)}">
                <input class="gd-input" id="pr-title" maxlength="80" value="${esc(p.title)}" placeholder="Название промпта">
                <input class="gd-input" id="pr-group" list="pr-groups" maxlength="40" value="${esc(p.group || '')}" placeholder="Группа (выбери или впиши новую, например: Музыка)">
                <datalist id="pr-groups">${[...new Set(list().map(x => String(x.group || '').trim()).filter(Boolean))].map(g => `<option value="${esc(g)}">`).join('')}</datalist>
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
            </details>`;
    }

    function paint() {
        const body = $('pr-body');
        if (!body) return;
        const groups = [];
        list().forEach(p => {
            const g = groupOf(p);
            let o = groups.find(x => x.name === g);
            if (!o) groups.push(o = { name: g, items: [] });
            o.items.push(p);
        });
        groups.sort((a, b) => (a.name === NO_GROUP) - (b.name === NO_GROUP));
        body.innerHTML = (groups.length ? groups.map(g => `
            <details class="pr-group" data-g="${esc(g.name)}"${closedGroups.has(g.name) ? '' : ' open'}>
                <summary class="pr-group-h"><span>📁 ${esc(g.name)}</span><span class="pr-meta">${g.items.length}</span></summary>
                <div class="space-y-2 mt-2">
                    ${g.items.map(itemHTML).join('')}
                    <button type="button" class="gd-tool" data-pr="new" data-g="${g.name === NO_GROUP ? '' : esc(g.name)}">➕ Промпт в эту группу</button>
                </div>
            </details>`).join('') : '<p class="text-sm text-gray-500">Пока пусто. Добавь свой первый промпт.</p>')
            + '<button type="button" class="gd-tool mt-2" data-pr="new" data-g="">➕ Новый промпт</button>';
    }

    function build() {
        if ($('prompts-card')) return true;
        const host = document.querySelector('#profile .grid > div.space-y-6:not(.glass)');
        if (!host) return false;
        seed(); upgrade(); upgrade3(); upgrade4(); upgrade5();
        const card = document.createElement('div');
        card.id = 'prompts-card';
        card.className = 'glass p-8 rounded-3xl space-y-4';
        card.dataset.stab = 'prompts';
        card.innerHTML = `<h3 class="font-bold text-xl">📝 Промпты</h3>
            <p class="text-sm text-gray-400">Заготовки текста для нейросетей, разложенные по группам: скопировал, вставил в чат (со скриншотами или названием альбома) — получил готовый результат. Сюда можно добавлять свои промпты и группы.</p>
            <div id="pr-body" class="space-y-2"></div>`;
        host.appendChild(card);
        card.addEventListener('toggle', e => {
            const d = e.target;
            if (!d.classList || !d.classList.contains('pr-group')) return;
            if (d.open) closedGroups.delete(d.dataset.g); else closedGroups.add(d.dataset.g);
        }, true);
        card.addEventListener('click', async e => {
            const b = e.target.closest('[data-pr]');
            if (!b) return;
            const id = b.closest('[data-pid]')?.dataset.pid;
            const p = list().find(x => x.id === id);
            switch (b.dataset.pr) {
                case 'copy': if (p) toast((await copy(p.text)) ? 'Промпт скопирован 📋' : 'Не удалось скопировать', 'info'); break;
                case 'edit': editId = id; paint(); break;
                case 'cancel': editId = null; if (list().some(x => x.id === 'new-tmp')) data.prompts = list().filter(x => x.id !== 'new-tmp'); paint(); break;
                case 'new': { if (list().some(x => x.id === 'new-tmp')) data.prompts = list().filter(x => x.id !== 'new-tmp'); const n = { id: 'new-tmp', title: '', text: '', group: b.dataset.g || '' }; closedGroups.delete(b.dataset.g || NO_GROUP); list().push(n); editId = n.id; paint(); $('pr-title')?.focus(); break; }
                case 'save': {
                    const t = ($('pr-title')?.value || '').trim(), x = ($('pr-text')?.value || '').trim();
                    if (!p || !x) { toast('Напиши текст промпта', 'error'); break; }
                    p.title = t.slice(0, 80) || 'Без названия'; p.text = x.slice(0, 20000); p.group = ($('pr-group')?.value || '').trim().slice(0, 40);
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
