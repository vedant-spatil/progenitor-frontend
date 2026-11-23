"use client";

import { useState, type FormEvent } from "react";
import { api, ApiError } from "@/lib/api/client";
import { AnswerRequest, RunAccepted } from "@/lib/api/schemas";
import { buttonPrimary, ErrorNote, inputClass } from "./bits";

/** The supervisor's question while the run waits for a clinician. Only clinicians can answer. */
export function QuestionPrompt({
  runId,
  question,
  canAnswer,
  onAnswered,
}: {
  runId: string;
  question: string;
  canAnswer: boolean;
  onAnswered: () => void;
}) {
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    const parsed = AnswerRequest.safeParse({ answer: answer.trim() });
    if (!parsed.success) {
      setError("Write an answer first.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api(`/api/runs/${runId}/answer`, RunAccepted, { method: "POST", body: parsed.data });
      setAnswer("");
      onAnswered();
    } catch (err) {
      setError(err instanceof ApiError ? err.detail || `Could not send (HTTP ${err.status})` : "Could not send");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-accent/50 bg-accent-soft/40 p-5">
      <p className="text-sm font-semibold text-accent">The supervisor asks</p>
      <p className="mt-1 text-lg">{question}</p>
      {canAnswer ? (
        <form onSubmit={submit} className="mt-4 flex flex-col gap-3">
          <label htmlFor="answer" className="text-sm text-muted">
            Your answer (synthetic data only)
          </label>
          <textarea
            id="answer"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            maxLength={2000}
            rows={3}
            className={inputClass}
          />
          {error && <ErrorNote>{error}</ErrorNote>}
          <div>
            <button type="submit" disabled={busy} className={buttonPrimary}>
              {busy ? "Sending…" : "Send answer"}
            </button>
          </div>
        </form>
      ) : (
        <p className="mt-3 text-sm text-muted">A clinician needs to answer before the run continues.</p>
      )}
    </div>
  );
}
