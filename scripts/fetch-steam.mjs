// Скачивает список игр из Steam и сохраняет в data/steam-games.json.
// Запускается GitHub Action'ом (ключ и ID берутся из Secrets репозитория).
import { mkdir, readFile, writeFile } from 'node:fs/promises';

const key = (process.env.STEAM_API_KEY || '').trim();
let id = (process.env.STEAM_ID || '').trim();
if (!key || !id) {
    console.error('Не заданы секреты STEAM_API_KEY и/или STEAM_ID (Settings → Secrets and variables → Actions).');
    process.exit(1);
}

async function api(url) {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`Steam API ответил HTTP ${r.status}` + (r.status === 403 ? ' — проверьте API-ключ' : ''));
    return r.json();
}

// Можно указать не только SteamID64 (17 цифр), но и «короткое имя» из ссылки профиля
if (!/^\d{17}$/.test(id)) {
    const v = await api(`https://api.steampowered.com/ISteamUser/ResolveVanityURL/v1/?key=${key}&vanityurl=${encodeURIComponent(id)}`);
    if (v.response?.success !== 1) {
        console.error(`Не нашёл профиль «${id}». Укажите SteamID64 (17 цифр) — его можно узнать на steamid.io`);
        process.exit(1);
    }
    id = v.response.steamid;
}

const j = await api(`https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?key=${key}&steamid=${id}&include_appinfo=1&include_played_free_games=1&format=json`);
const list = j.response?.games;
if (!Array.isArray(list)) {
    console.error('Steam вернул пустой ответ. Откройте профиль в Steam → Настройки приватности → «Сведения об играх» = Публичные.');
    process.exit(1);
}

const games = list
    .map(g => ({ appid: g.appid, name: g.name || `App ${g.appid}`, playtime_forever: g.playtime_forever || 0 }))
    .sort((a, b) => a.name.localeCompare(b.name, 'en') || a.appid - b.appid);

const path = 'data/steam-games.json';
let prev = null;
try { prev = JSON.parse(await readFile(path, 'utf8')); } catch { /* файла ещё нет */ }

// Если ничего не изменилось — файл не трогаем, чтобы не плодить пустые коммиты
if (prev && JSON.stringify(prev.games) === JSON.stringify(games)) {
    console.log(`Без изменений (${games.length} игр).`);
    process.exit(0);
}

await mkdir('data', { recursive: true });
await writeFile(path, JSON.stringify({ updated: new Date().toISOString(), count: games.length, games }, null, 1) + '\n');
console.log(`Сохранено игр: ${games.length}`);
