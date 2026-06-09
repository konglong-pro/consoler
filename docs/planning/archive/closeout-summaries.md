---
doc_type: closeout_summary
status: archived
canonical: false
read_by_default: false
---

# Phase Closeout Summaries

This file is the compressed entry point for old consoler phases. It is not a current scope document. Use `docs/phase-manifest.yaml` and `docs/active/current.md` for current work.

## V0

| Phase | Closeout summary | Evidence |
| --- | --- | --- |
| V0 indbase doctor tracer bullet | Established the first agent protocol/runtime tracer bullet for an out-of-process indbase doctor action. | `docs/planning/archive/consoler-v0/v0-indbase-doctor-tracer-bullet.md`, `docs/adr/0001-agent-protocol-v0-boundaries.md` |
| V0b minimal TUI | Added the first Ink TUI shell on top of runtime prepared-action APIs. | `docs/planning/archive/consoler-v0/v0b-minimal-tui.md` |

## V1

| Phase | Closeout summary | Evidence |
| --- | --- | --- |
| V1a ingest file side-effect tracer | Added the first side-effecting real-agent action path with preview and execution approval separation. | `docs/planning/archive/consoler-v1/v1a-indbase-ingest-file-side-effect-tracer.md` |
| V1b action history and trace browser | Added read-only history, trace, and replay surfaces for accepted/rejected runtime events. | `docs/planning/archive/consoler-v1/v1b-action-history-trace-browser.md` |
| V1c conformance harness | Added fake-agent conformance checks and `agentctl test` for protocol compatibility. | `docs/planning/archive/consoler-v1/v1c-conformance-harness.md` |
| V1d diff and artifact blocks | Extended renderable blocks with diff and artifact references without adding artifact storage. | `docs/planning/archive/consoler-v1/v1d-diff-artifact-renderable-blocks.md` |
| V1e real indbase renderable adoption | Wired real indbase ingest execution results into existing renderable block contracts. | `docs/planning/archive/consoler-v1/v1e-real-indbase-renderable-blocks.md` |
| V1f cooperative cancel | Added SDK/runtime/agentctl cooperative cancel without TUI controls or force-kill semantics. | `docs/planning/archive/consoler-v1/v1f-cooperative-cancel.md` |
| V1g TUI cooperative cancel | Exposed cooperative cancel in the TUI using the runtime control surface. | `docs/planning/archive/consoler-v1/v1g-tui-cooperative-cancel.md` |
| V1h interaction.required | Added fake-first agent interaction prompts with a single pending interaction model. | `docs/planning/archive/consoler-v1/v1h-interaction-required.md` |
| V1i interaction trace persistence | Persisted interaction request/response records for trace without changing replay. | `docs/planning/archive/consoler-v1/v1i-interaction-trace-persistence.md` |
| V1j agentctl live interactions | Wired `agentctl run` to handle live `interaction.required` prompts. | `docs/planning/archive/consoler-v1/v1j-agentctl-run-live-interactions.md` |
| V1k interaction timeout policy | Added runtime-owned timeout handling for pending interactions. | `docs/planning/archive/consoler-v1/v1k-interaction-timeout-policy.md` |
| V1l interaction response redaction | Added opt-in trace redaction for persisted interaction responses. | `docs/planning/archive/consoler-v1/v1l-interaction-response-redaction.md` |
| V1m real indbase interaction adoption | Adopted existing interaction support in real indbase duplicate-ingest handling. | `docs/planning/archive/consoler-v1/v1m-real-indbase-interaction-adoption.md` |
| V1n strong runtime control | Added runtime action locks, cancel timeout handling, and post-cancel event quarantine. | `docs/planning/archive/consoler-v1/v1n-strong-runtime-control.md` |
| V1o real indbase cooperative cancel | Added real indbase ingest pipeline checkpoints for cooperative cancellation. | `docs/planning/archive/consoler-v1/v1o-real-indbase-cooperative-cancel.md` |
| V1p stabilization release gate | Froze the V1 baseline behind the V1 release gate. | `docs/planning/archive/consoler-v1/v1p-v1-stabilization-release-gate.md`, `docs/testing/archive/consoler-v1/v1-closeout.md` |
| V1q real indbase local smokes | Added local-only disposable-vault smokes for real indbase integration paths. | `docs/planning/archive/consoler-v1/v1q-real-indbase-local-smokes.md`, `docs/testing/real-indbase-smokes.md` |

## V2

