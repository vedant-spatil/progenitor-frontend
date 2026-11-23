"use client";

import { useState } from "react";
import { Card, ChipGroup, LoadState, PageHeader, Table, td } from "@/components/app/bits";
import { EvalChart, type Series } from "@/components/app/EvalChart";
import { useApi } from "@/components/app/useApi";
import { EvalReports, type EvalReport, type EvalRow, type EvalThresholds } from "@/lib/api/schemas";

// Color follows the system, never its rank or position.
const SYSTEMS: Series[] = [
  { key: "bm25", label: "BM25 baseline", color: "var(--series-3)" },
  { key: "fixed", label: "Fixed pipeline", color: "var(--series-2)" },
  { key: "supervisor", label: "LLM supervisor", color: "var(--series-1)" },
];
const COHORT_LABEL: Record<string, string> = { sigir: "SIGIR", trec_2021: "TREC 2021", trec_2022: "TREC 2022", all: "All" };
const METRICS = [
  { value: "ndcg@10", label: "NDCG@10" },
  { value: "ndcg@5", label: "NDCG@5" },
  { value: "p@5", label: "P@5" },
  { value: "mrr", label: "MRR" },
] as const;
type Metric = (typeof METRICS)[number]["value"];
const COLUMNS: { key: keyof EvalRow; label: string; digits: number }[] = [
  { key: "patients", label: "Patients", digits: 0 },
  { key: "ndcg@10", label: "NDCG@10", digits: 3 },
  { key: "ndcg@5", label: "NDCG@5", digits: 3 },
  { key: "p@5", label: "P@5", digits: 3 },
  { key: "mrr", label: "MRR", digits: 3 },
  { key: "unknown_rate", label: "Unknown rate", digits: 3 },
  { key: "citation_validity", label: "Citation validity", digits: 3 },
  { key: "tokens_per_patient", label: "Tokens / patient", digits: 0 },
  { key: "cost_per_patient_usd", label: "Cost / patient (USD)", digits: 4 },
  { key: "seconds_per_patient", label: "Seconds / patient", digits: 1 },
  { key: "errors", label: "Errors", digits: 0 },
];

function fmt(v: number | null | undefined, digits: number): string {
  if (typeof v !== "number") return "n/a";
  return digits === 0 ? Math.round(v).toLocaleString() : v.toFixed(digits);
}

const cohortLabel = (c: string) => COHORT_LABEL[c] ?? c;

export default function EvalsPage() {
  const { data, error, loading } = useApi("/api/evals", EvalReports);
  const [chosen, setChosen] = useState("");
  const [metric, setMetric] = useState<Metric>("ndcg@10");

  if (!data) return <LoadState loading={loading} error={error} />;
  if (!data.reports.length) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Evals" />
        <p className="text-muted">No Phase 6 eval reports found. Run make eval-phase6 on the server, then reload.</p>
      </div>
    );
  }
  const report = data.reports.find((r) => r.id === chosen) ?? data.reports[0];
  const cohorts = Object.keys(report.table).sort((a, b) => (a === "all" ? 1 : b === "all" ? -1 : a.localeCompare(b)));
  const series = SYSTEMS.filter((s) => cohorts.some((c) => report.table[c]?.[s.key]));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Evals">
        <label className="flex items-center gap-2 text-sm text-muted">
          Report
          <select
            value={report.id}
            onChange={(e) => setChosen(e.target.value)}
            className="rounded-lg border border-line bg-bg px-3 py-2 text-fg"
          >
            {data.reports.map((r) => (
              <option key={r.id} value={r.id}>
                {r.id} UTC · {r.config.scored ?? "?"}/{r.config.patients ?? "?"} scored
              </option>
            ))}
          </select>
        </label>
      </PageHeader>
      <ReportFacts report={report} />
      <Checks report={report} cohorts={cohorts} thresholds={data.thresholds} />
      <Card title="Ranking quality by cohort">
        <div className="flex flex-col gap-4">
          <ChipGroup label="Metric" value={metric} options={[...METRICS]} onChange={setMetric} />
          {series.length ? (
            <EvalChart
              title={`${METRICS.find((m) => m.value === metric)?.label} by cohort`}
              series={series}
              groups={cohorts.map((c) => ({
                key: c,
                label: cohortLabel(c),
                values: Object.fromEntries(series.map((s) => [s.key, report.table[c]?.[s.key]?.[metric]])),
              }))}
            />
          ) : (
            <p className="text-muted">This report has no system results.</p>
          )}
        </div>
      </Card>
      {cohorts.map((c) => (
        <Card key={c} title={`${cohortLabel(c)}: all metrics`}>
          <Table caption={`${cohortLabel(c)} metrics`} head={["System", ...COLUMNS.map((col) => col.label)]}>
            {Object.entries(report.table[c] ?? {}).map(([system, row]) => (
              <tr key={system}>
                <th scope="row" className={`${td} font-semibold`}>
                  {SYSTEMS.find((s) => s.key === system)?.label ?? system}
                </th>
                {COLUMNS.map((col) => (
                  <td key={col.key} className={`${td} text-right tabular-nums`}>
                    {fmt(row[col.key], col.digits)}
                  </td>
                ))}
              </tr>
            ))}
          </Table>
        </Card>
      ))}
    </div>
  );
}

