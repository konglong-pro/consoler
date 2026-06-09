# Consoler Agent Boundary Contract

## Purpose

Define the durable boundary between generic consoler code and out-of-process agents.

## Applies To

- `packages/protocol/`
- `packages/runtime/`
- `packages/agentctl/`
- `packages/tui/`
- `sdks/python/`
- agent adapters such as indbase

## Rules

- Consoler never imports agent business logic.
- Agents run out of process over the protocol transport.
- Consoler owns action IDs, run IDs, plan IDs, approval IDs, context snapshot IDs, event acceptance, rejection, history, trace, and replay.
- Agents own business validation, plan content, preview content, execution, domain errors, and artifact storage.
- Agent code must not inject frontend code. Agents return schemas, events, renderable blocks, and artifact views.
- Product variants may curate labels, ordering, hints, and scoped actions; they must not move agent-owned business rules into consoler.

## Non-Goals

- Agent marketplace.
- In-process plugin execution.
- Consoler-owned indbase vault reads.
- Agent-specific URI parsing inside generic runtime or TUI code.

## Validation

When this boundary changes, run the relevant protocol/runtime/agentctl/TUI tests and conformance checks listed in `docs/testing.md`.
