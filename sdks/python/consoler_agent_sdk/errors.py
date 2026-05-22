from __future__ import annotations

from typing import Any


class AgentError(Exception):
    def __init__(
        self,
        code: str,
        message: str,
        details: dict[str, Any] | None = None,
        retryable: bool = False,
    ) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.details = details
        self.retryable = retryable

    def to_dict(self) -> dict[str, Any]:
        payload: dict[str, Any] = {
            "code": self.code,
            "message": self.message,
        }
        if self.details is not None:
            payload["details"] = self.details
        if self.retryable:
            payload["retryable"] = True
        return payload


def normalize_error(exc: BaseException) -> AgentError:
    if isinstance(exc, AgentError):
        return exc
    return AgentError(
        code="agent.error",
        message=str(exc),
        details={"type": exc.__class__.__name__},
        retryable=False,
    )
