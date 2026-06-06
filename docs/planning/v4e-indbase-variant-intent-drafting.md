# Task execution brief: V4e Indbase Variant Intent Drafting

Add deterministic indbase-variant intent drafting on top of the closed V4d dogfood UX surface.

## Objective

`pnpm tui:indbase --` should let a user enter one natural-language request and get one reviewable Source Trust Loop action form with conservative editable prefilled values.

The path is:

```text
product home NL input
-> deterministic draftIntent({ text, scope }) within the indbase variant
-> candidate or clarification
-> existing schema form with editable prefilled_args
-> existing prepare / preview / approval / execute lifecycle only after user submits the form
```

This is a form-prefill accelerator. It is not chat, direct execution, assisted intent by default, or an indbase feature.

## Scope

In scope:

- deterministic command matching for the ten-command indbase Source Trust Loop
- generic runtime extraction for query-like fields, explicit governed filters, and object-id-like fields
- indbase variant action/field `intentHints` and copy hygiene
- TUI form-layer merge of session-local `vault_path` with runtime `prefilled_args`
- focused runtime tests
- focused TUI tests
- a V4e gate script and package script
- docs and `AGENTS.md` route updates

Out of scope:

- consoler protocol schemas, runtime lifecycle, runtime store schema, replay semantics, transport, or Python SDK behavior
- `E:\indbase` implementation from this repo
- indbase commands, adapter natural-language parsing, core services, migrations, or durable UX state
- default LLM-assisted intent, provider setup, model calls, network calls, prompt files, chat, or multi-turn clarification
- multi-action workflows
- filesystem reads, cwd inference, history inference, vault discovery, "latest result" lookup, or path existence checks during drafting
- Web UI, vault browser, artifact gallery, arbitrary URI fetch, source browser, review/category/tag mutation UI, doctor repair, retrieval packages, embeddings, `ask`, or generated answers
- default CI dependency on real `E:\indbase`, private vaults, real swallow, provider credentials, or network access

## Start Here

Read:

- `CONTEXT.md`
- `docs/adr/0003-natural-language-intent-drafting.md`
- `docs/adr/0006-product-variants-keep-agent-specific-ui-boundaries.md`
- `docs/planning/v3b-natural-language-intent-drafting.md`
- `docs/planning/v3b-runtime-intent-mapper.md`
- `docs/planning/v3b-tui-product-intent-entry.md`
- `docs/planning/v4d-indbase-dogfood-ux.md`
- `docs/testing/v4d-indbase-dogfood-ux-closeout.md`
- `E:\indbase\docs\planning\v0.3.2.3d-indbase-variant-intent-drafting.md`

Inspect before editing:

```powershell
rg -n "draftIntent|IntentScope|prefilled_args|missing_required_args|ambiguous_args" packages/runtime packages/tui packages/agentctl
rg -n "indbaseVariant|intentHints|vault_path|search_sources|doc_show|review_show|task_show|error_show" packages/tui/src packages/tui/test
rg -n "test:v3b-intent-gate|test:v4d-indbase-dogfood-ux" package.json scripts
```

Primary files:

- `packages/runtime/src/intent-draft.ts`
- `packages/runtime/src/intent-draft-types.ts`
- `packages/runtime/test/intent-draft.test.ts`
- `packages/tui/src/variants/indbase.ts`
- `packages/tui/src/intent-scope.ts`
- `packages/tui/src/app.tsx`
- `packages/tui/test/indbase-variant-flow.test.tsx`
- `packages/tui/test/intent-scope.test.ts`
- `packages/tui/test/variant-contract.test.ts`
- `scripts/test-v4e-indbase-variant-intent-drafting.mjs`
- `package.json`

## Do Not Touch

- Do not edit `packages/protocol` schemas or validators.
- Do not add `AgentManifest` natural-language fields.
- Do not change runtime action lifecycle, approvals, event store, trace, replay, or transport.
- Do not edit `sdks/python`.
- Do not edit `E:\indbase` implementation files from this repository.
- Do not persist raw natural language, `IntentDraftResult`, partial candidates, reason messages, scores, or form notices.
- Do not create actions, approvals, runs, events, trace rows, history rows, or artifact retrieval attempts from natural-language submission.
- Do not call plan, preview, approve, execute, replay, trace, or artifact retrieval from the NL submit path.
- Do not add model SDKs, network calls, prompt files, provider setup UI, pinyin matching, translation, or tokenizers.
- Do not add vault discovery, vault lists, cwd/history-derived defaults, or filesystem validation.
- Do not commit private vaults, generated smoke vaults, `.consoler/consoler.db`, `node_modules/`, `dist/`, `coverage/`, or local path secrets.

