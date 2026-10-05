/* =========================================================
   MIRVEL HUB — 26-steam.js
   Подтягивает библиотеку Steam из data/steam-games.json (его раз в сутки обновляет
   GitHub Action .github/workflows/steam-sync.yml) и добавляет новые игры в раздел «Игры».

   Правила:
   • новая игра добавляется один раз; если вы её удалили — обратно не вернётся;
   • игры, которые вы уже вносили вручную с платформой Steam, не дублируются — к ним просто
     привязывается Steam и обновляются часы;
   • ваши правки (оценка, статус, заметки, обложка) синхронизация не перезаписывает;
   • часы наигранного обновляются, только если в Steam их стало больше.
   ========================================================= */
(() => {
    'use strict';
    const FILE = 'data/steam-games.json';
    const cover = app => `https://cdn.cloudflare.steamstatic.com/steam/apps/${app}/header.jpg`;
    const norm = s => String(s || '').toLowerCase().replace(/[™®©:’'"\-–—\s]+/g, ' ').trim();
    const toast = (m, t) => { try { showToast(m, t); } catch (_) {} };
    let running = false;

    async function loadList() {
        const r = await fetch(`${FILE}?t=${Date.now()}`, { cache: 'no-store' });
        if (!r.ok) throw new Error(r.status === 404 ? 'нет файла' : `HTTP ${r.status}`);
        const j = await r.json();
        if (!j || !Array.isArray(j.games)) throw new Error('неверный формат файла');
        return j;
    }

    function merge(list) {
        if (!Array.isArray(data.games)) data.games = [];
        const seen = new Set((data.steamSeen || []).map(Number));
        const byApp = new Map();
        const byTitle = new Map();
        data.games.forEach(g => {
            if (g.steamAppId) byApp.set(Number(g.steamAppId), g);
            else if (g.platform === 'Steam') byTitle.set(norm(g.title), g);
        });

        const base = Date.now();
        let added = 0, linked = 0, hoursUp = 0;
        for (const sg of list.games) {
            const app = Number(sg.appid);
            if (!app) continue;
            const hours = Math.round((Number(sg.playtime_forever) || 0) / 6) / 10;   // минуты → часы, до 0.1
            let g = byApp.get(app);
            if (!g) {
                const m = byTitle.get(norm(sg.name));
                if (m) { m.steamAppId = app; byTitle.delete(norm(sg.name)); byApp.set(app, m); g = m; linked++; }
            }
            if (g) {
                if (hours > (Number(g.hours) || 0)) { g.hours = hours; hoursUp++; }
                seen.add(app);
                continue;
            }
            if (seen.has(app)) continue;     // уже импортировалась раньше и была удалена — не возвращаем
            data.games.push({
                id: base + added,
                platform: 'Steam',
                title: sg.name || `Steam #${app}`,
                developer: '', publisher: '', year: '', price: 0,
                condition: '', edition: '', region: '',
                url: `https://store.steampowered.com/app/${app}/`,
                rating: 0, digital: true, hours,
                img: cover(app),
                steamAppId: app, source: 'steam', note: ''
            });
            seen.add(app);
            added++;
        }
        data.steamSeen = [...seen];
        data.steamSync = { at: list.updated || '', count: list.games.length };
        return { added, linked, hoursUp };
    }

    async function sync({ manual = false } = {}) {
        if (running) return;
        running = true;
        try {
            const list = await loadList();
            if (!manual && data.steamSync && data.steamSync.at && data.steamSync.at === list.updated) return;   // ничего нового
            const r = merge(list);
            if (r.added || r.linked || r.hoursUp || manual) save();
            if (r.added) toast(`Steam: добавлено игр — ${r.added} 🎮`, 'success');
            else if (manual) toast(r.hoursUp || r.linked ? 'Steam: данные обновлены' : 'Steam: новых игр нет', 'info');
        } catch (e) {
            if (manual) toast(`Steam: не удалось получить список (${e.message}). Проверьте, что GitHub Action уже запускался.`, 'error');
            else console.info('[MIRVEL] Steam-синхронизация пропущена:', e.message);
        } finally {
            running = false;
        }
    }

    function addButton() {
        if (document.getElementById('steam-sync-btn')) return;
        const anchor = document.getElementById('game-view-btn');
        if (!anchor) return;
        const b = document.createElement('button');
        b.id = 'steam-sync-btn';
        b.type = 'button';
        b.title = 'Подтянуть игры из Steam';
        b.className = anchor.className;
        b.textContent = '♨ Steam';
        b.onclick = () => sync({ manual: true });
        anchor.insertAdjacentElement('beforebegin', b);
    }

    function start() { addButton(); sync(); }
    document.addEventListener('mirvel-ready', start, { once: true });
    window.MirvelSteam = { sync: () => sync({ manual: true }) };
})();
