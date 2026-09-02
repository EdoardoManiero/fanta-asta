import { useState } from 'react';
import { ROLE_ORDER, ROLE_BAR_COLORS, maxSingleBid } from '../format.js';

export default function BoardTab({ state, myTeamId }) {
  const [open, setOpen] = useState({ P: true, D: true, C: true, A: true });
  const teams = Object.values(state.teams).sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));

  return (
    <div className="overflow-x-auto rounded-xl border border-emerald-900">
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${teams.length}, minmax(180px, 1fr))`, minWidth: teams.length * 180 }}>
        {teams.map((t) => {
          const totalSlots = ROLE_ORDER.reduce((n, r) => n + state.config.slots[r], 0);
          const filled = ROLE_ORDER.reduce((n, r) => n + t.roster[r].length, 0);
          return (
            <div
              key={t.id}
              className={`border-b border-l border-emerald-900/60 first:border-l-0 p-3 bg-pitch-900/50 ${
                t.id === myTeamId ? 'ring-1 ring-inset ring-emerald-400' : ''
              }`}
            >
              <div className="flex items-center gap-1.5 text-sm font-semibold mb-1">
                <span className={`w-1.5 h-1.5 rounded-full ${t.connected ? 'bg-emerald-400' : 'bg-emerald-900'}`} />
                <span className="truncate">{t.name}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-emerald-200/50 mb-1">
                <span>{filled}/{totalSlots}</span>
                <span className="font-mono text-emerald-300">{t.budget} cr.</span>
              </div>
              <div className="text-[11px] text-emerald-200/40 mb-2">
                max singola offerta: <span className="text-emerald-200/70 font-mono">{maxSingleBid(t, state.config)}</span>
              </div>
              <div className="flex gap-2 text-xs font-mono text-emerald-200/60">
                {ROLE_ORDER.map((r) => (
                  <span key={r}>{t.roster[r].length}/{state.config.slots[r]}</span>
                ))}
              </div>
            </div>
          );
        })}

        {ROLE_ORDER.map((role) => {
          const totalForRole = teams.length * state.config.slots[role];
          const filledForRole = teams.reduce((n, t) => n + t.roster[role].length, 0);
          const pct = totalForRole ? Math.round((filledForRole / totalForRole) * 100) : 0;
          return (
            <div key={role} style={{ gridColumn: '1 / -1' }} className="contents">
              <button
                onClick={() => setOpen((o) => ({ ...o, [role]: !o[role] }))}
                style={{ gridColumn: '1 / -1' }}
                className={`flex items-center justify-between px-3 py-1.5 text-xs font-bold border-b border-t border-emerald-900/60 ${ROLE_BAR_COLORS[role]}`}
              >
                <span>{role} · {pct}%</span>
                <span>{open[role] ? '▾' : '▸'}</span>
              </button>
              {open[role] &&
                Array.from({ length: state.config.slots[role] }).map((_, i) => (
                  <div key={i} style={{ display: 'contents' }}>
                    {teams.map((t) => {
                      const p = t.roster[role][i];
                      return (
                        <div
                          key={t.id}
                          className="border-b border-l border-emerald-900/40 first:border-l-0 px-3 py-1.5 text-sm min-h-[32px] flex items-center justify-between"
                        >
                          {p ? (
                            <>
                              <span className="truncate">{p.name}</span>
                              <span className="font-mono text-emerald-300/70 text-xs">{p.price}</span>
                            </>
                          ) : (
                            <span className="text-emerald-900">—</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
