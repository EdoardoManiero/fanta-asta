import { useState } from 'react';

export default function Join({ state, onClaim }) {
  const [name, setName] = useState('');
  const [selected, setSelected] = useState('');
  const teams = Object.values(state.teams);
  const free = teams.filter((t) => !t.ownerClientId);
  const taken = teams.filter((t) => t.ownerClientId);

  return (
    <div className="max-w-xl mx-auto mt-10 bg-pitch-900/60 border border-emerald-900 rounded-2xl p-6">
      <h2 className="text-xl font-bold mb-1">Entra nell'asta</h2>
      <p className="text-emerald-200/70 text-sm mb-5">
        Scegli una squadra libera e dai un nome (puoi cambiarlo dopo). Se sei l'organizzatore, entra come una squadra qualsiasi e poi sblocca i controlli admin qui sotto.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
        {free.map((t) => (
          <button
            key={t.id}
            onClick={() => setSelected(t.id)}
            className={`rounded-lg border px-3 py-2 text-sm text-left transition ${
              selected === t.id
                ? 'border-emerald-400 bg-emerald-500/10'
                : 'border-emerald-900 hover:border-emerald-700'
            }`}
          >
            {t.name}
          </button>
        ))}
      </div>

      {taken.length > 0 && (
        <p className="text-xs text-emerald-200/50 mb-4">
          Già occupate: {taken.map((t) => t.name).join(', ')}
        </p>
      )}

      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nome squadra (facoltativo)"
        className="w-full mb-4 rounded-lg bg-pitch-950 border border-emerald-900 px-3 py-2 text-sm outline-none focus:border-emerald-500"
        maxLength={40}
      />

      <button
        disabled={!selected}
        onClick={() => onClaim(selected, name)}
        className="w-full rounded-lg bg-emerald-500 disabled:bg-emerald-900 disabled:text-emerald-500/50 text-pitch-950 font-semibold py-2.5 hover:bg-emerald-400 transition"
      >
        Entra
      </button>
    </div>
  );
}
