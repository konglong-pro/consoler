import type { ConsolerRuntime } from "@consoler/runtime";

export const HISTORY_ACTION_ID = "act_v1b_history_test";

export function seedHistoryFixture(runtime: ConsolerRuntime): void {
  const { store } = runtime;

  store.saveAction({
    action_id: HISTORY_ACTION_ID,
    agent_id: "indbase",
    command: "indbase.doctor",
    args: { vault_path: "/tmp/vault" },
    created_at: "2026-05-23T10:00:00.000Z"
  });

  store.createRun("run_v1b_history", HISTORY_ACTION_ID, "indbase", "indbase.doctor");
  runtime.ingestAgentEvent("run_v1b_history", HISTORY_ACTION_ID, "indbase", "indbase.doctor", {
    event_id: "evt_v1b_1",
    run_id: "run_v1b_history",
    action_id: HISTORY_ACTION_ID,
    agent_id: "indbase",
    command: "indbase.doctor",
    type: "log",
    seq: 1,
    epoch: 0,
    timestamp: "2026-05-23T10:00:01.000Z",
    message: "history smoke"
  });
  runtime.ingestAgentEvent("run_v1b_history", HISTORY_ACTION_ID, "indbase", "indbase.doctor", {
    event_id: "evt_v1b_1_dup",
    run_id: "run_v1b_history",
    action_id: HISTORY_ACTION_ID,
    agent_id: "indbase",
    command: "indbase.doctor",
    type: "log",
    seq: 1,
    epoch: 0,
    timestamp: "2026-05-23T10:00:02.000Z",
    message: "duplicate"
  });
  runtime.ingestAgentEvent("run_v1b_history", HISTORY_ACTION_ID, "indbase", "indbase.doctor", {
    event_id: "evt_v1b_2",
    run_id: "run_v1b_history",
    action_id: HISTORY_ACTION_ID,
    agent_id: "indbase",
    command: "indbase.doctor",
    type: "action.succeeded",
    seq: 2,
    epoch: 0,
    timestamp: "2026-05-23T10:00:03.000Z",
    payload: {
      operation_trace: {
        operation_id: "op_history",
        action_id: HISTORY_ACTION_ID,
        agent_id: "indbase",
        command: "indbase.doctor",
        status: "succeeded",
        domain_refs: {
          task_id: "task_history",
          doc_id: "doc_history"
        },
        capability_refs: [
          {
            provider: "swallow",
            capability_id: "swallow.inspect",
            provider_run_id: "prun_history",
            status: "succeeded",
            manifest_ref: "fake://manifest/history",
            trace_ref: "fake://trace/history",
            artifact_refs: ["fake://artifact/history"]
          }
        ],
        metadata: {
          artifact_trust_state: "diagnostic"
        }
      }
    },
    blocks: [
      {
        block_id: "blk_v1b",
        type: "markdown",
        content: "# history trace smoke"
      }
    ]
  });
}
