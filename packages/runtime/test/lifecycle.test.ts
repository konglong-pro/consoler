import { mkdirSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";

import { newPlanId, newSnapshotId, type ActionEvent, type ActionPlan } from "@consoler/protocol";

import { ConsolerStore } from "../src/db/store.js";
import { ConsolerRuntime } from "../src/runtime.js";
import type { PreparedAction } from "../src/lifecycle-types.js";
import { indbaseManifestFixture } from "@consoler/protocol";

describe("preview isolation", () => {
  let tmpRoot: string;
  let runtime: ConsolerRuntime;

  beforeEach(() => {
    tmpRoot = path.join(os.tmpdir(), `consoler-preview-${Date.now()}`);
    mkdirSync(path.join(tmpRoot, ".consoler"), { recursive: true });
    runtime = new ConsolerRuntime({ rootDir: tmpRoot });
    runtime.store.saveManifest(indbaseManifestFixture);
  });

  afterEach(() => {
    runtime.store.db.close();
    rmSync(tmpRoot, { recursive: true, force: true });
  });

  it("does not persist action or plan records", async () => {
    const beforeActions = runtime.store.db.prepare("SELECT COUNT(*) AS c FROM actions").get() as { c: number };
    const beforePlans = runtime.store.db.prepare("SELECT COUNT(*) AS c FROM plans").get() as { c: number };

    vi.spyOn(runtime as never, "fetchStaticPreview" as never).mockResolvedValue({
      summary: "static stub"
    });

    await runtime.preview({
      agentId: "indbase",
      command: "indbase.doctor",
      args: { vault_path: "Z:\\definitely\\missing\\vault", hard_only: false }
    });

    const afterActions = runtime.store.db.prepare("SELECT COUNT(*) AS c FROM actions").get() as { c: number };
    const afterPlans = runtime.store.db.prepare("SELECT COUNT(*) AS c FROM plans").get() as { c: number };
    expect(afterActions.c).toBe(beforeActions.c);
    expect(afterPlans.c).toBe(beforePlans.c);
  });
});

describe("executePrepared", () => {
  let tmpRoot: string;
  let store: ConsolerStore;
  let runtime: ConsolerRuntime;

  const snapshot = {
    snapshot_id: newSnapshotId(),
    kind: "composite" as const,
    summary: "test",
    details: { vault_path: "/tmp/v" },
    created_at: new Date().toISOString()
  };

  const plan: ActionPlan = {
    plan_id: newPlanId(),
    action_id: "act_test_exec",
    agent_id: "indbase",
    command: "indbase.doctor",
    steps: [{ step_id: "s1", title: "Step" }],
    context_snapshot_id: snapshot.snapshot_id,
    context_snapshot: snapshot,
    side_effects: [],
    created_at: new Date().toISOString()
  };

  beforeEach(() => {
    tmpRoot = path.join(os.tmpdir(), `consoler-exec-${Date.now()}`);
    mkdirSync(path.join(tmpRoot, ".consoler"), { recursive: true });
    runtime = new ConsolerRuntime({ rootDir: tmpRoot });
    store = runtime.store;
    store.saveManifest(indbaseManifestFixture);
    store.saveAction({
      action_id: "act_test_exec",
      agent_id: "indbase",
      command: "indbase.doctor",
      args: { vault_path: "/tmp/v" },
      created_at: new Date().toISOString()
    });
    store.savePlan(plan, "hash");
  });

  afterEach(() => {
    store.db.close();
    rmSync(tmpRoot, { recursive: true, force: true });
  });

  it("rejects execution when context drifts", async () => {
    const prepared: PreparedAction = {
      action: {
        action_id: "act_test_exec",
        agent_id: "indbase",
        command: "indbase.doctor",
        args: { vault_path: "/tmp/v" },
        created_at: new Date().toISOString()
      },
      plan,
      plan_hash: "hash",
      preview: { summary: "static" },
      approval: {
        approval_id: "appr_test",
        action_id: "act_test_exec",
        agent_id: "indbase",
        command: "indbase.doctor",
        args_hash: "old",
        plan_hash: "hash",
        context_snapshot_hash: "stale",
        side_effects_hash: "fx",
        material: {
          agent_id: "indbase",
          agent_version: "0.1.0",
          command: "indbase.doctor",
          normalized_args: { vault_path: "/tmp/v" },
          plan_summary: "s",
          context_summary: "c",
          side_effects: []
        },
        created_at: new Date().toISOString()
      },
      manifest: indbaseManifestFixture,
      entry: {
        agent_id: "indbase",
        name: "indbase",
        cwd: "E:\\indbase",
        command: "uv",
        args: ["run", "python", "-m", "indbase_agent"],
        enabled: true
      }
    };

    await expect(runtime.executePrepared(prepared)).rejects.toThrow(/Approval invalid/);
  });

  it("collects events via handlers when ingest succeeds", () => {
    const runId = "run_handler_test";
    store.createRun(runId, "act_test_exec", "indbase", "indbase.doctor");
    const seen: ActionEvent[] = [];
    const event: ActionEvent = {
      event_id: "evt_1",
      run_id: runId,
      action_id: "act_test_exec",
      agent_id: "indbase",
      command: "indbase.doctor",
      type: "log",
      seq: 1,
      epoch: 0,
      timestamp: new Date().toISOString(),
      message: "hello"
    };
    const ingest = runtime.ingestAgentEvent(runId, "act_test_exec", "indbase", "indbase.doctor", event);
    expect(ingest.accepted).toBe(true);
    if (ingest.event) seen.push(ingest.event);
    expect(seen).toHaveLength(1);
  });
});
