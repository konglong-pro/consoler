# V1 Release Gate

This is the acceptance surface for closing `consoler` V1. V1 is a protocol/runtime/TUI/CLI tracer-bullet release, not the platform phase.

Closeout status is tracked in `docs/testing/v1-closeout.md`.

## Automated Gate

Run from `E:\consoler`:

```powershell
pnpm test:v1-release-gate
```

The gate runs, in order:

1. `pnpm build`
2. `pnpm typecheck`
3. `pnpm test`
4. `pnpm test:python-sdk`
5. `pnpm test:conformance`
6. `pnpm test:agentctl-smoke`
7. `pnpm test:redaction-smoke`

On Windows, `python --version` must resolve to a real Python executable before running the gate. If it resolves to the Microsoft Store alias, put an installed Python earlier on `PATH`.

## CI Gates

| Gate | Runs in CI | Notes |
| --- | --- | --- |
| Whitespace diff check | Linux | `git diff --check` against the PR/base range. |
| V1 release gate | Linux | Runs the full fake-agent gate through `pnpm test:v1-release-gate`. |
| Runtime focused tests | Windows | Keeps Windows coverage narrow and fast. |
| Agentctl focused tests | Windows | Covers Windows process/SQLite behavior. |
| Python SDK tests | Windows | Ensures fake-agent SDK path works on Windows. |
| Agentctl CLI smoke | Windows | Compiled CLI smoke without real `indbase`. |

Default CI must not depend on `E:\indbase`, real vaults, local filesystem paths, or timing-sensitive real-agent cancellation.

## V1 Capability Matrix

| Stage | Capability | Automated gate | Local-only gate | CI |
| --- | --- | --- | --- | --- |
| V1a | `indbase.ingest_file` side-effect lifecycle with probe preview approval | Runtime/agentctl/TUI tests | Disposable ingest preview/run smoke | Partial |
| V1b | Action history, trace, accepted-event replay | Runtime/agentctl/TUI tests | Trace a disposable action | Yes |
| V1c | Conformance harness and `agentctl test` | `pnpm test:conformance`, agentctl tests | Optional real `indbase` conformance | Yes |
| V1d | Diff/artifact renderable blocks | Protocol/TUI/conformance/agentctl tests | Inspect trace/replay block summaries | Yes |
| V1e | Real `indbase` diff/artifact blocks | `E:\indbase` focused tests | Disposable real ingest run | Local only |
| V1f | SDK/runtime/agentctl cooperative cancel | Runtime/conformance/agentctl tests | Fake slow cancel smoke | Yes |
| V1g | TUI cooperative cancel | TUI tests | Manual TUI cancel smoke | Yes |
| V1h | `interaction.required` loop | Protocol/runtime/TUI/SDK/conformance tests | Fake interactive command | Yes |
| V1i | Interaction trace persistence | Runtime/agentctl/TUI tests | Inspect trace vs replay | Yes |
| V1j | `agentctl run` live interactions | Agentctl smoke/tests | Non-TTY seeded response smoke | Yes |
| V1k | Interaction timeout policy | Runtime/conformance/agentctl/TUI tests | Fake timeout command | Yes |
| V1l | Interaction response redaction | `pnpm test:redaction-smoke` | Inspect redacted trace/replay | Yes |
| V1m | Real `indbase` duplicate interaction | `E:\indbase` focused tests | Duplicate skip/continue smokes | Local only |
| V1n | Strong runtime control and cancel timeout fallback | Runtime/conformance/agentctl tests | Fake timeout cancel smoke | Yes |
| V1o | Real `indbase` pipeline cooperative cancel | `E:\indbase` focused tests | Optional deterministic real cancel smoke | Local only |

## Local-Only Real Agent Checklist

Use disposable vaults and temporary args files. Do not mutate committed fixtures or real user vaults. The repeatable local command is documented in `docs/testing/real-indbase-smokes.md`:

```powershell
pnpm test:real-indbase-smoke
```

- `indbase.doctor`
- `indbase.ingest_file` normal ingest
- duplicate ingest with `skip`
- duplicate ingest with `continue`
- focused real pipeline cooperative cancel tests
- fake-agent timeout fallback smoke for V1n behavior

Real `agentctl` cancellation against `indbase.ingest_file` is optional unless it can be made deterministic. A timeout fallback result proves V1n, not V1o cooperative cancellation.

## Not In V1

- Natural language intent mapping
- Execution replay
- Artifact storage/browser or artifact URI fetching
- Remote HTTP agents
- Secret manager or OS sandboxing
- Multi-user permissions
- Multiple concurrent pending interactions
- Web UI or VS Code extension
- Folder, URL, media, or archive ingest expansion as consoler V1 scope