function ReportFacts({ report }: { report: EvalReport }) {
  const c = report.config;
  const facts = [
    ["Model", c.model ?? "n/a"],
    ["Scored", `${c.scored ?? "?"} of ${c.patients ?? "?"} patients`],
    ["Per cohort", fmt(c.per_cohort, 0)],
    ["Pool", `${fmt(c.pool_size, 0)} trials / patient`],
    ["Mode", c.replay ? "Replay (cache only)" : "Live"],
    ["Tokens", `${fmt(c.spent_tokens_in, 0)} in / ${fmt(c.spent_tokens_out, 0)} out`],
    ["Snapshot", c.snapshot ?? "n/a"],
    ["Cost (USD)", fmt(c.spent_usd, 2)],
  ];
  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
      {facts.map(([k, v]) => (
        <div key={k} className="flex flex-col">
          <dt className="text-muted">{k}</dt>
          <dd className="[overflow-wrap:anywhere]">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Gate 6 rules (ADR 0005) applied to the chosen report with today's thresholds. Pass or fail, never color alone. */
function Checks({ report, cohorts, thresholds }: { report: EvalReport; cohorts: string[]; thresholds: EvalThresholds | null }) {
  if (!thresholds) return <p className="text-sm text-muted">Thresholds are not set.</p>;
  const mBm25 = thresholds.supervisor_minus_bm25_ndcg10 ?? 0;
  const mFixed = thresholds.supervisor_minus_fixed_ndcg10 ?? 0;
  const rows = cohorts
    .filter((c) => c !== "all")
    .map((c) => {
      const t = report.table[c] ?? {};
      const sup = t.supervisor?.["ndcg@10"];
      const bm = t.bm25?.["ndcg@10"];
      const fx = t.fixed?.["ndcg@10"];
      const cv = t.supervisor?.citation_validity;
      return {
        cohort: c,
        dBm25: typeof sup === "number" && typeof bm === "number" ? sup - bm : null,
        dFixed: typeof sup === "number" && typeof fx === "number" ? sup - fx : null,
        cv,
      };
    });
  return (
    <Card title="Gate 6 checks">
      <div className="flex flex-col gap-4">
        <p className="text-sm text-muted">
          Supervisor NDCG@10 must beat BM25 by more than {mBm25} and stay within {Math.abs(mFixed)} of the fixed pipeline;
          citation validity must be at least {thresholds.citation_validity ?? "n/a"}.
          {thresholds.adr ? ` Source: ${thresholds.adr}.` : ""}
        </p>
        <Table caption="Threshold checks per cohort" head={["Cohort", "Supervisor minus BM25", "Supervisor minus fixed", "Citation validity"]}>
          {rows.map((r) => (
            <tr key={r.cohort}>
              <th scope="row" className={`${td} font-semibold`}>
                {cohortLabel(r.cohort)}
              </th>
              <td className={td}>
                <Verdict value={r.dBm25} ok={r.dBm25 !== null && r.dBm25 > mBm25} />
              </td>
              <td className={td}>
                <Verdict value={r.dFixed} ok={r.dFixed !== null && r.dFixed >= mFixed} />
              </td>
              <td className={td}>
                <Verdict
                  value={r.cv ?? null}
                  ok={typeof r.cv === "number" && r.cv >= (thresholds.citation_validity ?? 0)}
                  signed={false}
                />
              </td>
            </tr>
          ))}
        </Table>
        {report.fails.length > 0 && (
          <div className="text-sm">
            <p className="font-semibold">Notes recorded with this report</p>
            <ul className="list-disc pl-5 text-muted">
              {report.fails.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Card>
  );
}

function Verdict({ value, ok, signed = true }: { value: number | null; ok: boolean; signed?: boolean }) {
  if (value === null) return <span className="text-muted">n/a</span>;
  const text = signed && value > 0 ? `+${value.toFixed(3)}` : value.toFixed(3);
  return (
    <span className="inline-flex items-center gap-2 tabular-nums">
      <span>{text}</span>
      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${ok ? "text-success" : "text-danger"} bg-card-raised`}>
        {ok ? "✓ pass" : "✗ fail"}
      </span>
    </span>
  );
}
