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
    <div className="space-y-4 border-t border-line pt-5">
      <div className="label text-warn">Gestione rose</div>

      <div className="flex flex-wrap gap-2 items-center">
        <select
          value={teamId}
          onChange={(e) => { setTeamId(e.target.value); setEditing(null); }}
          className="field field-sm"
        >
          {teams.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
        <span className="text-sm text-ink-2">
          budget <span className="num text-ink">{team.budget}</span> · max offerta{' '}
          <span className="num text-ink">{maxSingleBid(team, state.config)}</span>
        </span>
      </div>

      {/* current roster */}
      <div className="panel divide-y divide-line">
        {ROLE_ORDER.flatMap((r) =>
          team.roster[r].map((entry) => {
            const isEditing = editing?.playerId === entry.playerId;
            return (
              <div key={entry.playerId} className="flex items-center gap-2 px-3 py-2 text-sm flex-wrap">
                <span className="num w-5 shrink-0 text-2xs text-ink-3">{r}</span>
                <span className="min-w-[100px] flex-1 truncate text-ink">{entry.name}</span>

                {isEditing ? (
                  <>
                    <select
                      value={editing.teamId}
                      onChange={(e) => setEditing({ ...editing, teamId: e.target.value })}
                      className="field field-sm"
                    >
                      {teams.map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                    <input
                      value={editing.price}
                      onChange={(e) => setEditing({ ...editing, price: e.target.value.replace(/\D/g, '') })}
                      className="field field-sm num w-16"
                    />
                    <button onClick={saveEdit} className="btn btn-primary btn-sm">
                      Salva
                    </button>
                    <button onClick={() => setEditing(null)} className="btn btn-quiet btn-sm">
                      annulla
                    </button>
                  </>
                ) : (
                  <>
                    <span className="num w-12 text-right text-ink">{entry.price}</span>
                    <button
                      onClick={() => setEditing({ playerId: entry.playerId, price: String(entry.price), teamId: team.id })}
                      className="btn btn-ghost btn-sm"
                    >
                      Modifica
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Rimuovere ${entry.name} da ${team.name}? I ${entry.price} crediti tornano nel budget.`)) {
                          socket.emit('admin:removeAssignment', { playerId: entry.playerId });
                        }
                      }}
                      className="btn btn-danger btn-sm"
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
          <div className="px-3 py-3 text-sm text-ink-3">Rosa vuota</div>
        )}
      </div>

      {/* add a player */}
      <div className="space-y-2">
        <div className="text-sm text-ink-2">Aggiungi un giocatore a {team.name}:</div>
        <div className="flex flex-wrap gap-2 items-center">
          <PlayerSearchInput
            players={state.players}
            value={addPlayerId}
            onSelect={setAddPlayerId}
            placeholder="cerca giocatore libero…"
            filter={(p) => p.status === 'available'}
          />
          <input
            value={addPrice}
            onChange={(e) => setAddPrice(e.target.value.replace(/\D/g, ''))}
            placeholder="prezzo"
            className="field field-sm num w-20"
          />
          <button
            onClick={add}
            disabled={!selected || addPrice === ''}
            className="btn btn-primary"
          >
            Aggiungi
          </button>
        </div>
      </div>
    </div>
  );
}
