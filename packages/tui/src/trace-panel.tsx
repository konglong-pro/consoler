import { Box, Text } from "ink";

import type { ActionTrace } from "@consoler/runtime";

import { EventLine, RenderableBlockView } from "./blocks.js";

export function TracePanel({ trace }: { trace: ActionTrace }) {
  return (
    <Box flexDirection="column">
      <Text bold>Trace — {trace.action.command}</Text>
      <Text>action_id: {trace.action.action_id}</Text>
      <Text dimColor>status: {trace.terminal_state ?? "prepared"}</Text>

      <Box marginTop={1} flexDirection="column">
        <Text bold>Args</Text>
        <Text>{JSON.stringify(trace.action.args)}</Text>
      </Box>

      {trace.plan ? (
        <Box marginTop={1} flexDirection="column">
          <Text bold>Plan</Text>
          {trace.plan.plan.steps.map((step) => (
            <Text key={step.step_id}>- {step.title}</Text>
          ))}
        </Box>
      ) : null}

      {trace.context ? (
        <Box marginTop={1} flexDirection="column">
          <Text bold>Context</Text>
          <Text>{trace.context.snapshot.summary}</Text>
        </Box>
      ) : null}

      {trace.approvals.length ? (
        <Box marginTop={1} flexDirection="column">
          <Text bold>Approvals</Text>
          {trace.approvals.map((approval) => (
            <Text key={approval.approval_id}>
              {approval.approval_id} ({approval.scope})
            </Text>
          ))}
        </Box>
      ) : null}

      {trace.runs.length ? (
        <Box marginTop={1} flexDirection="column">
          <Text bold>Runs</Text>
          {trace.runs.map((run) => (
            <Text key={run.run_id}>
              {run.run_id} — {run.status}
            </Text>
          ))}
        </Box>
      ) : null}

      {trace.interactions.length ? (
        <Box marginTop={1} flexDirection="column">
          <Text bold>Interactions ({trace.interactions.length})</Text>
          {trace.interactions.map((interaction) => (
            <Box key={`${interaction.run_id}-${interaction.interaction_id}`} flexDirection="column" marginBottom={1}>
              <Text>
                {interaction.interaction_id} — {interaction.status}
              </Text>
              <Text dimColor>{interaction.request.title}</Text>
              <Text>{interaction.request.message}</Text>
              {interaction.response !== null ? (
                <Text>response: {JSON.stringify(interaction.response)}</Text>
              ) : null}
            </Box>
          ))}
        </Box>
      ) : null}

      <Box marginTop={1} flexDirection="column">
        <Text bold>Accepted events ({trace.accepted_events.length})</Text>
        {trace.accepted_events.map((event) => (
          <EventLine key={event.event_id} event={event} />
        ))}
      </Box>

      <Box marginTop={1} flexDirection="column">
        <Text bold>Rejected events ({trace.rejected_events.length})</Text>
        {trace.rejected_events.length === 0 ? (
          <Text dimColor>None</Text>
        ) : (
          trace.rejected_events.map((rejected) => (
            <Text key={rejected.id}>
              [{rejected.seq ?? "?"}] {rejected.type} — {rejected.reject_reason ?? "unknown"}
            </Text>
          ))
        )}
      </Box>

      {trace.result_blocks.length ? (
        <Box marginTop={1} flexDirection="column">
          <Text bold>Result blocks</Text>
          {trace.result_blocks.map((block, index) => (
            <RenderableBlockView key={`${block.block_id}-${index}`} block={block} />
          ))}
        </Box>
      ) : null}
    </Box>
  );
}
