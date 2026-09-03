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
    <div className="panel flex flex-col gap-4 p-5">
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setRole('TUTTI')}
          className={`rounded border px-3 py-1.5 text-sm font-semibold transition-colors ${
            role === 'TUTTI'
              ? 'border-live bg-surface-2 text-ink'
              : 'border-line text-ink-3 hover:border-line-strong hover:text-ink'
          }`}
        >
          TUTTI
        </button>
        {ROLE_ORDER.map((r) => (
          <button
            key={r}
            onClick={() => setRole(r)}
            className={`w-9 rounded border py-1.5 text-sm font-semibold transition-colors ${
              role === r
                ? 'border-live bg-surface-2 text-ink'
                : 'border-line text-ink-3 hover:border-line-strong hover:text-ink'
            }`}
          >
            {r}
          </button>
        ))}
      </div>
      <PlayerSearchInput
        players={state.players}
        value={pickedId}
        onSelect={setPickedId}
        placeholder="Cerca giocatore (ordinati per quotazione)…"
        filter={(p) => p.status === 'available' && (role === 'TUTTI' || p.ruolo === role)}
      />
      <div className="text-xs text-ink-3">{availableCount} giocatori disponibili nel filtro</div>

      {!assignOpen ? (
        <div className="flex gap-2 mt-auto pt-2">
          <button
            onClick={chiama}
            className="btn btn-primary flex-1"
          >
            {picked ? `Chiama ${picked.nome}` : 'Chiama a caso'}
          </button>
          <button
            disabled={!picked}
            onClick={() => setAssignOpen(true)}
            className="btn btn-ghost"
          >
            Assegna
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2 border-t border-line pt-4">
          <div className="text-sm text-ink-2">Assegna {picked?.nome} direttamente (senza asta live):</div>
          <div className="flex gap-2 flex-wrap">
            <select value={assignTeam} onChange={(e) => setAssignTeam(e.target.value)}
              className="field field-sm">
              <option value="">a quale squadra?</option>
              {Object.values(state.teams).map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            <input value={assignPrice} onChange={(e) => setAssignPrice(e.target.value.replace(/\D/g, ''))}
              placeholder="prezzo" className="field field-sm w-24" />
            <button onClick={assegna} disabled={!assignTeam || !assignPrice}
              className="btn btn-primary">
              Conferma
            </button>
            <button onClick={() => setAssignOpen(false)} className="text-sm text-ink-3 px-2">
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
        <span key={i} className={`h-1.5 w-1.5 rounded-full ${i < value ? 'bg-ink' : 'bg-line-strong'}`} />
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
    <div className="panel p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <button onClick={() => onSelectPlayer(player.id)} className="flex items-center gap-3 text-left hover:opacity-90">
          <PlayerAvatar player={player} size="lg" />
          <div>
            <div className="flex items-center gap-2 font-display text-xl font-bold">
              {isTarget(player) && <span className="text-warn" title="Nel tuo mirino">★</span>}
              {player.nome}
            </div>
            <div className="mt-0.5 text-xs text-ink-2">
              {player.squadra} · Fascia {player.fascia} · Quot.{' '}
              <span className="num">{player.quotazione}</span> · Consigliato{' '}
              <span className="num">{player.prezzoConsigliato}</span>
            </div>
          </div>
        </button>
        <div className="text-right">
          <div
            className={`num text-2xl font-semibold leading-none ${
              msLeft != null && msLeft < 5000 ? 'text-warn' : 'text-ink'
            }`}
          >
            {ca.timerEndsAt ? fmtSecs(msLeft) : '—'}
          </div>
          <div className="label mt-1">tempo rimanente</div>
        </div>
      </div>

      {player.note?.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {player.note.map((n) => (
            <span key={n} className="chip">
              {n}
            </span>
          ))}
        </div>
      )}

      <div className="panel-inset mt-5 flex items-end justify-between px-4 py-3.5">
        <div>
          <div className="label">Offerta attuale</div>
          <div className="num mt-1 text-2xl font-semibold leading-none text-ink">{ca.currentBid || 0}</div>
        </div>
        <div className="text-right">
          <div className="label">Miglior offerente</div>
          <div className="mt-1 font-semibold text-ink">{currentBidder ? currentBidder.name : '—'}</div>
        </div>
      </div>

      {/* Fixed action bar: the raise buttons must stay reachable at all times
          during a live auction, however far the stats below are scrolled.
          (A sticky bar inside the card unsticks once the card scrolls past.) */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-ground">
        <div className="mx-auto max-w-shell px-4 py-3 sm:px-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 text-xs text-ink-2">
              <span className="font-semibold text-ink">{player.nome}</span> · offerta{' '}
              <span className="num font-semibold text-ink">{ca.currentBid || 0}</span>
              {currentBidder ? ` · ${currentBidder.name}` : ''}
            </span>
            <button
              onClick={() => placeBid(minBid)}
              disabled={!canBid}
              title={!myTeam ? 'Entra in una squadra per offrire' : (!canBid ? `Reparto ${player.ruolo} già completo` : '')}
              className="btn btn-primary"
            >
              +{state.config.minIncrement} → {minBid}
            </button>
            {[5, 10, 25].map((inc) => (
              <button
                key={inc}
                onClick={() => placeBid(ca.currentBid + inc)}
                disabled={!canBid}
                className="btn btn-ghost"
              >
                +{inc}
              </button>
            ))}
            <input
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value.replace(/\D/g, ''))}
              placeholder="importo"
              disabled={!canBid}
              className="field num w-24"
            />
            <button
              onClick={() => customAmount && placeBid(Number(customAmount))}
              disabled={!canBid}
              className="btn btn-ghost"
            >
              Offri importo
            </button>
            <div className="ml-auto flex items-center gap-3">
              {myTeam && (
                <span className="text-sm text-ink-2">
                  Budget: <span className="font-semibold text-ink">{myTeam.budget}</span>
                </span>
              )}
              <span
                className={`num text-md font-semibold leading-none ${
                  msLeft != null && msLeft < 5000 ? 'text-warn' : 'text-ink'
                }`}
              >
                {ca.timerEndsAt ? fmtSecs(msLeft) : '—'}
              </span>
            </div>
          </div>
          {!myTeam && (
            <div className="pt-1.5 text-xs text-ink-3">Entra in una squadra per poter offrire.</div>
          )}
          {myTeam && !canBid && (
            <div className="pt-1.5 text-xs text-warn">
              Reparto {player.ruolo} già completo per la tua squadra: non puoi offrire.
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 border-t border-line pt-4">
        <button
          onClick={() => setStatsOpen((v) => !v)}
          className="label flex w-full items-center justify-between hover:text-ink-2"
        >
          <span>Statistiche stagione scorsa</span>
          <span>{statsOpen ? '▾' : '▸'}</span>
        </button>

        {statsOpen && (
          <div className="mt-3 space-y-3">
            <div className="panel-inset flex flex-wrap items-center gap-x-6 gap-y-2 px-3 py-2.5 text-sm">
              <span className="flex items-center gap-2">Titolarità <Dots value={player.titolarita} /></span>
              <span className="flex items-center gap-2">Affidabilità <Dots value={player.affidabilita} /></span>
              <span className="flex items-center gap-2">Integrità <Dots value={player.integrita} /></span>
              <span className="text-ink-3">PMA <span className="num text-ink">{player.pma}</span></span>
            </div>

            <StatHeatmap player={player} players={state.players} />

            {extraStats(player).length > 0 && (
            <div className="grid grid-cols-3 gap-1 text-sm sm:grid-cols-4">
              {extraStats(player).map((st) => (
                <div key={st.label} className="panel-inset px-2.5 py-2">
                  <div className="truncate text-2xs text-ink-3">{st.label}</div>
                  <div className="num font-semibold text-ink">{st.value}</div>
                </div>
              ))}
            </div>
            )}

            {player.commento && (
              <div className="panel-inset whitespace-pre-line px-3 py-2.5 text-sm text-ink-2">
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
      <div className="panel flex min-h-[180px] items-center justify-center p-8 text-center text-sm text-ink-3">
        In attesa che l’admin avvii l’asta.
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
    <div className="panel flex min-h-[180px] items-center justify-center p-8 text-center text-sm text-ink-3">
      Nessun giocatore sul tavolo. In attesa dell’admin.
    </div>
  );
}