## Source Trust Intent Surface

The V4e intent scope must cover these commands:

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

Tier A: clear product-language input must select each command.

Tier B: only obvious fields are prefilled. Missing and ambiguous fields remain editable form work.

## Field Prefill Rules

### Paths

- `vault_path`: prefill only when text explicitly uses vault/knowledge-base/knowledge base/KB/知识库/库 context.
- `source_path`: prefill only for import/ingest/file context.
- Do not read the filesystem or infer file versus vault by existence.
- With one path and import intent, prefer `source_path`.
- With one path and vault/check/status intent, prefer `vault_path`.
- With two paths, assign only when nearby hints clearly distinguish vault and source; otherwise return `ambiguous_args`.

### Search

- `query`: prefer quoted text. Otherwise use clear search/query text only when it does not conflict with filters or IDs.
- `tag`: support only explicit `tag:<ref>` or very clear `with tag <ref>`.
- `category`: support only explicit `category:<ref>` or very clear `in category <ref>`.
- Do not infer governed filters from vague semantic text.
- Do not validate whether a tag/category exists during drafting.

### Object IDs

- `doc_id`, `review_id`, `task_id`, `error_id`: extract when the action is unique or the token format clearly identifies the object kind.
- Support nearby field phrases such as `doc id`, `review id`, `task id`, and `error id`.
- Do not infer from history, trace, selected artifact, "latest result", or prior search.

### Other fields

- `limit`, `top_k`: may extract clear integers near limit/result/count hints.
- `status`, `severity`, and other enums: may extract exact enum strings only.
- Optional filters should be left blank when uncertain.

## Clarification UX

- `candidate`: open the existing schema form with editable `prefilled_args`.
- `missing_required_args` with `partial_candidate`: open the matched form, merge prefilled values, and show deterministic notice.
- `no_match`: stay on product home with explicit task list.
- `ambiguous_command`: stay on product home with explicit task list; do not show ranked alternatives.
- `ambiguous_args`: open the form only when the action is already clear; otherwise stay on product home.
- `unsupported_schema`: should be a V4e gate failure for the ten-command surface.

Clarification is not multi-turn chat.

## Session Vault Context

Runtime `draftIntent({ text, scope })` must not receive or infer session `vault_path`.

The TUI may merge session-local `vault_path` into the schema form after a candidate or partial candidate is selected. Runtime prefilled values take precedence over remembered session values. Users must be able to edit or clear the value.

Do not persist this merge decision or raw NL input.

## Steps

1. Repair indbase variant copy hygiene.
   - Replace mojibake Chinese hints in `packages/tui/src/variants/indbase.ts`.
   - Keep changes scoped to indbase variant hints/copy and any runtime deterministic keyword constants touched by V4e.
   - Add copy hygiene coverage for known mojibake fragments.

2. Extend generic runtime extraction.
   - Keep `draftIntent({ text, scope })` pure and synchronous.
   - Add query-like field extraction for `query`, `search_text`, or similar primitive string fields.
   - Add explicit `tag:` / `category:` filter extraction for primitive string fields.
   - Add object-id-like extraction for `*_id` fields when command intent or token kind is unambiguous.
   - Preserve existing reason codes and public result shape.

3. Expand runtime tests.
   - Clear candidate for every Source Trust command via an `IntentScope` fixture.
   - `search_sources` with quoted query.
   - `search_sources` with `tag:<ref>` and `category:<ref>`.
   - Ambiguous filter or vague semantic filter does not guess.
   - Object ID extraction for document/review/task/error show.
   - Bare numeric or ambiguous ID returns clarification.
   - Multi-path ambiguity remains clarification.
   - Public result has `prefilled_args`, no `args`, no ranked candidates, and no numeric confidence.

