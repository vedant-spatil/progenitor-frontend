import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const desktop = (name: string) => name === "desktop";

async function setTheme(page: Page, theme: "dark" | "light") {
  await page.addInitScript((t) => localStorage.setItem("theme", t), theme);
}

test("page loads with the required notices", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Progenitor/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Read the record.");
  await expect(page.locator("#hero-heading").locator("xpath=..")).toContainText("Synthetic");
  await expect(page.locator("footer")).toContainText("Not for clinical use");
});

test("nav anchors scroll to their sections", async ({ page }, info) => {
  test.skip(!desktop(info.project.name), "desktop nav; the mobile menu has its own test");
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "Main" });
  for (const [label, id] of [
    ["Features", "features"],
    ["For clinicians", "clinicians"],
    ["How it works", "how-it-works"],
  ]) {
    await nav.getByRole("link", { name: label }).click();
    await expect(page).toHaveURL(new RegExp(`#${id}$`));
    await expect(page.locator(`#${id}`)).toBeInViewport();
  }
});

test("mobile menu opens and links to a section", async ({ page }, info) => {
  test.skip(desktop(info.project.name), "mobile only");
  await page.goto("/");
  await page.getByRole("button", { name: "Menu" }).click();
  await page.locator("#mobile-menu").getByRole("link", { name: "For clinicians" }).click();
  await expect(page.locator("#clinicians")).toBeInViewport();
});

// Signed out, the app sends visitors to sign-in and remembers where they were going.
test("Open Progenitor routes to /app (sign-in first)", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Open Progenitor" }).click();
  await expect(page).toHaveURL(/\/login\?next=%2Fapp$/);
});

test("Match a patient routes to /app/runs/new (sign-in first)", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Match a patient" }).first().click();
  await expect(page).toHaveURL(/\/login\?next=%2Fapp%2Fruns%2Fnew$/);
});

test("preview tabs change both panes", async ({ page }) => {
  await page.goto("/");
  const panel = page.getByRole("tabpanel");
  await expect(panel).toContainText("Jordan Reyes, 58");
  await page.getByRole("tab", { name: "A breast cancer patient" }).click();
  await expect(panel).toContainText("Amara Okafor, 46");
  await expect(panel).toContainText('"amara-okafor"');
  await expect(panel).toContainText("Shorter adjuvant HER2-targeted therapy in early breast cancer");
  await expect(panel).not.toContainText("Jordan Reyes");
});

test("no horizontal scroll", async ({ page }) => {
  await page.goto("/");
  const [scroll, inner] = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
  expect(scroll).toBeLessThanOrEqual(inner);
});

for (const theme of ["dark", "light"] as const) {
  test(`axe: no serious or critical violations (${theme})`, async ({ page }) => {
    await setTheme(page, theme);
    await page.goto("/");
    const results = await new AxeBuilder({ page }).analyze();
    const bad = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(bad.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
  });

  test(`visual baseline (${theme})`, async ({ page }) => {
    await setTheme(page, theme);
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);
    await expect(page).toHaveScreenshot(`landing-${theme}.png`, { fullPage: true });
  });
}
