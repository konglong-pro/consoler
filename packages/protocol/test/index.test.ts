import { describe, expect, it } from "vitest";

import {
  indbaseDoctorArgsSchema,
  indbaseIngestArgsSchema,
  indbaseManifestFixture,
  indbaseManifestV1aFixture,
  manifestHasDuplicateCommands,
  validateActionEvent,
  validateCommandArgs,
  validateArtifactView,
  validateManifest,
  validateRenderableBlock
} from "../src/index.js";

describe("manifest validation", () => {
  it("accepts the v0 indbase-agent manifest fixture", () => {
    const result = validateManifest(indbaseManifestFixture);
    expect(result.ok).toBe(true);
    expect(result.value?.commands).toHaveLength(1);
    expect(result.value?.commands[0]?.name).toBe("indbase.doctor");
  });

  it("rejects duplicate command names", () => {
    const duplicate = {
      ...indbaseManifestFixture,
      commands: [
        indbaseManifestFixture.commands[0],
        { ...indbaseManifestFixture.commands[0], description: "dup" }
      ]
    };
    const validated = validateManifest(duplicate);
    expect(validated.ok).toBe(true);
    expect(manifestHasDuplicateCommands(validated.value!)).toBe("indbase.doctor");
  });

  it("rejects missing required manifest fields", () => {
    const invalid = { agent_id: "indbase" };
    const result = validateManifest(invalid);
    expect(result.ok).toBe(false);
  });

  it("accepts manifests without artifact_retrieval", () => {
    expect(validateManifest(indbaseManifestFixture).ok).toBe(true);
    expect(validateManifest(indbaseManifestV1aFixture).ok).toBe(true);
    expect(validateManifest(indbaseManifestFixture).value?.artifact_retrieval).toBeUndefined();
  });

  it("accepts a valid artifact_retrieval capability", () => {
    const withCapability = {
      ...indbaseManifestFixture,
      artifact_retrieval: {
        uri_schemes: ["indbase"],
        kinds: ["text/markdown", "application/json"]
      }
    };
    const result = validateManifest(withCapability);
    expect(result.ok).toBe(true);
    expect(result.value?.artifact_retrieval?.uri_schemes).toEqual(["indbase"]);
  });

  it.each([
    ["missing uri_schemes", { kinds: ["text/plain"] }],
    ["missing kinds", { uri_schemes: ["indbase"] }],
    ["empty uri_schemes", { uri_schemes: [], kinds: ["text/plain"] }],
    ["empty kinds", { uri_schemes: ["indbase"], kinds: [] }],
    ["non-string uri_schemes item", { uri_schemes: [1], kinds: ["text/plain"] }],
    ["non-string kinds item", { uri_schemes: ["indbase"], kinds: [false] }],
    ["unknown field", { uri_schemes: ["indbase"], kinds: ["text/plain"], extra: true }]
  ])("rejects malformed artifact_retrieval: %s", (_label, capability) => {
    const result = validateManifest({
      ...indbaseManifestFixture,
      artifact_retrieval: capability
    });
    expect(result.ok).toBe(false);
  });
});

describe("indbase.doctor args schema", () => {
  const argsSchema = indbaseManifestFixture.commands[0]!.args_schema;

  it("rejects missing vault_path", () => {
    const result = validateCommandArgs(argsSchema, { hard_only: true });
    expect(result.ok).toBe(false);
  });

  it("rejects unknown fields", () => {
    const result = validateCommandArgs(argsSchema, {
      vault_path: "/tmp/vault",
      extra: true
    });
    expect(result.ok).toBe(false);
  });

  it("accepts valid args", () => {
    const result = validateCommandArgs(argsSchema, { vault_path: "/tmp/vault" });
    expect(result.ok).toBe(true);
  });

  it("matches standalone doctor args schema", () => {
    const result = validateCommandArgs(indbaseDoctorArgsSchema, { vault_path: "E:/vault" });
    expect(result.ok).toBe(true);
  });
});

