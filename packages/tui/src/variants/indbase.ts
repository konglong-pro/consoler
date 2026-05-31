import type { ConsoleVariantConfig } from "../variant-types.js";

export const indbaseVariant: ConsoleVariantConfig = {
  id: "indbase",
  productName: "indbase",
  defaultAgentId: "indbase",
  allowedAgentIds: ["indbase"],
  allowedCommands: ["indbase.doctor", "indbase.ingest_file"],
  actions: [
    {
      id: "check_vault",
      label: "Check knowledge base status",
      description: "Run a read-only health check on a vault",
      agentId: "indbase",
      command: "indbase.doctor",
      intentHints: ["check", "status", "vault", "doctor", "检查", "诊断", "知识库状态"]
    },
    {
      id: "ingest_file",
      label: "Import a file",
      description: "Ingest a single file into a vault",
      agentId: "indbase",
      command: "indbase.ingest_file",
      intentHints: ["import", "ingest", "file", "导入", "导入文件", "文件入库"]
    }
  ],
  fieldLabels: {
    "indbase.doctor": {
      vault_path: {
        label: "Vault location",
        help: "Path to the indbase vault directory",
        intentHints: ["vault", "knowledge base", "知识库", "库"]
      },
      hard_only: {
        label: "Hard checks only",
        help: "Skip soft warnings when true"
      }
    },
    "indbase.ingest_file": {
      vault_path: {
        label: "Vault location",
        help: "Path to the indbase vault directory",
        intentHints: ["vault", "knowledge base", "知识库", "库"]
      },
      source_path: {
        label: "File to import",
        help: "Path to the file on disk to ingest",
        intentHints: ["file", "source", "文件", "源文件"]
      }
    }
  },
  approvalCopy: {
    "indbase.doctor": {
      previewTitle: "Preview vault check",
      previewPrompt: "y = run read-only probe, n = cancel",
      executeTitle: "Run vault check",
      executePrompt: "y = start check, n = cancel"
    },
    "indbase.ingest_file": {
      previewTitle: "Preview file import",
      previewPrompt: "y = run read-only duplicate probe, n = cancel",
      executeTitle: "Import file",
      executePrompt: "y = start import, n = cancel"
    }
  },
  artifactKindLabels: {
    "indbase.ingest_run": "File import run",
    "indbase.document": "Knowledge base document",
    "indbase.document_revision": "Document revision"
  }
};
