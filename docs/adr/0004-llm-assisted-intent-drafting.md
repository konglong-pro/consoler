# ADR 0004: LLM-assisted Intent Drafting

Status: Accepted

Date: 2026-06-01

## Context

V3b closed the first Natural Language Intent Drafting phase with a deterministic mapper, `agentctl intent-draft`, and product-variant TUI entry. That phase deliberately avoided model providers, network calls, credentials, prompt policy, and persistence of raw natural-language input.

The next phase can improve natural-language understanding, but it changes the privacy and reliability boundary: an external model provider may see user input and scoped command metadata. Without an explicit decision, future implementation could blur Intent Drafting into direct execution, chat, generic agent search, or provider-dependent console startup.

## Decision

V3c will add LLM-assisted Intent Drafting as an opt-in enhancement to Intent Drafting, not as a replacement for the Runtime Lifecycle.

Accepted decisions:

1. The existing deterministic `draftIntent({ text, scope })` remains a pure, offline, no-network mapper.
2. LLM assistance must produce the same public Intent Drafting outcomes: a reviewable candidate or a clarification path.
3. LLM assistance must not prepare, preview, approve, execute, persist raw input, or bypass the existing schema form.
4. The normal console entry must work without model credentials or network access.
5. Provider failure, timeout, missing configuration, or unusable model output must fall back to deterministic Intent Drafting behavior.
6. Shared orchestration and output validation belong in consoler-owned intent drafting code; concrete provider credentials, model selection, timeouts, and transport details are injected from configuration or caller-owned setup.
7. Runtime-owned intent drafting code may define provider interfaces and validation rules, but it must not directly read environment variables, own API keys, or bind the repository to one provider SDK as the only path.
8. When LLM assistance is enabled, the user's raw natural-language input and the minimal current Intent Scope may be sent to the configured provider.
9. Provider context must not include action history, trace records, artifact content, vault contents, filesystem reads, database reads, prior user inputs, preview payloads, result payloads, or event streams unless a later ADR or planning doc changes that boundary.
10. First implementation should be testable with fake providers; default CI and release gates must not require real provider credentials or network calls.
11. Local test provider details may be used during development, but provider endpoints, credentials, model names, and other sensitive configuration must not be committed, logged, snapshotted, or described in PR/release materials unless they are deliberately public placeholders.
12. The first implementation should commit the provider interface, fake provider coverage, strict model-output validation, timeout/fallback behavior, and local-only provider injection path, but should not commit an adapter bound to a private local test endpoint.
13. Developer tooling should enable assisted drafting through an explicit opt-in flag such as `agentctl intent-draft --assist`; the default CLI path remains deterministic.
14. Product TUI assisted drafting should be controlled by product/local configuration, not by an ordinary-user provider setup screen.
15. User-visible fallback copy may say assisted drafting is unavailable and deterministic drafting is being used, but should not reveal private provider endpoints, credentials, model names, or transport details.
16. LLM providers return suggestions only. Consoler-owned orchestration must validate and normalize those suggestions into the existing Intent Drafting public result shape.
17. Provider suggestions may name one scoped agent/command, reviewable `prefilled_args`, and optional explanatory text. They must not carry approval tokens, action IDs, preview/result blocks, raw shell commands, exposed confidence, unscoped commands, unknown schema fields, or multi-action plans.
18. Malformed, unscoped, extra-field, schema-invalid, or multi-action provider output must not be trusted; it should fall back to deterministic behavior or deterministic clarification.
19. Assisted orchestration is deterministic-first: if deterministic Intent Drafting returns a complete candidate, the provider should not be called. The provider is only considered when deterministic drafting needs clarification and assistance is enabled.
20. Provider failures, timeouts, and invalid output should not replace the main Intent Drafting outcome with a provider error. They should return the deterministic result with at most a non-sensitive fallback notice.
21. User-visible notices and machine-readable JSON may use stable reason codes such as assisted unavailable, timed out, or invalid output, but must not include private endpoints, model names, authentication details, provider response bodies, or stack traces.
22. Assisted drafting inputs, prompts, provider responses, provider errors, and intermediate suggestions remain ephemeral. They should not create action history, trace rows, database records, snapshots, or committed logs in the first V3c implementation.
23. V3c should not change `packages/protocol`, `AgentManifest`, protocol versioning, event types, or database schema. Provider prompts should be built from existing `IntentScope` and caller-owned product configuration.
24. V3c should be sliced runtime/CLI first, then TUI. The first slice proves assisted orchestration through `agentctl intent-draft --assist`; the second slice wires product TUI opt-in behavior to the established orchestration path.
25. Local real-provider testing should use environment-variable injection only. The repository should not commit `.env` files, local provider config files, real endpoint examples, real API keys, or provider-specific fixtures.
26. If the first implementation includes real HTTP I/O, it should be a minimal generic JSON-over-HTTP provider adapter defined by consoler, not an adapter bound to a private test interface. Private/local provider contracts should be hidden behind an untracked local shim or proxy.
27. The generic provider contract should be one-shot and suggestion-only. It should accept the current text and Intent Scope and return at most one suggestion or clarification. It should not support chat transcripts, streaming, tool calls, model selection in request bodies, prior history, raw prompt templates, multiple candidates, or user-visible provider confidence in the first implementation.
28. V3c release gates should use fake-provider coverage. Real provider smoke testing remains local-only and optional, and must not record private endpoint or model details in committed evidence.
29. Product TUI assisted drafting should require an explicit local opt-in in addition to provider configuration. A configured provider endpoint alone should not make product TUI send user input to a provider.
30. Product TUI should not show persistent provider status, provider names, endpoints, models, or credentials. Assisted fallback information should appear only as transient non-sensitive notice text after a user submits natural language.

## Consequences

- V3c can improve matching and argument extraction without changing protocol schemas or agent manifests.
- Product users keep the same review/edit/preview/approval path even when LLM assistance is enabled.
- The provider privacy boundary is explicit: opt-in LLM assistance may transmit raw user text and scoped command metadata, but not durable console history or host-product data.
- Real provider details remain local operational configuration; fake providers remain the default validation path.
- Local real-provider testing can prove the integration shape without leaking private endpoint or model details into the repository.
- A generic adapter can validate the CLI/provider I/O shape while keeping private provider contracts outside committed code and docs.
- Future work such as multi-turn chat, persisted intent traces, multi-action workflows, or provider access to history/artifacts requires separate planning.
