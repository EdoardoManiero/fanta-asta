import { useEffect, useRef, useState } from 'react';
import { createSocket, getClientId } from './socket.js';
import Join from './components/Join.jsx';
import TeamsSidebar from './components/TeamsSidebar.jsx';
import CenterAuctionPanel from './components/CenterAuctionPanel.jsx';
import InsightPanel from './components/InsightPanel.jsx';
import BoardTab from './components/BoardTab.jsx';
import PlayerDatabase from './components/PlayerDatabase.jsx';
import FasceGiocatori from './components/FasceGiocatori.jsx';
import EventLog from './components/EventLog.jsx';
import AdminPanel from './components/AdminPanel.jsx';
import PlayerDetailModal from './components/PlayerDetailModal.jsx';
import SaleResultModal from './components/SaleResultModal.jsx';

const clientId = getClientId();

export default function App() {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [state, setState] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [toast, setToast] = useState(null);
  const [tab, setTab] = useState('rose');
  const [selectedPlayerId, setSelectedPlayerId] = useState(null);
  const [sale, setSale] = useState(null);
  const lastHistoryLen = useRef(null);

  useEffect(() => {
    const socket = createSocket();
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('hello', { clientId });
      const savedPasscode = localStorage.getItem('asta_admin_passcode');
      if (savedPasscode) socket.emit('admin:auth', { passcode: savedPasscode });
    });
    socket.on('disconnect', () => setConnected(false));
    socket.on('state', (s) => {
      // announce a sale the moment the history grows (never on first load,
      // and never when history shrinks after an undo/reset)
      const len = s.history.length;
      if (lastHistoryLen.current != null && len > lastHistoryLen.current) {
        setSale(s.history[len - 1]);
      }
      lastHistoryLen.current = len;
      setState(s);
    });
    socket.on('admin:ok', () => setIsAdmin(true));
    socket.on('error', ({ message }) => {
      setToast(message);
      setTimeout(() => setToast(null), 3500);
    });

    return () => socket.disconnect();
  }, []);

  if (!state) {
    return <div className="min-h-screen flex items-center justify-center text-ink-3">Connessione in corso…</div>;
  }

  const myTeam = Object.values(state.teams).find((t) => t.ownerClientId === clientId) || null;

  const handleAuth = (passcode) => {
    localStorage.setItem('asta_admin_passcode', passcode);
    socketRef.current.emit('admin:auth', { passcode });
  };

  const handleClaim = (teamId, name) => {
    socketRef.current.emit('team:claim', { teamId, label: name });
  };

  const handleNominate = (playerId) => {
    socketRef.current.emit('admin:nominate', { playerId });
  };

  const selectedPlayer = selectedPlayerId ? state.players.find((p) => p.id === selectedPlayerId) : null;
  const selectedPlayerTeamName = selectedPlayer?.soldTo ? state.teams[selectedPlayer.soldTo]?.name : null;

  const TABS = [
    { key: 'rose', label: 'Rose Squadre' },
    { key: 'giocatori', label: 'Giocatori' },
    { key: 'fasce', label: 'Fasce Giocatori' },
    { key: 'admin', label: 'Admin' },
    { key: 'log', label: 'Log' },
  ];

  return (
    <div className="min-h-screen bg-ground text-ink">
      <header className="sticky top-0 z-10 flex items-center gap-4 border-b border-line bg-ground px-4 py-3 sm:px-6">
        <div className="font-display text-md font-bold tracking-tight">
          Asta <span className="font-medium text-ink-3">Classic</span>
        </div>
        <div className="ml-auto flex items-center gap-3 text-xs">
          {isAdmin && <span className="chip">Admin</span>}
          <span className="text-ink-2">{myTeam ? myTeam.name : 'spettatore'}</span>
          <span className="flex items-center gap-1.5 text-ink-3">
            <span className={`h-1.5 w-1.5 rounded-full ${connected ? 'bg-free' : 'bg-danger'}`} />
            {connected ? 'in linea' : 'disconnesso'}
          </span>
        </div>
      </header>

      {toast && (
        <div className="panel shadow-overlay fixed left-1/2 top-14 z-50 max-w-sm -translate-x-1/2 px-4 py-3">
          <div className="label text-danger">Errore</div>
          <div className="mt-0.5 text-sm text-ink">{toast}</div>
        </div>
      )}

      <main className={`mx-auto max-w-shell px-4 py-6 sm:px-6 ${state.currentAuction ? 'pb-36' : ''}`}>
        {!myTeam && state.phase !== 'finished' && <Join state={state} onClaim={handleClaim} />}

        {(myTeam || state.phase === 'finished') && (
          <>
            <div className="mb-6 grid grid-cols-1 items-start gap-3 lg:grid-cols-[212px_1fr_284px]">
              <TeamsSidebar state={state} myTeamId={myTeam?.id} />
              <CenterAuctionPanel
                state={state}
                myTeam={myTeam}
                isAdmin={isAdmin}
                socket={socketRef.current}
                onSelectPlayer={setSelectedPlayerId}
              />
              <InsightPanel state={state} />
            </div>

            <nav className="mb-6 flex gap-6 overflow-x-auto border-b border-line">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`-mb-px whitespace-nowrap border-b-2 pb-2.5 text-sm font-medium transition-colors ${
                    tab === t.key
                      ? 'border-live text-ink'
                      : 'border-transparent text-ink-3 hover:text-ink-2'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </nav>

            {tab === 'rose' && <BoardTab state={state} myTeamId={myTeam?.id} />}

            {tab === 'giocatori' && (
              <PlayerDatabase
                state={state}
                isAdmin={isAdmin}
                onNominate={handleNominate}
                onSelectPlayer={setSelectedPlayerId}
              />
            )}

            {tab === 'fasce' && (
              <FasceGiocatori
                state={state}
                isAdmin={isAdmin}
                socket={socketRef.current}
                onSelectPlayer={setSelectedPlayerId}
              />
            )}

            {tab === 'admin' && (
              <AdminPanel state={state} socket={socketRef.current} isAdmin={isAdmin} onAuth={handleAuth} />
            )}

            {tab === 'log' && <EventLog state={state} />}
          </>
        )}
      </main>

      <SaleResultModal
        sale={sale}
        player={sale ? state.players.find((p) => p.id === sale.playerId) : null}
        isMine={Boolean(sale && myTeam && sale.teamId === myTeam.id)}
        onClose={() => setSale(null)}
      />

      <PlayerDetailModal
        player={selectedPlayer}
        players={state.players}
        teams={state.teams}
        teamName={selectedPlayerTeamName}
        isAdmin={isAdmin}
        socket={socketRef.current}
        onClose={() => setSelectedPlayerId(null)}
      />
    </div>
  );
}
