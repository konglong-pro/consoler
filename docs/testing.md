# Testing

Use the narrowest check that proves the touched surface, then run broader checks only when shared behavior changed.

## Documentation

```powershell
pnpm docs:check
git diff --check
```

`pnpm docs:check` verifies entry-file budgets, manifest paths, phase lifecycle state, archive/superseded front matter, old root phase-path bans, and local links in the default reading set.

CI runs `pnpm docs:check` on Linux and Windows.

Archive link audit is report-only:

```powershell
pnpm docs:audit-archive
```

Use it when working on historical docs. It scans archive Markdown for missing local targets but does not fail the default documentation gate.

## Core Gates

```powershell
pnpm typecheck
pnpm build
pnpm test
pnpm test:conformance
pnpm test:agentctl-smoke
pnpm test:artifact-retrieval-smoke
pnpm test:python-sdk
pnpm test:python-sdk-package
```

## Package Tests

```powershell
pnpm --filter @consoler/protocol test
pnpm --filter @consoler/runtime test
pnpm --filter @consoler/agentctl test
pnpm --filter @consoler/conformance test
pnpm --filter @consoler/tui test
```

## Phase Gates

Current and historical gates are indexed in `docs/phase-manifest.yaml`.

Common current-era gates:

```powershell
pnpm test:v2-release-gate
pnpm test:v3b-intent-gate
pnpm test:v3c-assisted-intent-gate
pnpm test:v3c-tui-assisted-intent-gate
pnpm test:v4d-indbase-dogfood-ux
pnpm test:v4e-indbase-variant-intent-drafting
pnpm test:v4f-indbase-real-dogfood-friction-pass
pnpm test:v4g-indbase-nl-v2-intent-drafting
pnpm test:v5a-operation-trace-gate
```

## Local-Only Checks

```powershell
pnpm test:real-indbase-smoke
pnpm tui:indbase --
```

These require local real-agent setup and must not become default CI unless a future active phase provisions that environment.

The local-only runbook remains at `docs/testing/real-indbase-smokes.md` because it is still executable operational guidance, not only historical evidence.

## Historical Evidence

Phase gate docs, closeouts, and validation evidence live under `docs/testing/archive/`.

Do not read archived testing evidence by default. Use `docs/project-status.md` or `docs/phase-manifest.yaml` to find the closeout for a completed or frozen phase.
