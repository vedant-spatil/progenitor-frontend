// Gate 9 e2e (PLAN.md Phase 9): the home page "Demo cases" card. API mocked with the backend shapes
// (apps/runs/demo.py); roles, the demo set and reset rules are tested in the backend (tests/unit/test_demo_api.py).
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page, type Route } from "@playwright/test";

const NEW_RUN = "5d1c2b3a-4e5f-4a6b-8c7d-9e0f1a2b3c4d";
const OPEN_RUN = "3fa85f64-5717-4562-b3fc-2c963f66afa6";
const T = "2026-11-24T10:00:00Z";
type Role = "coordinator" | "clinician";

async function mockApi(page: Page, roles: Role[]) {
  const state = { starts: [] as string[], resets: 0, open: true };
  const json = (route: Route, body: unknown, status = 200) =>
    route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
  await page.route("**/api/**", async (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname;
    if (path === "/api/me") return json(route, { id: 2, username: "demo", roles });
    if (path === "/api/overview") {
      const counts = { queued: 0, running: 0, waiting_clinician: 0, awaiting_review: 0, completed: 0, failed: 0, cancelled: 0 };
      return json(route, { counts, queue: [], recent: [] });
    }
    if (path === "/api/demo") {
      return json(route, {
        items: [
          { patient_id: 1, label: "Synthea 001", age_years: 61, sex: "female", conditions: ["Type 2 diabetes", "Hypertension"], latest_run: null },
          {
            patient_id: 2,
            label: "Synthea 002",
            age_years: null,
            sex: "",
            conditions: [],
            latest_run: { id: OPEN_RUN, status: state.open ? "waiting_clinician" : "cancelled", created_at: T },
          },
        ],
      });
    }
    if (path === "/api/demo/1/start" && req.method() === "POST") {
      state.starts.push(path);
      return json(route, { id: NEW_RUN, status: "queued", created: true }, 201);
    }
    if (path === "/api/demo/reset" && req.method() === "POST") {
      state.resets += 1;
      state.open = false;
      return json(route, { cancelled: 1 });
    }
    return json(route, { detail: "Not found." }, 404);
  });
  return state;
}

async function signedIn(page: Page, roles: Role[]) {
  const state = await mockApi(page, roles);
  await page.goto("/login");
  await page.evaluate(() => {
    sessionStorage.setItem("progenitor.access", "a");
    sessionStorage.setItem("progenitor.refresh", "r");
  });
  await page.goto("/app");
  return state;
}

async function checkPage(page: Page) {
  const [scroll, inner] = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
  expect(scroll).toBeLessThanOrEqual(inner);
  const results = await new AxeBuilder({ page }).analyze();
  const bad = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(bad.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
}

test("coordinator starts a demo case and lands on its run page", async ({ page }) => {
  const state = await signedIn(page, ["coordinator"]);
  const card = page.getByRole("region", { name: "Demo cases" });
  await expect(card.getByRole("link", { name: "Synthea 001" })).toBeVisible();
  await expect(card.getByText("61 y · female")).toBeVisible();
  await expect(card.getByText("Type 2 diabetes, Hypertension")).toBeVisible();
  await expect(card.getByText("Profile built on the first run.")).toBeVisible();
  // A case with an open run offers the run, not a second start.
  await expect(card.getByRole("link", { name: "Open run for Synthea 002" })).toBeVisible();
  await expect(card.getByRole("button", { name: /demo run for Synthea 002/ })).toHaveCount(0);
  await checkPage(page);

  await card.getByRole("button", { name: "Start demo run for Synthea 001" }).click();
  await expect(page).toHaveURL(new RegExp(`/app/runs/${NEW_RUN}$`));
  expect(state.starts).toEqual(["/api/demo/1/start"]);
});

test("coordinator resets the demo after confirming", async ({ page }) => {
  const state = await signedIn(page, ["coordinator"]);
  const card = page.getByRole("region", { name: "Demo cases" });
  await expect(card.getByText("1 demo case has an open run.", { exact: false })).toBeVisible();
  await card.getByRole("button", { name: "Reset demo" }).click();
  await card.getByRole("button", { name: "Keep" }).click();
  expect(state.resets).toBe(0);

  await card.getByRole("button", { name: "Reset demo" }).click();
  await expect(card.getByText("Cancel open demo runs?")).toBeVisible();
  await checkPage(page);
  await card.getByRole("button", { name: "Yes, reset" }).click();
  await expect(card.getByRole("status")).toHaveText("Cancelled 1 open demo run.");
  expect(state.resets).toBe(1);
  await expect(card.getByRole("button", { name: "Run again demo run for Synthea 002" })).toBeVisible();
});

test("clinician sees the cases and their runs but cannot start or reset", async ({ page }) => {
  await signedIn(page, ["clinician"]);
  const card = page.getByRole("region", { name: "Demo cases" });
  await expect(card.getByRole("link", { name: "Synthea 001" })).toBeVisible();
  await expect(card.getByRole("link", { name: "Open run for Synthea 002" })).toBeVisible();
  await expect(card.getByRole("button")).toHaveCount(0);
  await checkPage(page);
});
