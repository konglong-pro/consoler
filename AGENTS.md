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
- V1l redaction smoke: `pnpm test:redaction-smoke` (after `pnpm build`)
- V1 release gate: `pnpm test:v1-release-gate`
- V2 release gate: `pnpm test:v2-release-gate`
- V3b intent drafting gate: `pnpm test:v3b-intent-gate`
- V3 closeout evidence: `docs/testing/v3-closeout.md`
- V4d indbase dogfood UX gate: `pnpm test:v4d-indbase-dogfood-ux`
- V4e indbase variant intent drafting gate: `pnpm test:v4e-indbase-variant-intent-drafting`
- Artifact retrieval smoke: `pnpm test:artifact-retrieval-smoke`
- Real indbase local smoke: `pnpm test:real-indbase-smoke`
- Python SDK tests: `pnpm test:python-sdk`
- Python SDK package gate (wheel/sdist/install smoke): `pnpm test:python-sdk-package`
- Python SDK publish dry-run/upload: `pnpm publish:python-sdk` (add `-- --publish` for upload; requires env vars)
- Single package test: `pnpm --filter @consoler/protocol test`
- TUI package test: `pnpm --filter @consoler/tui test`
- Typecheck: `pnpm typecheck`
- Build: `pnpm build`
- TUI dev shell: `pnpm tui --` (generic manifest command select; protocol-oriented labels)
- TUI indbase product: `pnpm tui:indbase --` (or `pnpm tui -- --variant indbase`; product tasks and scoped history)
- TUI replay: `pnpm tui -- --replay <action_id>` or `pnpm tui:indbase -- --replay <action_id>`
- TUI history (dev): `pnpm tui --` → History → select action → Trace View
- TUI history (indbase product): `pnpm tui:indbase --` → History (variant-scoped)
- Action replay: `pnpm agentctl -- replay <action_id>`
- Action history: `pnpm agentctl -- history [--limit 20] [--command <name>] [--status <status>] [--json]`
- Action trace: `pnpm agentctl -- trace <action_id> [--json]`
- Intent draft (human): `pnpm agentctl -- intent-draft "check vault C:\vault" --agent indbase`
- Intent draft (JSON): `pnpm agentctl -- intent-draft "import C:\docs\a.md" --agent indbase --json`
- Intent draft (assisted): `pnpm agentctl -- intent-draft "import C:\docs\a.md" --agent indbase --assist`
- V3c assisted intent gate: `pnpm test:v3c-assisted-intent-gate`
- V3c TUI assisted intent gate: `pnpm test:v3c-tui-assisted-intent-gate`
- Product TUI assisted NL (local): set `CONSOLER_TUI_ASSISTED_INTENT=1` and `CONSOLER_INTENT_PROVIDER_URL`, then `pnpm tui:indbase --`
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
- V1k interaction timeout policy: start in `docs/planning/v1k-interaction-timeout-policy.md`; add runtime-owned timeout policy for `interaction.required` without real indbase, redaction, multi-pending, strong epoch, or force-kill changes.
- V1l interaction response redaction: start in `docs/planning/v1l-interaction-response-redaction.md`; add opt-in trace persistence redaction for top-level object fields without real indbase or retroactive database rewrites.
- V1m real indbase interaction adoption: start in `docs/planning/v1m-real-indbase-interaction-adoption.md`; wire existing interaction support into real `indbase.ingest_file` duplicate handling without protocol, runtime, SDK, or TUI expansion.
- V1n strong runtime control: start in `docs/planning/v1n-strong-runtime-control.md`; add runtime-only action lock, cancel timeout, force-kill fallback, and post-cancel event quarantine while keeping `epoch=0` and no synthetic terminal events.
- V1o real indbase cooperative cancel: start in `docs/planning/v1o-real-indbase-cooperative-cancel.md`; pass cooperative cancel checkpoints into real `indbase.ingest_file` pipeline without consoler protocol/runtime/TUI/SDK changes.
- V1p stabilization release gate: start in `docs/planning/v1p-v1-stabilization-release-gate.md`; close V1 with a release-gate script, acceptance matrix, and CI coverage without adding protocol/runtime/TUI features.
- V1q real indbase local smokes: start in `docs/planning/v1q-real-indbase-local-smokes.md`; stabilize local disposable-vault smokes without adding default CI or protocol/runtime/TUI/SDK behavior.
- V2a protocol contract: start in `docs/planning/v2a-artifact-retrieval-protocol-contract.md`; add artifact retrieval manifest capability and `ArtifactView` validation before runtime work.
- V2a artifact retrieval CLI loop: start in `docs/planning/v2a-artifact-retrieval-cli-loop.md`; implement runtime retrieval, audit, SDK/fake-agent support, conformance, and `agentctl artifact-view` without TUI or real indbase.
- V2a artifact retrieval / browser: start in `docs/planning/v2a-artifact-retrieval-browser.md`; add generic agent-owned artifact viewing before natural language mapping.
- V2b artifact browser / real-agent adoption: start in `docs/planning/v2b-artifact-browser-real-adoption.md`; wire TUI `artifact_view` + real `indbase` `get_artifact_view` on completed V2a `fetchArtifactView` without NL mapping.
- V2c artifact retrieval closeout: start in `docs/planning/v2c-artifact-retrieval-closeout.md`; close the phase with local-only real artifact smoke coverage and testing docs without adding new feature scope.
- Console Variant / product entrypoint: start in `docs/planning/v3a-console-variant-product-entrypoint.md`; keep core generic, add checked-in variant configuration and product TUI entrypoints, and do not turn consoler into an agent marketplace.
- Natural language Intent Drafting: start in `docs/planning/v3b-natural-language-intent-drafting.md` and `docs/adr/0003-natural-language-intent-drafting.md`; add deterministic runtime `draftIntent`, `agentctl intent-draft`, and variant-scoped TUI entry without LLMs, protocol changes, raw-input persistence, or direct execution.
- Runtime intent mapper slice: start in `docs/planning/v3b-runtime-intent-mapper.md`; implement only `packages/runtime` `draftIntent({ text, scope })` and focused runtime tests before CLI or TUI work.
- Agentctl intent-draft slice: start in `docs/planning/v3b-agentctl-intent-draft.md`; wire `agentctl intent-draft` to the runtime mapper with human/`--json` output tests and no TUI, protocol, DB, or action lifecycle changes.
- TUI product intent entry slice: start in `docs/planning/v3b-tui-product-intent-entry.md`; add variant-scoped NL input, `IntentScope` construction from checked-in variant config, and form prefill tests without protocol, DB, agentctl, direct execution, or `E:\indbase` changes.
- Assisted intent runtime/CLI slice: start in `docs/planning/v3c-assisted-intent-runtime-cli.md` and `docs/adr/0004-llm-assisted-intent-drafting.md`; add opt-in provider-assisted intent orchestration and `agentctl intent-draft --assist` with fake-provider gates, deterministic fallback, no protocol/DB/TUI changes, and no committed private provider details.
- Assisted intent TUI slice: start in `docs/planning/v3c-assisted-intent-tui-entry.md` and `docs/adr/0004-llm-assisted-intent-drafting.md`; wire product TUI assisted drafting behind explicit local opt-in with transient notices, fake-provider tests, no dev-shell behavior change, and no committed private provider details.
- Versioned Python Agent SDK: start in `docs/planning/v4a-versioned-python-agent-sdk.md` and `docs/adr/0005-versioned-python-agent-sdk.md`; package only `sdks/python` as private/internal `consoler-agent-sdk`, keep protocol compatibility separate from SDK version, validate wheel/sdist/install smoke, and do not upload from default CI.
- Indbase Source Trust Probe: start in `docs/planning/v4b-indbase-source-trust-probe.md` and `docs/adr/0006-product-variants-keep-agent-specific-ui-boundaries.md`; keep this repo to product variant behavior and coordinate adapter work through `E:\indbase\docs\planning\v0.3.2.3-consoler-source-trust-probe.md`.
- Indbase Probe Stabilization: start in `docs/planning/v4c-indbase-probe-stabilization.md`; clean up real-agent smoke/conformance signals without protocol/runtime schema changes, and coordinate source-trust fixture work through `E:\indbase\docs\planning\v0.3.2.3a-consoler-probe-stabilization.md`.
- Indbase Dogfood UX Variant: start in `docs/planning/v4d-indbase-dogfood-ux.md`; improve `pnpm tui:indbase --` for the Source Trust Loop through variant configuration and focused TUI tests, coordinating boundaries through `E:\indbase\docs\planning\v0.3.2.3c-consoler-variant-dogfood-ux.md`.
- Indbase Variant Intent Drafting: start in `docs/planning/v4e-indbase-variant-intent-drafting.md`; add deterministic indbase-variant Source Trust Loop form prefill without protocol/runtime store changes, default LLM/assisted behavior, or `E:\indbase` implementation changes.
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

