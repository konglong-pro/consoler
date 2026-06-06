# Task execution brief: V4g Indbase NL v2 Intent Drafting

Add opt-in assisted intent drafting for the indbase Console Variant after V4f real Source Trust Loop dogfood closeout.

## Objective

`pnpm tui:indbase --` should keep the deterministic/offline path as the default, while allowing a locally opted-in assisted provider to help when deterministic drafting cannot produce a complete indbase Source Trust Loop draft.

The product path is:

```text
product home NL input
-> deterministic draftIntent({ text, scope }) first
-> if deterministic is insufficient and assisted is explicitly enabled, call provider
-> validate provider suggestion against the scoped indbase Source Trust Loop
-> open one editable schema form with prefilled_args, or fall back to deterministic clarification
-> existing prepare / preview / approval / execute lifecycle only after user submits the form
```

V4g is still Intent Drafting. It is not chat, `ask`, direct execution, latest-result inference, or workflow automation.

## Scope

In scope:

- indbase Console Variant assisted drafting behind explicit local opt-in
- deterministic-first orchestration and fake-provider validation
- provider request context audit for the indbase variant
- stricter provider suggestion validation for paths, object IDs, governed filters, query strings, numeric fields, enums, and message hygiene
- TUI assisted success/fallback notices that do not expose provider internals
- form-layer merge of session-local `vault_path` after a candidate or partial candidate is selected
- focused runtime, agentctl, and TUI tests
- a V4g gate script and package script
- CI gate wiring after the gate exists
- docs and `AGENTS.md` route updates
- optional local-only real provider smoke with redacted evidence

Out of scope:

- default assisted/LLM behavior
- provider setup UI, provider marketplace, persisted provider preferences, per-vault assisted preferences, or provider status panels
- new Source Trust Loop commands
- multi-action drafts, queued workflows, follow-up suggestions, or "import then search" automation
- chat, multi-turn clarification, `ask`, generated answers, retrieval packages, embeddings, or semantic search
- latest-result, previous-result, history, trace, artifact, cwd, filesystem, vault DB, or source-content inference
- provider access to session-local `vault_path`, action history, trace records, artifact blocks, artifact metadata, previous results, vault database content, source snippets, file contents, cwd, or environment-derived vault discovery
- protocol schemas, runtime lifecycle semantics, runtime store schema, replay semantics, transport, Python SDK behavior, or agent manifest protocol fields
- `E:\indbase` core, adapter commands, migrations, indbase natural-language parsing, review/category/tag mutations, doctor repair, Web UI, vault browser, or source browser
- default CI dependency on a real provider, network access, real `E:\indbase`, private vaults, real swallow, or manual TUI

## Start Here

Read:

- `CONTEXT.md`
- `docs/adr/0003-natural-language-intent-drafting.md`
- `docs/adr/0004-llm-assisted-intent-drafting.md`
- `docs/adr/0006-product-variants-keep-agent-specific-ui-boundaries.md`
- `docs/adr/0007-indbase-nl-v2-intent-drafting.md`
- `docs/planning/v3c-assisted-intent-runtime-cli.md`
- `docs/planning/v3c-assisted-intent-tui-entry.md`
- `docs/planning/v4e-indbase-variant-intent-drafting.md`
- `docs/planning/v4f-indbase-real-dogfood-friction-pass.md`
- `E:\indbase\docs\planning\v0.3.2.3f-indbase-nl-v2-intent-drafting.md`
- `E:\indbase\docs\agents\v0.3.2.3f-indbase-nl-v2-intent-drafting\AGENT.md`

Inspect before editing:

```powershell
rg -n "draftIntentAssisted|suggestionToIntentResult|LlmIntentProvider|assist_notice|prefilled_args|message" packages/runtime packages/agentctl packages/tui
rg -n "resolveProductAssistedIntent|CONSOLER_TUI_ASSISTED_INTENT|assistedIntent|indbaseVariant|vault_path|intentHints" packages/tui packages/runtime docs scripts package.json
rg -n "test:v3c-assisted-intent-gate|test:v3c-tui-assisted-intent-gate|test:v4e-indbase-variant-intent-drafting|test:v4f-indbase-real-dogfood-friction-pass" package.json scripts docs
```

Primary files:

