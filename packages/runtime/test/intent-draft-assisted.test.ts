import { describe, expect, it, vi } from "vitest";
import { indbaseManifestV1aFixture } from "@consoler/protocol";

import { draftIntent } from "../src/intent-draft.js";
import { draftIntentAssisted, suggestionToIntentResult } from "../src/intent-draft-assisted.js";
import { createJsonHttpIntentProvider } from "../src/intent-draft-http-provider.js";
import type { IntentScope, IntentScopeCommand } from "../src/intent-draft-types.js";
import type { LlmIntentProvider } from "../src/intent-draft-assisted-types.js";

function commandFromManifest(
  commandName: string,
  extras: Partial<IntentScopeCommand> = {}
): IntentScopeCommand {
  const manifestCommand = indbaseManifestV1aFixture.commands.find(
    (entry) => entry.name === commandName
  );
  if (!manifestCommand) {
    throw new Error(`missing manifest command: ${commandName}`);
  }
  return {
    agent_id: indbaseManifestV1aFixture.agent_id,
    command: manifestCommand.name,
    command_description: manifestCommand.description,
    args_schema: manifestCommand.args_schema as Record<string, unknown>,
    ...extras
  };
}

function scopeWith(...commands: IntentScopeCommand[]): IntentScope {
  return { commands };
}

const doctorScope = scopeWith(
  commandFromManifest("indbase.doctor", {
    product_label: "Vault doctor",
    action_hints: ["check", "vault", "doctor"]
  })
);

const ingestScope = scopeWith(
  commandFromManifest("indbase.ingest_file", {
    product_label: "Import file",
    action_hints: ["import", "ingest", "upload"]
  })
);

function fakeProvider(
  impl: LlmIntentProvider["suggest"]
): LlmIntentProvider {
  return { suggest: impl };
}

