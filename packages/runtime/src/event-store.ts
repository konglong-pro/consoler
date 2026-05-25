import {
  TERMINAL_EVENT_TYPES,
  validateActionEvent,
  type ActionEvent
} from "@consoler/protocol";

import { redactInteractionRequiredEvent } from "./interaction-redaction.js";
import { validateInteractionTimeoutPolicy } from "./interaction-timeout.js";
import type { ConsolerStore, StoredEvent } from "./db/store.js";

export type EventRejectReason =
  | "schema_invalid"
  | "duplicate_seq"
  | "wrong_run"
  | "stale_post_terminal"
  | "cancel_requested"
  | "missing_identity";

export interface EventIngestOptions {
  /** After cancel is requested, only action.cancelled may be accepted. */
  cancelQuarantine?: boolean;
}

export interface EventIngestResult {
  accepted: boolean;
  reason?: EventRejectReason;
  event?: ActionEvent;
}

export class EventStore {
  constructor(private readonly store: ConsolerStore) {}

  ingest(
    runId: string,
    actionId: string,
    agentId: string,
    command: string,
    rawEvent: unknown,
    options: EventIngestOptions = {}
  ): EventIngestResult {
    const now = new Date().toISOString();
    const validated = validateActionEvent(rawEvent);
    if (!validated.ok) {
      const partial = partialIdentity(rawEvent);
      this.store.insertEvent({
        id: 0,
        event_id: partial.event_id,
        run_id: partial.run_id ?? runId,
        action_id: partial.action_id ?? actionId,
        agent_id: partial.agent_id ?? agentId,
        command: partial.command ?? command,
        type: partial.type ?? "log",
        seq: partial.seq,
        epoch: partial.epoch,
        timestamp: partial.timestamp,
        payload_json: JSON.stringify(rawEvent),
        accepted: 0,
        reject_reason: "schema_invalid",
        created_at: now
      });
      return { accepted: false, reason: "schema_invalid" };
    }

    const event = validated.value!;
    if (options.cancelQuarantine && event.type !== "action.cancelled") {
      return this.reject(event, "cancel_requested", now);
    }
    if (event.type === "interaction.required" && event.interaction) {
      const timeoutError = validateInteractionTimeoutPolicy(event.interaction);
      if (timeoutError) {
        return this.reject(event, "schema_invalid", now);
      }
    }
    if (event.run_id !== runId) {
      return this.reject(event, "wrong_run", now);
    }

    const lastSeq = this.store.getLastAcceptedSeq(runId);
    const terminal = this.store.isRunTerminal(runId);

    if (terminal) {
      if (!event.type.startsWith("system.")) {
        return this.reject(event, "stale_post_terminal", now);
      }
    }

    if (event.seq <= lastSeq) {
      return this.reject(event, "duplicate_seq", now);
    }

    const persistedEvent =
      event.type === "interaction.required"
        ? redactInteractionRequiredEvent(event)
        : event;
    this.store.insertEvent({
      id: 0,
      event_id: event.event_id,
      run_id: event.run_id,
      action_id: event.action_id,
      agent_id: event.agent_id,
      command: event.command,
      type: event.type,
      seq: event.seq,
      epoch: event.epoch,
      timestamp: event.timestamp,
      payload_json: JSON.stringify(persistedEvent),
      accepted: 1,
      reject_reason: null,
      created_at: now
    });

    if (TERMINAL_EVENT_TYPES.has(event.type)) {
      const status =
        event.type === "action.succeeded"
          ? "succeeded"
          : event.type === "action.failed"
            ? "failed"
            : "cancelled";
      this.store.closeRun(runId, status);
    }

    return { accepted: true, event };
  }

  private reject(event: ActionEvent, reason: EventRejectReason, now: string): EventIngestResult {
    this.store.insertEvent({
      id: 0,
      event_id: event.event_id,
      run_id: event.run_id,
      action_id: event.action_id,
      agent_id: event.agent_id,
      command: event.command,
      type: event.type,
      seq: event.seq,
      epoch: event.epoch,
      timestamp: event.timestamp,
      payload_json: JSON.stringify(event),
      accepted: 0,
      reject_reason: reason,
      created_at: now
    });
    return { accepted: false, reason, event };
  }
}

function partialIdentity(raw: unknown): {
  event_id: string | null;
  run_id?: string;
  action_id?: string;
  agent_id?: string;
  command?: string;
  type?: string;
  seq: number | null;
  epoch: number | null;
  timestamp: string | null;
} {
  if (!raw || typeof raw !== "object") {
    return { event_id: null, seq: null, epoch: null, timestamp: null };
  }
  const record = raw as Record<string, unknown>;
  const partial: {
    event_id: string | null;
    run_id?: string;
    action_id?: string;
    agent_id?: string;
    command?: string;
    type?: string;
    seq: number | null;
    epoch: number | null;
    timestamp: string | null;
  } = {
    event_id: typeof record.event_id === "string" ? record.event_id : null,
    seq: typeof record.seq === "number" ? record.seq : null,
    epoch: typeof record.epoch === "number" ? record.epoch : null,
    timestamp: typeof record.timestamp === "string" ? record.timestamp : null
  };
  if (typeof record.run_id === "string") partial.run_id = record.run_id;
  if (typeof record.action_id === "string") partial.action_id = record.action_id;
  if (typeof record.agent_id === "string") partial.agent_id = record.agent_id;
  if (typeof record.command === "string") partial.command = record.command;
  if (typeof record.type === "string") partial.type = record.type;
  return partial;
}
