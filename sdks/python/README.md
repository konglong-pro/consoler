# consoler-agent-sdk

Minimal Python SDK (`consoler_agent_sdk`) for out-of-process consoler agents over newline-delimited stdio JSON-RPC.

Package version (`0.1.0`) is separate from wire `protocol_version`; import `SUPPORTED_PROTOCOL_VERSION` for the SDK's declared protocol compatibility.

## Layout

- `consoler_agent_sdk/server.py` - JSON-RPC loop and lifecycle dispatch
- `consoler_agent_sdk/adapter.py` - adapter base class
- `consoler_agent_sdk/events.py` - monotonic `seq`, steps, progress, cancel checkpoints
- `consoler_agent_sdk/blocks.py` - markdown/table/json/error renderable blocks

## Install (Git tag)

Install the released SDK from the consoler repository tag:

```powershell
pip install "git+https://github.com/konglong-pro/consoler.git@consoler-agent-sdk-v0.1.0#subdirectory=sdks/python"
```

Use the same direct reference in package metadata when another repository needs the SDK:

```toml
consoler-agent = [
  "consoler-agent-sdk @ git+https://github.com/konglong-pro/consoler.git@consoler-agent-sdk-v0.1.0#subdirectory=sdks/python",
]
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

## Release

The SDK release coordinate is a Git tag on the consoler repository, not a package-index upload. For version `0.1.0`, tag the default-branch commit that passed the package gate:

```powershell
git tag consoler-agent-sdk-v0.1.0
git push origin consoler-agent-sdk-v0.1.0
```

Do not reuse the tag for a different SDK build. Move to a new SDK version and tag if the released package contents change.

## Agent adapter tests

`indbase_agent` adapter tests live in `E:\indbase\tests\test_indbase_agent.py` and may still use a source-tree `PYTHONPATH` until that repo migrates to the released Git tag.
