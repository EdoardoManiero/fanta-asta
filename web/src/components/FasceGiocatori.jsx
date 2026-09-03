import { useMemo, useRef, useState } from 'react';
import PlayerAvatar from './PlayerAvatar.jsx';
import { ROLE_ORDER, fasciaRank, isTarget } from '../format.js';

export default function FasceGiocatori({ state, isAdmin, socket, onSelectPlayer }) {
  const [role, setRole] = useState('P');
  const [query, setQuery] = useState('');
  const [label, setLabel] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState(null);
  const fileRef = useRef(null);

  const players = useMemo(() => {
    let list = state.players.filter((p) => p.ruolo === role);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter((p) => p.nome.toLowerCase().includes(q));
    }
    return [...list].sort((a, b) => fasciaRank(a.fascia) - fasciaRank(b.fascia) || a.nome.localeCompare(b.nome));
  }, [state.players, role, query]);

  const sources = state.fasceSources || [];
  const isGk = role === 'P';

  const handleUpload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadMsg(null);
    try {
      const passcode = localStorage.getItem('asta_admin_passcode') || '';
      const form = new FormData();
      form.append('file', file);
      form.append('label', label || file.name);
      const res = await fetch('/api/fasce/upload', {
        method: 'POST',
        headers: { 'x-admin-passcode': passcode },
        body: form,
      });
      const data = await res.json();
      if (!res.ok) {
        setUploadMsg({ ok: false, text: data.error || 'Errore durante il caricamento.' });
      } else {
        setUploadMsg({
          ok: true,
          text: `"${data.source.label}": ${data.source.matchedCount} abbinati, ${data.source.unmatchedCount} non trovati.`,
        });
        setLabel('');
        fileRef.current.value = '';
      }
    } catch {
      setUploadMsg({ ok: false, text: 'Errore di rete durante il caricamento.' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      {isAdmin && (
        <div className="panel mb-6 p-4">
          <div className="label mb-2 text-warn">Carica altre fasce</div>
          <p className="text-xs text-ink-3 mb-3">
            Carica un file Excel con lo stesso formato (colonne Ruolo/Nome/Squadra/Fascia, un foglio per
            ruolo o con colonna Ruolo) per confrontare le fasce di altre fonti/esperti.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <input type="file" accept=".xlsx,.xls" ref={fileRef} className="text-sm text-ink-2" />
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="nome fonte (es. Esperto X)"
              className="field"
            />
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="btn btn-primary"
            >
              {uploading ? 'Caricamento…' : 'Carica'}
            </button>
          </div>
          {uploadMsg && (
            <div className={`mt-2 text-sm ${uploadMsg.ok ? 'text-free' : 'text-danger'}`}>{uploadMsg.text}</div>
          )}
          {sources.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {sources.map((s) => (
                <span key={s.id} className="chip">
                  {s.label} ({s.matchedCount})
                  <button
                    onClick={() => socket.emit('admin:removeFasceSource', { id: s.id })}
                    className="text-ink-3 hover:text-danger"
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-2">
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
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cerca nome…"
          className="field min-w-[160px] flex-1"
        />
      </div>

      <div className="panel overflow-x-auto">
        <table className="tbl tbl-rows">
          <thead>
            <tr>
              <th></th>
              <th>Nome</th>
              <th>Sq.</th>
              <th>Fascia</th>
              {sources.map((s) => (
                <th key={s.id}>{s.label}</th>
              ))}
              <th>Quot.</th>
              <th>Consigl.</th>
              <th title="Titolarità">Tit.</th>
              <th title="Affidabilità">Affid.</th>
              <th>FMV</th>
              <th>Pres.</th>
              {isGk ? (
                <>
                  <th>Gol sub.</th>
                  <th>Rig. par.</th>
                </>
              ) : (
                <>
                  <th>Gol</th>
                  <th>Assist</th>
                </>
              )}
              <th>Stato</th>
            </tr>
          </thead>
          <tbody>
            {players.map((p) => (
              <tr
                key={p.id}
                onClick={() => onSelectPlayer(p.id)}
              >
                <td><PlayerAvatar player={p} size="sm" /></td>
                <td className="whitespace-nowrap font-medium text-ink">
                  {isTarget(p) && <span className="text-warn mr-1">★</span>}
                  {p.nome}
                </td>
                <td>{p.squadra}</td>
                <td>{p.fascia}</td>
                {sources.map((s) => (
                  <td key={s.id} className="text-ink-2">{s.values[p.id] || '—'}</td>
                ))}
                <td className="num">{p.quotazione}</td>
                <td className="num">{p.prezzoConsigliato}</td>
                <td>{p.titolarita}</td>
                <td>{p.affidabilita}</td>
                <td className="num">{p.fmv}</td>
                <td>{p.presenze}</td>
                {isGk ? (
                  <>
                    <td>{p.golSubiti}</td>
                    <td>{p.rigParati}</td>
                  </>
                ) : (
                  <>
                    <td>{p.gol}</td>
                    <td>{p.assist}</td>
                  </>
                )}
                <td className="whitespace-nowrap">
                  {p.status === 'available' ? (
                    <span className="text-free">libero</span>
                  ) : (
                    <span className="text-ink-3">
                      {state.teams[p.soldTo]?.name} · {p.soldPrice}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="text-xs text-ink-3 mt-2">{players.length} giocatori</div>
    </div>
  );
}
