import { useState } from 'react';
import { ROLE_ORDER, ROLE_BAR_COLORS, maxSingleBid } from '../format.js';

export default function BoardTab({ state, myTeamId }) {
  const [open, setOpen] = useState({ P: true, D: true, C: true, A: true });
  const teams = Object.values(state.teams).sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));

  return (
    <div className="panel overflow-x-auto">
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${teams.length}, minmax(180px, 1fr))`, minWidth: teams.length * 180 }}>
        {teams.map((t) => {
          const totalSlots = ROLE_ORDER.reduce((n, r) => n + state.config.slots[r], 0);
          const filled = ROLE_ORDER.reduce((n, r) => n + t.roster[r].length, 0);
          return (
            <div
              key={t.id}
              className={`border-b border-l border-line p-3 first:border-l-0 ${
                t.id === myTeamId ? 'bg-surface-2' : 'bg-surface'
              }`}
            >
              <div className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-ink">
                <span className={`w-1.5 h-1.5 rounded-full ${t.connected ? 'bg-free' : 'bg-line-strong'}`} />
                <span className="truncate">{t.name}</span>
              </div>
              <div className="mb-1 flex items-center justify-between text-xs text-ink-3">
                <span className="num">{filled}/{totalSlots}</span>
                <span className="num text-ink">{t.budget} cr.</span>
              </div>
              <div className="mb-2 text-2xs text-ink-3">
                max singola offerta <span className="num text-ink-2">{maxSingleBid(t, state.config)}</span>
              </div>
              <div className="num flex gap-2 text-2xs text-ink-3">
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
                className={`flex items-center justify-between border-b border-t border-line bg-surface-2 px-3 py-2 text-2xs font-semibold ${ROLE_BAR_COLORS[role]}`}
              >
                <span>{role} · <span className="num">{pct}%</span></span>
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
                          className="flex min-h-[34px] items-center justify-between gap-2 border-b border-l border-line px-3 py-1.5 text-xs first:border-l-0"
                        >
                          {p ? (
                            <>
                              <span className="truncate text-ink">{p.name}</span>
                              <span className="num shrink-0 text-ink-2">{p.price}</span>
                            </>
                          ) : (
                            // non-informational placeholder: kept faint on purpose
                            <span className="text-line-strong">—</span>
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
