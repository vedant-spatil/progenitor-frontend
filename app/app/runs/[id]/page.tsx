"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/app/auth";
import { Card, ErrorNote, formatTime, StatusBadge } from "@/components/app/bits";
import { DecisionTimeline } from "@/components/app/DecisionTimeline";
import { QuestionPrompt } from "@/components/app/QuestionPrompt";
import { ReferralEditor } from "@/components/app/ReferralEditor";
import { ReviewPanel } from "@/components/app/ReviewPanel";
import { api, ApiError } from "@/lib/api/client";
import { Referrals, Run, Shortlist, type Referral, type ShortlistItem } from "@/lib/api/schemas";
import { subscribeRun } from "@/lib/api/sse";

export default function RunPage() {
  const { id } = useParams<{ id: string }>();
  const { can } = useAuth();
  const [run, setRun] = useState<Run | null>(null);
  const [shortlist, setShortlist] = useState<ShortlistItem[] | null>(null);
  const [referrals, setReferrals] = useState<Referral[] | null>(null);
  const [error, setError] = useState("");
  const [connection, setConnection] = useState<"open" | "retrying" | "closed">("closed");
  const [streamKey, setStreamKey] = useState(0);
  const pending = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await api(`/api/runs/${id}`, Run);
      setRun(r);
      if (r.status === "awaiting_review" || r.status === "completed") {
        setShortlist((await api(`/api/runs/${id}/shortlist`, Shortlist)).items);
      }
      if (r.status === "completed") {
        setReferrals((await api(`/api/runs/${id}/referrals`, Referrals)).items);
      }
    } catch (e) {
      setError(e instanceof ApiError && e.status === 404 ? "Run not found." : "Could not load this run.");
    }
  }, [id]);

  // Coalesce bursts of events into one reload.
  const reloadSoon = useCallback(() => {
    if (pending.current) clearTimeout(pending.current);
    pending.current = setTimeout(() => void load(), 300);
  }, [load]);

  useEffect(() => {
    reloadSoon(); // first load (the stream's snapshot also triggers one)
    const sub = subscribeRun(id, reloadSoon, { onConnection: setConnection });
    return () => {
      sub.stop();
      if (pending.current) clearTimeout(pending.current);
    };
  }, [id, load, reloadSoon, streamKey]);

  // After an answer or review the run is queued again: reopen the stream.
  const resumed = useCallback(() => {
    void load();
    setStreamKey((k) => k + 1);
  }, [load]);

  if (error) return <ErrorNote>{error}</ErrorNote>;
  if (!run) return <p className="text-muted">Loading…</p>;

  const live = run.status === "queued" || run.status === "running";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-display text-3xl font-bold">{run.patient_label || `Patient ${run.patient_id}`}</h1>
        <StatusBadge status={run.status} />
        <span className="text-sm text-muted" aria-live="polite">
          {live ? (connection === "open" ? "Live" : connection === "retrying" ? "Reconnecting…" : "") : ""}
        </span>
      </div>
      <p className="text-sm text-muted">
        Started {formatTime(run.started_at ?? run.created_at)} · {run.steps_used} steps
        {run.finished_at ? ` · finished ${formatTime(run.finished_at)}` : ""}
      </p>
      {run.error && <ErrorNote>{run.error}</ErrorNote>}
      {run.summary && <p className="text-fg/90">{run.summary}</p>}

      {run.status === "waiting_clinician" && run.pending_question && (
        <QuestionPrompt runId={run.id} question={run.pending_question} canAnswer={can("clinician")} onAnswered={resumed} />
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <Card title="Decision timeline">
          <DecisionTimeline decisions={run.decisions} live={live} />
        </Card>
        <div className="flex flex-col gap-6">
          {shortlist !== null && (
            <Card title={run.status === "awaiting_review" ? "Review the shortlist" : "Shortlist"}>
              <ReviewPanel
                runId={run.id}
                items={shortlist}
                canReview={can("clinician")}
                reviewable={run.status === "awaiting_review"}
                onReviewed={resumed}
              />
            </Card>
          )}
          {referrals !== null && (
            <Card title="Referral drafts">
              {referrals.length ? (
                <div className="flex flex-col gap-4">
                  {referrals.map((r) => (
                    <ReferralEditor key={r.id} referral={r} canEdit={can("clinician")} />
                  ))}
                </div>
              ) : (
                <p className="text-muted">No referrals: no trial was approved.</p>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
