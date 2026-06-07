---
doc_type: phase_plan
phase_id: v2a-artifact-retrieval-browser
title: Task execution brief: V2a artifact retrieval and browser
status: completed
canonical: false
read_by_default: false
superseded_by: null
---

# Task execution brief: V2a artifact retrieval and browser

## Objective

Add a generic, agent-owned artifact retrieval path so consoler can inspect artifact blocks produced by actions without taking ownership of agent artifact storage.

## Scope

- In scope: protocol capability discovery, `ArtifactView` schema/types, runtime retrieval gating, lightweight retrieval attempt audit, `agentctl artifact-view`, focused TUI artifact view, Python SDK optional handler support, conformance fake coverage, docs, and local-only real `indbase` adoption.
- Out of scope: artifact content persistence/cache, replay fetching artifact content, preview artifact retrieval, arbitrary user-supplied URI fetch, nested artifact blocks, binary downloads, media streaming, pagination/range requests, global artifact library/search, natural language mapping, default CI dependency on `E:\indbase`, and consoler-owned artifact storage.

## Start here

- V1 frozen surface: `docs/testing/archive/consoler-v1/v1-closeout.md`
- Existing artifact block scope: `docs/planning/archive/consoler-v1/v1d-diff-artifact-renderable-blocks.md`
- Real indbase artifact block adoption: `docs/planning/archive/consoler-v1/v1e-real-indbase-renderable-blocks.md`
- Glossary: `CONTEXT.md`
- Protocol types/schema: `packages/protocol/src/types.ts`, `packages/protocol/src/schemas/manifest.json`, `packages/protocol/src/schemas/renderable-block.json`
- Runtime reads and store: `packages/runtime/src/action-read.ts`, `packages/runtime/src/db/schema.ts`, `packages/runtime/src/db/store.ts`, `packages/runtime/src/runtime.ts`
- JSON-RPC transport: `packages/runtime/src/transport/jsonrpc.ts`, `sdks/python/consoler_agent_sdk/server.py`
- Agentctl CLI: `packages/agentctl/src/main.ts`, `packages/agentctl/src/index.ts`
- TUI blocks and trace flow: `packages/tui/src/blocks.tsx`, `packages/tui/test/history-trace-flow.test.tsx`
- Conformance fake agent: `packages/conformance/fixtures/fake_agent/`
- Real agent repo: `E:\indbase`

## Do not touch

- Do not make consoler parse or dereference agent artifact URI schemes directly.
- Do not add artifact content storage, cache tables, or replay artifact snapshots.
- Do not model artifact retrieval as an Action, approval token, or event-stream result.
- Do not fetch artifacts from rejected events or arbitrary user-entered URIs.
- Do not allow `ArtifactView.blocks` to contain nested artifact blocks.
- Do not add binary download, file save, image/PDF rendering, streaming, pagination, or global artifact search.
- Do not make default CI depend on `E:\indbase`, real vaults, local paths, or real indbase artifact data.
- Do not start natural language intent mapping in V2a.

## Protocol

1. Add optional manifest capability discovery for artifact retrieval.
   - Suggested shape:
     ```ts
     artifact_retrieval?: {
       uri_schemes: string[];
       kinds: string[];
     }
     ```
   - Missing capability means the agent does not support artifact retrieval.
   - The capability gates UI and runtime calls; it is not a security permission model.

2. Add `ArtifactView` as the response shape for artifact retrieval.
   - Suggested shape:
     ```ts
     {
       artifact_uri: string;
       kind: string;
       title?: string;
       metadata?: Record<string, unknown>;
       truncated?: boolean;
       truncation_reason?: string;
       blocks: RenderableBlock[];
     }
     ```
   - `blocks` must reject `type: "artifact"` to prevent recursive browsing in V2a.
   - Agents return bounded, display-ready views. Runtime keeps an internal response-size safety limit.

3. Add agent RPC method `agent.get_artifact_view`.
   - Runtime sends only values from a persisted accepted artifact block:
     ```ts
     {
       artifact_uri: string;
       kind: string;
       block_id: string;
       action_id: string;
       metadata?: Record<string, unknown>;
     }
     ```
   - Method missing, unsupported manifest capability, invalid response, or agent error should surface as artifact retrieval failure, not action failure.

