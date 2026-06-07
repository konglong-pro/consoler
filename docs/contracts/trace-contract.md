# Trace Contract

## Purpose

Define durable rules for action history, trace, replay, and interaction persistence.

## Rules

- Replay reconstructs accepted events only.
- Trace may show accepted events, rejected events, approvals, runs, interaction records, and control errors.
- Rejected events remain trace/debug data and must not affect replay.
- History and trace must not spawn agents.
- Trace reads must not re-read vault state, source files, artifact content, or provider state.
- Interaction responses may be persisted for trace/debug only when the relevant runtime policy allows it.
- Redaction protects persisted trace/history data and must not change the live response delivered to the agent.
- Control errors such as cancel timeout are run-level facts; runtime must not synthesize fake agent terminal events.

## Validation

Use focused runtime/agentctl/TUI trace tests and relevant redaction or runtime-control gates.
