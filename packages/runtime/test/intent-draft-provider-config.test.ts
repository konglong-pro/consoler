import { describe, expect, it } from "vitest";

import {
  createIntentProviderFromEnv,
  isIntentProviderConfigured,
  isTuiAssistedIntentEnabled,
  shouldUseTuiAssistedIntent
} from "../src/intent-draft-provider-config.js";

describe("intent-draft-provider-config", () => {
  it("treats provider URL alone as not product-assisted", () => {
    const env = {
      CONSOLER_INTENT_PROVIDER_URL: "http://127.0.0.1:9/suggest"
    };
    expect(isIntentProviderConfigured(env)).toBe(true);
    expect(isTuiAssistedIntentEnabled(env)).toBe(false);
    expect(shouldUseTuiAssistedIntent(env)).toBe(false);
  });

  it("enables product assisted only with explicit TUI switch and provider URL", () => {
    const env = {
      CONSOLER_TUI_ASSISTED_INTENT: "1",
      CONSOLER_INTENT_PROVIDER_URL: "http://127.0.0.1:9/suggest"
    };
    expect(shouldUseTuiAssistedIntent(env)).toBe(true);
    expect(createIntentProviderFromEnv(env)).not.toBeNull();
  });
});
