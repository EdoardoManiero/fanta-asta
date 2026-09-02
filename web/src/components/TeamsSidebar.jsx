export default function TeamsSidebar({ state, myTeamId }) {
  const teams = Object.values(state.teams).sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));

  return (
    <div className="rounded-xl border border-emerald-900 bg-pitch-900/50 overflow-hidden">
      {teams.map((t) => (
        <div
          key={t.id}
          className={`flex items-center gap-2 px-3 py-2 text-sm border-b border-emerald-900/50 last:border-b-0 ${
            t.id === myTeamId ? 'bg-emerald-500/10' : ''
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${t.connected ? 'bg-emerald-400' : 'bg-emerald-900'}`} />
          <span className="truncate flex-1">{t.name}</span>
          <span className="font-mono text-emerald-300/80 text-xs">{t.budget}</span>
        </div>
      ))}
    </div>
  );
}
