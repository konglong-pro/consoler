import { spawnSync } from "node:child_process";

function fail(message) {
  console.error(`V5a Operation Trace gate failed: ${message}`);
  process.exit(1);
}

function run(command, args) {
  const display = [command, ...args].join(" ");
  console.log(`\n==> ${display}`);
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
    env: process.env
  });
  if (result.status !== 0) {
    fail(`${display} exited ${result.status ?? "unknown"}`);
  }
}

run("pnpm", ["--filter", "@consoler/protocol", "test"]);
run("pnpm", ["--filter", "@consoler/runtime", "test"]);
run("pnpm", ["--filter", "@consoler/agentctl", "test"]);
run("pnpm", ["--filter", "@consoler/conformance", "test"]);
run("pnpm", ["--filter", "@consoler/tui", "test"]);
run("pnpm", ["test:python-sdk"]);
run("pnpm", ["typecheck"]);
run("pnpm", ["docs:check"]);
run("git", ["diff", "--check"]);

console.log("\nV5a Operation Trace gate passed");
console.log("Broad build/test and real indbase smoke remain outside this gate.");
