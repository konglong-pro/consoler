"""Minimal consoler agent SDK for out-of-process stdio JSON-RPC adapters."""

__version__ = "0.1.0"
SUPPORTED_PROTOCOL_VERSION = "0"

from .adapter import AgentAdapter
from .blocks import artifact_block, diff_block, error_block, json_block, markdown_block, table_block
from .errors import AgentCancelled, AgentError, normalize_error
from .events import CancelFlag, EventEmitter, ProgressHelper, StepHelper
from .interaction import InteractionHelper
from .server import JsonRpcServer

SDK_NAME = "consoler_agent_sdk"

__all__ = [
    "SUPPORTED_PROTOCOL_VERSION",
    "SDK_NAME",
    "__version__",
    "AgentAdapter",
    "AgentCancelled",
    "AgentError",
    "CancelFlag",
    "EventEmitter",
    "InteractionHelper",
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
