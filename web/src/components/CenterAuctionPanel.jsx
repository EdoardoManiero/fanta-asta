import { useEffect, useMemo, useState } from 'react';
import PlayerAvatar from './PlayerAvatar.jsx';
import PlayerSearchInput from './PlayerSearchInput.jsx';
import StatHeatmap, { heatmapKeys } from './StatHeatmap.jsx';
import { ROLE_ORDER, fmtSecs, isTarget } from '../format.js';

function NominationPicker({ state, socket }) {
  const [role, setRole] = useState('TUTTI');
  const [pickedId, setPickedId] = useState('');
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignTeam, setAssignTeam] = useState('');
  const [assignPrice, setAssignPrice] = useState('');

  const availableCount = useMemo(() => state.players.filter(
    (p) => p.status === 'available' && (role === 'TUTTI' || p.ruolo === role)
  ).length, [state.players, role]);

  const picked = pickedId ? state.players.find((p) => p.id === pickedId) : null;

  const chiama = () => {
    if (picked) socket.emit('admin:nominate', { playerId: picked.id });
    else socket.emit('admin:nominateRandom', { role: role === 'TUTTI' ? undefined : role });
    setPickedId('');
  };

  const assegna = () => {
    if (!picked || !assignTeam || !assignPrice) return;
    socket.emit('admin:quickAssign', { playerId: picked.id, teamId: assignTeam, price: Number(assignPrice) });
    setAssignOpen(false);
    setAssignPrice('');
    setPickedId('');
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
      <PlayerSearchInput
        players={state.players}
        value={pickedId}
        onSelect={setPickedId}
        placeholder="Cerca giocatore (suggerimenti per quotazione)..."
        filter={(p) => p.status === 'available' && (role === 'TUTTI' || p.ruolo === role)}
      />
      <div className="text-xs text-emerald-200/40">{availableCount} giocatori disponibili nel filtro</div>

      {!assignOpen ? (
        <div className="flex gap-2 mt-auto pt-2">
          <button
            onClick={chiama}
            className="flex-1 rounded-lg bg-emerald-500 text-pitch-950 font-bold py-2.5 hover:bg-emerald-400"
          >
            {picked ? `Chiama ${picked.nome}` : 'Chiama a caso'}
          </button>
          <button
            disabled={!picked}
            onClick={() => setAssignOpen(true)}
            className="rounded-lg border border-emerald-700 px-4 py-2.5 text-sm hover:border-emerald-400 disabled:opacity-30"
          >
            Assegna
          </button>
        </div>
      ) : (
        <div className="border-t border-emerald-900/60 pt-3 flex flex-col gap-2">
          <div className="text-sm text-emerald-200/70">Assegna {picked?.nome} direttamente (senza asta live):</div>
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

function Dots({ value }) {
  return (
    <span className="inline-flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} className={`w-2 h-2 rounded-full ${i < value ? 'bg-emerald-400' : 'bg-emerald-900'}`} />
      ))}
    </span>
  );
}

// Only the stats the heat map does NOT already rank, and only when they carry a
// value - so nothing is printed twice and goalkeepers don't show a row of zeros.
const ALL_STATS = [
  { key: 'presenze', label: 'Presenze' },
  { key: 'minuti', label: 'Minuti' },
  { key: 'puntiTitolare', label: 'Da titolare' },
  { key: 'mv', label: 'MV' },
  { key: 'fmv', label: 'FMV' },
  { key: 'fmvExp', label: 'FM attesa' },
  { key: 'gol', label: 'Gol' },
  { key: 'assist', label: 'Assist' },
  { key: 'ammonizioni', label: 'Ammonizioni' },
  { key: 'espulsioni', label: 'Espulsioni' },
  { key: 'rigSegnati', label: 'Rig. segnati' },
  { key: 'rigSbagliati', label: 'Rig. sbagliati' },
  { key: 'golSubiti', label: 'Gol subiti' },
  { key: 'rigParati', label: 'Rig. parati' },
];

const extraStats = (p) => {
  const ranked = new Set(heatmapKeys(p.ruolo));
  return ALL_STATS
    .filter((s) => !ranked.has(s.key))
    .map((s) => ({ label: s.label, value: p[s.key] }))
    .filter((s) => s.value);
};

