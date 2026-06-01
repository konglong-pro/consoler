import {
  createIntentProviderFromEnv,
  draftIntent,
  draftIntentAssisted,
  type IntentDraftAssistedResult,
  type IntentDraftResult,
  type IntentScope,
  type LlmIntentProvider
} from "@consoler/runtime";

export interface RunIntentDraftOptions {
  text: string;
  scope: IntentScope;
  assist?: boolean;
  provider?: LlmIntentProvider | null;
}

export function resolveAssistProviderFromEnv(): LlmIntentProvider | null {
  return createIntentProviderFromEnv(process.env);
}

export async function runIntentDraft(
  options: RunIntentDraftOptions
): Promise<IntentDraftResult | IntentDraftAssistedResult> {
  if (!options.assist) {
    return draftIntent({ text: options.text, scope: options.scope });
  }
  const provider = options.provider === undefined ? resolveAssistProviderFromEnv() : options.provider;
  return draftIntentAssisted({
    text: options.text,
    scope: options.scope,
    provider
  });
}
