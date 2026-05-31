import type { ActionHistoryEntry } from "@consoler/runtime";
import { shortActionId } from "@consoler/runtime";

import { actionProductLabel } from "./variant-display.js";
import type { ConsoleVariantConfig } from "./variant-types.js";

export function historyItemLabel(
  entry: ActionHistoryEntry,
  variant?: ConsoleVariantConfig
): string {
  const run = entry.latest_run_id ? shortActionId(entry.latest_run_id) : "—";
  const task = actionProductLabel(variant, entry.command) ?? entry.command;
  return `${task}  ${shortActionId(entry.action_id)}  ${entry.status}  run=${run}  +${entry.accepted_event_count}/-${entry.rejected_event_count}`;
}

export function historyItemDetail(entry: ActionHistoryEntry): string {
  return `${entry.created_at}  ${entry.args_summary}`;
}
