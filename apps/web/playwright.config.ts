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
    // The service worker registers only in production builds, so PWA tests run against the
    // standalone server (as in the production image) on port 3100.
    {
      name: "pwa",
      testMatch: /pwa\.spec\.ts/,
      use: { ...devices["Pixel 7"], baseURL: "http://127.0.0.1:3100" },
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
      // HOSTNAME is set explicitly: Next binds to it, and in containers it is the container id.
      // 127.0.0.1 is a secure context, so the service worker still registers.
      command:
        "pnpm --filter @gbt/web build && PORT=3100 HOSTNAME=127.0.0.1 pnpm --filter @gbt/web start",
      url: "http://127.0.0.1:3100",
      reuseExistingServer: true,
      timeout: 240_000,
      cwd: "../..",
    },
  ],
});
