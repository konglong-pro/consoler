from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from consoler_agent_sdk.adapter import AgentAdapter
from consoler_agent_sdk.blocks import artifact_block, diff_block, json_block, markdown_block
from consoler_agent_sdk.errors import AgentError
from consoler_agent_sdk.events import EventEmitter, StepHelper


class ConformanceFakeAdapter(AgentAdapter):
    def manifest_path(self) -> Path:
        return Path(__file__).with_name("manifest.json")

    def load_manifest(self) -> dict[str, Any]:
        return json.loads(self.manifest_path().read_text(encoding="utf-8"))

    def validate(self, command: str, args: dict[str, Any]) -> None:
        if command not in {"conformance.static_echo", "conformance.probe_echo"}:
            raise AgentError("command.not_found", command)
        if not str(args.get("message", "")).strip():
            raise AgentError("args.invalid", "message is required")

    def plan(self, command: str, args: dict[str, Any], action_id: str) -> dict[str, Any]:
        self.validate(command, args)
        return {
            "steps": [{"step_id": "echo", "title": f"Echo {args['message']}"}],
            "side_effects": ["write_fixture_state"] if command == "conformance.probe_echo" else [],
        }

    def preview(
        self,
        command: str,
        args: dict[str, Any],
        plan: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        self.validate(command, args)
        if command == "conformance.probe_echo":
            return {
                "summary": f"probe readonly ok for {args['message']}",
                "reads_fixture_state": True,
            }
        return {
            "summary": f"static preview for {args['message']}",
            "reads_vault": False,
        }

    def execute(
        self,
        command: str,
        args: dict[str, Any],
        plan: dict[str, Any],
        *,
        action_id: str,
        run_id: str,
        emitter: EventEmitter,
        cancel_flag,
    ) -> dict[str, Any]:
        self.validate(command, args)
        cancel_flag.check("execute")

        def work() -> dict[str, Any]:
            emitter.emit("log", message=f"message={args['message']}")
            emitter.emit("progress.updated", progress=0.5, message="halfway")
            sample_diff = "\n".join(
                [
                    "--- a/fixture.txt",
                    "+++ b/fixture.txt",
                    "@@ -1 +1 @@",
                    "-before",
                    "+after",
                ]
            )
            return {
                "blocks": [
                    markdown_block("# Conformance OK", title="result"),
                    json_block(
                        {"message": args["message"], "command": command},
                        title="payload",
                    ),
                    diff_block(
                        sample_diff,
                        from_label="before",
                        to_label="after",
                        title="sample-diff",
                    ),
                    artifact_block(
                        "file:///tmp/conformance-fixture.txt",
                        "text/plain",
                        label="fixture.txt",
                        metadata={"message": args["message"]},
                        title="sample-artifact",
                    ),
                ]
            }

        return StepHelper(emitter).run("echo", "Echo message", work)
