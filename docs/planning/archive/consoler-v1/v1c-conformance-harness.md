---
doc_type: phase_plan
phase_id: v1c-conformance-harness
title: Task execution brief: V1c conformance harness
status: completed
canonical: false
read_by_default: false
superseded_by: null
---

# Task execution brief: V1c conformance harness

## Objective

Add a reusable conformance layer that verifies an out-of-process agent speaks the current `consoler` protocol correctly. This stage should make agent compatibility testable through both CI-friendly fixtures and `agentctl test <agent_id>`.

## Scope

- In scope: new `packages/conformance`, `packages/agentctl`, root scripts, CI workflow, Python SDK fake-agent fixture, focused tests, and documentation updates.
- Out of scope: new protocol objects, natural-language mapping, `interaction.required`, strong cancel/epoch handling, artifact/diff renderers, TUI changes, real `E:\indbase` CI smokes, and changes to indbase business code.

## Start here

- Read: `docs/adr/0001-agent-protocol-v0-boundaries.md`
- Read: `docs/planning/archive/consoler-v1/v1b-action-history-trace-browser.md`
- Protocol validators: `packages/protocol/src/validators.ts`
- Runtime lifecycle: `packages/runtime/src/runtime.ts`
- JSON-RPC transport: `packages/runtime/src/transport/jsonrpc.ts`
- CLI entry: `packages/agentctl/src/main.ts`
- Python SDK server: `sdks/python/consoler_agent_sdk/server.py`
- Current CI: `.github/workflows/ci.yml`

## Do not touch

- Do not edit `E:\indbase` for V1c.
- Do not add execution replay, retry, interaction, pause, or stronger cancel semantics.
- Do not make default conformance execute side-effecting commands.
- Do not make `consoler` import agent business code.
- Do not hand-edit generated/build artifacts: `node_modules/`, `dist/`, `coverage/`, `.consoler/consoler.db`, `.pytest_cache/`, `__pycache__/`.
- Do not add dependencies unless the implementation proves the existing workspace tooling is insufficient.

## Steps

1. Add `packages/conformance`:
   - Export `runAgentConformance(input)` and `formatConformanceReport(report)`.
   - Model checks as `passed`, `failed`, or `skipped`; CLI exit code should be non-zero only when any check fails.
   - Run against an isolated temp `rootDir` with a generated `.consoler/agents.json` so tests do not mutate the developer's local store.

2. Implement safe default checks:
   - Verify registry entry exists and the process can be spawned.
   - Call `agent.health` and `agent.discover`.
   - Validate the manifest, duplicate command names, command arg schemas, preview policies, and supported renderable/event shapes.
   - Do not call command-specific `validate`, `plan`, `preview`, or `execute` unless `--command --args` are supplied.

3. Implement command-specific checks:
   - With `--command --args`, validate args through JSON Schema and `agent.validate`.
   - Run plan and approval-material checks without executing.
   - For static previews, run preview directly.
   - For `probe_readonly`, report preview approval as skipped unless `--approve-preview` is supplied; with approval, run probe preview and then prepare execution approval.
   - With `--approve`, execute the prepared action, then verify accepted event ordering, terminal event, trace availability, history visibility, replay accepted-events-only behavior, and zero rejected events for the conformance run.

4. Add Python SDK fake-agent coverage:
   - Add a fixture agent under `packages/conformance/fixtures/`.
   - Use `sdks/python` via `PYTHONPATH`.
   - Include one static-preview command and one `probe_readonly` command.
   - Emit markdown/json result blocks and ordered action/step/progress events through the SDK server.

5. Add `agentctl test`:
   - Syntax: `agentctl test <agent_id> [--command <name>] [--args <path>] [--approve-preview] [--approve] [--json]`.
   - Require `--command` and `--args` together.
   - Human output should show concise PASS/FAIL/SKIP lines.
   - JSON output should expose the full conformance report.

6. Wire scripts and CI:
   - Add package scripts for `@consoler/conformance`: `build`, `test`, and `typecheck`.
   - Add root script `test:conformance`.
   - Add CI step for `pnpm test:conformance` after Python is available.
   - Keep real `indbase` smokes out of default GitHub CI.

7. Update docs:
   - Update `AGENTS.md` with V1c routing and validation rules.
   - Add `Conformance Harness` to `CONTEXT.md` only if the implementation introduces stable terminology worth preserving.
   - Update command lists only after scripts or CLI commands actually exist.

## Validation

- Focused checks after implementation:
  - `pnpm --filter @consoler/conformance test`
  - `pnpm --filter @consoler/agentctl test`
  - `pnpm test:conformance`
  - `pnpm test:python-sdk`

- Broad checks:
  - `pnpm build`
  - `pnpm typecheck`
  - `pnpm test`

- CLI smokes:
  - `pnpm agentctl -- test indbase`
  - `pnpm agentctl -- test indbase --command indbase.doctor --args fixtures/doctor-args.json`
  - `pnpm agentctl -- test indbase --command indbase.ingest_file --args fixtures/ingest-args.json`
  - `pnpm agentctl -- test indbase --command indbase.ingest_file --args fixtures/ingest-args.json --approve-preview --approve`

## Done means

- CI can verify the Python SDK fake agent through stdio JSON-RPC without `E:\indbase`.
- `agentctl test <agent_id>` provides safe non-executing compatibility checks by default.
- Command-specific conformance requires explicit args and approvals before preview or execution side effects.
- Execution conformance proves accepted event ordering, terminal result, history, trace, and replay behavior.
- Existing V1a/V1b tests still pass, and no real agent business code is imported into `consoler`.

## Unknowns

- The exact fixture command names can be chosen during implementation, but they must clearly distinguish static preview from `probe_readonly`.
- If `packages/conformance` needs a helper for cross-platform Python executable discovery, prefer a small local helper over a new dependency.
