function createCrackleBuffer(ctx, density = 0.00018, crackleAmp = 0.22) {
    const sampleRate = ctx.sampleRate;
    const bufferSize = sampleRate * 2.5;
    const buffer = ctx.createBuffer(1, bufferSize, sampleRate);
    const dataArr = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
        let rand = Math.random() * 2 - 1;
        dataArr[i] = rand * 0.008;

        if (Math.random() < density) {
            dataArr[i] += (Math.random() > 0.5 ? 1 : -1) * crackleAmp;
        }
    }
    return buffer;
}

function initCozyAudio() {
    getAudioCtx();

    stopCozyAudio();

    const mode = data.cozyAtmosphereMode || 'vinyl';

    if (mode === 'vinyl' || mode === 'vinyl_pure' || mode === 'vinyl_old') {
        const crackleSource = audioCtx.createBufferSource();
        let density = mode === 'vinyl_old' ? 0.00045 : 0.00018;
        let crackleVol = mode === 'vinyl_old' ? 0.35 : 0.22;

        crackleSource.buffer = createCrackleBuffer(audioCtx, density, crackleVol);
        crackleSource.loop = true;

        const crackleGain = audioCtx.createGain();
        const crackleFilter = audioCtx.createBiquadFilter();

        if (mode === 'vinyl_old') {
            crackleFilter.type = 'bandpass';
            crackleFilter.frequency.value = 1000;
            crackleFilter.Q.value = 1.0;
        } else {
            crackleFilter.type = 'lowpass';
            crackleFilter.frequency.value = 1200;
        }

        crackleSource.connect(crackleFilter);
        crackleFilter.connect(crackleGain);
        crackleGain.connect(audioCtx.destination);
        crackleGain.gain.setValueAtTime(mode === 'vinyl_old' ? 0.22 : 0.18, audioCtx.currentTime);

        crackleSource.start(0);
        cozyNodes.push(crackleSource);

        if (mode === 'vinyl') {
            const humOsc1 = audioCtx.createOscillator();
            humOsc1.type = 'sine';
            humOsc1.frequency.value = 50;

            const humOsc2 = audioCtx.createOscillator();
            humOsc2.type = 'sine';
            humOsc2.frequency.value = 100;

            const humGain = audioCtx.createGain();
            const humLP = audioCtx.createBiquadFilter();
            humLP.type = 'lowpass';
            humLP.frequency.value = 75;

            humOsc1.connect(humLP);
            humOsc2.connect(humLP);
            humLP.connect(humGain);
            humGain.connect(audioCtx.destination);
            humGain.gain.setValueAtTime(0.015, audioCtx.currentTime);

            humOsc1.start(0);
            humOsc2.start(0);
            cozyNodes.push(humOsc1, humOsc2);
        }

    } else if (mode === 'rain') {
        const bufferSize = audioCtx.sampleRate * 2;
        const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }

        const noiseSource = audioCtx.createBufferSource();
        noiseSource.buffer = noiseBuffer;
        noiseSource.loop = true;

        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(450, audioCtx.currentTime);
        filter.Q.setValueAtTime(1, audioCtx.currentTime);

        const rainGain = audioCtx.createGain();
        rainGain.gain.setValueAtTime(0.25, audioCtx.currentTime);

        noiseSource.connect(filter);
        filter.connect(rainGain);
        rainGain.connect(audioCtx.destination);

        noiseSource.start(0);
        cozyNodes.push(noiseSource);

        const lfo = audioCtx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.setValueAtTime(0.08, audioCtx.currentTime);

        const lfoGain = audioCtx.createGain();
        lfoGain.gain.setValueAtTime(180, audioCtx.currentTime);

        lfo.connect(lfoGain);
        lfoGain.connect(filter.frequency);

        lfo.start(0);
        cozyNodes.push(lfo);

    } else if (mode === 'space') {
        const osc1 = audioCtx.createOscillator();
        osc1.type = 'sawtooth';
        osc1.frequency.setValueAtTime(55, audioCtx.currentTime);

        const osc2 = audioCtx.createOscillator();
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(55.4, audioCtx.currentTime);

        const osc3 = audioCtx.createOscillator();
        osc3.type = 'sine';
        osc3.frequency.setValueAtTime(110, audioCtx.currentTime);

        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(90, audioCtx.currentTime);

        const spaceGain = audioCtx.createGain();
        spaceGain.gain.setValueAtTime(0.08, audioCtx.currentTime);

        osc1.connect(filter);
        osc2.connect(filter);
        osc3.connect(filter);
        filter.connect(spaceGain);
        spaceGain.connect(audioCtx.destination);

        osc1.start(0);
        osc2.start(0);
        osc3.start(0);
        cozyNodes.push(osc1, osc2, osc3);

        const sweepLfo = audioCtx.createOscillator();
        sweepLfo.type = 'sine';
        sweepLfo.frequency.setValueAtTime(0.05, audioCtx.currentTime);

        const sweepGain = audioCtx.createGain();
        sweepGain.gain.setValueAtTime(35, audioCtx.currentTime);

        sweepLfo.connect(sweepGain);
        sweepGain.connect(filter.frequency);

        sweepLfo.start(0);
        cozyNodes.push(sweepLfo);

    } else if (mode === 'tape') {
        const bufferSize = audioCtx.sampleRate * 2;
        const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }

        const hissSource = audioCtx.createBufferSource();
        hissSource.buffer = noiseBuffer;
        hissSource.loop = true;

        const filter = audioCtx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(5500, audioCtx.currentTime);
        filter.Q.setValueAtTime(0.7, audioCtx.currentTime);

        const hissGain = audioCtx.createGain();
        hissGain.gain.setValueAtTime(0.04, audioCtx.currentTime);

        hissSource.connect(filter);
        filter.connect(hissGain);
        hissGain.connect(audioCtx.destination);

        hissSource.start(0);
        cozyNodes.push(hissSource);

        const flutterLfo = audioCtx.createOscillator();
        flutterLfo.type = 'sine';
        flutterLfo.frequency.setValueAtTime(6, audioCtx.currentTime);

        const flutterGain = audioCtx.createGain();
        flutterGain.gain.setValueAtTime(0.006, audioCtx.currentTime);

        flutterLfo.connect(flutterGain);
        flutterGain.connect(hissGain.gain);

        flutterLfo.start(0);
        cozyNodes.push(flutterLfo);

        const hum = audioCtx.createOscillator();
        hum.type = 'sine';
        hum.frequency.setValueAtTime(60, audioCtx.currentTime);

        const humGainNode = audioCtx.createGain();
        humGainNode.gain.setValueAtTime(0.008, audioCtx.currentTime);

        hum.connect(humGainNode);
        humGainNode.connect(audioCtx.destination);

        hum.start(0);
        cozyNodes.push(hum);
    }
}

