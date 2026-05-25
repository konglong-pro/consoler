# Real indbase Local Smokes

These smokes are local-only. They prove the V1 real-agent path against disposable vaults without making default CI depend on `E:\indbase`, local filesystem paths, or timing-sensitive real-agent cancellation.

## Command

Run from `E:\consoler`:

```powershell
pnpm test:real-indbase-smoke
```

Environment:

- `INDBASE_REPO`: real indbase checkout. Defaults to `E:\indbase` on Windows.
- `CONSOLER_KEEP_REAL_INDBASE_SMOKE=1`: keep the temporary smoke directory for inspection after the run.

The script runs `pnpm build` first and then uses compiled `packages/agentctl/dist/main.js`.

## What It Creates

- A temporary `CONSOLER_ROOT` with a generated `.consoler/agents.json`.
- A temporary disposable indbase vault initialized through `uv run python`.
- A temporary source file plus args and interaction response JSON files.
- A separate temporary conformance fake root for timeout fallback coverage.

The script removes the temp directory unless `CONSOLER_KEEP_REAL_INDBASE_SMOKE=1` is set.

## Coverage

| Smoke | Agent | Check |
| --- | --- | --- |
| `indbase.doctor` | real `indbase` | `agentctl run` succeeds and trace has a succeeded terminal state. |
| `indbase.ingest_file` normal | real `indbase` | Probe preview approval plus execution succeeds and trace includes diff/artifact result blocks. |
| duplicate `skip` | real `indbase` | Seeded interaction response is persisted as `skip`; action succeeds with skip result and no diff block. |
| duplicate `continue` | real `indbase` | Seeded interaction response is persisted as `continue`; action succeeds with diff/artifact result blocks. |
| ingest cooperative cancel | real `indbase` tests | Focused adapter/pipeline tests prove checkpoint propagation and cancellation re-raise. |
| cancel timeout fallback | conformance fake | `slow_ignore_cancel` proves runtime force-kill fallback and no synthetic `action.cancelled`. |

## Boundary

Real `agentctl` cancellation against `indbase.ingest_file` is not a required stable gate because the command can finish before the cancel request reaches a checkpoint. Cooperative cancel is proven by deterministic real `indbase` tests; timeout fallback is runtime behavior and remains covered by the conformance fake.

This smoke must not enter default CI unless a future plan adds a provisioned real-agent environment.
