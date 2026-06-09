import { mkdirSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { describe, expect, it, beforeEach, afterEach } from "vitest";

import {
  ConsolerRuntime,
  formatActionHistory,
  formatActionTrace,
  type ActionHistoryEntry
} from "@consoler/runtime";

describe("agentctl history and trace formatting", () => {
  let tmpRoot: string;
  let runtime: ConsolerRuntime;

  beforeEach(() => {
    tmpRoot = path.join(os.tmpdir(), `consoler-agentctl-v1b-${Date.now()}`);
    mkdirSync(path.join(tmpRoot, ".consoler"), { recursive: true });
    runtime = new ConsolerRuntime({ rootDir: tmpRoot });
    runtime.store.saveAction({
      action_id: "act_cli_test",
      agent_id: "indbase",
      command: "indbase.doctor",
      args: { vault_path: "E:\\vault" },
      created_at: "2026-05-01T12:00:00.000Z"
    });
    runtime.store.createRun("run_cli_test", "act_cli_test", "indbase", "indbase.doctor");
  });

  afterEach(() => {
    runtime.store.db.close();
    rmSync(tmpRoot, { recursive: true, force: true });
  });

  it("history human output includes action id, command, status, latest run", () => {
    runtime.store.closeRun("run_cli_test", "succeeded");
    const text = formatActionHistory(runtime.listActionHistory({ limit: 5 }));
    expect(text).toContain("indbase.doctor");
    expect(text).toContain("succeeded");
    expect(text).toContain("run_cli_test");
    expect(text).toContain("act_cli_test".slice(-12));
  });

  it("history json returns structured list", () => {
    runtime.store.closeRun("run_cli_test", "succeeded");
    const rows = runtime.listActionHistory({ limit: 5, command: "indbase.doctor" });
    expect(rows).toHaveLength(1);
    const entry = rows[0] as ActionHistoryEntry;
    expect(entry.action_id).toBe("act_cli_test");
    expect(entry.latest_run_id).toBe("run_cli_test");
  });

  it("trace includes rejected section when rejected events exist", () => {
    runtime.events.ingest("run_cli_test", "act_cli_test", "indbase", "indbase.doctor", {
      event_id: "evt_1",
      run_id: "run_cli_test",
      action_id: "act_cli_test",
      agent_id: "indbase",
      command: "indbase.doctor",
      type: "log",
      seq: 1,
      epoch: 0,
      timestamp: "2026-05-01T12:00:01.000Z"
    });
    runtime.events.ingest("run_cli_test", "act_cli_test", "indbase", "indbase.doctor", {
      event_id: "evt_1",
      run_id: "run_cli_test",
      action_id: "act_cli_test",
      agent_id: "indbase",
      command: "indbase.doctor",
      type: "log",
      seq: 1,
      epoch: 0,
      timestamp: "2026-05-01T12:00:02.000Z"
    });

    const text = formatActionTrace(runtime.getActionTrace("act_cli_test"));
    expect(text).toContain("Rejected events (1)");
    expect(text).toContain("duplicate_seq");

    const json = runtime.getActionTrace("act_cli_test");
    expect(json.accepted_events.length).toBeGreaterThan(0);
    expect(json.rejected_events.length).toBe(1);
    expect(json.action.action_id).toBe("act_cli_test");
  });

  it("trace includes persisted interaction request and response", () => {
    runtime.store.insertPendingInteraction(
      "run_cli_test",
      "act_cli_test",
      "indbase",
      "indbase.doctor",
      {
        interaction_id: "ix_cli",
        title: "Confirm",
        message: "Run doctor?"
      },
      "2026-05-01T12:00:03.000Z"
    );
    runtime.store.markInteractionResponded("run_cli_test", "ix_cli", { ok: true });

    const text = formatActionTrace(runtime.getActionTrace("act_cli_test"));
    expect(text).toContain("Interactions (1)");
    expect(text).toContain("ix_cli");
    expect(text).toContain('"ok":true');

    const json = runtime.getActionTrace("act_cli_test");
    expect(json.interactions).toHaveLength(1);
    expect(json.interactions[0]?.response).toEqual({ ok: true });
  });

  it("trace includes operation traces in text and JSON output", () => {
    runtime.events.ingest("run_cli_test", "act_cli_test", "indbase", "indbase.doctor", {
      event_id: "evt_op_trace",
      run_id: "run_cli_test",
      action_id: "act_cli_test",
      agent_id: "indbase",
      command: "indbase.doctor",
      type: "action.succeeded",
      seq: 1,
      epoch: 0,
      timestamp: "2026-05-01T12:00:04.000Z",
      payload: {
        operation_trace: {
          operation_id: "op_cli",
          action_id: "act_cli_test",
          agent_id: "indbase",
          command: "indbase.doctor",
          status: "succeeded",
          domain_refs: {
            task_id: "task_cli"
          },
          capability_refs: [
            {
              provider: "swallow",
              capability_id: "swallow.ingest",
              provider_run_id: "prun_cli",
              status: "succeeded",
              artifact_refs: ["fake://artifact/cli"]
            }
          ]
        }
      }
    });

    const text = formatActionTrace(runtime.getActionTrace("act_cli_test"));
    expect(text).toContain("Operation traces (1)");
    expect(text).toContain("op_cli");
    expect(text).toContain("provider_run_id=prun_cli");
    expect(text).toContain("artifact_refs: fake://artifact/cli");

    const json = runtime.getActionTrace("act_cli_test");
    expect(json.operation_traces).toHaveLength(1);
    expect(json.operation_traces[0]?.capability_refs?.[0]?.provider).toBe("swallow");
  });
});
