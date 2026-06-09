import type { ConsoleVariantConfig } from "../variant-types.js";

export const indbaseVariant: ConsoleVariantConfig = {
  id: "indbase",
  productName: "indbase",
  defaultAgentId: "indbase",
  allowedAgentIds: ["indbase"],
  allowedCommands: [
    "indbase.doctor",
    "indbase.ingest_file",
    "indbase.search_sources",
    "indbase.doc_show",
    "indbase.review_list",
    "indbase.review_show",
    "indbase.task_list",
    "indbase.task_show",
    "indbase.error_list",
    "indbase.error_show"
  ],
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
    },
    {
      id: "search_sources",
      label: "Search trusted sources",
      description: "Search trusted current source snippets in a vault",
      agentId: "indbase",
      command: "indbase.search_sources",
      intentHints: ["search", "trusted", "sources", "query", "source trust", "搜索", "检索", "可信来源"]
    },
    {
      id: "doc_show",
      label: "Open document by id",
      description: "Inspect bounded trusted metadata and current source preview",
      agentId: "indbase",
      command: "indbase.doc_show",
      intentHints: ["document", "document id", "show document", "open document", "文档", "查看文档"]
    },
    {
      id: "review_list",
      label: "Review queue",
      description: "List review queue items without changing them",
      agentId: "indbase",
      command: "indbase.review_list",
      intentHints: ["review", "queue", "pending", "审核", "审阅队列"]
    },
    {
      id: "review_show",
      label: "Review item",
      description: "Inspect one review queue item without resolving it",
      agentId: "indbase",
      command: "indbase.review_show",
      intentHints: ["review item", "review id", "show review", "审核项", "审阅项"]
    },
    {
      id: "task_list",
      label: "Task list",
      description: "List recent task records without changing task state",
      agentId: "indbase",
      command: "indbase.task_list",
      intentHints: ["task", "tasks", "list tasks", "任务", "任务列表"]
    },
    {
      id: "task_show",
      label: "Task details",
      description: "Inspect one task and its events without changing it",
      agentId: "indbase",
      command: "indbase.task_show",
      intentHints: ["task detail", "task id", "show task", "任务详情"]
    },
    {
      id: "error_list",
      label: "Error list",
      description: "List recorded errors without changing vault state",
      agentId: "indbase",
      command: "indbase.error_list",
      intentHints: ["error", "errors", "list errors", "错误", "错误列表"]
    },
    {
      id: "error_show",
      label: "Error details",
      description: "Inspect one recorded error without changing vault state",
      agentId: "indbase",
      command: "indbase.error_show",
      intentHints: ["error detail", "error id", "show error", "错误详情"]
    }
  ],
  sessionPrefillFields: ["vault_path"],
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
    },
    "indbase.search_sources": {
      vault_path: {
        label: "Vault location",
        help: "Path to the indbase vault directory",
        intentHints: ["vault", "knowledge base", "知识库", "库"]
      },
      query: {
        label: "Search text",
        help: "Trusted source text to search for",
        intentHints: ["query", "search", "text", "搜索词", "检索词"]
      },
      category: {
        label: "Category filter",
        help: "Optional governed Big Category filter",
        intentHints: ["category", "big category", "分类", "大类"]
      },
      tag: {
        label: "Tag filter",
        help: "Optional governed Formal Tag filter",
        intentHints: ["tag", "formal tag", "标签", "正式标签"]
      },
      top_k: {
        label: "Result limit",
        help: "Maximum trusted source snippets to return"
      }
    },
    "indbase.doc_show": {
      vault_path: {
        label: "Vault location",
        help: "Path to the indbase vault directory",
        intentHints: ["vault", "knowledge base", "知识库", "库"]
      },
      doc_id: {
        label: "Document id",
        help: "Document id from search or trace output",
        intentHints: ["document id", "doc id", "文档ID"]
      }
    },
    "indbase.review_list": {
      vault_path: {
        label: "Vault location",
        help: "Path to the indbase vault directory",
        intentHints: ["vault", "knowledge base", "知识库", "库"]
      },
      status: {
        label: "Review status",
        help: "Optional status filter, such as pending or all"
      },
      type: {
        label: "Review type",
        help: "Optional review type filter"
      },
      target_type: {
        label: "Target type",
        help: "Optional reviewed object type filter"
      },
      limit: {
        label: "Result limit",
        help: "Maximum review items to return"
      }
    },
    "indbase.review_show": {
      vault_path: {
        label: "Vault location",
        help: "Path to the indbase vault directory",
        intentHints: ["vault", "knowledge base", "知识库", "库"]
      },
      review_id: {
        label: "Review id",
        help: "Review item id from the queue",
        intentHints: ["review id", "审核ID", "审阅ID"]
      }
    },
    "indbase.task_list": {
      vault_path: {
        label: "Vault location",
        help: "Path to the indbase vault directory",
        intentHints: ["vault", "knowledge base", "知识库", "库"]
      },
      limit: {
        label: "Result limit",
        help: "Maximum tasks to return"
      }
    },
    "indbase.task_show": {
      vault_path: {
        label: "Vault location",
        help: "Path to the indbase vault directory",
        intentHints: ["vault", "knowledge base", "知识库", "库"]
      },
      task_id: {
        label: "Task id",
        help: "Task id from a task list or trace output",
        intentHints: ["task id", "任务ID"]
      }
    },
    "indbase.error_list": {
      vault_path: {
        label: "Vault location",
        help: "Path to the indbase vault directory",
        intentHints: ["vault", "knowledge base", "知识库", "库"]
      },
      component: {
        label: "Component filter",
        help: "Optional component filter"
      },
      severity: {
        label: "Severity filter",
        help: "Optional severity filter"
      },
      limit: {
        label: "Result limit",
        help: "Maximum errors to return"
      }
    },
    "indbase.error_show": {
      vault_path: {
        label: "Vault location",
        help: "Path to the indbase vault directory",
        intentHints: ["vault", "knowledge base", "知识库", "库"]
      },
      error_id: {
        label: "Error id",
        help: "Error id from an error list or trace output",
        intentHints: ["error id", "错误ID"]
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
    },
    "indbase.search_sources": {
      executeTitle: "Search trusted sources",
      executePrompt: "y = start search, n = cancel"
    },
    "indbase.doc_show": {
      executeTitle: "Open document",
      executePrompt: "y = open document view, n = cancel"
    },
    "indbase.review_list": {
      executeTitle: "Open review queue",
      executePrompt: "y = list review items, n = cancel"
    },
    "indbase.review_show": {
      executeTitle: "Open review item",
      executePrompt: "y = inspect review item, n = cancel"
    },
    "indbase.task_list": {
      executeTitle: "Open task list",
      executePrompt: "y = list tasks, n = cancel"
    },
    "indbase.task_show": {
      executeTitle: "Open task details",
      executePrompt: "y = inspect task, n = cancel"
    },
    "indbase.error_list": {
      executeTitle: "Open error list",
      executePrompt: "y = list errors, n = cancel"
    },
    "indbase.error_show": {
      executeTitle: "Open error details",
      executePrompt: "y = inspect error, n = cancel"
    }
  },
  artifactKindLabels: {
    "indbase.ingest_run": "File import run",
    "indbase.document": "Knowledge base document",
    "indbase.document_revision": "Document revision",
    "indbase.review_item": "Review item",
    "indbase.task": "Task",
    "indbase.error": "Error record",
    "indbase.doctor_report": "Doctor report"
  },
  operationTraceLabels: {
    domainRefs: {
      task_id: "Task id",
      ingest_run_id: "Import run",
      output_run_id: "Output run",
      doc_id: "Document id",
      revision_id: "Revision id",
      review_id: "Review id",
      error_id: "Error id"
    },
    capabilityRefs: {
      provider: "Provider",
      capability_id: "Capability",
      provider_run_id: "Provider run",
      status: "Status",
      job_id: "Provider job",
      profile: "Profile",
      operation_id: "Provider operation",
      manifest_ref: "Manifest ref",
      trace_ref: "Trace ref",
      artifact_refs: "Artifact refs"
    }
  }
};
