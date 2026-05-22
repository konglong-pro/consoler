from __future__ import annotations

import json
from pathlib import Path

import pytest

from consoler_agent_sdk import (
    AgentError,
    CancelFlag,
    EventEmitter,
    JsonRpcServer,
    StepHelper,
    normalize_error,
)
from consoler_agent_sdk.adapter import AgentAdapter


class EchoAdapter(AgentAdapter):
    def manifest_path(self) -> Path:
        return Path(__file__).parent / "manifest.json"

    def load_manifest(self) -> dict:
        return {
            "agent_id": "echo",
            "name": "echo",
            "version": "0.0.1",
            "protocol_version": "0",
            "commands": [],
        }

    def validate(self, command: str, args: dict) -> None:
        if command != "echo.ping":
            raise AgentError("command.not_found", command)

    def plan(self, command: str, args: dict, action_id: str) -> dict:
        return {"steps": [{"step_id": "s1", "title": "Ping"}], "side_effects": []}

    def preview(self, command: str, args: dict, plan: dict | None = None) -> dict:
        return {"summary": "static", "reads_vault": False}

    def execute(self, command: str, args: dict, plan: dict, **kwargs) -> dict:
        kwargs["cancel_flag"].check("execute")
        emitter: EventEmitter = kwargs["emitter"]
        StepHelper(emitter).run("s1", "Ping", lambda: None)
        return {"blocks": []}


MANIFEST = Path(__file__).parent / "manifest.json"


@pytest.fixture
def manifest_path(tmp_path: Path) -> Path:
    path = tmp_path / "manifest.json"
    path.write_text(
        json.dumps(
            {
                "agent_id": "echo",
                "name": "echo",
                "version": "0.0.1",
                "protocol_version": "0",
                "commands": [],
            }
        ),
        encoding="utf-8",
    )
    return path


def test_event_seq_monotonic():
    published: list[dict] = []
    emitter = EventEmitter("run_1", "act_1", "echo", "echo.ping", published.append)
    emitter.emit("log", message="a")
    emitter.emit("log", message="b")
    assert [event["seq"] for event in published] == [1, 2]


def test_step_helper_emits_started_completed():
    published: list[dict] = []
    emitter = EventEmitter("run_1", "act_1", "echo", "echo.ping", published.append)
    StepHelper(emitter).run("s1", "Do", lambda: 42)
    types = [event["type"] for event in published]
    assert types == ["step.started", "step.completed"]


def test_cancel_flag_checkpoint():
    flag = CancelFlag()
    flag.requested = True
    with pytest.raises(RuntimeError, match="cancelled"):
        flag.check("phase")


def test_normalize_error():
    err = normalize_error(ValueError("boom"))
    assert err.code == "agent.error"
    assert "boom" in err.message


def test_jsonrpc_discover_dispatch(monkeypatch):
    adapter = EchoAdapter()

    def fake_run(self):
        request = {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "agent.discover",
            "params": {},
        }
        response = self._dispatch(request)
        assert response["result"]["agent_id"] == "echo"

    monkeypatch.setattr(JsonRpcServer, "run", fake_run, raising=False)
    JsonRpcServer(adapter).run()
