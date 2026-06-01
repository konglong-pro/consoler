import { Box, Text, useApp, useInput } from "ink";
import SelectInput from "ink-select-input";
import Spinner from "ink-spinner";
import TextInput from "ink-text-input";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type {
  ActionEvent,
  ActionPlan,
  AgentManifest,
  InteractionRequest,
  RenderableBlock
} from "@consoler/protocol";
import type { AgentCommand, ApprovalToken } from "@consoler/protocol";
import type {
  ActionHistoryEntry,
  ActionTrace,
  FetchArtifactViewResult
} from "@consoler/runtime";
import {
  ConsolerRuntime,
  draftIntent,
  draftIntentAssisted,
  requiresPreviewApproval,
  type IntentDraftAssistedResult,
  type PreparedAction,
  type PreparedExecutionControl,
  type RuntimeEventHandlers,
  type RuntimeTerminalResult
} from "@consoler/runtime";

import { ArtifactViewPanel } from "./artifact-view-panel.js";
import { artifactBlocksFromList } from "./artifact-utils.js";
import { historyItemDetail, historyItemLabel } from "./history-label.js";
import { ResultBlocksPanel } from "./result-blocks-panel.js";
import { TracePanel } from "./trace-panel.js";
import {
  actionProductLabel,
  fieldDisplayHelp,
  fieldDisplayLabel,
  historyListOptions
} from "./variant-display.js";
import type { ConsoleVariantConfig } from "./variant-types.js";
import { resolveProductAssistedIntent, type ProductAssistedIntentConfig } from "./assisted-intent.js";
import { buildIntentScopeFromVariant } from "./intent-scope.js";
import { assertVariantManifestOrExit } from "./variant-validation.js";

import { blocksFromEvents, EventLine, RenderableBlockView } from "./blocks.js";
import {
  scheduleAfterInputFlush,
  validateFormForSubmit,
  valuesForSubmit
} from "./form-submit.js";
import { stepFieldIndex } from "./form-nav.js";
import {
  defaultFormValues,
  fieldsFromCommand,
  fieldsFromObjectSchema,
  validateFormValues,
  valuesForInteractionSubmit,
  type FormField
} from "./schema-form.js";

const DEV_SHELL_AGENT_ID = "indbase";

type Phase =
  | "boot"
  | "home"
  | "command_select"
  | "history"
  | "trace"
  | "form"
  | "preview_approval"
  | "prepared"
  | "running"
  | "finished"
  | "artifact_view"
  | "replay";
type TabId = "logs" | "events" | "json" | "replay";
type ArtifactOpenSource = "trace" | "finished";

const TABS: TabId[] = ["logs", "events", "json", "replay"];

type HomeFocus = "nl" | "tasks";

function joinNotices(...parts: Array<string | null | undefined>): string | undefined {
  const messages = parts.filter((part): part is string => Boolean(part));
  return messages.length > 0 ? messages.join(" ") : undefined;
}

function mergePrefilledFormValues(
  formFields: FormField[],
  prefilledArgs?: Record<string, unknown>
): Record<string, unknown> {
  const defaults = defaultFormValues(formFields);
  if (!prefilledArgs) {
    return defaults;
  }
  const allowed = new Set(formFields.map((field) => field.name));
  const merged = { ...defaults };
  for (const [key, value] of Object.entries(prefilledArgs)) {
    if (allowed.has(key)) {
      merged[key] = value;
    }
  }
  return merged;
}

export interface AppProps {
  replayActionId?: string;
  /** Product Console Variant; omit for generic dev shell. */
  variant?: ConsoleVariantConfig;
  /** Injected runtime (tests) */
  runtime?: ConsolerRuntime;
  /** Skip agent discover and open home with this manifest (tests) */
  initialManifest?: AgentManifest;
  /** Test-only: start on trace with JSON tab without keyboard navigation */
  testTraceView?: { trace: ActionTrace; tab?: TabId };
  /** Test-only: open directly on execution approval */
  testPrepared?: PreparedAction;
  /** Test-only: open directly on history list (requires injected runtime + seeded store) */
  testHistoryView?: boolean;
  /** Test-only: product assisted intent config (overrides process env) */
  assistedIntent?: ProductAssistedIntentConfig;
}