function OnTheBlock({ state, myTeam, socket, onSelectPlayer }) {
  const ca = state.currentAuction;
  const [now, setNow] = useState(Date.now());
  const [customAmount, setCustomAmount] = useState('');
  const [statsOpen, setStatsOpen] = useState(true);

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
    // Tag the bid with the round it was made in: if a slow connection delays
    // it past the end of this round, the server rejects it instead of
    // applying it to the next player.
    socket.emit('bid', { teamId: myTeam.id, amount, playerId: player.id, auctionId: ca.auctionId });
  };

  return (
    <div className="bg-pitch-900/60 border border-emerald-900 rounded-2xl p-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <button onClick={() => onSelectPlayer(player.id)} className="flex items-center gap-3 text-left">
          <PlayerAvatar player={player} size="lg" />
          <div>
            <div className="text-2xl font-bold flex items-center gap-2">
              {isTarget(player) && <span className="text-amber-300" title="Nel tuo mirino">★</span>}
              {player.nome}
            </div>
            <div className="text-emerald-200/60 text-sm">
              {player.squadra} · Fascia {player.fascia} · Quot. {player.quotazione} · Consigliato {player.prezzoConsigliato}
            </div>
          </div>
        </button>
        <div className="text-right">
          <div className={`text-3xl font-mono font-bold ${msLeft != null && msLeft < 5000 ? 'text-rose-400' : ''}`}>
            {ca.timerEndsAt ? fmtSecs(msLeft) : '—'}
          </div>
          <div className="text-xs text-emerald-200/50">tempo rimanente</div>
        </div>
      </div>

      {player.note?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {player.note.map((n) => (
            <span key={n} className="text-xs bg-pitch-950 border border-emerald-900 rounded-full px-2.5 py-1 text-emerald-200/60">
              {n}
            </span>
          ))}
        </div>
      )}

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

      {/* Fixed action bar: the raise buttons must stay reachable at all times
          during a live auction, however far the stats below are scrolled.
          (A sticky bar inside the card unsticks once the card scrolls past.) */}
      <div className="fixed bottom-0 inset-x-0 z-40 bg-pitch-950/95 backdrop-blur border-t border-emerald-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-emerald-200/60 mr-1">
              <span className="font-semibold text-emerald-100">{player.nome}</span>
              {' · '}offerta <span className="font-mono text-emerald-300">{ca.currentBid || 0}</span>
              {currentBidder ? ` · ${currentBidder.name}` : ''}
            </span>
            <button
              onClick={() => placeBid(minBid)}
              disabled={!canBid}
              title={!myTeam ? 'Entra in una squadra per offrire' : (!canBid ? `Reparto ${player.ruolo} già completo` : '')}
              className="rounded-lg bg-emerald-500 text-pitch-950 font-bold px-4 py-2 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              +{state.config.minIncrement} → {minBid}
            </button>
            {[5, 10, 25].map((inc) => (
              <button
                key={inc}
                onClick={() => placeBid(ca.currentBid + inc)}
                disabled={!canBid}
                className="rounded-lg border border-emerald-700 px-3 py-2 text-sm hover:border-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                +{inc}
              </button>
            ))}
            <input
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value.replace(/\D/g, ''))}
              placeholder="importo"
              disabled={!canBid}
              className="w-24 rounded-lg bg-pitch-900 border border-emerald-900 px-2 py-2 text-sm outline-none focus:border-emerald-500 disabled:opacity-40"
            />
            <button
              onClick={() => customAmount && placeBid(Number(customAmount))}
              disabled={!canBid}
              className="rounded-lg border border-emerald-700 px-3 py-2 text-sm hover:border-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Offri importo
            </button>
            <div className="ml-auto flex items-center gap-3">
              {myTeam && (
                <span className="text-sm text-emerald-200/60">
                  Budget: <span className="font-semibold text-emerald-200">{myTeam.budget}</span>
                </span>
              )}
              <span className={`font-mono font-bold text-lg ${msLeft != null && msLeft < 5000 ? 'text-rose-400' : 'text-emerald-200/70'}`}>
                {ca.timerEndsAt ? fmtSecs(msLeft) : '—'}
              </span>
            </div>
          </div>
          {!myTeam && (
            <div className="text-xs text-emerald-200/50 pt-1">Entra in una squadra per poter offrire.</div>
          )}
          {myTeam && !canBid && (
            <div className="text-xs text-amber-300/80 pt-1">
              Reparto {player.ruolo} già completo per la tua squadra: non puoi offrire.
            </div>
          )}
        </div>
      </div>

      <div className="mt-5 border-t border-emerald-900/60 pt-4">
        <button
          onClick={() => setStatsOpen((v) => !v)}
          className="w-full flex items-center justify-between text-xs font-bold uppercase tracking-wide text-emerald-200/50 hover:text-emerald-200/80"
        >
          <span>Statistiche stagione scorsa</span>
          <span>{statsOpen ? '▾' : '▸'}</span>
        </button>

        {statsOpen && (
          <div className="mt-3 space-y-3">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm bg-pitch-950/60 rounded-lg px-3 py-2">
              <span className="flex items-center gap-2">Titolarità <Dots value={player.titolarita} /></span>
              <span className="flex items-center gap-2">Affidabilità <Dots value={player.affidabilita} /></span>
              <span className="flex items-center gap-2">Integrità <Dots value={player.integrita} /></span>
              <span className="text-emerald-200/50">PMA <span className="font-mono text-emerald-200/80">{player.pma}</span></span>
            </div>

            <StatHeatmap player={player} players={state.players} />

            {extraStats(player).length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 text-sm">
              {extraStats(player).map((st) => (
                <div key={st.label} className="bg-pitch-950/60 rounded-lg px-2.5 py-1.5">
                  <div className="text-[10px] uppercase tracking-wide text-emerald-200/40 truncate">{st.label}</div>
                  <div className="font-mono font-semibold">{st.value}</div>
                </div>
              ))}
            </div>
            )}

            {player.commento && (
              <div className="text-sm text-emerald-200/60 whitespace-pre-line bg-pitch-950/60 rounded-lg px-3 py-2">
                {player.commento}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function CenterAuctionPanel({ state, myTeam, isAdmin, socket, onSelectPlayer }) {
  if (state.phase === 'lobby') {
    return (
      <div className="bg-pitch-900/60 border border-emerald-900 rounded-2xl p-8 text-center text-emerald-200/60">
        In attesa che l'admin avvii l'asta.
      </div>
    );
  }

  if (state.currentAuction) {
    return <OnTheBlock state={state} myTeam={myTeam} socket={socket} onSelectPlayer={onSelectPlayer} />;
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
