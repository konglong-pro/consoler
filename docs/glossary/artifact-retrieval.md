# Artifact Retrieval Glossary

## Terms

**Renderable Block**: Agent-emitted display block such as markdown, table, JSON, error, diff, or artifact.

**Diff Block**: Renderable block carrying unified diff text for display only. Consoler does not apply patches from it.

**Artifact Block**: Renderable block with artifact metadata and an opaque agent-owned `uri`.

**Artifact Ref**: Canonical vocabulary for an opaque artifact reference; in protocol v0 artifact blocks carry it as `content.uri`.

**Artifact Retrieval**: User-triggered read flow where consoler asks the artifact-owning agent for a view of an accepted artifact block.

**Artifact Browser**: Read-only TUI surface for inspecting retrieved artifact content and metadata.

**Artifact View**: Retrieved view of one artifact URI made of metadata and non-artifact renderable blocks.

**Artifact Evidence**: Agent-owned durable evidence metadata associated with an artifact or operation; consoler records and displays references but does not parse storage.

**Artifact Trust State**: Agent-emitted trust classification for an artifact reference, such as candidate, evidence, diagnostic, derived output, or trusted source.

**Artifact Retrieval Attempt**: Lightweight audit record that retrieval was requested; it does not store retrieved content.

## Relationships

Artifact blocks are event references. Artifact retrieval is separate from action execution and replay.
