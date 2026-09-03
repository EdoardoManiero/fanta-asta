import { useState } from 'react';

export default function Join({ state, onClaim }) {
  const [name, setName] = useState('');
  const [selected, setSelected] = useState('');
  const teams = Object.values(state.teams);
  const free = teams.filter((t) => !t.ownerClientId);
  const taken = teams.filter((t) => t.ownerClientId);

  return (
    <div className="panel mx-auto mt-9 max-w-xl p-6">
      <h2 className="text-lg">Entra nell’asta</h2>
      <p className="mt-2 max-w-prose text-sm text-ink-2">
        Scegli una squadra libera e dai un nome; puoi cambiarlo dopo. Se sei l’organizzatore, entra
        come una squadra qualsiasi e sblocca i controlli admin dalla scheda Admin.
      </p>

      <div className="label mt-6">Squadre libere</div>
      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {free.map((t) => (
          <button
            key={t.id}
            onClick={() => setSelected(t.id)}
            className={`rounded border px-3 py-2 text-left text-sm transition-colors ${
              selected === t.id
                ? 'border-live bg-surface-2 font-semibold text-ink'
                : 'border-line text-ink-2 hover:border-line-strong hover:text-ink'
            }`}
          >
            {t.name}
          </button>
        ))}
      </div>

      {taken.length > 0 && (
        <p className="mt-3 text-xs text-ink-3">Già occupate: {taken.map((t) => t.name).join(', ')}</p>
      )}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome squadra (facoltativo)"
          className="field flex-1"
          maxLength={40}
        />
        <button disabled={!selected} onClick={() => onClaim(selected, name)} className="btn btn-primary sm:px-6">
          Entra
        </button>
      </div>
    </div>
  );
}
