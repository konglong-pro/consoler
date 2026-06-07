---
doc_type: phase_plan
phase_id: v2a-artifact-retrieval-cli-loop
title: Task execution brief: V2a artifact retrieval CLI loop
status: completed
canonical: false
read_by_default: false
superseded_by: null
---

# Task execution brief: V2a artifact retrieval CLI loop

## Objective

Implement the generic non-UI artifact retrieval loop: runtime resolves accepted artifact blocks by `action_id` and `block_id`, asks the artifact-owning agent for an `ArtifactView`, records a lightweight attempt audit, and exposes the flow through `agentctl artifact-view`.

## Scope

- In scope: `packages/runtime`, `packages/agentctl`, `sdks/python`, `packages/conformance`, conformance fake agent, focused tests, and minimal docs/help updates for the new CLI command.
- Out of scope: TUI artifact browser, real `E:\indbase` adoption, natural language mapping, artifact content persistence/cache, replay fetching, preview artifact retrieval, arbitrary URI fetch, downloads/media streaming, pagination, global artifact library/search, and protocol version changes.

## Start here

- Read: `docs/planning/archive/consoler-v2/v2a-artifact-retrieval-browser.md`
- Read: `docs/planning/archive/consoler-v2/v2a-artifact-retrieval-protocol-contract.md`
- Read: `docs/adr/0002-agent-owned-artifact-retrieval.md`
- Runtime: `packages/runtime/src/runtime.ts`, `packages/runtime/src/db/schema.ts`, `packages/runtime/src/db/store.ts`, `packages/runtime/src/action-read.ts`
- Agentctl: `packages/agentctl/src/main.ts`, `packages/agentctl/src/index.ts`
- SDK/fake agent: `sdks/python/consoler_agent_sdk/server.py`, `sdks/python/consoler_agent_sdk/adapter.py`, `packages/conformance/fixtures/fake_agent/`
- Conformance harness: `packages/conformance/src/run.ts`

## Do not touch

- Do not edit `packages/tui` or `E:\indbase`.
- Do not add artifact content storage, cache tables, event-stream records, approval tokens, replay snapshots, or TUI surfaces.
- Do not let users fetch arbitrary URI strings; runtime must resolve from an accepted artifact block for the action.
- Do not fetch artifacts from rejected events or preview payloads.
- Do not make consoler parse or dereference agent artifact URI schemes beyond extracting the scheme for capability gating.
- Do not change `protocol_version` or the first-step `ArtifactView` protocol contract unless a failing test proves the contract is wrong.
- Do not touch `package.json` unless a real script change is required; it may show modified from line-ending metadata with no content diff.

## Steps

1. Add runtime result and audit types.
   - Add a `FetchArtifactViewResult` success/failure union and `ArtifactRetrievalAttempt` summary type.
   - Add `artifact_retrievals` table and idempotent migration path.
   - Store only attempt metadata: retrieval id, action id, agent id, block id, artifact URI, kind, status, error code/message, requested time, completed time.
   - Do not store `ArtifactView.blocks` or retrieved content.

2. Implement `ConsolerRuntime.fetchArtifactView(actionId, blockId)`.
   - Resolve the action and latest accepted result blocks from SQLite.
   - Require `block_id` to identify a `type: "artifact"` block from accepted `action.succeeded` result blocks.
   - Reject action missing, block missing, non-artifact block, missing manifest, unsupported scheme/kind, and missing registry entry before calling the agent when applicable.
   - Call `agent.get_artifact_view` with persisted block values only: `artifact_uri`, `kind`, `block_id`, `action_id`, and `metadata?`.
   - Validate the response with `validateArtifactView`.
   - Enforce a 1 MB JSON response-size safety limit before returning success.

3. Preserve read semantics.
   - Keep replay accepted-events-only and artifact-content-free.
   - Extend trace data with retrieval attempt summaries only; trace must not auto-fetch content.
   - Keep action history status unchanged when retrieval succeeds or fails.

4. Extend the Python SDK.
   - Add default `AgentAdapter.get_artifact_view(...)` that raises `AgentError("artifact_retrieval.unsupported", ...)`.
   - Dispatch `agent.get_artifact_view` in the JSON-RPC server.
   - Add SDK tests for unsupported default behavior and successful adapter-provided artifact view.

5. Extend conformance fake and harness.
   - Add `artifact_retrieval` capability to the fake manifest with `uri_schemes: ["fake"]` and `kinds: ["conformance.fixture"]`.
   - Change fake artifact blocks to use `fake://artifacts/conformance-fixture` and `kind: "conformance.fixture"`.
   - Implement fake `get_artifact_view` returning a bounded `ArtifactView` with non-artifact blocks.
   - Add harness checks after approved execution that fetch the fake artifact view and verify audit/trace/replay boundaries.

6. Add `agentctl artifact-view <action_id> <block_id> [--json]`.
   - Default output should show action id, block id, artifact URI, kind, retrieval status, and summarized returned blocks.
   - `--json` should print the runtime result shape.
   - Failures should print the runtime error message to stderr and exit nonzero.
   - Update `formatAgentctlHelp()` and focused agentctl tests.

## Validation

Focused checks:

- `pnpm --filter @consoler/runtime test`
- `pnpm --filter @consoler/agentctl test`
- `pnpm --filter @consoler/conformance test`
- `pnpm test:python-sdk`
- `pnpm test:conformance`

Broad checks:

- `pnpm typecheck`
- `pnpm build`
- `pnpm test`
- `git diff --check`

Optional smoke after `pnpm build`:

- Run an approved conformance fake command that emits an artifact block, then run `pnpm agentctl -- artifact-view <action_id> <block_id> --json` against the same temp `CONSOLER_ROOT`.

## Done means

- `agentctl artifact-view` can retrieve a fake-agent `ArtifactView` for an accepted artifact block.
- Runtime rejects arbitrary or unsupported artifact fetches before agent calls.
- Retrieval attempts are audited without storing content.
- Trace shows retrieval attempts but replay remains artifact-content-free.
- Python SDK adapters without retrieval support still work and return a structured unsupported error when asked.
- Conformance fake covers the default CI path without real `E:\indbase`.

## Unknowns

- Exact human text formatting for `agentctl artifact-view` can follow existing block summary style in `packages/runtime/src/format-block.ts`.
- The 1 MB response-size limit is an internal guard for this phase; future pagination or download support needs a separate plan.
