import type { ActionEvent, RenderableBlock } from "@consoler/protocol";

import type {
  ActionHistoryEntry,
  ActionHistoryStatus,
  ActionRunSummary,
  ActionTrace,
  ListActionHistoryOptions,
  RejectedEventRecord
} from "./action-read-types.js";
import type { ConsolerStore, StoredEvent } from "./db/store.js";
import { replayAction } from "./replay.js";

const DEFAULT_HISTORY_LIMIT = 20;

export function summarizeArgs(args: Record<string, unknown>): string {
  const parts = Object.entries(args).map(([key, value]) => {
    const text = typeof value === "string" ? value : JSON.stringify(value);
    const clipped = text.length > 48 ? `${text.slice(0, 45)}...` : text;
    return `${key}=${clipped}`;
  });
  const joined = parts.join(", ");
  return joined.length > 120 ? `${joined.slice(0, 117)}...` : joined;
}

export function shortActionId(actionId: string): string {
  if (actionId.length <= 12) return actionId;
  return actionId.slice(-12);
}

export function deriveActionStatus(
  latestRunId: string | null,
  latestRunStatus: string | null
): ActionHistoryStatus {
  if (!latestRunId) return "prepared";
  if (latestRunStatus === "running") return "running";
  if (latestRunStatus === "succeeded") return "succeeded";
  if (latestRunStatus === "failed") return "failed";
  if (latestRunStatus === "cancelled") return "cancelled";
  return "prepared";
}

export function terminalStateFromAcceptedEvents(events: ActionEvent[]): ActionHistoryStatus | null {
  for (let i = events.length - 1; i >= 0; i--) {
    const event = events[i]!;
    if (event.type === "action.succeeded") return "succeeded";
    if (event.type === "action.failed") return "failed";
    if (event.type === "action.cancelled") return "cancelled";
  }
  return null;
}

export function resultBlocksFromEvents(events: ActionEvent[]): RenderableBlock[] {
  for (let i = events.length - 1; i >= 0; i--) {
    const event = events[i]!;
    if (event.type === "action.succeeded" && event.blocks?.length) {
      return event.blocks;
    }
  }
  return [];
}

function storedEventToActionEvent(row: StoredEvent): ActionEvent | null {
  try {
    return JSON.parse(row.payload_json) as ActionEvent;
  } catch {
    return null;
  }
}

function toRejectedRecord(row: StoredEvent): RejectedEventRecord {
  return {
    id: row.id,
    run_id: row.run_id,
    action_id: row.action_id,
    type: row.type,
    seq: row.seq,
    reject_reason: row.reject_reason,
    created_at: row.created_at,
    event: storedEventToActionEvent(row),
    raw_payload: JSON.parse(row.payload_json) as unknown
  };
}

export function listActionHistory(
  store: ConsolerStore,
  options: ListActionHistoryOptions = {}
): ActionHistoryEntry[] {
  const limit = options.limit ?? DEFAULT_HISTORY_LIMIT;
  const rows = store.listRecentActions(limit * 4, options.command);
  const entries: ActionHistoryEntry[] = [];

  for (const row of rows) {
    const args = JSON.parse(row.args_json) as Record<string, unknown>;
    const status = deriveActionStatus(row.latest_run_id, row.latest_run_status);
    if (options.status && status !== options.status) continue;

    const counts = store.countEventsForAction(row.action_id);
    const terminalState = row.latest_run_id
      ? terminalStateFromAcceptedEvents(
          store.listAcceptedEventsForRun(row.latest_run_id)
        )
      : null;

    entries.push({
      action_id: row.action_id,
      agent_id: row.agent_id,
      command: row.command,
      created_at: row.created_at,
      status,
      args_summary: summarizeArgs(args),
      latest_run_id: row.latest_run_id,
      latest_run_status: row.latest_run_status,
      accepted_event_count: counts.accepted,
      rejected_event_count: counts.rejected,
      has_plan: store.hasPlan(row.action_id),
      has_context: store.hasContext(row.action_id),
      has_approval: store.hasApproval(row.action_id),
      terminal_state: terminalState
    });

    if (entries.length >= limit) break;
  }

  return entries;
}

export function getActionTrace(store: ConsolerStore, actionId: string): ActionTrace {
  const action = store.getAction(actionId);
  if (!action) {
    throw new Error(`Action not found: ${actionId}`);
  }

  const runs = store.listRunsForAction(actionId).map(
    (run): ActionRunSummary => ({
      run_id: run.run_id,
      action_id: run.action_id,
      agent_id: run.agent_id,
      command: run.command,
      status: run.status,
      started_at: run.started_at,
      ended_at: run.ended_at
    })
  );

  const latestRun = runs[0] ?? null;
  const allRows = store.listEventsForAction(actionId);
  const accepted_events: ActionEvent[] = [];
  const rejected_events: RejectedEventRecord[] = [];

  for (const row of allRows) {
    if (row.accepted === 1) {
      const event = storedEventToActionEvent(row);
      if (event) accepted_events.push(event);
    } else {
      rejected_events.push(toRejectedRecord(row));
    }
  }

  const timeline = replayAction(store, actionId);
  const terminal_state = timeline.run_id
    ? terminalStateFromAcceptedEvents(timeline.events)
    : null;

  return {
    action,
    plan: store.getLatestPlan(actionId),
    context: store.getLatestContext(actionId),
    approvals: store.listApprovalsForAction(actionId),
    runs,
    accepted_events,
    rejected_events,
    result_blocks: resultBlocksFromEvents(accepted_events),
    terminal_state,
    latest_run_id: timeline.run_id
  };
}
