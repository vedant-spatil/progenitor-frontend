"use client";

import Link from "next/link";
import { useAuth } from "@/components/app/auth";
import { DemoCasesCard } from "@/components/app/DemoCases";
import { buttonPrimary, Card, formatTime, LoadState, PageHeader, Stat, StatusBadge } from "@/components/app/bits";
import { useApi } from "@/components/app/useApi";
import { Overview, type QueueReason, type RunStatus } from "@/lib/api/schemas";

const REASON: Record<QueueReason, string> = {
  answer_question: "Answer the clinician question",
  review_shortlist: "Review the shortlist",
  failed: "Run failed: check and start again",
  referral_drafts: "New referral drafts",
};

const TILES: { label: string; statuses: RunStatus[] }[] = [
  { label: "Active", statuses: ["queued", "running"] },
  { label: "Question for clinician", statuses: ["waiting_clinician"] },
  { label: "Awaiting review", statuses: ["awaiting_review"] },
  { label: "Completed", statuses: ["completed"] },
  { label: "Failed", statuses: ["failed", "cancelled"] },
];

export default function HomePage() {
  const { me, can } = useAuth();
  const reader = can("coordinator") || can("clinician");
  const { data, error, loading } = useApi(reader ? "/api/overview" : null, Overview);

  if (!reader) {
    return (
      <div className="flex max-w-2xl flex-col gap-6">
        <PageHeader title="Home" />
        <Card title="Your access">
          {can("admin") ? (
            <p>
              Admins manage users and read the audit log. Run data needs a coordinator or clinician role.{" "}
              <Link href="/app/audit" className="text-accent underline">
                Open the audit log
              </Link>
              .
            </p>
          ) : (
            <p className="text-muted">Your account has no role yet. Ask an admin to add one.</p>
          )}
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={`Welcome, ${me.username}`}>
        {can("coordinator") && (
          <Link href="/app/runs/new" className={buttonPrimary}>
            New run
          </Link>
        )}
      </PageHeader>
      <LoadState loading={loading} error={error} />
      {data && (
        <>
          <section aria-label="Runs by status" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {TILES.map((t) => (
              <Stat
                key={t.label}
                label={t.label}
                value={t.statuses.reduce((n, s) => n + (data.counts[s] ?? 0), 0)}
                href={`/app/runs?status=${t.statuses.join(",")}`}
              />
            ))}
          </section>
          <DemoCasesCard />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
            <Card title="My queue">
              {data.queue.length ? (
                <ul className="flex flex-col divide-y divide-line">
                  {data.queue.map((q) => (
                    <li key={`${q.run_id}-${q.reason}`}>
                      <Link
                        href={`/app/runs/${q.run_id}`}
                        className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3 hover:text-accent"
                      >
                        <span className="font-semibold">{q.patient_label || "Patient"}</span>
                        <span className="text-sm">{REASON[q.reason]}</span>
                        <span className="ml-auto text-sm text-muted">{formatTime(q.since)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted">Nothing waiting for you.</p>
              )}
            </Card>
            <Card title="Recent decisions">
              {data.recent.length ? (
                <ol className="flex flex-col divide-y divide-line">
                  {data.recent.map((d) => (
                    <li key={`${d.run_id}-${d.step}-${d.created_at}`}>
                      <Link
                        href={`/app/runs/${d.run_id}`}
                        className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 py-2.5 text-sm hover:text-accent"
                      >
                        <span className="font-mono text-accent">{d.action || "(no action)"}</span>
                        <span>{d.patient_label}</span>
                        {d.guard_outcome !== "accepted" && <span className="text-danger">{d.guard_outcome}</span>}
                        <span className="ml-auto text-muted">{formatTime(d.created_at)}</span>
                      </Link>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-muted">No decisions yet.</p>
              )}
            </Card>
          </div>
          <RecentRunsLink running={data.counts.running ?? 0} />
        </>
      )}
    </div>
  );
}

function RecentRunsLink({ running }: { running: number }) {
  return (
    <p className="text-sm text-muted">
      {running ? (
        <>
          <StatusBadge status="running" /> {running} running now.{" "}
        </>
      ) : null}
      <Link href="/app/runs" className="text-accent underline">
        See all runs
      </Link>
    </p>
  );
}
