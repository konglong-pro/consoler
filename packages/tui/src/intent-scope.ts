import type { AgentManifest } from "@consoler/protocol";
import type { IntentScope, IntentScopeCommand } from "@consoler/runtime";

import type { ConsoleVariantConfig } from "./variant-types.js";

export function buildIntentScopeFromVariant(
  manifest: AgentManifest,
  variant: ConsoleVariantConfig
): IntentScope {
  const allowedCommands = new Set(variant.allowedCommands);
  const commands: IntentScopeCommand[] = [];

  for (const action of variant.actions) {
    if (!allowedCommands.has(action.command)) {
      continue;
    }
    const manifestCommand = manifest.commands.find((entry) => entry.name === action.command);
    if (!manifestCommand) {
      continue;
    }

    const fieldLabelsConfig = variant.fieldLabels[action.command] ?? {};
    const field_hints: Record<string, string[]> = {};
    const field_labels: Record<string, { label?: string; help?: string }> = {};

    for (const [fieldName, fieldLabel] of Object.entries(fieldLabelsConfig)) {
      const labelEntry: { label?: string; help?: string } = {
        label: fieldLabel.label
      };
      if (fieldLabel.help) {
        labelEntry.help = fieldLabel.help;
      }
      field_labels[fieldName] = labelEntry;
      if (fieldLabel.intentHints?.length) {
        field_hints[fieldName] = fieldLabel.intentHints;
      }
    }

    const entry: IntentScopeCommand = {
      agent_id: action.agentId,
      command: action.command,
      command_description: manifestCommand.description,
      args_schema: manifestCommand.args_schema as Record<string, unknown>,
      product_action_id: action.id,
      product_label: action.label
    };
    if (action.description) {
      entry.product_description = action.description;
    }
    if (action.intentHints?.length) {
      entry.action_hints = action.intentHints;
    }
    if (Object.keys(field_hints).length > 0) {
      entry.field_hints = field_hints;
    }
    if (Object.keys(field_labels).length > 0) {
      entry.field_labels = field_labels;
    }
    commands.push(entry);
  }

  return { commands };
}
