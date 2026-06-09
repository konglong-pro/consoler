---
doc_type: phase_plan
phase_id: v1h-interaction-required
title: Task execution brief: V1h interaction.required
status: completed
canonical: false
read_by_default: false
superseded_by: null
---

# Task execution brief: V1h interaction.required

## Objective

Add the first runtime interaction loop for out-of-process agents. During execution, an agent can emit `interaction.required`, the TUI can collect a user response, and the runtime can route that response back to the same live agent process through `action.respond_interaction`.

## Scope

- In scope: `packages/protocol`, `packages/runtime`, `sdks/python`, `packages/conformance`, `packages/agentctl`, `packages/tui`, focused tests, `CONTEXT.md`, and `AGENTS.md`.
- Out of scope: real `E:\indbase` adoption, `agentctl run` interactive prompts, natural-language mapping, multiple concurrent pending interactions, interaction timeout policy, response persistence, `interactions` SQLite table, `system.*` events, strong cancel/epoch changes, force-kill fallback, pause, and execution replay.

## Start here

- Read: `docs/adr/0001-agent-protocol-v0-boundaries.md`
- Previous execution control: `docs/planning/archive/consoler-v1/v1f-cooperative-cancel.md`
- Current TUI execution control: `docs/planning/archive/consoler-v1/v1g-tui-cooperative-cancel.md`
- Protocol types and schemas: `packages/protocol/src/types.ts`, `packages/protocol/src/schemas/action-event.json`
- Runtime execution control: `packages/runtime/src/runtime.ts`, `packages/runtime/src/lifecycle-types.ts`
- Runtime transport: `packages/runtime/src/transport/jsonrpc.ts`
- Python SDK server and events: `sdks/python/consoler_agent_sdk/server.py`, `sdks/python/consoler_agent_sdk/events.py`
- Conformance fake agent: `packages/conformance/fixtures/fake_agent/`
- TUI execution UI: `packages/tui/src/app.tsx`

## Do not touch

- Do not edit `E:\indbase`.
- Do not make `agentctl run` prompt interactively in V1h.
- Do not add an `interactions` table or persist user responses.
- Do not add interaction timeout/default/abort policy.
- Do not allow multiple concurrent pending interactions.
- Do not add `system.interaction.*` events.
- Do not change `epoch: 0`, strong cancel semantics, or force-kill behavior.
- Do not hand-edit generated/build artifacts.

## Steps

1. Extend protocol for minimal interaction:
   - Add `InteractionRequest` with `interaction_id`, `title`, `message`, optional `choices`, optional `prompt_schema`, optional `default_response`, and optional `blocks`.
   - Add `interaction.required` to `ActionEventType`.
   - Add optional `interaction` to `ActionEvent`.
   - Update event JSON Schema so `interaction.required` requires `interaction`.
   - Keep V1h to choices plus simple object-schema inputs; do not add `ui_schema` or `timeout_policy`.

2. Add runtime response routing:
   - Add `respondInteraction(interactionId, response)` to `PreparedExecutionControl`.
   - Track a single pending accepted `interaction.required` event per run.
   - Reject response attempts when the run is terminal, no interaction is pending, or the interaction id does not match.
   - Validate response against `choices` or `prompt_schema` before sending it.
   - Send JSON-RPC `action.respond_interaction` to the same live agent process used by `agent.execute`.
   - Clear pending interaction after a successful agent response.

3. Add Python SDK interaction helper:
   - Support `action.respond_interaction` in the JSON-RPC server while `agent.execute` is running.
   - Add an `interaction` keyword helper to `AgentAdapter.execute(...)`; keep the existing `emitter` and `cancel_flag` parameters.
   - Implement `interaction.request(...)` so it emits `interaction.required`, blocks until the matching response arrives, then returns the response.
   - Enforce one pending interaction at a time and return `AgentError` for unknown, stale, or duplicate responses.

4. Extend conformance and agentctl test:
   - Add a fake command such as `conformance.interactive_choice` that asks for a choice and succeeds based on the response.
   - Add a simple object-schema interaction command only if needed for TUI form coverage.
   - Add conformance input support for a pre-seeded interaction response.
   - Add `agentctl test --interaction-response <path>` for command-specific conformance.
   - Missing interaction response must fail fast with a clear conformance row, not hang.

5. Add TUI interaction UI:
   - During `phase=running`, render pending interactions as an inline blocking card below the live timeline.
   - For `choices`, use numeric keys to respond.
   - For object schema, reuse the existing small form behavior for string/number/boolean required fields.
   - Show response-sending state and surface response errors so the user can retry.
   - Keep runtime cancel available while an interaction is pending; cancel request is still not a terminal state.

6. Update docs:
   - Keep `AGENTS.md` as routing and validation guidance only.
   - Add `CONTEXT.md` glossary terms for `Interaction Request`, `Interaction Response`, and `Pending Interaction`.
   - Do not create an ADR unless implementation changes epoch, persistence, timeout, or multi-pending semantics.

## Validation

- Focused checks:
  - `pnpm --filter @consoler/protocol test`
  - `pnpm --filter @consoler/runtime test`
  - `pnpm --filter @consoler/conformance test`
  - `pnpm --filter @consoler/agentctl test`
  - `pnpm --filter @consoler/tui test`
  - `pnpm test:python-sdk`
  - `pnpm test:conformance`

- Interaction smoke, using an isolated conformance fake registry and args/response files:
  - `pnpm agentctl -- test conformance-fake --command conformance.interactive_choice --args <args.json> --approve --interaction-response <response.json>`

- Broad checks:
  - `pnpm typecheck`
  - `pnpm build`
  - `pnpm test`

## Done means

- Protocol validates `interaction.required` events and rejects malformed interaction events.
- Python SDK can emit an interaction request during execute and resume only after receiving the matching response.
- Runtime routes `respondInteraction` to the live agent process and rejects stale, unknown, or terminal responses.
- Conformance fake proves an interactive command succeeds with a pre-seeded response.
- `agentctl test` supports non-interactive interaction response injection.
- TUI displays an inline interaction card, sends a choice or object-schema response, and then shows the final result.
- Pending interaction does not break cooperative cancel.
- No real `E:\indbase` changes, response persistence, timeout policy, multi-pending interaction, or `agentctl run` prompt is introduced.

## Unknowns

- None expected. If response validation for full JSON Schema becomes too broad, keep V1h to choices and simple object schemas and document the unsupported schema shape in focused tests.
