---
doc_type: phase_plan
phase_id: v1n-strong-runtime-control
title: Task execution brief: V1n strong runtime control
status: completed
canonical: false
read_by_default: false
superseded_by: null
---

# Task execution brief: V1n strong runtime control

## Objective

Strengthen live execution control in the runtime without changing the wire protocol. V1n adds a runtime-owned action lock, idempotent cancel requests, post-cancel event quarantine, cancel timeout, and force-kill fallback while keeping `ActionEvent.epoch` fixed at `0`.

## Scope

- In scope: `packages/runtime`, `packages/conformance`, `packages/agentctl`, focused TUI trace tests if run trace shape changes, `CONTEXT.md`, `AGENTS.md`, and focused tests.
- Out of scope: protocol epoch expansion, `system.*` events, synthetic `action.cancelled` or `action.failed` events, Python SDK cancel semantics changes, TUI live cancel behavior changes, real `E:\indbase` cancel adoption, pause, multi-process orchestration, and execution replay.

## Start here

- Prior cancel loop: `docs/planning/archive/consoler-v1/v1f-cooperative-cancel.md`, `docs/planning/archive/consoler-v1/v1g-tui-cooperative-cancel.md`
- Runtime execution control: `packages/runtime/src/runtime.ts`, `packages/runtime/src/lifecycle-types.ts`
- Event acceptance: `packages/runtime/src/event-store.ts`
- Runtime store and trace reads: `packages/runtime/src/db/schema.ts`, `packages/runtime/src/db/store.ts`, `packages/runtime/src/action-read.ts`, `packages/runtime/src/action-read-types.ts`, `packages/runtime/src/format-action-read.ts`
- Transport kill path: `packages/runtime/src/transport/jsonrpc.ts`
- Conformance fake and runner: `packages/conformance/fixtures/fake_agent/`, `packages/conformance/src/run.ts`
- Agentctl command surface: `packages/agentctl/src/main.ts`

## Do not touch

- Do not change `packages/protocol/src/schemas/action-event.json`; `epoch` remains `const: 0` in V1n.
- Do not emit or persist `system.*` events.
- Do not fake `action.cancelled` when runtime kills the process.
- Do not treat a cancel request as a cancelled terminal state.
- Do not change Python SDK checkpoint semantics unless an existing contract test proves a bug.
- Do not edit `E:\indbase`.
- Do not hand-edit generated/build artifacts, dependency directories, lockfiles, or `.consoler/consoler.db`.

## Steps

1. Add runtime control state:
   - Track a per-run internal lock inside `executePreparedWithControl`: `running`, `cancel_requested`, `cancelling`, and terminal.
   - Add `cancelTimeoutMs?: number` to `ConsolerRuntimeOptions`; default to `5000`.
   - Make `control.cancel()` idempotent. The first call sends `agent.cancel` and starts the cancel timeout; repeated calls must not send another cancel request.

2. Quarantine post-cancel agent events:
   - After cancel is requested, accept only `action.cancelled` from the agent for that run.
   - Persist other valid agent events, including `log`, `progress.updated`, `action.succeeded`, and `action.failed`, as rejected trace events with a new reject reason such as `cancel_requested`.
   - Keep replay accepted-events-only.

3. Add cancel timeout and force-kill fallback:
   - If `action.cancelled` is accepted before timeout, close as `cancelled` and clear timeout.
   - If timeout expires first, kill the agent process, abandon pending interactions, close the run as `failed`, and record a run-level control error with code `cancel_timeout`.
   - Resolve `control.done` with state `failed` and `control_error`; do not reject the promise for the timeout path.
   - Do not insert a synthetic terminal event. Accepted events may end without an `action.*` terminal event on this path.

4. Persist and read control errors:
   - Add additive `runs` columns for control error code/message/time.
   - Update store helpers so terminal close is first-writer-wins and `isRunTerminal` respects non-running run status as well as accepted terminal events.
   - Extend action history/trace types and formatters to show run-level control errors.
   - Update TUI Trace View only if required to show the new trace field; do not alter live TUI cancel behavior.

5. Extend conformance and agentctl:
   - Add a fake command that ignores cancel long enough to trigger timeout.
   - Add `--cancel-timeout-ms <n>` to `agentctl test`; require it to be used only with `--cancel-after-ms`, `--command`, `--args`, and `--approve`.
   - Existing cooperative cancel checks must still require agent-emitted `action.cancelled`.

6. Update docs:
   - Add `CONTEXT.md` terms for Runtime Control Lock, Cancel Timeout, Force-kill Fallback, and Control Error.
   - Keep `AGENTS.md` as routing and validation guidance only.

## Validation

- Focused checks:
  - `pnpm --filter @consoler/runtime test`
  - `pnpm --filter @consoler/conformance test`
  - `pnpm --filter @consoler/agentctl test`
  - `pnpm --filter @consoler/tui test`
  - `pnpm test:python-sdk`
  - `pnpm test:conformance`

- Required cancel smokes:
  - Cooperative path: `pnpm agentctl -- test conformance-fake --command conformance.slow_cancel --args <args.json> --approve --cancel-after-ms 100`
  - Timeout path: `pnpm agentctl -- test conformance-fake --command <ignore-cancel-command> --args <args.json> --approve --cancel-after-ms 100 --cancel-timeout-ms 100`

- Broad checks:
  - `pnpm typecheck`
  - `pnpm build`
  - `pnpm test`
  - `pnpm test:agentctl-smoke`

## Done means

- Cancel requests are idempotent and do not send duplicate `agent.cancel` calls.
- After cancel is requested, non-`action.cancelled` agent events are rejected and visible in trace.
- Cooperative cancel still ends only when the agent emits `action.cancelled`.
- Timeout fallback force-kills the process, closes the run as `failed`, and records `cancel_timeout` as a run-level control error.
- No synthetic terminal event is inserted for runtime force-kill.
- Trace/history expose control errors, while replay remains accepted agent events only.
- `epoch` remains `0`; no protocol schema or SDK wire-shape expansion is introduced.

## Unknowns

- None expected. If the existing JSON-RPC client needs an idempotent kill/closed-state bug fix to support timeout cleanup, keep that fix local to `packages/runtime/src/transport/jsonrpc.ts` and prove it with focused tests.
