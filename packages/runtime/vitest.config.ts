import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@consoler/protocol": path.resolve(__dirname, "../protocol/src/index.ts")
    }
  },
  test: {
    environment: "node"
  }
});
