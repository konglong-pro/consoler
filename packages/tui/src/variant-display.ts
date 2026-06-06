import type { ConsoleVariantConfig } from "./variant-types.js";

export function fieldDisplayLabel(
  variant: ConsoleVariantConfig | undefined,
  command: string | null,
  fieldName: string
): string {
  if (!variant || !command) return fieldName;
  return variant.fieldLabels[command]?.[fieldName]?.label ?? fieldName;
}

export function fieldDisplayHelp(
  variant: ConsoleVariantConfig | undefined,
  command: string | null,
  fieldName: string
): string | undefined {
  if (!variant || !command) return undefined;
  return variant.fieldLabels[command]?.[fieldName]?.help;
}

export function actionProductLabel(
  variant: ConsoleVariantConfig | undefined,
  command: string | null
): string | null {
  if (!variant || !command) return null;
  return variant.actions.find((action) => action.command === command)?.label ?? null;
}

export function artifactKindLabel(
  variant: ConsoleVariantConfig | undefined,
  kind: string | undefined
): string {
  if (!kind) return "Artifact";
  if (!variant) return kind;
  return variant.artifactKindLabels[kind] ?? kind;
}

export function historyListOptions(
  variant: ConsoleVariantConfig | undefined,
  limit = 20
): {
  limit: number;
  agentId?: string;
  commands?: string[];
} {
  if (!variant) {
    return { limit };
  }
  return {
    limit,
    agentId: variant.defaultAgentId,
    commands: variant.allowedCommands
  };
}
