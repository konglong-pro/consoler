from __future__ import annotations

from abc import ABC, abstractmethod
from pathlib import Path
from typing import Any

from .errors import AgentError


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
        interaction=None,
    ) -> dict[str, Any]:
        raise NotImplementedError

    def health(self) -> dict[str, Any]:
        return {"status": "ok"}

    def cancel(self) -> dict[str, Any]:
        return {"status": "cancel_requested"}

    def get_artifact_view(
        self,
        *,
        artifact_uri: str,
        kind: str,
        block_id: str,
        action_id: str,
        metadata: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        raise AgentError(
            "artifact_retrieval.unsupported",
            "Artifact retrieval is not supported by this agent",
        )