- `packages/runtime/src/intent-draft-assisted.ts`
- `packages/runtime/src/intent-draft-assisted-types.ts`
- `packages/runtime/src/intent-draft-http-provider.ts`
- `packages/runtime/src/intent-draft-provider-config.ts`
- `packages/runtime/test/intent-draft-assisted.test.ts`
- `packages/agentctl/src/intent-draft-run.ts`
- `packages/agentctl/src/intent-draft.ts`
- `packages/agentctl/test/intent-draft.test.ts`
- `packages/tui/src/assisted-intent.ts`
- `packages/tui/src/app.tsx`
- `packages/tui/src/intent-scope.ts`
- `packages/tui/src/variants/indbase.ts`
- `packages/tui/test/assisted-intent-flow.test.tsx`
- `packages/tui/test/indbase-variant-flow.test.tsx`
- `packages/tui/test/real-indbase-product-tui-smoke.test.tsx`
- `scripts/test-v4g-indbase-nl-v2-intent-drafting.mjs`
- `package.json`

Do not edit `packages/protocol`, `sdks/python`, runtime store migrations, transport, replay, or `E:\indbase` implementation files for V4g.

## Accepted Decisions

### Default path

The normal indbase TUI remains deterministic and offline.

```text
CONSOLER_TUI_ASSISTED_INTENT unset
-> deterministic only
-> no provider call
-> no assisted notice
```

A configured provider endpoint alone must not send user input to a provider.

```text
provider URL configured, flag unset
-> deterministic only
-> no provider call
-> no assisted notice
```

When the user explicitly enables assisted drafting but no provider is available, show a non-sensitive fallback notice.

```text
CONSOLER_TUI_ASSISTED_INTENT=1, provider missing
-> deterministic fallback
-> assisted_unavailable notice
```

### Deterministic first

If deterministic drafting returns a complete candidate, do not call the provider and do not let the provider rewrite the candidate.

Assisted drafting is considered only for:

```text
no_match
ambiguous_command
missing_required_args
ambiguous_args
unsupported_schema
```

### Action surface

V4g stays within the existing ten-command Source Trust Loop:

```text
indbase.doctor
indbase.ingest_file
indbase.search_sources
indbase.doc_show
indbase.review_list
indbase.review_show
indbase.task_list
indbase.task_show
indbase.error_list
indbase.error_show
```

No new commands, mutation UI, `ask`, or workflow command is added.

### Provider context

The provider may receive only:

- current user text
- the current indbase-scoped `IntentScope`
- scoped product labels
- action hints
- field labels and hints
- schema field names, primitive types, required fields, descriptions, enum values, and bounds already present in the scope

The provider must not receive:

- session-local `vault_path`
- history rows
- trace rows
- artifact blocks
- artifact metadata
- artifact URIs from previous results
- previous action args
- previous user inputs
- latest or selected result state
- vault DB paths or contents
- source snippets or file contents
- filesystem reads
- cwd
- `CONSOLER_ROOT`
- provider endpoint, model, credentials, prompt text, or raw provider response

Add a fake provider spy test that asserts this context boundary directly.

### Session vault context

Runtime assisted drafting must not receive or infer session-local Variant Vault Context.

The TUI may merge remembered `vault_path` into the editable form only after a candidate or partial candidate is selected. Runtime prefilled values take precedence over session form-layer merge, and the user must be able to edit or clear the field.

### Provider suggestion validation

Provider output is suggestion-only and must be validated by consoler-owned orchestration.

Accept at most one scoped command with known schema fields and `prefilled_args`.

Reject the suggestion and return deterministic fallback plus `assisted_invalid_output` when the suggestion contains:

- unscoped agent or command
- unknown schema fields
- invalid primitive types
- schema-invalid values that are not merely missing required fields
- multiple actions, workflows, `steps`, `actions`, `suggestions`, or `commands` arrays
- approval tokens, action IDs, preview/result blocks, shell commands, or provider confidence

Do not merge invalid provider args into deterministic partial candidates. A valid provider suggestion is used as a whole; an invalid suggestion is discarded as a whole, except for message hygiene as described below.

### Partial candidates

Provider partial candidates are allowed when the command is scoped, fields are known, and the only validation issue is missing required fields.

Examples:

```text
provider: indbase.search_sources with query only
-> missing_required_args for vault_path
-> open search form; TUI may merge session vault_path at form layer

provider: indbase.doc_show with no doc_id
-> missing_required_args for doc_id
-> open document form; do not infer latest document
```

### Literal-sensitive fields

