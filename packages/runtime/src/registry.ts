import { readFileSync } from "node:fs";

import type { AgentsRegistryFile, RegistryAgentEntry } from "@consoler/protocol";

import { registryPath } from "./paths.js";

export function loadRegistry(rootDir?: string): AgentsRegistryFile {
  const filePath = registryPath(rootDir);
  const raw = readFileSync(filePath, "utf8");
  const parsed = JSON.parse(raw) as AgentsRegistryFile;
  if (!Array.isArray(parsed.agents)) {
    throw new Error(`Invalid registry file: ${filePath}`);
  }
  return parsed;
}

export function getEnabledAgent(registry: AgentsRegistryFile, agentId: string): RegistryAgentEntry {
  const entry = registry.agents.find((agent) => agent.agent_id === agentId && agent.enabled);
  if (!entry) {
    throw new Error(`Agent not found or disabled: ${agentId}`);
  }
  return entry;
}
