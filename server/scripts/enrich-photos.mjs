// One-off enrichment: attaches a `photoUrl` to each player in
// server/data/players.json by matching them against Wikipedia (it.wikipedia.org).
// Only uses Wikipedia's public search + REST summary APIs (CC-licensed images,
// meant for exactly this kind of reuse) - no scraping of unauthorized sources.
// Re-run any time with: node server/scripts/enrich-photos.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PLAYERS_PATH = path.join(__dirname, '..', 'data', 'players.json');

const SQUADRE = {
  ATA: 'Atalanta', BOL: 'Bologna', CAG: 'Cagliari', COM: 'Como', FIO: 'Fiorentina',
  FRO: 'Frosinone', GEN: 'Genoa', INT: 'Inter', JUV: 'Juventus', LAZ: 'Lazio',
  LEC: 'Lecce', MIL: 'Milan', MON: 'Monza', NAP: 'Napoli', PAR: 'Parma',
  ROM: 'Roma', SAS: 'Sassuolo', TOR: 'Torino', UDI: 'Udinese', VEN: 'Venezia',
};

const UA = 'AstaClassicFantacalcioAuctionTool/1.0 (personal non-commercial single-run script)';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function norm(s) {
  return (s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/'/g, '')
    .toLowerCase();
}

async function fetchJsonWithRetry(url, tries = 4) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
      const text = await res.text();
      if (text.includes('too many requests')) {
        await sleep(4000 * (i + 1));
        continue;
      }
      if (!res.ok) {
        await sleep(2000 * (i + 1));
        continue;
      }
      try {
        return JSON.parse(text);
      } catch {
        await sleep(2000 * (i + 1));
      }
    } catch {
      await sleep(1500 * (i + 1));
    }
  }
  return null;
}

async function wikiSearch(q) {
  const url = `https://it.wikipedia.org/w/api.php?action=query&list=search&format=json&srlimit=5&srsearch=${encodeURIComponent(q)}`;
  const data = await fetchJsonWithRetry(url);
  return (data?.query?.search || []).map((r) => r.title);
}

async function wikiSummary(title) {
  const url = `https://it.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
  return fetchJsonWithRetry(url);
}

// "Martinez Jo." -> surname "Martinez", abbrev "jo" (used only to disambiguate
// same-surname candidates by first-name initial, never sent in the query itself
// since truncated fragments confuse Wikipedia's search ranking).
function splitNameAbbrev(nome) {
  const tokens = nome.trim().split(/\s+/);
  const abbrevTokens = [];
  let i = tokens.length - 1;
  while (i > 0 && /^[A-ZÀ-Ý]\.?$/.test(tokens[i])) {
    abbrevTokens.unshift(tokens[i].replace('.', ''));
    i--;
  }
  const surnameTokens = tokens.slice(0, i + 1);
  return { surname: surnameTokens.join(' '), abbrev: abbrevTokens.join('').toLowerCase() };
}

async function findPhoto(player) {
  const { surname, abbrev } = splitNameAbbrev(player.nome);
  const surnameTokensNorm = norm(surname).split(/[^a-z]+/).filter(Boolean);
  const squadra = SQUADRE[player.squadra] || player.squadra;
  const squadraNorm = norm(squadra);

  const titles = await wikiSearch(`${surname} calciatore ${squadra}`);
  await sleep(400);

  for (const title of titles) {
    const titleTokens = norm(title).replace(/\(.*?\)/g, '').split(/[^a-z]+/).filter(Boolean);
    if (!surnameTokensNorm.every((t) => titleTokens.includes(t))) continue;
    if (abbrev) {
      const leading = titleTokens.filter((t) => !surnameTokensNorm.includes(t));
      if (!leading.some((t) => t.startsWith(abbrev[0]))) continue;
    }

    const summary = await wikiSummary(title);
    await sleep(400);
    if (!summary) continue;

    const text = norm(`${summary.description || ''} ${summary.extract || ''}`);
    // Require BOTH "footballer" and the player's own club in the text - without
    // the club check, a same-name-fragment but wrong player (different club/sport)
    // can slip through once the real match is skipped for lacking a photo.
    if (!text.includes('calciatore')) continue;
    if (!text.includes(squadraNorm)) continue;
    if (!summary.thumbnail?.source) continue;
    return summary.thumbnail.source;
  }
  return null;
}

async function runPass(players, onlyMissing) {
  let matched = 0;
  let attempted = 0;
  for (let i = 0; i < players.length; i++) {
    const p = players[i];
    if (onlyMissing && p.photoUrl) continue;
    attempted++;
    try {
      const photo = await findPhoto(p);
      if (photo) {
        p.photoUrl = photo;
        matched++;
      } else if (!onlyMissing) {
        p.photoUrl = null;
      }
    } catch (err) {
      if (!onlyMissing) p.photoUrl = null;
      console.error(`Error on ${p.nome}:`, err.message);
    }
    await sleep(200);
    if (attempted % 25 === 0) {
      console.log(`  ${attempted} processed this pass, ${matched} newly matched so far`);
    }
  }
  return matched;
}

async function main() {
  const players = JSON.parse(fs.readFileSync(PLAYERS_PATH, 'utf-8'));

  console.log(`Pass 1: ${players.length} players...`);
  const m1 = await runPass(players, false);
  fs.writeFileSync(PLAYERS_PATH, JSON.stringify(players), 'utf-8');
  console.log(`Pass 1 done: ${m1} matched.`);

  const missing = players.filter((p) => !p.photoUrl).length;
  console.log(`Pass 2 (retry): ${missing} players still missing a photo...`);
  const m2 = await runPass(players, true);
  fs.writeFileSync(PLAYERS_PATH, JSON.stringify(players), 'utf-8');
  console.log(`Pass 2 done: ${m2} newly matched.`);

  const total = players.filter((p) => p.photoUrl).length;
  console.log(`Final: ${total}/${players.length} players have a photo (${Math.round((total / players.length) * 100)}%).`);
}

main();
