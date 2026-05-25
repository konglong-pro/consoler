import { spawnSync } from "node:child_process";

import { resolvePythonExecutable, windowsPythonPathHint } from "./resolve-python.mjs";

function fail(message) {
  console.error(`V1 release gate failed: ${message}`);
  process.exit(1);
}

function checkPython() {
  const resolved = resolvePythonExecutable();
  if (!resolved) {
    const windowsHint = process.platform === "win32" ? `\n${windowsPythonPathHint()}` : "";
    fail(`required Python executable is not usable.${windowsHint}`);
  }
  process.env.PYTHON = resolved.executable;
  console.log(`Using ${resolved.version} (${resolved.executable})`);
}

function run(command, args) {
  const display = [command, ...args].join(" ");
  console.log(`\n==> ${display}`);
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
    env: process.env
  });
  if (result.status !== 0) {
    fail(`${display} exited ${result.status ?? "unknown"}`);
  }
}

checkPython();

run("pnpm", ["build"]);
run("pnpm", ["typecheck"]);
run("pnpm", ["test"]);
run("pnpm", ["test:python-sdk"]);
run("pnpm", ["test:conformance"]);
run("pnpm", ["test:agentctl-smoke"]);
run("pnpm", ["test:redaction-smoke"]);

console.log("\nV1 release gate passed");
