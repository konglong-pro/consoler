import type { IntentDraftResult, IntentScope } from "./intent-draft-types.js";

export type AssistedFallbackCode =
  | "assisted_unavailable"
  | "assisted_timed_out"
  | "assisted_invalid_output";

export interface AssistedIntentNotice {
  code: AssistedFallbackCode;
  message: string;
}

export interface LlmIntentProviderSuggestion {
  agent_id: string;
  command: string;
  prefilled_args: Record<string, unknown>;
  message?: string;
}

export interface LlmIntentProviderRequest {
  text: string;
  scope: IntentScope;
}

export interface LlmIntentProvider {
  suggest(request: LlmIntentProviderRequest): Promise<LlmIntentProviderSuggestion | null>;
}

export type IntentDraftAssistedResult = IntentDraftResult & {
  assist_notice?: AssistedIntentNotice;
};

export const ASSISTED_NOTICE_MESSAGES: Record<AssistedFallbackCode, string> = {
  assisted_unavailable:
    "Assisted intent drafting is unavailable; using deterministic drafting.",
  assisted_timed_out:
    "Assisted intent drafting timed out; using deterministic drafting.",
  assisted_invalid_output:
    "Assisted intent drafting returned unusable output; using deterministic drafting."
};
