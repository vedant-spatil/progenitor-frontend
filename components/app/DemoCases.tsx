"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/components/app/auth";
import { buttonPrimary, buttonSecondary, Card, ErrorNote, StatusBadge } from "@/components/app/bits";
import { useApi } from "@/components/app/useApi";
import { api, ApiError } from "@/lib/api/client";
import { DemoCases, DemoReset, DemoStart, type DemoCase, type RunStatus } from "@/lib/api/schemas";

const OPEN: RunStatus[] = ["queued", "running", "waiting_clinician", "awaiting_review"];

/** Home page card: preset synthetic patients, one-click start, reset (PLAN.md Phase 9). */
export function DemoCasesCard() {
  const { can } = useAuth();
  const coordinator = can("coordinator");
  const router = useRouter();
  const [reload, setReload] = useState(0);
  // useApi reloads when the path changes; the backend ignores `r`.
  const { data, error, loading } = useApi(`/api/demo?r=${reload}`, DemoCases);
  const [busy, setBusy] = useState<number | "reset" | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [note, setNote] = useState("");
  const [failure, setFailure] = useState("");

  const openCount = data?.items.filter((c) => c.latest_run && OPEN.includes(c.latest_run.status)).length ?? 0;

  async function start(c: DemoCase) {
    setBusy(c.patient_id);
    setFailure("");
    try {
      const run = await api(`/api/demo/${c.patient_id}/start`, DemoStart, { method: "POST" });
      router.push(`/app/runs/${run.id}`);
    } catch (e) {
      setFailure(e instanceof ApiError && e.status === 404 ? "That case is no longer a demo case." : "Could not start the run.");
      setBusy(null);
    }
  }

  async function reset() {
    setBusy("reset");
    setFailure("");
    try {
      const { cancelled } = await api("/api/demo/reset", DemoReset, { method: "POST" });
      setNote(cancelled ? `Cancelled ${cancelled} open demo run${cancelled === 1 ? "" : "s"}.` : "No open demo runs.");
      setReload((r) => r + 1);
    } catch {
      setFailure("Could not reset the demo.");
    } finally {
      setBusy(null);
      setConfirming(false);
    }
  }

  const actions = coordinator ? (
    confirming ? (
      <span className="flex items-center gap-2 text-sm">
        <span>Cancel open demo runs?</span>
        <button type="button" className={buttonSecondary} onClick={() => void reset()} disabled={busy !== null}>
          Yes, reset
        </button>
        <button type="button" className={buttonSecondary} onClick={() => setConfirming(false)}>
          Keep
        </button>
      </span>
    ) : (
      <button
        type="button"
        className={`${buttonSecondary} text-sm`}
        onClick={() => {
          setNote("");
          setConfirming(true);
        }}
        disabled={busy !== null}
      >
        Reset demo
      </button>
    )
  ) : null;

  return (
    <Card title="Demo cases" actions={actions}>
      <p className="mb-4 text-sm text-muted">
        Synthetic patients. Each run uses the live agent: it searches trials, may ask the clinician a question, and
        waits for review.
      </p>
      {note && (
        <p role="status" className="mb-3 text-sm">
          {note}
        </p>
      )}
      {failure && <ErrorNote>{failure}</ErrorNote>}
      {error && <ErrorNote>{error}</ErrorNote>}
      {!data && loading && <p className="text-muted">Loading…</p>}
      {data && !data.items.length && <p className="text-muted">No demo patients are loaded.</p>}
      {data && data.items.length > 0 && (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {data.items.map((c) => {
            const latest = c.latest_run;
            const open = latest !== null && OPEN.includes(latest.status);
            return (
              <li key={c.patient_id} className="flex flex-col gap-3 rounded-xl border border-line bg-card-raised p-4">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <Link href={`/app/patients/${c.patient_id}`} className="font-semibold hover:text-accent">
                    {c.label}
                  </Link>
                  {(c.age_years !== null || c.sex) && (
                    <span className="text-sm text-muted">
                      {[c.age_years !== null ? `${c.age_years} y` : "", c.sex].filter(Boolean).join(" · ")}
                    </span>
                  )}
                </div>
                <p className="text-sm">{c.conditions.length ? c.conditions.join(", ") : "Profile built on the first run."}</p>
                <div className="mt-auto flex flex-wrap items-center gap-3">
                  {latest && (
                    <Link href={`/app/runs/${latest.id}`} className="flex items-center gap-2 text-sm hover:text-accent">
                      <StatusBadge status={latest.status} />
                      <span className="underline">
                        Open run<span className="sr-only"> for {c.label}</span>
                      </span>
                    </Link>
                  )}
                  {coordinator && !open && (
                    <button
                      type="button"
                      className={`${buttonPrimary} ml-auto text-sm`}
                      onClick={() => void start(c)}
                      disabled={busy !== null}
                    >
                      {busy === c.patient_id ? "Starting…" : latest ? "Run again" : "Start"}
                      <span className="sr-only"> demo run for {c.label}</span>
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {coordinator && openCount > 0 && !confirming && (
        <p className="mt-3 text-sm text-muted">
          {openCount} demo case{openCount === 1 ? " has" : "s have"} an open run. Reset cancels open demo runs; their
          history and audit trail stay.
        </p>
      )}
    </Card>
  );
}
