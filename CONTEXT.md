# consoler glossary

Implementation-free terms for the agent operations console.

## Agent Operations Console

A generic console for operating out-of-process agents through shared protocol objects and lifecycle rules, not a product-specific UI for one agent.

`consoler` core should stay generic so it can be adapted into different product-specific console variants. A deployed or embedded variant may be fully tailored to one host product or agent set, such as an `indbase`-adapted consoler, and should not present itself as a universal agent search interface unless that is the explicit product goal.

## Console Variant

A configured product version of consoler for a specific host or agent set. The variant chooses which agents are available and how they are presented before the user enters the TUI; users are not expected to search across arbitrary agents inside the product UI.

Developer tooling such as `agentctl intent-draft` may expose explicit agent filters for debugging. Product TUI surfaces should instead respect the Console Variant's configured scope and avoid presenting arbitrary cross-agent search as the default interaction.

## indbase Console Variant Probe

A narrow indbase-adapted Console Variant used to dogfood trusted indbase workflows through the existing Runtime Lifecycle. It exposes product actions for bounded operations such as vault health checks, source search, review inspection, and artifact views without becoming a full indbase product UI, Web UI, or vault browser.

The probe keeps consoler responsible for the TUI shell, action lifecycle, history, trace, replay, and generic artifact retrieval transport, while indbase agent code owns indbase command manifests, `indbase://` interpretation, vault reads, and calls into indbase core services.

## indbase Dogfood UX Variant

A consoler-owned refinement of the indbase Console Variant Probe that makes the existing Source Trust Loop easier to operate through product labels, action ordering, navigation, empty states, and smoke-tested artifact-view flows, without making natural-language drafting the primary path or adding agent business logic, protocol changes, Web UI, vault browsing, or new indbase mutations.

## Indbase Variant Intent Drafting

A deterministic, indbase-variant-scoped natural-language drafting slice that maps one user request to one reviewable Source Trust Loop action inside the existing indbase Console Variant. It is a form-prefill accelerator, not chat, assisted intent by default, a multi-action workflow, vault inference, direct execution, or an indbase core feature.

Indbase Variant Intent Drafting may combine a runtime `prefilled_args` result with session-local Variant Vault Context only in the TUI form layer. The runtime mapper does not infer missing `vault_path` from session state, history, cwd, or the filesystem.

## Indbase NL v2 Intent Drafting

An indbase Console Variant drafting phase that may use opt-in assisted intent only after deterministic drafting is insufficient, while still producing at most one editable Source Trust Loop action form. It may send the user's current text, scoped indbase action surface, product labels, field hints, and schema hints to the provider, but not session vault context, history, trace, artifact metadata, vault contents, source snippets, previous results, or filesystem reads.

Indbase NL v2 Intent Drafting is still Intent Drafting. It is not chat, `ask`, direct execution, a multi-action workflow, latest-result inference, vault browsing, generated answers, or an indbase core feature.

## Source Trust Real Dogfood Friction Pass

An evidence-first closeout phase for the indbase Console Variant where real local Source Trust Loop use identifies and fixes concrete TUI friction in the existing surface. It may refine consoler-owned variant UX, tests, and docs, and may make narrow indbase adapter fixes only when real dogfood proves a contract defect. It is not a new feature phase, protocol/runtime/store/schema change, Web UI, vault browser, generated-answer flow, review/category/tag mutation, or expansion of the Source Trust Loop action surface.

## Single-Source Trust Walkthrough

The primary indbase dogfood path in the TUI: operate one vault and one source through health check, ingest or prepared fixture state, governed search, document artifact inspection, review/task/error inspection, and traceability before broader browsing or automation is added.

## Variant Vault Context

A product-variant convenience value that remembers the last successful indbase vault path for TUI form prefill. It is not vault discovery, a vault list, a filesystem scanner, or indbase-owned configuration.

The first version is session-local TUI memory only; it does not persist to the runtime SQLite store, config files, history-derived defaults, or cwd-derived inference.

## Composed Variant Surface

A product UX strategy that combines the existing home, schema form, action timeline, result blocks, artifact view panel, history, and trace surfaces instead of adding a variant-specific wizard or parallel lifecycle state machine.

## Artifact Open/Back Path

The minimal artifact-view UX where a user can notice an artifact block, open it intentionally, inspect the bounded agent-owned view, and return to the originating action timeline or trace. It is not an artifact gallery, arbitrary URI fetch, or persisted content cache.

