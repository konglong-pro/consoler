import {
  createIntentProviderFromEnv,
  isTuiAssistedIntentEnabled,
  type IntentProviderEnv,
  type LlmIntentProvider
} from "@consoler/runtime";

export interface ProductAssistedIntentConfig {
  enabled: boolean;
  provider: LlmIntentProvider | null;
}

export function resolveProductAssistedIntent(
  env: IntentProviderEnv,
  providerOverride?: LlmIntentProvider | null
): ProductAssistedIntentConfig {
  const enabled = isTuiAssistedIntentEnabled(env);
  if (!enabled) {
    return { enabled: false, provider: null };
  }
  const provider =
    providerOverride === undefined ? createIntentProviderFromEnv(env) : providerOverride;
  return { enabled: true, provider };
}
