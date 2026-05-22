import {
  manifestHasDuplicateCommands,
  newActionId,
  newPlanId,
  newRunId,
  validateCommandArgs,
  validateManifest,
  type ActionDraft,
  type ActionEvent,
  type ActionPlan,
  type AgentManifest,
} from "@consoler/protocol";

import { buildApprovalToken, verifyApprovalStillValid } from "./approval.js";
import { buildContextSnapshot, contextSnapshotHash } from "./context-snapshot.js";
import { ConsolerStore } from "./db/store.js";
import { EventStore } from "./event-store.js";
import type {
  CommandArgsInput,
  ConsolerRuntimeOptions,
  PreparedAction,
  RuntimeEventHandlers,
  RuntimeLifecycleState,
  RuntimeTerminalResult,
  RunResult,
  RunWithEventsResult
} from "./lifecycle-types.js";
import { computePlanHash } from "./plan-hash.js";
import { formatReplayTimeline, replayAction } from "./replay.js";
import { getEnabledAgent, loadRegistry } from "./registry.js";
import { JsonRpcAgentClient } from "./transport/jsonrpc.js";

export type {
  CommandArgsInput,
  ConsolerRuntimeOptions,
  PreparedAction,
  RuntimeEventHandlers,
  RuntimeLifecycleState,
  RuntimeTerminalResult,
  RunResult,
  RunWithEventsResult
} from "./lifecycle-types.js";

export class ConsolerRuntime {
  readonly store: ConsolerStore;
  readonly events: EventStore;
  private readonly rootDir: string | undefined;

  constructor(options: ConsolerRuntimeOptions = {}) {
    this.rootDir = options.rootDir;
    this.store = new ConsolerStore(options.rootDir);
    this.events = new EventStore(this.store);
  }

  async discover(agentId: string): Promise<AgentManifest> {
    const registry = loadRegistry(this.rootDir);
    const entry = getEnabledAgent(registry, agentId);
    this.store.upsertRegistryAgent(entry);

    const client = this.spawnClient(entry);
    return this.withClient(client, async () => {
      const result = await client.request("agent.discover");
      const validated = validateManifest(result);
      if (!validated.ok) {
        throw new Error(`Invalid manifest from agent ${agentId}`);
      }
      const duplicate = manifestHasDuplicateCommands(validated.value!);
      if (duplicate) {
        throw new Error(`Duplicate command in manifest: ${duplicate}`);
      }
      this.store.saveManifest(validated.value!);
      return validated.value!;
    });
  }

  async plan(input: CommandArgsInput): Promise<{ action: ActionDraft; plan: ActionPlan; plan_hash: string }> {
    const prepared = await this.prepareAction(input);
    return {
      action: prepared.action,
      plan: prepared.plan,
      plan_hash: prepared.plan_hash
    };
  }

  async preview(input: CommandArgsInput): Promise<unknown> {
    return this.fetchStaticPreview(input);
  }

  async prepareAction(input: CommandArgsInput): Promise<PreparedAction> {
    const manifest = await this.prepareManifest(input);
    const draft = this.createDraft(input);
    const entry = getEnabledAgent(loadRegistry(this.rootDir), input.agentId);

    const client = this.spawnClient(entry);
    const { plan, planHash } = await this.withClient(client, async () => {
      await client.request("agent.validate", {
        command: input.command,
        args: draft.args
      });

      const agentPlan = (await client.request("agent.plan", {
        action_id: draft.action_id,
        command: input.command,
        args: draft.args
      })) as { steps: ActionPlan["steps"]; side_effects?: string[] };

      const snapshot = buildContextSnapshot({ entry, manifest, args: draft.args });
      const commandDef = manifest.commands.find((item) => item.name === input.command)!;
      const plan: ActionPlan = {
        plan_id: newPlanId(),
        action_id: draft.action_id,
        agent_id: input.agentId,
        command: input.command,
        steps: agentPlan.steps,
        context_snapshot_id: snapshot.snapshot_id,
        context_snapshot: snapshot,
        side_effects: agentPlan.side_effects ?? commandDef.side_effects,
        created_at: new Date().toISOString()
      };
      const planHash = computePlanHash(plan);
      this.store.saveContext(snapshot, contextSnapshotHash(snapshot), draft.action_id, input.agentId, input.command);
      this.store.savePlan(plan, planHash);
      return { plan, planHash };
    });

    const preview = await this.fetchStaticPreview(input);
    const approval = buildApprovalToken({
      actionId: draft.action_id,
      manifest,
      commandName: input.command,
      args: input.args,
      plan,
      preview,
      previewSummary: previewSummary(preview)
    });

    return {
      action: draft,
      plan,
      plan_hash: planHash,
      preview,
      approval,
      manifest,
      entry
    };
  }

