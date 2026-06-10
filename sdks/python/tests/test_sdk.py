from __future__ import annotations

import json
from pathlib import Path

import pytest

from consoler_agent_sdk import (
    SUPPORTED_PROTOCOL_VERSION,
    AgentCancelled,
    AgentError,
    CancelFlag,
    EventEmitter,
    InteractionHelper,
    JsonRpcServer,
    StepHelper,
    __version__,
    artifact_block,
    diff_block,
    markdown_block,
    normalize_error,
    operation_trace,
    operation_trace_payload,
)
import consoler_agent_sdk
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


def test_sdk_version_and_public_exports():
    assert __version__ == "0.1.0"
    assert SUPPORTED_PROTOCOL_VERSION == "0"
    for name in consoler_agent_sdk.__all__:
        assert hasattr(consoler_agent_sdk, name)


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
    with pytest.raises(AgentCancelled, match="cancelled at phase"):
        flag.check("phase")


class CancelOnExecuteAdapter(AgentAdapter):
    def manifest_path(self) -> Path:
        return Path(__file__).parent / "manifest.json"

    def load_manifest(self) -> dict:
        return {
            "agent_id": "cancel-test",
            "name": "cancel-test",
            "version": "0.0.1",
            "protocol_version": "0",
            "commands": [],
        }

    def validate(self, command: str, args: dict) -> None:
        return None

    def plan(self, command: str, args: dict, action_id: str) -> dict:
        return {"steps": [], "side_effects": []}

    def preview(self, command: str, args: dict, plan: dict | None = None) -> dict:
        return {"summary": "static"}

    def execute(self, command: str, args: dict, plan: dict, **kwargs) -> dict:
        raise AgentCancelled("mid-run")


def test_run_execute_emits_cancelled_terminal():
    server = JsonRpcServer(CancelOnExecuteAdapter())
    published: list[dict] = []

    def capture(message: dict) -> None:
        if message.get("method") == "agent.event":
            published.append(message["params"]["event"])

    server._write_message = capture  # type: ignore[method-assign]

    result = server._run_execute(
        {
            "run_id": "run_1",
            "action_id": "act_1",
            "command": "test.cancel",
            "args": {},
            "plan": {"steps": []},
        }
    )

    assert result == {"ok": False, "cancelled": True}
    terminal_types = [event["type"] for event in published]
    assert "action.started" in terminal_types
    assert "action.cancelled" in terminal_types
    assert "action.succeeded" not in terminal_types
    assert "action.failed" not in terminal_types


def test_normalize_error():
    err = normalize_error(ValueError("boom"))
    assert err.code == "agent.error"
    assert "boom" in err.message


def test_diff_and_artifact_block_helpers():
    diff = diff_block("--- a\n+++ b\n", from_label="a", to_label="b", title="changes")
    assert diff["type"] == "diff"
    assert diff["title"] == "changes"
    assert diff["content"]["unified_diff"].startswith("--- a")
    assert diff["content"]["from_label"] == "a"

    art = artifact_block(
        "file:///tmp/out.txt",
        "text/plain",
        label="out.txt",
        metadata={"bytes": 3},
        title="output",
    )
    assert art["type"] == "artifact"
    assert art["content"]["uri"] == "file:///tmp/out.txt"
    assert art["content"]["kind"] == "text/plain"
    assert art["content"]["metadata"]["bytes"] == 3


def test_operation_trace_helpers():
    trace = operation_trace(
        operation_id="op_1",
        action_id="act_1",
        agent_id="echo",
        command="echo.ping",
        status="succeeded",
        domain_refs={"doc_id": "doc_1"},
        capability_refs=[
            {
                "provider": "swallow",
                "capability_id": "swallow.ingest",
                "provider_run_id": "prun_1",
                "status": "succeeded",
                "artifact_refs": ["fake://artifact/1"],
            }
        ],
        metadata={"artifact_trust_state": "diagnostic"},
    )
    assert trace["operation_id"] == "op_1"
    assert trace["domain_refs"]["doc_id"] == "doc_1"
    assert trace["capability_refs"][0]["provider_run_id"] == "prun_1"

    payload = operation_trace_payload(
        operation_id="op_2",
        action_id="act_2",
        agent_id="echo",
        command="echo.ping",
    )
    assert payload == {
        "operation_trace": {
            "operation_id": "op_2",
            "action_id": "act_2",
            "agent_id": "echo",
            "command": "echo.ping",
        }
    }


class OperationTraceAdapter(EchoAdapter):
    def execute(self, command: str, args: dict, plan: dict, **kwargs) -> dict:
        return {
            "blocks": [],
            "operation_trace": operation_trace(
                operation_id="op_server",
                action_id=kwargs["action_id"],
                agent_id="echo",
                command=command,
                status="succeeded",
                domain_refs={"doc_id": "doc_server"},
            ),
        }


def test_run_execute_emits_operation_trace_on_terminal_success():
    server = JsonRpcServer(OperationTraceAdapter())
    published: list[dict] = []

    def capture(message: dict) -> None:
        if message.get("method") == "agent.event":
            published.append(message["params"]["event"])

    server._write_message = capture  # type: ignore[method-assign]

    result = server._run_execute(
        {
            "run_id": "run_1",
            "action_id": "act_1",
            "command": "echo.ping",
            "args": {},
            "plan": {"steps": []},
        }
    )

    assert result == {"ok": True}
    succeeded = [event for event in published if event["type"] == "action.succeeded"]
    assert len(succeeded) == 1
    assert succeeded[0]["payload"]["operation_trace"]["operation_id"] == "op_server"
    assert succeeded[0]["payload"]["operation_trace"]["domain_refs"]["doc_id"] == "doc_server"


