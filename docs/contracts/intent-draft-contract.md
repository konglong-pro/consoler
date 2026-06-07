# Intent Draft Contract

## Purpose

Define durable boundaries for deterministic and assisted Intent Drafting.

## Rules

- Intent Drafting maps natural language to at most one reviewable explicit action candidate.
- A candidate seeds an editable schema form with `prefilled_args`; it is not final approved args.
- Intent Drafting must not prepare, preview, approve, execute, write history, write trace, or retrieve artifacts by itself.
- Raw natural-language input, provider requests, provider responses, provider messages, prompt snapshots, and draft results are ephemeral unless a future active contract changes persistence.
- `draftIntent({ text, scope })` stays pure and deterministic: no filesystem, registry, store, process spawn, network, LLM, or agent calls.
- Runtime consumes neutral `IntentScope`; TUI-specific `ConsoleVariantConfig` stays outside runtime/protocol.
- Public first-version outcomes are `candidate` and `needs_clarification`.
- Stable first-version clarification reason codes are `no_match`, `ambiguous_command`, `missing_required_args`, `ambiguous_args`, and `unsupported_schema`.
- Assisted drafting is opt-in and deterministic-first.
- Provider suggestions are suggestion-only and must be validated into the existing Intent Draft result shape.
- Providers must not receive session vault context, history, trace, artifacts, previous results, vault contents, source snippets, file contents, cwd, runtime roots, provider internals, credentials, prompts, or raw responses.
- Object IDs and local paths suggested by a provider must come from the current user text when the active phase requires literal validation.

## Non-Goals

- Chat.
- `ask`.
- Direct execution.
- Multi-action workflows.
- Latest-result inference.
- Persisted intent traces.
- Provider setup UI.
- Default LLM behavior.

## Validation

Run relevant runtime, agentctl, TUI, V3b/V3c/V4e/V4g gates when changing intent behavior.
