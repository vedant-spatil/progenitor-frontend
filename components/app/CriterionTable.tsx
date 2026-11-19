import { Check, CircleHelp, Minus, X } from "lucide-react";
import type { Verdict } from "@/lib/api/schemas";

const STATUS = {
  met: { label: "Met", icon: Check, className: "text-success" },
  not_met: { label: "Not met", icon: X, className: "text-danger" },
  unknown: { label: "Unknown", icon: CircleHelp, className: "text-warn" },
  not_applicable: { label: "Not applicable", icon: Minus, className: "text-muted" },
} as const;

const PMID = /^(?:PMID[:/]\s*)(\d+)$/i;

/** A citation: PubMed ids link out; FHIR references show as their id (the record stays in the FHIR server). */
export function EvidenceRef({ value }: { value: string }) {
  const pmid = value.match(PMID)?.[1];
  if (pmid) {
    return (
      <a
        href={`https://pubmed.ncbi.nlm.nih.gov/${pmid}/`}
        target="_blank"
        rel="noreferrer"
        className="rounded-md bg-card-raised px-1.5 py-0.5 font-mono text-xs text-accent underline"
      >
        {value}
      </a>
    );
  }
  return (
    <span className="rounded-md bg-card-raised px-1.5 py-0.5 font-mono text-xs text-muted [overflow-wrap:anywhere]" title="FHIR resource">
      {value}
    </span>
  );
}

export function CriterionTable({ verdicts, caption }: { verdicts: readonly Verdict[]; caption: string }) {
  return (
    // Focusable so keyboard users can scroll the table sideways on narrow screens.
    <div className="overflow-x-auto rounded-lg" tabIndex={0} role="region" aria-label={caption}>
      <table className="w-full min-w-[36rem] text-left text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead className="text-xs text-muted uppercase">
          <tr>
            <th scope="col" className="py-2 pr-3 font-semibold">
              Rule
            </th>
            <th scope="col" className="py-2 pr-3 font-semibold">
              Verdict
            </th>
            <th scope="col" className="py-2 font-semibold">
              Evidence
            </th>
          </tr>
        </thead>
        <tbody>
          {verdicts.map((v) => {
            const s = STATUS[v.status];
            const Icon = s.icon;
            return (
              <tr key={v.criterion_index} className="border-t border-line align-top">
                <td className="py-2.5 pr-3">
                  <span className="mr-2 text-xs font-semibold text-muted uppercase">
                    {v.kind === "exclusion" ? "Excl." : "Incl."}
                  </span>
                  {v.criterion_text}
                  {v.reason && <p className="mt-1 text-muted">{v.reason}</p>}
                </td>
                <td className={`py-2.5 pr-3 whitespace-nowrap ${s.className}`}>
                  <span className="inline-flex items-center gap-1.5 font-semibold">
                    <Icon aria-hidden className="size-4" />
                    {s.label}
                  </span>
                </td>
                <td className="py-2.5">
                  {v.evidence_refs.length ? (
                    <span className="flex flex-wrap gap-1.5">
                      {v.evidence_refs.map((r) => (
                        <EvidenceRef key={r} value={r} />
                      ))}
                    </span>
                  ) : (
                    <span className="text-muted">none</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
