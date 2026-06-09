# Trace Contract

## Purpose

Define durable rules for action history, trace, replay, and interaction persistence.

## Terms

- `OperationTrace`: Agent-emitted structured summary that links one consoler action to agent-owned domain references and capability provider references.
- `domain_refs`: Opaque string map of agent-owned domain identifiers.
- `capability_refs`: Opaque provider/capability references associated with the operation.

## Rules

- Replay reconstructs accepted events only.
- Trace may show accepted events, rejected events, approvals, runs, interaction records, and control errors.
- Rejected events remain trace/debug data and must not affect replay.
- History and trace must not spawn agents.
- Trace reads must not re-read vault state, source files, artifact content, or provider state.
- Operation Trace data must come from accepted action event payloads, not trace-time inference.
- `payload.operation_trace` is optional. Agents that do not emit it remain valid.
- Runtime may expose `ActionTrace.operation_traces` as a derived trace-read field.
- Runtime must not persist Operation Trace in a separate DB table in V5a.
- For a repeated `operation_id`, trace reads use the last accepted operation trace as the current summary.
- Runtime must not deep-merge partial Operation Trace payloads.
- Runtime must ignore an Operation Trace when its `action_id`, `agent_id`, or `command` does not match the outer event.
- Operation Trace UI is read-only and must not open, fetch, parse, or dereference refs by itself.
- Interaction responses may be persisted for trace/debug only when the relevant runtime policy allows it.
- Redaction protects persisted trace/history data and must not change the live response delivered to the agent.
- Control errors such as cancel timeout are run-level facts; runtime must not synthesize fake agent terminal events.

## Machine-Facing Shape

Action events may include:

```json
{
  "payload": {
    "operation_trace": {
      "operation_id": "...",
      "action_id": "...",
      "agent_id": "...",
      "command": "...",
      "status": "...",
      "domain_refs": {},
      "capability_refs": [],
      "metadata": {}
    }
  }
}
```

Schema validates structure. Runtime extraction applies identity checks and defensive filtering.

## Validation

Use focused runtime/agentctl/TUI trace tests and relevant redaction or runtime-control gates.
