import { mkdirSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { indbaseManifestV1aFixture } from "@consoler/protocol";
import { ConsolerRuntime } from "@consoler/runtime";
import { cleanup, render } from "ink-testing-library";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "../src/app.js";
import { indbaseVariant } from "../src/variants/indbase.js";
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
  stdin.write(text);
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
        initialManifest={indbaseManifestV1aFixture}
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

  it("scopes history to indbase variant commands and excludes other agents", async () => {
    const { lastFrame, unmount } = render(
      <App
        runtime={runtime}
        variant={indbaseVariant}
        initialManifest={indbaseManifestV1aFixture}
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
        initialManifest={indbaseManifestV1aFixture}
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

  it("shows guidance when submitting empty natural language", async () => {
    const { lastFrame, stdin, unmount } = render(
      <App
        runtime={runtime}
        variant={indbaseVariant}
        initialManifest={indbaseManifestV1aFixture}
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
        initialManifest={indbaseManifestV1aFixture}
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
        initialManifest={indbaseManifestV1aFixture}
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

  it("stays on home with no_match message for unrelated text", async () => {
    const { lastFrame, stdin, unmount } = render(
      <App
        runtime={runtime}
        variant={indbaseVariant}
        initialManifest={indbaseManifestV1aFixture}
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
