import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const VERSION_RE = /^Python\s+\d+\.\d+/;

function probePythonExecutable(executable) {
  if (!executable) return null;
  const result = spawnSync(executable, ["--version"], {
    encoding: "utf8",
    windowsHide: true
  });
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`.trim();
  if (result.status === 0 && VERSION_RE.test(output)) {
    return { executable, version: output };
  }
  return null;
}

function pushCandidate(candidates, seen, value) {
  if (!value) return;
  const normalized = path.normalize(value.trim());
  if (!normalized || seen.has(normalized.toLowerCase())) return;
  seen.add(normalized.toLowerCase());
  candidates.push(normalized);
}

function windowsWherePython() {
  const candidates = [];
  const result = spawnSync("where.exe", ["python"], { encoding: "utf8" });
  if (result.status !== 0) return candidates;
  for (const line of result.stdout.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (/\\WindowsApps\\/i.test(trimmed) || /\\Microsoft\\WindowsApps\\/i.test(trimmed)) {
      continue;
    }
    candidates.push(trimmed);
  }
  return candidates;
}

function windowsPyLauncherPaths() {
  const candidates = [];
  const result = spawnSync("py", ["-0p"], { encoding: "utf8", shell: true });
  if (result.status !== 0) return candidates;
  for (const line of result.stdout.split(/\r?\n/)) {
    const match = line.match(/([A-Za-z]:\\[^\r\n]*python\.exe)\s*$/i);
    if (match) {
      candidates.push(match[1]);
    }
  }
  return candidates;
}

function windowsLocalProgramsPython() {
  const candidates = [];
  const base = path.join(process.env.LOCALAPPDATA ?? "", "Programs", "Python");
  if (!fs.existsSync(base)) return candidates;
  for (const entry of fs.readdirSync(base, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    candidates.push(path.join(base, entry.name, "python.exe"));
  }
  return candidates;
}

function windowsUvPython() {
  const result = spawnSync("uv", ["python", "find"], { encoding: "utf8" });
  if (result.status !== 0) return [];
  const trimmed = result.stdout.trim().split(/\r?\n/)[0]?.trim();
  return trimmed ? [trimmed] : [];
}

function windowsPythonCandidates() {
  const seen = new Set();
  const candidates = [];
  const sources = [
    process.env.PYTHON,
    ...windowsLocalProgramsPython(),
    ...windowsWherePython(),
    ...windowsPyLauncherPaths(),
    "python3",
    "python",
    ...windowsUvPython()
  ];
  for (const source of sources) {
    pushCandidate(candidates, seen, source);
  }
  return candidates;
}

/**
 * Resolve a Python executable that responds to `python --version`.
 * On Windows, skips Microsoft Store stubs and probes common install locations.
 */
export function resolvePythonExecutable() {
  if (process.platform === "win32") {
    for (const candidate of windowsPythonCandidates()) {
      const resolved = probePythonExecutable(candidate);
      if (resolved) return resolved;
    }
    return null;
  }

  for (const candidate of ["python3", "python"]) {
    const resolved = probePythonExecutable(candidate);
    if (resolved) return resolved;
  }
  return null;
}

export function windowsPythonPathHint() {
  return [
    "On Windows, put a real python.exe earlier on PATH than the Microsoft Store WindowsApps alias,",
    "or set PYTHON to an absolute python.exe path.",
    "The release gate also probes py -0p, %LOCALAPPDATA%\\Programs\\Python, and `uv python find` when available."
  ].join(" ");
}
