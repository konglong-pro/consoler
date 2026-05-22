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

From consoler root (sets `PYTHONPATH` for the SDK import path):

```powershell
cd E:\consoler
$env:PYTHONPATH = "E:\consoler\sdks\python"
pnpm test:python-sdk
```

`indbase_agent` adapter tests live in `E:\indbase\tests\test_indbase_agent.py`.
