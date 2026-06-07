---
doc_type: phase_plan
phase_id: v3c-assisted-intent-tui-entry
title: Task execution brief: V3c assisted intent TUI entry
status: completed
canonical: false
read_by_default: false
superseded_by: null
---

# Task execution brief: V3c assisted intent TUI entry

## Objective

Add the second V3c slice for LLM-assisted Intent Drafting: product-variant TUI opt-in wiring for assisted natural-language drafting, with transient non-sensitive notices and deterministic fallback.

This slice consumes the runtime/CLI assisted orchestration from `docs/planning/archive/consoler-v3/v3c-assisted-intent-runtime-cli.md`. It must not add provider setup UI, persist raw natural language, expose provider details, alter the Runtime Lifecycle, or affect the generic development shell.

## Scope

- In scope: `packages/tui` product NL submit path, assisted opt-in reading in the TUI entrypoint, transient notice routing, assisted busy state, focused TUI tests, a shared provider-config helper refactor if needed, agentctl regression tests if that helper moves, a TUI-specific V3c gate script, and docs.
- Out of scope: protocol or `AgentManifest` changes, DB schema, action/history/trace persistence, provider setup UI, visible provider status, prompt logs, model-specific SDKs, streaming, tool calls, multi-turn chat, multi-action workflows, dev-shell assisted behavior, and real `E:\indbase` changes.

## Start here

- Read: `CONTEXT.md` terms `Console Variant`, `Product Action Surface`, `Natural Language Intent Drafting`, `Intent Scope`, `LLM-assisted Intent Drafting`, `Intent Draft Orchestration`, and `LLM Intent Provider`.
- Read: `docs/adr/0003-natural-language-intent-drafting.md`.
- Read: `docs/adr/0004-llm-assisted-intent-drafting.md`.
- Read: `docs/planning/archive/consoler-v3/v3b-tui-product-intent-entry.md`.
- Read: `docs/planning/archive/consoler-v3/v3c-assisted-intent-runtime-cli.md`.
- Main TUI files:
  - `packages/tui/src/main.tsx`
  - `packages/tui/src/app.tsx`
  - `packages/tui/src/intent-scope.ts`
  - `packages/tui/src/variant-types.ts`
  - `packages/tui/src/variants/indbase.ts`
- Runtime/agentctl adjacent files if provider config helper is shared:
  - `packages/runtime/src/intent-draft-http-provider.ts`
  - `packages/runtime/src/index.ts`
  - `packages/agentctl/src/intent-draft-run.ts`
- Existing tests to follow:
  - `packages/tui/test/indbase-variant-flow.test.tsx`
  - `packages/tui/test/dev-shell-flow.test.tsx`
  - `packages/tui/test/intent-scope.test.ts`
  - `packages/agentctl/test/intent-draft.test.ts`
  - `packages/runtime/test/intent-draft-assisted.test.ts`

## Do not touch

- Do not edit `packages/protocol`, protocol schemas, `AgentManifest`, DB schema, action lifecycle persistence, history, trace, replay, or artifact retrieval.
- Do not make the generic dev shell (`pnpm tui --`) use assisted drafting or expose provider UI.
- Do not add provider endpoint, model, credential, auth header, request, response, prompt, or `.env` examples to committed files.
- Do not add ordinary-user provider setup screens, persistent provider status, provider names, endpoints, models, credentials, or debug panels to the TUI.
- Do not create actions, approvals, runs, events, trace rows, history rows, or artifact retrieval attempts from natural-language submission.
- Do not call prepare, preview, approve, execute, replay, trace, or artifact retrieval from the NL submit path.
- Do not edit `E:\indbase`.

## Steps

1. Add shared provider-config construction if needed.
   - Move or duplicate-free the first-slice env parsing so TUI does not import from `packages/agentctl`.
   - Prefer a runtime-owned helper that receives an env-like object explicitly rather than reading `process.env` as a hidden side effect.
   - Keep generic provider config names:
     - `CONSOLER_INTENT_PROVIDER_URL`
     - `CONSOLER_INTENT_PROVIDER_TIMEOUT_MS`
   - Keep `agentctl intent-draft --assist` behavior unchanged after the refactor.

2. Add product TUI assisted opt-in.
   - Use `CONSOLER_TUI_ASSISTED_INTENT=1` as the product TUI enablement switch.
   - Require both the TUI enablement switch and provider config before sending user input to a provider.
   - A provider URL alone must not enable assisted drafting in product TUI.
   - `pnpm tui:indbase --` and `pnpm tui -- --variant indbase` use assisted drafting only when explicitly enabled.
   - `pnpm tui --` development shell remains unchanged even when assisted env vars are set.

3. Wire product NL submit through assisted orchestration.
   - Build the current variant-scoped `IntentScope` as V3b already does.
   - If assisted is disabled, keep the current deterministic `draftIntent({ text, scope })` behavior.
   - If assisted is enabled, call runtime assisted orchestration with the configured provider.
   - Keep deterministic-first behavior: if deterministic returns a candidate, the provider should not be called.
   - Do not persist the raw NL text, provider request, provider response, assist notice, or intermediate suggestion.

