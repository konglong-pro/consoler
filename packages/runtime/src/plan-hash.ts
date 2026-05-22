import { hashCanonical, type ActionPlan } from "@consoler/protocol";

export function computePlanHash(plan: ActionPlan): string {
  return hashCanonical({
    action_id: plan.action_id,
    agent_id: plan.agent_id,
    command: plan.command,
    steps: plan.steps,
    context_snapshot_id: plan.context_snapshot_id,
    context_snapshot: plan.context_snapshot,
    side_effects: plan.side_effects
  });
}

export function computeSideEffectsHash(sideEffects: string[]): string {
  return hashCanonical(sideEffects);
}

export function computePreviewHash(preview: unknown): string {
  return hashCanonical(preview);
}
