# Task execution brief: V0b minimal Ink TUI

## Objective

Build the first TUI client for `consoler` on top of the already passing `agentctl` lifecycle. The TUI must let a user run `indbase.doctor` from a schema-generated form, approve execution, watch live action events, inspect result blocks, and replay a prior action by `action_id`.

## Scope

- In scope: `packages/runtime`, new `packages/tui`, root workspace scripts, TUI-focused tests, and this doc/`AGENTS.md` if commands change.
- Out of scope: natural-language input, `indbase.ingest_file`, history list browsing, Web/VS Code UI, TUI direct agent spawning, and changes to `E:\indbase` unless a test proves the existing agent protocol is insufficient.

## Start here

- Read: `docs/adr/0001-agent-protocol-v0-boundaries.md`
- Read: `docs/planning/v0-indbase-doctor-tracer-bullet.md`
- Runtime lifecycle: `packages/runtime/src/runtime.ts`
- Replay source: `packages/runtime/src/replay.ts`
- CLI reference behavior: `packages/agentctl/src/main.ts`
- Protocol types: `packages/protocol/src/types.ts`

## Do not touch

- Do not make TUI import `indbase_core` or any agent business code.
- Do not edit `E:\indbase` unrelated files.
- Do not add natural-language mapping or slash parsing in V0b.
- Do not add a history list; V0b replay is by explicit `action_id`.
- Do not hand-edit generated/build artifacts: `dist/`, `node_modules/`, `.consoler/consoler.db`, coverage output.

## Steps

1. Add runtime lifecycle APIs for UI reuse:
   - `prepareAction(input)` returns one stable prepared action: action, plan, static preview, approval token.
   - `executePrepared(prepared, handlers)` executes the same `action_id`, creates one `run_id`, persists events, and calls handlers as events arrive.
   - Keep `preview(input)` strictly static: schema validation plus `agent.preview`, with no `agent.validate`, no plan, and no context snapshot.
   - Refactor `run(input, { approve })` to use the same prepared-action path as the TUI.

2. Scaffold `packages/tui`:
   - Use Ink + React.
   - Add package scripts for `build`, `test`, `typecheck`, and `start`.
   - Add a root script for the TUI after the package exists. Target name: `tui`.

3. Implement TUI action flow:
   - Load `indbase` manifest through runtime.
   - Generate the `indbase.doctor` form from `args_schema`.
   - Support string and boolean fields only: `vault_path`, `hard_only`.
   - Submit form -> prepare action -> render action draft, plan, static preview, approval card.
   - Approve -> execute prepared action -> append live events to timeline.

4. Implement TUI layout:
   - Main area: action timeline.
   - Bottom tabs: `Logs`, `Events`, `JSON`, `Replay`.
   - Use `Replay`, not `History`, because V0b does not include a browsable history list.
   - Hand-render markdown/table/json/error blocks with Ink components; do not add markdown/table renderer packages.

5. Implement replay entry:
   - Support CLI argument `--replay <action_id>` for direct replay view.
   - Support in-app Replay tab with an `action_id` input.
   - Replay must use persisted accepted events only and must not spawn an agent.

6. Update docs after implementation:
   - Update `AGENTS.md` with actual TUI commands once they exist.
   - Keep detailed UI behavior here; keep `AGENTS.md` as routing and validation guidance only.

## Validation

- Existing broad checks:
  - `pnpm typecheck`
  - `pnpm test`
  - `pnpm test:python-sdk`
  - `pnpm build`

- Existing integration checks:
  - `pnpm agentctl -- preview indbase indbase.doctor --args fixtures/doctor-args.json`
  - `pnpm agentctl -- run indbase indbase.doctor --args fixtures/doctor-args.json --approve`
  - `pnpm agentctl -- replay <action_id>`

- TUI checks:
  - `pnpm --filter @consoler/tui test`
  - Manual smoke: `pnpm tui --`, submit `fixtures/sample-vault`, approve, inspect timeline tabs, replay the resulting `action_id` with `pnpm tui -- --replay <action_id>`

## Done means

- TUI can run `indbase.doctor` from a schema-generated form without business-specific UI code.
- TUI approval uses the same prepared action that is executed.
- Live events appear in sequence and terminal result renders markdown/table/json blocks.
- Replay by `action_id` works without spawning `indbase-agent`.
- `agentctl` behavior remains compatible and all existing checks still pass.
- `AGENTS.md` lists any new real commands added by the implementation.

## V0b acceptance (implemented)

- Runtime exposes `prepareAction`, `executePrepared`, `runWithEvents`, and `getReplay`.
- `preview` does not create action/plan/context rows; `prepareAction` does.
- `run --approve` reuses the prepared-action path.
- `pnpm tui --` runs the Ink client with timeline + Logs/Events/JSON/Replay tabs.
- `pnpm tui -- --replay <action_id>` opens replay without spawning an agent.
- See `CONTEXT.md` for glossary terms.

## Residual notes (non-blocking)

- Root TUI entry: `pnpm tui --` (workspace script → `@consoler/tui` `start`).
- Ink stack pinned in `packages/tui/package.json`: `ink@7.0.3`, `react@19.2.6`, `ink-text-input@6.0.0`, `ink-select-input@6.2.0`, `ink-spinner@5.0.0`; dev: `ink-testing-library@4.0.0`.
- Form submit flushes pending `TextInput` via `scheduleAfterInputFlush` + `valuesForSubmit` so fast Enter after typing does not read stale React state; full Ink UI tests remain helper-level for V0b.
