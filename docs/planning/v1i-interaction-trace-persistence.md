# Task execution brief: V1i interaction trace persistence

## Objective

Persist V1h interaction request/response facts so action trace can explain what an agent asked and what the user answered. Keep replay as accepted agent events only; interaction responses belong to trace/debug history, not replay.

## Scope

- In scope: `packages/runtime`, `packages/agentctl`, `packages/tui`, focused tests, `CONTEXT.md`, and `AGENTS.md`.
- Out of scope: real `E:\indbase` adoption, natural-language mapping, timeout policy, response redaction, secret classification, multi-pending interaction expansion, replay response rendering, `system.*` events, strong cancel/epoch changes, force-kill fallback, and execution replay.

## Start here

- Read: `docs/planning/v1h-interaction-required.md`
- Runtime store schema: `packages/runtime/src/db/schema.ts`
- Runtime store methods: `packages/runtime/src/db/store.ts`
- Runtime response path: `packages/runtime/src/runtime.ts`
- Trace data model: `packages/runtime/src/action-read-types.ts`
- Trace reads and formatting: `packages/runtime/src/action-read.ts`, `packages/runtime/src/format-action-read.ts`
- TUI trace view: `packages/tui/src/trace-panel.tsx`
- V1h interaction tests: `packages/runtime/test/interaction-response.test.ts`, `packages/tui/test/interaction-flow.test.tsx`

## Do not touch

- Do not edit `E:\indbase`.
- Do not change replay semantics; replay remains accepted-events-only.
- Do not store interaction responses as `ActionEvent` or add `system.interaction.*` event types.
- Do not add redaction, secret handling, or field-level storage policy in V1i.
- Do not add timeout/default/abort policy.
- Do not allow multiple concurrent pending interactions.
- Do not change `epoch: 0`, strong cancel semantics, or force-kill behavior.
- Do not hand-edit generated/build artifacts.

## Steps

1. Add interaction persistence:
   - Add an `interactions` table through the existing `CREATE TABLE IF NOT EXISTS` schema setup.
   - Store `run_id`, `action_id`, `agent_id`, `command`, `interaction_id`, `request_json`, `response_json`, `status`, `requested_at`, `responded_at`, and `closed_at`.
   - Enforce unique `(run_id, interaction_id)`.
   - Use status values `pending`, `responded`, and `abandoned`.

2. Write interaction records from runtime:
   - On accepted `interaction.required`, insert a `pending` interaction row with the request payload.
   - On successful `respondInteraction`, update the matching row to `responded` and store the full response JSON.
   - If a terminal event arrives while an interaction is still pending, mark it `abandoned`.
   - Do not persist failed response attempts.

3. Extend trace reads:
   - Add `InteractionTraceRecord` to runtime action-read types.
   - Add `interactions: InteractionTraceRecord[]` to `ActionTrace`.
   - Optionally add interaction counts to history rows if useful for display, but keep history compact.
   - Ensure existing traces without interaction rows still render normally.

4. Update CLI and TUI trace display:
   - Add an `Interactions` section to `formatActionTrace()`.
   - Show interaction id, title, message, status, request time, response time, and response JSON when present.
   - Update `TracePanel` to show the same interaction records.
   - Keep `trace --json` naturally exposing the new `interactions` array.

5. Add focused tests:
   - Store test: pending interaction can be inserted and then updated to responded.
   - Runtime execution test: accepted `interaction.required` creates a pending row.
   - Runtime response test: successful `respondInteraction` stores full JSON.
   - Terminal test: terminal event closes pending interaction as `abandoned`.
   - Trace format test: text trace includes interaction request/response details.
   - TUI trace test: trace panel renders interaction records.
   - Replay regression: replay output does not include response records.

6. Update docs:
   - Keep `AGENTS.md` as routing and validation guidance only.
   - Update `CONTEXT.md` to state that V1i persists interaction responses for trace, while replay still excludes them.

## Validation

- Focused checks:
  - `pnpm --filter @consoler/runtime test`
  - `pnpm --filter @consoler/agentctl test`
  - `pnpm --filter @consoler/tui test`
  - `pnpm test:conformance`
  - `pnpm test:python-sdk`

- Interaction trace smoke:
  - Run `pnpm agentctl -- test conformance-fake --command conformance.interactive_choice --args <args.json> --approve --interaction-response <response.json>` against an isolated conformance fake registry.
  - Inspect the resulting action with `pnpm agentctl -- trace <action_id>` or `trace --json` and confirm the interaction request and response are visible.

- Broad checks:
  - `pnpm typecheck`
  - `pnpm build`
  - `pnpm test`

## Done means

- Runtime persists accepted interaction requests and successful responses.
- Trace JSON includes interaction records.
- `agentctl trace` text shows the request and full response JSON.
- TUI Trace View shows interaction request/response records.
- Pending interactions are marked `abandoned` when a run ends before response.
- Replay remains accepted-events-only and does not show response records.
- No real `E:\indbase` changes, response redaction, timeout policy, `system.*` events, strong cancel, or force-kill changes are introduced.

## Unknowns

- None expected. If existing local databases already exist, rely on additive `CREATE TABLE IF NOT EXISTS`; do not add destructive migrations.
