# Runtime Lifecycle Glossary

## Terms

**Runtime Lifecycle**: Ordered path managed by `@consoler/runtime`: discover, validate, plan, preview, approval, execute, persist events, and read history/trace/replay.

**Static Preview**: Preview that validates args and asks the agent for static preview content without probing mutable environment state.

**Probe Preview**: Read-only preview that may inspect source/vault state before execution and requires preview approval when side effects are involved.

**Preview Approval**: Approval token with `scope: preview` that binds normalized args and preview side effects.

**Execution Approval**: Approval token with `scope: execute` that binds normalized args, plan hash, context snapshot hash, side effects, and preview hash when present.

**Context Drift**: Runtime rejection when source/vault marker/config/db state changes after approval material was minted.

**Action History**: Read-only action-centric list from the local store; it does not spawn agents.

**Trace View**: Read-only debug surface for one `action_id`; may include accepted and rejected events.

**Operation Trace**: Accepted-event trace payload that summarizes an agent operation without causing consoler to re-read agent domain state.

**Replay**: Accepted-event reconstruction for a known `action_id`; does not spawn agents or re-read state.

**Cooperative Cancel**: Runtime asks the agent to stop; the action is not terminal until an agent terminal event is accepted or runtime control fails the run.

**Interaction Request**: Agent-emitted `interaction.required` event asking for user input during execution.

**Interaction Redaction**: Opt-in protection for persisted interaction trace fields marked by schema metadata.