## Deterministic Variant Dogfood Smoke

A repeatable product-variant validation using disposable synthetic indbase vault state and the real agent path. It proves the walkthrough without depending on a private vault, real swallow availability, or manual-only evidence.

## Indbase Dogfood UX Gate

The consoler-side release gate for the indbase Dogfood UX Variant, covering variant action surface, product labels, session-local vault prefill, artifact open/back behavior, variant-scoped history or trace behavior, copy hygiene, and optional real-indbase smoke.

## Source Trust Loop Action Surface

The indbase variant's ten-command action set: vault health, single-file ingest, governed source search, document inspection, review inspection, task inspection, and error inspection. Only ingest is a write action; category/tag mutation, retrieval packages, `ask`, and generated-answer workflows stay out.

## Variant Copy Hygiene

The narrow maintenance rule that product variant labels, help text, and intent hints should be valid, readable UTF-8 text when the variant file is touched. It is not a repository-wide localization rewrite.

## Variant-Only UX Configuration

Checked-in TUI configuration fields for product grouping, display copy, form prefill, and variant-local guidance. These fields do not modify the agent protocol, agent manifest, runtime store schema, or agent business logic.

## TUI Shell

A reusable interface foundation for running the Runtime Lifecycle. It may support generic agent and command selection for development and debugging, but a product-facing experience should enter through a Console Variant that preconfigures the available agent scope and action context.

## Product Action Surface

The product-facing task language exposed by a Console Variant. It should describe actions in the host product's terms, such as checking an indbase vault or ingesting a file, rather than asking normal users to reason about `agent_id` and protocol command names. Natural-language entry points should ask in the host product's context and route uncertain drafts back to the variant's task surface, not to a cross-agent candidate list. Debugging surfaces may still show protocol identifiers for traceability.

## Variant Configuration

A curated definition that binds a Console Variant to its allowed agent scope, default action context, and product-facing labels. It may include one agent or a product-specific set of agents, but the user experience is still organized around product actions rather than agent discovery. It is maintained as part of the product, not edited by ordinary users through a marketplace-style agent installation or search UI.

Variant Configuration may include narrow `intentHints` for natural-language matching. These should be short action-level or field-level keyword arrays, including localized terms when useful; they should not be prompt examples, training samples, or protocol fields.

## Product Entry Point

The normal way a user enters a Console Variant. It should open directly into the configured product context, while generic shell entry points may remain available for development, testing, and protocol debugging.

## Audit Surface

A traceability-focused surface such as trace, JSON, raw events, or artifact metadata. It may expose protocol identifiers and low-level lifecycle details so developers can debug and users can audit what happened, while the Product Action Surface remains organized around host-product tasks.

## Action Timeline

The primary UI surface showing one action’s lifecycle in order: draft, plan, static preview, approval, live events, and result blocks. It is the main panel in the Ink TUI, not a separate history browser.

## Prepared Action

A runtime bundle for a single `action_id` after schema validation, agent validate/plan, context snapshot, static preview, and approval token creation. The TUI approves and executes this same bundle so preparation and execution stay aligned.

## Static Preview

A preview that does not read the vault or call `agent.validate`. The runtime validates args with JSON Schema only, then asks the agent for a static preview payload. Distinct from plan-time context snapshots, which may read vault mtimes for approval binding.

## Replay

Reconstructing the accepted event timeline for a known `action_id` from SQLite. Replay does not spawn an agent and does not re-read the vault. Replay uses accepted events only; rejected events are visible in trace, not replay.

## Conformance Harness

A reusable, read-only compatibility suite that verifies an out-of-process agent speaks the current protocol: registry entry, health, discover, manifest validation, and optional command-specific plan/preview/execute checks. Default runs are non-executing; execution requires explicit approval flags.

## Python Agent SDK

A versioned Python package for building out-of-process agents that speak the consoler agent protocol.

The Python Agent SDK version is a package release version, not the wire `protocol_version`; SDK releases should declare which protocol version they support.

## Action History

A read-only, action-centric list of recent prepared and executed actions from the local SQLite store. Each row summarizes command, derived status, latest run, timestamps, and accepted/rejected event counts. History does not spawn agents.

## Trace View

A read-only debugging surface for one `action_id`: action args, latest plan and context, execution approvals, runs, accepted events, rejected events (with `reject_reason`), and result blocks. Trace may include events replay omits. It does not re-read vault or source state.

