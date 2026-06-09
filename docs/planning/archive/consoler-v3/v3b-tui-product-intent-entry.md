---
doc_type: phase_plan
phase_id: v3b-tui-product-intent-entry
title: Task execution brief: V3b TUI product intent entry
status: completed
canonical: false
read_by_default: false
superseded_by: null
---

# Task execution brief: V3b TUI product intent entry

## Objective

Add the TUI-only third slice of Natural Language Intent Drafting: an indbase product variant natural-language entry that builds a variant-scoped `IntentScope`, calls the existing runtime `draftIntent({ text, scope })`, and opens the existing schema form with editable `prefilled_args`.

This slice must keep natural language as a single-shot action drafting shortcut. It must not prepare, preview, approve, execute, persist raw input, or turn the product TUI into cross-agent search.

## Scope

- In scope: `packages/tui` variant types, indbase variant hints, TUI intent scope helper, product home natural-language input, form prefill/notice behavior, focused TUI tests, and any small TUI docs/help copy needed by tests.
- Out of scope: runtime mapper behavior changes unless a narrow bug is exposed, `agentctl`, `packages/protocol`, DB schema, action/history persistence, LLM/provider integration, multi-turn chat, arbitrary agent search in product TUI, and `E:\indbase`.

## Start here

- Read: `CONTEXT.md` terms `Console Variant`, `Variant Configuration`, `Product Action Surface`, `Intent Scope`, `Natural Language Intent Drafting`, `Intent Draft`, `Intent Clarification`, and `draftIntent`.
- Read: `docs/adr/0003-natural-language-intent-drafting.md`.
- Parent phase brief: `docs/planning/archive/consoler-v3/v3b-natural-language-intent-drafting.md`.
- Completed runtime slice: `docs/planning/archive/consoler-v3/v3b-runtime-intent-mapper.md`.
- Completed CLI slice for output semantics only: `docs/planning/archive/consoler-v3/v3b-agentctl-intent-draft.md`.
- Product entry constraints: `docs/planning/archive/consoler-v3/v3a-console-variant-product-entrypoint.md`.
- Main TUI files:
  - `packages/tui/src/app.tsx`
  - `packages/tui/src/variant-types.ts`
  - `packages/tui/src/variants/indbase.ts`
  - `packages/tui/src/schema-form.ts`
  - `packages/tui/src/variant-display.ts`
  - `packages/tui/src/variant-validation.ts`
- Existing TUI tests to follow:
  - `packages/tui/test/indbase-variant-flow.test.tsx`
  - `packages/tui/test/dev-shell-flow.test.tsx`
  - `packages/tui/test/variant-contract.test.ts`
  - `packages/tui/test/schema-form.test.ts`

## Do not touch

- Do not edit `packages/protocol`, `AgentManifest`, protocol schemas, or manifest fixtures except for a test-only fixture fix proven necessary.
- Do not edit `packages/agentctl` or CLI smoke scripts in this slice.
- Do not add persistence for raw natural language, `IntentDraftResult`, partial candidates, reason messages, scores, or form notices.
- Do not create actions, approvals, runs, events, trace rows, history rows, or artifact retrieval attempts from natural-language submission.
- Do not call plan, preview, approve, execute, replay, trace, or artifact retrieval from the NL submit path.
- Do not add LLM/model dependencies, network calls, prompt files, API key configuration, translation, pinyin matching, or filesystem reads.
- Do not expose ordinary-user agent install/search/marketplace UI in product mode.
- Do not edit `E:\indbase`.

## Steps

1. Extend variant configuration types.
   - Add optional `intentHints?: string[]` to `VariantActionDef`.
   - Add optional `intentHints?: string[]` to `VariantFieldLabel`.
   - Keep these fields TUI/variant-only; do not mirror them into protocol or runtime types.

2. Add indbase product hints.
   - Add short action-level hints to `check_vault` and `ingest_file`.
   - Add short field-level hints for `vault_path` and `source_path`.
   - Include narrow English and Chinese keywords, not prompt examples or training samples.
   - Suggested hints:
     - check vault action: `check`, `status`, `vault`, `doctor`, `inspect`, `检查`, `诊断`, `知识库状态`
     - ingest file action: `import`, `ingest`, `file`, `add`, `导入`, `导入文件`, `文件入库`
     - `vault_path`: `vault`, `knowledge base`, `kb`, `知识库`, `库`
     - `source_path`: `file`, `source`, `document`, `文件`, `源文件`, `文档`

