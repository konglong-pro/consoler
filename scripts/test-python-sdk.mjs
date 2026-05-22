import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sdkPath = path.join(root, "sdks", "python");
const result = spawnSync(
  process.platform === "win32" ? "python" : "python3",
  ["-m", "pytest", "sdks/python/tests", "-q"],
  {
    cwd: root,
    env: { ...process.env, PYTHONPATH: sdkPath },
    stdio: "inherit"
  }
);
process.exit(result.status ?? 1);
