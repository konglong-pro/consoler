# Task execution brief: V1o real indbase cooperative cancel

## Objective

Connect V1n runtime cancel/control to the first real long-running agent path: `indbase.ingest_file`. The real `indbase` adapter should pass cooperative cancel checkpoints into the ingest pipeline so a cancel request can end with an agent-emitted `action.cancelled` instead of relying only on runtime force-kill timeout.

## Scope

- In scope: `E:\indbase\src\indbase_core\ingest.py`, `E:\indbase\src\indbase_agent\adapter.py`, focused `E:\indbase` tests, disposable real-agent cancel smoke through existing `consoler` `agentctl`, and this consoler planning entry.
- Out of scope: consoler protocol/runtime/TUI/SDK changes, `ActionEvent.epoch` expansion, `system.*` events, synthetic terminal events, execution replay, folder/url/media ingest, rollback semantics, and unrelated `E:\indbase` business logic.

## Start here

- Runtime cancel/control: `docs/planning/v1f-cooperative-cancel.md`, `docs/planning/v1n-strong-runtime-control.md`
- Real ingest command history: `docs/planning/v1a-indbase-ingest-file-side-effect-tracer.md`, `docs/planning/v1m-real-indbase-interaction-adoption.md`
- Real adapter: `E:\indbase\src\indbase_agent\adapter.py`
- Real pipeline: `E:\indbase\src\indbase_core\ingest.py`
- SDK cancel behavior: `sdks/python/consoler_agent_sdk/events.py`, `sdks/python/consoler_agent_sdk/server.py`
- Existing real-agent tests: `E:\indbase\tests\test_indbase_agent.py`, `E:\indbase\tests\test_ingest_pipeline.py`

## Do not touch

- Do not make `consoler` import `indbase_core` or any agent business code.
- Do not make `indbase_core` import `consoler_agent_sdk`; use duck typing for SDK cancellation if needed.
- Do not change consoler protocol schemas, runtime control semantics, TUI live cancel UI, Python SDK cancel checkpoints, or conformance fake behavior.
- Do not add rollback, execution replay, multi-pending interaction, timeout/redaction policy, strong epoch, or `system.*` behavior.
- Do not expand beyond `indbase.ingest_file`; leave doctor and folder/url/media ingest behavior unchanged unless an existing test requires compatibility.
- Do not mutate committed fixture vaults; use temporary disposable vaults and temporary args files for smokes.
- Do not hand-edit generated/build artifacts, dependency directories, lockfiles, or `.consoler/consoler.db`.

## Steps

1. Add a backward-compatible pipeline checkpoint hook:
   - Add an optional `checkpoint: Callable[[str], None] | None = None` keyword to `run_m3_ingest_pipeline(...)`.
   - Keep every existing caller valid when no checkpoint is supplied.
   - Call the checkpoint before or after major M3 stages: plan, archive, conversion, revision, chunk, index, and finalize.

2. Preserve real cancellation semantics in `indbase_core`:
   - If the checkpoint raises the SDK cancellation exception, re-raise it so the SDK server can emit `action.cancelled`.
   - When a task has already been created, close that task as `cancelled`, not `failed`.
   - Do not synthesize consoler events or write consoler-specific protocol objects from `indbase_core`.

3. Wire the adapter:
   - In `_execute_ingest`, pass `cancel_flag.check` into `run_m3_ingest_pipeline(...)`.
   - Keep existing checks around duplicate skip/continue, before pipeline, and before render.
   - Keep duplicate `skip` as a successful business result and duplicate `continue` as the existing pipeline path.

4. Add focused `E:\indbase` tests:
   - Pipeline calls the checkpoint during M3 ingest.
   - A checkpoint-raised cancellation is re-raised and records the indbase task as `cancelled`.
   - Adapter passes `cancel_flag.check` into the pipeline.
   - Existing no-duplicate and duplicate skip/continue adapter behavior still passes.

5. Add optional disposable smoke guidance:
   - Use existing `agentctl` cancel support; do not add new CLI flags.
   - Prefer a deterministic monkeypatched/unit test for cancellation timing. Only run a real `agentctl` smoke if a disposable slow-enough fixture is available without sleeps or committed fixture mutation.

6. Update docs:
   - Add this planning doc to `AGENTS.md` routing, validation rules, architecture constraints, and deep context index.
   - Do not update `CONTEXT.md` unless implementation introduces a new stable glossary term. Current Cooperative Cancel / Cancel Checkpoint / Force-kill Fallback terms are sufficient.

## Validation

- From `E:\indbase`:
  - `uv run pytest tests/test_indbase_agent.py`
  - `uv run pytest tests/test_ingest_pipeline.py -k cancel`

- From `E:\consoler` focused regression checks:
  - `pnpm --filter @consoler/runtime test`
  - `pnpm --filter @consoler/agentctl test`
  - `pnpm --filter @consoler/tui test`
  - `pnpm test:python-sdk`
  - `pnpm test:conformance`

- From `E:\consoler` broad checks:
  - `pnpm typecheck`
  - `pnpm build`
  - `pnpm test`

- Optional real-agent smoke:
  - Use a disposable vault and `pnpm agentctl -- test indbase --command indbase.ingest_file --args <args.json> --approve-preview --approve --cancel-after-ms <n>`.
  - Confirm trace/history show a real agent `action.cancelled` when the checkpoint wins. If the runtime timeout wins, the result is V1n force-kill behavior and does not prove V1o cooperative cancel.

## Done means

- `indbase.ingest_file` passes cooperative checkpoints into the real M3 pipeline.
- A checkpoint-observed cancel reaches the SDK and produces agent-owned `action.cancelled`.
- Indbase task state is `cancelled` when cancellation occurs after task creation.
- Existing ingest behavior, duplicate interaction behavior, preview approval, and result blocks remain unchanged outside cancellation.
- No consoler protocol/runtime/TUI/SDK behavior changes are introduced.
- Default CI still does not depend on real `E:\indbase` smokes.

## Unknowns

- A real `agentctl` cancel smoke may be timing-sensitive unless implementation creates a deterministic temporary fixture or uses focused tests. Do not add sleeps or test-only production behavior solely to make the smoke reliable.
