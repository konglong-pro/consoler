# AGENTS.md

## Purpose

This repository is the main project for `consoler`: an agent operations console and runtime. It is chat-first and action-first, but the core product is the protocol and runtime that manage agent actions, approvals, event streams, history, and replay.

Use this file as routing and workflow guidance for coding agents. It is not the architecture spec.

## Start Here / Repo Map

- `docs/adr/`: durable architecture decisions. Read before changing protocol or runtime boundaries.
- `docs/planning/`: scoped implementation plans and MVP acceptance criteria.
- `packages/protocol/`: TypeScript protocol types, JSON Schemas, and validators.
- `packages/runtime/`: TypeScript runtime core: registry, process manager, transport, planner, approval, event store, replay.
- `packages/agentctl/`: headless CLI for protocol debugging and lifecycle smoke tests.
- `packages/conformance/`: reusable agent protocol conformance harness and CI fake agent.
- `packages/tui/`: Ink TUI (V0b). Depends on runtime prepared-action APIs.
- `sdks/python/`: minimal Python SDK for out-of-process agents.
- `E:\indbase`: first real agent host repo. `indbase-agent` code belongs there, not in this repo.

## Common Commands

- Install: `pnpm install`
- Agentctl help/dev entry: `pnpm agentctl -- --help`
- Test all: `pnpm test`
- Conformance harness: `pnpm test:conformance`
- Compiled agentctl smoke: `pnpm test:agentctl-smoke` (after `pnpm build`)
- Python SDK tests: `pnpm test:python-sdk`
- Single package test: `pnpm --filter @consoler/protocol test`
- TUI package test: `pnpm --filter @consoler/tui test`
- Typecheck: `pnpm typecheck`
- Build: `pnpm build`
- TUI: `pnpm tui --` (manifest command select, dual approval for probe commands)
- TUI replay: `pnpm tui -- --replay <action_id>`
- TUI history: `pnpm tui --` → History → select action → Trace View
- Action replay: `pnpm agentctl -- replay <action_id>`
- Action history: `pnpm agentctl -- history [--limit 20] [--command <name>] [--status <status>] [--json]`
- Action trace: `pnpm agentctl -- trace <action_id> [--json]`
- Agent conformance: `pnpm agentctl -- test <agent_id> [--command <name>] [--args <path>] [--approve-preview] [--approve] [--json]`
- Ingest preview: `pnpm agentctl -- preview indbase indbase.ingest_file --args fixtures/ingest-args.json`
- Ingest probe: `pnpm agentctl -- preview indbase indbase.ingest_file --args fixtures/ingest-args.json --approve-preview`
- Ingest run: `pnpm agentctl -- run indbase indbase.ingest_file --args fixtures/ingest-args.json --approve-preview --approve`
- Interactive run (fake): `pnpm agentctl -- run conformance-fake conformance.interactive_choice --args <args.json> --approve --interaction-response <response.json>`
- Indbase agent command: from `E:\indbase`, `uv run python -m indbase_agent`

Prefer narrow validation for the changed package before broad checks.

## Task Routing

