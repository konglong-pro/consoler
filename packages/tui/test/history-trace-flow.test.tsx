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

describe("TUI history and trace flow", () => {
  let tmpRoot: string;
  let runtime: ConsolerRuntime;

  beforeEach(() => {
    tmpRoot = path.join(os.tmpdir(), `consoler-tui-v1b-${Date.now()}`);
    mkdirSync(path.join(tmpRoot, ".consoler"), { recursive: true });
    runtime = new ConsolerRuntime({ rootDir: tmpRoot });
    seedHistoryFixture(runtime);
  });

  afterEach(() => {
    runtime.store.db.close();
    rmSync(tmpRoot, { recursive: true, force: true });
    cleanup();
  });

  it("navigates Home -> History -> Trace with rejected events", async () => {
    const { lastFrame, stdin, unmount } = render(
      <App runtime={runtime} initialManifest={indbaseManifestFixture} />
    );

    await vi.waitFor(() => {
      expect(lastFrame()).toContain("New Action");
      expect(lastFrame()).toContain("History");
    });

    // ink-select-input: number keys select directly (2 = History)
    stdin.write("2");

    await vi.waitFor(() => {
      expect(lastFrame()).toContain("indbase.doctor");
      expect(lastFrame()).toContain("History (Enter open trace");
    });

    stdin.write("1");

    await vi.waitFor(() => {
      expect(lastFrame()).toContain("Trace");
      expect(lastFrame()).toContain(HISTORY_ACTION_ID);
      expect(lastFrame()).toContain("Rejected events (1)");
      expect(lastFrame()).toContain("duplicate_seq");
      expect(lastFrame()).toContain("# history trace smoke");
    });

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

    await vi.waitFor(() => {
      const frame = lastFrame() ?? "";
      expect(frame).toContain('"action_id"');
      expect(frame).toContain(HISTORY_ACTION_ID);
      expect(frame).toContain("rejected_events");
      expect(frame).toContain("duplicate_seq");
      expect(frame).toContain("active: json");
    });

    unmount();
  });
});
