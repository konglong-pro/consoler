from __future__ import annotations

import threading
from dataclasses import dataclass, field
from typing import Any

from .errors import AgentCancelled, AgentError
from .events import CancelFlag, EventEmitter


@dataclass
class InteractionHelper:
    emitter: EventEmitter
    cancel_flag: CancelFlag | None = None
    _lock: threading.Lock = field(default_factory=threading.Lock)
    _condition: threading.Condition = field(init=False)
    _pending_id: str | None = None
    _response: Any = None
    _error: AgentError | None = None

    def __post_init__(self) -> None:
        self._condition = threading.Condition(self._lock)

    def request(
        self,
        *,
        interaction_id: str,
        title: str,
        message: str,
        choices: list[dict[str, str]] | None = None,
        prompt_schema: dict[str, Any] | None = None,
        default_response: Any | None = None,
        blocks: list[dict[str, Any]] | None = None,
    ) -> Any:
        with self._lock:
            if self._pending_id is not None:
                raise AgentError("interaction.busy", "Another interaction is already pending")
            self._pending_id = interaction_id
            self._response = None
            self._error = None

        interaction: dict[str, Any] = {
            "interaction_id": interaction_id,
            "title": title,
            "message": message,
        }
        if choices is not None:
            interaction["choices"] = choices
        if prompt_schema is not None:
            interaction["prompt_schema"] = prompt_schema
        if default_response is not None:
            interaction["default_response"] = default_response
        if blocks is not None:
            interaction["blocks"] = blocks

        self.emitter.emit("interaction.required", interaction=interaction)

        with self._condition:
            while self._response is None and self._error is None:
                if self.cancel_flag is not None:
                    if self.cancel_flag.requested:
                        self._pending_id = None
                        raise AgentCancelled("interaction-wait")
                    self.cancel_flag.check("interaction-wait")
                self._condition.wait(timeout=0.05)

            if self._error is not None:
                raise self._error
            return self._response

    def respond(self, interaction_id: str, response: Any) -> dict[str, Any]:
        with self._condition:
            if self._pending_id is None:
                raise AgentError("interaction.no_pending", "No interaction is pending")
            if interaction_id != self._pending_id:
                raise AgentError(
                    "interaction.stale",
                    f"Unknown interaction id: {interaction_id}",
                )
            self._response = response
            self._pending_id = None
            self._condition.notify_all()
        return {"ok": True}
