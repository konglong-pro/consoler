# consoler-agent-sdk

Minimal Python SDK (`consoler_agent_sdk`) for out-of-process consoler agents over newline-delimited stdio JSON-RPC.

Package version (`0.1.0`) is separate from wire `protocol_version`; import `SUPPORTED_PROTOCOL_VERSION` for the SDK's declared protocol compatibility.

## Layout

- `consoler_agent_sdk/server.py` — JSON-RPC loop and lifecycle dispatch
- `consoler_agent_sdk/adapter.py` — adapter base class
- `consoler_agent_sdk/events.py` — monotonic `seq`, steps, progress, cancel checkpoints
- `consoler_agent_sdk/blocks.py` — markdown/table/json/error renderable blocks

## Install (internal package index)

Install a released wheel from your organization's private index (replace placeholders; do not commit real index URLs or credentials):

```powershell
pip install consoler-agent-sdk==0.1.0 `
  --index-url https://<your-internal-pypi-host>/simple/ `
  --extra-index-url https://pypi.org/simple/
```

Or configure pip via environment variables, for example:

```powershell
$env:PIP_INDEX_URL = "https://<your-internal-pypi-host>/simple/"
$env:PIP_EXTRA_INDEX_URL = "https://pypi.org/simple/"
pip install consoler-agent-sdk==0.1.0
```

## Repository development (source tree)

From the consoler repository root, run SDK unit tests against the source tree (no wheel install required):

```powershell
cd E:\consoler
pnpm test:python-sdk
```

`pnpm test:python-sdk` prefers `uv run --directory sdks/python --with pytest` when `uv` is on PATH. Otherwise it uses `scripts/resolve-python.mjs` and installs `pytest` with `pip` if needed (same expectation as CI).

Validate wheel build, `twine check`, and installed-package smoke (no `PYTHONPATH`):

```powershell
pnpm test:python-sdk-package
```

## Publish (explicit, dry-run by default)

From the consoler repository root:

```powershell
# Build + twine check only; prints artifact basenames (no index URL)
pnpm publish:python-sdk

# Upload built dist/* (requires env vars; never commit secrets)
$env:CONSOLER_PYPI_REPOSITORY_URL = "https://<your-internal-pypi-host>/"
$env:TWINE_USERNAME = "<username-or-token-name>"
$env:TWINE_PASSWORD = "<token>"
pnpm publish:python-sdk -- --publish
```

`TWINE_API_KEY` may be used instead of `TWINE_PASSWORD`; the publish script maps it to Twine's password environment for upload. The configured repository URL and credential values are redacted from publish logs.

`--publish` is required for upload. Default CI does not upload packages.

## Agent adapter tests

`indbase_agent` adapter tests live in `E:\indbase\tests\test_indbase_agent.py` and may still use a source-tree `PYTHONPATH` until that repo migrates to the internal package index.
