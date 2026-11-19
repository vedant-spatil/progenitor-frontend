// Mirrors the backend run API serializers (progenitor-backend apps/runs/serializers.py).
// Change both together: an API change needs a matching change here.
import { z } from "zod";

export const RunStatus = z.enum([
  "queued",
  "running",
  "waiting_clinician",
  "awaiting_review",
  "completed",
  "failed",
  "cancelled",
]);
export type RunStatus = z.infer<typeof RunStatus>;

/** The run stops streaming events in these states (backend apps/runs/events.py TERMINAL). */
export const PAUSED_OR_DONE: ReadonlySet<RunStatus> = new Set([
  "awaiting_review",
  "waiting_clinician",
  "completed",
  "failed",
  "cancelled",
]);

export const Decision = z.object({
  step: z.number().int(),
  attempt: z.number().int(),
  action: z.string(),
  args: z.record(z.string(), z.unknown()),
  rationale: z.string(),
  state_refs: z.array(z.string()),
  confidence: z.number().nullable(),
  guard_outcome: z.string(),
  guard_detail: z.string(),
  created_at: z.string(),
});
export type Decision = z.infer<typeof Decision>;

export const Run = z.object({
  id: z.uuid(),
  patient_id: z.number().int(),
  patient_label: z.string(),
  status: RunStatus,
  pending_question: z.string(),
  summary: z.string(),
  error: z.string(),
  steps_used: z.number().int(),
  tokens_in: z.number().int(),
  tokens_out: z.number().int(),
  created_at: z.string(),
  started_at: z.string().nullable(),
  finished_at: z.string().nullable(),
  decisions: z.array(Decision),
});
export type Run = z.infer<typeof Run>;

export const RunCreateRequest = z.object({
  patient_id: z.number().int(),
  as_of: z.iso.date().optional(),
});
export const RunAccepted = z.object({ id: z.uuid(), status: RunStatus });

export const VerdictStatus = z.enum(["met", "not_met", "unknown", "not_applicable"]);

export const Verdict = z.object({
  criterion_index: z.number().int(),
  kind: z.enum(["inclusion", "exclusion"]),
  criterion_text: z.string(),
  status: VerdictStatus,
  evidence_refs: z.array(z.string()),
  reason: z.string(),
});

export const ShortlistItem = z.object({
  nct_id: z.string(),
  title: z.string(),
  rank: z.number().int(),
  explanation: z.string(),
  counts: z.record(z.string(), z.number()),
  status: z.enum(["draft", "approved", "rejected"]),
  verdicts: z.array(Verdict),
});
export type ShortlistItem = z.infer<typeof ShortlistItem>;

export const Shortlist = z.object({ status: RunStatus, items: z.array(ShortlistItem) });

export const AnswerRequest = z.object({ answer: z.string().min(1).max(2000) });

export const ReviewDecision = z.enum(["approve", "reject", "edit"]);
export const ReviewItem = z
  .object({
    nct_id: z.string().max(16),
    decision: ReviewDecision,
    comment: z.string().max(2000).optional(),
    edits: z.record(z.string(), z.unknown()).optional(),
  })
  .refine((i) => i.decision !== "edit" || (i.edits && Object.keys(i.edits).length > 0), {
    message: "edits are required when decision is 'edit'",
    path: ["edits"],
  });
export const ReviewRequest = z.object({ items: z.array(ReviewItem).min(1) });

export const Referral = z.object({
  id: z.number().int(),
  nct_id: z.string(),
  body: z.string(),
  status: z.enum(["draft", "edited", "discarded"]),
  approved_by: z.number().int(),
  created_at: z.string(),
});
export const Referrals = z.object({ status: RunStatus, items: z.array(Referral) });

/** Server-sent events from GET /api/runs/{id}/events. */
export const RunSnapshotEvent = z.object({
  status: RunStatus,
  steps_used: z.number().int(),
  pending_question: z.string(),
  last_step: z.number().int().nullable(),
});
export const RunDecisionEvent = z.object({
  step: z.number().int(),
  attempt: z.number().int(),
  action: z.string(),
  guard_outcome: z.string(),
  state_refs: z.array(z.string()),
});
export const RunStatusEvent = z.object({
  status: RunStatus,
  steps_used: z.number().int().optional(),
  error: z.string().optional(),
});

// ---------------- Phase 7b additions ----------------

export const Role = z.enum(["coordinator", "clinician", "admin"]);
export type Role = z.infer<typeof Role>;

/** GET /api/me */
export const Me = z.object({ id: z.number().int(), username: z.string(), roles: z.array(Role) });
export type Me = z.infer<typeof Me>;

/** GET /api/patients: synthetic labels only. */
export const Patient = z.object({ id: z.number().int(), label: z.string(), source: z.string() });
export type Patient = z.infer<typeof Patient>;
export const PatientList = z.object({ items: z.array(Patient) });

/** GET /api/runs: newest first, at most 50. */
export const RunListItem = z.object({
  id: z.uuid(),
  patient_id: z.number().int(),
  patient_label: z.string(),
  status: RunStatus,
  created_at: z.string(),
  finished_at: z.string().nullable(),
});
export type RunListItem = z.infer<typeof RunListItem>;
export const RunList = z.object({ items: z.array(RunListItem) });

/** PATCH /api/referrals/{id}: edit the text, or discard. Clinician only. */
export const ReferralUpdateRequest = z
  .object({ body: z.string().max(20000).optional(), discard: z.boolean().optional() })
  .refine((r) => r.discard || (r.body ?? "").trim().length > 0, { message: "body is required", path: ["body"] });
export type Referral = z.infer<typeof Referral>;
export type Verdict = z.infer<typeof Verdict>;
export type ReviewDecision = z.infer<typeof ReviewDecision>;

/** POST /api/auth/token and /api/auth/token/refresh (simplejwt). */
export const TokenPair = z.object({ access: z.string(), refresh: z.string() });
export const TokenRefresh = z.object({ access: z.string() });
