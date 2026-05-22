import {
  hashCanonical,
  newActionId,
  newApprovalId,
  normalizeArgs,
  type ActionPlan,
  type AgentManifest,
  type ApprovalMaterial,
  type ApprovalScope,
  type ApprovalToken
} from "@consoler/protocol";

import { computePlanHash, computePreviewHash, computeSideEffectsHash } from "./plan-hash.js";
import {
  buildContextSnapshot,
  contextDrift,
  contextSnapshotHash,
  type SnapshotInput
} from "./context-snapshot.js";

export interface BuildPreviewApprovalInput {
  manifest: AgentManifest;
  commandName: string;
  args: Record<string, unknown>;
}

export interface BuildApprovalInput {
  actionId: string;
  manifest: AgentManifest;
  commandName: string;
  args: Record<string, unknown>;
  plan: ActionPlan;
  preview?: unknown;
  previewSummary?: string;
}

export function buildPreviewApprovalToken(input: BuildPreviewApprovalInput): ApprovalToken {
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
    plan_summary: "Preview approval required before probe preview",
    context_summary: "Args only; no plan or context snapshot yet",
    side_effects: command.preview_policy.preview_side_effects
  };

  return {
    approval_id: newApprovalId(),
    action_id: newActionId(),
    agent_id: input.manifest.agent_id,
    command: input.commandName,
    scope: "preview",
    args_hash: hashCanonical(normalizedArgs),
    material,
    created_at: new Date().toISOString()
  };
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
    scope: "execute",
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

export function verifyPreviewApproval(
  token: ApprovalToken,
  args: Record<string, unknown>
): string | null {
  if (token.scope !== "preview") {
    return "invalid_approval_scope";
  }
  const normalizedArgs = normalizeArgs(args);
  if (hashCanonical(normalizedArgs) !== token.args_hash) {
    return "args_changed";
  }
  return null;
}

export function verifyApprovalStillValid(
  token: ApprovalToken,
  snapshotInput: SnapshotInput,
  plan: ActionPlan,
  preview?: unknown
): string | null {
  if (token.scope !== "execute") {
    return "invalid_approval_scope";
  }
  const currentSnapshot = buildContextSnapshot(snapshotInput);
  const currentContextHash = contextSnapshotHash(currentSnapshot);
  if (token.context_snapshot_hash && currentContextHash !== token.context_snapshot_hash) {
    return "context_changed";
  }
  if (contextDrift(plan.context_snapshot, currentSnapshot)) {
    return "context_changed";
  }
  if (token.plan_hash && computePlanHash(plan) !== token.plan_hash) {
    return "context_changed";
  }
  if (token.preview_hash && preview !== undefined && computePreviewHash(preview) !== token.preview_hash) {
    return "context_changed";
  }
  return null;
}
