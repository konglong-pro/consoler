import { mkdirSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { indbaseManifestFixture } from "@consoler/protocol";
import { ConsolerRuntime } from "@consoler/runtime";
import { cleanup, render } from "ink-testing-library";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "../src/app.js";
import { HISTORY_ACTION_ID, seedHistoryFixture } from "./seed-history.js";

const WAIT_OPTS = { timeout: 10_000, interval: 50 } as const;

async function flushStdin(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 50));
}

describe("TUI history and trace flow", () => {
  let tmpRoot: string;
  let runtime: ConsolerRuntime;

  beforeEach(() => {
    tmpRoot = path.join(
      os.tmpdir(),
      `consoler-tui-v1b-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    );
    mkdirSync(path.join(tmpRoot, ".consoler"), { recursive: true });
    runtime = new ConsolerRuntime({ rootDir: tmpRoot });
    seedHistoryFixture(runtime);
  });

  afterEach(() => {
    runtime.store.db.close();
    rmSync(tmpRoot, { recursive: true, force: true });
    cleanup();
  });

  it("opens History from the home menu", async () => {
    const { lastFrame, stdin, unmount } = render(
      <App runtime={runtime} initialManifest={indbaseManifestFixture} />
    );

    await vi.waitFor(
      () => {
        const frame = lastFrame() ?? "";
        expect(frame).toContain("New Action");
        expect(frame).toContain("History");
      },
      WAIT_OPTS
    );

    stdin.write("2");
    await flushStdin();

    await vi.waitFor(
      () => {
        const frame = lastFrame() ?? "";
        expect(frame).toContain("indbase.doctor");
        expect(frame).toContain("History (Enter open trace");
      },
      WAIT_OPTS
    );

    unmount();
  });

  it("navigates History -> Trace with rejected events", async () => {
    const { lastFrame, stdin, unmount } = render(
      <App runtime={runtime} initialManifest={indbaseManifestFixture} testHistoryView />
    );

    await vi.waitFor(
      () => {
        const frame = lastFrame() ?? "";
        expect(frame).toContain("indbase.doctor");
        expect(frame).toContain("History (Enter open trace");
      },
      WAIT_OPTS
    );

    stdin.write("1");
    await flushStdin();

    await vi.waitFor(
      () => {
        const frame = lastFrame() ?? "";
        expect(frame).toContain("Trace");
        expect(frame).toContain(HISTORY_ACTION_ID);
        expect(frame).toContain("Rejected events (1)");
        expect(frame).toContain("duplicate_seq");
        expect(frame).toContain("# history trace smoke");
      },
      WAIT_OPTS
    );

    unmount();
  });

  it("renders interaction records in trace view", async () => {
    runtime.store.insertPendingInteraction(
      "run_v1b_history",
      HISTORY_ACTION_ID,
      "indbase",
      "indbase.doctor",
      {
        interaction_id: "ix_history",
        title: "Confirm",
        message: "Proceed with doctor?"
      },
      "2026-05-23T10:00:04.000Z"
    );
    runtime.store.markInteractionResponded("run_v1b_history", "ix_history", "yes");

    const trace = runtime.getActionTrace(HISTORY_ACTION_ID);
    const { lastFrame, unmount } = render(
      <App
        runtime={runtime}
        initialManifest={indbaseManifestFixture}
        testTraceView={{ trace }}
      />
    );

    await vi.waitFor(
      () => {
        const frame = lastFrame() ?? "";
        expect(frame).toContain("Interactions (1)");
        expect(frame).toContain("ix_history");
        expect(frame).toContain("Proceed with doctor?");
        expect(frame).toContain('"yes"');
      },
      WAIT_OPTS
    );

    unmount();
  });

  it("renders full trace payload on JSON tab", async () => {
    const trace = runtime.getActionTrace(HISTORY_ACTION_ID);
    const { lastFrame, unmount } = render(
      <App
        runtime={runtime}
        initialManifest={indbaseManifestFixture}
        testTraceView={{ trace, tab: "json" }}
      />
    );

    await vi.waitFor(
      () => {
        const frame = lastFrame() ?? "";
        expect(frame).toContain('"action_id"');
        expect(frame).toContain(HISTORY_ACTION_ID);
        expect(frame).toContain("rejected_events");
        expect(frame).toContain("duplicate_seq");
        expect(frame).toContain("active: json");
      },
      WAIT_OPTS
    );

    unmount();
  });
});
