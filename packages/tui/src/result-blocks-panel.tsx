import { Box, Text } from "ink";

import type { RenderableBlock } from "@consoler/protocol";

import { RenderableBlockView } from "./blocks.js";

export function ResultBlocksPanel({
  blocks,
  title,
  selectedArtifactBlockId
}: {
  blocks: RenderableBlock[];
  title: string;
  selectedArtifactBlockId?: string | null;
}) {
  if (!blocks.length) {
    return null;
  }

  const hasArtifact = blocks.some((block) => block.type === "artifact");

  return (
    <Box marginTop={1} flexDirection="column">
      <Text bold>{title}</Text>
      {hasArtifact ? <Text dimColor>↑↓ select artifact | Enter open</Text> : null}
      {blocks.map((block, index) => (
        <RenderableBlockView
          key={`${block.block_id}-${index}`}
          block={block}
          highlight={block.type === "artifact" && block.block_id === selectedArtifactBlockId}
          openable={block.type === "artifact"}
        />
      ))}
    </Box>
  );
}
