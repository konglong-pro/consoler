# Artifact Retrieval Glossary

## Terms

**Renderable Block**: Agent-emitted display block such as markdown, table, JSON, error, diff, or artifact.

**Diff Block**: Renderable block carrying unified diff text for display only. Consoler does not apply patches from it.

**Artifact Block**: Renderable block with artifact metadata and an opaque agent-owned `uri`.

**Artifact Retrieval**: User-triggered read flow where consoler asks the artifact-owning agent for a view of an accepted artifact block.

**Artifact Browser**: Read-only TUI surface for inspecting retrieved artifact content and metadata.

**Artifact View**: Retrieved view of one artifact URI made of metadata and non-artifact renderable blocks.

**Artifact Retrieval Attempt**: Lightweight audit record that retrieval was requested; it does not store retrieved content.

## Relationships

Artifact blocks are event references. Artifact retrieval is separate from action execution and replay.
