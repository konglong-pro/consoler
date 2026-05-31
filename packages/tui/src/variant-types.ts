/** Checked-in Console Variant configuration (not protocol / manifest). */

export interface VariantFieldLabel {
  label: string;
  help?: string;
}

export interface VariantActionDef {
  /** Stable product task id (not protocol command). */
  id: string;
  label: string;
  description?: string;
  agentId: string;
  command: string;
}

export interface VariantApprovalCopy {
  previewTitle?: string;
  previewPrompt?: string;
  executeTitle?: string;
  executePrompt?: string;
}

export interface ConsoleVariantConfig {
  id: string;
  productName: string;
  defaultAgentId: string;
  allowedAgentIds: string[];
  allowedCommands: string[];
  actions: VariantActionDef[];
  /** command -> field name -> display label */
  fieldLabels: Record<string, Record<string, VariantFieldLabel>>;
  approvalCopy: Record<string, VariantApprovalCopy>;
  /** artifact block content.kind -> product label */
  artifactKindLabels: Record<string, string>;
}
