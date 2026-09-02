import RoleBadge from './RoleBadge.jsx';
import { ROLE_ORDER } from '../format.js';

export default function TeamsBoard({ state, myTeamId }) {
  const teams = Object.values(state.teams).sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {teams.map((t) => {
        const totalSlots = ROLE_ORDER.reduce((n, r) => n + state.config.slots[r], 0);
        const filled = ROLE_ORDER.reduce((n, r) => n + t.roster[r].length, 0);
        return (
          <div
            key={t.id}
            className={`rounded-xl border p-4 bg-pitch-900/50 ${
              t.id === myTeamId ? 'border-emerald-400' : 'border-emerald-900'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="font-semibold flex items-center gap-2">
                {t.name}
                {!t.connected && <span className="w-1.5 h-1.5 rounded-full bg-emerald-900" title="offline" />}
                {t.connected && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title="online" />}
              </div>
              <div className="text-sm font-mono text-emerald-300">{t.budget} cr.</div>
            </div>
            <div className="text-xs text-emerald-200/50 mb-2">{filled}/{totalSlots} giocatori</div>
            <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
              {ROLE_ORDER.flatMap((r) =>
                t.roster[r].map((p) => (
                  <div key={p.playerId} className="flex items-center gap-2 text-sm">
                    <RoleBadge role={r} />
                    <span className="flex-1 truncate">{p.name}</span>
                    <span className="font-mono text-emerald-300/80">{p.price}</span>
                  </div>
                ))
              )}
              {filled === 0 && <div className="text-emerald-200/30 text-sm">Rosa vuota</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