export function App({
  replayActionId,
  variant,
  runtime: runtimeProp,
  initialManifest,
  testTraceView,
  testPrepared,
  testHistoryView,
  assistedIntent: assistedIntentProp
}: AppProps) {
  const { exit } = useApp();
  const runtime = useMemo(() => runtimeProp ?? new ConsolerRuntime(), [runtimeProp]);
  const productMode = Boolean(variant);
  const agentId = variant?.defaultAgentId ?? DEV_SHELL_AGENT_ID;
  const assistedIntent = useMemo((): ProductAssistedIntentConfig => {
    if (!productMode) {
      return { enabled: false, provider: null };
    }
    if (assistedIntentProp !== undefined) {
      return assistedIntentProp;
    }
    return resolveProductAssistedIntent(process.env);
  }, [productMode, assistedIntentProp]);

  const [phase, setPhase] = useState<Phase>(replayActionId ? "replay" : "boot");
  const [tab, setTab] = useState<TabId>("events");
  const [manifest, setManifest] = useState<AgentManifest | null>(null);
  const [selectedCommand, setSelectedCommand] = useState<string | null>(null);
  const [previewApproval, setPreviewApproval] = useState<ApprovalToken | null>(null);
  const [probePreview, setProbePreview] = useState<unknown | null>(null);
  const [fields, setFields] = useState<FormField[]>([]);
  const [formValues, setFormValues] = useState<Record<string, unknown>>({});
  const [prepared, setPrepared] = useState<PreparedAction | null>(null);
  const [events, setEvents] = useState<ActionEvent[]>([]);
  const [blocks, setBlocks] = useState<RenderableBlock[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [replayInput, setReplayInput] = useState(replayActionId ?? "");
  const [replayEvents, setReplayEvents] = useState<ActionEvent[]>([]);
  const [historyEntries, setHistoryEntries] = useState<ActionHistoryEntry[]>([]);
  const [trace, setTrace] = useState<ActionTrace | null>(null);
  const [cancelRequested, setCancelRequested] = useState(false);
  const [executionOutcome, setExecutionOutcome] = useState<RuntimeTerminalResult["state"] | null>(
    null
  );
  const [pendingInteraction, setPendingInteraction] = useState<InteractionRequest | null>(null);
  const [interactionBusy, setInteractionBusy] = useState(false);
  const [interactionFields, setInteractionFields] = useState<FormField[]>([]);
  const [interactionValues, setInteractionValues] = useState<Record<string, unknown>>({});
  const [interactionFocusedField, setInteractionFocusedField] = useState(0);
  const [focusedField, setFocusedField] = useState(0);
  const [nlText, setNlText] = useState("");
  const [homeFocus, setHomeFocus] = useState<HomeFocus>("nl");
  const [homeNotice, setHomeNotice] = useState<string | null>(null);
  const [formNotice, setFormNotice] = useState<string | null>(null);
  const [nlDraftingBusy, setNlDraftingBusy] = useState(false);
  const [artifactSource, setArtifactSource] = useState<ArtifactOpenSource | null>(null);
  const [selectedArtifactIndex, setSelectedArtifactIndex] = useState(0);
  const [artifactViewState, setArtifactViewState] = useState<{
    actionId: string;
    blockId: string;
    result: FetchArtifactViewResult | null;
    loading: boolean;
  } | null>(null);
  const formValuesRef = useRef<Record<string, unknown>>({});
  const nlTextRef = useRef("");
  const submitFlushRef = useRef(false);
  const executionControlRef = useRef<PreparedExecutionControl | null>(null);
  const cancelRequestedRef = useRef(false);

  const closeExecutionControl = useCallback(() => {
    executionControlRef.current?.close();
    executionControlRef.current = null;
  }, []);

  const clearPendingInteraction = useCallback(() => {
    setPendingInteraction(null);
    setInteractionBusy(false);
    setInteractionFields([]);
    setInteractionValues({});
    setInteractionFocusedField(0);
  }, []);

  const resetExecutionSession = useCallback(() => {
    cancelRequestedRef.current = false;
    setCancelRequested(false);
    setExecutionOutcome(null);
    clearPendingInteraction();
  }, [clearPendingInteraction]);

  const logEvents = useMemo(() => events.filter((e) => e.type === "log"), [events]);

  const artifactBlocks = useMemo(() => {
    if (phase === "trace" && trace) {
      return artifactBlocksFromList(trace.result_blocks);
    }
    if (phase === "finished") {
      return artifactBlocksFromList(blocks);
    }
    return [];
  }, [phase, trace, blocks]);

  const selectedArtifactBlockId =
    artifactBlocks[selectedArtifactIndex]?.block_id ?? null;

  const openArtifact = useCallback(
    async (actionId: string, blockId: string, source: ArtifactOpenSource) => {
      setArtifactSource(source);
      setPhase("artifact_view");
      setArtifactViewState({ actionId, blockId, result: null, loading: true });
      setBusy(true);
      setError(null);
      try {
        const result = await runtime.fetchArtifactView(actionId, blockId);
        setArtifactViewState({ actionId, blockId, result, loading: false });
        if (source === "trace") {
          setTrace(runtime.getActionTrace(actionId));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        setArtifactViewState({
          actionId,
          blockId,
          result: {
            ok: false,
            error: { code: "agent_error", message: String(err) }
          },
          loading: false
        });
      } finally {
        setBusy(false);
      }
    },
    [runtime]
  );

  useEffect(() => {
    formValuesRef.current = formValues;
  }, [formValues]);

  useEffect(() => {
    if (testTraceView) {
      setTrace(testTraceView.trace);
      setSelectedArtifactIndex(0);
      setPhase("trace");
      if (testTraceView.tab) setTab(testTraceView.tab);
      if (initialManifest) setManifest(initialManifest);
      return;
    }
    if (replayActionId) {
      loadReplay(replayActionId);
      return;
    }
    if (testPrepared) {
      if (initialManifest) setManifest(initialManifest);
      setPrepared(testPrepared);
      resetExecutionSession();
      setEvents([]);
      setBlocks([]);
      setPhase("prepared");
      return;
    }
    if (testHistoryView) {
      if (initialManifest) setManifest(initialManifest);
      setHistoryEntries(runtime.listActionHistory(historyListOptions(variant)));
      setPhase("history");
      return;
    }
    if (initialManifest) {
      if (variant) {
        assertVariantManifestOrExit(variant, initialManifest);
      }
      setManifest(initialManifest);
      setPhase("home");
      return;
    }
    void bootstrap();
  }, [replayActionId, initialManifest, testPrepared, testHistoryView, testTraceView, resetExecutionSession]);

  useEffect(() => {
    return () => {
      closeExecutionControl();
    };
  }, [closeExecutionControl]);

  const bootstrap = async () => {
    try {
      setBusy(true);
      const m = await runtime.discover(agentId);
      if (variant) {
        assertVariantManifestOrExit(variant, m);
        const allowed = new Set(variant.allowedCommands);
        m.commands = m.commands.filter((command) => allowed.has(command.name));
      }
      setManifest(m);
      setPhase("home");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const selectCommand = (
    commandName: string,
    options?: { prefilledArgs?: Record<string, unknown>; formNotice?: string }
  ) => {
    if (!manifest) return;
    const command = manifest.commands.find((c) => c.name === commandName);
    if (!command) {
      setError(`Command not found: ${commandName}`);
      return;
    }
    const formFields = fieldsFromCommand(command);
    const merged = mergePrefilledFormValues(formFields, options?.prefilledArgs);
    setSelectedCommand(commandName);
    setFields(formFields);
    formValuesRef.current = merged;
    setFormValues(merged);
    setFormNotice(options?.formNotice ?? null);
    setPreviewApproval(null);
    setProbePreview(null);
    setPrepared(null);
    resetExecutionSession();
    closeExecutionControl();
    setError(null);
    setFocusedField(0);
    setPhase("form");
  };

  const selectProductAction = (actionId: string) => {
    if (!variant) return;
    const action = variant.actions.find((entry) => entry.id === actionId);
    if (!action) {
      setError(`Unknown task: ${actionId}`);
      return;
    }
    setHomeNotice(null);
    selectCommand(action.command);
  };

  const nlSubmitInFlightRef = useRef(false);

  const submitNaturalLanguage = useCallback(
    async (rawText?: string) => {
      if (!variant || !manifest || nlDraftingBusy || nlSubmitInFlightRef.current) return;
      nlSubmitInFlightRef.current = true;
      try {
        const text = (rawText ?? nlTextRef.current).trim();
        if (!text) {
          setHomeNotice("Enter a request or press Tab to choose a task.");
          return;
        }

        const applyIntentDraftResult = (result: IntentDraftAssistedResult) => {
          const assistMessage = result.assist_notice?.message;
          if (result.outcome === "candidate") {
            setNlText("");
            nlTextRef.current = "";
            setHomeNotice(null);
            selectCommand(result.candidate.command, {
              prefilledArgs: result.candidate.prefilled_args
            });
            return;
          }
          if (result.reason === "missing_required_args" && result.partial_candidate) {
            setNlText("");
            nlTextRef.current = "";
            setHomeNotice(null);
            const partialNotice = joinNotices(result.message, assistMessage);
            selectCommand(result.partial_candidate.command, {
              prefilledArgs: result.partial_candidate.prefilled_args,
              ...(partialNotice ? { formNotice: partialNotice } : {})
            });
            return;
          }
          setHomeNotice(joinNotices(result.message, assistMessage) ?? result.message);
          setHomeFocus("tasks");
        };

        const scope = buildIntentScopeFromVariant(manifest, variant);
        if (!assistedIntent.enabled) {
          applyIntentDraftResult(draftIntent({ text, scope }));
          return;
        }

        setNlDraftingBusy(true);
        setHomeNotice(null);
        try {
          const result = await draftIntentAssisted({
            text,
            scope,
            provider: assistedIntent.provider
          });
          applyIntentDraftResult(result);
        } finally {
          setNlDraftingBusy(false);
        }
      } finally {
        nlSubmitInFlightRef.current = false;
      }
    },
    [assistedIntent, manifest, nlDraftingBusy, variant]
  );

  const loadHistory = () => {
    try {
      setHistoryEntries(runtime.listActionHistory(historyListOptions(variant)));
      setPhase("history");
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const openTrace = (actionId: string) => {
    try {
      const payload = runtime.getActionTrace(actionId);
      setTrace(payload);
      setSelectedArtifactIndex(0);
      setPhase("trace");
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const loadReplay = (actionId: string) => {
    try {
      const timeline = runtime.getReplay(actionId.trim());
      setReplayEvents(timeline.events);
      setBlocks(blocksFromEvents(timeline.events));
      setReplayInput(actionId);
      setPhase("replay");
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setPhase("replay");
    }
  };

  const submitForm = useCallback(
    async (pending?: { name: string; value: unknown }) => {
      if (!selectedCommand) return;
      const args = valuesForSubmit(formValuesRef.current, pending);
      const validationError = validateFormForSubmit(fields, formValuesRef.current, pending);
      if (validationError) {
        setError(validationError);
        return;
      }
      setError(null);
      setBusy(true);
      try {
        const input = { agentId, command: selectedCommand, args };
        const commandDef = manifest?.commands.find((c) => c.name === selectedCommand);
        if (commandDef && requiresPreviewApproval(commandDef)) {
          const gate = await runtime.preview(input, { approvePreview: false });
          if (gate.awaiting_preview_approval && gate.preview_approval) {
            setPreviewApproval(gate.preview_approval);
            setPhase("preview_approval");
            return;
          }
          setProbePreview(gate.preview ?? null);
        }
        const bundle = await runtime.prepareAction(input, {
          probePreview: probePreview ?? undefined
        });
        setPrepared(bundle);
        resetExecutionSession();
        closeExecutionControl();
        setEvents([]);
        setBlocks([]);
        setPhase("prepared");
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setBusy(false);
      }
    },
    [
      agentId,
      closeExecutionControl,
      fields,
      manifest,
      probePreview,
      resetExecutionSession,
      runtime,
      selectedCommand
    ]
  );

  const approveProbePreview = async () => {
    if (!selectedCommand) return;
    setError(null);
    setBusy(true);
    try {
      const input = {
        agentId,
        command: selectedCommand,
        args: formValuesRef.current
      };
      const gate = await runtime.preview(input, { approvePreview: true });
      const preview = gate.preview;
      setProbePreview(preview ?? null);
      const bundle = await runtime.prepareAction(input, { probePreview: preview });
      setPrepared(bundle);
      resetExecutionSession();
      closeExecutionControl();
      setEvents([]);
      setBlocks([]);
      setPhase("prepared");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const scheduleSubmitForm = useCallback(
    (pending?: { name: string; value: unknown }) => {
      if (submitFlushRef.current) return;
      submitFlushRef.current = true;
      scheduleAfterInputFlush(() => {
        submitFlushRef.current = false;
        void submitForm(pending);
      });
    },
    [submitForm]
  );

  const approve = async () => {
    if (!prepared || phase !== "prepared") return;
    setError(null);
    setBusy(true);
    resetExecutionSession();
    closeExecutionControl();
    setEvents([]);
    setBlocks([]);
    setPhase("running");
    const handlers: RuntimeEventHandlers = {
      onEvent: (event: ActionEvent) => {
        setEvents((prev) => [...prev, event]);
        if (event.type === "interaction.required" && event.interaction) {
          setPendingInteraction(event.interaction);
          if (event.interaction.prompt_schema) {
            const interactionFormFields = fieldsFromObjectSchema(event.interaction.prompt_schema);
            setInteractionFields(interactionFormFields);
            const defaults = defaultFormValues(interactionFormFields);
            if (
              event.interaction.default_response &&
              typeof event.interaction.default_response === "object" &&
              !Array.isArray(event.interaction.default_response)
            ) {
              setInteractionValues({
                ...defaults,
                ...(event.interaction.default_response as Record<string, unknown>)
              });
            } else {
              setInteractionValues(defaults);
            }
            setInteractionFocusedField(0);
          } else {
            setInteractionFields([]);
            setInteractionValues({});
          }
        }
      }
    };
    const control = runtime.executePreparedWithControl(prepared, handlers);
    executionControlRef.current = control;
    try {
      const terminal = await control.done;
      setExecutionOutcome(terminal.state);
      if (terminal.state === "succeeded") {
        setBlocks(blocksFromEvents(terminal.events));
      } else {
        setBlocks([]);
      }
      setSelectedArtifactIndex(0);
      setPhase("finished");
      clearPendingInteraction();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setPhase("prepared");
      clearPendingInteraction();
    } finally {
      closeExecutionControl();
      setBusy(false);
    }
  };

  const submitInteractionResponse = useCallback(
    async (response: unknown) => {
      const control = executionControlRef.current;
      if (!pendingInteraction || !control || interactionBusy) return;
      setInteractionBusy(true);
      setError(null);
      try {
        await control.respondInteraction(pendingInteraction.interaction_id, response);
        clearPendingInteraction();
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setInteractionBusy(false);
      }
    },
    [clearPendingInteraction, interactionBusy, pendingInteraction]
  );

  const submitInteractionForm = useCallback(() => {
    if (!pendingInteraction?.prompt_schema || interactionFields.length === 0) return;
    const validationError = validateFormValues(interactionFields, interactionValues);
    if (validationError) {
      setError(validationError);
      return;
    }
    void submitInteractionResponse(
      valuesForInteractionSubmit(interactionValues, interactionFields)
    );
  }, [
    interactionFields,
    interactionValues,
    pendingInteraction,
    submitInteractionResponse
  ]);

  const requestRuntimeCancel = () => {
    const control = executionControlRef.current;
    if (!control || cancelRequestedRef.current) return;
    cancelRequestedRef.current = true;
    setCancelRequested(true);
    void control.cancel().catch((err) => {
      cancelRequestedRef.current = false;
      setCancelRequested(false);
      setError(err instanceof Error ? err.message : String(err));
    });
  };

  const cancelApproval = () => {
    closeExecutionControl();
    setPrepared(null);
    setPreviewApproval(null);
    setProbePreview(null);
    resetExecutionSession();
    setPhase("form");
    setError(null);
  };

  useInput((input, key) => {
    if (key.ctrl && input === "c") {
      exit();
      return;
    }
    if (phase === "home" && productMode && key.tab && !key.shift && !key.ctrl) {
      setHomeFocus((current) => (current === "nl" ? "tasks" : "nl"));
      return;
    }
    if (
      phase === "running" &&
      pendingInteraction?.choices?.length &&
      !interactionBusy &&
      !cancelRequestedRef.current
    ) {
      const index = Number.parseInt(input, 10);
      if (index >= 1 && index <= pendingInteraction.choices.length) {
        void submitInteractionResponse(pendingInteraction.choices[index - 1]!.id);
        return;
      }
    }
    if (phase === "running" && pendingInteraction?.prompt_schema && interactionFields.length > 0) {
      if (key.upArrow) {
        setInteractionFocusedField((current) =>
          stepFieldIndex(current, -1, interactionFields.length)
        );
        return;
      }
      if (key.downArrow) {
        setInteractionFocusedField((current) =>
          stepFieldIndex(current, 1, interactionFields.length)
        );
        return;
      }
      if (key.tab) {
        const delta = key.shift ? -1 : 1;
        setInteractionFocusedField((current) =>
          stepFieldIndex(current, delta, interactionFields.length)
        );
        return;
      }
      if (key.return && !interactionBusy) {
        submitInteractionForm();
        return;
      }
    }
    if (phase === "form" && fields.length > 0 && !pendingInteraction) {
      if (key.upArrow) {
        setFocusedField((current) => stepFieldIndex(current, -1, fields.length));
        return;
      }
      if (key.downArrow) {
        setFocusedField((current) => stepFieldIndex(current, 1, fields.length));
        return;
      }
      if (key.tab) {
        const delta = key.shift ? -1 : 1;
        setFocusedField((current) => stepFieldIndex(current, delta, fields.length));
        return;
      }
      if (key.return) {
        scheduleSubmitForm();
        return;
      }
    }
    if (
      (phase === "trace" || phase === "finished") &&
      artifactBlocks.length > 0 &&
      !busy
    ) {
      if (key.upArrow) {
        setSelectedArtifactIndex(
          (current) => (current - 1 + artifactBlocks.length) % artifactBlocks.length
        );
        return;
      }
      if (key.downArrow) {
        setSelectedArtifactIndex((current) => (current + 1) % artifactBlocks.length);
        return;
      }
      if (key.return && selectedArtifactBlockId) {
        const actionId =
          phase === "trace" ? trace!.action.action_id : prepared!.action.action_id;
        void openArtifact(
          actionId,
          selectedArtifactBlockId,
          phase === "trace" ? "trace" : "finished"
        );
        return;
      }
    }
    if (key.tab && key.ctrl) {
      const idx = TABS.indexOf(tab);
      setTab(TABS[(idx + 1) % TABS.length]!);
      return;
    }
    if (key.escape) {
      setError(null);
      if (phase === "artifact_view") {
        setArtifactViewState(null);
        setPhase(artifactSource === "finished" ? "finished" : "trace");
        setArtifactSource(null);
        return;
      }
      if (phase === "trace") {
        setTrace(null);
        setPhase("history");
        return;
      }
      if (phase === "history") {
        setHistoryEntries([]);
        setPhase("home");
        return;
      }
      if (phase === "command_select" || phase === "form") {
        setFormNotice(null);
        setHomeFocus("nl");
        setPhase("home");
        return;
      }
      return;
    }
    if (phase === "trace" && input === "r" && trace) {
      loadReplay(trace.action.action_id);
      return;
    }
    if (phase === "preview_approval" && input === "y" && !busy) {
      void approveProbePreview();
      return;
    }
    if (phase === "preview_approval" && input === "n") {
      cancelApproval();
      return;
    }
    if (phase === "prepared" && input === "y" && !busy) {
      void approve();
      return;
    }
    if (phase === "prepared" && input === "n") {
      cancelApproval();
      return;
    }
    if (phase === "running" && input === "c") {
      requestRuntimeCancel();
    }
  });

  const updateField = useCallback((name: string, value: unknown) => {
    setFormValues((prev) => {
      const next = { ...prev, [name]: value };
      formValuesRef.current = next;
      return next;
    });
  }, []);

  const jsonPayload = useMemo(() => {
    if (tab !== "json") return "";
    if (phase === "trace" && trace) {
      return JSON.stringify(trace, null, 2);
    }
    if (phase === "replay") {
      return JSON.stringify({ replay: replayInput, events: replayEvents }, null, 2);
    }
    return JSON.stringify(
      {
        form: formValues,
        prepared: prepared
          ? {
              action_id: prepared.action.action_id,
              plan_id: prepared.plan.plan_id,
              preview: prepared.preview,
              approval_id: prepared.approval.approval_id
            }
          : null,
        events
      },
      null,
      2
    );
  }, [tab, phase, formValues, prepared, events, replayInput, replayEvents, trace]);

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="green">
        {productMode ? variant!.productName : "consoler TUI"} —{" "}
        {phase === "home"
          ? productMode
            ? "tasks"
            : "home"
          : phase === "history"
            ? "history"
            : phase === "trace"
              ? "trace"
              : phase === "artifact_view"
                ? "artifact"
                : actionProductLabel(variant, selectedCommand) ??
                  selectedCommand ??
                  (productMode ? "task" : "select command")}
      </Text>
      {nlDraftingBusy ? (
        <Text color="yellow">
          <Spinner type="dots" /> Drafting request...
        </Text>
      ) : busy ? (
        <Text color="yellow">
          <Spinner type="dots" /> Working...
        </Text>
      ) : null}
      {error ? <Text color="red">Error: {error}</Text> : null}

      <Box flexDirection="column" marginTop={1} flexGrow={1}>
        {phase === "boot" ? <Text>Loading manifest...</Text> : null}

        {phase === "home" ? (
          <Box flexDirection="column">
            <Text bold>{productMode ? "What would you like to do?" : "Start"}</Text>
            {productMode && variant ? (
              <Box flexDirection="column" marginTop={1}>
                <Text>Describe your request (Tab to choose a task)</Text>
                {homeNotice ? <Text color="yellow">{homeNotice}</Text> : null}
                <TextInput
                  value={nlText}
                  focus={homeFocus === "nl" && !nlDraftingBusy}
                  onChange={(value) => {
                    if (nlDraftingBusy) return;
                    nlTextRef.current = value;
                    setNlText(value);
                  }}
                  onSubmit={(value) => {
                    if (nlDraftingBusy) return;
                    nlTextRef.current = value;
                    scheduleAfterInputFlush(() => {
                      void submitNaturalLanguage(value);
                    });
                  }}
                />
                <Box flexDirection="column" marginTop={1}>
                  <Text bold={homeFocus === "tasks"} dimColor={homeFocus === "nl"}>
                    Tasks
                  </Text>
                  {homeFocus === "nl" ? (
                    <Box flexDirection="column">
                      {variant.actions.map((action) => (
                        <Text key={action.id} dimColor>
                          {action.label}
                        </Text>
                      ))}
                      <Text dimColor>History</Text>
                    </Box>
                  ) : (
                    <SelectInput
                      items={[
                        ...variant.actions.map((action) => ({
                          label: action.label,
                          value: `action:${action.id}`
                        })),
                        { label: "History", value: "history" }
                      ]}
                      onSelect={(item) => {
                        if (item.value === "history") loadHistory();
                        else if (item.value.startsWith("action:")) {
                          selectProductAction(item.value.slice("action:".length));
                        }
                      }}
                    />
                  )}
                </Box>
              </Box>
            ) : (
              <SelectInput
                items={[
                  { label: "New Action", value: "new" },
                  { label: "History", value: "history" }
                ]}
                onSelect={(item) => {
                  if (item.value === "history") loadHistory();
                  else setPhase("command_select");
                }}
              />
            )}
          </Box>
        ) : null}

        {phase === "history" ? (
          <Box flexDirection="column">
            <Text bold>History (Enter open trace, Esc home)</Text>
            {historyEntries.length === 0 ? (
              <Text dimColor>No actions stored yet.</Text>
            ) : (
              <SelectInput
                items={historyEntries.map((entry) => ({
                  label: `${historyItemLabel(entry, variant)}  ${historyItemDetail(entry)}`,
                  value: entry.action_id
                }))}
                onSelect={(item) => openTrace(item.value)}
              />
            )}
          </Box>
        ) : null}

        {phase === "trace" && trace ? (
          <Box flexDirection="column">
            <TracePanel trace={trace} selectedArtifactBlockId={selectedArtifactBlockId} />
          </Box>
        ) : null}

        {phase === "artifact_view" && artifactViewState ? (
          <Box flexDirection="column">
            {artifactViewState.loading ? (
              <Text color="yellow">Fetching artifact view…</Text>
            ) : artifactViewState.result ? (
              <ArtifactViewPanel
                actionId={artifactViewState.actionId}
                blockId={artifactViewState.blockId}
                result={artifactViewState.result}
                productMode={productMode}
                {...(variant ? { variant } : {})}
              />
            ) : (
              <Text color="red">No artifact view result</Text>
            )}
          </Box>
        ) : null}

        {phase === "command_select" && manifest && !productMode ? (
          <Box flexDirection="column">
            <Text bold>Select command (Esc home)</Text>
            <SelectInput
              items={manifest.commands.map((command: AgentCommand) => ({
                label: command.name,
                value: command.name
              }))}
              onSelect={(item) => selectCommand(item.value)}
            />
          </Box>
        ) : null}

        {phase === "form" ? (
          <Box flexDirection="column">
            <Text bold>
              {productMode
                ? `${actionProductLabel(variant, selectedCommand) ?? "Task"} — details`
                : "Action form (Tab/↑↓ move field, Enter continue)"}
            </Text>
            {formNotice ? <Text color="yellow">{formNotice}</Text> : null}
            {!productMode ? (
              <Text dimColor>
                Field {focusedField + 1}/{fields.length}: {fields[focusedField]?.name}
              </Text>
            ) : null}
            {fields.map((field, index) => {
              const help = fieldDisplayHelp(variant, selectedCommand, field.name);
              return (
                <FormFieldRow
                  key={field.name}
                  field={field}
                  value={formValues[field.name]}
                  active={focusedField === index}
                  displayLabel={fieldDisplayLabel(variant, selectedCommand, field.name)}
                  {...(help ? { displayHelp: help } : {})}
                  onChange={(v) => updateField(field.name, v)}
                  onSubmitValue={(v) => scheduleSubmitForm({ name: field.name, value: v })}
                />
              );
            })}
          </Box>
        ) : null}

        {phase === "preview_approval" && previewApproval && selectedCommand ? (
          <Box flexDirection="column">
            <Text bold>
              {productMode
                ? (variant?.approvalCopy[selectedCommand]?.previewTitle ?? "Preview approval")
                : "Preview approval (y=probe, n=cancel)"}
            </Text>
            {!productMode ? <Text>approval_id: {previewApproval.approval_id}</Text> : null}
            <Text dimColor>{previewApproval.material.plan_summary}</Text>
            <Text dimColor>Side effects: {previewApproval.material.side_effects.join(", ")}</Text>
            {productMode ? (
              <Text dimColor>
                {variant?.approvalCopy[selectedCommand]?.previewPrompt ?? "y = continue, n = cancel"}
              </Text>
            ) : null}
          </Box>
        ) : null}

        {probePreview && (phase === "prepared" || phase === "running" || phase === "finished") ? (
          <Box flexDirection="column" marginTop={1}>
            <Text bold>Probe preview</Text>
            <Text>{previewLine(probePreview)}</Text>
          </Box>
        ) : null}

        {prepared && (phase === "prepared" || phase === "running" || phase === "finished") ? (
          <Box flexDirection="column">
            <Text bold>
              {productMode
                ? `${actionProductLabel(variant, selectedCommand) ?? "Task"} — ready`
                : "Action draft"}
            </Text>
            {!productMode ? <Text>action_id: {prepared.action.action_id}</Text> : null}
            <Box marginTop={1}>
              <Text bold>Plan</Text>
            </Box>
            {prepared.plan.steps.map((step: ActionPlan["steps"][number]) => (
              <Text key={step.step_id}>
                - {step.title}
              </Text>
            ))}
            {!probePreview ? (
              <Box marginTop={1}>
                <Text bold>Preview</Text>
                <Text>{previewLine(prepared.preview)}</Text>
              </Box>
            ) : null}
            <Box marginTop={1}>
              <Text bold>
                {productMode
                  ? (variant?.approvalCopy[selectedCommand ?? ""]?.executeTitle ??
                    "Execution approval")
                  : "Execution approval (y=execute, n=cancel)"}
              </Text>
            </Box>
            {!productMode ? <Text>approval_id: {prepared.approval.approval_id}</Text> : null}
            <Text dimColor>{prepared.approval.material.plan_summary}</Text>
            {productMode ? (
              <Text dimColor>
                {variant?.approvalCopy[selectedCommand ?? ""]?.executePrompt ??
                  "y = start, n = cancel"}
              </Text>
            ) : null}
          </Box>
        ) : null}

        {phase === "running" && cancelRequested ? (
          <Box marginTop={1}>
            <Text color="yellow">Cancel requested; waiting for agent checkpoint</Text>
          </Box>
        ) : null}

        {phase === "running" && pendingInteraction ? (
          <Box flexDirection="column" marginTop={1} borderStyle="round" padding={1}>
            <Text bold color="magenta">
              Interaction required
            </Text>
            <Text>{pendingInteraction.title}</Text>
            <Text dimColor>{pendingInteraction.message}</Text>
            {pendingInteraction.timeout_policy ? (
              <Text dimColor>
                Timeout: {pendingInteraction.timeout_policy.timeout_seconds}s →{" "}
                {pendingInteraction.timeout_policy.on_timeout}
              </Text>
            ) : null}
            {pendingInteraction.blocks?.map((block, index) => (
              <RenderableBlockView key={`ix-block-${index}`} block={block} />
            ))}
            {pendingInteraction.choices?.length ? (
              <Box flexDirection="column" marginTop={1}>
                {pendingInteraction.choices.map((choice, index) => (
                  <Text key={choice.id}>
                    {index + 1}. {choice.label} ({choice.id})
                  </Text>
                ))}
              </Box>
            ) : null}
            {pendingInteraction.prompt_schema && interactionFields.length > 0 ? (
              <Box flexDirection="column" marginTop={1}>
                {interactionFields.map((field, index) => (
                  <FormFieldRow
                    key={`ix-${field.name}`}
                    field={field}
                    value={interactionValues[field.name]}
                    active={index === interactionFocusedField && !interactionBusy}
                    onChange={(value) =>
                      setInteractionValues((prev) => ({ ...prev, [field.name]: value }))
                    }
                  />
                ))}
              </Box>
            ) : null}
            {interactionBusy ? (
              <Text color="yellow">Sending interaction response…</Text>
            ) : null}
          </Box>
        ) : null}

        {phase === "finished" && executionOutcome === "cancelled" ? (
          <Box marginTop={1}>
            <Text color="yellow">Execution cancelled.</Text>
          </Box>
        ) : null}

        {phase === "running" || phase === "finished" ? (
          <Box flexDirection="column" marginTop={1}>
            <Text bold>Live timeline</Text>
            {events.map((event) => (
              <EventLine key={event.event_id} event={event} />
            ))}
            {phase === "finished" ? (
              <ResultBlocksPanel
                blocks={blocks}
                title={productMode ? "Results" : "Result blocks"}
                selectedArtifactBlockId={selectedArtifactBlockId}
                productMode={productMode}
                {...(variant ? { variant } : {})}
              />
            ) : (
              blocks.map((block, index) => (
                <RenderableBlockView
                  key={`${block.block_id}-${index}`}
                  block={block}
                  productMode={productMode}
                  {...(variant ? { variant } : {})}
                />
              ))
            )}
          </Box>
        ) : null}

        {phase === "replay" ? (
          <Box flexDirection="column">
            <Text bold>Replay — action_id (Enter to load)</Text>
            <TextInput
              value={replayInput}
              onChange={setReplayInput}
              onSubmit={loadReplay}
            />
            {replayEvents.map((event) => (
              <EventLine key={event.event_id} event={event} />
            ))}
            {blocks.map((block, index) => (
              <RenderableBlockView key={`replay-block-${index}`} block={block} />
            ))}
          </Box>
        ) : null}
      </Box>

      <Box flexDirection="column" borderStyle="single" marginTop={1} padding={1}>
        <Text>
          Tab: {TABS.join(" | ")} — active: <Text bold>{tab}</Text>
        </Text>
        {tab === "logs" ? (
          <Box flexDirection="column">
            {logEvents.length === 0 ? <Text dimColor>No log events</Text> : null}
            {logEvents.map((e) => (
              <EventLine key={e.event_id} event={e} />
            ))}
          </Box>
        ) : null}
        {tab === "events" ? (
          <Box flexDirection="column">
            {(phase === "replay" ? replayEvents : events).map((e) => (
              <EventLine key={e.event_id} event={e} />
            ))}
          </Box>
        ) : null}
        {tab === "json" ? <Text>{jsonPayload}</Text> : null}
        {tab === "replay" && phase !== "replay" ? (
          <Box flexDirection="column">
            <Text dimColor>Replay tab — enter action_id:</Text>
            <TextInput value={replayInput} onChange={setReplayInput} onSubmit={loadReplay} />
          </Box>
        ) : null}
      </Box>

      <Box marginTop={1}>
        <Text dimColor>
          {phase === "home"
            ? productMode
              ? "NL: Enter submit | Tab tasks | Enter select task | Esc —"
              : "Enter select | Esc —"
            : phase === "history"
              ? "Enter trace | Esc home"
              : phase === "trace"
                ? `r replay | Esc history | Ctrl+Tab JSON${
                    artifactBlocks.length ? " | ↑↓ Enter artifact" : ""
                  }`
                : phase === "artifact_view"
                  ? "Esc back"
                  : phase === "finished" && artifactBlocks.length
                    ? "↑↓ artifact | Enter open | Ctrl+Tab JSON"
                    : phase === "form"
                  ? "Tab/↑↓ field | Enter submit | Ctrl+Tab bottom tabs"
                  : phase === "running"
                    ? pendingInteraction?.choices?.length
                      ? interactionBusy
                        ? "Sending interaction response…"
                        : "1-n choose | c cancel"
                      : pendingInteraction?.prompt_schema
                        ? interactionBusy
                          ? "Sending interaction response…"
                          : "Tab/↑↓ field | Enter submit | c cancel"
                        : cancelRequested
                          ? "Cancel requested; waiting for agent checkpoint"
                          : "c cancel"
                    : phase === "prepared" || phase === "preview_approval"
                      ? "y/n approve"
                      : "Tab bottom panels"}{" "}
          | Esc back | Ctrl+C exit
        </Text>
      </Box>
    </Box>
  );
}

function FormFieldRow({
  field,
  value,
  active,
  displayLabel,
  displayHelp,
  onChange,
  onSubmitValue
}: {
  field: FormField;
  value: unknown;
  active: boolean;
  displayLabel?: string;
  displayHelp?: string;
  onChange: (value: unknown) => void;
  onSubmitValue?: (value: string) => void;
}) {
  const nameForLabel = displayLabel ?? field.name;
  const help = displayHelp ?? field.description;
  const label = `${nameForLabel}${field.required ? " *" : ""}${help ? ` — ${help}` : ""}`;

  if (field.kind === "number") {
    return (
      <Box flexDirection="column" marginBottom={1}>
        {active ? <Text color="cyan">{label}</Text> : <Text>{label}</Text>}
        {active ? (
          <TextInput
            value={String(value ?? "")}
            focus
            onChange={(v) => {
              const parsed = Number(v);
              onChange(Number.isNaN(parsed) ? v : parsed);
            }}
            onSubmit={(v) => {
              const parsed = Number(v);
              onChange(Number.isNaN(parsed) ? v : parsed);
              onSubmitValue?.(v);
            }}
          />
        ) : (
          <Text dimColor>{String(value ?? "")}</Text>
        )}
      </Box>
    );
  }

  if (field.kind === "boolean") {
    const items = [
      { label: "false", value: "false" },
      { label: "true", value: "true" }
    ];
    return (
      <Box flexDirection="column" marginBottom={1}>
        {active ? <Text color="cyan">{label}</Text> : <Text>{label}</Text>}
        {active ? (
          <SelectInput
            items={items}
            initialIndex={value ? 1 : 0}
            onSelect={(item) => onChange(item.value === "true")}
          />
        ) : (
          <Text dimColor>{String(value ?? false)}</Text>
        )}
      </Box>
    );
  }

  return (
    <Box flexDirection="column" marginBottom={1}>
      {active ? <Text color="cyan">{label}</Text> : <Text>{label}</Text>}
      {active ? (
        <TextInput
          value={String(value ?? "")}
          focus
          onChange={(v) => onChange(v)}
          onSubmit={(v) => {
            onChange(v);
            onSubmitValue?.(v);
          }}
        />
      ) : (
        <Text dimColor>{String(value ?? "") || "(empty)"}</Text>
      )}
    </Box>
  );
}

function previewLine(preview: unknown): string {
  if (typeof preview === "object" && preview && "summary" in preview) {
    return String((preview as Record<string, unknown>).summary);
  }
  return JSON.stringify(preview);
}
