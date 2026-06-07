---
doc_type: phase_plan
phase_id: v3b-agentctl-intent-draft
title: Task execution brief: V3b agentctl intent-draft
status: completed
canonical: false
read_by_default: false
superseded_by: null
---

# Task execution brief: V3b agentctl intent-draft

## Objective

Add the CLI-only second slice of Natural Language Intent Drafting: `agentctl intent-draft`, backed by the existing runtime `draftIntent({ text, scope })`, with default human-readable output and stable `--json` output.

This slice is a developer/debug surface. It must not add TUI behavior, protocol fields, DB tables, LLM calls, direct action preparation, approval, or execution.

## Scope

- In scope: `packages/agentctl` command wiring, intent scope construction from discovered manifests, output formatters/helpers, agentctl tests, help text, and agentctl smoke coverage.
- Out of scope: `packages/tui`, `packages/protocol`, runtime mapper behavior changes unless a narrow bug is found, DB schema changes, raw natural-language persistence, product Variant config, and `E:\indbase` changes.

## Start here

- Read: `CONTEXT.md` terms `Intent Scope`, `Natural Language Intent Drafting`, `Intent Draft`, `Intent Clarification`, and `draftIntent`.
- Read: `docs/adr/0003-natural-language-intent-drafting.md`.
- Parent phase brief: `docs/planning/archive/consoler-v3/v3b-natural-language-intent-drafting.md`.
- Runtime mapper slice: `docs/planning/archive/consoler-v3/v3b-runtime-intent-mapper.md`.
- CLI entry: `packages/agentctl/src/main.ts`.
- CLI help: `packages/agentctl/src/index.ts`.
- Existing CLI output helpers: `packages/agentctl/src/artifact-view.ts`, `packages/agentctl/src/format.ts`.
- Agentctl tests: `packages/agentctl/test/`.
- Built CLI smoke script: `scripts/test-agentctl-smoke.mjs`.

## Do not touch

- Do not implement TUI natural-language input or Variant `intentHints` in this slice.
- Do not add protocol or `AgentManifest` fields.
- Do not add persistence for raw natural language, intent results, scores, or clarification text.
- Do not call plan, preview, approve, run, trace, replay, or artifact retrieval from `intent-draft`.
- Do not create actions, runs, events, approvals, interactions, traces, or history rows.
- Do not add LLM/model dependencies, network calls, prompt files, or API key configuration.
- Do not edit `E:\indbase`.

## Steps

1. Add agentctl intent helper module.
   - Create `packages/agentctl/src/intent-draft.ts`.
   - Export `buildIntentScopeFromManifests(manifests)` and formatting helpers.
   - Convert every manifest command into an `IntentScopeCommand` with:
     - `agent_id`
     - `command`
     - `command_description`
     - `args_schema`
   - Do not add product labels, `intentHints`, or `ConsoleVariantConfig` use in this CLI slice.

2. Add human output formatter.
   - Default output starts with exactly one of:
     - `Intent draft: candidate`
     - `Intent draft: needs_clarification`
   - Candidate output includes `agent_id`, `command`, optional `product_action_id`, and pretty JSON `prefilled_args`.
   - Clarification output includes `reason`, `message`, optional `partial_candidate`, `missing_required_args`, `ambiguous_fields`, and `unsupported_features`.
   - Do not print numeric confidence, internal scores, ranked candidates, approval IDs, action IDs, or lifecycle language.

3. Add JSON output formatter.
   - `--json` prints `JSON.stringify(result, null, 2)` for the exact runtime `IntentDraftResult`.
   - JSON output must not wrap or rename runtime fields.
   - JSON output goes to stdout only; errors go to stderr.

4. Wire the CLI command in `packages/agentctl/src/main.ts`.
   - Command shape: `intent-draft <text...> [--agent <id>] [--json]`.
   - Join `<text...>` with spaces to form the natural-language input.
   - Empty or whitespace-only text writes `intent-draft requires non-empty text` to stderr and exits `1`.
   - With `--agent <id>`, call `runtime.discover(id)` and build scope from that one manifest.
   - Without `--agent`, load the registry from `resolveRegistryRoot()`, discover every enabled agent, and build one merged scope.
   - `candidate` and `needs_clarification` both exit `0`; infra/discover/registry errors exit `1`.
   - Close the runtime store if the command creates a runtime instance and no existing pattern already handles process exit cleanup.

5. Update help text.
   - Add `intent-draft <text...> [--agent <id>] [--json]` to `formatAgentctlHelp()`.
   - Add one example using quoted text and `--agent`.
   - Do not add the command to root `AGENTS.md` Common Commands until the implementation is complete and validated.

6. Add focused tests.
   - Create `packages/agentctl/test/intent-draft.test.ts`.
   - Test scope construction from a manifest.
   - Test human candidate output.
   - Test human clarification output.
   - Test JSON output preserves runtime shape.
   - Test help includes `intent-draft`.
   - Assert no `confidence`, `score`, or ranked `candidates` appear.

7. Extend built CLI smoke.
   - Update `scripts/test-agentctl-smoke.mjs` after `pnpm build` coverage.
   - Use the existing temp conformance root and `CONSOLER_ROOT`.
   - Run:
     - `intent-draft static echo "hello" --agent conformance-fake --json`
     - `intent-draft static echo "hello" --agent conformance-fake`
     - `intent-draft "unrelated phrase" --agent conformance-fake --json`
   - Assert candidate JSON for `conformance.static_echo` includes `prefilled_args.message`.
   - Assert unrelated JSON returns `needs_clarification` with `no_match`.
   - Run `history --json` after intent-draft and assert no actions were created.

## Validation

- Focused agentctl tests: `pnpm --filter @consoler/agentctl test`
- Focused agentctl typecheck: `pnpm --filter @consoler/agentctl typecheck`
- Runtime regression tests: `pnpm --filter @consoler/runtime test`
- Build before smoke: `pnpm build`
- Built CLI smoke: `pnpm test:agentctl-smoke`
- Broad tests: `pnpm test`
- Broad typecheck: `pnpm typecheck`
- Diff hygiene: `git diff --check`

## Done means

- `pnpm agentctl -- intent-draft "..." --agent <id>` works after implementation.
- Human output is stable, readable, and contains no internal scores or ranked alternatives.
- `--json` emits the exact `IntentDraftResult` shape from runtime.
- `--agent` narrows scope to one discovered agent; no `--agent` uses enabled registry agents.
- `intent-draft` does not create actions, runs, approvals, events, traces, or history rows.
- Agentctl tests and built CLI smoke cover candidate, clarification, JSON, human output, help text, and no-history side effects.
- No TUI, protocol, DB schema, Variant config, LLM, or `E:\indbase` changes are required.

## Unknowns

- Exact private helper names are implementation details.
- If no enabled agents exist and `--agent` is omitted, fail with a concise stderr message and exit `1`.
