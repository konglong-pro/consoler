# Task execution brief: V1d diff and artifact renderable blocks

## Objective

Extend the current `RenderableBlock` protocol with `diff` and `artifact` blocks so side-effecting actions can describe changes and produced references without adding an artifact registry or custom renderer system.

## Scope

- In scope: `packages/protocol`, `sdks/python`, `packages/tui`, `packages/runtime` formatters, `packages/conformance`, focused tests, `CONTEXT.md`, and `AGENTS.md` if validation paths change.
- Out of scope: `E:\indbase` changes, SQLite `artifacts` table, artifact browser, reading artifact files, custom renderers, file tree/form/timeline/entity blocks, natural-language mapping, interaction, and cancel changes.

## Start here

- Read: `docs/adr/0001-agent-protocol-v0-boundaries.md`
- Read: `docs/planning/v1c-conformance-harness.md`
- Protocol types/schema: `packages/protocol/src/types.ts`, `packages/protocol/src/schemas/renderable-block.json`
- Protocol tests: `packages/protocol/test/index.test.ts`
- TUI renderer: `packages/tui/src/blocks.tsx`
- Runtime text formatting: `packages/runtime/src/format-action-read.ts`, `packages/runtime/src/replay.ts`
- Python SDK blocks: `sdks/python/consoler_agent_sdk/blocks.py`
- Conformance fake agent: `packages/conformance/fixtures/fake_agent/`

## Do not touch

- Do not edit `E:\indbase` for V1d.
- Do not add an `artifacts` table or artifact registry.
- Do not make TUI, agentctl, trace, or replay open/read artifact `uri` values.
- Do not replace the current block envelope `{ block_id, type, title?, content }`.
- Do not add dependencies for diff parsing or rendering.
- Do not hand-edit generated/build artifacts: `node_modules/`, `dist/`, `coverage/`, `.consoler/consoler.db`, `.pytest_cache/`, `__pycache__/`.

## Steps

1. Extend protocol block types:
   - Add `diff` and `artifact` to `RenderableBlockType`.
   - Keep the current envelope shape.
   - `diff.content` must be `{ unified_diff: string, language?: string, from_label?: string, to_label?: string }`.
   - `artifact.content` must be `{ uri: string, kind: string, label?: string, metadata?: Record<string, unknown> }`.

2. Tighten block validation:
   - Add minimal per-type content validation in `renderable-block.json`.
   - Preserve current valid markdown/table/json/error behavior.
   - Keep `json.content` unconstrained.
   - Add tests for valid diff/artifact blocks and invalid missing `unified_diff`, `uri`, or `kind`.
   - Keep unsupported block type tests.

3. Add SDK helpers:
   - Add `diff_block(...)` and `artifact_block(...)` to the Python SDK.
   - Export the helpers from `sdks/python/consoler_agent_sdk/__init__.py`.
   - Add Python SDK tests for helper output shape.

4. Render new blocks:
   - TUI diff renderer should show unified diff text and basic colors for `+`, `-`, and `@@` lines.
   - TUI artifact renderer should show `kind`, `uri`, optional label, and metadata summary only.
   - Runtime trace/replay formatters should include useful diff/artifact summaries without reading files.
   - Do not change history listing semantics.

5. Extend conformance:
   - Make the fake agent emit markdown/json/diff/artifact blocks.
   - Add conformance tests proving the new blocks pass validation and survive execute -> history -> trace -> replay.
   - Keep conformance default checks non-executing.

6. Update docs:
   - Add `Diff Block` and `Artifact Block` glossary entries to `CONTEXT.md`.
   - Update `AGENTS.md` only for V1d routing and validation rules.
   - Do not add new common commands unless scripts actually change.

## Validation

- Focused checks:
  - `pnpm --filter @consoler/protocol test`
  - `pnpm --filter @consoler/tui test`
  - `pnpm --filter @consoler/conformance test`
  - `pnpm --filter @consoler/agentctl test`
  - `pnpm test:python-sdk`
  - `pnpm test:conformance`

- Broad checks:
  - `pnpm build`
  - `pnpm typecheck`
  - `pnpm test`

- Optional local smoke:
  - `pnpm agentctl -- test indbase`

## Done means

- `diff` and `artifact` are schema-valid renderable block types.
- Invalid diff/artifact content fails validation.
- Python SDK can emit diff/artifact blocks.
- TUI, trace, and replay display diff/artifact blocks without reading artifact URIs.
- Conformance fake agent proves diff/artifact blocks survive the existing action lifecycle.
- No real indbase agent code or artifact database model is introduced.

## Unknowns

- None expected. If renderer output becomes too large during implementation, prefer focused truncation in UI tests over adding a diff parser dependency.
