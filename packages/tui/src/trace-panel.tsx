import { Box, Text } from "ink";

import type { ActionTrace } from "@consoler/runtime";

import { EventLine } from "./blocks.js";
import { ResultBlocksPanel } from "./result-blocks-panel.js";
import type { ConsoleVariantConfig } from "./variant-types.js";

function labelFor(labels: Record<string, string> | undefined, key: string): string {
  return labels?.[key] ?? key;
}

function OperationTracePanel({
  trace,
  variant
}: {
  trace: ActionTrace;
  variant?: ConsoleVariantConfig;
}) {
  if (trace.operation_traces.length === 0) {
    return null;
  }

  const domainLabels = variant?.operationTraceLabels?.domainRefs;
  const capabilityLabels = variant?.operationTraceLabels?.capabilityRefs;

  return (
    <Box marginTop={1} flexDirection="column">
      <Text bold>Operation traces ({trace.operation_traces.length})</Text>
      {trace.operation_traces.map((operationTrace) => (
        <Box key={operationTrace.operation_id} flexDirection="column" marginBottom={1}>
          <Text>
            {operationTrace.operation_id} - {operationTrace.status ?? "unknown"}
          </Text>
          <Text dimColor>
            action_id: {operationTrace.action_id} agent_id: {operationTrace.agent_id} command:{" "}
            {operationTrace.command}
          </Text>
          {operationTrace.domain_refs && Object.keys(operationTrace.domain_refs).length > 0 ? (
            <Box flexDirection="column">
              <Text dimColor>domain_refs</Text>
              {Object.entries(operationTrace.domain_refs).map(([key, value]) => (
                <Text key={key}>
                  {labelFor(domainLabels, key)}: {value}
                </Text>
              ))}
            </Box>
          ) : null}
          {operationTrace.capability_refs?.length ? (
            <Box flexDirection="column">
              <Text dimColor>capability_refs</Text>
              {operationTrace.capability_refs.map((ref, index) => (
                <Box
                  key={`${operationTrace.operation_id}-${ref.provider}-${ref.provider_run_id}-${index}`}
                  flexDirection="column"
                >
                  <Text>
                    {labelFor(capabilityLabels, "provider")}: {ref.provider}{" "}
                    {labelFor(capabilityLabels, "status")}: {ref.status}
                  </Text>
                  <Text>
                    {labelFor(capabilityLabels, "capability_id")}: {ref.capability_id}
                  </Text>
                  <Text>
                    {labelFor(capabilityLabels, "provider_run_id")}: {ref.provider_run_id}
                  </Text>
                  {ref.job_id ? (
                    <Text>
                      {labelFor(capabilityLabels, "job_id")}: {ref.job_id}
                    </Text>
                  ) : null}
                  {ref.profile ? (
                    <Text>
                      {labelFor(capabilityLabels, "profile")}: {ref.profile}
                    </Text>
                  ) : null}
                  {ref.operation_id ? (
                    <Text>
                      {labelFor(capabilityLabels, "operation_id")}: {ref.operation_id}
                    </Text>
                  ) : null}
                  {ref.manifest_ref ? (
                    <Text>
                      {labelFor(capabilityLabels, "manifest_ref")}: {ref.manifest_ref}
                    </Text>
                  ) : null}
                  {ref.trace_ref ? (
                    <Text>
                      {labelFor(capabilityLabels, "trace_ref")}: {ref.trace_ref}
                    </Text>
                  ) : null}
                  {ref.artifact_refs?.length ? (
                    <Text>
                      {labelFor(capabilityLabels, "artifact_refs")}: {ref.artifact_refs.join(", ")}
                    </Text>
                  ) : null}
                </Box>
              ))}
            </Box>
          ) : null}
          {operationTrace.metadata && Object.keys(operationTrace.metadata).length > 0 ? (
            <Text dimColor>metadata: {JSON.stringify(operationTrace.metadata)}</Text>
          ) : null}
        </Box>
      ))}
    </Box>
  );
}

export function TracePanel({
  trace,
  selectedArtifactBlockId,
  productMode = false,
  variant
}: {
  trace: ActionTrace;
  selectedArtifactBlockId?: string | null;
  productMode?: boolean;
  variant?: ConsoleVariantConfig;
}) {
  return (
    <Box flexDirection="column">
      <Text bold>Trace - {trace.action.command}</Text>
      <Text>action_id: {trace.action.action_id}</Text>
      <Text dimColor>status: {trace.terminal_state ?? "prepared"}</Text>
      {trace.latest_run_control_error ? (
        <Text color="red">
          control_error: {trace.latest_run_control_error.code} - {trace.latest_run_control_error.message}
        </Text>
      ) : null}

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
              {run.run_id} - {run.status}
            </Text>
          ))}
        </Box>
      ) : null}

      <OperationTracePanel trace={trace} {...(variant ? { variant } : {})} />

      {trace.interactions.length ? (
        <Box marginTop={1} flexDirection="column">
          <Text bold>Interactions ({trace.interactions.length})</Text>
          {trace.interactions.map((interaction) => (
            <Box key={`${interaction.run_id}-${interaction.interaction_id}`} flexDirection="column" marginBottom={1}>
              <Text>
                {interaction.interaction_id} - {interaction.status}
              </Text>
              <Text dimColor>{interaction.request.title}</Text>
              <Text>{interaction.request.message}</Text>
              {interaction.request.timeout_policy ? (
                <Text dimColor>
                  timeout: {interaction.request.timeout_policy.timeout_seconds}s{" -> "}
                  {interaction.request.timeout_policy.on_timeout}
                </Text>
              ) : null}
              {interaction.timeout_triggered_at ? (
                <Text dimColor>
                  triggered: {interaction.timeout_triggered_at} outcome=
                  {interaction.timeout_outcome ?? "-"}
                </Text>
              ) : null}
              {interaction.redacted_paths.length ? (
                <Text dimColor>redacted_paths: {JSON.stringify(interaction.redacted_paths)}</Text>
              ) : null}
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
              [{rejected.seq ?? "?"}] {rejected.type} - {rejected.reject_reason ?? "unknown"}
            </Text>
          ))
        )}
      </Box>

      {trace.artifact_retrievals.length ? (
        <Box marginTop={1} flexDirection="column">
          <Text bold>Artifact retrievals ({trace.artifact_retrievals.length})</Text>
          {trace.artifact_retrievals.map((retrieval) => (
            <Text key={retrieval.retrieval_id}>
              {retrieval.block_id} - {retrieval.status}
              {retrieval.error_code ? ` (${retrieval.error_code})` : ""}
            </Text>
          ))}
        </Box>
      ) : null}

      <ResultBlocksPanel
        blocks={trace.result_blocks}
        title={productMode ? "Results" : "Result blocks"}
        productMode={productMode}
        {...(variant ? { variant } : {})}
        {...(selectedArtifactBlockId !== undefined && selectedArtifactBlockId !== null
          ? { selectedArtifactBlockId }
          : {})}
      />
    </Box>
  );
}
