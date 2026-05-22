import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { describe, expect, it, beforeEach, afterEach } from "vitest";

import {
  hashCanonical,
  indbaseManifestFixture,
  newActionId,
  newPlanId,
  newSnapshotId,
  normalizeArgs,
  type ActionPlan,
  type ContextSnapshot
} from "@consoler/protocol";

import { buildApprovalToken } from "../src/approval.js";
import { buildContextSnapshot, contextDrift } from "../src/context-snapshot.js";
import { ConsolerStore } from "../src/db/store.js";
import { EventStore } from "../src/event-store.js";
import { computePlanHash, computePreviewHash } from "../src/plan-hash.js";
import { replayAction } from "../src/replay.js";
import { getEnabledAgent, loadRegistry } from "../src/registry.js";
import { LineBufferParser, parseNdjsonLine } from "../src/transport/jsonrpc.js";

describe("registry", () => {
  it("loads enabled indbase agent entry", () => {
    const registry = loadRegistry(path.join(path.dirname(path.dirname(path.dirname(__dirname)))));
    const entry = getEnabledAgent(registry, "indbase");
    expect(entry.agent_id).toBe("indbase");
    expect(entry.enabled).toBe(true);
  });
});

describe("plan and approval hashes", () => {
  const snapshot: ContextSnapshot = {
    snapshot_id: newSnapshotId(),
    kind: "composite",
    summary: "test",
    details: { vault_path: "/tmp/v", config_mtime: "a" },
    created_at: new Date().toISOString()
  };

  const basePlan = (): ActionPlan => ({
    plan_id: newPlanId(),
    action_id: newActionId(),
    agent_id: "indbase",
    command: "indbase.doctor",
    steps: [{ step_id: "s1", title: "Validate" }],
    context_snapshot_id: snapshot.snapshot_id,
    context_snapshot: snapshot,
    side_effects: ["read_vault_files"],
    created_at: new Date().toISOString()
  });

  it("plan hash is stable for canonical material", () => {
    const plan = basePlan();
    expect(computePlanHash(plan)).toBe(computePlanHash({ ...plan }));
  });

  it("approval hash changes when args change", () => {
    const plan = basePlan();
    const a = buildApprovalToken({
      actionId: plan.action_id,
      manifest: indbaseManifestFixture,
      commandName: "indbase.doctor",
      args: { vault_path: "/tmp/a" },
      plan
    });
    const b = buildApprovalToken({
      actionId: plan.action_id,
      manifest: indbaseManifestFixture,
      commandName: "indbase.doctor",
      args: { vault_path: "/tmp/b" },
      plan
    });
    expect(a.args_hash).not.toBe(b.args_hash);
  });

  it("approval hash changes when preview changes", () => {
    const plan = basePlan();
    const args = { vault_path: "/tmp/a" };
    const base = buildApprovalToken({
      actionId: plan.action_id,
      manifest: indbaseManifestFixture,
      commandName: "indbase.doctor",
      args,
      plan,
      preview: { summary: "one" }
    });
    const other = buildApprovalToken({
      actionId: plan.action_id,
      manifest: indbaseManifestFixture,
      commandName: "indbase.doctor",
      args,
      plan,
      preview: { summary: "two" }
    });
    expect(base.preview_hash).not.toBe(other.preview_hash);
    expect(computePreviewHash({ a: 1 })).not.toBe(computePreviewHash({ a: 2 }));
  });
});

describe("context drift", () => {
  it("detects vault mtime changes", () => {
    const previous: ContextSnapshot = {
      snapshot_id: newSnapshotId(),
      kind: "composite",
      summary: "s",
      details: { config_mtime: "old" },
      created_at: new Date().toISOString()
    };
    const current: ContextSnapshot = {
      ...previous,
      snapshot_id: newSnapshotId(),
      details: { config_mtime: "new" }
    };
    expect(contextDrift(previous, current)).toBe(true);
  });
});

