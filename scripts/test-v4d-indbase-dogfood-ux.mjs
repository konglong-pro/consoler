import { spawnSync } from "node:child_process";

function fail(message) {
  console.error(`V4d indbase dogfood UX gate failed: ${message}`);
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

run("pnpm", ["--filter", "@consoler/tui", "test"]);

console.log("\nV4d indbase dogfood UX gate passed");
