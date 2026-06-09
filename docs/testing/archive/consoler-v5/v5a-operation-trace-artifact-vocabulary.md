---
doc_type: testing_evidence
phase_id: v5a-operation-trace-artifact-vocabulary
title: V5a Operation Trace Panel and Artifact Vocabulary
status: completed
canonical: false
read_by_default: false
---

# V5a Operation Trace Panel and Artifact Vocabulary

V5a adds agent-emitted Operation Trace support across protocol, runtime, agentctl, TUI, Python SDK, and conformance fixtures. It also aligns artifact vocabulary around `artifact_ref`, `artifact_view`, `artifact_evidence`, and `artifact_trust_state` without renaming existing artifact wire fields.

## Automated Gate

Run from the repository root:

```powershell
pnpm test:v5a-operation-trace-gate
```

The gate runs:

```text
pnpm --filter @consoler/protocol test
pnpm --filter @consoler/runtime test
pnpm --filter @consoler/agentctl test
pnpm --filter @consoler/conformance test
pnpm --filter @consoler/tui test
pnpm test:python-sdk
pnpm typecheck
pnpm docs:check
git diff --check
```

It intentionally does not run broad `pnpm test`, `pnpm build`, or `pnpm test:real-indbase-smoke`.

## Covered Behavior

- `payload.operation_trace` is schema-validatable.
- Runtime derives `ActionTrace.operation_traces` from accepted events only.
- Identity-mismatched operation traces are ignored by trace extraction.
- Repeated `operation_id` values use the last accepted summary without deep merge.
- Agentctl trace text and JSON include operation traces.
- TUI trace view shows Operation Trace as read-only text.
- Indbase Console Variant supplies presentation-only label maps.
- Python SDK exposes operation trace helpers and emits terminal success payload traces from `execute()` results.
- Conformance fake agent emits a valid optional operation trace; agents without operation traces remain conformant.
- Existing artifact retrieval remains addressed by accepted `action_id + block_id`.

## Validation Evidence

Latest local validation: 2026-06-09.

```text
corepack pnpm test:v5a-operation-trace-gate
  -> V5a Operation Trace gate passed
  -> protocol: 3 test files passed; 40 tests passed
  -> runtime: 14 test files passed; 89 tests passed
  -> agentctl: 8 test files passed; 31 tests passed
  -> conformance: 4 test files passed; 18 tests passed
  -> tui: 14 test files passed, 1 skipped; 59 tests passed, 1 skipped
  -> python sdk: 17 tests passed
  -> typecheck passed
  -> docs:check passed
  -> git diff --check passed
```

Focused checks also passed before the full gate:

```text
node_modules\.bin\vitest.cmd run packages\protocol\test
node_modules\.bin\vitest.cmd run packages\runtime\test
node_modules\.bin\vitest.cmd run packages\agentctl\test
node_modules\.bin\vitest.cmd run packages\conformance\test
node_modules\.bin\vitest.cmd run packages\tui\test
node scripts\test-python-sdk.mjs
node scripts\check-docs.mjs
git diff --check
```

## Boundary Check

V5a stays within consoler-owned protocol/runtime/UI/SDK boundaries:

- no runtime DB migration or operation index
- no trace-time reads of vault, source, artifact, provider, or agent domain state
- no parsing or dereferencing of agent-owned or provider-owned refs in consoler
- no new artifact open path beyond accepted `action_id + block_id`
- no artifact block or artifact view wire-field rename
- no `artifact_trust_state` protocol enum
- no real `E:\indbase` implementation changes
- no Web UI, vault/source browser, `ask`, generated answers, embeddings, or multi-action workflows

## CI

GitHub Actions should run `pnpm test:v5a-operation-trace-gate` in the main verify job. Windows focused CI keeps its existing package-level coverage.