## Runtime Lifecycle

The ordered path managed by `@consoler/runtime`: discover, validate, plan, preview (static or probe), preview approval when required, execution approval, execute, persist events, and optional history/trace/replay reads. `agentctl` and the TUI share `prepareAction` and `executePrepared` so CLI and UI do not fork behavior.

## Natural Language Intent Drafting

A user-input helper that maps natural language into a candidate explicit action (`agent_id`, command, and args) plus confidence or clarification needs. It does not execute agents, approve actions, bypass validation, or replace the Runtime Lifecycle.

The first version has two public outcomes only: `candidate` when exactly one complete single-action draft is reliable enough to continue, or `needs_clarification` when the mapper is ambiguous or incomplete. It does not expose ranked alternative candidates.

The first version may use internal deterministic scores for thresholds and tests, but public results should not expose numeric confidence. Public output should communicate the outcome plus reason codes or explanatory text instead of model-like probability values.

In the TUI, natural language is an entry path for creating an explicit action draft inside the current Console Variant, not a separate free-form chat surface. A candidate still flows through explicit user confirmation, schema validation, preview, approval, and execution.

A candidate should seed the existing schema form with extracted args, not skip the form. Users must be able to review and edit those args before the action enters prepare, preview, approval, or execution.

Product variant home screens may expose a persistent single-shot natural-language input such as "Describe what you want to do." It is an action-drafting entry, not a chat transcript, and should immediately route to a candidate form or clarification/form path.

The first version should keep the explicit product action list alongside natural-language input. Natural language is an acceleration path, not the only way to start an action, and the action list remains the reliable fallback and discoverability surface.

## Intent Draft

One proposed explicit action derived from natural language. It represents a single candidate `ActionDraft`, not a workflow, DAG, or automatic sequence of actions.

In the first version, raw natural language input and Intent Drafts are ephemeral helper state only. They are not persisted to the action store or history; only a user-confirmed action enters the existing Runtime Lifecycle and durable trace.

## Intent Clarification

A non-terminal intent drafting result that says the mapper could not produce a reliable complete Intent Draft. In the first version, clarification routes users to the existing schema form instead of starting a multi-turn natural-language conversation.

The first version may include deterministic clarification text such as missing required fields, ambiguous command matches, or ambiguous argument-field matches. This text is explanatory only; it does not start a multi-turn chat loop.

Stable `needs_clarification` reason codes for the first version are `no_match`, `ambiguous_command`, `missing_required_args`, `ambiguous_args`, and `unsupported_schema`. TUI and CLI copy should map from these codes instead of parsing free-form text.

For intent mapping, `unsupported_schema` means the command input schema is outside the first mapper's simple extraction surface. The first version supports top-level object schemas with primitive fields, required fields, and light enum/default handling; nested objects, arrays of objects, composition keywords such as `oneOf`/`anyOf`/`allOf`, `patternProperties`, and conditional schemas should fall back to the schema form.

The first version does not interpret one natural-language input as multiple files, multiple targets, or multiple actions. For a single-file command such as `indbase.ingest_file`, inputs that clearly mention several source files should return `needs_clarification` with `ambiguous_args` and route to the schema form.

## Intent Mapper

The consoler-owned component that uses agent manifests, command descriptions, and argument schemas to produce an Intent Draft from natural language. Agents do not receive natural-language input in the first version of intent drafting.

Intent mapping runs inside the configured Console Variant's agent scope. For example, an `indbase`-adapted consoler should map language to the configured indbase commands, not ask the user to search for or choose among unrelated agents.

## Intent Scope

A neutral runtime input that describes which agents and commands the mapper may consider, plus product-facing labels or descriptions when available. TUI variants and developer tools can both build an Intent Scope, but the runtime mapper should not import or depend on `ConsoleVariantConfig`.

Product-facing labels and descriptions in an Intent Scope are matching hints only, not protocol fields. A successful Intent Draft still outputs protocol-level `agent_id`, command, and args.

Chinese or other localized matching hints should come from the Console Variant's product configuration when that variant is built into an Intent Scope, not from `AgentManifest` or protocol schemas.

Developer tooling such as `agentctl intent-draft` should default to human-readable debug output and expose stable machine-readable output through `--json`. The debug output may show outcome, reason, matched product action, protocol agent/command, and prefilled args.

Stable intent-draft JSON should name extracted form seed values `prefilled_args`, not `args`, because they are reviewable initial values for the schema form rather than final approved action arguments.

