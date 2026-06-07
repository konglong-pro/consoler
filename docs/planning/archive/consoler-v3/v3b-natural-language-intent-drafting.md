---
doc_type: phase_plan
phase_id: v3b-natural-language-intent-drafting
title: Task execution brief: V3b natural language intent drafting
status: completed
canonical: false
read_by_default: false
superseded_by: null
---

# Task execution brief: V3b natural language intent drafting

## Objective

Add a deterministic natural-language entry path that maps one user input into a reviewable single-action candidate inside the current Console Variant. The result must seed the existing schema form and then continue through the normal Runtime Lifecycle; it must not execute, approve, persist raw language, or bypass validation.

## Scope

- In scope: `packages/runtime` intent-draft types and mapper, `agentctl intent-draft`, TUI product variant natural-language entry, variant `intentHints`, focused tests, and docs.
- Out of scope: LLM/provider integration, prompt policy, multi-turn chat, persisted raw natural language or Intent Drafts, protocol or `AgentManifest` NL-only fields, filesystem reads during mapping, multi-action workflows, arbitrary cross-agent search in product TUI, and `E:\indbase` agent changes.

## Start here

- Read: `CONTEXT.md` terms `Console Variant`, `Variant Configuration`, `Intent Scope`, `Natural Language Intent Drafting`, `Intent Draft`, `Intent Clarification`, `Intent Mapper`, and `draftIntent`.
- Read: `docs/adr/0003-natural-language-intent-drafting.md`.
- Read for product entry constraints: `docs/planning/archive/consoler-v3/v3a-console-variant-product-entrypoint.md`.
- Runtime code: `packages/runtime/src/index.ts`; add isolated modules such as `packages/runtime/src/intent-draft.ts` and `packages/runtime/src/intent-draft-types.ts`.
- CLI code: `packages/agentctl/src/main.ts`, plus small formatter/helper files if needed.
- TUI variant code: `packages/tui/src/variant-types.ts`, `packages/tui/src/variants/indbase.ts`, `packages/tui/src/app.tsx`, `packages/tui/src/main.tsx`, `packages/tui/src/schema-form.ts`.
- Existing TUI tests to follow: `packages/tui/test/indbase-variant-flow.test.tsx`, `packages/tui/test/dev-shell-flow.test.tsx`, `packages/tui/test/variant-contract.test.ts`.

## Do not touch

- Do not change `packages/protocol` or `AgentManifest` schemas for first-version intent drafting.
- Do not add model SDKs, network calls, prompt files, or API key configuration.
- Do not add persistence tables, DB migrations, history rows, or trace rows for raw natural language or ephemeral Intent Drafts.
- Do not make `packages/runtime` import `ConsoleVariantConfig` or TUI files.
- Do not let intent mapping read the filesystem, inspect cwd/history/prior actions, spawn agents, or call plan/preview/execute.
- Do not edit `E:\indbase` for this phase.
- Do not add ordinary-user agent install/search/marketplace UI.

## Steps

1. Add runtime intent-draft types and pure mapper.
   - Export `draftIntent({ text, scope })` from `@consoler/runtime`.
   - Define a neutral `IntentScope` with allowed command entries, manifest-derived command/schema data, optional product action id, labels/descriptions, and short action/field hints.
   - Return `IntentDraftResult` as either `candidate` or `needs_clarification`.
   - Candidate output must use `prefilled_args`, not `args`.
   - Keep internal scores private; public output should use outcome, reason code, and explanatory text.

2. Implement deterministic matching conservatively.
   - Match against command names/descriptions, schema field names/descriptions, and `IntentScope` labels/hints.
   - Support basic localized input only through deterministic keyword/substring matching from hints.
   - Extract obvious quoted strings, Windows/Unix paths, URLs, numbers, booleans, and simple enum/default values.
   - Support only top-level object input schemas with primitive fields; return `unsupported_schema` for complex schemas.
   - Use first-version reason codes only: `no_match`, `ambiguous_command`, `missing_required_args`, `ambiguous_args`, `unsupported_schema`.
   - Do not infer missing path fields from cwd, history, prior actions, or filesystem state.

