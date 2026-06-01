import { mkdirSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { indbaseManifestV1aFixture } from "@consoler/protocol";
import { ConsolerRuntime, type LlmIntentProvider } from "@consoler/runtime";
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

function assistedProps(
  suggest: LlmIntentProvider["suggest"]
): { enabled: boolean; provider: LlmIntentProvider } {
  return {
    enabled: true,
    provider: { suggest }
  };
}

describe("product TUI assisted intent", () => {
  let tmpRoot: string;
  let runtime: ConsolerRuntime;

  beforeEach(() => {
    tmpRoot = path.join(
      os.tmpdir(),
      `consoler-tui-v3c-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
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

  it("does not call provider when assisted opt-in is disabled", async () => {
    const suggest = vi.fn(async () => ({
      agent_id: "indbase",
      command: "indbase.ingest_file",
      prefilled_args: {
        vault_path: "C:\\vault",
        source_path: "C:\\docs\\a.md"
      }
    }));

    const { lastFrame, stdin, unmount } = render(
      <App
        runtime={runtime}
        variant={indbaseVariant}
        initialManifest={indbaseManifestV1aFixture}
        assistedIntent={{ enabled: false, provider: { suggest } }}
      />
    );

    await vi.waitFor(
      () => expect(lastFrame() ?? "").toContain("Describe your request"),
      WAIT_OPTS
    );

    await typeNlAndSubmit(stdin, lastFrame, "import C:\\docs\\a.md");
    expect(suggest).not.toHaveBeenCalled();

    await vi.waitFor(
      () => expect(lastFrame() ?? "").toContain("Missing required fields: vault_path."),
      WAIT_OPTS
    );

    unmount();
  });

  it("shows assist unavailable notice when opt-in is enabled without provider config", async () => {
    const { lastFrame, stdin, unmount } = render(
      <App
        runtime={runtime}
        variant={indbaseVariant}
        initialManifest={indbaseManifestV1aFixture}
        assistedIntent={{ enabled: true, provider: null }}
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
        expect(frame).toContain("Missing required fields: vault_path.");
        expect(frame).toContain("Assisted intent drafting is unavailable");
        expect(frame).not.toMatch(/api[_-]?key|endpoint|model|127\.0\.0\.1/i);
      },
      WAIT_OPTS
    );

    unmount();
  });

  it("does not call provider for deterministic candidates", async () => {
    const suggest = vi.fn(async () => null);

    const { lastFrame, stdin, unmount } = render(
      <App
        runtime={runtime}
        variant={indbaseVariant}
        initialManifest={indbaseManifestV1aFixture}
        assistedIntent={assistedProps(suggest)}
      />
    );

    await vi.waitFor(
      () => expect(lastFrame() ?? "").toContain("Describe your request"),
      WAIT_OPTS
    );

    await typeNlAndSubmit(stdin, lastFrame, "check vault C:\\vault");
    expect(suggest).not.toHaveBeenCalled();

    await vi.waitFor(
      () => expect(lastFrame() ?? "").toContain("Vault location"),
      WAIT_OPTS
    );

    unmount();
  });

  it("calls provider when assisted is enabled and opens a prefilled form on success", async () => {
    const suggest = vi.fn(async () => ({
      agent_id: "indbase",
      command: "indbase.ingest_file",
      prefilled_args: {
        vault_path: "C:\\vault",
        source_path: "C:\\docs\\a.md"
      }
    }));

    const { lastFrame, stdin, unmount } = render(
      <App
        runtime={runtime}
        variant={indbaseVariant}
        initialManifest={indbaseManifestV1aFixture}
        assistedIntent={assistedProps(suggest)}
      />
    );

    await vi.waitFor(
      () => expect(lastFrame() ?? "").toContain("Describe your request"),
      WAIT_OPTS
    );

    await typeNlAndSubmit(stdin, lastFrame, "import C:\\docs\\a.md");
    expect(suggest).toHaveBeenCalledOnce();

    await vi.waitFor(
      () => {
        const frame = lastFrame() ?? "";
        expect(frame).toContain("Import a file");
        expect(frame).toContain("C:\\vault");
        expect(frame).toContain("C:\\docs\\a.md");
        expect(frame).not.toContain("Describe your request");
      },
      WAIT_OPTS
    );

    unmount();
  });

  it("shows transient assist notice on home fallback and keeps NL input", async () => {
    const suggest = vi.fn(async () => null);

    const { lastFrame, stdin, unmount } = render(
      <App
        runtime={runtime}
        variant={indbaseVariant}
        initialManifest={indbaseManifestV1aFixture}
        assistedIntent={assistedProps(suggest)}
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
        expect(frame).toContain("unavailable");
        expect(frame).toContain("completely unrelated phrase");
        expect(frame).not.toMatch(/api[_-]?key|endpoint|model|127\.0\.0\.1/i);
      },
      WAIT_OPTS
    );

    unmount();
  });

  it("shows drafting busy copy while provider is pending", async () => {
    let resolveSuggest!: (value: {
      agent_id: string;
      command: string;
      prefilled_args: Record<string, unknown>;
    }) => void;
    const suggest = vi.fn(
      () =>
        new Promise<{
          agent_id: string;
          command: string;
          prefilled_args: Record<string, unknown>;
        }>((resolve) => {
          resolveSuggest = resolve;
        })
    );

    const { lastFrame, stdin, unmount } = render(
      <App
        runtime={runtime}
        variant={indbaseVariant}
        initialManifest={indbaseManifestV1aFixture}
        assistedIntent={assistedProps(suggest)}
      />
    );

    await vi.waitFor(
      () => expect(lastFrame() ?? "").toContain("Describe your request"),
      WAIT_OPTS
    );

    await flushStdin();
    for (const char of "import C:\\docs\\a.md") {
      stdin.write(char);
      await new Promise((resolve) => setTimeout(resolve, process.platform === "win32" ? 5 : 1));
    }
    await vi.waitFor(() => expect(lastFrame() ?? "").toContain("import C:\\docs\\a.md"), WAIT_OPTS);
    await flushStdin();
    stdin.write("\r");
    await flushStdin();

    await vi.waitFor(
      () => expect(lastFrame() ?? "").toContain("Drafting request..."),
      WAIT_OPTS
    );

    stdin.write("\r");
    await flushStdin();
    expect(suggest).toHaveBeenCalledOnce();

    resolveSuggest({
      agent_id: "indbase",
      command: "indbase.ingest_file",
      prefilled_args: {
        vault_path: "C:\\vault",
        source_path: "C:\\docs\\a.md"
      }
    });

    await vi.waitFor(
      () => expect(lastFrame() ?? "").toContain("Import a file"),
      WAIT_OPTS
    );

    unmount();
  });
});

describe("dev shell assisted boundary", () => {
  afterEach(() => {
    cleanup();
  });

  it("does not show product NL entry when assisted env would apply", async () => {
    const { lastFrame, unmount } = render(
      <App
        initialManifest={indbaseManifestV1aFixture}
        assistedIntent={{ enabled: true, provider: { suggest: vi.fn() } }}
      />
    );

    await vi.waitFor(
      () => {
        const frame = lastFrame() ?? "";
        expect(frame).toContain("New Action");
        expect(frame).not.toContain("Describe your request");
        expect(frame).not.toContain("Drafting request");
      },
      WAIT_OPTS
    );

    unmount();
  });
});
