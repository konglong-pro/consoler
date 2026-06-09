---
doc_type: phase_plan
phase_id: v1a-indbase-ingest-file-side-effect-tracer
title: Task execution brief: V1a indbase.ingest_file side-effect tracer
status: completed
canonical: false
read_by_default: false
superseded_by: null
---

# Task execution brief: V1a indbase.ingest_file side-effect tracer

## Objective

Add the second real consoler tracer bullet: `indbase.ingest_file`.

This stage proves a side-effecting action lifecycle without expanding into platform features. The action must support preview approval, read-only probe preview, execution approval, context drift invalidation, staged execution events, agentctl support, TUI support, and replay.

## Scope

- In scope: `packages/protocol`, `packages/runtime`, `packages/agentctl`, `packages/tui`, `sdks/python`, focused tests, this doc, `AGENTS.md` if commands change, and the explicit `indbase-agent` / ingest callback work in `E:\indbase`.
- Out of scope: folder ingest, recursive ingest, media ingest, URL/archive ingest, natural-language mapping, artifact/diff renderers, custom renderers, pause, strong cancel race handling, OS sandboxing, history browser, Web UI, VS Code UI, remote agents, and execution replay.

## Start here

- Read: `docs/adr/0001-agent-protocol-v0-boundaries.md`
- Read: `docs/planning/archive/consoler-v0/v0-indbase-doctor-tracer-bullet.md`
- Read: `docs/planning/archive/consoler-v0/v0b-minimal-tui.md`
- Protocol types/schemas: `packages/protocol/src/types.ts`, `packages/protocol/src/schemas/manifest.json`
- Runtime lifecycle: `packages/runtime/src/runtime.ts`, `packages/runtime/src/approval.ts`, `packages/runtime/src/context-snapshot.ts`
- CLI reference behavior: `packages/agentctl/src/main.ts`
- TUI current hardcoded command path: `packages/tui/src/app.tsx`
- Python SDK: `sdks/python/consoler_agent_sdk/`
- indbase adapter: `E:\indbase\src\indbase_agent\adapter.py`
- indbase manifest: `E:\indbase\src\indbase_agent\manifest.json`
- indbase ingest code: `E:\indbase\src\indbase_core\ingest.py`, `E:\indbase\src\indbase_core\source_inspector.py`

## Do not touch

- Do not make consoler import `indbase_core` or any agent business code.
- Do not copy indbase ingest pipeline logic into consoler.
- Do not use `plan_ingest_sources()` for preview; it writes `ingest_runs` / `ingest_items` and commits.
- Do not add artifact/diff renderers in this stage.
- Do not implement folder/recursive/media ingest under `indbase.ingest_file`.
- Do not edit `E:\indbase` unrelated files.
- Do not hand-edit generated/build artifacts: `node_modules/`, `dist/`, `coverage/`, `.consoler/consoler.db`.
- Do not change lockfiles unless a real dependency/script change requires it.

## Steps

1. Extend protocol for preview approval:
   - Add `probe_readonly` to preview kinds.
   - Add explicit approval scope support for `preview` and `execute`.
   - Keep renderable blocks limited to `markdown`, `table`, `json`, and `error`.

2. Split runtime preview lifecycle:
   - Before preview approval, do only manifest lookup and JSON Schema validation.
   - Do not call `agent.validate`, `agent.plan`, or environment-reading context snapshot before preview approval.
   - After preview approval, call `agent.preview` for read-only probe preview.
   - Before execution approval, call validate/plan, build context snapshot, and bind args, plan, side effects, context snapshot, and preview hash.
   - Before execution, recheck context drift and fail with `context_changed` if source or vault state changed.

3. Add `indbase.ingest_file` to indbase-agent:
   - Args: `vault_path: string`, `source_path: string`.
   - Preview policy: `preview_kind: "probe_readonly"`, `requires_approval_before_preview: true`.
   - Preview reads source inspection via `source_inspector.inspect_source`.
   - Preview opens the vault DB read-only to detect duplicate source hash and normalized source URI.
   - Preview must not write the vault DB or source files.
   - Execute validates vault/source and calls `run_m3_ingest_pipeline(vault_path, source_path, recursive=False)`.

