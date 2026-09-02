import { useMemo } from 'react';
import { ROLE_LABELS } from '../format.js';

const METRICS = [
  { key: 'gol', label: 'gol' },
  { key: 'assist', label: 'assist' },
  { key: 'fmv', label: 'FMV' },
  { key: 'presenze', label: 'presenze' },
];

function computeInsight(players, player) {
  const peers = players.filter((p) => p.ruolo === player.ruolo);
  let best = null;
  for (const m of METRICS) {
    const val = player[m.key];
    if (!val) continue;
    const rank = peers.filter((p) => (p[m.key] || 0) > val).length + 1;
    if (rank <= 15 && (!best || rank < best.rank)) best = { ...m, rank, val };
  }
  if (!best) return null;
  return {
    ord: best.rank === 1 ? '1°' : `${best.rank}°`,
    roleLabel: ROLE_LABELS[player.ruolo].toLowerCase(),
    statLabel: best.label,
    val: best.val,
  };
}

export default function InsightPanel({ state }) {
  const ca = state.currentAuction;
  const player = ca ? state.players.find((p) => p.id === ca.playerId) : null;

  const insight = useMemo(() => {
    if (!player) return null;
    return computeInsight(state.players, player);
  }, [player, state.players]);

  return (
    <div className="rounded-xl border border-emerald-900 bg-pitch-900/50 p-5 flex items-center justify-center text-center h-full">
      {insight ? (
        <p className="text-emerald-100 text-lg leading-snug">
          <span className="text-amber-300 font-bold">{player.nome}</span> è il {insight.ord}{' '}
          {insight.roleLabel} per {insight.statLabel} (
          <span className="text-emerald-300 font-semibold">{insight.val}</span>).
        </p>
      ) : (
        <p className="text-emerald-200/40 text-sm">
          {player ? "Nessuna statistica rilevante per questo giocatore." : 'In attesa del prossimo giocatore all\'asta...'}
        </p>
      )}
    </div>
  );
}
