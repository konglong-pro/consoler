# Development

## Prerequisites

- Node.js 22 LTS, see `.nvmrc`.
- pnpm 10.18.1, see `package.json`.
- Python 3.11 for SDK and conformance checks.

## Install

```powershell
pnpm install
```

## Common Local Commands

```powershell
pnpm agentctl -- --help
pnpm tui --
pnpm tui:indbase --
pnpm typecheck
pnpm build
pnpm test
```

## Package Routing

- Protocol schemas/types: `packages/protocol/`
- Runtime lifecycle/store/transport/intent/artifact retrieval: `packages/runtime/`
- CLI: `packages/agentctl/`
- Conformance fake and harness: `packages/conformance/`
- TUI and variants: `packages/tui/`
- Python SDK: `sdks/python/`

## External Agent

The first real agent host repo is `E:\indbase`. Its command is:

```powershell
uv run python -m indbase_agent
```

Do not edit `E:\indbase` from this repo unless the user explicitly asks for cross-repo work.
