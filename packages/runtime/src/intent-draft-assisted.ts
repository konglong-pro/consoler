import { validateCommandArgs } from "@consoler/protocol";

import { draftIntent } from "./intent-draft.js";
import type {
  IntentCandidate,
  IntentDraftResult,
  IntentScope,
  IntentScopeCommand
} from "./intent-draft-types.js";
import type {
  AssistedFallbackCode,
  AssistedIntentNotice,
  IntentDraftAssistedResult,
  LlmIntentProvider,
  LlmIntentProviderRequest,
  LlmIntentProviderSuggestion
} from "./intent-draft-assisted-types.js";
import { ASSISTED_NOTICE_MESSAGES } from "./intent-draft-assisted-types.js";

const DEFAULT_ASSIST_TIMEOUT_MS = 15_000;

type ProviderValidationFailure =
  | "unscoped"
  | "unknown_fields"
  | "schema_invalid"
  | "unsupported_schema"
  | "multi_action"
  | "malformed";

export async function draftIntentAssisted(input: {
  text: string;
  scope: IntentScope;
  provider?: LlmIntentProvider | null;
  timeoutMs?: number;
}): Promise<IntentDraftAssistedResult> {
  const deterministic = draftIntent({ text: input.text, scope: input.scope });
  if (deterministic.outcome === "candidate") {
    return deterministic;
  }

  if (!input.provider) {
    return withAssistNotice(deterministic, "assisted_unavailable");
  }

  const timeoutMs = input.timeoutMs ?? DEFAULT_ASSIST_TIMEOUT_MS;
  let suggestion: LlmIntentProviderSuggestion | null;
  try {
    suggestion = await withTimeout(
      input.provider.suggest({ text: input.text, scope: input.scope }),
      timeoutMs
    );
  } catch (error) {
    const code: AssistedFallbackCode =
      isTimeoutError(error) ? "assisted_timed_out" : "assisted_unavailable";
    return withAssistNotice(deterministic, code);
  }

  if (!suggestion) {
    return withAssistNotice(deterministic, "assisted_unavailable");
  }

  const validated = suggestionToIntentResult(suggestion, input.scope);
  if (!validated.ok) {
    return withAssistNotice(deterministic, "assisted_invalid_output");
  }

  return validated.result;
}

export function suggestionToIntentResult(
  suggestion: LlmIntentProviderSuggestion,
  scope: IntentScope
): { ok: true; result: IntentDraftResult } | { ok: false; failure: ProviderValidationFailure } {
  if (!isRecord(suggestion)) {
    return { ok: false, failure: "malformed" };
  }
  if (hasMultiActionShape(suggestion)) {
    return { ok: false, failure: "multi_action" };
  }

  const agentId = readNonEmptyString(suggestion.agent_id);
  const commandName = readNonEmptyString(suggestion.command);
  if (!agentId || !commandName) {
    return { ok: false, failure: "malformed" };
  }

  const scopeCommand = scope.commands.find(
    (entry) => entry.agent_id === agentId && entry.command === commandName
  );
  if (!scopeCommand) {
    return { ok: false, failure: "unscoped" };
  }

  const prefilledArgs = suggestion.prefilled_args;
  if (!isRecord(prefilledArgs)) {
    return { ok: false, failure: "malformed" };
  }

  const schemaAnalysis = analyzeArgsSchema(scopeCommand.args_schema);
  if (!schemaAnalysis.supported) {
    return { ok: false, failure: "unsupported_schema" };
  }
  if (hasUnknownFields(prefilledArgs, schemaAnalysis.knownFields)) {
    return { ok: false, failure: "unknown_fields" };
  }

  const validation = validateCommandArgs(scopeCommand.args_schema, prefilledArgs);
  if (validation.ok) {
    const candidate = buildCandidate(scopeCommand, prefilledArgs);
    const message = readOptionalString(suggestion.message);
    return {
      ok: true,
      result: message ? { outcome: "candidate", candidate, message } : { outcome: "candidate", candidate }
    };
  }

  const missingRequired = schemaAnalysis.required.filter(
    (fieldName) => prefilledArgs[fieldName] === undefined
  );
  if (missingRequired.length > 0) {
    return {
      ok: true,
      result: {
        outcome: "needs_clarification",
        reason: "missing_required_args",
        message: `Missing required fields: ${missingRequired.join(", ")}.`,
        missing_required_args: missingRequired,
        partial_candidate: buildCandidate(scopeCommand, prefilledArgs)
      }
    };
  }

  return { ok: false, failure: "schema_invalid" };
}

function withAssistNotice(
  result: IntentDraftResult,
  code: AssistedFallbackCode
): IntentDraftAssistedResult {
  const notice: AssistedIntentNotice = {
    code,
    message: ASSISTED_NOTICE_MESSAGES[code]
  };
  return { ...result, assist_notice: notice };
}

function buildCandidate(
  command: IntentScopeCommand,
  prefilled_args: Record<string, unknown>
): IntentCandidate {
  const candidate: IntentCandidate = {
    agent_id: command.agent_id,
    command: command.command,
    prefilled_args: { ...prefilled_args }
  };
  if (command.product_action_id) {
    candidate.product_action_id = command.product_action_id;
  }
  return candidate;
}

function analyzeArgsSchema(argsSchema: Record<string, unknown>): {
  supported: boolean;
  required: string[];
  knownFields: Set<string>;
} {
  if (argsSchema.type !== "object") {
    return {
      supported: false,
      required: [],
      knownFields: new Set()
    };
  }
  const properties = isRecord(argsSchema.properties) ? argsSchema.properties : {};
  const required = Array.isArray(argsSchema.required)
    ? argsSchema.required.filter((entry): entry is string => typeof entry === "string")
    : [];
  return {
    supported: true,
    required,
    knownFields: new Set(Object.keys(properties))
  };
}

function hasUnknownFields(
  prefilledArgs: Record<string, unknown>,
  knownFields: Set<string>
): boolean {
  return Object.keys(prefilledArgs).some((key) => !knownFields.has(key));
}

function hasMultiActionShape(value: unknown): boolean {
  if (!isRecord(value)) return false;
  if (Array.isArray(value.actions) && value.actions.length > 1) return true;
  if (Array.isArray(value.suggestions) && value.suggestions.length > 1) return true;
  if (Array.isArray(value.commands) && value.commands.length > 1) return true;
  return false;
}

function isTimeoutError(error: unknown): boolean {
  return error instanceof Error && error.message === "assisted_provider_timeout";
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error("assisted_provider_timeout"));
        }, timeoutMs);
      })
    ]);
  } finally {
    if (timer !== undefined) {
      clearTimeout(timer);
    }
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readNonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function readOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}
