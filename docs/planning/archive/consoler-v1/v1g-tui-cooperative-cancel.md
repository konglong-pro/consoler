---
doc_type: phase_plan
phase_id: v1g-tui-cooperative-cancel
title: Task execution brief: V1g TUI cooperative cancel
status: completed
canonical: false
read_by_default: false
superseded_by: null
---

# Task execution brief: V1g TUI cooperative cancel

## Objective

Connect V1f cooperative cancel control to the Ink TUI. During live execution, pressing `c` sends a cancel request through the runtime control handle; the TUI shows cancel-requested state until the agent emits a terminal event.

## Scope

- In scope: `packages/tui/src/app.tsx`, focused TUI tests, minimal hardening for `packages/tui/test/history-trace-flow.test.tsx`, and `AGENTS.md`.
- Out of scope: protocol changes, runtime cancel semantics beyond bug fixes, SDK/server changes, conformance harness changes, TUI support for selecting `conformance-fake`, real `indbase.ingest_file` cancel smoke, strong epoch/race handling, force-kill fallback, and `interaction.required`.

## Start here

- Read: `docs/planning/archive/consoler-v1/v1f-cooperative-cancel.md`
- TUI execution flow: `packages/tui/src/app.tsx`
- Runtime control API: `packages/runtime/src/runtime.ts`
- Runtime types: `packages/runtime/src/lifecycle-types.ts`
- TUI tests: `packages/tui/test/`
- Known flaky test: `packages/tui/test/history-trace-flow.test.tsx`

## Do not touch

- Do not add TUI support for `conformance-fake`.
- Do not add a new `cancelling` phase unless absolutely necessary; prefer `phase=running` plus `cancelRequested`.
- Do not treat a cancel request as a terminal state.
- Do not fake `action.cancelled` in TUI.
- Do not add strong cancel epoch/race handling or force-kill fallback.
- Do not edit `E:\indbase`.
- Do not hand-edit generated/build artifacts.

## Steps

1. Add TUI cancel state:
   - Add `cancelRequested` state or ref.
   - Reset it when selecting a command, submitting a form, approving preview, preparing, starting execution, and after terminal.
   - Add an execution control ref for the current `PreparedExecutionControl`.

2. Change execution approval:
   - In `approve()`, call `runtime.executePreparedWithControl(prepared, handlers)` instead of `executePrepared`.
   - Store the returned control in the ref.
   - Await `control.done`.
   - Close or clear the control in `finally`.
   - Preserve existing event handling and terminal block rendering.

3. Add running key handling:
   - In `useInput`, if `phase === "running"` and `input === "c"` and cancel is not already requested, call `control.cancel()`.
   - Set `cancelRequested=true` before awaiting `cancel()` so duplicate key presses do not send duplicate requests.
   - If `cancel()` rejects, surface the error and reset `cancelRequested=false` so the user can retry.

4. Render cancel UI:
   - During running state, show `Cancel requested; waiting for agent checkpoint` after cancel is requested.
   - Update the running footer to mention `c cancel`.
   - Keep approval-stage `n=cancel` behavior distinct from runtime cancel.

5. Add TUI tests:
   - Use an injected mock runtime with `executePreparedWithControl`.
   - Verify pressing `c` while running calls `cancel()`.
   - Verify duplicate `c` presses do not double-call `cancel()`.
   - Verify cancel-requested text appears.
   - Complete mock execution with `action.cancelled`; verify the finished timeline includes `action.cancelled` and no success blocks are rendered.

6. Stabilize the known history/trace flake:
   - Minimally adjust `packages/tui/test/history-trace-flow.test.tsx` input/wait strategy so broad `pnpm test` is reliable.
   - Do not refactor TUI navigation.

## Validation

- Focused checks:
  - `pnpm --filter @consoler/tui test`
  - `pnpm --filter @consoler/runtime test`
  - `pnpm --filter @consoler/conformance test`
  - `pnpm --filter @consoler/agentctl test`
  - `pnpm test:python-sdk`
  - `pnpm test:conformance`

- Cancel smoke, when a temporary or registered conformance fake registry is available:
  - `pnpm agentctl -- test conformance-fake --command conformance.slow_cancel --args <args.json> --approve --cancel-after-ms 100`

- Broad checks:
  - `pnpm typecheck`
  - `pnpm build`
  - `pnpm test`

## Done means

- During TUI live execution, pressing `c` sends exactly one cancel request.
- TUI shows cancel-requested state while still waiting for a terminal event.
- When `action.cancelled` arrives, TUI reaches finished state and shows the cancelled event timeline.
- TUI does not create or fake terminal events.
- Existing approval cancel/back-to-form behavior still works.
- Existing history/trace tests are no longer flaky under broad `pnpm test`.
- No protocol, SDK, strong cancel, force-kill, conformance harness, or `E:\indbase` changes are introduced.

## Unknowns

- None expected. If `executePreparedWithControl` needs a runtime bug fix for TUI integration, prove it with a focused runtime test and keep the change minimal.
