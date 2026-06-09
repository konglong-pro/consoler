---
doc_type: testing_evidence
phase_id: v4f-indbase-real-dogfood-friction-pass
title: V4f Indbase Real Dogfood Friction Pass
status: completed
canonical: false
read_by_default: false
---

# V4f Indbase Real Dogfood Friction Pass

V4f is the evidence-first closeout and UX friction pass for the indbase Console Variant.

It keeps the existing Source Trust Loop surface and fixes only concrete existing-surface friction. It does not add new indbase commands, protocol/runtime/store behavior, Web UI, vault browsing, mutation workflows, generated answers, `ask`, or broader NL capability.

## Automated Gate

Run from the repository root:

```powershell
pnpm test:v4f-indbase-real-dogfood-friction-pass
```

The gate runs deterministic TUI regression coverage only:

```text
pnpm --filter @consoler/tui test
```

Real indbase smoke and manual `pnpm tui:indbase --` remain local-only closeout evidence.

## Friction Register

| id | scenario | evidence | impact | allowed_fix_class | owner_repo | status | verification |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `v4f-friction-001` | Artifact and form navigation copy in terminal surfaces | Windows/PowerShell display of arrow, em dash, and ellipsis characters can render as mojibake in captured terminal output; these hints are part of the artifact open/back and form navigation dogfood path. | confusing | copy, artifact, navigation | consoler | fixed | `packages/tui/test/artifact-browser-flow.test.tsx`, `pnpm --filter @consoler/tui test` |
| `v4f-friction-002` | Real indbase product TUI smoke after V4e intent drafting | Existing local-only smoke covered doctor, history/trace, and artifact open/back, but did not prove deterministic NL opens an editable form under the real discovered indbase manifest. | confusing | test | consoler | fixed | `packages/tui/test/real-indbase-product-tui-smoke.test.tsx` when real smoke env is available |
| `v4f-friction-003` | Phase closeout evidence | V4d and V4e had gates, but V4f did not yet have a deterministic gate or a friction register document, making future dogfood fixes harder to distinguish from feature work. | repetitive | test, docs | consoler | fixed | `pnpm test:v4f-indbase-real-dogfood-friction-pass`; this document |
| `v4f-friction-004` | Continuing from a real finished doctor result into same-session NL dogfood | During local Ink smoke development, pressing Esc from the finished doctor result screen did not reliably reach home before timeout in the test harness, even though deterministic finished-screen navigation remains covered elsewhere. | confusing | navigation, test | consoler | deferred | Needs manual PTY confirmation before code change; real NL prefill coverage now uses a fresh product TUI instance with explicit vault path. |

## Fixed Behavior

- Terminal control hints in touched TUI surfaces now use ASCII text such as `Up/Down`, `->`, `...`, and ` - `.
- Product trace artifact rows still show product labels and `Enter` behavior, but the surrounding navigation hint is terminal-stable.
- The local-only real product TUI smoke now verifies that deterministic NL can open the search form with an explicit disposable vault path and a prefilled search query without creating an action.
- A root V4f gate script exists and keeps V4f regression coverage separate from V4d/V4e.

## Deferred Findings

- `v4f-friction-004`: same-session continuation from a real finished doctor result needs manual terminal confirmation before changing TUI navigation code. The current phase keeps the finding documented and avoids broad runtime or lifecycle changes.

## Local-Only Dogfood

Run after the deterministic gate when validating real indbase behavior:

```powershell
CONSOLER_KEEP_REAL_INDBASE_SMOKE=1 pnpm test:real-indbase-smoke
pnpm exec vitest run packages/tui/test/real-indbase-product-tui-smoke.test.tsx
pnpm tui:indbase --
```

Manual TUI dogfood checklist:

```text
check vault
-> import or inspect prepared source state
-> search trusted sources
-> open document artifact
-> inspect review/task/error/doctor views
-> open history/trace
-> open an artifact from trace and return
-> try one deterministic NL prefill and confirm it opens an editable form
```

If a reliable interactive terminal is unavailable, record that as a skipped manual evidence item. Do not describe the automated Ink smoke as a manually typed TUI session.

## Validation Evidence

Latest validation: 2026-06-06.

Required closeout commands:

```text
pnpm --filter @consoler/tui test
  -> 14 test files passed, 1 skipped; 54 tests passed, 1 skipped
pnpm test:v4f-indbase-real-dogfood-friction-pass
  -> V4f indbase real dogfood friction pass gate passed
pnpm test:v4e-indbase-variant-intent-drafting
  -> V4e indbase variant intent drafting gate passed
pnpm test:v4d-indbase-dogfood-ux
  -> V4d indbase dogfood UX gate passed
pnpm typecheck
  -> passed
pnpm build
  -> passed
```

Local-only evidence:

```text
CONSOLER_KEEP_REAL_INDBASE_SMOKE=1 pnpm test:real-indbase-smoke
  -> real indbase smoke passed; disposable smoke root kept for inspection
pnpm exec vitest run packages/tui/test/real-indbase-product-tui-smoke.test.tsx
  -> 1 test passed
```

Manual evidence:

```text
pnpm tui:indbase --  -> not run in this Codex shell; no reliable interactive PTY
```

## Boundary Check

V4f remains within consoler-owned TUI friction work:

- no protocol schema changes
- no runtime lifecycle/store/replay changes
- no Python SDK changes
- no new indbase commands
- no `E:\indbase` core changes
- no vault browser, source browser, Web UI, mutation UI, retrieval package, `ask`, embeddings, generated answers, default LLM behavior, or NL v2
- no committed private vault paths, source excerpts, raw traces, runtime SQLite files, logs, screenshots with private content, or temp vault data