## `draftIntent`

A pure runtime mapper API shaped as `draftIntent({ text, scope })`. Callers build the neutral `IntentScope`; `draftIntent` does not read the registry, import Variant config, read the filesystem, or spawn agents. It returns an `IntentDraftResult` with either `candidate` or `needs_clarification`.

## Deterministic Intent Mapper

The first Intent Mapper implementation. It uses deterministic matching against manifest command names, descriptions, and argument schemas; it does not call an LLM or require model credentials.

The first mapper may conservatively extract obvious literal arguments such as quoted strings, Windows or Unix paths, URLs, numbers, and boolean words. It only assigns them to high-confidence schema fields such as `file_path`, `path`, `url`, or `limit`; missing required fields, ambiguous field matches, and complex object arguments return `needs_clarification` and route to the schema form.

The first mapper does not require natural-language-only fields in `AgentManifest` or protocol schemas. Matching should use existing command names, command descriptions, JSON Schema field names/descriptions, and the current Console Variant configuration.

The first mapper should support basic Chinese natural-language input through deterministic keyword, substring, and path extraction when Chinese product labels or descriptions are present in the Intent Scope. It should not add translation, pinyin matching, language-model tokenization, or LLM semantic understanding in the first version.

When several schema fields are path-like, path assignment must be conservative. For indbase-style commands, an import/file intent with one path may prefill `source_path` and leave `vault_path` missing; a vault/status/check intent with one path may prefill `vault_path`. Two paths should only be assigned when nearby keywords clearly distinguish vault-like and file-like paths; otherwise return `ambiguous_args`. The mapper should not infer `vault_path` from cwd, history, or prior actions in the first version.

Intent mapping should not read the filesystem, check whether paths exist, classify paths as files or directories, or validate vault state. Environment reads belong to the existing schema validation, plan, preview, approval, and execution lifecycle.

## LLM-assisted Intent Drafting

A later Intent Drafting mode that may use a language model to improve natural-language understanding while still producing a reviewable Intent Draft or Intent Clarification. It remains an action-drafting helper, not a direct execution path, chat transcript, agent marketplace, or replacement for the Runtime Lifecycle.

An LLM-assisted Intent Draft must still resolve to explicit protocol identifiers and reviewable prefilled form values before prepare, preview, approval, or execution can occur.

LLM assistance is an opt-in enhancement path. When it is not configured, unavailable, timed out, or returns an unusable result, the product should retain a deterministic Intent Drafting fallback rather than requiring model credentials or network access for the normal console entry.

## Intent Draft Orchestration

The decision path that may combine the Deterministic Intent Mapper with optional LLM-assisted suggestions, validate the result, and choose a safe fallback. It produces the same public Intent Drafting outcomes as the rest of intent drafting and does not enter prepare, preview, approval, or execution.

## LLM Intent Provider

An opt-in source of model-backed drafting suggestions for LLM-assisted Intent Drafting. It may improve matching and argument extraction, but it does not own the Runtime Lifecycle and does not produce final approved action arguments.

The normal console entry should not depend on an LLM Intent Provider being configured. Provider-specific credentials, models, timeouts, and transport details belong outside the Deterministic Intent Mapper.

When LLM assistance is enabled, the user's raw natural-language input and the minimal current Intent Scope may be sent to the configured LLM Intent Provider. The provider context should not include action history, trace records, artifact content, vault contents, filesystem reads, database reads, prior user inputs, preview payloads, result payloads, or event streams unless a later plan explicitly changes that boundary.

Provider endpoint details, credentials, model names, and other sensitive provider configuration are operational details, not product-domain language. They should stay out of committed docs, test fixtures, snapshots, logs, PR descriptions, and release notes unless they are deliberately public placeholders.

## Probe Preview

A read-only preview (`probe_readonly`) that may inspect source files and open the vault database read-only for duplicate detection. It does not run validate/plan, write ingest plans, or mutate vault state. Requires preview approval before the runtime calls `agent.preview`.

## Preview Approval

An approval token with `scope: preview` that binds normalized args and preview side effects only. Required before probe preview runs for side-effecting commands such as `indbase.ingest_file`.

## Execution Approval

An approval token with `scope: execute` that binds normalized args, plan hash, context snapshot hash, side effects, and probe preview hash (when present). Required before `executePrepared` runs.

## Context Drift

