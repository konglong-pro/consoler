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
    testTimeout: 60_000
  }
});
