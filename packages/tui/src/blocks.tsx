import { Box, Text } from "ink";

import type { ActionEvent, RenderableBlock } from "@consoler/protocol";

export function RenderableBlockView({ block }: { block: RenderableBlock }) {
  const title = block.title ? `[${block.title}] ` : "";
  if (block.type === "markdown") {
    const lines = String(block.content).split("\n");
    return (
      <Box flexDirection="column" marginBottom={1}>
        <Text bold color="cyan">
          {title}markdown
        </Text>
        {lines.map((line, i) => (
          <Text key={`${block.block_id}-md-${i}`}>{line}</Text>
        ))}
      </Box>
    );
  }
  if (block.type === "table") {
    const table = block.content as { columns?: string[]; rows?: unknown[][] };
    const columns = table.columns ?? [];
    const rows = table.rows ?? [];
    return (
      <Box flexDirection="column" marginBottom={1}>
        <Text bold color="cyan">
          {title}table
        </Text>
        <Text dimColor>{columns.join(" | ")}</Text>
        {rows.map((row, i) => (
          <Text key={`${block.block_id}-row-${i}`}>{row.map(String).join(" | ")}</Text>
        ))}
      </Box>
    );
  }
  if (block.type === "json") {
    return (
      <Box flexDirection="column" marginBottom={1}>
        <Text bold color="cyan">
          {title}json
        </Text>
        <Text>{JSON.stringify(block.content, null, 2)}</Text>
      </Box>
    );
  }
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text bold color="red">
        {title}error
      </Text>
      <Text color="red">{JSON.stringify(block.content)}</Text>
    </Box>
  );
}

export function EventLine({ event }: { event: ActionEvent }) {
  const extra =
    event.message ??
    (event.progress !== undefined ? `${Math.round(event.progress * 100)}%` : "");
  return (
    <Text>
      [{event.seq}] {event.type}
      {extra ? `: ${extra}` : ""}
    </Text>
  );
}

export function blocksFromEvents(events: ActionEvent[]): RenderableBlock[] {
  for (let i = events.length - 1; i >= 0; i--) {
    const event = events[i]!;
    if (event.blocks?.length) {
      return event.blocks;
    }
  }
  return [];
}
