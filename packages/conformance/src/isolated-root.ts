import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import type { RegistryAgentEntry } from "@consoler/protocol";

import { consolerDataDir, registryPath } from "@consoler/runtime";
import { getEnabledAgent, loadRegistry } from "@consoler/runtime";

export function writeIsolatedRegistry(
  rootDir: string,
  entry: RegistryAgentEntry
): void {
  const dir = consolerDataDir(rootDir);
  mkdirSync(dir, { recursive: true });
  writeFileSync(registryPath(rootDir), JSON.stringify({ agents: [entry] }, null, 2), "utf8");
}

export function resolveRegistryEntry(input: {
  agentId: string;
  registryRoot?: string;
  registryEntry?: RegistryAgentEntry;
}): RegistryAgentEntry {
  if (input.registryEntry) {
    return input.registryEntry;
  }
  const registry = loadRegistry(input.registryRoot);
  return getEnabledAgent(registry, input.agentId);
}

export function createTempConformanceRoot(input: {
  agentId: string;
  registryRoot?: string;
  registryEntry?: RegistryAgentEntry;
}): string {
  const rootDir = mkdtempSync(path.join(os.tmpdir(), "consoler-conformance-"));
  const entry = resolveRegistryEntry(input);
  writeIsolatedRegistry(rootDir, entry);
  return rootDir;
}

export function cleanupTempRoot(rootDir: string): void {
  rmSync(rootDir, { recursive: true, force: true });
}
