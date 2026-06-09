# Current Active Work

Last updated: 2026-06-09

Source of current phase: `docs/phase-manifest.yaml`

## Current State

`consoler` has shipped the core protocol/runtime tracer bullet, V1 lifecycle hardening, V2 artifact retrieval/browser, V3 deterministic and assisted Intent Drafting foundations, and V4 indbase Console Variant work through V4g.

The latest completed product phase, V4g indbase NL v2 Intent Drafting, has closeout evidence in `docs/testing/archive/consoler-v4/v4g-indbase-nl-v2-intent-drafting.md`.

The documentation lifecycle migration is completed and archived at `docs/planning/archive/docs-lifecycle/docs-lifecycle-migration.md`.

Active work now is V5a Operation Trace Panel and Artifact Vocabulary:

- phase id: `v5a-operation-trace-artifact-vocabulary`
- owner: `consoler`
- canonical spec: `docs/planning/active/v5a-operation-trace-artifact-vocabulary.md`
- agent rules: `docs/agents/current/consoler.md`
- planned release gate: `pnpm test:v5a-operation-trace-gate`

Next product work after V5a: real indbase adoption and dogfood smokes are not approved in this repo yet.

## Required Reading for Current Work

For V5a work:

- `docs/planning/active/v5a-operation-trace-artifact-vocabulary.md`
- `docs/phase-manifest.yaml`
- `docs/agents/current/consoler.md`
- `docs/contracts/trace-contract.md`
- `docs/contracts/artifact-contract.md`
- `docs/contracts/console-variant-contract.md`
- `docs/adr/0008-operation-trace-payload.md`
- `docs/project-status.md`

For consoler product/runtime changes after this migration:

- Start with `docs/phase-manifest.yaml` and this file.
- Read the relevant contract under `docs/contracts/`.
- Read the relevant ADR under `docs/adr/`.
- Use historical planning docs only through `docs/project-status.md` or explicit manifest links.

For indbase Console Variant tasks in this repo:

- `docs/agents/current/indbase-variant.md`
- `docs/contracts/console-variant-contract.md`
- `docs/contracts/intent-draft-contract.md`
- `docs/contracts/artifact-contract.md`
- `docs/adr/0006-product-variants-keep-agent-specific-ui-boundaries.md`
- `docs/adr/0007-indbase-nl-v2-intent-drafting.md`

## Explicitly Out of Scope

Out of scope for current V5a work:

- runtime store migrations
- real `E:\indbase` implementation changes
- trace-time reads of vault state, source files, artifact content, provider state, or agent domain state
- parsing or dereferencing agent-owned or provider-owned refs inside consoler
- new artifact open behavior beyond existing `action_id + block_id` retrieval
- renaming existing artifact block or artifact view wire fields
- making `artifact_trust_state` a protocol enum
- Web UI
- vault/source browser
- `ask`
- generated answers
- embeddings
- multi-action workflows
- category/tag mutations from consoler

## Current Gates

- Planned phase gate to add during implementation: `pnpm test:v5a-operation-trace-gate`.
- Current documentation prep gate: `pnpm docs:check`.
- Whitespace check: `git diff --check`.

Run focused package tests as listed in the V5a phase plan when implementation touches code.

## Notes for Implementation Agents

- Operation Trace must be emitted by agents and persisted as accepted event payload data; consoler must not infer it by re-reading agent/provider state.
- The first Operation Trace Panel is read-only and text-only.
- Artifact vocabulary is standardized without renaming current wire fields.
- `AGENTS.md` and `CONTEXT.md` remain bootloaders; put implementation detail in the active phase plan and durable rules in contracts/ADRs.