describe("V1a manifest", () => {
  it("accepts probe_readonly preview policy", () => {
    const result = validateManifest(indbaseManifestV1aFixture);
    expect(result.ok).toBe(true);
    const ingest = result.value?.commands.find((command) => command.name === "indbase.ingest_file");
    expect(ingest?.preview_policy.preview_kind).toBe("probe_readonly");
    expect(ingest?.preview_policy.requires_approval_before_preview).toBe(true);
  });

  it("validates indbase.ingest_file args", () => {
    const ingest = indbaseManifestV1aFixture.commands.find(
      (command) => command.name === "indbase.ingest_file"
    )!;
    expect(validateCommandArgs(ingest.args_schema, { vault_path: "/v", source_path: "/s" }).ok).toBe(
      true
    );
    expect(validateCommandArgs(ingest.args_schema, { vault_path: "/v" }).ok).toBe(false);
    expect(
      validateCommandArgs(indbaseIngestArgsSchema, {
        vault_path: "E:/vault",
        source_path: "E:/file.txt"
      }).ok
    ).toBe(true);
  });
});

describe("action event validation", () => {
  const baseEvent = {
    event_id: "evt_1",
    run_id: "run_1",
    action_id: "act_1",
    agent_id: "indbase",
    command: "indbase.doctor",
    type: "action.started",
    seq: 1,
    epoch: 0,
    timestamp: new Date().toISOString()
  };

  it("accepts valid events", () => {
    expect(validateActionEvent(baseEvent).ok).toBe(true);
  });

  it("rejects invalid event type", () => {
    const result = validateActionEvent({ ...baseEvent, type: "action.unknown" });
    expect(result.ok).toBe(false);
  });

  it("rejects missing ids", () => {
    const result = validateActionEvent({ ...baseEvent, run_id: undefined });
    expect(result.ok).toBe(false);
  });

  it("rejects non-monotonic seq below minimum", () => {
    const result = validateActionEvent({ ...baseEvent, seq: 0 });
    expect(result.ok).toBe(false);
  });

  it("rejects unsupported renderable blocks", () => {
    const result = validateActionEvent({
      ...baseEvent,
      type: "action.succeeded",
      blocks: [{ block_id: "b1", type: "chart", content: {} }]
    });
    expect(result.ok).toBe(false);
  });

  it("requires interaction payload for interaction.required", () => {
    const without = validateActionEvent({
      ...baseEvent,
      type: "interaction.required"
    });
    expect(without.ok).toBe(false);

    const withPayload = validateActionEvent({
      ...baseEvent,
      type: "interaction.required",
      interaction: {
        interaction_id: "ix_1",
        title: "Choose",
        message: "Pick one",
        choices: [{ id: "a", label: "A" }]
      }
    });
    expect(withPayload.ok).toBe(true);
  });

  it("rejects malformed interaction.required without choices or schema", () => {
    const result = validateActionEvent({
      ...baseEvent,
      type: "interaction.required",
      interaction: {
        interaction_id: "ix_1",
        title: "Choose",
        message: "Pick one"
      }
    });
    expect(result.ok).toBe(true);
  });

  it("accepts operation_trace payloads", () => {
    const result = validateActionEvent({
      ...baseEvent,
      type: "action.succeeded",
      payload: {
        operation_trace: {
          operation_id: "op_1",
          action_id: "act_1",
          agent_id: "indbase",
          command: "indbase.doctor",
          status: "succeeded",
          domain_refs: {
            task_id: "task_1",
            doc_id: "doc_1"
          },
          capability_refs: [
            {
              provider: "swallow",
              capability_id: "swallow.ingest",
              provider_run_id: "prun_1",
              status: "succeeded",
              job_id: "job_1",
              profile: "local",
              operation_id: "provider_op_1",
              manifest_ref: "indbase://artifacts/manifest",
              trace_ref: "indbase://artifacts/trace",
              artifact_refs: ["indbase://artifacts/output"]
            }
          ],
          metadata: {
            artifact_trust_state: "trusted_source"
          }
        }
      }
    });
    expect(result.ok).toBe(true);
    expect(result.value?.payload?.operation_trace?.operation_id).toBe("op_1");
  });

  it("rejects malformed operation_trace payloads", () => {
    const missingOperationId = validateActionEvent({
      ...baseEvent,
      payload: {
        operation_trace: {
          action_id: "act_1",
          agent_id: "indbase",
          command: "indbase.doctor"
        }
      }
    });
    expect(missingOperationId.ok).toBe(false);

    const nonStringDomainRef = validateActionEvent({
      ...baseEvent,
      payload: {
        operation_trace: {
          operation_id: "op_1",
          action_id: "act_1",
          agent_id: "indbase",
          command: "indbase.doctor",
          domain_refs: {
            doc_id: 1
          }
        }
      }
    });
    expect(nonStringDomainRef.ok).toBe(false);

    const missingCapabilityField = validateActionEvent({
      ...baseEvent,
      payload: {
        operation_trace: {
          operation_id: "op_1",
          action_id: "act_1",
          agent_id: "indbase",
          command: "indbase.doctor",
          capability_refs: [
            {
              provider: "swallow",
              capability_id: "swallow.ingest",
              status: "succeeded"
            }
          ]
        }
      }
    });
    expect(missingCapabilityField.ok).toBe(false);
  });
});

