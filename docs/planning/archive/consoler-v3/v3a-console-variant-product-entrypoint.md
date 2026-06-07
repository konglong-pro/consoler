---
doc_type: phase_plan
phase_id: v3a-console-variant-product-entrypoint
title: Task execution brief: V3a console variant product entrypoint
status: completed
canonical: false
read_by_default: false
superseded_by: null
---

# Task execution brief: V3a console variant product entrypoint

## Objective

Make product-facing consoler usage enter through a configured Console Variant instead of a generic agent or command selection surface. Keep consoler core generic, keep `agentctl` and audit surfaces protocol-explicit, and add an indbase-adapted TUI entry point as the first product variant.

## Scope

- In scope: checked-in variant configuration, `packages/tui` entry/routing changes, product-facing action labels and form labels, variant-scoped history, focused TUI/runtime tests, and docs.
- Out of scope: protocol version changes, agent marketplace/install UI, arbitrary user agent search in product TUI, LLM-backed intent mapping, new artifact storage, `E:\indbase` implementation changes, and default CI dependence on real indbase.

## Start here

- Read: `CONTEXT.md` terms `Console Variant`, `TUI Shell`, `Product Action Surface`, `Variant Configuration`, `Product Entry Point`, and `Audit Surface`.
- Read: `docs/adr/0001-agent-protocol-v0-boundaries.md`
- Read: `docs/adr/0003-natural-language-intent-drafting.md`
- Main TUI code: `packages/tui/src/app.tsx`, `packages/tui/src/main.tsx`
- TUI display helpers: `packages/tui/src/schema-form.ts`, `packages/tui/src/history-label.ts`, `packages/tui/src/blocks.tsx`, `packages/tui/src/artifact-view-panel.tsx`
- Runtime history read path: `packages/runtime/src/action-read-types.ts`, `packages/runtime/src/action-read.ts`, `packages/runtime/src/db/store.ts`
- Tests: `packages/tui/test/`, `packages/runtime/test/action-history.test.ts`

## Do not touch

- Do not move product labels or variant configuration into `AgentManifest` or protocol schemas.
- Do not make ordinary users install, enable, or search arbitrary agents from the product TUI.
- Do not remove protocol identifiers from trace, JSON, `agentctl`, conformance, or other audit/debug surfaces.
- Do not edit `E:\indbase` unless a later real-agent adoption task explicitly asks for it.
- Do not add dependencies unless the implementation cannot be done with existing Ink/runtime patterns.
- Do not edit generated or build artifacts: `node_modules/`, `dist/`, `coverage/`, `.consoler/consoler.db`.

## Current mismatches to fix

1. `packages/tui/src/app.tsx` hardcodes `AGENT_ID = "indbase"` while still presenting a generic `New Action` -> `Select command` product path.
2. The TUI command selector displays manifest command names such as `indbase.doctor` and `indbase.ingest_file` as normal user choices.
3. The form and approval flow defaults to protocol language such as `Action draft`, `approval_id`, and raw schema field names.
4. TUI history calls `listActionHistory({ limit: 20 })` without filtering to a variant agent/command scope.
5. Result and artifact views show raw `kind`, `uri`, `action_id`, and `block_id` in the default product path instead of reserving those details for audit surfaces.
6. Docs describe `pnpm tui --` primarily as manifest command selection, but the product direction requires a separate product entry point.

## Implementation plan

1. Add a checked-in `ConsoleVariantConfig` for the TUI.
   - Keep it outside `packages/protocol`.
   - Include `id`, product name, allowed agents, default agent, allowed commands, product action labels, field labels, result/artifact labels, and default home actions.
   - Add an `indbase` variant that maps:
     - `indbase.doctor` to a product task such as checking vault health.
     - `indbase.ingest_file` to a product task such as ingesting a file.

