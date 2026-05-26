from __future__ import annotations

import json
import sys
import threading
from typing import Any

from .adapter import AgentAdapter
from .errors import AgentCancelled, AgentError, normalize_error
from .events import CancelFlag, EventEmitter
from .interaction import InteractionHelper


class JsonRpcServer:
    def __init__(self, adapter: AgentAdapter) -> None:
        self.adapter = adapter
        self.cancel_flag = CancelFlag()
        self._stdout_lock = threading.Lock()
        self._execute_thread: threading.Thread | None = None
        self._interaction: InteractionHelper | None = None

    def run(self) -> None:
        for line in sys.stdin:
            line = line.strip()
            if not line:
                continue
            try:
                message = json.loads(line)
            except json.JSONDecodeError:
                continue
            if "method" not in message:
                continue
            method = message.get("method")
            if method == "agent.execute":
                self._start_execute(message)
                continue
            if method == "action.respond_interaction":
                response = self._respond_interaction(message)
                if response is not None:
                    self._write_message(response)
                continue
            response = self._dispatch(message)
            if response is not None:
                self._write_message(response)

    def _write_message(self, message: dict[str, Any]) -> None:
        with self._stdout_lock:
            sys.stdout.write(json.dumps(message) + "\n")
            sys.stdout.flush()

    def _execute_busy(self) -> bool:
        return self._execute_thread is not None and self._execute_thread.is_alive()

    def _start_execute(self, message: dict[str, Any]) -> None:
        request_id = message.get("id")
        if self._execute_busy():
            if request_id is not None:
                err = AgentError("execute.busy", "Another agent.execute is already in progress")
                self._write_message(
                    {
                        "jsonrpc": "2.0",
                        "id": request_id,
                        "error": {
                            "code": -32000,
                            "message": err.message,
                            "data": err.to_dict(),
                        },
                    }
                )
            return

        self.cancel_flag.reset()
        params = message.get("params") or {}
        self._execute_thread = threading.Thread(
            target=self._execute_worker,
            args=(request_id, params),
            daemon=True,
        )
        self._execute_thread.start()

    def _execute_worker(self, request_id: Any, params: dict[str, Any]) -> None:
        try:
            result = self._run_execute(params)
            if request_id is None:
                return
            self._write_message({"jsonrpc": "2.0", "id": request_id, "result": result})
        except AgentError as err:
            if request_id is None:
                return
            self._write_message(
                {
                    "jsonrpc": "2.0",
                    "id": request_id,
                    "error": {
                        "code": -32000,
                        "message": err.message,
                        "data": err.to_dict(),
                    },
                }
            )
        except Exception as exc:  # noqa: BLE001
            if request_id is None:
                return
            err = normalize_error(exc)
            self._write_message(
                {
                    "jsonrpc": "2.0",
                    "id": request_id,
                    "error": {
                        "code": -32000,
                        "message": err.message,
                        "data": err.to_dict(),
                    },
                }
            )
        finally:
            self._execute_thread = None
            self._interaction = None

    def _respond_interaction(self, message: dict[str, Any]) -> dict[str, Any] | None:
        request_id = message.get("id")
        if not self._execute_busy():
            err = AgentError("interaction.not_running", "No agent.execute in progress")
            if request_id is None:
                return None
            return {
                "jsonrpc": "2.0",
                "id": request_id,
                "error": {
                    "code": -32000,
                    "message": err.message,
                    "data": err.to_dict(),
                },
            }
        if self._interaction is None:
            err = AgentError("interaction.unavailable", "Interaction helper not ready")
            if request_id is None:
                return None
            return {
                "jsonrpc": "2.0",
                "id": request_id,
                "error": {
                    "code": -32000,
                    "message": err.message,
                    "data": err.to_dict(),
                },
            }
        params = message.get("params") or {}
        interaction_id = params.get("interaction_id")
        if not interaction_id:
            err = AgentError("interaction.invalid", "interaction_id is required")
            if request_id is None:
                return None
            return {
                "jsonrpc": "2.0",
                "id": request_id,
                "error": {
                    "code": -32000,
                    "message": err.message,
                    "data": err.to_dict(),
                },
            }
        try:
            result = self._interaction.respond(str(interaction_id), params.get("response"))
            if request_id is None:
                return None
            return {"jsonrpc": "2.0", "id": request_id, "result": result}
        except AgentError as err:
            if request_id is None:
                return None
            return {
                "jsonrpc": "2.0",
                "id": request_id,
                "error": {
                    "code": -32000,
                    "message": err.message,
                    "data": err.to_dict(),
                },
            }

    def _dispatch(self, message: dict[str, Any]) -> dict[str, Any] | None:
        request_id = message.get("id")
        method = message.get("method")
        params = message.get("params") or {}
        try:
            result = self._handle(method, params)
            if request_id is None:
                return None
            return {"jsonrpc": "2.0", "id": request_id, "result": result}
        except AgentError as err:
            return {
                "jsonrpc": "2.0",
                "id": request_id,
                "error": {
                    "code": -32000,
                    "message": err.message,
                    "data": err.to_dict(),
                },
            }
        except Exception as exc:  # noqa: BLE001
            err = normalize_error(exc)
            return {
                "jsonrpc": "2.0",
                "id": request_id,
                "error": {
                    "code": -32000,
                    "message": err.message,
                    "data": err.to_dict(),
                },
            }

    def _handle(self, method: str, params: dict[str, Any]) -> Any:
        if method == "agent.discover":
            return self.adapter.load_manifest()
        if method == "agent.validate":
            self.adapter.validate(params["command"], params["args"])
            return {"ok": True}
        if method == "agent.plan":
            return self.adapter.plan(params["command"], params["args"], params["action_id"])
        if method == "agent.preview":
            return self.adapter.preview(
                params["command"],
                params["args"],
                params.get("plan"),
            )
        if method == "agent.cancel":
            self.cancel_flag.requested = True
            return self.adapter.cancel()
        if method == "agent.health":
            return self.adapter.health()
        if method == "agent.get_artifact_view":
            return self.adapter.get_artifact_view(
                artifact_uri=str(params["artifact_uri"]),
                kind=str(params["kind"]),
                block_id=str(params["block_id"]),
                action_id=str(params["action_id"]),
                metadata=params.get("metadata"),
            )
        raise AgentError("method.not_found", f"Unknown method: {method}")

    def _run_execute(self, params: dict[str, Any]) -> dict[str, Any]:
        manifest = self.adapter.load_manifest()
        run_id = params["run_id"]
        action_id = params["action_id"]
        command = params["command"]
        args = params["args"]
        plan = params["plan"]

        def publish(event: dict[str, Any]) -> None:
            notification = {
                "jsonrpc": "2.0",
                "method": "agent.event",
                "params": {"event": event},
            }
            self._write_message(notification)

        emitter = EventEmitter(
            run_id=run_id,
            action_id=action_id,
            agent_id=manifest["agent_id"],
            command=command,
            publish=publish,
        )
        interaction = InteractionHelper(emitter, cancel_flag=self.cancel_flag)
        self._interaction = interaction
        emitter.emit("action.started", message=f"Starting {command}")
        try:
            result = self.adapter.execute(
                command,
                args,
                plan,
                action_id=action_id,
                run_id=run_id,
                emitter=emitter,
                cancel_flag=self.cancel_flag,
                interaction=interaction,
            )
            blocks = result.get("blocks", [])
            if blocks:
                emitter.emit("action.succeeded", blocks=blocks)
            else:
                emitter.emit("action.succeeded")
            return {"ok": True}
        except AgentCancelled as cancelled:
            emitter.emit(
                "action.cancelled",
                message=f"Cancelled at {cancelled.checkpoint}",
            )
            return {"ok": False, "cancelled": True}
        except Exception as exc:  # noqa: BLE001
            err = normalize_error(exc)
            emitter.emit("action.failed", error=err.to_dict())
            raise
