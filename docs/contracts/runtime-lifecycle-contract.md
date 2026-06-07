# Runtime Lifecycle Contract

## Purpose

Define the action lifecycle that clients and agents must not bypass.

## Rules

- User intent becomes an explicit action draft before runtime work begins.
- Runtime validates args with JSON Schema before plan, preview, approval, or execution.
- Plan, preview, approval, and execution are distinct lifecycle stages.
- Approval semantics are defined in `docs/contracts/approval-contract.md`.
- Execution output is a structured event stream. Logs are events, not progress state by themselves.
- Durable events must be accepted or rejected by runtime validation before they affect replay/history.
- History, trace, and replay are read-only. They must not spawn agents or re-read vault/source state.
- Execution replay is out of scope unless a future active contract changes it.

## Validation

Run focused runtime tests and the relevant lifecycle gate from `docs/phase-manifest.yaml` when changing lifecycle behavior.
