import type { ActionEvent, InteractionRequest } from "@consoler/protocol";

export const REDACTED_SENTINEL = "[REDACTED]";

export function collectRedactPropertyPaths(
  promptSchema: Record<string, unknown> | undefined
): string[] {
  if (!promptSchema || promptSchema.type !== "object") {
    return [];
  }
  const properties = promptSchema.properties as
    | Record<string, Record<string, unknown>>
    | undefined;
  if (!properties) {
    return [];
  }
  const paths: string[] = [];
  for (const [name, propertySchema] of Object.entries(properties)) {
    if (propertySchema?.["x-consoler-redact"] === true) {
      paths.push(`/${name}`);
    }
  }
  return paths;
}

export function redactObjectByPaths(
  value: unknown,
  paths: string[]
): { value: unknown; redactedPaths: string[] } {
  if (
    paths.length === 0 ||
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    return { value, redactedPaths: [] };
  }
  const record = { ...(value as Record<string, unknown>) };
  const redactedPaths: string[] = [];
  for (const pointer of paths) {
    const key = pointer.startsWith("/") ? pointer.slice(1) : pointer;
    if (!key || !(key in record)) {
      continue;
    }
    record[key] = REDACTED_SENTINEL;
    redactedPaths.push(pointer.startsWith("/") ? pointer : `/${key}`);
  }
  return { value: record, redactedPaths };
}

export function mergeRedactedPaths(...groups: string[][]): string[] {
  return [...new Set(groups.flat())].sort();
}

export function redactInteractionRequest(request: InteractionRequest): {
  request: InteractionRequest;
  redactedPaths: string[];
} {
  const paths = collectRedactPropertyPaths(request.prompt_schema);
  if (paths.length === 0) {
    return { request, redactedPaths: [] };
  }
  const next: InteractionRequest = { ...request };
  let redactedPaths: string[] = [];
  if (next.default_response !== undefined) {
    const redacted = redactObjectByPaths(next.default_response, paths);
    next.default_response = redacted.value;
    redactedPaths = mergeRedactedPaths(redactedPaths, redacted.redactedPaths);
  }
  return { request: next, redactedPaths };
}

export function redactInteractionResponse(
  request: InteractionRequest,
  response: unknown
): { response: unknown; redactedPaths: string[] } {
  const paths = collectRedactPropertyPaths(request.prompt_schema);
  if (paths.length === 0) {
    return { response, redactedPaths: [] };
  }
  const redacted = redactObjectByPaths(response, paths);
  return { response: redacted.value, redactedPaths: redacted.redactedPaths };
}

export function redactInteractionRequiredEvent(event: ActionEvent): ActionEvent {
  if (event.type !== "interaction.required" || !event.interaction) {
    return event;
  }
  const { request } = redactInteractionRequest(event.interaction);
  return { ...event, interaction: request };
}

export function parseRedactedPathsJson(raw: string | null | undefined): string[] {
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((entry): entry is string => typeof entry === "string");
  } catch {
    return [];
  }
}
