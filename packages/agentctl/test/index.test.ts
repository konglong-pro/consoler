import { describe, expect, it } from "vitest";

import { formatAgentctlHelp } from "../src/index.js";

describe("agentctl package scaffold", () => {
  it("lists planned V0a commands", () => {
    expect(formatAgentctlHelp()).toContain("discover <agent_id>");
    expect(formatAgentctlHelp()).toContain("run <agent_id> <command>");
    expect(formatAgentctlHelp()).toContain("history");
    expect(formatAgentctlHelp()).toContain("trace <action_id>");
  });
});
