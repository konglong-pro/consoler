import type { ActionEvent, OperationTrace, OperationTraceCapabilityRef, RenderableBlock } from "@consoler/protocol";

import type { InteractionRequest } from "@consoler/protocol";

import type {
  ActionHistoryEntry,
  ActionHistoryStatus,
  ActionRunSummary,
  ActionTrace,
  ArtifactRetrievalTraceRecord,
  InteractionTraceRecord,
  ListActionHistoryOptions,
  RejectedEventRecord,
  RunControlErrorSummary
} from "./action-read-types.js";
import type { ConsolerStore, StoredEvent, StoredInteraction } from "./db/store.js";
import { parseRedactedPathsJson } from "./interaction-redaction.js";
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

export function terminalStateFromRunStatus(status: string | null): ActionHistoryStatus | null {
  if (!status || status === "running") return null;
  if (status === "succeeded" || status === "failed" || status === "cancelled") {
    return status;
  }
  return null;
}

function toRunControlError(run: {
  control_error_code: string | null;
  control_error_message: string | null;
  control_error_at: string | null;
}): RunControlErrorSummary | null {
  if (!run.control_error_code || !run.control_error_message) {
    return null;
  }
  return {
    code: run.control_error_code,
    message: run.control_error_message,
    at: run.control_error_at
  };
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringField(record: Record<string, unknown>, key: string): string | null {
  const value = record[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}

function stringMap(value: unknown): Record<string, string> | null {
  if (!isRecord(value)) return null;
  const result: Record<string, string> = {};
  for (const [key, item] of Object.entries(value)) {
    if (typeof item !== "string") return null;
    result[key] = item;
  }
  return result;
}

function stringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const result: string[] = [];
  for (const item of value) {
    if (typeof item !== "string" || item.length === 0) return null;
    result.push(item);
  }
  return result;
}

function parseCapabilityRef(value: unknown): OperationTraceCapabilityRef | null {
  if (!isRecord(value)) return null;
  const provider = stringField(value, "provider");
  const capability_id = stringField(value, "capability_id");
  const provider_run_id = stringField(value, "provider_run_id");
  const status = stringField(value, "status");
  if (!provider || !capability_id || !provider_run_id || !status) {
    return null;
  }

  const ref: OperationTraceCapabilityRef = {
    provider,
    capability_id,
    provider_run_id,
    status
  };
  for (const key of ["job_id", "profile", "operation_id", "manifest_ref", "trace_ref"] as const) {
    const item = stringField(value, key);
    if (item) {
      ref[key] = item;
    }
  }
  if (value.artifact_refs !== undefined) {
    const artifactRefs = stringArray(value.artifact_refs);
    if (!artifactRefs) return null;
    ref.artifact_refs = artifactRefs;
  }
  return ref;
}

function parseOperationTrace(event: ActionEvent): OperationTrace | null {
  const raw = event.payload?.operation_trace;
  if (!isRecord(raw)) return null;

  const operation_id = stringField(raw, "operation_id");
  const action_id = stringField(raw, "action_id");
  const agent_id = stringField(raw, "agent_id");
  const command = stringField(raw, "command");
  if (!operation_id || !action_id || !agent_id || !command) {
    return null;
  }
  if (action_id !== event.action_id || agent_id !== event.agent_id || command !== event.command) {
    return null;
  }

  const trace: OperationTrace = {
    operation_id,
    action_id,
    agent_id,
    command
  };

  const status = stringField(raw, "status");
  if (status) {
    trace.status = status;
  }

  if (raw.domain_refs !== undefined) {
    const domainRefs = stringMap(raw.domain_refs);
    if (!domainRefs) return null;
    trace.domain_refs = domainRefs;
  }

  if (raw.capability_refs !== undefined) {
    if (!Array.isArray(raw.capability_refs)) return null;
    const capabilityRefs: OperationTraceCapabilityRef[] = [];
    for (const item of raw.capability_refs) {
      const ref = parseCapabilityRef(item);
      if (!ref) return null;
      capabilityRefs.push(ref);
    }
    trace.capability_refs = capabilityRefs;
  }

  if (raw.metadata !== undefined) {
    if (!isRecord(raw.metadata)) return null;
    trace.metadata = raw.metadata;
  }

  return trace;
}

export function operationTracesFromEvents(events: ActionEvent[]): OperationTrace[] {
  const byOperationId = new Map<string, OperationTrace>();
  for (const event of events) {
    const trace = parseOperationTrace(event);
    if (!trace) continue;
    if (byOperationId.has(trace.operation_id)) {
      byOperationId.delete(trace.operation_id);
    }
    byOperationId.set(trace.operation_id, trace);
  }
  return Array.from(byOperationId.values());
}

function storedEventToActionEvent(row: StoredEvent): ActionEvent | null {
  try {
    return JSON.parse(row.payload_json) as ActionEvent;
  } catch {
    return null;
  }
}

function toInteractionTraceRecord(row: StoredInteraction): InteractionTraceRecord {
  const request = JSON.parse(row.request_json) as InteractionRequest;
  return {
    run_id: row.run_id,
    interaction_id: row.interaction_id,
    status: row.status,
    request,
    response: row.response_json ? (JSON.parse(row.response_json) as unknown) : null,
    requested_at: row.requested_at,
    responded_at: row.responded_at,
    closed_at: row.closed_at,
    timeout_triggered_at: row.timeout_triggered_at,
    timeout_outcome: row.timeout_outcome,
    redacted_paths: parseRedactedPathsJson(row.redacted_paths_json)
  };
}

function toArtifactRetrievalTraceRecord(
  row: import("./db/store.js").StoredArtifactRetrieval
): ArtifactRetrievalTraceRecord {
  return {
    retrieval_id: row.retrieval_id,
    block_id: row.block_id,
    artifact_uri: row.artifact_uri,
    kind: row.kind,
    status: row.status as ArtifactRetrievalTraceRecord["status"],
    error_code: row.error_code,
    error_message: row.error_message,
    requested_at: row.requested_at,
    completed_at: row.completed_at
  };
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
  const recentFilter: {
    command?: string;
    agentId?: string;
    commands?: string[];
  } = {};
  if (options.command) recentFilter.command = options.command;
  if (options.agentId) recentFilter.agentId = options.agentId;
  if (options.commands?.length) recentFilter.commands = options.commands;
  const rows = store.listRecentActions(limit * 4, recentFilter);
  const entries: ActionHistoryEntry[] = [];

  for (const row of rows) {
    if (options.agentId && row.agent_id !== options.agentId) continue;
    if (options.commands?.length && !options.commands.includes(row.command)) continue;

    const args = JSON.parse(row.args_json) as Record<string, unknown>;
    const status = deriveActionStatus(row.latest_run_id, row.latest_run_status);
    if (options.status && status !== options.status) continue;

    const counts = store.countEventsForAction(row.action_id);
    const terminalState = row.latest_run_id
      ? (terminalStateFromAcceptedEvents(
          store.listAcceptedEventsForRun(row.latest_run_id)
        ) ??
        terminalStateFromRunStatus(row.latest_run_status))
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
      terminal_state: terminalState,
      interaction_count: store.countInteractionsForAction(row.action_id)
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
      ended_at: run.ended_at,
      control_error: toRunControlError(run)
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
  const latestRunRow = runs[0] ?? null;
  const terminal_state =
    (timeline.run_id ? terminalStateFromAcceptedEvents(timeline.events) : null) ??
    terminalStateFromRunStatus(latestRunRow?.status ?? null);
  const latest_run_control_error = latestRunRow ? latestRunRow.control_error : null;

  return {
    action,
    plan: store.getLatestPlan(actionId),
    context: store.getLatestContext(actionId),
    approvals: store.listApprovalsForAction(actionId),
    runs,
    accepted_events,
    rejected_events,
    operation_traces: operationTracesFromEvents(accepted_events),
    result_blocks: resultBlocksFromEvents(accepted_events),
    terminal_state,
    latest_run_id: timeline.run_id,
    latest_run_control_error,
    interactions: store.listInteractionsForAction(actionId).map(toInteractionTraceRecord),
    artifact_retrievals: store
      .listArtifactRetrievalsForAction(actionId)
      .map(toArtifactRetrievalTraceRecord)
  };
}
