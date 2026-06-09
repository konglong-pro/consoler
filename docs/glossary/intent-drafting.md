# Intent Drafting Glossary

## Terms

**Natural Language Intent Drafting**: User-input helper that maps natural language to one reviewable explicit action candidate or a clarification result.

**Intent Draft**: One proposed explicit action candidate. It is not a workflow, approved action, or execution.

**Intent Clarification**: Non-terminal result explaining why a reliable complete draft was not produced.

**Intent Mapper**: Consoler-owned mapper that uses command scope, labels, descriptions, and schemas to draft actions.

**Intent Scope**: Neutral runtime input describing allowed agents/commands and product-facing hints.

**Deterministic Intent Mapper**: Offline first mapper; no LLM, network, filesystem, registry, store, or agent calls.

**LLM-assisted Intent Drafting**: Opt-in orchestration that may ask a provider for suggestions, then validates those suggestions back into the same reviewable draft shape.

**LLM Intent Provider**: Optional source of model-backed suggestions. It does not own lifecycle, approval, or final args.

**Provider Message**: Short transient drafting explanation from a provider. It is not evidence, citation, trace, or a machine contract.
