import { useState } from 'react';
import PlayerAvatar from './PlayerAvatar.jsx';
import StatHeatmap, { heatmapKeys } from './StatHeatmap.jsx';
import { ROLE_LABELS, isTarget } from '../format.js';

function Dots({ value }) {
  return (
    <span className="inline-flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} className={`h-1.5 w-1.5 rounded-full ${i < value ? 'bg-ink' : 'bg-line-strong'}`} />
      ))}
    </span>
  );
}

const ALL = ['P', 'D', 'C', 'A'];
const OUT = ['D', 'C', 'A'];
const ALL_STATS = [
  { key: 'presenze', label: 'Presenze', roles: ALL },
  { key: 'minuti', label: 'Minuti', roles: ALL },
  { key: 'mv', label: 'MV', roles: ALL },
  { key: 'fmv', label: 'FMV', roles: ALL },
  { key: 'fmvExp', label: 'FMV Exp.', roles: ALL },
  { key: 'puntiTitolare', label: 'Pt. Titolare', roles: ALL },
  { key: 'gol', label: 'Gol', roles: OUT },
  { key: 'assist', label: 'Assist', roles: OUT },
  { key: 'ammonizioni', label: 'Ammonizioni', roles: ALL },
  { key: 'espulsioni', label: 'Espulsioni', roles: ALL },
  { key: 'rigSegnati', label: 'Rig. segnati', roles: OUT },
  { key: 'rigSbagliati', label: 'Rig. sbagliati', roles: OUT },
  { key: 'golSubiti', label: 'Gol subiti', roles: ['P'] },
  { key: 'rigParati', label: 'Rig. parati', roles: ['P'] },
];

function Stat({ label, value }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div className="panel-inset px-3 py-2">
      <div className="label">{label}</div>
      <div className="num mt-0.5 font-semibold text-ink">{value}</div>
    </div>
  );
}

export default function PlayerDetailModal({ player, players, teams, teamName, isAdmin, socket, onClose }) {
  const [editing, setEditing] = useState(false);
  const [editTeam, setEditTeam] = useState('');
  const [editPrice, setEditPrice] = useState('');
  if (!player) return null;
  const target = isTarget(player);
  const assigned = player.status === 'sold';

  const openEdit = () => {
    setEditTeam(player.soldTo || '');
    setEditPrice(String(player.soldPrice ?? ''));
    setEditing(true);
  };
  const saveEdit = () => {
    socket.emit('admin:updateAssignment', { playerId: player.id, teamId: editTeam, price: Number(editPrice) });
    setEditing(false);
  };
  const remove = () => {
    if (confirm(`Rimuovere ${player.nome} da ${teamName}? I ${player.soldPrice} crediti tornano nel budget.`)) {
      socket.emit('admin:removeAssignment', { playerId: player.id });
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-scrim p-4"
      onClick={onClose}
    >
      <div
        className="panel shadow-overlay max-h-[85vh] w-full max-w-lg overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <PlayerAvatar player={player} size="lg" />
            <div>
              <div className="flex items-center gap-2 font-display text-md font-semibold">
                {player.nome}
                {target && <span title="Nel tuo mirino" className="text-live-soft">★</span>}
              </div>
              <div className="mt-0.5 text-xs text-ink-3">
                {ROLE_LABELS[player.ruolo]} · {player.squadra} · Fascia {player.fascia}
              </div>
            </div>
          </div>
          <button onClick={onClose} aria-label="Chiudi" className="shrink-0 text-md leading-none text-ink-3 hover:text-ink">✕</button>
        </div>

        {assigned && (
          <div className="panel-inset mb-4 px-3 py-2.5">
            <div className="text-sm text-ink">
              Assegnato a <span className="font-semibold">{teamName || '—'}</span> per{' '}
              <span className="num font-semibold">{player.soldPrice}</span> crediti.
            </div>
            {isAdmin && !editing && (
              <div className="flex gap-2 mt-2">
                <button onClick={openEdit}
                  className="btn btn-ghost btn-sm">
                  Modifica squadra/prezzo
                </button>
                <button onClick={remove}
                  className="btn btn-danger btn-sm">
                  Rimuovi dalla rosa
                </button>
              </div>
            )}
            {isAdmin && editing && (
              <div className="flex flex-wrap gap-2 mt-2 items-center">
                <select value={editTeam} onChange={(e) => setEditTeam(e.target.value)}
                  className="field field-sm">
                  {Object.values(teams || {}).map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
                <input value={editPrice} onChange={(e) => setEditPrice(e.target.value.replace(/\D/g, ''))}
                  className="field field-sm num w-20" />
                <button onClick={saveEdit}
                  className="btn btn-primary btn-sm">Salva</button>
                <button onClick={() => setEditing(false)} className="btn btn-quiet btn-sm">annulla</button>
              </div>
            )}
          </div>
        )}

        <div className="mb-5 grid grid-cols-3 gap-1">
          <Stat label="Prezzo consigliato" value={player.prezzoConsigliato} />
          <Stat label="Quotazione" value={player.quotazione} />
          <Stat label="PMA" value={player.pma} />
        </div>

        <div className="panel-inset mb-5 flex flex-wrap items-center gap-x-6 gap-y-2 px-3 py-2.5 text-sm">
          <div className="flex items-center gap-2">Titolarità <Dots value={player.titolarita} /></div>
          <div className="flex items-center gap-2">Affidabilità <Dots value={player.affidabilita} /></div>
          <div className="flex items-center gap-2">Integrità <Dots value={player.integrita} /></div>
        </div>

        <div className="label mb-2">Stagione scorsa</div>
        {players && (
          <div className="mb-4">
            <StatHeatmap player={player} players={players} />
          </div>
        )}
        {/* only what the heat map above doesn't already rank, so no number is
            printed twice; when the heat map can't run (no appearances) this
            falls back to showing the full line. */}
        {(() => {
          const ranked = players && player.presenze ? new Set(heatmapKeys(player.ruolo)) : new Set();
          const rows = ALL_STATS.filter((st) => !ranked.has(st.key) && st.roles.includes(player.ruolo));
          if (rows.length === 0) return null;
          return (
            <div className="mb-5 grid grid-cols-3 gap-1">
              {rows.map((st) => (
                <Stat key={st.key} label={st.label} value={player[st.key]} />
              ))}
            </div>
          );
        })()}

        {player.note?.length > 0 && (
          <div className="mb-4">
            <div className="label mb-2">Note scouting</div>
            <div className="flex flex-wrap gap-1.5">
              {player.note.map((n) => (
                <span key={n} className="chip">
                  {n}
                </span>
              ))}
            </div>
          </div>
        )}

        {player.commento && (
          <div>
            <div className="label mb-1">Commento</div>
            <div className="max-w-prose whitespace-pre-line text-sm text-ink-2">{player.commento}</div>
          </div>
        )}
      </div>
    </div>
  );
}
