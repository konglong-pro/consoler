import {
  manifestHasDuplicateCommands,
  validateActionEvent,
  validateCommandArgs,
  validateManifest,
  validateRenderableBlock,
  type ActionEvent,
  type AgentManifest
} from "@consoler/protocol";

import {
  ConsolerRuntime,
  formatReplayTimeline,
  getCommandDef,
  getEnabledAgent,
  isProbeReadonlyPreview,
  JsonRpcAgentClient,
  loadRegistry,
  replayAction
} from "@consoler/runtime";

import {
  cleanupTempRoot,
  createTempConformanceRoot,
  resolveRegistryEntry,
  writeIsolatedRegistry
} from "./isolated-root.js";
import type { ConformanceCheck, ConformanceReport, RunAgentConformanceInput } from "./types.js";

function check(
  id: string,
  name: string,
  status: ConformanceCheck["status"],
  message: string,
  detail?: string | undefined
): ConformanceCheck {
  const row: ConformanceCheck = { id, name, status, message };
  if (detail !== undefined && detail !== "") {
    row.detail = detail;
  }
  return row;
}

async function withAgentClient<T>(
  rootDir: string,
  agentId: string,
  fn: (client: JsonRpcAgentClient) => Promise<T>
): Promise<T> {
  const registry = loadRegistry(rootDir);
  const entry = getEnabledAgent(registry, agentId);
  const client = new JsonRpcAgentClient({ entry });
  try {
    return await fn(client);
  } finally {
    client.kill();
  }
}

function validatePreviewPolicies(manifest: AgentManifest): ConformanceCheck[] {
  const rows: ConformanceCheck[] = [];
  for (const command of manifest.commands) {
    const policy = command.preview_policy;
    const kind = policy.preview_kind;
    if (kind !== "static" && kind !== "probe_readonly") {
      rows.push(
        check(
          `manifest.preview_policy.${command.name}`,
          "Preview policy kind",
          "failed",
          `Unsupported preview_kind for ${command.name}`,
          kind
        )
      );
      continue;
    }
    if (kind === "probe_readonly" && !policy.requires_approval_before_preview) {
      rows.push(
        check(
          `manifest.preview_policy.${command.name}`,
          "Probe preview approval",
          "failed",
          `probe_readonly must require preview approval (${command.name})`
        )
      );
      continue;
    }
    rows.push(
      check(
        `manifest.preview_policy.${command.name}`,
        "Preview policy",
        "passed",
        `${command.name}: ${kind}`
      )
    );
  }
  return rows;
}