- Interaction timeout policy change:
  1. Read `docs/planning/v1k-interaction-timeout-policy.md`.
  2. Runtime owns timeout timers; clients display policy but do not enforce timeout.
  3. Support `abort`, `use_default`, `skip`, and `continue`; `abort` must become `action.failed`, not `action.cancelled`.
  4. Keep `skip` and `continue` as agent-visible timeout result dicts; keep replay response-free.
  5. Do not edit `E:\indbase` or add redaction, multi-pending, `system.*`, strong epoch, or force-kill behavior.
  6. Run focused protocol/runtime/conformance/agentctl/TUI/Python SDK checks, root conformance, agentctl smoke, typecheck, build, and root test.

- Interaction response redaction change:
  1. Read `docs/planning/v1l-interaction-response-redaction.md`.
  2. Keep redaction opt-in through top-level `prompt_schema` property markers only.
  3. Redact persisted trace data, not the live response sent to the agent.
  4. Do not rewrite existing interaction rows or add request-level policy, nested traversal, real `E:\indbase`, `system.*`, multi-pending, strong epoch, or force-kill behavior.
  5. Verify trace JSON/text/TUI show redacted values plus `redacted_paths`, while replay remains response-free; result blocks must not echo secret plaintext.
  6. Run focused protocol/runtime/conformance/agentctl/TUI/Python SDK checks, root conformance, `pnpm test:redaction-smoke`, agentctl smoke, typecheck, build, and root test.

- Real indbase interaction adoption:
  1. Read `docs/planning/v1m-real-indbase-interaction-adoption.md`.
  2. Keep changes real-agent focused in `E:\indbase`; do not change consoler protocol, runtime, SDK, TUI, or conformance fake unless an existing contract test fails.
  3. Use existing `probe_ingest_file` duplicate data before write-oriented ingest execution.
  4. Treat duplicate `skip` as `action.succeeded` business output, not failure or cancellation.
  5. Do not add timeout, redaction, multi-pending, strong epoch, force-kill, folder ingest, or execution replay behavior.
  6. Run `uv run pytest tests/test_indbase_agent.py` from `E:\indbase`, focused consoler protocol/runtime/agentctl/TUI/Python SDK/conformance checks, typecheck, build, root test, and disposable-vault `agentctl run` smokes for `skip` and `continue`.

