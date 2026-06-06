import { Box, Text } from "ink";

import type { ArtifactView } from "@consoler/protocol";
import type { FetchArtifactViewResult } from "@consoler/runtime";

import { artifactKindLabel } from "./variant-display.js";
import type { ConsoleVariantConfig } from "./variant-types.js";
import { RenderableBlockView } from "./blocks.js";

export function ArtifactViewPanel({
  actionId,
  blockId,
  result,
  productMode = false,
  variant
}: {
  actionId: string;
  blockId: string;
  result: FetchArtifactViewResult;
  productMode?: boolean;
  variant?: ConsoleVariantConfig;
}) {
  if (!result.ok) {
    return (
      <Box flexDirection="column">
        <Text bold color="red">
          Artifact retrieval failed
        </Text>
        <Text>action_id: {actionId}</Text>
        <Text>block_id: {blockId}</Text>
        <Text color="red">
          {result.error.code}: {result.error.message}
        </Text>
        {result.retrieval ? (
          <Text dimColor>retrieval_id: {result.retrieval.retrieval_id}</Text>
        ) : null}
      </Box>
    );
  }

  const view: ArtifactView = result.view;
  const meta =
    view.metadata && Object.keys(view.metadata).length > 0
      ? JSON.stringify(view.metadata)
      : null;

  const productTitle = artifactKindLabel(variant, view.kind) ?? "Artifact details";

  return (
    <Box flexDirection="column">
      <Text bold>{productMode ? productTitle : "Artifact view"}</Text>
      {productMode ? (
        view.title ? <Text>{view.title}</Text> : null
      ) : (
        <>
          <Text>action_id: {actionId}</Text>
          <Text>block_id: {blockId}</Text>
          <Text>artifact_uri: {view.artifact_uri}</Text>
          <Text>kind: {view.kind}</Text>
          {view.title ? <Text>title: {view.title}</Text> : null}
          {meta ? <Text dimColor>metadata: {meta}</Text> : null}
        </>
      )}
      {view.truncated ? (
        <Text color="yellow">
          truncated{view.truncation_reason ? `: ${view.truncation_reason}` : ""}
        </Text>
      ) : null}
      <Text dimColor>
        retrieval: {result.retrieval.retrieval_id} ({result.retrieval.status})
      </Text>

      <Box marginTop={1} flexDirection="column">
        <Text bold>View blocks ({view.blocks.length})</Text>
        {view.blocks.map((block, index) => (
          <RenderableBlockView
            key={`${block.block_id}-${index}`}
            block={block}
            productMode={productMode}
            {...(variant ? { variant } : {})}
          />
        ))}
      </Box>
    </Box>
  );
}
