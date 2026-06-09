---
doc_type: phase_plan
phase_id: v1p-v1-stabilization-release-gate
title: Task execution brief: V1p stabilization release gate
status: frozen
canonical: false
read_by_default: false
superseded_by: null
---

# Task execution brief: V1p stabilization release gate

## Objective

Close V1 as a verifiable release surface. V1p adds a release-gate script, a concise acceptance matrix, and CI coverage for stable fake-agent checks without adding new protocol, runtime, TUI, SDK, or real-agent behavior.

## Scope

- In scope: `docs/testing/archive/consoler-v1/v1-release-gate.md`, `scripts/test-v1-release-gate.mjs`, root `package.json`, `.github/workflows/ci.yml`, `AGENTS.md`, and documentation-only planning updates.
- Out of scope: new agent protocol features, runtime lifecycle changes, TUI behavior, Python SDK behavior, real `E:\indbase` implementation changes, execution replay, artifact storage, NL mapping, sandboxing, remote agents, and multi-pending interactions.

## Start here

- V1 entry map: `AGENTS.md`
- V1 release matrix: `docs/testing/archive/consoler-v1/v1-release-gate.md`
- Existing scripts: `package.json`, `scripts/test-agentctl-smoke.mjs`, `scripts/test-redaction-smoke.mjs`, `scripts/test-conformance.mjs`, `scripts/test-python-sdk.mjs`
- CI: `.github/workflows/ci.yml`

## Do not touch

- Do not edit `packages/protocol`, `packages/runtime`, `packages/agentctl`, `packages/tui`, `packages/conformance`, or `sdks/python` unless a release-gate wiring test proves a script integration bug.
- Do not make default CI depend on `E:\indbase`, real vaults, local-only paths, or timing-sensitive real-agent smokes.
- Do not add new dependencies, lockfile changes, generated outputs, or `.consoler/consoler.db`.
- Do not turn `AGENTS.md` into the V1 acceptance matrix; keep detailed gate content in `docs/testing/archive/consoler-v1/v1-release-gate.md`.

## Steps

1. Add the V1 release gate documentation:
   - Create `docs/testing/archive/consoler-v1/v1-release-gate.md`.
   - Include a V1a-V1o capability matrix with automated checks, local-only checks, and CI status.
   - Explicitly list V2+ exclusions: NL mapping, execution replay, artifact storage/browser, remote agents, sandbox/secret manager, and multi-pending interactions.

2. Add the release-gate script:
   - Create `scripts/test-v1-release-gate.mjs`.
   - Check that the platform Python executable used by fake-agent tests is available (`python` on Windows, `python3` elsewhere).
   - Run sequentially: `pnpm build`, `pnpm typecheck`, `pnpm test`, `pnpm test:python-sdk`, `pnpm test:conformance`, `pnpm test:agentctl-smoke`, `pnpm test:redaction-smoke`.
   - On Windows Python alias failure, print a clear message telling the user to put a real Python executable earlier on `PATH`.

3. Wire commands and CI:
   - Add `test:v1-release-gate` to root `package.json`.
   - Update Linux CI to run the release-gate script after install and Python test dependency setup.
   - Keep Windows CI focused on runtime, agentctl, Python SDK, and agentctl smoke; do not add real `indbase` gates.

4. Update `AGENTS.md`:
   - Add the common command, V1p task routing, validation rule, architecture constraint, and deep context entries.
   - Keep the entry short and point to `docs/testing/archive/consoler-v1/v1-release-gate.md` for matrix detail.

## Validation

- Documentation/path checks:
  - `Test-Path docs\planning\v1p-v1-stabilization-release-gate.md`
  - `Test-Path docs\testing\v1-release-gate.md`
  - `Test-Path scripts\test-v1-release-gate.mjs`

- Release gate:
  - `pnpm test:v1-release-gate`

- Hygiene:
  - `git diff --check`

## Done means

- V1a-V1o have a documented acceptance matrix with CI, local-only, and future-work boundaries.
- `pnpm test:v1-release-gate` runs every stable V1 fake-agent gate in the intended order.
- Linux CI includes redaction smoke through the release gate.
- Default CI does not require real `E:\indbase` or disposable vault smokes.
- `AGENTS.md` remains a routing file, not a detailed release document.

## Unknowns

- None expected. If local Windows still resolves `python` to the Microsoft Store alias, do not change fake-agent behavior; fix `PATH` or install Python so `python --version` works.
