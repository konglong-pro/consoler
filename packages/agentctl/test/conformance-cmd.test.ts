import { describe, expect, it } from "vitest";

import { formatConformanceReport } from "@consoler/conformance";

import { formatAgentctlHelp } from "../src/index.js";

describe("agentctl test integration", () => {
  it("help lists test command", () => {
    expect(formatAgentctlHelp()).toContain("test <agent_id>");
  });

  it("formats failed conformance rows", () => {
    const text = formatConformanceReport({
      agent_id: "demo",
      root_dir: "/tmp",
      checks: [{ id: "x", name: "X", status: "failed", message: "broken" }],
      passed: false,
      started_at: "t0",
      ended_at: "t1"
    });
    expect(text).toContain("FAIL");
    expect(text).toContain("FAILED");
  });
});
