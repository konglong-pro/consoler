import type { AgentManifest } from "@consoler/protocol";
import type {
  IntentDraftAssistedResult,
  IntentDraftResult,
  IntentScope,
  IntentScopeCommand
} from "@consoler/runtime";

export function buildIntentScopeFromManifests(manifests: AgentManifest[]): IntentScope {
  const commands: IntentScopeCommand[] = [];
  for (const manifest of manifests) {
    for (const command of manifest.commands) {
      commands.push({
        agent_id: manifest.agent_id,
        command: command.name,
        command_description: command.description,
        args_schema: command.args_schema as Record<string, unknown>
      });
    }
  }
  return { commands };
}

export function formatIntentDraftJson(
  result: IntentDraftResult | IntentDraftAssistedResult
): string {
  return JSON.stringify(result, null, 2);
}

export function formatIntentDraftResult(
  result: IntentDraftResult | IntentDraftAssistedResult
): string {
  if (result.outcome === "candidate") {
    const lines = [
      "Intent draft: candidate",
      `agent_id: ${result.candidate.agent_id}`,
      `command: ${result.candidate.command}`
    ];
    if (result.candidate.product_action_id) {
      lines.push(`product_action_id: ${result.candidate.product_action_id}`);
    }
    lines.push("prefilled_args:");
    lines.push(JSON.stringify(result.candidate.prefilled_args, null, 2));
    if (result.message) {
      lines.push(`message: ${result.message}`);
    }
    if ("assist_notice" in result && result.assist_notice) {
      lines.push(`assist_notice_code: ${result.assist_notice.code}`);
      lines.push(`assist_notice_message: ${result.assist_notice.message}`);
    }
    return lines.join("\n");
  }

  const lines = [
    "Intent draft: needs_clarification",
    `reason: ${result.reason}`,
    `message: ${result.message}`
  ];
  if (result.partial_candidate) {
    lines.push(`partial_agent_id: ${result.partial_candidate.agent_id}`);
    lines.push(`partial_command: ${result.partial_candidate.command}`);
    if (result.partial_candidate.product_action_id) {
      lines.push(`partial_product_action_id: ${result.partial_candidate.product_action_id}`);
    }
    lines.push("partial_prefilled_args:");
    lines.push(JSON.stringify(result.partial_candidate.prefilled_args, null, 2));
  }
  if (result.missing_required_args?.length) {
    lines.push(`missing_required_args: ${result.missing_required_args.join(", ")}`);
  }
  if (result.ambiguous_fields?.length) {
    lines.push(`ambiguous_fields: ${result.ambiguous_fields.join(", ")}`);
  }
  if (result.unsupported_features?.length) {
    lines.push(`unsupported_features: ${result.unsupported_features.join(", ")}`);
  }
  if ("assist_notice" in result && result.assist_notice) {
    lines.push(`assist_notice_code: ${result.assist_notice.code}`);
    lines.push(`assist_notice_message: ${result.assist_notice.message}`);
  }
  return lines.join("\n");
}