3. Add focused runtime tests.
   - Cover one clear candidate with `prefilled_args`.
   - Cover every `needs_clarification` reason code.
   - Cover ambiguous command and ambiguous path-like args.
   - Cover unsupported schema fallback.
   - Cover localized hints from `IntentScope`.
   - Cover that multi-target input does not expand into multiple actions or files.

4. Add `agentctl intent-draft`.
   - Default output should be human-readable debug text.
   - `--json` should emit stable JSON with outcome, reason code/message when present, matched product action when present, protocol `agent_id`/`command`, and `prefilled_args`.
   - Support `--agent <id>` for developer debugging; product TUI remains variant-scoped.
   - Build the neutral `IntentScope` from discovered manifest data and optional agent filter, not from TUI variant types.

5. Add TUI variant natural-language entry.
   - Extend `ConsoleVariantConfig` with narrow `intentHints` for action-level and field-level keyword arrays.
   - Build an `IntentScope` from the current variant and discovered manifest.
   - Product home should keep the explicit product action list and add a single-shot natural-language input.
   - Candidate results should open the existing schema form with `prefilled_args` as editable initial values.
   - `needs_clarification` should show deterministic copy and route to the variant action/form fallback, not a chat loop.
   - Do not expose arbitrary cross-agent search in the product TUI.

6. Update docs after implementation.
   - Add implemented command examples to `AGENTS.md` Common Commands only after `agentctl intent-draft` exists.
   - Keep detailed behavior in this planning doc and ADR 0003; keep `AGENTS.md` as routing and validation only.

## Validation

- Runtime focused check: `pnpm --filter @consoler/runtime test`
- Agentctl focused check: `pnpm --filter @consoler/agentctl test`
- TUI focused check: `pnpm --filter @consoler/tui test`
- V3b closeout gate: `pnpm test:v3b-intent-gate`
- Typecheck: `pnpm typecheck`
- Build: `pnpm build`
- Diff hygiene: `git diff --check`
- CLI smoke after the command is implemented:
  - Human output: `pnpm agentctl -- intent-draft "import a file" --agent indbase`
  - JSON output: `pnpm agentctl -- intent-draft "import a file" --agent indbase --json`
- Manual TUI smoke after implementation:
  - Run `pnpm tui:indbase --`.
  - Confirm the first screen is indbase-contextual, keeps explicit product actions, and includes a single-shot natural-language input.
  - Submit a clear import/check phrase and confirm the schema form opens with editable prefilled values.
  - Submit an ambiguous phrase and confirm deterministic clarification/fallback, not chat.

## Done means

- `draftIntent({ text, scope })` exists in `@consoler/runtime` and is pure, deterministic, and tested.
- Runtime intent mapping does not import TUI variant types, read the filesystem, spawn agents, or persist input/drafts.
- `agentctl intent-draft` provides human-readable output and stable `--json`.
- Product TUI natural-language entry is variant-scoped, single-shot, and keeps the explicit product action list.
- Candidate results seed the existing schema form with editable `prefilled_args`; they do not directly prepare, preview, approve, or execute.
- `needs_clarification` uses only the first-version reason codes and falls back to form/product action selection.
- No `packages/protocol`, `AgentManifest`, or `E:\indbase` changes are required.
- Focused runtime, agentctl, TUI tests, `pnpm test:v3b-intent-gate`, typecheck, build, and `git diff --check` pass, or skipped checks are reported with reasons.

## Unknowns

- Exact `IntentScope` TypeScript field names can be chosen during implementation, but the shape must stay neutral and runtime-owned.
- Exact indbase localized `intentHints` copy can be chosen during implementation, but it must remain short keyword arrays rather than prompt examples.
- Exact TUI keyboard flow for focusing the natural-language input should follow existing Ink patterns in `packages/tui/src/app.tsx` and tests.
