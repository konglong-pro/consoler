---
doc_type: phase_plan
phase_id: v4b-indbase-source-trust-probe
title: Task execution brief: V4b Indbase Source Trust Probe
status: completed
canonical: false
read_by_default: false
superseded_by: null
---

# Task execution brief: V4b Indbase Source Trust Probe

Build the consoler-side Console Variant probe for indbase's Source Trust Loop after the indbase adapter exposes the first-version command surface.

## Scope

- In scope: `packages/tui` indbase variant configuration, product action labels, action ordering, lightweight natural-language hints, artifact labels, focused TUI tests, `AGENTS.md`, `CONTEXT.md`, and this plan.
- Out of scope: consoler protocol/runtime/store/transport/schema changes, Python SDK changes, `E:\indbase` implementation, row-level table interactions, new renderers, arbitrary URI fetch, Web UI, full vault browser, output/generated loop, translation UI, retrieval packages, `ask`, and default CI real indbase dependency.

## Assumptions

- `E:\indbase` owns `indbase_agent`, `indbase://...` parsing, vault DB reads, and all indbase business rules.
- The adapter manifest exposes exactly the first-version Source Trust Loop commands before this TUI slice is considered complete.
- The existing consoler action lifecycle remains the only execution path.
- Product-specific labels and hints belong in the checked-in indbase Console Variant, not in protocol or runtime.

## Start Here

- Read: `CONTEXT.md`
- Read: `docs/adr/0006-product-variants-keep-agent-specific-ui-boundaries.md`
- Read: `docs/planning/archive/consoler-v3/v3a-console-variant-product-entrypoint.md`
- Read: `E:\indbase\docs\planning\v0.3.2.3-consoler-source-trust-probe.md`
- Main code: `packages/tui/src/variants/indbase.ts`
- TUI shell: `packages/tui/src/app.tsx`
- Variant types: `packages/tui/src/variant-types.ts`
- Tests: `packages/tui/test/`

## Do Not Touch

- `packages/protocol` unless an existing type test proves a variant-only field cannot express the accepted behavior.
- `packages/runtime`, action lifecycle, event store, replay, or history filtering unless a focused variant-scoped bug is proven.
- `sdks/python`.
- `E:\indbase` from this repository.
- `node_modules/`, `dist/`, `coverage/`, `.consoler/consoler.db`, generated schemas, or lockfiles unrelated to this slice.

## Command Surface

The indbase product variant should prioritize these commands:

```text
indbase.doctor
indbase.ingest_file
indbase.search_sources
indbase.doc_show
indbase.review_list
indbase.review_show
indbase.task_list
indbase.task_show
indbase.error_list
indbase.error_show
```

Rules:

- `indbase.ingest_file` is the only first-version write command.
- All commands go through ActionDraft, validation, plan, preview when relevant, approval, execute, events, and result blocks.
- Do not add a direct-execute path.
- Do not add category/tag mutation actions to the product action list.
- Search results use existing markdown, table, JSON, and artifact block renderers.

## Steps

1. Confirm the real indbase manifest or fixture exposes the accepted command surface.
2. Update the indbase Console Variant task order and product labels.
3. Add or adjust product hints for `doctor`, `ingest_file`, and `search_sources`.
4. Keep review, task, error, and `doc_show` mostly explicit-command driven.
5. Ensure `indbase.document` artifact labels are product-readable.
6. If touching existing Chinese product copy, restore valid UTF-8 text and avoid mojibake.
7. Add focused TUI tests for variant command ordering, labels, hints, and artifact labels.
8. Run focused TUI validation.
9. Run optional real indbase smoke only after the indbase adapter is available.

## Validation

Focused consoler checks:

```powershell
pnpm --filter @consoler/tui test
pnpm typecheck
pnpm build
git diff --check
```

Run only if protocol/runtime/package behavior is touched:

```powershell
pnpm test
pnpm test:python-sdk-package
```

Optional local smoke after the indbase adapter is implemented:

```powershell
pnpm agentctl -- discover indbase
pnpm agentctl -- test indbase --command indbase.search_sources --args <args.json> --json
pnpm tui:indbase --
```

Do not make real indbase smoke a default CI gate without a provisioned environment.

## Done Means

- `pnpm tui:indbase --` presents the Source Trust Loop commands with product-oriented labels and ordering.
- The generic dev shell and audit/debug surfaces still expose protocol identifiers.
- The variant uses existing consoler action lifecycle and renderers.
- No consoler protocol/runtime/schema change is required.
- TUI focused tests pass.
- Optional real indbase smoke is either passed against a disposable vault or clearly reported as not run.

## Unknowns

- Whether the existing indbase variant copy has encoding damage that must be corrected while touching the variant file.
- Whether a fixture manifest needs to be added before the real indbase adapter is stable enough for local smoke.
