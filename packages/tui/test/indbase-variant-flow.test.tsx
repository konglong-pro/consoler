import { mkdirSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";

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
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "../src/app.js";
import { indbaseVariant } from "../src/variants/indbase.js";
import { indbaseSourceTrustManifestFixture } from "./fixtures/indbase-source-trust-manifest.js";
import { HISTORY_ACTION_ID, seedHistoryFixture } from "./seed-history.js";

const WAIT_OPTS = { timeout: 15_000, interval: 50 } as const;

async function flushStdin(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, process.platform === "win32" ? 200 : 50));
}

async function typeNlAndSubmit(
  stdin: { write: (value: string) => void },
  lastFrame: () => string | undefined,
  text: string
): Promise<void> {
  await flushStdin();
  for (const char of text) {
    stdin.write(char);
    await new Promise((resolve) => setTimeout(resolve, process.platform === "win32" ? 5 : 1));
  }
  await vi.waitFor(() => expect(lastFrame() ?? "").toContain(text), WAIT_OPTS);
  await flushStdin();
  stdin.write("\r");
  await flushStdin();
}

function seedFakeAgentAction(runtime: ConsolerRuntime): void {
  runtime.store.saveAction({
    action_id: "act_fake_other",
    agent_id: "conformance-fake",
    command: "conformance.echo",
    args: { message: "should not appear" },
    created_at: "2026-05-24T12:00:00.000Z"
  });
}

