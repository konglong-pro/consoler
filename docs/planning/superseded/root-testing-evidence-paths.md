---
doc_type: superseded_rule
title: Root Testing Evidence Paths
status: superseded
canonical: false
read_by_default: false
superseded_by:
  - docs/testing.md
  - docs/testing/archive/README.md
  - docs/phase-manifest.yaml
---

# Root Testing Evidence Paths

## Superseded Rule

Phase testing evidence previously lived directly under `docs/testing/` as `v*.md`.

That location is no longer current.

## Replacement

- Current testing commands and gate routing live in `docs/testing.md`.
- Still-executable local runbooks may remain in `docs/testing/`.
- Historical phase gates, closeouts, and validation evidence live in `docs/testing/archive/`.
- Closeout lookup is resolved from `docs/phase-manifest.yaml` and `docs/project-status.md`.

## Migration Status

The consoler V1-V4 testing evidence files have been moved to `docs/testing/archive/consoler-v*/` and all root-relative links were rewritten.
