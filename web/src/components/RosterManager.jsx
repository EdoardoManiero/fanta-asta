import { useState } from 'react';
import { ROLE_ORDER, maxSingleBid } from '../format.js';
import PlayerSearchInput from './PlayerSearchInput.jsx';

// Admin-only roster surgery: add a player to a team at a chosen price, change
// the price paid, move a player to another team, or release one back to the
// pool. Budgets, rose e stato dei giocatori si aggiornano di conseguenza.
export default function RosterManager({ state, socket }) {
  const teams = Object.values(state.teams).sort((a, b) =>
    a.id.localeCompare(b.id, undefined, { numeric: true })
  );
  const [teamId, setTeamId] = useState(teams[0]?.id || '');
  const [addPrice, setAddPrice] = useState('');
  const [addPlayerId, setAddPlayerId] = useState('');
  const [editing, setEditing] = useState(null); // { playerId, price, teamId }

  const team = state.teams[teamId];

  const selected = addPlayerId ? state.players.find((p) => p.id === addPlayerId) : null;

  const add = () => {
    if (!selected || !teamId || addPrice === '') return;
    socket.emit('admin:addAssignment', { playerId: selected.id, teamId, price: Number(addPrice) });
    setAddPlayerId('');
    setAddPrice('');
  };

  const saveEdit = () => {
    if (!editing) return;
    socket.emit('admin:updateAssignment', {
      playerId: editing.playerId,
      teamId: editing.teamId,
      price: Number(editing.price),
    });
    setEditing(null);
  };

  if (!team) return null;

  return (
    <div className="space-y-4 border-t border-amber-700/30 pt-4">
      <div className="text-xs font-bold text-amber-300 uppercase tracking-wide">Gestione rose</div>

      <div className="flex flex-wrap gap-2 items-center">
        <select
          value={teamId}
          onChange={(e) => { setTeamId(e.target.value); setEditing(null); }}
          className="bg-pitch-950 border border-emerald-900 rounded-md px-2 py-1.5 text-sm"
        >
          {teams.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
        <span className="text-sm text-emerald-200/60">
          budget <span className="font-mono text-emerald-300">{team.budget}</span> · max offerta{' '}
          <span className="font-mono text-emerald-300">{maxSingleBid(team, state.config)}</span>
        </span>
      </div>

      {/* current roster */}
      <div className="rounded-lg border border-emerald-900 divide-y divide-emerald-900/50">
        {ROLE_ORDER.flatMap((r) =>
          team.roster[r].map((entry) => {
            const isEditing = editing?.playerId === entry.playerId;
            return (
              <div key={entry.playerId} className="flex items-center gap-2 px-3 py-2 text-sm flex-wrap">
                <span className="w-6 text-emerald-200/50 font-mono text-xs">{r}</span>
                <span className="flex-1 min-w-[100px] truncate">{entry.name}</span>

                {isEditing ? (
                  <>
                    <select
                      value={editing.teamId}
                      onChange={(e) => setEditing({ ...editing, teamId: e.target.value })}
                      className="bg-pitch-950 border border-emerald-900 rounded-md px-2 py-1 text-xs"
                    >
                      {teams.map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                    <input
                      value={editing.price}
                      onChange={(e) => setEditing({ ...editing, price: e.target.value.replace(/\D/g, '') })}
                      className="w-16 bg-pitch-950 border border-emerald-900 rounded-md px-2 py-1 text-xs font-mono"
                    />
                    <button onClick={saveEdit} className="text-xs rounded-md bg-emerald-500 text-pitch-950 font-semibold px-2 py-1">
                      Salva
                    </button>
                    <button onClick={() => setEditing(null)} className="text-xs text-emerald-200/50 px-1">
                      annulla
                    </button>
                  </>
                ) : (
                  <>
                    <span className="font-mono text-emerald-300/80 w-12 text-right">{entry.price}</span>
                    <button
                      onClick={() => setEditing({ playerId: entry.playerId, price: String(entry.price), teamId: team.id })}
                      className="text-xs rounded-md border border-emerald-700 px-2 py-1 hover:border-emerald-400"
                    >
                      Modifica
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Rimuovere ${entry.name} da ${team.name}? I ${entry.price} crediti tornano nel budget.`)) {
                          socket.emit('admin:removeAssignment', { playerId: entry.playerId });
                        }
                      }}
                      className="text-xs rounded-md border border-rose-700 text-rose-300 px-2 py-1 hover:border-rose-400"
                    >
                      Rimuovi
                    </button>
                  </>
                )}
              </div>
            );
          })
        )}
        {ROLE_ORDER.every((r) => team.roster[r].length === 0) && (
          <div className="px-3 py-2 text-sm text-emerald-200/30">Rosa vuota</div>
        )}
      </div>

      {/* add a player */}
      <div className="space-y-2">
        <div className="text-sm text-emerald-200/70">Aggiungi un giocatore a {team.name}:</div>
        <div className="flex flex-wrap gap-2 items-center">
          <PlayerSearchInput
            players={state.players}
            value={addPlayerId}
            onSelect={setAddPlayerId}
            placeholder="cerca giocatore libero..."
            filter={(p) => p.status === 'available'}
          />
          <input
            value={addPrice}
            onChange={(e) => setAddPrice(e.target.value.replace(/\D/g, ''))}
            placeholder="prezzo"
            className="w-20 rounded-lg bg-pitch-950 border border-emerald-900 px-2 py-1.5 text-sm font-mono"
          />
          <button
            onClick={add}
            disabled={!selected || addPrice === ''}
            className="rounded-lg bg-emerald-500 text-pitch-950 font-semibold px-3 py-1.5 text-sm disabled:opacity-30"
          >
            Aggiungi
          </button>
        </div>
      </div>
    </div>
  );
}
