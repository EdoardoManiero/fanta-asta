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
      <div className="panel p-4">
        <div className="mb-3 text-sm text-ink-2">Sei l'organizzatore? Inserisci il codice admin.</div>
        <div className="flex gap-2">
          <input
            type="password"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            className="field"
            placeholder="codice admin"
          />
          <button
            onClick={() => onAuth(passcode)}
            className="btn btn-primary"
          >
            Sblocca
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="panel space-y-5 p-5">
      <div className="label">Pannello admin</div>

      {state.phase === 'lobby' && (
        <div className="space-y-2">
          <div className="text-sm text-ink-2">Regole, modificabili solo prima dell’inizio:</div>
          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            <label className="flex flex-col gap-1.5 text-ink-2">
              Budget
              <input type="number" className="field field-sm"
                value={cfg.budget} onChange={(e) => setCfg({ ...cfg, budget: Number(e.target.value) })} />
            </label>
            {ROLE_ORDER.map((r) => (
              <label key={r} className="flex flex-col gap-1.5 text-ink-2">
                Slot {r}
                <input type="number" className="field field-sm"
                  value={cfg.slots[r]} onChange={(e) => setCfg({ ...cfg, slots: { ...cfg.slots, [r]: Number(e.target.value) } })} />
              </label>
            ))}
            <label className="flex flex-col gap-1.5 text-ink-2">
              Timer (s)
              <input type="number" className="field field-sm"
                value={cfg.timerSeconds} onChange={(e) => setCfg({ ...cfg, timerSeconds: Number(e.target.value) })} />
            </label>
            <label className="flex flex-col gap-1.5 text-ink-2">
              Soft-close (s)
              <input type="number" className="field field-sm"
                value={cfg.softCloseSeconds} onChange={(e) => setCfg({ ...cfg, softCloseSeconds: Number(e.target.value) })} />
            </label>
          </div>
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => socket.emit('admin:setConfig', cfg)}
              className="btn btn-ghost"
            >
              Salva regole
            </button>
            <button
              onClick={() => socket.emit('admin:start')}
              className="btn btn-primary"
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
            <div className="text-sm text-ink-2">Impostazioni asta, modificabili in qualsiasi momento:</div>
            <div className="flex flex-wrap gap-3 items-end text-sm">
              <label className="flex flex-col gap-1">
                <span className="label">Timer (s)</span>
                <input type="number" min="1" className="field field-sm w-24"
                  value={cfg.timerSeconds}
                  onChange={(e) => setCfg({ ...cfg, timerSeconds: Number(e.target.value) })} />
              </label>
              <label className="flex flex-col gap-1">
                <span className="label">Soft-close (s)</span>
                <input type="number" min="0" className="field field-sm w-24"
                  value={cfg.softCloseSeconds}
                  onChange={(e) => setCfg({ ...cfg, softCloseSeconds: Number(e.target.value) })} />
              </label>
              <label className="flex flex-col gap-1">
                <span className="label">Rilancio minimo</span>
                <input type="number" min="1" className="field field-sm w-24"
                  value={cfg.minIncrement}
                  onChange={(e) => setCfg({ ...cfg, minIncrement: Number(e.target.value) })} />
              </label>
              <button
                onClick={() => socket.emit('admin:setConfig', {
                  timerSeconds: cfg.timerSeconds,
                  softCloseSeconds: cfg.softCloseSeconds,
                  minIncrement: cfg.minIncrement,
                })}
                className="btn btn-primary"
              >
                Salva impostazioni
              </button>
              <span className="label">
                in vigore: {state.config.timerSeconds}s · soft-close {state.config.softCloseSeconds}s ·
                rilancio min. {state.config.minIncrement}
              </span>
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              <span className="label">Timer di default:</span>
              {[-10, -5, +5, +10].map((d) => (
                <button
                  key={d}
                  onClick={() => {
                    const next = Math.max(1, state.config.timerSeconds + d);
                    setCfg((c) => ({ ...c, timerSeconds: next }));
                    socket.emit('admin:setConfig', { timerSeconds: next });
                  }}
                  className="btn btn-ghost btn-sm"
                >
                  {d > 0 ? `+${d}` : d}s
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-line pt-4 text-xs text-ink-3">
            Per chiamare il prossimo giocatore usa il pannello in alto (cerca il nome o lascia vuoto e premi
            "Chiama a caso").
          </div>

          <div className="space-y-2">
            <div className="text-sm text-ink-2">
              Giocatore sul tavolo{state.currentAuction ? '' : ', nessuno al momento'}:
            </div>
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => socket.emit('admin:startTimer', {})} disabled={!state.currentAuction}
                className="btn btn-ghost">
                Avvia timer
              </button>
              <button onClick={() => socket.emit('admin:pauseTimer')} disabled={!state.currentAuction}
                className="btn btn-ghost">
                Pausa timer
              </button>
              {[-10, -5, +5, +10].map((d) => (
                <button
                  key={d}
                  onClick={() => socket.emit('admin:adjustTimer', { seconds: d })}
                  disabled={!state.currentAuction}
                  title="Aggiunge o toglie secondi al conto alla rovescia in corso"
                  className="btn btn-ghost"
                >
                  {d > 0 ? `+${d}` : d}s
                </button>
              ))}
              <button onClick={() => socket.emit('admin:skip')} disabled={!state.currentAuction}
                className="btn btn-danger">
                Non assegnato
              </button>
            </div>
            <div className="flex gap-2 items-center flex-wrap">
              <select value={forceTeam} onChange={(e) => setForceTeam(e.target.value)} disabled={!state.currentAuction}
                className="field field-sm">
                <option value="">assegna manualmente a…</option>
                {Object.values(state.teams).map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              <input value={forcePrice} onChange={(e) => setForcePrice(e.target.value.replace(/\D/g, ''))}
                placeholder="prezzo" disabled={!state.currentAuction}
                className="field field-sm w-20" />
              <button
                disabled={!state.currentAuction || !forceTeam || !forcePrice}
                onClick={() => socket.emit('admin:forceAssign', { teamId: forceTeam, price: Number(forcePrice) })}
                className="btn btn-ghost"
              >
                Conferma assegnazione
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-line pt-4">
            <button onClick={() => socket.emit('admin:undoLast')}
              className="btn btn-ghost">
              Annulla ultima assegnazione
            </button>
            <span className="label">
              (scorciatoia: per rimuovere o modificare <b>qualsiasi</b> giocatore, usa "Gestione rose"
              qui sotto oppure clicca il giocatore in "Giocatori"/"Fasce Giocatori")
            </span>
            <button
              onClick={() => { if (confirm('Azzerare completamente l\'asta? Questa azione non si può annullare.')) socket.emit('admin:reset'); }}
              className="btn btn-danger ml-auto"
            >
              Reset asta
            </button>
          </div>

          <RosterManager state={state} socket={socket} />
        </>
      )}

      {state.phase === 'finished' && (
        <>
          <div className="text-sm text-free">Asta terminata: tutte le rose sono complete.</div>
          <RosterManager state={state} socket={socket} />
        </>
      )}
    </div>
  );
}
