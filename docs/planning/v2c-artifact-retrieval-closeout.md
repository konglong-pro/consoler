# Task execution brief: V2c artifact retrieval closeout

## Objective

Close the V2 artifact retrieval/browser phase without adding new product capability. Fold real `indbase` artifact retrieval into the local-only smoke gate, document the V2 acceptance surface, and leave a repeatable manual TUI smoke path.

## Scope

- In scope: `scripts/test-real-indbase-smoke.mjs`, `docs/testing/real-indbase-smokes.md`, a new V2 closeout/testing doc, minimal `AGENTS.md` routing updates, and documentation of a manual TUI smoke.
- Out of scope: protocol/schema changes, runtime retrieval semantics, TUI feature changes, `agentctl artifact-view` behavior changes, default CI dependency on `E:\indbase`, artifact content storage/cache, downloads, media rendering, pagination, global artifact search, arbitrary URI fetch, and natural language mapping.

## Start here

- Read: `docs/planning/v2a-artifact-retrieval-browser.md`
- Read: `docs/planning/v2b-artifact-browser-real-adoption.md`
- Read: `docs/testing/v2-release-gate.md`
- Read: `docs/testing/real-indbase-smokes.md`
- Main code: `scripts/test-real-indbase-smoke.mjs`
- Related smoke: `scripts/test-artifact-retrieval-smoke.mjs`
- Real-agent tests: `E:\indbase\tests\test_indbase_agent.py`

## Do not touch

- Do not edit `packages/protocol`, `packages/runtime`, `packages/tui`, `packages/agentctl`, `packages/conformance`, or `sdks/python` unless a closeout validation run exposes a real regression.
- Do not edit `E:\indbase` implementation for this closeout unless the local smoke exposes an existing integration bug.
- Do not add real `E:\indbase` to default GitHub CI.
- Do not store fetched `ArtifactView` content in SQLite, replay, trace, or generated docs.
- Do not add feature work under the label of closeout.

## Steps

1. Extend the local-only real smoke.
   - After the normal `indbase.ingest_file` run succeeds, read its trace and collect accepted result blocks with `type: "artifact"`.
   - For each supported real block kind (`indbase.ingest_run`, `indbase.document`, `indbase.document_revision`) call `agentctl artifact-view <action_id> <block_id> --json` against the same temp `CONSOLER_ROOT`.
   - Assert `ok: true`, succeeded retrieval status, non-empty `view.blocks`, and no nested artifact blocks.
   - Re-read trace and replay after retrieval; assert fetched view content is not persisted there.
   - When `CONSOLER_KEEP_REAL_INDBASE_SMOKE=1`, print the temp root, action id, and artifact block ids for manual TUI inspection.

2. Add V2 artifact retrieval closeout documentation.
   - Create `docs/testing/v2-artifact-retrieval-closeout.md`.
   - Summarize the frozen V2 artifact retrieval surface: protocol capability, runtime gating/audit, SDK/fake agent, CLI, TUI, real `indbase`, CI, and local-only gates.
   - Explicitly list deferred work: NL mapping, downloads, media/PDF/image rendering, pagination, global artifact library/search, arbitrary URI fetch, and artifact content cache/storage.
   - Record that real-agent coverage remains local-only unless a future provisioned runner plan changes that.

3. Update local smoke docs.
   - Update `docs/testing/real-indbase-smokes.md` coverage table to include real `agentctl artifact-view` retrieval for `indbase://...` artifact blocks.
   - Add the manual TUI smoke recipe:
     `CONSOLER_KEEP_REAL_INDBASE_SMOKE=1 pnpm test:real-indbase-smoke`, then run `pnpm tui --` with the printed `CONSOLER_ROOT`, open History -> Trace -> artifact block -> Enter, and Esc back.

4. Keep entry docs compact.
   - Update `AGENTS.md` only with the V2c routing, validation rule, and deep context entry.
   - Do not copy the closeout evidence or long smoke procedure into `AGENTS.md`.

## Validation

Focused checks:

- `pnpm test:real-indbase-smoke`
- `pnpm test:artifact-retrieval-smoke`
- From `E:\indbase`: `uv run pytest tests/test_indbase_agent.py`

Broad checks:

- `pnpm test:v2-release-gate`
- `pnpm typecheck`
- `pnpm build`
- `pnpm test`
- `git diff --check`

Manual check:

- Run the documented TUI smoke with `CONSOLER_KEEP_REAL_INDBASE_SMOKE=1`, or explicitly report it was skipped and why.

## Done means

- Real `indbase` local smoke proves `agentctl artifact-view` against disposable real artifact blocks.
- V2 closeout docs clearly separate default fake-agent CI from local-only real-agent validation.
- Manual TUI smoke is documented and reproducible from smoke output.
- `AGENTS.md` routes future closeout/fix work to the right docs without becoming a long status report.
- No new artifact retrieval/browser feature scope is introduced.

## Unknowns

- None expected. If a real artifact kind is absent in a disposable run, treat it as a fixture/setup issue and document which kinds were present instead of inventing synthetic production data.
