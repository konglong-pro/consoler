# ADR 0008: Operation Trace Payload

Status: Accepted

Date: 2026-06-09

## Context

Consoler has action history, trace, replay, artifact retrieval, agentctl, TUI trace surfaces, Python SDK support, and product variants. Indbase and its capability providers now expose richer operation, provider-run, artifact, evidence, and trust concepts. The immediate need is to show a coherent operation summary in consoler without making consoler depend on indbase, swallow, transition, provider storage, or artifact content.

The risky choice is where Operation Trace lives. If it is modeled as a renderable block, artifact view, runtime DB table, or trace-time inference, consoler could drift into parsing agent-specific refs or re-reading domain/provider state. That would break the existing boundary that history and trace are read-only interpretations of persisted events.

## Decision

Operation Trace is an agent-emitted structured payload on accepted action events.

The carrier is `payload.operation_trace`. Runtime derives `ActionTrace.operation_traces` from accepted events only. It does not create a separate DB table or read agent/provider/domain/artifact state during trace reads.

The protocol defines a first-class `OperationTrace` type with required `operation_id`, `action_id`, `agent_id`, and `command`. It may include generic `domain_refs`, `capability_refs`, `status`, and `metadata`. Capability refs require `provider`, `capability_id`, `provider_run_id`, and `status`; provider job ids and refs are diagnostic opaque strings.

Runtime extraction must ignore an embedded operation trace when its `action_id`, `agent_id`, or `command` does not match the outer event. Schema validation remains structural; extraction is defensive.

Artifact vocabulary is aligned as terminology without renaming existing wire fields. In v5a, `ArtifactBlock.content.uri` is treated as the current wire carrier for an `artifact_ref`; `ArtifactView` remains the retrieval result; `artifact_evidence` and `artifact_trust_state` may appear as agent-owned metadata but are not protocol enums.

## Considered Options

- Renderable operation trace block: rejected because it would mix audit structure with user-facing result blocks and make terminal event display semantics carry trace semantics.
- Artifact view or artifact block: rejected because operation trace is action audit metadata, not an artifact retrieval flow.
- Runtime DB table or migration: rejected for v5a because accepted events already persist the source of truth and no global operation search is required yet.
- Trace-time inference from indbase/provider state: rejected because trace reads must not re-read vault, source, artifact, provider, or agent domain state.
- Provider-owned `manifest_uri` dereference in consoler: rejected because consoler must not parse or open provider-owned refs. Use opaque `manifest_ref` and `trace_ref` text instead.

## Consequences

Operation Trace stays compatible with the existing action lifecycle and replay model. Agents that do not emit it remain conformant, and consoler can add a read-only panel without changing artifact retrieval or runtime storage.

The first UI is intentionally simple: it shows operation ids, domain refs, provider refs, manifest refs, trace refs, and artifact refs as text. Opening artifacts continues to use accepted `action_id + block_id` artifact retrieval.

Future work such as global search by `operation_id`, `doc_id`, or `provider_run_id` would require a separate indexing phase and likely a new storage contract.
