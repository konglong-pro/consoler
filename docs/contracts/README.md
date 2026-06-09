# Contracts

Durable contracts hold rules that outlive one phase. Phase plans may link here, but they should not restate these rules unless a phase-specific implication is needed.

## Contract Map

| Contract | Owns |
| --- | --- |
| `agent-manifest.md` | Manifest shape, capability declaration, and agent identity boundaries. |
| `approval-contract.md` | Preview approval, execution approval, context drift, and approval evidence. |
| `artifact-contract.md` | Artifact blocks, `ArtifactView`, retrieval attempts, and storage ownership. |
| `console-variant-contract.md` | Product variant boundaries and product-specific UI scope. |
| `consoler-agent-boundary.md` | Generic consoler/agent responsibility split. |
| `intent-draft-contract.md` | Deterministic and assisted Intent Drafting boundaries. |
| `protocol-contract.md` | Wire protocol and schema compatibility rules. |
| `revision-contract.md` | Source/revision/candidate trust boundaries for indbase-facing work. |
| `runtime-lifecycle-contract.md` | Action lifecycle stages and durable runtime ownership. |
| `search-contract.md` | Search index trust boundaries for source revisions and artifacts. |
| `trace-contract.md` | History, trace, replay, interaction persistence, and redaction boundaries. |

## Placement Rules

- Put long-lived invariants here.
- Put why-decisions in `docs/adr/`.
- Put current phase tasks in `docs/planning/active/`.
- Put completed phase evidence in `docs/testing/archive/` or `docs/planning/archive/closeout-summaries.md`.
- Do not use archived phase plans as current contracts.
