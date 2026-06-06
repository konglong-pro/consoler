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

interface ArgsSchemaAnalysis {
  supported: boolean;
  required: string[];
  knownFields: Set<string>;
  properties: Record<string, Record<string, unknown>>;
}

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

  const validated = suggestionToIntentResult(suggestion, input.scope, { text: input.text });
  if (!validated.ok) {
    return withAssistNotice(deterministic, "assisted_invalid_output");
  }

  return validated.result;
}

export function suggestionToIntentResult(
  suggestion: LlmIntentProviderSuggestion,
  scope: IntentScope,
  options: { text?: string } = {}
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
  if (!validateProviderPrefilledArgs(prefilledArgs, schemaAnalysis, options.text ?? "")) {
    return { ok: false, failure: "schema_invalid" };
  }

  const validation = validateCommandArgs(scopeCommand.args_schema, prefilledArgs);
  if (validation.ok) {
    const candidate = buildCandidate(scopeCommand, prefilledArgs);
    const message = sanitizeProviderMessage(suggestion.message);
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

function analyzeArgsSchema(argsSchema: Record<string, unknown>): ArgsSchemaAnalysis {
  if (argsSchema.type !== "object") {
    return {
      supported: false,
      required: [],
      knownFields: new Set(),
      properties: {}
    };
  }
  const properties = isRecord(argsSchema.properties) ? argsSchema.properties : {};
  const propertySchemas: Record<string, Record<string, unknown>> = {};
  for (const [name, property] of Object.entries(properties)) {
    propertySchemas[name] = isRecord(property) ? property : {};
  }
  const required = Array.isArray(argsSchema.required)
    ? argsSchema.required.filter((entry): entry is string => typeof entry === "string")
    : [];
  return {
    supported: true,
    required,
    knownFields: new Set(Object.keys(properties)),
    properties: propertySchemas
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

function validateProviderPrefilledArgs(
  prefilledArgs: Record<string, unknown>,
  schemaAnalysis: ArgsSchemaAnalysis,
  text: string
): boolean {
  for (const [fieldName, value] of Object.entries(prefilledArgs)) {
    const fieldSchema = schemaAnalysis.properties[fieldName] ?? {};
    if (!validateProviderPrefilledArg(fieldName, value, fieldSchema, text)) {
      return false;
    }
  }
  return true;
}

function validateProviderPrefilledArg(
  fieldName: string,
  value: unknown,
  fieldSchema: Record<string, unknown>,
  text: string
): boolean {
  const lowerName = fieldName.toLowerCase();
  if (requiresLiteralCurrentText(lowerName)) {
    return typeof value === "string" && includesLiteral(text, value);
  }

  if (isTagField(lowerName)) {
    return typeof value === "string" && containsExplicitFilterValue(text, "tag", value);
  }
  if (isCategoryField(lowerName)) {
    return typeof value === "string" && containsExplicitFilterValue(text, "category", value);
  }

  if (isQueryField(lowerName)) {
    return validateProviderQuery(value);
  }

  if (isLimitedNumericField(lowerName)) {
    return typeof value === "number" && includesNumberLiteral(text, value);
  }

  const enumValues = readPrimitiveEnum(fieldSchema.enum);
  if (enumValues && enumValues.some((entry) => Object.is(entry, value))) {
    return includesLiteralCaseInsensitive(text, String(value));
  }

  return true;
}

function requiresLiteralCurrentText(fieldName: string): boolean {
  return [
    "vault_path",
    "source_path",
    "doc_id",
    "review_id",
    "task_id",
    "error_id"
  ].includes(fieldName);
}

function isTagField(fieldName: string): boolean {
  return fieldName === "tag" || fieldName.endsWith("_tag");
}

function isCategoryField(fieldName: string): boolean {
  return fieldName === "category" || fieldName.endsWith("_category");
}

function isQueryField(fieldName: string): boolean {
  return fieldName === "query" || fieldName === "search_text";
}

function isLimitedNumericField(fieldName: string): boolean {
  return fieldName === "limit" || fieldName === "top_k";
}

function validateProviderQuery(value: unknown): boolean {
  if (typeof value !== "string") return false;
  const query = value.trim();
  if (query.length === 0 || query.length > 120) return false;
  if (/[\r\n]/.test(query)) return false;
  if (/```|indbase:\/\/|(?:^|\b)(?:answer|citation|source)\s*:/i.test(query)) return false;
  return true;
}

function includesLiteral(text: string, value: string): boolean {
  return value.trim().length > 0 && text.includes(value);
}

function includesLiteralCaseInsensitive(text: string, value: string): boolean {
  return value.trim().length > 0 && text.toLowerCase().includes(value.toLowerCase());
}

function includesNumberLiteral(text: string, value: number): boolean {
  if (!Number.isFinite(value)) return false;
  return new RegExp(`(^|[^0-9.-])${escapeRegExp(String(value))}([^0-9.]|$)`).test(text);
}

function containsExplicitFilterValue(
  text: string,
  filterName: "tag" | "category",
  expectedValue: string
): boolean {
  const expected = normalizeFilterValue(expectedValue);
  if (!expected) return false;

  const values: string[] = [];
  const explicit = new RegExp(
    `(?:^|\\s)${filterName}:("[^"]+"|'[^']+'|[^\\s"']+)`,
    "gi"
  );
  collectRegexCaptures(text, explicit, values);

  const phrase =
    filterName === "tag"
      ? /\bwith\s+tag\s+("[^"]+"|'[^']+'|[^\s"']+)/gi
      : /\bin\s+category\s+("[^"]+"|'[^']+'|[^\s"']+)/gi;
  collectRegexCaptures(text, phrase, values);

  return values
    .map(normalizeFilterValue)
    .some((value) => value.toLowerCase() === expected.toLowerCase());
}

function collectRegexCaptures(text: string, regex: RegExp, values: string[]): void {
  regex.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    values.push(match[1] ?? "");
  }
}

function normalizeFilterValue(value: string): string {
  const trimmed = value.trim().replace(/[,.;:\]}>]+$/u, "");
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim().replace(/[,.;:\]}>]+$/u, "");
  }
  return trimmed;
}

function readPrimitiveEnum(values: unknown): Array<string | number | boolean> | undefined {
  if (
    !Array.isArray(values) ||
    !values.every(
      (value) =>
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean"
    )
  ) {
    return undefined;
  }
  return values;
}

function sanitizeProviderMessage(value: unknown): string | undefined {
  const message = readOptionalString(value)?.trim();
  if (!message || message.length > 200 || /[\r\n]/.test(message)) {
    return undefined;
  }

  const blocked = [
    /https?:\/\//i,
    /\bCONSOLER_INTENT_PROVIDER_URL\b/i,
    /\bbearer\b/i,
    /\bapi\s*key\b/i,
    /\btoken\b/i,
    /\bpassword\b/i,
    /\bstack trace\b/i,
    /\btraceback\b/i,
    /\bprompt:/i,
    /\braw response\b/i,
    /\bmodel:/i,
    /\bendpoint:/i,
    /\baction_id\b/i,
    /\bapproval_id\b/i,
    /\btrace\b/i,
    /\bartifact uri\b/i,
    /indbase:\/\//i,
    /\.sqlite\b/i,
    /\bCONSOLER_ROOT\b/i
  ];
  if (blocked.some((pattern) => pattern.test(message))) {
    return undefined;
  }
  return message;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
