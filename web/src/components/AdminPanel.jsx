import { useState } from 'react';
import { ROLE_ORDER } from '../format.js';
import RosterManager from './RosterManager.jsx';

export default function AdminPanel({ state, socket, isAdmin, onAuth }) {
  const [passcode, setPasscode] = useState('');
  const [cfg, setCfg] = useState(state.config);
  const [forceTeam, setForceTeam] = useState('');
  const [forcePrice, setForcePrice] = useState('');

  if (!isAdmin) {
    return (
      <div className="rounded-xl border border-emerald-900 bg-pitch-900/50 p-4">
        <div className="text-sm text-emerald-200/60 mb-2">Sei l'organizzatore? Inserisci il codice admin.</div>
        <div className="flex gap-2">
          <input
            type="password"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            className="rounded-lg bg-pitch-950 border border-emerald-900 px-3 py-1.5 text-sm outline-none focus:border-emerald-500"
            placeholder="codice admin"
          />
          <button
            onClick={() => onAuth(passcode)}
            className="rounded-lg bg-emerald-500 text-pitch-950 font-semibold px-3 py-1.5 text-sm hover:bg-emerald-400"
          >
            Sblocca
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-amber-700/50 bg-amber-500/5 p-4 space-y-4">
      <div className="text-xs font-bold text-amber-300 tracking-wide uppercase">Pannello admin</div>

      {state.phase === 'lobby' && (
        <div className="space-y-2">
          <div className="text-sm text-emerald-200/70">Regole (modificabili solo prima dell'inizio):</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
            <label className="flex flex-col gap-1">
              Budget
              <input type="number" className="bg-pitch-950 border border-emerald-900 rounded-md px-2 py-1"
                value={cfg.budget} onChange={(e) => setCfg({ ...cfg, budget: Number(e.target.value) })} />
            </label>
            {ROLE_ORDER.map((r) => (
              <label key={r} className="flex flex-col gap-1">
                Slot {r}
                <input type="number" className="bg-pitch-950 border border-emerald-900 rounded-md px-2 py-1"
                  value={cfg.slots[r]} onChange={(e) => setCfg({ ...cfg, slots: { ...cfg.slots, [r]: Number(e.target.value) } })} />
              </label>
            ))}
            <label className="flex flex-col gap-1">
              Timer (s)
              <input type="number" className="bg-pitch-950 border border-emerald-900 rounded-md px-2 py-1"
                value={cfg.timerSeconds} onChange={(e) => setCfg({ ...cfg, timerSeconds: Number(e.target.value) })} />
            </label>
            <label className="flex flex-col gap-1">
              Soft-close (s)
              <input type="number" className="bg-pitch-950 border border-emerald-900 rounded-md px-2 py-1"
                value={cfg.softCloseSeconds} onChange={(e) => setCfg({ ...cfg, softCloseSeconds: Number(e.target.value) })} />
            </label>
          </div>
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => socket.emit('admin:setConfig', cfg)}
              className="rounded-lg border border-emerald-700 px-3 py-1.5 text-sm hover:border-emerald-400"
            >
              Salva regole
            </button>
            <button
              onClick={() => socket.emit('admin:start')}
              className="rounded-lg bg-emerald-500 text-pitch-950 font-semibold px-3 py-1.5 text-sm hover:bg-emerald-400"
            >
              Avvia asta
            </button>
          </div>
        </div>
      )}

      {state.phase === 'live' && (
        <>
          {/* Timing rules: adjustable at any moment, not just before the start. */}
          <div className="space-y-2">
            <div className="text-sm text-emerald-200/70">Impostazioni asta (modificabili in qualsiasi momento):</div>
            <div className="flex flex-wrap gap-3 items-end text-sm">
              <label className="flex flex-col gap-1">
                <span className="text-xs text-emerald-200/50">Timer (s)</span>
                <input type="number" min="1" className="w-24 bg-pitch-950 border border-emerald-900 rounded-md px-2 py-1"
                  value={cfg.timerSeconds}
                  onChange={(e) => setCfg({ ...cfg, timerSeconds: Number(e.target.value) })} />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-emerald-200/50">Soft-close (s)</span>
                <input type="number" min="0" className="w-24 bg-pitch-950 border border-emerald-900 rounded-md px-2 py-1"
                  value={cfg.softCloseSeconds}
                  onChange={(e) => setCfg({ ...cfg, softCloseSeconds: Number(e.target.value) })} />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-emerald-200/50">Rilancio minimo</span>
                <input type="number" min="1" className="w-24 bg-pitch-950 border border-emerald-900 rounded-md px-2 py-1"
                  value={cfg.minIncrement}
                  onChange={(e) => setCfg({ ...cfg, minIncrement: Number(e.target.value) })} />
              </label>
              <button
                onClick={() => socket.emit('admin:setConfig', {
                  timerSeconds: cfg.timerSeconds,
                  softCloseSeconds: cfg.softCloseSeconds,
                  minIncrement: cfg.minIncrement,
                })}
                className="rounded-lg bg-emerald-500 text-pitch-950 font-semibold px-3 py-1.5 text-sm hover:bg-emerald-400"
              >
                Salva impostazioni
              </button>
              <span className="text-xs text-emerald-200/40">
                in vigore: {state.config.timerSeconds}s · soft-close {state.config.softCloseSeconds}s ·
                rilancio min. {state.config.minIncrement}
              </span>
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-xs text-emerald-200/50">Timer di default:</span>
              {[-10, -5, +5, +10].map((d) => (
                <button
                  key={d}
                  onClick={() => {
                    const next = Math.max(1, state.config.timerSeconds + d);
                    setCfg((c) => ({ ...c, timerSeconds: next }));
                    socket.emit('admin:setConfig', { timerSeconds: next });
                  }}
                  className="rounded-lg border border-emerald-700 px-2.5 py-1 text-xs hover:border-emerald-400"
                >
                  {d > 0 ? `+${d}` : d}s
                </button>
              ))}
            </div>
          </div>

          <div className="text-xs text-emerald-200/40 border-t border-amber-700/30 pt-3">
            Per chiamare il prossimo giocatore usa il pannello in alto (cerca il nome o lascia vuoto e premi
            "Chiama a caso").
          </div>

          <div className="space-y-2">
            <div className="text-sm text-emerald-200/70">
              Giocatore sul tavolo{state.currentAuction ? '' : ' — nessuno al momento'}:
            </div>
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => socket.emit('admin:startTimer', {})} disabled={!state.currentAuction}
                className="rounded-lg border border-emerald-700 px-3 py-1.5 text-sm hover:border-emerald-400 disabled:opacity-30">
                Avvia timer
              </button>
              <button onClick={() => socket.emit('admin:pauseTimer')} disabled={!state.currentAuction}
                className="rounded-lg border border-emerald-700 px-3 py-1.5 text-sm hover:border-emerald-400 disabled:opacity-30">
                Pausa timer
              </button>
              {[-10, -5, +5, +10].map((d) => (
                <button
                  key={d}
                  onClick={() => socket.emit('admin:adjustTimer', { seconds: d })}
                  disabled={!state.currentAuction}
                  title="Aggiunge o toglie secondi al conto alla rovescia in corso"
                  className="rounded-lg border border-emerald-700 px-2.5 py-1.5 text-sm hover:border-emerald-400 disabled:opacity-30"
                >
                  {d > 0 ? `+${d}` : d}s
                </button>
              ))}
              <button onClick={() => socket.emit('admin:skip')} disabled={!state.currentAuction}
                className="rounded-lg border border-rose-700 text-rose-300 px-3 py-1.5 text-sm hover:border-rose-400 disabled:opacity-30">
                Non assegnato
              </button>
            </div>
            <div className="flex gap-2 items-center flex-wrap">
              <select value={forceTeam} onChange={(e) => setForceTeam(e.target.value)} disabled={!state.currentAuction}
                className="bg-pitch-950 border border-emerald-900 rounded-md px-2 py-1.5 text-sm disabled:opacity-30">
                <option value="">assegna manualmente a...</option>
                {Object.values(state.teams).map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              <input value={forcePrice} onChange={(e) => setForcePrice(e.target.value.replace(/\D/g, ''))}
                placeholder="prezzo" disabled={!state.currentAuction}
                className="w-20 bg-pitch-950 border border-emerald-900 rounded-md px-2 py-1.5 text-sm disabled:opacity-30" />
              <button
                disabled={!state.currentAuction || !forceTeam || !forcePrice}
                onClick={() => socket.emit('admin:forceAssign', { teamId: forceTeam, price: Number(forcePrice) })}
                className="rounded-lg border border-emerald-700 px-3 py-1.5 text-sm hover:border-emerald-400 disabled:opacity-30"
              >
                Conferma assegnazione
              </button>
            </div>
          </div>

          <div className="flex gap-2 border-t border-amber-700/30 pt-3 flex-wrap items-center">
            <button onClick={() => socket.emit('admin:undoLast')}
              className="rounded-lg border border-emerald-700 px-3 py-1.5 text-sm hover:border-emerald-400">
              Annulla ultima assegnazione
            </button>
            <span className="text-xs text-emerald-200/40">
              (scorciatoia: per rimuovere o modificare <b>qualsiasi</b> giocatore, usa "Gestione rose"
              qui sotto oppure clicca il giocatore in "Giocatori"/"Fasce Giocatori")
            </span>
            <button
              onClick={() => { if (confirm('Azzerare completamente l\'asta? Questa azione non si può annullare.')) socket.emit('admin:reset'); }}
              className="rounded-lg border border-rose-700 text-rose-300 px-3 py-1.5 text-sm hover:border-rose-400 ml-auto"
            >
              Reset asta
            </button>
          </div>

          <RosterManager state={state} socket={socket} />
        </>
      )}

      {state.phase === 'finished' && (
        <>
          <div className="text-emerald-300 text-sm">Asta terminata: tutte le rose sono complete.</div>
          <RosterManager state={state} socket={socket} />
        </>
      )}
    </div>
  );
}
