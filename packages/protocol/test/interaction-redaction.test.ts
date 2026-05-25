import { describe, expect, it } from "vitest";

import { validateActionEvent } from "../src/validators.js";

describe("interaction redaction marker", () => {
  it("accepts prompt_schema properties with x-consoler-redact", () => {
    const result = validateActionEvent({
      event_id: "evt_redact",
      run_id: "run_1",
      action_id: "act_1",
      agent_id: "conformance-fake",
      command: "conformance.interactive_redaction",
      type: "interaction.required",
      seq: 1,
      epoch: 0,
      timestamp: "2026-05-24T12:00:00.000Z",
      interaction: {
        interaction_id: "ix_1",
        title: "Redact",
        message: "Enter secrets",
        prompt_schema: {
          type: "object",
          additionalProperties: false,
          required: ["label", "api_key"],
          properties: {
            label: { type: "string" },
            api_key: { type: "string", "x-consoler-redact": true }
          }
        }
      }
    });
    expect(result.ok).toBe(true);
  });
});
