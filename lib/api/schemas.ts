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

/** GET /api/patients: synthetic labels and run stats only (no FHIR id, no profile). */
export const Patient = z.object({
  id: z.number().int(),
  label: z.string(),
  source: z.string(),
  profile_cached_at: z.string().nullable(),
  run_count: z.number().int(),
  last_run_status: RunStatus.nullable(),
});
export type Patient = z.infer<typeof Patient>;
export const PatientList = z.object({ items: z.array(Patient) });

/** GET /api/runs: newest first, 50 per page. Filters: status (comma list), patient, q, mine, before (cursor). */
export const RunListItem = z.object({
  id: z.uuid(),
  patient_id: z.number().int(),
  patient_label: z.string(),
  status: RunStatus,
  created_at: z.string(),
  finished_at: z.string().nullable(),
});
export type RunListItem = z.infer<typeof RunListItem>;
export const RunList = z.object({ items: z.array(RunListItem), next: z.string().nullable() });

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

// ---------------- Phase 7c additions (backend apps/runs/browse.py, ADR 0007) ----------------

/** GET /api/overview: counts by status, the user's queue (by role), the latest decisions (action only). */
export const QueueReason = z.enum(["answer_question", "review_shortlist", "failed", "referral_drafts"]);
export type QueueReason = z.infer<typeof QueueReason>;
export const Overview = z.object({
  counts: z.record(RunStatus, z.number().int()),
  queue: z.array(
    z.object({
      run_id: z.uuid(),
      patient_label: z.string(),
      status: RunStatus,
      reason: QueueReason,
      since: z.string(),
    }),
  ),
  recent: z.array(
    z.object({
      run_id: z.uuid(),
      patient_label: z.string(),
      step: z.number().int(),
      action: z.string(),
      guard_outcome: z.string(),
      created_at: z.string(),
    }),
  ),
});
export type Overview = z.infer<typeof Overview>;

/** Cached Profiler output (backend agents/schemas.py PatientProfile). Every fact carries its FHIR resource id. */
const Fact = z.object({ resource_id: z.string(), system: z.string(), code: z.string(), display: z.string() });
export const PatientProfile = z.object({
  patient_ref: z.string(),
  age_years: z.number().int().nullable(),
  sex: z.string(),
  conditions: z.array(
    Fact.extend({ clinical_status: z.string(), onset: z.string().nullable(), abatement: z.string().nullable() }),
  ),
  medications: z.array(Fact.extend({ status: z.string(), authored_on: z.string().nullable() })),
  labs: z.array(
    Fact.extend({
      value: z.number().nullable(),
      value_text: z.string(),
      unit: z.string(),
      effective: z.string().nullable(),
      category: z.string(),
    }),
  ),
  truncated: z.boolean(),
  notes: z.array(z.object({ resource_id: z.string(), text: z.string() })),
});
export type PatientProfile = z.infer<typeof PatientProfile>;

const ShortlistStatus = z.enum(["draft", "approved", "rejected"]);

/** GET /api/patients/{id} */
export const PatientDetail = z.object({
  id: z.number().int(),
  label: z.string(),
  source: z.string(),
  profile_cached_at: z.string().nullable(),
  profile: PatientProfile.nullable(),
  runs: z.array(RunListItem),
  shortlisted: z.array(
    z.object({
      run_id: z.uuid(),
      nct_id: z.string(),
      title: z.string(),
      rank: z.number().int(),
      counts: z.record(z.string(), z.number()),
      status: ShortlistStatus,
      created_at: z.string(),
    }),
  ),
});
export type PatientDetail = z.infer<typeof PatientDetail>;

/** GET /api/trials: 25 per page. Filters: q, status, phase, shortlisted, page. */
export const TrialRow = z.object({
  nct_id: z.string(),
  title: z.string(),
  overall_status: z.string(),
  phases: z.array(z.string()),
  conditions: z.array(z.string()),
  minimum_age: z.string(),
  maximum_age: z.string(),
  sex: z.string(),
  criteria_count: z.number().int(),
  shortlisted_count: z.number().int(),
});
export type TrialRow = z.infer<typeof TrialRow>;
export const TrialList = z.object({
  items: z.array(TrialRow),
  total: z.number().int(),
  page: z.number().int(),
  page_size: z.number().int(),
  statuses: z.array(z.string()),
});

