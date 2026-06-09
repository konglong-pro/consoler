---
doc_type: phase_plan
phase_id: v1l-interaction-response-redaction
title: Task execution brief: V1l interaction response redaction
status: completed
canonical: false
read_by_default: false
superseded_by: null
---

# Task execution brief: V1l interaction response redaction

## Objective

Add opt-in, field-level redaction for persisted interaction responses. The live agent process still receives full user responses; SQLite trace, history reads, and persisted `interaction.required` event payloads store redacted values only.

## Scope

- In scope: `prompt_schema` property marker `x-consoler-redact: true` (top-level object fields only), runtime redaction before persistence, `redacted_paths` on trace reads, `agentctl trace`, TUI Trace View, conformance fake `conformance.interactive_redaction`, additive `redacted_paths_json` column, `AGENTS.md`, and `CONTEXT.md`.
- Out of scope: real `E:\indbase`, retroactive row rewrites, request-level policy, nested JSON Pointer traversal, choices/primitive responses, transport encryption, multi-pending interactions, `system.*` events, replay shape changes.

## Start here

- Interaction trace persistence: `docs/planning/archive/consoler-v1/v1i-interaction-trace-persistence.md`
- Protocol interaction shape: `packages/protocol/src/schemas/interaction-request.json`
- Runtime store: `packages/runtime/src/db/schema.ts`, `packages/runtime/src/db/store.ts`
- Event ingest: `packages/runtime/src/event-store.ts`
- Trace reads: `packages/runtime/src/action-read-types.ts`, `packages/runtime/src/action-read.ts`, `packages/runtime/src/format-action-read.ts`
- Conformance fake: `packages/conformance/fixtures/fake_agent/`
- CLI/TUI: `packages/agentctl/`, `packages/tui/src/trace-panel.tsx`

## Do not touch

- Do not edit `E:\indbase`.
- Do not redact the payload sent through `action.respond_interaction`.
- Do not rewrite existing interaction rows.
- Do not add `interaction.response` events or change replay semantics.
- Do not hand-edit generated/build artifacts.

## Steps

1. Document the protocol marker on top-level `prompt_schema.properties.<field>` with `x-consoler-redact: true`.
2. Implement runtime redaction helpers: sentinel `"[REDACTED]"`, JSON Pointer paths `["/field"]`, top-level object fields only.
3. Redact before persistence in:
   - `interactions.request_json` (including `default_response` when marked)
   - `interactions.response_json` on respond
   - accepted `interaction.required` event `payload_json`
4. Add `redacted_paths_json` column; merge paths on respond.
5. Extend trace/read formatters and TUI to show `redacted_paths` without leaking originals.
6. Add `conformance.interactive_redaction` proving the agent receives the live value while trace JSON/text/replay never echo secrets. Result blocks must not embed secret plaintext (use `received_secret` + hash proof only).
7. Add focused protocol/runtime/conformance/agentctl/TUI tests.

## Validation

- `pnpm --filter @consoler/protocol test`
- `pnpm --filter @consoler/runtime test`
- `pnpm --filter @consoler/conformance test`
- `pnpm --filter @consoler/agentctl test`
- `pnpm --filter @consoler/tui test`
- `pnpm test:python-sdk`
- `pnpm test:conformance`
- `pnpm test:redaction-smoke`
- `pnpm test:agentctl-smoke`
- `pnpm typecheck`
- `pnpm build`
- `pnpm test`

## Done means

- Marked top-level object fields persist as `"[REDACTED]"` in trace and stored `interaction.required` payloads.
- Live `action.respond_interaction` still delivers full responses to the agent.
- Trace JSON/text/TUI expose `redacted_paths` and never show original sensitive values after persistence.
- Replay remains accepted-events-only without interaction response records.
- Conformance fake proves the agent received the live secret (hash proof) while full trace JSON/text/replay contain no secret plaintext.
