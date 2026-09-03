import { useMemo, useState } from 'react';
import PlayerAvatar from './PlayerAvatar.jsx';
import { ROLE_ORDER, isTarget } from '../format.js';

const COLUMNS = [
  { key: 'nome', label: 'Nome' },
  { key: 'squadra', label: 'Sq.' },
  { key: 'fascia', label: 'Fascia' },
  { key: 'quotazione', label: 'Quot.' },
  { key: 'prezzoConsigliato', label: 'Consigl.' },
  { key: 'titolarita', label: 'Tit.' },
  { key: 'affidabilita', label: 'Affid.' },
  { key: 'fmv', label: 'FMV' },
  { key: 'presenze', label: 'Pres.' },
  { key: 'gol', label: 'Gol' },
  { key: 'assist', label: 'Assist' },
];

export default function PlayerDatabase({ state, isAdmin, onNominate, onSelectPlayer }) {
  const [role, setRole] = useState('P');
  const [query, setQuery] = useState('');
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [onlyTargets, setOnlyTargets] = useState(false);
  const [sortKey, setSortKey] = useState('quotazione');
  const [sortDir, setSortDir] = useState('desc');

  const filtered = useMemo(() => {
    let list = state.players.filter((p) => p.ruolo === role);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter((p) => p.nome.toLowerCase().includes(q) || (p.squadra || '').toLowerCase().includes(q));
    }
    if (onlyAvailable) list = list.filter((p) => p.status === 'available');
    if (onlyTargets) list = list.filter(isTarget);
    list = [...list].sort((a, b) => {
      const av = a[sortKey] ?? 0;
      const bv = b[sortKey] ?? 0;
      if (typeof av === 'string') return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortDir === 'asc' ? av - bv : bv - av;
    });
    return list;
  }, [state.players, role, query, onlyAvailable, onlyTargets, sortKey, sortDir]);

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {ROLE_ORDER.map((r) => (
          <button
            key={r}
            onClick={() => setRole(r)}
            className={`w-9 rounded border py-1.5 text-sm font-semibold transition-colors ${
              role === r
                ? 'border-live bg-surface-2 text-ink'
                : 'border-line text-ink-3 hover:border-line-strong hover:text-ink'
            }`}
          >
            {r}
          </button>
        ))}
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cerca nome o squadra…"
          className="field min-w-[160px] flex-1"
        />
        <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-2">
          <input type="checkbox" checked={onlyAvailable} onChange={(e) => setOnlyAvailable(e.target.checked)} />
          solo liberi
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-2">
          <input type="checkbox" checked={onlyTargets} onChange={(e) => setOnlyTargets(e.target.checked)} />
          <span className="text-warn">★</span> solo obiettivi
        </label>
      </div>

      <div className="panel overflow-x-auto">
        <table className="tbl tbl-rows">
          <thead>
            <tr>
              <th></th>
              {COLUMNS.map((c) => (
                <th
                  key={c.key}
                  onClick={() => toggleSort(c.key)}
                  className="cursor-pointer select-none hover:text-ink"
                >
                  {c.label} {sortKey === c.key ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                </th>
              ))}
              <th>Stato</th>
              {isAdmin && <th></th>}
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr
                key={p.id}
                onClick={() => onSelectPlayer(p.id)}
                className={p.status !== 'available' ? 'text-ink-3' : ''}
              >
                <td><PlayerAvatar player={p} size="sm" /></td>
                <td className="whitespace-nowrap font-medium text-ink">
                  {isTarget(p) && <span className="text-warn mr-1">★</span>}
                  {p.nome}
                </td>
                <td>{p.squadra}</td>
                <td>{p.fascia}</td>
                <td className="num">{p.quotazione}</td>
                <td className="num">{p.prezzoConsigliato}</td>
                <td>{p.titolarita}</td>
                <td>{p.affidabilita}</td>
                <td className="num">{p.fmv}</td>
                <td>{p.presenze}</td>
                <td>{p.gol}</td>
                <td>{p.assist}</td>
                <td className="whitespace-nowrap">
                  {p.status === 'available' ? (
                    <span className="text-free">libero</span>
                  ) : (
                    <span className="text-ink-3">
                      {state.teams[p.soldTo]?.name} · {p.soldPrice}
                    </span>
                  )}
                </td>
                {isAdmin && (
                  <td>
                    {p.status === 'available' && !state.currentAuction && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onNominate(p.id); }}
                        className="btn btn-ghost btn-sm"
                      >
                        Metti all'asta
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="text-xs text-ink-3 mt-2">{filtered.length} giocatori</div>
    </div>
  );
}
