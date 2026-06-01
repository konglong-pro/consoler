# V3 Closeout (Console Variant + Intent Drafting)

Frozen surface for V3a product entry and V3b deterministic natural-language intent drafting on the indbase Console Variant.

## Automated Gates

| Gate | Command | CI |
| --- | --- | --- |
| V3b intent drafting | `pnpm test:v3b-intent-gate` | Linux `verify` (after V2 gate) |
| V2 (unchanged) | `pnpm test:v2-release-gate` | Linux `verify` |
| Windows focused | runtime, agentctl, TUI, smokes | Windows job |

V3b gate covers runtime `draftIntent`, `agentctl intent-draft`, product TUI NL entry (Ink tests), and agentctl smoke intent-draft checks.

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

## Out of Scope (V3)

- LLM intent mapping, multi-turn chat, persisted NL input
- Agent marketplace / arbitrary agent search in product TUI
- Protocol version bump for intent drafting

## Entry Commands

- Product: `pnpm tui:indbase --`
- Dev shell: `pnpm tui --`
- Intent debug: `pnpm agentctl -- intent-draft "<text>" --agent indbase [--json]`
