from __future__ import annotations

import hashlib
import json
import time
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
        if command not in {
            "conformance.static_echo",
            "conformance.read_only_text",
            "conformance.probe_echo",
            "conformance.slow_cancel",
            "conformance.slow_ignore_cancel",
            "conformance.interactive_choice",
            "conformance.interactive_form",
            "conformance.interactive_timeout",
            "conformance.interactive_redaction",
        }:
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
        interaction=None,
    ) -> dict[str, Any]:
        self.validate(command, args)

        if command == "conformance.slow_ignore_cancel":
            iterations = int(args.get("iterations", 400))
            for index in range(iterations):
                emitter.emit("log", message=f"ignore tick {index}: {args['message']}")
                emitter.emit(
                    "progress.updated",
                    progress=min(0.99, (index + 1) / iterations),
                    message=f"ignore tick {index}",
                )
                time.sleep(0.05)
            emitter.emit("action.succeeded", message="should not reach success")
            return {
                "blocks": [
                    markdown_block("# Should not finish", title="result"),
                ]
            }

        cancel_flag.check("execute")

        if command == "conformance.interactive_choice":
            if interaction is None:
                raise AgentError("interaction.required", "interaction helper missing")
            choice = interaction.request(
                interaction_id=f"choice-{action_id}",
                title="Pick outcome",
                message=f"Select how to finish for {args['message']}",
                choices=[
                    {"id": "ok", "label": "Success path"},
                    {"id": "alt", "label": "Alternate path"},
                ],
            )
            if choice == "ok":
                return {
                    "blocks": [
                        markdown_block("# Choice OK", title="result"),
                        json_block({"choice": choice, "message": args["message"]}, title="payload"),
                    ]
                }
            return {
                "blocks": [
                    markdown_block("# Alternate choice", title="result"),
                    json_block({"choice": choice}, title="payload"),
                ]
            }

        if command == "conformance.interactive_timeout":
            if interaction is None:
                raise AgentError("interaction.required", "interaction helper missing")
            mode = str(args.get("mode", "abort"))
            if mode not in {"abort", "use_default", "skip", "continue"}:
                raise AgentError("args.invalid", "mode must be abort, use_default, skip, or continue")
            timeout_policy = {"timeout_seconds": 0.5, "on_timeout": mode}
            if mode == "use_default":
                result = interaction.request(
                    interaction_id=f"timeout-{action_id}",
                    title="Timeout policy",
                    message=f"Waiting for timeout mode={mode}",
                    prompt_schema={
                        "type": "object",
                        "additionalProperties": False,
                        "required": ["picked"],
                        "properties": {"picked": {"type": "boolean"}},
                    },
                    default_response={"picked": True},
                    timeout_policy=timeout_policy,
                )
            else:
                result = interaction.request(
                    interaction_id=f"timeout-{action_id}",
                    title="Timeout policy",
                    message=f"Waiting for timeout mode={mode}",
                    choices=[{"id": "never", "label": "Should not be picked"}],
                    timeout_policy=timeout_policy,
                )
            if mode == "use_default":
                expected = {"picked": True}
                if result != expected:
                    raise AgentError(
                        "timeout.unexpected",
                        f"use_default expected {expected}, got {result}",
                    )
                return {
                    "blocks": [
                        markdown_block("# Timed out (use_default)", title="result"),
                        json_block(result, title="timeout-default"),
                    ]
                }
            if mode == "skip":
                expected = {"timed_out": True, "action": "skip"}
                if result != expected:
                    raise AgentError("timeout.unexpected", f"skip expected {expected}, got {result}")
                return {
                    "blocks": [
                        markdown_block("# Timed out (skip)", title="result"),
                        json_block(result, title="timeout-skip"),
                    ]
                }
            if mode == "continue":
                expected = {"timed_out": True, "action": "continue"}
                if result != expected:
                    raise AgentError(
                        "timeout.unexpected",
                        f"continue expected {expected}, got {result}",
                    )
                return {
                    "blocks": [
                        markdown_block("# Timed out (continue)", title="result"),
                        json_block(result, title="timeout-continue"),
                    ]
                }
            raise AgentError("timeout.unexpected", f"abort should have raised, got {result}")

        if command == "conformance.interactive_redaction":
            if interaction is None:
                raise AgentError("interaction.required", "interaction helper missing")
            response = interaction.request(
                interaction_id=f"redact-{action_id}",
                title="Redaction probe",
                message=f"Enter values for {args['message']}",
                prompt_schema={
                    "type": "object",
                    "additionalProperties": False,
                    "required": ["label", "api_key"],
                    "properties": {
                        "label": {"type": "string", "minLength": 1},
                        "api_key": {"type": "string", "minLength": 1, "x-consoler-redact": True},
                    },
                },
                default_response={"label": "default-label", "api_key": "default-secret"},
            )
            if not isinstance(response, dict):
                raise AgentError("interaction.invalid", "expected object response")
            received = response.get("api_key")
            if received in (None, "", "[REDACTED]"):
                raise AgentError(
                    "redaction.unexpected",
                    f"agent expected live api_key, got {received!r}",
                )
            secret_hash = hashlib.sha256(str(received).encode("utf-8")).hexdigest()
            return {
                "blocks": [
                    markdown_block("# Redaction proof", title="result"),
                    json_block(
                        {
                            "label": response.get("label"),
                            "received_secret": True,
                            "api_key_sha256": secret_hash,
                        },
                        title="redaction-proof",
                    ),
                ]
            }

        if command == "conformance.interactive_form":
            if interaction is None:
                raise AgentError("interaction.required", "interaction helper missing")
            response = interaction.request(
                interaction_id=f"form-{action_id}",
                title="Confirm details",
                message=f"Enter values for {args['message']}",
                prompt_schema={
                    "type": "object",
                    "additionalProperties": False,
                    "required": ["name", "confirm"],
                    "properties": {
                        "name": {"type": "string", "minLength": 1},
                        "confirm": {"type": "boolean"},
                        "count": {"type": "number"},
                    },
                },
            )
            return {
                "blocks": [
                    markdown_block("# Form response", title="result"),
                    json_block(response, title="form-response"),
                ]
            }

        if command == "conformance.slow_cancel":
            iterations = int(args.get("iterations", 200))
            for index in range(iterations):
                cancel_flag.check(f"loop-{index}")
                emitter.emit("log", message=f"tick {index}: {args['message']}")
                emitter.emit(
                    "progress.updated",
                    progress=min(0.99, (index + 1) / iterations),
                    message=f"tick {index}",
                )
                time.sleep(0.05)
            return {
                "blocks": [
                    markdown_block("# Should not finish", title="result"),
                ]
            }

        if command == "conformance.read_only_text":
            return {
                "blocks": [
                    markdown_block(f"# Read-only OK\n\n{args['message']}", title="result"),
                    json_block(
                        {"message": args["message"], "readonly": True},
                        title="payload",
                    ),
                ]
            }

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
                        "fake://artifacts/conformance-fixture",
                        "conformance.fixture",
                        label="fixture.txt",
                        metadata={"message": args["message"]},
                        title="sample-artifact",
                        block_id="conformance-artifact",
                    ),
                ]
            }

        return StepHelper(emitter).run("echo", "Echo message", work)

    def get_artifact_view(
        self,
        *,
        artifact_uri: str,
        kind: str,
        block_id: str,
        action_id: str,
        metadata: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        if kind != "conformance.fixture" or not artifact_uri.startswith("fake://"):
            raise AgentError("artifact.not_found", f"Unknown artifact {artifact_uri}")
        return {
            "artifact_uri": artifact_uri,
            "kind": kind,
            "title": "Conformance fixture artifact",
            "metadata": metadata or {},
            "blocks": [
                markdown_block("# Fixture artifact", title="view"),
                json_block(
                    {
                        "action_id": action_id,
                        "block_id": block_id,
                        "artifact_uri": artifact_uri,
                    },
                    title="context",
                ),
            ],
        }
