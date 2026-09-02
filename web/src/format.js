export const ROLE_LABELS = { P: 'Portiere', D: 'Difensore', C: 'Centrocampista', A: 'Attaccante' };
export const ROLE_ORDER = ['P', 'D', 'C', 'A'];
export const ROLE_COLORS = {
  P: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  D: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
  C: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  A: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
};

export function fmtSecs(ms) {
  if (ms == null) return '--';
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${s}s`;
}
