import type { FetchArtifactViewResult } from "@consoler/runtime";
import { summarizeRenderableBlock } from "@consoler/runtime";

export function formatArtifactViewResult(result: FetchArtifactViewResult): string {
  if (!result.ok) {
    return "";
  }
  const lines = [
    `action_id: ${result.retrieval.action_id}`,
    `block_id: ${result.retrieval.block_id}`,
    `artifact_uri: ${result.view.artifact_uri}`,
    `kind: ${result.view.kind}`,
    `retrieval_status: ${result.retrieval.status}`,
    `retrieval_id: ${result.retrieval.retrieval_id}`
  ];
  if (result.view.title) {
    lines.push(`title: ${result.view.title}`);
  }
  if (result.view.truncated) {
    lines.push(`truncated: true`);
    if (result.view.truncation_reason) {
      lines.push(`truncation_reason: ${result.view.truncation_reason}`);
    }
  }
  lines.push(`blocks (${result.view.blocks.length}):`);
  for (const block of result.view.blocks) {
    lines.push(`  ${summarizeRenderableBlock(block)}`);
  }
  return lines.join("\n");
}