- Strong runtime control change:
  1. Read `docs/planning/v1n-strong-runtime-control.md`.
  2. Keep `ActionEvent.epoch` fixed at `0`; do not change protocol schemas or introduce `system.*` events.
  3. Runtime may force-kill after cancel timeout, but must close the run as `failed` with `control_error=cancel_timeout` and must not synthesize `action.cancelled`.
  4. After cancel is requested, only agent-emitted `action.cancelled` may be accepted; other valid agent events should be rejected into trace.
  5. Do not edit `E:\indbase`, Python SDK cancel checkpoints, live TUI cancel behavior, interaction timeout policy, or execution replay.
  6. Run focused runtime/conformance/agentctl/TUI/Python SDK checks, root conformance, cooperative and timeout cancel smokes, typecheck, build, root test, and agentctl smoke.

- Real indbase cooperative cancel change:
  1. Read `docs/planning/v1o-real-indbase-cooperative-cancel.md`.
  2. Keep changes focused on real `indbase.ingest_file`; do not expand to doctor, folder ingest, URL ingest, media ingest, or rollback.
  3. Add a backward-compatible optional checkpoint hook in `E:\indbase` ingest pipeline; do not make `indbase_core` import `consoler_agent_sdk`.
  4. Ensure checkpoint-observed cancellation re-raises to the SDK so the agent emits `action.cancelled`; do not synthesize terminal events.
  5. Do not change consoler protocol schemas, runtime control semantics, TUI live cancel behavior, Python SDK checkpoints, conformance fake behavior, or execution replay.
  6. Run focused `E:\indbase` adapter/pipeline cancel tests, focused consoler runtime/agentctl/TUI/Python SDK/conformance checks, typecheck, build, and root test. Treat real `agentctl` cancel smoke as optional unless it can be made deterministic with a disposable fixture.

- V1 stabilization release gate change:
  1. Read `docs/planning/v1p-v1-stabilization-release-gate.md` and `docs/testing/v1-release-gate.md`.
  2. Do not add new protocol, runtime, SDK, TUI, or real `E:\indbase` behavior.
  3. Keep default CI fake-agent based; do not require real `E:\indbase`, real vaults, local paths, or timing-sensitive real-agent smokes.
  4. Ensure Linux CI runs `pnpm test:v2-release-gate` (or `pnpm test:v1-release-gate` for V1-only changes), including redaction and artifact retrieval smokes.
  5. Keep Windows CI focused on runtime, agentctl, Python SDK, and agentctl smoke.
  6. Run `pnpm test:v1-release-gate` and `git diff --check`.

- Real indbase local smoke change:
  1. Read `docs/planning/v1q-real-indbase-local-smokes.md` and `docs/testing/real-indbase-smokes.md`.
  2. Use temp `CONSOLER_ROOT`, temp args/responses, and disposable vaults only.
  3. Do not add default CI requirements for `E:\indbase`, real vaults, or timing-sensitive real-agent cancellation.
  4. Prove doctor, normal ingest, duplicate skip, duplicate continue, real cooperative cancel focused tests, and fake-agent timeout fallback.
  5. Run `pnpm test:real-indbase-smoke`, `pnpm test:v1-release-gate`, and `git diff --check`.

- Artifact retrieval protocol contract change:
  1. Read `docs/planning/v2a-artifact-retrieval-protocol-contract.md` and `docs/adr/0002-agent-owned-artifact-retrieval.md`.
  2. Keep the change inside `packages/protocol`; do not edit runtime, agentctl, TUI, SDK, conformance fake, or real `E:\indbase`.
  3. Add optional manifest capability and `ArtifactView` validation without bumping `protocol_version`.
  4. Keep old manifests valid and reject nested artifact blocks in `ArtifactView.blocks`.
  5. Run `pnpm --filter @consoler/protocol test`, `pnpm --filter @consoler/protocol typecheck`, `pnpm typecheck`, and `git diff --check`.

- Artifact retrieval CLI loop change:
  1. Read `docs/planning/v2a-artifact-retrieval-cli-loop.md`, `docs/planning/v2a-artifact-retrieval-browser.md`, and `docs/adr/0002-agent-owned-artifact-retrieval.md`.
  2. Keep this phase to runtime, agentctl, Python SDK, conformance fake/harness, and tests; do not edit TUI or real `E:\indbase`.
  3. Fetch artifacts only by accepted `action_id` + `block_id`; do not accept arbitrary URI input, rejected-event artifacts, or preview artifacts.
  4. Persist retrieval attempt metadata only; do not store `ArtifactView` content, write events, change replay, or change action history status.
  5. Use fake-agent conformance for the default path and keep real-agent adoption for a later local-only phase.
  6. Run focused runtime, agentctl, conformance, Python SDK, root conformance, typecheck, build, root test, and `git diff --check`.

- Artifact retrieval / browser change:
  1. Read `docs/planning/v2a-artifact-retrieval-browser.md`.
  2. Keep retrieval generic and agent-owned; consoler must not parse or dereference agent artifact URI schemes directly.
  3. Retrieve only accepted artifact blocks by `action_id` and `block_id`; do not fetch rejected-event artifacts, preview artifacts, or arbitrary user-entered URIs.
  4. Keep retrieval separate from Action lifecycle, approval tokens, event streams, replay, and artifact content storage.
  5. Reject nested artifact blocks in `ArtifactView.blocks`; do not add downloads, media streaming, pagination, global artifact search, or natural language mapping.
  6. Use conformance fake coverage for default tests and keep real `E:\indbase` artifact retrieval local-only.
  7. Run focused protocol/runtime/agentctl/TUI/conformance/Python SDK checks, root conformance, typecheck, build, root test, `git diff --check`, and local real-agent retrieval smoke when validating `E:\indbase`.

