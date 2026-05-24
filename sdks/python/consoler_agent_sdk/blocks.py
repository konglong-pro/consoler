from __future__ import annotations

import uuid
from typing import Any


def markdown_block(content: str, *, title: str | None = None) -> dict[str, Any]:
    block: dict[str, Any] = {
        "block_id": f"blk_{uuid.uuid4()}",
        "type": "markdown",
        "content": content,
    }
    if title:
        block["title"] = title
    return block


def table_block(columns: list[str], rows: list[list[Any]], *, title: str | None = None) -> dict[str, Any]:
    block: dict[str, Any] = {
        "block_id": f"blk_{uuid.uuid4()}",
        "type": "table",
        "content": {"columns": columns, "rows": rows},
    }
    if title:
        block["title"] = title
    return block


def json_block(content: Any, *, title: str | None = None) -> dict[str, Any]:
    block: dict[str, Any] = {
        "block_id": f"blk_{uuid.uuid4()}",
        "type": "json",
        "content": content,
    }
    if title:
        block["title"] = title
    return block


def error_block(error: dict[str, Any], *, title: str | None = None) -> dict[str, Any]:
    block: dict[str, Any] = {
        "block_id": f"blk_{uuid.uuid4()}",
        "type": "error",
        "content": error,
    }
    if title:
        block["title"] = title
    return block


def diff_block(
    unified_diff: str,
    *,
    language: str | None = None,
    from_label: str | None = None,
    to_label: str | None = None,
    title: str | None = None,
) -> dict[str, Any]:
    content: dict[str, Any] = {"unified_diff": unified_diff}
    if language:
        content["language"] = language
    if from_label:
        content["from_label"] = from_label
    if to_label:
        content["to_label"] = to_label
    block: dict[str, Any] = {
        "block_id": f"blk_{uuid.uuid4()}",
        "type": "diff",
        "content": content,
    }
    if title:
        block["title"] = title
    return block


def artifact_block(
    uri: str,
    kind: str,
    *,
    label: str | None = None,
    metadata: dict[str, Any] | None = None,
    title: str | None = None,
) -> dict[str, Any]:
    content: dict[str, Any] = {"uri": uri, "kind": kind}
    if label:
        content["label"] = label
    if metadata:
        content["metadata"] = metadata
    block: dict[str, Any] = {
        "block_id": f"blk_{uuid.uuid4()}",
        "type": "artifact",
        "content": content,
    }
    if title:
        block["title"] = title
    return block
