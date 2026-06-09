---
doc_type: phase_plan
phase_id: v2b-artifact-browser-real-adoption
title: Task execution brief: V2b artifact browser and real-agent adoption
status: completed
canonical: false
read_by_default: false
superseded_by: null
---

# Task execution brief: V2b artifact browser and real-agent adoption

## Objective

Finish the user-facing artifact retrieval loop by wiring the existing generic runtime retrieval API into the Ink TUI and proving real `indbase` artifact retrieval locally. Consoler remains a generic agent operations console; `indbase` alone interprets `indbase://...` URIs.

## Scope

- In scope: `packages/tui`, focused TUI tests, `E:\indbase\src\indbase_agent\adapter.py`, focused `E:\indbase` tests, small consoler docs/AGENTS updates, and local-only real retrieval smoke notes.
- Out of scope: protocol changes, artifact content cache/storage, replay fetching, arbitrary URI fetch, preview artifact retrieval, nested artifact browsing, downloads, media/PDF/image rendering, pagination, global artifact library/search, default CI dependency on `E:\indbase`, and natural language intent mapping.

## Start here

- Read: `docs/planning/archive/consoler-v2/v2a-artifact-retrieval-browser.md`
- Read: `docs/planning/archive/consoler-v2/v2a-artifact-retrieval-cli-loop.md`
- Read: `docs/adr/0002-agent-owned-artifact-retrieval.md`
- TUI: `packages/tui/src/app.tsx`, `packages/tui/src/blocks.tsx`, `packages/tui/src/trace-panel.tsx`
- TUI tests: `packages/tui/test/history-trace-flow.test.tsx`, `packages/tui/test/app-flow.test.tsx`, `packages/tui/test/seed-history.ts`
- Runtime API: `packages/runtime/src/runtime.ts`, `packages/runtime/src/artifact-retrieval.ts`
- Real agent: `E:\indbase\src\indbase_agent\adapter.py`, `E:\indbase\tests\test_indbase_agent.py`

## Do not touch

- Do not edit `packages/protocol` unless an existing contract test proves the V2a contract is wrong.
- Do not add consoler code that parses `indbase://` paths or reads indbase storage directly.
- Do not fetch arbitrary user-entered URIs; all retrieval must flow through `fetchArtifactView(action_id, block_id)`.
- Do not fetch rejected-event artifacts, preview artifacts, or replay artifacts.
- Do not store retrieved `ArtifactView` content in SQLite or the action event stream.
- Do not add a global artifact browser, cross-action artifact list, search, favorites, or download UI.
- Do not make default CI require `E:\indbase`, real vaults, or local-only paths.

## Steps

1. Add a TUI artifact selection path.
   - Surface accepted `type: "artifact"` result blocks in finished actions and trace result blocks as openable items.
   - Opening must be an explicit user action and must call `runtime.fetchArtifactView(action_id, block_id)`.
   - Non-artifact blocks should keep the existing passive rendering behavior.

2. Add a focused TUI artifact view phase.
   - Show action id, block id, artifact URI, kind, title, metadata, retrieval id/status, and truncation fields when present.
   - Render `ArtifactView.blocks` through the existing block renderer.
   - Show runtime error code/message on failure without changing action status, history status, or replay state.
   - `Esc` returns to the source view, either finished action result or trace.

3. Keep trace and replay boundaries intact.
   - Trace may show retrieval attempt summaries from runtime state.
   - Trace JSON must not include retrieved artifact content unless it came from the live TUI state for the current view.
   - Replay must remain accepted-events-only and must not trigger retrieval.

4. Implement real `indbase` artifact retrieval.
   - Add `artifact_retrieval` capability for `indbase` manifest output with `uri_schemes: ["indbase"]` and current ingest artifact kinds.
   - Implement `get_artifact_view` in `E:\indbase\src\indbase_agent\adapter.py`.
   - Support existing artifact block kinds from `indbase.ingest_file`: `indbase.ingest_run`, `indbase.document`, and `indbase.document_revision`.
   - Return bounded `ArtifactView` payloads using non-artifact blocks only.
   - Keep all indbase URI parsing and vault/database reads inside `E:\indbase`.

5. Add focused tests.
   - TUI tests should use an injected runtime or fake `fetchArtifactView` path; do not spawn a real agent.
   - Seed history/trace fixtures with an artifact block and assert open, success render, failure render, and back navigation.
   - Real `indbase` tests should cover each supported kind plus unknown URI/kind failures.
   - Avoid sleeps or timing-sensitive real TUI tests.

6. Update minimal docs only if implementation introduces new stable routing.
   - Keep `AGENTS.md` as routing and validation guidance.
   - Do not expand `CONTEXT.md` unless a stable new glossary distinction is required.

## Validation

Focused consoler checks:

- `pnpm --filter @consoler/tui test`
- `pnpm --filter @consoler/runtime test`
- `pnpm --filter @consoler/agentctl test`
- `pnpm --filter @consoler/conformance test`
- `pnpm test:python-sdk`
- `pnpm test:conformance`

Focused real-agent check:

- From `E:\indbase`: `uv run pytest tests/test_indbase_agent.py`

Broad consoler checks:

- `pnpm typecheck`
- `pnpm build`
- `pnpm test`
- `git diff --check`

Local-only smoke:

- Use a temp `CONSOLER_ROOT` and disposable vault.
- Run a real `indbase.ingest_file` action that emits an `indbase://...` artifact block.
- Run `pnpm agentctl -- artifact-view <action_id> <block_id> --json` against the same temp root.
- Optionally run `pnpm tui --` manually against the same temp root and open the artifact from trace.

## Done means

- TUI can open an accepted artifact block and render a returned `ArtifactView`.
- TUI failures are visible but do not alter action, history, trace, or replay semantics.
- Replay never fetches artifact content.
- Real `indbase` can return bounded artifact views for current ingest artifact kinds.
- Consoler remains business-agnostic; only `E:\indbase` parses `indbase://...`.
- Default automated checks still use fake-agent paths and do not require `E:\indbase`.

## Implementation notes

- TUI uses phase `artifact_view`; trace/finished navigate artifact blocks with ↑↓ and open with Enter; Esc returns to the source screen.
- Real `indbase` stores `vault_path` in artifact block metadata during ingest execution; `get_artifact_view` reads vault SQLite read-only inside `E:\indbase`.

## Unknowns

- Exact TUI keybinding can follow the least disruptive existing Ink navigation pattern.
- Real `indbase` view payload fields should be chosen from existing read-only adapter/core data, not by adding new durable indbase schema.
