import type { RegistryAgentEntry } from "@consoler/protocol";

export type ConformanceCheckStatus = "passed" | "failed" | "skipped";

export interface ConformanceCheck {
  id: string;
  name: string;
  status: ConformanceCheckStatus;
  message: string;
  detail?: string;
}

export interface ConformanceReport {
  agent_id: string;
  root_dir: string;
  command?: string;
  checks: ConformanceCheck[];
  passed: boolean;
  started_at: string;
  ended_at: string;
}

export interface RunAgentConformanceInput {
  agentId: string;
  /** Isolated consoler data root; created when omitted. */
  rootDir?: string;
  /** Registry source when copying an existing agent entry. */
  registryRoot?: string;
  /** Use this registry entry instead of loading from registryRoot. */
  registryEntry?: RegistryAgentEntry;
  command?: string;
  args?: Record<string, unknown>;
  approvePreview?: boolean;
  approve?: boolean;
  /** Remove temp rootDir when conformance created it. */
  cleanupTempRoot?: boolean;
}
