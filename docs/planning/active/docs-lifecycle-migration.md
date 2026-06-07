---
doc_type: phase_plan
phase_id: docs-lifecycle-2026-06
title: Documentation Lifecycle Migration
status: active
owner: consoler
canonical: true
read_by_default: true
supersedes: []
superseded_by: null
related_contracts:
  - docs/contracts/consoler-agent-boundary.md
  - docs/contracts/runtime-lifecycle-contract.md
related_adrs: []
release_gate: pnpm docs:check
---

# Documentation Lifecycle Migration

## Goal

Make repository documentation lifecycle-managed instead of phase-piled: compact automatic entry files, manifest-owned current scope, durable rules in contracts, decisions in ADRs, status in compressed indexes, and history outside the default reading set.

## Scope

Allowed:

- Add `docs/phase-manifest.yaml` as the machine-readable phase source of truth.
- Add `docs/active/current.md` as the human-readable current work projection.
- Replace oversized root `AGENTS.md` and `CONTEXT.md` with compact entry files.
- Add focused current agent rules under `docs/agents/current/`.
- Extract durable consoler rules into `docs/contracts/`.
- Split root glossary content into `docs/glossary/` packs.
- Add status, architecture, development, and testing indexes.
- Add `scripts/check_docs.py` and a package script gate.
- Move completed and frozen legacy phase plans into `docs/planning/archive/` with rewritten links.
- Record replaced root path conventions in `docs/planning/superseded/`.

Not allowed:

- Product behavior changes.
- Protocol schema changes.
- Runtime store, replay, transport, or lifecycle changes.
- Python SDK behavior changes.
- TUI behavior changes.
- Real `E:\indbase` implementation changes.
- Moving legacy Markdown without a link relocation pass.

## Interfaces Touched

- Root agent and context entry files.
- Documentation indexes under `docs/`.
- Package script metadata for the docs gate.
- Documentation lint script.

## Acceptance Criteria

- `AGENTS.md` is under 250 lines.
- `CONTEXT.md` is under 150 lines.
- `docs/active/current.md` and `docs/phase-manifest.yaml` exist and agree on the active phase.
- Active phase has a canonical spec, agent rules, and release gate.
- Durable rules are discoverable under `docs/contracts/`.
- Glossary detail is routed out of root `CONTEXT.md`.
- Historical phase plans are not listed directly in `AGENTS.md`.
- Documentation lint can check the lifecycle invariants without new dependencies.
- Documentation lint checks local links in the default reading set without scanning archive bodies or virtual environments.
- CI runs the default documentation gate on Linux and Windows.
- Archive body links are checked through an optional report command, not the default gate.

## Tests / Gates

- `pnpm docs:check`
- `git diff --check`

Run package tests only if code behavior changes.

## Migration / Closeout

Completed and frozen legacy `docs/planning/*.md` files have been moved into `docs/planning/archive/consoler-v*/` with root-relative links rewritten. Historical testing evidence has been moved into `docs/testing/archive/consoler-v*/`. Replaced root path conventions are recorded in `docs/planning/superseded/`.
