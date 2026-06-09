import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { resolvePythonExecutable, windowsPythonPathHint } from "./resolve-python.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const scriptPath = path.join(root, "scripts", "check_docs.py");

const resolved = resolvePythonExecutable();
if (!resolved) {
  console.error("Documentation lint failed: required Python executable is not usable.");
  if (process.platform === "win32") {
    console.error(windowsPythonPathHint());
  }
  process.exit(1);
}

const result = spawnSync(resolved.executable, [scriptPath, ...process.argv.slice(2)], {
  cwd: root,
  stdio: "inherit",
  windowsHide: true
});

process.exit(result.status ?? 1);
