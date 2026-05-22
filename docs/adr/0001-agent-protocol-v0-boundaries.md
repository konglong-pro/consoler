# ADR 0001: Agent Protocol V0 Boundaries

Status: Accepted

Date: 2026-05-21

## Context

`consoler` is intended to become an Agent Operations Console: a generic runtime and client surface for out-of-process agents. The first real integration target is `indbase`, a local-first Python knowledge database project in `E:\indbase`.

The risk for v0 is overbuilding the final platform before proving the action lifecycle. V0 must validate the protocol loop with one real command while preserving the long-term boundaries.

## Decision

V0 is a strict subset of the final architecture. It exists to prove one end-to-end tracer bullet: `indbase.doctor`.

Accepted v0 decisions:

1. `consoler` is the main project. `indbase` is the first real agent, not the product being built here.
2. `indbase-agent` code lives in the `indbase` repo and runs as a separate process.
3. `consoler` never imports `indbase_core` or any other agent business code.
4. Transport is stdio JSON-RPC.
5. Runtime and protocol are TypeScript. The Python SDK is minimal and supports only the v0 adapter needs.
6. `agentctl` headless CLI is implemented before the Ink TUI.
7. V0 registry is manual `.consoler/agents.json`; no install, marketplace, or upgrade manager.
8. SQLite is used from day one for manifests, actions, runs, approvals, contexts, and events.
9. V0 input excludes natural language mapping. Use explicit commands, slash commands, and schema forms only.
10. The only v0 real command is `indbase.doctor`; `indbase.ingest_file` is the next tracer bullet.
11. `indbase.doctor` preview is static and does not read the vault.
12. `indbase.doctor` execute requires approval.
13. Context snapshot is lightweight: vault marker/config/db mtimes, agent git state, and manifest hash. No full vault content hash in v0.
14. Agent generates plan content. Runtime injects context snapshot and computes plan hash.
15. Permissions are approval metadata in v0, not an enforced sandbox.
16. Replay is UI/event replay only. Execution replay is out of scope.
17. Cancel is minimal cooperative cancel. Full epoch/race handling is out of scope.
18. V0 event `epoch` is always `0`.

## Protocol Subset

V0 objects:

- `AgentManifest`
- `AgentCommand`
- `ActionDraft`
- `ActionPlan`
- `PreviewPolicy`
- `ApprovalToken`
- `ActionEvent`
- `RenderableBlock`
- `AgentError`
- `ContextSnapshot`

V0 JSON Schema dialect: draft-07.

V0 action events:

- `action.started`
- `step.started`
- `step.completed`
- `progress.updated`
- `log`
- `action.succeeded`
- `action.failed`
- `action.cancelled`

V0 renderable blocks:

- `markdown`
- `table`
- `json`
- `error`

Out of scope for v0:

- Natural language intent mapping.
- `interaction.required`.
- Pause.
- Full DAG workflows.
- Dynamic dry-run and sandbox simulation.
- Custom renderer plugin system.
- Remote HTTP agents.
- Secret manager and strong OS sandbox.
- Multi-user permissions.
- Scheduled/background jobs.
- Execution replay.

## Ownership Boundaries

Runtime owns:

- `action_id`, `run_id`, `plan_id`, `approval_id`, context snapshot IDs.
- Action lifecycle state.
- Manifest cache.
- Schema validation.
- Approval material hashing.
- Event store and replay.
- Process spawn, cancellation request, and process kill fallback.

Agent owns:

- Business validation.
- Plan content.
- Static preview content.
- Execution.
- Event sequencing within a run.
- Domain error mapping to `AgentError`.

Agent SDK owns:

- JSON-RPC server loop.
- Event emission helpers.
- Monotonic event `seq`.
- Basic cancel checkpoint.
- Error normalization helpers.

## `indbase.doctor` Semantics

Hard doctor findings do not mean `action.failed`. They are successful business results that can report an unhealthy vault.

Use `action.failed` only when the action itself cannot complete, such as:

- Invalid args that validation should reject.
- Missing or non-vault path.
- Agent crash.
- Protocol violation.
- Unexpected exception.
- Context drift or approval failure.

The v0 result shape is:

1. Markdown summary.
2. Findings table.
3. Raw JSON report.

## Consequences

This keeps v0 small enough to implement while preserving the core platform constraints. It also gives future work a clear place to expand: `ingest_file` adds stronger side effects, diff/artifact blocks, and deeper approval/context snapshot behavior.

The main tradeoff is that v0 approval and permissions are not a security sandbox. They are protocol and UX semantics. Strong isolation is a later platform feature.

## Success Criteria

V0 is acceptable when `agentctl` can:

1. Load the manual indbase registry entry.
2. Spawn the `indbase-agent` process.
3. Call `agent.discover`.
4. Validate and cache the manifest.
5. Create an `indbase.doctor` action draft.
6. Validate args.
7. Request and store a plan.
8. Generate and store a static preview.
9. Create an approval token.
10. Execute the action.
11. Persist accepted and rejected events.
12. Render markdown/table/json result blocks.
13. Replay the run from SQLite without spawning the agent.
