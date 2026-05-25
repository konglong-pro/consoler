import { validateCommandArgs, type InteractionChoice, type InteractionRequest } from "@consoler/protocol";
import { summarizeRenderableBlock, validateInteractionResponse } from "@consoler/runtime";

export type FormFieldKind = "string" | "boolean" | "number";

export interface FormField {
  name: string;
  kind: FormFieldKind;
  required: boolean;
  description?: string;
}

function fieldKindFromType(type?: string): FormFieldKind {
  if (type === "boolean") return "boolean";
  if (type === "number" || type === "integer") return "number";
  return "string";
}

export function fieldsFromObjectSchema(schema: Record<string, unknown>): FormField[] {
  const objectSchema = schema as {
    required?: string[];
    properties?: Record<string, { type?: string; description?: string }>;
  };
  const required = new Set(objectSchema.required ?? []);
  const properties = objectSchema.properties ?? {};
  return Object.keys(properties).map((name) => {
    const prop = properties[name]!;
    const field: FormField = {
      name,
      kind: fieldKindFromType(prop.type),
      required: required.has(name)
    };
    if (prop.description !== undefined) {
      field.description = prop.description;
    }
    return field;
  });
}

export function isSupportedInteractionRequest(request: InteractionRequest): boolean {
  if (request.choices && request.choices.length > 0) {
    return true;
  }
  if (!request.prompt_schema) {
    return false;
  }
  if (request.prompt_schema.type !== "object") {
    return false;
  }
  const properties =
    (request.prompt_schema.properties as Record<string, { type?: string }> | undefined) ?? {};
  for (const prop of Object.values(properties)) {
    if (prop.type === "object" || prop.type === "array") {
      return false;
    }
  }
  const fields = fieldsFromObjectSchema(request.prompt_schema);
  if (fields.length === 0) {
    return false;
  }
  return fields.every(
    (field) => field.kind === "string" || field.kind === "number" || field.kind === "boolean"
  );
}

export function unsupportedInteractionMessage(): string {
  return "Unsupported interaction prompt; pass --interaction-response <path> with a JSON value.";
}

export function parseChoiceInput(input: string, choices: InteractionChoice[]): string {
  const trimmed = input.trim();
  if (/^\d+$/.test(trimmed)) {
    const index = Number.parseInt(trimmed, 10) - 1;
    const choice = choices[index];
    if (choice) {
      return choice.id;
    }
  }
  if (choices.some((choice) => choice.id === trimmed)) {
    return trimmed;
  }
  throw new Error(`Invalid choice: enter a number 1-${choices.length} or a choice id`);
}

export function coerceFieldValue(raw: string, kind: FormFieldKind): unknown {
  const trimmed = raw.trim();
  if (kind === "boolean") {
    const lower = trimmed.toLowerCase();
    if (["true", "t", "yes", "y", "1"].includes(lower)) return true;
    if (["false", "f", "no", "n", "0"].includes(lower)) return false;
    throw new Error(`Invalid boolean for field: ${raw}`);
  }
  if (kind === "number") {
    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed)) {
      throw new Error(`Invalid number for field: ${raw}`);
    }
    return parsed;
  }
  return raw;
}

export function defaultObjectValues(
  fields: FormField[],
  defaultResponse?: unknown
): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  for (const field of fields) {
    if (field.kind === "boolean") {
      values[field.name] = false;
    } else if (field.kind === "number") {
      values[field.name] = 0;
    } else {
      values[field.name] = "";
    }
  }
  if (
    defaultResponse !== undefined &&
    typeof defaultResponse === "object" &&
    defaultResponse !== null &&
    !Array.isArray(defaultResponse)
  ) {
    return { ...values, ...(defaultResponse as Record<string, unknown>) };
  }
  return values;
}

export function usableDefaultResponse(request: InteractionRequest): unknown | undefined {
  if (request.default_response === undefined) {
    return undefined;
  }
  try {
    validateInteractionResponse(request, request.default_response);
    return request.default_response;
  } catch {
    return undefined;
  }
}

