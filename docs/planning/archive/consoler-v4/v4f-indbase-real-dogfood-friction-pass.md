---
doc_type: phase_plan
phase_id: v4f-indbase-real-dogfood-friction-pass
title: Task execution brief: V4f Indbase Real Dogfood Friction Pass
status: completed
canonical: false
read_by_default: false
superseded_by: null
---

# Task execution brief: V4f Indbase Real Dogfood Friction Pass

Run an evidence-first closeout and UX friction pass for the indbase Console Variant after V4d dogfood UX and V4e deterministic intent drafting.

## Objective

`pnpm tui:indbase --` should be dogfoodable through the existing Source Trust Loop without confusing the user or hiding trust state.

The phase path is:

```text
baseline real dogfood
-> friction register
-> narrow existing-surface fixes
-> deterministic V4f gate
-> local real indbase smoke
-> manual TUI checklist when possible
-> closeout evidence
```

V4f is a closeout and friction-fix phase. It is not a new feature phase.

## Scope

In scope:

- baseline dogfood using disposable synthetic indbase vault state
- optional privacy-preserving real or semi-real vault dogfood
- a V4f friction register with fixed, deferred, and out-of-scope findings
- product TUI copy, form, navigation, artifact, error-state, test, and docs fixes
- deterministic TUI regression coverage for fixed friction
- a V4f gate script and package script, after implementation
- local-only real indbase smoke and product TUI smoke evidence
- manual `pnpm tui:indbase --` checklist evidence when a real interactive terminal is available
- closeout docs and `AGENTS.md` route updates
- narrow `E:\indbase` adapter bug fixes only if real dogfood proves a contract defect

Out of scope:

- consoler protocol schemas, runtime lifecycle, runtime store schema, replay semantics, transport, or Python SDK behavior
- new Source Trust Loop commands
- `E:\indbase` core implementation
- indbase commands, migrations, durable UX state, or vault preference storage
- title/path lookup
- vault discovery, vault list, vault browser, source browser, full source viewer, or artifact gallery
- review/category/tag mutation UI
- doctor repair
- retrieval packages, embeddings, `ask`, generated answers, chat, or multi-action workflows
- NL v2, broader semantic parsing, "latest result" inference, or default LLM/assisted intent
- persisted raw natural language, private vault evidence, screenshots with private content, temp vaults, runtime SQLite files, or local path secrets
- default CI dependency on `E:\indbase`, private vaults, real swallow, manual TUI, or network access

## Start Here

Read:

- `CONTEXT.md`
- `docs/adr/0006-product-variants-keep-agent-specific-ui-boundaries.md`
- `docs/planning/archive/consoler-v4/v4d-indbase-dogfood-ux.md`
- `docs/testing/archive/consoler-v4/v4d-indbase-dogfood-ux-closeout.md`
- `docs/planning/archive/consoler-v4/v4e-indbase-variant-intent-drafting.md`
- `docs/testing/archive/consoler-v4/v4e-indbase-variant-intent-drafting.md`
- `docs/testing/real-indbase-smokes.md`
- `E:\indbase\docs\planning\v0.3.2.3e-source-trust-real-dogfood-friction-pass.md`
- `E:\indbase\docs\agents\v0.3.2.3e-source-trust-real-dogfood-friction-pass\AGENT.md`

Inspect before editing:

```powershell
rg -n "indbaseVariant|tui:indbase|artifact_view|vault_path|history|trace|intent|real-indbase" packages/tui scripts docs package.json
rg -n "test:v4d-indbase-dogfood-ux|test:v4e-indbase-variant-intent-drafting|test:real-indbase-smoke" package.json scripts docs
```

Primary files:

- `packages/tui/src/variants/indbase.ts`
- `packages/tui/src/app.tsx`
- `packages/tui/src/variant-display.ts`
- `packages/tui/src/result-blocks-panel.tsx`
- `packages/tui/src/artifact-view-panel.tsx`
- `packages/tui/src/intent-scope.ts`
- `packages/tui/test/indbase-variant-flow.test.tsx`
- `packages/tui/test/real-indbase-product-tui-smoke.test.tsx`
- `packages/tui/test/variant-contract.test.ts`
- `scripts/test-real-indbase-smoke.mjs`
- `package.json`
- `docs/testing/real-indbase-smokes.md`
- planned closeout/testing doc for V4f

## Friction Register

Create or update a V4f closeout/testing doc with this register shape:

| Field | Meaning |
| --- | --- |
| `id` | Stable finding id, for example `v4f-friction-001`. |
| `scenario` | Source Trust Loop path where the issue appeared. |
| `evidence` | Automated smoke, manual checklist step, screenshot description, or reproduction steps. |
| `impact` | `blocker`, `confusing`, `repetitive`, or `cosmetic`. |
| `allowed_fix_class` | `copy`, `form`, `navigation`, `artifact`, `error-state`, `test`, `docs`, or `adapter-bug`. |
| `owner_repo` | `consoler` or `indbase`. |
| `status` | `recorded`, `fixed`, `deferred`, or `not_in_scope`. |
| `verification` | Test name, command, manual retest step, or deferred reason. |

Rules:

- Fix blockers unless the needed change is out of scope and must become a future phase.
- Fix confusing items or give a clear deferred reason.
- Fix repetitive items only when high-frequency or low-cost.
- Do not let cosmetic items block closeout.
- Do not implement a change unless it maps to a register item.

## Privacy Rules

Allowed closeout evidence:

- date and command names
- whether a run used disposable, semi-real, or real vault state
- redacted action id prefixes when useful
- behavior-only friction descriptions
- test names and results

Forbidden committed evidence:

- private vault paths
- source excerpts
- private filenames or titles
- private tag/category names
- raw trace JSON with private args or metadata
- runtime SQLite files
- logs containing private data
- screenshots with private content
- generated temp vaults or smoke roots

If a private-vault-only issue matters, reproduce it with a sanitized synthetic fixture before adding automated coverage.

## Do Not Touch

- Do not edit `packages/protocol` schemas or validators.
- Do not edit runtime lifecycle, approval, history, trace, replay, transport, or store schema.
- Do not edit `sdks/python`.
- Do not add new agent manifest protocol fields.
- Do not add direct execution, auto-approval, or action history from NL submit.
- Do not add persistent vault preferences or history/cwd-derived defaults.
- Do not add title/path lookup or object lookup from trace/history/latest result.
- Do not commit private data, smoke roots, `.consoler/consoler.db`, `node_modules/`, `dist/`, or `coverage/`.
- Do not edit `E:\indbase` implementation files unless a focused real-dogfood finding proves an adapter defect.

## Steps

1. Establish phase isolation.
   - Start from the closed V4e/3d state or a clearly documented branch base.
   - Do not mix V4f into the V4e intent-drafting PR scope.

2. Run baseline automated dogfood.
   - Run the deterministic V4d and V4e gates.
   - Run real indbase local smoke with a kept temp root when possible.
   - Run `real-indbase-product-tui-smoke.test.tsx` against the kept root when possible.
   - Record skipped real-agent evidence honestly with the environment reason.

3. Run the manual checklist when possible.
   - Use `CONSOLER_KEEP_REAL_INDBASE_SMOKE=1 pnpm test:real-indbase-smoke`.
   - Open `pnpm tui:indbase --` with the printed `CONSOLER_ROOT`.
   - Check vault health.
   - Import or inspect prepared source state.
   - Search trusted sources.
   - Open document artifact.
   - Inspect review, task, error, and doctor views.
   - Open history/trace.
   - Open an artifact from trace and return.
   - Try one deterministic NL prefill and confirm it opens an editable form, not execution.
   - Record friction without private content.

4. Build the friction register.
   - Record every finding before fixing.
   - Classify impact and allowed fix class.
   - Mark out-of-scope items explicitly instead of stretching V4f.

5. Implement allowed fixes.
   - Keep changes in `packages/tui` unless a test proves an adjacent helper bug.
   - Prefer copy, focus, form, empty-state, artifact, and navigation fixes.
   - Keep the ten-command action surface unchanged.
   - Keep session `vault_path` prefill session-local and editable.
   - Keep deterministic intent drafting as form prefill only.

6. Add regression coverage.
   - Add focused TUI tests for fixed friction.
   - Strengthen `real-indbase-product-tui-smoke.test.tsx` only for behavior that can be tested without private data.
   - Add or update copy hygiene tests when copy changes.
   - Do not make real indbase or manual TUI required in default CI.

7. Add a V4f gate.
   - Add a root script such as `scripts/test-v4f-indbase-real-dogfood-friction-pass.mjs`.
   - Add `test:v4f-indbase-real-dogfood-friction-pass` to `package.json`.
   - Gate should run deterministic TUI tests that cover V4f fixed friction.
   - Gate may print local-only smoke instructions but must not require real indbase by default.

8. Update docs.
   - Add a V4f testing/closeout doc after implementation evidence exists.
   - Update `docs/testing/real-indbase-smokes.md` if the manual TUI recipe changes.
   - Update `AGENTS.md` route entries.
   - Coordinate closeout notes with `E:\indbase\docs\project-status.md` and `E:\indbase\docs\testing.md`.

