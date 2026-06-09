# consoler

Agent operations console and runtime for out-of-process agents (V0).

## Node.js

Use **Node 22 LTS** (see `.nvmrc`). Recommended: [fnm](https://github.com/Schniz/fnm) — already configured to read `.nvmrc` when you `cd` into this repo.

```powershell
fnm install   # reads .nvmrc → 22
node -v       # v22.x
```

If `better-sqlite3` fails with ABI errors, rebuild after switching Node: `pnpm rebuild better-sqlite3`.

## Quick start

```powershell
pnpm install
pnpm typecheck
pnpm test
pnpm agentctl -- discover indbase
```

See [AGENTS.md](AGENTS.md), [docs/active/current.md](docs/active/current.md), and [docs/project-status.md](docs/project-status.md).
