export default function TeamsSidebar({ state, myTeamId }) {
  const teams = Object.values(state.teams).sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));

  return (
    <div className="panel overflow-hidden">
      <div className="label border-b border-line px-3 py-2">Squadre</div>
      {teams.map((t) => (
        <div
          key={t.id}
          className={`flex items-center gap-2 border-b border-line px-3 py-2 text-xs last:border-b-0 ${
            t.id === myTeamId ? 'bg-surface-2' : ''
          }`}
        >
          <span
            className={`h-1.5 w-1.5 shrink-0 rounded-full ${t.connected ? 'bg-free' : 'bg-line-strong'}`}
            title={t.connected ? 'in linea' : 'disconnesso'}
          />
          <span className={`flex-1 truncate ${t.id === myTeamId ? 'font-semibold text-ink' : 'text-ink-2'}`}>
            {t.name}
          </span>
          <span className="num text-ink">{t.budget}</span>
        </div>
      ))}
    </div>
  );
}
