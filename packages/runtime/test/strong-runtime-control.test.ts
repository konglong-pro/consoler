import { mkdirSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { validateActionEvent, type ActionEvent } from "@consoler/protocol";

import { ConsolerStore } from "../src/db/store.js";
import { EventStore } from "../src/event-store.js";
import {
  getActionTrace,
  terminalStateFromAcceptedEvents,
  terminalStateFromRunStatus
} from "../src/action-read.js";

function makeEvent(
  runId: string,
  actionId: string,
  seq: number,
  type: ActionEvent["type"],
  extra: Partial<ActionEvent> = {}
): ActionEvent {
  return {
    event_id: `evt_${seq}`,
    run_id: runId,
    action_id: actionId,
    agent_id: "conformance-fake",
    command: "conformance.slow_ignore_cancel",
    type,
    seq,
    epoch: 0,
    timestamp: new Date().toISOString(),
    ...extra
  } as ActionEvent;
}

describe("strong runtime control store and ingest", () => {
  let tmpRoot: string;
  let store: ConsolerStore;
  let events: EventStore;

  beforeEach(() => {
    tmpRoot = path.join(os.tmpdir(), `consoler-v1n-${Date.now()}`);
    mkdirSync(path.join(tmpRoot, ".consoler"), { recursive: true });
    store = new ConsolerStore(tmpRoot);
    events = new EventStore(store);
    store.saveAction({
      action_id: "act_v1n",
      agent_id: "conformance-fake",
      command: "conformance.slow_ignore_cancel",
      args: { message: "x" },
      created_at: new Date().toISOString()
    });
  });

  afterEach(() => {
    store.db.close();
    rmSync(tmpRoot, { recursive: true, force: true });
  });

  it("rejects non-cancelled events during cancel quarantine", () => {
    const runId = "run_quarantine";
    store.createRun(runId, "act_v1n", "conformance-fake", "conformance.slow_ignore_cancel");

    const log = makeEvent(runId, "act_v1n", 1, "log", { message: "hello" });
    const accepted = events.ingest(
      runId,
      "act_v1n",
      "conformance-fake",
      "conformance.slow_ignore_cancel",
      log
    );
    expect(accepted.accepted).toBe(true);

    const rejected = events.ingest(
      runId,
      "act_v1n",
      "conformance-fake",
      "conformance.slow_ignore_cancel",
      makeEvent(runId, "act_v1n", 2, "progress.updated", { progress: 0.5 }),
      { cancelQuarantine: true }
    );
    expect(rejected.accepted).toBe(false);
    expect(rejected.reason).toBe("cancel_requested");

    const cancelled = events.ingest(
      runId,
      "act_v1n",
      "conformance-fake",
      "conformance.slow_ignore_cancel",
      makeEvent(runId, "act_v1n", 3, "action.cancelled"),
      { cancelQuarantine: true }
    );
    expect(cancelled.accepted).toBe(true);
  });

  it("closeRun is first-writer-wins and isRunTerminal respects run status", () => {
    const runId = "run_close";
    store.createRun(runId, "act_v1n", "conformance-fake", "conformance.slow_ignore_cancel");

    const closed = store.closeRun(runId, "failed", {
      code: "cancel_timeout",
      message: "timed out"
    });
    expect(closed).toBe(true);

    const second = store.closeRun(runId, "cancelled");
    expect(second).toBe(false);
    expect(store.getRun(runId)?.status).toBe("failed");
    expect(store.isRunTerminal(runId)).toBe(true);

    const late = events.ingest(
      runId,
      "act_v1n",
      "conformance-fake",
      "conformance.slow_ignore_cancel",
      makeEvent(runId, "act_v1n", 1, "action.succeeded")
    );
    expect(late.accepted).toBe(false);
    expect(late.reason).toBe("stale_post_terminal");
  });

  it("trace falls back to run status when no accepted terminal event", () => {
    const runId = "run_trace";
    store.createRun(runId, "act_v1n", "conformance-fake", "conformance.slow_ignore_cancel");
    store.closeRun(runId, "failed", {
      code: "cancel_timeout",
      message: "timed out"
    });

    const trace = getActionTrace(store, "act_v1n");
    expect(terminalStateFromAcceptedEvents(trace.accepted_events)).toBeNull();
    expect(terminalStateFromRunStatus("failed")).toBe("failed");
    expect(trace.terminal_state).toBe("failed");
    expect(trace.latest_run_control_error?.code).toBe("cancel_timeout");
  });
});

describe("validateActionEvent epoch", () => {
  it("keeps epoch fixed at 0", () => {
    const event = makeEvent("run_epoch", "act_epoch", 1, "log");
    const validated = validateActionEvent(event);
    expect(validated.ok).toBe(true);
    expect(validated.value?.epoch).toBe(0);
  });
});
