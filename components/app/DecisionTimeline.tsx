import type { Decision } from "@/lib/api/schemas";

/** Supervisor decisions in order: action, rationale, state refs, guard outcome. */
export function DecisionTimeline({ decisions, live }: { decisions: readonly Decision[]; live: boolean }) {
  if (!decisions.length) {
    return <p className="text-muted">{live ? "Waiting for the first decision…" : "No decisions recorded."}</p>;
  }
  return (
    <ol className="flex flex-col gap-4" aria-live={live ? "polite" : undefined}>
      {decisions.map((d) => {
        const blocked = d.guard_outcome !== "" && d.guard_outcome !== "accepted";
        return (
          <li key={`${d.step}-${d.attempt}`} className="grid grid-cols-[2.5rem_1fr] gap-3">
            <span className="pt-0.5 text-right font-mono text-sm text-muted">{d.step}</span>
            <div className="min-w-0 rounded-xl border border-line bg-bg px-4 py-3">
              <p className="flex flex-wrap items-center gap-2">
                <span className="font-mono font-semibold text-accent">{d.action}</span>
                {d.attempt > 1 && <span className="text-xs text-muted">attempt {d.attempt}</span>}
                {blocked && (
                  <span className="rounded-full bg-card-raised px-2 py-0.5 text-xs text-danger">
                    guard: {d.guard_outcome}
                    {d.guard_detail ? ` (${d.guard_detail})` : ""}
                  </span>
                )}
              </p>
              {d.rationale && <p className="mt-1 text-sm text-fg/90">{d.rationale}</p>}
              {d.state_refs.length > 0 && (
                <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="State references">
                  {d.state_refs.map((r) => (
                    <li key={r} className="rounded-md bg-card-raised px-1.5 py-0.5 font-mono text-xs text-muted [overflow-wrap:anywhere]">
                      {r}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