4. Update indbase variant hints.
   - Provide short English and Chinese action hints for all ten actions.
   - Provide field hints for `vault_path`, `source_path`, `query`, `tag`, `category`, object IDs, and limit fields.
   - Keep hints as keywords, not prompt examples or training samples.

5. Update TUI form prefill behavior if needed.
   - Keep NL submit on product home only.
   - Candidate and partial candidate open the existing schema form.
   - Merge session `vault_path` at form-layer only.
   - Keep dev shell generic.
   - Ensure NL submit alone does not prepare, preview, approve, execute, or create history/trace data.

6. Add focused TUI tests.
   - Product home still shows NL input plus explicit tasks.
   - Clear English and Chinese inputs select doctor, ingest, search, doc show, review show, task show, and error show.
   - `search "..." tag:<ref> category:<ref>` opens search form with expected fields.
   - Import one source path opens import form with `source_path`, missing `vault_path` notice, and optional session vault prefill.
   - Ambiguous command stays on home with task fallback.
   - Ambiguous args stay home or open a clear-action form according to the clarification rules.
   - NL candidate does not show action id, approval id, preview, or execution UI.
   - Dev shell has no product NL entry.

7. Add a V4e gate.
   - Add `scripts/test-v4e-indbase-variant-intent-drafting.mjs`.
   - Add `test:v4e-indbase-variant-intent-drafting` to `package.json`.
   - Gate should run focused deterministic runtime and TUI checks by default.
   - Do not make real indbase or assisted provider checks required.

8. Update docs and routing.
   - Update `AGENTS.md` route entries.
   - Add testing docs only after the gate exists.
   - Keep README unchanged unless the user-facing quick start changes.

## Validation

Required V4e checks:

```powershell
pnpm --filter @consoler/runtime test
pnpm --filter @consoler/tui test
pnpm test:v4e-indbase-variant-intent-drafting
pnpm test:v3b-intent-gate
pnpm typecheck
pnpm build
git diff --check
```

Run when shared assisted intent paths are touched:

```powershell
pnpm test:v3c-assisted-intent-gate
pnpm test:v3c-tui-assisted-intent-gate
```

Run when protocol fixtures are touched, which should usually not happen:

```powershell
pnpm --filter @consoler/protocol test
```

Run only as local-only regression when smoke scripts or real-agent assumptions change:

```powershell
pnpm test:real-indbase-smoke
```

Cross-repo coordination checks when `E:\indbase` docs/tests are updated:

```powershell
cd E:\indbase
git diff --check
```

If any indbase adapter code is touched:

```powershell
uv run python -m pytest tests/test_indbase_agent.py tests/test_indbase_agent_readonly_views.py -q
uv run python scripts/v0323a_probe_stabilization_release_gate.py
uv run python scripts/v0323b_consoler_readonly_views_release_gate.py
```

## Done Means

- The V4e gate passes.
- Clear deterministic input can select all ten Source Trust Loop commands.
- Conservative `prefilled_args` are editable and never skip the schema form.
- Missing required fields open the form with a deterministic notice when action is clear.
- Ambiguous command stays on product home with explicit task fallback.
- Runtime does not read filesystem, cwd, history, store, registry, vault state, or agent output during drafting.
- Session `vault_path` is TUI form-layer convenience only.
- Search filters are extracted only from explicit low-ambiguity syntax.
- Object IDs are not inferred from trace/history/latest result.
- Indbase variant hints and touched runtime keyword lists have no known mojibake.
- V3b deterministic gate still passes.
- V3c assisted gates either pass when relevant or are reported as not run with reason.
- No protocol/runtime store schema, Python SDK, Web UI, vault browser, mutation UI, real provider dependency, indbase core, retrieval package, `ask`, embedding, generated answer, or default LLM behavior was added.

## Unknowns

- Whether query-like extraction can be implemented generically without overfitting indbase search.
- Whether the current Ink input tests need local timing helpers for longer Chinese inputs.
- Whether V4e should add a small TUI fixture manifest for all ten Source Trust commands or reuse the existing `indbase-source-trust-manifest` fixture as-is.
- Whether real-indbase smoke should be part of closeout evidence or stay unchanged because V4e is pre-action form drafting only.
