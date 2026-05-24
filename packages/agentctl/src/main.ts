#!/usr/bin/env node

import { readFileSync } from "node:fs";

import { Command } from "commander";

import { formatConformanceReport, runAgentConformance } from "@consoler/conformance";
import { ConsolerRuntime, findConsolerRoot, type ActionHistoryStatus } from "@consoler/runtime";
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
  .option("--approve-preview", "Approve read-only probe preview", false)
  .description("Run static or probe preview for a command")
  .action(async (agentId: string, command: string, options: { args: string; approvePreview?: boolean }) => {
    const runtime = new ConsolerRuntime();
    const result = await runtime.preview(
      { agentId, command, args: loadArgs(options.args) },
      { approvePreview: Boolean(options.approvePreview) }
    );
    if (result.awaiting_preview_approval && result.preview_approval) {
      console.log(formatApprovalMaterial(result.preview_approval));
      process.exitCode = 2;
      return;
    }
    console.log(JSON.stringify(result.preview, null, 2));
  });

program
  .command("run")
  .argument("<agent_id>", "Registered agent id")
  .argument("<command>", "Agent command name")
  .requiredOption("--args <path>", "Path to JSON args file")
  .option("--approve-preview", "Approve and run probe preview before planning", false)
  .option("--approve", "Create execution approval token and execute", false)
  .description("Plan, preview, approve, and optionally execute")
  .action(async (agentId: string, command: string, options: { args: string; approvePreview?: boolean; approve?: boolean }) => {
    const runtime = new ConsolerRuntime();
    const result = await runtime.run(
      { agentId, command, args: loadArgs(options.args) },
      {
        approvePreview: Boolean(options.approvePreview),
        approve: Boolean(options.approve)
      }
    );
    if (result.awaiting_preview_approval && result.preview_approval) {
      console.log(formatApprovalMaterial(result.preview_approval));
      process.exitCode = 2;
      return;
    }
    if (result.awaiting_approval && result.approval) {
      console.log(formatApprovalMaterial(result.approval));
      process.exitCode = 2;
      return;
    }
    console.log(JSON.stringify(result, null, 2));
  });

program
  .command("test")
  .argument("<agent_id>", "Registered agent id")
  .option("--command <name>", "Command-specific conformance mode")
  .option("--args <path>", "Path to JSON args file (required with --command)")
  .option("--approve-preview", "Approve probe preview before planning", false)
  .option("--approve", "Approve and execute during conformance", false)
  .option(
    "--cancel-after-ms <n>",
    "Request cooperative cancel after N ms (requires --command --args --approve)"
  )
  .option(
    "--interaction-response <path>",
    "JSON file with pre-seeded interaction response (interactive conformance commands)"
  )
  .option("--json", "Emit structured conformance report", false)
  .description("Run agent protocol conformance checks (non-executing by default)")
  .action(
    async (
      agentId: string,
      options: {
        command?: string;
        args?: string;
        approvePreview?: boolean;
        approve?: boolean;
        cancelAfterMs?: string;
        interactionResponse?: string;
        json?: boolean;
      }
    ) => {
      if (options.command && !options.args) {
        console.error("--command requires --args <path>");
        process.exitCode = 1;
        return;
      }
      if (options.args && !options.command) {
        console.error("--args requires --command <name>");
        process.exitCode = 1;
        return;
      }
      if (options.approve && !options.command) {
        console.error("--approve requires --command and --args");
        process.exitCode = 1;
        return;
      }
      if (options.approvePreview && !options.command) {
        console.error("--approve-preview requires --command and --args");
        process.exitCode = 1;
        return;
      }
      if (options.cancelAfterMs !== undefined) {
        if (!options.command || !options.args) {
          console.error("--cancel-after-ms requires --command and --args");
          process.exitCode = 1;
          return;
        }
        if (!options.approve) {
          console.error("--cancel-after-ms requires --approve");
          process.exitCode = 1;
          return;
        }
        const parsed = Number(options.cancelAfterMs);
        if (!Number.isFinite(parsed) || parsed < 0) {
          console.error("--cancel-after-ms must be a non-negative number");
          process.exitCode = 1;
          return;
        }
      }

      const cancelAfterMs =
        options.cancelAfterMs !== undefined ? Number(options.cancelAfterMs) : undefined;

      let interactionResponse: unknown | undefined;
      if (options.interactionResponse) {
        interactionResponse = loadArgs(options.interactionResponse);
      }

      const report = await runAgentConformance({
        agentId,
        registryRoot: findConsolerRoot(process.cwd()),
        ...(options.command ? { command: options.command } : {}),
        ...(options.args ? { args: loadArgs(options.args) } : {}),
        approvePreview: Boolean(options.approvePreview),
        approve: Boolean(options.approve),
        ...(cancelAfterMs !== undefined ? { cancelAfterMs } : {}),
        ...(interactionResponse !== undefined ? { interactionResponse } : {}),
        cleanupTempRoot: true
      });

      if (options.json) {
        console.log(JSON.stringify(report, null, 2));
      } else {
        console.log(formatConformanceReport(report));
      }
      if (!report.passed) {
        process.exitCode = 1;
      }
    }
  );

program
  .command("replay")
  .argument("<action_id>", "Persisted action id")
  .description("Replay accepted events without spawning an agent")
  .action((actionId: string) => {
    const runtime = new ConsolerRuntime();
    console.log(runtime.replay(actionId));
  });

program
  .command("history")
  .option("--limit <n>", "Maximum actions to list", "20")
  .option("--command <name>", "Filter by command name")
  .option("--status <status>", "Filter by derived status (prepared|running|succeeded|failed|cancelled)")
  .option("--json", "Emit structured JSON", false)
  .description("List recent actions from the local event store")
  .action((options: { limit: string; command?: string; status?: string; json?: boolean }) => {
    const runtime = new ConsolerRuntime();
    const limit = Number.parseInt(options.limit, 10);
    const listOptions = {
      limit: Number.isFinite(limit) ? limit : 20,
      ...(options.command ? { command: options.command } : {}),
      ...(options.status ? { status: options.status as ActionHistoryStatus } : {})
    };
    if (options.json) {
      console.log(JSON.stringify(runtime.listActionHistory(listOptions), null, 2));
      return;
    }
    console.log(runtime.formatActionHistory(listOptions));
  });

program
  .command("trace")
  .argument("<action_id>", "Persisted action id")
  .option("--json", "Emit structured JSON", false)
  .description("Show full action trace including rejected events")
  .action((actionId: string, options: { json?: boolean }) => {
    const runtime = new ConsolerRuntime();
    try {
      if (options.json) {
        console.log(JSON.stringify(runtime.getActionTrace(actionId), null, 2));
        return;
      }
      console.log(runtime.formatActionTrace(actionId));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(message);
      process.exitCode = 1;
    }
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
