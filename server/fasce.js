import * as XLSX from 'xlsx';

const ROLE_SHEETS = new Set(['P', 'D', 'C', 'A']);

const HEADER_SYNONYMS = {
  ruolo: ['ruolo'],
  nome: ['nome', 'giocatore'],
  squadra: ['team', 'squadra'],
  fascia: ['fascia'],
};

function normalizeName(s) {
  return (s || '')
    .toString()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip accents
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function findColumns(headerRow) {
  const cols = {};
  headerRow.forEach((cell, i) => {
    const norm = (cell || '').toString().trim().toLowerCase();
    for (const [key, synonyms] of Object.entries(HEADER_SYNONYMS)) {
      if (synonyms.includes(norm) && cols[key] === undefined) cols[key] = i;
    }
  });
  return cols;
}

// Parses an uploaded workbook that follows the same shape as the source
// spreadsheet (one sheet per role, or a single sheet with a Ruolo column) and
// returns raw {ruolo, nome, squadra, fascia} rows - no matching to players yet.
export function parseFasceWorkbook(buffer) {
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const rows = [];
  for (const sheetName of wb.SheetNames) {
    const sheet = wb.Sheets[sheetName];
    const grid = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    if (grid.length < 2) continue;
    const cols = findColumns(grid[0]);
    if (cols.nome === undefined || cols.fascia === undefined) continue;
    const sheetRole = ROLE_SHEETS.has(sheetName.trim().toUpperCase()) ? sheetName.trim().toUpperCase() : null;

    for (const row of grid.slice(1)) {
      const nome = row[cols.nome];
      const fascia = row[cols.fascia];
      if (!nome || !fascia) continue;
      const ruolo = cols.ruolo !== undefined ? (row[cols.ruolo] || '').toString().trim().toUpperCase() : sheetRole;
      if (!ruolo || !ROLE_SHEETS.has(ruolo)) continue;
      rows.push({
        ruolo,
        nome: nome.toString().trim(),
        squadra: cols.squadra !== undefined ? (row[cols.squadra] || '').toString().trim() : '',
        fascia: fascia.toString().trim(),
      });
    }
  }
  return rows;
}

// Matches parsed rows against the existing player pool by role + normalized
// name (squadra breaks ties when a name is ambiguous within a role).
export function matchFasceToPlayers(rows, players) {
  const byKey = new Map();
  for (const p of players) {
    const key = `${p.ruolo}|${normalizeName(p.nome)}`;
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key).push(p);
  }

  const values = {};
  const unmatched = [];
  let ambiguous = 0;

  for (const row of rows) {
    const key = `${row.ruolo}|${normalizeName(row.nome)}`;
    const candidates = byKey.get(key);
    if (!candidates || candidates.length === 0) {
      unmatched.push(`${row.nome} (${row.ruolo})`);
      continue;
    }
    let player = candidates[0];
    if (candidates.length > 1 && row.squadra) {
      const bySquadra = candidates.find(
        (c) => normalizeName(c.squadra) === normalizeName(row.squadra)
      );
      if (bySquadra) player = bySquadra;
      else ambiguous++;
    } else if (candidates.length > 1) {
      ambiguous++;
    }
    values[player.id] = row.fascia;
  }

  return {
    values,
    matchedCount: Object.keys(values).length,
    unmatchedCount: unmatched.length,
    unmatchedSample: unmatched.slice(0, 20),
    ambiguousCount: ambiguous,
  };
}
