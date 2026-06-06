# ADR 0002: Agent-owned Artifact Retrieval

V2a artifact retrieval is owned by the artifact-producing agent: consoler may request an `ArtifactView` for an accepted artifact block, but it must not parse agent URI schemes, read agent storage directly, cache artifact content, or model retrieval as an Action. This preserves consoler as a generic Agent Operations Console while allowing artifact inspection through the same out-of-process agent boundary used for execution.

## Considered Options

- Direct URI handling in consoler: rejected because it would make consoler business-aware and couple the generic TUI/runtime to agent-specific storage semantics.
- Consoler-owned artifact storage or caching: rejected for V2a because it introduces invalidation, permissions, retention, and content-size policy before retrieval has been proven.
- Retrieval as an Action: rejected because opening an existing artifact is a user-triggered read operation, not a plan/preview/approval/execute lifecycle event.

## Consequences

- Artifact retrieval requires an agent capability and an explicit user trigger.
- Retrieval is gated by `action_id` and `block_id` for an accepted artifact block, not by arbitrary user-entered URI.
- Replay remains accepted-events-only and does not fetch or store artifact content.
