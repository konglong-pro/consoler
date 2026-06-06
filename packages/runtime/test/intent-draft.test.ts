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

  it("does not match command tokens as substrings inside path segments", () => {
    const docShowCommand: IntentScopeCommand = {
      agent_id: "indbase",
      command: "indbase.doc_show",
      command_description: "Show one document by id.",
      args_schema: {
        type: "object",
        required: ["vault_path", "doc_id"],
        properties: {
          vault_path: { type: "string" },
          doc_id: { type: "string" }
        }
      },
      product_label: "Open document by id",
      action_hints: ["document id", "show document"]
    };
    const result = draftIntent({
      text: "import C:\\docs\\a.md",
      scope: scopeWith(ingestScope.commands[0]!, docShowCommand)
    });

    expect(result).toMatchObject({
      outcome: "needs_clarification",
      reason: "missing_required_args",
      partial_candidate: {
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

function sourceTrustCommand(
  name: string,
  description: string,
  required: string[],
  properties: Record<string, Record<string, unknown>>,
  action_hints: string[],
  field_hints: Record<string, string[]> = {}
): IntentScopeCommand {
  return {
    agent_id: "indbase",
    command: name,
    command_description: description,
    args_schema: {
      type: "object",
      additionalProperties: false,
      required,
      properties
    },
    product_label: action_hints[0],
    action_hints,
    field_hints
  };
}

const sourceTrustVaultPath = {
  type: "string",
  description: "Path to an existing indbase vault knowledge base."
};

const sourceTrustScope = scopeWith(
  sourceTrustCommand(
    "indbase.doctor",
    "Run integrity checks against an indbase vault.",
    ["vault_path"],
    { vault_path: sourceTrustVaultPath },
    ["check vault", "doctor", "status", "检查", "诊断"],
    { vault_path: ["vault", "knowledge base", "知识库"] }
  ),
  sourceTrustCommand(
    "indbase.ingest_file",
    "Ingest one local file into an indbase vault.",
    ["vault_path", "source_path"],
    {
      vault_path: sourceTrustVaultPath,
      source_path: { type: "string", description: "Path to one local source file." }
    },
    ["import file", "ingest", "import", "导入", "导入文件"],
    {
      vault_path: ["vault", "knowledge base", "知识库"],
      source_path: ["source file", "file", "文件", "源文件"]
    }
  ),
  sourceTrustCommand(
    "indbase.search_sources",
    "Search trusted current source snippets with optional governed category/tag filters.",
    ["vault_path", "query"],
    {
      vault_path: sourceTrustVaultPath,
      query: { type: "string", description: "Source text query." },
      category: { type: "string", description: "Optional governed Big Category filter." },
      tag: { type: "string", description: "Optional governed Formal Tag filter." },
      top_k: { type: "integer", minimum: 1, maximum: 20, default: 5 }
    },
    ["search sources", "search", "find", "搜索", "检索"],
    {
      vault_path: ["vault", "knowledge base", "知识库"],
      query: ["query", "search text", "搜索词"],
      category: ["category", "分类", "大类"],
      tag: ["tag", "标签"]
    }
  ),
  sourceTrustCommand(
    "indbase.doc_show",
    "Show bounded trusted metadata and current source preview for one document ID.",
    ["vault_path", "doc_id"],
    {
      vault_path: sourceTrustVaultPath,
      doc_id: { type: "string", description: "Document ID." }
    },
    ["open document", "show document", "document id", "文档", "打开文档"],
    {
      vault_path: ["vault", "knowledge base", "知识库"],
      doc_id: ["document id", "doc id", "文档 ID"]
    }
  ),
  sourceTrustCommand(
    "indbase.review_list",
    "List review queue items without mutating them.",
    ["vault_path"],
    {
      vault_path: sourceTrustVaultPath,
      status: { type: "string", default: "pending" },
      type: { type: "string" },
      target_type: { type: "string" },
      limit: { type: "integer", minimum: 1, maximum: 100, default: 20 }
    },
    ["review queue", "list reviews", "reviews", "审核队列"],
    { vault_path: ["vault", "knowledge base", "知识库"] }
  ),
  sourceTrustCommand(
    "indbase.review_show",
    "Show one review queue item without resolving it.",
    ["vault_path", "review_id"],
    {
      vault_path: sourceTrustVaultPath,
      review_id: { type: "string", description: "Review item ID." }
    },
    ["review item", "show review", "review id", "审核项"],
    {
      vault_path: ["vault", "knowledge base", "知识库"],
      review_id: ["review id", "审核 ID"]
    }
  ),
  sourceTrustCommand(
    "indbase.task_list",
    "List recent task records without changing task state.",
    ["vault_path"],
    {
      vault_path: sourceTrustVaultPath,
      limit: { type: "integer", minimum: 1, maximum: 100, default: 20 }
    },
    ["task list", "list tasks", "tasks", "任务列表"],
    { vault_path: ["vault", "knowledge base", "知识库"] }
  ),
  sourceTrustCommand(
    "indbase.task_show",
    "Show one task and its events without changing task state.",
    ["vault_path", "task_id"],
    {
      vault_path: sourceTrustVaultPath,
      task_id: { type: "string", description: "Task ID." }
    },
    ["task details", "show task", "task id", "任务详情"],
    {
      vault_path: ["vault", "knowledge base", "知识库"],
      task_id: ["task id", "任务 ID"]
    }
  ),
  sourceTrustCommand(
    "indbase.error_list",
    "List recorded errors without mutating vault state.",
    ["vault_path"],
    {
      vault_path: sourceTrustVaultPath,
      component: { type: "string" },
      severity: { type: "string" },
      limit: { type: "integer", minimum: 1, maximum: 100, default: 20 }
    },
    ["error list", "list errors", "errors", "错误列表"],
    { vault_path: ["vault", "knowledge base", "知识库"] }
  ),
  sourceTrustCommand(
    "indbase.error_show",
    "Show one recorded error without mutating vault state.",
    ["vault_path", "error_id"],
    {
      vault_path: sourceTrustVaultPath,
      error_id: { type: "string", description: "Error ID." }
    },
    ["error details", "show error", "error id", "错误详情"],
    {
      vault_path: ["vault", "knowledge base", "知识库"],
      error_id: ["error id", "错误 ID"]
    }
  )
);

function resultCommand(result: ReturnType<typeof draftIntent>): string | undefined {
  if (result.outcome === "candidate") return result.candidate.command;
  return result.partial_candidate?.command;
}

function resultPrefilledArgs(result: ReturnType<typeof draftIntent>): Record<string, unknown> {
  if (result.outcome === "candidate") return result.candidate.prefilled_args;
  return result.partial_candidate?.prefilled_args ?? {};
}

describe("draftIntent Source Trust Loop V4e", () => {
  it("selects each Source Trust command from clear deterministic phrasing", () => {
    const cases: Array<[string, string]> = [
      ["check vault C:\\vault", "indbase.doctor"],
      ["import C:\\docs\\a.md", "indbase.ingest_file"],
      ['search "tag governance"', "indbase.search_sources"],
      ["open document doc_20260606_abcd", "indbase.doc_show"],
      ["review queue", "indbase.review_list"],
      ["show review review_123", "indbase.review_show"],
      ["list tasks", "indbase.task_list"],
      ["show task task_123", "indbase.task_show"],
      ["list errors", "indbase.error_list"],
      ["show error err_123", "indbase.error_show"]
    ];

    for (const [text, expectedCommand] of cases) {
      expect(resultCommand(draftIntent({ text, scope: sourceTrustScope }))).toBe(expectedCommand);
    }
  });

  it("prefills search query and explicit governed filters without direct execution", () => {
    const result = draftIntent({
      text: 'search "tag governance" tag:taxonomy category:Research',
      scope: sourceTrustScope
    });

    expect(result).toMatchObject({
      outcome: "needs_clarification",
      reason: "missing_required_args",
      missing_required_args: ["vault_path"],
      partial_candidate: {
        command: "indbase.search_sources",
        prefilled_args: {
          query: "tag governance",
          tag: "taxonomy",
          category: "Research"
        }
      }
    });
  });

  it("does not infer governed tag or category filters from vague search text", () => {
    const result = draftIntent({
      text: "search governance tags",
      scope: sourceTrustScope
    });

    expect(resultCommand(result)).toBe("indbase.search_sources");
    expect(resultPrefilledArgs(result)).toEqual({ query: "governance tags" });
  });

  it("extracts object IDs only from explicit object-like IDs", () => {
    const docResult = draftIntent({
      text: "open document doc_20260606_abcd",
      scope: sourceTrustScope
    });
    expect(resultCommand(docResult)).toBe("indbase.doc_show");
    expect(resultPrefilledArgs(docResult)).toEqual({ doc_id: "doc_20260606_abcd" });

    const numericResult = draftIntent({
      text: "open document 123",
      scope: sourceTrustScope
    });
    expect(resultCommand(numericResult)).toBe("indbase.doc_show");
    expect(resultPrefilledArgs(numericResult)).toEqual({});
    if (numericResult.outcome === "needs_clarification") {
      expect(numericResult.missing_required_args).toEqual(["vault_path", "doc_id"]);
    }
  });

  it("supports Chinese Source Trust action and field phrasing", () => {
    const searchResult = draftIntent({
      text: '搜索 "标签治理" tag:taxonomy',
      scope: sourceTrustScope
    });
    expect(resultCommand(searchResult)).toBe("indbase.search_sources");
    expect(resultPrefilledArgs(searchResult)).toEqual({
      query: "标签治理",
      tag: "taxonomy"
    });

    const doctorResult = draftIntent({
      text: "检查知识库 C:\\vault",
      scope: sourceTrustScope
    });
    expect(resultCommand(doctorResult)).toBe("indbase.doctor");
    expect(resultPrefilledArgs(doctorResult)).toEqual({ vault_path: "C:\\vault" });

    const ingestResult = draftIntent({
      text: "导入文件 C:\\docs\\a.md",
      scope: sourceTrustScope
    });
    expect(resultCommand(ingestResult)).toBe("indbase.ingest_file");
    expect(resultPrefilledArgs(ingestResult)).toEqual({ source_path: "C:\\docs\\a.md" });
  });
});
