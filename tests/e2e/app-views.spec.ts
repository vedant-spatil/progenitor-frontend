// Gate 7c e2e (ADR 0007): home queue, patients, trials, referrals, audit, evals; axe and no page-level
// horizontal scroll on each page. The API is mocked at the network layer with the backend's shapes
// (apps/runs/browse.py). Roles and data rules are tested in the backend repo (tests/unit/test_app_api.py).
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page, type Route } from "@playwright/test";

const RUN = "3fa85f64-5717-4562-b3fc-2c963f66afa6";
const RUN2 = "9b2d0c1e-8f3a-4c55-9d7e-1a2b3c4d5e6f";
const NCT = "NCT04000001";
const T = "2026-11-20T10:00:00Z";

type Role = "coordinator" | "clinician" | "admin";

const counts = { queued: 0, running: 1, waiting_clinician: 1, awaiting_review: 1, completed: 3, failed: 1, cancelled: 0 };
const runRow = (id: string, status: string) => ({ id, patient_id: 1, patient_label: "Synthea 001", status, created_at: T, finished_at: null });

const profile = {
  patient_ref: "Patient/p1",
  age_years: 54,
  sex: "female",
  conditions: [{ resource_id: "Condition/c1", system: "snomed", code: "44054006", display: "Type 2 diabetes", clinical_status: "active", onset: "2019-04-02", abatement: null }],
  medications: [{ resource_id: "MedicationRequest/m1", system: "rxnorm", code: "860975", display: "Metformin 500 MG", status: "active", authored_on: "2025-01-10" }],
  labs: [{ resource_id: "Observation/hba1c-1", system: "loinc", code: "4548-4", display: "HbA1c", value: 8.4, value_text: "", unit: "%", effective: "2026-10-01", category: "laboratory" }],
  truncated: false,
  notes: [],
};

const evalRow = (ndcg: number) => ({
  patients: 10,
  "ndcg@10": ndcg,
  "ndcg@5": ndcg - 0.05,
  "p@5": 0.5,
  mrr: 0.7,
  unknown_rate: 0.3,
  citation_validity: 1.0,
  tokens_per_patient: 12000,
  cost_per_patient_usd: null,
  seconds_per_patient: 30.5,
  errors: 0,
});

