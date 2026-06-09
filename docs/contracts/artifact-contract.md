# Artifact Contract

## Purpose

Define durable artifact block and artifact retrieval boundaries.

## Applies To

- `RenderableBlock` values with `type: "artifact"`
- `ArtifactView`
- Operation Trace artifact references
- Artifact retrieval attempts
- TUI artifact view panel
- `agentctl artifact-view`

## Terms

- `artifact_ref`: Opaque reference to an artifact. Current artifact blocks carry it as `ArtifactBlock.content.uri`.
- `artifact_view`: Retrieved `ArtifactView` returned by the artifact-owning agent.
- `artifact_evidence`: Agent/provider-owned evidence metadata or refs associated with an artifact or operation.
- `artifact_trust_state`: Agent/provider-emitted trust classification for an artifact reference.

## Rules

- Artifact blocks are references carried by accepted action events.
- Consoler must not parse or dereference agent-owned artifact URI schemes directly.
- Retrieval is user-triggered and addressed by accepted `action_id` plus `block_id`, not arbitrary URI input.
- Retrieval is not an Action and must not create lifecycle events.
- Retrieval may persist attempt metadata, but not retrieved `ArtifactView` content.
- Replay must not fetch artifacts.
- `ArtifactView.blocks` must not contain nested artifact blocks.
- Agent-owned logical URIs such as `indbase://...` are not filesystem paths and do not grant consoler ownership of storage.
- V5a must not rename existing `ArtifactBlock.content.uri`, `ArtifactBlock.content.kind`, or `ArtifactView` wire fields.
- Operation Trace `artifact_refs` are display-only text and must not become arbitrary artifact retrieval inputs.
- `artifact_trust_state` is not a protocol enum in V5a.
- Artifact evidence and trust metadata are agent-owned; consoler may record and display refs but must not parse provider storage semantics.

## Non-Goals

- Downloads.
- Media streaming.
- Global artifact search.
- Artifact content cache.
- Arbitrary URI fetch.
- Natural-language artifact mapping.
- Global artifact trust search.

## Validation

Run protocol, runtime, agentctl, TUI, conformance, and artifact smoke checks relevant to the touched layer.
