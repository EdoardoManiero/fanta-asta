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
      <div className="flex flex-wrap gap-2 mb-4 items-center">
        {ROLE_ORDER.map((r) => (
          <button
            key={r}
            onClick={() => setRole(r)}
            className={`px-3 py-1.5 rounded-lg border text-sm font-semibold ${
              role === r ? 'border-emerald-400 bg-emerald-500/10' : 'border-emerald-900'
            }`}
          >
            {r}
          </button>
        ))}
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cerca nome o squadra..."
          className="rounded-lg bg-pitch-950 border border-emerald-900 px-3 py-1.5 text-sm outline-none focus:border-emerald-500 flex-1 min-w-[160px]"
        />
        <label className="flex items-center gap-1.5 text-sm text-emerald-200/70">
          <input type="checkbox" checked={onlyAvailable} onChange={(e) => setOnlyAvailable(e.target.checked)} />
          solo liberi
        </label>
        <label className="flex items-center gap-1.5 text-sm text-amber-300/80">
          <input type="checkbox" checked={onlyTargets} onChange={(e) => setOnlyTargets(e.target.checked)} />
          ★ solo obiettivi
        </label>
      </div>

      <div className="overflow-x-auto rounded-xl border border-emerald-900">
        <table className="w-full text-sm">
          <thead className="bg-pitch-900/70 text-emerald-200/60">
            <tr>
              <th className="p-2 text-left"></th>
              {COLUMNS.map((c) => (
                <th
                  key={c.key}
                  onClick={() => toggleSort(c.key)}
                  className="p-2 text-left cursor-pointer select-none hover:text-emerald-100 whitespace-nowrap"
                >
                  {c.label} {sortKey === c.key ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                </th>
              ))}
              <th className="p-2 text-left">Stato</th>
              {isAdmin && <th className="p-2"></th>}
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr
                key={p.id}
                onClick={() => onSelectPlayer(p.id)}
                className={`border-t border-emerald-900/50 cursor-pointer hover:bg-pitch-900/40 ${p.status !== 'available' ? 'opacity-40' : ''}`}
              >
                <td className="p-2"><PlayerAvatar player={p} size="sm" /></td>
                <td className="p-2 font-medium whitespace-nowrap">
                  {isTarget(p) && <span className="text-amber-300 mr-1">★</span>}
                  {p.nome}
                </td>
                <td className="p-2">{p.squadra}</td>
                <td className="p-2">{p.fascia}</td>
                <td className="p-2 font-mono">{p.quotazione}</td>
                <td className="p-2 font-mono">{p.prezzoConsigliato}</td>
                <td className="p-2">{p.titolarita}</td>
                <td className="p-2">{p.affidabilita}</td>
                <td className="p-2 font-mono">{p.fmv}</td>
                <td className="p-2">{p.presenze}</td>
                <td className="p-2">{p.gol}</td>
                <td className="p-2">{p.assist}</td>
                <td className="p-2 whitespace-nowrap">
                  {p.status === 'available' ? (
                    <span className="text-emerald-400">libero</span>
                  ) : (
                    <span className="text-emerald-200/50">
                      {state.teams[p.soldTo]?.name} · {p.soldPrice}
                    </span>
                  )}
                </td>
                {isAdmin && (
                  <td className="p-2">
                    {p.status === 'available' && !state.currentAuction && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onNominate(p.id); }}
                        className="text-xs rounded-md border border-emerald-700 px-2 py-1 hover:border-emerald-400"
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
      <div className="text-xs text-emerald-200/40 mt-2">{filtered.length} giocatori</div>
    </div>
  );
}