async function mockApi(page: Page, roles: Role[]) {
  const demo = {
    items: [
      { patient_id: 1, label: "Synthea 001", age_years: 61, sex: "female", conditions: ["Type 2 diabetes", "Hypertension"], latest_run: { id: RUN2, status: "waiting_clinician", created_at: T } },
      { patient_id: 3, label: "Synthea 003", age_years: null, sex: "", conditions: [], latest_run: null },
    ],
    starts: [] as number[],
    resets: 0,
  };
  const state = { demo, referral: { id: 7, nct_id: NCT, body: "Dear colleague, draft.", status: "draft", approved_by: 2, created_at: T }, patch: null as unknown, auditQueries: [] as string[] };
  const json = (route: Route, body: unknown, status = 200) =>
    route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
  const reader = roles.includes("coordinator") || roles.includes("clinician");

  await page.route("**/api/**", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const path = url.pathname;
    if (path === "/api/me") return json(route, { id: 2, username: "demo", roles });
    if (path === "/api/audit") {
      if (!roles.includes("admin")) return json(route, { detail: "forbidden" }, 403);
      state.auditQueries.push(url.search);
      const kind = url.searchParams.get("kind");
      const items = [
        { id: 2, created_at: T, kind: "answer", kind_label: "Clinician answer", actor: "clinician", node: "api", run_id: RUN },
        { id: 1, created_at: T, kind: "phi_read", kind_label: "Patient record read", actor: null, node: "fhir", run_id: null },
      ].filter((e) => !kind || e.kind === kind);
      return json(route, {
        kinds: [
          { value: "phi_read", label: "Patient record read" },
          { value: "answer", label: "Clinician answer" },
        ],
        next: null,
        items,
      });
    }
    if (!reader) return json(route, { detail: "forbidden" }, 403);
    if (path === "/api/demo") return json(route, { items: demo.items });
    const demoStart = path.match(/^\/api\/demo\/(\d+)\/start$/);
    if (demoStart && req.method() === "POST") {
      if (!roles.includes("coordinator")) return json(route, { detail: "forbidden" }, 403);
      demo.starts.push(Number(demoStart[1]));
      return json(route, { id: RUN, status: "queued", created: true }, 201);
    }
    if (path === "/api/demo/reset" && req.method() === "POST") {
      if (!roles.includes("coordinator")) return json(route, { detail: "forbidden" }, 403);
      demo.resets += 1;
      demo.items[0].latest_run = { ...demo.items[0].latest_run!, status: "cancelled" };
      return json(route, { cancelled: 1 });
    }
    if (path === "/api/demo") return json(route, { items: [] });
    if (path === "/api/overview") {
      const queue = [];
      if (roles.includes("clinician")) {
        queue.push({ run_id: RUN, patient_label: "Synthea 001", status: "waiting_clinician", reason: "answer_question", since: T });
        queue.push({ run_id: RUN2, patient_label: "Synthea 002", status: "awaiting_review", reason: "review_shortlist", since: T });
      }
      if (roles.includes("coordinator")) {
        queue.push({ run_id: RUN2, patient_label: "Synthea 002", status: "failed", reason: "failed", since: T });
      }
      return json(route, {
        counts,
        queue,
        recent: [{ run_id: RUN, patient_label: "Synthea 001", step: 3, action: "ask_clinician", guard_outcome: "accepted", created_at: T }],
      });
    }
    if (path === "/api/runs") {
      const status = url.searchParams.get("status");
      const items = [runRow(RUN, "waiting_clinician"), runRow(RUN2, "failed")].filter((r) => !status || status.split(",").includes(r.status));
      return json(route, { items, next: null });
    }
    if (path === "/api/patients") {
      return json(route, {
        items: [
          { id: 1, label: "Synthea 001", source: "synthea", profile_cached_at: T, run_count: 2, last_run_status: "waiting_clinician" },
          { id: 2, label: "MIMIC 004", source: "mimic", profile_cached_at: null, run_count: 0, last_run_status: null },
        ],
      });
    }
    if (path === "/api/patients/1") {
      return json(route, {
        id: 1,
        label: "Synthea 001",
        source: "synthea",
        profile_cached_at: T,
        profile,
        runs: [runRow(RUN, "waiting_clinician")],
        shortlisted: [{ run_id: RUN, nct_id: NCT, title: "GLP-1 therapy added to metformin", rank: 1, counts: { met: 2, unknown: 1 }, status: "draft", created_at: T }],
      });
    }
    if (path === "/api/trials") {
      const q = (url.searchParams.get("q") ?? "").toLowerCase();
      const all = [
        { nct_id: NCT, title: "GLP-1 therapy added to metformin", overall_status: "RECRUITING", phases: ["PHASE3"], conditions: ["Type 2 Diabetes"], minimum_age: "18 Years", maximum_age: "75 Years", sex: "ALL", criteria_count: 3, shortlisted_count: 1 },
        { nct_id: "NCT04000002", title: "Exercise and HbA1c", overall_status: "RECRUITING", phases: [], conditions: ["Prediabetes"], minimum_age: "", maximum_age: "", sex: "ALL", criteria_count: 0, shortlisted_count: 0 },
      ];
      const items = all.filter((t) => !q || t.nct_id.toLowerCase().includes(q) || t.title.toLowerCase().includes(q));
      return json(route, { items, total: items.length, page: 1, page_size: 25, statuses: ["RECRUITING"] });
    }
    if (path === `/api/trials/${NCT}`) {
      return json(route, {
        nct_id: NCT,
        title: "GLP-1 therapy added to metformin",
        overall_status: "RECRUITING",
        phases: ["PHASE3"],
        conditions: ["Type 2 Diabetes"],
        minimum_age: "18 Years",
        maximum_age: "75 Years",
        sex: "ALL",
        healthy_volunteers: false,
        source_last_updated: "2026-10-01",
        fetched_at: T,
        criteria: [
          { position: 0, kind: "inclusion", source_text: "HbA1c 7.5-10.5%" },
          { position: 1, kind: "exclusion", source_text: "Insulin in the last 3 months" },
        ],
        matches: [{ run_id: RUN, patient_id: 1, patient_label: "Synthea 001", rank: 1, counts: { met: 2, unknown: 1 }, status: "draft", created_at: T }],
      });
    }
    if (path === "/api/referrals") {
      const status = url.searchParams.get("status");
      const r = { ...state.referral, title: "GLP-1 therapy added to metformin", run_id: RUN, patient_label: "Synthea 001", edited_by: null, updated_at: T };
      return json(route, {
        counts: { draft: state.referral.status === "draft" ? 1 : 0, edited: state.referral.status === "edited" ? 1 : 0, discarded: 0 },
        next: null,
        items: r.status === status ? [r] : [],
      });
    }
    if (path === `/api/referrals/${state.referral.id}` && req.method() === "PATCH") {
      state.patch = JSON.parse(req.postData() ?? "{}");
      state.referral = { ...state.referral, body: (state.patch as { body: string }).body, status: "edited" };
      return json(route, state.referral);
    }
    if (path === "/api/evals") {
      return json(route, {
        thresholds: { supervisor_minus_bm25_ndcg10: 0.05, supervisor_minus_fixed_ndcg10: -0.05, citation_validity: 1.0, baseline: {}, adr: "docs/decisions/0005-phase6-eval-design.md" },
        reports: [
          {
            id: "20261120-0633",
            created_at: "2026-11-20T06:33:00Z",
            config: { model: "kimi", patients: 30, scored: 30, per_cohort: 10, pool_size: 10, seed: 7, snapshot: "034e628c", replay: false, spent_calls: 467, spent_tokens_in: 1000, spent_tokens_out: 2000, spent_usd: null },
            table: {
              sigir: { bm25: evalRow(0.72), fixed: evalRow(0.87), supervisor: evalRow(0.86) },
              trec_2021: { bm25: evalRow(0.75), fixed: evalRow(0.88), supervisor: evalRow(0.85) },
              all: { bm25: evalRow(0.74), fixed: evalRow(0.88), supervisor: evalRow(0.86) },
            },
            fails: [],
          },
        ],
      });
    }
    return json(route, { detail: "Not found." }, 404);
  });
  return state;
}

