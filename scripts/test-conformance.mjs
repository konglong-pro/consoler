import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const result = spawnSync("pnpm", ["--filter", "@consoler/conformance", "test"], {
  cwd: root,
  stdio: "inherit",
  shell: true
});
process.exit(result.status ?? 1);
