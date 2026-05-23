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
    runtime.store.closeRun("run_cli_test", "succeeded");
  });

  afterEach(() => {
    runtime.store.db.close();
    rmSync(tmpRoot, { recursive: true, force: true });
  });

  it("history human output includes action id, command, status, latest run", () => {
    const text = formatActionHistory(runtime.listActionHistory({ limit: 5 }));
    expect(text).toContain("indbase.doctor");
    expect(text).toContain("succeeded");
    expect(text).toContain("run_cli_test");
    expect(text).toContain("act_cli_test".slice(-12));
  });

  it("history json returns structured list", () => {
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
});
