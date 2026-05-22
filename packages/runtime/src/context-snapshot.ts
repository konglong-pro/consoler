import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

import {
  hashCanonical,
  newSnapshotId,
  type AgentManifest,
  type ContextSnapshot,
  type RegistryAgentEntry
} from "@consoler/protocol";

export interface SnapshotInput {
  entry: RegistryAgentEntry;
  manifest: AgentManifest;
  args: Record<string, unknown>;
}

export function buildContextSnapshot(input: SnapshotInput): ContextSnapshot {
  const vaultPath = String(input.args.vault_path ?? "");
  const resolvedVault = path.resolve(vaultPath);
  const indbaseDir = path.join(resolvedVault, ".indbase");
  const configPath = path.join(indbaseDir, "config", "config.toml");
  const dbPath = path.join(indbaseDir, "db.sqlite");
  const markerPath = indbaseDir;

  const git = readGitState(input.entry.cwd);

  return {
    snapshot_id: newSnapshotId(),
    kind: "composite",
    summary: "indbase vault + source agent version",
    details: {
      vault_path: resolvedVault,
      vault_exists: existsSync(resolvedVault),
      vault_marker_exists: existsSync(markerPath),
      config_mtime: fileMtime(configPath),
      db_mtime: fileMtime(dbPath),
      agent_repo: input.entry.cwd,
      agent_git_head: git.head,
      agent_git_dirty: git.dirty,
      manifest_hash: hashCanonical(input.manifest)
    },
    created_at: new Date().toISOString()
  };
}

export function contextSnapshotHash(snapshot: ContextSnapshot): string {
  return hashCanonical({
    kind: snapshot.kind,
    details: snapshot.details
  });
}

function fileMtime(filePath: string): string | null {
  if (!existsSync(filePath)) return null;
  return statSync(filePath).mtime.toISOString();
}

function readGitState(cwd: string): { head: string | null; dirty: boolean } {
  try {
    const head = execSync("git rev-parse HEAD", { cwd, encoding: "utf8" }).trim();
    const status = execSync("git status --porcelain", { cwd, encoding: "utf8" }).trim();
    return { head, dirty: status.length > 0 };
  } catch {
    return { head: null, dirty: false };
  }
}

export function contextDrift(
  previous: ContextSnapshot,
  current: ContextSnapshot
): boolean {
  const keys = ["config_mtime", "db_mtime", "manifest_hash", "vault_marker_exists", "vault_exists"] as const;
  for (const key of keys) {
    if (previous.details[key] !== current.details[key]) {
      return true;
    }
  }
  return false;
}
