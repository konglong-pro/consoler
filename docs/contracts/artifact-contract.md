# Artifact Contract

## Purpose

Define durable artifact block and artifact retrieval boundaries.

## Applies To

- `RenderableBlock` values with `type: "artifact"`
- `ArtifactView`
- Artifact retrieval attempts
- TUI artifact view panel
- `agentctl artifact-view`

## Rules

- Artifact blocks are references carried by accepted action events.
- Consoler must not parse or dereference agent-owned artifact URI schemes directly.
- Retrieval is user-triggered and addressed by accepted `action_id` plus `block_id`, not arbitrary URI input.
- Retrieval is not an Action and must not create lifecycle events.
- Retrieval may persist attempt metadata, but not retrieved `ArtifactView` content.
- Replay must not fetch artifacts.
- `ArtifactView.blocks` must not contain nested artifact blocks.
- Agent-owned logical URIs such as `indbase://...` are not filesystem paths and do not grant consoler ownership of storage.

## Non-Goals

- Downloads.
- Media streaming.
- Global artifact search.
- Artifact content cache.
- Arbitrary URI fetch.
- Natural-language artifact mapping.

## Validation

Run protocol, runtime, agentctl, TUI, conformance, and artifact smoke checks relevant to the touched layer.
