import { mkdirSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { describe, expect, it, beforeEach, afterEach } from "vitest";

import { ConsolerStore } from "../src/db/store.js";
import { EventStore } from "../src/event-store.js";
import { getActionTrace, listActionHistory } from "../src/action-read.js";
import { replayAction } from "../src/replay.js";

describe("action history and trace", () => {
  let tmpRoot: string;
  let store: ConsolerStore;
  let events: EventStore;

  beforeEach(() => {
    tmpRoot = path.join(os.tmpdir(), `consoler-v1b-${Date.now()}`);
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
    run_id: "run_doctor",
    action_id: "act_doctor",
    agent_id: "indbase",
    command: "indbase.doctor",
    type,
    seq,
    epoch: 0,
    timestamp: new Date().toISOString(),
    message: `m${seq}`
  });

  it("lists latest actions in descending created order", () => {
    store.saveAction({
      action_id: "act_old",
      agent_id: "indbase",
      command: "indbase.doctor",
      args: { vault_path: "/old" },
      created_at: "2020-01-01T00:00:00.000Z"
    });
    store.saveAction({
      action_id: "act_new",
      agent_id: "indbase",
      command: "indbase.ingest_file",
      args: { vault_path: "/v", source_path: "/s" },
      created_at: "2026-01-02T00:00:00.000Z"
    });

    const history = listActionHistory(store, { limit: 10 });
    expect(history[0]?.action_id).toBe("act_new");
    expect(history[1]?.action_id).toBe("act_old");
  });

  it("includes prepared action with no run", () => {
    store.saveAction({
      action_id: "act_prepared",
      agent_id: "indbase",
      command: "indbase.doctor",
      args: { vault_path: "/tmp" },
      created_at: new Date().toISOString()
    });

    const entry = listActionHistory(store, { limit: 5 })[0];
    expect(entry?.action_id).toBe("act_prepared");
    expect(entry?.status).toBe("prepared");
    expect(entry?.latest_run_id).toBeNull();
  });

  it("filters by agentId and allowed commands", () => {
    store.saveAction({
      action_id: "act_indbase",
      agent_id: "indbase",
      command: "indbase.doctor",
      args: { vault_path: "/d" },
      created_at: "2026-01-05T00:00:00.000Z"
    });
    store.saveAction({
      action_id: "act_fake",
      agent_id: "conformance-fake",
      command: "conformance.echo",
      args: { message: "hi" },
      created_at: "2026-01-06T00:00:00.000Z"
    });

    const scoped = listActionHistory(store, {
      limit: 10,
      agentId: "indbase",
      commands: ["indbase.doctor", "indbase.ingest_file"]
    });
    expect(scoped).toHaveLength(1);
    expect(scoped[0]?.action_id).toBe("act_indbase");
  });

  it("filters by command and status", () => {
    store.saveAction({
      action_id: "act_doctor",
      agent_id: "indbase",
      command: "indbase.doctor",
      args: { vault_path: "/d" },
      created_at: "2026-01-03T00:00:00.000Z"
    });
    store.saveAction({
      action_id: "act_ingest",
      agent_id: "indbase",
      command: "indbase.ingest_file",
      args: { vault_path: "/v", source_path: "/s" },
      created_at: "2026-01-04T00:00:00.000Z"
    });
    store.createRun("run_ingest", "act_ingest", "indbase", "indbase.ingest_file");
    store.closeRun("run_ingest", "succeeded");

    const byCommand = listActionHistory(store, { command: "indbase.ingest_file" });
    expect(byCommand).toHaveLength(1);
    expect(byCommand[0]?.action_id).toBe("act_ingest");

    const prepared = listActionHistory(store, { status: "prepared" });
    expect(prepared.some((row) => row.action_id === "act_doctor")).toBe(true);

    const succeeded = listActionHistory(store, { status: "succeeded" });
    expect(succeeded.some((row) => row.action_id === "act_ingest")).toBe(true);
  });

  it("trace includes accepted and rejected events", () => {
    store.saveAction({
      action_id: "act_doctor",
      agent_id: "indbase",
      command: "indbase.doctor",
      args: { vault_path: "/tmp" },
      created_at: new Date().toISOString()
    });
    store.createRun("run_doctor", "act_doctor", "indbase", "indbase.doctor");
    events.ingest("run_doctor", "act_doctor", "indbase", "indbase.doctor", baseEvent(1));
    events.ingest("run_doctor", "act_doctor", "indbase", "indbase.doctor", baseEvent(1));
    events.ingest("run_doctor", "act_doctor", "indbase", "indbase.doctor", baseEvent(2, "action.succeeded"));

    const trace = getActionTrace(store, "act_doctor");
    expect(trace.accepted_events).toHaveLength(2);
    expect(trace.rejected_events).toHaveLength(1);
    expect(trace.rejected_events[0]?.reject_reason).toBe("duplicate_seq");
    expect(trace.terminal_state).toBe("succeeded");
  });

  it("replay returns accepted events only while trace keeps rejected", () => {
    store.saveAction({
      action_id: "act_doctor",
      agent_id: "indbase",
      command: "indbase.doctor",
      args: { vault_path: "/tmp" },
      created_at: new Date().toISOString()
    });
    store.createRun("run_doctor", "act_doctor", "indbase", "indbase.doctor");
    events.ingest("run_doctor", "act_doctor", "indbase", "indbase.doctor", baseEvent(1));
    events.ingest("run_doctor", "act_doctor", "indbase", "indbase.doctor", baseEvent(1));
    events.ingest("run_doctor", "act_doctor", "indbase", "indbase.doctor", baseEvent(2, "action.succeeded"));

    const timeline = replayAction(store, "act_doctor");
    const trace = getActionTrace(store, "act_doctor");
    expect(timeline.events).toHaveLength(2);
    expect(trace.rejected_events).toHaveLength(1);
  });
});
