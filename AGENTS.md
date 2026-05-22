# AGENTS.md

## Purpose

This repository is the main project for `consoler`: an agent operations console and runtime. It is chat-first and action-first, but the core product is the protocol and runtime that manage agent actions, approvals, event streams, history, and replay.

Use this file as routing and workflow guidance for coding agents. It is not the architecture spec.

## Start Here / Repo Map

- `docs/adr/`: durable architecture decisions. Read before changing protocol or runtime boundaries.
- `docs/planning/`: scoped implementation plans and MVP acceptance criteria.
- `packages/protocol/`: planned TypeScript protocol types, JSON Schemas, and validators.
- `packages/runtime/`: planned TypeScript runtime core: registry, process manager, transport, planner, approval, event store, replay.
- `packages/agentctl/`: planned headless CLI for protocol debugging before TUI work.
- `packages/tui/`: planned Ink TUI. Do not start here for runtime/protocol work.
- `sdks/python/`: planned minimal Python SDK for out-of-process agents.
- `E:\indbase`: first real agent host repo. `indbase-agent` code belongs there, not in this repo.

## Common Commands

- Install: `pnpm install`
- Agentctl help/dev entry: `pnpm agentctl -- --help`
- Test all: `pnpm test`
- Python SDK tests: `pnpm test:python-sdk`
- Single package test: `pnpm --filter @consoler/protocol test`
- Typecheck: `pnpm typecheck`
- Build: `pnpm build`
- Planned indbase agent command: from `E:\indbase`, `uv run python -m indbase_agent` after that adapter exists.

Prefer narrow validation for the changed package before broad checks.

## Task Routing

- Protocol shape or object contracts: start in `docs/adr/0001-agent-protocol-v0-boundaries.md`, then `packages/protocol/`.
- Runtime lifecycle, approval, event store, replay: start in `docs/planning/v0-indbase-doctor-tracer-bullet.md`, then `packages/runtime/`.
- Headless debugging CLI: start in `packages/agentctl/`; it must call the same runtime as the TUI.
- TUI behavior: start only after `agentctl` can run the v0 tracer bullet; keep it action timeline focused.
- Python agent SDK: start in `sdks/python/`; implement only what `indbase.doctor` needs.
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

- TUI change:
  1. Verify behavior against recorded event replay when available.
  2. Do not rely on TUI-only manual testing if `agentctl` exposes the same lifecycle.

## Architecture Constraints

- `consoler` never imports agent business logic. Agents are always out-of-process.
- The first real agent is `indbase`, but `consoler` must remain business-agnostic.
- Agent code must not inject frontend code. Agents return schemas, events, artifacts, and renderable blocks only.
- LLM intent mapping is out of v0. LLMs must never bypass ActionDraft, validation, plan, preview, approval, and execute.
- Preview is part of the action lifecycle. If a preview reads or mutates real environment state, model and approve it explicitly.
- Approval binds normalized args, plan, context snapshot, side effects, and preview hash when present.
- Execution output is a structured event stream. Do not treat logs as progress.
- v0 is a strict subset for `indbase.doctor`; do not implement future platform features unless the current task explicitly changes scope.

## Do Not Edit Unless Explicitly Asked

- `E:\indbase` unrelated files.
- Generated outputs, dependency directories, or build artifacts such as `node_modules/`, `dist/`, `coverage/`, `.consoler/consoler.db`.
- Lockfiles unrelated to the current dependency or scaffold change.
- Agent business implementation inside `consoler`; use adapter protocol boundaries instead.

## Deep Context Index

- `docs/adr/0001-agent-protocol-v0-boundaries.md`: accepted v0 architecture boundaries and non-goals.
- `docs/planning/v0-indbase-doctor-tracer-bullet.md`: MVP flow, acceptance criteria, and implementation sequence.

## Done Means

Before final response, report:

- Files changed.
- Commands run and results.
- Checks not run and why.
- Remaining risks or unknowns.
