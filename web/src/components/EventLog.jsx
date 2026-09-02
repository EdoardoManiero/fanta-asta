export default function EventLog({ state }) {
  return (
    <div className="rounded-xl border border-emerald-900 bg-pitch-900/50 p-4 max-h-96 overflow-y-auto">
      {state.log.length === 0 && <div className="text-emerald-200/40 text-sm">Nessun evento ancora.</div>}
      <ul className="space-y-1.5">
        {state.log.map((e, i) => (
          <li key={i} className="text-sm text-emerald-200/70 flex gap-2">
            <span className="text-emerald-200/30 font-mono text-xs shrink-0">
              {new Date(e.ts).toLocaleTimeString('it-IT')}
            </span>
            <span>{e.message}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
