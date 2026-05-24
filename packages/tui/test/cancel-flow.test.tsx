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
    snapshot_id: "snap_cancel_tui",
    kind: "composite" as const,
    summary: "test",
    details: { vault_path: "/tmp/v" },
    created_at: new Date().toISOString()
  };
  const plan: ActionPlan = {
    plan_id: "plan_cancel_tui",
    action_id: "act_cancel_tui",
    agent_id: "indbase",
    command: "indbase.doctor",
    steps: [{ step_id: "s1", title: "Step" }],
    context_snapshot_id: snapshot.snapshot_id,
    context_snapshot: snapshot,
    side_effects: [],
    created_at: new Date().toISOString()
  };
  return {
    action: {
      action_id: "act_cancel_tui",
      agent_id: "indbase",
      command: "indbase.doctor",
      args: { vault_path: "/tmp/v" },
      created_at: new Date().toISOString()
    },
    plan,
    plan_hash: "hash",
    preview: { summary: "static" },
    approval: {
      approval_id: "appr_cancel_tui",
      action_id: "act_cancel_tui",
      agent_id: "indbase",
      command: "indbase.doctor",
      scope: "execute",
      args_hash: "args",
      plan_hash: "hash",
      context_snapshot_hash: "ctx",
      side_effects_hash: "fx",
      material: {
        agent_id: "indbase",
        agent_version: "0.1.0",
        command: "indbase.doctor",
        normalized_args: { vault_path: "/tmp/v" },
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
    action_id: "act_cancel_tui",
    agent_id: "indbase",
    command: "indbase.doctor",
    type,
    seq,
    epoch: 0,
    timestamp: new Date().toISOString(),
    ...extra
  };
}

describe("TUI cooperative cancel flow", () => {
  afterEach(() => {
    cleanup();
  });

  it("requests cancel during running and finishes on action.cancelled without success blocks", async () => {
    const prepared = mockPrepared();
    let resolveTerminal!: (result: RuntimeTerminalResult) => void;
    let capturedHandlers: RuntimeEventHandlers | undefined;
    const cancelFn = vi.fn(async () => ({ ok: false, cancelled: true }));
    const closeFn = vi.fn();

    const executePreparedWithControl = vi.fn(
      (_prepared: PreparedAction, handlers: RuntimeEventHandlers): PreparedExecutionControl => {
        capturedHandlers = handlers;
        return {
          run_id: "run_mock",
          done: new Promise<RuntimeTerminalResult>((resolve) => {
            resolveTerminal = resolve;
          }),
          cancel: cancelFn,
          respondInteraction: vi.fn(),
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

    await vi.waitFor(() => {
      expect(lastFrame()).toContain("c cancel");
      expect(executePreparedWithControl).toHaveBeenCalledTimes(1);
    });

    stdin.write("c");
    stdin.write("c");

    await vi.waitFor(() => {
      expect(cancelFn).toHaveBeenCalledTimes(1);
      expect(lastFrame()).toContain("Cancel requested; waiting for agent checkpoint");
    });

    const started = terminalEvent("action.started", 1);
    const cancelled = terminalEvent("action.cancelled", 2);
    capturedHandlers?.onEvent?.(started, { accepted: true, event: started });
    capturedHandlers?.onEvent?.(cancelled, { accepted: true, event: cancelled });

    resolveTerminal({
      run_id: "run_mock",
      state: "cancelled",
      events: [started, cancelled]
    });

    await vi.waitFor(() => {
      const frame = lastFrame() ?? "";
      expect(frame).toContain("action.cancelled");
      expect(frame).toContain("Execution cancelled.");
      expect(frame).not.toContain("# ok");
      expect(frame).not.toMatch(/markdown.*# ok/i);
    });

    expect(closeFn).toHaveBeenCalled();
    unmount();
  });
});
