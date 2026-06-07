---
doc_type: testing_evidence
phase_id: v3-closeout
title: V3 Closeout (Console Variant + Intent Drafting)
status: completed
canonical: false
read_by_default: false
---

# V3 Closeout (Console Variant + Intent Drafting)

Frozen surface for V3a product entry, V3b deterministic natural-language intent drafting, and V3c opt-in assisted intent drafting on the indbase Console Variant.

## Automated Gates

| Gate | Command | CI |
| --- | --- | --- |
| V3b intent drafting | `pnpm test:v3b-intent-gate` | Linux `verify` (after V2 gate) |
| V3c assisted intent runtime/CLI | `pnpm test:v3c-assisted-intent-gate` | Linux `verify` (after V3b gate) |
| V3c assisted intent TUI | `pnpm test:v3c-tui-assisted-intent-gate` | Linux `verify` (after V3c runtime/CLI gate) |
| V2 (unchanged) | `pnpm test:v2-release-gate` | Linux `verify` |
| Windows focused | runtime, agentctl, TUI, smokes | Windows job |

V3b gate covers runtime `draftIntent`, `agentctl intent-draft`, product TUI NL entry (Ink tests), and agentctl smoke intent-draft checks. V3c gates use fake or injected providers only; CI must not require real provider credentials, provider network access, real `E:\indbase`, or a real vault.

## Product TUI Manual Smoke (`pnpm tui:indbase --`)

Use a disposable real-agent root from `CONSOLER_KEEP_REAL_INDBASE_SMOKE=1 pnpm test:real-indbase-smoke` or your own `CONSOLER_ROOT` with a registered real `indbase` agent.

### V3b NL + task home (automated Ink coverage)

| Step | Expected | Covered by |
| --- | --- | --- |
| Start `pnpm tui:indbase --` | `indbase — tasks`, NL prompt, explicit tasks, no `Select command` / raw command names | `indbase-variant-flow.test.tsx` |
| Empty NL + Enter | Stay on home; guidance to Tab to tasks | same |
| NL vault check phrase | Doctor form with prefilled vault path, product labels | same |
| NL one-path import phrase | Import form with `source_path` prefilled; vault still required | same |
| Unrelated NL | `No matching action found.`; stay on home | same |
| Tab → task → Enter | Product-labeled schema form | same |

### V3a doctor / ingest / artifact (local real-agent)

| Step | Expected | Covered by |
| --- | --- | --- |
| Tab → **Check knowledge base status** → vault → approve → run | Succeeded terminal state in timeline | `real-indbase-product-tui-smoke.test.tsx` (local env) |
| **History** | Only indbase variant commands; product task labels | `indbase-variant-flow.test.tsx` + real smoke history |
| Ingest trace → artifact **Enter** | Real `fetchArtifactView`; product-oriented artifact header | `real-indbase-product-tui-smoke.test.tsx` + `pnpm test:real-indbase-smoke` |
| Trace / JSON tab | Raw `action_id`, `command`, protocol fields remain | manual inspection |

Latest local evidence (2026-05-31):

- `pnpm test:v3b-intent-gate`: passed
- `pnpm test:real-indbase-smoke` with keep: passed (`CONSOLER_ROOT` + `MANUAL_TUI_ACTION_ID` printed)
- `pnpm exec vitest run packages/tui/test/indbase-variant-flow.test.tsx packages/tui/test/real-indbase-product-tui-smoke.test.tsx` with smoke env: passed after V3b home navigation fix

Latest V3c local evidence (2026-06-01):

- `pnpm test:v3c-assisted-intent-gate`: passed
- `pnpm test:v3c-tui-assisted-intent-gate`: passed
- `pnpm typecheck`: passed
- `pnpm test`: passed
- `git diff --check`: passed
- Private provider identifier scan: no matches

## Out of Scope (V3)

- Default or mandatory LLM drafting
- Real provider credentials or network calls in CI
- Provider setup UI, provider status panels, prompt or provider response persistence
- Multi-turn chat, multi-action workflows, persisted NL input
- Agent marketplace / arbitrary agent search in product TUI
- Protocol version bump for intent drafting

## Entry Commands

- Product: `pnpm tui:indbase --`
- Dev shell: `pnpm tui --`
- Intent debug: `pnpm agentctl -- intent-draft "<text>" --agent indbase [--json]`
- Assisted debug: `pnpm agentctl -- intent-draft "<text>" --agent indbase --assist [--json]`
- Product assisted local: set `CONSOLER_TUI_ASSISTED_INTENT=1` plus local generic provider config, then run `pnpm tui:indbase --`
