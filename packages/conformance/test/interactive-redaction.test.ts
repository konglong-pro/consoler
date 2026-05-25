import { describe, expect, it } from "vitest";

import { FAKE_AGENT_ID, fakeAgentRegistryEntry, runAgentConformance } from "../src/index.js";

describe("conformance.interactive_redaction", () => {
  it("redacts persisted trace while the agent receives the live secret", async () => {
    const report = await runAgentConformance({
      agentId: FAKE_AGENT_ID,
      registryEntry: fakeAgentRegistryEntry(),
      command: "conformance.interactive_redaction",
      args: { message: "redact" },
      approve: true,
      interactionResponse: { label: "public", api_key: "super-secret-123" }
    });
    expect(report.passed).toBe(true);
    expect(report.checks.find((row) => row.id === "interaction.redaction_agent_live")?.status).toBe(
      "passed"
    );
    expect(report.checks.find((row) => row.id === "interaction.redaction_response")?.status).toBe(
      "passed"
    );
    expect(
      report.checks.find(
        (row) => row.id === "interaction.redaction_secret_absent.trace_json.live"
      )?.status
    ).toBe("passed");
  }, 30_000);
});
