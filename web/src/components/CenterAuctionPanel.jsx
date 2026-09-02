import { useEffect, useMemo, useState } from 'react';
import RoleBadge from './RoleBadge.jsx';
import { ROLE_ORDER, fmtSecs } from '../format.js';

function NominationPicker({ state, socket }) {
  const [role, setRole] = useState('TUTTI');
  const [query, setQuery] = useState('');
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignTeam, setAssignTeam] = useState('');
  const [assignPrice, setAssignPrice] = useState('');

  const filtered = useMemo(() => {
    let list = state.players.filter((p) => p.status === 'available');
    if (role !== 'TUTTI') list = list.filter((p) => p.ruolo === role);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter((p) => p.nome.toLowerCase().includes(q));
    }
    return list;
  }, [state.players, role, query]);

  const exactMatch = query.trim() && filtered.length === 1 ? filtered[0] : null;

  const chiama = () => {
    if (exactMatch) socket.emit('admin:nominate', { playerId: exactMatch.id });
    else socket.emit('admin:nominateRandom', { role: role === 'TUTTI' ? undefined : role });
  };

  const assegna = () => {
    if (!exactMatch || !assignTeam || !assignPrice) return;
    socket.emit('admin:quickAssign', { playerId: exactMatch.id, teamId: assignTeam, price: Number(assignPrice) });
    setAssignOpen(false);
    setAssignPrice('');
    setQuery('');
  };

  return (
    <div className="bg-pitch-900/60 border border-emerald-900 rounded-2xl p-6 flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setRole('TUTTI')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold ${role === 'TUTTI' ? 'bg-emerald-500 text-pitch-950' : 'border border-emerald-800 text-emerald-200/70'}`}
        >
          TUTTI
        </button>
        {ROLE_ORDER.map((r) => (
          <button
            key={r}
            onClick={() => setRole(r)}
            className={`w-8 h-8 rounded-lg text-xs font-bold ${role === r ? 'bg-emerald-500 text-pitch-950' : 'border border-emerald-800 text-emerald-200/70'}`}
          >
            {r}
          </button>
        ))}
      </div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Cerca giocatore..."
        className="w-full rounded-lg bg-pitch-950 border border-emerald-900 px-3 py-2 text-sm outline-none focus:border-emerald-500"
      />
      <div className="text-xs text-emerald-200/40">{filtered.length} giocatori disponibili nel filtro</div>

      {!assignOpen ? (
        <div className="flex gap-2 mt-auto pt-2">
          <button
            onClick={chiama}
            className="flex-1 rounded-lg bg-emerald-500 text-pitch-950 font-bold py-2.5 hover:bg-emerald-400"
          >
            {exactMatch ? `Chiama ${exactMatch.nome}` : 'Chiama a caso'}
          </button>
          <button
            disabled={!exactMatch}
            onClick={() => setAssignOpen(true)}
            className="rounded-lg border border-emerald-700 px-4 py-2.5 text-sm hover:border-emerald-400 disabled:opacity-30"
          >
            Assegna
          </button>
        </div>
      ) : (
        <div className="border-t border-emerald-900/60 pt-3 flex flex-col gap-2">
          <div className="text-sm text-emerald-200/70">Assegna {exactMatch?.nome} direttamente (senza asta live):</div>
          <div className="flex gap-2 flex-wrap">
            <select value={assignTeam} onChange={(e) => setAssignTeam(e.target.value)}
              className="bg-pitch-950 border border-emerald-900 rounded-md px-2 py-1.5 text-sm">
              <option value="">a quale squadra?</option>
              {Object.values(state.teams).map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            <input value={assignPrice} onChange={(e) => setAssignPrice(e.target.value.replace(/\D/g, ''))}
              placeholder="prezzo" className="w-24 bg-pitch-950 border border-emerald-900 rounded-md px-2 py-1.5 text-sm" />
            <button onClick={assegna} disabled={!assignTeam || !assignPrice}
              className="rounded-lg bg-emerald-500 text-pitch-950 font-semibold px-3 py-1.5 text-sm disabled:opacity-30">
              Conferma
            </button>
            <button onClick={() => setAssignOpen(false)} className="text-sm text-emerald-200/50 px-2">
              annulla
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function OnTheBlock({ state, myTeam, socket }) {
  const ca = state.currentAuction;
  const [now, setNow] = useState(Date.now());
  const [customAmount, setCustomAmount] = useState('');

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(id);
  }, []);

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
          <div className="w-16 h-16 rounded-full bg-pitch-950 border-2 border-emerald-700 flex items-center justify-center text-xl font-black text-emerald-300">
            {player.ruolo}
          </div>
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
            <button onClick={() => placeBid(minBid)} className="rounded-lg bg-emerald-500 text-pitch-950 font-bold px-4 py-2.5 hover:bg-emerald-400">
              Offri {minBid}
            </button>
            {[5, 10, 25].map((inc) => (
              <button key={inc} onClick={() => placeBid(ca.currentBid + inc)} className="rounded-lg border border-emerald-700 px-3 py-2.5 text-sm hover:border-emerald-400">
                +{inc}
              </button>
            ))}
            <input
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value.replace(/\D/g, ''))}
              placeholder="importo"
              className="w-24 rounded-lg bg-pitch-950 border border-emerald-900 px-2 py-2.5 text-sm outline-none focus:border-emerald-500"
            />
            <button onClick={() => customAmount && placeBid(Number(customAmount))} className="rounded-lg border border-emerald-700 px-3 py-2.5 text-sm hover:border-emerald-400">
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

export default function CenterAuctionPanel({ state, myTeam, isAdmin, socket }) {
  if (state.phase === 'lobby') {
    return (
      <div className="bg-pitch-900/60 border border-emerald-900 rounded-2xl p-8 text-center text-emerald-200/60">
        In attesa che l'admin avvii l'asta.
      </div>
    );
  }

  if (state.currentAuction) {
    return <OnTheBlock state={state} myTeam={myTeam} socket={socket} />;
  }

  if (isAdmin) {
    return <NominationPicker state={state} socket={socket} />;
  }

  return (
    <div className="bg-pitch-900/60 border border-emerald-900 rounded-2xl p-8 text-center text-emerald-200/60">
      Nessun giocatore sul tavolo al momento. In attesa dell'admin...
    </div>
  );
}
