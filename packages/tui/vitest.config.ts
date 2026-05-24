import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@consoler/protocol": path.resolve(__dirname, "../protocol/src/index.ts"),
      "@consoler/runtime": path.resolve(__dirname, "../runtime/src/index.ts")
    }
  },
  test: {
    environment: "node",
    // Ink render + SelectInput navigation can exceed 5s when the full suite is loaded.
    testTimeout: 20_000,
    fileParallelism: false
  }
});
