---
doc_type: phase_plan
phase_id: v1k-interaction-timeout-policy
title: Task execution brief: V1k interaction timeout policy
status: completed
canonical: false
read_by_default: false
superseded_by: null
---

# Task execution brief: V1k interaction timeout policy

## Objective

Add runtime-owned timeout handling for `interaction.required`. An agent can declare what should happen if the user does not respond in time, and the runtime must route that timeout outcome back through the same live agent process.

## Scope

- In scope: protocol `InteractionRequest.timeout_policy`, runtime timers and trace metadata, Python SDK timeout behavior, conformance fake coverage, `agentctl run`/TUI display tolerance, focused tests, and `AGENTS.md`.
- Out of scope: real `E:\indbase` adoption, response redaction, secret classification, multiple concurrent pending interactions, `system.*` events, strong epoch handling, force-kill fallback, execution replay changes, and new CLI options.

## Start here

- Interaction lifecycle: `docs/planning/archive/consoler-v1/v1h-interaction-required.md`
- Interaction trace persistence: `docs/planning/archive/consoler-v1/v1i-interaction-trace-persistence.md`
- Live CLI interaction client: `docs/planning/archive/consoler-v1/v1j-agentctl-run-live-interactions.md`
- Protocol types: `packages/protocol/src/types.ts`
- Interaction schema: `packages/protocol/src/schemas/interaction-request.json`
- Runtime execution and response path: `packages/runtime/src/runtime.ts`
- Runtime store schema and methods: `packages/runtime/src/db/schema.ts`, `packages/runtime/src/db/store.ts`
- Trace model and reads: `packages/runtime/src/action-read-types.ts`, `packages/runtime/src/action-read.ts`, `packages/runtime/src/format-action-read.ts`
- Python SDK interaction helper: `sdks/python/consoler_agent_sdk/interaction.py`
- Python SDK server/error path: `sdks/python/consoler_agent_sdk/server.py`
- Conformance fake agent: `packages/conformance/fixtures/fake_agent/`
- CLI live run path: `packages/agentctl/src/run-approved.ts`, `packages/agentctl/src/interaction-cli.ts`
- TUI interaction path: `packages/tui/src/app.tsx`

## Do not touch

- Do not edit `E:\indbase`.
- Do not add response redaction, secret policy, or field-level storage rules.
- Do not allow multiple concurrent pending interactions.
- Do not add `system.*` events or store timeout responses as `ActionEvent`.
- Do not add strong epoch/race handling beyond deterministic single-winner timeout versus response ordering.
- Do not add force-kill fallback or change cooperative cancel semantics.
- Do not change execution replay semantics; replay remains accepted-events-only and response-free.
- Do not add new CLI flags for timeout behavior.
- Do not hand-edit generated/build artifacts.

## Steps

1. Extend the protocol:
   - Add optional `timeout_policy` to `InteractionRequest`.
   - Shape: `{ timeout_seconds: number, on_timeout: "abort" | "use_default" | "skip" | "continue" }`.
   - Require positive `timeout_seconds`; allow fractional seconds so tests can run quickly.
   - Reject `use_default` before execution when there is no usable `default_response`.
   - Keep existing interaction request fields and event names stable.

2. Make runtime the timeout owner:
   - Start a timer only after an `interaction.required` event has been accepted.
   - Clear the timer on successful user response, terminal event, cancel/close, or execution failure.
   - Route timeout outcomes through the same live agent process by using the existing interaction response path.
   - `abort` must produce an accepted `action.failed` event with an `interaction.timeout` error; it must not become `action.cancelled`.
   - `use_default` must send the validated `default_response`.
   - `skip` must send `{ "timed_out": true, "action": "skip" }`.
   - `continue` must send `{ "timed_out": true, "action": "continue" }`.
   - If a user response and timeout race, exactly one outcome wins and the loser is ignored with focused test coverage.

3. Update trace persistence:
   - Persist timeout policy metadata with the interaction request/response trace record.
   - Record whether timeout triggered, when it triggered, and which outcome was used.
   - Keep replay accepted-events-only; do not expose timeout control records through replay.

4. Update the Python SDK:
   - Let `InteractionHelper.request(...)` accept `timeout_policy`.
   - On `use_default`, return the same shape as a normal user response.
   - On `skip` and `continue`, return the timeout result dict unchanged so the agent can decide how to proceed.
   - On `abort`, raise a normalized `AgentError` with code `interaction.timeout`; the SDK server should emit `action.failed`.

5. Update clients without making them timeout owners:
   - `agentctl run` should display timeout policy when prompting and tolerate runtime-triggered completion.
   - TUI should show timeout policy when an interaction is waiting and tolerate runtime-triggered completion.
   - Do not add new CLI options or TUI-only timeout state machines.

6. Extend conformance fake coverage:
   - Add a fake command such as `conformance.interactive_timeout`.
   - Let args select `abort`, `use_default`, `skip`, or `continue`.
   - Keep the command safe and fast; it must not depend on real `indbase`.
   - Prove timeout behavior without `--interaction-response`.

7. Add focused tests before broad checks:
   - Protocol schema tests for valid and invalid timeout policies.
   - Runtime tests for timer start, timer clear, timeout routing, terminal cleanup, and response-versus-timeout ordering.
   - SDK tests for default, skip, continue, and abort outcomes.
   - Conformance/agentctl/TUI tests that use the fake agent only.

## Validation

- Focused checks:
  - `pnpm --filter @consoler/protocol test`
  - `pnpm --filter @consoler/runtime test`
  - `pnpm --filter @consoler/conformance test`
  - `pnpm --filter @consoler/agentctl test`
  - `pnpm --filter @consoler/tui test`
  - `pnpm test:python-sdk`

- Conformance fake smokes:
  - `pnpm agentctl -- test conformance-fake --command conformance.interactive_timeout --args <mode-args.json> --approve`
  - `pnpm agentctl -- run conformance-fake conformance.interactive_timeout --args <mode-args.json> --approve`
  - Inspect with `pnpm agentctl -- trace <action_id> --json` and confirm timeout metadata is visible.
  - Run `pnpm agentctl -- replay <action_id>` and confirm replay remains accepted-events-only and response-free.

- Broad checks:
  - `pnpm test:conformance`
  - `pnpm test:agentctl-smoke`
  - `pnpm typecheck`
  - `pnpm build`
  - `pnpm test`

## Done means

- `InteractionRequest.timeout_policy` is validated by protocol schema and TypeScript types.
- Runtime owns timeout timers and routes timeout outcomes through the live interaction response path.
- `abort` ends as `action.failed` with `interaction.timeout`, not `action.cancelled`.
- `use_default`, `skip`, and `continue` unblock the agent with the expected response values.
- Trace records show timeout policy, trigger time, and outcome.
- Replay does not include timeout response/control records.
- `agentctl run` and TUI display timeout policy but do not enforce timeout themselves.
- Conformance fake covers all four timeout strategies without real `E:\indbase`.

## Unknowns

- The only expected tricky area is response-versus-timeout ordering. Keep it deterministic in runtime with one accepted outcome, and cover both ordering cases in focused tests.
