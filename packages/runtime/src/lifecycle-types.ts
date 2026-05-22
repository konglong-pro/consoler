import type {
  ActionDraft,
  ActionEvent,
  ActionPlan,
  AgentManifest,
  ApprovalToken,
  RegistryAgentEntry
} from "@consoler/protocol";

import type { EventIngestResult } from "./event-store.js";

export interface ConsolerRuntimeOptions {
  rootDir?: string;
}

export interface CommandArgsInput {
  agentId: string;
  command: string;
  args: Record<string, unknown>;
}

export interface PrepareActionOptions {
  probePreview?: unknown;
}

export interface PreviewOptions {
  approvePreview?: boolean;
}

export interface PreviewLifecycleResult {
  preview?: unknown;
  preview_approval?: ApprovalToken;
  awaiting_preview_approval: boolean;
}

export interface RunOptions {
  approvePreview?: boolean;
  approve?: boolean;
}

export interface RunResult {
  action_id: string;
  run_id: string;
  approval?: ApprovalToken;
  preview_approval?: ApprovalToken;
  awaiting_preview_approval?: boolean;
  awaiting_approval?: boolean;
}

export type RuntimeLifecycleState =
  | "idle"
  | "preparing"
  | "awaiting_preview_approval"
  | "awaiting_approval"
  | "running"
  | "succeeded"
  | "failed"
  | "cancelled";

export interface PreparedAction {
  action: ActionDraft;
  plan: ActionPlan;
  plan_hash: string;
  preview: unknown;
  approval: ApprovalToken;
  manifest: AgentManifest;
  entry: RegistryAgentEntry;
}

export interface RuntimeEventHandlers {
  onEvent?: (event: ActionEvent, ingest: EventIngestResult) => void;
  onStateChange?: (state: RuntimeLifecycleState) => void;
}

export interface RuntimeTerminalResult {
  run_id: string;
  state: "succeeded" | "failed" | "cancelled";
  events: ActionEvent[];
}

export interface RunWithEventsResult {
  action_id: string;
  run_id: string;
  approval?: ApprovalToken;
  preview_approval?: ApprovalToken;
  awaiting_preview_approval: boolean;
  awaiting_approval: boolean;
  terminal?: RuntimeTerminalResult;
}
