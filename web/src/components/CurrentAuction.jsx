import { useEffect, useState } from 'react';
import RoleBadge from './RoleBadge.jsx';
import { fmtSecs } from '../format.js';

export default function CurrentAuction({ state, myTeam, socket }) {
  const ca = state.currentAuction;
  const [now, setNow] = useState(Date.now());
  const [customAmount, setCustomAmount] = useState('');

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(id);
  }, []);

  if (!ca) {
    return (
      <div className="bg-pitch-900/60 border border-emerald-900 rounded-2xl p-8 text-center text-emerald-200/60">
        Nessun giocatore sul tavolo al momento. In attesa dell'admin...
      </div>
    );
  }

  const player = state.players.find((p) => p.id === ca.playerId);
  if (!player) return null;
  const currentBidder = ca.currentBidderTeamId ? state.teams[ca.currentBidderTeamId] : null;
  const msLeft = ca.timerEndsAt ? ca.timerEndsAt - now : null;
  const minBid = ca.currentBid + state.config.minIncrement;
  const canBid = Boolean(myTeam) && myTeam.roster[player.ruolo].length < state.config.slots[player.ruolo];

  const placeBid = (amount) => {
    if (!myTeam) return;
    socket.emit('bid', { teamId: myTeam.id, amount });
  };

  return (
    <div className="bg-pitch-900/60 border border-emerald-900 rounded-2xl p-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <RoleBadge role={player.ruolo} />
          <div>
            <div className="text-2xl font-bold">{player.nome}</div>
            <div className="text-emerald-200/60 text-sm">
              {player.squadra} · Fascia {player.fascia} · Quot. {player.quotazione} · Consigliato {player.prezzoConsigliato}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className={`text-3xl font-mono font-bold ${msLeft != null && msLeft < 5000 ? 'text-rose-400' : ''}`}>
            {ca.timerEndsAt ? fmtSecs(msLeft) : '—'}
          </div>
          <div className="text-xs text-emerald-200/50">tempo rimanente</div>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between bg-pitch-950/70 rounded-xl p-4 border border-emerald-900/60">
        <div>
          <div className="text-xs text-emerald-200/50">Offerta attuale</div>
          <div className="text-3xl font-bold text-emerald-300">{ca.currentBid || 0}</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-emerald-200/50">Miglior offerente</div>
          <div className="text-lg font-semibold">{currentBidder ? currentBidder.name : '—'}</div>
        </div>
      </div>

      {myTeam ? (
        canBid ? (
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <button
              onClick={() => placeBid(minBid)}
              className="rounded-lg bg-emerald-500 text-pitch-950 font-bold px-4 py-2.5 hover:bg-emerald-400"
            >
              Offri {minBid}
            </button>
            {[5, 10, 25].map((inc) => (
              <button
                key={inc}
                onClick={() => placeBid(ca.currentBid + inc)}
                className="rounded-lg border border-emerald-700 px-3 py-2.5 text-sm hover:border-emerald-400"
              >
                +{inc}
              </button>
            ))}
            <input
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value.replace(/\D/g, ''))}
              placeholder="importo"
              className="w-24 rounded-lg bg-pitch-950 border border-emerald-900 px-2 py-2.5 text-sm outline-none focus:border-emerald-500"
            />
            <button
              onClick={() => customAmount && placeBid(Number(customAmount))}
              className="rounded-lg border border-emerald-700 px-3 py-2.5 text-sm hover:border-emerald-400"
            >
              Offri importo
            </button>
            <div className="ml-auto text-sm text-emerald-200/60">
              Budget {myTeam.name}: <span className="font-semibold text-emerald-200">{myTeam.budget}</span>
            </div>
          </div>
        ) : (
          <div className="mt-5 text-sm text-amber-300/80">Reparto {player.ruolo} già completo per la tua squadra: non puoi offrire.</div>
        )
      ) : (
        <div className="mt-5 text-sm text-emerald-200/50">Entra in una squadra per poter offrire.</div>
      )}
    </div>
  );
}
