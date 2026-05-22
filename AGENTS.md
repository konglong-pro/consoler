# AGENTS.md

## Purpose

This repository is the main project for `consoler`: an agent operations console and runtime. It is chat-first and action-first, but the core product is the protocol and runtime that manage agent actions, approvals, event streams, history, and replay.

Use this file as routing and workflow guidance for coding agents. It is not the architecture spec.

## Start Here / Repo Map

- `docs/adr/`: durable architecture decisions. Read before changing protocol or runtime boundaries.
- `docs/planning/`: scoped implementation plans and MVP acceptance criteria.
- `packages/protocol/`: TypeScript protocol types, JSON Schemas, and validators.
- `packages/runtime/`: TypeScript runtime core: registry, process manager, transport, planner, approval, event store, replay.
- `packages/agentctl/`: headless CLI for protocol debugging and lifecycle smoke tests.
- `packages/tui/`: Ink TUI (V0b). Depends on runtime prepared-action APIs.
- `sdks/python/`: minimal Python SDK for out-of-process agents.
- `E:\indbase`: first real agent host repo. `indbase-agent` code belongs there, not in this repo.

## Common Commands

- Install: `pnpm install`
- Agentctl help/dev entry: `pnpm agentctl -- --help`
- Test all: `pnpm test`
- Python SDK tests: `pnpm test:python-sdk`
- Single package test: `pnpm --filter @consoler/protocol test`
- TUI package test: `pnpm --filter @consoler/tui test`
- Typecheck: `pnpm typecheck`
- Build: `pnpm build`
- TUI: `pnpm tui --` (manifest command select, dual approval for probe commands)
- TUI replay: `pnpm tui -- --replay <action_id>`
- Ingest preview: `pnpm agentctl -- preview indbase indbase.ingest_file --args fixtures/ingest-args.json`
- Ingest probe: `pnpm agentctl -- preview indbase indbase.ingest_file --args fixtures/ingest-args.json --approve-preview`
- Ingest run: `pnpm agentctl -- run indbase indbase.ingest_file --args fixtures/ingest-args.json --approve-preview --approve`
- Indbase agent command: from `E:\indbase`, `uv run python -m indbase_agent`

Prefer narrow validation for the changed package before broad checks.

## Task Routing

- Protocol shape or object contracts: start in `docs/adr/0001-agent-protocol-v0-boundaries.md`, then `packages/protocol/`.
- Runtime lifecycle, approval, event store, replay: start in `docs/planning/v0-indbase-doctor-tracer-bullet.md`, then `packages/runtime/`.
- Headless debugging CLI: start in `packages/agentctl/`; it must call the same runtime as the TUI.
- V0b TUI behavior: start in `docs/planning/v0b-minimal-tui.md`; implement runtime prepared-action APIs before UI state.
- V1a side-effect tracer (`indbase.ingest_file`): start in `docs/planning/v1a-indbase-ingest-file-side-effect-tracer.md`; keep scope to one local file.
- Python agent SDK: start in `sdks/python/`; implement only what the active tracer bullet needs.
- `indbase-agent`: edit `E:\indbase` only when the task explicitly asks for the adapter or indbase API changes.

## Validation Rules

- Documentation-only change:
  1. Check links and paths manually.
  2. Ensure `AGENTS.md` stays short and points to deeper docs.

- Protocol/runtime change:
  1. Add or update focused tests near the changed package.
  2. Run the narrow package test command once scripts exist.
  3. Run typecheck once scripts exist.

- Agent transport or SDK change:
  1. Validate JSON-RPC request/response behavior with `agentctl` once available.
  2. Run Python SDK tests once the SDK test command exists.
  3. Run an `indbase.doctor` end-to-end smoke before claiming integration works.

- Side-effect agent action change:
  1. Read `docs/planning/v1a-indbase-ingest-file-side-effect-tracer.md`.
  2. Prove preview approval does not call write-oriented indbase helpers.
  3. Run focused protocol/runtime/agentctl/TUI tests for preview approval, execution approval, and context drift.
  4. Run the `indbase.doctor` regression smoke and an `indbase.ingest_file` smoke against a disposable fixture vault.

- TUI change:
  1. Add or update focused tests under `packages/tui/` once that package exists.
  2. Verify behavior against recorded event replay.
  3. Run `agentctl` lifecycle checks if runtime behavior changed.
  4. Do a manual TUI smoke for form -> approval -> live events -> result -> replay.

## Architecture Constraints

- `consoler` never imports agent business logic. Agents are always out-of-process.
- The first real agent is `indbase`, but `consoler` must remain business-agnostic.
- Agent code must not inject frontend code. Agents return schemas, events, artifacts, and renderable blocks only.
- LLM intent mapping is out of v0. LLMs must never bypass ActionDraft, validation, plan, preview, approval, and execute.
- Preview is part of the action lifecycle. If a preview reads or mutates real environment state, model and approve it explicitly.
- Approval binds normalized args, plan, context snapshot, side effects, and preview hash when present.
- Execution output is a structured event stream. Do not treat logs as progress.
- v0 is a strict subset for `indbase.doctor`; do not implement future platform features unless the current task explicitly changes scope.
- V1a `indbase.ingest_file` is the only approved side-effect expansion path. It is single-file only unless a newer planning doc changes scope.

## Do Not Edit Unless Explicitly Asked

- `E:\indbase` unrelated files.
- Generated outputs, dependency directories, or build artifacts such as `node_modules/`, `dist/`, `coverage/`, `.consoler/consoler.db`.
- Lockfiles unrelated to the current dependency or scaffold change.
- Agent business implementation inside `consoler`; use adapter protocol boundaries instead.

## Deep Context Index

- `docs/adr/0001-agent-protocol-v0-boundaries.md`: accepted v0 architecture boundaries and non-goals.
- `docs/planning/v0-indbase-doctor-tracer-bullet.md`: MVP flow, acceptance criteria, and implementation sequence.
- `docs/planning/v0b-minimal-tui.md`: next-stage execution brief for the Ink TUI.
- `docs/planning/v1a-indbase-ingest-file-side-effect-tracer.md`: side-effect tracer brief for probe preview approval and `indbase.ingest_file`.

## Done Means

Before final response, report:

- Files changed.
- Commands run and results.
- Checks not run and why.
- Remaining risks or unknowns.
