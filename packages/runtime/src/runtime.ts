import {
  manifestHasDuplicateCommands,
  newActionId,
  newPlanId,
  newRunId,
  TERMINAL_EVENT_TYPES,
  validateCommandArgs,
  validateManifest,
  type ActionDraft,
  type ActionEvent,
  type ActionPlan,
  type AgentManifest,
  type InteractionRequest
} from "@consoler/protocol";

import {
  buildApprovalToken,
  buildPreviewApprovalToken,
  verifyApprovalStillValid,
  verifyPreviewApproval
} from "./approval.js";
import { buildContextSnapshot, contextSnapshotHash } from "./context-snapshot.js";
import {
  getCommandDef,
  isProbeReadonlyPreview,
  requiresPreviewApproval
} from "./command-policy.js";
import { ConsolerStore } from "./db/store.js";
import { EventStore } from "./event-store.js";
import { validateInteractionResponse } from "./interaction-response.js";
import { buildTimeoutControlResponse, isTimeoutControlResponse } from "./interaction-timeout.js";
import type {
  CommandArgsInput,
  ConsolerRuntimeOptions,
  PrepareActionOptions,
  PreparedAction,
  PreviewLifecycleResult,
  PreviewOptions,
  PreparedExecutionControl,
  RuntimeControlError,
  RuntimeEventHandlers,
  RuntimeTerminalResult,
  RunOptions,
  RunResult,
  RunWithEventsResult
} from "./lifecycle-types.js";
import { fetchArtifactViewForStore } from "./artifact-retrieval.js";
import type { FetchArtifactViewResult } from "./artifact-retrieval-types.js";
import { getActionTrace, listActionHistory } from "./action-read.js";
import type { ListActionHistoryOptions } from "./action-read-types.js";
import { formatActionHistory, formatActionTrace } from "./format-action-read.js";
import { computePlanHash } from "./plan-hash.js";
import { formatReplayTimeline, replayAction } from "./replay.js";
import { getEnabledAgent, loadRegistry } from "./registry.js";
import { JsonRpcAgentClient } from "./transport/jsonrpc.js";

const DEFAULT_CANCEL_TIMEOUT_MS = 5000;

type ExecutionControlPhase = "running" | "cancel_requested" | "cancelling" | "terminal";

export type {
  CommandArgsInput,
  ConsolerRuntimeOptions,
  PrepareActionOptions,
  PreparedAction,
  PreviewLifecycleResult,
  PreviewOptions,
  PreparedExecutionControl,
  RuntimeEventHandlers,
  RuntimeControlError,
  RuntimeControlErrorCode,
  RuntimeLifecycleState,
  RuntimeTerminalResult,
  RunOptions,
  RunResult,
  RunWithEventsResult
} from "./lifecycle-types.js";
export type {
  ArtifactRetrievalAttempt,
  ArtifactRetrievalErrorCode,
  ArtifactRetrievalStatus,
  FetchArtifactViewResult
} from "./artifact-retrieval-types.js";

export class ConsolerRuntime {
  readonly store: ConsolerStore;
  readonly events: EventStore;
  private readonly rootDir: string | undefined;
  private readonly cancelTimeoutMs: number;

