import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { resolvePythonExecutable, windowsPythonPathHint } from "./resolve-python.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sdkPath = path.join(root, "sdks", "python");

const resolved = resolvePythonExecutable();
if (!resolved) {
  console.error("Python SDK tests failed: required Python executable is not usable.");
  if (process.platform === "win32") {
    console.error(windowsPythonPathHint());
  }
  process.exit(1);
}

const result = spawnSync(
  resolved.executable,
  ["-m", "pytest", "sdks/python/tests", "-q"],
  {
    cwd: root,
    env: { ...process.env, PYTHONPATH: sdkPath },
    stdio: "inherit"
  }
);
process.exit(result.status ?? 1);