- Protocol shape or object contracts: start in `docs/adr/0001-agent-protocol-v0-boundaries.md`, then `packages/protocol/`.
- Runtime lifecycle, approval, event store, replay: start in `docs/planning/v0-indbase-doctor-tracer-bullet.md`, then `packages/runtime/`.
- Headless debugging CLI: start in `packages/agentctl/`; it must call the same runtime as the TUI.
- V0b TUI behavior: start in `docs/planning/v0b-minimal-tui.md`; implement runtime prepared-action APIs before UI state.
- V1a side-effect tracer (`indbase.ingest_file`): start in `docs/planning/v1a-indbase-ingest-file-side-effect-tracer.md`; keep scope to one local file.
- V1b action history / trace: start in `docs/planning/v1b-action-history-trace-browser.md`; keep it read-only and consoler-only.
- V1c conformance harness / `agentctl test`: start in `docs/planning/v1c-conformance-harness.md`; create `packages/conformance/` and keep default checks non-executing.
- V1d diff/artifact renderable blocks: start in `docs/planning/v1d-diff-artifact-renderable-blocks.md`; extend protocol/renderers without adding artifact storage.
- V1e real indbase renderable blocks: start in `docs/planning/v1e-real-indbase-renderable-blocks.md`; wire existing diff/artifact blocks into `E:\indbase` execution results only.
- V1f cooperative cancel: start in `docs/planning/v1f-cooperative-cancel.md`; prove SDK/runtime/agentctl cancel without TUI or strong epoch semantics.
- V1g TUI cooperative cancel: start in `docs/planning/v1g-tui-cooperative-cancel.md`; wire V1f runtime cancel control into the Ink TUI without strong epoch or force-kill semantics.
- V1h `interaction.required`: start in `docs/planning/v1h-interaction-required.md`; fake-first runtime/SDK/agentctl/TUI interaction loop with one pending interaction and no timeout or response persistence.
- V1i interaction trace persistence: start in `docs/planning/v1i-interaction-trace-persistence.md`; persist interaction request/response records for trace without changing replay.
- V1j agentctl run live interactions: start in `docs/planning/v1j-agentctl-run-live-interactions.md`; wire live `interaction.required` handling into `agentctl run` without protocol, SDK, TUI, or real indbase changes.
- Python agent SDK: start in `sdks/python/`; implement only what the active tracer bullet needs.
- `indbase-agent`: edit `E:\indbase` only when the task explicitly asks for the adapter or indbase API changes.

## Validation Rules

- Documentation-only change:
  1. Check links and paths manually.
  2. Ensure `AGENTS.md` stays short and points to deeper docs.

- Protocol/runtime change:
  1. Add or update focused tests near the changed package.
  2. Run the narrow package test command once scripts exist.
  3. Run typecheck once scripts exist.

- Agent transport or SDK change:
  1. Validate JSON-RPC request/response behavior with `agentctl` once available.
  2. Run Python SDK tests once the SDK test command exists.
  3. Run an `indbase.doctor` end-to-end smoke before claiming integration works.

- Side-effect agent action change:
  1. Read `docs/planning/v1a-indbase-ingest-file-side-effect-tracer.md`.
  2. Prove preview approval does not call write-oriented indbase helpers.
  3. Run focused protocol/runtime/agentctl/TUI tests for preview approval, execution approval, and context drift.
  4. Run the `indbase.doctor` regression smoke and an `indbase.ingest_file` smoke against a disposable fixture vault.

- History / trace change:
  1. Read `docs/planning/v1b-action-history-trace-browser.md`.
  2. Add or update focused runtime store/replay tests before UI work.
  3. Verify `replay` remains accepted-events-only while trace includes rejected events.
  4. Run focused runtime, agentctl, and TUI tests (including `packages/tui/test/history-trace-flow.test.tsx`), then `pnpm typecheck`.
  5. Default CI runs `pnpm test` and `pnpm test:python-sdk`; it does not run real `indbase` agent smokes.

- Conformance harness change:
  1. Read `docs/planning/v1c-conformance-harness.md`.
  2. Keep `agentctl test <agent_id>` safe by default: discover/health/manifest/schema only unless `--command --args` are supplied.
  3. Do not execute side-effecting commands unless explicit approval flags are supplied.
  4. Use a Python SDK fake agent for CI; do not make default CI depend on `E:\indbase`.
  5. After adding scripts, run `pnpm --filter @consoler/conformance test`, `pnpm --filter @consoler/agentctl test`, `pnpm test:conformance`, `pnpm test:python-sdk`, and `pnpm typecheck`.

- Renderable block change:
  1. Read `docs/planning/v1d-diff-artifact-renderable-blocks.md`.
  2. Keep the block envelope `{ block_id, type, title?, content }`; do not add custom renderer code from agents.
  3. Do not add artifact storage or read artifact `uri` values in TUI, trace, or replay.
  4. Update protocol schema/tests, Python SDK helpers, TUI renderer, runtime formatters, and conformance fake coverage together.
  5. Run focused protocol, TUI, conformance, agentctl, Python SDK, and root conformance checks before broad build/typecheck/test.

