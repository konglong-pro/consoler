from __future__ import annotations

import json
import sys
from typing import Any

from .adapter import AgentAdapter
from .errors import AgentError, normalize_error
from .events import CancelFlag, EventEmitter


class JsonRpcServer:
    def __init__(self, adapter: AgentAdapter) -> None:
        self.adapter = adapter
        self.cancel_flag = CancelFlag()

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
            response = self._dispatch(message)
            if response is not None:
                sys.stdout.write(json.dumps(response) + "\n")
                sys.stdout.flush()

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
        if method == "agent.execute":
            return self._execute(params)
        if method == "agent.cancel":
            self.cancel_flag.requested = True
            return self.adapter.cancel()
        if method == "agent.health":
            return self.adapter.health()
        raise AgentError("method.not_found", f"Unknown method: {method}")

    def _execute(self, params: dict[str, Any]) -> dict[str, Any]:
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
            sys.stdout.write(json.dumps(notification) + "\n")
            sys.stdout.flush()

        emitter = EventEmitter(
            run_id=run_id,
            action_id=action_id,
            agent_id=manifest["agent_id"],
            command=command,
            publish=publish,
        )
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
            )
            blocks = result.get("blocks", [])
            if blocks:
                emitter.emit("action.succeeded", blocks=blocks)
            else:
                emitter.emit("action.succeeded")
            return {"ok": True}
        except Exception as exc:  # noqa: BLE001
            err = normalize_error(exc)
            emitter.emit("action.failed", error=err.to_dict())
            raise