2. Split product entry from generic shell entry.
   - Keep `pnpm tui --` as the existing development shell until a later cleanup changes it.
   - Add a product entry point during implementation, preferably a root script such as `pnpm tui:indbase --`, or an equivalent `pnpm tui -- --variant indbase` path if that better fits the package scripts.
   - The indbase entry should open directly in indbase context, not in agent discovery or command search.

3. Make `App` consume variant configuration instead of hardcoded product assumptions.
   - Replace the hardcoded `AGENT_ID` path with variant-provided agent and command mappings.
   - Keep runtime calls using explicit `agentId` and `command`; the variant maps product actions to those protocol values.
   - Preserve injected runtime and manifest test hooks where useful.

4. Replace the product action surface.
   - Product home should show indbase tasks and history in host-product language.
   - Product action labels should not expose `indbase.doctor` or `indbase.ingest_file`.
   - Product forms should use configured field labels/help text while still submitting the original schema keys.
   - Product approval headings should describe the operation and risk in product language; raw IDs can remain available through trace/JSON.

5. Scope history and navigation by variant.
   - Extend runtime history read options to filter by `agentId` and/or allowed command names.
   - The indbase variant must not show actions from conformance or unrelated future agents.
   - Trace, replay, and JSON remain action-centric audit surfaces and may expose protocol identifiers.

6. Productize result and artifact summaries without weakening auditability.
   - Product result panels should prefer block `title`, artifact `label`, and variant labels for artifact kinds.
   - Keep raw artifact URI, `action_id`, `block_id`, and kind visible in trace/JSON or a debug/details path.
   - Do not change artifact retrieval semantics: TUI still calls `fetchArtifactView(action_id, block_id)` only after explicit user action.

7. Preserve developer/debug workflows.
   - `agentctl` stays explicit: `<agent_id> <command>`.
   - Generic command selection may remain in the TUI shell as a development surface.
   - Conformance fake flows remain CI/dev oriented and should not appear in the indbase product entry.

8. Update docs after implementation.
   - Update `AGENTS.md` Common Commands only after the new product entry command exists.
   - Update real-indbase smoke docs if the manual TUI smoke should use the indbase product entry point.
   - Keep detailed product behavior in this planning doc or a follow-up testing doc, not in `AGENTS.md`.

## Validation

- Focused TUI check: `pnpm --filter @consoler/tui test`
- Focused runtime check, if history filters change: `pnpm --filter @consoler/runtime test`
- Typecheck: `pnpm typecheck`
- Build: `pnpm build`
- Diff hygiene: `git diff --check`
- Manual smoke after implementation:
  - Start the indbase product entry point added by this task.
  - Confirm the first screen is indbase-contextual and does not show arbitrary agent search or raw command selection.
  - Run the indbase doctor task through approval and result.
  - Run or inspect an ingest action with artifact blocks, then open an artifact view.
  - Seed or create an unrelated fake/conformance action and confirm it does not appear in indbase product history.

## Done means

- A checked-in indbase Console Variant defines the product action surface and allowed command scope.
- A product entry point opens in indbase context without asking normal users to search agents or choose raw manifest commands.
- Generic shell/dev tooling and `agentctl` remain available for protocol debugging.
- Product history is scoped to the variant's allowed agents/commands.
- Trace, JSON, replay, and `agentctl` retain raw protocol identifiers for auditability.
- Product forms, approvals, result summaries, and artifact summaries use host-product labels on the default path.
- Tests cover variant entry, product labels, scoped history, and preservation of audit/debug details.
- Required validation commands above pass, or any skipped check is reported with the reason.

## Unknowns

- Exact product copy for indbase task names and field labels can be chosen during implementation, but it must avoid raw protocol command names on the default product path.
- The final entry shape can be `pnpm tui:indbase --` or `pnpm tui -- --variant indbase`; choose one during implementation and update `AGENTS.md` only after it exists.
- Whether generic TUI shell should eventually support multiple agents from the registry is a separate development-shell task, not part of the indbase product entry point.
