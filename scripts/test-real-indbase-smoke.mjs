import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const agentctlMain = path.join(repoRoot, "packages", "agentctl", "dist", "main.js");
const defaultIndbaseRepo = process.platform === "win32" ? "E:\\indbase" : "";
const indbaseRepoInput = process.env.INDBASE_REPO ?? defaultIndbaseRepo;
const keepTemp = process.env.CONSOLER_KEEP_REAL_INDBASE_SMOKE === "1";

function fail(message) {
  console.error(`real indbase smoke failed: ${message}`);
  process.exit(1);
}

function display(command, args) {
  return [command, ...args].join(" ");
}

function run(command, args, options = {}) {
  const {
    cwd = repoRoot,
    env = {},
    capture = false,
    label = display(command, args)
  } = options;
  console.log(`\n==> ${label}`);
  const result = spawnSync(command, args, {
    cwd,
    env: { ...process.env, ...env },
    encoding: "utf8",
    shell: process.platform === "win32" && command === "pnpm",
    stdio: capture ? ["pipe", "pipe", "pipe"] : "inherit"
  });
  if (result.status !== 0) {
    const stdout = capture && result.stdout ? `\nstdout:\n${result.stdout}` : "";
    const stderr = capture && result.stderr ? `\nstderr:\n${result.stderr}` : "";
    fail(`${label} exited ${result.status ?? "unknown"}${stdout}${stderr}`);
  }
  return result;
}

