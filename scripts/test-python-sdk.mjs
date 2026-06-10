import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { resolvePythonExecutable, windowsPythonPathHint } from "./resolve-python.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sdkPath = path.join(root, "sdks", "python");
const testsPath = path.join(sdkPath, "tests");

function uvAvailable() {
  const probe = spawnSync("uv", ["--version"], {
    encoding: "utf8",
    shell: process.platform === "win32",
    windowsHide: true
  });
  return probe.status === 0;
}

function runUvPytest() {
  return spawnSync(
    "uv",
    ["run", "--directory", sdkPath, "--with", "pytest", "python", "-m", "pytest", testsPath, "-q"],
    {
      cwd: root,
      env: { ...process.env, PYTHONPATH: sdkPath },
      stdio: "inherit",
      shell: process.platform === "win32"
    }
  );
}

function pytestMissing(output) {
  return /No module named pytest/i.test(output);
}

function ensurePytestInstalled(executable) {
  const check = spawnSync(executable, ["-m", "pytest", "--version"], {
    encoding: "utf8",
    env: { ...process.env, PYTHONPATH: sdkPath },
    windowsHide: true
  });
  const checkOutput = `${check.stdout ?? ""}${check.stderr ?? ""}`;
  if (check.status === 0) {
    return true;
  }
  if (!pytestMissing(checkOutput)) {
    return false;
  }
  console.log("Installing pytest into the selected Python environment...");
  const install = spawnSync(executable, ["-m", "pip", "install", "pytest"], {
    encoding: "utf8",
    stdio: "inherit",
    windowsHide: true
  });
  return install.status === 0;
}

function runResolvedPytest(executable) {
  if (!ensurePytestInstalled(executable)) {
    return { status: 1 };
  }
  return spawnSync(executable, ["-m", "pytest", testsPath, "-q"], {
    cwd: root,
    env: { ...process.env, PYTHONPATH: sdkPath },
    stdio: "inherit"
  });
}

let result;
if (uvAvailable()) {
  console.log("Running Python SDK tests with uv (--with pytest)...");
  result = runUvPytest();
} else {
  const resolved = resolvePythonExecutable();
  if (!resolved) {
    console.error("Python SDK tests failed: required Python executable is not usable.");
    if (process.platform === "win32") {
      console.error(windowsPythonPathHint());
      console.error("Install uv, or set PYTHON to a python.exe with pytest available.");
    }
    process.exit(1);
  }
  console.log(`Running Python SDK tests with ${resolved.version} (${resolved.executable})...`);
  result = runResolvedPytest(resolved.executable);
}

process.exit(result.status ?? 1);
