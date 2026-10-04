/* =========================================================
   MIRVEL HUB — 23-sounds.js (подключать последним)
   Тихие звуки интерфейса, которые синтезируются прямо в браузере (файлов нет):
   • щелчок иглы — нажатия на кнопки
   • шелест конверта — открытие релиза/игры, окон и переход между страницами
   Настройки (Настройки → «Интерфейс»): вкл/выкл, стиль, громкость.
   Поля data: uiSounds (по умолчанию включено), uiSoundStyle ('both' | 'needle' | 'sleeve'), uiSoundVol (0–100).
   ========================================================= */
(() => {
    const $ = id => document.getElementById(id);
    const MODAL_SEL = '[id="modal"], [id$="-modal"], #command-palette';
    const CARD_SEL = '.release-card, .release-container, .game-card, .ax-card, [data-gid]';
    const CLICK_SEL = 'button, a[href], [role="button"], summary, .opt-card, .gx-fam, .gx-plat';

    const isOn = () => data.uiSounds !== false;
    const style = () => (['needle', 'sleeve'].includes(data.uiSoundStyle) ? data.uiSoundStyle : 'both');
    const volume = () => { const v = Number(data.uiSoundVol); return Math.max(0, Math.min(100, Number.isFinite(v) ? v : 50)) / 100; };
    const level = () => Math.pow(volume(), 2) * 0.7;           // квадратичная шкала: у малых значений действительно тихо

    /* ---------- Синтез ---------- */
    let noise = null;
    function noiseBuf(ctx) {
        if (noise && noise.sampleRate === ctx.sampleRate) return noise;
        const len = Math.floor(ctx.sampleRate * 0.7), b = ctx.createBuffer(1, len, ctx.sampleRate), d = b.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
        return (noise = b);
    }
    const rnd = (a, b) => a + Math.random() * (b - a);

    const voices = {
        /* щелчок иглы: короткий «поп» шума + мягкий низкий толчок */
        tick(ctx, out, L, t = ctx.currentTime) {
            const src = ctx.createBufferSource(); src.buffer = noiseBuf(ctx);
            const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = rnd(2600, 3800); bp.Q.value = 0.9;
            const g = ctx.createGain();
            g.gain.setValueAtTime(0.0001, t);
            g.gain.exponentialRampToValueAtTime(Math.max(0.0002, 0.9 * L), t + 0.002);
            g.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
            src.connect(bp); bp.connect(g); g.connect(out);
            src.start(t, rnd(0, 0.4), 0.05);

            const o = ctx.createOscillator(); o.type = 'sine';
            o.frequency.setValueAtTime(rnd(130, 170), t);
            o.frequency.exponentialRampToValueAtTime(55, t + 0.05);
            const g2 = ctx.createGain();
            g2.gain.setValueAtTime(0.0001, t);
            g2.gain.exponentialRampToValueAtTime(Math.max(0.0002, 0.32 * L), t + 0.004);
            g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
            o.connect(g2); g2.connect(out);
            o.start(t); o.stop(t + 0.1);
        },
        /* шелест бумажного конверта: шум с «дрожащей» огибающей */
        rustle(ctx, out, L, t = ctx.currentTime) {
            const dur = rnd(0.2, 0.26);
            const src = ctx.createBufferSource(); src.buffer = noiseBuf(ctx);
            const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1400;
            const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = rnd(3800, 5200); bp.Q.value = 0.4;
            const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 8000;
            const g = ctx.createGain(), P = Math.max(0.0002, 0.5 * L);
            g.gain.setValueAtTime(0.0001, t);
            g.gain.exponentialRampToValueAtTime(P, t + 0.018);
            g.gain.exponentialRampToValueAtTime(P * 0.25, t + 0.06);
            g.gain.exponentialRampToValueAtTime(P * 0.85, t + 0.095);
            g.gain.exponentialRampToValueAtTime(P * 0.2, t + 0.14);
            g.gain.exponentialRampToValueAtTime(P * 0.5, t + 0.165);
            g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
            src.connect(hp); hp.connect(bp); bp.connect(lp); lp.connect(g); g.connect(out);
            src.start(t, rnd(0, 0.4), dur + 0.05);
        }
    };

    /* ---------- Воспроизведение ---------- */
    let armed = false;                      // не играем во время начальной загрузки страницы
    const last = { tick: 0, rustle: 0 };

    function play(kind, { force = false } = {}) {
        if (!force && (!armed || !isOn() || document.hidden)) return;
        const L = level();
        if (!L) return;
        const st = style();
        const real = st === 'needle' ? 'tick' : st === 'sleeve' ? 'rustle' : kind;
        const now = performance.now();
        if (!force && now - last[real] < (real === 'tick' ? 45 : 140)) return;
        last[real] = now;
        try {
            const ctx = getAudioCtx();
            voices[real](ctx, ctx.destination, L);
        } catch (e) { /* аудио недоступно — молча пропускаем */ }
    }

    /* Клики: карточки — шелест (достаём конверт с полки), всё остальное — щелчок */
    document.addEventListener('click', e => {
        const t = e.target;
        if (!(t instanceof Element) || t.closest('[data-no-sound], .nav-btn, #share-card-modal')) return;
        const hit = t.closest(`${CLICK_SEL}, ${CARD_SEL}`);
        if (!hit || hit.disabled) return;
        play(hit.matches(CLICK_SEL) ? 'tick' : 'rustle');
    }, true);

    /* Открытие окон (релиз, игра, редактор…) */
    new MutationObserver(recs => {
        let opened = false;
        for (const r of recs) {
            const el = r.target;
            if (!el.matches || !el.matches(MODAL_SEL)) continue;
            if ((r.oldValue || '').split(/\s+/).includes('hidden') && !el.classList.contains('hidden')) opened = true;
        }
        if (opened && performance.now() - last.rustle > 250) play('rustle');
    }).observe(document.body, { subtree: true, attributes: true, attributeFilter: ['class'], attributeOldValue: true });

    /* Переход между страницами */
    const showPageBase = showPage;
    showPage = function (...args) { const r = showPageBase.apply(this, args); play('rustle'); return r; };

    document.addEventListener('mirvel-ready', () => setTimeout(() => { armed = true; }, 1200), { once: true });

    /* ---------- Настройки ---------- */
    const STYLES = [['both', 'Оба'], ['needle', 'Щелчок иглы'], ['sleeve', 'Шелест конверта']];

    function buildSettings() {
        const card = $('ui-card');
        if (!card || $('snd-box')) return;
        const box = document.createElement('div');
        box.id = 'snd-box';
        box.className = 'space-y-3 pt-4 border-t border-white/5';
        box.innerHTML = `
            <label class="flex items-start gap-3 text-sm text-gray-300 cursor-pointer"><input type="checkbox" id="opt-sounds" class="accent-purple-500 mt-1">
                <span>Звуки интерфейса 🔊<small class="block text-[11px] text-gray-500">Тихий щелчок иглы и шелест конверта при нажатиях и переходах. Всё синтезируется в браузере.</small></span></label>
            <div id="snd-opts" class="space-y-3">
                <div class="hx-seg" id="snd-style">${STYLES.map(([k, l]) => `<button type="button" data-snd-style="${k}">${l}</button>`).join('')}</div>
                <div class="flex items-center gap-3 text-xs text-gray-400">
                    <span class="shrink-0">Громкость</span>
                    <input type="range" id="opt-sound-vol" min="0" max="100" step="5" class="flex-1" aria-label="Громкость звуков интерфейса">
                    <output id="snd-vol-out" class="w-9 text-right font-mono text-gray-300"></output>
                </div>
                <button type="button" id="snd-test" data-no-sound class="text-xs px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition">▶ Проверить звук</button>
            </div>`;
        card.appendChild(box);

        $('opt-sounds').addEventListener('change', e => { data.uiSounds = e.target.checked; save(); if (e.target.checked) play('tick', { force: true }); });
        $('snd-style').addEventListener('click', e => {
            const b = e.target.closest('[data-snd-style]'); if (!b) return;
            data.uiSoundStyle = b.dataset.sndStyle; save(); preview();
        });
        const vol = $('opt-sound-vol');
        vol.addEventListener('input', () => { data.uiSoundVol = Number(vol.value); $('snd-vol-out').textContent = vol.value + '%'; });
        vol.addEventListener('change', () => { save(); preview(); });
        $('snd-test').addEventListener('click', preview);
    }

    function preview() {
        play('tick', { force: true });
        setTimeout(() => play('rustle', { force: true }), style() === 'both' ? 380 : 420);
    }

    function sync() {
        buildSettings();
        if (!$('snd-box')) return;
        $('opt-sounds').checked = isOn();
        $('snd-opts').classList.toggle('opacity-40', !isOn());
        $('snd-style').querySelectorAll('[data-snd-style]').forEach(b => b.classList.toggle('is-on', b.dataset.sndStyle === style()));
        const vol = $('opt-sound-vol'), v = Math.round(volume() * 100);
        if (document.activeElement !== vol) vol.value = v;
        $('snd-vol-out').textContent = v + '%';
    }

    const renderBase = renderAll;
    renderAll = function () { renderBase(); sync(); };

    window.MirvelSounds = { play, preview, voices, level };
    updateUI();
})();
