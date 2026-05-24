import type { AgentCommand } from "@consoler/protocol";

export type FormFieldKind = "string" | "boolean" | "number";

export interface FormField {
  name: string;
  kind: FormFieldKind;
  required: boolean;
  description?: string;
  defaultValue?: unknown;
}

function fieldKindFromType(type?: string): FormFieldKind {
  if (type === "boolean") return "boolean";
  if (type === "number" || type === "integer") return "number";
  return "string";
}

export function fieldsFromObjectSchema(schema: Record<string, unknown>): FormField[] {
  const objectSchema = schema as {
    required?: string[];
    properties?: Record<string, { type?: string; description?: string; default?: unknown }>;
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
    if (prop.default !== undefined) {
      field.defaultValue = prop.default;
    }
    return field;
  });
}

export function fieldsFromCommand(command: AgentCommand): FormField[] {
  return fieldsFromObjectSchema(command.args_schema);
}

export function defaultFormValues(fields: FormField[]): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  for (const field of fields) {
    if (field.kind === "boolean") {
      values[field.name] = field.defaultValue ?? false;
    } else if (field.kind === "number") {
      values[field.name] = field.defaultValue ?? 0;
    } else {
      values[field.name] = field.defaultValue ?? "";
    }
  }
  return values;
}

export function validateFormValues(
  fields: FormField[],
  values: Record<string, unknown>
): string | null {
  for (const field of fields) {
    if (!field.required) continue;
    const value = values[field.name];
    if (field.kind === "string" && (typeof value !== "string" || value.trim() === "")) {
      return `${field.name} is required`;
    }
    if (field.kind === "number" && (typeof value !== "number" || Number.isNaN(value))) {
      return `${field.name} is required`;
    }
  }
  return null;
}

export function valuesForInteractionSubmit(
  values: Record<string, unknown>,
  fields: FormField[]
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...values };
  for (const field of fields) {
    if (field.kind === "number" && typeof out[field.name] === "string") {
      const parsed = Number(out[field.name]);
      if (!Number.isNaN(parsed)) {
        out[field.name] = parsed;
      }
    }
  }
  return out;
}
