# V2 Release Gate

Fake-agent acceptance surface for `consoler` V2a/V2b artifact retrieval and the Ink artifact browser. Real `E:\indbase` remains local-only.

## Automated Gate

Run from the repository root:

```powershell
pnpm test:v2-release-gate
```

The gate runs, in order:

1. `pnpm build`
2. `pnpm typecheck`
3. `pnpm test`
4. `pnpm test:python-sdk`
5. `pnpm test:python-sdk-package`
6. `pnpm test:conformance`
7. `pnpm test:agentctl-smoke`
8. `pnpm test:redaction-smoke`
9. `pnpm test:artifact-retrieval-smoke`

On Windows, `python --version` must resolve to a real Python executable before running the gate. If it resolves to the Microsoft Store alias, put an installed Python earlier on `PATH`.

## CI Gates

| Gate | Runs in CI | Notes |
| --- | --- | --- |
| Whitespace diff check | Linux | `git diff --check` against the PR/base range. |
| V2 release gate | Linux | Runs the full fake-agent gate through `pnpm test:v2-release-gate`. |
| V3b intent drafting gate | Linux | Runs `pnpm test:v3b-intent-gate` after the V2 gate (runtime mapper, `agentctl intent-draft`, TUI NL entry). |
| V3c assisted intent gate | Linux | Runs `pnpm test:v3c-assisted-intent-gate` after the V3b gate using fake-provider coverage only. |
| V3c TUI assisted intent gate | Linux | Runs `pnpm test:v3c-tui-assisted-intent-gate` after the V3c runtime/CLI gate using fake/injected provider coverage only. |
| V4d indbase dogfood UX gate | Local / future CI candidate | Runs `pnpm test:v4d-indbase-dogfood-ux`; fake/injected TUI coverage only, while real indbase remains local-only. |
| Runtime focused tests | Windows | Keeps Windows coverage narrow and fast. |
| Agentctl focused tests | Windows | Covers Windows process/SQLite behavior. |
| TUI focused tests | Windows | Includes V2b artifact browser flow tests. |
| Python SDK tests | Windows | Ensures fake-agent SDK path works on Windows. |
| Python SDK package gate | Linux (via V2 gate) | Wheel/sdist build, `twine check`, and installed-package smoke without `PYTHONPATH`. |
| Agentctl CLI smoke | Windows | Compiled CLI smoke without real `indbase`. |
| Conformance harness | Windows | Fake-agent end-to-end checks on Windows. |
| Artifact retrieval smoke | Windows | `agentctl artifact-view` against conformance fake agent. |

Default CI must not depend on `E:\indbase`, real vaults, local filesystem paths, or timing-sensitive real-agent cancellation.

## Default CI vs Local-Only

| Coverage | Gate | Runs in default CI |
| --- | --- | --- |
| Fake-agent artifact retrieval CLI | `pnpm test:artifact-retrieval-smoke` | Yes (Linux V2 gate + Windows job) |
| Ink artifact browser (mocked fetch) | `pnpm --filter @consoler/tui test` | Yes (Windows job) |
| Conformance fake retrieval checks | `pnpm test:conformance` | Yes |
| Indbase dogfood UX gate | `pnpm test:v4d-indbase-dogfood-ux` | No by default |
| Real `indbase` ingest + `artifact-view` | `pnpm test:real-indbase-smoke` | No |
| Real `indbase` unit tests | `uv run pytest tests/test_indbase_agent.py` from `E:\indbase` | No |
| Manual TUI against kept smoke root | Documented in `docs/testing/v2-artifact-retrieval-closeout.md` | No |

## Local-Only (not in default CI)

- `pnpm test:real-indbase-smoke` (includes real `agentctl artifact-view` for disposable ingest artifact blocks)
- `uv run pytest tests/test_indbase_agent.py` from `E:\indbase`
- Manual TUI smoke using `CONSOLER_KEEP_REAL_INDBASE_SMOKE=1` output

## V1 Gate

`pnpm test:v1-release-gate` remains available for V1 closeout replay. Linux CI uses `pnpm test:v2-release-gate` as the primary merge gate.
