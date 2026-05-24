import Ajv2020 from "ajv";
import type { ErrorObject, ValidateFunction } from "ajv";

import agentErrorSchema from "./schemas/agent-error.json" with { type: "json" };
import actionEventSchema from "./schemas/action-event.json" with { type: "json" };
import interactionRequestSchema from "./schemas/interaction-request.json" with { type: "json" };
import manifestSchema from "./schemas/manifest.json" with { type: "json" };
import renderableBlockSchema from "./schemas/renderable-block.json" with { type: "json" };
import type { ActionEvent, AgentManifest, RenderableBlock } from "./types.js";

export interface ValidationResult<T> {
  ok: boolean;
  value?: T;
  errors?: ErrorObject[];
}

const Ajv = Ajv2020.default ?? Ajv2020;

function createAjv() {
  const ajv = new Ajv({
    allErrors: true,
    strict: false,
    validateSchema: false
  });
  ajv.addSchema(agentErrorSchema);
  ajv.addSchema(renderableBlockSchema);
  ajv.addSchema(interactionRequestSchema);
  ajv.addSchema(actionEventSchema);
  ajv.addSchema(manifestSchema);
  return ajv;
}

const ajv = createAjv();

const validateManifestFn = ajv.getSchema("https://consoler.dev/schemas/v0/manifest.json") as ValidateFunction;
const validateActionEventFn = ajv.getSchema("https://consoler.dev/schemas/v0/action-event.json") as ValidateFunction;
const validateRenderableBlockFn = ajv.getSchema(
  "https://consoler.dev/schemas/v0/renderable-block.json"
) as ValidateFunction;

export function validateManifest(data: unknown): ValidationResult<AgentManifest> {
  return runValidator(validateManifestFn, data);
}

export function validateActionEvent(data: unknown): ValidationResult<ActionEvent> {
  return runValidator(validateActionEventFn, data);
}

export function validateRenderableBlock(data: unknown): ValidationResult<RenderableBlock> {
  return runValidator(validateRenderableBlockFn, data);
}

export function validateCommandArgs(
  argsSchema: Record<string, unknown>,
  args: unknown
): ValidationResult<Record<string, unknown>> {
  const validate = ajv.compile(argsSchema);
  return runValidator(validate, args);
}

export function manifestHasDuplicateCommands(manifest: AgentManifest): string | null {
  const seen = new Set<string>();
  for (const command of manifest.commands) {
    if (seen.has(command.name)) {
      return command.name;
    }
    seen.add(command.name);
  }
  return null;
}

function runValidator<T>(validate: ValidateFunction, data: unknown): ValidationResult<T> {
  const ok = validate(data) === true;
  if (ok) {
    return { ok: true, value: data as T };
  }
  return { ok: false, errors: validate.errors ?? [] };
}
