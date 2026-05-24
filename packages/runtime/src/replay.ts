import type { ActionEvent } from "@consoler/protocol";

import type { ConsolerStore } from "./db/store.js";
import { summarizeRenderableBlock } from "./format-block.js";

export interface ReplayTimeline {
  action_id: string;
  run_id: string | null;
  events: ActionEvent[];
}

export function replayAction(store: ConsolerStore, actionId: string): ReplayTimeline {
  const action = store.getAction(actionId);
  if (!action) {
    throw new Error(`Action not found: ${actionId}`);
  }
  const run = store.getLatestRunForAction(actionId);
  if (!run) {
    return { action_id: actionId, run_id: null, events: [] };
  }
  const events = store.listAcceptedEventsForRun(run.run_id);
  return { action_id: actionId, run_id: run.run_id, events };
}

export function formatReplayTimeline(timeline: ReplayTimeline): string {
  const lines = [`Replay for action ${timeline.action_id}`];
  if (!timeline.run_id) {
    lines.push("No runs recorded.");
    return lines.join("\n");
  }
  lines.push(`Run: ${timeline.run_id}`);
  for (const event of timeline.events) {
    lines.push(`  [${event.seq}] ${event.type}${event.message ? `: ${event.message}` : ""}`);
    if (event.blocks?.length) {
      for (const block of event.blocks) {
        lines.push(`    ${summarizeRenderableBlock(block)}`);
      }
    }
  }
  return lines.join("\n");
}
