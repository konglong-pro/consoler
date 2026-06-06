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

  it("force-kills ignore-cancel command after cancel timeout", async () => {
    const report = await runAgentConformance({
      agentId: FAKE_AGENT_ID,
      registryEntry: fakeAgentRegistryEntry(),
      command: "conformance.slow_ignore_cancel",
      args: { message: "timeout-me" },
      approve: true,
      cancelAfterMs: 100,
      cancelTimeoutMs: 300,
      cleanupTempRoot: true
    });

    expect(report.checks.find((row) => row.id === "cancel.timeout_terminal_state")?.status).toBe(
      "passed"
    );
    expect(report.checks.find((row) => row.id === "cancel.timeout_control_error")?.status).toBe(
      "passed"
    );
    expect(report.checks.find((row) => row.id === "cancel.timeout_quarantine")?.status).toBe(
      "passed"
    );
  });

  it("cancels slow command and verifies cancelled terminal", async () => {
    const report = await runAgentConformance({
      agentId: FAKE_AGENT_ID,
      registryEntry: fakeAgentRegistryEntry(),
      command: "conformance.slow_cancel",
      args: { message: "cancel-me" },
      approve: true,
      cancelAfterMs: 100
    });
    expect(report.passed).toBe(true);
    expect(report.checks.find((row) => row.id === "cancel.terminal_state")?.status).toBe("passed");
    expect(report.checks.find((row) => row.id === "cancel.no_succeeded")?.status).toBe("passed");
    expect(report.checks.find((row) => row.id === "cancel.quarantine")?.status).toBe("passed");
    expect(report.checks.find((row) => row.id === "cancel.history_status")?.status).toBe("passed");
  });

  it("executes static command with diff and artifact blocks in trace and replay", async () => {
    const report = await runAgentConformance({
      agentId: FAKE_AGENT_ID,
      registryEntry: fakeAgentRegistryEntry(),
      command: "conformance.static_echo",
      args: { message: "blocks" },
      approve: true
    });
    expect(report.passed).toBe(true);
    expect(report.checks.find((row) => row.id === "execution.diff_artifact_blocks")?.status).toBe(
      "passed"
    );
    expect(
      report.checks.find((row) => row.id === "execution.replay_block_summaries")?.status
    ).toBe("passed");
    expect(report.checks.find((row) => row.id === "execution.artifact_retrieval")?.status).toBe(
      "passed"
    );
    expect(
      report.checks.find((row) => row.id === "execution.artifact_retrieval_audit")?.status
    ).toBe("passed");
  });

  it("does not require diff or artifact blocks for read-only commands", async () => {
    const report = await runAgentConformance({
      agentId: FAKE_AGENT_ID,
      registryEntry: fakeAgentRegistryEntry(),
      command: "conformance.read_only_text",
      args: { message: "readonly" },
      approve: true
    });
    expect(report.passed).toBe(true);
    expect(report.checks.find((row) => row.id === "execution.diff_artifact_blocks")?.status).toBe(
      "passed"
    );
    expect(
      report.checks.find((row) => row.id === "execution.diff_artifact_blocks")?.message
    ).toContain("not required");
    expect(
      report.checks.find((row) => row.id === "execution.replay_block_summaries")?.status
    ).toBe("passed");
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

  it("fails fast when interactive command lacks interaction response", async () => {
    const report = await runAgentConformance({
      agentId: FAKE_AGENT_ID,
      registryEntry: fakeAgentRegistryEntry(),
      command: "conformance.interactive_choice",
      args: { message: "pick" },
      approve: true
    });
    expect(report.passed).toBe(false);
    expect(report.checks.find((row) => row.id === "interaction.response_required")?.status).toBe(
      "failed"
    );
    expect(report.checks.find((row) => row.id === "command.execute")?.status).toBe("skipped");
  });

  it("executes interactive choice with pre-seeded response", async () => {
    const report = await runAgentConformance({
      agentId: FAKE_AGENT_ID,
      registryEntry: fakeAgentRegistryEntry(),
      command: "conformance.interactive_choice",
      args: { message: "pick" },
      approve: true,
      interactionResponse: "ok"
    });
    expect(report.passed).toBe(true);
    expect(report.checks.find((row) => row.id === "interaction.required_event")?.status).toBe(
      "passed"
    );
    expect(report.checks.find((row) => row.id === "interaction.terminal_state")?.status).toBe(
      "passed"
    );
  });

  it("executes interactive form with object-schema response", async () => {
    const report = await runAgentConformance({
      agentId: FAKE_AGENT_ID,
      registryEntry: fakeAgentRegistryEntry(),
      command: "conformance.interactive_form",
      args: { message: "form" },
      approve: true,
      interactionResponse: { name: "alice", confirm: true, count: 2 }
    });
    expect(report.passed).toBe(true);
    expect(report.checks.find((row) => row.id === "interaction.response_sent")?.status).toBe(
      "passed"
    );
  });

  it("flags invalid events in unit tests without requiring fake agent behavior", () => {
    const invalid = validateActionEvent({ type: "log" });
    expect(invalid.ok).toBe(false);
  });
});
