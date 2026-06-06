import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import type { RegistryAgentEntry } from "@consoler/protocol";
import { describe, expect, it, beforeEach, afterEach } from "vitest";

import { ConsolerRuntime } from "../src/runtime.js";
import { getActionTrace } from "../src/action-read.js";
import { replayAction } from "../src/replay.js";
import { fetchArtifactViewForStore } from "../src/artifact-retrieval.js";
import { ConsolerStore } from "../src/db/store.js";
import { EventStore } from "../src/event-store.js";
import { spawnSync } from "node:child_process";
import { consolerDataDir, findConsolerRoot, registryPath } from "../src/paths.js";

const FAKE_AGENT_ID = "conformance-fake";

function resolvePythonCommand(): string {
  if (process.platform === "win32") {
    const uv = spawnSync("uv", ["python", "find"], { encoding: "utf8", shell: true });
    if (uv.status === 0) {
      const found = uv.stdout.trim().split(/\r?\n/)[0]?.trim();
      if (found) return found;
    }
  }
  return process.platform === "win32" ? "python" : "python3";
}

function fakeAgentRegistryEntry(): RegistryAgentEntry {
  const root = findConsolerRoot();
  const fixturesDir = path.join(root, "packages", "conformance", "fixtures");
  const fixtureDir = path.join(fixturesDir, "fake_agent");
  const python = resolvePythonCommand();
  const pythonPath = [fixturesDir, path.join(root, "sdks", "python")].join(path.delimiter);
  return {
    agent_id: FAKE_AGENT_ID,
    name: "Conformance Fake Agent",
    cwd: fixtureDir,
    command: python,
    args: ["-m", "fake_agent"],
    env: { PYTHONPATH: pythonPath },
    enabled: true
  };
}

function writeIsolatedRegistry(rootDir: string, entry: RegistryAgentEntry): void {
  const dir = consolerDataDir(rootDir);
  mkdirSync(dir, { recursive: true });
  writeFileSync(registryPath(rootDir), JSON.stringify({ agents: [entry] }, null, 2), "utf8");
}

describe("artifact retrieval", () => {
  let tmpRoot: string;
  let store: ConsolerStore;
  let events: EventStore;

  beforeEach(() => {
    tmpRoot = path.join(os.tmpdir(), `consoler-v2a-${Date.now()}`);
    mkdirSync(path.join(tmpRoot, ".consoler"), { recursive: true });
    store = new ConsolerStore(tmpRoot);
    events = new EventStore(store);
  });

  afterEach(() => {
    store.db.close();
    rmSync(tmpRoot, { recursive: true, force: true });
  });

  const seedSucceededArtifact = (
    actionId: string,
    runId: string,
    blockId: string,
    uri: string,
    kind: string,
    blocks?: Array<{ block_id: string; type: string; content: unknown }>
  ) => {
    store.saveAction({
      action_id: actionId,
      agent_id: FAKE_AGENT_ID,
      command: "conformance.static_echo",
      args: { message: "artifact" },
      created_at: new Date().toISOString()
    });
    store.createRun(runId, actionId, FAKE_AGENT_ID, "conformance.static_echo");
    events.ingest(runId, actionId, FAKE_AGENT_ID, "conformance.static_echo", {
      event_id: `evt_${runId}`,
      run_id: runId,
      action_id: actionId,
      agent_id: FAKE_AGENT_ID,
      command: "conformance.static_echo",
      type: "action.succeeded",
      seq: 1,
      epoch: 0,
      timestamp: new Date().toISOString(),
      blocks: blocks ?? [
        {
          block_id: blockId,
          type: "artifact",
          content: { uri, kind }
        }
      ]
    });
  };

  it("rejects pre-resolution errors without audit rows", async () => {
    const missingAction = await fetchArtifactViewForStore(store, tmpRoot, "act_missing", "b1");
    expect(missingAction.ok).toBe(false);
    if (!missingAction.ok) {
      expect(missingAction.error.code).toBe("action_not_found");
    }
    expect(store.listArtifactRetrievalsForAction("act_missing")).toHaveLength(0);

    seedSucceededArtifact(
      "act_no_block",
      "run_no_block",
      "b1",
      "fake://x",
      "conformance.fixture"
    );
    const missingBlock = await fetchArtifactViewForStore(store, tmpRoot, "act_no_block", "missing");
    expect(missingBlock.ok).toBe(false);
    if (!missingBlock.ok) {
      expect(missingBlock.error.code).toBe("artifact_block_not_found");
    }
    expect(store.listArtifactRetrievalsForAction("act_no_block")).toHaveLength(0);

    seedSucceededArtifact("act_md", "run_md", "b-md", "fake://x", "conformance.fixture", [
      { block_id: "b-md", type: "markdown", content: "# no" }
    ]);
    const notArtifact = await fetchArtifactViewForStore(store, tmpRoot, "act_md", "b-md");
    expect(notArtifact.ok).toBe(false);
    if (!notArtifact.ok) {
      expect(notArtifact.error.code).toBe("artifact_block_not_artifact");
    }
    expect(store.listArtifactRetrievalsForAction("act_md")).toHaveLength(0);
  });

  it("records failed post-resolution attempts without storing view content", async () => {
    seedSucceededArtifact(
      "act_no_manifest",
      "run_no_manifest",
      "conformance-artifact",
      "fake://artifacts/conformance-fixture",
      "conformance.fixture"
    );
    const result = await fetchArtifactViewForStore(store, tmpRoot, "act_no_manifest", "conformance-artifact");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("manifest_missing");
      expect(result.retrieval?.status).toBe("failed");
    }
    const rows = store.listArtifactRetrievalsForAction("act_no_manifest");
    expect(rows).toHaveLength(1);
    expect(JSON.stringify(rows)).not.toContain("# Fixture artifact");
  });

  it(
    "fetches artifact view from fake agent and exposes trace summaries only",
    async () => {
      writeIsolatedRegistry(tmpRoot, fakeAgentRegistryEntry());
      const runtime = new ConsolerRuntime({ rootDir: tmpRoot });
      await runtime.discover(FAKE_AGENT_ID);

      const prepared = await runtime.prepareAction({
        agentId: FAKE_AGENT_ID,
        command: "conformance.static_echo",
        args: { message: "retrieve-me" }
      });
      await runtime.executePrepared(prepared);

      const traceBefore = getActionTrace(runtime.store, prepared.action.action_id);
      const artifact = traceBefore.result_blocks.find((block) => block.type === "artifact");
      expect(artifact?.block_id).toBe("conformance-artifact");

      const result = await runtime.fetchArtifactView(
        prepared.action.action_id,
        artifact!.block_id
      );
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.view.blocks.length).toBeGreaterThan(0);
        expect(result.view.blocks.every((block) => block.type !== "artifact")).toBe(true);
      }

      const audit = runtime.store.listArtifactRetrievalsForAction(prepared.action.action_id);
      expect(audit).toHaveLength(1);
      expect(audit[0]?.status).toBe("succeeded");
      expect(JSON.stringify(audit)).not.toContain("Fixture artifact");

      const trace = getActionTrace(runtime.store, prepared.action.action_id);
      expect(trace.artifact_retrievals).toHaveLength(1);
      expect(JSON.stringify(trace)).not.toContain("# Fixture artifact");

      const replay = replayAction(runtime.store, prepared.action.action_id);
      expect(JSON.stringify(replay.events)).not.toContain("Fixture artifact");

      runtime.store.db.close();
    },
    30_000
  );
});
