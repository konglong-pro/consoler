# Agent Manifest Contract

## Purpose

Define the durable expectations for agent manifests consumed by consoler.

## Rules

- Manifest identifiers are protocol/audit identifiers, not product-facing labels.
- Product labels belong in Console Variant configuration, not in the wire manifest.
- Commands expose JSON Schema input contracts that consoler can validate before plan, preview, or execution.
- Optional capabilities may advertise supported protocol features, such as artifact retrieval.
- Old valid manifests should remain valid unless a future protocol contract explicitly bumps compatibility.
- Natural-language-only aliases, prompt examples, provider details, and product marketplace metadata do not belong in `AgentManifest`.

## Validation

- Protocol schemas and validators live in `packages/protocol/`.
- Manifest fixture coverage lives under `packages/protocol/src/fixtures/` and package tests.