- Real indbase renderable adoption:
  1. Read `docs/planning/v1e-real-indbase-renderable-blocks.md`.
  2. Keep changes execution-only for `indbase.ingest_file`; do not change preview report shape or approval semantics.
  3. Use logical `indbase://...` artifact URIs, not `file://` or absolute paths.
  4. Run `uv run pytest tests/test_indbase_agent.py` from `E:\indbase`.
  5. Run focused consoler protocol/TUI/conformance/agentctl/Python SDK checks, then `pnpm typecheck`.
  6. Smoke with `agentctl test indbase --command indbase.ingest_file` only against a disposable vault and explicit approval flags.

- Cooperative cancel change:
  1. Read `docs/planning/v1f-cooperative-cancel.md`.
  2. Keep V1f SDK/runtime/agentctl/conformance-only; do not add TUI cancel controls.
  3. Keep `epoch: 0`; do not introduce strong cancel race handling or force-kill fallback.
  4. Require the agent to emit `action.cancelled`; runtime must not fake a cancelled terminal event.
  5. Run Python SDK, runtime, conformance, agentctl, root conformance, typecheck, build, and root test checks.
  6. Use the conformance fake slow command for cancel smoke; real `indbase.ingest_file` cancel is not a required gate.

- TUI cooperative cancel change:
  1. Read `docs/planning/v1g-tui-cooperative-cancel.md`.
  2. Keep cancel request distinct from cancelled terminal event.
  3. Use injected/mock runtime tests; do not require real indbase cancellation.
  4. Do not add strong epoch, force-kill, protocol, SDK, or `E:\indbase` changes.
  5. Run focused TUI, runtime, conformance, agentctl, Python SDK, root conformance, typecheck, build, and root test checks.
  6. Harden the existing history/trace TUI flake only with minimal test timing/input changes.

- Interaction-required change:
  1. Read `docs/planning/v1h-interaction-required.md`.
  2. Keep V1h fake-first; do not edit `E:\indbase`. Use V1j for `agentctl run` live prompts.
  3. Allow one pending interaction per run; support choices plus simple object-schema input only.
  4. Do not add timeout policy, response persistence, `interactions` table, `system.*` events, strong epoch, or force-kill changes.
  5. Use conformance fake and `agentctl test --interaction-response <path>` for headless validation.
  6. Run focused protocol, runtime, conformance, agentctl, TUI, Python SDK, root conformance, typecheck, build, and root test checks.

- Interaction trace persistence change:
  1. Read `docs/planning/v1i-interaction-trace-persistence.md`.
  2. Persist request/response records in an `interactions` table; do not store responses as events.
  3. Store full response JSON; do not add redaction or secret policy in V1i.
  4. Keep replay accepted-events-only and response-free.
  5. Mark pending interactions `abandoned` when a run reaches terminal without response.
  6. Run focused runtime, agentctl, TUI, root conformance, Python SDK, typecheck, build, and root test checks.

- Agentctl run live interaction change:
  1. Read `docs/planning/v1j-agentctl-run-live-interactions.md`.
  2. Keep stdout as final structured run JSON; send prompts and retry errors to stderr.
  3. Use `executePreparedWithControl` and runtime `respondInteraction`; do not persist responses directly from agentctl.
  4. Support `--interaction-response <path>` for non-TTY automation and fail fast without it.
  5. Do not change protocol, Python SDK, TUI, real `E:\indbase`, timeout, redaction, multi-pending, strong epoch, or force-kill behavior.
  6. Run focused agentctl/runtime checks, root conformance, Python SDK, typecheck, build, root test, and an isolated conformance fake `agentctl run` smoke.

- TUI change:
  1. Add or update focused tests under `packages/tui/` once that package exists.
  2. Verify behavior against recorded event replay.
  3. Run `agentctl` lifecycle checks if runtime behavior changed.
  4. Do a manual TUI smoke for form -> approval -> live events -> result -> replay.

