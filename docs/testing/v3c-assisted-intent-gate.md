# V3c Assisted Intent Gate

Acceptance surface for opt-in LLM-assisted Intent Drafting runtime/CLI behavior.

V3c assisted intent is fake-provider first. The gate must not require model credentials, network access, a real provider, real `E:\indbase`, or a real vault.

## Automated Gate

Run from the repository root:

```powershell
pnpm test:v3c-assisted-intent-gate
```

The gate should run, in order:

1. `pnpm --filter @consoler/runtime test`
2. `pnpm --filter @consoler/agentctl test`
3. `pnpm test:agentctl-smoke` if the smoke covers `intent-draft --assist`, otherwise a focused assisted intent smoke

## CI

| Gate | Runs in CI | Notes |
| --- | --- | --- |
| V3c assisted intent gate | Linux (`verify` job) | Runs after the V3b intent gate and before the V3c TUI assisted gate. Uses fake-provider coverage only. |

## Acceptance Surface

| Surface | Covered by | What must stay true |
| --- | --- | --- |
| Deterministic-first orchestration | Runtime tests | A deterministic complete candidate returns without calling the provider. |
| Provider assist path | Runtime tests | Deterministic clarification may call the provider when assistance is enabled. |
| Suggestion validation | Runtime tests | Provider suggestions are accepted only for scoped agent/command, known schema fields, schema-valid values, and one action. |
| Fallback behavior | Runtime and agentctl tests | Provider timeout, rejection, malformed output, unscoped command, unknown fields, schema-invalid output, and multi-action output return deterministic fallback with non-sensitive notice only. |
| CLI opt-in | Agentctl tests | `agentctl intent-draft --assist` is explicit opt-in; default `intent-draft` remains deterministic. |
| Persistence boundary | Agentctl smoke | Assisted drafting does not create actions, approvals, runs, events, traces, history rows, or artifact retrieval attempts. |
| Secret hygiene | Tests and diff review | Outputs, fixtures, snapshots, docs, and logs contain no private endpoint, credential, model name, provider response body, or stack trace. |

## Local Provider Smoke

Real provider validation is optional and local-only. Use a local generic provider shim configured through environment variables when needed. Do not commit or paste private endpoint, credential, model, request, or response details.

Passing local provider smoke should be reported only as a non-sensitive statement, for example: "validated with a local opt-in generic provider shim."

## Out of Scope

- Real provider credentials or network calls in CI.
- TUI assisted intent entry.
- Protocol or `AgentManifest` changes.
- Prompt, provider response, raw input, history, trace, or action persistence.
- Streaming, tool calls, chat transcripts, multiple candidates, multi-action workflows, model fallback chains, provider-specific SDKs, or real `E:\indbase`.

## Related Gates

- V3b deterministic intent drafting remains covered by `pnpm test:v3b-intent-gate` and `docs/testing/v3b-intent-gate.md`.
- Product TUI assisted intent remains covered by `pnpm test:v3c-tui-assisted-intent-gate` and `docs/testing/v3c-tui-assisted-intent-gate.md`.
- V2 artifact retrieval/browser remains covered by `pnpm test:v2-release-gate` and `docs/testing/v2-release-gate.md`.
