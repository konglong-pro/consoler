export type PreviewKind = "static" | "dynamic" | "probe_readonly";

export type ApprovalScope = "preview" | "execute";

export type RenderableBlockType = "markdown" | "table" | "json" | "error" | "diff" | "artifact";

export interface DiffBlockContent {
  unified_diff: string;
  language?: string;
  from_label?: string;
  to_label?: string;
}

export interface ArtifactBlockContent {
  uri: string;
  kind: string;
  label?: string;
  metadata?: Record<string, unknown>;
}

export type ActionEventType =
  | "action.started"
  | "step.started"
  | "step.completed"
  | "progress.updated"
  | "log"
  | "interaction.required"
  | "action.succeeded"
  | "action.failed"
  | "action.cancelled";

export interface InteractionChoice {
  id: string;
  label: string;
}

export type InteractionTimeoutAction = "abort" | "use_default" | "skip" | "continue";

export interface InteractionTimeoutPolicy {
  timeout_seconds: number;
  on_timeout: InteractionTimeoutAction;
}

export interface InteractionRequest {
  interaction_id: string;
  title: string;
  message: string;
  choices?: InteractionChoice[];
  prompt_schema?: Record<string, unknown>;
  default_response?: unknown;
  blocks?: RenderableBlock[];
  timeout_policy?: InteractionTimeoutPolicy;
}

export const TERMINAL_EVENT_TYPES: ReadonlySet<ActionEventType> = new Set([
  "action.succeeded",
  "action.failed",
  "action.cancelled"
]);

export interface Permission {
  kind: string;
  scope?: string;
  description?: string;
}

export interface PreviewPolicy {
  preview_kind: PreviewKind;
  requires_approval_before_preview: boolean;
  preview_side_effects: string[];
  invalidates_on_context_change: boolean;
}

export interface AgentCommand {
  name: string;
  description: string;
  args_schema: Record<string, unknown>;
  preview_policy: PreviewPolicy;
  side_effects: string[];
  permissions: Permission[];
}

export interface ArtifactRetrievalCapability {
  uri_schemes: string[];
  kinds: string[];
}

export interface AgentManifest {
  agent_id: string;
  name: string;
  version: string;
  protocol_version: string;
  commands: AgentCommand[];
  artifact_retrieval?: ArtifactRetrievalCapability;
}

export interface ArtifactView {
  artifact_uri: string;
  kind: string;
  title?: string;
  metadata?: Record<string, unknown>;
  truncated?: boolean;
  truncation_reason?: string;
  blocks: RenderableBlock[];
}

export interface OperationTraceCapabilityRef {
  provider: string;
  capability_id: string;
  provider_run_id: string;
  status: string;
  job_id?: string;
  profile?: string;
  operation_id?: string;
  manifest_ref?: string;
  trace_ref?: string;
  artifact_refs?: string[];
}

export interface OperationTrace {
  operation_id: string;
  action_id: string;
  agent_id: string;
  command: string;
  status?: string;
  domain_refs?: Record<string, string>;
  capability_refs?: OperationTraceCapabilityRef[];
  metadata?: Record<string, unknown>;
}

export interface ActionEventPayload {
  operation_trace?: OperationTrace;
  [key: string]: unknown;
}

export interface ActionDraft {
  action_id: string;
  agent_id: string;
  command: string;
  args: Record<string, unknown>;
  created_at: string;
}

export interface PlanStep {
  step_id: string;
  title: string;
  description?: string;
}

export interface ContextSnapshot {
  snapshot_id: string;
  kind: "composite";
  summary: string;
  details: Record<string, unknown>;
  created_at: string;
}

export interface ActionPlan {
  plan_id: string;
  action_id: string;
  agent_id: string;
  command: string;
  steps: PlanStep[];
  context_snapshot_id: string;
  context_snapshot: ContextSnapshot;
  side_effects: string[];
  created_at: string;
}

export interface ApprovalMaterial {
  agent_id: string;
  agent_version: string;
  command: string;
  normalized_args: Record<string, unknown>;
  plan_summary: string;
  context_summary: string;
  side_effects: string[];
  preview_summary?: string;
}

export interface ApprovalToken {
  approval_id: string;
  action_id: string;
  agent_id: string;
  command: string;
  scope: ApprovalScope;
  args_hash: string;
  plan_hash?: string;
  context_snapshot_hash?: string;
  side_effects_hash?: string;
  preview_hash?: string;
  material: ApprovalMaterial;
  created_at: string;
}

export interface RenderableBlock {
  block_id: string;
  type: RenderableBlockType;
  title?: string;
  content: unknown;
}

export interface AgentError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  retryable?: boolean;
}

export interface ActionEvent {
  event_id: string;
  run_id: string;
  action_id: string;
  agent_id: string;
  command: string;
  type: ActionEventType;
  seq: number;
  epoch: number;
  timestamp: string;
  step_id?: string;
  message?: string;
  progress?: number;
  blocks?: RenderableBlock[];
  error?: AgentError;
  interaction?: InteractionRequest;
  payload?: ActionEventPayload;
}

export interface JsonRpcRequest {
  jsonrpc: "2.0";
  id: string | number;
  method: string;
  params?: Record<string, unknown>;
}

export interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: string | number | null;
  result?: unknown;
  error?: JsonRpcError;
}

export interface JsonRpcError {
  code: number;
  message: string;
  data?: AgentError | Record<string, unknown>;
}

export interface RegistryAgentEntry {
  agent_id: string;
  name: string;
  cwd: string;
  command: string;
  args: string[];
  env?: Record<string, string>;
  enabled: boolean;
}

export interface AgentsRegistryFile {
  agents: RegistryAgentEntry[];
}
