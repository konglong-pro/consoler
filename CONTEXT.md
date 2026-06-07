# CONTEXT.md

Short glossary entry point for `consoler`.

Read only the glossary pack relevant to your task. Do not load every glossary file by default.

## Core Terms

**consoler**: Generic agent operations console and runtime for out-of-process agents.

**Agent Operations Console**: Shared protocol/runtime surface for operating agents through actions, approvals, events, history, trace, and replay.

**Runtime Lifecycle**: The ordered path from explicit action draft through validation, plan, preview, approval, execution, persisted events, history, trace, and replay.

**Console Variant**: Checked-in product configuration that adapts consoler to a host product or scoped agent set without changing protocol boundaries.

**indbase Console Variant**: Product-scoped TUI configuration for operating the indbase Source Trust Loop through consoler-owned runtime and UI surfaces while indbase owns vault reads and business rules.

**Intent Drafting**: Natural-language-to-action helper that creates at most one reviewable form prefill. It is not chat, direct execution, or workflow automation.

**Artifact Retrieval**: User-triggered read path where consoler asks the artifact-owning agent for an `ArtifactView` by accepted `action_id` and `block_id`.

**Trace View**: Read-only debugging surface for one `action_id`, including accepted and rejected events. Replay remains accepted-events-only.

## Glossary Packs

- Core runtime and action terms: `docs/glossary/core.md`
- Runtime lifecycle, approval, interaction, and cancel terms: `docs/glossary/runtime-lifecycle.md`
- Artifact block and artifact retrieval terms: `docs/glossary/artifact-retrieval.md`
- Intent drafting and assisted intent terms: `docs/glossary/intent-drafting.md`
- Console Variant and product TUI terms: `docs/glossary/console-variant.md`
- indbase Source Trust Loop coordination terms: `docs/glossary/indbase-integration.md`

## Durable Rule Locations

- Agent and protocol boundaries: `docs/contracts/consoler-agent-boundary.md`
- Runtime lifecycle and trace rules: `docs/contracts/runtime-lifecycle-contract.md`, `docs/contracts/trace-contract.md`
- Artifact rules: `docs/contracts/artifact-contract.md`
- Intent drafting rules: `docs/contracts/intent-draft-contract.md`
- Console Variant rules: `docs/contracts/console-variant-contract.md`

## Avoid Ambiguous Shortcuts

- Say "Intent Drafting" when the output is a reviewable form prefill; do not call it chat or `ask`.
- Say "Artifact Retrieval" when the agent returns an `ArtifactView`; do not imply consoler owns artifact storage.
- Say "Variant Vault Context" only for session-local TUI form prefill; do not imply vault discovery or runtime inference.
- Say "history/trace/replay" as read-only audit surfaces; do not imply execution replay.