4. Route transient notices.
   - Provider success candidate: open the existing schema form with editable `prefilled_args`; do not show "assisted success" copy.
   - Provider success partial candidate: open the existing schema form with missing-field `formNotice`.
   - Provider failure, timeout, unavailable config, or invalid output plus deterministic `no_match`/ambiguous/unsupported result: stay on home and show deterministic message plus non-sensitive assist notice.
   - Provider failure, timeout, unavailable config, or invalid output plus deterministic partial candidate: open the form and show missing-field notice plus non-sensitive assist notice.
   - Notices are transient TUI state only; they must not enter form values, history, trace, replay, logs, or persisted action data.

5. Preserve NL input intentionally.
   - If the user remains on home after clarification or fallback, keep the typed natural-language input so it can be edited.
   - If the user routes into a form through a candidate or partial candidate, clear the NL input.
   - Provider fallback notices must not change this rule.

6. Add assisted busy behavior.
   - When a provider call is actually pending, show neutral copy such as `Drafting request...`.
   - Do not show "AI is thinking", provider names, endpoints, models, or debug details.
   - Prevent duplicate NL submits while the assisted call is pending.
   - Do not leave the TUI in an unrecoverable busy state after provider timeout, rejection, invalid output, or unmount.

7. Add focused TUI tests.
   - Product TUI does not call provider when `CONSOLER_TUI_ASSISTED_INTENT` is absent, even if provider config exists.
   - Product TUI calls an injected/fake provider when `CONSOLER_TUI_ASSISTED_INTENT=1` and provider config is available.
   - Deterministic candidate path does not call provider.
   - Assisted success opens the product-labeled schema form with editable prefilled values.
   - Assisted partial opens the form with missing-field notice.
   - Assisted unavailable/timeout/invalid output shows non-sensitive transient notice and deterministic fallback.
   - Busy copy appears while a fake provider promise is pending, and duplicate submit is ignored.
   - Home clarification keeps the user's NL input; form routing clears it.
   - Dev shell has no assisted NL entry even with assisted env vars set.
   - TUI frames do not show provider endpoint, model, credential, request body, response body, or stack trace.

8. Add TUI gate docs and script.
   - Add `scripts/test-v3c-tui-assisted-intent-gate.mjs`.
   - Add root package script `test:v3c-tui-assisted-intent-gate`.
   - Keep the runtime/CLI gate `pnpm test:v3c-assisted-intent-gate` unchanged.
   - Gate must use fake/injected providers only and must not require real provider credentials, network access, real `E:\indbase`, or real vaults.

9. Update routing docs after implementation.
   - Add second-slice routing and validation to `AGENTS.md`.
   - Add `docs/testing/archive/consoler-v3/v3c-tui-assisted-intent-gate.md`.
   - Keep local real-provider smoke guidance non-sensitive.

## Validation

- Focused TUI tests: `pnpm --filter @consoler/tui test`
- Runtime regression tests: `pnpm --filter @consoler/runtime test`
- Agentctl regression tests if provider helper moves: `pnpm --filter @consoler/agentctl test`
- V3c TUI assisted gate: `pnpm test:v3c-tui-assisted-intent-gate`
- V3c runtime/CLI assisted gate: `pnpm test:v3c-assisted-intent-gate`
- Typecheck: `pnpm typecheck`
- Build: `pnpm build`
- Diff hygiene: `git diff --check`

Optional local-only smoke:

- Run product TUI with `CONSOLER_TUI_ASSISTED_INTENT=1` and a local generic provider shim.
- Submit an input that deterministic drafting cannot complete but the provider can suggest.
- Confirm the product form opens or a non-sensitive fallback notice appears.
- Do not commit, log, document, or paste private endpoint, credential, model, prompt, request, or response details.

## Done means

- Product TUI assisted drafting is explicit opt-in and requires both `CONSOLER_TUI_ASSISTED_INTENT=1` and provider configuration.
- Product TUI does not send user input to a provider merely because a provider URL exists.
- Dev shell behavior remains generic and unchanged.
- Assisted success and fallback route through the existing reviewable schema form/home fallback behavior.
- Notices are transient, non-sensitive, and not persisted.
- Busy state is neutral, recoverable, and prevents duplicate submits.
- No protocol, manifest, DB, action lifecycle, history, trace, replay, artifact retrieval, or real `E:\indbase` changes are required.
- Fake-provider tests and the TUI gate pass without network access or real credentials.
- No private provider details appear in committed code, docs, fixtures, snapshots, logs, PR descriptions, or release notes.

## Unknowns

- Exact React prop and state names are implementation details.
- If Ink input timing requires small test helpers, keep them local to TUI tests.
- If the shared provider config helper refactor exposes a first-slice bug, fix it narrowly and keep agentctl behavior stable.