When source file metadata or vault marker/config/db state changes after execution approval was minted, the runtime rejects execution with `context_changed` and requires re-preview and re-approval.

## Diff Block

A `RenderableBlock` with `type: "diff"` whose `content` carries a unified diff string (`unified_diff`) plus optional `language`, `from_label`, and `to_label`. Agents emit diff blocks to describe file or text changes; consoler renderers show the diff text only and do not apply patches or read paths from the diff.

## Artifact Block

A `RenderableBlock` with `type: "artifact"` whose `content` references produced output by `uri` and `kind`, with optional `label` and `metadata`. In V1d, artifact blocks are event-carried references only: TUI, trace, and replay may display metadata but must not open or resolve the `uri` unless a future planning doc adds artifact storage and fetch.

For `indbase.ingest_file`, artifact blocks use logical `indbase://ingest_runs/...`, `indbase://documents/...`, and `indbase://document_revisions/...` URIs. These are consoler renderable references to indbase entities, not indbase internal durable evidence artifacts and not filesystem paths.

## Artifact Retrieval

A controlled, user-triggered read flow where consoler asks the artifact-owning agent to return viewable content for an artifact URI without consoler taking ownership of artifact storage; it is separate from Replay and is not an Action.

## Artifact Browser

A read-only surface for inspecting retrieved artifact content and metadata from an Artifact Block.

## Artifact View

A retrieved, renderable view of one artifact URI made of metadata and non-artifact Renderable Blocks.

## Artifact Retrieval Attempt

A lightweight audit record that an Artifact Retrieval was requested for an Artifact Block, without storing the retrieved Artifact View content.

## Cooperative Cancel

A non-preemptive action stop flow where the runtime asks an executing agent to stop and the agent decides when to observe that request. It is not a forced process kill and does not by itself create a terminal action state.

## Cancel Request

The runtime-side request that asks an executing agent to stop. A cancel request is only intent; the action is still running until the event stream reaches a terminal event.

## Cancel Checkpoint

An agent-owned point in execution where the agent checks whether cancellation has been requested and can stop cleanly before continuing work.

## Cancelled Terminal Event

The event-stream fact that an action ended because cancellation was observed by the agent. In the current protocol this is represented by `action.cancelled` and is distinct from a cancel request.

## Interaction Request

A structured prompt an agent emits during execution as an `interaction.required` event with an `interaction` payload (`interaction_id`, `title`, `message`, and optional `choices`, `prompt_schema`, `default_response`, or `blocks`). It asks the runtime or UI for user input without ending the run.

## Interaction Response

The user’s answer routed back to the same live agent process through `action.respond_interaction`. V1i persists response JSON in the `interactions` table for trace and history debugging. V1l may redact marked top-level object fields in persisted trace data and stored `interaction.required` payloads while the live agent still receives the full response. Replay remains accepted agent events only and does not include interaction responses.

## Interaction Redaction

Opt-in trace persistence protection for object-schema interactions. Agents mark top-level `prompt_schema.properties.<field>` with `x-consoler-redact: true`; the runtime replaces those field values with `"[REDACTED]"` in SQLite and records JSON Pointer paths in `redacted_paths`. Redaction does not change the live `action.respond_interaction` payload.

## Pending Interaction

The single in-flight interaction a run accepts at a time. The runtime tracks one pending `interaction_id` between an accepted `interaction.required` event and a successful `respondInteraction` call (or run termination).

## Runtime Control Lock

A per-run internal execution phase tracked by the runtime during live `executePreparedWithControl`: `running`, `cancel_requested`, `cancelling`, and `terminal`. The lock coordinates idempotent cancel requests, post-cancel event quarantine, and force-kill fallback without changing wire protocol `epoch` semantics.

## Cancel Timeout

The runtime-owned timer started when the first `agent.cancel` request is sent. If the agent does not emit an accepted `action.cancelled` before the timeout (default 5000ms, overridable via `ConsolerRuntimeOptions.cancelTimeoutMs`), the runtime force-kills the agent process.

## Force-kill Fallback

When cancel timeout expires, the runtime kills the agent process, abandons pending interactions, closes the run as `failed`, and records a run-level control error. The runtime must not synthesize `action.cancelled` or other terminal agent events on this path.

## Control Error

A run-level failure recorded when strong runtime control closes a run without an agent terminal event, such as `cancel_timeout`. Control errors appear in history/trace on the `runs` row; replay remains accepted agent events only.
