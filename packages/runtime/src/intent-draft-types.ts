export type IntentClarificationReason =
  | "no_match"
  | "ambiguous_command"
  | "missing_required_args"
  | "ambiguous_args"
  | "unsupported_schema";

export interface IntentScope {
  commands: IntentScopeCommand[];
}

export interface IntentScopeCommand {
  agent_id: string;
  command: string;
  command_description: string;
  args_schema: Record<string, unknown>;
  product_action_id?: string;
  product_label?: string;
  product_description?: string;
  action_hints?: string[];
  field_hints?: Record<string, string[]>;
  field_labels?: Record<string, { label?: string; help?: string }>;
}

export interface IntentCandidate {
  agent_id: string;
  command: string;
  product_action_id?: string;
  prefilled_args: Record<string, unknown>;
}

export type IntentDraftResult =
  | {
      outcome: "candidate";
      candidate: IntentCandidate;
      message?: string;
    }
  | {
      outcome: "needs_clarification";
      reason: IntentClarificationReason;
      message: string;
      partial_candidate?: IntentCandidate;
      missing_required_args?: string[];
      ambiguous_fields?: string[];
      unsupported_features?: string[];
    };