## Architecture Constraints

- `consoler` never imports agent business logic. Agents are always out-of-process.
- The first real agent is `indbase`, but `consoler` must remain business-agnostic.
- Agent code must not inject frontend code. Agents return schemas, events, artifacts, and renderable blocks only.
- LLM intent mapping is out of v0. LLMs must never bypass ActionDraft, validation, plan, preview, approval, and execute.
- Preview is part of the action lifecycle. If a preview reads or mutates real environment state, model and approve it explicitly.
- Approval binds normalized args, plan, context snapshot, side effects, and preview hash when present.
- Execution output is a structured event stream. Do not treat logs as progress.
- History, trace, and replay are read-only. They must not spawn agents or re-read vault/source state.
- Conformance checks must use out-of-process agents and isolated temp runtime roots; they must not pollute the developer's `.consoler` store.
- Artifact blocks are references in V1d; renderers must not read or resolve artifact `uri` values unless a newer planning doc changes scope.
- V1e real agent artifact blocks use logical `indbase://...` references; they still do not grant consoler ownership of indbase artifact storage or file access.
- V1f cancel is cooperative only: a cancel request is not a cancelled terminal state until the agent emits `action.cancelled`.
- V1g TUI cancel sends only a cancel request; the TUI must wait for agent-emitted `action.cancelled` before showing a cancelled terminal state.
- V1h interactions are live transport responses only: persist `interaction.required` as an event, but do not persist user responses unless a newer planning doc changes scope.
- V1i persists interaction responses for trace/debugging only; replay must remain accepted-events-only.
- V1j makes `agentctl run` a live interaction client, but the runtime still owns interaction validation, response routing, persistence, and terminal state.
- v0 is a strict subset for `indbase.doctor`; do not implement future platform features unless the current task explicitly changes scope.
- V1a `indbase.ingest_file` is the only approved side-effect expansion path. It is single-file only unless a newer planning doc changes scope.

## Do Not Edit Unless Explicitly Asked

- `E:\indbase` unrelated files.
- Generated outputs, dependency directories, or build artifacts such as `node_modules/`, `dist/`, `coverage/`, `.consoler/consoler.db`.
- Lockfiles unrelated to the current dependency or scaffold change.
- Agent business implementation inside `consoler`; use adapter protocol boundaries instead.

## Deep Context Index

- `docs/adr/0001-agent-protocol-v0-boundaries.md`: accepted v0 architecture boundaries and non-goals.
- `docs/planning/v0-indbase-doctor-tracer-bullet.md`: MVP flow, acceptance criteria, and implementation sequence.
- `docs/planning/v0b-minimal-tui.md`: next-stage execution brief for the Ink TUI.
- `docs/planning/v1a-indbase-ingest-file-side-effect-tracer.md`: side-effect tracer brief for probe preview approval and `indbase.ingest_file`.
- `docs/planning/v1b-action-history-trace-browser.md`: read-only action history and trace browser brief.
- `docs/planning/v1c-conformance-harness.md`: conformance harness and `agentctl test` execution brief.
- `docs/planning/v1d-diff-artifact-renderable-blocks.md`: diff/artifact renderable block execution brief.
- `docs/planning/v1e-real-indbase-renderable-blocks.md`: real `indbase.ingest_file` diff/artifact adoption brief.
- `docs/planning/v1f-cooperative-cancel.md`: SDK/runtime/agentctl cooperative cancel execution brief.
- `docs/planning/v1g-tui-cooperative-cancel.md`: Ink TUI cancel integration brief.
- `docs/planning/v1h-interaction-required.md`: fake-first running interaction loop execution brief.
- `docs/planning/v1i-interaction-trace-persistence.md`: interaction request/response trace persistence brief.
- `docs/planning/v1j-agentctl-run-live-interactions.md`: `agentctl run` live interaction execution brief.

## Done Means

Before final response, report:

- Files changed.
- Commands run and results.
- Checks not run and why.
- Remaining risks or unknowns.
