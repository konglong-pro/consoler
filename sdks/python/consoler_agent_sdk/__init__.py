"""Minimal consoler agent SDK for V0 stdio JSON-RPC adapters."""

from .adapter import AgentAdapter
from .blocks import artifact_block, diff_block, error_block, json_block, markdown_block, table_block
from .errors import AgentError, normalize_error
from .events import CancelFlag, EventEmitter, ProgressHelper, StepHelper
from .server import JsonRpcServer

SDK_NAME = "consoler_agent_sdk"

__all__ = [
    "SDK_NAME",
    "AgentAdapter",
    "AgentError",
    "CancelFlag",
    "EventEmitter",
    "JsonRpcServer",
    "ProgressHelper",
    "StepHelper",
    "artifact_block",
    "diff_block",
    "error_block",
    "json_block",
    "markdown_block",
    "normalize_error",
    "table_block",
]
