---
doc_type: phase_plan
phase_id: v5a-operation-trace-artifact-vocabulary
title: Operation Trace Panel and Artifact Vocabulary
status: active
owner: consoler
canonical: true
read_by_default: true
supersedes: []
superseded_by: null
related_contracts:
  - docs/contracts/trace-contract.md
  - docs/contracts/artifact-contract.md
  - docs/contracts/console-variant-contract.md
related_adrs:
  - docs/adr/0008-operation-trace-payload.md
release_gate: pnpm test:v5a-operation-trace-gate
---

# V5a Operation Trace Panel and Artifact Vocabulary

## Goal

Add a first-version Operation Trace surface in consoler and align artifact vocabulary across consoler, indbase, and capability providers without making consoler read agent domain state or provider-owned storage.

The implementation target is a read-only trace panel and protocol/runtime support for an agent-emitted `operation_trace` payload. This phase also standardizes language around `artifact_ref`, `artifact_view`, `artifact_evidence`, and `artifact_trust_state` while preserving existing protocol wire compatibility.

## Background

Local inspection and planning compared:

- `consoler`: action events, trace reads, artifact blocks, artifact views, Console Variant boundaries, agentctl, TUI, conformance, and Python SDK.
- `indbase`: source revision, output artifact, provider run, evidence package, trust policy, and provider-run artifact view concepts.
- `swallow`: capability job artifacts and provider-owned artifact references.
- `transition`: transformation job artifacts and provider-owned artifact references.

The agreed boundary is that agents emit structured operation summaries during execution. Consoler records and displays those summaries from accepted events. Trace reads must not infer them later by re-reading indbase, providers, artifact content, vault state, source files, or runtime roots.

## Scope

Allowed:

- Add `OperationTrace` protocol types and JSON Schema.
- Allow accepted action event payloads to include `payload.operation_trace`.
- Add defensive runtime extraction into `ActionTrace.operation_traces`.
- Add a read-only Operation Trace Panel in TUI trace surfaces.
- Add Console Variant label maps for operation trace keys.
- Add indbase variant labels only; no indbase business logic.
- Add agentctl trace formatting and JSON surface coverage.
- Add Python SDK helper support for constructing operation traces.
- Allow Python SDK `execute()` success results to return `operation_trace` for terminal event payload emission.
- Add conformance/fake-agent coverage for optional operation trace behavior.
- Add focused tests and a v5a release gate script.
- Update durable contracts, ADRs, glossaries, and active phase docs.

Not allowed:

- Editing `E:\indbase` implementation files.
- Adding a runtime DB table, migration, or global operation index.
- Making trace/history spawn agents.
- Reading provider state, vault state, source files, artifact content, or agent storage at trace-read time.
- Parsing or dereferencing provider-owned or agent-owned refs in consoler.
- Adding clickable/open behavior for `artifact_refs` beyond existing artifact retrieval by `action_id + block_id`.
- Renaming existing artifact wire fields such as `ArtifactBlock.content.uri`.
- Adding Web UI, marketplace behavior, source browser, vault browser, `ask`, generated answers, or multi-action workflows.
- Changing real provider/indbase behavior in this repo phase.

## Operation Trace Shape

The protocol type is generic and agent-emitted:

```json
{
  "operation_id": "...",
  "action_id": "...",
  "agent_id": "indbase",
  "command": "indbase.ingest_file",
  "status": "succeeded",
  "domain_refs": {
    "task_id": "...",
    "ingest_run_id": "...",
    "doc_id": "...",
    "revision_id": "..."
  },
  "capability_refs": [
    {
      "provider": "swallow",
      "capability_id": "swallow.ingest",
      "provider_run_id": "...",
      "status": "succeeded",
      "job_id": "...",
      "profile": "local",
      "operation_id": "...",
      "manifest_ref": "...",
      "trace_ref": "...",
      "artifact_refs": ["..."]
    }
  ],
  "metadata": {}
}
```

Required operation fields:

- `operation_id`
- `action_id`
- `agent_id`
- `command`

Optional operation fields:

- `status`
- `domain_refs`
- `capability_refs`
- `metadata`

Required capability reference fields:

- `provider`
- `capability_id`
- `provider_run_id`
- `status`

Optional capability reference fields:

- `job_id`
- `profile`
- `operation_id`
- `manifest_ref`
- `trace_ref`
- `artifact_refs`

`domain_refs` remains `Record<string, string>`. The indbase variant may label common keys such as `task_id`, `ingest_run_id`, `output_run_id`, `doc_id`, `revision_id`, `review_id`, and `error_id`, but generic protocol code must not require indbase vocabulary.

## Artifact Vocabulary

Use these terms consistently:

- `artifact_ref`: opaque reference to an artifact. In current protocol artifact blocks carry this as `ArtifactBlock.content.uri`.
- `artifact_view`: existing retrieved `ArtifactView`.
- `artifact_evidence`: agent/provider-owned evidence metadata or references associated with an artifact or operation.
- `artifact_trust_state`: agent/provider-emitted trust classification. Do not make this a protocol enum in v5a.

Compatibility rule:

- Do not rename `ArtifactBlock.content.uri`, `ArtifactBlock.content.kind`, or `ArtifactView` wire fields in v5a.
- Operation trace and artifact metadata may use the new vocabulary as documentation and optional metadata only.

## Accepted Design Decisions