- Artifact browser / real-agent adoption change (V2b):
  1. Read `docs/planning/v2b-artifact-browser-real-adoption.md`, `docs/planning/v2a-artifact-retrieval-cli-loop.md`, and `docs/adr/0002-agent-owned-artifact-retrieval.md`.
  2. Reuse V2a `fetchArtifactView`; TUI `artifact_view` opens only on explicit Enter from finished result or trace.
  3. Keep `indbase://...` parsing and vault/database reads inside `E:\indbase`; consoler must not import indbase business logic.
  4. Do not add protocol changes, artifact content cache/storage, replay fetching, arbitrary URI fetch, downloads/media rendering, global artifact search, or natural language mapping.
  5. Keep default CI fake-agent based; real `E:\indbase` retrieval is local-only.
  6. Run focused TUI/runtime/agentctl/conformance/Python SDK checks, `uv run pytest tests/test_indbase_agent.py` from `E:\indbase`, typecheck, build, root test, `git diff --check`, and disposable `agentctl artifact-view` smoke.

- Artifact retrieval closeout change (V2c):
  1. Read `docs/planning/v2c-artifact-retrieval-closeout.md`, `docs/testing/v2-release-gate.md`, and `docs/testing/real-indbase-smokes.md`.
  2. Keep the change to local-only smoke coverage and docs unless validation exposes a real regression.
  3. Do not add protocol/runtime/TUI/CLI feature scope, artifact content persistence, default CI real-agent dependency, or natural language mapping.
  4. Extend `pnpm test:real-indbase-smoke` to prove real `agentctl artifact-view` against disposable `indbase://...` blocks.
  5. Document V2 artifact retrieval closeout and manual TUI smoke; keep detailed evidence out of `AGENTS.md`.
  6. Run `pnpm test:real-indbase-smoke`, `pnpm test:artifact-retrieval-smoke`, `pnpm test:v2-release-gate`, `pnpm typecheck`, `pnpm build`, `pnpm test`, `git diff --check`, and focused `E:\indbase` agent tests when real-agent coverage changes.

- TUI change:
  1. Add or update focused tests under `packages/tui/`.
  2. Verify behavior against recorded event replay.
  3. Run `agentctl` lifecycle checks if runtime behavior changed.
  4. Do a manual TUI smoke for form -> approval -> live events -> result -> replay.
  5. For artifact browsing, follow `docs/planning/v2b-artifact-browser-real-adoption.md` (Enter open, Esc back from `artifact_view`).

- Console Variant / product entrypoint change:
  1. Read `CONTEXT.md`, `docs/adr/0003-natural-language-intent-drafting.md`, and `docs/planning/v3a-console-variant-product-entrypoint.md`.
  2. Keep variant configuration checked in and product-curated; do not add user-facing agent install/search/marketplace UI.
  3. Keep protocol identifiers visible in `agentctl`, trace, JSON, conformance, and other audit/debug surfaces.
  4. Add focused TUI tests for product labels and variant entry, and runtime tests if history filtering changes.
  5. Run `pnpm --filter @consoler/tui test`, relevant focused runtime tests, `pnpm typecheck`, `pnpm build`, and `git diff --check`.

- Natural language Intent Drafting change:
  1. Read `CONTEXT.md`, `docs/adr/0003-natural-language-intent-drafting.md`, `docs/planning/v3a-console-variant-product-entrypoint.md`, and `docs/planning/v3b-natural-language-intent-drafting.md`.
  2. Keep `draftIntent({ text, scope })` pure and deterministic: no LLMs, network, filesystem reads, registry reads, agent spawn, or raw natural-language/Intent Draft persistence.
  3. Runtime consumes a neutral `IntentScope`; do not import `ConsoleVariantConfig` into runtime/protocol and do not add NL-only fields to `AgentManifest`.
  4. Candidate output uses `prefilled_args` to seed the editable schema form; it must not directly prepare, preview, approve, or execute.
  5. Use only first-version `needs_clarification` reason codes: `no_match`, `ambiguous_command`, `missing_required_args`, `ambiguous_args`, and `unsupported_schema`.
  6. Add focused runtime tests for matching, reason codes, schema limits, path ambiguity, and localized hints; add agentctl tests for human/`--json`; add TUI tests for variant-scoped NL entry, form prefill, and fallback.
  7. Run `pnpm --filter @consoler/runtime test`, `pnpm --filter @consoler/agentctl test`, `pnpm --filter @consoler/tui test`, `pnpm test:v3b-intent-gate`, `pnpm typecheck`, `pnpm build`, and `git diff --check`.

- Runtime intent mapper slice:
  1. Read `CONTEXT.md`, `docs/adr/0003-natural-language-intent-drafting.md`, `docs/planning/v3b-natural-language-intent-drafting.md`, and `docs/planning/v3b-runtime-intent-mapper.md`.
  2. Touch only `packages/runtime/src/intent-draft*.ts`, `packages/runtime/src/index.ts`, and focused runtime tests unless the brief exposes a necessary adjacent change.
  3. Do not edit `packages/protocol`, `packages/agentctl`, `packages/tui`, DB schema, registry code, or `E:\indbase`.
  4. Keep `draftIntent` pure: no registry/store/runtime instances, filesystem, process spawn, network, LLMs, or persistence.
  5. Test candidate output, all reason codes, schema support limits, path ambiguity, localized hints, and the `prefilled_args` public shape.
  6. Run `pnpm --filter @consoler/runtime test`, `pnpm --filter @consoler/runtime typecheck`, `pnpm typecheck`, and `git diff --check`.

