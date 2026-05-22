from __future__ import annotations

from abc import ABC, abstractmethod
from pathlib import Path
from typing import Any


class AgentAdapter(ABC):
    @abstractmethod
    def manifest_path(self) -> Path:
        raise NotImplementedError

    @abstractmethod
    def load_manifest(self) -> dict[str, Any]:
        raise NotImplementedError

    @abstractmethod
    def validate(self, command: str, args: dict[str, Any]) -> None:
        raise NotImplementedError

    @abstractmethod
    def plan(self, command: str, args: dict[str, Any], action_id: str) -> dict[str, Any]:
        raise NotImplementedError

    @abstractmethod
    def preview(
        self,
        command: str,
        args: dict[str, Any],
        plan: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        raise NotImplementedError

    @abstractmethod
    def execute(
        self,
        command: str,
        args: dict[str, Any],
        plan: dict[str, Any],
        *,
        action_id: str,
        run_id: str,
        emitter,
        cancel_flag,
    ) -> dict[str, Any]:
        raise NotImplementedError

    def health(self) -> dict[str, Any]:
        return {"status": "ok"}

    def cancel(self) -> dict[str, Any]:
        return {"status": "cancel_requested"}