## Runtime

1. Add `fetchArtifactView(action_id, block_id)`.
   - Resolve the action and its accepted result blocks from SQLite.
   - Require `block_id` to identify an accepted `type: "artifact"` block for that action.
   - Reject rejected-event artifacts, preview artifacts, non-artifact blocks, unknown blocks, and arbitrary URI input before spawning an agent.
   - Discover the action's agent manifest and require matching artifact retrieval capability by URI scheme and kind.
   - Call `agent.get_artifact_view`, validate `ArtifactView`, and return it to the caller.

2. Add lightweight artifact retrieval audit.
   - Suggested table: `artifact_retrievals`.
   - Store retrieval id, action id, agent id, block id, artifact URI, kind, status, error code/message, requested time, and completed time.
   - Do not store `ArtifactView.blocks` or retrieved content.
   - Do not write retrieval attempts to the action event stream.

3. Preserve existing read semantics.
   - Replay remains accepted-events-only and never fetches artifact content.
   - Trace may show retrieval attempts, but should not auto-fetch or store artifact content.
   - History status must not change when artifact retrieval succeeds or fails.

## Clients

1. Add `agentctl artifact-view <action_id> <block_id> [--json]`.
   - Default output renders the `ArtifactView` with existing block formatting.
   - `--json` returns the full `ArtifactView` plus any useful retrieval metadata.
   - Errors should distinguish unsupported capability, missing block, invalid response, and agent retrieval failure.

2. Add focused TUI artifact browsing.
   - Artifact blocks in the action result or trace context become openable.
   - Opening a block triggers explicit user-initiated retrieval.
   - Successful retrieval shows a focused detail view for the same action context.
   - Do not add a global artifact library, cross-action artifact list, search, favorites, or download UI.

## Agents

1. Extend the Python SDK with optional artifact retrieval support.
   - Existing adapters without a handler should keep working.
   - The SDK should dispatch `agent.get_artifact_view` only when implemented.
   - SDK tests should cover valid retrieval, unsupported method behavior, and invalid nested artifact response rejection where appropriate.

2. Extend the conformance fake agent.
   - Emit a generic fake artifact block during an executing test command.
   - Declare artifact retrieval capability for a fake URI scheme and kind.
   - Return a bounded `ArtifactView` with markdown/table/json or diff blocks.
   - Keep default conformance checks safe unless command execution is explicitly requested.

3. Add local-only real `indbase` adoption.
   - Implement retrieval for existing `indbase://...` artifact blocks in `E:\indbase`.
   - Keep consoler business-agnostic; indbase interprets its own URI scheme and artifact kinds.
   - Add a disposable local smoke for real artifact retrieval.
   - Do not add default CI requirements for `E:\indbase`.

## Validation

Focused checks:

- `pnpm --filter @consoler/protocol test`
- `pnpm --filter @consoler/runtime test`
- `pnpm --filter @consoler/agentctl test`
- `pnpm --filter @consoler/tui test`
- `pnpm --filter @consoler/conformance test`
- `pnpm test:python-sdk`
- `pnpm test:conformance`

Broad checks:

- `pnpm typecheck`
- `pnpm build`
- `pnpm test`
- `git diff --check`

Local-only real-agent checks:

- Focused `E:\indbase` tests for `agent.get_artifact_view`.
- Disposable real-agent smoke proving `agentctl artifact-view <action_id> <block_id>` can retrieve an `indbase://...` artifact view.

## Done means

- Artifact retrieval is a generic agent capability, not an indbase-specific UI path.
- Runtime only retrieves artifact views for accepted artifact blocks tied to a known `action_id` and `block_id`.
- `ArtifactView` validation rejects nested artifact blocks.
- Retrieval attempts are audited without storing retrieved content.
- Replay remains accepted-events-only and response-free.
- Trace can report retrieval attempts without auto-fetching artifact content.
- `agentctl` and TUI expose explicit user-triggered artifact viewing.
- Conformance fake covers the default CI path.
- Real `indbase` artifact retrieval is proven locally with disposable data only.

## Unknowns

- Exact TUI keybinding can be selected during implementation to fit existing navigation conventions.
- The runtime response-size safety limit should be chosen during implementation based on existing JSON-RPC and TUI test behavior.
