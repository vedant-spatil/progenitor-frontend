"use client";

import { useState } from "react";
import { api, ApiError } from "@/lib/api/client";
import { Referral, ReferralUpdateRequest } from "@/lib/api/schemas";
import { buttonPrimary, buttonSecondary, ErrorNote, formatTime, inputClass } from "./bits";

/** One referral draft. Clinicians can edit the text or discard it. Drafts are never sent anywhere. */
export function ReferralEditor({ referral, canEdit }: { referral: Referral; canEdit: boolean }) {
  const [current, setCurrent] = useState(referral);
  const [text, setText] = useState(referral.body);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const discarded = current.status === "discarded";
  const dirty = text !== current.body;

  async function save(body: { body?: string; discard?: boolean }) {
    const parsed = ReferralUpdateRequest.safeParse(body);
    if (!parsed.success) {
      setError("The draft cannot be empty.");
      return;
    }
    setBusy(true);
    setError("");
    setSaved(false);
    try {
      const next = await api(`/api/referrals/${current.id}`, Referral, { method: "PATCH", body: parsed.data });
      setCurrent(next);
      setText(next.body);
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail || `Could not save (HTTP ${err.status})` : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="rounded-xl border border-line bg-bg p-4" aria-label={`Referral draft for ${current.nct_id}`}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        <span className="font-mono text-accent">{current.nct_id}</span>
        <span className="rounded-full bg-card-raised px-2 py-0.5 text-xs text-muted">{current.status}</span>
        <span className="text-muted">{formatTime(current.created_at)}</span>
      </div>
      {canEdit && !discarded ? (
        <div className="mt-3 flex flex-col gap-3">
          <label htmlFor={`referral-${current.id}`} className="sr-only">
            Referral text for {current.nct_id}
          </label>
          <textarea
            id={`referral-${current.id}`}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setSaved(false);
            }}
            rows={10}
            maxLength={20000}
            className={`${inputClass} font-mono text-sm`}
          />
          {error && <ErrorNote>{error}</ErrorNote>}
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" disabled={busy || !dirty} onClick={() => save({ body: text })} className={buttonPrimary}>
              Save draft
            </button>
            <button type="button" disabled={busy} onClick={() => save({ discard: true })} className={buttonSecondary}>
              Discard
            </button>
            {saved && (
              <span role="status" className="text-sm text-success">
                Saved
              </span>
            )}
          </div>
        </div>
      ) : (
        <pre className="mt-3 font-mono text-sm whitespace-pre-wrap text-fg/90 [overflow-wrap:anywhere]">
          {discarded ? "Discarded." : current.body}
        </pre>
      )}
    </article>
  );
}
