---
doc_type: testing_evidence
phase_id: v3c-tui-assisted-intent-gate
title: V3c TUI Assisted Intent Gate
status: completed
canonical: false
read_by_default: false
---

# V3c TUI Assisted Intent Gate

Acceptance surface for product TUI opt-in wiring for LLM-assisted Intent Drafting.

This gate is fake-provider first. It must not require model credentials, network access, a real provider, real `E:\indbase`, or a real vault.

## Automated Gate

Run from the repository root:

```powershell
pnpm test:v3c-tui-assisted-intent-gate
```

The gate should run, in order:

1. `pnpm --filter @consoler/tui test`
2. `pnpm --filter @consoler/runtime test`
3. `pnpm --filter @consoler/agentctl test` when shared provider config code is touched

## CI

| Gate | Runs in CI | Notes |
| --- | --- | --- |
| V3c TUI assisted intent gate | Linux (`verify` job) | Runs after the V3c assisted intent gate. Uses fake/injected provider coverage only. |

## Acceptance Surface

| Surface | Covered by | What must stay true |
| --- | --- | --- |
| Explicit product opt-in | TUI tests | Product TUI sends input to a provider only when `CONSOLER_TUI_ASSISTED_INTENT=1` and provider config is available. |
| Provider URL alone | TUI tests | A configured provider endpoint alone does not enable assisted drafting in product TUI. |
| Dev shell boundary | TUI tests | `pnpm tui --` remains generic and does not expose assisted NL/provider UI. |
| Deterministic-first behavior | TUI/runtime tests | Deterministic candidates do not call the provider. |
| Assisted form routing | TUI tests | Assisted candidates and partial candidates open the existing product-labeled schema form with editable prefilled values. |
| Transient fallback notices | TUI tests | Provider unavailable, timeout, invalid output, or fallback shows non-sensitive notice text on home/form without persisting it. |
| Input preservation | TUI tests | Home fallback keeps the user's NL input; routing into a form clears it. |
| Busy state | TUI tests | Pending provider calls show neutral busy copy and ignore duplicate submits without locking the UI permanently. |
| Secret hygiene | Tests and diff review | TUI frames, fixtures, snapshots, docs, and logs contain no private endpoint, credential, model name, provider request, provider response, or stack trace. |

## Local Provider Smoke

Real provider validation is optional and local-only. Use `CONSOLER_TUI_ASSISTED_INTENT=1` with a local generic provider shim when needed.

Passing local provider smoke should be reported only as a non-sensitive statement, for example: "local opt-in provider TUI smoke passed." Do not commit or paste private endpoint, credential, model, prompt, request, or response details.

## Out of Scope

- Real provider credentials or network calls in CI.
- Generic dev-shell assisted behavior.
- Protocol or `AgentManifest` changes.
- Prompt, provider response, raw input, history, trace, action, or notice persistence.
- Streaming, tool calls, chat transcripts, multiple candidates, multi-action workflows, model fallback chains, provider setup UI, or real `E:\indbase`.

## Related Gates

- V3c runtime/CLI assisted intent remains covered by `pnpm test:v3c-assisted-intent-gate` and `docs/testing/archive/consoler-v3/v3c-assisted-intent-gate.md`.
- V3b deterministic intent drafting remains covered by `pnpm test:v3b-intent-gate` and `docs/testing/archive/consoler-v3/v3b-intent-gate.md`.
