import { defineConfig } from "vitest/config";

// Unit tests for pure web helpers only; UI behaviour is covered by Playwright (e2e/).
export default defineConfig({
  test: { include: ["src/**/*.test.ts"] },
});
