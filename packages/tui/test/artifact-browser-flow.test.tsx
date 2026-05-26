import { mkdirSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { indbaseManifestFixture } from "@consoler/protocol";
import { ConsolerRuntime, type FetchArtifactViewResult } from "@consoler/runtime";
import { cleanup, render } from "ink-testing-library";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "../src/app.js";
import { ARTIFACT_TRACE_ACTION_ID, seedArtifactTraceFixture } from "./seed-artifact-trace.js";

const WAIT_OPTS = { timeout: 10_000, interval: 50 } as const;

async function flushStdin(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 50));
}

describe("TUI artifact browser flow", () => {
  let tmpRoot: string;
  let runtime: ConsolerRuntime;
  let fetchArtifactView: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    tmpRoot = path.join(
      os.tmpdir(),
      `consoler-tui-v2b-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    );
    mkdirSync(path.join(tmpRoot, ".consoler"), { recursive: true });
    runtime = new ConsolerRuntime({ rootDir: tmpRoot });
    seedArtifactTraceFixture(runtime);
    fetchArtifactView = vi.fn();
    runtime.fetchArtifactView = fetchArtifactView;
  });

  afterEach(() => {
    runtime.store.db.close();
    rmSync(tmpRoot, { recursive: true, force: true });
    cleanup();
  });

  it("opens artifact view from trace on Enter", async () => {
    const successResult: FetchArtifactViewResult = {
      ok: true,
      retrieval: {
        retrieval_id: "retr_test",
        action_id: ARTIFACT_TRACE_ACTION_ID,
        agent_id: "indbase",
        block_id: "blk_v2b_artifact",
        artifact_uri: "fake://artifacts/conformance-fixture",
        kind: "conformance.fixture",
        status: "succeeded",
        error_code: null,
        error_message: null,
        requested_at: "2026-05-23T11:00:02.000Z",
        completed_at: "2026-05-23T11:00:02.100Z"
      },
      view: {
        artifact_uri: "fake://artifacts/conformance-fixture",
        kind: "conformance.fixture",
        title: "Fixture view",
        blocks: [
          {
            block_id: "blk_view_md",
            type: "markdown",
            content: "# opened artifact"
          }
        ]
      }
    };
    fetchArtifactView.mockResolvedValue(successResult);

    const trace = runtime.getActionTrace(ARTIFACT_TRACE_ACTION_ID);
    const { lastFrame, stdin, unmount } = render(
      <App
        runtime={runtime}
        initialManifest={indbaseManifestFixture}
        testTraceView={{ trace }}
      />
    );

    await vi.waitFor(
      () => {
        const frame = lastFrame() ?? "";
        expect(frame).toContain("artifact (Enter)");
        expect(frame).toContain("fake://artifacts/conformance-fixture");
      },
      WAIT_OPTS
    );

    stdin.write("\r");
    await flushStdin();

    await vi.waitFor(
      () => {
        const frame = lastFrame() ?? "";
        expect(fetchArtifactView).toHaveBeenCalledWith(
          ARTIFACT_TRACE_ACTION_ID,
          "blk_v2b_artifact"
        );
        expect(frame).toContain("Artifact view");
        expect(frame).toContain("Fixture view");
        expect(frame).toContain("# opened artifact");
      },
      WAIT_OPTS
    );

    unmount();
  });

  it("shows retrieval failure without changing trace action status", async () => {
    fetchArtifactView.mockResolvedValue({
      ok: false,
      error: { code: "agent_error", message: "agent unavailable" }
    });

    const trace = runtime.getActionTrace(ARTIFACT_TRACE_ACTION_ID);
    const terminalBefore = trace.terminal_state;
    const { lastFrame, stdin, unmount } = render(
      <App
        runtime={runtime}
        initialManifest={indbaseManifestFixture}
        testTraceView={{ trace }}
      />
    );

    await vi.waitFor(() => expect(lastFrame() ?? "").toContain("artifact (Enter)"), WAIT_OPTS);

    stdin.write("\r");
    await flushStdin();

    await vi.waitFor(
      () => {
        const frame = lastFrame() ?? "";
        expect(frame).toContain("Artifact retrieval failed");
        expect(frame).toContain("agent unavailable");
      },
      WAIT_OPTS
    );

    const traceAfter = runtime.getActionTrace(ARTIFACT_TRACE_ACTION_ID);
    expect(traceAfter.terminal_state).toBe(terminalBefore);

    unmount();
  });

  it("returns to trace with Esc from artifact view", async () => {
    fetchArtifactView.mockResolvedValue({
      ok: true,
      retrieval: {
        retrieval_id: "retr_test",
        action_id: ARTIFACT_TRACE_ACTION_ID,
        agent_id: "indbase",
        block_id: "blk_v2b_artifact",
        artifact_uri: "fake://artifacts/conformance-fixture",
        kind: "conformance.fixture",
        status: "succeeded",
        error_code: null,
        error_message: null,
        requested_at: "2026-05-23T11:00:02.000Z",
        completed_at: "2026-05-23T11:00:02.100Z"
      },
      view: {
        artifact_uri: "fake://artifacts/conformance-fixture",
        kind: "conformance.fixture",
        blocks: []
      }
    });

    const trace = runtime.getActionTrace(ARTIFACT_TRACE_ACTION_ID);
    const { lastFrame, stdin, unmount } = render(
      <App
        runtime={runtime}
        initialManifest={indbaseManifestFixture}
        testTraceView={{ trace }}
      />
    );

    await vi.waitFor(() => expect(lastFrame() ?? "").toContain("artifact (Enter)"), WAIT_OPTS);
    stdin.write("\r");
    await flushStdin();
    await vi.waitFor(() => expect(lastFrame() ?? "").toContain("Artifact view"), WAIT_OPTS);

    stdin.write("\u001b");
    await flushStdin();

    await vi.waitFor(
      () => {
        const frame = lastFrame() ?? "";
        expect(frame).toContain("Trace —");
        expect(frame).not.toContain("Artifact view");
      },
      WAIT_OPTS
    );

    unmount();
  });

  it("trace JSON tab shows retrieval summaries only, not view content", async () => {
    runtime.store.insertArtifactRetrieval({
      retrieval_id: "retr_json",
      action_id: ARTIFACT_TRACE_ACTION_ID,
      agent_id: "indbase",
      block_id: "blk_v2b_artifact",
      artifact_uri: "fake://artifacts/conformance-fixture",
      kind: "conformance.fixture",
      status: "succeeded",
      error_code: null,
      error_message: null,
      requested_at: "2026-05-23T11:00:03.000Z",
      completed_at: "2026-05-23T11:00:03.100Z"
    });

    const trace = runtime.getActionTrace(ARTIFACT_TRACE_ACTION_ID);
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
        expect(frame).toContain("artifact_retrievals");
        expect(frame).toContain("retr_json");
        expect(frame).not.toContain("# opened artifact");
      },
      WAIT_OPTS
    );

    unmount();
  });
});
