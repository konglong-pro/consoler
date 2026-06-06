# Task execution brief: V3b runtime deterministic intent mapper

## Objective

Implement the runtime-only first slice of Natural Language Intent Drafting: a pure deterministic mapper that converts one text input plus a neutral `IntentScope` into either a reviewable single-action candidate or `needs_clarification`.

This slice must not implement `agentctl intent-draft`, TUI natural-language input, persistence, LLM calls, protocol changes, or agent execution.

## Scope

- In scope: `packages/runtime` intent-draft types, `draftIntent({ text, scope })`, deterministic matching/extraction helpers, runtime exports, and focused runtime tests.
- Out of scope: `packages/agentctl`, `packages/tui`, `packages/protocol`, DB migrations, raw natural-language persistence, `AgentManifest` NL fields, filesystem reads, registry reads, agent spawn, and `E:\indbase` changes.

## Start here

- Read: `CONTEXT.md` terms `Natural Language Intent Drafting`, `Intent Draft`, `Intent Clarification`, `Intent Scope`, `Deterministic Intent Mapper`, and `draftIntent`.
- Read: `docs/adr/0003-natural-language-intent-drafting.md`.
- Parent phase brief: `docs/planning/v3b-natural-language-intent-drafting.md`.
- Runtime exports: `packages/runtime/src/index.ts`.
- Protocol command/schema types: `packages/protocol/src/types.ts`.
- Existing validator to reuse only for final schema compatibility checks: `validateCommandArgs` from `@consoler/protocol`.
- Runtime tests: add `packages/runtime/test/intent-draft.test.ts`.

## Do not touch

- Do not edit `packages/protocol` schemas or add fields to `AgentManifest`.
- Do not add dependencies, model SDKs, network calls, prompt files, or API key configuration.
- Do not use `ConsolerRuntime`, `ConsolerStore`, registry helpers, filesystem APIs, process spawn, cwd, history, or prior actions inside intent mapping.
- Do not persist raw input, partial candidates, results, scores, or reason messages.
- Do not expose ranked candidates or numeric confidence.
- Do not implement CLI or TUI behavior in this slice.

## Steps

1. Add runtime types.
   - Create `packages/runtime/src/intent-draft-types.ts`.
   - Define `IntentScope`, `IntentScopeCommand`, `IntentCandidate`, `IntentDraftResult`, and `IntentClarificationReason`.
   - Reason codes are exactly: `no_match`, `ambiguous_command`, `missing_required_args`, `ambiguous_args`, `unsupported_schema`.
   - Candidate values must be under `prefilled_args`, not `args`.

2. Add pure mapper module.
   - Create `packages/runtime/src/intent-draft.ts`.
   - Export `draftIntent(input: { text: string; scope: IntentScope }): IntentDraftResult`.
   - Keep all scoring helpers private to the module.
   - Update `packages/runtime/src/index.ts` to export the function and public types.

3. Define `IntentScope` shape.
   - `IntentScope` has `commands: IntentScopeCommand[]`.
   - Each command entry includes protocol values: `agent_id`, `command`, `command_description`, `args_schema`.
   - Optional product hints: `product_action_id`, `product_label`, `product_description`, `action_hints`, `field_hints`, `field_labels`.
   - Runtime must treat product hints as matching text only; successful candidates still output protocol `agent_id` and `command`.

4. Implement schema support guard.
   - Support only top-level object schemas with primitive fields: `string`, `boolean`, `number`, `integer`.
   - Allow primitive `enum` matching and `default` metadata, but do not synthesize defaults into `prefilled_args`.
   - Return `unsupported_schema` for nested objects, arrays, `$ref`, `oneOf`, `anyOf`, `allOf`, `patternProperties`, `if`/`then`/`else`, or non-primitive fields.
   - Include deterministic `unsupported_features` strings when useful for tests:
     - root/schema keywords: `keyword:$ref`, `keyword:oneOf`, `keyword:anyOf`, `keyword:allOf`, `keyword:patternProperties`, `keyword:if`
     - root shape: `root:not_object`, `root:missing_properties`
     - field shape: `field:<name>:object`, `field:<name>:array`, `field:<name>:unsupported_type`

