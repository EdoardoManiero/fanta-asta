export const ROLE_LABELS = { P: 'Portiere', D: 'Difensore', C: 'Centrocampista', A: 'Attaccante' };
export const ROLE_ORDER = ['P', 'D', 'C', 'A'];
export const ROLE_COLORS = {
  P: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  D: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
  C: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  A: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
};
export const ROLE_BAR_COLORS = {
  P: 'bg-amber-500/15 text-amber-300',
  D: 'bg-sky-500/15 text-sky-300',
  C: 'bg-emerald-500/15 text-emerald-300',
  A: 'bg-rose-500/15 text-rose-300',
};

export const FASCIA_ORDER = ['Top', 'Semi-Top', 'Terza', 'Quarta', 'Titolare "Scarso"', 'Scomm.', 'Outsider', 'Non Impostata'];

export function isTarget(player) {
  return /^s[ìi]$/i.test((player.obiettivo || '').trim());
}

export function fasciaRank(f) {
  const i = FASCIA_ORDER.indexOf(f);
  return i === -1 ? FASCIA_ORDER.length : i;
}

export function fmtSecs(ms) {
  if (ms == null) return '--';
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${s}s`;
}

// Max a team could spend on ONE more player of `role` while still being able
// to fill every other required slot with at least 1 credit (the classic
// fantacalcio "reserve" rule already enforced server-side on bids).
export function maxSingleBid(team, config) {
  const totalSlots = ROLE_ORDER.reduce((n, r) => n + config.slots[r], 0);
  const filled = ROLE_ORDER.reduce((n, r) => n + team.roster[r].length, 0);
  const emptySlots = totalSlots - filled;
  if (emptySlots <= 0) return 0;
  return Math.max(0, team.budget - (emptySlots - 1));
}
