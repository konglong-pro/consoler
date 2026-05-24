import { Box, Text, useApp, useInput } from "ink";
import SelectInput from "ink-select-input";
import Spinner from "ink-spinner";
import TextInput from "ink-text-input";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { ActionEvent, ActionPlan, AgentManifest, RenderableBlock } from "@consoler/protocol";
import type { AgentCommand, ApprovalToken } from "@consoler/protocol";
import type { ActionHistoryEntry, ActionTrace } from "@consoler/runtime";
import {
  ConsolerRuntime,
  requiresPreviewApproval,
  type PreparedAction,
  type PreparedExecutionControl,
  type RuntimeEventHandlers,
  type RuntimeTerminalResult
} from "@consoler/runtime";

import { historyItemDetail, historyItemLabel } from "./history-label.js";
import { TracePanel } from "./trace-panel.js";

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
  type FormField
} from "./schema-form.js";

const AGENT_ID = "indbase";

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
  | "replay";
type TabId = "logs" | "events" | "json" | "replay";

const TABS: TabId[] = ["logs", "events", "json", "replay"];

export interface AppProps {
  replayActionId?: string;
  /** Injected runtime (tests) */
  runtime?: ConsolerRuntime;
  /** Skip agent discover and open home with this manifest (tests) */
  initialManifest?: AgentManifest;
  /** Test-only: start on trace with JSON tab without keyboard navigation */
  testTraceView?: { trace: ActionTrace; tab?: TabId };
  /** Test-only: open directly on execution approval */
  testPrepared?: PreparedAction;
}

