import type { ActionEvent } from "@consoler/protocol";
import {
  ConsolerRuntime,
  getCommandDef,
  isProbeReadonlyPreview,
  requiresPreviewApproval,
  type CommandArgsInput,
  type PreparedExecutionControl,
  type RunOptions,
  type RunResult
} from "@consoler/runtime";

import {
  resolveInteractionResponseWithRetry,
  type InteractionPromptContext
} from "./interaction-cli.js";

export interface RunApprovedOptions extends RunOptions {
  interactionPrompt?: InteractionPromptContext;
}

export async function runApprovedWithInteractions(
  runtime: ConsolerRuntime,
  input: CommandArgsInput,
  options: RunApprovedOptions = {}
): Promise<RunResult> {
  const previewResult = await runtime.preview(input, {
    approvePreview: Boolean(options.approvePreview)
  });

  if (previewResult.awaiting_preview_approval && previewResult.preview_approval) {
    return {
      action_id: "",
      run_id: "",
      preview_approval: previewResult.preview_approval,
      awaiting_preview_approval: true,
      awaiting_approval: false
    };
  }

  const manifest = await runtime.discover(input.agentId);
  const commandDef = getCommandDef(manifest, input.command);
  const prepared = await runtime.prepareAction(
    input,
    requiresPreviewApproval(commandDef) && isProbeReadonlyPreview(commandDef)
      ? { probePreview: previewResult.preview }
      : {}
  );

  const promptCtx = options.interactionPrompt;
  let seededConsumed = false;
  let interactionFailure: Error | undefined;

  let control!: PreparedExecutionControl;
  const interactionCtx: InteractionPromptContext | undefined = promptCtx
    ? {
        isTTY: promptCtx.isTTY,
        readLine: promptCtx.readLine,
        writeStderr: promptCtx.writeStderr,
        takeSeededResponse: () => {
          if (seededConsumed) {
            return undefined;
          }
          const next = promptCtx.takeSeededResponse();
          if (next !== undefined) {
            seededConsumed = true;
          }
          return next;
        }
      }
    : undefined;

  control = runtime.executePreparedWithControl(prepared, {
    onEvent: (event: ActionEvent, ingest) => {
      if (
        !interactionCtx ||
        interactionFailure ||
        !ingest.accepted ||
        event.type !== "interaction.required" ||
        !event.interaction
      ) {
        return;
      }
      void resolveInteractionResponseWithRetry(
        event.interaction,
        interactionCtx,
        async (response) => {
          await control.respondInteraction(event.interaction!.interaction_id, response);
        }
      ).catch((error: unknown) => {
        interactionFailure =
          error instanceof Error ? error : new Error(String(error));
        control.close();
      });
    }
  });

  try {
    try {
      await control.done;
    } catch (error) {
      if (interactionFailure) {
        throw interactionFailure;
      }
      throw error;
    }
    if (interactionFailure) {
      throw interactionFailure;
    }
    return {
      action_id: prepared.action.action_id,
      run_id: control.run_id,
      approval: prepared.approval,
      awaiting_preview_approval: false,
      awaiting_approval: false
    };
  } finally {
    control.close();
  }
}
