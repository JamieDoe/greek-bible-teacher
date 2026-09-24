import { defineConfig, devices } from "@playwright/test";

// End-to-end tests run against the real API and dev database. Before the first run:
//   pnpm db:up && pnpm db:migrate && pnpm ingest && pnpm seed
// Servers already running on :3000/:8787 (e.g. `pnpm dev`) are reused.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", testIgnore: /pwa/, use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", testIgnore: /pwa/, use: { ...devices["Pixel 7"] } },
    // The service worker registers only in production builds, so PWA tests run against
    // `next build && next start` on port 3100.
    {
      name: "pwa",
      testMatch: /pwa\.spec\.ts/,
      use: { ...devices["Pixel 7"], baseURL: "http://localhost:3100" },
    },
  ],
  webServer: [
    {
      command: "pnpm --filter @gbt/api start",
      url: "http://localhost:8787/health",
      reuseExistingServer: true,
      cwd: "../..",
    },
    {
      command: "pnpm --filter @gbt/web dev",
      url: "http://localhost:3000",
      reuseExistingServer: true,
      cwd: "../..",
    },
    {
      command: "pnpm --filter @gbt/web build && pnpm --filter @gbt/web exec next start -p 3100",
      url: "http://localhost:3100",
      reuseExistingServer: true,
      timeout: 240_000,
      cwd: "../..",
    },
  ],
});
