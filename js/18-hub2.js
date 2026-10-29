/* =========================================================
   MIRVEL HUB — 18-hub2.js (подключать ПОСЛЕ 17-convenience.js)
   1. Заметки: плавающая панель (двигается, меняет размер, поиск, закрепление, цвета, группы/подгруппы, иконки, картинки, ссылки)
   2. Главная: приветствие, чипы коллекции, «Избранное» (трек, клип, игра, любая ссылка), «Игра дня»
   3. Рейтинг артистов и обновлённое окно артиста
   4. Расширенная статистика (игры, оценки, месяцы, магазины, желаемое)
   5. Язык: русский / English / Українська
   6. Настройки интерфейса («Слушать» по умолчанию скрыто)
   Новые поля data: spotlights[], lang, showScrobble, since, noteGroups[{id,name,parent,closed}]; у заметок: pinned, color, ts, icon, gid, images[{id,src}], links[{id,url,title,img}]
   ========================================================= */
(() => {
    const $ = id => document.getElementById(id);
    const LSK = 'mirvel_ui2';
    const ui = {
        get(k, d) { try { const v = JSON.parse(localStorage.getItem(LSK + k)); return v ?? d; } catch (e) { return d; } },
        set(k, v) { try { localStorage.setItem(LSK + k, JSON.stringify(v)); } catch (e) {} }
    };
    const persistSoon = debounce(() => persistData(), 350);
    const num = v => Number(v) || 0;
    const lc = s => String(s || '').trim().toLowerCase();
    const imgSrc = s => { const v = String(s || ''); return /^data:image\//i.test(v) ? v : safeUrl(v); };
    const hue = s => [...String(s)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 360, 7);
    const LOCALE = { ru: 'ru-RU', en: 'en-US', uk: 'uk-UA' };
    const loc = () => LOCALE[data.lang] || 'ru-RU';

    function ensure() {
        if (!data.since) data.since = Date.now();
        if (!data.lang) data.lang = 'ru';
        if (data.showScrobble === undefined) data.showScrobble = false;
        if (!Array.isArray(data.quickNotes)) data.quickNotes = [];
        if (!Array.isArray(data.spotlights)) {
            data.spotlights = [];
            const a = data.favArtist || {}, b = data.favAlbum || {};
            if (a.name) data.spotlights.push({ id: Date.now(), kind: 'artist', title: a.name, sub: '', url: a.url || '', img: a.img || '' });
            if (b.name) data.spotlights.push({ id: Date.now() + 1, kind: 'album', title: b.name, sub: '', url: b.url || '', img: b.img || '' });
        }
    }
    ensure();

    const compress = file => compressImage(file, 'spotlight');

    /* =====================================================
       1. ЗАМЕТКИ
       ===================================================== */
    const NCOL = ['', '#fbbf24', '#34d399', '#60a5fa', '#f472b6', '#a78bfa'];
    const NEMO = ['📝', '⭐', '💡', '🎵', '💿', '🎮', '🛒', '🎁', '📌', '❤️', '🔥', '📚', '🎫', '👕', '💰', '✅', '📷', '🔗'];
    const MAX_IMG = 12, MAX_LINKS = 30, MAX_DEPTH = 2;
    let nSel = null, nQ = '', nGrp = 'all', lastDel = null, undoTimer = null, linkEdit = null, linkImg = '';
    const nuid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

    /* ---- группы и подгруппы: data.noteGroups = [{ id, name, parent, closed }]; у заметки note.gid ---- */
    const groups = () => Array.isArray(data.noteGroups) ? data.noteGroups : (data.noteGroups = []);
    const gById = id => groups().find(g => g.id === id);
    const gKids = pid => groups().filter(g => (g.parent || '') === (pid || ''));
    const gDepth = id => { let d = 0, g = gById(id); while (g && g.parent && d < 10) { d++; g = gById(g.parent); } return d; };
    const gPath = id => { const out = []; let g = gById(id), i = 0; while (g && i++ < 10) { out.unshift(g.name); g = g.parent ? gById(g.parent) : null; } return out.join(' › '); };
    const gTree = id => { const ids = [id]; gKids(id).forEach(k => ids.push(...gTree(k.id))); return ids; };
    const hasG = n => !!(n.gid && gById(n.gid));
    const curGrp = () => { if (nGrp !== 'all' && nGrp !== 'none' && !gById(nGrp)) nGrp = 'all'; return nGrp; };
    const inGroup = n => { const g = curGrp(); return g === 'all' || (g === 'none' ? !hasG(n) : (hasG(n) && gTree(g).includes(n.gid))); };

    /* ---- ссылки ---- */
    const lkNorm = u => {
        u = String(u || '').trim(); if (!u) return '';
        if (!/^[a-z][a-z0-9+.-]*:/i.test(u)) u = 'https://' + u;
        try { const x = new URL(u); return /^https?:$/.test(x.protocol) && x.hostname.includes('.') ? x.href : ''; } catch (_) { return ''; }
    };
    const lkHost = u => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch (_) { return ''; } };

    const nTitle = n => (String(n.title || '').trim() || String(n.text || '').split('\n').find(l => l.trim()) || 'Пустая заметка').trim().slice(0, 48);
    const nHay = n => lc([n.title, n.text, hasG(n) ? gPath(n.gid) : '', ...(n.links || []).map(l => (l.title || '') + ' ' + (l.url || ''))].join(' '));
    // при поиске ищем по ВСЕМ группам; без поиска — только в выбранной
    const nSorted = () => [...data.quickNotes]
        .filter(n => (nQ ? nHay(n).includes(nQ) : inGroup(n)))
        .sort((a, b) => (!!b.pinned - !!a.pinned) || num(b.ts || b.id) - num(a.ts || a.id));
    const nCur = () => data.quickNotes.find(n => n.id === nSel);

    function notesCss() {
        if ($('np-pro-css')) return;
        const s = document.createElement('style'); s.id = 'np-pro-css';
        s.textContent = `
        .np{width:760px;height:540px;min-width:420px;min-height:380px}
        .np-side{width:40%;min-width:190px;min-height:0}
        .np-edit{position:relative}
        .np-pill,.np-gadd,.np-gtools button{padding:5px 9px;border-radius:9px;font-size:11px;font-weight:700;color:#d1d5db;cursor:pointer;
            background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);transition:background-color .15s,color .15s}
        .np-pill:hover,.np-gadd:hover,.np-gtools button:hover{color:#fff;background:rgba(var(--theme-rgb),.3);border-color:rgba(var(--theme-rgb),.55)}
        .np-gtools button.is-danger:hover,.np .is-danger:hover{color:#fecaca;background:rgba(239,68,68,.2);border-color:rgba(239,68,68,.5)}
        .np-gbox{display:flex;flex-direction:column;gap:5px;padding:6px;border-radius:12px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);max-height:44%;flex:0 0 auto;min-height:0}
        .np-gh{display:flex;align-items:center;justify-content:space-between;font-size:10px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#9ca3af;padding:0 2px}
        .np-groups{display:flex;flex-direction:column;gap:1px;overflow-y:auto;min-height:0}
        .np-g{display:flex;align-items:center;gap:2px;padding:5px 6px 5px calc(4px + var(--d,0) * 12px);border-radius:8px;font-size:12px;font-weight:700;color:#cbd5e1;cursor:pointer}
        .np-g:hover{background:rgba(255,255,255,.07)}
        .np-g.is-sel{background:rgba(var(--theme-rgb),.22);color:#fff}
        .np-g.is-drop{outline:2px dashed rgba(var(--theme-rgb),.9);outline-offset:-2px}
        .np-g small{font-size:10px;color:#6b7280;font-weight:600;margin-left:4px}
        .np-gt{width:16px;flex:none;text-align:center;font-size:10px;color:#9ca3af;background:none;border:0;cursor:pointer;padding:0}
        .np-gn{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .np-gtools{display:flex;flex-wrap:wrap;gap:4px}
        .np-ghint{font-size:10px;color:#6b7280;line-height:1.35;padding:0 2px}
        .np-item{display:block}
        .np-titlebar{display:flex;align-items:center;border-bottom:1px solid rgba(255,255,255,.07)}
        .np-titlebar .np-title{flex:1;min-width:0;border-bottom:0}
        .np-emo{flex:none;width:34px;height:34px;margin-left:10px;font-size:17px;line-height:1;border-radius:10px;cursor:pointer;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1)}
        .np-emo:hover{background:rgba(var(--theme-rgb),.25)}
        .np-emopop{position:absolute;z-index:6;left:10px;top:48px;width:226px;padding:8px;border-radius:14px;background:#151521;border:1px solid rgba(255,255,255,.15);box-shadow:0 14px 40px rgba(0,0,0,.6);display:flex;flex-wrap:wrap;gap:4px}
        .np-emopop button{width:32px;height:32px;font-size:17px;border-radius:9px;cursor:pointer;background:rgba(255,255,255,.05)}
        .np-emopop button:hover{background:rgba(var(--theme-rgb),.3)}
        .np-emopop .np-pill{width:100%;height:auto;font-size:11px;margin-top:2px}
        .np-text{min-height:84px}
        .np-emopop.hidden,.np-att.hidden,.np-linkform.hidden{display:none}
        .np-att{display:flex;flex-direction:column;gap:8px;flex:0 1 auto;max-height:42%;overflow-y:auto;padding:8px 12px;border-top:1px solid rgba(255,255,255,.07)}
        .np-imgs{display:flex;flex-wrap:wrap;gap:8px}
        .np-im{margin:0;width:96px;display:flex;flex-direction:column;gap:4px}
        .np-im img{width:96px;height:72px;object-fit:cover;border-radius:9px;cursor:zoom-in;border:1px solid rgba(255,255,255,.12)}
        .np-im button{padding:3px 6px;border-radius:7px;font-size:10px;font-weight:700;color:#9ca3af;cursor:pointer;background:rgba(255,255,255,.06)}
        .np-im button:hover{color:#fecaca;background:rgba(239,68,68,.2)}
        .np-lks{display:flex;flex-direction:column;gap:5px}
        .np-lk{display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:11px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08)}
        .np-lki{width:34px;height:34px;flex:none;border-radius:8px;object-fit:cover;background:rgba(255,255,255,.08)}
        .np-lkem{display:flex;align-items:center;justify-content:center;font-size:16px}
        .np-lkt{flex:1;min-width:0;display:flex;flex-direction:column;color:#fff;text-decoration:none}
        .np-lkt b{font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .np-lkt small{font-size:10px;color:#9ca3af;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .np-lkt:hover b{text-decoration:underline}
        .np-lk>button{flex:none;padding:4px 8px;border-radius:8px;font-size:10px;font-weight:700;color:#d1d5db;cursor:pointer;background:rgba(255,255,255,.07)}
        .np-lk>button:hover{color:#fff;background:rgba(var(--theme-rgb),.3)}
        .np-lk>button.is-danger:hover{color:#fecaca;background:rgba(239,68,68,.2)}
        .np-linkform{display:flex;flex-direction:column;gap:6px;padding:8px 12px;border-top:1px solid rgba(255,255,255,.07);background:rgba(255,255,255,.03)}
        .np-linkform .row{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
        .np-tools{gap:5px;padding:6px 10px}
        .np .np-tools button{font-weight:700;font-size:12px;color:#d1d5db;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1)}
        .np .np-tools button:hover{color:#fff;background:rgba(var(--theme-rgb),.28);border-color:rgba(var(--theme-rgb),.5)}
        .np .np-tools button.is-on{color:#facc15;background:rgba(250,204,21,.12);border-color:rgba(250,204,21,.4)}
        .np .np-tools button.is-danger:hover{color:#fecaca;background:rgba(239,68,68,.2);border-color:rgba(239,68,68,.5)}
        .np-lbl{font-size:10px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:#6b7280;margin-right:2px}
        .np-sel{max-width:160px;padding:5px 8px;border-radius:9px;font-size:12px;color:#e5e7eb;background:#151521;border:1px solid rgba(255,255,255,.12)}
        .np-edit.is-empty .np-tools,.np-edit.is-empty .np-titlebar .np-emo{opacity:.4;pointer-events:none}
        .np-zoom{position:fixed;inset:0;z-index:100001;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;background:rgba(0,0,0,.86);cursor:zoom-out}
        .np-zoom img{max-width:92vw;max-height:82vh;border-radius:12px;box-shadow:0 20px 70px rgba(0,0,0,.7)}
        .np-zoom button{padding:8px 16px;border-radius:12px;font-size:13px;font-weight:800;color:#fff;background:rgba(255,255,255,.14)}
        @media (max-width:640px){
            .np{height:78vh!important;min-width:0}
            .np-side{width:100%;max-height:40%;overflow-y:auto;min-width:0}
            .np-gbox{max-height:none}.np-groups{max-height:96px}
        }`;
        document.head.appendChild(s);
    }

    function buildNotes() {
        notesCss();
        const p = document.createElement('aside');
        p.id = 'notes-panel';
        p.className = 'np glass no-hover hidden';
        p.setAttribute('aria-label', 'Заметки');
        p.innerHTML = `
        <div class="np-head" id="np-drag">
            <span class="font-black text-sm">📝 Заметки <small id="np-count" class="text-gray-500 font-semibold"></small></span>
            <span class="flex-1"></span>
            <button type="button" data-np="export" class="np-dl" title="Скачать все заметки одним файлом (.txt)" aria-label="Скачать все заметки">⬇️ <span>.txt</span></button>
            <button type="button" data-np="min" title="Свернуть" aria-label="Свернуть">—</button>
            <button type="button" data-np="close" title="Закрыть (M)" aria-label="Закрыть">✕</button>
        </div>
        <div class="np-body">
            <div class="np-side">
                <input id="np-search" type="search" class="np-in" placeholder="Поиск по всем заметкам…" aria-label="Поиск по заметкам">
                <button type="button" class="np-new" data-np="new">＋ Новая заметка</button>
                <div class="np-gbox">
                    <div class="np-gh"><span>Группы</span><button type="button" class="np-gadd" data-np="gnew" title="Создать новую группу">＋ Группа</button></div>
                    <div id="np-groups" class="np-groups"></div>
                    <div id="np-gtools" class="np-gtools"></div>
                </div>
                <div id="np-list" class="np-list"></div>
            </div>
            <div class="np-edit is-empty" id="np-edit">
                <div class="np-titlebar">
                    <button type="button" id="np-emo" class="np-emo" data-np="emoji" title="Иконка заметки" aria-label="Иконка заметки">🙂</button>
                    <input id="np-title" class="np-title" type="text" maxlength="80" placeholder="Заголовок / тема заметки" aria-label="Заголовок заметки" autocomplete="off">
                </div>
                <div id="np-emopop" class="np-emopop hidden"></div>
                <textarea id="np-text" class="np-text" placeholder="Пишите здесь… (картинку можно вставить Ctrl+V или перетащить сюда)"></textarea>
                <div id="np-att" class="np-att hidden"></div>
                <div id="np-linkform" class="np-linkform hidden">
                    <input id="np-lk-url" class="np-in" type="text" placeholder="Ссылка: https://…" aria-label="Адрес ссылки" autocomplete="off">
                    <input id="np-lk-title" class="np-in" type="text" maxlength="80" placeholder="Название (необязательно)" aria-label="Название ссылки" autocomplete="off">
                    <div class="row">
                        <span id="np-lk-prev" class="flex items-center gap-2"></span>
                        <button type="button" class="np-pill" data-ap="lkpick">🖼 Своя картинка</button>
                        <button type="button" class="np-pill" data-ap="lkclr">Сбросить картинку</button>
                        <span class="flex-1"></span>
                        <button type="button" class="np-pill" data-ap="lkcancel">Отмена</button>
                        <button type="button" class="np-pill" data-ap="lksave" style="background:var(--theme-btn);color:#fff">✔ Сохранить ссылку</button>
                    </div>
                </div>
                <div class="np-tools">
                    <span class="np-lbl">Вставить</span>
                    <button type="button" data-np="todo" title="Новая строка-галочка в тексте">☑ Пункт списка</button>
                    <button type="button" data-np="check" title="Поставить / снять галочку на строке, где курсор">✔ Отметить</button>
                    <button type="button" data-np="date" title="Вставить дату и время">🕒 Дата</button>
                    <button type="button" data-np="link" title="Добавить ссылку (с миниатюрой)">🔗 Ссылка</button>
                    <button type="button" data-np="img" title="Добавить картинки к заметке">🖼 Картинка</button>
                </div>
                <div class="np-tools">
                    <select id="np-gsel" class="np-sel" aria-label="Группа заметки" title="В какой группе лежит заметка"></select>
                    <span id="np-colors"></span>
                    <button type="button" data-np="pin" title="Закреплённые заметки всегда сверху">📌 Закрепить</button>
                    <button type="button" data-np="copy" title="Копировать текст заметки">📋 Копировать</button>
                    <button type="button" data-np="del" class="is-danger" title="Удалить заметку (можно вернуть)">🗑 Удалить</button>
                    <span class="flex-1"></span><small id="np-meta"></small>
                </div>
                <input type="file" id="np-file" accept="image/*" multiple hidden>
                <input type="file" id="np-linkfile" accept="image/*" hidden>
            </div>
        </div>
        <div id="np-undo" class="np-undo hidden"><span>Заметка удалена</span><button type="button" data-np="undo">↩ Вернуть</button></div>`;
        document.body.appendChild(p);
        $('np-emopop').innerHTML = NEMO.map(e => `<button type="button" data-emo="${e}">${e}</button>`).join('') + '<button type="button" class="np-pill" data-emo="">Убрать иконку</button>';

        const st = ui.get('np', {});
        if (st.w) p.style.width = st.w + 'px';
        if (st.h) p.style.height = st.h + 'px';

        p.addEventListener('click', e => {
            const t = e.target;
            if (!t.closest('#np-emopop') && !t.closest('#np-emo')) $('np-emopop').classList.add('hidden');
            const dot = t.closest('[data-c]');
            if (dot) { const n = nCur(); if (n) { n.color = dot.dataset.c; n.ts = Date.now(); persistSoon(); renderNotes(); } return; }
            const gt = t.closest('[data-gt]');
            if (gt) { const g = gById(gt.dataset.gt); if (g) { g.closed = !g.closed; persistSoon(); renderGroups(); } return; }
            const gr = t.closest('[data-g]');
            if (gr) { setGroup(gr.dataset.g); return; }
            const emo = t.closest('[data-emo]');
            if (emo) { const n = nCur(); if (n) { n.icon = emo.dataset.emo; n.ts = Date.now(); persistSoon(); } $('np-emopop').classList.add('hidden'); updateEmo(); renderNotes(true); return; }
            const ap = t.closest('[data-ap]');
            if (ap) { attAction(ap.dataset.ap, ap.dataset.aid); return; }
            const item = t.closest('[data-id]');
            if (item) { selectNote(Number(item.dataset.id)); return; }
            const b = t.closest('[data-np]');
            if (b) noteAction(b.dataset.np);
        });
        p.addEventListener('error', e => {
            if (e.target.classList && e.target.classList.contains('np-fav')) {
                const em = document.createElement('span'); em.className = 'np-lki np-lkem'; em.textContent = '🔗'; e.target.replaceWith(em);
            }
        }, true);
        p.addEventListener('keydown', e => {
            if ((e.key === 'Enter' || e.key === ' ') && e.target.classList && e.target.classList.contains('np-item')) { e.preventDefault(); selectNote(Number(e.target.dataset.id)); }
        });
        $('np-search').addEventListener('input', e => { nQ = lc(e.target.value); renderNotes(); });
        $('np-text').addEventListener('input', e => {
            const n = nCur(); if (!n) return;
            n.text = e.target.value; n.ts = Date.now(); persistSoon(); renderNotes(true);
        });
        $('np-title').addEventListener('input', e => {
            const n = nCur(); if (!n) return;
            n.title = e.target.value; n.ts = Date.now(); persistSoon(); renderNotes(true);
        });
        $('np-title').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); $('np-text').focus(); } });
        $('np-text').addEventListener('keydown', e => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); noteAction('new'); return; }
            // Enter на строке-галочке продолжает список; Enter на пустой галочке — выходит из списка
            if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
                const ta = e.target, s = ta.selectionStart;
                if (s !== ta.selectionEnd) return;
                const ls = ta.value.lastIndexOf('\n', s - 1) + 1, le0 = ta.value.indexOf('\n', s), le = le0 < 0 ? ta.value.length : le0;
                const m = ta.value.slice(ls, s).match(/^(\s*)- \[[ xX]\] (.*)$/);
                if (!m) return;
                e.preventDefault();
                if (!m[2].trim() && !ta.value.slice(s, le).trim()) {
                    ta.value = ta.value.slice(0, ls) + ta.value.slice(le); ta.selectionStart = ta.selectionEnd = ls;
                } else {
                    const ins = '\n' + m[1] + '- [ ] ';
                    ta.value = ta.value.slice(0, s) + ins + ta.value.slice(s); ta.selectionStart = ta.selectionEnd = s + ins.length;
                }
                ta.dispatchEvent(new Event('input'));
            }
        });
        $('np-text').addEventListener('paste', e => {
            const files = [...(e.clipboardData?.files || [])].filter(f => /^image\//i.test(f.type));
            if (files.length) { e.preventDefault(); addImages(files); }
        });
        $('np-gsel').addEventListener('change', e => {
            const n = nCur(); if (!n) return;
            n.gid = e.target.value; n.ts = Date.now(); persistSoon();
            const g = n.gid && gById(n.gid);
            showToast(g ? `Заметка перенесена в «${g.name}»` : 'Заметка вне групп', 'info');
            if (!nQ && !inGroup(n)) nGrp = hasG(n) ? n.gid : 'none';   // идём за заметкой в новую группу
            renderGroups(); renderNotes();
        });
        $('np-file').addEventListener('change', e => { addImages(e.target.files); e.target.value = ''; });
        $('np-linkfile').addEventListener('change', async e => {
            const f = e.target.files[0]; e.target.value = ''; if (!f) return;
            try { linkImg = await compressImage(f, { max: 160, quality: 0.8 }); updateLinkPrev(); } catch (_) { showToast('Не удалось обработать картинку', 'error'); }
        });
        ['np-lk-url', 'np-lk-title'].forEach(id => $(id).addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); attAction('lksave'); } }));
        p.addEventListener('keydown', e => {
            if (e.key !== 'Escape') return;
            if (!$('np-emopop').classList.contains('hidden')) { $('np-emopop').classList.add('hidden'); return; }
            if (!$('np-linkform').classList.contains('hidden')) { closeLinkForm(); return; }
            closeNotes();
        });

        // перетаскивание: заметку — в группу, файлы-картинки — в редактор
        const hasFiles = e => [...(e.dataTransfer?.types || [])].includes('Files');
        p.addEventListener('dragstart', e => {
            const it = e.target.closest && e.target.closest('.np-item'); if (!it) return;
            e.dataTransfer.setData('text/plain', 'mhnote:' + it.dataset.id); e.dataTransfer.effectAllowed = 'move';
        });
        p.addEventListener('dragover', e => {
            const g = e.target.closest && e.target.closest('[data-g]');
            if (g && g.dataset.g !== 'all' && !hasFiles(e)) {
                e.preventDefault();
                p.querySelectorAll('.np-g.is-drop').forEach(x => { if (x !== g) x.classList.remove('is-drop'); });
                g.classList.add('is-drop'); return;
            }
            if (hasFiles(e) && e.target.closest && e.target.closest('.np-edit')) e.preventDefault();
        });
        p.addEventListener('dragleave', e => { const g = e.target.closest && e.target.closest('[data-g]'); if (g) g.classList.remove('is-drop'); });
        p.addEventListener('drop', e => {
            p.querySelectorAll('.np-g.is-drop').forEach(x => x.classList.remove('is-drop'));
            if (hasFiles(e) && e.target.closest('.np-edit')) { e.preventDefault(); addImages(e.dataTransfer.files); return; }
            const g = e.target.closest('[data-g]'), raw = e.dataTransfer.getData('text/plain') || '';
            if (g && g.dataset.g !== 'all' && raw.startsWith('mhnote:')) { e.preventDefault(); moveNote(Number(raw.slice(7)), g.dataset.g === 'none' ? '' : g.dataset.g); }
        });

        // перетаскивание панели за заголовок
        const head = $('np-drag');
        let off = null;
        head.addEventListener('pointerdown', e => {
            if (e.target.closest('button') || innerWidth <= 640) return;
            const pos = notesPos(p);
            off = { x: e.clientX - pos.x, y: e.clientY - pos.y };
            head.setPointerCapture(e.pointerId);
        });
        head.addEventListener('pointermove', e => { if (off) placeNotes(e.clientX - off.x, e.clientY - off.y); });
        head.addEventListener('pointerup', () => { if (off) { off = null; saveNotesRect(); } });
        head.addEventListener('dblclick', e => { if (!e.target.closest('button')) noteAction('min'); });

        if ('ResizeObserver' in window) new ResizeObserver(() => { if (!p.classList.contains('hidden') && !p.classList.contains('is-min')) saveNotesRect(); }).observe(p);
        addEventListener('resize', () => { if (!p.classList.contains('hidden')) { const pos = notesPos(p); placeNotes(pos.x, pos.y); } });
    }

    /* Позицию и размер берём из style / offset*, а НЕ из getBoundingClientRect():
       во время анимации открытия (npOpen) у панели transform (сдвиг + scale), и getBoundingClientRect
       возвращал «съехавшие» координаты — они сохранялись, и с каждым открытием панель уезжала вправо-вниз. */
    function notesPos(p) {
        const x = parseFloat(p.style.left), y = parseFloat(p.style.top);
        return { x: Number.isFinite(x) ? x : p.offsetLeft, y: Number.isFinite(y) ? y : p.offsetTop };
    }
    function placeNotes(x, y) {
        const p = $('notes-panel');
        p.style.left = Math.max(8, Math.min(innerWidth - Math.min(p.offsetWidth, 120) - 8, x)) + 'px';
        p.style.top = Math.max(8, Math.min(innerHeight - 60, y)) + 'px';
    }
    function saveNotesRect() {
        const p = $('notes-panel'), { x, y } = notesPos(p);
        if (p.classList.contains('is-min')) { ui.set('np', { ...ui.get('np', {}), x, y }); return; }
        ui.set('np', { x, y, w: p.offsetWidth, h: p.offsetHeight });
    }

    // кнопка 📝 в правом нижнем углу: свечение, пока панель открыта
    const notesBtn = () => document.querySelector('button[onclick="toggleNotes()"]');
    function syncNotesBtn() {
        const b = notesBtn(), p = $('notes-panel');
        if (!b || !p) return;
        b.classList.add('notes-fab');
        const open = !p.classList.contains('hidden');
        b.classList.toggle('is-open', open);
        b.setAttribute('aria-pressed', open ? 'true' : 'false');
    }

    function openNotes() {
        ensure();
        const p = $('notes-panel');
        const first = p.classList.contains('hidden');
        p.classList.remove('hidden');
        syncNotesBtn();
        if (first) {
            const st = ui.get('np', {});
            placeNotes(st.x ?? innerWidth - p.offsetWidth - 24, st.y ?? innerHeight - p.offsetHeight - 100);
            if (nSel === null || !nCur()) nSel = (nSorted()[0] || {}).id ?? null;
            renderNotes();
            selectNote(nSel, true);
        }
    }
    function closeNotes() { persistData(); $('notes-panel').classList.add('hidden'); syncNotesBtn(); }
    window.openNotes = openNotes;
    window.toggleNotes = () => $('notes-panel').classList.contains('hidden') ? openNotes() : closeNotes();

    function selectNote(id, noFocus) {
        nSel = id;
        const n = nCur();
        $('np-title').value = n ? n.title || '' : '';
        $('np-title').disabled = !n;
        $('np-text').value = n ? n.text || '' : '';
        $('np-text').disabled = !n;
        $('np-edit').classList.toggle('is-empty', !n);
        $('np-emopop').classList.add('hidden');
        closeLinkForm();
        updateEmo();
        renderAtt();
        renderNotes();
        if (n && !noFocus && innerWidth > 640) (n.title || n.text ? $('np-text') : $('np-title')).focus();
    }

    const updateEmo = () => { const n = nCur(); $('np-emo').textContent = (n && n.icon) || '🙂'; };

    function setGroup(key) {
        nGrp = key;
        const list = nSorted();
        if (!list.some(n => n.id === nSel)) nSel = (list[0] || {}).id ?? null;
        selectNote(nSel, true);
    }

    function moveNote(id, gid) {
        const n = data.quickNotes.find(x => x.id === id); if (!n) return;
        n.gid = gid; n.ts = Date.now(); persistSoon();
        const g = gid && gById(gid);
        showToast(g ? `Перенесено в «${g.name}»` : 'Перенесено в «Без группы»', 'success');
        if (!nQ && !inGroup(n) && nSel === id) { const nx = nSorted()[0]; selectNote(nx ? nx.id : null, true); }
        else { renderGroups(); renderNotes(); }
    }

    function renderGroups() {
        const box = $('np-groups'); if (!box) return;
        const cur = curGrp(), all = groups(), n0 = nCur();
        const cnt = id => { const ids = gTree(id); return data.quickNotes.filter(n => hasG(n) && ids.includes(n.gid)).length; };
        const row = (key, name, c, d, kidsOpen) => `<div class="np-g${cur === key ? ' is-sel' : ''}" data-g="${esc(key)}" style="--d:${d}">${kidsOpen}<span class="np-gn">${name}</span><small>${c}</small></div>`;
        let html = row('all', '🗂 Все заметки', data.quickNotes.length, 0, '<i class="np-gt"></i>')
                 + row('none', '📄 Без группы', data.quickNotes.filter(n => !hasG(n)).length, 0, '<i class="np-gt"></i>');
        const walk = (pid, d) => gKids(pid).forEach(g => {
            const kids = gKids(g.id).length;
            const tgl = kids ? `<button type="button" class="np-gt" data-gt="${esc(g.id)}" title="${g.closed ? 'Развернуть подгруппы' : 'Свернуть подгруппы'}" aria-label="Свернуть или развернуть">${g.closed ? '▸' : '▾'}</button>` : '<i class="np-gt"></i>';
            html += row(g.id, '📁 ' + esc(g.name), cnt(g.id), d, tgl);
            if (kids && !g.closed) walk(g.id, d + 1);
        });
        walk('', 0);
        box.innerHTML = html;

        const tools = $('np-gtools'), g = cur !== 'all' && cur !== 'none' ? gById(cur) : null;
        tools.innerHTML = g
            ? `${gDepth(g.id) < MAX_DEPTH ? '<button type="button" data-np="gsub" title="Создать подгруппу внутри выбранной">＋ Подгруппа</button>' : ''}<button type="button" data-np="gren" title="Переименовать группу">✏️ Переименовать</button><button type="button" data-np="gdel" class="is-danger" title="Удалить группу (заметки останутся)">🗑 Удалить группу</button>`
            : `<p class="np-ghint">${all.length ? 'Выбери группу — появятся «＋ Подгруппа», «Переименовать» и «Удалить». Заметки можно перетащить в группу мышкой.' : 'Групп пока нет. Нажми «＋ Группа», например «Хотелки», «Идеи», «Ссылки».'}</p>`;

        const sel = $('np-gsel'), flat = [];
        const walk2 = (pid, d) => gKids(pid).forEach(x => { flat.push([x, d]); walk2(x.id, d + 1); });
        walk2('', 0);
        sel.innerHTML = '<option value="">📄 Без группы</option>' + flat.map(([x, d]) => `<option value="${esc(x.id)}">${'\u00A0\u00A0'.repeat(d)}${d ? '↳ ' : ''}${esc(x.name)}</option>`).join('');
        sel.value = n0 && hasG(n0) ? n0.gid : '';
    }

    function renderNotes(listOnly) {
        const list = nSorted(), cur = nCur();
        $('np-count').textContent = data.quickNotes.length ? `· ${data.quickNotes.length}` : '';
        $('np-list').innerHTML = list.map(n => {
            const lines = String(n.text || '').split('\n').filter(l => l.trim());
            const body = (String(n.title || '').trim() ? lines : lines.slice(1)).join(' ');
            const im = (n.images || []).length, lk = (n.links || []).length;
            const badges = (im ? `🖼${im} ` : '') + (lk ? `🔗${lk} ` : '') + ((nQ || curGrp() === 'all') && hasG(n) ? `📁${gPath(n.gid)} · ` : '');
            return `<div role="button" tabindex="0" draggable="true" class="np-item${n.id === nSel ? ' is-sel' : ''}" data-id="${n.id}" style="--c:${esc(n.color || '')}">
                <span>${n.pinned ? '📌 ' : ''}${n.icon ? esc(n.icon) + ' ' : ''}${esc(nTitle(n))}</span><small>${esc(badges + (body || new Date(n.ts || n.id).toLocaleDateString(loc())))}</small></div>`;
        }).join('') || `<p class="text-[11px] text-gray-500 italic p-2">${nQ ? 'Ничего не найдено' : (curGrp() === 'all' ? 'Заметок пока нет' : 'В этой группе пусто')}</p>`;
        $('np-colors').innerHTML = NCOL.map(c => `<i class="np-dot${cur && (cur.color || '') === c ? ' is-on' : ''}" data-c="${c}" style="--c:${c}" role="button" aria-label="Цвет"></i>`).join('');
        const pin = $('notes-panel').querySelector('[data-np="pin"]');
        pin.classList.toggle('is-on', !!(cur && cur.pinned));
        pin.textContent = cur && cur.pinned ? '📌 Закреплено' : '📌 Закрепить';
        const t = cur ? String(cur.text || '') : '';
        $('np-meta').textContent = cur ? `${t.trim() ? t.trim().split(/\s+/).length : 0} сл. · ${t.length} зн.` : '';
        if (!listOnly) renderGroups();
    }

    /* ---- вложения: картинки и ссылки ---- */
    function renderAtt() {
        const n = nCur(), box = $('np-att');
        const imgs = n ? n.images || [] : [], lks = n ? n.links || [] : [];
        if (!imgs.length && !lks.length) { box.innerHTML = ''; box.classList.add('hidden'); return; }
        box.classList.remove('hidden');
        const hImgs = imgs.map(im => `<figure class="np-im"><img src="${esc(imgSrc(im.src))}" data-ap="zoom" data-aid="${esc(im.id)}" alt="Картинка в заметке" title="Нажми, чтобы увеличить"><button type="button" data-ap="imgdel" data-aid="${esc(im.id)}" title="Убрать эту картинку из заметки">🗑 Убрать</button></figure>`).join('');
        const hLks = lks.map(l => {
            const host = lkHost(l.url), href = lkNorm(l.url);
            const ico = l.img ? `<img class="np-lki" src="${esc(imgSrc(l.img))}" alt="">` : `<img class="np-lki np-fav" src="https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=64" alt="">`;
            return `<div class="np-lk">${ico}<a class="np-lkt" href="${esc(href)}" target="_blank" rel="noopener noreferrer" title="Открыть в новой вкладке"><b>${esc(l.title || host)}</b><small>${esc(host)} ↗</small></a><button type="button" data-ap="lkedit" data-aid="${esc(l.id)}" title="Изменить ссылку">✏️ Изменить</button><button type="button" class="is-danger" data-ap="lkdel" data-aid="${esc(l.id)}" title="Убрать ссылку">✕ Убрать</button></div>`;
        }).join('');
        box.innerHTML = (hImgs ? `<div class="np-imgs">${hImgs}</div>` : '') + (hLks ? `<div class="np-lks">${hLks}</div>` : '');
    }

    async function addImages(files) {
        const n = nCur(); if (!n) return showToast('Сначала создай заметку', 'info');
        files = [...files].filter(f => /^image\//i.test(f.type));
        if (!files.length) return;
        n.images = Array.isArray(n.images) ? n.images : [];
        let added = 0;
        for (const f of files) {
            if (n.images.length >= MAX_IMG) { showToast(`В одной заметке максимум ${MAX_IMG} картинок`, 'info'); break; }
            try { n.images.push({ id: nuid(), src: await compressImage(f, 'photo') }); added++; } catch (_) { showToast('Не удалось обработать картинку', 'error'); }
        }
        if (added) { n.ts = Date.now(); persistSoon(); if (nCur() === n) renderAtt(); renderNotes(); }
    }

    function zoomImg(src) {
        const o = document.createElement('div');
        o.className = 'np-zoom';
        o.innerHTML = `<img src="${esc(imgSrc(src))}" alt=""><button type="button">✕ Закрыть</button>`;
        function key(e) { if (e.key === 'Escape') { e.stopPropagation(); close(); } }
        function close() { o.remove(); document.removeEventListener('keydown', key, true); }
        o.addEventListener('click', close);
        document.addEventListener('keydown', key, true);
        document.body.appendChild(o);
    }

    function updateLinkPrev() {
        $('np-lk-prev').innerHTML = linkImg ? `<img src="${esc(imgSrc(linkImg))}" class="np-lki" alt="">` : '<span class="text-[11px] text-gray-500">Картинка не выбрана — возьмётся значок сайта</span>';
    }
    function openLinkForm(l) {
        linkEdit = l ? l.id : 'new'; linkImg = l ? l.img || '' : '';
        $('np-lk-url').value = l ? l.url || '' : ''; $('np-lk-title').value = l ? l.title || '' : '';
        updateLinkPrev(); $('np-linkform').classList.remove('hidden'); $('np-lk-url').focus();
    }
    function closeLinkForm() { linkEdit = null; linkImg = ''; const f = $('np-linkform'); if (f) f.classList.add('hidden'); }

    async function attAction(a, id) {
        const n = nCur();
        if (a === 'lkpick') return $('np-linkfile').click();
        if (a === 'lkclr') { linkImg = ''; return updateLinkPrev(); }
        if (a === 'lkcancel') return closeLinkForm();
        if (!n) return;
        if (a === 'zoom') { const im = (n.images || []).find(x => x.id === id); if (im) zoomImg(im.src); return; }
        if (a === 'imgdel') {
            if (!(await mhConfirm('Убрать эту картинку из заметки?', { title: 'Убрать картинку?', okText: 'Убрать', danger: true }))) return;
            n.images = (n.images || []).filter(x => x.id !== id); n.ts = Date.now(); persistSoon(); renderAtt(); renderNotes(); return;
        }
        if (a === 'lkedit') { const l = (n.links || []).find(x => x.id === id); if (l) openLinkForm(l); return; }
        if (a === 'lkdel') {
            if (!(await mhConfirm('Убрать эту ссылку из заметки?', { title: 'Убрать ссылку?', okText: 'Убрать', danger: true }))) return;
            n.links = (n.links || []).filter(x => x.id !== id); n.ts = Date.now(); persistSoon(); renderAtt(); renderNotes(); return;
        }
        if (a === 'lksave') {
            const url = lkNorm($('np-lk-url').value);
            if (!url) return showToast('Нужна ссылка вида https://сайт.com/…', 'error');
            const title = $('np-lk-title').value.trim().slice(0, 80);
            n.links = Array.isArray(n.links) ? n.links : [];
            if (linkEdit && linkEdit !== 'new') {
                const l = n.links.find(x => x.id === linkEdit);
                if (l) { l.url = url; l.title = title; l.img = linkImg; }
            } else {
                if (n.links.length >= MAX_LINKS) return showToast(`В одной заметке максимум ${MAX_LINKS} ссылок`, 'info');
                n.links.push({ id: nuid(), url, title, img: linkImg });
            }
            n.ts = Date.now(); persistSoon(); closeLinkForm(); renderAtt(); renderNotes();
        }
    }

    async function noteAction(a) {
        const p = $('notes-panel'), n = nCur(), ta = $('np-text');
        if (a === 'close') return closeNotes();
        if (a === 'min') { p.classList.toggle('is-min'); return; }
        if (a === 'new') {
            const g = curGrp();
            const note = { id: Date.now(), text: '', pinned: false, color: '', ts: Date.now() };
            if (g !== 'all' && g !== 'none') note.gid = g;
            data.quickNotes.push(note); nQ = ''; $('np-search').value = '';
            persistSoon(); selectNote(note.id); return;
        }
        if (a === 'export') {
            if (!data.quickNotes.length) return showToast('Заметок пока нет');
            const one = x => [
                (hasG(x) ? `[${gPath(x.gid)}] ` : '') + (x.icon ? x.icon + ' ' : '') + (x.title || ''),
                x.text || '',
                ...(x.links || []).map(l => '🔗 ' + (l.title ? l.title + ' — ' : '') + l.url),
                (x.images || []).length ? `(картинок: ${x.images.length})` : ''
            ].filter(s => s && s.trim()).join('\n');
            downloadFile(`mirvel_notes_${todayStamp()}.txt`, data.quickNotes.map(one).join('\n\n----------\n\n'), 'text/plain;charset=utf-8');
            return;
        }
        if (a === 'undo' && lastDel) {
            data.quickNotes.push(lastDel); const id = lastDel.id; lastDel = null;
            $('np-undo').classList.add('hidden'); persistSoon(); selectNote(id); return;
        }
        /* --- группы --- */
        if (a === 'gnew' || a === 'gsub') {
            const parent = a === 'gsub' ? curGrp() : '';
            if (a === 'gsub' && (!gById(parent) || gDepth(parent) >= MAX_DEPTH)) return showToast('Глубже вкладывать нельзя', 'info');
            const name = await mhPrompt(a === 'gsub' ? `Подгруппа внутри «${gById(parent).name}»` : 'Название группы', { title: a === 'gsub' ? 'Новая подгруппа' : 'Новая группа', placeholder: 'Например: Хотелки, Идеи, Ссылки', okText: 'Создать', required: true });
            if (name === null) return;
            const nm = String(name).trim().slice(0, 40); if (!nm) return;
            const g = { id: 'g' + nuid(), name: nm, parent };
            groups().push(g);
            if (parent) { const pg = gById(parent); if (pg) pg.closed = false; }
            persistSoon(); setGroup(g.id); return;
        }
        if (a === 'gren' || a === 'gdel') {
            const g = gById(curGrp()); if (!g) return;
            if (a === 'gren') {
                const name = await mhPrompt('Новое название группы', { title: 'Переименовать группу', value: g.name, okText: 'Сохранить', required: true });
                if (name === null) return;
                const nm = String(name).trim().slice(0, 40); if (!nm) return;
                g.name = nm; persistSoon(); renderGroups(); renderNotes(); return;
            }
            const up = g.parent && gById(g.parent) ? g.parent : '';
            if (!(await mhConfirm(`Удалить группу «${g.name}»?\nЗаметки не пропадут — они переедут в ${up ? '«' + gById(up).name + '»' : '«Без группы»'}.`, { title: 'Удалить группу?', okText: 'Удалить', danger: true }))) return;
            gKids(g.id).forEach(k => { k.parent = up; });
            data.quickNotes.forEach(x => { if (x.gid === g.id) x.gid = up; });
            data.noteGroups = groups().filter(x => x !== g);
            persistSoon(); setGroup(up || 'all'); return;
        }
        if (!n) return;
        if (a === 'emoji') { $('np-emopop').classList.toggle('hidden'); return; }
        if (a === 'link') return openLinkForm(null);
        if (a === 'img') return $('np-file').click();
        if (a === 'pin') { n.pinned = !n.pinned; persistSoon(); renderNotes(); }
        else if (a === 'copy') {
            const txt = (n.title ? n.title + '\n' : '') + (n.text || '') + ((n.links || []).length ? '\n\n' + n.links.map(l => (l.title ? l.title + ': ' : '') + l.url).join('\n') : '');
            navigator.clipboard?.writeText(txt).then(() => showToast('Заметка скопирована 📋', 'success'), () => showToast('Не удалось скопировать', 'error'));
        }
        else if (a === 'check') {
            const s = ta.selectionStart ?? 0, ls = ta.value.lastIndexOf('\n', s - 1) + 1, le0 = ta.value.indexOf('\n', s), le = le0 < 0 ? ta.value.length : le0;
            const line = ta.value.slice(ls, le), m = line.match(/^(\s*- \[)([ xX])(\] .*)$/);
            if (!m) return showToast('Поставь курсор на строку с галочкой (кнопка «☑ Пункт списка»)', 'info');
            ta.value = ta.value.slice(0, ls) + m[1] + (m[2] === ' ' ? 'x' : ' ') + m[3] + ta.value.slice(le);
            ta.selectionStart = ta.selectionEnd = s; ta.focus();
            n.text = ta.value; n.ts = Date.now(); persistSoon(); renderNotes(true);
        }
        else if (a === 'date' || a === 'todo') {
            let add = a === 'date' ? new Date().toLocaleString(loc(), { dateStyle: 'medium', timeStyle: 'short' }) : '- [ ] ';
            const s = ta.selectionStart ?? ta.value.length;
            if (a === 'todo' && s > 0 && ta.value[s - 1] !== '\n') add = '\n' + add;   // пункт всегда с новой строки
            ta.value = ta.value.slice(0, s) + add + ta.value.slice(ta.selectionEnd ?? s);
            ta.selectionStart = ta.selectionEnd = s + add.length; ta.focus();
            n.text = ta.value; n.ts = Date.now(); persistSoon(); renderNotes();
        } else if (a === 'del') {
            const next = nSorted().find(x => x.id !== n.id);
            lastDel = n; data.quickNotes = data.quickNotes.filter(x => x.id !== n.id);
            persistSoon(); selectNote(next ? next.id : null, true);
            $('np-undo').classList.remove('hidden');
            clearTimeout(undoTimer); undoTimer = setTimeout(() => $('np-undo').classList.add('hidden'), 6000);
        }
    }

    /* =====================================================
       2. ГЛАВНАЯ: приветствие, чипы, избранное, игра дня
       ===================================================== */
    function facts() {
        const cds = data.cds || [], vin = data.vinyls || [], games = data.games || [], stuff = data.stuff || [];
        const music = [...cds, ...vin], all = [...music, ...games, ...stuff];
        const out = [], priced = all.filter(i => num(i.price) > 0);
        if (priced.length) out.push(`💡 Средняя цена позиции в коллекции — ${Math.round(priced.reduce((s, i) => s + num(i.price), 0) / priced.length)} ₴`);
        const top = artistRows().sort((a, b) => b.count - a.count)[0];
        if (top && top.count > 1) out.push(`💡 Больше всего релизов у ${top.name}: ${top.count}`);
        const dated = music.filter(i => num(i.year) > 1900).sort((a, b) => a.year - b.year);
        if (dated.length) out.push(`💡 Самый старый релиз: «${dated[0].title}», ${dated[0].year} год`);
        const hrs = games.reduce((s, g) => s + num(g.hours), 0);
        if (hrs) out.push(`💡 В играх проведено ${Math.round(hrs)} ч`);
        const bl = games.filter(g => g.status === 'backlog').length;
        if (bl) out.push(`💡 В бэклоге ${bl} игр — может, сегодня одну из них?`);
        const last = [...all].sort((a, b) => num(b.id) - num(a.id))[0];
        if (last) out.push(`💡 Последнее добавление: «${last.title}»`);
        return out.length ? out : ['💡 Добавьте первые позиции — здесь появятся факты о вашей коллекции'];
    }
    let factIdx = 0;

    function renderHero() {
        const box = document.querySelector('#greeting-banner .relative.z-10.flex-grow');
        if (!box) return;
        const nameEl = $('display-name');
        let g = $('hero-greet');
        if (!g) {
            g = document.createElement('p'); g.id = 'hero-greet'; g.className = 'hero-greet';
            nameEl.closest('h2').insertAdjacentElement('beforebegin', g);
            $('display-artists')?.parentElement.classList.add('hidden');
        }
        const h = new Date().getHours();
        g.textContent = h < 5 ? 'Доброй ночи 🌙' : h < 12 ? 'Доброе утро ☀️' : h < 18 ? 'Добрый день 👋' : 'Добрый вечер 🌆';

        let ex = $('hero-extra');
        if (!ex) {
            ex = document.createElement('div'); ex.id = 'hero-extra'; box.appendChild(ex);
            ex.addEventListener('click', e => {
                const c = e.target.closest('[data-go]');
                if (c) return showPage(c.dataset.go);
                const a = e.target.closest('[data-artist]');
                if (a) { openCommandPalette(); $('palette-input').value = a.dataset.artist; renderPalette(); return; }
                if (e.target.closest('.hero-fact')) { factIdx++; renderHero(); }
            });
        }
        const days = Math.max(1, Math.ceil((Date.now() - num(data.since)) / 864e5));
        const cnt = k => (data[k] || []).length;
        const chips = [['cds', '💿'], ['vinyls', '💽'], ['games', '🎮'], ['stuff', '📦'], ['wishlists', '🎁']]
            .map(([k, ic]) => `<button type="button" class="hero-chip" data-go="${k}" title="${esc(PAGE_TITLES[k])}">${ic} ${cnt(k)}</button>`).join('');
        const arts = splitArtists(data.favoriteArtists).slice(0, 6)
            .map(a => `<button type="button" class="hero-chip is-artist" data-artist="${esc(a)}">♪ ${esc(a)}</button>`).join('');
        const fl = facts();
        ex.innerHTML = `<div class="hero-chips">${chips}<span class="hero-chip" style="cursor:default">📅 ${days} дн.</span></div>
            ${arts ? `<div class="hero-chips">${arts}</div>` : ''}
            <p class="hero-fact" title="Нажмите — другой факт">${esc(fl[factIdx % fl.length])}</p>`;
    }

    /* ---- «Игра дня» рядом с «Пластинкой дня» ---- */
    let gCur = null;
    const GST = { backlog: '🗓 В планах', playing: '▶ В процессе', completed: '✔ Пройдено', online: '🌐 Онлайн', sandbox: '🏖 Песочница', dropped: '⏸ Заброшено', skipped: '💤 Не в планах', app: '🧩 Приложение' };

    function dailyRow() {
        let row = $('daily-row');
        if (!row) {
            const potd = $('potd-widget');
            if (!potd) return null;
            row = document.createElement('div'); row.id = 'daily-row'; row.className = 'daily-row';
            potd.insertAdjacentElement('beforebegin', row); row.appendChild(potd);
        }
        return row;
    }

    /* Ротация: «мешок» из перемешанных игр — каждая выпадает по разу, потом мешок мешается заново (без повторов подряд).
       Скрытые игры (hidden) в ротации не участвуют вообще — даже при включённом фильтре «Показывать скрытые». */
    const GOTD_MS = 8000;
    let gBag = [], gTimer = null, gHover = false;

    function gotdPool() {
        const games = (data.games || []).filter(g => !g.hidden);
        const open = games.filter(g => !['completed', 'skipped', 'online', 'app'].includes(g.status));
        return open.length ? open : games;
    }
    function gotdNext(pool) {
        const ids = new Set(pool.map(g => g.id));
        gBag = gBag.filter(id => ids.has(id));                 // убрали удалённые и скрытые
        if (!gBag.length) {
            gBag = pool.map(g => g.id);
            for (let i = gBag.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [gBag[i], gBag[j]] = [gBag[j], gBag[i]]; }
            if (gBag.length > 1 && gBag[gBag.length - 1] === gCur) gBag.unshift(gBag.pop());   // не та же игра, что на экране
        }
        return gBag.pop();
    }

    /* таймер следующей смены; пока курсор над виджетом / вкладка скрыта / главная закрыта — ждём */
    function gotdSchedule() {
        clearTimeout(gTimer);
        gTimer = setTimeout(() => {
            const w = $('gotd-widget');
            if (!w || gHover || document.hidden || !w.offsetParent || w.contains(document.activeElement)) { if (w) { gotdRestartBar(w); gotdSchedule(); } return; }
            renderGotd(true);
        }, GOTD_MS);
    }
    function gotdRestartBar(w) { const b = w.querySelector('.gotd-bar'); if (b) { const n = b.cloneNode(); b.replaceWith(n); } }   // только полоска, без повторной анимации текста

    function gotdHTML(g) {
        const src = imgSrc(g.img);
        const logo = window.mhPlatLogo ? window.mhPlatLogo.pill(g.platform || 'Другое') : `<span class="text-cyan-300 text-sm">${esc(g.platform || 'Другое')}</span>`;
        const meta = [g.year ? esc(g.year) : '', GST[g.status] || ''].filter(Boolean).join(' · ');
        return `<div class="gotd-cover" aria-hidden="true">${src ? `<img src="${esc(src)}" alt="">` : '🎮'}</div>
            <div class="min-w-0 flex-1 relative">
                <p class="text-xs text-gray-400">Игра дня</p>
                <h3 class="font-black text-xl truncate" title="${esc(g.title)}">${esc(g.title)}</h3>
                <div class="gotd-plat mt-1">${logo}${meta ? `<span class="text-cyan-300 text-sm truncate">${meta}</span>` : ''}</div>
                <div class="flex gap-2 mt-3 flex-wrap">
                    <button type="button" class="potd-btn is-primary" onclick="gotdOpen()">📖 Открыть</button>
                    <button type="button" class="potd-btn" onclick="gotdShuffle()">🔀 Другую</button>
                </div>
            </div>
            <span class="gotd-bar" aria-hidden="true"></span>`;
    }

    /* advance = true — взять следующую игру из мешка; false — оставить текущую (если она ещё подходит) */
    function renderGotd(advance) {
        const row = dailyRow(); if (!row) return;
        let el = $('gotd-widget');
        if (!el) {
            el = document.createElement('section'); el.id = 'gotd-widget'; el.className = 'glass gotd'; el.setAttribute('aria-label', 'Игра дня'); row.appendChild(el);
            el.addEventListener('mouseenter', () => { gHover = true; el.classList.add('is-paused'); });
            el.addEventListener('mouseleave', () => { gHover = false; el.classList.remove('is-paused'); gotdRestartBar(el); gotdSchedule(); });
        }
        const pool = gotdPool();
        if (!pool.length) {
            gCur = null; gBag = [];
            clearTimeout(gTimer); gTimer = null;
            el.innerHTML = `<div class="gotd-cover" aria-hidden="true">🎮</div><div class="min-w-0 flex-1 relative"><h3 class="font-black text-lg">Здесь появится игра дня</h3>
                <p class="text-gray-400 text-sm mt-1">Добавьте игры — хаб будет предлагать, во что сыграть сегодня.</p>
                <button type="button" class="potd-btn is-primary mt-3" onclick="openGameModal()">＋ Добавить игру</button></div>`;
            return;
        }
        let g = advance ? null : pool.find(x => x.id === gCur);
        const changed = !g;
        if (!g) { const id = gotdNext(pool); g = pool.find(x => x.id === id) || pool[0]; }
        gCur = g.id;
        if (!changed && el.dataset.gid === String(g.id) && el.dataset.logo === (window.mhPlatLogo ? '1' : '0')) return;   // ничего не поменялось — не мигаем
        const paint = () => {
            el.dataset.gid = String(g.id); el.dataset.logo = window.mhPlatLogo ? '1' : '0';
            el.innerHTML = gotdHTML(g);
            el.classList.remove('is-swapping'); void el.offsetWidth; el.classList.add('is-swapping');   // перезапуск анимации появления и полосы таймера
        };
        paint();
        gotdSchedule();
    }
    window.gotdRender = () => renderGotd(false);
    window.gotdOpen = () => { if (gCur != null) { showPage('games'); window.openGameDetail?.(gCur); } };
    window.gotdShuffle = () => { renderGotd(true); };

    /* ---- Избранное ---- */
    const KINDS = {
        artist: ['🏅', 'Артист месяца'], album: ['💿', 'Альбом месяца'], track: ['🎵', 'Трек месяца'], game: ['🎮', 'Игра месяца'],
        song: ['❤️', 'Любимая песня'], clip: ['🎬', 'Клип'], link: ['🔗', 'Ссылка'], other: ['✨', 'Другое']
    };
    const ytId = u => {
        try {
            const x = new URL(u), h = x.hostname.replace(/^www\.|^m\./, '');
            if (h === 'youtu.be') return x.pathname.slice(1);
            if (/(^|\.)youtube\.com$/.test(h)) return x.searchParams.get('v') || '';
        } catch (e) {}
        return '';
    };
    const spotImg = s => imgSrc(s.img) || (ytId(s.url) ? `https://i.ytimg.com/vi/${encodeURIComponent(ytId(s.url))}/hqdefault.jpg` : '');

    function renderSpots() {
        let sec = $('spot-section');
        if (!sec) {
            const old = $('fav-link-artist')?.closest('.grid');
            if (!old) return;
            old.classList.add('hidden');
            sec = document.createElement('section'); sec.id = 'spot-section'; sec.className = 'glass p-6 md:p-8 rounded-3xl mb-10';
            old.insertAdjacentElement('beforebegin', sec);
            sec.addEventListener('click', e => {
                const ed = e.target.closest('[data-sp-edit]');
                if (ed) { e.preventDefault(); e.stopPropagation(); return openSpot(Number(ed.dataset.spEdit)); }
                if (e.target.closest('[data-sp-add]')) openSpot(null);
            });
            ['fav-input-artist', 'fav-input-album'].forEach(id => $(id)?.closest('.glass')?.classList.add('hidden'));
        }
        const list = data.spotlights || [];
        const cards = list.map(s => {
            const [ic, kindLab] = KINDS[s.kind] || KINDS.other, lab = (s.kind === 'other' && s.customLabel) || kindLab, src = spotImg(s), url = safeUrl(s.url);
            const inner = `<span class="sp-cover" aria-hidden="true">${src ? `<img src="${esc(src)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : ic}</span>
                <span class="sp-body"><span class="sp-kind">${ic} ${esc(lab)}</span><span class="sp-title block">${esc(s.title)}</span>${s.sub ? `<span class="sp-sub block">${esc(s.sub)}</span>` : ''}</span>
                <button type="button" class="sp-edit" data-sp-edit="${s.id}" aria-label="Изменить">✏️</button>`;
            return url ? `<a class="sp-card" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${inner}</a>` : `<div class="sp-card" data-sp-edit="${s.id}" role="button" tabindex="0">${inner}</div>`;
        }).join('');
        sec.innerHTML = `<div class="flex items-center justify-between gap-3 mb-5">
            <div><h3 class="text-gray-400 text-sm uppercase tracking-wider font-bold">⭐ Избранное</h3><p class="text-xs text-gray-500">Артист, альбом, трек, клип, игра или любая ссылка</p></div>
            <button type="button" class="hx-btn is-primary" data-sp-add>＋ Добавить</button></div>
            <div class="sp-grid">${cards}<button type="button" class="sp-card sp-add" data-sp-add>＋ Добавить в избранное</button></div>`;
    }

    let spEdit = null, spKind = 'artist', spImgData = '';
    function buildSpot() {
        const m = document.createElement('div');
        m.id = 'spot-modal';
        m.className = 'hidden fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4';
        m.innerHTML = `<div class="glass no-hover w-full max-w-md p-7 space-y-4 max-h-[92vh] overflow-y-auto">
            <div class="flex items-center justify-between"><h2 id="sp-h" class="font-black">Избранное</h2>
                <button type="button" class="text-gray-400 hover:text-white text-xl" onclick="closeModal('spot-modal')" aria-label="Закрыть">✕</button></div>
            <div id="sp-kinds" class="flex flex-wrap gap-2"></div>
            <input id="sp-custom" maxlength="30" class="hx-in hidden" placeholder="Своя подпись: Фильм недели, Находка, Мечта…">
            <input id="sp-title" class="hx-in" placeholder="Название: трек, игра, клип…">
            <input id="sp-sub" class="hx-in" placeholder="Исполнитель или подпись (необязательно)">
            <input id="sp-url" class="hx-in" placeholder="🔗 Ссылка: YouTube, Spotify, Steam… (необязательно)">
            <div class="flex gap-2 items-center"><button type="button" id="sp-pick" class="hx-btn">📷 Картинка</button><button type="button" id="sp-clear" class="hx-btn hidden">Убрать</button>
                <span id="sp-note" class="text-[11px] text-gray-500">Для YouTube обложка подтянется сама</span></div>
            <input type="file" id="sp-file" accept="image/*" class="hidden">
            <div class="flex gap-2"><button type="button" id="sp-del" class="hx-btn is-danger hidden">Удалить</button><button type="button" id="sp-save" class="hx-btn is-primary flex-1">Сохранить</button></div></div>`;
        document.body.appendChild(m);
        $('sp-kinds').addEventListener('click', e => { const b = e.target.closest('[data-k]'); if (b) { spKind = b.dataset.k; paintKinds(); } });
        $('sp-pick').onclick = () => $('sp-file').click();
        $('sp-file').onchange = async e => {
            const f = e.target.files[0]; if (!f) return;
            try { spImgData = await compress(f); $('sp-note').textContent = 'Картинка готова ✨'; $('sp-clear').classList.remove('hidden'); }
            catch (err) { showToast('Не удалось прочитать картинку', 'error'); }
            e.target.value = '';
        };
        $('sp-clear').onclick = () => { spImgData = ''; $('sp-clear').classList.add('hidden'); $('sp-note').textContent = 'Картинка убрана'; };
        $('sp-save').onclick = saveSpot;
        $('sp-del').onclick = () => { data.spotlights = data.spotlights.filter(x => x.id !== spEdit); save(); closeModal('spot-modal'); showToast('Удалено из избранного'); };
    }
    function paintKinds() {
        $('sp-kinds').innerHTML = Object.entries(KINDS).map(([k, [ic, lab]]) => `<button type="button" data-k="${k}" class="sp-kinds-btn${k === spKind ? ' is-on' : ''}">${ic} ${esc(lab)}</button>`).join('');
        const c = $('sp-custom');
        if (c) { c.classList.toggle('hidden', spKind !== 'other'); }
    }
    function openSpot(id) {
        const s = id ? data.spotlights.find(x => x.id === id) : null;
        spEdit = s ? s.id : null; spKind = s ? s.kind : 'track'; spImgData = s ? s.img || '' : '';
        $('sp-h').textContent = s ? 'Изменить избранное' : 'Добавить в избранное';
        $('sp-custom').value = s ? s.customLabel || '' : ''; $('sp-title').value = s ? s.title : ''; $('sp-sub').value = s ? s.sub || '' : ''; $('sp-url').value = s ? s.url || '' : '';
        $('sp-del').classList.toggle('hidden', !s); $('sp-clear').classList.toggle('hidden', !spImgData);
        $('sp-note').textContent = 'Для YouTube обложка подтянется сама';
        paintKinds();
        $('spot-modal').classList.remove('hidden');
        $('sp-title').focus();
    }
    function saveSpot() {
        const title = $('sp-title').value.trim();
        let url = $('sp-url').value.trim();
        if (!title && !url) return showToast('Введите название или ссылку', 'error');
        if (url && !/^https?:\/\//i.test(url)) url = 'https://' + url;
        const rec = { kind: spKind, title: title || url.replace(/^https?:\/\/(www\.)?/, '').slice(0, 60), sub: $('sp-sub').value.trim(), url: safeUrl(url), img: spImgData, customLabel: spKind === 'other' ? $('sp-custom').value.trim().slice(0, 30) : '' };
        if (spEdit) Object.assign(data.spotlights.find(x => x.id === spEdit) || {}, rec);
        else data.spotlights.push({ id: Date.now(), ...rec });
        if (!commitOk()) return;
        closeModal('spot-modal');
        showToast('Сохранено в избранное ⭐', 'success');
    }
    const commitOk = () => { checkAchievements(); const ok = persistData(); updateUI(); return ok; };

    /* =====================================================
       3. РЕЙТИНГ АРТИСТОВ + ОКНО АРТИСТА
       ===================================================== */
    const art = { sort: 'count', q: '', all: false };
    function artistRows() {
        const m = new Map();
        [['cds', data.cds], ['vinyls', data.vinyls]].forEach(([t, arr]) => (arr || []).forEach(i => {
            const n = (i.artist || '').trim(); if (!n) return;
            const r = m.get(lc(n)) || { name: n, count: 0, spent: 0, rs: 0, rn: 0 };
            r.count++; r.spent += num(i.price);
            if (i.rating) { r.rs += i.rating; r.rn++; }
            m.set(lc(n), r);
        }));
        return [...m.values()];
    }

    function renderArtists() {
        const grid = $('artist-stats-grid'); if (!grid) return;
        if (!$('art-ctl')) {
            const ctl = document.createElement('div'); ctl.id = 'art-ctl'; ctl.className = 'art-ctl';
            ctl.innerHTML = `<input id="art-q" type="search" placeholder="Найти артиста…" aria-label="Найти артиста">
                <div class="hx-seg" id="art-sort"><button type="button" data-s="count">Релизы</button><button type="button" data-s="spent">Потрачено</button><button type="button" data-s="rating">Оценка</button></div>`;
            grid.insertAdjacentElement('beforebegin', ctl);
            $('art-q').addEventListener('input', e => { art.q = lc(e.target.value); renderArtists(); });
            $('art-sort').addEventListener('click', e => { const b = e.target.closest('[data-s]'); if (b) { art.sort = b.dataset.s; renderArtists(); } });
            grid.addEventListener('click', e => {
                if (e.target.closest('[data-more]')) { art.all = !art.all; return renderArtists(); }
                const r = e.target.closest('[data-art]'); if (r) window.showArtistStats(r.dataset.art);
            });
        }
        grid.className = 'art-list';
        $('art-sort').querySelectorAll('[data-s]').forEach(b => b.classList.toggle('is-on', b.dataset.s === art.sort));
        let rows = artistRows().filter(r => !art.q || lc(r.name).includes(art.q));
        const key = { count: r => r.count, spent: r => r.spent, rating: r => (r.rn ? r.rs / r.rn : 0) }[art.sort];
        rows.sort((a, b) => key(b) - key(a) || b.count - a.count || a.name.localeCompare(b.name));
        if (!rows.length) { grid.innerHTML = `<p class="hx-empty text-center">${art.q ? 'Никого не нашли' : 'Укажите исполнителей ваших релизов…'}</p>`; return; }
        const mx = Math.max(1, ...rows.map(key)), shown = art.all ? rows : rows.slice(0, 8);
        grid.innerHTML = shown.map(r => `<button type="button" class="art-row" data-art="${esc(r.name)}">
            <span class="hx-ava" style="--h:${hue(r.name)}">${esc(r.name[0].toUpperCase())}</span>
            <span class="art-main"><b>${esc(r.name)}</b><i class="art-bar"><u style="width:${Math.max(4, key(r) / mx * 100)}%"></u></i></span>
            <span class="art-num"><b>${r.count}</b> рел.</span>
            <span class="art-sub">${r.spent} ₴${r.rn ? ` · ★ ${(r.rs / r.rn).toFixed(1)}` : ''}</span></button>`).join('')
            + (rows.length > 8 ? `<button type="button" class="hx-btn mt-2 self-center" data-more>${art.all ? 'Свернуть' : `Показать всех (${rows.length})`}</button>` : '');
    }

    const showArtistBase = window.showArtistStats;
    window.showArtistStats = name => {
        showArtistBase(name);
        try {
            const n = lc(name);
            const rel = [...(data.cds || []).map(i => ({ ...i, _i: '💿' })), ...(data.vinyls || []).map(i => ({ ...i, _i: '💽' }))]
                .filter(i => lc(i.artist) === n).sort((a, b) => (num(a.year) || 9999) - (num(b.year) || 9999));
            $('artist-stats-title').innerHTML = `<span class="hx-ava" style="--h:${hue(name)}">${esc(name[0].toUpperCase())}</span> ${esc(name)}`;
            const rated = rel.filter(i => i.rating), yrs = rel.map(i => num(i.year)).filter(y => y > 1900);
            const tiles = [
                ['Ср. оценка', rated.length ? '★ ' + (rated.reduce((s, i) => s + i.rating, 0) / rated.length).toFixed(1) : '—'],
                ['Ср. цена', rel.length ? Math.round(rel.reduce((s, i) => s + num(i.price), 0) / rel.length) + ' ₴' : '—'],
                ['Годы', yrs.length ? (Math.min(...yrs) === Math.max(...yrs) ? Math.min(...yrs) : `${Math.min(...yrs)}–${Math.max(...yrs)}`) : '—'],
                ...(data.showScrobble ? [['Прослушано', rel.reduce((s, i) => s + num(i.playCount), 0) + ' раз']] : [])
            ];
            let ex = $('artist-extra');
            if (!ex) {
                const box = $('artist-stats-count').closest('.space-y-4');
                ex = document.createElement('div'); ex.id = 'artist-extra'; ex.className = 'grid grid-cols-2 gap-3';
                box.insertBefore(ex, box.children[1]);
            }
            ex.innerHTML = tiles.map(([l, v]) => `<div class="ax-tile"><small>${l}</small><b>${esc(v)}</b></div>`).join('');
            const list = $('artist-releases-list');
            list.innerHTML = rel.map(i => `<button type="button" class="ax-card" data-k="${i._i === '💿' ? 'cds' : 'vinyls'}" data-id="${esc(i.id)}" title="${esc(i.title)}">
                <span class="ax-cov">${i.img ? `<img src="${esc(i.img)}" alt="" loading="lazy">` : `<span class="ax-ph">${i._i}</span>`}<span class="ax-fmt">${i._i === '💿' ? 'CD' : 'Винил'}</span></span>
                <b class="ax-t">${esc(i.title)}</b>
                <span class="ax-m">${i.year ? esc(i.year) : '—'}${i.rating ? ` · <span class="ax-star">★ ${esc(i.rating)}</span>` : ''}</span>
                <span class="ax-p">${esc(fmtPrice(i))}</span></button>`).join('')
                || '<p class="text-gray-500 text-xs italic">Релизов нет</p>';
            if (!list.dataset.bound) {
                list.dataset.bound = '1';
                list.addEventListener('click', e => {
                    const c = e.target.closest('.ax-card');
                    if (c && window.openMusicDetail) window.openMusicDetail(c.dataset.k, c.dataset.id);
                });
            }
        } catch (e) { console.warn('[hub2] artist modal:', e); }
    };

    /* =====================================================
       4. РАСШИРЕННАЯ СТАТИСТИКА
       ===================================================== */
    const SC = { backlog: ['#60a5fa', 'В планах'], playing: ['#fbbf24', 'В процессе'], completed: ['#34d399', 'Пройдено'], online: ['#a78bfa', 'Онлайн'], sandbox: ['#fb923c', 'Песочница'], dropped: ['#f87171', 'Заброшено'], skipped: ['#64748b', 'Не в планах'], app: ['#2dd4bf', 'Приложение'], '': ['#9ca3af', 'Без статуса'] };
    const bars = (rows, color = 'linear-gradient(90deg, rgb(var(--theme-rgb)), #06b6d4)') => {
        const mx = Math.max(1, ...rows.map(r => r[1]));
        return rows.map(([l, v, t]) => `<div class="hx-row"><span class="hx-l" title="${esc(l)}">${esc(l)}</span><div class="hx-bar"><i style="width:${Math.max(3, v / mx * 100)}%;background:${color}"></i></div><b>${esc(t ?? v)}</b></div>`).join('')
            || '<p class="hx-empty">Пока нет данных</p>';
    };
    const card = (title, body) => `<div class="glass hx-card rounded-3xl"><h4>${title}</h4>${body}</div>`;

    function renderStatsPlus() {
        const root = $('analytics-plus'); if (!root) return;
        const cds = data.cds || [], vin = data.vinyls || [], games = data.games || [], stuff = data.stuff || [], wish = data.wishlists || [];
        const music = [...cds, ...vin], all = [...music, ...games, ...stuff];
        const value = all.reduce((s, i) => s + num(i.price), 0), priced = all.filter(i => num(i.price) > 0);
        const counted = games.filter(g => !['online', 'sandbox', 'skipped', 'app'].includes(g.status));
        const done = counted.filter(g => g.status === 'completed').length;
        const hours = games.reduce((s, g) => s + num(g.hours), 0);
        const wishVal = wish.reduce((s, i) => s + num(i.price), 0);

        const tiles = [
            ['Всего позиций', all.length], ['Общая стоимость', value + ' ₴'], ['Средняя цена', priced.length ? Math.round(value / priced.length) + ' ₴' : '—'],
            ['Игр пройдено', counted.length ? `${done} / ${counted.length}` : '—'], ['Часов в играх', hours ? fmtHours(hours) : '—'], ['В желаемом', wishVal + ' ₴']
        ].map(([l, v]) => `<div class="glass hx-tile"><small>${l}</small><b>${esc(v)}</b></div>`).join('');

        // игры по статусам
        const st = {};
        games.forEach(g => { const k = SC[g.status] ? g.status : ''; st[k] = (st[k] || 0) + 1; });
        const stEntries = Object.entries(st).sort((a, b) => b[1] - a[1]);
        const statusCard = card('🎮 Игры по статусам', games.length
            ? `<div class="hx-seg-bar">${stEntries.map(([k, n]) => `<i style="width:${n / games.length * 100}%;background:${SC[k][0]}" title="${SC[k][1]}: ${n}"></i>`).join('')}</div>
               <div class="hx-legend">${stEntries.map(([k, n]) => `<span style="--c:${SC[k][0]}">${SC[k][1]} · ${n}</span>`).join('')}</div>`
            : '<p class="hx-empty">Добавьте игры, чтобы увидеть бэклог</p>');

        const pl = {}; games.forEach(g => { const p = g.platform || 'Другое'; pl[p] = (pl[p] || 0) + 1; });
        const platCard = card('🕹 Игры по платформам', bars(Object.entries(pl).sort((a, b) => b[1] - a[1]).slice(0, 6)));

        // оценки
        const rc = [0, 0, 0, 0, 0, 0];
        [...music, ...games].forEach(i => { if (i.rating >= 1 && i.rating <= 5) rc[i.rating]++; });
        const rmx = Math.max(1, ...rc);
        const rateCard = card('⭐ Распределение оценок', `<div class="hx-cols">${[1, 2, 3, 4, 5].map(n => `<div class="hx-col"><b>${rc[n]}</b><i style="height:${rc[n] / rmx * 100}%"></i>${n}★</div>`).join('')}</div>`);

        // пополнение по месяцам
        const now = new Date(), mk = [];
        for (let k = 11; k >= 0; k--) { const d = new Date(now.getFullYear(), now.getMonth() - k, 1); mk.push({ key: d.getFullYear() * 12 + d.getMonth(), label: d.toLocaleDateString(loc(), { month: 'short' }), n: 0 }); }
        all.forEach(i => { if (num(i.id) < 1.4e12) return; const d = new Date(i.id), m = mk.find(x => x.key === d.getFullYear() * 12 + d.getMonth()); if (m) m.n++; });
        const mmx = Math.max(1, ...mk.map(m => m.n));
        const monthCard = card('📈 Пополнение по месяцам', `<div class="hx-cols">${mk.map(m => `<div class="hx-col"><b>${m.n || ''}</b><i style="height:${m.n / mmx * 100}%"></i>${esc(m.label.slice(0, 3))}</div>`).join('')}</div>`);

        // магазины
        const shops = new Map();
        all.forEach(i => { const w = (i.whereBought || '').trim(); if (!w || /^(Быстрое добавление|Перенос из)/.test(w)) return; const r = shops.get(lc(w)) || { n: w, c: 0, s: 0 }; r.c++; r.s += num(i.price); shops.set(lc(w), r); });
        const shopCard = card('🏪 Где покупаете', bars([...shops.values()].sort((a, b) => b.c - a.c).slice(0, 6).map(r => [r.n, r.c, `${r.c} · ${r.s}₴`])));

        const spendCard = card('💸 Артисты по тратам', bars(artistRows().sort((a, b) => b.spent - a.spent).slice(0, 5).filter(r => r.spent > 0).map(r => [r.name, r.spent, r.spent + '₴']), 'linear-gradient(90deg,#f59e0b,#ef4444)'));

        // желаемое
        const budget = num(data.hobbyBudget) || 2500, pr = {};
        wish.forEach(w => { const k = w.priority || 'Без приоритета'; pr[k] = (pr[k] || 0) + 1; });
        const wishCard = card('🎁 Желаемое', wish.length
            ? `<p class="text-xs text-gray-400 mb-3">${wish.length} поз. на ${wishVal} ₴ — при бюджете ${budget} ₴/мес. это ≈ ${(wishVal / budget).toFixed(1)} мес.</p>${bars(Object.entries(pr).sort((a, b) => b[1] - a[1]), 'linear-gradient(90deg,#f472b6,#a78bfa)')}`
            : '<p class="hx-empty">Список желаний пуст</p>');

        const catCard = card('🧮 Состав коллекции', bars([['💿 CD', cds.length], ['💽 Винил', vin.length], ['🎮 Игры', games.length], ['📦 Вещи', stuff.length], ['🎁 Желаемое', wish.length]]));

        root.innerHTML = `<div class="hx-head"><h3 class="text-2xl font-black">✨ Расширенная статистика</h3><span class="text-xs text-gray-500">Игры, оценки, покупки, динамика</span></div>
            <div class="hx-tiles">${tiles}</div>
            <div class="hx-grid">${statusCard}${platCard}${catCard}${rateCard}${monthCard}${shopCard}${spendCard}${wishCard}</div>`;
    }

    /* =====================================================
       5. ЯЗЫК (RU / EN / UK) — переключатель (перевод: i18n.js)
       ===================================================== */
    /* Сам перевод (словарь + движок) теперь в i18n-dict.js и i18n.js:
       они переводят весь интерфейс, а не только список из ~150 фраз. Здесь — только переключатель. */
    function applyLang() {
        const lang = data.lang || 'ru';
        document.documentElement.lang = lang;
        document.querySelectorAll('[data-lang]').forEach(b => b.classList.toggle('is-on', b.dataset.lang === lang));
        window.MirvelI18n?.apply(lang);
    }
    window.setLang = l => { data.lang = l; persistData(); applyLang(); updateUI(); };

    /* =====================================================
       6. НАСТРОЙКИ ИНТЕРФЕЙСА + СКРОББЛИНГ
       ===================================================== */
    function buildSettings() {
        const side = $('atm-btn-vinyl')?.closest('.glass')?.parentElement;
        if (side && !$('ui-card')) {
            const c = document.createElement('div');
            c.id = 'ui-card'; c.className = 'glass p-8 rounded-3xl space-y-4';
            c.innerHTML = `<h3 class="font-bold text-xl">🌐 Интерфейс</h3>
                <div><p class="text-xs text-gray-400 mb-2">Язык</p><div class="hx-seg"><button type="button" data-lang="ru">Русский</button><button type="button" data-lang="en">English</button><button type="button" data-lang="uk">Українська</button></div>
                <p class="text-[11px] text-gray-500 mt-2">Переводится весь интерфейс. Названия релизов, заметки и другие введённые вами данные остаются как есть.</p></div>
                <label class="flex items-start gap-3 text-sm text-gray-300 cursor-pointer"><input type="checkbox" id="opt-scrobble" class="accent-purple-500 mt-1">
                <span>Скробблинг прослушиваний 🎧<small class="block text-[11px] text-gray-500">Счётчик «Прослушано», кнопка 🎧, топ и сортировка по прослушиваниям. По умолчанию скрыт.</small></span></label>`;
            side.prepend(c);
            c.addEventListener('click', e => { const b = e.target.closest('[data-lang]'); if (b) setLang(b.dataset.lang); });
            $('opt-scrobble').addEventListener('change', e => { data.showScrobble = e.target.checked; save(); });
        }
        const sbar = document.querySelector('.sidebar .hidden.md\\:block.mt-auto');
        if (sbar && !$('lang-pill')) {
            const p = document.createElement('div'); p.id = 'lang-pill'; p.className = 'lang-pill';
            p.innerHTML = '<button type="button" data-lang="ru">RU</button><button type="button" data-lang="en">EN</button><button type="button" data-lang="uk">UA</button>';
            p.addEventListener('click', e => { const b = e.target.closest('[data-lang]'); if (b) setLang(b.dataset.lang); });
            sbar.appendChild(p);
        }
        const cb = $('opt-scrobble'); if (cb) cb.checked = !!data.showScrobble;
        document.body.classList.toggle('show-scrobble', !!data.showScrobble);
    }

    /* =====================================================
       Главная: плитка «Всего часов» (сюжет + онлайн по всем играм)
       ===================================================== */
    const HT = {
        ru: { unit: 'ч', games: n => `в ${n} ${n % 10 === 1 && n % 100 !== 11 ? 'игре' : 'играх'}`, online: 'из них онлайн', none: 'Укажите часы на странице игры' },
        en: { unit: 'h', games: n => `across ${n} game${n === 1 ? '' : 's'}`, online: 'online', none: 'Add hours on a game page' },
        uk: { unit: 'год', games: n => `у ${n} ${n % 10 === 1 && n % 100 !== 11 ? 'грі' : 'іграх'}`, online: 'з них онлайн', none: 'Вкажіть години на сторінці гри' }
    };
    const fmtHours = h => (h >= 100 ? Math.round(h) : Math.round(h * 10) / 10);

    function renderHoursTile() {
        const grid = $('stat-most-expensive')?.closest('.grid');
        if (!grid) return;
        if (!$('stat-hours-tile')) {
            const t = document.createElement('div');
            t.id = 'stat-hours-tile';
            t.className = 'glass p-6 rounded-3xl';
            t.innerHTML = `<p class="text-gray-500 text-xs uppercase font-bold tracking-wider">Всего часов ⏱</p>
                <h3 id="stat-total-hours" class="text-xl md:text-2xl font-black mt-2 text-emerald-400 truncate">0</h3>
                <p id="stat-hours-sub" class="text-[11px] text-gray-500 mt-1 truncate"></p>`;
            grid.appendChild(t);
        }
        const L = HT[data.lang] || HT.ru;
        const games = data.games || [];
        const story = games.reduce((n, g) => n + num(g.hours), 0);
        const total = story;
        const withHours = games.filter(g => num(g.hours) > 0).length;
        $('stat-total-hours').textContent = `${fmtHours(total)} ${L.unit}`;
        $('stat-hours-sub').textContent = total
            ? L.games(withHours)
            : L.none;
    }

    /* =====================================================
       Подключение
       ===================================================== */
    const renderBase = renderAll;
    renderAll = function () {
        renderBase();
        try {
            ensure(); buildSettings(); renderHero(); renderHoursTile(); renderGotd(); renderSpots(); renderArtists(); renderStatsPlus(); applyLang();
        } catch (e) { console.warn('[hub2]', e); }
    };

    buildNotes();
    syncNotesBtn();
    buildSpot();

    // «Статистика»: контейнер для расширенных блоков
    const an = $('analytics');
    if (an && !$('analytics-plus')) { const d = document.createElement('div'); d.id = 'analytics-plus'; d.className = 'mt-10'; an.appendChild(d); }

    // подсветка карточек под курсором
    let glowQ = null;
    document.addEventListener('pointermove', e => {
        if (glowQ || e.pointerType === 'touch') return;
        glowQ = requestAnimationFrame(() => {
            glowQ = null;
            const g = e.target.closest?.('main .glass');
            if (!g) return;
            const r = g.getBoundingClientRect();
            g.style.setProperty('--mx', `${e.clientX - r.left}px`);
            g.style.setProperty('--my', `${e.clientY - r.top}px`);
        });
    }, { passive: true });

    // палитра команд и горячая клавиша «M»
    const noteAct = PALETTE_ACTIONS.find(a => a.title === 'Быстрые заметки');
    if (noteAct) { noteAct.title = 'Заметки'; noteAct.hint = 'Плавающая панель (клавиша M)'; noteAct.run = () => openNotes(); }
    PALETTE_ACTIONS.push({ icon: '🎮', title: 'Игра дня', hint: 'Открыть выбранную на сегодня игру', run: () => { showPage('home'); setTimeout(() => window.gotdOpen(), 50); } });
    document.addEventListener('keydown', e => {
        if (e.code !== 'KeyM' || e.ctrlKey || e.metaKey || e.altKey || isTyping(e.target)) return;
        if (openModals().length || !$('command-palette').classList.contains('hidden')) return;
        e.preventDefault(); toggleNotes();
    });

    updateUI();
})();
