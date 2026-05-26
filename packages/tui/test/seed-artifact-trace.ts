import type { ConsolerRuntime } from "@consoler/runtime";

export const ARTIFACT_TRACE_ACTION_ID = "act_v2b_artifact_trace";

export function seedArtifactTraceFixture(runtime: ConsolerRuntime): void {
  const { store } = runtime;

  store.saveAction({
    action_id: ARTIFACT_TRACE_ACTION_ID,
    agent_id: "indbase",
    command: "indbase.doctor",
    args: { vault_path: "/tmp/vault" },
    created_at: "2026-05-23T11:00:00.000Z"
  });

  store.createRun("run_v2b_artifact", ARTIFACT_TRACE_ACTION_ID, "indbase", "indbase.doctor");
  runtime.ingestAgentEvent(
    "run_v2b_artifact",
    ARTIFACT_TRACE_ACTION_ID,
    "indbase",
    "indbase.doctor",
    {
      event_id: "evt_v2b_ok",
      run_id: "run_v2b_artifact",
      action_id: ARTIFACT_TRACE_ACTION_ID,
      agent_id: "indbase",
      command: "indbase.doctor",
      type: "action.succeeded",
      seq: 1,
      epoch: 0,
      timestamp: "2026-05-23T11:00:01.000Z",
      blocks: [
        {
          block_id: "blk_v2b_md",
          type: "markdown",
          content: "# result"
        },
        {
          block_id: "blk_v2b_artifact",
          type: "artifact",
          title: "Sample artifact",
          content: {
            uri: "fake://artifacts/conformance-fixture",
            kind: "conformance.fixture",
            label: "fixture"
          }
        }
      ]
    }
  );
}
