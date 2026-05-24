import { readFileSync } from "node:fs";
import path from "node:path";

import { findConsolerRoot } from "@consoler/runtime";

function resolvePath(filePath: string, cwd: string): string {
  return path.isAbsolute(filePath) ? filePath : path.resolve(findConsolerRoot(cwd), filePath);
}

export function loadJsonValue(filePath: string, cwd = process.cwd()): unknown {
  const raw = readFileSync(resolvePath(filePath, cwd), "utf8");
  return JSON.parse(raw) as unknown;
}

export function loadArgsFile(filePath: string, cwd = process.cwd()): Record<string, unknown> {
  const value = loadJsonValue(filePath, cwd);
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Args file must contain a JSON object: ${filePath}`);
  }
  return value as Record<string, unknown>;
}
