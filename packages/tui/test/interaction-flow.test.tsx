import { indbaseManifestFixture } from "@consoler/protocol";
import type { ActionEvent, ActionPlan } from "@consoler/protocol";
import {
  ConsolerRuntime,
  type PreparedAction,
  type PreparedExecutionControl,
  type RuntimeEventHandlers,
  type RuntimeTerminalResult
} from "@consoler/runtime";
import { cleanup, render } from "ink-testing-library";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { App } from "../src/app.js";

function mockPrepared(): PreparedAction {
  const snapshot = {
    snapshot_id: "snap_ix_tui",
    kind: "composite" as const,
    summary: "test",
    details: { vault_path: "/tmp/v" },
    created_at: new Date().toISOString()
  };
  const plan: ActionPlan = {
    plan_id: "plan_ix_tui",
    action_id: "act_ix_tui",
    agent_id: "indbase",
    command: "conformance.interactive_choice",
    steps: [{ step_id: "s1", title: "Step" }],
    context_snapshot_id: snapshot.snapshot_id,
    context_snapshot: snapshot,
    side_effects: [],
    created_at: new Date().toISOString()
  };
  return {
    action: {
      action_id: "act_ix_tui",
      agent_id: "indbase",
      command: "conformance.interactive_choice",
      args: { message: "hello" },
      created_at: new Date().toISOString()
    },
    plan,
    plan_hash: "hash",
    preview: { summary: "static" },
    approval: {
      approval_id: "appr_ix_tui",
      action_id: "act_ix_tui",
      agent_id: "indbase",
      command: "conformance.interactive_choice",
      scope: "execute",
      args_hash: "args",
      plan_hash: "hash",
      context_snapshot_hash: "ctx",
      side_effects_hash: "fx",
      material: {
        agent_id: "indbase",
        agent_version: "0.1.0",
        command: "conformance.interactive_choice",
        normalized_args: { message: "hello" },
        plan_summary: "plan",
        context_summary: "ctx",
        side_effects: []
      },
      created_at: new Date().toISOString()
    },
    manifest: indbaseManifestFixture,
    entry: {
      agent_id: "indbase",
      name: "indbase",
      cwd: "E:\\indbase",
      command: "uv",
      args: ["run", "python", "-m", "indbase_agent"],
      enabled: true
    }
  };
}

function terminalEvent(
  type: ActionEvent["type"],
  seq: number,
  extra: Partial<ActionEvent> = {}
): ActionEvent {
  return {
    event_id: `evt_${type}_${seq}`,
    run_id: "run_mock",
    action_id: "act_ix_tui",
    agent_id: "indbase",
    command: "conformance.interactive_choice",
    type,
    seq,
    epoch: 0,
    timestamp: new Date().toISOString(),
    ...extra
  };
}

describe("TUI interaction.required flow", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders interaction card, sends choice response, and finishes with result blocks", async () => {
    const prepared = mockPrepared();
    let resolveTerminal!: (result: RuntimeTerminalResult) => void;
    let capturedHandlers: RuntimeEventHandlers | undefined;
    const respondInteraction = vi.fn(async () => ({ ok: true }));
    const closeFn = vi.fn();

    const executePreparedWithControl = vi.fn(
      (_prepared: PreparedAction, handlers: RuntimeEventHandlers): PreparedExecutionControl => {
        capturedHandlers = handlers;
        return {
          run_id: "run_mock",
          done: new Promise<RuntimeTerminalResult>((resolve) => {
            resolveTerminal = resolve;
          }),
          cancel: vi.fn(),
          respondInteraction,
          close: closeFn
        };
      }
    );

    const runtime = {
      executePreparedWithControl
    } as unknown as ConsolerRuntime;

    const { lastFrame, stdin, unmount } = render(
      <App runtime={runtime} testPrepared={prepared} />
    );

    await vi.waitFor(() => {
      expect(lastFrame()).toContain("Execution approval");
    });

    stdin.write("y");

    const started = terminalEvent("action.started", 1);
    const required = terminalEvent("interaction.required", 2, {
      interaction: {
        interaction_id: "ix_1",
        title: "Pick outcome",
        message: "Select one",
        choices: [
          { id: "ok", label: "Success path" },
          { id: "alt", label: "Alternate path" }
        ]
      }
    });
    capturedHandlers?.onEvent?.(started, { accepted: true, event: started });
    capturedHandlers?.onEvent?.(required, { accepted: true, event: required });

    await vi.waitFor(() => {
      expect(lastFrame()).toContain("Interaction required");
      expect(lastFrame()).toContain("1. Success path");
    });

    stdin.write("1");

    await vi.waitFor(() => {
      expect(respondInteraction).toHaveBeenCalledWith("ix_1", "ok");
    });

    const succeeded = terminalEvent("action.succeeded", 3, {
      blocks: [{ block_id: "b1", type: "markdown", content: "# Choice OK" }]
    });
    capturedHandlers?.onEvent?.(succeeded, { accepted: true, event: succeeded });
    resolveTerminal({
      run_id: "run_mock",
      state: "succeeded",
      events: [started, required, succeeded]
    });

    await vi.waitFor(() => {
      const frame = lastFrame() ?? "";
      expect(frame).toContain("action.succeeded");
      expect(frame).toContain("# Choice OK");
    });

    unmount();
  });
});
