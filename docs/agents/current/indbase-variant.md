# Current Indbase Variant Agent Rules

Applies to consoler-side work on the checked-in indbase Console Variant. The actual indbase implementation lives in `E:\indbase` and is not part of this repo unless explicitly requested.

## Status

The latest consoler indbase variant phase, V4g Indbase NL v2 Intent Drafting, is completed. There is no approved next product phase in this repo.

## Start

- Current state: `docs/active/current.md`
- Status summary: `docs/project-status.md`
- Variant boundary: `docs/contracts/console-variant-contract.md`
- Intent boundary: `docs/contracts/intent-draft-contract.md`
- Artifact boundary: `docs/contracts/artifact-contract.md`
- ADRs: `docs/adr/0006-product-variants-keep-agent-specific-ui-boundaries.md`, `docs/adr/0007-indbase-nl-v2-intent-drafting.md`

## Rules

- Keep consoler generic; indbase business logic stays in the indbase agent.
- Use checked-in variant configuration for product labels, ordering, hints, and scoped action surface.
- Do not add Web UI, vault browser, source browser, `ask`, generated answers, embeddings, mutation UI, or workflow automation without a new active phase.
- Intent Drafting remains form-prefill only and must not prepare, preview, approve, execute, or persist raw NL by itself.
- Assisted intent stays opt-in and must not receive session vault context, history, trace, artifacts, previous results, source snippets, cwd, runtime roots, or provider internals.
- `vault_path` session memory is TUI form-layer convenience only.

## Validation

Use the phase gate listed in `docs/phase-manifest.yaml` for the phase being changed. If no active phase covers the requested product work, stop and ask for explicit scope.
