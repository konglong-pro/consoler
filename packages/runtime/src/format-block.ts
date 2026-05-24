import type { RenderableBlock } from "@consoler/protocol";

export function summarizeRenderableBlock(block: RenderableBlock): string {
  const prefix = `${block.type} (${block.block_id})`;
  switch (block.type) {
    case "markdown": {
      const text = String(block.content);
      const first = text.split("\n")[0] ?? "";
      const snippet = first.length > 60 ? `${first.slice(0, 57)}...` : first;
      return `${prefix}: ${snippet || "(empty)"}`;
    }
    case "table": {
      const table = block.content as { columns?: string[]; rows?: unknown[][] };
      const cols = table.columns?.length ?? 0;
      const rows = table.rows?.length ?? 0;
      return `${prefix}: ${cols} columns, ${rows} rows`;
    }
    case "json": {
      const raw = JSON.stringify(block.content);
      const snippet = raw.length > 80 ? `${raw.slice(0, 77)}...` : raw;
      return `${prefix}: ${snippet}`;
    }
    case "error": {
      const err = block.content as { code?: string; message?: string };
      return `${prefix}: ${err.code ?? "error"} — ${err.message ?? ""}`;
    }
    case "diff": {
      const diff = block.content as {
        unified_diff?: string;
        from_label?: string;
        to_label?: string;
      };
      const lines = (diff.unified_diff ?? "").split("\n").filter((line) => line.length > 0);
      const added = lines.filter(
        (line) => line.startsWith("+") && !line.startsWith("+++")
      ).length;
      const removed = lines.filter(
        (line) => line.startsWith("-") && !line.startsWith("---")
      ).length;
      const labels = [diff.from_label, diff.to_label].filter(Boolean).join(" → ");
      const labelPart = labels ? ` ${labels}` : "";
      return `${prefix}:${labelPart} +${added}/-${removed}, ${lines.length} lines`;
    }
    case "artifact": {
      const art = block.content as { uri?: string; kind?: string; label?: string };
      const name = art.label ?? art.uri ?? "?";
      return `${prefix}: ${art.kind ?? "artifact"} ${name}`;
    }
    default:
      return prefix;
  }
}
