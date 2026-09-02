import { useMemo } from 'react';

// Sequential single-hue ramp (blue 600 -> 100), validated against this app's
// dark surface (#0a1f14): monotone lightness, visible step gaps, dark end still
// clears the surface. Each step is paired with the ink that reaches >= 4.5:1 on it,
// so the number stays readable and colour is only a secondary encoding.
const RAMP = [
  { bg: '#184f95', ink: '#ffffff' },
  { bg: '#256abf', ink: '#ffffff' },
  { bg: '#3987e5', ink: '#0b0b0b' },
  { bg: '#6da7ec', ink: '#0b0b0b' },
  { bg: '#9ec5f4', ink: '#0b0b0b' },
  { bg: '#cde2fb', ink: '#0b0b0b' },
];

// higher: is a bigger number better for this stat?
const METRICS_OUTFIELD = [
  { key: 'fmv', label: 'Fantamedia', higher: true },
  { key: 'mv', label: 'Media voto', higher: true },
  { key: 'fmvExp', label: 'FM attesa', higher: true },
  { key: 'gol', label: 'Gol', higher: true },
  { key: 'assist', label: 'Assist', higher: true },
  { key: 'presenze', label: 'Presenze', higher: true },
  { key: 'minuti', label: 'Minuti', higher: true },
  { key: 'puntiTitolare', label: 'Da titolare', higher: true },
  { key: 'rigSegnati', label: 'Rig. segnati', higher: true },
  { key: 'ammonizioni', label: 'Ammonizioni', higher: false },
  { key: 'espulsioni', label: 'Espulsioni', higher: false },
];

const METRICS_GK = [
  { key: 'fmv', label: 'Fantamedia', higher: true },
  { key: 'mv', label: 'Media voto', higher: true },
  { key: 'fmvExp', label: 'FM attesa', higher: true },
  { key: 'presenze', label: 'Presenze', higher: true },
  { key: 'minuti', label: 'Minuti', higher: true },
  { key: 'puntiTitolare', label: 'Da titolare', higher: true },
  { key: 'rigParati', label: 'Rig. parati', higher: true },
  { key: 'golSubiti', label: 'Gol subiti', higher: false },
  { key: 'ammonizioni', label: 'Ammonizioni', higher: false },
  { key: 'espulsioni', label: 'Espulsioni', higher: false },
];

// Which stats the heat map already ranks, so callers can show only the rest
// instead of printing the same numbers twice.
export const heatmapKeys = (ruolo) => (ruolo === 'P' ? METRICS_GK : METRICS_OUTFIELD).map((m) => m.key);

function percentile(values, value, higherIsBetter) {
  if (values.length === 0) return null;
  const better = values.filter((v) => (higherIsBetter ? v < value : v > value)).length;
  const equal = values.filter((v) => v === value).length;
  // midrank, so ties don't all sit at the top of their band
  return ((better + equal / 2) / values.length) * 100;
}

export default function StatHeatmap({ player, players }) {
  const metrics = player.ruolo === 'P' ? METRICS_GK : METRICS_OUTFIELD;

  const cells = useMemo(() => {
    // Compare only against peers of the same role who actually played, so the
    // scale isn't dragged down by the many 0-presence squad fillers.
    const peers = players.filter((p) => p.ruolo === player.ruolo && (p.presenze || 0) > 0);
    return metrics.map((m) => {
      const value = player[m.key] ?? 0;
      const values = peers.map((p) => p[m.key] ?? 0);
      const pct = percentile(values, value, m.higher);
      return { ...m, value, pct };
    });
  }, [player, players, metrics]);

  if (!player.presenze) {
    return (
      <div className="text-sm text-emerald-200/40">
        Nessun dato della stagione scorsa per questo giocatore (0 presenze).
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
        {cells.map((c) => {
          const idx = c.pct == null ? 0 : Math.min(RAMP.length - 1, Math.floor((c.pct / 100) * RAMP.length));
          const step = RAMP[idx];
          return (
            <div
              key={c.key}
              style={{ backgroundColor: step.bg, color: step.ink }}
              className="rounded-lg px-2.5 py-1.5"
              title={`${c.label}: ${c.value} — meglio del ${Math.round(c.pct)}% dei ${player.ruolo} con almeno 1 presenza`}
            >
              <div className="text-[10px] uppercase tracking-wide opacity-80 truncate">{c.label}</div>
              <div className="flex items-baseline justify-between gap-1">
                <span className="text-sm font-bold font-mono">{c.value}</span>
                <span className="text-[10px] font-mono opacity-80">{Math.round(c.pct)}°</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-2 mt-2 text-[10px] text-emerald-200/40">
        <span>peggiore</span>
        <div className="flex rounded overflow-hidden">
          {RAMP.map((s) => (
            <span key={s.bg} style={{ backgroundColor: s.bg }} className="w-5 h-2.5" />
          ))}
        </div>
        <span>migliore</span>
        <span className="ml-1">— percentile nel ruolo (il numero grande è il valore reale)</span>
      </div>
    </div>
  );
}