- Agentctl intent-draft slice:
  1. Read `CONTEXT.md`, `docs/adr/0003-natural-language-intent-drafting.md`, `docs/planning/v3b-natural-language-intent-drafting.md`, `docs/planning/v3b-runtime-intent-mapper.md`, and `docs/planning/v3b-agentctl-intent-draft.md`.
  2. Touch only `packages/agentctl/src/`, `packages/agentctl/test/`, `scripts/test-agentctl-smoke.mjs`, and help/docs needed for the command.
  3. Do not edit `packages/tui`, `packages/protocol`, DB schema, Variant config, or `E:\indbase`; avoid runtime mapper changes unless a narrow bug is found.
  4. `intent-draft` may discover manifests to build `IntentScope`, but must not create actions, runs, approvals, events, traces, or history rows.
  5. Default output is human-readable; `--json` must emit stable runtime `IntentDraftResult` JSON. Both candidate and clarification outcomes exit 0.
  6. Run `pnpm --filter @consoler/agentctl test`, `pnpm --filter @consoler/agentctl typecheck`, `pnpm --filter @consoler/runtime test`, `pnpm build`, `pnpm test:agentctl-smoke`, `pnpm test`, `pnpm typecheck`, and `git diff --check`.

- TUI product intent entry slice:
  1. Read `CONTEXT.md`, `docs/adr/0003-natural-language-intent-drafting.md`, `docs/planning/v3a-console-variant-product-entrypoint.md`, `docs/planning/v3b-natural-language-intent-drafting.md`, `docs/planning/v3b-runtime-intent-mapper.md`, and `docs/planning/v3b-tui-product-intent-entry.md`.
  2. Touch only `packages/tui/src/variant-types.ts`, `packages/tui/src/variants/`, `packages/tui/src/app.tsx`, focused TUI helper files, and focused TUI tests unless a narrow runtime mapper bug is proven.
  3. Do not edit `packages/protocol`, `packages/agentctl`, DB schema, action lifecycle code, raw-input persistence, or `E:\indbase`.
  4. Product NL input must remain single-shot and variant-scoped; candidates only prefill the existing schema form and must not prepare, preview, approve, execute, or create history/trace data.
  5. Keep the explicit product action list as fallback and keep dev shell command selection generic.
  6. Run `pnpm --filter @consoler/tui test`, `pnpm --filter @consoler/tui typecheck`, `pnpm --filter @consoler/runtime test`, `pnpm test:v3b-intent-gate`, `pnpm build`, `pnpm test`, `pnpm typecheck`, and `git diff --check`.

- Assisted intent runtime/CLI slice:
  1. Read `CONTEXT.md`, `docs/adr/0003-natural-language-intent-drafting.md`, `docs/adr/0004-llm-assisted-intent-drafting.md`, `docs/planning/v3b-natural-language-intent-drafting.md`, and `docs/planning/v3c-assisted-intent-runtime-cli.md`.
  2. Keep `draftIntent({ text, scope })` pure and deterministic; add assisted orchestration as an opt-in path around it, not inside it.
  3. Touch only `packages/runtime/src/intent-draft*.ts`, `packages/runtime/src/index.ts`, `packages/agentctl/src/`, `packages/agentctl/test/`, focused runtime tests, gate scripts, and docs unless the brief exposes a necessary adjacent change.
  4. Do not edit `packages/protocol`, `packages/tui`, DB schema, action lifecycle persistence, `AgentManifest`, or `E:\indbase`.
  5. Use fake-provider coverage for default validation; do not require real provider credentials, network access, or private endpoint details in CI, docs, fixtures, snapshots, logs, PR descriptions, or release notes.
  6. Run `pnpm --filter @consoler/runtime test`, `pnpm --filter @consoler/agentctl test`, `pnpm test:v3c-assisted-intent-gate`, `pnpm typecheck`, `pnpm build`, and `git diff --check`.

- Assisted intent TUI slice:
  1. Read `CONTEXT.md`, `docs/adr/0003-natural-language-intent-drafting.md`, `docs/adr/0004-llm-assisted-intent-drafting.md`, `docs/planning/v3b-tui-product-intent-entry.md`, `docs/planning/v3c-assisted-intent-runtime-cli.md`, and `docs/planning/v3c-assisted-intent-tui-entry.md`.
  2. Keep assisted product TUI opt-in explicit: require `CONSOLER_TUI_ASSISTED_INTENT=1` plus provider config before sending user input to a provider.
  3. Touch only `packages/tui/src/`, focused TUI tests, shared provider-config helper files if needed, agentctl regression tests if helper behavior moves, gate scripts, and docs unless the brief exposes a necessary adjacent change.
  4. Do not edit `packages/protocol`, DB schema, action lifecycle persistence, `AgentManifest`, dev-shell command selection behavior, or `E:\indbase`.
  5. Use fake-provider or injected-provider coverage for default validation; do not require real provider credentials, network access, private endpoint details, or provider-specific fixtures in CI, docs, snapshots, logs, PR descriptions, or release notes.
  6. Run `pnpm --filter @consoler/tui test`, `pnpm --filter @consoler/runtime test`, `pnpm --filter @consoler/agentctl test` if shared provider helper behavior changes, `pnpm test:v3c-tui-assisted-intent-gate`, `pnpm test:v3c-assisted-intent-gate`, `pnpm typecheck`, `pnpm build`, and `git diff --check`.