async function signedIn(page: Page, roles: Role[], path: string) {
  const state = await mockApi(page, roles);
  await page.goto("/login");
  await page.evaluate(() => {
    sessionStorage.setItem("progenitor.access", "a");
    sessionStorage.setItem("progenitor.refresh", "r");
  });
  await page.goto(path);
  return state;
}

async function checkPage(page: Page) {
  const [scroll, inner] = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
  expect(scroll).toBeLessThanOrEqual(inner);
  const results = await new AxeBuilder({ page }).analyze();
  const bad = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(bad.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
}

const nav = (page: Page) => page.getByRole("navigation", { name: "App" });

test("home: status tiles and the clinician queue", async ({ page }) => {
  await signedIn(page, ["clinician"], "/app");
  await expect(page.getByRole("heading", { name: "Welcome, demo" })).toBeVisible();
  const tiles = page.getByRole("region", { name: "Runs by status" });
  await expect(tiles.getByRole("link", { name: /Completed\s*3/ })).toBeVisible();
  const queue = page.getByRole("region", { name: "My queue" });
  await expect(queue.getByText("Answer the clinician question")).toBeVisible();
  await expect(queue.getByText("Review the shortlist")).toBeVisible();
  await expect(queue.getByText("Run failed")).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Recent decisions" }).getByText("ask_clinician")).toBeVisible();
  // Clinicians do not start runs; admins-only links stay hidden.
  await expect(nav(page).getByRole("link", { name: "New run" })).toHaveCount(0);
  await expect(nav(page).getByRole("link", { name: "Audit" })).toHaveCount(0);
  await checkPage(page);

  await tiles.getByRole("link", { name: /Failed/ }).click();
  await expect(page).toHaveURL(/\/app\/runs\?status=failed(%2C|,)cancelled$/);
  await expect(page.getByRole("heading", { name: "Runs", exact: true })).toBeVisible();
  await expect(page.getByRole("radio", { name: "Failed" })).toBeChecked();
  await expect(page.getByRole("region", { name: "Matching runs" }).getByRole("link")).toHaveCount(1);
  await expect(nav(page).getByRole("link", { name: "Runs", exact: true })).toHaveAttribute("aria-current", "page");
  await checkPage(page);
});

test("home: demo cases start a run in one click and reset cancels open ones", async ({ page }) => {
  const state = await signedIn(page, ["coordinator"], "/app");
  const card = page.getByRole("region", { name: "Demo cases" });
  await expect(card.getByText("Type 2 diabetes, Hypertension")).toBeVisible();
  await expect(card.getByText("61 y · female")).toBeVisible();
  // An open run links to its page and has no second Start.
  await expect(card.getByRole("link", { name: "Open run for Synthea 001" })).toHaveAttribute("href", `/app/runs/${RUN2}`);
  await expect(card.getByRole("button", { name: /demo run for Synthea 001/ })).toHaveCount(0);
  await checkPage(page);

  await card.getByRole("button", { name: "Reset demo" }).click();
  await card.getByRole("button", { name: "Yes, reset" }).click();
  await expect(card.getByRole("status")).toHaveText("Cancelled 1 open demo run.");
  expect(state.demo.resets).toBe(1);
  await expect(card.getByRole("button", { name: "Run again demo run for Synthea 001" })).toBeVisible();

  await card.getByRole("button", { name: "Start demo run for Synthea 003" }).click();
  await expect(page).toHaveURL(new RegExp(`/app/runs/${RUN}$`));
  expect(state.demo.starts).toEqual([3]);
});

test("home: clinicians see demo cases but cannot start or reset", async ({ page }) => {
  await signedIn(page, ["clinician"], "/app");
  const card = page.getByRole("region", { name: "Demo cases" });
  await expect(card.getByText("Synthea 003")).toBeVisible();
  await expect(card.getByRole("button")).toHaveCount(0);
});

test("patients: list, detail with cited profile, start a run for the patient", async ({ page }) => {
  await signedIn(page, ["coordinator"], "/app/patients");
  await expect(page.getByRole("heading", { name: "Patients", level: 1 })).toBeVisible();
  await expect(page.getByRole("link", { name: "MIMIC 004", exact: true })).toBeVisible();
  await page.locator("label", { hasText: /^synthea$/ }).click();
  await expect(page.getByRole("radio", { name: "synthea" })).toBeChecked();
  await expect(page.getByRole("link", { name: "MIMIC 004", exact: true })).toHaveCount(0);
  await checkPage(page);

  await page.getByRole("link", { name: "Synthea 001", exact: true }).click();
  await expect(page).toHaveURL(/\/app\/patients\/1$/);
  const prof = page.getByRole("region", { name: "Profile" });
  await expect(prof.getByText("Type 2 diabetes")).toBeVisible();
  await expect(prof.getByText("Observation/hba1c-1")).toBeVisible();
  await expect(page.getByRole("region", { name: "Shortlisted trials" }).getByText("2 met · 1 unknown")).toBeVisible();
  await checkPage(page);

  await page.getByRole("main").getByRole("link", { name: "New run" }).click();
  await expect(page).toHaveURL(/\/app\/runs\/new\?patient=1$/);
  await expect(page.getByLabel("Synthetic patient")).toHaveValue("1");
});

test("trials: search, detail with criteria and evaluated patients", async ({ page }) => {
  await signedIn(page, ["clinician"], "/app/trials");
  await expect(page.getByRole("heading", { name: "Trials", level: 1 })).toBeVisible();
  await expect(page.getByText("2 trials")).toBeVisible();
  await page.getByLabel("Search trials").fill("glp");
  await page.getByRole("button", { name: "Search" }).click();
  await expect(page).toHaveURL(/q=glp/);
  await expect(page.getByText("1 trials")).toBeVisible();
  await checkPage(page);

  await page.getByRole("link", { name: NCT }).click();
  await expect(page.getByRole("heading", { name: NCT })).toBeVisible();
  await expect(page.getByRole("region", { name: "Inclusion rules (1)" }).getByText("HbA1c 7.5-10.5%")).toBeVisible();
  await expect(page.getByRole("region", { name: "Exclusion rules (1)" }).getByText("Insulin in the last 3 months")).toBeVisible();
  const evaluated = page.getByRole("region", { name: "Patients evaluated (1)" });
  await expect(evaluated.getByRole("link", { name: "Synthea 001" })).toBeVisible();
  await checkPage(page);
});

test("referrals: a clinician edits a draft from the inbox", async ({ page }) => {
  const state = await signedIn(page, ["clinician"], "/app/referrals");
  await expect(page.getByRole("radio", { name: "Draft (1)" })).toBeChecked();
  const text = page.getByLabel(`Referral text for ${NCT}`);
  await expect(text).toHaveValue("Dear colleague, draft.");
  await checkPage(page);
  await text.fill("Dear colleague, edited.");
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page.getByRole("status")).toHaveText("Saved");
  expect(state.patch).toEqual({ body: "Dear colleague, edited." });
  await page.locator("label", { hasText: /^Edited/ }).click();
  await expect(page).toHaveURL(/status=edited/);
  await expect(page.getByLabel(`Referral text for ${NCT}`)).toHaveValue("Dear colleague, edited.");
});

