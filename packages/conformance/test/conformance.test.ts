import { describe, expect, it } from "vitest";

import { validateActionEvent } from "@consoler/protocol";

import {
  FAKE_AGENT_ID,
  fakeAgentRegistryEntry,
  formatConformanceReport,
  runAgentConformance
} from "../src/index.js";

describe("conformance harness", () => {
  it("passes default checks against the Python SDK fake agent", async () => {
    const report = await runAgentConformance({
      agentId: FAKE_AGENT_ID,
      registryEntry: fakeAgentRegistryEntry()
    });
    expect(report.passed).toBe(true);
    expect(report.checks.some((row) => row.id === "agent.discover" && row.status === "passed")).toBe(
      true
    );
    const text = formatConformanceReport(report);
    expect(text).toContain("PASS");
  });

  it("runs static command checks without execute by default", async () => {
    const report = await runAgentConformance({
      agentId: FAKE_AGENT_ID,
      registryEntry: fakeAgentRegistryEntry(),
      command: "conformance.static_echo",
      args: { message: "hello" }
    });
    expect(report.checks.find((row) => row.id === "command.execute")?.status).toBe("skipped");
    expect(report.checks.find((row) => row.id === "command.static_preview")?.status).toBe("passed");
    expect(report.passed).toBe(true);
  });

  it("skips probe preview until approve-preview is supplied", async () => {
    const report = await runAgentConformance({
      agentId: FAKE_AGENT_ID,
      registryEntry: fakeAgentRegistryEntry(),
      command: "conformance.probe_echo",
      args: { message: "probe" }
    });
    expect(report.checks.find((row) => row.id === "command.probe_preview")?.status).toBe("skipped");
    expect(report.passed).toBe(true);
  });

  it("executes probe command with dual approval and verifies replay", async () => {
    const report = await runAgentConformance({
      agentId: FAKE_AGENT_ID,
      registryEntry: fakeAgentRegistryEntry(),
      command: "conformance.probe_echo",
      args: { message: "probe-run" },
      approvePreview: true,
      approve: true
    });
    expect(report.passed).toBe(true);
    expect(report.checks.find((row) => row.id === "execution.replay")?.status).toBe("passed");
    expect(report.checks.find((row) => row.id === "execution.no_rejected")?.status).toBe("passed");
  });

  it("flags invalid events in unit tests without requiring fake agent behavior", () => {
    const invalid = validateActionEvent({ type: "log" });
    expect(invalid.ok).toBe(false);
  });
});
