import { describe, expect, it } from "vitest";

import {
  indbaseDoctorArgsSchema,
  indbaseIngestArgsSchema,
  indbaseManifestFixture,
  indbaseManifestV1aFixture,
  manifestHasDuplicateCommands,
  validateActionEvent,
  validateCommandArgs,
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
