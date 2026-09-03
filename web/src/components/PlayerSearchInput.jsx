import { useEffect, useMemo, useRef, useState } from 'react';
import { isTarget } from '../format.js';

// Type-ahead over the player pool. Suggestions are ordered by quotazione
// (highest first) so the players who actually matter surface at the top,
// and are navigable with the arrow keys / Enter.
export default function PlayerSearchInput({
  players,
  value,          // selected player id, or ''
  onSelect,       // (playerId | '') => void
  placeholder = 'Cerca giocatore…',
  filter,         // optional extra predicate
  limit = 8,
  autoFocus = false,
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(0);
  const boxRef = useRef(null);

  const selected = value ? players.find((p) => p.id === value) : null;

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    let list = players.filter((p) => p.nome.toLowerCase().includes(q));
    if (filter) list = list.filter(filter);
    return list
      .sort((a, b) => {
        // exact prefix matches first, then by quotazione desc
        const ap = a.nome.toLowerCase().startsWith(q) ? 0 : 1;
        const bp = b.nome.toLowerCase().startsWith(q) ? 0 : 1;
        if (ap !== bp) return ap - bp;
        return (b.quotazione ?? 0) - (a.quotazione ?? 0);
      })
      .slice(0, limit);
  }, [players, query, filter, limit]);

  useEffect(() => setCursor(0), [query]);

  useEffect(() => {
    const onDocClick = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const pick = (p) => {
    onSelect(p.id);
    setQuery('');
    setOpen(false);
  };

  const clear = () => {
    onSelect('');
    setQuery('');
    setOpen(true);
  };

  const onKeyDown = (e) => {
    if (!open || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setCursor((c) => Math.min(c + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setCursor((c) => Math.max(c - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      pick(suggestions[cursor]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div ref={boxRef} className="relative flex-1 min-w-[180px]">
      {selected ? (
        <div className="field flex w-full items-center gap-2">
          {isTarget(selected) && <span className="text-live-soft">★</span>}
          <span className="font-medium truncate">{selected.nome}</span>
          <span className="text-xs text-ink-3">
            {selected.ruolo} · {selected.squadra} · Quot. {selected.quotazione}
          </span>
          <button onClick={clear} className="ml-auto shrink-0 text-ink-3 hover:text-ink">✕</button>
        </div>
      ) : (
        <input
          value={query}
          autoFocus={autoFocus}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          className="field w-full"
        />
      )}

      {open && !selected && suggestions.length > 0 && (
        <ul className="panel shadow-overlay absolute left-0 right-0 z-30 mt-1 max-h-72 overflow-hidden overflow-y-auto">
          {suggestions.map((p, i) => (
            <li key={p.id}>
              <button
                onMouseEnter={() => setCursor(i)}
                onClick={() => pick(p)}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
                  i === cursor ? 'bg-surface-3' : ''
                }`}
              >
                {isTarget(p) && <span className="text-xs">★</span>}
                <span className="font-medium truncate">{p.nome}</span>
                <span className="text-ink-3 text-xs">{p.ruolo} · {p.squadra}</span>
                <span className="num ml-auto text-xs text-ink-2">{p.quotazione}</span>
                {p.status !== 'available' && (
                  <span className="text-2xs text-danger whitespace-nowrap">preso</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
