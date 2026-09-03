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
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-scrim p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className={`panel shadow-overlay w-full max-w-sm p-6 ${isMine ? 'border-live' : ''}`}
      >
        <div className="label">Asta conclusa</div>

        <div className="mt-4 flex items-center gap-3">
          {player ? <PlayerAvatar player={player} size="lg" /> : null}
          <div className="min-w-0">
            <div className="truncate font-display text-md font-semibold">{sale.playerName}</div>
            {player && (
              <div className="text-xs text-ink-3">
                {ROLE_LABELS[player.ruolo]} · {player.squadra}
              </div>
            )}
          </div>
        </div>

        <div className="panel-inset mt-4 flex items-end justify-between px-4 py-3">
          <div>
            <div className="label">Aggiudicato a</div>
            <div className="mt-0.5 font-semibold text-ink">{sale.teamName}</div>
          </div>
          <div className="text-right">
            <div className="label">Crediti</div>
            <div className="num mt-0.5 text-xl font-semibold leading-none text-ink">{sale.price}</div>
          </div>
        </div>

        {isMine && <div className="mt-3 text-sm font-semibold text-free">Aggiudicato alla tua squadra.</div>}

        <button onClick={onClose} className="btn btn-ghost mt-5 w-full">
          Chiudi
        </button>
      </div>
    </div>
  );
}