export function formatInteractionPrompt(request: InteractionRequest): string {
  const lines: string[] = [`\n${request.title}`, request.message];
  if (request.blocks?.length) {
    lines.push("");
    for (const block of request.blocks) {
      lines.push(`  ${summarizeRenderableBlock(block)}`);
    }
  }
  if (request.timeout_policy) {
    lines.push(
      `Timeout: ${request.timeout_policy.timeout_seconds}s → ${request.timeout_policy.on_timeout}`
    );
  }
  if (request.choices?.length) {
    lines.push("");
    request.choices.forEach((choice, index) => {
      lines.push(`  ${index + 1}. ${choice.label} (${choice.id})`);
    });
    lines.push("");
    lines.push("Enter choice number or id:");
  }
  return `${lines.join("\n")}\n`;
}

export interface InteractionPromptContext {
  isTTY: boolean;
  readLine: (prompt: string) => Promise<string>;
  writeStderr: (text: string) => void;
  takeSeededResponse: () => unknown | undefined;
}

export class NonInteractiveInteractionError extends Error {
  constructor() {
    super(
      "interaction.required but stdin is not a TTY; pass --interaction-response <path> with a JSON value"
    );
    this.name = "NonInteractiveInteractionError";
  }
}

/** Runtime owns timeout outcomes; the CLI must not prompt or respond. */
export class DeferInteractionToRuntimeError extends Error {
  constructor() {
    super("Interaction deferred to runtime timeout policy");
    this.name = "DeferInteractionToRuntimeError";
  }
}

export async function promptInteractionResponse(
  request: InteractionRequest,
  ctx: InteractionPromptContext
): Promise<unknown> {
  if (!isSupportedInteractionRequest(request)) {
    throw new Error(unsupportedInteractionMessage());
  }

  const seeded = ctx.takeSeededResponse();
  if (seeded !== undefined) {
    validateInteractionResponse(request, seeded);
    return seeded;
  }

  if (request.timeout_policy) {
    if (!ctx.isTTY) {
      throw new DeferInteractionToRuntimeError();
    }
  } else {
    const defaultResponse = usableDefaultResponse(request);
    if (defaultResponse !== undefined) {
      return defaultResponse;
    }
    if (!ctx.isTTY) {
      throw new NonInteractiveInteractionError();
    }
  }

  ctx.writeStderr(formatInteractionPrompt(request));

  if (request.choices?.length) {
    const line = await ctx.readLine("> ");
    return parseChoiceInput(line, request.choices);
  }

  const fields = fieldsFromObjectSchema(request.prompt_schema!);
  const values = defaultObjectValues(fields, request.default_response);
  for (const field of fields) {
    const label = field.description ? `${field.name} (${field.description})` : field.name;
    const suffix =
      field.kind === "boolean" ? " [y/n]" : field.required ? "" : " (optional)";
    const current = values[field.name];
    const line = await ctx.readLine(`${label}${suffix} [${String(current)}]: `);
    if (line.trim() !== "") {
      values[field.name] = coerceFieldValue(line, field.kind);
    }
  }

  const schemaResult = validateCommandArgs(request.prompt_schema!, values);
  if (!schemaResult.ok) {
    throw new Error("Interaction response failed schema validation");
  }
  return values;
}

export async function resolveInteractionResponseWithRetry(
  request: InteractionRequest,
  ctx: InteractionPromptContext,
  respond: (response: unknown) => Promise<void>
): Promise<void> {
  while (true) {
    try {
      const response = await promptInteractionResponse(request, ctx);
      await respond(response);
      return;
    } catch (error) {
      if (error instanceof DeferInteractionToRuntimeError) {
        return;
      }
      if (error instanceof NonInteractiveInteractionError) {
        throw error;
      }
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes(unsupportedInteractionMessage())) {
        throw error;
      }
      if (message.includes("run already terminal") || message.includes("No pending interaction")) {
        throw error;
      }
      ctx.writeStderr(`Interaction error: ${message}\n`);
    }
  }
}
