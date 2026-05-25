# consoler glossary

Implementation-free terms for the agent operations console.

## Action Timeline

The primary UI surface showing one action’s lifecycle in order: draft, plan, static preview, approval, live events, and result blocks. It is the main panel in the Ink TUI, not a separate history browser.

## Prepared Action

A runtime bundle for a single `action_id` after schema validation, agent validate/plan, context snapshot, static preview, and approval token creation. The TUI approves and executes this same bundle so preparation and execution stay aligned.

## Static Preview

A preview that does not read the vault or call `agent.validate`. The runtime validates args with JSON Schema only, then asks the agent for a static preview payload. Distinct from plan-time context snapshots, which may read vault mtimes for approval binding.

## Replay

Reconstructing the accepted event timeline for a known `action_id` from SQLite. Replay does not spawn an agent and does not re-read the vault. Replay uses accepted events only; rejected events are visible in trace, not replay.

## Conformance Harness

A reusable, read-only compatibility suite that verifies an out-of-process agent speaks the current protocol: registry entry, health, discover, manifest validation, and optional command-specific plan/preview/execute checks. Default runs are non-executing; execution requires explicit approval flags.

## Action History

A read-only, action-centric list of recent prepared and executed actions from the local SQLite store. Each row summarizes command, derived status, latest run, timestamps, and accepted/rejected event counts. History does not spawn agents.

## Trace View

A read-only debugging surface for one `action_id`: action args, latest plan and context, execution approvals, runs, accepted events, rejected events (with `reject_reason`), and result blocks. Trace may include events replay omits. It does not re-read vault or source state.

## Runtime Lifecycle

The ordered path managed by `@consoler/runtime`: discover, validate, plan, preview (static or probe), preview approval when required, execution approval, execute, persist events, and optional history/trace/replay reads. `agentctl` and the TUI share `prepareAction` and `executePrepared` so CLI and UI do not fork behavior.

## Probe Preview

A read-only preview (`probe_readonly`) that may inspect source files and open the vault database read-only for duplicate detection. It does not run validate/plan, write ingest plans, or mutate vault state. Requires preview approval before the runtime calls `agent.preview`.

## Preview Approval

An approval token with `scope: preview` that binds normalized args and preview side effects only. Required before probe preview runs for side-effecting commands such as `indbase.ingest_file`.

## Execution Approval

An approval token with `scope: execute` that binds normalized args, plan hash, context snapshot hash, side effects, and probe preview hash (when present). Required before `executePrepared` runs.

## Context Drift

When source file metadata or vault marker/config/db state changes after execution approval was minted, the runtime rejects execution with `context_changed` and requires re-preview and re-approval.

## Diff Block

A `RenderableBlock` with `type: "diff"` whose `content` carries a unified diff string (`unified_diff`) plus optional `language`, `from_label`, and `to_label`. Agents emit diff blocks to describe file or text changes; consoler renderers show the diff text only and do not apply patches or read paths from the diff.

## Artifact Block

A `RenderableBlock` with `type: "artifact"` whose `content` references produced output by `uri` and `kind`, with optional `label` and `metadata`. In V1d, artifact blocks are event-carried references only: TUI, trace, and replay may display metadata but must not open or resolve the `uri` unless a future planning doc adds artifact storage and fetch.

For `indbase.ingest_file`, artifact blocks use logical `indbase://ingest_runs/...`, `indbase://documents/...`, and `indbase://document_revisions/...` URIs. These are consoler renderable references to indbase entities, not indbase internal durable evidence artifacts and not filesystem paths.

## Cooperative Cancel

A non-preemptive action stop flow where the runtime asks an executing agent to stop and the agent decides when to observe that request. It is not a forced process kill and does not by itself create a terminal action state.

## Cancel Request

The runtime-side request that asks an executing agent to stop. A cancel request is only intent; the action is still running until the event stream reaches a terminal event.

## Cancel Checkpoint

An agent-owned point in execution where the agent checks whether cancellation has been requested and can stop cleanly before continuing work.

## Cancelled Terminal Event

The event-stream fact that an action ended because cancellation was observed by the agent. In the current protocol this is represented by `action.cancelled` and is distinct from a cancel request.

## Interaction Request

A structured prompt an agent emits during execution as an `interaction.required` event with an `interaction` payload (`interaction_id`, `title`, `message`, and optional `choices`, `prompt_schema`, `default_response`, or `blocks`). It asks the runtime or UI for user input without ending the run.

## Interaction Response

The user’s answer routed back to the same live agent process through `action.respond_interaction`. V1i persists response JSON in the `interactions` table for trace and history debugging. V1l may redact marked top-level object fields in persisted trace data and stored `interaction.required` payloads while the live agent still receives the full response. Replay remains accepted agent events only and does not include interaction responses.

## Interaction Redaction

Opt-in trace persistence protection for object-schema interactions. Agents mark top-level `prompt_schema.properties.<field>` with `x-consoler-redact: true`; the runtime replaces those field values with `"[REDACTED]"` in SQLite and records JSON Pointer paths in `redacted_paths`. Redaction does not change the live `action.respond_interaction` payload.

## Pending Interaction

The single in-flight interaction a run accepts at a time. The runtime tracks one pending `interaction_id` between an accepted `interaction.required` event and a successful `respondInteraction` call (or run termination).

## Runtime Control Lock

A per-run internal execution phase tracked by the runtime during live `executePreparedWithControl`: `running`, `cancel_requested`, `cancelling`, and `terminal`. The lock coordinates idempotent cancel requests, post-cancel event quarantine, and force-kill fallback without changing wire protocol `epoch` semantics.

## Cancel Timeout

The runtime-owned timer started when the first `agent.cancel` request is sent. If the agent does not emit an accepted `action.cancelled` before the timeout (default 5000ms, overridable via `ConsolerRuntimeOptions.cancelTimeoutMs`), the runtime force-kills the agent process.

## Force-kill Fallback

When cancel timeout expires, the runtime kills the agent process, abandons pending interactions, closes the run as `failed`, and records a run-level control error. The runtime must not synthesize `action.cancelled` or other terminal agent events on this path.

## Control Error

A run-level failure recorded when strong runtime control closes a run without an agent terminal event, such as `cancel_timeout`. Control errors appear in history/trace on the `runs` row; replay remains accepted agent events only.
