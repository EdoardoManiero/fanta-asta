import { useState } from 'react';
import PlayerAvatar from './PlayerAvatar.jsx';
import StatHeatmap, { heatmapKeys } from './StatHeatmap.jsx';
import { ROLE_LABELS, isTarget } from '../format.js';

function Dots({ value }) {
  return (
    <span className="inline-flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} className={`w-2 h-2 rounded-full ${i < value ? 'bg-emerald-400' : 'bg-emerald-900'}`} />
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
    <div className="bg-pitch-950/60 rounded-lg px-3 py-2">
      <div className="text-[11px] text-emerald-200/50">{label}</div>
      <div className="text-base font-semibold font-mono">{value}</div>
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
      className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-pitch-900 border border-emerald-800 rounded-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <PlayerAvatar player={player} size="lg" />
            <div>
              <div className="text-xl font-bold flex items-center gap-2">
                {player.nome}
                {target && <span title="Nel tuo mirino" className="text-amber-300">★</span>}
              </div>
              <div className="text-sm text-emerald-200/60">
                {ROLE_LABELS[player.ruolo]} · {player.squadra} · Fascia {player.fascia}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-emerald-200/50 hover:text-emerald-100 text-xl leading-none">✕</button>
        </div>

        {assigned && (
          <div className="mb-4 bg-emerald-500/10 border border-emerald-800 rounded-lg px-3 py-2">
            <div className="text-sm text-emerald-300">
              Assegnato a {teamName || '—'} per {player.soldPrice} crediti.
            </div>
            {isAdmin && !editing && (
              <div className="flex gap-2 mt-2">
                <button onClick={openEdit}
                  className="text-xs rounded-md border border-emerald-700 px-2 py-1 hover:border-emerald-400">
                  Modifica squadra/prezzo
                </button>
                <button onClick={remove}
                  className="text-xs rounded-md border border-rose-700 text-rose-300 px-2 py-1 hover:border-rose-400">
                  Rimuovi dalla rosa
                </button>
              </div>
            )}
            {isAdmin && editing && (
              <div className="flex flex-wrap gap-2 mt-2 items-center">
                <select value={editTeam} onChange={(e) => setEditTeam(e.target.value)}
                  className="bg-pitch-950 border border-emerald-900 rounded-md px-2 py-1 text-xs">
                  {Object.values(teams || {}).map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
                <input value={editPrice} onChange={(e) => setEditPrice(e.target.value.replace(/\D/g, ''))}
                  className="w-20 bg-pitch-950 border border-emerald-900 rounded-md px-2 py-1 text-xs font-mono" />
                <button onClick={saveEdit}
                  className="text-xs rounded-md bg-emerald-500 text-pitch-950 font-semibold px-2 py-1">Salva</button>
                <button onClick={() => setEditing(false)} className="text-xs text-emerald-200/50 px-1">annulla</button>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-3 gap-2 mb-4">
          <Stat label="Prezzo consigliato" value={player.prezzoConsigliato} />
          <Stat label="Quotazione" value={player.quotazione} />
          <Stat label="PMA" value={player.pma} />
        </div>

        <div className="flex items-center gap-5 text-sm mb-4 bg-pitch-950/60 rounded-lg px-3 py-2.5">
          <div className="flex items-center gap-2">Titolarità <Dots value={player.titolarita} /></div>
          <div className="flex items-center gap-2">Affidabilità <Dots value={player.affidabilita} /></div>
          <div className="flex items-center gap-2">Integrità <Dots value={player.integrita} /></div>
        </div>

        <div className="text-xs font-bold text-emerald-200/50 uppercase tracking-wide mb-2">Stagione scorsa</div>
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
            <div className="grid grid-cols-3 gap-2 mb-4">
              {rows.map((st) => (
                <Stat key={st.key} label={st.label} value={player[st.key]} />
              ))}
            </div>
          );
        })()}

        {player.note?.length > 0 && (
          <div className="mb-4">
            <div className="text-xs font-bold text-emerald-200/50 uppercase tracking-wide mb-2">Note scouting</div>
            <div className="flex flex-wrap gap-1.5">
              {player.note.map((n) => (
                <span key={n} className="text-xs bg-pitch-950 border border-emerald-900 rounded-full px-2.5 py-1 text-emerald-200/70">
                  {n}
                </span>
              ))}
            </div>
          </div>
        )}

        {player.commento && (
          <div>
            <div className="text-xs font-bold text-emerald-200/50 uppercase tracking-wide mb-1">Commento</div>
            <div className="text-sm text-emerald-200/70 whitespace-pre-line">{player.commento}</div>
          </div>
        )}
      </div>
    </div>
  );
}
