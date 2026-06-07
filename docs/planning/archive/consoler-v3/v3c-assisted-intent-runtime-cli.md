---
doc_type: phase_plan
phase_id: v3c-assisted-intent-runtime-cli
title: Task execution brief: V3c assisted intent runtime/CLI
status: completed
canonical: false
read_by_default: false
superseded_by: null
---

# Task execution brief: V3c assisted intent runtime/CLI

## Objective

Add the first V3c slice for LLM-assisted Intent Drafting: runtime-owned assisted orchestration plus `agentctl intent-draft --assist`. Assistance is opt-in, deterministic-first, fake-provider tested, and must return the same reviewable Intent Drafting outcomes as V3b.

This slice must not execute actions, persist raw natural language, leak provider details, or require real provider credentials for normal development, CI, or release gates.

## Scope

- In scope: runtime provider interfaces, assisted orchestration, provider suggestion validation, timeout/fallback behavior, fake provider tests, optional generic JSON-over-HTTP provider adapter, `agentctl intent-draft --assist`, CLI output tests, smoke/gate script, and docs.
- Out of scope: TUI wiring, protocol or `AgentManifest` changes, DB schema, action/history/trace persistence, prompt history, model-specific SDKs, provider-specific fixtures, multi-turn chat, multi-action workflows, streaming, tool calls, model fallback chains, and real `E:\indbase` changes.

## Start here

- Read: `CONTEXT.md` terms `Natural Language Intent Drafting`, `Intent Draft`, `Intent Clarification`, `Intent Mapper`, `Intent Scope`, `draftIntent`, `Deterministic Intent Mapper`, `LLM-assisted Intent Drafting`, `Intent Draft Orchestration`, and `LLM Intent Provider`.
- Read: `docs/adr/0003-natural-language-intent-drafting.md`.
- Read: `docs/adr/0004-llm-assisted-intent-drafting.md`.
- Existing runtime mapper: `packages/runtime/src/intent-draft.ts`, `packages/runtime/src/intent-draft-types.ts`.
- Existing CLI command: `packages/agentctl/src/main.ts`, `packages/agentctl/src/intent-draft.ts`.
- Existing V3b tests: `packages/runtime/test/intent-draft.test.ts`, `packages/agentctl/test/intent-draft.test.ts`, `scripts/test-agentctl-smoke.mjs`, `docs/testing/archive/consoler-v3/v3b-intent-gate.md`.

## Do not touch

- Do not edit `packages/protocol`, protocol schemas, or `AgentManifest`.
- Do not add event types, DB migrations, history rows, trace rows, or action records for assisted drafting.
- Do not make `draftIntent({ text, scope })` read env vars, call providers, spawn agents, read files, or become async.
- Do not commit real provider endpoints, API keys, model names, auth header details, real request/response fixtures, `.env` files, local provider config files, logs, or snapshots.
- Do not bind the repository to a private provider interface. If real HTTP I/O is added, keep it to a minimal generic JSON-over-HTTP adapter and use a local untracked shim/proxy for private provider contracts.
- Do not add model SDK dependencies unless explicitly approved in a separate decision.
- Do not add TUI assisted behavior in this slice.

## Steps

1. Add runtime assisted intent types.
   - Define an `LlmIntentProvider` interface or equivalent runtime-owned provider shape.
   - Define a provider suggestion type that can name one `agent_id`, one `command`, reviewable `prefilled_args`, and optional non-sensitive message.
   - Define stable assisted fallback notice codes such as `assisted_unavailable`, `assisted_timed_out`, and `assisted_invalid_output`.
   - Keep provider suggestions separate from public `IntentDraftResult`; orchestration owns normalization.

2. Add assisted orchestration.
   - Add a runtime helper such as `draftIntentAssisted({ text, scope, provider, timeoutMs? })`.
   - Run deterministic `draftIntent({ text, scope })` first.
   - If deterministic returns a complete `candidate`, return it and do not call the provider.
   - If deterministic returns `needs_clarification` and assistance is enabled, call the provider.
   - Validate provider output against the current `IntentScope`.
   - Accept only scoped agent/command, known schema fields, schema-valid values, and at most one action.
   - For missing required fields, return a deterministic `missing_required_args` clarification with a partial candidate.
   - For provider timeout, failure, malformed output, unscoped command, unknown fields, schema-invalid values, or multi-action output, return the original deterministic result plus a non-sensitive fallback notice.