async function runBaseChecks(
  rootDir: string,
  agentId: string,
  runtime: ConsolerRuntime
): Promise<{ checks: ConformanceCheck[]; manifest: AgentManifest }> {
  const checks: ConformanceCheck[] = [];
  let manifest: AgentManifest;

  try {
    resolveRegistryEntry({ agentId, registryRoot: rootDir });
    checks.push(
      check("registry.entry", "Registry entry", "passed", `Found enabled agent ${agentId}`)
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    checks.push(check("registry.entry", "Registry entry", "failed", message));
    throw error;
  }

  try {
    const health = await withAgentClient(rootDir, agentId, (client) =>
      client.request("agent.health", {})
    );
    checks.push(
      check(
        "agent.health",
        "Agent health",
        "passed",
        `status=${String((health as Record<string, unknown>)["status"] ?? "ok")}`
      )
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    checks.push(check("agent.health", "Agent health", "failed", message));
    throw error;
  }

  try {
    manifest = await runtime.discover(agentId);
    checks.push(check("agent.discover", "Discover manifest", "passed", `${manifest.commands.length} command(s)`));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    checks.push(check("agent.discover", "Discover manifest", "failed", message));
    throw error;
  }

  const validated = validateManifest(manifest);
  if (!validated.ok) {
    checks.push(
      check(
        "manifest.schema",
        "Manifest schema",
        "failed",
        "Manifest failed JSON Schema validation",
        JSON.stringify(validated.errors?.slice(0, 3))
      )
    );
  } else {
    checks.push(check("manifest.schema", "Manifest schema", "passed", "Manifest is schema-valid"));
  }

  const duplicate = manifestHasDuplicateCommands(manifest);
  if (duplicate) {
    checks.push(
      check("manifest.duplicate_commands", "Duplicate commands", "failed", `Duplicate: ${duplicate}`)
    );
  } else {
    checks.push(check("manifest.duplicate_commands", "Duplicate commands", "passed", "No duplicates"));
  }

  for (const command of manifest.commands) {
    try {
      validateCommandArgs(command.args_schema, {});
      checks.push(
        check(
          `manifest.args_schema.${command.name}`,
          "Command args schema",
          "passed",
          `${command.name} args_schema compiles`
        )
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      checks.push(
        check(
          `manifest.args_schema.${command.name}`,
          "Command args schema",
          "failed",
          message
        )
      );
    }
  }

  checks.push(...validatePreviewPolicies(manifest));

  return { checks, manifest };
}

async function runCommandChecks(
  rootDir: string,
  runtime: ConsolerRuntime,
  agentId: string,
  manifest: AgentManifest,
  command: string,
  args: Record<string, unknown>,
  options: { approvePreview?: boolean; approve?: boolean }
): Promise<ConformanceCheck[]> {
  const checks: ConformanceCheck[] = [];
  const commandDef = getCommandDef(manifest, command);

  const argsValidated = validateCommandArgs(commandDef.args_schema, args);
  if (!argsValidated.ok) {
    checks.push(
      check("command.args_schema", "Args JSON Schema", "failed", "Args failed schema validation")
    );
    return checks;
  }
  checks.push(check("command.args_schema", "Args JSON Schema", "passed", "Args match command schema"));

  try {
    await withAgentClient(rootDir, agentId, (client) =>
      client.request("agent.validate", { command, args })
    );
    checks.push(check("command.agent_validate", "Agent validate", "passed", "agent.validate ok"));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    checks.push(check("command.agent_validate", "Agent validate", "failed", message));
    return checks;
  }

  const input = { agentId, command, args };

  if (isProbeReadonlyPreview(commandDef)) {
    const gate = await runtime.preview(input, { approvePreview: false });
    if (gate.awaiting_preview_approval) {
      checks.push(
        check(
          "command.preview_approval_gate",
          "Preview approval gate",
          "passed",
          "Probe preview requires approval before running"
        )
      );
    } else {
      checks.push(
        check(
          "command.preview_approval_gate",
          "Preview approval gate",
          "failed",
          "Expected awaiting_preview_approval for probe_readonly"
        )
      );
    }

    if (!options.approvePreview) {
      checks.push(
        check("command.probe_preview", "Probe preview run", "skipped", "Pass --approve-preview to run probe preview")
      );
      checks.push(
        check("command.prepare_action", "Prepare action", "skipped", "Requires probe preview approval")
      );
      checks.push(check("command.execute", "Execute", "skipped", "Pass --approve to execute"));
      return checks;
    }

    const approvedPreview = await runtime.preview(input, { approvePreview: true });
    if (!approvedPreview.preview) {
      checks.push(check("command.probe_preview", "Probe preview run", "failed", "No preview payload returned"));
      return checks;
    }
    checks.push(check("command.probe_preview", "Probe preview run", "passed", "Probe preview returned"));

    const prepared = await runtime.prepareAction(input, { probePreview: approvedPreview.preview });
    checks.push(
      check(
        "command.approval_material",
        "Execution approval material",
        "passed",
        `approval_id=${prepared.approval.approval_id}`
      )
    );

    if (!options.approve) {
      checks.push(check("command.execute", "Execute", "skipped", "Pass --approve to execute"));
      return checks;
    }

    return [...checks, ...(await runExecuteChecks(runtime, prepared))];
  }

  const preview = await runtime.preview(input, {});
  if (preview.awaiting_preview_approval) {
    checks.push(
      check("command.static_preview", "Static preview", "failed", "Unexpected preview approval for static command")
    );
    return checks;
  }
  checks.push(check("command.static_preview", "Static preview", "passed", "Static preview returned"));

  const prepared = await runtime.prepareAction(input);
  checks.push(
    check(
      "command.approval_material",
      "Execution approval material",
      "passed",
      `approval_id=${prepared.approval.approval_id}`
    )
  );

  if (!options.approve) {
    checks.push(check("command.execute", "Execute", "skipped", "Pass --approve to execute"));
    return checks;
  }

  return [...checks, ...(await runExecuteChecks(runtime, prepared))];
}

async function runExecuteChecks(
  runtime: ConsolerRuntime,
  prepared: Awaited<ReturnType<ConsolerRuntime["prepareAction"]>>
): Promise<ConformanceCheck[]> {
  const checks: ConformanceCheck[] = [];
  const accepted: ActionEvent[] = [];

  try {
    const terminal = await runtime.executePrepared(prepared, {
      onEvent: (event) => {
        accepted.push(event);
      }
    });
    checks.push(
      check("command.execute", "Execute", "passed", `terminal=${terminal.state}`)
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    checks.push(check("command.execute", "Execute", "failed", message));
    return checks;
  }

  const seqs = accepted.map((event) => event.seq);
  const ordered =
    seqs.length > 0 && seqs.every((seq, index) => index === 0 || seq > seqs[index - 1]!);
  checks.push(
    check(
      "execution.event_order",
      "Accepted event ordering",
      ordered ? "passed" : "failed",
      ordered ? `seq ${seqs.join(" → ")}` : "Non-monotonic seq values"
    )
  );

  for (const event of accepted) {
    const validated = validateActionEvent(event);
    if (!validated.ok) {
      checks.push(
        check("execution.event_schema", "Event schema", "failed", `Invalid event ${event.event_id}`)
      );
      return checks;
    }
  }
  checks.push(check("execution.event_schema", "Event schema", "passed", "Accepted events are schema-valid"));

  const terminalType = accepted.some((event) => event.type === "action.succeeded");
  checks.push(
    check(
      "execution.terminal_event",
      "Terminal event",
      terminalType ? "passed" : "failed",
      terminalType ? "action.succeeded present" : "Missing terminal event"
    )
  );

  const actionId = prepared.action.action_id;
  const trace = runtime.getActionTrace(actionId);
  if (trace.rejected_events.length > 0) {
    const firstReject = trace.rejected_events[0]?.reject_reason;
    checks.push(
      check(
        "execution.no_rejected",
        "No rejected events",
        "failed",
        `${trace.rejected_events.length} rejected event(s)`,
        firstReject != null ? firstReject : undefined
      )
    );
  } else {
    checks.push(check("execution.no_rejected", "No rejected events", "passed", "0 rejected"));
  }

  const history = runtime.listActionHistory({ limit: 20 });
  const found = history.some((row) => row.action_id === actionId);
  checks.push(
    check(
      "execution.history",
      "History visibility",
      found ? "passed" : "failed",
      found ? "Action appears in history" : "Action missing from history"
    )
  );

  checks.push(
    check(
      "execution.trace",
      "Trace availability",
      trace.accepted_events.length > 0 ? "passed" : "failed",
      `${trace.accepted_events.length} accepted in trace`
    )
  );

  const replay = runtime.getReplay(actionId);
  if (replay.events.length !== trace.accepted_events.length) {
    checks.push(
      check(
        "execution.replay",
        "Replay accepted-only",
        "failed",
        `replay=${replay.events.length} trace.accepted=${trace.accepted_events.length}`
      )
    );
  } else {
    checks.push(
      check(
        "execution.replay",
        "Replay accepted-only",
        "passed",
        `replay matches ${replay.events.length} accepted events`
      )
    );
  }

  for (const block of trace.result_blocks) {
    const validated = validateRenderableBlock(block);
    if (!validated.ok) {
      checks.push(
        check(
          "execution.result_blocks",
          "Result block schema",
          "failed",
          `Invalid ${block.type} block ${block.block_id}`
        )
      );
      return checks;
    }
  }
  checks.push(
    check(
      "execution.result_blocks",
      "Result block schema",
      "passed",
      `${trace.result_blocks.length} block(s) valid`
    )
  );

  const hasDiff = trace.result_blocks.some((block) => block.type === "diff");
  const hasArtifact = trace.result_blocks.some((block) => block.type === "artifact");
  checks.push(
    check(
      "execution.diff_artifact_blocks",
      "Diff and artifact blocks",
      hasDiff && hasArtifact ? "passed" : "failed",
      `types=${trace.result_blocks.map((block) => block.type).join(",") || "none"}`
    )
  );

  const replayText = formatReplayTimeline(replayAction(runtime.store, actionId));
  const replaySummaries =
    replayText.includes("diff (") && replayText.includes("artifact (");
  checks.push(
    check(
      "execution.replay_block_summaries",
      "Replay block summaries",
      replaySummaries ? "passed" : "failed",
      replaySummaries ? "diff/artifact summaries present" : "missing summaries in replay text"
    )
  );

  return checks;
}

export async function runAgentConformance(
  input: RunAgentConformanceInput
): Promise<ConformanceReport> {
  const startedAt = new Date().toISOString();
  let rootDir = input.rootDir;
  let createdTemp = false;

  if (!rootDir) {
    rootDir = createTempConformanceRoot({
      agentId: input.agentId,
      ...(input.registryRoot ? { registryRoot: input.registryRoot } : {}),
      ...(input.registryEntry ? { registryEntry: input.registryEntry } : {})
    });
    createdTemp = true;
  } else if (input.registryEntry) {
    writeIsolatedRegistry(rootDir, input.registryEntry);
  }

  const checks: ConformanceCheck[] = [];
  const runtime = new ConsolerRuntime({ rootDir });
  let report: ConformanceReport;

  try {
    const base = await runBaseChecks(rootDir, input.agentId, runtime);
    checks.push(...base.checks);

    if (input.command) {
      if (!input.args) {
        checks.push(
          check(
            "command.args_required",
            "Command args",
            "failed",
            "--command requires args"
          )
        );
      } else {
        const commandChecks = await runCommandChecks(
          rootDir,
          runtime,
          input.agentId,
          base.manifest,
          input.command,
          input.args,
          {
            ...(input.approvePreview ? { approvePreview: true } : {}),
            ...(input.approve ? { approve: true } : {})
          }
        );
        checks.push(...commandChecks);
      }
    } else if (input.approve || input.approvePreview) {
      checks.push(
        check(
          "command.mode",
          "Command mode",
          "skipped",
          "Approval flags ignored without --command and --args"
        )
      );
    }
  } catch {
    // base checks already recorded failure rows
  } finally {
    runtime.store.db.close();
  }

  const endedAt = new Date().toISOString();
  const passed = checks.every((row) => row.status !== "failed");
  report = {
    agent_id: input.agentId,
    root_dir: rootDir,
    checks,
    passed,
    started_at: startedAt,
    ended_at: endedAt
  };
  if (input.command) report.command = input.command;

  if (createdTemp && input.cleanupTempRoot !== false) {
    cleanupTempRoot(rootDir);
  }

  return report;
}
