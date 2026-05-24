import { describe, expect, it } from "vitest";

import type { RenderableBlock } from "@consoler/protocol";

import { summarizeRenderableBlock } from "../src/format-block.js";

describe("summarizeRenderableBlock", () => {
  it("summarizes diff line counts and labels", () => {
    const block: RenderableBlock = {
      block_id: "blk_diff",
      type: "diff",
      content: {
        unified_diff: "--- a\n+++ b\n@@\n-old\n+new\n",
        from_label: "before",
        to_label: "after"
      }
    };
    const summary = summarizeRenderableBlock(block);
    expect(summary).toContain("diff (blk_diff)");
    expect(summary).toContain("before → after");
    expect(summary).toContain("+1/-1");
  });

  it("summarizes artifact kind and label without opening uri", () => {
    const block: RenderableBlock = {
      block_id: "blk_art",
      type: "artifact",
      content: {
        uri: "file:///secret/path",
        kind: "text/plain",
        label: "output.txt"
      }
    };
    const summary = summarizeRenderableBlock(block);
    expect(summary).toContain("artifact (blk_art)");
    expect(summary).toContain("text/plain output.txt");
    expect(summary).not.toContain("secret");
  });
});
