# Architecture

`consoler` is a generic agent operations console. Agents are out-of-process and communicate through the consoler protocol. The first real agent target is indbase, but indbase business logic stays in `E:\indbase`.

## Core Boundaries

- Protocol and JSON Schemas live in `packages/protocol/`.
- Runtime lifecycle, approval, event storage, trace, replay, artifact retrieval, and intent drafting live in `packages/runtime/`.
- `agentctl` and the TUI call the same runtime surfaces.
- Agents own business validation, plan content, preview content, execution, domain errors, and agent-owned artifact storage.
- Consoler owns action IDs, approvals, context snapshots, event acceptance/rejection, history, trace, replay, and generic UI rendering.

## Durable Decisions

- V0 protocol/runtime boundaries: `docs/adr/0001-agent-protocol-v0-boundaries.md`
- Agent-owned artifact retrieval: `docs/adr/0002-agent-owned-artifact-retrieval.md`
- Natural-language Intent Drafting: `docs/adr/0003-natural-language-intent-drafting.md`
- LLM-assisted Intent Drafting: `docs/adr/0004-llm-assisted-intent-drafting.md`
- Python SDK versioning: `docs/adr/0005-versioned-python-agent-sdk.md`
- Product variant boundaries: `docs/adr/0006-product-variants-keep-agent-specific-ui-boundaries.md`
- Indbase NL v2 boundaries: `docs/adr/0007-indbase-nl-v2-intent-drafting.md`

## Durable Contracts

- Agent boundary: `docs/contracts/consoler-agent-boundary.md`
- Protocol: `docs/contracts/protocol-contract.md`
- Runtime lifecycle: `docs/contracts/runtime-lifecycle-contract.md`
- Approval: `docs/contracts/approval-contract.md`
- Trace and replay: `docs/contracts/trace-contract.md`
- Artifact retrieval: `docs/contracts/artifact-contract.md`
- Intent drafting: `docs/contracts/intent-draft-contract.md`
- Console variants: `docs/contracts/console-variant-contract.md`