Provider-returned local paths and object IDs must come from the current user text as literal substrings.

Fields requiring literal substring validation:

```text
vault_path
source_path
doc_id
review_id
task_id
error_id
```

If any of these provider fields is not present in the current user text as a literal substring, the whole suggestion is invalid.

### Governed filters

Provider-returned governed filters require explicit marker syntax in the current user text.

Rules:

```text
tag = X
-> current text contains tag:X or with tag X

category = Y
-> current text contains category:Y or in category Y
```

Vague semantic text must not become a governed tag/category filter. If the marker check fails, the whole suggestion is invalid.

Filter existence, lifecycle, alias, merge, deprecated, and archived semantics remain indbase search lifecycle concerns. V4g does not query the tag or category catalog.

### Query field

Provider-returned `query` does not need to be an exact literal substring, because assisted drafting may compress natural phrasing into a search phrase.

Validation constraints:

- string
- trimmed
- single line
- recommended max length: 120 characters
- no markdown block
- no source snippet or citation-looking block
- no answer-like paragraph

The provider must not use vault/source/history context to expand a query, and V4g does not add semantic expansion or generated answers.

### Numeric and enum fields

Provider-returned `limit`, `top_k`, or other numeric result fields must correspond to an explicit number in the current user text and still pass schema bounds.

Provider-returned enum fields such as `status` or `severity` must correspond to an exact enum value or variant-approved label in the current user text. Do not synthesize defaults into `prefilled_args`.

### Message hygiene

Provider `message` is allowed as a short user-facing drafting explanation, not as trusted evidence or a machine contract.

Validation:

- trim whitespace
- max length: 200 characters
- reject multiline text
- reject obvious provider internals or secrets:
  - `http://`
  - `https://`
  - `CONSOLER_INTENT_PROVIDER_URL`
  - `bearer`
  - `api key`
  - `token`
  - `password`
  - `stack trace`
  - `traceback`
  - `prompt:`
  - `raw response`
  - `model:`
  - `endpoint:`
- reject obvious private/runtime context markers:
  - `action_id`
  - `approval_id`
  - `trace`
  - `artifact uri`
  - `indbase://`
  - `.sqlite`
  - `CONSOLER_ROOT`

If command and args are valid but message is invalid, keep the candidate and drop the raw message. The TUI may show a fixed generic assisted success notice instead.

If command or args are invalid, discard the whole suggestion regardless of message.

Provider message must not be persisted, written to history/trace/action events, treated as search explanation, used as citation evidence, or tested by exact prose except for presence/absence and hygiene.

### No result-shape expansion

Do not add `draft_notices`, ranked candidates, public confidence, workflow fields, or other public result-shape additions in V4g.

Reuse existing `candidate`, `needs_clarification`, `prefilled_args`, `partial_candidate`, `message`, and `assist_notice` shapes. If implementation proves a new field is necessary, stop and create a separate compatibility decision before coding it.

### No persistence

Do not persist:

- raw user natural-language input
- provider request
- provider response
- provider message
- provider error body
- prompt/context snapshot
- intermediate suggestions
- deterministic or assisted draft result

Only user-confirmed action args enter the existing lifecycle.

## Implementation Steps

1. Establish baseline.
   - Run V3c assisted gates and V4e/V4f gates before editing if the working tree is clean enough.
   - Confirm no unrelated changes in `packages/runtime`, `packages/agentctl`, `packages/tui`, docs, or scripts.

2. Add provider context audit tests.
   - Create a fake provider spy around `draftIntentAssisted` and the product TUI assisted path.
   - Assert provider request includes only current text and scoped indbase `IntentScope`.
   - Assert session vault context, history, trace, artifacts, previous args, source snippets, cwd-like values, runtime roots, and provider internals are absent.

3. Harden provider suggestion validation.
   - Keep validation in `packages/runtime/src/intent-draft-assisted.ts` or a small helper near it.
   - Add explicit validation for literal-sensitive fields, governed filters, query fields, numeric fields, enum fields, multi-action shapes, unknown fields, and message hygiene.
   - Keep invalid suggestion fallback deterministic and all-or-nothing except message dropping.

4. Preserve assisted orchestration shape.
   - Keep deterministic-first behavior.
   - Keep `draftIntent({ text, scope })` pure, sync, offline, and provider-free.
   - Keep `draftIntentAssisted` async and provider-injected.
   - Do not read env vars inside runtime orchestration; callers own configuration.

