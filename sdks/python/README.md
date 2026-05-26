# consoler_agent_sdk (V0)

Minimal Python SDK for out-of-process consoler agents over newline-delimited stdio JSON-RPC.

## Layout

- `consoler_agent_sdk/server.py` — JSON-RPC loop and lifecycle dispatch
- `consoler_agent_sdk/adapter.py` — adapter base class
- `consoler_agent_sdk/events.py` — monotonic `seq`, steps, progress, cancel checkpoints
- `consoler_agent_sdk/blocks.py` — markdown/table/json/error renderable blocks

## Local consumption (V0)

Registry entries set `PYTHONPATH` to this directory (see `.consoler/agents.json`).

## Tests

From consoler root:

```powershell
cd E:\consoler
pnpm test:python-sdk
```

`pnpm test:python-sdk` prefers `uv run --directory sdks/python --with pytest` when `uv` is on PATH.
Otherwise it uses `scripts/resolve-python.mjs` and installs `pytest` with `pip` if needed (same expectation as CI).

`indbase_agent` adapter tests live in `E:\indbase\tests\test_indbase_agent.py`.
