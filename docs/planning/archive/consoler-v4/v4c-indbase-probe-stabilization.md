---
doc_type: phase_plan
phase_id: v4c-indbase-probe-stabilization
title: Task execution brief: V4c Indbase Probe Stabilization
status: completed
canonical: false
read_by_default: false
superseded_by: null
---

# Task execution brief: V4c Indbase Probe Stabilization

Stabilize consoler's local signal for the indbase Source Trust Loop before expanding product read-only views.

## Objective

Make consoler's real-agent checks distinguish a successful read-only source search from generic side-effecting command expectations. The end state should let `indbase.search_sources` pass a precise local smoke without requiring every read-only command to emit diff or artifact blocks.

## Scope

- In scope: `packages/conformance`, `packages/agentctl`, real indbase local smoke scripts, focused tests, docs, and coordination with `E:\indbase\docs\planning\v0.3.2.3a-consoler-probe-stabilization.md`.
- Out of scope: consoler protocol schema changes, runtime action lifecycle changes, new renderers, Web UI, full vault browser, `E:\indbase` implementation from this repo, generated answers, retrieval packages, category/tag mutation UI, and default CI dependency on real indbase or real swallow.

## Start Here

- Read: `CONTEXT.md`
- Read: `docs/adr/0006-product-variants-keep-agent-specific-ui-boundaries.md`
- Read: `docs/planning/archive/consoler-v4/v4b-indbase-source-trust-probe.md`
- Read: `docs/testing/real-indbase-smokes.md`
- Read: `E:\indbase\docs\planning\v0.3.2.3a-consoler-probe-stabilization.md`
- Main code: `packages/conformance/`
- CLI code: `packages/agentctl/src/`
- Smoke scripts: `scripts/test-real-indbase-smoke.mjs`
- Tests: `packages/conformance/test/`, `packages/agentctl/test/`

## Do Not Touch

- `packages/protocol` unless a schema bug is proven; this phase should not need schema changes.
- Runtime approval, event ordering, replay, trace, or store semantics unless a focused regression proves a bug.
- `sdks/python` packaging.
- `E:\indbase` files from this repo.
- `node_modules/`, `dist/`, `coverage/`, `.consoler/consoler.db`, generated schemas, private vault data, or committed smoke vaults.

## Steps

1. Inspect why `agentctl test --approve indbase.search_sources` applies diff/artifact block expectations to a read-only search result.
2. Add command expectation support or a source-trust-specific smoke path so read-only search can pass with markdown/table/json result blocks.
3. Preserve strict checks for manifest schema, args schema, preview policy, approval material, accepted event ordering, terminal event, event schema, history, trace, replay, and result block schema.
4. Extend or add a local-only real indbase smoke to use the fixture/gate output from indbase v0.3.2.3a.
5. Assert `indbase.search_sources` returns the expected source hit when the prepared fixture vault contains searchable content.
6. Assert search result document artifacts have `metadata.vault_path` when hits exist.
7. Assert `agentctl artifact-view <action_id> <block_id> --json` works for a search result `indbase.document` artifact when one is emitted.
8. Keep real swallow coverage optional and environment-gated.
9. Update `docs/testing/real-indbase-smokes.md` if the smoke command or coverage changes.

## Validation

Focused consoler checks:

```powershell
pnpm --filter @consoler/conformance test
pnpm --filter @consoler/agentctl test
pnpm test:real-indbase-smoke
pnpm typecheck
pnpm build
git diff --check
```

Existing product TUI regression:

```powershell
pnpm --filter @consoler/tui test
```

Cross-repo indbase checks to coordinate with the indbase agent:

```powershell
cd E:\indbase
uv run python scripts/v0323a_probe_stabilization_release_gate.py
uv run python -m pytest tests/test_indbase_agent.py -q
```

If `pnpm test:real-indbase-smoke` cannot run because `E:\indbase`, consoler SDK, or swallow prerequisites are unavailable, it must skip explicitly with a non-misleading reason. Do not report it as passed.

## Done Means

- Generic conformance no longer fails read-only search solely for missing diff/artifact blocks.
- The chosen source-trust smoke proves `indbase.search_sources` through a real agent process.
- Search result block schemas, trace, replay, and history remain validated.
- Document artifact retrieval is covered when search emits an `indbase.document` artifact.
- No protocol/runtime/schema change was needed.
- Default CI remains fake-agent safe.
- Local real indbase smoke is deterministic or explicitly environment-gated.

## Unknowns

- Whether the best implementation is a command expectation field in conformance or a separate source-trust smoke script.
- Whether indbase v0.3.2.3a will expose a generated fixture vault, args file, or gate JSON for consoler to consume.
- Whether real swallow can be assumed in developer environments; default behavior should assume it cannot.
