# Task execution brief: V1e real indbase renderable blocks

## Objective

Connect the V1d `diff` and `artifact` renderable block protocol to the first real agent command: `indbase.ingest_file` in `E:\indbase`. The command should keep its existing markdown/table/json result blocks and append execution-only diff/artifact blocks that describe the ingest outcome without adding consoler artifact storage.

## Scope

- In scope: `E:\indbase\src\indbase_agent\adapter.py`, `E:\indbase\tests\test_indbase_agent.py`, this consoler planning doc, and `AGENTS.md` routing.
- Out of scope: consoler protocol/runtime/TUI changes unless current V1d contracts fail, preview report shape changes, SQLite `artifacts` table, artifact browser, reading artifact URIs, NL mapping, interaction, cancel, folder ingest, media ingest, URL/archive ingest.

## Start here

- Read: `docs/planning/v1d-diff-artifact-renderable-blocks.md`
- Read: `docs/planning/v1a-indbase-ingest-file-side-effect-tracer.md`
- Real agent code: `E:\indbase\src\indbase_agent\adapter.py`
- Real agent tests: `E:\indbase\tests\test_indbase_agent.py`
- SDK helpers already available: `sdks/python/consoler_agent_sdk/blocks.py`

## Do not touch

- Do not add or modify consoler protocol schemas for V1e unless an existing schema rejects valid V1d blocks.
- Do not add consoler artifact persistence or artifact browsing.
- Do not make TUI, trace, replay, or agentctl open/read artifact `uri` values.
- Do not use `file://` or absolute-path artifact URIs for this stage.
- Do not mutate committed fixture vaults for smoke tests; use a temporary disposable vault/args file.
- Do not edit unrelated `E:\indbase` business logic or generated/build outputs.

## Steps

1. In `E:\indbase`, update `indbase_agent.adapter` imports to use `diff_block` and `artifact_block`.
2. Add a small read-only helper that snapshots the ingest-visible state before and after execution:
   - source identity: normalized source URI, hash, filename, size
   - matching document/source-file rows if present
   - post-run `ingest_runs` and `ingest_items` rows for `result.ingest_id`
   - current revision summary when a document/current revision exists
3. In `_execute_ingest`, capture the before snapshot immediately after path normalization and before `run_m3_ingest_pipeline`; capture the after snapshot after the pipeline returns.
4. In `_ingest_blocks`, append:
   - a `diff` block titled `Vault state diff`, with a stable pretty-printed JSON unified diff, `language: "json"`, `from_label: "before ingest"`, and `to_label: "after ingest"`.
   - an `artifact` block for `indbase://ingest_runs/{ingest_id}` with `kind: "indbase.ingest_run"`.
   - an `artifact` block for `indbase://documents/{doc_id}` only when a document row exists.
   - an `artifact` block for `indbase://document_revisions/{revision_id}` only when a current revision row exists.
5. Keep metadata compact and diagnostic: status, task id, counts, doc id, current revision id, markdown path, and indexed/chunk counts. Metadata must not contain file contents.
6. Update `E:\indbase\tests\test_indbase_agent.py` with focused assertions for block presence, logical URI scheme, diff labels, and unchanged preview behavior.
7. If consoler code changes become necessary, first prove the failing V1d contract with a focused test, then keep the consoler change minimal.

## Validation

- Indbase focused tests:
  - From `E:\indbase`: `uv run pytest tests/test_indbase_agent.py`
- Consoler focused checks:
  - From `E:\consoler`: `pnpm --filter @consoler/protocol test`
  - From `E:\consoler`: `pnpm --filter @consoler/tui test`
  - From `E:\consoler`: `pnpm --filter @consoler/conformance test`
  - From `E:\consoler`: `pnpm --filter @consoler/agentctl test`
  - From `E:\consoler`: `pnpm test:python-sdk`
  - From `E:\consoler`: `pnpm typecheck`
- Real agent smoke:
  - Create a temporary disposable indbase vault and temporary args JSON.
  - From `E:\consoler`: `pnpm agentctl -- test indbase --command indbase.ingest_file --args <temp-args.json> --approve-preview --approve`

## Done means

- `indbase.ingest_file` execution emits valid markdown/table/json/diff/artifact result blocks.
- Diff block is a unified diff of stable JSON state summaries and does not represent an executable patch.
- Artifact block URIs use `indbase://...` logical references only.
- Preview approval and probe preview behavior are unchanged.
- Existing consoler V1d renderers, trace, replay, and conformance continue to pass without artifact storage.

## Unknowns

- None expected. If a failed, duplicate, or unsupported ingest produces no document/current revision row, omit the document/revision artifact blocks and keep the ingest-run artifact block.
