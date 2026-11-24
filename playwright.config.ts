import { defineConfig, devices } from "@playwright/test";

// Gate 7a browser tests. Runs against a production build (`next start`), or with E2E_EXPORT=1 against
// the static export in out/ (`NEXT_OUTPUT=export npm run build`), served like S3 + CloudFront.
const PORT = Number(process.env.E2E_PORT ?? 3100);
const EXPORT = process.env.E2E_EXPORT === "1";

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    // Stable screenshots: no fade-ins or staggered rows.
    reducedMotion: "reduce",
  },
  expect: {
    toHaveScreenshot: { maxDiffPixelRatio: 0.01, animations: "disabled" },
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
    { name: "mobile", use: { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 }, isMobile: false } },
  ],
  webServer: {
    command: EXPORT ? `PORT=${PORT} node scripts/serve-export.mjs` : `npx next start -p ${PORT}`,
    port: PORT,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
