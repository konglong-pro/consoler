import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const agentctlMain = path.join(repoRoot, "packages", "agentctl", "dist", "main.js");

function fail(message) {
  console.error(`agentctl smoke failed: ${message}`);
  process.exit(1);
}

function runAgentctl(args, options = {}) {
  const { env = {}, pipeStdin = false } = options;
  return spawnSync(process.execPath, [agentctlMain, ...args], {
    cwd: repoRoot,
    env: { ...process.env, ...env },
    encoding: "utf8",
    stdio: pipeStdin ? ["pipe", "pipe", "pipe"] : ["inherit", "pipe", "pipe"]
  });
}

const conformanceEntry = path.join(repoRoot, "packages", "conformance", "dist", "index.js");
const { createTempConformanceRoot, cleanupTempRoot, fakeAgentRegistryEntry, FAKE_AGENT_ID } =
  await import(pathToFileURL(conformanceEntry).href);

const isolatedRoot = createTempConformanceRoot({
  agentId: FAKE_AGENT_ID,
  registryEntry: fakeAgentRegistryEntry(repoRoot)
});

const tmpDir = mkdtempSync(path.join(os.tmpdir(), "agentctl-smoke-"));
const argsPath = path.join(tmpDir, "args.json");
const responsePath = path.join(tmpDir, "response.json");
writeFileSync(argsPath, JSON.stringify({ message: "smoke" }), "utf8");
writeFileSync(responsePath, '"ok"', "utf8");

const env = { CONSOLER_ROOT: isolatedRoot };

try {
  const runOk = runAgentctl(
    [
      "run",
      FAKE_AGENT_ID,
      "conformance.interactive_choice",
      "--args",
      argsPath,
      "--approve",
      "--interaction-response",
      responsePath
    ],
    { env }
  );
  if (runOk.status !== 0) {
    fail(`run exited ${runOk.status}\nstdout: ${runOk.stdout}\nstderr: ${runOk.stderr}`);
  }

  let runResult;
  try {
    runResult = JSON.parse(runOk.stdout.trim());
  } catch {
    fail(`run stdout is not JSON: ${runOk.stdout}`);
  }
  assert.ok(runResult.action_id, "run result missing action_id");
  assert.ok(runResult.run_id, "run result missing run_id");

  const traceRun = runAgentctl(["trace", runResult.action_id, "--json"], { env });
  if (traceRun.status !== 0) {
    fail(`trace exited ${traceRun.status}\nstderr: ${traceRun.stderr}`);
  }
  const traceJson = JSON.parse(traceRun.stdout);
  assert.equal(traceJson.interactions?.length, 1, "expected one persisted interaction");
  assert.equal(traceJson.interactions[0]?.status, "responded");
  assert.equal(traceJson.interactions[0]?.response, "ok");

  const replayRun = runAgentctl(["replay", runResult.action_id], { env });
  if (replayRun.status !== 0) {
    fail(`replay exited ${replayRun.status}\nstderr: ${replayRun.stderr}`);
  }
  assert.match(replayRun.stdout, /interaction\.required/);
  assert.doesNotMatch(replayRun.stdout, /interaction\.response/);

  const nonTtyRun = runAgentctl(
    [
      "run",
      FAKE_AGENT_ID,
      "conformance.interactive_choice",
      "--args",
      argsPath,
      "--approve"
    ],
    { env, pipeStdin: true }
  );
  if (nonTtyRun.status !== 1) {
    fail(`expected non-TTY run without --interaction-response to exit 1, got ${nonTtyRun.status}`);
  }

  const awaitingApproval = runAgentctl(
    ["run", FAKE_AGENT_ID, "conformance.interactive_choice", "--args", argsPath],
    { env }
  );
  if (awaitingApproval.status !== 2) {
    fail(`expected run without --approve to exit 2, got ${awaitingApproval.status}`);
  }

  console.log("agentctl smoke passed");
} finally {
  rmSync(tmpDir, { recursive: true, force: true });
  cleanupTempRoot(isolatedRoot);
}