- Versioned Python Agent SDK:
  1. Read `CONTEXT.md`, `docs/adr/0001-agent-protocol-v0-boundaries.md`, `docs/adr/0005-versioned-python-agent-sdk.md`, and `docs/planning/v4a-versioned-python-agent-sdk.md`.
  2. Touch only `sdks/python`, package smoke/publish scripts, root package scripts, CI gate wiring, and docs unless a package smoke exposes a narrow integration bug.
  3. Keep the published package to Python `consoler-agent-sdk`; do not publish TypeScript packages, change protocol schemas, bump protocol version, alter runtime/TUI/agentctl behavior, or edit `E:\indbase`.
  4. Keep SDK runtime dependencies empty unless a focused SDK bug proves one is necessary.
  5. Do not commit private package index URLs, credentials, tokens, or upload logs. Default CI must build/check/install-smoke only and must not upload.
  6. Run `pnpm test:python-sdk`, the new package gate once implemented, `pnpm test:conformance`, `pnpm test:v2-release-gate`, `pnpm typecheck`, `pnpm build`, `pnpm test`, and `git diff --check`.

- Indbase Source Trust Probe:
  1. Read `CONTEXT.md`, `docs/adr/0006-product-variants-keep-agent-specific-ui-boundaries.md`, `docs/planning/v3a-console-variant-product-entrypoint.md`, `docs/planning/v4b-indbase-source-trust-probe.md`, and `E:\indbase\docs\planning\v0.3.2.3-consoler-source-trust-probe.md`.
  2. Touch only `packages/tui/src/variants/`, `packages/tui/src/variant-types.ts`, `packages/tui/src/app.tsx`, focused TUI tests, and docs unless a focused bug proves adjacent TUI helper changes are needed.
  3. Do not edit protocol/runtime/store/transport/schema, Python SDK packaging, or `E:\indbase` from this repo.
  4. Keep all commands on the existing action lifecycle; do not add direct execution, new renderers, full vault browser, Web UI, category/tag mutation UI, or default CI real-agent dependency.
  5. Run `pnpm --filter @consoler/tui test`, `pnpm typecheck`, `pnpm build`, and `git diff --check`; run optional real indbase smoke only after the adapter is available.

- Indbase Probe Stabilization:
  1. Read `CONTEXT.md`, `docs/adr/0006-product-variants-keep-agent-specific-ui-boundaries.md`, `docs/planning/v4b-indbase-source-trust-probe.md`, `docs/planning/v4c-indbase-probe-stabilization.md`, `docs/testing/real-indbase-smokes.md`, and `E:\indbase\docs\planning\v0.3.2.3a-consoler-probe-stabilization.md`.
  2. Touch only `packages/conformance/`, `packages/agentctl/`, real indbase smoke scripts, focused tests, and docs unless a focused bug proves adjacent runtime helper changes are needed.
  3. Do not edit protocol schemas, runtime action lifecycle semantics, Python SDK packaging, TUI product UI, or `E:\indbase` from this repo.
  4. Keep default CI fake-agent safe; real indbase and real swallow checks must remain local-only or explicitly environment-gated.
  5. Run `pnpm --filter @consoler/conformance test`, `pnpm --filter @consoler/agentctl test`, `pnpm test:real-indbase-smoke`, `pnpm typecheck`, `pnpm build`, and `git diff --check`; run `pnpm --filter @consoler/tui test` if variant-facing behavior changes.

- Indbase Dogfood UX Variant:
  1. Read `CONTEXT.md`, `docs/adr/0006-product-variants-keep-agent-specific-ui-boundaries.md`, `docs/planning/v4b-indbase-source-trust-probe.md`, `docs/planning/v4c-indbase-probe-stabilization.md`, `docs/planning/v4d-indbase-dogfood-ux.md`, and `E:\indbase\docs\planning\v0.3.2.3c-consoler-variant-dogfood-ux.md`.
  2. Touch only `packages/tui/src/variants/`, `packages/tui/src/variant-types.ts`, `packages/tui/src/app.tsx`, variant display/artifact helpers, focused TUI tests, gate scripts, and docs unless a focused test proves an adjacent TUI helper change is needed.
  3. Do not edit protocol schemas, runtime lifecycle/store/replay semantics, Python SDK packaging, or `E:\indbase` from this repo.
  4. Keep `vault_path` memory session-local; do not add vault discovery, vault browser, persisted preferences, or history/cwd-derived defaults.
  5. Keep NL/intent drafting out of the v4d completion path; do not add LLM calls, chat, generated answers, retrieval packages, or indbase mutations.
  6. Run `pnpm --filter @consoler/tui test`, the v4d gate once implemented, `pnpm typecheck`, `pnpm build`, and `git diff --check`; run `pnpm test:real-indbase-smoke` only as local-only or explicitly environment-gated coverage.

- Indbase Variant Intent Drafting:
  1. Read `CONTEXT.md`, `docs/adr/0003-natural-language-intent-drafting.md`, `docs/adr/0006-product-variants-keep-agent-specific-ui-boundaries.md`, `docs/planning/v3b-natural-language-intent-drafting.md`, `docs/planning/v3b-runtime-intent-mapper.md`, `docs/planning/v3b-tui-product-intent-entry.md`, `docs/planning/v4d-indbase-dogfood-ux.md`, `docs/planning/v4e-indbase-variant-intent-drafting.md`, and `E:\indbase\docs\planning\v0.3.2.3d-indbase-variant-intent-drafting.md`.
  2. Touch only `packages/runtime/src/intent-draft*.ts`, focused runtime tests, `packages/tui/src/variants/indbase.ts`, `packages/tui/src/intent-scope.ts`, `packages/tui/src/app.tsx`, focused TUI tests, gate scripts, and docs unless a focused test proves an adjacent bug.
  3. Do not edit protocol schemas, runtime lifecycle/store/replay semantics, Python SDK packaging, provider setup, or `E:\indbase` implementation files from this repo.
  4. Keep intent drafting deterministic, single-shot, variant-scoped, and form-prefill only; do not prepare, preview, approve, execute, persist raw NL, or create history/trace from NL submit.
  5. Keep session `vault_path` as TUI form-layer convenience only; runtime `draftIntent` must not infer from session state, cwd, history, filesystem, trace, artifacts, or previous results.
  6. Run `pnpm --filter @consoler/runtime test`, `pnpm --filter @consoler/tui test`, the V4e gate once implemented, `pnpm test:v3b-intent-gate`, `pnpm typecheck`, `pnpm build`, and `git diff --check`; run V3c assisted gates only if shared assisted paths are touched.

