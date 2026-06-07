---
doc_type: phase_plan
phase_id: v1f-cooperative-cancel
title: Task execution brief: V1f cooperative cancel
status: completed
canonical: false
read_by_default: false
superseded_by: null
---

# Task execution brief: V1f cooperative cancel

## Objective

Add the first real cancel control loop for out-of-process agents. Runtime must be able to send `agent.cancel` while an action is executing, the Python SDK must receive that request during execution, and conformance must prove the action reaches the `cancelled` terminal state through `action.cancelled`.

## Scope

- In scope: `sdks/python`, `packages/runtime`, `packages/conformance`, `packages/agentctl`, focused tests, `CONTEXT.md`, and `AGENTS.md`.
- Out of scope: TUI cancel button, strong epoch/race handling, cancel timeout force-kill, `interaction.required`, pause, execution replay, real `E:\indbase` cancel smoke as a required gate, and protocol event expansion beyond the existing `action.cancelled`.

## Start here

- Read: `docs/adr/0001-agent-protocol-v0-boundaries.md`
- Read: `docs/planning/archive/consoler-v1/v1c-conformance-harness.md`
- Runtime execution loop: `packages/runtime/src/runtime.ts`
- JSON-RPC transport: `packages/runtime/src/transport/jsonrpc.ts`
- Conformance runner and fake agent: `packages/conformance/src/run.ts`, `packages/conformance/fixtures/fake_agent/`
- Python SDK server and events: `sdks/python/consoler_agent_sdk/server.py`, `sdks/python/consoler_agent_sdk/events.py`
- Agentctl CLI: `packages/agentctl/src/main.ts`

## Do not touch

- Do not add TUI controls in V1f.
- Do not change `epoch` semantics; V1f keeps `epoch: 0`.
- Do not add `step.cancelled`, `step.failed`, or new terminal event types.
- Do not fake cancellation in runtime; the agent must emit `action.cancelled`.
- Do not kill the agent process as the V1f success path.
- Do not require real `indbase.ingest_file` cancellation for CI or default acceptance.
- Do not edit `E:\indbase` unless a later task explicitly asks for real-agent cancel adoption.

## Steps

1. Add cooperative cancel SDK semantics:
   - Add an `AgentCancelled` exception.
   - Make `CancelFlag.check(checkpoint)` raise `AgentCancelled` when cancellation has been requested.
   - Reset the cancel flag before each new execute call.

2. Make Python SDK cancel reachable during execute:
   - Run `agent.execute` work in a background worker so the stdin JSON-RPC loop can keep handling `agent.cancel`.
   - Protect stdout writes with a lock so event notifications and JSON-RPC responses cannot interleave.
   - Permit one active execute at a time for V1f; reject or fail overlapping execute requests deterministically.
   - On `AgentCancelled`, emit `action.cancelled` and complete the execute response without emitting `action.failed` or `action.succeeded`.

3. Add runtime controlled execution:
   - Add a runtime API that starts a prepared execution and returns `run_id`, a `done` promise, and a `cancel()` function.
   - Implement `cancel()` by sending `agent.cancel` on the same live agent client used for execute.
   - Keep existing `executePrepared` behavior compatible by using the controlled execution API internally and awaiting `done`.
   - Preserve existing event-store terminal behavior: accepted `action.cancelled` closes the run as `cancelled`.

4. Extend conformance:
   - Add a slow fake-agent command, e.g. `conformance.slow_cancel`, whose execute loop emits progress/log events and calls `cancel_flag.check(...)` between iterations.
   - Add conformance input option `cancelAfterMs`.
   - In cancel mode, start controlled execution, wait `cancelAfterMs`, call `cancel()`, and assert the terminal state is `cancelled`.
   - Cancel mode should verify history, trace, replay, event schema, monotonic seq, zero rejected events, and absence of `action.succeeded`.

5. Extend agentctl:
   - Add `--cancel-after-ms <n>` to `agentctl test`.
   - Require `--command`, `--args`, and `--approve` when `--cancel-after-ms` is supplied.
   - For probe commands, keep the existing `--approve-preview` requirement.
   - Report cancel conformance rows in the same human and JSON report formats.

6. Update docs:
   - Keep `AGENTS.md` as routing and validation guidance only.
   - Add glossary terms to `CONTEXT.md`: `Cooperative Cancel`, `Cancel Request`, `Cancel Checkpoint`, and `Cancelled Terminal Event`.
   - Do not create an ADR unless implementation changes the accepted v0 boundary around epoch, force-kill, or TUI cancel.

## Validation

- Focused checks:
  - `pnpm test:python-sdk`
  - `pnpm --filter @consoler/runtime test`
  - `pnpm --filter @consoler/conformance test`
  - `pnpm --filter @consoler/agentctl test`
  - `pnpm test:conformance`

- Cancel smoke:
  - `pnpm agentctl -- test conformance-fake --command conformance.slow_cancel --args <args.json> --approve --cancel-after-ms 100`

- Broad checks:
  - `pnpm typecheck`
  - `pnpm build`
  - `pnpm test`

## Done means

- Runtime can send `agent.cancel` to an executing out-of-process agent.
- Python SDK can receive cancel while execute is still running.
- A checkpointed fake agent reaches `action.cancelled` and does not emit `action.succeeded`.
- History and trace show `cancelled`; replay remains accepted-events-only.
- Conformance and agentctl expose deterministic cancel checks.
- No TUI cancel, strong epoch model, or force-kill fallback is introduced.

## Unknowns

- None expected. If stdout locking or worker-thread lifecycle becomes complex, keep the SDK implementation synchronous from the agent author perspective and isolate concurrency inside `JsonRpcServer`.