3. Add fake-provider runtime tests.
   - Deterministic candidate does not call provider.
   - Deterministic clarification calls provider when assistance is enabled.
   - Valid provider suggestion becomes a candidate.
   - Valid partial suggestion becomes `missing_required_args` with `partial_candidate`.
   - Unscoped command, unknown field, malformed output, schema-invalid output, multi-action output, provider rejection, and timeout all fall back.
   - Public result does not expose numeric confidence, ranked candidates, raw provider output, endpoints, model names, stack traces, or private error bodies.

4. Add optional generic JSON-over-HTTP provider adapter only if needed for local smoke.
   - Use env-only configuration with generic variable names.
   - Keep the wire contract one-shot and suggestion-only: request has current text and `IntentScope`; response has at most one suggestion or clarification.
   - Do not support chat transcripts, streaming, tool calls, provider model selection in request bodies, prior history, raw prompt templates, multiple candidates, or user-visible confidence.
   - Do not add real endpoint examples or provider-specific fixtures.

5. Wire `agentctl intent-draft --assist`.
   - Add an explicit `--assist` flag; default `agentctl intent-draft` remains deterministic.
   - Reuse current manifest discovery and `IntentScope` construction.
   - In tests, inject or construct a fake provider path without reading real env.
   - For local real-provider smoke, read env-only generic provider config and fail closed to deterministic fallback when unavailable.
   - Human output may show non-sensitive assisted fallback notices.
   - `--json` must preserve stable runtime result shape plus stable non-sensitive assist notice fields if added.
   - Exit 0 for candidate and clarification outcomes.

6. Add V3c gate.
   - Add `scripts/test-v3c-assisted-intent-gate.mjs`.
   - Add root package script `test:v3c-assisted-intent-gate`.
   - Gate should use fake-provider coverage and existing package tests, not real provider credentials or network calls.
   - Keep real provider smoke optional and local-only; do not record private endpoint/model details in committed evidence.

7. Update routing docs after implementation.
   - Add V3c routing and validation commands to `AGENTS.md`.
   - Add `docs/testing/archive/consoler-v3/v3c-assisted-intent-gate.md`.
   - Keep detailed provider contract and local-only smoke cautions in docs, not in `AGENTS.md`.

## Validation

- Runtime focused tests: `pnpm --filter @consoler/runtime test`
- Agentctl focused tests: `pnpm --filter @consoler/agentctl test`
- V3c assisted intent gate: `pnpm test:v3c-assisted-intent-gate`
- Typecheck: `pnpm typecheck`
- Build: `pnpm build`
- Diff hygiene: `git diff --check`

Optional local-only smoke:

- Run `agentctl intent-draft --assist` against a local generic provider shim configured through environment variables.
- Do not commit, log, document, or paste private endpoint, credential, model, request, or response details.

## Done means

- `draftIntent({ text, scope })` remains pure, deterministic, sync/offline, and unchanged in public behavior.
- Assisted orchestration is deterministic-first and provider suggestions are validated before becoming public results.
- Provider failures and invalid output fall back to deterministic results with only non-sensitive notices.
- `agentctl intent-draft --assist` is explicit opt-in; the default CLI path remains deterministic.
- No protocol, manifest, DB, TUI, action lifecycle, history, trace, or real `E:\indbase` changes are required.
- Fake-provider tests and the V3c gate pass without network access or real credentials.
- No private provider details appear in committed code, docs, fixtures, snapshots, logs, PR descriptions, or release notes.

## Unknowns

- Exact runtime helper and notice field names can be chosen during implementation, but they must stay provider-neutral and avoid leaking private provider details.
- Whether to include the generic JSON-over-HTTP adapter in the first implementation can be decided during implementation; if included, it must stay generic and env-only.
- TUI opt-in wiring is a later V3c slice and should get its own execution brief.