  async executePrepared(
    prepared: PreparedAction,
    handlers: RuntimeEventHandlers = {}
  ): Promise<RuntimeTerminalResult> {
    const driftReason = verifyApprovalStillValid(
      prepared.approval,
      { entry: prepared.entry, manifest: prepared.manifest, args: prepared.action.args },
      prepared.plan,
      prepared.preview
    );
    if (driftReason) {
      throw new Error(`Approval invalid: ${driftReason}`);
    }

    handlers.onStateChange?.("running");
    const runId = newRunId();
    this.store.saveApproval(prepared.approval);
    this.store.createRun(runId, prepared.action.action_id, prepared.action.agent_id, prepared.action.command);

    const acceptedEvents: ActionEvent[] = [];
    const execClient = this.spawnClient(prepared.entry, (notification) => {
      if (notification.method !== "agent.event") return;
      const raw = notification.params?.["event"];
      if (!raw) return;
      const ingest = this.events.ingest(
        runId,
        prepared.action.action_id,
        prepared.action.agent_id,
        prepared.action.command,
        raw
      );
      if (ingest.accepted && ingest.event) {
        acceptedEvents.push(ingest.event);
        handlers.onEvent?.(ingest.event, ingest);
      } else if (ingest.event) {
        handlers.onEvent?.(ingest.event, ingest);
      }
    });

    await this.withClient(execClient, async () => {
      await execClient.request("agent.execute", {
        action_id: prepared.action.action_id,
        run_id: runId,
        command: prepared.action.command,
        args: prepared.action.args,
        plan: prepared.plan,
        approval: prepared.approval
      });
    });

    const terminal = terminalStateFromEvents(acceptedEvents);
    handlers.onStateChange?.(terminal);
    return { run_id: runId, state: terminal, events: acceptedEvents };
  }

  async runWithEvents(
    input: CommandArgsInput,
    options: { approve?: boolean } = {},
    handlers: RuntimeEventHandlers = {}
  ): Promise<RunWithEventsResult> {
    handlers.onStateChange?.("preparing");
    const prepared = await this.prepareAction(input);
    handlers.onStateChange?.("awaiting_approval");

    if (!options.approve) {
      return {
        action_id: prepared.action.action_id,
        run_id: "",
        approval: prepared.approval,
        awaiting_approval: true
      };
    }

    const terminal = await this.executePrepared(prepared, handlers);
    return {
      action_id: prepared.action.action_id,
      run_id: terminal.run_id,
      approval: prepared.approval,
      awaiting_approval: false,
      terminal
    };
  }

  async run(input: CommandArgsInput, options: { approve?: boolean } = {}): Promise<RunResult> {
    const result = await this.runWithEvents(input, options);
    return {
      action_id: result.action_id,
      run_id: result.run_id,
      approval: result.approval,
      awaiting_approval: result.awaiting_approval
    };
  }

  ingestAgentEvent(runId: string, actionId: string, agentId: string, command: string, raw: unknown) {
    return this.events.ingest(runId, actionId, agentId, command, raw);
  }

  replay(actionId: string): string {
    return formatReplayTimeline(replayAction(this.store, actionId));
  }

  getReplay(actionId: string) {
    return replayAction(this.store, actionId);
  }

  private async fetchStaticPreview(input: CommandArgsInput): Promise<unknown> {
    await this.prepareManifest(input);
    const entry = getEnabledAgent(loadRegistry(this.rootDir), input.agentId);
    const client = this.spawnClient(entry);
    return this.withClient(client, async () =>
      client.request("agent.preview", {
        command: input.command,
        args: input.args
      })
    );
  }

  private async prepareManifest(input: CommandArgsInput): Promise<AgentManifest> {
    let manifest = this.store.getManifest(input.agentId);
    if (!manifest) {
      manifest = await this.discover(input.agentId);
    }
    const command = manifest.commands.find((item) => item.name === input.command);
    if (!command) {
      throw new Error(`Unknown command: ${input.command}`);
    }
    const argsResult = validateCommandArgs(command.args_schema, input.args);
    if (!argsResult.ok) {
      throw new Error(`Invalid args for ${input.command}`);
    }
    return manifest;
  }

  private createDraft(input: CommandArgsInput): ActionDraft {
    const draft: ActionDraft = {
      action_id: newActionId(),
      agent_id: input.agentId,
      command: input.command,
      args: input.args,
      created_at: new Date().toISOString()
    };
    this.store.saveAction(draft);
    return draft;
  }

  private spawnClient(
    entry: PreparedAction["entry"],
    onNotification?: (notification: import("./transport/jsonrpc.js").JsonRpcNotification) => void
  ): JsonRpcAgentClient {
    return onNotification
      ? new JsonRpcAgentClient({ entry, onNotification })
      : new JsonRpcAgentClient({ entry });
  }

  private async withClient<T>(client: JsonRpcAgentClient, fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } finally {
      client.kill();
    }
  }
}

function previewSummary(preview: unknown): string {
  if (typeof preview === "object" && preview && "summary" in preview) {
    return String((preview as Record<string, unknown>).summary);
  }
  return "static preview";
}

function terminalStateFromEvents(
  events: ActionEvent[]
): RuntimeTerminalResult["state"] {
  for (let i = events.length - 1; i >= 0; i--) {
    const event = events[i]!;
    if (event.type === "action.succeeded") return "succeeded";
    if (event.type === "action.failed") return "failed";
    if (event.type === "action.cancelled") return "cancelled";
  }
  return "failed";
}
