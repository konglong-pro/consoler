# Search Contract

## Purpose

Define consoler-side rules for search-like actions exposed by agents.

## Rules

- Search semantics and indexes belong to the owning agent or host product.
- Consoler may collect explicit form args, validate schema shape, and display results.
- Consoler must not query host-product indexes directly.
- Default search behavior must not silently include generated answers, retrieved artifact content, traces, history, or provider outputs.
- Governed filters such as tag/category values must be explicit user inputs or agent-owned results; vague semantic text must not become governed filters unless an active phase defines that mapping.
- Intent Drafting may prefill search forms only within the active intent contract and variant scope.

## Non-Goals

- Semantic search.
- Embeddings.
- Generated answers.
- Cross-agent search federation.
- Host-product tag/category lifecycle management.