function mockPreparedAction(
  command = "indbase.doctor",
  args: Record<string, unknown> = { vault_path: "E:\\dogfood-vault" }
): PreparedAction {
  const snapshot = {
    snapshot_id: `snap_${command}`,
    kind: "composite" as const,
    summary: "test",
    details: args,
    created_at: new Date().toISOString()
  };
  const plan: ActionPlan = {
    plan_id: `plan_${command}`,
    action_id: `act_${command}`,
    agent_id: "indbase",
    command,
    steps: [{ step_id: "s1", title: "Run selected task" }],
    context_snapshot_id: snapshot.snapshot_id,
    context_snapshot: snapshot,
    side_effects: [],
    created_at: new Date().toISOString()
  };
  return {
    action: {
      action_id: `act_${command}`,
      agent_id: "indbase",
      command,
      args,
      created_at: new Date().toISOString()
    },
    plan,
    plan_hash: "hash",
    preview: { summary: "static preview" },
    approval: {
      approval_id: `appr_${command}`,
      action_id: `act_${command}`,
      agent_id: "indbase",
      command,
      scope: "execute",
      args_hash: "args",
      plan_hash: "hash",
      context_snapshot_hash: "ctx",
      side_effects_hash: "fx",
      material: {
        agent_id: "indbase",
        agent_version: "0.1.0",
        command,
        normalized_args: args,
        plan_summary: "plan",
        context_summary: "ctx",
        side_effects: []
      },
      created_at: new Date().toISOString()
    },
    manifest: indbaseSourceTrustManifestFixture,
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

function terminalEvent(prepared: PreparedAction): ActionEvent {
  return {
    event_id: `evt_${prepared.action.command}`,
    run_id: "run_v4d_session",
    action_id: prepared.action.action_id,
    agent_id: prepared.action.agent_id,
    command: prepared.action.command,
    type: "action.succeeded",
    seq: 1,
    epoch: 0,
    timestamp: new Date().toISOString()
  };
}

function runtimeWithSuccessfulPrepared(
  prepareAction?: (input: {
    agentId: string;
    command: string;
    args: Record<string, unknown>;
  }) => Promise<PreparedAction>
): ConsolerRuntime {
  const executePreparedWithControl = vi.fn(
    (prepared: PreparedAction, handlers: RuntimeEventHandlers): PreparedExecutionControl => {
      const event = terminalEvent(prepared);
      handlers.onEvent?.(event, { accepted: true, event });
      return {
        run_id: "run_v4d_session",
        done: Promise.resolve<RuntimeTerminalResult>({
          run_id: "run_v4d_session",
          state: "succeeded",
          events: [event]
        }),
        cancel: vi.fn(),
        respondInteraction: vi.fn(),
        close: vi.fn()
      };
    }
  );

  return {
    executePreparedWithControl,
    prepareAction:
      prepareAction ??
      vi.fn(
        async (input: { agentId: string; command: string; args: Record<string, unknown> }) =>
          mockPreparedAction(input.command, input.args)
      )
  } as unknown as ConsolerRuntime;
}

describe("indbase product variant TUI", () => {
  let tmpRoot: string;
  let runtime: ConsolerRuntime;

  beforeEach(() => {
    tmpRoot = path.join(
      os.tmpdir(),
      `consoler-tui-v3a-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    );
    mkdirSync(path.join(tmpRoot, ".consoler"), { recursive: true });
    runtime = new ConsolerRuntime({ rootDir: tmpRoot });
    seedHistoryFixture(runtime);
    seedFakeAgentAction(runtime);
  });

  afterEach(() => {
    runtime.store.db.close();
    rmSync(tmpRoot, { recursive: true, force: true });
    cleanup();
  });

  it("shows NL input and product tasks on home, not raw command names", async () => {
    const { lastFrame, unmount } = render(
      <App
        runtime={runtime}
        variant={indbaseVariant}
        initialManifest={indbaseSourceTrustManifestFixture}
      />
    );

    await vi.waitFor(
      () => {
        const frame = lastFrame() ?? "";
        expect(frame).toContain("Describe your request");
        expect(frame).toContain("Check knowledge base status");
        expect(frame).toContain("Import a file");
        expect(frame).toContain("History");
        expect(frame).not.toContain("Select command");
        expect(frame).not.toContain("indbase.doctor");
        expect(frame).not.toContain("indbase.ingest_file");
        expect(frame).not.toContain("New Action");
      },
      WAIT_OPTS
    );

    unmount();
  });

  it("shows the full Source Trust walkthrough action surface in product order", async () => {
    const { lastFrame, unmount } = render(
      <App
        runtime={runtime}
        variant={indbaseVariant}
        initialManifest={indbaseSourceTrustManifestFixture}
      />
    );

    await vi.waitFor(
      () => {
        const frame = lastFrame() ?? "";
        let cursor = -1;
        for (const label of [
          "Check knowledge base status",
          "Import a file",
          "Search trusted sources",
          "Open document by id",
          "Review queue",
          "Review item",
          "Task list",
          "Task details",
          "Error list",
          "Error details"
        ]) {
          const next = frame.indexOf(label);
          expect(next).toBeGreaterThan(cursor);
          cursor = next;
        }
        expect(frame).not.toContain("indbase.search_sources");
      },
      WAIT_OPTS
    );

    unmount();
  });

  it("scopes history to indbase variant commands and excludes other agents", async () => {
    const { lastFrame, unmount } = render(
      <App
        runtime={runtime}
        variant={indbaseVariant}
        initialManifest={indbaseSourceTrustManifestFixture}
        testHistoryView
      />
    );

    await vi.waitFor(
      () => {
        const frame = lastFrame() ?? "";
        expect(frame).toContain("Check knowledge base status");
        expect(frame).toContain("history_test");
        expect(frame).not.toContain("conformance.echo");
        expect(frame).not.toContain("conformance-fake");
      },
      WAIT_OPTS
    );

    unmount();
  });

  it("opens product-labeled form for a task from the task list", async () => {
    const { lastFrame, stdin, unmount } = render(
      <App
        runtime={runtime}
        variant={indbaseVariant}
        initialManifest={indbaseSourceTrustManifestFixture}
      />
    );

    await vi.waitFor(
      () => expect(lastFrame() ?? "").toContain("Check knowledge base status"),
      WAIT_OPTS
    );

    stdin.write("\t");
    await flushStdin();
    stdin.write("\r");
    await flushStdin();

    await vi.waitFor(
      () => {
        const frame = lastFrame() ?? "";
        expect(frame).toContain("Vault location");
        expect(frame).not.toContain("vault_path");
        expect(frame).not.toContain("indbase.doctor");
      },
      WAIT_OPTS
    );

    unmount();
  });

  it("remembers a successful vault path for later indbase forms in the same session", async () => {
    const prepared = mockPreparedAction("indbase.doctor", {
      vault_path: "E:\\dogfood-vault"
    });
    const { lastFrame, stdin, unmount } = render(
      <App
        runtime={runtimeWithSuccessfulPrepared()}
        variant={indbaseVariant}
        initialManifest={indbaseSourceTrustManifestFixture}
        testPrepared={prepared}
      />
    );

    await vi.waitFor(() => expect(lastFrame() ?? "").toContain("Execution approval"), WAIT_OPTS);

    stdin.write("y");
    await flushStdin();

    await vi.waitFor(() => expect(lastFrame() ?? "").toContain("action.succeeded"), WAIT_OPTS);

    stdin.write("\u001b");
    await flushStdin();
    await vi.waitFor(() => expect(lastFrame() ?? "").toContain("Search trusted sources"), WAIT_OPTS);

    stdin.write("\u001B[B");
    await flushStdin();
    stdin.write("\u001B[B");
    await flushStdin();
    stdin.write("\r");
    await flushStdin();

    await vi.waitFor(
      () => {
        const frame = lastFrame() ?? "";
        expect(frame).toContain("Search trusted sources");
        expect(frame).toContain("Vault location");
        expect(frame).toContain("E:\\dogfood-vault");
      },
      WAIT_OPTS
    );

    unmount();
  });

  it("lets explicit form prefill override the remembered vault path", async () => {
    const prepared = mockPreparedAction("indbase.doctor", {
      vault_path: "E:\\dogfood-vault"
    });
    const { lastFrame, stdin, unmount } = render(
      <App
        runtime={runtimeWithSuccessfulPrepared()}
        variant={indbaseVariant}
        initialManifest={indbaseSourceTrustManifestFixture}
        testPrepared={prepared}
      />
    );

    await vi.waitFor(() => expect(lastFrame() ?? "").toContain("Execution approval"), WAIT_OPTS);
    stdin.write("y");
    await flushStdin();
    await vi.waitFor(() => expect(lastFrame() ?? "").toContain("action.succeeded"), WAIT_OPTS);

    stdin.write("\u001b");
    await flushStdin();
    await vi.waitFor(() => expect(lastFrame() ?? "").toContain("Describe your request"), WAIT_OPTS);

    stdin.write("\t");
    await flushStdin();
    await typeNlAndSubmit(stdin, lastFrame, "check vault E:\\override-vault");

    await vi.waitFor(
      () => {
        const frame = lastFrame() ?? "";
        expect(frame).toContain("Check knowledge base status");
        expect(frame).toContain("E:\\override-vault");
        expect(frame).not.toContain("E:\\dogfood-vault");
      },
      WAIT_OPTS
    );

    unmount();
  });

  it("shows guidance when submitting empty natural language", async () => {
    const { lastFrame, stdin, unmount } = render(
      <App
        runtime={runtime}
        variant={indbaseVariant}
        initialManifest={indbaseSourceTrustManifestFixture}
      />
    );

    await vi.waitFor(
      () => expect(lastFrame() ?? "").toContain("Describe your request"),
      WAIT_OPTS
    );

    stdin.write("\r");
    await flushStdin();

    await vi.waitFor(
      () => {
        const frame = lastFrame() ?? "";
        expect(frame).toContain("Enter a request or press Tab to choose a task.");
        expect(frame).toContain("Describe your request");
      },
      WAIT_OPTS
    );

    unmount();
  });

  it("prefills vault check form from natural language", async () => {
    const { lastFrame, stdin, unmount } = render(
      <App
        runtime={runtime}
        variant={indbaseVariant}
        initialManifest={indbaseSourceTrustManifestFixture}
      />
    );

    await vi.waitFor(
      () => expect(lastFrame() ?? "").toContain("Describe your request"),
      WAIT_OPTS
    );

    await typeNlAndSubmit(stdin, lastFrame, "check vault C:\\vault");

    await vi.waitFor(
      () => {
        const frame = lastFrame() ?? "";
        expect(frame).toContain("Check knowledge base status");
        expect(frame).toContain("Vault location");
        expect(frame).toContain("C:\\vault");
        expect(frame).not.toContain("action_id");
        expect(frame).not.toContain("approval_id");
        expect(frame).not.toContain("prepared");
      },
      WAIT_OPTS
    );

    unmount();
  });

  it("opens import form with partial prefill and missing-field notice", async () => {
    const { lastFrame, stdin, unmount } = render(
      <App
        runtime={runtime}
        variant={indbaseVariant}
        initialManifest={indbaseSourceTrustManifestFixture}
      />
    );

    await vi.waitFor(
      () => expect(lastFrame() ?? "").toContain("Describe your request"),
      WAIT_OPTS
    );

    await typeNlAndSubmit(stdin, lastFrame, "import C:\\docs\\a.md");

    await vi.waitFor(
      () => {
        const frame = lastFrame() ?? "";
        expect(frame).toContain("Import a file");
        expect(frame).toContain("File to import");
        expect(frame).toContain("C:\\docs\\a.md");
        expect(frame).toContain("Vault location");
        expect(frame).toContain("Missing required fields: vault_path.");
      },
      WAIT_OPTS
    );

    unmount();
  });

  it("opens search form with query and explicit governed filters from natural language", async () => {
    const { lastFrame, stdin, unmount } = render(
      <App
        runtime={runtime}
        variant={indbaseVariant}
        initialManifest={indbaseSourceTrustManifestFixture}
      />
    );

    await vi.waitFor(
      () => expect(lastFrame() ?? "").toContain("Describe your request"),
      WAIT_OPTS
    );

    await typeNlAndSubmit(stdin, lastFrame, 'search "tag governance" tag:taxonomy category:Research');

    await vi.waitFor(
      () => {
        const frame = lastFrame() ?? "";
        expect(frame).toContain("Search trusted sources");
        expect(frame).toContain("Search text");
        expect(frame).toContain("tag governance");
        expect(frame).toContain("Tag filter");
        expect(frame).toContain("taxonomy");
        expect(frame).toContain("Category filter");
        expect(frame).toContain("Research");
        expect(frame).toContain("Missing required fields: vault_path.");
        expect(frame).not.toContain("indbase.search_sources");
        expect(frame).not.toContain("action_id");
      },
      WAIT_OPTS
    );

    unmount();
  });

  it("opens document form with explicit document id from natural language", async () => {
    const { lastFrame, stdin, unmount } = render(
      <App
        runtime={runtime}
        variant={indbaseVariant}
        initialManifest={indbaseSourceTrustManifestFixture}
      />
    );

    await vi.waitFor(
      () => expect(lastFrame() ?? "").toContain("Describe your request"),
      WAIT_OPTS
    );

    await typeNlAndSubmit(stdin, lastFrame, "open document doc_20260606_abcd");

    await vi.waitFor(
      () => {
        const frame = lastFrame() ?? "";
        expect(frame).toContain("Open document by id");
        expect(frame).toContain("Document id");
        expect(frame).toContain("doc_20260606_abcd");
        expect(frame).toContain("Vault location");
        expect(frame).toContain("Missing required fields: vault_path.");
        expect(frame).not.toContain("indbase.doc_show");
      },
      WAIT_OPTS
    );

    unmount();
  });

  it("opens search form from Chinese natural language phrasing", async () => {
    const { lastFrame, stdin, unmount } = render(
      <App
        runtime={runtime}
        variant={indbaseVariant}
        initialManifest={indbaseSourceTrustManifestFixture}
      />
    );

    await vi.waitFor(
      () => expect(lastFrame() ?? "").toContain("Describe your request"),
      WAIT_OPTS
    );

    await typeNlAndSubmit(stdin, lastFrame, '搜索 "标签治理" tag:taxonomy');

    await vi.waitFor(
      () => {
        const frame = lastFrame() ?? "";
        expect(frame).toContain("Search trusted sources");
        expect(frame).toContain("Search text");
        expect(frame).toContain("标签治理");
        expect(frame).toContain("Tag filter");
        expect(frame).toContain("taxonomy");
        expect(frame).toContain("Missing required fields: vault_path.");
      },
      WAIT_OPTS
    );

    unmount();
  });

  it("keeps vague governed-tag wording in search text instead of tag filter", async () => {
    const { lastFrame, stdin, unmount } = render(
      <App
        runtime={runtime}
        variant={indbaseVariant}
        initialManifest={indbaseSourceTrustManifestFixture}
      />
    );

    await vi.waitFor(
      () => expect(lastFrame() ?? "").toContain("Describe your request"),
      WAIT_OPTS
    );

    await typeNlAndSubmit(stdin, lastFrame, "search governance tags");

    await vi.waitFor(
      () => {
        const frame = lastFrame() ?? "";
        expect(frame).toContain("Search trusted sources");
        expect(frame).toContain("Search text");
        expect(frame).toContain("governance tags");
        expect(frame).toContain("Tag filter");
        expect(frame).not.toContain("formal tag");
      },
      WAIT_OPTS
    );

    unmount();
  });

  it("stays on home with no_match message for unrelated text", async () => {
    const { lastFrame, stdin, unmount } = render(
      <App
        runtime={runtime}
        variant={indbaseVariant}
        initialManifest={indbaseSourceTrustManifestFixture}
      />
    );

    await vi.waitFor(
      () => expect(lastFrame() ?? "").toContain("Describe your request"),
      WAIT_OPTS
    );

    await typeNlAndSubmit(stdin, lastFrame, "completely unrelated phrase");

    await vi.waitFor(
      () => {
        const frame = lastFrame() ?? "";
        expect(frame).toContain("No matching action found.");
        expect(frame).toContain("completely unrelated phrase");
        expect(frame).toContain("Check knowledge base status");
      },
      WAIT_OPTS
    );

    unmount();
  });
});