1. Operation Trace is a first-class protocol type, not a renderable block.
2. The carrier is `payload.operation_trace` on accepted action events.
3. Runtime derives operation traces from accepted events and does not persist a separate DB table.
4. Trace reads do not re-read agent, provider, domain, vault, source, or artifact state.
5. `domain_refs` is generic `Record<string, string>`.
6. Capability refs require `provider`, `capability_id`, `provider_run_id`, and `status`.
7. `manifest_ref` and `trace_ref` are opaque refs; `job_id` is diagnostic.
8. Artifact vocabulary changes are semantic/docs-first; existing wire field names stay stable.
9. The Operation Trace Panel is read-only text.
10. `artifact_refs` are displayed as plain text only.
11. Operation traces may appear on any accepted event.
12. For the same `operation_id`, the last accepted trace is the current summary.
13. Runtime does not deep-merge partial traces.
14. If an operation trace lacks `operation_id`, it is ignored for `ActionTrace.operation_traces`.
15. JSON Schema validates structure; runtime extraction is defensive.
16. Runtime extraction ignores traces whose `action_id`, `agent_id`, or `command` does not match the outer event.
17. Agentctl trace output includes operation traces.
18. Agents that do not emit operation traces remain conformant.
19. TUI labels are generic by default; Console Variants may provide label maps.
20. Indbase labels are variant config only, not generic runtime logic.
21. Python SDK gets both a thin helper and terminal success result support.
22. Real `E:\indbase` adoption is out of this consoler phase.

## Implementation Plan

1. Documentation and lifecycle
   - Keep this phase plan as the active canonical spec.
   - Update trace, artifact, and console variant contracts.
   - Add ADR 0008 for the `payload.operation_trace` decision.
   - Keep `AGENTS.md` compact and route implementation agents here.

2. Protocol
   - Add `OperationTrace` and `OperationTraceCapabilityRef` TypeScript types.
   - Add an `operation-trace` JSON Schema.
   - Allow `ActionEvent.payload.operation_trace` while preserving additional payload fields.
   - Add protocol tests for valid and malformed operation traces.

3. Runtime
   - Add `operation_traces` to action trace read results.
   - Extract only from accepted events.
   - Replace by `operation_id`; keep last occurrence order.
   - Ignore malformed or identity-mismatched traces defensively.
   - Add focused trace read tests.

4. TUI
   - Add an Operation Trace Panel or trace-section component.
   - Show operation id, action id, agent id, command, status, domain refs, capability refs, manifest refs, trace refs, and artifact refs as text.
   - Add variant label-map support without agent-specific fetch logic.
   - Add indbase label map for common domain/capability keys.
   - Add focused TUI tests.

5. Agentctl
   - Include operation traces in trace formatting.
   - Preserve JSON output shape through the runtime `ActionTrace` object.
   - Add focused CLI formatting tests.

6. Python SDK
   - Add a helper to build `operation_trace` payloads.
   - Allow successful `execute()` results to include `operation_trace`.
   - Ensure the SDK emits that trace on the terminal `action.succeeded` payload.
   - Add SDK tests.

7. Conformance
   - Add fake-agent fixture coverage for valid optional operation trace emission.
   - Verify agents without operation traces remain conformant.
   - Cover malformed operation trace rejection through protocol/runtime tests, not by making emission mandatory.

8. Gate
   - Add the v5a release gate script.
   - Add `pnpm test:v5a-operation-trace-gate`.
   - Keep local real-indbase smoke optional and out of the default v5a gate.

## Acceptance Criteria

- `payload.operation_trace` is schema-validatable.
- Accepted action events can carry operation traces without changing block rendering.
- Runtime trace reads expose `operation_traces` derived only from accepted events.
- Identity-mismatched operation traces do not appear in `ActionTrace.operation_traces`.
- Multiple traces with the same `operation_id` collapse to the last accepted summary.
- TUI trace surfaces show operation traces read-only.
- Indbase Console Variant supplies labels without adding indbase business logic.
- Agentctl trace output includes operation traces.
- Python SDK helper and terminal success-result emission are covered by tests.
- Conformance treats operation trace as optional.
- Existing artifact retrieval still uses accepted `action_id + block_id`.
- Existing artifact block and artifact view wire fields are unchanged.

## Tests / Gates

Focused checks expected during implementation:

```powershell
pnpm --filter @consoler/protocol test
pnpm --filter @consoler/runtime test
pnpm --filter @consoler/agentctl test
pnpm --filter @consoler/conformance test
pnpm --filter @consoler/tui test
pnpm test:python-sdk
pnpm typecheck
pnpm docs:check
git diff --check
```

Phase gate to add during implementation:

```powershell
pnpm test:v5a-operation-trace-gate
```

The v5a gate should aggregate:

```powershell
pnpm --filter @consoler/protocol test
pnpm --filter @consoler/runtime test
pnpm --filter @consoler/agentctl test
pnpm --filter @consoler/conformance test
pnpm --filter @consoler/tui test
pnpm test:python-sdk
pnpm typecheck
pnpm docs:check
git diff --check
```

Do not include `pnpm build`, broad `pnpm test`, or `pnpm test:real-indbase-smoke` in the default phase gate unless a later phase explicitly changes that.

## Closeout Requirements

- Update `docs/project-status.md`.
- Archive this phase plan with `status: completed`, `canonical: false`, and `read_by_default: false`.
- Add testing evidence under `docs/testing/archive/` or a closeout summary if the gate is created and run.
- Record any deferred real indbase adoption as a separate phase or local smoke note.

## Implementation Closeout

Local implementation is complete and the V5a gate passed on 2026-06-09. Testing evidence is recorded at `docs/testing/archive/consoler-v5/v5a-operation-trace-artifact-vocabulary.md`.

This active phase plan remains the current implementation spec until a successor phase is approved. Do not archive it without also updating `docs/phase-manifest.yaml` and `docs/active/current.md` to point at the next active phase.
