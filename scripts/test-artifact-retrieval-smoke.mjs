import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const agentctlMain = path.join(repoRoot, "packages", "agentctl", "dist", "main.js");
const FIXTURE_VIEW_MARKDOWN = "# Fixture artifact";

function fail(message) {
  console.error(`artifact retrieval smoke failed: ${message}`);
  process.exit(1);
}

function runAgentctl(args, options = {}) {
  const { env = {} } = options;
  return spawnSync(process.execPath, [agentctlMain, ...args], {
    cwd: repoRoot,
    env: { ...process.env, ...env },
    encoding: "utf8",
    stdio: ["inherit", "pipe", "pipe"]
  });
}

const conformanceEntry = path.join(repoRoot, "packages", "conformance", "dist", "index.js");
const { createTempConformanceRoot, cleanupTempRoot, fakeAgentRegistryEntry, FAKE_AGENT_ID } =
  await import(pathToFileURL(conformanceEntry).href);

const isolatedRoot = createTempConformanceRoot({
  agentId: FAKE_AGENT_ID,
  registryEntry: fakeAgentRegistryEntry(repoRoot)
});

const tmpDir = mkdtempSync(path.join(os.tmpdir(), "artifact-retrieval-smoke-"));
const argsPath = path.join(tmpDir, "args.json");
writeFileSync(argsPath, JSON.stringify({ message: "artifact-smoke" }), "utf8");

const env = { CONSOLER_ROOT: isolatedRoot };

try {
  const runOk = runAgentctl(
    ["run", FAKE_AGENT_ID, "conformance.static_echo", "--args", argsPath, "--approve"],
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

  const traceRun = runAgentctl(["trace", runResult.action_id, "--json"], { env });
  if (traceRun.status !== 0) {
    fail(`trace exited ${traceRun.status}\nstderr: ${traceRun.stderr}`);
  }
  const traceBefore = JSON.parse(traceRun.stdout);
  const artifactBlock = traceBefore.result_blocks?.find((block) => block.type === "artifact");
  if (!artifactBlock?.block_id) {
    fail("trace missing artifact result block with block_id");
  }
  assert.equal(
    artifactBlock.block_id,
    "conformance-artifact",
    "expected stable fake artifact block_id"
  );
  assert.doesNotMatch(
    JSON.stringify(traceBefore),
    new RegExp(FIXTURE_VIEW_MARKDOWN.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
  );

  const viewRun = runAgentctl(
    ["artifact-view", runResult.action_id, artifactBlock.block_id, "--json"],
    { env }
  );
  if (viewRun.status !== 0) {
    fail(`artifact-view exited ${viewRun.status}\nstdout: ${viewRun.stdout}\nstderr: ${viewRun.stderr}`);
  }

  let viewResult;
  try {
    viewResult = JSON.parse(viewRun.stdout.trim());
  } catch {
    fail(`artifact-view stdout is not JSON: ${viewRun.stdout}`);
  }
  assert.equal(viewResult.ok, true, `artifact-view failed: ${JSON.stringify(viewResult)}`);
  assert.ok(viewResult.view?.blocks?.length, "artifact view missing blocks");
  for (const block of viewResult.view.blocks) {
    assert.notEqual(block.type, "artifact", "nested artifact blocks are rejected");
  }
  assert.match(
    JSON.stringify(viewResult.view.blocks),
    new RegExp(FIXTURE_VIEW_MARKDOWN.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
    "view blocks should include fixture markdown content"
  );

  const traceAfterRun = runAgentctl(["trace", runResult.action_id, "--json"], { env });
  if (traceAfterRun.status !== 0) {
    fail(`trace after retrieval exited ${traceAfterRun.status}\nstderr: ${traceAfterRun.stderr}`);
  }
  const traceAfter = JSON.parse(traceAfterRun.stdout);
  assert.ok(traceAfter.artifact_retrievals?.length >= 1, "expected retrieval audit in trace");
  assert.doesNotMatch(
    JSON.stringify(traceAfter),
    new RegExp(FIXTURE_VIEW_MARKDOWN.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
    "trace must not persist fetched artifact view content"
  );

  const replayRun = runAgentctl(["replay", runResult.action_id], { env });
  if (replayRun.status !== 0) {
    fail(`replay exited ${replayRun.status}\nstderr: ${replayRun.stderr}`);
  }
  assert.doesNotMatch(
    replayRun.stdout,
    new RegExp(FIXTURE_VIEW_MARKDOWN.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
    "replay must not include fetched artifact view content"
  );

  console.log("artifact retrieval smoke passed");
} finally {
  rmSync(tmpDir, { recursive: true, force: true });
  cleanupTempRoot(isolatedRoot);
}
