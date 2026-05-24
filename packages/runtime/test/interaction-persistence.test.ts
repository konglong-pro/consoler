import { mkdirSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { describe, expect, it, beforeEach, afterEach } from "vitest";

import { getActionTrace } from "../src/action-read.js";
import { formatActionTrace } from "../src/format-action-read.js";
import { ConsolerStore } from "../src/db/store.js";
import { EventStore } from "../src/event-store.js";
import { replayAction } from "../src/replay.js";

describe("interaction persistence", () => {
  let tmpRoot: string;
  let store: ConsolerStore;

  const actionId = "act_ix_store";
  const runId = "run_ix_store";

  beforeEach(() => {
    tmpRoot = path.join(os.tmpdir(), `consoler-ix-${Date.now()}`);
    mkdirSync(path.join(tmpRoot, ".consoler"), { recursive: true });
    store = new ConsolerStore(tmpRoot);
    store.saveAction({
      action_id: actionId,
      agent_id: "conformance-fake",
      command: "conformance.interactive_choice",
      args: { message: "hello" },
      created_at: "2026-05-23T12:00:00.000Z"
    });
    store.createRun(runId, actionId, "conformance-fake", "conformance.interactive_choice");
  });

  afterEach(() => {
    store.db.close();
    rmSync(tmpRoot, { recursive: true, force: true });
  });

  it("inserts pending request and updates to responded with full JSON", () => {
    const request = {
      interaction_id: "ix_choice",
      title: "Pick outcome",
      message: "Select one",
      choices: [
        { id: "ok", label: "OK" },
        { id: "alt", label: "Alternate" }
      ]
    };

    store.insertPendingInteraction(
      runId,
      actionId,
      "conformance-fake",
      "conformance.interactive_choice",
      request,
      "2026-05-23T12:00:01.000Z"
    );

    const pending = store.listInteractionsForAction(actionId);
    expect(pending).toHaveLength(1);
    expect(pending[0]?.status).toBe("pending");
    expect(pending[0]?.response_json).toBeNull();

    store.markInteractionResponded(runId, "ix_choice", "ok");

    const responded = store.listInteractionsForAction(actionId);
    expect(responded[0]?.status).toBe("responded");
    expect(JSON.parse(responded[0]!.response_json!)).toBe("ok");
    expect(responded[0]?.responded_at).toBeTruthy();
  });

  it("does not abandon interactions already marked responded", () => {
    store.insertPendingInteraction(
      runId,
      actionId,
      "conformance-fake",
      "conformance.interactive_choice",
      {
        interaction_id: "ix_race",
        title: "Pick",
        message: "Choose"
      },
      "2026-05-23T12:00:01.500Z"
    );

    store.markInteractionResponded(runId, "ix_race", "ok");
    store.abandonPendingInteractionsForRun(runId);

    const rows = store.listInteractionsForAction(actionId);
    expect(rows[0]?.status).toBe("responded");
    expect(JSON.parse(rows[0]!.response_json!)).toBe("ok");
  });

  it("marks pending interactions abandoned when run ends without response", () => {
    store.insertPendingInteraction(
      runId,
      actionId,
      "conformance-fake",
      "conformance.interactive_choice",
      {
        interaction_id: "ix_abandon",
        title: "Pick",
        message: "Choose"
      },
      "2026-05-23T12:00:02.000Z"
    );

    store.abandonPendingInteractionsForRun(runId);

    const rows = store.listInteractionsForAction(actionId);
    expect(rows[0]?.status).toBe("abandoned");
    expect(rows[0]?.closed_at).toBeTruthy();
    expect(rows[0]?.response_json).toBeNull();
  });

  it("exposes interactions on trace and text formatting but not replay", () => {
    store.insertPendingInteraction(
      runId,
      actionId,
      "conformance-fake",
      "conformance.interactive_choice",
      {
        interaction_id: "ix_trace",
        title: "Confirm",
        message: "Proceed?"
      },
      "2026-05-23T12:00:03.000Z"
    );
    store.markInteractionResponded(runId, "ix_trace", { confirmed: true });

    const events = new EventStore(store);
    events.ingest(runId, actionId, "conformance-fake", "conformance.interactive_choice", {
      event_id: "evt_ix_1",
      run_id: runId,
      action_id: actionId,
      agent_id: "conformance-fake",
      command: "conformance.interactive_choice",
      type: "action.started",
      seq: 1,
      epoch: 0,
      timestamp: "2026-05-23T12:00:04.000Z"
    });
    events.ingest(runId, actionId, "conformance-fake", "conformance.interactive_choice", {
      event_id: "evt_ix_2",
      run_id: runId,
      action_id: actionId,
      agent_id: "conformance-fake",
      command: "conformance.interactive_choice",
      type: "action.succeeded",
      seq: 2,
      epoch: 0,
      timestamp: "2026-05-23T12:00:05.000Z"
    });

    const trace = getActionTrace(store, actionId);
    expect(trace.interactions).toHaveLength(1);
    expect(trace.interactions[0]?.response).toEqual({ confirmed: true });

    const text = formatActionTrace(trace);
    expect(text).toContain("Interactions (1)");
    expect(text).toContain("ix_trace");
    expect(text).toContain("Confirm");
    expect(text).toContain('"confirmed":true');

    const replay = replayAction(store, actionId);
    expect(replay.events.every((event) => event.type !== "interaction.response")).toBe(true);
    const replayText = JSON.stringify(replay);
    expect(replayText).not.toContain("confirmed");
  });
});