export function App({
  replayActionId,
  runtime: runtimeProp,
  initialManifest,
  testTraceView,
  testPrepared
}: AppProps) {
  const { exit } = useApp();
  const runtime = useMemo(() => runtimeProp ?? new ConsolerRuntime(), [runtimeProp]);

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
  const [focusedField, setFocusedField] = useState(0);
  const formValuesRef = useRef<Record<string, unknown>>({});
  const submitFlushRef = useRef(false);
  const executionControlRef = useRef<PreparedExecutionControl | null>(null);
  const cancelRequestedRef = useRef(false);

  const closeExecutionControl = useCallback(() => {
    executionControlRef.current?.close();
    executionControlRef.current = null;
  }, []);

  const resetExecutionSession = useCallback(() => {
    cancelRequestedRef.current = false;
    setCancelRequested(false);
    setExecutionOutcome(null);
  }, []);

  const logEvents = useMemo(() => events.filter((e) => e.type === "log"), [events]);

  useEffect(() => {
    formValuesRef.current = formValues;
  }, [formValues]);

  useEffect(() => {
    if (testTraceView) {
      setTrace(testTraceView.trace);
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
    if (initialManifest) {
      setManifest(initialManifest);
      setPhase("home");
      return;
    }
    void bootstrap();
  }, [replayActionId, initialManifest, testPrepared, testTraceView, resetExecutionSession]);

  useEffect(() => {
    return () => {
      closeExecutionControl();
    };
  }, [closeExecutionControl]);

  const bootstrap = async () => {
    try {
      setBusy(true);
      const m = await runtime.discover(AGENT_ID);
      setManifest(m);
      setPhase("home");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const selectCommand = (commandName: string) => {
    if (!manifest) return;
    const command = manifest.commands.find((c) => c.name === commandName);
    if (!command) {
      setError(`Command not found: ${commandName}`);
      return;
    }
    const formFields = fieldsFromCommand(command);
    const defaults = defaultFormValues(formFields);
    setSelectedCommand(commandName);
    setFields(formFields);
    formValuesRef.current = defaults;
    setFormValues(defaults);
    setPreviewApproval(null);
    setProbePreview(null);
    setPrepared(null);
    resetExecutionSession();
    closeExecutionControl();
    setError(null);
    setFocusedField(0);
    setPhase("form");
  };

  const loadHistory = () => {
    try {
      setHistoryEntries(runtime.listActionHistory({ limit: 20 }));
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
        const input = { agentId: AGENT_ID, command: selectedCommand, args };
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
    [closeExecutionControl, fields, manifest, probePreview, resetExecutionSession, runtime, selectedCommand]
  );

  const approveProbePreview = async () => {
    if (!selectedCommand) return;
    setError(null);
    setBusy(true);
    try {
      const input = {
        agentId: AGENT_ID,
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
      setPhase("finished");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setPhase("prepared");
    } finally {
      closeExecutionControl();
      setBusy(false);
    }
  };

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
    if (phase === "form" && fields.length > 0) {
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
    if (key.tab && key.ctrl) {
      const idx = TABS.indexOf(tab);
      setTab(TABS[(idx + 1) % TABS.length]!);
      return;
    }
    if (key.escape) {
      setError(null);
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
        consoler TUI —{" "}
        {phase === "home"
          ? "home"
          : phase === "history"
            ? "history"
            : phase === "trace"
              ? "trace"
              : selectedCommand ?? "select command"}
      </Text>
      {busy ? (
        <Text color="yellow">
          <Spinner type="dots" /> Working...
        </Text>
      ) : null}
      {error ? <Text color="red">Error: {error}</Text> : null}

      <Box flexDirection="column" marginTop={1} flexGrow={1}>
        {phase === "boot" ? <Text>Loading manifest...</Text> : null}

        {phase === "home" ? (
          <Box flexDirection="column">
            <Text bold>Start</Text>
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
                  label: `${historyItemLabel(entry)}  ${historyItemDetail(entry)}`,
                  value: entry.action_id
                }))}
                onSelect={(item) => openTrace(item.value)}
              />
            )}
          </Box>
        ) : null}

        {phase === "trace" && trace ? (
          <Box flexDirection="column">
            <TracePanel trace={trace} />
          </Box>
        ) : null}

        {phase === "command_select" && manifest ? (
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
            <Text bold>Action form (Tab/↑↓ move field, Enter continue)</Text>
            <Text dimColor>
              Field {focusedField + 1}/{fields.length}: {fields[focusedField]?.name}
            </Text>
            {fields.map((field, index) => (
              <FormFieldRow
                key={field.name}
                field={field}
                value={formValues[field.name]}
                active={focusedField === index}
                onChange={(v) => updateField(field.name, v)}
                onSubmitValue={(v) => scheduleSubmitForm({ name: field.name, value: v })}
              />
            ))}
          </Box>
        ) : null}

        {phase === "preview_approval" && previewApproval ? (
          <Box flexDirection="column">
            <Text bold>Preview approval (y=probe, n=cancel)</Text>
            <Text>approval_id: {previewApproval.approval_id}</Text>
            <Text dimColor>{previewApproval.material.plan_summary}</Text>
            <Text dimColor>Side effects: {previewApproval.material.side_effects.join(", ")}</Text>
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
            <Text bold>Action draft</Text>
            <Text>action_id: {prepared.action.action_id}</Text>
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
              <Text bold>Execution approval (y=execute, n=cancel)</Text>
            </Box>
            <Text>approval_id: {prepared.approval.approval_id}</Text>
            <Text dimColor>{prepared.approval.material.plan_summary}</Text>
          </Box>
        ) : null}

        {phase === "running" && cancelRequested ? (
          <Box marginTop={1}>
            <Text color="yellow">Cancel requested; waiting for agent checkpoint</Text>
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
            {blocks.map((block, index) => (
              <RenderableBlockView key={`${block.block_id}-${index}`} block={block} />
            ))}
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
            ? "Enter select | Esc —"
            : phase === "history"
              ? "Enter trace | Esc home"
              : phase === "trace"
                ? "r replay | Esc history | Ctrl+Tab JSON"
                : phase === "form"
                  ? "Tab/↑↓ field | Enter submit | Ctrl+Tab bottom tabs"
                  : phase === "running"
                    ? cancelRequested
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
  onChange,
  onSubmitValue
}: {
  field: FormField;
  value: unknown;
  active: boolean;
  onChange: (value: unknown) => void;
  onSubmitValue?: (value: string) => void;
}) {
  const label = `${field.name}${field.required ? " *" : ""}${field.description ? ` — ${field.description}` : ""}`;

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
