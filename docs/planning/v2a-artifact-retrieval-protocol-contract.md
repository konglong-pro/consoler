# Task execution brief: V2a artifact retrieval protocol contract

## Objective

Define the protocol-only contract for V2a artifact retrieval: manifest capability discovery plus `ArtifactView` type/schema/validator. Do not implement runtime retrieval, CLI, TUI, SDK, conformance fake, or real `indbase` support in this task.

## Scope

- In scope: `packages/protocol` types, JSON Schemas, validators, exports, and focused protocol tests.
- Out of scope: runtime `fetchArtifactView`, `agent.get_artifact_view` transport calls, database audit tables, `agentctl artifact-view`, TUI artifact browser, Python SDK dispatch, conformance fake, real `E:\indbase`, natural language mapping, and protocol version bumping.

## Start here

- Read: `docs/planning/v2a-artifact-retrieval-browser.md`
- Read: `docs/adr/0002-agent-owned-artifact-retrieval.md`
- Types: `packages/protocol/src/types.ts`
- Schemas: `packages/protocol/src/schemas/manifest.json`, `packages/protocol/src/schemas/renderable-block.json`
- Validators/exports: `packages/protocol/src/validators.ts`, `packages/protocol/src/index.ts`
- Tests: `packages/protocol/test/index.test.ts`

## Do not touch

- Do not edit `packages/runtime`, `packages/agentctl`, `packages/tui`, `packages/conformance`, `sdks/python`, or `E:\indbase`.
- Do not change existing manifest fixtures unless a focused protocol test requires a dedicated new fixture.
- Do not change `protocol_version`; existing `"0"` manifests must remain valid.
- Do not add artifact content storage, retrieval audit tables, RPC calls, or UI behavior.
- Do not allow `ArtifactView.blocks` to contain nested `type: "artifact"` blocks.

## Steps

1. Add optional `artifact_retrieval` to `AgentManifest`.
   - Shape: `{ uri_schemes: string[]; kinds: string[] }`.
   - Keep it optional so existing manifests still validate.
   - Schema should require both arrays when the capability is present, use non-empty string items, reject unknown capability fields, and reject empty arrays.

2. Add `ArtifactView`.
   - Type shape: `{ artifact_uri: string; kind: string; title?: string; metadata?: Record<string, unknown>; truncated?: boolean; truncation_reason?: string; blocks: RenderableBlock[] }`.
   - Add a JSON Schema for the response shape.
   - Reuse the existing renderable block schema where practical, but ensure artifact blocks are rejected inside `ArtifactView.blocks`.

3. Wire validation exports.
   - Register the new schema in `validators.ts`.
   - Export `validateArtifactView(data: unknown): ValidationResult<ArtifactView>`.
   - Keep existing `validateManifest`, `validateActionEvent`, and `validateRenderableBlock` behavior unchanged.

4. Add focused protocol tests.
   - Existing manifest fixtures without `artifact_retrieval` still pass.
   - Valid capability passes.
   - Malformed capability fails for missing fields, empty arrays, non-string entries, and unknown fields.
   - Valid `ArtifactView` passes with markdown/table/json/error/diff blocks.
   - Missing `artifact_uri`, `kind`, or `blocks` fails.
   - Nested artifact block in `ArtifactView.blocks` fails.

## Validation

- Focused checks:
  - `pnpm --filter @consoler/protocol test`
  - `pnpm --filter @consoler/protocol typecheck`
- Broad checks:
  - `pnpm typecheck`
  - `git diff --check`

## Done means

- Protocol package exports the optional manifest capability and `ArtifactView` validator.
- Old manifest fixtures remain valid without capability changes.
- Invalid capabilities and nested artifact view blocks are rejected by tests.
- No non-protocol packages or real agent code were edited.

## Unknowns

- None expected. If schema reuse becomes awkward, prefer a small dedicated `artifact-view.json` schema over broad changes to `renderable-block.json`.