5. Update agentctl coverage.
   - Add focused tests for valid assisted message, invalid dropped message, invalid suggestion fallback, context-safe JSON/human output, and no provider internals in output.
   - Keep `agentctl intent-draft --assist` a debugging surface, not a persisted workflow.

6. Update TUI assisted behavior.
   - Keep product TUI assisted path behind `CONSOLER_TUI_ASSISTED_INTENT=1` plus provider availability.
   - Preserve current behavior where explicit opt-in but missing provider returns `assisted_unavailable`.
   - Show transient non-sensitive assisted success/fallback copy.
   - Do not add provider setup UI, persistent provider status, model/endpoint display, or dev shell assisted behavior.
   - Confirm NL submit alone never prepares, previews, approves, executes, writes history, writes trace, or retrieves artifacts.

7. Add indbase variant TUI tests.
   - Deterministic complete candidate does not call provider.
   - Deterministic insufficient result calls provider only when assisted is enabled.
   - Provider URL without opt-in does not call provider.
   - Opt-in without provider shows fallback notice.
   - Valid provider search partial opens editable search form and merges session vault path only at form layer.
   - Provider-supplied nonliteral `vault_path`, `source_path`, object ID, or governed filter falls back.
   - Valid short provider message appears transiently.
   - Invalid provider message is absent and the form still opens when command/args are valid.
   - Dev shell remains generic and does not expose product assisted provider UI.

8. Add the V4g gate.
   - Add `scripts/test-v4g-indbase-nl-v2-intent-drafting.mjs`.
   - Add `test:v4g-indbase-nl-v2-intent-drafting` to `package.json`.
   - Gate should run focused runtime, agentctl, and TUI fake-provider tests.
   - Gate must not require a real provider, real `E:\indbase`, private vault, manual TUI, network access, or provider credentials.

9. Update CI.
   - Add the V4g fake-provider gate to the GitHub workflow after existing V4e/V4f or V3c gates, matching current workflow structure.
   - Do not add real-provider or real-indbase requirements to default CI.

10. Add testing docs after implementation evidence exists.
    - Add `docs/testing/v4g-indbase-nl-v2-intent-drafting.md`.
    - Record commands run, gate coverage, local-only provider smoke status, not-run reasons, and remaining risks.
    - Do not record provider endpoint, model, credentials, raw prompts, raw responses, source snippets, private paths, or private vault evidence.

11. Optional local-only real provider smoke.
    - Only run when a local provider is intentionally configured.
    - Use redacted evidence and do not commit provider details.
    - Validate 5-10 safe ambiguous requests; verify only editable forms open and no raw/private provider context is persisted.

12. Coordinate with `E:\indbase`.
    - Keep `E:\indbase` changes to docs, AGENTS routing, and optional coordination tests unless a focused V4g test proves a real adapter contract defect.
    - If touching `E:\indbase`, follow `E:\indbase\docs\agents\v0.3.2.3f-indbase-nl-v2-intent-drafting\AGENT.md`.

## Required Validation

Before or during implementation, run the narrow checks relevant to touched packages. Required closeout checks after implementation:

```powershell
pnpm --filter @consoler/runtime test
pnpm --filter @consoler/agentctl test
pnpm --filter @consoler/tui test
pnpm test:v3c-assisted-intent-gate
pnpm test:v3c-tui-assisted-intent-gate
pnpm test:v4e-indbase-variant-intent-drafting
pnpm test:v4f-indbase-real-dogfood-friction-pass
pnpm test:v4g-indbase-nl-v2-intent-drafting
pnpm typecheck
pnpm build
git diff --check
```

Run if shared deterministic intent behavior is touched:

```powershell
pnpm test:v3b-intent-gate
```

Run if protocol fixtures or schemas are touched, which should normally not happen:

```powershell
pnpm --filter @consoler/protocol test
```

Run only as local-only evidence:

```powershell
pnpm test:real-indbase-smoke
pnpm exec vitest run packages/tui/test/real-indbase-product-tui-smoke.test.tsx
pnpm tui:indbase --
```

Optional real provider smoke is local-only and must be reported as either redacted pass evidence or `not run` with reason. It is not a release gate.

Cross-repo coordination checks when `E:\indbase` docs/tests are updated:

