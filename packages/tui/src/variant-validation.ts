import type { AgentManifest } from "@consoler/protocol";

import type { ConsoleVariantConfig } from "./variant-types.js";

/** Returns human-readable mismatches between variant config and a discovered manifest. */
export function validateVariantAgainstManifest(
  variant: ConsoleVariantConfig,
  manifest: AgentManifest
): string[] {
  const manifestCommands = new Set(manifest.commands.map((command) => command.name));
  const errors: string[] = [];

  for (const command of variant.allowedCommands) {
    if (!manifestCommands.has(command)) {
      errors.push(`allowed command not in manifest: ${command}`);
    }
  }

  for (const action of variant.actions) {
    if (!manifestCommands.has(action.command)) {
      errors.push(
        `product action "${action.label}" (${action.id}) maps to missing command: ${action.command}`
      );
    }
    if (!variant.allowedCommands.includes(action.command)) {
      errors.push(
        `product action ${action.id} uses ${action.command}, which is not listed in allowedCommands`
      );
    }
  }

  for (const command of Object.keys(variant.fieldLabels)) {
    if (!variant.allowedCommands.includes(command)) {
      errors.push(`fieldLabels reference command not in allowedCommands: ${command}`);
    }
  }

  return errors;
}

export function assertVariantManifestOrExit(
  variant: ConsoleVariantConfig,
  manifest: AgentManifest
): void {
  const errors = validateVariantAgainstManifest(variant, manifest);
  if (errors.length === 0) {
    return;
  }

  console.error(`Console variant "${variant.id}" does not match agent "${manifest.agent_id}" manifest:`);
  for (const error of errors) {
    console.error(`  - ${error}`);
  }
  process.exit(1);
}