test("referrals: coordinators read drafts but cannot edit", async ({ page }) => {
  await signedIn(page, ["coordinator"], "/app/referrals");
  await expect(page.getByText("Dear colleague, draft.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Save draft" })).toHaveCount(0);
});

test("audit: admin-only nav, filters, no run pages", async ({ page }) => {
  const state = await signedIn(page, ["admin"], "/app");
  await expect(page.getByText("Admins manage users and read the audit log.")).toBeVisible();
  await expect(nav(page).getByRole("link", { name: "Runs", exact: true })).toHaveCount(0);
  await expect(nav(page).getByRole("link", { name: "Patients" })).toHaveCount(0);
  await nav(page).getByRole("link", { name: "Audit" }).click();
  await expect(page.getByRole("heading", { name: "Audit log" })).toBeVisible();
  const events = page.getByRole("region", { name: "Events" });
  await expect(events.getByText("Clinician answer")).toBeVisible();
  await expect(events.getByText("system")).toBeVisible();
  await checkPage(page);
  await page.getByLabel("Event kind").selectOption("answer");
  await expect(events.getByText("Patient record read")).toHaveCount(0);
  expect(state.auditQueries).toContain("?kind=answer");
});

test("audit: hidden from clinicians", async ({ page }) => {
  await signedIn(page, ["clinician"], "/app/audit");
  await expect(page.getByText("Only admins can read the audit log.")).toBeVisible();
});

test("evals: report facts, gate checks, chart and tables", async ({ page }) => {
  await signedIn(page, ["coordinator"], "/app/evals");
  await expect(page.getByRole("heading", { name: "Evals" })).toBeVisible();
  const checks = page.getByRole("region", { name: "Gate 6 checks" });
  await expect(checks.getByRole("row", { name: /SIGIR/ })).toContainText("+0.140");
  await expect(checks.getByRole("row", { name: /SIGIR/ })).toContainText("✓ pass");
  const chart = page.getByRole("group", { name: /NDCG@10 by cohort/ });
  await expect(chart).toBeVisible();
  await chart.getByLabel("SIGIR, LLM supervisor: 0.860").hover();
  await expect(page.getByText("SIGIR · LLM supervisor: 0.860")).toBeVisible();
  await page.locator("label", { hasText: /^MRR$/ }).click();
  await expect(page.getByRole("group", { name: /MRR by cohort/ })).toBeVisible();
  await expect(page.getByRole("region", { name: "TREC 2021: all metrics" }).getByRole("row", { name: /Fixed pipeline/ })).toContainText("0.880");
  await checkPage(page);
});
