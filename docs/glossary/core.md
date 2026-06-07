# Core Glossary

## Terms

**Agent Operations Console**: Generic console for operating out-of-process agents through shared protocol objects and lifecycle rules.

**Action Draft**: Explicit proposed action with agent, command, and args before validation/plan/preview/approval/execution.

**Prepared Action**: Runtime bundle for one `action_id` after validation, plan, context snapshot, preview, and approval token creation.

**Audit Surface**: Trace, JSON, raw event, or artifact metadata surface that may expose protocol identifiers for debugging and auditability.

**Python Agent SDK**: Python package for building out-of-process agents that speak the consoler protocol. SDK package version is separate from wire `protocol_version`.

**Conformance Harness**: Compatibility suite for out-of-process agents. Default runs are safe/non-executing unless command args and approval flags are supplied.
