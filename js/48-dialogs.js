/* =========================================================
   MIRVEL HUB — 48-dialogs.js (после 47-prompts.js)
   Свои окна подтверждения и ввода вместо системных confirm()/prompt().
   Системные окна показывают «Подтвердите действие на …github.io» и выбиваются из стиля.

   API (оба возвращают Promise):
     await mhConfirm('Текст', { title, okText, cancelText, danger })  -> true | false
     await mhPrompt('Вопрос', { title, value, placeholder, okText, multiline, required }) -> строка | null
   Esc / клик по фону = отмена, Enter = ОК (в многострочном поле — Ctrl+Enter).
   ========================================================= */
(() => {
    'use strict';
    if (window.mhConfirm && window.mhPrompt) return;

    const CSS = `
    .mhd-ov{position:fixed;inset:0;z-index:100000;display:flex;align-items:center;justify-content:center;padding:16px;
        background:rgba(0,0,0,.62);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);opacity:0;transition:opacity .16s ease}
    .mhd-ov.is-in{opacity:1}
    .mhd-box{width:100%;max-width:420px;max-height:88vh;overflow:auto;border-radius:20px;padding:20px;color:#e5e7eb;
        background:rgba(24,24,32,.94);border:1px solid rgba(255,255,255,.1);box-shadow:0 20px 60px rgba(0,0,0,.55);
        transform:translateY(8px) scale(.97);transition:transform .16s ease}
    .mhd-ov.is-in .mhd-box{transform:none}
    .mhd-title{font-size:15px;font-weight:800;margin:0 0 8px;color:#fff}
    .mhd-msg{font-size:13px;line-height:1.5;color:#cbd5e1;white-space:pre-line;word-break:break-word}
    .mhd-in{width:100%;margin-top:12px;padding:10px 12px;border-radius:12px;font-size:14px;color:#fff;outline:none;
        background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.14);font-family:inherit;resize:vertical}
    .mhd-in:focus{border-color:var(--theme-btn,#8b5cf6);box-shadow:0 0 0 3px color-mix(in srgb,var(--theme-btn,#8b5cf6) 28%,transparent)}
    .mhd-in.is-bad{border-color:#f87171}
    .mhd-row{display:flex;gap:8px;justify-content:flex-end;margin-top:16px;flex-wrap:wrap}
    .mhd-btn{padding:9px 16px;border-radius:12px;font-size:13px;font-weight:700;cursor:pointer;border:1px solid rgba(255,255,255,.12);
        background:rgba(255,255,255,.06);color:#e5e7eb;transition:background .15s,transform .1s}
    .mhd-btn:hover{background:rgba(255,255,255,.12)}
    .mhd-btn:active{transform:scale(.97)}
    .mhd-btn:focus-visible{outline:2px solid var(--theme-btn,#8b5cf6);outline-offset:2px}
    .mhd-ok{background:var(--theme-btn,#8b5cf6);border-color:transparent;color:#fff}
    .mhd-ok:hover{background:var(--theme-btn,#8b5cf6);filter:brightness(1.12)}
    .mhd-danger{background:#dc2626;border-color:transparent;color:#fff}
    .mhd-danger:hover{background:#ef4444}
    @media (max-width:480px){.mhd-ov{align-items:flex-end;padding:10px}.mhd-box{max-width:none;border-radius:20px}
        .mhd-row .mhd-btn{flex:1}}
    @media (prefers-reduced-motion:reduce){.mhd-ov,.mhd-box{transition:none}}`;

    let styled = false;
    function ensureStyle() {
        if (styled) return; styled = true;
        const s = document.createElement('style'); s.id = 'mhd-style'; s.textContent = CSS; document.head.appendChild(s);
    }

    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

    // окна идут по очереди, чтобы два подряд (как «Название» → «Описание») не накладывались
    let chain = Promise.resolve();

    function open(kind, message, o) {
        o = o || {};
        const run = () => new Promise(resolve => {
            ensureStyle();
            const prevFocus = document.activeElement;
            const ov = document.createElement('div');
            ov.className = 'mhd-ov';
            const isPrompt = kind === 'prompt';
            const title = o.title || (isPrompt ? 'Введите значение' : (o.danger ? 'Подтвердите действие' : 'Подтверждение'));
            const okText = o.okText || (isPrompt ? 'Сохранить' : 'ОК');
            const cancelText = o.cancelText || 'Отмена';
            const field = isPrompt
                ? (o.multiline
                    ? `<textarea class="mhd-in" rows="4" maxlength="${o.maxLength || 2000}" placeholder="${esc(o.placeholder || '')}">${esc(o.value || '')}</textarea>`
                    : `<input class="mhd-in" type="text" maxlength="${o.maxLength || 300}" autocomplete="off" placeholder="${esc(o.placeholder || '')}" value="${esc(o.value || '')}">`)
                : '';
            ov.innerHTML = `<div class="mhd-box" role="alertdialog" aria-modal="true" aria-label="${esc(title)}">
                <h3 class="mhd-title">${esc(title)}</h3>
                <div class="mhd-msg">${esc(message)}</div>${field}
                <div class="mhd-row">
                    <button type="button" class="mhd-btn" data-x="cancel">${esc(cancelText)}</button>
                    <button type="button" class="mhd-btn ${o.danger ? 'mhd-danger' : 'mhd-ok'}" data-x="ok">${esc(okText)}</button>
                </div></div>`;
            document.body.appendChild(ov);
            requestAnimationFrame(() => ov.classList.add('is-in'));
            const inp = ov.querySelector('.mhd-in');
            const okBtn = ov.querySelector('[data-x="ok"]');
            const cancelBtn = ov.querySelector('[data-x="cancel"]');
            // фокус: в поле ввода; для опасных действий — на «Отмена», чтобы случайный Enter ничего не удалил
            setTimeout(() => { try { (inp || (o.danger ? cancelBtn : okBtn)).focus(); if (inp && inp.select) inp.select(); } catch (_) {} }, 30);

            let done = false;
            const finish = val => {
                if (done) return; done = true;
                document.removeEventListener('keydown', onKey, true);
                ov.classList.remove('is-in');
                setTimeout(() => ov.remove(), 170);
                try { if (prevFocus && prevFocus.focus && document.contains(prevFocus)) prevFocus.focus(); } catch (_) {}
                resolve(val);
            };
            const accept = () => {
                if (!isPrompt) return finish(true);
                const v = inp.value;
                if (o.required && !v.trim()) { inp.classList.add('is-bad'); inp.focus(); return; }
                finish(v);
            };
            function onKey(e) {
                if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); finish(isPrompt ? null : false); return; }
                if (e.key === 'Enter') {
                    const multi = isPrompt && o.multiline;
                    if (e.target === cancelBtn) return;               // Enter на «Отмена» работает как клик по ней
                    if (multi && !(e.ctrlKey || e.metaKey)) return;   // в textarea Enter = перенос строки
                    e.preventDefault(); e.stopPropagation(); accept();
                    return;
                }
                if (e.key === 'Tab') {                                // фокус не уходит за окно
                    const els = [...ov.querySelectorAll('input,textarea,button')];
                    const i = els.indexOf(document.activeElement);
                    if (e.shiftKey && i <= 0) { e.preventDefault(); els[els.length - 1].focus(); }
                    else if (!e.shiftKey && i === els.length - 1) { e.preventDefault(); els[0].focus(); }
                }
            }
            document.addEventListener('keydown', onKey, true);
            ov.addEventListener('mousedown', e => { if (e.target === ov) finish(isPrompt ? null : false); });
            okBtn.addEventListener('click', accept);
            cancelBtn.addEventListener('click', () => finish(isPrompt ? null : false));
            if (inp) inp.addEventListener('input', () => inp.classList.remove('is-bad'));
        });
        const p = chain.then(run, run);
        chain = p.catch(() => {});
        return p;
    }

    window.mhConfirm = (message, opts) => open('confirm', message, opts);
    window.mhPrompt = (message, opts) => open('prompt', message, opts);
})();