describe("event store", () => {
  let tmpRoot: string;
  let store: ConsolerStore;
  let events: EventStore;

  beforeEach(() => {
    tmpRoot = path.join(os.tmpdir(), `consoler-test-${Date.now()}`);
    mkdirSync(path.join(tmpRoot, ".consoler"), { recursive: true });
    store = new ConsolerStore(tmpRoot);
    events = new EventStore(store);
  });

  afterEach(() => {
    store.db.close();
    rmSync(tmpRoot, { recursive: true, force: true });
  });

  const baseEvent = (seq: number, type = "log") => ({
    event_id: `evt_${seq}`,
    run_id: "run_test",
    action_id: "act_test",
    agent_id: "indbase",
    command: "indbase.doctor",
    type,
    seq,
    epoch: 0,
    timestamp: new Date().toISOString(),
    message: `m${seq}`
  });

  it("persists accepted and rejected events", () => {
    store.createRun("run_test", "act_test", "indbase", "indbase.doctor");
    expect(events.ingest("run_test", "act_test", "indbase", "indbase.doctor", baseEvent(1)).accepted).toBe(
      true
    );
    expect(events.ingest("run_test", "act_test", "indbase", "indbase.doctor", baseEvent(1)).accepted).toBe(
      false
    );
    const rows = store.listEventsForAction("act_test");
    expect(rows).toHaveLength(2);
    expect(rows.filter((row) => row.accepted === 1)).toHaveLength(1);
    expect(rows.filter((row) => row.accepted === 0)).toHaveLength(1);
  });

  it("rejects post-terminal events", () => {
    store.createRun("run_test", "act_test", "indbase", "indbase.doctor");
    events.ingest("run_test", "act_test", "indbase", "indbase.doctor", baseEvent(1, "action.started"));
    events.ingest("run_test", "act_test", "indbase", "indbase.doctor", baseEvent(2, "action.succeeded"));
    const late = events.ingest("run_test", "act_test", "indbase", "indbase.doctor", baseEvent(3, "log"));
    expect(late.accepted).toBe(false);
    expect(late.reason).toBe("stale_post_terminal");
  });

  it("replay reconstructs accepted events only", () => {
    store.saveAction({
      action_id: "act_test",
      agent_id: "indbase",
      command: "indbase.doctor",
      args: { vault_path: "/tmp" },
      created_at: new Date().toISOString()
    });
    store.createRun("run_test", "act_test", "indbase", "indbase.doctor");
    events.ingest("run_test", "act_test", "indbase", "indbase.doctor", baseEvent(1));
    events.ingest("run_test", "act_test", "indbase", "indbase.doctor", baseEvent(1));
    events.ingest("run_test", "act_test", "indbase", "indbase.doctor", baseEvent(2, "action.succeeded"));
    const timeline = replayAction(store, "act_test");
    expect(timeline.events).toHaveLength(2);
    expect(timeline.events[0]?.seq).toBe(1);
    expect(timeline.events[1]?.type).toBe("action.succeeded");
  });
});

describe("jsonrpc transport parsing", () => {
  it("parses newline-delimited payloads", () => {
    const parser = new LineBufferParser();
    const lines: string[] = [];
    parser.on("line", (line: string) => lines.push(line));
    parser.push('{"jsonrpc":"2.0","id":1,"result":{"ok":true}}\n');
    parser.push('{"jsonrpc":"2.0","method":"agent.event","params":{}}\n');
    expect(lines).toHaveLength(2);
    expect(parseNdjsonLine(lines[0]!)?.["id"]).toBe(1);
  });
});

describe("context snapshot builder", () => {
  it("captures vault marker mtimes when present", () => {
    const tmpRoot = path.join(os.tmpdir(), `consoler-ctx-${Date.now()}`);
    const vault = path.join(tmpRoot, "vault");
    const indbaseDir = path.join(vault, ".indbase", "config");
    mkdirSync(indbaseDir, { recursive: true });
    writeFileSync(path.join(indbaseDir, "config.toml"), "x = 1\n");
    const manifest = indbaseManifestFixture;
    const snapshot = buildContextSnapshot({
      entry: {
        agent_id: "indbase",
        name: "indbase",
        cwd: tmpRoot,
        command: "uv",
        args: [],
        enabled: true
      },
      manifest,
      args: { vault_path: vault }
    });
    expect(snapshot.details["vault_exists"]).toBe(true);
    expect(snapshot.details["vault_marker_exists"]).toBe(true);
    expect(snapshot.details["config_mtime"]).toBeTypeOf("string");
    rmSync(tmpRoot, { recursive: true, force: true });
  });
});
