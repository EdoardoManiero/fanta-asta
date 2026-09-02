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
        <div className="mb-5 rounded-xl border border-amber-700/40 bg-amber-500/5 p-4">
          <div className="text-xs font-bold text-amber-300 uppercase tracking-wide mb-2">Carica altre fasce</div>
          <p className="text-xs text-emerald-200/50 mb-3">
            Carica un file Excel con lo stesso formato (colonne Ruolo/Nome/Squadra/Fascia, un foglio per
            ruolo o con colonna Ruolo) per confrontare le fasce di altre fonti/esperti.
          </p>
          <div className="flex flex-wrap gap-2 items-center">
            <input type="file" accept=".xlsx,.xls" ref={fileRef} className="text-sm text-emerald-200/70" />
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="nome fonte (es. Esperto X)"
              className="rounded-lg bg-pitch-950 border border-emerald-900 px-3 py-1.5 text-sm outline-none focus:border-emerald-500"
            />
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="rounded-lg bg-emerald-500 text-pitch-950 font-semibold px-3 py-1.5 text-sm hover:bg-emerald-400 disabled:opacity-50"
            >
              {uploading ? 'Caricamento...' : 'Carica'}
            </button>
          </div>
          {uploadMsg && (
            <div className={`mt-2 text-sm ${uploadMsg.ok ? 'text-emerald-300' : 'text-rose-400'}`}>{uploadMsg.text}</div>
          )}
          {sources.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {sources.map((s) => (
                <span key={s.id} className="inline-flex items-center gap-1.5 text-xs bg-pitch-950 border border-emerald-900 rounded-full px-2.5 py-1">
                  {s.label} ({s.matchedCount})
                  <button
                    onClick={() => socket.emit('admin:removeFasceSource', { id: s.id })}
                    className="text-emerald-200/40 hover:text-rose-400"
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2 mb-4 items-center">
        {ROLE_ORDER.map((r) => (
          <button
            key={r}
            onClick={() => setRole(r)}
            className={`px-3 py-1.5 rounded-lg border text-sm font-semibold ${
              role === r ? 'border-emerald-400 bg-emerald-500/10' : 'border-emerald-900'
            }`}
          >
            {r}
          </button>
        ))}
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cerca nome..."
          className="rounded-lg bg-pitch-950 border border-emerald-900 px-3 py-1.5 text-sm outline-none focus:border-emerald-500 flex-1 min-w-[160px]"
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-emerald-900">
        <table className="w-full text-sm">
          <thead className="bg-pitch-900/70 text-emerald-200/60">
            <tr>
              <th className="p-2 text-left"></th>
              <th className="p-2 text-left">Nome</th>
              <th className="p-2 text-left">Sq.</th>
              <th className="p-2 text-left">Fascia</th>
              {sources.map((s) => (
                <th key={s.id} className="p-2 text-left whitespace-nowrap">{s.label}</th>
              ))}
              <th className="p-2 text-left">Quot.</th>
              <th className="p-2 text-left">Consigl.</th>
              <th className="p-2 text-left" title="Titolarità">Tit.</th>
              <th className="p-2 text-left" title="Affidabilità">Affid.</th>
              <th className="p-2 text-left">FMV</th>
              <th className="p-2 text-left">Pres.</th>
              {isGk ? (
                <>
                  <th className="p-2 text-left">Gol sub.</th>
                  <th className="p-2 text-left">Rig. par.</th>
                </>
              ) : (
                <>
                  <th className="p-2 text-left">Gol</th>
                  <th className="p-2 text-left">Assist</th>
                </>
              )}
              <th className="p-2 text-left">Stato</th>
            </tr>
          </thead>
          <tbody>
            {players.map((p) => (
              <tr
                key={p.id}
                onClick={() => onSelectPlayer(p.id)}
                className="border-t border-emerald-900/50 cursor-pointer hover:bg-pitch-900/40"
              >
                <td className="p-2"><PlayerAvatar player={p} size="sm" /></td>
                <td className="p-2 font-medium whitespace-nowrap">
                  {isTarget(p) && <span className="text-amber-300 mr-1">★</span>}
                  {p.nome}
                </td>
                <td className="p-2">{p.squadra}</td>
                <td className="p-2">{p.fascia}</td>
                {sources.map((s) => (
                  <td key={s.id} className="p-2 text-emerald-200/70">{s.values[p.id] || '—'}</td>
                ))}
                <td className="p-2 font-mono">{p.quotazione}</td>
                <td className="p-2 font-mono">{p.prezzoConsigliato}</td>
                <td className="p-2">{p.titolarita}</td>
                <td className="p-2">{p.affidabilita}</td>
                <td className="p-2 font-mono">{p.fmv}</td>
                <td className="p-2">{p.presenze}</td>
                {isGk ? (
                  <>
                    <td className="p-2">{p.golSubiti}</td>
                    <td className="p-2">{p.rigParati}</td>
                  </>
                ) : (
                  <>
                    <td className="p-2">{p.gol}</td>
                    <td className="p-2">{p.assist}</td>
                  </>
                )}
                <td className="p-2 whitespace-nowrap">
                  {p.status === 'available' ? (
                    <span className="text-emerald-400">libero</span>
                  ) : (
                    <span className="text-emerald-200/50">
                      {state.teams[p.soldTo]?.name} · {p.soldPrice}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="text-xs text-emerald-200/40 mt-2">{players.length} giocatori</div>
    </div>
  );
}
