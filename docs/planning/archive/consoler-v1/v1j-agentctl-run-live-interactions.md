---
doc_type: phase_plan
phase_id: v1j-agentctl-run-live-interactions
title: Task execution brief: V1j agentctl run live interactions
status: completed
canonical: false
read_by_default: false
superseded_by: null
---

# Task execution brief: V1j agentctl run live interactions

## Objective

Make `agentctl run` handle live `interaction.required` events from the executing agent. A user should be able to run an interactive command from the CLI, answer the prompt, and still get the final machine-readable run result on stdout.

## Scope

- In scope: `packages/agentctl`, focused agentctl tests, isolated conformance fake smoke coverage, `AGENTS.md`, and this document.
- Out of scope: protocol changes, Python SDK changes, TUI changes, real `E:\indbase` adoption, timeout policy, response redaction, multiple concurrent pending interactions, `system.*` events, strong epoch handling, force-kill fallback, and execution replay.

## Start here

- Previous interaction loop: `docs/planning/archive/consoler-v1/v1h-interaction-required.md`
- Interaction trace persistence: `docs/planning/archive/consoler-v1/v1i-interaction-trace-persistence.md`
- CLI entrypoint: `packages/agentctl/src/main.ts`
- Runtime execution control: `packages/runtime/src/lifecycle-types.ts`, `packages/runtime/src/runtime.ts`
- Runtime interaction validation: `packages/runtime/src/interaction-response.ts`
- Runtime block summaries: `packages/runtime/src/format-block.ts`
- Conformance fake agent: `packages/conformance/fixtures/fake_agent/`

## Do not touch

- Do not edit `E:\indbase`.
- Do not change protocol schemas or protocol TypeScript types.
- Do not change Python SDK behavior.
- Do not change TUI interaction behavior.
- Do not add dependencies; use Node built-ins if CLI prompting needs a reader.
- Do not make stdout a mixed human log stream.
- Do not persist interaction responses directly from agentctl; persistence belongs to runtime.
- Do not hand-edit generated/build artifacts.

## Steps

1. Add CLI response loading for `run`:
   - Add `--interaction-response <path>` to `agentctl run`.
   - Parse the file as any JSON value, including primitive strings such as `"ok"`.
   - Keep the existing object-only args loader for `--args`; do not loosen command args parsing by accident.
   - Treat the response file as the first next response only. If another interaction appears, prompt when TTY is available and fail otherwise.

2. Route approved runs through runtime control:
   - Preserve current preview approval and execution approval behavior, including exit code `2`.
   - When approval is present, use `prepareAction` plus `executePreparedWithControl` so `respondInteraction` is available.
   - Keep final stdout as structured JSON compatible with the current successful `run` shape.
   - Send interaction prompts, validation errors, and retry messages to stderr.

3. Implement CLI interaction answering:
   - On accepted `interaction.required`, print title and message to stderr.
   - For `choices`, list numbered choices and accept either a number or a choice id.
   - For simple object `prompt_schema`, prompt string, number/integer, and boolean fields.
   - Use `default_response` when it matches the supported response shape.
   - Show `interaction.blocks` as summaries through the existing runtime block summarizer.
   - If stdin is not a TTY and no usable pre-seeded response exists, fail clearly instead of hanging.

4. Keep failure behavior deterministic:
   - If the user enters an invalid response, show the validation error and retry while the run is still pending.
   - If the run reaches terminal before a valid response can be sent, surface the runtime error and exit non-zero.
   - Do not fake terminal state; the agent still owns `action.succeeded`, `action.failed`, or `action.cancelled`.

5. Add focused tests:
   - Factor prompt/response parsing enough to test it without a real terminal.
   - Test choice number and choice id mapping.
   - Test object schema coercion for string, number/integer, and boolean.
   - Test unsupported schema and non-TTY missing response failures.
   - Test JSON response file parsing accepts primitive values.
   - Add a command-level test or smoke helper proving `agentctl run` can answer `conformance.interactive_choice`.

6. Update docs:
   - Keep `AGENTS.md` short and route V1j to this brief.
   - Do not add a common command until the implementation exists.
   - Do not update `CONTEXT.md` unless implementation introduces a stable glossary distinction not already covered by Interaction Request/Response.

## Validation

- Focused checks:
  - `pnpm --filter @consoler/agentctl test`
  - `pnpm --filter @consoler/runtime test`
  - `pnpm test:conformance`
  - `pnpm test:python-sdk`

- CLI smoke with an isolated conformance fake registry:
  - `pnpm agentctl -- run conformance-fake conformance.interactive_choice --args <args.json> --approve --interaction-response <response.json>`
  - Inspect the resulting action with `pnpm agentctl -- trace <action_id>` and confirm the interaction response is visible.
  - Run `pnpm agentctl -- replay <action_id>` and confirm replay does not include the response record.

- Broad checks:
  - `pnpm typecheck`
  - `pnpm build`
  - `pnpm test`

## Done means

- `agentctl run` can complete an interactive conformance fake command with `--interaction-response`.
- `agentctl run` can prompt for choices and simple object-schema responses in a TTY.
- Non-TTY runs without a response file fail fast and do not hang.
- stdout remains final structured run JSON; interaction UI text goes to stderr.
- Trace includes the runtime-persisted interaction response, while replay stays accepted-events-only.
- No protocol, SDK, TUI, or real `E:\indbase` changes are introduced.

## Unknowns

- None expected. If terminal prompting is hard to cover directly, keep parsing and response selection in a small helper with focused tests and use the conformance fake for the end-to-end path.
