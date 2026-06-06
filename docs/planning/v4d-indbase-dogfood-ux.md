# Task execution brief: V4d Indbase Dogfood UX

Make the indbase Console Variant usable for the full Source Trust Loop after the real indbase adapter and read-only views are stable.

## Objective

`pnpm tui:indbase --` should guide a user through one practical dogfood walkthrough:

```text
check vault -> import or use prepared source state -> search trusted sources
-> open document artifact -> inspect review/task/error/doctor views
-> return through history/trace
```

This is a consoler-owned product-variant UX phase. It should not add indbase business logic or protocol/runtime capability.

## Scope

In scope:

- `packages/tui` indbase variant action surface, ordering, grouping, labels, help, and artifact labels
- session-local `vault_path` prefill for indbase variant forms
- artifact open/back UX polish using existing `artifact_view`
- TUI tests for variant workflow, form defaults, artifact open/back, variant-scoped history/trace, and copy hygiene
- a root gate script and package script such as `pnpm test:v4d-indbase-dogfood-ux`
- local-only real indbase smoke updates if needed
- docs and `AGENTS.md` route updates

Out of scope:

- consoler protocol schemas, runtime action lifecycle, store schema, replay semantics, transport, or Python SDK changes
- `E:\indbase` implementation from this repo
- new indbase commands, review/category/tag mutation UI, doctor repair, generated answers, retrieval packages, embeddings, or `ask`
- Web UI, full vault browser, source file browser, artifact gallery, arbitrary URI fetch, or revision browser
- natural-language or intent drafting as a completion criterion
- LLM-assisted UX, provider setup, chat, multi-action workflows, or model calls
- default CI dependency on real `E:\indbase`, private vaults, real swallow, or network access

## Start Here

Read:

- `CONTEXT.md`
- `docs/adr/0006-product-variants-keep-agent-specific-ui-boundaries.md`
- `docs/planning/v4b-indbase-source-trust-probe.md`
- `docs/planning/v4c-indbase-probe-stabilization.md`
- `E:\indbase\docs\planning\v0.3.2.3c-consoler-variant-dogfood-ux.md`
- `E:\indbase\docs\planning\v0.3.2.3b-consoler-read-only-views.md`

Primary files:

- `packages/tui/src/variants/indbase.ts`
- `packages/tui/src/variant-types.ts`
- `packages/tui/src/app.tsx`
- `packages/tui/src/variant-display.ts`
- `packages/tui/src/result-blocks-panel.tsx`
- `packages/tui/src/artifact-view-panel.tsx`
- `packages/tui/test/indbase-variant-flow.test.tsx`
- `packages/tui/test/variant-contract.test.ts`
- `packages/tui/test/artifact-browser-flow.test.tsx`
- `packages/tui/test/real-indbase-product-tui-smoke.test.tsx`
- `scripts/test-real-indbase-smoke.mjs`
- `package.json`

Inspect before editing:

```powershell
rg -n "indbaseVariant|ConsoleVariantConfig|artifact_view|vault_path|tui:indbase" packages/tui scripts docs
```

## Current Gap

The current indbase variant exposes only:

```text
indbase.doctor
indbase.ingest_file
```

The full Source Trust Loop now exists in the real adapter:

```text
indbase.doctor
indbase.ingest_file
indbase.search_sources
indbase.doc_show
indbase.review_list
indbase.review_show
indbase.task_list
indbase.task_show
indbase.error_list
indbase.error_show
```

The variant also has visible copy hygiene risk: the indbase variant file has had mojibake in Chinese hints. Fix only touched variant copy; do not start a repository-wide localization rewrite.

## Do Not Touch

- Do not edit `packages/protocol` schemas or validators. If fixture coverage is needed, prefer a TUI-local fixture; only update exported protocol fixtures if the existing test convention makes that clearly smaller.
- Do not edit `packages/runtime` lifecycle, approval, history, trace, replay, or store schema unless a focused TUI bug proves a generic runtime defect.
- Do not edit `sdks/python`.
- Do not edit `E:\indbase` from this repository.
- Do not commit private vaults, generated smoke vaults, `.consoler/consoler.db`, `node_modules/`, `dist/`, `coverage/`, or local path secrets.
- Do not add a new wizard, artifact browser, vault browser, direct execution path, or arbitrary artifact URI fetch.
- Do not make NL/intent drafting the primary 3c path.

## Steps

1. Update the indbase variant action surface.
   - Add all ten Source Trust Loop commands to `allowedCommands`.
   - Add product actions for search, document show, review list/show, task list/show, and error list/show.
   - Order actions around the single-source trust walkthrough instead of alphabetical command order.
   - Preserve `indbase.ingest_file` as the only write action.

