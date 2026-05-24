import type {
  ActionDraft,
  ActionEvent,
  ActionPlan,
  ApprovalToken,
  ContextSnapshot,
  InteractionRequest,
  RenderableBlock
} from "@consoler/protocol";

export type InteractionTraceStatus = "pending" | "responded" | "abandoned";

export type ActionHistoryStatus = "prepared" | "running" | "succeeded" | "failed" | "cancelled";

export interface ListActionHistoryOptions {
  limit?: number;
  command?: string;
  status?: ActionHistoryStatus;
}

export interface ActionHistoryEntry {
  action_id: string;
  agent_id: string;
  command: string;
  created_at: string;
  status: ActionHistoryStatus;
  args_summary: string;
  latest_run_id: string | null;
  latest_run_status: string | null;
  accepted_event_count: number;
  rejected_event_count: number;
  has_plan: boolean;
  has_context: boolean;
  has_approval: boolean;
  terminal_state: ActionHistoryStatus | null;
  interaction_count: number;
}

export interface InteractionTraceRecord {
  run_id: string;
  interaction_id: string;
  status: InteractionTraceStatus;
  request: InteractionRequest;
  response: unknown | null;
  requested_at: string;
  responded_at: string | null;
  closed_at: string | null;
}

export interface ActionRunSummary {
  run_id: string;
  action_id: string;
  agent_id: string;
  command: string;
  status: string;
  started_at: string;
  ended_at: string | null;
}

export interface RejectedEventRecord {
  id: number;
  run_id: string;
  action_id: string;
  type: string;
  seq: number | null;
  reject_reason: string | null;
  created_at: string;
  event: ActionEvent | null;
  raw_payload: unknown;
}

export interface ActionTrace {
  action: ActionDraft;
  plan: { plan: ActionPlan; plan_hash: string } | null;
  context: { snapshot: ContextSnapshot; snapshot_hash: string } | null;
  approvals: ApprovalToken[];
  runs: ActionRunSummary[];
  accepted_events: ActionEvent[];
  rejected_events: RejectedEventRecord[];
  result_blocks: RenderableBlock[];
  terminal_state: ActionHistoryStatus | null;
  latest_run_id: string | null;
  interactions: InteractionTraceRecord[];
}
