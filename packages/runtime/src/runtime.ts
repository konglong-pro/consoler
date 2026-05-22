import {
  manifestHasDuplicateCommands,
  newActionId,
  newPlanId,
  newRunId,
  validateCommandArgs,
  validateManifest,
  type ActionDraft,
  type ActionPlan,
  type AgentManifest,
  type ApprovalToken,
  type RegistryAgentEntry
} from "@consoler/protocol";

import { buildApprovalToken, verifyApprovalStillValid } from "./approval.js";
import { buildContextSnapshot, contextSnapshotHash } from "./context-snapshot.js";
import { ConsolerStore } from "./db/store.js";
import { EventStore } from "./event-store.js";
import { computePlanHash } from "./plan-hash.js";
import { formatReplayTimeline, replayAction } from "./replay.js";
import { getEnabledAgent, loadRegistry } from "./registry.js";
import { JsonRpcAgentClient } from "./transport/jsonrpc.js";

export interface ConsolerRuntimeOptions {
  rootDir?: string;
}

export interface CommandArgsInput {
  agentId: string;
  command: string;
  args: Record<string, unknown>;
}

export interface RunResult {
  action_id: string;
  run_id: string;
  approval?: ApprovalToken;
  awaiting_approval?: boolean;
}

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
    const manifest = await this.prepareManifest(input);
    const draft = this.createDraft(input);
    const entry = getEnabledAgent(loadRegistry(this.rootDir), input.agentId);

    const client = this.spawnClient(entry);
    return this.withClient(client, async () => {
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
      return { action: draft, plan, plan_hash: planHash };
    });
  }

  async preview(input: CommandArgsInput): Promise<unknown> {
    return this.fetchStaticPreview(input);
  }

  async run(input: CommandArgsInput, options: { approve?: boolean } = {}): Promise<RunResult> {
    const manifest = await this.prepareManifest(input);
    const { action, plan } = await this.plan(input);
    const entry = getEnabledAgent(loadRegistry(this.rootDir), input.agentId);

    const preview = await this.fetchStaticPreview(input);

    const approval = buildApprovalToken({
      actionId: action.action_id,
      manifest,
      commandName: input.command,
      args: input.args,
      plan,
      preview,
      previewSummary: typeof preview === "object" && preview && "summary" in preview
        ? String((preview as Record<string, unknown>).summary)
        : "static preview"
    });

    if (!options.approve) {
      return {
        action_id: action.action_id,
        run_id: "",
        approval,
        awaiting_approval: true
      };
    }

    const driftReason = verifyApprovalStillValid(
      approval,
      { entry, manifest, args: input.args },
      plan,
      preview
    );
    if (driftReason) {
      throw new Error(`Approval invalid: ${driftReason}`);
    }

    const runId = newRunId();
    this.store.saveApproval(approval);
    this.store.createRun(runId, action.action_id, input.agentId, input.command);

    const execClient = this.spawnClient(entry, (notification) => {
      if (notification.method !== "agent.event") return;
      const event = notification.params?.["event"];
      if (event) {
        this.events.ingest(runId, action.action_id, input.agentId, input.command, event);
      }
    });

    await this.withClient(execClient, async () => {
      await execClient.request("agent.execute", {
        action_id: action.action_id,
        run_id: runId,
        command: input.command,
        args: input.args,
        plan,
        approval
      });
    });

    return { action_id: action.action_id, run_id: runId, approval };
  }

  ingestAgentEvent(runId: string, actionId: string, agentId: string, command: string, raw: unknown) {
    return this.events.ingest(runId, actionId, agentId, command, raw);
  }

  replay(actionId: string): string {
    const timeline = replayAction(this.store, actionId);
    return formatReplayTimeline(timeline);
  }

  /** Schema-only + agent static preview. No plan, context snapshot, or agent.validate. */
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
    entry: RegistryAgentEntry,
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
