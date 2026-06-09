# Current Consoler Agent Rules

Applies to active consoler work resolved from `docs/phase-manifest.yaml`.

## Start

1. Read `docs/active/current.md`.
2. Read the active phase spec listed there.
3. Read only the contracts and ADRs relevant to the touched area.

## Current Scope

Active phase: `v5a-operation-trace-artifact-vocabulary`.

Allowed work:

- Operation Trace protocol type and schema.
- Runtime trace extraction from accepted action event payloads.
- Read-only Operation Trace display in trace surfaces.
- Artifact vocabulary alignment without wire-field renames.
- Agentctl, conformance, TUI, Python SDK, and focused test coverage listed in the active phase plan.
- Documentation, contract, ADR, and gate updates required by the phase.

Do not edit real `E:\indbase` implementation files for this phase.

## Rules

- Keep automatic entry files compact.
- Do not duplicate durable rules across phase docs.
- Do not treat archived, completed, or superseded phase plans as active instructions.
- Do not infer current phase from newest filename.
- Do not move legacy docs unless the same change rewrites affected links.
- Keep commands exact and sourced from `package.json`, scripts, CI, or existing docs.
- Do not add runtime DB migrations for Operation Trace in V5a.
- Do not make trace/history spawn agents or re-read vault, source, provider, artifact, or agent domain state.
- Do not parse or dereference agent-owned or provider-owned refs in generic consoler code.
- Preserve existing artifact block and artifact view wire fields.

## Validation

Run:

```powershell
pnpm test:v5a-operation-trace-gate
git diff --check
```

Before the v5a gate script exists, run the focused commands listed in `docs/planning/active/v5a-operation-trace-artifact-vocabulary.md`.
