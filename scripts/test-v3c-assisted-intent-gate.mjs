import { spawnSync } from "node:child_process";

function fail(message) {
  console.error(`V3c assisted intent gate failed: ${message}`);
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

run("pnpm", ["build"]);
run("pnpm", ["--filter", "@consoler/runtime", "test"]);
run("pnpm", ["--filter", "@consoler/agentctl", "test"]);
run("pnpm", ["test:agentctl-smoke"]);

console.log("\nV3c assisted intent gate passed");