## Architecture Constraints

- `consoler` never imports agent business logic. Agents are always out-of-process.
- The first real agent is `indbase`, but `consoler` must remain business-agnostic.
- Product-facing TUI entrypoints must enter through a checked-in Console Variant and host-product action labels; generic agent or command selection belongs to the development shell or audit/debug surfaces.
- Console Variants may curate one agent or a product-specific agent set, but ordinary users must not install, search, or choose arbitrary agents inside the product TUI.
- Product variants own labels, ordering, hints, and scoped navigation only; agent-specific URI parsing, vault reads, and business rules stay in the owning agent adapter.
- Variant-scoped history and action launch must respect the variant's allowed agent/command scope; trace, JSON, replay, and `agentctl` may expose raw protocol identifiers for auditability.
- Natural-language Intent Drafting is an acceleration path only: it must remain deterministic, ephemeral, variant-scoped, and reviewable through the existing schema form.
- `draftIntent({ text, scope })` is a pure runtime helper; product hints flow through `IntentScope`, while `ConsoleVariantConfig` stays outside runtime/protocol.
- LLM-assisted Intent Drafting is opt-in and deterministic-first: provider suggestions must be validated into the existing reviewable Intent Drafting result shape, and private provider configuration must not be committed or leaked.
- Product TUI assisted drafting requires explicit local opt-in and should only show transient non-sensitive notices, not persistent provider status or provider configuration.
- Python Agent SDK package versions are separate from consoler wire `protocol_version`; SDK releases declare protocol compatibility instead of replacing manifest protocol versioning.
- Intent candidates use `prefilled_args` and must not bypass `ActionDraft`, validation, plan, preview, approval, or execute.
- Agent code must not inject frontend code. Agents return schemas, events, artifacts, and renderable blocks only.
- LLM intent mapping is out of v0. LLMs must never bypass ActionDraft, validation, plan, preview, approval, and execute.
- Preview is part of the action lifecycle. If a preview reads or mutates real environment state, model and approve it explicitly.
- Approval binds normalized args, plan, context snapshot, side effects, and preview hash when present.
- Execution output is a structured event stream. Do not treat logs as progress.
- History, trace, and replay are read-only. They must not spawn agents or re-read vault/source state.
- Conformance checks must use out-of-process agents and isolated temp runtime roots; they must not pollute the developer's `.consoler` store.
- Artifact blocks are references in V1d; consoler must not dereference `uri` values except through V2a+ `fetchArtifactView(action_id, block_id)` on explicit user action (TUI Enter or `agentctl artifact-view`).
- V1e real agent artifact blocks use logical `indbase://...` references; they still do not grant consoler ownership of indbase artifact storage or file access.
- V1f cancel is cooperative only: a cancel request is not a cancelled terminal state until the agent emits `action.cancelled`.
- V1g TUI cancel sends only a cancel request; the TUI must wait for agent-emitted `action.cancelled` before showing a cancelled terminal state.
- V1h interactions are live transport responses only: persist `interaction.required` as an event, but do not persist user responses unless a newer planning doc changes scope.
- V1i persists interaction responses for trace/debugging only; replay must remain accepted-events-only.
- V1j makes `agentctl run` a live interaction client, but the runtime still owns interaction validation, response routing, persistence, and terminal state.
- V1k interaction timeouts are runtime-owned; timeout abort is an action failure, while skip/continue are explicit agent-visible timeout results.
- V1l interaction redaction protects persisted trace/history data only; it must not change the live response delivered to the agent process.
- V1m real indbase interactions must reuse the existing interaction protocol; duplicate `skip` is a successful business result and must not run the write-oriented ingest pipeline.
- V1n strong runtime control remains protocol-compatible: `epoch` stays `0`; runtime force-kill records a run-level failed control error and must not create fake terminal events.
- V1o real indbase cooperative cancel is a real-agent adoption step: `indbase.ingest_file` may add pipeline checkpoints, but consoler protocol/runtime/TUI/SDK semantics remain unchanged.
- V1p closes V1 feature work; new protocol/runtime/TUI capabilities should start a later version plan.
- V1q real indbase smokes are local-only disposable-vault checks; they must not become default CI without a provisioned real-agent environment.
- V2a artifact retrieval is a user-triggered read flow owned by the artifact-producing agent; it is not an Action, not replay, and not consoler-owned artifact storage.
- V2b adds Ink `artifact_view` and real `indbase` `get_artifact_view`; consoler still calls only `fetchArtifactView(action_id, block_id)` and never stores retrieved content.
- V2c is closeout-only for artifact retrieval/browser; do not use it to add downloads, media rendering, pagination, global artifact search, arbitrary URI fetch, or NL mapping.
- v0 is a strict subset for `indbase.doctor`; do not implement future platform features unless the current task explicitly changes scope.
- V1a `indbase.ingest_file` is the only approved side-effect expansion path. It is single-file only unless a newer planning doc changes scope.

## Do Not Edit Unless Explicitly Asked

- `E:\indbase` unrelated files.
- Generated outputs, dependency directories, or build artifacts such as `node_modules/`, `dist/`, `coverage/`, `.consoler/consoler.db`.
- Lockfiles unrelated to the current dependency or scaffold change.
- Agent business implementation inside `consoler`; use adapter protocol boundaries instead.

## Deep Context Index

