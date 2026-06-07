# Current Consoler Agent Rules

Applies to active consoler work resolved from `docs/phase-manifest.yaml`.

## Start

1. Read `docs/active/current.md`.
2. Read the active phase spec listed there.
3. Read only the contracts and ADRs relevant to the touched area.

## Current Scope

Active phase: `docs-lifecycle-2026-06`.

Allowed work:

- Documentation lifecycle structure.
- Entry-file compaction.
- Contract, glossary, status, and testing indexes.
- Documentation lint.

Do not make product or runtime behavior changes for this phase.

## Rules

- Keep automatic entry files compact.
- Do not duplicate durable rules across phase docs.
- Do not treat archived, completed, or superseded phase plans as active instructions.
- Do not infer current phase from newest filename.
- Do not move legacy docs unless the same change rewrites affected links.
- Keep commands exact and sourced from `package.json`, scripts, CI, or existing docs.

## Validation

Run:

```powershell
pnpm docs:check
git diff --check
```

Report package tests as skipped unless non-documentation code changed.