function setAtmosphereMode(mode) {
    data.cozyAtmosphereMode = mode;
    save();
    if (isSoundPlaying) {
        initCozyAudio();
    }
    updateUI();
    showToast(`Атмосфера проигрывателя изменена: <strong>${getAtmosphereName(mode)}</strong>!`);
}

function getAtmosphereName(mode) {
    if (mode === 'vinyl') return 'Виниловый треск (+Гул) 💽';
    if (mode === 'vinyl_pure') return 'Винил (Без баса) ✨';
    if (mode === 'vinyl_old') return 'Ретро патефон (78s) 📻';
    if (mode === 'rain') return 'Летний дождь 🌧️';
    if (mode === 'space') return 'Космический гул 🌌';
    if (mode === 'tape') return 'Кассетный шум 📻';
    return 'Виниловый треск 💽';
}

function toggleCozyAtmosphere() {
    const btn = document.getElementById('cozy-turntable-deck');
    const plate = document.getElementById('turntable-vinyl-plate');
    const arm = document.getElementById('turntable-tonearm');
    const statusText = document.getElementById('mini-player-status');

    if (isSoundPlaying) {
        stopCozyAudio();
        isSoundPlaying = false;
        plate.classList.remove('spin-slow');
        arm.classList.remove('tonearm-active');
        if (statusText) statusText.innerText = 'Выключено';
        showToast("Ламповая атмосфера выключена 🔇");
    } else {
        try {
            initCozyAudio();
            isSoundPlaying = true;
            plate.classList.add('spin-slow');
            arm.classList.add('tonearm-active');
            if (statusText) statusText.innerText = getAtmosphereName(data.cozyAtmosphereMode).split(' ')[0];
            showToast(`Атмосфера «${getAtmosphereName(data.cozyAtmosphereMode)}» запущена! 🌧️🎧`);
        } catch(e) {
            console.error('AudioContext error:', e);
            showToast("Нажмите еще раз для активации звука.");
        }
    }
}

function stopCozyAudio() {
    cozyNodes.forEach(node => {
        try { node.stop(); } catch(e){}
        try { node.disconnect(); } catch(e){}
    });
    cozyNodes = [];
}