/** GET /api/trials/{nct_id}: criteria and the runs that shortlisted the trial (counts and status, no reasons). */
export const TrialDetail = z.object({
  nct_id: z.string(),
  title: z.string(),
  overall_status: z.string(),
  phases: z.array(z.string()),
  conditions: z.array(z.string()),
  minimum_age: z.string(),
  maximum_age: z.string(),
  sex: z.string(),
  healthy_volunteers: z.boolean().nullable(),
  source_last_updated: z.string().nullable(),
  fetched_at: z.string(),
  criteria: z.array(z.object({ position: z.number().int(), kind: z.enum(["inclusion", "exclusion"]), source_text: z.string() })),
  matches: z.array(
    z.object({
      run_id: z.uuid(),
      patient_id: z.number().int(),
      patient_label: z.string(),
      rank: z.number().int(),
      counts: z.record(z.string(), z.number()),
      status: ShortlistStatus,
      created_at: z.string(),
    }),
  ),
});
export type TrialDetail = z.infer<typeof TrialDetail>;

/** GET /api/referrals?status=: referral drafts across runs. */
export const ReferralStatus = z.enum(["draft", "edited", "discarded"]);
export type ReferralStatus = z.infer<typeof ReferralStatus>;
export const InboxReferral = Referral.extend({
  title: z.string(),
  run_id: z.uuid(),
  patient_label: z.string(),
  edited_by: z.string().nullable(),
  updated_at: z.string(),
});
export type InboxReferral = z.infer<typeof InboxReferral>;
export const ReferralInbox = z.object({
  counts: z.record(ReferralStatus, z.number().int()),
  next: z.string().nullable(),
  items: z.array(InboxReferral),
});

/** GET /api/audit (admin only): event metadata. The API never returns payloads. */
export const AuditLog = z.object({
  kinds: z.array(z.object({ value: z.string(), label: z.string() })),
  next: z.string().nullable(),
  items: z.array(
    z.object({
      id: z.number().int(),
      created_at: z.string(),
      kind: z.string(),
      kind_label: z.string(),
      actor: z.string().nullable(),
      node: z.string(),
      run_id: z.uuid().nullable(),
    }),
  ),
});
export type AuditLog = z.infer<typeof AuditLog>;

/** GET /api/evals: Phase 6 reports (newest first) and the gate thresholds (ADR 0005). */
const num = z.number().nullable().optional();
export const EvalRow = z.object({
  patients: num,
  "ndcg@10": num,
  "ndcg@5": num,
  "p@5": num,
  mrr: num,
  unknown_rate: num,
  citation_validity: num,
  tokens_per_patient: num,
  cost_per_patient_usd: num,
  seconds_per_patient: num,
  errors: num,
});
export type EvalRow = z.infer<typeof EvalRow>;
export const EvalReport = z.object({
  id: z.string(),
  created_at: z.string(),
  config: z.object({
    model: z.string().nullable().optional(),
    patients: num,
    scored: num,
    per_cohort: num,
    pool_size: num,
    seed: num,
    snapshot: z.string().nullable().optional(),
    replay: z.boolean().nullable().optional(),
    spent_calls: num,
    spent_tokens_in: num,
    spent_tokens_out: num,
    spent_usd: num,
  }),
  table: z.record(z.string(), z.record(z.string(), EvalRow)),
  fails: z.array(z.string()),
});
export type EvalReport = z.infer<typeof EvalReport>;
export const EvalThresholds = z.object({
  supervisor_minus_bm25_ndcg10: num,
  supervisor_minus_fixed_ndcg10: num,
  citation_validity: num,
  baseline: z.record(z.string(), z.unknown()).nullable().optional(),
  adr: z.string().nullable().optional(),
});
export type EvalThresholds = z.infer<typeof EvalThresholds>;
export const EvalReports = z.object({ thresholds: EvalThresholds.nullable(), reports: z.array(EvalReport) });

/** Demo cases (backend apps/runs/demo.py, Phase 9): preset synthetic patients for one-click runs. */
export const DemoCase = z.object({
  patient_id: z.number().int(),
  label: z.string(),
  age_years: z.number().int().nullable(),
  sex: z.string(),
  conditions: z.array(z.string()),
  latest_run: z.object({ id: z.uuid(), status: RunStatus, created_at: z.string() }).nullable(),
});
export type DemoCase = z.infer<typeof DemoCase>;
export const DemoCases = z.object({ items: z.array(DemoCase) });
export const DemoStart = z.object({ id: z.uuid(), status: RunStatus, created: z.boolean() });
export const DemoReset = z.object({ cancelled: z.number().int() });
