import { randomUUID } from "node:crypto";

export function newActionId(): string {
  return `act_${randomUUID()}`;
}

export function newRunId(): string {
  return `run_${randomUUID()}`;
}

export function newPlanId(): string {
  return `plan_${randomUUID()}`;
}

export function newApprovalId(): string {
  return `appr_${randomUUID()}`;
}

export function newContextId(): string {
  return `ctx_${randomUUID()}`;
}

export function newSnapshotId(): string {
  return `snap_${randomUUID()}`;
}

export function newEventId(): string {
  return `evt_${randomUUID()}`;
}