  constructor(options: ConsolerRuntimeOptions = {}) {
    this.rootDir = options.rootDir;
    this.cancelTimeoutMs = options.cancelTimeoutMs ?? DEFAULT_CANCEL_TIMEOUT_MS;
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

  async preview(
    input: CommandArgsInput,
    options: PreviewOptions = {}
  ): Promise<PreviewLifecycleResult> {
    const manifest = await this.prepareManifest(input);
    const command = getCommandDef(manifest, input.command);

    if (!requiresPreviewApproval(command)) {
      const preview = await this.fetchAgentPreview(input, manifest);
      return { preview, awaiting_preview_approval: false };
    }

    if (!options.approvePreview) {
      return {
        awaiting_preview_approval: true,
        preview_approval: buildPreviewApprovalToken({
          manifest,
          commandName: input.command,
          args: input.args
        })
      };
    }

    const preview = await this.fetchAgentPreview(input, manifest);
    return { preview, awaiting_preview_approval: false };
  }

  async prepareAction(
    input: CommandArgsInput,
    options: PrepareActionOptions = {}
  ): Promise<PreparedAction> {
    const manifest = await this.prepareManifest(input);
    const commandDef = getCommandDef(manifest, input.command);
    const draft = this.createDraft(input);
    const entry = getEnabledAgent(loadRegistry(this.rootDir), input.agentId);

    let preview: unknown;
    if (isProbeReadonlyPreview(commandDef)) {
      if (options.probePreview === undefined) {
        throw new Error("Probe preview is required before prepareAction for probe_readonly commands");
      }
      preview = options.probePreview;
    } else {
      preview = await this.fetchAgentPreview(input, manifest);
    }

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

  executePreparedWithControl(
    prepared: PreparedAction,
    handlers: RuntimeEventHandlers = {}
  ): PreparedExecutionControl {
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
    let pendingInteraction: InteractionRequest | null = null;
    let interactionTimer: ReturnType<typeof setTimeout> | null = null;
    let interactionOutcomeClaimed = false;
    let controlPhase: ExecutionControlPhase = "running";
    let cancelTimer: ReturnType<typeof setTimeout> | null = null;
    let cancelRequestResult: Promise<unknown> | null = null;
    let ingestionEnabled = true;
    let settled = false;
    let resolveDone!: (value: RuntimeTerminalResult) => void;
    let rejectDone!: (error: Error) => void;
    const done = new Promise<RuntimeTerminalResult>((resolve, reject) => {
      resolveDone = resolve;
      rejectDone = reject;
    });

    const clearInteractionTimer = (): void => {
      if (interactionTimer !== null) {
        clearTimeout(interactionTimer);
        interactionTimer = null;
      }
    };

    const clearCancelTimer = (): void => {
      if (cancelTimer !== null) {
        clearTimeout(cancelTimer);
        cancelTimer = null;
      }
    };

    const finishTerminal = (result: RuntimeTerminalResult): void => {
      if (settled) return;
      settled = true;
      ingestionEnabled = false;
      controlPhase = "terminal";
      clearInteractionTimer();
      clearCancelTimer();
      this.store.abandonPendingInteractionsForRun(runId);
      pendingInteraction = null;
      handlers.onStateChange?.(result.state);
      resolveDone(result);
    };

    const finishFromAcceptedEvents = (controlError?: RuntimeControlError): void => {
      const state = terminalStateFromEvents(acceptedEvents);
      finishTerminal({
        run_id: runId,
        state,
        events: [...acceptedEvents],
        ...(controlError ? { control_error: controlError } : {})
      });
    };

    const maybeFinish = (): void => {
      if (settled) return;
      const hasTerminal = acceptedEvents.some((event) => TERMINAL_EVENT_TYPES.has(event.type));
      if (!hasTerminal) return;
      clearCancelTimer();
      finishFromAcceptedEvents();
    };

    const handleCancelTimeout = (): void => {
      if (settled || controlPhase === "terminal") return;
      controlPhase = "terminal";
      clearInteractionTimer();
      clearCancelTimer();
      this.store.abandonPendingInteractionsForRun(runId);
      pendingInteraction = null;
      const controlError: RuntimeControlError = {
        code: "cancel_timeout",
        message: `Cancel was requested but action.cancelled was not received within ${this.cancelTimeoutMs}ms`
      };
      this.store.closeRun(runId, "failed", controlError);
      execClient.kill();
      finishTerminal({
        run_id: runId,
        state: "failed",
        events: [...acceptedEvents],
        control_error: controlError
      });
    };

    const startCancelTimeout = (): void => {
      clearCancelTimer();
      cancelTimer = setTimeout(() => {
        handleCancelTimeout();
      }, this.cancelTimeoutMs);
    };

    const execClient = this.spawnClient(prepared.entry, (notification) => {
      if (!ingestionEnabled || settled) return;
      if (notification.method !== "agent.event") return;
      const raw = notification.params?.["event"];
      if (!raw) return;
      const cancelQuarantine =
        controlPhase === "cancel_requested" || controlPhase === "cancelling";
      const ingest = this.events.ingest(
        runId,
        prepared.action.action_id,
        prepared.action.agent_id,
        prepared.action.command,
        raw,
        { cancelQuarantine }
      );
      if (ingest.accepted && ingest.event) {
        acceptedEvents.push(ingest.event);
        if (ingest.event.type === "interaction.required" && ingest.event.interaction) {
          pendingInteraction = ingest.event.interaction;
          interactionOutcomeClaimed = false;
          this.store.insertPendingInteraction(
            runId,
            prepared.action.action_id,
            prepared.action.agent_id,
            prepared.action.command,
            ingest.event.interaction,
            ingest.event.timestamp
          );
          clearInteractionTimer();
          const policy = ingest.event.interaction.timeout_policy;
          if (policy) {
            interactionTimer = setTimeout(() => {
              void handleInteractionTimeout();
            }, policy.timeout_seconds * 1000);
          }
        }
        handlers.onEvent?.(ingest.event, ingest);
        maybeFinish();
      } else if (ingest.event) {
        handlers.onEvent?.(ingest.event, ingest);
      }
    });

    const executePromise = execClient.request("agent.execute", {
      action_id: prepared.action.action_id,
      run_id: runId,
      command: prepared.action.command,
      args: prepared.action.args,
      plan: prepared.plan,
      approval: prepared.approval
    });

    void executePromise
      .then(() => {
        if (settled) return;
        maybeFinish();
        if (!settled) {
          const run = this.store.getRun(runId);
          if (run && run.status !== "running") {
            const controlError =
              run.control_error_code && run.control_error_message
                ? {
                    code: run.control_error_code as RuntimeControlError["code"],
                    message: run.control_error_message
                  }
                : undefined;
            finishFromAcceptedEvents(controlError);
            return;
          }
          finishFromAcceptedEvents();
        }
      })
      .catch((error: unknown) => {
        if (settled) return;
        settled = true;
        ingestionEnabled = false;
        controlPhase = "terminal";
        clearInteractionTimer();
        clearCancelTimer();
        this.store.abandonPendingInteractionsForRun(runId);
        pendingInteraction = null;
        rejectDone(error instanceof Error ? error : new Error(String(error)));
      });

    const deliverInteractionResponse = async (
      interactionId: string,
      response: unknown,
      timeoutMeta?: { triggered_at: string; outcome: string }
    ): Promise<unknown> => {
      const interaction = pendingInteraction;
      if (!interaction || interaction.interaction_id !== interactionId) {
        throw new Error(`Unknown interaction id: ${interactionId}`);
      }
      if (!isTimeoutControlResponse(response)) {
        validateInteractionResponse(interaction, response);
      }
      if (timeoutMeta?.outcome === "abort") {
        this.store.markInteractionTimedOut(runId, interactionId, timeoutMeta);
      } else {
        this.store.markInteractionResponded(runId, interactionId, response, timeoutMeta);
      }
      pendingInteraction = null;
      clearInteractionTimer();
      try {
        return await execClient.request("action.respond_interaction", {
          interaction_id: interactionId,
          response
        });
      } catch (error) {
        if (timeoutMeta?.outcome === "abort") {
          return { ok: false };
        }
        throw error;
      }
    };

    const claimInteractionOutcome = (): boolean => {
      if (interactionOutcomeClaimed || settled || !pendingInteraction) {
        return false;
      }
      interactionOutcomeClaimed = true;
      return true;
    };

    const handleInteractionTimeout = async (): Promise<void> => {
      if (!claimInteractionOutcome()) {
        return;
      }
      const interaction = pendingInteraction;
      if (!interaction?.timeout_policy) {
        interactionOutcomeClaimed = false;
        return;
      }
      const triggeredAt = new Date().toISOString();
      const { response, on_timeout: onTimeout } = buildTimeoutControlResponse(interaction);
      try {
        await deliverInteractionResponse(interaction.interaction_id, response, {
          triggered_at: triggeredAt,
          outcome: onTimeout
        });
      } catch {
        interactionOutcomeClaimed = false;
      }
    };

    const respondInteraction = async (interactionId: string, response: unknown): Promise<unknown> => {
      if (settled) {
        throw new Error("Cannot respond: run already terminal");
      }
      if (!pendingInteraction) {
        throw new Error("No pending interaction");
      }
      if (!claimInteractionOutcome()) {
        throw new Error("No pending interaction");
      }
      try {
        return await deliverInteractionResponse(interactionId, response);
      } catch (error) {
        interactionOutcomeClaimed = false;
        throw error;
      }
    };

    const cancel = (): Promise<unknown> => {
      if (cancelRequestResult) {
        return cancelRequestResult;
      }
      if (settled || controlPhase === "terminal") {
        return Promise.resolve({ status: "noop", reason: "run_terminal" });
      }
      controlPhase = "cancel_requested";
      cancelRequestResult = execClient.request("agent.cancel", {}).then((result) => {
        if (!settled && controlPhase === "cancel_requested") {
          controlPhase = "cancelling";
          startCancelTimeout();
        }
        return result;
      });
      return cancelRequestResult;
    };

    return {
      run_id: runId,
      done,
      cancel,
      respondInteraction,
      close: () => {
        ingestionEnabled = false;
        clearInteractionTimer();
        clearCancelTimer();
        execClient.kill();
      }
    };
  }

  async executePrepared(
    prepared: PreparedAction,
    handlers: RuntimeEventHandlers = {}
  ): Promise<RuntimeTerminalResult> {
    const control = this.executePreparedWithControl(prepared, handlers);
    try {
      return await control.done;
    } finally {
      control.close();
    }
  }

  async runWithEvents(
    input: CommandArgsInput,
    options: RunOptions = {},
    handlers: RuntimeEventHandlers = {}
  ): Promise<RunWithEventsResult> {
    const manifest = await this.prepareManifest(input);
    const commandDef = getCommandDef(manifest, input.command);
    let probePreview: unknown | undefined;

    if (requiresPreviewApproval(commandDef)) {
      if (!options.approvePreview) {
        handlers.onStateChange?.("awaiting_preview_approval");
        return {
          action_id: "",
          run_id: "",
          preview_approval: buildPreviewApprovalToken({
            manifest,
            commandName: input.command,
            args: input.args
          }),
          awaiting_preview_approval: true,
          awaiting_approval: false
        };
      }
      handlers.onStateChange?.("preparing");
      probePreview = await this.fetchAgentPreview(input, manifest);
    }

    handlers.onStateChange?.("preparing");
    const prepared = await this.prepareAction(input, { probePreview });
    handlers.onStateChange?.("awaiting_approval");

    if (!options.approve) {
      return {
        action_id: prepared.action.action_id,
        run_id: "",
        approval: prepared.approval,
        awaiting_preview_approval: false,
        awaiting_approval: true
      };
    }

    const terminal = await this.executePrepared(prepared, handlers);
    return {
      action_id: prepared.action.action_id,
      run_id: terminal.run_id,
      approval: prepared.approval,
      awaiting_preview_approval: false,
      awaiting_approval: false,
      terminal
    };
  }

  async run(input: CommandArgsInput, options: RunOptions = {}): Promise<RunResult> {
    const result = await this.runWithEvents(input, options);
    const output: RunResult = {
      action_id: result.action_id,
      run_id: result.run_id,
      awaiting_preview_approval: result.awaiting_preview_approval,
      awaiting_approval: result.awaiting_approval
    };
    if (result.approval) output.approval = result.approval;
    if (result.preview_approval) output.preview_approval = result.preview_approval;
    return output;
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

  listActionHistory(options: ListActionHistoryOptions = {}) {
    return listActionHistory(this.store, options);
  }

  getActionTrace(actionId: string) {
    return getActionTrace(this.store, actionId);
  }

  formatActionHistory(options: ListActionHistoryOptions = {}) {
    return formatActionHistory(listActionHistory(this.store, options));
  }

  formatActionTrace(actionId: string) {
    return formatActionTrace(getActionTrace(this.store, actionId));
  }

  fetchArtifactView(actionId: string, blockId: string): Promise<FetchArtifactViewResult> {
    return fetchArtifactViewForStore(this.store, this.rootDir, actionId, blockId);
  }

  private async fetchAgentPreview(
    input: CommandArgsInput,
    manifest?: AgentManifest
  ): Promise<unknown> {
    const resolvedManifest = manifest ?? (await this.prepareManifest(input));
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
  return "preview";
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
