#!/usr/bin/env node

import { readFileSync } from "node:fs";

import { Command } from "commander";

import { ConsolerRuntime, findConsolerRoot } from "@consoler/runtime";
import path from "node:path";

import { formatApprovalMaterial } from "./format.js";
import { formatAgentctlHelp } from "./index.js";

function loadArgs(argsPath: string): Record<string, unknown> {
  const resolved = path.isAbsolute(argsPath)
    ? argsPath
    : path.resolve(findConsolerRoot(process.cwd()), argsPath);
  const raw = readFileSync(resolved, "utf8");
  return JSON.parse(raw) as Record<string, unknown>;
}

const program = new Command()
  .name("agentctl")
  .description("Headless consoler runtime CLI for V0 protocol debugging")
  .showHelpAfterError();

program
  .command("discover")
  .argument("<agent_id>", "Registered agent id")
  .description("Discover and cache agent manifest")
  .action(async (agentId: string) => {
    const runtime = new ConsolerRuntime();
    const manifest = await runtime.discover(agentId);
    console.log(JSON.stringify(manifest, null, 2));
  });

program
  .command("plan")
  .argument("<agent_id>", "Registered agent id")
  .argument("<command>", "Agent command name")
  .requiredOption("--args <path>", "Path to JSON args file")
  .description("Validate, plan, and persist action + plan")
  .action(async (agentId: string, command: string, options: { args: string }) => {
    const runtime = new ConsolerRuntime();
    const result = await runtime.plan({ agentId, command, args: loadArgs(options.args) });
    console.log(JSON.stringify(result, null, 2));
  });

program
  .command("preview")
  .argument("<agent_id>", "Registered agent id")
  .argument("<command>", "Agent command name")
  .requiredOption("--args <path>", "Path to JSON args file")
  .description("Run static preview for a command")
  .action(async (agentId: string, command: string, options: { args: string }) => {
    const runtime = new ConsolerRuntime();
    const preview = await runtime.preview({ agentId, command, args: loadArgs(options.args) });
    console.log(JSON.stringify(preview, null, 2));
  });

program
  .command("run")
  .argument("<agent_id>", "Registered agent id")
  .argument("<command>", "Agent command name")
  .requiredOption("--args <path>", "Path to JSON args file")
  .option("--approve", "Create approval token and execute", false)
  .description("Plan, preview, approve, and optionally execute")
  .action(async (agentId: string, command: string, options: { args: string; approve?: boolean }) => {
    const runtime = new ConsolerRuntime();
    const result = await runtime.run(
      { agentId, command, args: loadArgs(options.args) },
      { approve: Boolean(options.approve) }
    );
    if (result.awaiting_approval && result.approval) {
      console.log(formatApprovalMaterial(result.approval));
      process.exitCode = 2;
      return;
    }
    console.log(JSON.stringify(result, null, 2));
  });

program
  .command("replay")
  .argument("<action_id>", "Persisted action id")
  .description("Replay accepted events without spawning an agent")
  .action((actionId: string) => {
    const runtime = new ConsolerRuntime();
    console.log(runtime.replay(actionId));
  });

const args = process.argv.slice(2);
if (args.length === 0) {
  console.log(formatAgentctlHelp());
  process.exitCode = 0;
} else {
  program.parseAsync(process.argv).catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exitCode = 1;
  });
}
