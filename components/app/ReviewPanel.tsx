"use client";

import { useState, type FormEvent } from "react";
import { api, ApiError } from "@/lib/api/client";
import { ReviewRequest, RunAccepted, type ReviewDecision, type ShortlistItem } from "@/lib/api/schemas";
import { buttonPrimary, ErrorNote, inputClass } from "./bits";
import { CriterionTable } from "./CriterionTable";

type Choice = { decision: ReviewDecision | ""; comment: string; note: string };
const EMPTY: Choice = { decision: "", comment: "", note: "" };

/** Shortlist with every rule's verdict. Clinicians approve, reject, or approve with a note for the referral. */
export function ReviewPanel({
  runId,
  items,
  canReview,
  reviewable,
  onReviewed,
}: {
  runId: string;
  items: readonly ShortlistItem[];
  canReview: boolean;
  reviewable: boolean;
  onReviewed: () => void;
}) {
  const [choices, setChoices] = useState<Partial<Record<string, Choice>>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const editing = canReview && reviewable;

  const set = (nct: string, patch: Partial<Choice>) =>
    setChoices((c) => ({ ...c, [nct]: { ...(c[nct] ?? EMPTY), ...patch } }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    const missing = items.filter((i) => !choices[i.nct_id]?.decision);
    if (missing.length) {
      setError(`Choose a decision for every trial (${missing.map((m) => m.nct_id).join(", ")}).`);
      return;
    }
    const payload = ReviewRequest.safeParse({
      items: items.map((i) => {
        const c = choices[i.nct_id] ?? EMPTY;
        return {
          nct_id: i.nct_id,
          decision: c.decision,
          ...(c.comment.trim() ? { comment: c.comment.trim() } : {}),
          ...(c.decision === "edit" ? { edits: { note: c.note.trim() } } : {}),
        };
      }),
    });
    if (!payload.success) {
      setError("Approve with note needs a note for the referral.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api(`/api/runs/${runId}/review`, RunAccepted, { method: "POST", body: payload.data });
      onReviewed();
    } catch (err) {
      setError(err instanceof ApiError ? err.detail || `Could not submit (HTTP ${err.status})` : "Could not submit");
    } finally {
      setBusy(false);
    }
  }

  if (!items.length) return <p className="text-muted">No trials were shortlisted.</p>;

  const list = (
    <ol className="flex flex-col gap-6">
      {items.map((item) => {
        const c = choices[item.nct_id];
        const counts = Object.entries(item.counts)
          .map(([k, n]) => `${n} ${k.replace("_", " ")}`)
          .join(" · ");
        return (
          <li key={item.nct_id} className="rounded-xl border border-line bg-bg p-4">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="font-mono text-sm text-muted">#{item.rank}</span>
              <a
                href={`https://clinicaltrials.gov/study/${item.nct_id}`}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-sm text-accent underline"
              >
                {item.nct_id}
              </a>
              {item.status !== "draft" && (
                <span className="rounded-full bg-card-raised px-2 py-0.5 text-xs text-muted">{item.status}</span>
              )}
            </div>
            <h3 className="mt-1 font-display text-lg font-bold">{item.title}</h3>
            {item.explanation && <p className="mt-1 text-sm text-fg/90">{item.explanation}</p>}
            {counts && <p className="mt-1 text-xs text-muted">{counts}</p>}
            <div className="mt-3">
              <CriterionTable verdicts={item.verdicts} caption={`Eligibility rules for ${item.nct_id}`} />
            </div>
            {editing && (
              <fieldset className="mt-4 flex flex-col gap-3 border-t border-line pt-4">
                <legend className="sr-only">Decision for {item.nct_id}</legend>
                <div className="flex flex-wrap gap-4">
                  {(
                    [
                      ["approve", "Approve"],
                      ["edit", "Approve with note"],
                      ["reject", "Reject"],
                    ] as const
                  ).map(([value, label]) => (
                    <label key={value} className="inline-flex items-center gap-2">
                      <input
                        type="radio"
                        name={`decision-${item.nct_id}`}
                        value={value}
                        checked={c?.decision === value}
                        onChange={() => set(item.nct_id, { decision: value })}
                        className="accent-[var(--accent)]"
                      />
                      {label}
                    </label>
                  ))}
                </div>
                {c?.decision === "edit" && (
                  <label className="flex flex-col gap-1 text-sm">
                    Note for the referral draft
                    <textarea
                      value={c.note}
                      onChange={(e) => set(item.nct_id, { note: e.target.value })}
                      rows={2}
                      maxLength={2000}
                      className={inputClass}
                    />
                  </label>
                )}
                <label className="flex flex-col gap-1 text-sm">
                  Comment (optional)
                  <input
                    value={c?.comment ?? ""}
                    onChange={(e) => set(item.nct_id, { comment: e.target.value })}
                    maxLength={2000}
                    className={inputClass}
                  />
                </label>
              </fieldset>
            )}
          </li>
        );
      })}
    </ol>
  );

  if (!editing) {
    return (
      <div className="flex flex-col gap-4">
        {reviewable && !canReview && (
          <p className="text-sm text-muted">A clinician reviews this shortlist. Referrals are drafted only after approval.</p>
        )}
        {list}
      </div>
    );
  }
  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      {list}
      {error && <ErrorNote>{error}</ErrorNote>}
      <div>
        <button type="submit" disabled={busy} className={buttonPrimary}>
          {busy ? "Submitting…" : "Submit review"}
        </button>
      </div>
    </form>
  );
}