```powershell
cd E:\indbase
uv run python -m pytest tests/test_v0323f_indbase_nl_v2_coordination.py -q
uv run python -m compileall -q src tests scripts
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

## Acceptance Checklist

- Default indbase TUI path remains deterministic and offline.
- Explicit assisted opt-in is required before provider calls.
- Provider URL alone does not enable product TUI assisted drafting.
- Deterministic complete candidates do not call provider or get rewritten.
- Provider request context excludes session vault, history, trace, artifacts, previous results, vault contents, source snippets, file contents, cwd, runtime root, and provider internals.
- Provider suggestions are scoped to exactly one Source Trust Loop command.
- Provider suggestions with invalid command/args are discarded as a whole and return deterministic fallback plus non-sensitive assist notice.
- Provider partial candidates open editable forms only when missing required fields are the only validation issue.
- Provider `vault_path`, `source_path`, and object IDs must be literal substrings of current user text.
- Provider `tag` and `category` must come from explicit marker syntax in current user text.
- Provider `query` is bounded, single-line, and not answer/source-snippet shaped.
- Provider numeric/enum fields come from explicit user text and pass schema validation.
- Provider message is short, non-sensitive, transient, and dropped if hygiene fails.
- Raw NL, provider request/response, provider message, prompt/context snapshots, and draft results are not persisted.
- NL submit alone does not prepare, preview, approve, execute, write history/trace, or retrieve artifacts.
- Session `vault_path` merge remains TUI form-layer convenience only.
- No public result-shape expansion is added.
- V4g gate passes with fake-provider coverage.
- V3c assisted gates, V4e gate, and V4f gate still pass.
- Real provider smoke is local-only and optional, with redacted evidence or explicit skip reason.
- No protocol schema, runtime store schema, replay, transport, Python SDK, indbase command, indbase core, migration, Web UI, vault browser, mutation UI, retrieval package, `ask`, embedding, generated answer, or workflow automation was added.

## CI and Delivery Closeout

Implementation validation is local first. Push/PR delivery is a separate closeout step only when requested.

When delivery is requested:

1. Re-run local required gates or clearly report any skipped gate.
2. Commit and push the consoler V4g changes.
3. Update or create the relevant PR.
4. Watch GitHub CI within a bounded window.
5. If CI passes, update `docs/testing/v4g-indbase-nl-v2-intent-drafting.md` and, when coordinating indbase, the indbase status/testing docs with CI evidence.
6. If CI fails, fix only failures caused by V4g changes and within the repair budget.

Do not claim CI or real provider smoke passed without command evidence.

## Implementation Closeout

Local implementation closeout recorded on 2026-06-06.

Implemented in consoler:

- runtime provider suggestion validation and message hygiene in `packages/runtime/src/intent-draft-assisted.ts`
- focused runtime fake-provider tests in `packages/runtime/test/intent-draft-assisted.test.ts`
- agentctl unsafe provider-message output coverage in `packages/agentctl/test/intent-draft.test.ts`
- product TUI assisted success/fallback notice wiring in `packages/tui/src/app.tsx`
- product TUI provider context/message tests in `packages/tui/test/assisted-intent-flow.test.tsx`
- V4g gate script `scripts/test-v4g-indbase-nl-v2-intent-drafting.mjs`
- package script `test:v4g-indbase-nl-v2-intent-drafting`
- Linux CI wiring for the V4g fake-provider gate
- testing closeout doc `docs/testing/v4g-indbase-nl-v2-intent-drafting.md`

Implemented in indbase coordination only:

- docs/routing updates
- `tests/test_v0323f_indbase_nl_v2_coordination.py`
- status/testing closeout notes

Validation evidence is recorded in `docs/testing/v4g-indbase-nl-v2-intent-drafting.md` and `E:\indbase\docs\testing.md`.

Boundary check: V4g did not add default assisted behavior, provider setup UI, protocol schema changes, runtime store/replay changes, transport changes, Python SDK behavior, new indbase commands, indbase core changes, indbase adapter changes, migrations, vault/source browsers, Web UI, mutation workflows, `ask`, embeddings, generated answers, follow-up suggestions, or multi-action workflows.

## Unknowns

- Whether the existing `IntentScope` includes enough schema detail for provider context without leaking unnecessary schema-adjacent metadata in a future real-provider phase.
- Whether real-provider smoke will be available in a privacy-safe local environment.
- Whether a future phase should add follow-up suggestions; V4g deliberately defers them.
