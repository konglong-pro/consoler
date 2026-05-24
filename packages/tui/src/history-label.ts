import type { ActionHistoryEntry } from "@consoler/runtime";
import { shortActionId } from "@consoler/runtime";

export function historyItemLabel(entry: ActionHistoryEntry): string {
  const run = entry.latest_run_id ? shortActionId(entry.latest_run_id) : "—";
  return `${entry.command}  ${shortActionId(entry.action_id)}  ${entry.status}  run=${run}  +${entry.accepted_event_count}/-${entry.rejected_event_count}`;
}

export function historyItemDetail(entry: ActionHistoryEntry): string {
  return `${entry.created_at}  ${entry.args_summary}`;
}
