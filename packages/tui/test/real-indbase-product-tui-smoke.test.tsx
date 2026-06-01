/**
 * Local-only: drives the real indbase product TUI path against a kept smoke root.
 *
 *   CONSOLER_ROOT=<from CONSOLER_KEEP_REAL_INDBASE_SMOKE=1 pnpm test:real-indbase-smoke>
 *   INDBASE_SMOKE_VAULT=<vault dir from smoke output>
 *   MANUAL_TUI_ACTION_ID=<ingest action id from smoke>
 *   pnpm exec vitest run packages/tui/test/real-indbase-product-tui-smoke.test.tsx
 */
import type { AgentManifest } from "@consoler/protocol";
import { ConsolerRuntime } from "@consoler/runtime";
import { cleanup, render } from "ink-testing-library";
import React from "react";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { App } from "../src/app.js";
import { indbaseVariant } from "../src/variants/indbase.js";
import { assertVariantManifestOrExit } from "../src/variant-validation.js";

const smokeRoot = process.env.CONSOLER_ROOT;
const vaultPath = process.env.INDBASE_SMOKE_VAULT;
const ingestActionId = process.env.MANUAL_TUI_ACTION_ID;

const WAIT_OPTS = { timeout: 120_000, interval: 100 } as const;

async function flushStdin(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, process.platform === "win32" ? 200 : 120));
}

async function selectDoctorTaskFromHome(
  stdin: { write: (value: string) => void },
  lastFrame: () => string | undefined
): Promise<void> {
  await vi.waitFor(
    () => {
      const frame = lastFrame() ?? "";
      expect(frame).toContain("Describe your request");
      expect(frame).toContain("Check knowledge base status");
    },
    WAIT_OPTS
  );
  stdin.write("\t");
  await flushStdin();
  await vi.waitFor(
    () => {
      const frame = lastFrame() ?? "";
      expect(frame).toMatch(/>\s*Check knowledge base status/);
    },
    { timeout: 5_000, interval: 50 }
  );
  stdin.write("\r");
  await flushStdin();
}

const describeReal = smokeRoot && vaultPath ? describe : describe.skip;

describeReal("real indbase product TUI manual path", () => {
  let runtime: ConsolerRuntime;
  let manifest: AgentManifest;

  beforeAll(async () => {
    runtime = new ConsolerRuntime({ rootDir: smokeRoot });
    const discovered = await runtime.discover(indbaseVariant.defaultAgentId);
    assertVariantManifestOrExit(indbaseVariant, discovered);
    const allowed = new Set(indbaseVariant.allowedCommands);
    manifest = {
      ...discovered,
      commands: discovered.commands.filter((command) => allowed.has(command.name))
    };
  }, 180_000);

  afterAll(() => {
    runtime?.store.db.close();
  });

  afterEach(() => {
    cleanup();
  });

  it(
    "runs doctor task via product UI, then opens history trace and artifact",
    async () => {
    const { lastFrame, stdin, unmount } = render(
      <App variant={indbaseVariant} runtime={runtime} initialManifest={manifest} />
    );

    await selectDoctorTaskFromHome(stdin, lastFrame);

    await vi.waitFor(
      () => expect(lastFrame() ?? "").toContain("Vault location"),
      WAIT_OPTS
    );

    stdin.write(vaultPath!);
    await flushStdin();
    stdin.write("\r");
    await flushStdin();

    await vi.waitFor(
      () => {
        const frame = lastFrame() ?? "";
        expect(frame).toMatch(/Execution approval|Ready to run|y = start/i);
      },
      WAIT_OPTS
    );

    stdin.write("y");
    await flushStdin();

    await vi.waitFor(
      () => {
        const frame = lastFrame() ?? "";
        expect(frame).toMatch(/Live timeline|Results|succeeded/i);
      },
      WAIT_OPTS
    );

    unmount();

    const history = runtime.listActionHistory({
      limit: 20,
      agentId: "indbase",
      commands: indbaseVariant.allowedCommands
    });
    expect(history.some((entry) => entry.command === "indbase.doctor")).toBe(true);
    expect(history.every((entry) => entry.agent_id === "indbase")).toBe(true);

    const traceActionId = ingestActionId ?? history.find((e) => e.command === "indbase.ingest_file")?.action_id;
    expect(traceActionId, "need MANUAL_TUI_ACTION_ID or ingest history row").toBeTruthy();

    const trace = runtime.getActionTrace(traceActionId!);
    expect(trace.terminal_state).toBe("succeeded");
    const artifactBlocks = trace.result_blocks.filter((block) => block.type === "artifact");
    expect(artifactBlocks.length).toBeGreaterThan(0);

    const { lastFrame: traceFrame, stdin: traceStdin, unmount: traceUnmount } = render(
      <App
        variant={indbaseVariant}
        runtime={runtime}
        testTraceView={{ trace, tab: "events" }}
      />
    );

    await vi.waitFor(
      () => {
        const frame = traceFrame() ?? "";
        expect(frame).toContain("Trace");
        expect(frame).toContain(traceActionId!);
      },
      WAIT_OPTS
    );

    const firstArtifact = artifactBlocks[0]!;
    traceStdin.write("\u001B[B");
    await flushStdin();
    traceStdin.write("\r");
    await flushStdin();

    await vi.waitFor(
      () => {
        const frame = traceFrame() ?? "";
        expect(frame).toMatch(/Artifact|artifact|View blocks|retrieval/i);
        expect(frame).not.toMatch(/retrieval failed/i);
      },
      WAIT_OPTS
    );

    traceStdin.write("\u001b");
    await flushStdin();

    await vi.waitFor(
      () => expect(traceFrame() ?? "").toContain("Trace"),
      WAIT_OPTS
    );

    traceUnmount();
    },
    180_000
  );
});
