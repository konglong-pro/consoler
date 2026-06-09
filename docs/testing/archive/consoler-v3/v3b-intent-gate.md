---
doc_type: testing_evidence
phase_id: v3b-intent-gate
title: V3b Intent Drafting Gate
status: completed
canonical: false
read_by_default: false
---

# V3b Intent Drafting Gate

Acceptance surface for deterministic natural-language intent drafting: runtime `draftIntent`, `agentctl intent-draft`, and product-variant TUI NL entry.

V3b is a deterministic, fake-agent friendly gate. It does not require model credentials, network access, real `E:\indbase`, or a real vault.

## Automated Gate

Run from the repository root:

```powershell
pnpm test:v3b-intent-gate
```

The gate runs, in order:

1. `pnpm build` (required for compiled `agentctl` smoke)
2. `pnpm --filter @consoler/runtime test`
3. `pnpm --filter @consoler/agentctl test`
4. `pnpm --filter @consoler/tui test`
5. `pnpm test:agentctl-smoke` (includes `intent-draft` candidate/clarification and no-history checks)

## Acceptance Surface

| Surface | Covered by | What must stay true |
| --- | --- | --- |
| Runtime mapper | `pnpm --filter @consoler/runtime test` | `draftIntent({ text, scope })` is pure, deterministic, schema-aware, and returns only `candidate` or `needs_clarification`. |
| Result shape | Runtime and agentctl tests | Candidate args are `prefilled_args`; public output has no numeric confidence or ranked candidates. |
| CLI debug path | `pnpm --filter @consoler/agentctl test`, `pnpm test:agentctl-smoke` | `agentctl intent-draft` supports human and `--json` output and does not create actions, runs, approvals, events, traces, or history rows. |
| Product TUI path | `pnpm --filter @consoler/tui test` | Product NL entry is variant-scoped, keeps the explicit task list, and opens the existing schema form with editable prefilled values. |
| Boundary safety | All gate checks | No protocol fields, DB persistence, LLM calls, filesystem reads, direct prepare/preview/approve/execute, or real-agent dependency are introduced. |

## CI

| Gate | Runs in CI | Notes |
| --- | --- | --- |
| V3b intent drafting gate | Linux (`verify` job) | Runs after the V2 release gate on Ubuntu. |

Windows focused CI already runs runtime, agentctl, TUI, agentctl smoke, and artifact retrieval smoke; it does not duplicate this named gate.

## Manual TUI Smoke

Automated Ink tests cover the core product path. Use this local smoke before a release or when editing TUI focus/input behavior:

1. Run `pnpm tui:indbase --`.
2. Confirm the first screen is indbase-contextual, shows a single-shot NL input, and keeps explicit product tasks.
3. Submit a clear vault-check phrase and confirm the schema form opens with editable `vault_path`.
4. Submit a one-path import phrase and confirm `source_path` is prefilled while `vault_path` remains editable.
5. Submit unrelated text and confirm fallback stays on product home rather than opening command search or chat.

## Out of Scope

- Real `E:\indbase` and real vaults.
- LLM/provider integration, prompt snapshots, API keys, translation, or pinyin matching.
- Persisting raw natural language or ephemeral Intent Drafts.
- Multi-turn chat, multi-action workflows, or arbitrary agent search in the product TUI.

## Related Gates

- V3 closeout checklist and manual smoke evidence: `docs/testing/archive/consoler-v3/v3-closeout.md`
- V2 artifact retrieval/browser remains covered by `pnpm test:v2-release-gate` and `docs/testing/archive/consoler-v2/v2-release-gate.md`.
- Real indbase artifact retrieval remains local-only through `pnpm test:real-indbase-smoke`.
