import type {
  LlmIntentProvider,
  LlmIntentProviderRequest,
  LlmIntentProviderSuggestion
} from "./intent-draft-assisted-types.js";

export interface JsonHttpIntentProviderOptions {
  url: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

export function createJsonHttpIntentProvider(
  options: JsonHttpIntentProviderOptions
): LlmIntentProvider {
  const fetchImpl = options.fetchImpl ?? fetch;
  const requestTimeoutMs = options.timeoutMs ?? 15_000;

  return {
    async suggest(request: LlmIntentProviderRequest): Promise<LlmIntentProviderSuggestion | null> {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), requestTimeoutMs);
      try {
        const response = await fetchImpl(options.url, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            text: request.text,
            scope: request.scope
          }),
          signal: controller.signal
        });
        if (!response.ok) {
          return null;
        }
        const body: unknown = await response.json();
        return parseProviderResponse(body);
      } catch {
        return null;
      } finally {
        clearTimeout(timer);
      }
    }
  };
}

function parseProviderResponse(body: unknown): LlmIntentProviderSuggestion | null {
  if (!isRecord(body)) {
    return null;
  }
  if (Array.isArray(body.actions) || Array.isArray(body.suggestions) || Array.isArray(body.commands)) {
    return null;
  }
  const suggestion = isRecord(body.suggestion) ? body.suggestion : body;
  if (!isRecord(suggestion)) {
    return null;
  }
  if (
    typeof suggestion.agent_id !== "string" ||
    typeof suggestion.command !== "string" ||
    !isRecord(suggestion.prefilled_args)
  ) {
    return null;
  }
  const parsed: LlmIntentProviderSuggestion = {
    agent_id: suggestion.agent_id,
    command: suggestion.command,
    prefilled_args: suggestion.prefilled_args
  };
  if (typeof suggestion.message === "string" && suggestion.message.length > 0) {
    parsed.message = suggestion.message;
  }
  return parsed;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
