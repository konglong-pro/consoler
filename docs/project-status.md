# Project Status

Last updated: 2026-06-07

## Current Summary

`consoler` is a local agent operations console and runtime for out-of-process agents. It owns the protocol/runtime lifecycle, approvals, event streams, history, trace, replay, artifact retrieval transport, deterministic intent drafting, opt-in assisted intent orchestration, and checked-in product variant shell.

The latest product phase, V4g Indbase NL v2 Intent Drafting, is completed. Current active work is documentation lifecycle migration.

## Shipped / Frozen

| Area | Status | Canonical docs | Gate / evidence |
| --- | --- | --- | --- |
| V0 protocol/runtime tracer bullet | completed | `docs/planning/archive/consoler-v0/v0-indbase-doctor-tracer-bullet.md` | `docs/adr/0001-agent-protocol-v0-boundaries.md` |
| V1 lifecycle, interactions, redaction, strong control | frozen | `docs/planning/archive/consoler-v1/v1p-v1-stabilization-release-gate.md` | `pnpm test:v1-release-gate`, `docs/testing/archive/consoler-v1/v1-closeout.md` |
| V1q real indbase local smokes | completed, local-only | `docs/planning/archive/consoler-v1/v1q-real-indbase-local-smokes.md` | `pnpm test:real-indbase-smoke` |
| V2 artifact retrieval/browser | frozen | `docs/planning/archive/consoler-v2/v2c-artifact-retrieval-closeout.md` | `pnpm test:v2-release-gate`, `docs/testing/archive/consoler-v2/v2-artifact-retrieval-closeout.md` |
| V3b deterministic Intent Drafting | completed | `docs/planning/archive/consoler-v3/v3b-natural-language-intent-drafting.md` | `pnpm test:v3b-intent-gate` |
| V3c assisted Intent Drafting foundation | completed | `docs/planning/archive/consoler-v3/v3c-assisted-intent-runtime-cli.md`, `docs/planning/archive/consoler-v3/v3c-assisted-intent-tui-entry.md` | `pnpm test:v3c-assisted-intent-gate`, `pnpm test:v3c-tui-assisted-intent-gate` |
| V4d indbase Dogfood UX Variant | completed | `docs/planning/archive/consoler-v4/v4d-indbase-dogfood-ux.md` | `docs/testing/archive/consoler-v4/v4d-indbase-dogfood-ux-closeout.md` |
| V4e indbase Variant Intent Drafting | completed | `docs/planning/archive/consoler-v4/v4e-indbase-variant-intent-drafting.md` | `docs/testing/archive/consoler-v4/v4e-indbase-variant-intent-drafting.md` |
| V4f real dogfood friction pass | completed | `docs/planning/archive/consoler-v4/v4f-indbase-real-dogfood-friction-pass.md` | `docs/testing/archive/consoler-v4/v4f-indbase-real-dogfood-friction-pass.md` |
| V4g indbase NL v2 Intent Drafting | completed | `docs/planning/archive/consoler-v4/v4g-indbase-nl-v2-intent-drafting.md` | `docs/testing/archive/consoler-v4/v4g-indbase-nl-v2-intent-drafting.md` |

## Active

| Phase | Owner | Spec | Agent rules | Gate |
| --- | --- | --- | --- | --- |
| `docs-lifecycle-2026-06` Documentation Lifecycle Migration | consoler | `docs/planning/active/docs-lifecycle-migration.md` | `docs/agents/current/consoler.md` | `pnpm docs:check` |

## Next

No next product phase is approved in this repo.

## Explicitly Out of Scope

- Web UI.
- Vault browser or source browser.
- `ask`, generated answers, embeddings, semantic search, or retrieval packages.
- Category/tag mutation UI from consoler.
- Multi-action workflows or queued automation.
- Default assisted/LLM behavior.
- Provider setup UI or persisted provider preferences.
- Protocol schema, runtime store, replay, transport, or Python SDK changes without active scope.
- Real `E:\indbase` implementation changes unless explicitly requested.

## Local-Only Surfaces

- Real indbase smokes remain local-only and environment-gated.
- Real provider smokes remain optional and local-only; committed evidence must not include endpoints, credentials, raw prompts, raw responses, private paths, source snippets, or private vault content.

## Superseded / Archive Status

Completed and frozen phase plans live under `docs/planning/archive/` for link-preserving history. Currentness is defined by `docs/phase-manifest.yaml`, not by filename order.

Compressed per-phase closeout summaries live at `docs/planning/archive/closeout-summaries.md`.

| Superseded rule | Replacement |
| --- | --- |
| Root phase plan paths `docs/planning/v*.md` | `docs/planning/archive/`, `docs/planning/active/`, and `docs/phase-manifest.yaml` |
| Root phase testing evidence paths `docs/testing/v*.md` | `docs/testing/archive/`, `docs/testing.md`, and `docs/phase-manifest.yaml` |

- Keep `docs/project-status.md` as the compressed history layer and closeout entry point.
- No completed/frozen product phase plan is currently classified as superseded.