2. Add minimal variant-only UX configuration if needed.
   - Add grouping or section labels only to `ConsoleVariantConfig`, not to protocol or manifests.
   - Add field display labels/help for the new command args.
   - Add artifact kind labels for `indbase.review_item`, `indbase.task`, `indbase.error`, and `indbase.doctor_report`.
   - Keep product config checked in and deterministic.

3. Add session-local vault context.
   - Remember the last successful `vault_path` within the current TUI session.
   - Prefill later indbase forms that have a `vault_path` field.
   - Let users override the prefilled value.
   - Do not persist to SQLite, config files, history-derived defaults, or cwd inference.

4. Polish composed UX surfaces.
   - Use existing home, schema form, timeline, result blocks, artifact view, history, and trace.
   - Improve empty-state or footer copy only where it helps the walkthrough.
   - Do not create a Source Trust wizard or product-specific runtime state machine.

5. Tighten artifact open/back behavior.
   - Ensure artifact blocks are discoverably openable in result and trace surfaces.
   - `Enter` opens the selected artifact view.
   - `Esc` returns to the originating finished timeline or trace.
   - Product labels should lead; raw URI and block ids remain audit details.
   - Confirm fetched artifact view content is not stored in replay/history.

6. Repair indbase variant copy hygiene.
   - Replace mojibake hints with valid UTF-8 text.
   - Add a focused test that rejects known mojibake fragments in `packages/tui/src/variants/indbase.ts` or loaded variant strings.
   - Do not rewrite unrelated repository copy.

7. Add focused TUI and variant tests.
   - Variant contract: ten allowed commands and product actions match the fixture or discovered manifest.
   - Action order: walkthrough order is stable.
   - Labels: product labels exist for every action and new artifact kind.
   - Vault context: successful vault action pre-fills later forms and can be overridden.
   - Artifact open/back: result/trace artifact opens and returns correctly.
   - History/trace: product mode remains variant-scoped.
   - NL: existing variant-scoped NL behavior is not broken, but NL is not the gate's main path.

8. Add a root gate.
   - Add `scripts/test-v4d-indbase-dogfood-ux.mjs`.
   - Add `test:v4d-indbase-dogfood-ux` to `package.json`.
   - Gate should use fake/injected TUI/runtime coverage by default.
   - Gate may call `pnpm test:real-indbase-smoke` only as local-only or explicitly environment-gated coverage.

9. Update docs.
   - Update `docs/testing/real-indbase-smokes.md` only if smoke coverage or manual TUI recipe changes.
   - Update `AGENTS.md` route entries.
   - Do not update README unless product quick-start behavior changes.

## Validation

Focused checks:

```powershell
pnpm --filter @consoler/tui test
pnpm test:v4d-indbase-dogfood-ux
pnpm typecheck
pnpm build
git diff --check
```

Run if smoke scripts or real-agent coverage changes:

```powershell
pnpm test:real-indbase-smoke
```

Run if protocol fixtures are touched:

```powershell
pnpm --filter @consoler/protocol test
```

Cross-repo coordination checks:

```powershell
cd E:\indbase
uv run python -m pytest tests/test_indbase_agent.py tests/test_indbase_agent_readonly_views.py -q
uv run python scripts/v0323a_probe_stabilization_release_gate.py
uv run python scripts/v0323b_consoler_readonly_views_release_gate.py
```

Do not report real indbase smoke as passed if it skipped for missing local setup. Say exactly why it skipped.

## Done Means

- `pnpm tui:indbase --` exposes the ten-command Source Trust Loop action surface.
- The product home and action order guide the single-source trust walkthrough.
- `vault_path` prefill is session-local, editable, and not persisted.
- Artifact blocks can be opened and closed through the existing artifact view surface.
- Product labels are present for document, review item, task, error, and doctor report artifacts.
- Variant-scoped history/trace still works.
- Copy hygiene tests cover the indbase variant hints.
- `pnpm test:v4d-indbase-dogfood-ux` passes.
- `pnpm --filter @consoler/tui test`, `pnpm typecheck`, `pnpm build`, and `git diff --check` pass.
- Real indbase smoke passes or skips with a clear environment reason.
- No protocol/runtime/store/schema, Python SDK, Web UI, full vault browser, NL/LLM, or indbase core changes were required.

## Unknowns

- Whether the smallest fixture path is a TUI-local indbase Source Trust manifest fixture or updating the exported protocol fixture.
- Whether session-local vault context can live entirely inside `App` state or needs a small variant helper.
- Whether artifact labels in the current panel are enough, or whether the header needs a small variant-display helper.
- Whether the real smoke should cover all 3b artifact kinds immediately or focus on the main walkthrough and leave exhaustive artifact kind coverage to indbase tests.
