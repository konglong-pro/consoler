import { describe, expect, it } from "vitest";
import { indbaseManifestV1aFixture } from "@consoler/protocol";

import { draftIntent } from "../src/intent-draft.js";
import type { IntentScope, IntentScopeCommand } from "../src/intent-draft-types.js";

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
    action_hints: ["check", "vault", "doctor", "诊断", "检查"],
    field_hints: {
      vault_path: ["vault", "知识库", "库"]
    }
  })
);

const ingestScope = scopeWith(
  commandFromManifest("indbase.ingest_file", {
    product_label: "Import file",
    action_hints: ["import", "ingest", "upload", "导入"],
    field_hints: {
      vault_path: ["vault", "知识库", "库"],
      source_path: ["file", "source", "文件", "源"]
    },
    field_labels: {
      vault_path: { label: "vault" },
      source_path: { label: "file" }
    }
  })
);

const doctorAndIngestScope = scopeWith(
  commandFromManifest("indbase.doctor", {
    action_hints: ["check", "vault"]
  }),
  commandFromManifest("indbase.ingest_file", {
    action_hints: ["check", "vault"]
  })
);

describe("draftIntent", () => {
  it("returns a clear doctor candidate with vault_path", () => {
    const result = draftIntent({
      text: "check vault C:\\vault",
      scope: doctorScope
    });
    expect(result.outcome).toBe("candidate");
    if (result.outcome !== "candidate") return;
    expect(result.candidate.agent_id).toBe("indbase");
    expect(result.candidate.command).toBe("indbase.doctor");
    expect(result.candidate.prefilled_args).toEqual({ vault_path: "C:\\vault" });
    expect(result.candidate).not.toHaveProperty("args");
  });

  it("returns import partial with source_path and missing vault_path", () => {
    const result = draftIntent({
      text: "import C:\\docs\\a.md",
      scope: ingestScope
    });
    expect(result).toMatchObject({
      outcome: "needs_clarification",
      reason: "missing_required_args",
      message: "Missing required fields: vault_path.",
      missing_required_args: ["vault_path"],
      partial_candidate: {
        agent_id: "indbase",
        command: "indbase.ingest_file",
        prefilled_args: { source_path: "C:\\docs\\a.md" }
      }
    });
  });

  it("fills both paths when vault and file hints label each path", () => {
    const result = draftIntent({
      text: "import vault C:\\vault\\data source file C:\\docs\\a.md",
      scope: ingestScope
    });
    expect(result.outcome).toBe("candidate");
    if (result.outcome !== "candidate") return;
    expect(result.candidate.prefilled_args).toEqual({
      vault_path: "C:\\vault\\data",
      source_path: "C:\\docs\\a.md"
    });
  });

  it("returns ambiguous_args for two unlabeled paths", () => {
    const result = draftIntent({
      text: "import C:\\vault\\data C:\\docs\\a.md",
      scope: ingestScope
    });
    expect(result).toMatchObject({
      outcome: "needs_clarification",
      reason: "ambiguous_args",
      message: "Could not assign extracted values to fields unambiguously."
    });
  });

  it("returns no_match when nothing scores", () => {
    const result = draftIntent({
      text: "completely unrelated phrase",
      scope: doctorScope
    });
    expect(result).toMatchObject({
      outcome: "needs_clarification",
      reason: "no_match",
      message: "No matching action found."
    });
  });

  it("returns ambiguous_command when top commands tie within margin", () => {
    const result = draftIntent({
      text: "check vault",
      scope: doctorAndIngestScope
    });
    expect(result).toMatchObject({
      outcome: "needs_clarification",
      reason: "ambiguous_command",
      message: "More than one action matched."
    });
  });

  it("returns ambiguous_command when the second-best command is exactly at the margin", () => {
    const result = draftIntent({
      text: "run",
      scope: scopeWith(
        {
          agent_id: "fake",
          command: "fake.primary",
          command_description: "primary",
          args_schema: { type: "object", properties: {} },
          action_hints: ["run"]
        },
        {
          agent_id: "fake",
          command: "fake.run",
          command_description: "secondary",
          args_schema: { type: "object", properties: {} }
        }
      )
    });
    expect(result).toMatchObject({
      outcome: "needs_clarification",
      reason: "ambiguous_command",
      message: "More than one action matched."
    });
  });

  it("returns unsupported_schema for nested object fields", () => {
    const result = draftIntent({
      text: "run nested",
      scope: scopeWith({
        agent_id: "fake",
        command: "fake.nested",
        command_description: "nested",
        args_schema: {
          type: "object",
          properties: {
            payload: { type: "object", properties: { x: { type: "string" } } }
          }
        },
        action_hints: ["nested", "run"]
      })
    });
    expect(result).toMatchObject({
      outcome: "needs_clarification",
      reason: "unsupported_schema",
      message: "This action's input schema is not supported by intent drafting."
    });
    if (result.outcome === "needs_clarification") {
      expect(result.unsupported_features).toContain("field:payload:object");
    }
  });

  it("returns unsupported_schema for array and oneOf fields", () => {
    const arrayResult = draftIntent({
      text: "run array",
      scope: scopeWith({
        agent_id: "fake",
        command: "fake.array",
        command_description: "array",
        args_schema: {
          type: "object",
          properties: { items: { type: "array", items: { type: "string" } } }
        },
        action_hints: ["array", "run"]
      })
    });
    expect(arrayResult.outcome).toBe("needs_clarification");
    if (arrayResult.outcome === "needs_clarification") {
      expect(arrayResult.reason).toBe("unsupported_schema");
      expect(arrayResult.unsupported_features).toContain("field:items:array");
    }

    const oneOfResult = draftIntent({
      text: "run oneof",
      scope: scopeWith({
        agent_id: "fake",
        command: "fake.oneof",
        command_description: "oneof",
        args_schema: {
          type: "object",
          oneOf: [{ properties: { a: { type: "string" } } }]
        },
        action_hints: ["oneof", "run"]
      })
    });
    expect(oneOfResult.outcome).toBe("needs_clarification");
    if (oneOfResult.outcome === "needs_clarification") {
      expect(oneOfResult.reason).toBe("unsupported_schema");
      expect(oneOfResult.unsupported_features).toContain("keyword:oneOf");
    }
  });

  it("returns ambiguous_args for multi-file import input", () => {
    const result = draftIntent({
      text: "import C:\\docs\\a.md C:\\docs\\b.md",
      scope: ingestScope
    });
    expect(result).toMatchObject({
      outcome: "needs_clarification",
      reason: "ambiguous_args"
    });
  });

  it("extracts quoted strings, urls, numbers, integers, and booleans", () => {
    const stringResult = draftIntent({
      text: 'echo "hello world"',
      scope: scopeWith({
        agent_id: "fake",
        command: "fake.echo",
        command_description: "echo",
        args_schema: {
          type: "object",
          required: ["message"],
          properties: { message: { type: "string" } }
        },
        action_hints: ["echo"]
      })
    });
    expect(stringResult.outcome).toBe("candidate");
    if (stringResult.outcome === "candidate") {
      expect(stringResult.candidate.prefilled_args).toEqual({ message: "hello world" });
    }

    const urlResult = draftIntent({
      text: "fetch https://example.com/docs",
      scope: scopeWith({
        agent_id: "fake",
        command: "fake.fetch",
        command_description: "fetch",
        args_schema: {
          type: "object",
          required: ["url"],
          properties: { url: { type: "string" } }
        },
        action_hints: ["fetch"]
      })
    });
    expect(urlResult.outcome).toBe("candidate");
    if (urlResult.outcome === "candidate") {
      expect(urlResult.candidate.prefilled_args.url).toBe("https://example.com/docs");
    }

    const numberResult = draftIntent({
      text: "limit 12.5",
      scope: scopeWith({
        agent_id: "fake",
        command: "fake.limit",
        command_description: "limit",
        args_schema: {
          type: "object",
          required: ["limit"],
          properties: { limit: { type: "number" } }
        },
        action_hints: ["limit"]
      })
    });
    expect(numberResult.outcome).toBe("candidate");
    if (numberResult.outcome === "candidate") {
      expect(numberResult.candidate.prefilled_args.limit).toBe(12.5);
    }

    const integerResult = draftIntent({
      text: "limit 10",
      scope: scopeWith({
        agent_id: "fake",
        command: "fake.limit",
        command_description: "limit",
        args_schema: {
          type: "object",
          required: ["limit"],
          properties: { limit: { type: "integer" } }
        },
        action_hints: ["limit"]
      })
    });
    expect(integerResult.outcome).toBe("candidate");
    if (integerResult.outcome === "candidate") {
      expect(integerResult.candidate.prefilled_args.limit).toBe(10);
    }

    const decimalIntegerResult = draftIntent({
      text: "limit 10.5",
      scope: scopeWith({
        agent_id: "fake",
        command: "fake.limit",
        command_description: "limit",
        args_schema: {
          type: "object",
          required: ["limit"],
          properties: { limit: { type: "integer" } }
        },
        action_hints: ["limit"]
      })
    });
    expect(decimalIntegerResult).toMatchObject({
      outcome: "needs_clarification",
      reason: "missing_required_args",
      missing_required_args: ["limit"]
    });

    const booleanResult = draftIntent({
      text: "toggle dry_run true",
      scope: scopeWith({
        agent_id: "fake",
        command: "fake.toggle",
        command_description: "toggle",
        args_schema: {
          type: "object",
          required: ["dry_run"],
          properties: { dry_run: { type: "boolean" } }
        },
        action_hints: ["toggle"],
        field_hints: { dry_run: ["dry_run"] }
      })
    });
    expect(booleanResult.outcome).toBe("candidate");
    if (booleanResult.outcome === "candidate") {
      expect(booleanResult.candidate.prefilled_args.dry_run).toBe(true);
    }
  });

  it("maps localized import hints and file hints", () => {
    const ingestByHint = draftIntent({
      text: "导入 C:\\docs\\a.md",
      scope: ingestScope
    });
    expect(ingestByHint.outcome).toBe("needs_clarification");
    if (ingestByHint.outcome === "needs_clarification") {
      expect(ingestByHint.reason).toBe("missing_required_args");
      expect(ingestByHint.partial_candidate?.command).toBe("indbase.ingest_file");
    }

    const fileHintResult = draftIntent({
      text: "import 文件 C:\\docs\\a.md",
      scope: ingestScope
    });
    expect(fileHintResult.outcome).toBe("needs_clarification");
    if (fileHintResult.outcome === "needs_clarification") {
      expect(fileHintResult.partial_candidate?.prefilled_args.source_path).toBe("C:\\docs\\a.md");
    }
  });

  it("does not expose ranked candidates or confidence", () => {
    const result = draftIntent({
      text: "check vault C:\\vault",
      scope: doctorScope
    });
    expect(result).not.toHaveProperty("candidates");
    expect(result).not.toHaveProperty("confidence");
    expect(result).not.toHaveProperty("score");
  });

  it("flags unsupported optional complex fields at schema guard time", () => {
    const result = draftIntent({
      text: "run optional",
      scope: scopeWith({
        agent_id: "fake",
        command: "fake.optional",
        command_description: "optional",
        args_schema: {
          type: "object",
          required: ["name"],
          properties: {
            name: { type: "string" },
            metadata: { type: "object", properties: { tag: { type: "string" } } }
          }
        },
        action_hints: ["optional", "run"]
      })
    });
    expect(result.outcome).toBe("needs_clarification");
    if (result.outcome === "needs_clarification") {
      expect(result.reason).toBe("unsupported_schema");
    }
  });
});