4. Add minimal indbase ingest progress callback:
   - Add an optional callback to the existing ingest pipeline rather than duplicating pipeline steps in the adapter.
   - Emit stage boundaries for inspect, archive, convert, revision, chunk, index, and finalize.
   - Preserve existing CLI behavior when no callback is supplied.

5. Update agentctl:
   - `preview` without `--approve-preview` must report preview approval required for probe previews.
   - `preview --approve-preview` must run probe preview.
   - `run --approve-preview --approve` must run the full preview -> plan -> execute path.
   - Keep `--approve` scoped to execution; do not make it approve preview implicitly.

6. Update TUI:
   - Replace hardcoded `indbase.doctor` with manifest-driven command selection.
   - Generate forms from the selected command schema.
   - Show a preview approval card before probe preview.
   - Show execution approval after probe preview, plan, and context snapshot are ready.
   - Render live stage events and terminal result blocks with existing renderers.
   - Replay must still use persisted accepted events only and must not spawn an agent.

7. Update docs after implementation:
   - Update `CONTEXT.md` glossary with Probe Preview, Preview Approval, Execution Approval, and Context Drift.
   - Update `docs/adr/0001-agent-protocol-v0-boundaries.md` only if the implemented boundary changes from the accepted v0 text.
   - Update `AGENTS.md` with any new real commands or validation paths.

## Validation

- Broad consoler checks:
  - `pnpm typecheck`
  - `pnpm test`
  - `pnpm test:python-sdk`
  - `pnpm build`

- Focused consoler checks:
  - `pnpm --filter @consoler/protocol test`
  - `pnpm --filter @consoler/runtime test`
  - `pnpm --filter @consoler/agentctl test`
  - `pnpm --filter @consoler/tui test`

- Existing regression smokes:
  - `pnpm agentctl -- preview indbase indbase.doctor --args fixtures/doctor-args.json`
  - `pnpm agentctl -- run indbase indbase.doctor --args fixtures/doctor-args.json --approve`
  - `pnpm agentctl -- replay <doctor_action_id>`
  - `pnpm tui -- --replay <doctor_action_id>`

- Expected V1a smokes after implementation:
  - `pnpm agentctl -- preview indbase indbase.ingest_file --args <ingest-args.json>` should stop at preview approval required.
  - `pnpm agentctl -- preview indbase indbase.ingest_file --args <ingest-args.json> --approve-preview` should return read-only probe preview.
  - `pnpm agentctl -- run indbase indbase.ingest_file --args <ingest-args.json> --approve-preview --approve` should execute and persist staged events.
  - `pnpm agentctl -- replay <ingest_action_id>` should replay without spawning indbase-agent.
  - `pnpm tui --` should let the user select `indbase.ingest_file`, approve preview, approve execution, inspect live events, and replay the result.

- indbase checks:
  - From `E:\indbase`, run the existing indbase-agent tests after updating them.
  - If no narrow test command exists for the new adapter tests, inspect `E:\indbase` test configuration and document the exact command used in the final response.

## Done means

- `indbase.doctor` behavior remains compatible.
- `indbase.ingest_file` is manifest-discovered as an out-of-process agent command.
- Probe preview requires preview approval and does not write source files or vault DB state.
- Execution approval binds normalized args, plan, source/vault context snapshot, side effects, and preview hash.
- Source file or vault DB/config drift invalidates execution approval.
- Execution emits ordered stage events and returns markdown/table/json result blocks.
- `completed_with_issues`, duplicates, unsupported source, and item failures are rendered as business results under `action.succeeded` when the pipeline returns normally.
- `action.failed` is reserved for validation/protocol/runtime/crash/unexpected exception/context drift failures.
- agentctl, TUI, and replay all use the same runtime lifecycle.

## Unknowns

- The exact temporary fixture for a safe ingest smoke must be chosen during implementation; do not mutate a real user vault.
- The exact indbase duplicate-detection query should mirror indbase core tables without calling private write-oriented helpers from preview.
- If adding the ingest progress callback changes indbase public API shape, keep it optional and backwards-compatible.
