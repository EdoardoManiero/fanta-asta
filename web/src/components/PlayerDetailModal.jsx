import PlayerAvatar from './PlayerAvatar.jsx';
import { ROLE_LABELS } from '../format.js';

function Dots({ value }) {
  return (
    <span className="inline-flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} className={`w-2 h-2 rounded-full ${i < value ? 'bg-emerald-400' : 'bg-emerald-900'}`} />
      ))}
    </span>
  );
}

function Stat({ label, value }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div className="bg-pitch-950/60 rounded-lg px-3 py-2">
      <div className="text-[11px] text-emerald-200/50">{label}</div>
      <div className="text-base font-semibold font-mono">{value}</div>
    </div>
  );
}

export default function PlayerDetailModal({ player, teamName, onClose }) {
  if (!player) return null;
  const isGk = player.ruolo === 'P';
  const isTarget = player.obiettivo === 'Sí' || player.obiettivo === 'Si' || player.obiettivo === 'Sì';

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
                {isTarget && <span title="Nel tuo mirino" className="text-amber-300">★</span>}
              </div>
              <div className="text-sm text-emerald-200/60">
                {ROLE_LABELS[player.ruolo]} · {player.squadra} · Fascia {player.fascia}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-emerald-200/50 hover:text-emerald-100 text-xl leading-none">✕</button>
        </div>

        {player.status !== 'available' && (
          <div className="mb-4 text-sm bg-emerald-500/10 border border-emerald-800 rounded-lg px-3 py-2 text-emerald-300">
            Assegnato a {teamName || '—'} per {player.soldPrice} crediti.
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
        <div className="grid grid-cols-3 gap-2 mb-4">
          <Stat label="Presenze" value={player.presenze} />
          <Stat label="Minuti" value={player.minuti} />
          <Stat label="MV" value={player.mv} />
          <Stat label="FMV" value={player.fmv} />
          <Stat label="FMV Exp." value={player.fmvExp} />
          <Stat label="Pt. Titolare" value={player.puntiTitolare} />
          <Stat label="Gol" value={player.gol} />
          <Stat label="Assist" value={player.assist} />
          <Stat label="Ammonizioni" value={player.ammonizioni} />
          <Stat label="Espulsioni" value={player.espulsioni} />
          {!isGk && <Stat label="Rig. segnati" value={player.rigSegnati} />}
          {!isGk && <Stat label="Rig. sbagliati" value={player.rigSbagliati} />}
          {isGk && <Stat label="Gol subiti" value={player.golSubiti} />}
          {isGk && <Stat label="Rig. parati" value={player.rigParati} />}
        </div>

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
