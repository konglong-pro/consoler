import { describe, expect, it, vi } from "vitest";

import type { AgentManifest } from "@consoler/protocol";
import type { IntentDraftResult } from "@consoler/runtime";
import { draftIntent } from "@consoler/runtime";

import { formatAgentctlHelp } from "../src/index.js";
import {
  buildIntentScopeFromManifests,
  formatIntentDraftJson,
  formatIntentDraftResult
} from "../src/intent-draft.js";
import { runIntentDraft } from "../src/intent-draft-run.js";

const fakeManifest: AgentManifest = {
  agent_id: "conformance-fake",
  name: "Conformance Fake Agent",
  version: "0.0.1",
  protocol_version: "0",
  commands: [
    {
      name: "conformance.static_echo",
      description: "Static-preview conformance command.",
      args_schema: {
        type: "object",
        additionalProperties: false,
        required: ["message"],
        properties: {
          message: { type: "string", minLength: 1 }
        }
      },
      preview_policy: {
        preview_kind: "static",
        requires_approval_before_preview: false,
        preview_side_effects: [],
        invalidates_on_context_change: false
      },
      side_effects: [],
      permissions: []
    }
  ]
};

describe("agentctl intent-draft", () => {
  it("lists intent-draft in help", () => {
    const help = formatAgentctlHelp();
    expect(help).toContain("intent-draft <text...>");
    expect(help).toContain("--agent <id>");
    expect(help).toContain("--assist");
  });

  it("buildIntentScopeFromManifests converts manifest commands to IntentScope", () => {
    const scope = buildIntentScopeFromManifests([fakeManifest]);
    expect(scope.commands).toHaveLength(1);
    expect(scope.commands[0]).toEqual({
      agent_id: "conformance-fake",
      command: "conformance.static_echo",
      command_description: "Static-preview conformance command.",
      args_schema: fakeManifest.commands[0]!.args_schema
    });
  });

  it("formats candidate human output with stable labels", () => {
    const result: IntentDraftResult = {
      outcome: "candidate",
      candidate: {
        agent_id: "conformance-fake",
        command: "conformance.static_echo",
        prefilled_args: { message: "hello" }
      }
    };
    const text = formatIntentDraftResult(result);
    expect(text).toContain("Intent draft: candidate");
    expect(text).toContain("agent_id: conformance-fake");
    expect(text).toContain("command: conformance.static_echo");
    expect(text).toContain("prefilled_args:");
    expect(text).toContain('"message": "hello"');
    expect(text).not.toMatch(/confidence|score|candidates/i);
  });

  it("formats needs_clarification human output with reason, message, and partial args", () => {
    const result: IntentDraftResult = {
      outcome: "needs_clarification",
      reason: "missing_required_args",
      message: "Missing required fields: vault_path.",
      missing_required_args: ["vault_path"],
      partial_candidate: {
        agent_id: "indbase",
        command: "indbase.ingest_file",
        prefilled_args: { source_path: "C:\\docs\\a.md" }
      }
    };
    const text = formatIntentDraftResult(result);
    expect(text).toContain("Intent draft: needs_clarification");
    expect(text).toContain("reason: missing_required_args");
    expect(text).toContain("message: Missing required fields: vault_path.");
    expect(text).toContain("missing_required_args: vault_path");
    expect(text).toContain("partial_prefilled_args:");
    expect(text).toContain('"source_path": "C:\\\\docs\\\\a.md"');
  });

  it("runIntentDraft --assist uses injected provider without calling deterministic candidate path", async () => {
    const scope = buildIntentScopeFromManifests([fakeManifest]);
    const deterministic = await runIntentDraft({
      text: 'static echo "hello"',
      scope,
      assist: false
    });
    expect(deterministic.outcome).toBe("candidate");

    const suggest = vi.fn(async () => ({
      agent_id: "conformance-fake",
      command: "conformance.static_echo",
      prefilled_args: { message: "assisted" }
    }));
    const assisted = await runIntentDraft({
      text: "unrelated phrase",
      scope,
      assist: true,
      provider: { suggest }
    });
    expect(suggest).toHaveBeenCalledOnce();
    expect(assisted.outcome).toBe("candidate");
    if (assisted.outcome !== "candidate") return;
    expect(assisted.candidate.prefilled_args).toEqual({ message: "assisted" });
  });

  it("runIntentDraft --assist without provider adds assisted_unavailable notice", async () => {
    const scope = buildIntentScopeFromManifests([fakeManifest]);
    const assisted = await runIntentDraft({
      text: "unrelated phrase",
      scope,
      assist: true,
      provider: null
    });
    expect(assisted.outcome).toBe("needs_clarification");
    expect(assisted.assist_notice?.code).toBe("assisted_unavailable");
    const text = formatIntentDraftResult(assisted);
    expect(text).toContain("assist_notice_code: assisted_unavailable");
    const parsed = JSON.parse(formatIntentDraftJson(assisted));
    expect(parsed.assist_notice.code).toBe("assisted_unavailable");
    expect(JSON.stringify(parsed)).not.toMatch(/api[_-]?key|endpoint|model/i);
  });

  it("runIntentDraft --assist drops unsafe provider messages from human and JSON output", async () => {
    const scope = buildIntentScopeFromManifests([fakeManifest]);
    const assisted = await runIntentDraft({
      text: "unrelated phrase",
      scope,
      assist: true,
      provider: {
        suggest: vi.fn(async () => ({
          agent_id: "conformance-fake",
          command: "conformance.static_echo",
          prefilled_args: { message: "assisted" },
          message: "provider endpoint: https://private.example/v1"
        }))
      }
    });
    expect(assisted.outcome).toBe("candidate");
    const text = formatIntentDraftResult(assisted);
    const json = formatIntentDraftJson(assisted);
    expect(text).not.toMatch(/private\.example|provider endpoint|endpoint:/i);
    expect(json).not.toMatch(/private\.example|provider endpoint|endpoint:/i);
  });

  it("JSON output preserves runtime result shape", () => {
    const result = draftIntent({
      text: 'static echo "hello"',
      scope: buildIntentScopeFromManifests([fakeManifest])
    });
    const parsed = JSON.parse(formatIntentDraftJson(result)) as IntentDraftResult;
    expect(parsed).toEqual(result);
    expect(parsed).not.toHaveProperty("confidence");
    expect(parsed).not.toHaveProperty("score");
    expect(parsed).not.toHaveProperty("candidates");
    if (parsed.outcome === "candidate") {
      expect(parsed.candidate).toHaveProperty("prefilled_args");
      expect(parsed.candidate).not.toHaveProperty("args");
    }
  });
});
