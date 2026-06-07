# Current Active Work

Last updated: 2026-06-07

Source of current phase: `docs/phase-manifest.yaml`

## Current State

`consoler` has shipped the core protocol/runtime tracer bullet, V1 lifecycle hardening, V2 artifact retrieval/browser, V3 deterministic and assisted Intent Drafting foundations, and V4 indbase Console Variant work through V4g.

The latest product phase, V4g indbase NL v2 Intent Drafting, is completed and has closeout evidence in `docs/testing/archive/consoler-v4/v4g-indbase-nl-v2-intent-drafting.md`.

Active work now is documentation lifecycle migration:

- phase id: `docs-lifecycle-2026-06`
- owner: `consoler`
- canonical spec: `docs/planning/active/docs-lifecycle-migration.md`
- agent rules: `docs/agents/current/consoler.md`
- gate: `pnpm docs:check`

Next product work: none approved in this repo.

## Required Reading for Current Work

For documentation lifecycle work:

- `docs/planning/active/docs-lifecycle-migration.md`
- `docs/phase-manifest.yaml`
- `docs/project-status.md`
- `docs/agents/current/consoler.md`

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

Out of scope for current docs lifecycle work:

- product behavior changes
- protocol schema changes
- runtime store migrations
- replay or transport changes
- TUI behavior changes
- Python SDK behavior
- real `E:\indbase` implementation changes
- Web UI
- vault/source browser
- `ask`
- generated answers
- embeddings
- multi-action workflows
- category/tag mutations from consoler

## Current Gates

- `pnpm docs:check`: documentation lifecycle lint from `scripts/check_docs.py`.
- `git diff --check`: whitespace check.

Run package tests only if code outside docs/scripts/package metadata is changed.

## Notes for Implementation Agents

- The manifest owns current phase identity and state.
- `AGENTS.md` and `CONTEXT.md` are bootloaders; keep them compact.
- Contracts hold durable rules. ADRs hold durable decisions. Planning docs hold scoped implementation work. Status docs compress shipped history.
- Completed and frozen phase plans live under `docs/planning/archive/`; read them through `docs/project-status.md` or explicit manifest links.
