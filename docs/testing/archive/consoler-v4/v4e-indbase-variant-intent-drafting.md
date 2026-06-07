---
doc_type: testing_evidence
phase_id: v4e-indbase-variant-intent-drafting
title: V4e Indbase Variant Intent Drafting Gate
status: completed
canonical: false
read_by_default: false
---

# V4e Indbase Variant Intent Drafting Gate

Acceptance surface for deterministic, indbase-variant intent drafting over the ten-command Source Trust Loop.

V4e is a consoler-owned UX acceleration slice. It turns clear user text into an editable schema form with prefilled values. It must not prepare, preview, approve, execute, persist raw natural language, or create history/trace rows from NL submit.

## Automated Gate

Run from the repository root:

```powershell
pnpm test:v4e-indbase-variant-intent-drafting
```

The gate runs, in order:

1. `pnpm --filter @consoler/runtime test`
2. `pnpm --filter @consoler/tui test`

## Acceptance Surface

| Surface | Covered by | What must stay true |
| --- | --- | --- |
| Runtime mapper | `packages/runtime/test/intent-draft.test.ts` | Source Trust commands are selected deterministically from clear phrasing, including English and Chinese hints. |
| Search filters | Runtime and TUI tests | `query`, explicit `tag:<ref>`, and explicit `category:<ref>` prefill the existing `search_sources` form. Vague tag/category wording stays search text. |
| Object IDs | Runtime and TUI tests | `doc_...`, `review_...`, `task_...`, and `err_...`-style IDs prefill only matching object show fields. Bare numbers are not treated as trusted object IDs. |
| Product TUI path | `packages/tui/test/indbase-variant-flow.test.tsx` | NL submit opens the existing reviewable schema form with missing-required notices and product labels, not raw protocol command names. |
| Copy hygiene | `packages/tui/test/variant-contract.test.ts` | Checked-in indbase variant copy does not contain known UTF-8 mojibake fragments. |
| Boundary safety | All gate checks | No protocol schema, runtime store/replay, Python SDK, provider setup, or `E:\indbase` implementation changes are required. |

## Required Closeout Checks

Before closing the phase, run:

```powershell
pnpm --filter @consoler/runtime test
pnpm --filter @consoler/tui test
pnpm test:v4e-indbase-variant-intent-drafting
pnpm test:v3b-intent-gate
pnpm typecheck
pnpm build
git diff --check
```

Run V3c assisted gates only if shared assisted-intent paths are touched.

## Validation Evidence

Latest local validation: 2026-06-06.

```text
pnpm --filter @consoler/runtime test
  -> 14 test files passed; 79 tests passed
pnpm --filter @consoler/tui test
  -> 14 test files passed, 1 skipped; 54 tests passed, 1 skipped
pnpm test:v4e-indbase-variant-intent-drafting
  -> V4e indbase variant intent drafting gate passed
pnpm test:v3b-intent-gate
  -> V3b intent drafting gate passed
pnpm typecheck
  -> passed
pnpm build
  -> passed
git diff --check
  -> passed with LF/CRLF warnings only
```

Latest GitHub PR validation: 2026-06-06.

```text
PR: https://github.com/konglong-pro/consoler/pull/4
Head: feat/v2-artifact-retrieval
Base: feat/v1k-v1l-on-main
Merge state: CLEAN

CI / typecheck and test
  -> passed
CI / windows focused
  -> passed
```

Merge strategy note: PR #4 is currently a stacked PR on `feat/v1k-v1l-on-main`, not a direct PR to the repository default branch. Keep that stack unless the branch series is intentionally flattened; merge the base branch first, then PR #4.

Indbase coordination validation now exists and passed in `E:\indbase`:

```text
uv run python -m pytest tests/test_v0323c_indbase_coordination.py tests/test_v0323d_indbase_intent_coordination.py -q
  -> 5 passed
```

## Dogfood Evidence

Manual/product dogfood is tracked separately from the automated V4e gate. Latest local dogfood: 2026-06-06.

Commands run:

```text
CONSOLER_KEEP_REAL_INDBASE_SMOKE=1 pnpm test:real-indbase-smoke
  -> real indbase smoke passed

CONSOLER_ROOT=<kept smoke root> INDBASE_SMOKE_VAULT=<disposable vault> MANUAL_TUI_ACTION_ID=<ingest action>
pnpm exec vitest run packages/tui/test/real-indbase-product-tui-smoke.test.tsx
  -> 1 test passed
```

Coverage:

- Real disposable vault: `doctor`, `search_sources`, `ingest_file`, duplicate skip/continue interaction, trace, replay, and artifact-view retrieval passed through the real `indbase` agent.
- Product TUI path: opened the indbase product home, selected `Check knowledge base status`, filled the vault field, approved execution, observed success, opened variant-scoped history/trace, opened an artifact view, and returned to trace.
- NL/form behavior remains covered by focused TUI tests and the V4e gate: NL submit opens editable forms with missing-required notices and does not execute actions by itself.

Operator note: the Codex shell used for this closeout is not an interactive terminal PTY, so the product TUI dogfood was run through the checked-in Ink smoke test rather than a manually typed `pnpm tui:indbase --` session. The smoke uses the same `App` and `indbaseVariant` path with a real discovered `indbase` manifest and runtime store.

## Out of Scope

- LLM-assisted intent drafting by default.
- Multi-turn chat, direct execution, auto-approval, or action history from NL submit.
- Vault discovery, cwd/history inference, persisted vault preferences, or filesystem scans.
- Protocol/runtime lifecycle/store/replay/schema changes.
- Web UI, vault browser, retrieval packages, embeddings, `ask`, generated answers, or indbase mutation workflows.
- `E:\indbase` core, adapter, command, migration, or durable state changes unless a focused consoler test proves a narrow adapter defect.

## Related Docs

- `docs/planning/archive/consoler-v4/v4e-indbase-variant-intent-drafting.md`
- `docs/planning/archive/consoler-v4/v4d-indbase-dogfood-ux.md`
- `docs/testing/archive/consoler-v3/v3b-intent-gate.md`
- `E:\indbase\docs\planning\v0.3.2.3d-indbase-variant-intent-drafting.md`
