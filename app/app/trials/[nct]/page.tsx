"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Card, Counts, formatTime, LoadState, PageHeader, Table, td } from "@/components/app/bits";
import { useApi } from "@/components/app/useApi";
import { TrialDetail } from "@/lib/api/schemas";

export default function TrialPage() {
  const { nct } = useParams<{ nct: string }>();
  const { data, error, loading } = useApi(`/api/trials/${encodeURIComponent(nct)}`, TrialDetail);

  if (!data) return <LoadState loading={loading} error={error} />;
  const inclusion = data.criteria.filter((c) => c.kind === "inclusion");
  const exclusion = data.criteria.filter((c) => c.kind === "exclusion");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={data.nct_id}>
        <a
          href={`https://clinicaltrials.gov/study/${data.nct_id}`}
          target="_blank"
          rel="noreferrer"
          className="text-sm text-accent underline"
        >
          View on ClinicalTrials.gov<span className="sr-only"> (opens in a new tab)</span>
        </a>
      </PageHeader>
      <p className="text-lg">{data.title}</p>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
        <Fact term="Status" value={data.overall_status || "Unknown"} />
        <Fact term="Phase" value={data.phases.join(", ") || "n/a"} />
        <Fact term="Ages" value={`${data.minimum_age || "any"} to ${data.maximum_age || "any"}`} />
        <Fact term="Sex" value={data.sex || "All"} />
        <Fact term="Conditions" value={data.conditions.join(", ") || "n/a"} />
        <Fact term="Registry update" value={data.source_last_updated ?? "n/a"} />
        <Fact term="Our copy fetched" value={formatTime(data.fetched_at)} />
        <Fact term="Healthy volunteers" value={data.healthy_volunteers === null ? "n/a" : data.healthy_volunteers ? "Yes" : "No"} />
      </dl>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card title={`Inclusion rules (${inclusion.length})`}>
          <Rules rules={inclusion} />
        </Card>
        <Card title={`Exclusion rules (${exclusion.length})`}>
          <Rules rules={exclusion} />
        </Card>
      </div>
      <Card title={`Patients evaluated (${data.matches.length})`}>
        {data.matches.length ? (
          <Table caption="Runs that shortlisted this trial" head={["Patient", "Rank", "Verdicts", "Review", "Run"]}>
            {data.matches.map((m) => (
              <tr key={m.run_id}>
                <td className={td}>
                  <Link href={`/app/patients/${m.patient_id}`} className="font-semibold hover:text-accent">
                    {m.patient_label || `Patient ${m.patient_id}`}
                  </Link>
                </td>
                <td className={`${td} tabular-nums`}>#{m.rank}</td>
                <td className={td}>
                  <Counts counts={m.counts} />
                </td>
                <td className={td}>{m.status}</td>
                <td className={td}>
                  <Link href={`/app/runs/${m.run_id}`} className="text-accent underline whitespace-nowrap">
                    {formatTime(m.created_at)}
                  </Link>
                </td>
              </tr>
            ))}
          </Table>
        ) : (
          <p className="text-muted">No run has shortlisted this trial yet.</p>
        )}
      </Card>
    </div>
  );
}

function Fact({ term, value }: { term: string; value: string }) {
  return (
    <div className="flex flex-col">
      <dt className="text-muted">{term}</dt>
      <dd className="[overflow-wrap:anywhere]">{value}</dd>
    </div>
  );
}

function Rules({ rules }: { rules: { position: number; source_text: string }[] }) {
  if (!rules.length) return <p className="text-muted">Not parsed yet.</p>;
  return (
    <ol className="flex list-decimal flex-col gap-2 pl-5 text-sm">
      {rules.map((r) => (
        <li key={r.position}>{r.source_text}</li>
      ))}
    </ol>
  );
}
