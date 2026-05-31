import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

import {
  hashCanonical,
  newSnapshotId,
  type AgentManifest,
  type ContextSnapshot,
  type RegistryAgentEntry
} from "@consoler/protocol";

const HASH_CHUNK_SIZE = 1024 * 1024;

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
  const sourcePath = input.args.source_path ? String(input.args.source_path) : undefined;
  const sourceDetails = sourcePath ? sourceFileDetails(sourcePath) : {};

  return {
    snapshot_id: newSnapshotId(),
    kind: "composite",
    summary: sourcePath
      ? "indbase vault + source file + agent version"
      : "indbase vault + source agent version",
    details: {
      vault_path: resolvedVault,
      vault_exists: existsSync(resolvedVault),
      vault_marker_exists: existsSync(markerPath),
      config_mtime: fileMtime(configPath),
      db_mtime: fileMtime(dbPath),
      agent_repo: input.entry.cwd,
      agent_git_head: git.head,
      agent_git_dirty: git.dirty,
      manifest_hash: hashCanonical(input.manifest),
      ...sourceDetails
    },
    created_at: new Date().toISOString()
  };
}

function sourceFileDetails(sourcePath: string): Record<string, unknown> {
  const resolved = path.resolve(sourcePath);
  if (!existsSync(resolved)) {
    return {
      source_path: resolved,
      source_exists: false,
      source_size: null,
      source_mtime: null,
      source_content_hash: null
    };
  }
  const stats = statSync(resolved);
  return {
    source_path: resolved,
    source_exists: true,
    source_is_file: stats.isFile(),
    source_size: stats.size,
    source_mtime: stats.mtime.toISOString(),
    source_content_hash: stats.isFile() ? hashFile(resolved) : null
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

function hashFile(filePath: string): string {
  const digest = createHash("sha256");
  const data = readFileSync(filePath);
  const chunkSize = HASH_CHUNK_SIZE;
  for (let offset = 0; offset < data.length; offset += chunkSize) {
    digest.update(data.subarray(offset, offset + chunkSize));
  }
  return `sha256:${digest.digest("hex")}`;
}

function readGitState(cwd: string): { head: string | null; dirty: boolean } {
  const gitStdio: ["pipe", "pipe", "ignore"] = ["pipe", "pipe", "ignore"];
  try {
    const head = execSync("git rev-parse HEAD", {
      cwd,
      encoding: "utf8",
      stdio: gitStdio
    }).trim();
    const status = execSync("git status --porcelain", {
      cwd,
      encoding: "utf8",
      stdio: gitStdio
    }).trim();
    return { head, dirty: status.length > 0 };
  } catch {
    return { head: null, dirty: false };
  }
}

export function contextDrift(
  previous: ContextSnapshot,
  current: ContextSnapshot
): boolean {
  const keys = [
    "config_mtime",
    "db_mtime",
    "manifest_hash",
    "vault_marker_exists",
    "vault_exists",
    "source_path",
    "source_exists",
    "source_is_file",
    "source_size",
    "source_mtime",
    "source_content_hash"
  ] as const;
  for (const key of keys) {
    if (previous.details[key] !== current.details[key]) {
      return true;
    }
  }
  return false;
}
