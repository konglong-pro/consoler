---
doc_type: phase_plan
phase_id: v1m-real-indbase-interaction-adoption
title: Task execution brief: V1m real indbase interaction adoption
status: completed
canonical: false
read_by_default: false
superseded_by: null
---

# Task execution brief: V1m real indbase interaction adoption

## Objective

Connect the existing V1h-V1l interaction loop to the first real agent scenario: `indbase.ingest_file` duplicate handling. Before write-oriented ingest execution, the real `indbase` adapter should detect duplicate source state and ask the user whether to skip or continue.

## Scope

- In scope: `E:\indbase\src\indbase_agent\adapter.py`, `E:\indbase\tests\test_indbase_agent.py`, disposable-vault smoke coverage through existing consoler `agentctl run`, and this consoler planning entry.
- Out of scope: consoler protocol changes, runtime interaction changes, Python SDK changes, TUI changes, conformance fake expansion, timeout/redaction policy changes, multi-pending interactions, strong epoch handling, force-kill fallback, folder ingest, media ingest, URL ingest, and execution replay.

## Start here

- Interaction lifecycle: `docs/planning/archive/consoler-v1/v1h-interaction-required.md`
- Live CLI interaction client: `docs/planning/archive/consoler-v1/v1j-agentctl-run-live-interactions.md`
- Interaction trace/redaction: `docs/planning/archive/consoler-v1/v1i-interaction-trace-persistence.md`, `docs/planning/archive/consoler-v1/v1l-interaction-response-redaction.md`
- Real ingest command history: `docs/planning/archive/consoler-v1/v1a-indbase-ingest-file-side-effect-tracer.md`, `docs/planning/archive/consoler-v1/v1e-real-indbase-renderable-blocks.md`
- Real agent adapter: `E:\indbase\src\indbase_agent\adapter.py`
- Real agent probe: `E:\indbase\src\indbase_agent\ingest_probe.py`
- Real agent tests: `E:\indbase\tests\test_indbase_agent.py`

## Do not touch

- Do not edit unrelated `E:\indbase` business logic.
- Do not make `consoler` import `indbase_core` or any real agent business code.
- Do not change protocol schemas, JSON-RPC method names, runtime interaction persistence, SDK interaction helper behavior, or TUI interaction UI.
- Do not add timeout policy, redaction markers, nested redaction, multiple pending interactions, `system.*` events, strong cancel/epoch behavior, force-kill behavior, or execution replay.
- Do not mutate committed fixture vaults; use temporary disposable vaults and temporary args/response JSON files for smokes.
- Do not hand-edit generated/build artifacts, dependency directories, lockfiles, or `.consoler/consoler.db`.

## Steps

1. Fix the real adapter compatibility gap:
   - Update `IndbaseAgentAdapter.execute(...)` to accept optional `interaction=None`.
   - Keep existing non-interactive behavior unchanged when no duplicate interaction is needed.

2. Add duplicate guard before ingest writes:
   - In `_execute_ingest`, normalize `vault_path` and `source_path`, then run existing read-only `probe_ingest_file(vault_path, source_path)` before `run_m3_ingest_pipeline(...)`.
   - If `probe["duplicates"]["is_duplicate"]` is false, continue with the current pipeline path.
   - If it is true and `interaction` is missing, raise a clear `AgentError` instead of silently continuing.

3. Emit the real interaction:
   - Use `interaction.request(...)` with a deterministic `interaction_id`, a duplicate-focused title/message, and choice ids `skip` and `continue`.
   - Include compact `blocks` or result metadata showing duplicate source hash / normalized source URI matches, but never file contents.
   - Do not use redaction markers; no secret input is collected.

4. Implement choice behavior:
   - `skip`: do not call `run_m3_ingest_pipeline(...)`; return `action.succeeded` result blocks explaining the skip and showing duplicate probe details.
   - `continue`: run the existing ingest pipeline and keep existing markdown/table/json/diff/artifact result blocks.
   - Any unexpected choice should fail with an `AgentError` category-equivalent code such as `interaction.invalid`.

5. Add focused `E:\indbase` tests:
   - No duplicate: existing execution test still passes and emits diff/artifact blocks.
   - Duplicate + `skip`: does not run the write-oriented ingest pipeline and returns skipped business-result blocks.
   - Duplicate + `continue`: runs the current pipeline path.
   - Server compatibility: direct adapter execution tolerates the SDK `interaction` keyword.

6. Add real smoke instructions only if needed:
   - Keep default CI independent of `E:\indbase`.
   - Use a disposable temp vault, seed it with one ingest, then run duplicate `agentctl run` with `--interaction-response` files for `skip` and `continue`.

## Validation

- From `E:\indbase`:
  - `uv run pytest tests/test_indbase_agent.py`

- From `E:\consoler` focused checks:
  - `pnpm --filter @consoler/protocol test`
  - `pnpm --filter @consoler/runtime test`
  - `pnpm --filter @consoler/agentctl test`
  - `pnpm --filter @consoler/tui test`
  - `pnpm test:python-sdk`
  - `pnpm test:conformance`

- From `E:\consoler` broad checks:
  - `pnpm typecheck`
  - `pnpm build`
  - `pnpm test`

- Disposable real-agent smokes:
  - `pnpm agentctl -- run indbase indbase.ingest_file --args <duplicate-args.json> --approve-preview --approve --interaction-response <skip-response.json>`
  - `pnpm agentctl -- run indbase indbase.ingest_file --args <duplicate-args.json> --approve-preview --approve --interaction-response <continue-response.json>`
  - Inspect with `pnpm agentctl -- trace <action_id>` and confirm the interaction response is persisted while replay remains accepted-events-only.

## Done means

- `indbase.ingest_file` uses the existing interaction protocol in a real duplicate scenario.
- Duplicate `skip` is a successful business outcome and does not run the write-oriented ingest pipeline.
- Duplicate `continue` preserves the existing ingest execution and result block behavior.
- Preview/probe semantics and approval binding are unchanged.
- No consoler protocol/runtime/TUI/SDK changes are introduced unless required by a failing existing contract test.
- Default CI still does not depend on `E:\indbase`.

## Unknowns

- The exact duplicate fixture setup should be chosen during implementation using a disposable temp vault. Do not reuse or mutate a real user vault.