describe("renderable block validation", () => {
  it("accepts valid diff and artifact blocks", () => {
    expect(
      validateRenderableBlock({
        block_id: "b-diff",
        type: "diff",
        content: { unified_diff: "--- a\n+++ b\n" }
      }).ok
    ).toBe(true);
    expect(
      validateRenderableBlock({
        block_id: "b-art",
        type: "artifact",
        content: { uri: "file:///tmp/x.txt", kind: "text/plain" }
      }).ok
    ).toBe(true);
  });

  it("rejects diff without unified_diff", () => {
    const result = validateRenderableBlock({
      block_id: "b-diff",
      type: "diff",
      content: {}
    });
    expect(result.ok).toBe(false);
  });

  it("rejects artifact without uri or kind", () => {
    expect(
      validateRenderableBlock({
        block_id: "b-art",
        type: "artifact",
        content: { kind: "text/plain" }
      }).ok
    ).toBe(false);
    expect(
      validateRenderableBlock({
        block_id: "b-art",
        type: "artifact",
        content: { uri: "file:///tmp/x.txt" }
      }).ok
    ).toBe(false);
  });

  it("rejects unsupported block types", () => {
    const result = validateRenderableBlock({
      block_id: "b1",
      type: "chart",
      content: {}
    });
    expect(result.ok).toBe(false);
  });
});

describe("artifact view validation", () => {
  const baseView = {
    artifact_uri: "indbase://documents/doc_1",
    kind: "text/markdown",
    blocks: [] as Array<{ block_id: string; type: string; content: unknown }>
  };

  it("accepts markdown, table, json, error, and diff blocks", () => {
    const view = {
      ...baseView,
      blocks: [
        { block_id: "b-md", type: "markdown", content: "# Title" },
        {
          block_id: "b-table",
          type: "table",
          content: { columns: ["a"], rows: [["1"]] }
        },
        { block_id: "b-json", type: "json", content: { ok: true } },
        {
          block_id: "b-error",
          type: "error",
          content: { code: "E1", message: "failed" }
        },
        {
          block_id: "b-diff",
          type: "diff",
          content: { unified_diff: "--- a\n+++ b\n" }
        }
      ]
    };
    expect(validateArtifactView(view).ok).toBe(true);
  });

  it("rejects nested artifact blocks", () => {
    const result = validateArtifactView({
      ...baseView,
      blocks: [
        {
          block_id: "b-art",
          type: "artifact",
          content: { uri: "indbase://documents/doc_1", kind: "text/markdown" }
        }
      ]
    });
    expect(result.ok).toBe(false);
  });

  it.each([
    ["missing artifact_uri", { kind: "text/plain", blocks: [] }],
    ["missing kind", { artifact_uri: "indbase://x", blocks: [] }],
    ["missing blocks", { artifact_uri: "indbase://x", kind: "text/plain" }],
    [
      "malformed block",
      {
        artifact_uri: "indbase://x",
        kind: "text/plain",
        blocks: [{ block_id: "b1", type: "diff", content: {} }]
      }
    ]
  ])("rejects invalid artifact view: %s", (_label, view) => {
    expect(validateArtifactView(view).ok).toBe(false);
  });
});