3. Add a TUI intent-scope helper.
   - Create a small helper such as `packages/tui/src/intent-scope.ts`.
   - Export `buildIntentScopeFromVariant(manifest, variant)`.
   - Include only commands allowed by the variant and present in the manifest.
   - Populate runtime `IntentScopeCommand` fields with:
     - `agent_id`
     - `command`
     - `command_description`
     - `args_schema`
     - `product_action_id`
     - `product_label`
     - `product_description`
     - `action_hints`
     - `field_hints`
     - `field_labels`
   - Do not import this helper into `packages/runtime`; dependency direction remains TUI -> runtime.

4. Add product home NL input.
   - Product mode home keeps the explicit product action list and adds one single-shot NL input above it.
   - Default focus is the NL input.
   - `Tab` toggles focus between NL input and the explicit action list.
   - Dev shell home remains the current generic `New Action` / `History` flow.
   - Empty NL submit stays on home and shows non-error guidance such as `Enter a request or press Tab to choose a task.`

5. Route NL submissions through the runtime mapper.
   - On non-empty NL submit, build the variant `IntentScope` and call `draftIntent({ text, scope })`.
   - On `candidate`, open the existing schema form for the matched command.
   - On `needs_clarification` with `reason: "missing_required_args"` and `partial_candidate`, open the matched form with the partial prefill and show the deterministic message above the form.
   - On other `needs_clarification` reasons, stay on home, show the deterministic message, and leave the explicit action list available as fallback.
   - Clear raw NL input only after a successful route into a form; do not persist it anywhere.

6. Reuse the existing form path.
   - Change `selectCommand(commandName)` to accept optional form seed options such as `{ prefilledArgs?, formNotice? }`.
   - Merge `prefilledArgs` over `defaultFormValues(fields)` only for known field names.
   - Keep all prefilled values editable.
   - Do not call prepare/preview/approval/execute until the user submits the form through the existing flow.
   - Keep product labels on the form; do not show raw protocol command names on the product form.

7. Add focused tests.
   - Add unit coverage for `buildIntentScopeFromVariant`.
   - Update `packages/tui/test/variant-contract.test.ts` or add a focused test to ensure indbase hints are declared only for allowed actions/fields.
   - Update `packages/tui/test/indbase-variant-flow.test.tsx` for:
     - product home shows NL input plus explicit product actions, without raw command names
     - default focus is NL input
     - `Tab` moves to the action list and Enter still opens the product-labeled form
     - `check vault C:\vault` opens check form with `vault_path` prefilled
     - `import C:\docs\a.md` opens import form with `source_path` prefilled, `vault_path` empty, and missing-field notice shown
     - unrelated text stays on home with `no_match` copy and the task list still available
     - NL candidate does not show approval, action id, preview, or execution UI
   - Update `packages/tui/test/dev-shell-flow.test.tsx` to confirm generic dev shell still has no product NL entry.

8. Keep copy deterministic and product-scoped.
   - Prefer messages produced by `draftIntent`; do not parse message text for behavior.
   - Product UI may display product labels and hints, while trace/debug surfaces keep protocol identifiers.
   - Do not introduce multi-turn chat copy or "assistant is thinking" style UI.

## Validation

- Focused TUI tests: `pnpm --filter @consoler/tui test`
- Focused TUI typecheck: `pnpm --filter @consoler/tui typecheck`
- Runtime regression tests: `pnpm --filter @consoler/runtime test`
- Build: `pnpm build`
- Broad tests: `pnpm test`
- Broad typecheck: `pnpm typecheck`
- Diff hygiene: `git diff --check`
- Manual TUI smoke:
  - Run `pnpm tui:indbase --`.
  - Confirm the first screen is indbase-contextual, has a single-shot NL input, and keeps explicit product tasks.
  - Submit a clear vault-check phrase and confirm the schema form opens with editable `vault_path`.
  - Submit a one-path import phrase and confirm `source_path` is prefilled while missing `vault_path` remains editable.
  - Submit unrelated text and confirm fallback stays on the product home, not command search or chat.

## Done means

- Product variant home has a single-shot NL input plus the explicit action list.
- NL input is variant-scoped and builds `IntentScope` from checked-in variant config plus the discovered manifest.
- Candidate results seed the existing schema form through editable `prefilled_args`.
- Missing-required-field partial candidates open the form with a deterministic notice and editable missing fields.
- Other clarification outcomes stay on product home with deterministic fallback copy.
- Dev shell behavior remains generic and unchanged.
- No protocol, DB, agentctl, action lifecycle, runtime persistence, LLM, or `E:\indbase` changes are required.
- Focused TUI tests, runtime regression tests, typecheck, build, root test, and `git diff --check` pass, or skipped checks are reported with reasons.

## Unknowns

- Exact React state names for NL focus/input/notice are implementation details.
- If Ink `TextInput` and `SelectInput` focus behavior requires small test timing helpers, keep them local to TUI tests and do not change runtime behavior.
- If runtime mapper behavior appears wrong, stop and isolate it as a runtime bug before expanding this TUI slice.
