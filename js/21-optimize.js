/* =========================================================
   MIRVEL HUB — 21-optimize.js (подключать последним)
   • в «Настройках» показывает, где реально хранятся данные (IndexedDB или запасной localStorage 5 МБ) и почему
   • кнопка «Сжать все фото»: старые обложки/фото/аватары перекодируются под те же размеры, что и новые загрузки
   ========================================================= */
(() => {
    const $ = id => document.getElementById(id);
    const MIN_LEN = 40000;                         // мельче ~30 КБ не трогаем
    const isImg = v => typeof v === 'string' && v.startsWith('data:image/') && v.length > MIN_LEN;

    /* все картинки в данных: [{ holder, key, preset }] */
    function collect() {
        const out = [];
        (function walk(node, parentKey) {
            if (Array.isArray(node)) { node.forEach((x, i) => walk(x, parentKey)); return; }
            if (!node || typeof node !== 'object') return;
            for (const k of Object.keys(node)) {
                const v = node[k];
                if (isImg(v)) out.push({ holder: node, key: k, preset: k === 'bannerImg' ? 'banner' : (k === 'src' && parentKey === 'photos') ? 'photo' : 'cover' });
                else if (v && typeof v === 'object') walk(v, k);
            }
        })(data, '');
        return out;
    }

    async function shrink(src, preset) {
        const blob = await (await fetch(src)).blob();
        return compressImage(blob, preset);
    }

    function overlay() {
        const o = document.createElement('div');
        o.id = 'optimize-overlay';
        o.className = 'fixed inset-0 bg-black/80 flex items-center justify-center z-[90] p-4';
        o.innerHTML = `<div class="glass no-hover w-full max-w-sm rounded-3xl p-6 space-y-3 text-center">
            <h3 class="text-lg font-black">🗜️ Сжимаю фото…</h3>
            <div class="meter"><div id="opt-bar" class="meter-fill" style="width:0%"></div></div>
            <p id="opt-text" class="text-xs text-gray-400">Не закрывайте вкладку</p></div>`;
        document.body.appendChild(o);
        return o;
    }

    async function optimizeAll() {
        const list = collect();
        if (!list.length) { showToast('Тяжёлых фото нет — сжимать нечего 👌'); return; }
        const before = list.reduce((n, r) => n + r.holder[r.key].length, 0);
        if (!confirm(`Найдено фото: ${list.length} (≈ ${fmtBytes(before * 0.75)}).\n\nСначала скачается бэкап (.json), потом фото уменьшатся: обложки до 480 px, фото в галерее до 1100 px, баннер до 1280 px. Продолжить?`)) return;
        try { exportData(); } catch (_) {}
        const o = overlay();
        let saved = 0, done = 0, failed = 0;
        for (const r of list) {
            try {
                const old = r.holder[r.key];
                const next = await shrink(old, r.preset);
                if (next.length < old.length * 0.9) { r.holder[r.key] = next; saved += old.length - next.length; }
            } catch (e) { failed++; }
            done++;
            $('opt-bar').style.width = `${Math.round(done / list.length * 100)}%`;
            $('opt-text').textContent = `${done} из ${list.length} · сэкономлено ${fmtBytes(saved * 0.75)}`;
            if (done % 3 === 0) await new Promise(r => setTimeout(r, 0));
        }
        o.remove();
        save();
        await window.MirvelStore?.flush?.();
        showToast(`Готово: освобождено <strong>${fmtBytes(saved * 0.75)}</strong>${failed ? ` (не удалось: ${failed})` : ''} ✨`, 'success');
    }
    window.optimizeAllPhotos = optimizeAll;

    /* ---------- Блок в «Настройках» ---------- */
    function build() {
        const anchor = $('last-backup-text')?.parentElement;
        if (!anchor || $('opt-box')) return;
        const box = document.createElement('div');
        box.id = 'opt-box';
        box.className = 'space-y-2 pt-1';
        box.innerHTML = `<p id="opt-mode" class="text-[11px]"></p>
            <p id="opt-info" class="text-[11px] text-gray-500"></p>
            <button type="button" id="opt-btn" class="w-full bg-white/5 border border-white/10 py-2.5 rounded-xl text-xs font-bold hover:bg-white/10 transition">🗜️ Сжать все фото</button>`;
        anchor.appendChild(box);
        $('opt-btn').onclick = optimizeAll;
    }

    function refresh() {
        build();
        if (!$('opt-box') || $('profile').classList.contains('hidden')) return;
        const S = window.MirvelStore;
        const mode = $('opt-mode');
        if (S && S.mode === 'idb') {
            mode.className = 'text-[11px] text-emerald-300';
            mode.textContent = '✅ Хранилище: IndexedDB (большой лимит)';
        } else {
            mode.className = 'text-[11px] text-amber-300';
            mode.textContent = S
                ? `⚠️ Запасной режим: localStorage, лимит ~5 МБ. Причина: ${S.fallbackReason || 'IndexedDB недоступна'}. Проверьте: не приватное ли окно, не запрещено ли хранение данных сайтов; лучше открывать хаб по https/http, а не файлом.`
                : '⚠️ 00-storage.js не загрузился — работает старый режим на 5 МБ. Нажмите Ctrl+F5 и проверьте, что файл лежит в папке js/.';
        }
        const imgs = collect();
        const bytes = imgs.reduce((n, r) => n + r.holder[r.key].length, 0);
        $('opt-info').textContent = imgs.length ? `Тяжёлых фото: ${imgs.length} (≈ ${fmtBytes(bytes * 0.75)})` : 'Тяжёлых фото нет';
    }

    const renderBase = renderAll;
    renderAll = function () { renderBase(); refresh(); };
    refresh();
})();
