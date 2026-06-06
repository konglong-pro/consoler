# Real indbase Local Smokes

These smokes are local-only. They prove the V1 real-agent path and V2 real `indbase` artifact retrieval against disposable vaults without making default CI depend on `E:\indbase`, local filesystem paths, or timing-sensitive real-agent cancellation.

## Command

Run from `E:\consoler`:

```powershell
pnpm test:real-indbase-smoke
```

Environment:

- `INDBASE_REPO`: real indbase checkout. Defaults to `E:\indbase` on Windows.
- `CONSOLER_KEEP_REAL_INDBASE_SMOKE=1`: keep the temporary smoke directory for inspection after the run. Also prints `CONSOLER_ROOT`, `MANUAL_TUI_ACTION_ID`, and `MANUAL_TUI_ARTIFACT_BLOCK_IDS` for manual TUI smoke.

The script runs `pnpm build` first and then uses compiled `packages/agentctl/dist/main.js`.

## What It Creates

- A temporary `CONSOLER_ROOT` with a generated `.consoler/agents.json`.
- A temporary disposable indbase vault initialized through `uv run python`.
- A temporary synthetic source-trust vault prepared by the indbase v0.3.2.3a stabilization gate.
- A temporary source file plus args and interaction response JSON files.
- A separate temporary conformance fake root for timeout fallback coverage.

The script removes the temp directory unless `CONSOLER_KEEP_REAL_INDBASE_SMOKE=1` is set.

## Coverage

| Smoke | Agent | Check |
| --- | --- | --- |
| `indbase.doctor` | real `indbase` | `agentctl run` succeeds and trace has a succeeded terminal state. |
| `indbase.search_sources` source-trust | real `indbase` | indbase prepares a deterministic trusted source fixture; `agentctl test --approve` and `agentctl run --approve` both succeed for read-only source search without requiring diff blocks. |
| real `artifact-view` (search trace) | real `indbase` | The search result `indbase.document` artifact opens through `agentctl artifact-view --json`; trace/replay keep retrieval audit only. |
| `indbase.ingest_file` normal | real `indbase` | Probe preview approval plus execution succeeds and trace includes diff/artifact result blocks. |
| real `artifact-view` (ingest traces) | real `indbase` | For `indbase.ingest_run` and `indbase.document` artifact blocks (and `indbase.document_revision` when emitted): `agentctl artifact-view --json` returns `ok=true`, succeeded retrieval, non-empty view blocks, no nested artifact blocks; trace keeps audit only; replay stays content-free. |
| duplicate `skip` | real `indbase` | Seeded interaction response is persisted as `skip`; action succeeds with skip result and no diff block. |
| duplicate `continue` | real `indbase` | Seeded interaction response is persisted as `continue`; action succeeds with diff/artifact result blocks. |
| adapter focused tests | real `indbase` tests | Current `tests/test_indbase_agent.py` focused suite proves the real adapter command surface, ingest/search/doc/artifact behavior, and disabled-swallow visibility. |
| cancel timeout fallback | conformance fake | `slow_ignore_cancel` proves runtime force-kill fallback and no synthetic `action.cancelled`. |

Latest V4d local evidence on 2026-06-06: `pnpm test:real-indbase-smoke` passed after the v4d dogfood UX gate, runtime tests, typecheck, and build. The optional `indbase.document_revision` artifact kind was skipped by design when no such artifact was emitted.

Latest V4f local evidence on 2026-06-06: `CONSOLER_KEEP_REAL_INDBASE_SMOKE=1 pnpm test:real-indbase-smoke` passed, and `pnpm exec vitest run packages/tui/test/real-indbase-product-tui-smoke.test.tsx` passed against the kept disposable smoke root. The product TUI smoke now covers doctor execution, variant-scoped trace/artifact open/back, and deterministic NL search form prefill with an explicit disposable vault path.

## Manual TUI Smoke

After `CONSOLER_KEEP_REAL_INDBASE_SMOKE=1 pnpm test:real-indbase-smoke`, use the printed `CONSOLER_ROOT`, `MANUAL_TUI_ACTION_ID`, or `SOURCE_TRUST_ACTION_ID` with `pnpm tui:indbase --` (product entry; variant-scoped history), then History -> Trace -> artifact block -> Enter -> Esc. The dev shell `pnpm tui --` remains for protocol-oriented command selection.

The local-only `packages/tui/test/real-indbase-product-tui-smoke.test.tsx` smoke also opens the product TUI with the real discovered indbase manifest and verifies:

- doctor can run through the product task path
- session `vault_path` is remembered for a later form
- deterministic NL opens an editable search form instead of executing
- history/trace stays variant-scoped
- an artifact view opens from trace and returns with Esc

Full manual steps are in `docs/testing/v2-artifact-retrieval-closeout.md` and `docs/testing/v4f-indbase-real-dogfood-friction-pass.md`.

## Boundary

Real `agentctl` cancellation against `indbase.ingest_file` is not a required stable gate because the command can finish before the cancel request reaches a checkpoint. Runtime timeout fallback remains covered by the conformance fake.

This smoke must not enter default CI unless a future plan adds a provisioned real-agent environment.
