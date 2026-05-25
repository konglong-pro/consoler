import { mkdirSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { describe, expect, it, beforeEach, afterEach } from "vitest";

import type { ActionEvent, InteractionRequest } from "@consoler/protocol";

import { EventStore } from "../src/event-store.js";
import { REDACTED_SENTINEL, redactInteractionResponse } from "../src/interaction-redaction.js";
import { ConsolerStore } from "../src/db/store.js";
import { getActionTrace } from "../src/action-read.js";
import { replayAction } from "../src/replay.js";

describe("interaction redaction", () => {
  let tmpRoot: string;
  let store: ConsolerStore;
  const actionId = "act_ix_redact";
  const runId = "run_ix_redact";

  beforeEach(() => {
    tmpRoot = path.join(os.tmpdir(), `consoler-redact-${Date.now()}`);
    mkdirSync(path.join(tmpRoot, ".consoler"), { recursive: true });
    store = new ConsolerStore(tmpRoot);
    store.saveAction({
      action_id: actionId,
      agent_id: "conformance-fake",
      command: "conformance.interactive_redaction",
      args: { message: "redact" },
      created_at: "2026-05-24T12:00:00.000Z"
    });
    store.createRun(runId, actionId, "conformance-fake", "conformance.interactive_redaction");
  });

  afterEach(() => {
    store.db.close();
    rmSync(tmpRoot, { recursive: true, force: true });
  });

  const request: InteractionRequest = {
    interaction_id: "ix_redact",
    title: "Credentials",
    message: "Enter values",
    prompt_schema: {
      type: "object",
      additionalProperties: false,
      required: ["label", "api_key"],
      properties: {
        label: { type: "string" },
        api_key: { type: "string", "x-consoler-redact": true }
      }
    },
    default_response: { label: "default-label", api_key: "default-secret" }
  };

  it("redacts marked top-level fields and records paths", () => {
    const redacted = redactInteractionResponse(request, {
      label: "public",
      api_key: "live-secret"
    });
    expect(redacted.response).toEqual({
      label: "public",
      api_key: REDACTED_SENTINEL
    });
    expect(redacted.redactedPaths).toEqual(["/api_key"]);
  });

  it("does not add paths for absent marked fields", () => {
    const redacted = redactInteractionResponse(request, { label: "only-public" });
    expect(redacted.response).toEqual({ label: "only-public" });
    expect(redacted.redactedPaths).toEqual([]);
  });

  it("persists redacted request, response, and interaction.required payload", () => {
    const events = new EventStore(store);
    const base = {
      run_id: runId,
      action_id: actionId,
      agent_id: "conformance-fake",
      command: "conformance.interactive_redaction",
      epoch: 0,
      timestamp: "2026-05-24T12:00:00.000Z"
    };
    events.ingest(runId, actionId, "conformance-fake", "conformance.interactive_redaction", {
      ...base,
      event_id: "evt_start",
      type: "action.started",
      seq: 1
    });
    store.insertPendingInteraction(
      runId,
      actionId,
      "conformance-fake",
      "conformance.interactive_redaction",
      request,
      base.timestamp
    );
    const ingest = events.ingest(runId, actionId, "conformance-fake", "conformance.interactive_redaction", {
      ...base,
      event_id: "evt_ix",
      type: "interaction.required",
      seq: 2,
      interaction: request
    } satisfies ActionEvent);
    expect(ingest.accepted).toBe(true);
    store.markInteractionResponded(runId, "ix_redact", {
      label: "public",
      api_key: "live-secret"
    });

    const trace = getActionTrace(store, actionId);
    expect(trace.interactions[0]?.response).toEqual({
      label: "public",
      api_key: REDACTED_SENTINEL
    });
    expect(trace.interactions[0]?.request.default_response).toEqual({
      label: "default-label",
      api_key: REDACTED_SENTINEL
    });
    expect(trace.interactions[0]?.redacted_paths).toEqual(["/api_key"]);

    const row = store.db
      .prepare(`SELECT payload_json FROM events WHERE run_id = ? AND type = ?`)
      .get(runId, "interaction.required") as { payload_json: string };
    const stored = JSON.parse(row.payload_json) as ActionEvent;
    expect(stored.interaction?.default_response).toEqual({
      label: "default-label",
      api_key: REDACTED_SENTINEL
    });
    expect(row.payload_json).not.toContain("default-secret");
    expect(row.payload_json).not.toContain("live-secret");

    const replay = replayAction(store, actionId);
    expect(replay.events.every((entry) => entry.type !== "interaction.response")).toBe(true);

    const responseRow = store.db
      .prepare(`SELECT response_json FROM interactions WHERE run_id = ?`)
      .get(runId) as { response_json: string };
    expect(responseRow.response_json).not.toContain("live-secret");
  });
});
