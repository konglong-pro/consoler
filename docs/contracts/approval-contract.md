# Approval Contract

## Purpose

Define durable approval boundaries for previews, execution, and context drift.

## Rules

- Approval is an explicit runtime lifecycle fact, not an agent-side shortcut.
- Preview approval and execution approval are separate decisions.
- Side-effecting execution requires execution approval even when preview was already approved.
- Approval binds normalized args, plan hash, context snapshot, declared side effects, and preview hash when present.
- Context drift invalidates approval. Clients must send the user back through the relevant lifecycle stage.
- Agents must not infer approval from UI state, command names, environment variables, or previous runs.
- Approval records are durable trace/history evidence, but they are not replay events.
- Approval tokens are consoler runtime controls. They are not OS sandboxing, auth, or permission isolation.

## Non-Goals

- Payment authorization.
- User account authentication.
- Host filesystem sandboxing.
- Long-lived approval reuse across unrelated actions.
- Agent-owned approval persistence.

## Validation

Run focused runtime approval tests plus the relevant phase gate from `docs/phase-manifest.yaml` when changing approval behavior.
