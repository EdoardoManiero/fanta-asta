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
    return <div className="min-h-screen flex items-center justify-center text-emerald-200/60">Connessione in corso...</div>;
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
    <div className="min-h-screen bg-pitch-950 text-emerald-50">
      <header className="border-b border-emerald-900 px-4 sm:px-8 py-3 flex items-center gap-4 sticky top-0 bg-pitch-950/95 backdrop-blur z-10">
        <div className="font-black tracking-tight text-lg">⚽ Asta Classic</div>
        <div className="ml-auto flex items-center gap-3 text-sm">
          <span className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-400' : 'bg-rose-500'}`} />
          {myTeam ? (
            <span className="text-emerald-200/80">{myTeam.name}</span>
          ) : (
            <span className="text-emerald-200/40">spettatore</span>
          )}
          {isAdmin && <span className="text-amber-300 text-xs font-bold uppercase tracking-wide">Admin</span>}
        </div>
      </header>

      {toast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 bg-rose-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 text-sm">
          {toast}
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-6">
        {!myTeam && state.phase !== 'finished' && <Join state={state} onClaim={handleClaim} />}

        {(myTeam || state.phase === 'finished') && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr_300px] gap-4 mb-6">
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

            <nav className="flex gap-1 mb-5 overflow-x-auto">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${
                    tab === t.key ? 'bg-emerald-500 text-pitch-950' : 'text-emerald-200/60 hover:bg-pitch-900'
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
        teamName={selectedPlayerTeamName}
        onClose={() => setSelectedPlayerId(null)}
      />
    </div>
  );
}
