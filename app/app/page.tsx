"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/app/auth";
import { buttonPrimary, Card, ErrorNote, formatTime, StatusBadge } from "@/components/app/bits";
import { api } from "@/lib/api/client";
import { RunList, type RunListItem } from "@/lib/api/schemas";

export default function RunsPage() {
  const { can } = useAuth();
  const [runs, setRuns] = useState<RunListItem[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api("/api/runs", RunList)
      .then((r) => setRuns(r.items))
      .catch(() => setError("Could not load runs."));
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-3xl font-bold">Runs</h1>
        {can("coordinator") && (
          <Link href="/app/runs/new" className={buttonPrimary}>
            New run
          </Link>
        )}
      </div>
      {error && <ErrorNote>{error}</ErrorNote>}
      <Card title="Recent runs">
        {runs === null && !error ? (
          <p className="text-muted">Loading…</p>
        ) : runs && runs.length ? (
          <ul className="flex flex-col divide-y divide-line">
            {runs.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/app/runs/${r.id}`}
                  className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3 hover:text-accent"
                >
                  <span className="font-semibold">{r.patient_label || `Patient ${r.patient_id}`}</span>
                  <StatusBadge status={r.status} />
                  <span className="ml-auto text-sm text-muted">{formatTime(r.created_at)}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted">No runs yet.{can("coordinator") ? " Start one with New run." : ""}</p>
        )}
      </Card>
    </div>
  );
}
