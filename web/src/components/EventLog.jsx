export default function EventLog({ state }) {
  return (
    <div className="panel max-h-96 overflow-y-auto p-4">
      {state.log.length === 0 && <div className="text-sm text-ink-3">Nessun evento ancora.</div>}
      <ul className="space-y-2">
        {state.log.map((e, i) => (
          <li key={i} className="flex gap-3 text-sm text-ink-2">
            <span className="num shrink-0 text-2xs text-ink-3">
              {new Date(e.ts).toLocaleTimeString('it-IT')}
            </span>
            <span>{e.message}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
