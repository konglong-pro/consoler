# ADR 0007: Indbase NL v2 Intent Drafting

Status: Accepted

Date: 2026-06-06

## Context

The indbase Console Variant now has deterministic, variant-scoped Intent Drafting and a real dogfood friction pass over the Source Trust Loop. The next natural-language phase can improve indbase variant drafting with opt-in assisted intent, but the risky boundary is not command selection alone. It is whether assisted drafting may see session vault context, history, trace, artifact metadata, vault contents, source snippets, filesystem state, or previous results.

Without an explicit decision, NL v2 could drift into chat, `ask`, latest-result inference, direct execution, multi-action workflows, or provider-visible private vault context.

## Decision

Indbase NL v2 is assisted Intent Drafting for the indbase Console Variant, not chat or an indbase core feature.

Accepted decisions:

1. The default `pnpm tui:indbase --` path remains deterministic and offline.
2. Assisted drafting requires explicit local opt-in. A configured provider endpoint alone is not enough to send user input to a provider.
3. The deterministic mapper runs first. Assisted drafting is considered only when deterministic drafting is insufficient.
4. NL v2 stays within the existing ten-command Source Trust Loop action surface.
5. One user request may produce at most one reviewable action draft.
6. A candidate still opens the editable schema form and must proceed through the normal prepare, preview, approval, and execution lifecycle.
7. NL v2 must not directly prepare, preview, approve, execute, persist raw input, or create action history from natural-language submit alone.
8. The provider may receive only the current user text, the scoped indbase Intent Scope, product labels, field hints, and schema hints.
9. If the user explicitly typed a vault path in the current request, that text may be present in the provider input because it is part of the current user text.
10. Session-local Variant Vault Context must not be sent to the provider and must not be inferred by runtime drafting.
11. The TUI may still merge session-local `vault_path` into the editable form after a candidate or partial candidate is selected.
12. The provider must not receive action history, trace records, artifact blocks, artifact metadata, previous results, "latest result" state, vault database content, source snippets, file contents, filesystem reads, cwd, or environment-derived vault discovery.
13. Object IDs must not be inferred from history, trace, artifact state, "latest result", or previous search results. Requests such as "open the previous document" require clarification or an explicit ID.
14. Tag and category fields may be prefilled only from explicit low-ambiguity syntax in the current user text, such as `tag:<ref>` or `category:<ref>`. Vague semantic text must not become governed filters.
15. Provider output remains suggestion-only. Consoler-owned orchestration validates it against the scoped command set and schema before it becomes a public Intent Draft result.
16. Provider output must not include approval tokens, action IDs, preview/result blocks, raw shell commands, unknown schema fields, multiple candidates, workflows, or provider confidence.
17. Provider explanation text may be used only as a short transient notice. It is not trusted evidence, an audit record, a search explanation, a citation, or a machine contract.
18. Provider errors, timeouts, and invalid output must fall back to deterministic drafting and may expose only non-sensitive notice codes such as `assisted_unavailable`, `assisted_timed_out`, or `assisted_invalid_output`.
19. Provider endpoints, model names, credentials, prompts, raw responses, stack traces, HTTP bodies, and authentication details must not appear in user-visible copy, committed fixtures, logs, PR notes, or release evidence.
20. Multi-action requests may not create multiple action drafts or queued workflows. If a request mentions a follow-up, the first NL v2 slice may at most show a non-persistent hint after selecting the primary action.
21. NL v2 should avoid changing the existing public `IntentDraftResult` shape. Any future optional result-field extension requires a separate plan and compatibility review.
22. NL v2 must not change consoler protocol schemas, runtime store schema, replay semantics, transport, Python SDK behavior, indbase adapter commands, indbase core, migrations, Web UI, vault browser, review/category/tag mutation, retrieval packages, `ask`, embeddings, or generated answers.

## Consequences

Indbase NL v2 can improve the product variant's natural-language success rate without making the normal console path provider-dependent. The provider privacy boundary stays narrow: it can help interpret the current request against the scoped action surface, but it cannot use vault state, history, traces, artifacts, source content, or previous results.

The UX remains intentionally less "smart" for references like "the previous document" or vague governed filters. Those cases require explicit IDs, explicit filter syntax, or the existing artifact/history/trace surfaces.

Future work such as multi-turn chat, multi-action workflow drafting, latest-result inference, persisted intent traces, provider access to source snippets, vault browsing, generated answers, or `ask` requires separate planning and likely a new ADR.
