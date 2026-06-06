import { createJsonHttpIntentProvider } from "./intent-draft-http-provider.js";
import type { LlmIntentProvider } from "./intent-draft-assisted-types.js";

/** Generic provider env keys; callers pass an explicit env-like object. */
export interface IntentProviderEnv {
  CONSOLER_INTENT_PROVIDER_URL?: string;
  CONSOLER_INTENT_PROVIDER_TIMEOUT_MS?: string;
  CONSOLER_TUI_ASSISTED_INTENT?: string;
}

export function createIntentProviderFromEnv(
  env: IntentProviderEnv
): LlmIntentProvider | null {
  const url = env.CONSOLER_INTENT_PROVIDER_URL?.trim();
  if (!url) {
    return null;
  }
  const timeoutRaw = env.CONSOLER_INTENT_PROVIDER_TIMEOUT_MS?.trim();
  const timeoutMs = timeoutRaw ? Number(timeoutRaw) : undefined;
  return createJsonHttpIntentProvider({
    url,
    ...(timeoutMs !== undefined && Number.isFinite(timeoutMs) ? { timeoutMs } : {})
  });
}

export function isTuiAssistedIntentEnabled(env: IntentProviderEnv): boolean {
  return env.CONSOLER_TUI_ASSISTED_INTENT?.trim() === "1";
}

export function isIntentProviderConfigured(env: IntentProviderEnv): boolean {
  return Boolean(env.CONSOLER_INTENT_PROVIDER_URL?.trim());
}

/** Product TUI requires explicit opt-in plus provider configuration. */
export function shouldUseTuiAssistedIntent(env: IntentProviderEnv): boolean {
  return isTuiAssistedIntentEnabled(env) && isIntentProviderConfigured(env);
}
