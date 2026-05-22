import { Box, Text, useApp, useInput } from "ink";
import SelectInput from "ink-select-input";
import Spinner from "ink-spinner";
import TextInput from "ink-text-input";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { ActionEvent, ActionPlan, AgentManifest, RenderableBlock } from "@consoler/protocol";
import {
  ConsolerRuntime,
  type PreparedAction,
  type RuntimeEventHandlers
} from "@consoler/runtime";

import { blocksFromEvents, EventLine, RenderableBlockView } from "./blocks.js";
import {
  scheduleAfterInputFlush,
  validateFormForSubmit,
  valuesForSubmit
} from "./form-submit.js";
import {
  defaultFormValues,
  fieldsFromCommand,
  type FormField
} from "./schema-form.js";

const AGENT_ID = "indbase";
const COMMAND = "indbase.doctor";

type Phase = "boot" | "form" | "prepared" | "running" | "finished" | "replay";
type TabId = "logs" | "events" | "json" | "replay";

const TABS: TabId[] = ["logs", "events", "json", "replay"];

export interface AppProps {
  replayActionId?: string;
}

export function App({ replayActionId }: AppProps) {
  const { exit } = useApp();
  const runtime = useMemo(() => new ConsolerRuntime(), []);

  const [phase, setPhase] = useState<Phase>(replayActionId ? "replay" : "boot");
  const [tab, setTab] = useState<TabId>("events");
  const [manifest, setManifest] = useState<AgentManifest | null>(null);
  const [fields, setFields] = useState<FormField[]>([]);
  const [formValues, setFormValues] = useState<Record<string, unknown>>({});
  const [prepared, setPrepared] = useState<PreparedAction | null>(null);
  const [events, setEvents] = useState<ActionEvent[]>([]);
  const [blocks, setBlocks] = useState<RenderableBlock[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [replayInput, setReplayInput] = useState(replayActionId ?? "");
  const [replayEvents, setReplayEvents] = useState<ActionEvent[]>([]);
  const [focusedField, setFocusedField] = useState(0);
  const formValuesRef = useRef<Record<string, unknown>>({});
  const submitFlushRef = useRef(false);

  const logEvents = useMemo(() => events.filter((e) => e.type === "log"), [events]);

  useEffect(() => {
    formValuesRef.current = formValues;
  }, [formValues]);

  useEffect(() => {
    if (replayActionId) {
      loadReplay(replayActionId);
      return;
    }
    void bootstrap();
  }, [replayActionId]);

  const bootstrap = async () => {
    try {
      setBusy(true);
      const m = await runtime.discover(AGENT_ID);
      const command = m.commands.find((c) => c.name === COMMAND);
      if (!command) throw new Error(`Command not found: ${COMMAND}`);
      const formFields = fieldsFromCommand(command);
      const defaults = defaultFormValues(formFields);
      setManifest(m);
      setFields(formFields);
      formValuesRef.current = defaults;
      setFormValues(defaults);
      setPhase("form");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
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
      const args = valuesForSubmit(formValuesRef.current, pending);
      const validationError = validateFormForSubmit(fields, formValuesRef.current, pending);
      if (validationError) {
        setError(validationError);
        return;
      }
      setError(null);
      setBusy(true);
      try {
        const bundle = await runtime.prepareAction({
          agentId: AGENT_ID,
          command: COMMAND,
          args
        });
      setPrepared(bundle);
      setEvents([]);
      setBlocks([]);
      setPhase("prepared");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      } finally {
        setBusy(false);
      }
    },
    [fields, runtime]
  );

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
    setPhase("running");
    const handlers: RuntimeEventHandlers = {
      onEvent: (event: ActionEvent) => {
        setEvents((prev) => [...prev, event]);
      }
    };
    try {
      const terminal = await runtime.executePrepared(prepared, handlers);
      setBlocks(blocksFromEvents(terminal.events));
      setPhase("finished");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setPhase("prepared");
    } finally {
      setBusy(false);
    }
  };

  const cancelApproval = () => {
    setPrepared(null);
    setPhase("form");
    setError(null);
  };

  useInput((input, key) => {
    if (key.ctrl && input === "c") {
      exit();
      return;
    }
    if (key.tab) {
      const idx = TABS.indexOf(tab);
      setTab(TABS[(idx + 1) % TABS.length]!);
      return;
    }
    if (key.escape) {
      setError(null);
      return;
    }
    if (phase === "form" && key.return) {
      scheduleSubmitForm();
      return;
    }
    if (phase === "prepared" && input === "y" && !busy) {
      void approve();
      return;
    }
    if (phase === "prepared" && input === "n") {
      cancelApproval();
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
  }, [tab, phase, formValues, prepared, events, replayInput, replayEvents]);

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="green">
        consoler TUI — {COMMAND}
      </Text>
      {busy ? (
        <Text color="yellow">
          <Spinner type="dots" /> Working...
        </Text>
      ) : null}
      {error ? <Text color="red">Error: {error}</Text> : null}

      <Box flexDirection="column" marginTop={1} flexGrow={1}>
        {phase === "boot" ? <Text>Loading manifest...</Text> : null}

        {phase === "form" ? (
          <Box flexDirection="column">
            <Text bold>Action form (Enter to prepare)</Text>
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
            <Box marginTop={1}>
              <Text bold>Static preview</Text>
            </Box>
            <Text>{previewLine(prepared.preview)}</Text>
            <Box marginTop={1}>
              <Text bold>Approval (y=execute, n=cancel)</Text>
            </Box>
            <Text>approval_id: {prepared.approval.approval_id}</Text>
            <Text dimColor>{prepared.approval.material.plan_summary}</Text>
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
        Tab switch | Enter prepare/submit replay | y approve | n cancel | Esc clear error | Ctrl+C
        exit
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
        <SelectInput
          items={items}
          initialIndex={value ? 1 : 0}
          onSelect={(item) => onChange(item.value === "true")}
        />
      </Box>
    );
  }

  return (
    <Box flexDirection="column" marginBottom={1}>
      {active ? <Text color="cyan">{label}</Text> : <Text>{label}</Text>}
      <TextInput
        value={String(value ?? "")}
        focus={active}
        onChange={(v) => onChange(v)}
        onSubmit={(v) => {
          onChange(v);
          onSubmitValue?.(v);
        }}
      />
    </Box>
  );
}

function previewLine(preview: unknown): string {
  if (typeof preview === "object" && preview && "summary" in preview) {
    return String((preview as Record<string, unknown>).summary);
  }
  return JSON.stringify(preview);
}