describe("draftIntentAssisted", () => {
  it("does not call the provider when deterministic returns a candidate", async () => {
    const suggest = vi.fn(async () => ({
      agent_id: "indbase",
      command: "indbase.doctor",
      prefilled_args: { vault_path: "C:\\other" }
    }));
    const result = await draftIntentAssisted({
      text: "check vault C:\\vault",
      scope: doctorScope,
      provider: fakeProvider(suggest)
    });
    expect(suggest).not.toHaveBeenCalled();
    expect(result.outcome).toBe("candidate");
    expect(result).not.toHaveProperty("assist_notice");
  });

  it("calls the provider for deterministic clarification and accepts a valid suggestion", async () => {
    const deterministic = draftIntent({
      text: "import C:\\docs\\a.md",
      scope: ingestScope
    });
    expect(deterministic.outcome).toBe("needs_clarification");

    const suggest = vi.fn(async () => ({
      agent_id: "indbase",
      command: "indbase.ingest_file",
      prefilled_args: {
        vault_path: "C:\\vault",
        source_path: "C:\\docs\\a.md"
      }
    }));
    const result = await draftIntentAssisted({
      text: "import C:\\docs\\a.md",
      scope: ingestScope,
      provider: fakeProvider(suggest)
    });
    expect(suggest).toHaveBeenCalledOnce();
    expect(result.outcome).toBe("candidate");
    if (result.outcome !== "candidate") return;
    expect(result.candidate.prefilled_args).toEqual({
      vault_path: "C:\\vault",
      source_path: "C:\\docs\\a.md"
    });
    expect(result).not.toHaveProperty("assist_notice");
  });

  it("returns missing_required_args when the provider suggestion is partial", async () => {
    const result = await draftIntentAssisted({
      text: "import C:\\docs\\a.md",
      scope: ingestScope,
      provider: fakeProvider(async () => ({
        agent_id: "indbase",
        command: "indbase.ingest_file",
        prefilled_args: { source_path: "C:\\docs\\a.md" }
      }))
    });
    expect(result).toMatchObject({
      outcome: "needs_clarification",
      reason: "missing_required_args",
      missing_required_args: ["vault_path"]
    });
    expect(result).not.toHaveProperty("assist_notice");
  });

  it("falls back with assisted_unavailable when no provider is configured", async () => {
    const result = await draftIntentAssisted({
      text: "import C:\\docs\\a.md",
      scope: ingestScope
    });
    expect(result.outcome).toBe("needs_clarification");
    expect(result.assist_notice).toEqual({
      code: "assisted_unavailable",
      message: expect.stringContaining("unavailable")
    });
    expect(JSON.stringify(result)).not.toMatch(/api[_-]?key|endpoint|model/i);
  });

  it("falls back with assisted_timed_out when the provider is slow", async () => {
    const result = await draftIntentAssisted({
      text: "import C:\\docs\\a.md",
      scope: ingestScope,
      timeoutMs: 5,
      provider: fakeProvider(
        () =>
          new Promise((resolve) => {
            setTimeout(
              () =>
                resolve({
                  agent_id: "indbase",
                  command: "indbase.ingest_file",
                  prefilled_args: {
                    vault_path: "C:\\vault",
                    source_path: "C:\\docs\\a.md"
                  }
                }),
              50
            );
          })
      )
    });
    expect(result.assist_notice?.code).toBe("assisted_timed_out");
    expect(result.outcome).toBe("needs_clarification");
    expect(result.reason).toBe("missing_required_args");
  });

  it("falls back with assisted_invalid_output for unscoped commands", async () => {
    const result = await draftIntentAssisted({
      text: "unrelated phrase",
      scope: doctorScope,
      provider: fakeProvider(async () => ({
        agent_id: "other",
        command: "other.command",
        prefilled_args: {}
      }))
    });
    expect(result.assist_notice?.code).toBe("assisted_invalid_output");
    expect(result.outcome).toBe("needs_clarification");
    expect(result.reason).toBe("no_match");
  });

  it("falls back with assisted_invalid_output for unknown fields", async () => {
    const result = await draftIntentAssisted({
      text: "import C:\\docs\\a.md",
      scope: ingestScope,
      provider: fakeProvider(async () => ({
        agent_id: "indbase",
        command: "indbase.ingest_file",
        prefilled_args: {
          vault_path: "C:\\vault",
          source_path: "C:\\docs\\a.md",
          extra_field: "nope"
        }
      }))
    });
    expect(result.assist_notice?.code).toBe("assisted_invalid_output");
  });

  it("rejects provider fields outside schema properties even when additionalProperties is omitted", () => {
    const result = suggestionToIntentResult(
      {
        agent_id: "custom",
        command: "custom.echo",
        prefilled_args: {
          message: "hello",
          extra: "not allowed"
        }
      },
      scopeWith({
        agent_id: "custom",
        command: "custom.echo",
        command_description: "Echo a message.",
        args_schema: {
          type: "object",
          required: ["message"],
          properties: {
            message: { type: "string" }
          }
        }
      })
    );
    expect(result).toEqual({ ok: false, failure: "unknown_fields" });
  });

  it("falls back with assisted_invalid_output for multi-action provider output", async () => {
    const validated = suggestionToIntentResult(
      {
        agent_id: "indbase",
        command: "indbase.doctor",
        prefilled_args: { vault_path: "C:\\vault" },
        actions: [{}, {}]
      } as never,
      doctorScope
    );
    expect(validated.ok).toBe(false);

    const result = await draftIntentAssisted({
      text: "unrelated phrase",
      scope: doctorScope,
      provider: fakeProvider(async () => ({
        agent_id: "indbase",
        command: "indbase.doctor",
        prefilled_args: { vault_path: "C:\\vault" },
        suggestions: [{}, {}]
      } as never))
    });
    expect(result.assist_notice?.code).toBe("assisted_invalid_output");
  });

  it("does not expose provider internals in public results", async () => {
    const result = await draftIntentAssisted({
      text: "unrelated phrase",
      scope: doctorScope,
      provider: fakeProvider(async () => {
        throw new Error("secret provider failure https://private.example/v1");
      })
    });
    const serialized = JSON.stringify(result);
    expect(serialized).not.toMatch(/secret provider|private\.example|confidence|stack/i);
    expect(result.assist_notice?.code).toBe("assisted_unavailable");
  });
});

describe("createJsonHttpIntentProvider", () => {
  it("parses a one-shot suggestion response", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        suggestion: {
          agent_id: "indbase",
          command: "indbase.doctor",
          prefilled_args: { vault_path: "C:\\vault" }
        }
      })
    })) as unknown as typeof fetch;

    const provider = createJsonHttpIntentProvider({
      url: "http://127.0.0.1:9/suggest",
      fetchImpl
    });
    const suggestion = await provider.suggest({
      text: "check vault",
      scope: doctorScope
    });
    expect(suggestion).toEqual({
      agent_id: "indbase",
      command: "indbase.doctor",
      prefilled_args: { vault_path: "C:\\vault" }
    });
    expect(fetchImpl).toHaveBeenCalledOnce();
  });
});
