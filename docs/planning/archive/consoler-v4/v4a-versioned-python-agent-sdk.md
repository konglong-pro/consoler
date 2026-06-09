---
doc_type: phase_plan
phase_id: v4a-versioned-python-agent-sdk
title: Task execution brief: V4a Versioned Python Agent SDK
status: completed
canonical: false
read_by_default: false
superseded_by: null
---

# Task execution brief: V4a Versioned Python Agent SDK

Turn the existing `sdks/python` source-tree SDK into a versioned, installable, privately publishable Python package for out-of-process consoler agents.

## Scope

- In scope: `sdks/python`, SDK package metadata, package build/check/install smoke scripts, root package scripts, CI gate wiring, `AGENTS.md`, `CONTEXT.md`, this plan, and `docs/adr/0005-versioned-python-agent-sdk.md`.
- Out of scope: TypeScript package publication, protocol version changes, runtime/TUI/agentctl behavior changes, public PyPI upload, default CI upload, real `E:\indbase` migration, real-agent package index consumption, generated schema package work, and changes to agent business logic.

## Assumptions

- The only package published in this phase is the Python package named `consoler-agent-sdk`, imported as `consoler_agent_sdk`.
- SDK version starts at `0.1.0`; the SDK declares compatibility with consoler protocol `0` separately from package version.
- Runtime dependencies remain empty unless a focused SDK bug proves a dependency is necessary.
- Internal package index URL and credentials are operational secrets and must not appear in committed docs, fixtures, logs, snapshots, PR descriptions, or release notes.

## Implementation Plan

1. Package metadata.
   - Update `sdks/python/pyproject.toml` to use `hatchling` as the PEP 517 build backend.
   - Set package version to `0.1.0`.
   - Add `README.md` as package readme and minimal internal metadata.
   - Keep `requires-python = ">=3.11"`.
   - Keep runtime dependencies empty.
   - Add dev dependencies for `pytest`, `build`, `twine`, and any packaging-only tool required by scripts.

2. SDK public version and compatibility exports.
   - Add `__version__ = "0.1.0"` to `consoler_agent_sdk`.
   - Add a small compatibility constant such as `SUPPORTED_PROTOCOL_VERSION = "0"`.
   - Export both through `__all__`.
   - Add Python SDK tests that assert these values and existing public exports are importable.

3. README and install documentation.
   - Replace V0 `PYTHONPATH`-only wording with installable package usage.
   - Keep source-tree test instructions for repository development.
   - Document internal install examples using placeholder package index configuration only.
   - Document that upload is explicit and defaults to dry-run.

4. Package build gate.
   - Add `scripts/test-python-sdk-package.mjs`.
   - Clean `sdks/python/dist`.
   - Run `python -m build` in `sdks/python`.
   - Assert one wheel and one sdist are produced for `consoler-agent-sdk`.
   - Run `python -m twine check dist/*`.

5. Installed package smoke.
   - In the package gate, create a temporary virtual environment.
   - Install the built wheel with `pip`.
   - Run import checks without `PYTHONPATH`.
   - Execute a temporary fake adapter script that imports only the installed package and exercises newline-delimited JSON-RPC over stdio.
   - Cover `agent.health`, `agent.discover`, `agent.validate`, `agent.plan`, `agent.preview`, default unsupported `agent.get_artifact_view`, and one `agent.execute` path that emits `action.started` and `action.succeeded`.

6. Publish dry-run/upload script.
   - Add `scripts/publish-python-sdk.mjs`.
   - Default mode is dry-run; `--publish` is required for upload.
   - Dry-run builds/checks and prints non-sensitive artifact names.
   - Publish mode requires `CONSOLER_PYPI_REPOSITORY_URL` and twine credentials from environment variables.
   - Publish mode runs `python -m twine upload --repository-url <env> dist/*`.
   - Do not print credentials or private repository URL details.

7. Root scripts and CI.
   - Add `pnpm test:python-sdk-package`.
   - Add `pnpm publish:python-sdk`.
   - Add the package gate to Linux CI after the existing Python SDK test path.
   - Keep CI upload-free.
   - Keep Windows CI on existing Python SDK tests unless package smoke proves Windows-specific packaging risk.

8. Agent routing documentation.
   - Add AGENTS routing for Python Agent SDK packaging/release work.
   - Add commands for package gate and dry-run publish.
   - Keep detailed release procedure in SDK README or testing docs, not in `AGENTS.md`.

## Tests

Run from the repository root:

```powershell
pnpm test:python-sdk
pnpm test:python-sdk-package
pnpm test:conformance
pnpm test:v2-release-gate
pnpm typecheck
pnpm build
pnpm test
git diff --check
```

Run when touching real-agent consumption in a later phase, not in V4a:

```powershell
pnpm test:real-indbase-smoke
```

## Acceptance Criteria

- `consoler-agent-sdk` builds into a wheel and sdist from `sdks/python`.
- Built artifacts pass `twine check`.
- A clean temporary virtual environment can install the built wheel.
- Installed package smoke passes without `PYTHONPATH`.
- Existing Python SDK tests still pass from source.
- Conformance fake-agent tests still pass.
- CI validates package build/install smoke but does not upload.
- Publish script cannot upload without explicit `--publish` and required environment variables.
- No private package index URL, credential, token, or real internal endpoint is committed.
- No `E:\indbase` changes are required.

## Remaining Risks

- Real agent repositories still need a later migration plan to consume the internal package index instead of source-tree `PYTHONPATH`.
- Internal index authentication shape may require small release-script adjustments when the actual index is provisioned.
- SDK API stability is still pre-1.0; breaking SDK API changes may occur in future `0.MINOR` releases.
