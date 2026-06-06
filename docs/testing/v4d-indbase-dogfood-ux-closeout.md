# V4d Indbase Dogfood UX Closeout

V4d closes the consoler-owned indbase Dogfood UX Variant slice. It makes `pnpm tui:indbase --` cover the Source Trust Loop action surface through the existing product variant path, without changing consoler protocol/runtime/store semantics or indbase core behavior.

## Frozen Surface

| Area | Closed scope |
| --- | --- |
| Variant action surface | The ten-command Source Trust Loop: `doctor`, `ingest_file`, `search_sources`, `doc_show`, `review list/show`, `task list/show`, and `error list/show`. |
| Product UX | Product labels, ordered tasks, session-local vault path prefill, variant-scoped history, trace, and artifact opening. |
| Vault context | Session-local form memory only. No disk scanning, cwd inference, persisted preferences, or vault manager. |
| Artifact UX | Uses the existing artifact view panel and agent-owned `artifact-view` retrieval path. No arbitrary URI fetch, file browser, or gallery. |
| Tests | Focused TUI variant tests, v4d gate, runtime regression tests, typecheck, build, and local-only real indbase smoke. |
| Ownership | `consoler` owns variant UX. `indbase` owns agent adapter contracts, source trust semantics, vault reads, and artifact payloads. |

## Validation Evidence

Latest local closeout: 2026-06-06.

```text
E:\consoler
pnpm --filter @consoler/tui test
  -> 50 passed, 1 skipped
pnpm test:v4d-indbase-dogfood-ux
  -> V4d indbase dogfood UX gate passed
pnpm --filter @consoler/runtime test
  -> 74 passed
pnpm typecheck
  -> passed
pnpm build
  -> passed
git diff --check
  -> passed with LF/CRLF warnings only
pnpm test:real-indbase-smoke
  -> real indbase smoke passed

E:\indbase
uv run python -m pytest tests/test_indbase_agent.py tests/test_indbase_agent_readonly_views.py tests/test_v0323c_indbase_coordination.py -q
  -> 22 passed
uv run python scripts/v0323a_probe_stabilization_release_gate.py
  -> status=passed; search_hits=1; successful_ingest_revisions=1; all hard findings clean
uv run python scripts/v0323b_consoler_readonly_views_release_gate.py
  -> status=passed; all hard findings clean
uv run python -m compileall -q src tests scripts
  -> passed
git diff --check
  -> passed with LF/CRLF warnings only
```

`pnpm test:real-indbase-smoke` reported the optional `indbase.document_revision` artifact kind as skipped by design when no such artifact is emitted.

## Boundary Check

V4d did not add or require changes to:

- consoler protocol schemas
- runtime lifecycle, store, replay, or action semantics
- Python SDK package behavior
- Web UI
- vault browser, artifact gallery, arbitrary URI fetch, or local path browsing
- indbase core services, schema, or new command surface
- review/category/tag mutation UI
- doctor repair
- retrieval packages, embeddings, `ask`, generated answers, or LLM/chat UX

The current consoler worktree may also contain earlier V4a/V4b/V4c and SDK/conformance changes. Those are separate workstream changes and are not part of the V4d closeout scope.

## Follow-Up Boundary

The next natural UX slice is deterministic variant-scoped intent drafting for indbase, but that should be planned separately. It must keep validation, preview, approval, and execution in the existing action lifecycle and must not bypass the schema form.