## Validation

Required V4f checks after implementation:

```powershell
pnpm --filter @consoler/tui test
pnpm test:v4f-indbase-real-dogfood-friction-pass
pnpm test:v4e-indbase-variant-intent-drafting
pnpm test:v4d-indbase-dogfood-ux
pnpm typecheck
pnpm build
git diff --check
```

Run if intent/runtime helpers are touched, which should usually not happen:

```powershell
pnpm --filter @consoler/runtime test
pnpm test:v3b-intent-gate
```

Run only as local-only evidence:

```powershell
CONSOLER_KEEP_REAL_INDBASE_SMOKE=1 pnpm test:real-indbase-smoke
pnpm exec vitest run packages/tui/test/real-indbase-product-tui-smoke.test.tsx
pnpm tui:indbase --
```

Cross-repo coordination checks when `E:\indbase` docs are updated:

```powershell
cd E:\indbase
git diff --check
```

If any indbase adapter code is touched:

```powershell
cd E:\indbase
uv run python -m pytest tests/test_indbase_agent.py tests/test_indbase_agent_readonly_views.py -q
uv run python scripts/v0323a_probe_stabilization_release_gate.py
uv run python scripts/v0323b_consoler_readonly_views_release_gate.py
uv run python -m compileall -q src tests scripts
```

## Done Means

- Baseline dogfood evidence was collected before fixes, or a clear environment skip reason was recorded.
- The friction register lists all discovered findings.
- Every code change maps to a register item.
- Blockers are fixed or explicitly deferred as future-phase work.
- Confusing findings are fixed or clearly deferred.
- Fixed friction has deterministic regression coverage or manual retest evidence.
- Private-vault evidence is redacted and not committed.
- V4f deterministic gate passes.
- V4d and V4e gates still pass.
- Real indbase smoke passes or records a clear local-only skip reason.
- Manual `pnpm tui:indbase --` checklist is completed or records a clear PTY/environment skip reason.
- No new Source Trust Loop command, protocol/runtime/store/schema behavior, Python SDK behavior, Web UI, vault browser, source browser, review/category/tag mutation, retrieval package, `ask`, embedding, generated answer, default LLM behavior, or indbase core feature was added.

## Unknowns

- Whether a manually typed TUI session will reveal focus or terminal behavior not covered by the current Ink smoke tests.
- Whether the current real smoke root exposes enough review/task/error artifacts for a useful manual checklist, or whether the disposable fixture needs better synthetic operational state.
- Whether V4f should add a dedicated testing doc immediately after implementation, or fold closeout evidence into the existing real-indbase smoke doc plus V4f plan closeout section.

## Closeout Evidence

Latest closeout: 2026-06-06.

Implementation summary:

- Terminal-facing control hints in touched TUI surfaces now use ASCII copy for Windows/PowerShell stability.
- The local-only real product TUI smoke now verifies deterministic NL search form prefill with an explicit disposable vault path and does not execute from NL submit.
- Added `pnpm test:v4f-indbase-real-dogfood-friction-pass`.
- Added `docs/testing/archive/consoler-v4/v4f-indbase-real-dogfood-friction-pass.md` as the V4f friction register and closeout record.

Validation:

```text
pnpm --filter @consoler/tui test
  -> 14 test files passed, 1 skipped; 54 tests passed, 1 skipped
pnpm test:v4f-indbase-real-dogfood-friction-pass
  -> V4f indbase real dogfood friction pass gate passed
pnpm test:v4e-indbase-variant-intent-drafting
  -> V4e indbase variant intent drafting gate passed
pnpm test:v4d-indbase-dogfood-ux
  -> V4d indbase dogfood UX gate passed
pnpm typecheck
  -> passed
pnpm build
  -> passed
CONSOLER_KEEP_REAL_INDBASE_SMOKE=1 pnpm test:real-indbase-smoke
  -> real indbase smoke passed
pnpm exec vitest run packages/tui/test/real-indbase-product-tui-smoke.test.tsx
  -> 1 test passed
```

Manual `pnpm tui:indbase --` was not run in this Codex shell because there is no reliable interactive PTY. The automated Ink smoke must not be described as a manually typed TUI session.

Boundary check: V4f did not add protocol schema changes, runtime lifecycle/store/replay changes, Python SDK behavior, new indbase commands, `E:\indbase` core changes, vault browser, source browser, Web UI, mutation UI, retrieval packages, `ask`, embeddings, generated answers, default LLM behavior, or NL v2.
