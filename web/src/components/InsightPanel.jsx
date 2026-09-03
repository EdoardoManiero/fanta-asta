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
    <div className="panel p-4">
      <div className="label">Nota</div>
      <div className="mt-2">
        {insight ? (
          <p className="text-base text-ink">
            <span className="font-semibold">{player.nome}</span> è il{' '}
            <span className="num font-semibold">{insight.ord}</span> {insight.roleLabel} per{' '}
            {insight.statLabel} (<span className="num font-semibold">{insight.val}</span>).
          </p>
        ) : (
          <p className="text-sm text-ink-3">
            {player
              ? 'Nessuna statistica rilevante per questo giocatore.'
              : 'In attesa del prossimo giocatore all’asta.'}
          </p>
        )}
      </div>
    </div>
  );
}