- `docs/adr/0001-agent-protocol-v0-boundaries.md`: accepted v0 architecture boundaries and non-goals.
- `docs/adr/0002-agent-owned-artifact-retrieval.md`: V2a boundary for agent-owned artifact retrieval.
- `docs/adr/0003-natural-language-intent-drafting.md`: accepted first-version boundary for deterministic natural language Intent Drafting.
- `docs/adr/0005-versioned-python-agent-sdk.md`: accepted boundary for private/internal Python Agent SDK package versioning and upload safety.
- `docs/adr/0006-product-variants-keep-agent-specific-ui-boundaries.md`: accepted boundary for product variants versus agent-owned business logic.
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
- `docs/planning/v1k-interaction-timeout-policy.md`: runtime-owned interaction timeout policy brief.
- `docs/planning/v1l-interaction-response-redaction.md`: opt-in persisted interaction response redaction brief.
- `docs/planning/v1m-real-indbase-interaction-adoption.md`: real `indbase.ingest_file` duplicate interaction adoption brief.
- `docs/planning/v1n-strong-runtime-control.md`: runtime-only action lock, cancel timeout, and force-kill fallback brief.
- `docs/planning/v1o-real-indbase-cooperative-cancel.md`: real `indbase.ingest_file` pipeline checkpoint adoption brief.
- `docs/planning/v1p-v1-stabilization-release-gate.md`: V1 stabilization and release gate execution brief.
- `docs/testing/v1-release-gate.md`: V1 acceptance matrix, CI gates, local-only smokes, and V2+ exclusions.
- `docs/testing/v2-release-gate.md`: V2 fake-agent release gate, CI gates, and local-only real-agent exclusions.
- `docs/testing/v2-artifact-retrieval-closeout.md`: V2 artifact retrieval/browser closeout, frozen surface, and manual TUI smoke recipe.
- `docs/testing/v3b-intent-gate.md`: V3b intent drafting acceptance gate (runtime mapper, agentctl, TUI NL entry).
- `docs/planning/v1q-real-indbase-local-smokes.md`: local-only real indbase disposable smoke execution brief.
- `docs/testing/real-indbase-smokes.md`: command and coverage for local real indbase smoke runs.
- `docs/testing/v1-closeout.md`: V1 frozen surface, validation evidence, and V2 entry criteria.
- `docs/planning/v2a-artifact-retrieval-protocol-contract.md`: protocol-only first step for V2a artifact retrieval.
- `docs/planning/v2a-artifact-retrieval-cli-loop.md`: runtime, SDK/fake-agent, conformance, and `agentctl artifact-view` execution brief.
- `docs/planning/v2a-artifact-retrieval-browser.md`: generic artifact retrieval and browser execution brief.
- `docs/planning/v2b-artifact-browser-real-adoption.md`: TUI artifact browser and local-only real `indbase` retrieval adoption brief.
- `docs/planning/v2c-artifact-retrieval-closeout.md`: artifact retrieval/browser closeout brief for real local smoke coverage and testing docs.
- `docs/planning/v3a-console-variant-product-entrypoint.md`: Console Variant product entrypoint, indbase-adapted TUI surface, scoped history, and acceptance criteria.
- `docs/planning/v3b-natural-language-intent-drafting.md`: deterministic intent mapper, `agentctl intent-draft`, variant-scoped TUI natural-language entry, and validation plan.
- `docs/planning/v3b-runtime-intent-mapper.md`: runtime-only deterministic intent mapper slice, public result shape, matching rules, and focused runtime tests.
- `docs/planning/v3b-agentctl-intent-draft.md`: CLI-only `agentctl intent-draft` slice, human/JSON output, scope construction, and smoke coverage.
- `docs/planning/v3b-tui-product-intent-entry.md`: TUI-only product NL entry slice, variant `intentHints`, `IntentScope` helper, form prefill behavior, and focused tests.
- `docs/planning/v3c-assisted-intent-runtime-cli.md`: runtime/CLI assisted intent slice, provider interface, fake-provider gate, `agentctl intent-draft --assist`, fallback behavior, and provider secret hygiene.
- `docs/testing/v3c-assisted-intent-gate.md`: fake-provider V3c gate and local-only provider smoke boundary.
- `docs/planning/v3c-assisted-intent-tui-entry.md`: product TUI assisted intent slice, explicit local opt-in, transient notices, fake-provider TUI tests, and dev-shell boundary.
- `docs/testing/v3c-tui-assisted-intent-gate.md`: fake-provider TUI gate and local-only product TUI provider smoke boundary.
- `docs/planning/v4a-versioned-python-agent-sdk.md`: Python Agent SDK package metadata, wheel/sdist build, install smoke, dry-run publish script, CI gate, and private index boundary.
- `docs/planning/v4b-indbase-source-trust-probe.md`: consoler-side product variant execution brief for the indbase Source Trust Loop probe.
- `docs/planning/v4c-indbase-probe-stabilization.md`: consoler-side conformance and local smoke stabilization for the indbase Source Trust Loop.
- `docs/planning/v4d-indbase-dogfood-ux.md`: consoler-side product UX execution brief for the indbase Source Trust Loop walkthrough.
- `docs/testing/v4d-indbase-dogfood-ux-closeout.md`: V4d validation evidence, frozen surface, and boundary check.
- `docs/planning/v4e-indbase-variant-intent-drafting.md`: deterministic indbase variant Source Trust Loop intent drafting execution brief.
- `docs/testing/v4e-indbase-variant-intent-drafting.md`: V4e gate coverage, boundaries, and closeout checklist.

## Done Means

Before final response, report:

- Files changed.
- Commands run and results.
- Checks not run and why.
- Remaining risks or unknowns.
