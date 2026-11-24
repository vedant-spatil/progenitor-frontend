// Gate 7b e2e: start run -> see decisions stream -> answer clinician question -> approve -> referral draft.
// The API is mocked at the network layer with a small state machine that follows the backend contract
// (apps/runs: statuses, SSE events, payloads). Roles and persistence are tested in the backend repo.
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page, type Route } from "@playwright/test";

const RUN_ID = "3fa85f64-5717-4562-b3fc-2c963f66afa6";
const NCT = "NCT04000001";

type Status = "queued" | "running" | "waiting_clinician" | "awaiting_review" | "completed";

function decision(step: number, action: string, rationale: string, refs: string[] = []) {
  return {
    step,
    attempt: 1,
    action,
    args: {},
    rationale,
    state_refs: refs,
    confidence: 0.8,
    guard_outcome: "accepted",
    guard_detail: "",
    created_at: "2026-11-19T10:00:00Z",
  };
}

async function mockApi(page: Page) {
  const state = {
    status: "queued" as Status,
    decisions: [] as ReturnType<typeof decision>[],
    created: false,
    answer: "",
    review: null as unknown,
    referral: { id: 7, nct_id: NCT, body: "Dear colleague, referral draft.", status: "draft", approved_by: 2, created_at: "2026-11-19T10:05:00Z" },
    patch: null as unknown,
  };

  const run = () => ({
    id: RUN_ID,
    patient_id: 1,
    patient_label: "Synthea 001",
    status: state.status,
    pending_question: state.status === "waiting_clinician" ? "Has the patient used insulin in the last 3 months?" : "",
    summary: state.status === "completed" ? "1 trial approved." : "",
    error: "",
    steps_used: state.decisions.length,
    tokens_in: 0,
    tokens_out: 0,
    created_at: "2026-11-19T10:00:00Z",
    started_at: "2026-11-19T10:00:01Z",
    finished_at: state.status === "completed" ? "2026-11-19T10:06:00Z" : null,
    decisions: state.decisions,
  });

  const json = (route: Route, body: unknown, status = 200) =>
    route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });

  await page.route("**/api/**", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const path = url.pathname;
    const method = req.method();

    if (path === "/api/auth/token") return json(route, { access: "access-1", refresh: "refresh-1" });
    if (path === "/api/me") return json(route, { id: 2, username: "demo", roles: ["coordinator", "clinician"] });
    if (path === "/api/patients") {
      const patient = { id: 1, label: "Synthea 001", source: "synthea", profile_cached_at: null, run_count: 0, last_run_status: null };
      return json(route, { items: [patient] });
    }
    if (path === "/api/demo") return json(route, { items: [] });
    if (path === "/api/demo") return json(route, { items: [] });
    if (path === "/api/overview") {
      const counts = { queued: 0, running: 0, waiting_clinician: 0, awaiting_review: 0, completed: 0, failed: 0, cancelled: 0 };
      return json(route, { counts, queue: [], recent: [] });
    }
    if (path === "/api/runs" && method === "GET") {
      const items = state.created
        ? [{ id: RUN_ID, patient_id: 1, patient_label: "Synthea 001", status: state.status, created_at: "2026-11-19T10:00:00Z", finished_at: null }]
        : [];
      return json(route, { items, next: null });
    }
    if (path === "/api/runs" && method === "POST") {
      state.created = true;
      return json(route, { id: RUN_ID, status: "queued" }, 201);
    }
    if (path === `/api/runs/${RUN_ID}/events`) {
      // The worker "runs": decisions stream in, then the supervisor asks a question (or resumes after one).
      let body = "";
      const sse = (event: string, data: unknown) => (body += `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
      if (state.status === "queued") {
        sse("snapshot", { status: "running", steps_used: 0, pending_question: "", last_step: null });
        state.status = "waiting_clinician";
        state.decisions = [
          decision(1, "fetch_record", "Need the record first.", ["Patient/p1"]),
          decision(2, "search_trials", "Search recruiting T2DM trials.", ["Condition/c1"]),
          decision(3, "ask_clinician", "Insulin history is missing from the record."),
        ];
        for (const d of state.decisions) sse("decision", { step: d.step, attempt: 1, action: d.action, guard_outcome: "accepted", state_refs: d.state_refs });
        sse("status", { status: "waiting_clinician", steps_used: 3 });
      } else {
        sse("snapshot", { status: state.status, steps_used: state.decisions.length, pending_question: "", last_step: state.decisions.length });
      }
      return route.fulfill({ status: 200, contentType: "text/event-stream", body });
    }
    if (path === `/api/runs/${RUN_ID}` && method === "GET") return json(route, run());
    if (path === `/api/runs/${RUN_ID}/answer`) {
      state.answer = JSON.parse(req.postData() ?? "{}").answer;
      state.decisions.push(decision(4, "judge_trials", "Answer received; judge the candidates."), decision(5, "rank_shortlist", "Rank by met rules."));
      state.status = "awaiting_review";
      return json(route, { id: RUN_ID, status: "queued" }, 202);
    }
    if (path === `/api/runs/${RUN_ID}/shortlist`) {
      return json(route, {
        status: state.status,
        items: [
          {
            nct_id: NCT,
            title: "GLP-1 therapy added to metformin",
            rank: 1,
            explanation: "All inclusion rules met.",
            counts: { met: 2, unknown: 1 },
            status: state.status === "completed" ? "approved" : "draft",
            verdicts: [
              { criterion_index: 0, kind: "inclusion", criterion_text: "HbA1c 7.5-10.5%", status: "met", evidence_refs: ["Observation/hba1c-1"], reason: "8.4%" },
              { criterion_index: 1, kind: "exclusion", criterion_text: "Insulin in the last 3 months", status: "met", evidence_refs: ["MedicationRequest/m1"], reason: "none since 2025-11" },
              { criterion_index: 2, kind: "inclusion", criterion_text: "Owns a smartphone", status: "unknown", evidence_refs: [], reason: "" },
            ],
          },
        ],
      });
    }
    if (path === `/api/runs/${RUN_ID}/review`) {
      state.review = JSON.parse(req.postData() ?? "{}");
      state.decisions.push(decision(6, "draft_referrals", "Clinician approved one trial."));
      state.status = "completed";
      return json(route, { id: RUN_ID, status: "queued" }, 202);
    }
    if (path === `/api/runs/${RUN_ID}/referrals`) return json(route, { status: state.status, items: [state.referral] });
    if (path === `/api/referrals/${state.referral.id}` && method === "PATCH") {
      state.patch = JSON.parse(req.postData() ?? "{}");
      state.referral = { ...state.referral, body: (state.patch as { body: string }).body, status: "edited" };
      return json(route, state.referral);
    }
    return json(route, { detail: "Not found." }, 404);
  });
  return state;
}

test("start run, watch decisions, answer, approve, edit the referral", async ({ page }) => {
  const state = await mockApi(page);

  await page.goto("/app");
  await expect(page).toHaveURL(/\/login\?next=%2Fapp$/);
  await page.getByLabel("Username").fill("demo");
  await page.getByLabel("Password").fill("demo-password-123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Welcome, demo" })).toBeVisible();
  await page.getByRole("navigation", { name: "App" }).getByRole("link", { name: "Runs", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Runs", exact: true })).toBeVisible();
  await expect(page.getByText("No runs yet.")).toBeVisible();

  await page.getByRole("link", { name: "New run" }).first().click();
  await page.getByLabel("Synthetic patient").selectOption("1");
  await page.getByRole("button", { name: "Start match" }).click();
  await expect(page).toHaveURL(new RegExp(`/app/runs/${RUN_ID}$`));

  // Decisions stream in, then the supervisor asks.
  const timeline = page.getByRole("region", { name: "Decision timeline" });
  await expect(timeline.getByText("ask_clinician")).toBeVisible();
  await expect(timeline.getByText("fetch_record")).toBeVisible();
  await expect(page.getByText("Has the patient used insulin in the last 3 months?")).toBeVisible();

  await page.getByLabel("Your answer (synthetic data only)").fill("No insulin since 2025.");
  await page.getByRole("button", { name: "Send answer" }).click();

  // Shortlist with the criterion table.
  const review = page.getByRole("region", { name: "Review the shortlist" });
  await expect(review.getByText("GLP-1 therapy added to metformin")).toBeVisible();
  await expect(review.getByText("Owns a smartphone")).toBeVisible();
  await expect(review.getByText("Observation/hba1c-1")).toBeVisible();
  await review.getByLabel("Approve", { exact: true }).check();
  await review.getByRole("button", { name: "Submit review" }).click();

  // Referral draft appears; edit and save it.
  const drafts = page.getByRole("region", { name: "Referral drafts" });
  const text = drafts.getByLabel(`Referral text for ${NCT}`);
  await expect(text).toHaveValue("Dear colleague, referral draft.");
  await text.fill("Dear colleague, edited referral.");
  await drafts.getByRole("button", { name: "Save draft" }).click();
  await expect(drafts.getByRole("status")).toHaveText("Saved");

  const [scroll, inner] = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
  expect(scroll).toBeLessThanOrEqual(inner);

  expect(state.answer).toBe("No insulin since 2025.");
  expect(state.review).toEqual({ items: [{ nct_id: NCT, decision: "approve" }] });
  expect(state.patch).toEqual({ body: "Dear colleague, edited referral." });

  const results = await new AxeBuilder({ page }).analyze();
  const bad = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(bad.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
});

test("sign-in shows an error for wrong credentials", async ({ page }) => {
  await page.route("**/api/auth/token", (route) =>
    route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ detail: "No active account" }) }),
  );
  await page.goto("/login");
  await page.getByLabel("Username").fill("demo");
  await page.getByLabel("Password").fill("wrong");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.locator("form").getByRole("alert")).toHaveText("Wrong username or password.");
});

test("axe on sign-in and runs pages", async ({ page }) => {
  await mockApi(page);
  await page.goto("/login");
  let r = await new AxeBuilder({ page }).analyze();
  expect(r.violations.filter((v) => v.impact === "serious" || v.impact === "critical")).toEqual([]);
  await page.evaluate(() => {
    sessionStorage.setItem("progenitor.access", "a");
    sessionStorage.setItem("progenitor.refresh", "r");
  });
  await page.goto("/app/runs");
  await expect(page.getByRole("heading", { name: "Runs", exact: true })).toBeVisible();
  r = await new AxeBuilder({ page }).analyze();
  expect(r.violations.filter((v) => v.impact === "serious" || v.impact === "critical")).toEqual([]);
});
