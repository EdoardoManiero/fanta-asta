import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STATE_DIR = process.env.STATE_DIR || path.join(__dirname, 'data');
const STATE_FILE = path.join(STATE_DIR, 'auction-state.json');

export function loadState() {
  try {
    const raw = fs.readFileSync(STATE_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

let saveTimer = null;
export function saveState(state) {
  // debounce writes so rapid-fire events (e.g. bid spam) don't hammer disk
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      fs.mkdirSync(STATE_DIR, { recursive: true });
      fs.writeFileSync(STATE_FILE, JSON.stringify(state), 'utf-8');
    } catch (err) {
      console.error('Failed to persist state', err);
    }
  }, 150);
}

export function loadPlayers() {
  const raw = fs.readFileSync(path.join(__dirname, 'data', 'players.json'), 'utf-8');
  return JSON.parse(raw);
}
