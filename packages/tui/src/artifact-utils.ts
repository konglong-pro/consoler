import type { RenderableBlock } from "@consoler/protocol";

export function artifactBlocksFromList(blocks: RenderableBlock[]): RenderableBlock[] {
  return blocks.filter((block) => block.type === "artifact");
}