def test_interaction_request_and_respond():
    published: list[dict] = []
    emitter = EventEmitter("run_1", "act_1", "echo", "echo.ping", published.append)
    helper = InteractionHelper(emitter)

    def requester() -> str:
        return helper.request(
            interaction_id="ix_1",
            title="Choose",
            message="Pick",
            choices=[{"id": "a", "label": "A"}],
        )

    import threading

    thread = threading.Thread(target=requester)
    thread.start()

    # wait for interaction.required
    for _ in range(50):
        if any(event.get("type") == "interaction.required" for event in published):
            break
        threading.Event().wait(0.01)
    assert any(event.get("type") == "interaction.required" for event in published)

    result = helper.respond("ix_1", "a")
    thread.join(timeout=2)
    assert result == {"ok": True}
    assert thread.is_alive() is False


def test_interaction_stale_response_rejected():
    published: list[dict] = []
    emitter = EventEmitter("run_1", "act_1", "echo", "echo.ping", published.append)
    helper = InteractionHelper(emitter)
    helper._pending_id = "ix_expected"
    with pytest.raises(AgentError, match="Unknown interaction id"):
        helper.respond("ix_other", "a")


def test_jsonrpc_respond_interaction_while_execute():
    class InteractiveAdapter(AgentAdapter):
        def manifest_path(self) -> Path:
            return Path(__file__).parent / "manifest.json"

        def load_manifest(self) -> dict:
            return {
                "agent_id": "ix",
                "name": "ix",
                "version": "0.0.1",
                "protocol_version": "0",
                "commands": [],
            }

        def validate(self, command: str, args: dict) -> None:
            return None

        def plan(self, command: str, args: dict, action_id: str) -> dict:
            return {"steps": [], "side_effects": []}

        def preview(self, command: str, args: dict, plan: dict | None = None) -> dict:
            return {"summary": "static"}

        def execute(self, command: str, args: dict, plan: dict, **kwargs) -> dict:
            interaction = kwargs["interaction"]
            choice = interaction.request(
                interaction_id="ix_run",
                title="Pick",
                message="Choose",
                choices=[{"id": "ok", "label": "OK"}],
            )
            return {"blocks": [], "choice": choice}

    server = JsonRpcServer(InteractiveAdapter())
    responses: list[dict] = []

    def capture(message: dict) -> None:
        responses.append(message)

    server._write_message = capture  # type: ignore[method-assign]

    import threading

    server._start_execute(
        {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "agent.execute",
            "params": {
                "run_id": "run_1",
                "action_id": "act_1",
                "command": "test.interactive",
                "args": {},
                "plan": {"steps": []},
            },
        }
    )

    for _ in range(100):
        if any(m.get("method") == "agent.event" for m in responses):
            break
        threading.Event().wait(0.01)

    rpc_response = server._respond_interaction(
        {
            "jsonrpc": "2.0",
            "id": 9,
            "method": "action.respond_interaction",
            "params": {"interaction_id": "ix_run", "response": "ok"},
        }
    )
    assert rpc_response is not None
    assert rpc_response.get("result") == {"ok": True}
    if server._execute_thread is not None:
        server._execute_thread.join(timeout=2)
    assert server._execute_busy() is False


def test_interaction_timeout_abort_response():
    published: list[dict] = []
    emitter = EventEmitter("run_1", "act_1", "echo", "echo.ping", published.append)
    helper = InteractionHelper(emitter)
    helper._pending_id = "ix_timeout"
    helper.respond("ix_timeout", {"timed_out": True, "action": "abort"})
    with helper._condition:
        assert helper._error is not None
        assert helper._error.code == "interaction.timeout"


def test_interaction_timeout_skip_and_continue_results():
    published: list[dict] = []
    emitter = EventEmitter("run_1", "act_1", "echo", "echo.ping", published.append)
    helper = InteractionHelper(emitter)

    helper._pending_id = "ix_skip"
    assert helper.respond("ix_skip", {"timed_out": True, "action": "skip"}) == {"ok": True}

    helper._pending_id = "ix_continue"
    result = helper.respond("ix_continue", {"timed_out": True, "action": "continue"})
    assert result == {"ok": True}


def test_get_artifact_view_default_unsupported():
    adapter = EchoAdapter()
    with pytest.raises(AgentError) as exc:
        adapter.get_artifact_view(
            artifact_uri="fake://x",
            kind="text/plain",
            block_id="b1",
            action_id="act_1",
        )
    assert exc.value.code == "artifact_retrieval.unsupported"


class ArtifactAdapter(EchoAdapter):
    def get_artifact_view(self, **kwargs) -> dict:
        return {
            "artifact_uri": kwargs["artifact_uri"],
            "kind": kwargs["kind"],
            "blocks": [markdown_block("# View", title="view")],
        }


def test_jsonrpc_get_artifact_view_dispatch():
    adapter = ArtifactAdapter()
    server = JsonRpcServer(adapter)
    response = server._dispatch(
        {
            "jsonrpc": "2.0",
            "id": 2,
            "method": "agent.get_artifact_view",
            "params": {
                "artifact_uri": "fake://artifacts/x",
                "kind": "conformance.fixture",
                "block_id": "b1",
                "action_id": "act_1",
            },
        }
    )
    assert response is not None
    assert response["result"]["artifact_uri"] == "fake://artifacts/x"
    assert response["result"]["blocks"][0]["type"] == "markdown"


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
