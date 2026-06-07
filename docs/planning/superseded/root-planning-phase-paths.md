---
doc_type: superseded_rule
title: Root Planning Phase Paths
status: superseded
canonical: false
read_by_default: false
superseded_by:
  - docs/planning/archive/README.md
  - docs/phase-manifest.yaml
---

# Root Planning Phase Paths

## Superseded Rule

Phase plans previously lived directly under `docs/planning/` as `v*.md`.

That location is no longer current.

## Replacement

- Active plans live in `docs/planning/active/`.
- Planned but unapproved work lives in `docs/planning/next/`.
- Completed and frozen plans live in `docs/planning/archive/`.
- Currentness is resolved from `docs/phase-manifest.yaml`, not filename order.

## Migration Status

The completed and frozen consoler phase plans have been moved to `docs/planning/archive/consoler-v*/` and all root-relative links were rewritten.
