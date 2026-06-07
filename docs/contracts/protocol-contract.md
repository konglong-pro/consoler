# Protocol Contract

## Purpose

Define durable protocol-level rules that apply before package-specific implementation details.

## Rules

- Protocol identifiers remain visible in audit/debug surfaces.
- Product-facing names belong in Console Variant configuration, not protocol-only objects.
- JSON Schemas are the validation boundary for action args and protocol objects.
- New protocol capabilities should be optional unless a future compatibility decision says otherwise.
- Runtime and clients must reject malformed protocol events before they affect action state.
- Protocol changes require focused schema/type tests and typecheck.

## Related Docs

- `docs/contracts/agent-manifest.md`
- `docs/contracts/consoler-agent-boundary.md`
- `docs/contracts/runtime-lifecycle-contract.md`
- `docs/adr/0001-agent-protocol-v0-boundaries.md`
