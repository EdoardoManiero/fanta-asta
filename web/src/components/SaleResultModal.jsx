import { useEffect } from 'react';
import PlayerAvatar from './PlayerAvatar.jsx';
import { ROLE_LABELS } from '../format.js';

// Shown to everyone the moment a player's bidding closes, so the room has an
// unambiguous confirmation of who got him and for how much.
export default function SaleResultModal({ sale, player, isMine, onClose }) {
  useEffect(() => {
    if (!sale) return undefined;
    const t = setTimeout(onClose, 7000);
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => { clearTimeout(t); document.removeEventListener('keydown', onKey); };
  }, [sale, onClose]);

  if (!sale) return null;

  return (
    <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className={`bg-pitch-900 border-2 rounded-2xl w-full max-w-sm p-6 text-center ${
          isMine ? 'border-emerald-400' : 'border-emerald-800'
        }`}
      >
        <div className="text-xs uppercase tracking-widest text-emerald-200/50 mb-3">Asta conclusa</div>

        <div className="flex justify-center mb-3">
          {player ? <PlayerAvatar player={player} size="lg" /> : null}
        </div>

        <div className="text-2xl font-bold">{sale.playerName}</div>
        {player && (
          <div className="text-sm text-emerald-200/60 mb-4">
            {ROLE_LABELS[player.ruolo]} · {player.squadra}
          </div>
        )}

        <div className="bg-pitch-950/70 border border-emerald-900/60 rounded-xl p-4">
          <div className="text-xs text-emerald-200/50 mb-1">Aggiudicato a</div>
          <div className="text-lg font-semibold">{sale.teamName}</div>
          <div className="text-3xl font-bold text-emerald-300 mt-2 font-mono">{sale.price}</div>
          <div className="text-xs text-emerald-200/50">crediti</div>
        </div>

        {isMine && (
          <div className="mt-3 text-sm font-semibold text-emerald-300">È tuo! 🎉</div>
        )}

        <button
          onClick={onClose}
          className="mt-4 w-full rounded-lg bg-emerald-500 text-pitch-950 font-semibold py-2 hover:bg-emerald-400"
        >
          Ok
        </button>
      </div>
    </div>
  );
}
