import type { ApprovalToken } from "@consoler/protocol";

export function formatApprovalMaterial(token: ApprovalToken): string {
  const lines = [
    "Approval required before execution.",
    `approval_id: ${token.approval_id}`,
    `action_id: ${token.action_id}`,
    `agent: ${token.material.agent_id}@${token.material.agent_version}`,
    `command: ${token.command}`,
    `args_hash: ${token.args_hash}`,
    `plan_hash: ${token.plan_hash}`,
    `context_snapshot_hash: ${token.context_snapshot_hash}`,
    `side_effects_hash: ${token.side_effects_hash}`
  ];
  if (token.preview_hash) {
    lines.push(`preview_hash: ${token.preview_hash}`);
  }
  lines.push("", "Plan:", `  ${token.material.plan_summary}`);
  lines.push("", "Context:", `  ${token.material.context_summary}`);
  lines.push("", "Side effects:");
  for (const effect of token.material.side_effects) {
    lines.push(`  - ${effect}`);
  }
  if (token.material.preview_summary) {
    lines.push("", "Preview:", `  ${token.material.preview_summary}`);
  }
  lines.push("", "Re-run with --approve to execute.");
  return lines.join("\n");
}
