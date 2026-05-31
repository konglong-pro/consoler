# ADR 0003: Natural Language Intent Drafting

Status: Accepted

Date: 2026-05-26

## Context

V2 artifact retrieval and browsing are closed. The next phase adds a natural language entry path for users to create actions more quickly.

The risk is that natural language input can blur existing consoler boundaries: it can look like a chat agent, a direct execution path, a cross-agent search surface, or a new persisted object model. `consoler` must remain a generic runtime and TUI foundation that can be configured into product-specific console variants, such as an `indbase`-adapted consoler, without becoming a universal agent marketplace UI.

## Decision

The first natural language phase is Intent Drafting, not direct execution.

Accepted decisions:

1. Natural language maps to one candidate explicit action: `agent_id`, command, and args.
2. A candidate must still flow through explicit user confirmation, schema validation, preview, approval, and execution.
3. Natural language must never bypass `ActionDraft`, validation, plan, preview, approval, or execute.
4. The first version supports one action only. It does not create workflows, DAGs, or automatic multi-step sequences.
5. The mapper is owned by consoler and uses agent manifests, command descriptions, and JSON Schemas. Agents do not receive natural language input in the first version.
6. The first mapper is deterministic and schema-aware. It does not call an LLM, require model credentials, or depend on prompt policy.
7. Public outcomes are only `candidate` and `needs_clarification`. The first version does not expose ranked alternative candidates.
8. Numeric confidence is internal only. Public results expose outcome and reason codes or explanatory text, not model-like probability values.
9. Raw natural language input and Intent Drafts are ephemeral helper state in the first version. They are not persisted to the action store or history.
10. `needs_clarification` may include deterministic explanatory text, but it routes to the existing schema form instead of starting a multi-turn natural language conversation.
11. Natural language is an entry path in the current Console Variant, not a separate free-form chat page.
12. Intent mapping runs within the configured Console Variant's agent scope. Product TUI surfaces should not present arbitrary cross-agent search unless that is the explicit product goal.
13. Developer tooling may expose explicit agent filters, such as `agentctl intent-draft --agent <id>`, for debugging.
14. The first version does not add natural-language-only fields such as intent aliases or examples to `AgentManifest` or protocol schemas. Improve generic command descriptions, schema descriptions, or variant configuration instead.
15. The runtime mapper should consume a neutral intent scope or catalog input, not TUI-specific `ConsoleVariantConfig`. TUI variants and developer tooling translate their configured command scope into that neutral input before calling the mapper.
16. Intent scope may include product-facing labels and descriptions as matching hints. These hints are not protocol fields, and a successful candidate still outputs protocol-level `agent_id`, command, and args.
17. A candidate seeds the existing schema form with extracted args. The user can review and edit those args before the action enters prepare, preview, approval, or execution.
18. `agentctl intent-draft` should default to human-readable debug output and expose stable machine-readable output through `--json`.
19. Stable intent-draft JSON should name extracted form seed values `prefilled_args`, not `args`, to avoid implying they are final approved action arguments.
20. First-version `needs_clarification` reason codes are limited to `no_match`, `ambiguous_command`, `missing_required_args`, `ambiguous_args`, and `unsupported_schema`.
21. First-version schema support is limited to top-level object schemas with primitive fields, required fields, and light enum/default handling. More complex schema constructs should return `unsupported_schema` and fall back to the schema form.
22. One natural-language input must not expand into multiple files, multiple targets, or multiple actions in the first version. Multi-target input should return `needs_clarification`, usually with `ambiguous_args`.
23. Basic Chinese natural-language input is in scope only through deterministic keyword, substring, and path extraction from Intent Scope labels or descriptions. Translation, pinyin matching, language-model tokenization, and LLM semantic understanding are out of scope for the first version.
24. Localized matching hints should be supplied by Console Variant product configuration when building an Intent Scope, not by `AgentManifest` or protocol schemas.
25. Console Variant configuration may include narrow `intentHints` as short action-level or field-level keyword arrays. These hints are not prompt examples, training samples, or protocol fields.
26. Path assignment must be conservative when several schema fields are path-like. The mapper may prefill a single path into the path field indicated by the matched intent, but it must not infer missing paths from cwd, history, or prior actions; unclear multi-path input returns `ambiguous_args`.
27. Intent mapping must not read the filesystem, check path existence, classify paths as files or directories, or validate vault state. Environment reads remain part of the existing lifecycle after user confirmation.
28. Product variant home screens may include a persistent single-shot natural-language input, but it is not a chat transcript. Each submission routes immediately to a candidate form or clarification/form path.
29. The explicit product action list remains in the first TUI version. Natural language is an acceleration path, not the only way to start an action.
30. Implementation should be one larger phase split into independently verifiable slices: runtime deterministic mapper, `agentctl intent-draft`, then TUI product variant entry and form prefill.
31. The runtime API should be a pure mapper named `draftIntent({ text, scope })`. The caller supplies the neutral `IntentScope`; the mapper does not read the registry, import Variant config, read the filesystem, or spawn agents.
32. First-version implementation should live in `packages/runtime` as isolated intent-draft modules, not in a new package.

## Consequences

- Implementation can start with a runtime intent drafting API, then `agentctl intent-draft`, then a TUI entry path.
- The first version can be tested deterministically without model providers, secrets, network calls, or prompt snapshots.
- The protocol remains stable for first-version Intent Drafting; agents do not need manifest schema changes to participate.
- A user-confirmed candidate becomes a normal action and uses existing lifecycle storage; natural language text and the ephemeral Intent Draft do not add new persistence or retention policy.
- Product variants can feel fully adapted to one host product, such as indbase, while the underlying consoler code remains reusable for other variants.
- Runtime intent drafting remains reusable outside the Ink TUI because it does not depend on product-specific variant configuration types.
- Future work may add LLM-backed mapping, persisted intent traces, multi-turn clarification, or multi-action workflows, but those require separate planning because they change privacy, lifecycle, and product semantics.
