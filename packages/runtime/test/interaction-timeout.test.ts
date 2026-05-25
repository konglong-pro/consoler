import { mkdirSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import type { InteractionRequest } from "@consoler/protocol";
import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";

import { getActionTrace } from "../src/action-read.js";
import { ConsolerStore } from "../src/db/store.js";
import { EventStore } from "../src/event-store.js";
import {
  buildTimeoutControlResponse,
  validateInteractionTimeoutPolicy
} from "../src/interaction-timeout.js";
import { replayAction } from "../src/replay.js";

describe("interaction timeout policy", () => {
  let tmpRoot: string;
  let store: ConsolerStore;

  const actionId = "act_timeout";
  const runId = "run_timeout";

  beforeEach(() => {
    tmpRoot = path.join(os.tmpdir(), `consoler-timeout-${Date.now()}`);
    mkdirSync(path.join(tmpRoot, ".consoler"), { recursive: true });
    store = new ConsolerStore(tmpRoot);
    store.saveAction({
      action_id: actionId,
      agent_id: "conformance-fake",
      command: "conformance.interactive_timeout",
      args: { message: "t", mode: "skip" },
      created_at: "2026-05-24T12:00:00.000Z"
    });
    store.createRun(runId, actionId, "conformance-fake", "conformance.interactive_timeout");
  });

  afterEach(() => {
    store.db.close();
    rmSync(tmpRoot, { recursive: true, force: true });
    vi.useRealTimers();
  });

  it("rejects use_default without valid default_response", () => {
    const request: InteractionRequest = {
      interaction_id: "ix_bad_default",
      title: "Timeout",
      message: "Wait",
      choices: [{ id: "ok", label: "OK" }],
      timeout_policy: { timeout_seconds: 1, on_timeout: "use_default" }
    };
    expect(validateInteractionTimeoutPolicy(request)).toMatch(/default_response/);
  });

  it("builds timeout control payloads", () => {
    const request: InteractionRequest = {
      interaction_id: "ix_skip",
      title: "Timeout",
      message: "Wait",
      choices: [{ id: "ok", label: "OK" }],
      timeout_policy: { timeout_seconds: 0.1, on_timeout: "skip" }
    };
    expect(buildTimeoutControlResponse(request)).toEqual({
      response: { timed_out: true, action: "skip" },
      on_timeout: "skip"
    });
  });

  it("rejects interaction.required with invalid timeout policy at ingest", () => {
    const events = new EventStore(store);
    const ingest = events.ingest(runId, actionId, "conformance-fake", "conformance.interactive_timeout", {
      event_id: "evt_ix_bad",
      run_id: runId,
      action_id: actionId,
      agent_id: "conformance-fake",
      command: "conformance.interactive_timeout",
      type: "interaction.required",
      seq: 1,
      epoch: 0,
      timestamp: "2026-05-24T12:00:01.000Z",
      interaction: {
        interaction_id: "ix_bad",
        title: "Timeout",
        message: "Wait",
        choices: [{ id: "ok", label: "OK" }],
        timeout_policy: { timeout_seconds: 0, on_timeout: "abort" }
      }
    });
    expect(ingest.accepted).toBe(false);
    expect(ingest.reason).toBe("schema_invalid");
  });

  it("persists timed_out status for abort and responded with metadata for skip", () => {
    store.insertPendingInteraction(
      runId,
      actionId,
      "conformance-fake",
      "conformance.interactive_timeout",
      {
        interaction_id: "ix_abort",
        title: "Abort",
        message: "Wait",
        choices: [{ id: "ok", label: "OK" }],
        timeout_policy: { timeout_seconds: 1, on_timeout: "abort" }
      },
      "2026-05-24T12:00:02.000Z"
    );
    store.markInteractionTimedOut(runId, "ix_abort", {
      triggered_at: "2026-05-24T12:00:03.000Z",
      outcome: "abort"
    });

    store.insertPendingInteraction(
      runId,
      actionId,
      "conformance-fake",
      "conformance.interactive_timeout",
      {
        interaction_id: "ix_skip",
        title: "Skip",
        message: "Wait",
        choices: [{ id: "ok", label: "OK" }],
        timeout_policy: { timeout_seconds: 1, on_timeout: "skip" }
      },
      "2026-05-24T12:00:04.000Z"
    );
    store.markInteractionResponded(
      runId,
      "ix_skip",
      { timed_out: true, action: "skip" },
      { triggered_at: "2026-05-24T12:00:05.000Z", outcome: "skip" }
    );

    const trace = getActionTrace(store, actionId);
    const abort = trace.interactions.find((row) => row.interaction_id === "ix_abort");
    const skip = trace.interactions.find((row) => row.interaction_id === "ix_skip");
    expect(abort?.status).toBe("timed_out");
    expect(abort?.response).toBeNull();
    expect(abort?.timeout_outcome).toBe("abort");
    expect(skip?.status).toBe("responded");
    expect(skip?.response).toEqual({ timed_out: true, action: "skip" });
    expect(skip?.timeout_outcome).toBe("skip");

    const replay = replayAction(store, actionId);
    expect(replay.events.every((event) => event.type !== "interaction.response")).toBe(true);
  });
});
