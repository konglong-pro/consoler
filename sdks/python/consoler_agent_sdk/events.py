from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Callable

from .errors import AgentCancelled


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


@dataclass
class EventEmitter:
    run_id: str
    action_id: str
    agent_id: str
    command: str
    publish: Callable[[dict[str, Any]], None]
    _seq: int = 0

    def next_seq(self) -> int:
        self._seq += 1
        return self._seq

    def emit(self, event_type: str, **fields: Any) -> dict[str, Any]:
        event = {
            "event_id": f"evt_{uuid.uuid4()}",
            "run_id": self.run_id,
            "action_id": self.action_id,
            "agent_id": self.agent_id,
            "command": self.command,
            "type": event_type,
            "seq": self.next_seq(),
            "epoch": 0,
            "timestamp": _utc_now(),
            **fields,
        }
        self.publish(event)
        return event


@dataclass
class StepHelper:
    emitter: EventEmitter

    def run(self, step_id: str, title: str, fn: Callable[[], Any]) -> Any:
        self.emitter.emit("step.started", step_id=step_id, message=title)
        try:
            result = fn()
        except AgentCancelled:
            raise
        except Exception as exc:  # noqa: BLE001
            self.emitter.emit("step.completed", step_id=step_id, message=f"{title} failed")
            raise exc
        self.emitter.emit("step.completed", step_id=step_id, message=f"{title} done")
        return result


@dataclass
class ProgressHelper:
    emitter: EventEmitter

    def update(self, progress: float, message: str) -> None:
        self.emitter.emit(
            "progress.updated",
            progress=max(0.0, min(1.0, progress)),
            message=message,
        )


@dataclass
class CancelFlag:
    requested: bool = False

    def reset(self) -> None:
        self.requested = False

    def check(self, checkpoint: str) -> None:
        if self.requested:
            raise AgentCancelled(checkpoint)
