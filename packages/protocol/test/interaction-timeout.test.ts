import { describe, expect, it } from "vitest";

import { validateActionEvent } from "../src/validators.js";

describe("interaction timeout_policy schema", () => {
  const baseEvent = {
    event_id: "evt_timeout",
    run_id: "run_1",
    action_id: "act_1",
    agent_id: "conformance-fake",
    command: "conformance.interactive_timeout",
    seq: 1,
    epoch: 0,
    timestamp: "2026-05-24T12:00:00.000Z"
  };

  it("accepts valid timeout policies", () => {
    for (const on_timeout of ["abort", "use_default", "skip", "continue"] as const) {
      const interaction: Record<string, unknown> = {
        interaction_id: "ix_timeout",
        title: "Timeout",
        message: "Wait",
        choices: [{ id: "a", label: "A" }]
      };
      if (on_timeout === "use_default") {
        interaction.default_response = "a";
      }
      interaction.timeout_policy = { timeout_seconds: 0.5, on_timeout };
      const result = validateActionEvent({
        ...baseEvent,
        type: "interaction.required",
        interaction
      });
      expect(result.ok).toBe(true);
    }
  });

  it("rejects non-positive timeout_seconds", () => {
    const result = validateActionEvent({
      ...baseEvent,
      type: "interaction.required",
      interaction: {
        interaction_id: "ix_timeout",
        title: "Timeout",
        message: "Wait",
        choices: [{ id: "a", label: "A" }],
        timeout_policy: { timeout_seconds: 0, on_timeout: "abort" }
      }
    });
    expect(result.ok).toBe(false);
  });
});
