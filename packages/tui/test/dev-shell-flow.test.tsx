import { indbaseManifestFixture } from "@consoler/protocol";
import { cleanup, render } from "ink-testing-library";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { App } from "../src/app.js";

const WAIT_OPTS = { timeout: 15_000, interval: 50 } as const;

describe("TUI dev shell", () => {
  afterEach(() => {
    cleanup();
  });

  it("shows generic New Action and command selection path", async () => {
    const { lastFrame, unmount } = render(
      <App initialManifest={indbaseManifestFixture} />
    );

    await vi.waitFor(
      () => {
        const frame = lastFrame() ?? "";
        expect(frame).toContain("New Action");
        expect(frame).toContain("History");
        expect(frame).toContain("consoler TUI");
        expect(frame).not.toContain("Describe your request");
      },
      WAIT_OPTS
    );

    unmount();
  });
});
