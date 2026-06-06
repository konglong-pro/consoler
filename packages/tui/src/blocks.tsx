import { Box, Text } from "ink";

import type { ActionEvent, RenderableBlock } from "@consoler/protocol";

import { artifactKindLabel } from "./variant-display.js";
import type { ConsoleVariantConfig } from "./variant-types.js";

export function diffLineColor(line: string): "cyan" | "green" | "red" | undefined {
  if (line.startsWith("@@")) {
    return "cyan";
  }
  if (line.startsWith("+") && !line.startsWith("+++")) {
    return "green";
  }
  if (line.startsWith("-") && !line.startsWith("---")) {
    return "red";
  }
  return undefined;
}

export function RenderableBlockView({
  block,
  highlight = false,
  openable = false,
  productMode = false,
  variant
}: {
  block: RenderableBlock;
  highlight?: boolean;
  openable?: boolean;
  productMode?: boolean;
  variant?: ConsoleVariantConfig;
}) {
  const title = block.title ? `[${block.title}] ` : "";
  const prefix = openable ? (highlight ? "> " : "  ") : "";
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
  if (block.type === "diff") {
    const diff = block.content as {
      unified_diff?: string;
      from_label?: string;
      to_label?: string;
      language?: string;
    };
    const header = [diff.from_label, diff.to_label].filter(Boolean).join(" → ");
    const lines = (diff.unified_diff ?? "").split("\n");
    return (
      <Box flexDirection="column" marginBottom={1}>
        <Text bold color="cyan">
          {title}diff{diff.language ? ` (${diff.language})` : ""}
        </Text>
        {header ? <Text dimColor>{header}</Text> : null}
        {lines.map((line, i) => {
          const color = diffLineColor(line);
          return (
            <Text key={`${block.block_id}-diff-${i}`} {...(color ? { color } : {})}>
              {line}
            </Text>
          );
        })}
      </Box>
    );
  }
  if (block.type === "artifact") {
    const art = block.content as {
      uri?: string;
      kind?: string;
      label?: string;
      metadata?: Record<string, unknown>;
    };
    const meta =
      art.metadata && Object.keys(art.metadata).length > 0
        ? JSON.stringify(art.metadata)
        : null;
    const productTitle = artifactKindLabel(variant, art.kind) ?? (art.kind ?? "Artifact");
    return (
      <Box flexDirection="column" marginBottom={1}>
        <Text bold color={highlight ? "green" : "cyan"}>
          {prefix}
          {title}
          {productMode ? productTitle : `artifact${openable ? " (Enter)" : ""}`}
          {productMode && openable ? " (Enter)" : null}
        </Text>
        {productMode ? (
          <>
            {art.label ? <Text>{art.label}</Text> : null}
            {art.kind ? <Text dimColor>kind: {art.kind}</Text> : null}
          </>
        ) : (
          <>
            {highlight ? (
              <Text color="green">
                kind={art.kind ?? "?"} uri={art.uri ?? "?"}
              </Text>
            ) : (
              <Text>
                kind={art.kind ?? "?"} uri={art.uri ?? "?"}
              </Text>
            )}
            {art.label ? <Text>label={art.label}</Text> : null}
          </>
        )}
        {!productMode && meta ? <Text dimColor>metadata={meta}</Text> : null}
      </Box>
    );
  }
  if (block.type === "error") {
    return (
      <Box flexDirection="column" marginBottom={1}>
        <Text bold color="red">
          {title}error
        </Text>
        <Text color="red">{JSON.stringify(block.content)}</Text>
      </Box>
    );
  }
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text bold color="red">
        {title}unknown ({block.type})
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
