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

  const timeoutArgsPath = path.join(tmpDir, "timeout-args.json");
  writeFileSync(
    timeoutArgsPath,
    JSON.stringify({ message: "use_default", mode: "use_default" }),
    "utf8"
  );
  const timeoutRun = runAgentctl(
    [
      "run",
      FAKE_AGENT_ID,
      "conformance.interactive_timeout",
      "--args",
      timeoutArgsPath,
      "--approve"
    ],
    { env, pipeStdin: true }
  );
  if (timeoutRun.status !== 0) {
    fail(`timeout run exited ${timeoutRun.status}\nstdout: ${timeoutRun.stdout}\nstderr: ${timeoutRun.stderr}`);
  }
  let timeoutResult;
  try {
    timeoutResult = JSON.parse(timeoutRun.stdout.trim());
  } catch {
    fail(`timeout run stdout is not JSON: ${timeoutRun.stdout}`);
  }
  const timeoutTraceRun = runAgentctl(["trace", timeoutResult.action_id, "--json"], { env });
  if (timeoutTraceRun.status !== 0) {
    fail(`timeout trace exited ${timeoutTraceRun.status}\nstderr: ${timeoutTraceRun.stderr}`);
  }
  const timeoutTrace = JSON.parse(timeoutTraceRun.stdout);
  assert.ok(timeoutTrace.interactions?.[0]?.timeout_triggered_at, "expected runtime timeout metadata");
  assert.equal(timeoutTrace.interactions[0]?.timeout_outcome, "use_default");

  const isolatedTest = runAgentctl(
    [
      "test",
      FAKE_AGENT_ID,
      "--command",
      "conformance.interactive_timeout",
      "--args",
      timeoutArgsPath,
      "--approve",
      "--json"
    ],
    { env }
  );
  if (isolatedTest.status !== 0) {
    fail(`isolated test exited ${isolatedTest.status}\nstdout: ${isolatedTest.stdout}\nstderr: ${isolatedTest.stderr}`);
  }
  const testReport = JSON.parse(isolatedTest.stdout);
  assert.equal(testReport.passed, true, `conformance test failed: ${JSON.stringify(testReport.checks?.filter((c) => c.status === "failed"))}`);

  const awaitingApproval = runAgentctl(
    ["run", FAKE_AGENT_ID, "conformance.interactive_choice", "--args", argsPath],
    { env }
  );
  if (awaitingApproval.status !== 2) {
    fail(`expected run without --approve to exit 2, got ${awaitingApproval.status}`);
  }

  const historyBeforeIntent = runAgentctl(["history", "--json"], { env });
  if (historyBeforeIntent.status !== 0) {
    fail(`history before intent-draft exited ${historyBeforeIntent.status}\nstderr: ${historyBeforeIntent.stderr}`);
  }
  const historyCountBeforeIntent = JSON.parse(historyBeforeIntent.stdout.trim()).length;

  const intentJson = runAgentctl(
    ["intent-draft", "static", "echo", '"hello"', "--agent", FAKE_AGENT_ID, "--json"],
    { env }
  );
  if (intentJson.status !== 0) {
    fail(`intent-draft --json exited ${intentJson.status}\nstdout: ${intentJson.stdout}\nstderr: ${intentJson.stderr}`);
  }
  let intentResult;
  try {
    intentResult = JSON.parse(intentJson.stdout.trim());
  } catch {
    fail(`intent-draft stdout is not JSON: ${intentJson.stdout}`);
  }
  assert.equal(intentResult.outcome, "candidate");
  assert.equal(intentResult.candidate?.agent_id, FAKE_AGENT_ID);
  assert.equal(intentResult.candidate?.command, "conformance.static_echo");
  assert.equal(intentResult.candidate?.prefilled_args?.message, "hello");

  const intentHuman = runAgentctl(
    ["intent-draft", "static", "echo", '"hello"', "--agent", FAKE_AGENT_ID],
    { env }
  );
  if (intentHuman.status !== 0) {
    fail(`intent-draft human exited ${intentHuman.status}\nstderr: ${intentHuman.stderr}`);
  }
  assert.match(intentHuman.stdout, /Intent draft: candidate/);
  assert.match(intentHuman.stdout, /agent_id: conformance-fake/);
  assert.match(intentHuman.stdout, /command: conformance\.static_echo/);
  assert.match(intentHuman.stdout, /prefilled_args:/);

  const intentNoMatch = runAgentctl(
    ["intent-draft", "unrelated phrase", "--agent", FAKE_AGENT_ID, "--json"],
    { env }
  );
  if (intentNoMatch.status !== 0) {
    fail(`intent-draft no_match exited ${intentNoMatch.status}\nstderr: ${intentNoMatch.stderr}`);
  }
  const noMatchResult = JSON.parse(intentNoMatch.stdout.trim());
  assert.equal(noMatchResult.outcome, "needs_clarification");
  assert.equal(noMatchResult.reason, "no_match");

  const historyAfterIntent = runAgentctl(["history", "--json"], { env });
  if (historyAfterIntent.status !== 0) {
    fail(`history after intent-draft exited ${historyAfterIntent.status}\nstderr: ${historyAfterIntent.stderr}`);
  }
  const historyCountAfterIntent = JSON.parse(historyAfterIntent.stdout.trim()).length;
  assert.equal(
    historyCountAfterIntent,
    historyCountBeforeIntent,
    "intent-draft must not create actions"
  );

  const assistNoProvider = runAgentctl(
    ["intent-draft", "unrelated phrase", "--agent", FAKE_AGENT_ID, "--assist", "--json"],
    { env }
  );
  if (assistNoProvider.status !== 0) {
    fail(
      `intent-draft --assist exited ${assistNoProvider.status}\nstdout: ${assistNoProvider.stdout}\nstderr: ${assistNoProvider.stderr}`
    );
  }
  const assistResult = JSON.parse(assistNoProvider.stdout.trim());
  assert.equal(assistResult.outcome, "needs_clarification");
  assert.equal(assistResult.assist_notice?.code, "assisted_unavailable");
  assert.equal(
    JSON.parse(runAgentctl(["history", "--json"], { env }).stdout.trim()).length,
    historyCountBeforeIntent,
    "intent-draft --assist must not create actions"
  );

  console.log("agentctl smoke passed");
} finally {
  rmSync(tmpDir, { recursive: true, force: true });
  cleanupTempRoot(isolatedRoot);
}
