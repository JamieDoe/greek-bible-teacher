import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globalSetup: ["./test/global-setup.ts"],
    // DB tests share one database; run files sequentially to keep them independent.
    fileParallelism: false,
  },
});
