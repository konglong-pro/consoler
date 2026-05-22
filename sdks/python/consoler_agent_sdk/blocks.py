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
