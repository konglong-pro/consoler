---
doc_type: testing_evidence
phase_id: v2-artifact-retrieval-closeout
title: V2 Artifact Retrieval Closeout
status: completed
canonical: false
read_by_default: false
---

# V2 Artifact Retrieval Closeout

V2 artifact retrieval and browsing is closed at the fake-agent + local real-agent boundary. Natural language intent mapping is a separate later phase.

## Frozen Surface

| Area | Delivered |
| --- | --- |
| Protocol | Optional manifest `artifact_retrieval`; `ArtifactView` validation; no nested artifact blocks in views |
| Runtime | `fetchArtifactView(action_id, block_id)`; `artifact_retrievals` audit only; no content storage |
| SDK / fake agent | `agent.get_artifact_view`; conformance fake default CI path |
| CLI | `agentctl artifact-view <action_id> <block_id> [--json]` |
| TUI | `artifact_view` phase; explicit Enter from trace/finished; Esc back |
| Real `indbase` | `get_artifact_view` for `indbase://...` ingest artifact kinds; `vault_path` in block metadata; local smoke requires ingest_run + document retrieval, and exercises document_revision when the disposable run emits that block |
| Default CI | `pnpm test:v2-release-gate` (fake agent) + Windows TUI/conformance/artifact-retrieval smokes |
| Local-only | `pnpm test:real-indbase-smoke` with real `agentctl artifact-view` coverage |

## Out of Scope (deferred)

- Natural language intent mapping
- Downloads, media/PDF/image rendering, pagination
- Global artifact library or search
- Arbitrary URI fetch
- Artifact content cache or storage in consoler
- Default CI dependency on `E:\indbase` or provisioned real vaults

## Automated Gates

### Default CI (fake agent)

```powershell
pnpm test:v2-release-gate
```

Covers build, typecheck, package tests, Python SDK, conformance, agentctl smoke, redaction smoke, and `pnpm test:artifact-retrieval-smoke`.

See `docs/testing/archive/consoler-v2/v2-release-gate.md` for the CI job split.

### Local-only (real `indbase`)

```powershell
pnpm test:real-indbase-smoke
```

From `E:\indbase` when adapter coverage changes:

```powershell
uv run pytest tests/test_indbase_agent.py
```

See `docs/testing/real-indbase-smokes.md` for disposable vault setup and coverage table.

## Manual TUI Smoke (local-only)

Automated TUI tests and fake-agent CLI smoke cover the generic path. Use this recipe once per environment when validating real `indbase` end to end.

1. Run the real smoke and keep the temp root:

   ```powershell
   $env:CONSOLER_KEEP_REAL_INDBASE_SMOKE = "1"
   pnpm test:real-indbase-smoke
   ```

2. Note the printed values:
   - `CONSOLER_ROOT`
   - `MANUAL_TUI_ACTION_ID` (normal ingest action)
   - `MANUAL_TUI_ARTIFACT_BLOCK_IDS` (artifact block ids and kinds)

3. Start the TUI against the same root:

   ```powershell
   $env:CONSOLER_ROOT = "<printed CONSOLER_ROOT>"
   pnpm tui --
   ```

4. Navigate: **History** → select the printed action → **Trace**.

5. Use **↑↓** to select an artifact block, **Enter** to open `artifact_view`. Confirm `artifact_uri`, kind, and view blocks render.

6. Press **Esc** to return to trace. Confirm trace shows retrieval attempt summaries only, not fetched view body text.

7. Optional: open the replay tab or run `pnpm agentctl -- replay <action_id>` and confirm replay does not fetch or display artifact view content.

Do not add this flow to default GitHub CI.

## Evidence Notes

- Linux CI runs `pnpm test:v2-release-gate`.
- Windows CI adds TUI, conformance, and `pnpm test:artifact-retrieval-smoke`.
- Real `indbase` artifact retrieval is proven only by `pnpm test:real-indbase-smoke` and focused `E:\indbase` tests.
