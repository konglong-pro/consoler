# Console Variant Contract

## Purpose

Define durable rules for checked-in product variants of consoler.

## Rules

- A Console Variant curates agent scope, command ordering, product labels, field hints, and navigation.
- Product-facing labels should use host-product language; audit/debug surfaces may still expose protocol identifiers.
- Variants must not become a marketplace or arbitrary agent search UI unless that is the active product scope.
- Variant configuration does not modify `AgentManifest`, protocol schemas, runtime store schema, or agent business logic.
- Variant-scoped history and action launch must respect the configured agent/command scope.
- Variant vault context is session-local form-layer convenience unless a future active phase changes persistence.
- Agent-specific URI parsing, vault reads, and business rules stay with the owning agent adapter.

## Non-Goals

- Generic plugin marketplace.
- Product-specific runtime forks.
- Agent business logic in TUI code.
- Hidden execution shortcuts around approval.

## Validation

Run focused TUI tests and any phase gate listed in `docs/phase-manifest.yaml` for variant work.
