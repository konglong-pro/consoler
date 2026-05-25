# V1 Closeout

V1 is closed as a protocol/runtime/TUI/CLI tracer-bullet release. New product capability work should move to V2 planning. V1 should only receive bug fixes, validation hardening, or documentation corrections unless a later plan explicitly reopens scope.

## Closeout Status

| Area | Status | Gate |
| --- | --- | --- |
| Fake-agent V1 release gate | Closed | `pnpm test:v1-release-gate` |
| Real `indbase` local smoke | Closed as local-only | `pnpm test:real-indbase-smoke` |
| Default CI boundary | Closed | Fake-agent based; no real `E:\indbase` dependency |
| V2 readiness | Ready for planning | Start from a V2 planning doc before implementation |

## Validation Evidence

Validated locally on 2026-05-25:

- `pnpm test:real-indbase-smoke` passed.
  - Covered real `indbase.doctor`.
  - Covered real `indbase.ingest_file` normal ingest.
  - Covered duplicate `skip` and duplicate `continue`.
  - Covered real indbase focused cooperative cancel tests.
  - Covered fake-agent cancel timeout fallback.
- `pnpm test:v1-release-gate` passed after prepending `E:\indbase\.venv\Scripts` to `PATH`.
  - Bare Windows `python` still resolves to the WindowsApps alias in this environment, so the release gate correctly fails fast until a real Python executable is earlier on `PATH`.
- `git diff --check` passed with line-ending warnings only.

## Closed V1 Surface

V1 includes:

- out-of-process agent protocol foundation
- manifest discovery and schema validation
- static/probe preview and approval lifecycle
- event stream execution
- action history, trace, accepted-event replay
- conformance fake agent and `agentctl test`
- diff/artifact renderable blocks
- live interaction loop, interaction persistence, timeout policy, and persisted-response redaction
- cooperative cancel, strong runtime cancel control, and force-kill timeout fallback
- real `indbase` adoption for doctor, ingest, duplicate interaction, renderable blocks, and cooperative cancel checkpoints
- local-only disposable real `indbase` smoke gate

## V1 Frozen Boundaries

- Do not add new protocol/runtime/TUI/Python SDK capabilities under V1.
- Do not move real `indbase` smokes into default CI without a new plan for a provisioned real-agent environment.
- Do not require timing-sensitive real `agentctl` cancellation against `indbase.ingest_file` as a stable gate.
- Do not add NL mapping, execution replay, artifact storage/browser, remote agents, sandboxing, multi-user permissions, or multi-pending interactions under V1.

## V2 Entry Criteria

Before V2 implementation starts:

1. Commit or PR the V1 closeout changes.
2. Confirm default CI is green.
3. Run `pnpm test:v1-release-gate` in an environment where `python` resolves to a real executable.
4. Run `pnpm test:real-indbase-smoke` locally when validating real-agent integration.
5. Create a V2 planning doc and update `AGENTS.md` routing for the first V2 tracer bullet.

V2 planning can begin before the V1 closeout PR lands, but V2 implementation should wait until the V1 closeout is merged or otherwise frozen.
