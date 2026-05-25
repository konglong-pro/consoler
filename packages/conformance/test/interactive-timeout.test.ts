import { describe, expect, it } from "vitest";

import { FAKE_AGENT_ID, fakeAgentRegistryEntry, runAgentConformance } from "../src/index.js";

describe("conformance.interactive_timeout", () => {
  for (const mode of ["abort", "use_default", "skip", "continue"] as const) {
    it(`executes timeout mode ${mode} without interaction-response`, async () => {
      const report = await runAgentConformance({
        agentId: FAKE_AGENT_ID,
        registryEntry: fakeAgentRegistryEntry(),
        command: "conformance.interactive_timeout",
        args: { message: mode, mode },
        approve: true
      });
      expect(report.passed).toBe(true);
      expect(report.checks.find((row) => row.id === "command.execute")?.status).toBe("passed");
    }, 30_000);
  }
});
