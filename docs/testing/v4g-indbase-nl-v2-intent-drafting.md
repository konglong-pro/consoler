# V4g Indbase NL v2 Intent Drafting

V4g adds opt-in assisted Intent Drafting for the indbase Console Variant.

It keeps `pnpm tui:indbase --` deterministic and offline by default. Assisted drafting runs only after explicit local opt-in, only when deterministic drafting is insufficient, and only to open one editable Source Trust Loop form.

V4g is not chat, `ask`, direct execution, latest-result inference, workflow automation, provider setup UI, Web UI, vault browsing, source browsing, mutation UI, generated answers, embeddings, or an indbase core feature.

## Automated Gate

Run from the repository root:

```powershell
pnpm test:v4g-indbase-nl-v2-intent-drafting
```

The gate runs:

```text
pnpm build
pnpm --filter @consoler/runtime test
pnpm --filter @consoler/agentctl test
pnpm --filter @consoler/tui test
```

The gate uses fake or injected providers only. It must not require a real provider, provider credentials, network access, real `E:\indbase`, private vaults, real swallow, or manual TUI.

## Covered Behavior

- Deterministic complete candidates do not call a provider.
- Explicit assisted opt-in is required before provider calls.
- Missing provider config with opt-in shows `assisted_unavailable` without endpoint, model, or credential details.
- Provider requests contain only the current user text and scoped indbase `IntentScope`.
- Provider requests exclude session vault context, history, trace, artifacts, previous args, source snippets, cwd/runtime roots, and provider internals.
- Provider suggestions are all-or-nothing except safe `message` dropping.
- Provider-returned `vault_path`, `source_path`, and object IDs must be literal substrings of the current text.
- Provider-returned `tag` and `category` require explicit `tag:<ref>` / `category:<ref>` or phrase markers.
- Provider-returned `query` may be a short assisted summary but must be bounded, single-line, and not source/citation/answer shaped.
- Provider-returned `limit` / `top_k` and enum values must correspond to explicit current text.
- Safe provider messages may appear as transient form notices.
- Unsafe provider messages are dropped; the form may still open with a fixed generic assisted notice when command and args are valid.
- NL submit opens editable forms only; it does not prepare, preview, approve, execute, write history/trace, persist raw NL/provider data, or retrieve artifacts.
- The generic dev shell remains protocol-oriented and does not expose product assisted provider UI.

## Validation Evidence

Latest local validation: 2026-06-06.

```text
pnpm --filter @consoler/runtime test
  -> 14 test files passed; 85 tests passed
pnpm --filter @consoler/agentctl test
  -> 8 test files passed; 30 tests passed
pnpm --filter @consoler/tui test
  -> 14 test files passed, 1 skipped; 56 tests passed, 1 skipped
pnpm test:v4g-indbase-nl-v2-intent-drafting
  -> V4g indbase NL v2 intent drafting gate passed
pnpm test:v3c-assisted-intent-gate
  -> V3c assisted intent gate passed
pnpm test:v3c-tui-assisted-intent-gate
  -> V3c TUI assisted intent gate passed
pnpm test:v4e-indbase-variant-intent-drafting
  -> V4e indbase variant intent drafting gate passed
pnpm test:v4f-indbase-real-dogfood-friction-pass
  -> V4f indbase real dogfood friction pass gate passed
pnpm typecheck
  -> passed
```

The V4g and V3c gates also ran `pnpm build` successfully.

## Local-Only Provider Smoke

Real-provider smoke remains optional and local-only:

```powershell
set CONSOLER_TUI_ASSISTED_INTENT=1
set CONSOLER_INTENT_PROVIDER_URL=<local-provider>
pnpm tui:indbase --
```

Do not commit provider endpoint, model, credentials, raw prompts, raw responses, provider logs, source snippets, private vault paths, or screenshots with private content.

Current status: not run in this closeout because fake-provider coverage is the release gate and no committed evidence should depend on private provider configuration.

## Boundary Check

V4g stays within consoler-owned assisted intent drafting:

- no protocol schema changes
- no runtime lifecycle/store/replay changes
- no transport changes
- no Python SDK changes
- no new indbase commands
- no `E:\indbase` core, adapter, or migration changes
- no persisted raw NL, provider request, provider response, provider message, prompt snapshot, or draft result
- no provider setup UI, provider marketplace, provider status panel, or persisted provider preferences
- no Web UI, vault browser, source browser, mutation UI, retrieval package, `ask`, embeddings, generated answers, default assisted behavior, or workflow automation
