from __future__ import annotations

from typing import Any


def operation_trace(
    *,
    operation_id: str,
    action_id: str,
    agent_id: str,
    command: str,
    status: str | None = None,
    domain_refs: dict[str, str] | None = None,
    capability_refs: list[dict[str, Any]] | None = None,
    metadata: dict[str, Any] | None = None,
) -> dict[str, Any]:
    trace: dict[str, Any] = {
        "operation_id": operation_id,
        "action_id": action_id,
        "agent_id": agent_id,
        "command": command,
    }
    if status is not None:
        trace["status"] = status
    if domain_refs is not None:
        trace["domain_refs"] = dict(domain_refs)
    if capability_refs is not None:
        trace["capability_refs"] = [dict(ref) for ref in capability_refs]
    if metadata is not None:
        trace["metadata"] = dict(metadata)
    return trace


def operation_trace_payload(**kwargs: Any) -> dict[str, Any]:
    return {"operation_trace": operation_trace(**kwargs)}
