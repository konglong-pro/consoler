# Console Variant Glossary

## Terms

**Console Variant**: Configured product version of consoler for a specific host or agent set.

**Product Entry Point**: Normal entry into a configured product context, such as `pnpm tui:indbase --`.

**Product Action Surface**: Product-facing task language exposed by a variant instead of raw protocol command selection.

**Variant Configuration**: Checked-in definition of allowed agent scope, action context, labels, ordering, and hints.

**Variant-Only UX Configuration**: Product grouping, display copy, form prefill, and guidance that does not modify protocol or agent behavior.

**Variant Vault Context**: Session-local TUI convenience value used for form prefill; not vault discovery or runtime inference.

**Composed Variant Surface**: Reuse of home, schema form, action timeline, result blocks, artifact view, history, and trace instead of a separate wizard.

**Variant Copy Hygiene**: Rule that touched variant copy should remain readable terminal-safe text.