function runAgentctl(args, options = {}) {
  const { env = {}, label = `agentctl ${args.join(" ")}` } = options;
  console.log(`\n==> ${label}`);
  const result = spawnSync(process.execPath, [agentctlMain, ...args], {
    cwd: repoRoot,
    env: { ...process.env, ...env },
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"]
  });
  if (result.status !== 0) {
    fail(`${label} exited ${result.status ?? "unknown"}\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
  }
  return result;
}

function parseJson(text, label) {
  try {
    return JSON.parse(text.trim());
  } catch {
    fail(`${label} did not emit JSON:\n${text}`);
  }
}

function writeJson(filePath, value) {
  writeFileSync(filePath, JSON.stringify(value, null, 2), "utf8");
}

function writeRegistry(rootDir, entry) {
  const consolerDir = path.join(rootDir, ".consoler");
  mkdirSync(consolerDir, { recursive: true });
  writeJson(path.join(consolerDir, "agents.json"), { agents: [entry] });
}

function withPythonPath(...parts) {
  const values = parts.filter(Boolean);
  if (process.env.PYTHONPATH) {
    values.push(process.env.PYTHONPATH);
  }
  return values.join(path.delimiter);
}

function runAction(rootDir, agentId, command, argsPath, extraArgs = []) {
  const result = runAgentctl(
    ["run", agentId, command, "--args", argsPath, ...extraArgs],
    { env: { CONSOLER_ROOT: rootDir }, label: `${command} run` }
  );
  const parsed = parseJson(result.stdout, `${command} run`);
  assert.ok(parsed.action_id, `${command} run missing action_id`);
  assert.ok(parsed.run_id, `${command} run missing run_id`);
  return parsed;
}

function readTrace(rootDir, actionId, label) {
  const result = runAgentctl(
    ["trace", actionId, "--json"],
    { env: { CONSOLER_ROOT: rootDir }, label: `${label} trace` }
  );
  return parseJson(result.stdout, `${label} trace`);
}

function assertSucceeded(trace, label) {
  assert.equal(trace.terminal_state, "succeeded", `${label} terminal_state`);
  assert.ok(
    trace.accepted_events?.some((event) => event.type === "action.succeeded"),
    `${label} missing action.succeeded`
  );
}

function blockTypes(trace) {
  return (trace.result_blocks ?? []).map((block) => block.type);
}

function assertHasBlock(trace, type, label) {
  assert.ok(blockTypes(trace).includes(type), `${label} missing ${type} block`);
}

function assertNoBlock(trace, type, label) {
  assert.ok(!blockTypes(trace).includes(type), `${label} unexpectedly has ${type} block`);
}

function assertInteraction(trace, expectedResponse, label) {
  const interaction = trace.interactions?.[0];
  assert.equal(interaction?.status, "responded", `${label} interaction status`);
  assert.equal(interaction?.response, expectedResponse, `${label} interaction response`);
}

const REQUIRED_REAL_ARTIFACT_KINDS = ["indbase.ingest_run", "indbase.document"];
const OPTIONAL_REAL_ARTIFACT_KINDS = ["indbase.document_revision"];

const REAL_VIEW_MARKERS = {
  "indbase.ingest_run": "# Ingest run",
  "indbase.document": "# Document",
  "indbase.document_revision": "# Revision"
};

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function readReplay(rootDir, actionId, label) {
  const result = runAgentctl(["replay", actionId], {
    env: { CONSOLER_ROOT: rootDir },
    label: `${label} replay`
  });
  return result.stdout;
}

function assertArtifactViewSmoke(rootDir, actionId, block, label) {
  const kind = block.content?.kind;
  const result = runAgentctl(
    ["artifact-view", actionId, block.block_id, "--json"],
    { env: { CONSOLER_ROOT: rootDir }, label: `${label} artifact-view ${block.block_id}` }
  );
  const viewResult = parseJson(result.stdout, `${label} artifact-view`);
  assert.equal(viewResult.ok, true, `${label} artifact-view failed: ${JSON.stringify(viewResult)}`);
  assert.equal(viewResult.retrieval.status, "succeeded", `${label} retrieval status`);
  assert.ok(viewResult.view?.blocks?.length > 0, `${label} view blocks empty`);
  for (const viewBlock of viewResult.view.blocks) {
    assert.notEqual(viewBlock.type, "artifact", `${label} nested artifact block`);
  }
  const marker = REAL_VIEW_MARKERS[kind];
  if (marker) {
    assert.match(
      JSON.stringify(viewResult.view.blocks),
      new RegExp(escapeRegExp(marker)),
      `${label} view blocks missing expected marker`
    );
  }
  return marker;
}

function assertTraceAndReplayFreeOfMarkers(rootDir, actionId, markers, label) {
  const traceAfter = readTrace(rootDir, actionId, `${label} after retrieval`);
  assert.ok(
    traceAfter.artifact_retrievals?.length >= markers.length,
    `${label} missing retrieval audit summaries`
  );
  const traceJson = JSON.stringify(traceAfter);
  const replayText = readReplay(rootDir, actionId, label);
  for (const marker of markers) {
    if (!marker) continue;
    assert.doesNotMatch(traceJson, new RegExp(escapeRegExp(marker)), `${label} trace leaked view content`);
    assert.doesNotMatch(replayText, new RegExp(escapeRegExp(marker)), `${label} replay leaked view content`);
  }
}

function findArtifactBlock(trace, kind) {
  return (trace.result_blocks ?? []).find(
    (block) => block.type === "artifact" && block.content?.kind === kind
  );
}

function runRealArtifactRetrievalSmokes(rootDir, primaryActionId, sources, label) {
  const opened = [];
  const markersForPrimary = [];
  const kindsToCheck = [...REQUIRED_REAL_ARTIFACT_KINDS, ...OPTIONAL_REAL_ARTIFACT_KINDS];
  for (const kind of kindsToCheck) {
    let fetched = false;
    for (const source of sources) {
      const block = findArtifactBlock(source.trace, kind);
      if (!block?.block_id) continue;
      const marker = assertArtifactViewSmoke(
        rootDir,
        source.actionId,
        block,
        `${source.label} ${kind}`
      );
      opened.push({ block_id: block.block_id, kind, action_id: source.actionId });
      if (source.actionId === primaryActionId) {
        markersForPrimary.push(marker);
      }
      fetched = true;
      break;
    }
    if (!fetched && OPTIONAL_REAL_ARTIFACT_KINDS.includes(kind)) {
      console.warn(
        `Warning: optional artifact kind ${kind} not present in disposable smoke traces; skipping artifact-view check.`
      );
      continue;
    }
    assert.ok(
      fetched,
      `${label} missing artifact block for kind ${kind}; checked ${sources.map((s) => s.label).join(", ")}`
    );
  }
  assertTraceAndReplayFreeOfMarkers(rootDir, primaryActionId, markersForPrimary, label);
  return opened
    .filter((item) => item.action_id === primaryActionId)
    .map(({ block_id, kind }) => ({ block_id, kind }));
}

function initVault(indbaseRepo, vaultPath, env) {
  run(
    "uv",
    [
      "run",
      "python",
      "-c",
      "import sys; from pathlib import Path; from indbase_core.vault import init_vault; init_vault(Path(sys.argv[1]))",
      vaultPath
    ],
    { cwd: indbaseRepo, env, label: "initialize disposable indbase vault" }
  );
}

function prepareSourceTrustFixture(indbaseRepo, outputDir, env) {
  const result = run(
    "uv",
    [
      "run",
      "python",
      "scripts/v0323a_probe_stabilization_release_gate.py",
      "--prepare-consoler-smoke",
      outputDir
    ],
    {
      cwd: indbaseRepo,
      env,
      capture: true,
      label: "prepare indbase source trust fixture"
    }
  );
  const summary = parseJson(result.stdout, "prepare indbase source trust fixture");
  assert.equal(summary.status, "passed", `source trust fixture status: ${result.stdout}`);
  assert.ok(summary.search_args_path, "source trust fixture missing search_args_path");
  assert.ok(existsSync(summary.search_args_path), "source trust search args file missing");
  return summary;
}

function runSourceTrustSearchSmoke(rootDir, searchArgsPath) {
  const reportResult = runAgentctl(
    [
      "test",
      "indbase",
      "--command",
      "indbase.search_sources",
      "--args",
      searchArgsPath,
      "--approve",
      "--json"
    ],
    {
      env: { CONSOLER_ROOT: rootDir },
      label: "indbase.search_sources conformance"
    }
  );
  const report = parseJson(reportResult.stdout, "indbase.search_sources conformance");
  assert.equal(report.passed, true, `search conformance failed: ${reportResult.stdout}`);
  assert.equal(
    report.checks?.find((check) => check.id === "execution.diff_artifact_blocks")?.status,
    "passed",
    "search conformance diff/artifact expectation"
  );

  const search = runAction(
    rootDir,
    "indbase",
    "indbase.search_sources",
    searchArgsPath,
    ["--approve"]
  );
  const searchTrace = readTrace(rootDir, search.action_id, "source trust search");
  assertSucceeded(searchTrace, "source trust search");
  assertHasBlock(searchTrace, "json", "source trust search");
  assertHasBlock(searchTrace, "artifact", "source trust search");
  const documentBlock = findArtifactBlock(searchTrace, "indbase.document");
  assert.ok(documentBlock?.block_id, "source trust search missing document artifact");
  const marker = assertArtifactViewSmoke(
    rootDir,
    search.action_id,
    documentBlock,
    "source trust search indbase.document"
  );
  assertTraceAndReplayFreeOfMarkers(rootDir, search.action_id, [marker], "source trust search");
  return search.action_id;
}

function runIndbaseAdapterFocusedTests(indbaseRepo, env) {
  run(
    "uv",
    [
      "run",
      "pytest",
      "tests/test_indbase_agent.py",
      "-q"
    ],
    { cwd: indbaseRepo, env, label: "real indbase adapter focused tests" }
  );
}

function runFakeCancelTimeoutSmoke(fakeRoot, argsPath) {
  const result = runAgentctl(
    [
      "test",
      "conformance-fake",
      "--command",
      "conformance.slow_ignore_cancel",
      "--args",
      argsPath,
      "--approve",
      "--cancel-after-ms",
      "50",
      "--cancel-timeout-ms",
      "100",
      "--json"
    ],
    {
      env: { CONSOLER_ROOT: fakeRoot },
      label: "conformance fake cancel timeout fallback"
    }
  );
  const report = parseJson(result.stdout, "conformance fake cancel timeout fallback");
  assert.equal(report.passed, true, "fake cancel timeout report passed");
  const checkIds = new Set((report.checks ?? []).map((check) => check.id));
  assert.ok(checkIds.has("cancel.timeout_control_error"), "missing cancel timeout control check");
  assert.ok(checkIds.has("cancel.timeout_no_cancelled_event"), "missing no synthetic cancel check");
}

if (!indbaseRepoInput) {
  fail("Set INDBASE_REPO to the real indbase repository path.");
}

const indbaseRepo = path.resolve(indbaseRepoInput);
if (!existsSync(indbaseRepo)) {
  fail(`INDBASE_REPO does not exist: ${indbaseRepo}`);
}

run("uv", ["--version"], { capture: true, label: "check uv" });
run("pnpm", ["build"], { label: "build consoler packages" });

if (!existsSync(agentctlMain)) {
  fail(`compiled agentctl not found after build: ${agentctlMain}`);
}

const tmpDir = mkdtempSync(path.join(os.tmpdir(), "consoler-real-indbase-smoke-"));
const realRoot = path.join(tmpDir, "real-root");
const fakeRoot = path.join(tmpDir, "fake-root");
const vaultPath = path.join(tmpDir, "vault");
const sourcePath = path.join(tmpDir, "note.md");
const sourceTrustDir = path.join(tmpDir, "source-trust");
const argsDir = path.join(tmpDir, "args");
mkdirSync(argsDir, { recursive: true });

const sdkPath = path.join(repoRoot, "sdks", "python");
const fixturesDir = path.join(repoRoot, "packages", "conformance", "fixtures");
const realPythonPath = withPythonPath(sdkPath);
const fakePythonPath = withPythonPath(fixturesDir, sdkPath);

try {
  writeRegistry(realRoot, {
    agent_id: "indbase",
    name: "indbase",
    cwd: indbaseRepo,
    command: "uv",
    args: ["run", "python", "-m", "indbase_agent"],
    env: { PYTHONPATH: realPythonPath },
    enabled: true
  });
  writeRegistry(fakeRoot, {
    agent_id: "conformance-fake",
    name: "Conformance Fake Agent",
    cwd: path.join(fixturesDir, "fake_agent"),
    command: "uv",
    args: ["run", "python", "-m", "fake_agent"],
    env: { PYTHONPATH: fakePythonPath },
    enabled: true
  });

  initVault(indbaseRepo, vaultPath, { PYTHONPATH: realPythonPath });
  const sourceTrust = prepareSourceTrustFixture(indbaseRepo, sourceTrustDir, { PYTHONPATH: realPythonPath });
  writeFileSync(sourcePath, "# Smoke note\n\nThis is disposable real indbase smoke content.\n", "utf8");

  const doctorArgs = path.join(argsDir, "doctor.json");
  const ingestArgs = path.join(argsDir, "ingest.json");
  const skipResponse = path.join(argsDir, "skip-response.json");
  const continueResponse = path.join(argsDir, "continue-response.json");
  const fakeCancelArgs = path.join(argsDir, "fake-cancel.json");
  writeJson(doctorArgs, { vault_path: vaultPath });
  writeJson(ingestArgs, { vault_path: vaultPath, source_path: sourcePath });
  writeJson(skipResponse, "skip");
  writeJson(continueResponse, "continue");
  writeJson(fakeCancelArgs, { message: "timeout fallback" });

  const doctor = runAction(realRoot, "indbase", "indbase.doctor", doctorArgs, ["--approve"]);
  const doctorTrace = readTrace(realRoot, doctor.action_id, "doctor");
  assertSucceeded(doctorTrace, "doctor");
  assertHasBlock(doctorTrace, "json", "doctor");

  const sourceTrustActionId = runSourceTrustSearchSmoke(realRoot, sourceTrust.search_args_path);

  const normal = runAction(
    realRoot,
    "indbase",
    "indbase.ingest_file",
    ingestArgs,
    ["--approve-preview", "--approve"]
  );
  const normalTrace = readTrace(realRoot, normal.action_id, "ingest normal");
  assertSucceeded(normalTrace, "ingest normal");
  assertHasBlock(normalTrace, "diff", "ingest normal");
  assertHasBlock(normalTrace, "artifact", "ingest normal");
  const skip = runAction(
    realRoot,
    "indbase",
    "indbase.ingest_file",
    ingestArgs,
    ["--approve-preview", "--approve", "--interaction-response", skipResponse]
  );
  const skipTrace = readTrace(realRoot, skip.action_id, "duplicate skip");
  assertSucceeded(skipTrace, "duplicate skip");
  assertInteraction(skipTrace, "skip", "duplicate skip");
  const skipResult = (skipTrace.result_blocks ?? []).find(
    (block) => block.type === "json" && block.title === "Skip result"
  );
  assert.equal(skipResult?.content?.status, "skipped", "duplicate skip status");
  assertNoBlock(skipTrace, "diff", "duplicate skip");

  const continued = runAction(
    realRoot,
    "indbase",
    "indbase.ingest_file",
    ingestArgs,
    ["--approve-preview", "--approve", "--interaction-response", continueResponse]
  );
  const continueTrace = readTrace(realRoot, continued.action_id, "duplicate continue");
  assertSucceeded(continueTrace, "duplicate continue");
  assertInteraction(continueTrace, "continue", "duplicate continue");
  assertHasBlock(continueTrace, "diff", "duplicate continue");
  assertHasBlock(continueTrace, "artifact", "duplicate continue");

  const manualArtifactBlocks = runRealArtifactRetrievalSmokes(
    realRoot,
    normal.action_id,
    [
      { actionId: normal.action_id, trace: normalTrace, label: "ingest normal" },
      { actionId: continued.action_id, trace: continueTrace, label: "duplicate continue" }
    ],
    "real artifact-view"
  );

  runIndbaseAdapterFocusedTests(indbaseRepo, { PYTHONPATH: realPythonPath });
  runFakeCancelTimeoutSmoke(fakeRoot, fakeCancelArgs);

  console.log("\nreal indbase smoke passed");
  console.log(`Disposable vault: ${vaultPath}`);
  if (keepTemp) {
    console.log(`CONSOLER_ROOT=${realRoot}`);
    console.log(`MANUAL_TUI_ACTION_ID=${normal.action_id}`);
    console.log(`SOURCE_TRUST_ACTION_ID=${sourceTrustActionId}`);
    console.log(`MANUAL_TUI_ARTIFACT_BLOCK_IDS=${JSON.stringify(manualArtifactBlocks)}`);
  }
} finally {
  if (keepTemp) {
    console.log(`Keeping smoke temp directory: ${tmpDir}`);
  } else {
    rmSync(tmpDir, { recursive: true, force: true });
  }
}
