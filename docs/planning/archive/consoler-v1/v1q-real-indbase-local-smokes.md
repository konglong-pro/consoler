---
doc_type: phase_plan
phase_id: v1q-real-indbase-local-smokes
title: Task execution brief: V1q real indbase local smoke stabilization
status: completed
canonical: false
read_by_default: false
superseded_by: null
---

# Task execution brief: V1q real indbase local smoke stabilization

## Objective

Turn the V1 real `indbase` acceptance checklist into a repeatable local-only smoke gate that uses disposable vaults and the real out-of-process `indbase_agent`.

## Scope

- In scope: a local smoke script, package script wiring, local smoke documentation, V1 release-gate documentation links, and `AGENTS.md` routing.
- Out of scope: default CI changes, protocol/runtime/TUI/Python SDK behavior, real `indbase` business behavior, timing-sensitive real `agentctl` cancel as a required gate, test-only slow hooks, execution replay, artifact storage, and new agent commands.

## Start here

- Local smoke doc: `docs/testing/real-indbase-smokes.md`
- Release gate doc: `docs/testing/archive/consoler-v1/v1-release-gate.md`
- Existing smoke scripts: `scripts/test-agentctl-smoke.mjs`, `scripts/test-redaction-smoke.mjs`, `scripts/test-v1-release-gate.mjs`
- Real agent repo: `E:\indbase`

## Do not touch

- Do not edit `.github/workflows/ci.yml` to require real `E:\indbase`.
- Do not edit `packages/protocol`, `packages/runtime`, `packages/tui`, `sdks/python`, or `E:\indbase` unless the smoke exposes an existing integration bug and the task explicitly expands.
- Do not make the smoke use a committed vault, developer vault, or default `.consoler` store.
- Do not add a test-only delay or hidden command to the real indbase agent.

## Steps

1. Add `scripts/test-real-indbase-smoke.mjs`.
   - Default `INDBASE_REPO` to `E:\indbase`; allow override.
   - Run `pnpm build`, then use compiled `packages/agentctl/dist/main.js`.
   - Create a temp `CONSOLER_ROOT`, temp registry, temp vault, temp source file, and temp args/response files.
   - Register real `indbase` as `uv run python -m indbase_agent` with `PYTHONPATH` pointing at `sdks/python`.

2. Cover the local real-agent happy paths.
   - `indbase.doctor`: run with `--approve`; assert trace terminal is `succeeded`.
   - `indbase.ingest_file` normal: run with `--approve-preview --approve`; assert trace has `diff` and `artifact` result blocks.
   - duplicate `skip`: run with a seeded `"skip"` interaction response; assert responded interaction, `succeeded` terminal, skip result JSON, and no diff block.
   - duplicate `continue`: run with a seeded `"continue"` response; assert responded interaction, `succeeded` terminal, and diff/artifact blocks.

3. Cover cancel stabilization without timing-sensitive real agentctl cancel.
   - Cooperative cancel: run focused `E:\indbase` adapter and pipeline pytest cases that prove checkpoint propagation and cancellation re-raise.
   - Timeout fallback: run conformance fake `conformance.slow_ignore_cancel` through `agentctl test --cancel-after-ms --cancel-timeout-ms --json`; assert the report passes and includes the cancel timeout checks.

4. Add docs and routing.
   - Add `docs/testing/real-indbase-smokes.md` with command, environment variables, coverage, and local-only boundary.
   - Link it from `docs/testing/archive/consoler-v1/v1-release-gate.md`.
   - Update `AGENTS.md` with the command, V1q routing, validation rule, local-only architecture constraint, and deep context entry.

## Validation

- `pnpm test:real-indbase-smoke`
- `pnpm test:v1-release-gate`
- `git diff --check`

## Done means

- One command runs the local disposable real `indbase` smoke suite.
- The smoke never uses committed fixtures, real user vaults, default `.consoler`, or default CI.
- The docs clearly separate real `indbase` cooperative cancel proof from fake-agent timeout fallback proof.
- `AGENTS.md` remains a short routing entry and points to deeper docs.

## Unknowns

- The smoke assumes `uv` can run the real indbase project and that `INDBASE_REPO` points to a working checkout. If `E:\indbase` is unavailable, set `INDBASE_REPO`.
