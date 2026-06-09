# Revision Contract

## Purpose

Record consoler-side trust boundaries for source/revision concepts exposed by host agents such as indbase.

## Rules

- Consoler must not treat candidates, previews, retrieved artifacts, or generated displays as trusted source revisions.
- Durable source or revision semantics belong to the owning agent or host product.
- If an agent exposes revision identifiers or revision artifact URIs, consoler may display them as opaque protocol data.
- Consoler must not mutate immutable revisions or infer revision trust from artifact display.
- Any operation that promotes, copies, or records durable evidence must be an explicit agent action or agent-owned artifact retrieval flow.

## Non-Goals

- Indbase revision storage policy.
- Migration of host-product revision data.
- Search indexing of generated displays.
