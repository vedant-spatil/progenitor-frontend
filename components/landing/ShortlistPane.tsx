import { Check, CircleHelp, X } from "lucide-react";
import type { PreviewTrial, VerdictStatus } from "@/content/landing/patients";

// Fixed colours: the shortlist sits on white paper in both themes.
const STATUS: Record<VerdictStatus, { icon: typeof Check; className: string }> = {
  met: { icon: Check, className: "text-[#227a6a] bg-[#e3f3ef]" },
  not_met: { icon: X, className: "text-[#b8432f] bg-[#f8e4e0]" },
  unknown: { icon: CircleHelp, className: "text-[#8a6410] bg-[#f6ecd2]" },
};

export function ShortlistPane({
  trials,
  labels,
  noEvidence,
  run,
}: {
  trials: readonly PreviewTrial[];
  labels: Record<VerdictStatus, string>;
  noEvidence: string;
  run: number;
}) {
  let row = 0;
  return (
    <div className="rounded-sm bg-paper px-5 py-6 text-paper-ink shadow-xl md:px-9 md:py-8">
      <ol className="flex flex-col gap-6">
        {trials.map((t) => (
          <li key={t.nct}>
            <p className="font-mono text-xs tracking-wide text-paper-muted">
              {t.nct} · {t.status}
            </p>
            <h3 className="mt-1 font-display text-lg leading-snug font-semibold md:text-xl">{t.title}</h3>
            <ul className="mt-3 flex flex-col gap-2">
              {t.criteria.map((c) => {
                const s = STATUS[c.status];
                const Icon = s.icon;
                const delay = row++ * 120;
                return (
                  <li
                    key={`${run}-${c.text}`}
                    className="row-in grid grid-cols-[1.25rem_1fr] gap-x-2.5 text-sm md:text-[15px]"
                    style={{ animationDelay: `${delay}ms` }}
                  >
                    <span className={`mt-0.5 inline-flex size-5 items-center justify-center rounded-full ${s.className}`}>
                      <Icon aria-hidden className="size-3.5" strokeWidth={3} />
                    </span>
                    <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                      <span className="sr-only">{labels[c.status]}:</span>
                      <span>{c.text}</span>
                      <span className="rounded-md border border-[#e5d8c8] bg-[#fbf6ef] px-1.5 py-0.5 font-mono text-[11px] text-paper-muted md:text-xs">
                        {c.evidence ?? noEvidence}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** Total stagger time for the rows, so the toast can follow them. */
export function rowsDuration(trials: readonly PreviewTrial[]): number {
  return trials.reduce((n, t) => n + t.criteria.length, 0) * 120 + 300;
}
