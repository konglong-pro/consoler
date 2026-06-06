import type { AgentCommand, AgentManifest, PreviewPolicy } from "@consoler/protocol";

type SchemaProperty = {
  type: "string" | "boolean" | "integer";
  description?: string;
  default?: unknown;
  minimum?: number;
  maximum?: number;
};

const staticPreview: PreviewPolicy = {
  preview_kind: "static",
  requires_approval_before_preview: false,
  preview_side_effects: [],
  invalidates_on_context_change: true
};

const ingestProbePreview: PreviewPolicy = {
  preview_kind: "probe_readonly",
  requires_approval_before_preview: true,
  preview_side_effects: ["read_source_file", "read_vault_database"],
  invalidates_on_context_change: true
};

function command(
  name: string,
  description: string,
  required: string[],
  properties: Record<string, SchemaProperty>,
  options: {
    previewPolicy?: PreviewPolicy;
    sideEffects?: string[];
    permissions?: AgentCommand["permissions"];
  } = {}
): AgentCommand {
  return {
    name,
    description,
    args_schema: {
      type: "object",
      additionalProperties: false,
      required,
      properties
    },
    preview_policy: options.previewPolicy ?? staticPreview,
    side_effects: options.sideEffects ?? ["read_vault_database"],
    permissions: options.permissions ?? [{ kind: "read_database", scope: "vault" }]
  };
}

const vaultPath = {
  type: "string" as const,
  description: "Path to an existing indbase vault."
};

export const indbaseSourceTrustManifestFixture: AgentManifest = {
  agent_id: "indbase",
  name: "indbase",
  version: "0.1.0",
  protocol_version: "0",
  artifact_retrieval: {
    uri_schemes: ["indbase"],
    kinds: [
      "indbase.ingest_run",
      "indbase.document",
      "indbase.review_item",
      "indbase.task",
      "indbase.error",
      "indbase.doctor_report"
    ]
  },
  commands: [
    command(
      "indbase.doctor",
      "Run integrity checks against an indbase vault.",
      ["vault_path"],
      {
        vault_path: vaultPath
      },
      {
        sideEffects: ["read_vault_files", "read_vault_database", "read_vault_config"],
        permissions: [
          { kind: "read_files", scope: "vault" },
          { kind: "read_database", scope: "vault" }
        ]
      }
    ),
    command(
      "indbase.ingest_file",
      "Ingest one local file into an indbase vault.",
      ["vault_path", "source_path"],
      {
        vault_path: vaultPath,
        source_path: {
          type: "string",
          description: "Path to one local source file."
        }
      },
      {
        previewPolicy: ingestProbePreview,
        sideEffects: [
          "read_source_file",
          "write_vault_database",
          "write_vault_files",
          "read_vault_config"
        ],
        permissions: [
          { kind: "read_files", scope: "source" },
          { kind: "read_database", scope: "vault" },
          { kind: "write_database", scope: "vault" },
          { kind: "write_files", scope: "vault" }
        ]
      }
    ),
    command(
      "indbase.search_sources",
      "Search trusted current source snippets with optional governed category/tag filters.",
      ["vault_path", "query"],
      {
        vault_path: vaultPath,
        query: {
          type: "string",
          description: "Source text query. Empty is valid only with category or tag filters."
        },
        category: {
          type: "string",
          description: "Optional governed Big Category filter."
        },
        tag: {
          type: "string",
          description: "Optional governed Formal Tag filter."
        },
        top_k: {
          type: "integer",
          minimum: 1,
          maximum: 20,
          default: 5
        }
      }
    ),
    command(
      "indbase.doc_show",
      "Show bounded trusted metadata and current source preview for one document ID.",
      ["vault_path", "doc_id"],
      {
        vault_path: vaultPath,
        doc_id: { type: "string" }
      },
      {
        sideEffects: ["read_vault_files", "read_vault_database"],
        permissions: [
          { kind: "read_database", scope: "vault" },
          { kind: "read_files", scope: "vault" }
        ]
      }
    ),
    command(
      "indbase.review_list",
      "List review queue items without mutating them.",
      ["vault_path"],
      {
        vault_path: vaultPath,
        status: { type: "string", default: "pending" },
        type: { type: "string" },
        target_type: { type: "string" },
        limit: { type: "integer", minimum: 1, maximum: 100, default: 20 }
      }
    ),
    command(
      "indbase.review_show",
      "Show one review queue item without resolving it.",
      ["vault_path", "review_id"],
      {
        vault_path: vaultPath,
        review_id: { type: "string" }
      }
    ),
    command(
      "indbase.task_list",
      "List recent task records without changing task state.",
      ["vault_path"],
      {
        vault_path: vaultPath,
        limit: { type: "integer", minimum: 1, maximum: 100, default: 20 }
      }
    ),
    command(
      "indbase.task_show",
      "Show one task and its events without changing task state.",
      ["vault_path", "task_id"],
      {
        vault_path: vaultPath,
        task_id: { type: "string" }
      }
    ),
    command(
      "indbase.error_list",
      "List recorded errors without mutating vault state.",
      ["vault_path"],
      {
        vault_path: vaultPath,
        component: { type: "string" },
        severity: { type: "string" },
        limit: { type: "integer", minimum: 1, maximum: 100, default: 20 }
      }
    ),
    command(
      "indbase.error_show",
      "Show one recorded error without mutating vault state.",
      ["vault_path", "error_id"],
      {
        vault_path: vaultPath,
        error_id: { type: "string" }
      }
    )
  ]
};
