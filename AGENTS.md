# AGENTS.md

## Purpose

This repository is the main project for `consoler`: an agent operations console and runtime for out-of-process agents. This file is the short operational rulebook for coding agents. It is not the product spec, architecture spec, protocol contract, glossary, or historical phase log.

For current scope, read `docs/active/current.md`.

## Start Here

- Current work: `docs/active/current.md`
- Machine-readable phase state: `docs/phase-manifest.yaml`
- Shipped status: `docs/project-status.md`
- Development workflow: `docs/development.md`
- Testing and gates: `docs/testing.md`
- Architecture map: `docs/architecture.md`
- Durable contracts: `docs/contracts/`
- Durable decisions: `docs/adr/`
- Glossary entry point: `CONTEXT.md`
- Historical plans: `docs/planning/archive/`; resolve currentness through the manifest/status docs, not filename order.

Do not infer the active phase from filename order. The manifest owns phase identity and state.

## Current Active Scope

Read `docs/active/current.md` before implementation work.

Current phase:

- id: `v5a-operation-trace-artifact-vocabulary`
- owner: `consoler`
- canonical spec: `docs/planning/active/v5a-operation-trace-artifact-vocabulary.md`
- agent rules: `docs/agents/current/consoler.md`
- release gate: `pnpm test:v5a-operation-trace-gate`

The latest completed product phase is V4g indbase NL v2 Intent Drafting; it is summarized in `docs/project-status.md`.

## Repo Map

- `packages/protocol/`: TypeScript protocol types, JSON Schemas, validators, and protocol fixtures.
- `packages/runtime/`: runtime core for registry, process transport, approval, event store, replay, trace, artifact retrieval, and intent drafting.
- `packages/agentctl/`: headless CLI for protocol debugging, lifecycle smokes, history/trace, artifact view, and intent drafting.
- `packages/conformance/`: reusable agent protocol conformance harness and CI fake agent.
- `packages/tui/`: Ink TUI and checked-in Console Variant surfaces.
- `sdks/python/`: minimal Python SDK package for out-of-process agents.
- `scripts/`: release gates, smoke tests, package scripts, and documentation lint.
- `fixtures/`: small checked-in protocol/agentctl fixtures.
- `docs/`: lifecycle-managed docs, contracts, ADRs, testing, status, and historical plans.
- `E:\indbase`: external first real agent host repo. Do not edit it from this repo unless explicitly asked.

## Common Commands

- Install: `pnpm install`
- Agentctl help/dev entry: `pnpm agentctl -- --help`
- TUI dev shell: `pnpm tui --`
- TUI indbase product: `pnpm tui:indbase --`
- Test all default packages: `pnpm test`
- Typecheck: `pnpm typecheck`
- Build: `pnpm build`
- Docs lint: `pnpm docs:check`
- Conformance harness: `pnpm test:conformance`
- Agentctl smoke: `pnpm test:agentctl-smoke` after `pnpm build`
- Python SDK tests: `pnpm test:python-sdk`
- Python SDK package gate: `pnpm test:python-sdk-package`
- Artifact retrieval smoke: `pnpm test:artifact-retrieval-smoke`
- Real indbase local smoke: `pnpm test:real-indbase-smoke`

Current and historical phase gates are listed in `docs/phase-manifest.yaml` and summarized in `docs/testing.md`.

Prefer the narrow package or phase gate for the files you touched before broad `pnpm test`.

## Task Routing

1. Identify the area: protocol, runtime, agentctl, conformance, TUI, Python SDK, docs, testing, or external indbase coordination.
2. Read `docs/active/current.md`.
3. Read the matching contract or ADR before changing a durable boundary.
4. If no active doc covers the requested work, ask for explicit scope or make only safe interface-preserving fixes.

Route by area:

- Protocol shape or schemas: `docs/contracts/agent-manifest.md`, `docs/contracts/consoler-agent-boundary.md`, `docs/adr/0001-agent-protocol-v0-boundaries.md`, then `packages/protocol/`.
- Runtime lifecycle, approval, store, trace, replay, cancel, interactions: `docs/contracts/runtime-lifecycle-contract.md`, `docs/contracts/trace-contract.md`, then `packages/runtime/`.
- Artifact blocks or artifact retrieval: `docs/contracts/artifact-contract.md`, `docs/adr/0002-agent-owned-artifact-retrieval.md`.
- Intent drafting or assisted drafting: `docs/contracts/intent-draft-contract.md`, `docs/adr/0003-natural-language-intent-drafting.md`, `docs/adr/0004-llm-assisted-intent-drafting.md`, and for indbase NL v2 `docs/adr/0007-indbase-nl-v2-intent-drafting.md`.
- Console Variant or product TUI boundaries: `docs/contracts/console-variant-contract.md`, `docs/adr/0006-product-variants-keep-agent-specific-ui-boundaries.md`, then `packages/tui/`.
- Python SDK packaging: `docs/adr/0005-versioned-python-agent-sdk.md`, then `sdks/python/`.
- Testing, CI, or gates: `docs/testing.md`, then the relevant `scripts/test-*.mjs`.
- Documentation lifecycle: `docs/phase-manifest.yaml`, `docs/active/current.md`, entry files, and doc lint.
- Operation Trace or artifact vocabulary: `docs/planning/active/v5a-operation-trace-artifact-vocabulary.md`, `docs/contracts/trace-contract.md`, `docs/contracts/artifact-contract.md`, `docs/contracts/console-variant-contract.md`, `docs/adr/0008-operation-trace-payload.md`, then the touched package.

## Non-Negotiable Rules

- `consoler` never imports agent business logic; agents stay out of process.
- Do not bypass `ActionDraft`, schema validation, plan, preview, approval, execution, event persistence, or traceability.
- Do not treat replay, history, or trace as a way to spawn agents or re-read vault/source state.
- Do not parse or dereference agent-owned artifact URIs directly; use artifact retrieval by accepted `action_id` and `block_id`.
- Do not persist raw natural-language input, provider requests, provider responses, or draft results unless an active contract explicitly changes that.
- Do not send session vault context, history, trace, artifacts, previous results, source snippets, cwd, runtime roots, or provider internals to intent providers.
- Do not add LLM, Web UI, vault browser, source browser, generated-answer, `ask`, mutation, or multi-action workflow behavior unless the active scope allows it.
- Do not implement archived, superseded, or future phase work unless the user explicitly asks for that scope.
- All durable operations must be traceable; all failures must be visible.
- Operation Trace must be derived from accepted event payloads; trace reads must not infer it by re-reading agent/provider/domain state.

## Do Not Edit Unless Explicitly Asked

- `E:\indbase` implementation files.
- Generated outputs, dependency directories, and runtime data such as `node_modules/`, `dist/`, `coverage/`, and `.consoler/consoler.db`.
- Lockfiles unrelated to the current dependency or package-management change.
- Runtime store migrations for Operation Trace in V5a.

## Validation

Use `docs/testing.md` for command selection. For phase-specific gates, use `docs/phase-manifest.yaml` and `docs/active/current.md`.

If the current phase gate script has not been added yet, run the focused checks listed in the active phase plan.

For documentation-only changes, run:

```powershell
pnpm docs:check
git diff --check
```

For code changes, run the focused package tests first, then any relevant phase gate, then broader checks if the change touches shared behavior.

## Done Means

Report:

- files changed
- commands run and results
- checks skipped and why
- remaining risks or unknowns
