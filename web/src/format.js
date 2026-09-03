export const ROLE_LABELS = { P: 'Portiere', D: 'Difensore', C: 'Centrocampista', A: 'Attaccante' };
export const ROLE_ORDER = ['P', 'D', 'C', 'A'];
// Roles are categorical data, so they get a categorical palette — but always
// as an OUTLINED chip, never a fill, so a role marker can never be mistaken
// for the filled primary action.
export const ROLE_COLORS = {
  P: 'border-role-P text-role-P',
  D: 'border-role-D text-role-D',
  C: 'border-role-C text-role-C',
  A: 'border-role-A text-role-A',
};
export const ROLE_BAR_COLORS = {
  P: 'text-role-P',
  D: 'text-role-D',
  C: 'text-role-C',
  A: 'text-role-A',
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