5. Implement command matching.
   - Normalize case for Latin text; use deterministic substring matching for Chinese/localized hints.
   - Score sources with fixed weights:
     - `action_hints`: 5
     - `product_label`: 4
     - command name tokens such as `ingest`, `file`, `doctor`: 3
     - `product_description` and `command_description`: 1
   - `topScore <= 0` returns `no_match`.
   - If the second-best command is within 2 points of the top score, return `ambiguous_command`.
   - Do not return alternatives or public scores.

6. Implement conservative literal extraction.
   - Extract quoted strings, URLs, Windows paths, UNC paths, Unix/relative paths, numbers, integers, and boolean words.
   - Strip common trailing punctuation from extracted string/path values.
   - Treat multiple obvious file/path literals for a single-file command as ambiguous unless field hints clearly assign them.
   - Do not inspect the filesystem or infer file versus directory.

7. Implement field assignment.
   - Field matching text comes from field name, schema field `description`, `field_hints`, and `field_labels` label/help.
   - If there is one compatible field and one compatible literal, assign it.
   - If there are several compatible fields, assign only when nearby text clearly matches one field's hints; otherwise return `ambiguous_args`.
   - Path-like fields are conservative:
     - import/file/source intent plus one path may prefill `source_path` or source-like field and leave vault-like required fields missing.
     - check/status/vault intent plus one path may prefill `vault_path` or vault-like field.
     - two paths require nearby hints to distinguish source/file from vault; otherwise `ambiguous_args`.

8. Construct final results.
   - For one selected command, build `prefilled_args` from extracted values only.
   - If required fields are missing, return `missing_required_args` with `missing_required_args` and optional `partial_candidate`.
   - If no required fields are missing, run `validateCommandArgs(args_schema, prefilled_args)`.
   - On success, return `candidate`.
   - On validation failure, return `ambiguous_args` unless the schema guard already returned `unsupported_schema`.
   - Use deterministic messages:
     - `No matching action found.`
     - `More than one action matched.`
     - `Missing required fields: <fields>.`
     - `Could not assign extracted values to fields unambiguously.`
     - `This action's input schema is not supported by intent drafting.`

9. Add focused tests.
   - Create small local test scopes in `packages/runtime/test/intent-draft.test.ts`.
   - Reuse `indbaseManifestV1aFixture` where it helps align with real field names.
   - Avoid filesystem fixtures; all tests should call `draftIntent` directly.

## Validation

- Focused runtime tests: `pnpm --filter @consoler/runtime test`
- Focused runtime typecheck: `pnpm --filter @consoler/runtime typecheck`
- Broad typecheck: `pnpm typecheck`
- Diff hygiene: `git diff --check`

## Required test scenarios

- Clear candidate for vault check: one vault path maps to `indbase.doctor` with `prefilled_args.vault_path`.
- Clear import partial: one source file path maps to `indbase.ingest_file`, fills `source_path`, and returns `missing_required_args` for `vault_path`.
- Clear two-path import: labeled vault and source paths fill both fields.
- Ambiguous two-path import: unlabeled paths return `ambiguous_args`.
- `no_match`: unrelated text with no hints.
- `ambiguous_command`: two commands score within the ambiguity threshold.
- `unsupported_schema`: nested object, array, `$ref`, or composition keyword.
- Primitive extraction: quoted string, URL, number, integer, boolean, and enum.
- Integer safety: decimal does not fill an integer field.
- Localized hints: a non-English import hint can match an action by exact substring; no translation or pinyin behavior is expected.
- Multi-target input: several source files for one single-file command return `ambiguous_args`.
- API shape safety: candidate has `prefilled_args` and no `args`; result has no ranked candidates and no numeric confidence.

## Done means

- `draftIntent({ text, scope })` is exported from `@consoler/runtime`.
- Mapper is pure and deterministic, with no runtime/store/registry/filesystem/process dependencies.
- Public result shape matches ADR 0003 and this brief.
- Runtime tests cover candidate, every reason code, schema limits, path ambiguity, localized hints, and API shape safety.
- No CLI, TUI, protocol, persistence, or real `E:\indbase` code changed.
- Validation commands above pass, or any skipped command is reported with the reason.

## Unknowns

- Exact private helper names are implementation details.
