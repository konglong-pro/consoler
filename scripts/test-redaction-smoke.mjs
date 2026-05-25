import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const agentctlMain = path.join(repoRoot, "packages", "agentctl", "dist", "main.js");
const LIVE_SECRET = "super-secret-123";
const DEFAULT_SECRET = "default-secret";

function fail(message) {
  console.error(`V1l redaction smoke failed: ${message}`);
  process.exit(1);
}

function runAgentctl(args, options = {}) {
  const { env = {} } = options;
  return spawnSync(process.execPath, [agentctlMain, ...args], {
    cwd: repoRoot,
    env: { ...process.env, ...env },
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"]
  });
}

const conformanceEntry = path.join(repoRoot, "packages", "conformance", "dist", "index.js");
const { createTempConformanceRoot, cleanupTempRoot, fakeAgentRegistryEntry, FAKE_AGENT_ID } =
  await import(pathToFileURL(conformanceEntry).href);

const isolatedRoot = createTempConformanceRoot({
  agentId: FAKE_AGENT_ID,
  registryEntry: fakeAgentRegistryEntry(repoRoot)
});

const tmpDir = mkdtempSync(path.join(os.tmpdir(), "consoler-redaction-smoke-"));
const argsPath = path.join(tmpDir, "args.json");
const responsePath = path.join(tmpDir, "response.json");
writeFileSync(argsPath, JSON.stringify({ message: "redaction-smoke" }), "utf8");
writeFileSync(
  responsePath,
  JSON.stringify({ label: "public", api_key: LIVE_SECRET }),
  "utf8"
);

const env = { CONSOLER_ROOT: isolatedRoot };

try {
  const runOk = runAgentctl(
    [
      "run",
      FAKE_AGENT_ID,
      "conformance.interactive_redaction",
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

  const traceRun = runAgentctl(["trace", runResult.action_id, "--json"], { env });
  if (traceRun.status !== 0) {
    fail(`trace exited ${traceRun.status}\nstderr: ${traceRun.stderr}`);
  }

  const traceJson = traceRun.stdout;
  for (const secret of [LIVE_SECRET, DEFAULT_SECRET]) {
    if (traceJson.includes(secret)) {
      fail(`trace --json must not contain the original secret (${secret})`);
    }
  }

  const trace = JSON.parse(traceJson);
  assert.equal(trace.interactions?.[0]?.response?.api_key, "[REDACTED]");
  assert.ok(trace.interactions?.[0]?.redacted_paths?.includes("/api_key"));

  const proof = trace.result_blocks?.find(
    (block) =>
      block?.type === "json" &&
      block?.content &&
      typeof block.content === "object" &&
      "api_key_sha256" in block.content
  );
  const expectedHash = createHash("sha256").update(LIVE_SECRET).digest("hex");
  assert.equal(proof?.content?.received_secret, true);
  assert.equal(proof?.content?.api_key_sha256, expectedHash);
  assert.equal(proof?.content?.api_key, undefined);

  const textTraceRun = runAgentctl(["trace", runResult.action_id], { env });
  if (textTraceRun.status !== 0) {
    fail(`text trace exited ${textTraceRun.status}\nstderr: ${textTraceRun.stderr}`);
  }
  for (const secret of [LIVE_SECRET, DEFAULT_SECRET]) {
    if (textTraceRun.stdout.includes(secret)) {
      fail(`text trace must not contain the original secret (${secret})`);
    }
  }

  const replayRun = runAgentctl(["replay", runResult.action_id], { env });
  if (replayRun.status !== 0) {
    fail(`replay exited ${replayRun.status}\nstderr: ${replayRun.stderr}`);
  }
  for (const secret of [LIVE_SECRET, DEFAULT_SECRET]) {
    if (replayRun.stdout.includes(secret)) {
      fail(`replay must not contain the original secret (${secret})`);
    }
  }

  console.log("V1l redaction smoke passed");
} finally {
  rmSync(tmpDir, { recursive: true, force: true });
  cleanupTempRoot(isolatedRoot);
}
