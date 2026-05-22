import {
  hashCanonical,
  newApprovalId,
  normalizeArgs,
  type ActionPlan,
  type AgentManifest,
  type ApprovalMaterial,
  type ApprovalToken
} from "@consoler/protocol";

import { computePlanHash, computePreviewHash, computeSideEffectsHash } from "./plan-hash.js";
import { contextDrift, contextSnapshotHash, type SnapshotInput } from "./context-snapshot.js";
import { buildContextSnapshot } from "./context-snapshot.js";

export interface BuildApprovalInput {
  actionId: string;
  manifest: AgentManifest;
  commandName: string;
  args: Record<string, unknown>;
  plan: ActionPlan;
  preview?: unknown;
  previewSummary?: string;
}

export function buildApprovalToken(input: BuildApprovalInput): ApprovalToken {
  const command = input.manifest.commands.find((item) => item.name === input.commandName);
  if (!command) {
    throw new Error(`Unknown command: ${input.commandName}`);
  }

  const normalizedArgs = normalizeArgs(input.args);
  const material: ApprovalMaterial = {
    agent_id: input.manifest.agent_id,
    agent_version: input.manifest.version,
    command: input.commandName,
    normalized_args: normalizedArgs,
    plan_summary: input.plan.steps.map((step) => step.title).join(" → "),
    context_summary: input.plan.context_snapshot.summary,
    side_effects: command.side_effects,
    ...(input.previewSummary ? { preview_summary: input.previewSummary } : {})
  };

  const token: ApprovalToken = {
    approval_id: newApprovalId(),
    action_id: input.actionId,
    agent_id: input.manifest.agent_id,
    command: input.commandName,
    args_hash: hashCanonical(normalizedArgs),
    plan_hash: computePlanHash(input.plan),
    context_snapshot_hash: contextSnapshotHash(input.plan.context_snapshot),
    side_effects_hash: computeSideEffectsHash(command.side_effects),
    material,
    created_at: new Date().toISOString()
  };

  if (input.preview !== undefined) {
    token.preview_hash = computePreviewHash(input.preview);
  }

  return token;
}

export function verifyApprovalStillValid(
  token: ApprovalToken,
  snapshotInput: SnapshotInput,
  plan: ActionPlan,
  preview?: unknown
): string | null {
  const currentSnapshot = buildContextSnapshot(snapshotInput);
  const currentContextHash = contextSnapshotHash(currentSnapshot);
  if (currentContextHash !== token.context_snapshot_hash) {
    return "context_snapshot_changed";
  }
  if (contextDrift(plan.context_snapshot, currentSnapshot)) {
    return "context_drift";
  }
  if (computePlanHash(plan) !== token.plan_hash) {
    return "plan_hash_changed";
  }
  if (token.preview_hash && preview !== undefined && computePreviewHash(preview) !== token.preview_hash) {
    return "preview_hash_changed";
  }
  return null;
}
