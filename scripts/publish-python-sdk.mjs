import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { resolvePythonExecutable, windowsPythonPathHint } from "./resolve-python.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sdkPath = path.join(root, "sdks", "python");
const distPath = path.join(sdkPath, "dist");

const publish = process.argv.includes("--publish");

function fail(message) {
  console.error(`publish-python-sdk failed: ${message}`);
  process.exit(1);
}

function redactText(text, redactions) {
  let redacted = text;
  for (const value of redactions) {
    if (value) {
      redacted = redacted.split(value).join("<redacted>");
    }
  }
  return redacted;
}

function repositoryUrlRedactions(repositoryUrl) {
  const values = [repositoryUrl];
  try {
    const parsed = new URL(repositoryUrl);
    values.push(parsed.origin, parsed.host, parsed.hostname);
  } catch {
    // Keep the raw configured value as the only redaction if URL parsing fails.
  }
  return values;
}

function run(command, args, options = {}) {
  const display = options.display ?? [command, ...args].join(" ");
  console.log(`\n==> ${display}`);
  const captureOutput = options.captureOutput ?? false;
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? root,
    env: options.env ?? process.env,
    encoding: captureOutput ? "utf8" : undefined,
    stdio: captureOutput ? ["ignore", "pipe", "pipe"] : "inherit",
    shell: options.shell ?? false,
    windowsHide: true
  });
  if (captureOutput) {
    const redactions = options.redactions ?? [];
    const stdout = redactText(result.stdout ?? "", redactions);
    const stderr = redactText(result.stderr ?? "", redactions);
    if (stdout) {
      process.stdout.write(stdout);
    }
    if (stderr) {
      process.stderr.write(stderr);
    }
  }
  if (result.status !== 0) {
    fail(`${display} exited ${result.status ?? "unknown"}`);
  }
}

if (publish) {
  const repositoryUrl = process.env.CONSOLER_PYPI_REPOSITORY_URL?.trim();
  if (!repositoryUrl) {
    fail("CONSOLER_PYPI_REPOSITORY_URL is required for --publish");
  }
  const hasTwineCreds =
    Boolean(process.env.TWINE_USERNAME?.trim()) &&
    Boolean(process.env.TWINE_PASSWORD?.trim() || process.env.TWINE_API_KEY?.trim());
  if (!hasTwineCreds) {
    fail("TWINE_USERNAME and TWINE_PASSWORD (or TWINE_API_KEY) are required for --publish");
  }
}

const gate = spawnSync("node", ["scripts/test-python-sdk-package.mjs"], {
  cwd: root,
  stdio: "inherit",
  shell: process.platform === "win32",
  windowsHide: true
});
if (gate.status !== 0) {
  process.exit(gate.status ?? 1);
}

if (!fs.existsSync(distPath)) {
  fail(`dist directory missing after package gate: ${distPath}`);
}

const artifacts = fs
  .readdirSync(distPath)
  .filter((name) => name.endsWith(".whl") || name.endsWith(".tar.gz"))
  .sort();

if (artifacts.length === 0) {
  fail("no built artifacts found in dist/");
}

console.log("\nBuilt artifacts:");
for (const name of artifacts) {
  console.log(`  - ${name}`);
}

if (!publish) {
  console.log("\nDry-run complete (no upload). Pass --publish to upload with twine.");
  process.exit(0);
}

const resolved = resolvePythonExecutable();
if (!resolved) {
  if (process.platform === "win32") {
    console.error(windowsPythonPathHint());
  }
  fail("required Python executable is not usable");
}

const uploadVenvDir = fs.mkdtempSync(path.join(os.tmpdir(), "consoler-sdk-upload-"));
const uploadPython =
  process.platform === "win32"
    ? path.join(uploadVenvDir, "Scripts", "python.exe")
    : path.join(uploadVenvDir, "bin", "python");
const uploadEnv = { ...process.env };
if (!uploadEnv.TWINE_PASSWORD?.trim() && uploadEnv.TWINE_API_KEY?.trim()) {
  uploadEnv.TWINE_PASSWORD = uploadEnv.TWINE_API_KEY;
}
delete uploadEnv.PYTHONPATH;

run(resolved.executable, ["-m", "venv", uploadVenvDir]);
run(uploadPython, ["-m", "pip", "install", "--upgrade", "pip", "twine"], { env: uploadEnv });

const repositoryUrl = process.env.CONSOLER_PYPI_REPOSITORY_URL.trim();
const artifactPaths = fs
  .readdirSync(distPath)
  .filter((name) => name.endsWith(".whl") || name.endsWith(".tar.gz"))
  .map((name) => path.join(distPath, name));
const artifactBasenames = artifactPaths.map((artifactPath) => path.basename(artifactPath));
const redactions = [
  ...repositoryUrlRedactions(repositoryUrl),
  uploadEnv.TWINE_PASSWORD,
  uploadEnv.TWINE_API_KEY
].filter(Boolean);

console.log("\nUploading dist/* to configured internal repository (URL redacted from logs).");
run(
  uploadPython,
  ["-m", "twine", "upload", "--non-interactive", "--repository-url", repositoryUrl, ...artifactPaths],
  {
    env: uploadEnv,
    captureOutput: true,
    redactions,
    display: [
      uploadPython,
      "-m",
      "twine",
      "upload",
      "--non-interactive",
      "--repository-url",
      "<configured-internal-repository>",
      ...artifactBasenames
    ].join(" ")
  }
);

console.log("\nPublish upload completed");
