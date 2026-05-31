# V3b Intent Drafting Gate

Fake-agent acceptance surface for deterministic natural-language intent drafting: runtime `draftIntent`, `agentctl intent-draft`, and product-variant TUI NL entry.

## Automated Gate

Run from the repository root:

```powershell
pnpm test:v3b-intent-gate
```

The gate runs, in order:

1. `pnpm build` (required for compiled `agentctl` smoke)
2. `pnpm --filter @consoler/runtime test`
3. `pnpm --filter @consoler/agentctl test`
4. `pnpm --filter @consoler/tui test`
5. `pnpm test:agentctl-smoke` (includes `intent-draft` candidate/clarification and no-history checks)

## CI

| Gate | Runs in CI | Notes |
| --- | --- | --- |
| V3b intent drafting gate | Linux (`verify` job) | Runs after the V2 release gate on Ubuntu. |

Windows focused CI already runs runtime, agentctl, TUI, agentctl smoke, and artifact retrieval smoke; it does not duplicate this named gate.

## Local-only

- Manual product TUI: `pnpm tui:indbase --` (NL input, Tab to tasks, prefill, clarification fallback).
- Real `E:\indbase` is out of scope for this gate.
