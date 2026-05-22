# consoler glossary

Implementation-free terms for the agent operations console.

## Action Timeline

The primary UI surface showing one action’s lifecycle in order: draft, plan, static preview, approval, live events, and result blocks. It is the main panel in the Ink TUI, not a separate history browser.

## Prepared Action

A runtime bundle for a single `action_id` after schema validation, agent validate/plan, context snapshot, static preview, and approval token creation. The TUI approves and executes this same bundle so preparation and execution stay aligned.

## Static Preview

A preview that does not read the vault or call `agent.validate`. The runtime validates args with JSON Schema only, then asks the agent for a static preview payload. Distinct from plan-time context snapshots, which may read vault mtimes for approval binding.

## Replay

Reconstructing the accepted event timeline for a known `action_id` from SQLite. Replay does not spawn an agent and does not re-read the vault. V0b replay is by explicit id, not a browsable history list.

## Runtime Lifecycle

The ordered path managed by `@consoler/runtime`: discover, validate, plan, static preview, approval, execute, persist events, and optional replay. `agentctl` and the TUI share `prepareAction` and `executePrepared` so CLI and UI do not fork behavior.

## Probe Preview

A read-only preview (`probe_readonly`) that may inspect source files and open the vault database read-only for duplicate detection. It does not run validate/plan, write ingest plans, or mutate vault state. Requires preview approval before the runtime calls `agent.preview`.

## Preview Approval

An approval token with `scope: preview` that binds normalized args and preview side effects only. Required before probe preview runs for side-effecting commands such as `indbase.ingest_file`.

## Execution Approval

An approval token with `scope: execute` that binds normalized args, plan hash, context snapshot hash, side effects, and probe preview hash (when present). Required before `executePrepared` runs.

## Context Drift

When source file metadata or vault marker/config/db state changes after execution approval was minted, the runtime rejects execution with `context_changed` and requires re-preview and re-approval.
