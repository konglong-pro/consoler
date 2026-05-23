# Task execution brief: V1b action history and trace browser

## Objective

Add a read-only history and trace layer for `consoler` actions.

This stage makes prepared and executed actions discoverable without requiring users to copy `action_id` values manually. `Replay` remains accepted-event playback; `Trace View` is the debugging surface for full action context, including rejected events.

## Scope

- In scope: `packages/runtime`, `packages/agentctl`, `packages/tui`, focused tests, `CONTEXT.md`, this doc, and `AGENTS.md` if commands or validation paths change.
- Out of scope: new agent commands, `E:\indbase` changes, execution replay, natural-language mapping, strong cancel, artifact/diff renderers, full-text search, date-range search, statistics dashboards, Web UI, VS Code UI, and trace file export.

## Start here

- Read: `docs/planning/v1a-indbase-ingest-file-side-effect-tracer.md`
- Runtime store/query code: `packages/runtime/src/db/store.ts`
- Runtime replay source: `packages/runtime/src/replay.ts`
- Runtime facade: `packages/runtime/src/runtime.ts`
- Event acceptance rules: `packages/runtime/src/event-store.ts`
- CLI entry: `packages/agentctl/src/main.ts`
- TUI entry: `packages/tui/src/app.tsx`
- Existing SQLite schema: `packages/runtime/src/db/schema.ts`

## Do not touch

- Do not change agent protocol behavior to implement history.
- Do not make `Replay` include rejected events.
- Do not add execution replay or retry.
- Do not edit `E:\indbase`; V1b is consoler-only.
- Do not add search indexes for args/events/result full-text search.
- Do not hand-edit generated/build artifacts: `node_modules/`, `dist/`, `coverage/`, `.consoler/consoler.db`.
- Do not add new dependencies unless explicitly approved.

## Steps

1. Add runtime history and trace read models:
   - Add `listActionHistory({ limit, command?, status? })`.
   - Add `getActionTrace(actionId)`.
   - Keep the model action-centric: one row per action, with latest run summary when present.
   - Include actions with no run and derive their status as `prepared`.
   - Include command, short args summary, created time, latest run id/status, event counts, rejected event counts, and terminal state.

2. Add trace detail:
   - Return action, latest plan, latest context, approvals, runs, accepted events, rejected events with `reject_reason`, result blocks, and derived terminal state.
   - Reuse stored event payloads; do not spawn agents or re-read vault/source state.
   - Keep `getReplay(actionId)` and `replay(actionId)` accepted-events-only.

3. Add non-breaking SQLite support:
   - Add `CREATE INDEX IF NOT EXISTS` indexes for common history queries by action created time, run action/status, and event action/run/accepted.
   - Do not migrate existing rows destructively.

4. Add `agentctl` commands:
   - `history [--limit 20] [--command <name>] [--status <status>] [--json]`.
   - `trace <action_id> [--json]`.
   - Keep `replay <action_id>` unchanged.
   - Human output should be compact and useful in a terminal; JSON output should expose the full read model.

5. Update the TUI:
   - Add top-level mode selection: `New Action` and `History`.
   - History list shows recent actions with command, short action id, status, latest run, created time, and accepted/rejected event counts.
   - Enter opens Trace View for the selected action.
   - Trace View shows action args, plan, context, approvals, runs, accepted events, rejected events, and result blocks.
   - Keep existing `--replay <action_id>` behavior.
   - Add a JSON tab or panel for the full trace payload.

6. Update docs after implementation:
   - Add `Action History` and `Trace View` to `CONTEXT.md`.
   - Update `Runtime Lifecycle` glossary text so it does not imply static preview only.
   - Update `AGENTS.md` with real `history` / `trace` commands once they exist.

## Validation

- Focused package checks:
  - `pnpm --filter @consoler/runtime test`
  - `pnpm --filter @consoler/agentctl test`
  - `pnpm --filter @consoler/tui test`

- Broad checks:
  - `pnpm typecheck`
  - `pnpm test`
  - `pnpm build`

- Regression smokes:
  - `pnpm agentctl -- run indbase indbase.doctor --args fixtures/doctor-args.json --approve`
  - `pnpm agentctl -- run indbase indbase.ingest_file --args fixtures/ingest-args.json --approve-preview --approve`
  - `pnpm agentctl -- replay <action_id>`

- V1b smokes after implementation:
  - `pnpm agentctl -- history --limit 10`
  - `pnpm agentctl -- history --command indbase.ingest_file --json`
  - `pnpm agentctl -- trace <action_id>`
  - `pnpm agentctl -- trace <action_id> --json`
  - `pnpm tui --`, open History, open an ingest trace, inspect accepted and rejected event sections.

## Done means

- History lists recent actions without manually providing an `action_id`.
- Prepared-but-not-executed actions appear in history as `prepared`.
- Trace includes accepted and rejected events, with reject reasons visible.
- Replay still uses accepted events only.
- agentctl and TUI use the same runtime read APIs.
- Doctor and ingest V1a lifecycle smokes still pass.
- No agent process is spawned for history, trace, or replay.

## Unknowns

- Exact TUI keybindings for switching between New Action, History, Trace, and JSON can be chosen during implementation, but must be visible in the UI footer.
- Exact status labels may be adjusted to fit existing runtime state names, but must distinguish no-run prepared actions from terminal runs.
