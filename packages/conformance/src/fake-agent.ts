import { spawnSync } from "node:child_process";
import path from "node:path";

import type { RegistryAgentEntry } from "@consoler/protocol";

import { findConsolerRoot } from "@consoler/runtime";

export const FAKE_AGENT_ID = "conformance-fake";

function resolvePythonCommand(): string {
  if (process.platform === "win32") {
    const uv = spawnSync("uv", ["python", "find"], { encoding: "utf8", shell: true });
    if (uv.status === 0) {
      const found = uv.stdout.trim().split(/\r?\n/)[0]?.trim();
      if (found) return found;
    }
  }
  return process.platform === "win32" ? "python" : "python3";
}

export function fakeAgentRegistryEntry(repoRoot?: string): RegistryAgentEntry {
  const root = repoRoot ?? findConsolerRoot();
  const fixturesDir = path.join(root, "packages", "conformance", "fixtures");
  const fixtureDir = path.join(fixturesDir, "fake_agent");
  const python = resolvePythonCommand();
  const pythonPath = [fixturesDir, path.join(root, "sdks", "python")].join(path.delimiter);
  return {
    agent_id: FAKE_AGENT_ID,
    name: "Conformance Fake Agent",
    cwd: fixtureDir,
    command: python,
    args: ["-m", "fake_agent"],
    env: {
      PYTHONPATH: pythonPath
    },
    enabled: true
  };
}
