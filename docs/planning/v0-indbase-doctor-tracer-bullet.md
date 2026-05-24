# V0 Indbase Doctor Tracer Bullet

## Objective

Build the first end-to-end `consoler` MVP path using `indbase.doctor` as the first real out-of-process agent command.

This validates the runtime/protocol loop, not the final UI or final agent platform.

## Non-Goals

- No natural language mapping.
- No `indbase.ingest_file` in v0.
- No Web UI, VS Code extension, remote agents, marketplace, or install manager.
- No strong sandbox or secret manager.
- No execution replay.
- No full cancel race/epoch model.
- No custom renderer code from agents.

## Repositories

- Main project: `E:\consoler`.
- First real agent host: `E:\indbase`.
- `indbase-agent` code belongs in `E:\indbase`.
- `consoler` may spawn `indbase-agent`, but must not import `indbase_core`.

Expected manual registry entry after scaffold:

```json
{
  "agents": [
    {
      "agent_id": "indbase",
      "name": "indbase",
      "cwd": "E:\\indbase",
      "command": "uv",
      "args": ["run", "python", "-m", "indbase_agent"],
      "enabled": true
    }
  ]
}
```

## Target User Flow

1. Runtime starts.
2. Runtime reads `.consoler/agents.json`.
3. Runtime spawns `indbase-agent`.
4. Runtime calls `agent.discover`.
5. Runtime validates and stores the manifest.
6. User creates an `indbase.doctor` action through `agentctl`.
7. Runtime validates args with JSON Schema draft-07.
8. Runtime calls `agent.plan`.
9. Runtime creates lightweight context snapshot.
10. Runtime computes `plan_hash`.
11. Runtime calls `agent.preview`.
12. Runtime displays static preview.
13. User approves execution or `agentctl run` is called with explicit `--approve`.
14. Runtime creates approval token.
15. Runtime calls `agent.execute`.
16. Agent streams structured events.
17. Runtime validates, accepts or rejects, and persists events.
18. Runtime renders result blocks.
19. Runtime can replay accepted events from SQLite without spawning the agent.

## `indbase.doctor` Command Contract

Input schema:

```json
{
  "type": "object",
  "additionalProperties": false,
  "required": ["vault_path"],
  "properties": {
    "vault_path": {
      "type": "string",
      "description": "Path to an existing indbase vault."
    },
    "hard_only": {
      "type": "boolean",
      "default": false
    }
  }
}
```

Preview policy:

```json
{
  "preview_kind": "static",
  "requires_approval_before_preview": false,
  "preview_side_effects": [],
  "invalidates_on_context_change": true
}
```

Execution side effects:

- Reads vault files.
- Reads vault SQLite metadata.
- Reads config and artifact metadata.
- Does not write vault state.

Required permissions:

- `read_files` scoped to the vault.
- `read_database` scoped to the vault SQLite database.

Result blocks:

1. `markdown` summary.
2. `table` findings.
3. `json` full report.

Hard doctor findings return through `action.succeeded`; they do not imply `action.failed`.

## V0 Runtime Components

Implement only the minimum needed for the tracer bullet:

- Agent registry loader.
- Process manager.
- stdio JSON-RPC transport.
- Manifest loader and validator.
- Action composer for explicit command args.
- JSON Schema validator.
- Planner.
- Static preview manager.
- Approval manager.
- Lightweight context snapshot manager.
- SQLite event store.
- UI replay engine.
- Basic error normalizer.

## V0 Storage

Use SQLite from the start.

Minimum tables:

- `agents`
- `manifests`
- `actions`
- `runs`
- `events`
- `approvals`
- `contexts`

Events must store both accepted and rejected events:

- `accepted = 1` for accepted runtime events.
- `accepted = 0` for schema-invalid, stale, duplicate, wrong-run, or post-terminal non-system events.
- Include `reject_reason`.

V0 event acceptance rules:

1. `run_id` must match the active run.
2. `seq` must be greater than the last accepted sequence.
3. Terminal event closes the run.
4. After terminal state, only `system.*` events may be accepted.
5. Schema-invalid events are persisted as rejected when enough identity fields exist.

## IDs

Runtime generates:

- `act_<uuid>`
- `run_<uuid>`
- `plan_<uuid>`
- `appr_<uuid>`
- `ctx_<uuid>`
- `snap_<uuid>`

Agent SDK generates:

- Monotonic event `seq` per run, starting at `1`.

V0 event `epoch` is always `0`.

## Context Snapshot V0

Use a lightweight composite snapshot:

```json
{
  "kind": "composite",
  "summary": "indbase vault + source agent version",
  "details": {
    "vault_path": "...",
    "vault_exists": true,
    "vault_marker_exists": true,
    "config_mtime": "...",
    "db_mtime": "...",
    "agent_repo": "E:\\indbase",
    "agent_git_head": "...",
    "agent_git_dirty": true,
    "manifest_hash": "..."
  }
}
```

No full vault content hash in v0.

## `agentctl` Surface

```powershell
pnpm agentctl -- discover indbase
pnpm agentctl -- plan indbase indbase.doctor --args fixtures/doctor-args.json
pnpm agentctl -- preview indbase indbase.doctor --args fixtures/doctor-args.json
pnpm agentctl -- run indbase indbase.doctor --args fixtures/doctor-args.json
pnpm agentctl -- run indbase indbase.doctor --args fixtures/doctor-args.json --approve
pnpm agentctl -- replay <action_id>
```

`preview` is strictly static: runtime validates args with JSON Schema only, then calls `agent.preview` without `agent.validate`, `agent.plan`, or context snapshot creation. The agent must not read the vault during preview; vault checks happen at `plan`/`validate` and `execute`.

`--approve` must explicitly create an approval token. Do not use a generic `--yes` flag.

## Implementation Sequence

1. Scaffold TypeScript monorepo with `packages/protocol`, `packages/runtime`, and `packages/agentctl`.
2. Add protocol types and JSON Schema draft-07 validators for the v0 subset.
3. Add SQLite event store and manifest/action/run persistence.
4. Add stdio JSON-RPC transport and process manager.
5. Add runtime lifecycle for discover, validate, plan, static preview, approve, execute, and replay.
6. Add minimal Python SDK under `sdks/python`.
7. In `E:\indbase`, add `src/indbase_agent` with static `manifest.json` and `indbase.doctor`.
8. Run `agentctl` end-to-end against a real indbase vault.
9. Add Ink TUI only after `agentctl` proves the runtime lifecycle.

## Acceptance Criteria

V0 is done when:

- `agentctl discover indbase` returns a schema-valid manifest with one command: `indbase.doctor`.
- `agentctl plan` stores a plan with runtime-injected context snapshot and plan hash.
- `agentctl preview` returns static preview without reading the vault.
- `agentctl run --approve` executes doctor and persists a run.
- Event `seq` values are monotonic and persisted.
- Invalid or duplicate events are persisted as rejected where possible.
- Result rendering supports markdown, table, json, and error blocks.
- `agentctl replay <action_id>` reconstructs the accepted event timeline without spawning `indbase-agent`.
- `consoler` does not import `indbase_core`.

## Fixtures and tests

- Sample vault: `fixtures/sample-vault` (created via `init_vault`).
- Sample args: `fixtures/doctor-args.json`.
- Python SDK tests: `pnpm test:python-sdk` with `PYTHONPATH=sdks/python`.
- `indbase_agent` tests: `uv run pytest tests/test_indbase_agent.py` from `E:\indbase`.