| Phase | Closeout summary | Evidence |
| --- | --- | --- |
| V2a artifact retrieval protocol contract | Added manifest capability and `ArtifactView` validation for agent-owned retrieval. | `docs/planning/archive/consoler-v2/v2a-artifact-retrieval-protocol-contract.md`, `docs/adr/0002-agent-owned-artifact-retrieval.md` |
| V2a artifact retrieval CLI loop | Added runtime/agentctl/SDK/conformance support for accepted-block artifact retrieval. | `docs/planning/archive/consoler-v2/v2a-artifact-retrieval-cli-loop.md` |
| V2a artifact browser | Added generic artifact browsing surfaces without content storage or URI dereference. | `docs/planning/archive/consoler-v2/v2a-artifact-retrieval-browser.md` |
| V2b artifact browser real adoption | Wired the TUI artifact view and real indbase artifact retrieval through the existing runtime API. | `docs/planning/archive/consoler-v2/v2b-artifact-browser-real-adoption.md` |
| V2c artifact retrieval closeout | Froze V2 artifact retrieval and browser behavior behind the V2 release gate. | `docs/planning/archive/consoler-v2/v2c-artifact-retrieval-closeout.md`, `docs/testing/archive/consoler-v2/v2-artifact-retrieval-closeout.md` |

## V3

| Phase | Closeout summary | Evidence |
| --- | --- | --- |
| V3a Console Variant product entrypoint | Added checked-in product variant configuration and indbase product TUI entrypoints. | `docs/planning/archive/consoler-v3/v3a-console-variant-product-entrypoint.md`, `docs/adr/0006-product-variants-keep-agent-specific-ui-boundaries.md` |
| V3b runtime intent mapper | Added deterministic runtime intent mapping from neutral `IntentScope`. | `docs/planning/archive/consoler-v3/v3b-runtime-intent-mapper.md` |
| V3b agentctl intent-draft | Added `agentctl intent-draft` human and JSON output over the runtime mapper. | `docs/planning/archive/consoler-v3/v3b-agentctl-intent-draft.md` |
| V3b TUI product intent entry | Added product-scoped natural-language entry that seeds editable TUI forms. | `docs/planning/archive/consoler-v3/v3b-tui-product-intent-entry.md` |
| V3b natural-language intent drafting | Completed deterministic single-action Intent Drafting without execution or persistence side effects. | `docs/planning/archive/consoler-v3/v3b-natural-language-intent-drafting.md`, `docs/testing/archive/consoler-v3/v3b-intent-gate.md` |
| V3c assisted intent runtime/CLI | Added opt-in provider-assisted drafting with deterministic fallback and fake-provider gates. | `docs/planning/archive/consoler-v3/v3c-assisted-intent-runtime-cli.md`, `docs/testing/archive/consoler-v3/v3c-assisted-intent-gate.md` |
| V3c assisted intent TUI | Added opt-in product TUI assisted drafting while keeping default deterministic behavior. | `docs/planning/archive/consoler-v3/v3c-assisted-intent-tui-entry.md`, `docs/testing/archive/consoler-v3/v3c-tui-assisted-intent-gate.md` |

## V4

| Phase | Closeout summary | Evidence |
| --- | --- | --- |
| V4a versioned Python Agent SDK | Packaged the Python SDK as an internal, versioned agent SDK surface. | `docs/planning/archive/consoler-v4/v4a-versioned-python-agent-sdk.md`, `docs/adr/0005-versioned-python-agent-sdk.md` |
| V4b indbase source trust probe | Added indbase variant Source Trust Loop probe coordination while keeping indbase logic out of consoler. | `docs/planning/archive/consoler-v4/v4b-indbase-source-trust-probe.md` |
| V4c indbase probe stabilization | Stabilized real-agent smoke and conformance signals for the Source Trust Loop. | `docs/planning/archive/consoler-v4/v4c-indbase-probe-stabilization.md` |
| V4d indbase dogfood UX | Improved the indbase product TUI for Source Trust Loop dogfood use. | `docs/planning/archive/consoler-v4/v4d-indbase-dogfood-ux.md`, `docs/testing/archive/consoler-v4/v4d-indbase-dogfood-ux-closeout.md` |
| V4e indbase variant intent drafting | Added deterministic indbase-variant Source Trust Loop form prefill. | `docs/planning/archive/consoler-v4/v4e-indbase-variant-intent-drafting.md`, `docs/testing/archive/consoler-v4/v4e-indbase-variant-intent-drafting.md` |
| V4f real dogfood friction pass | Used real dogfood evidence to fix narrow TUI friction without runtime/protocol expansion. | `docs/planning/archive/consoler-v4/v4f-indbase-real-dogfood-friction-pass.md`, `docs/testing/archive/consoler-v4/v4f-indbase-real-dogfood-friction-pass.md` |
| V4g indbase NL v2 intent drafting | Added strict opt-in assisted indbase drafting with provider context audit and validation. | `docs/planning/archive/consoler-v4/v4g-indbase-nl-v2-intent-drafting.md`, `docs/testing/archive/consoler-v4/v4g-indbase-nl-v2-intent-drafting.md`, `docs/adr/0007-indbase-nl-v2-intent-drafting.md` |
