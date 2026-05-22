import type { AgentCommand } from "@consoler/protocol";

export type FormFieldKind = "string" | "boolean";

export interface FormField {
  name: string;
  kind: FormFieldKind;
  required: boolean;
  description?: string;
  defaultValue?: unknown;
}

export function fieldsFromCommand(command: AgentCommand): FormField[] {
  const schema = command.args_schema as {
    required?: string[];
    properties?: Record<
      string,
      { type?: string; description?: string; default?: unknown }
    >;
  };
  const required = new Set(schema.required ?? []);
  const properties = schema.properties ?? {};
  return Object.keys(properties).map((name) => {
    const prop = properties[name]!;
    const kind: FormFieldKind = prop.type === "boolean" ? "boolean" : "string";
    const field: FormField = {
      name,
      kind,
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

export function defaultFormValues(fields: FormField[]): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  for (const field of fields) {
    if (field.kind === "boolean") {
      values[field.name] = field.defaultValue ?? false;
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
  }
  return null;
}
