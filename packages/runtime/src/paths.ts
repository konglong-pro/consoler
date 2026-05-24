import { existsSync } from "node:fs";
import path from "node:path";

export function findConsolerRoot(startDir = process.cwd()): string {
  let current = path.resolve(startDir);
  while (true) {
    if (existsSync(path.join(current, "pnpm-workspace.yaml"))) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      return path.resolve(startDir);
    }
    current = parent;
  }
}

export function consolerDataDir(rootDir?: string): string {
  return path.join(rootDir ?? findConsolerRoot(), ".consoler");
}

export function registryPath(rootDir?: string): string {
  return path.join(consolerDataDir(rootDir), "agents.json");
}

export function databasePath(rootDir?: string): string {
  return path.join(consolerDataDir(rootDir), "consoler.db");
}
