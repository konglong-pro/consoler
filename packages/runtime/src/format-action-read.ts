import type { ActionHistoryEntry, ActionTrace } from "./action-read-types.js";
import { shortActionId } from "./action-read.js";
import { summarizeRenderableBlock } from "./format-block.js";

function formatRecord(record: Record<string, string>): string {
  return Object.entries(record)
    .map(([key, value]) => `${key}=${value}`)
    .join(", ");
}

export function formatActionHistory(entries: ActionHistoryEntry[]): string {
  if (entries.length === 0) {
    return "No actions in history.";
  }
  const lines = ["Recent actions:", ""];
  for (const entry of entries) {
    lines.push(
      `${shortActionId(entry.action_id)}  ${entry.command}  ${entry.status}  run=${entry.latest_run_id ?? "-"}`
    );
    lines.push(
      `  created=${entry.created_at}  events=${entry.accepted_event_count}/${entry.rejected_event_count} rejected`
    );
    lines.push(`  args: ${entry.args_summary}`);
    if (entry.has_plan || entry.has_context || entry.has_approval || entry.interaction_count > 0) {
      lines.push(
        `  artifacts: plan=${entry.has_plan} context=${entry.has_context} approval=${entry.has_approval} interactions=${entry.interaction_count}`
      );
    }
    lines.push("");
  }
  return lines.join("\n").trimEnd();
}

export function formatActionTrace(trace: ActionTrace): string {
  const lines = [
    `Trace for action ${trace.action.action_id}`,
    `Command: ${trace.action.command} (${trace.action.agent_id})`,
    `Created: ${trace.action.created_at}`,
    `Status: ${trace.terminal_state ?? "prepared"}`,
    ...(trace.latest_run_control_error
      ? [
          `Control error: ${trace.latest_run_control_error.code} — ${trace.latest_run_control_error.message}`,
          ...(trace.latest_run_control_error.at
            ? [`Control error at: ${trace.latest_run_control_error.at}`]
            : [])
        ]
      : []),
    ""
  ];

  lines.push("Args:");
  lines.push(`  ${JSON.stringify(trace.action.args)}`);
  lines.push("");

  if (trace.plan) {
    lines.push(`Plan (${trace.plan.plan_hash.slice(0, 12)}…):`);
    for (const step of trace.plan.plan.steps) {
      lines.push(`  - ${step.title}`);
    }
    lines.push("");
  }

  if (trace.context) {
    lines.push(`Context (${trace.context.snapshot_hash.slice(0, 12)}…): ${trace.context.snapshot.summary}`);
    lines.push("");
  }

  if (trace.approvals.length) {
    lines.push("Approvals:");
    for (const approval of trace.approvals) {
      lines.push(`  ${approval.approval_id} scope=${approval.scope}`);
      lines.push(`    ${approval.material.plan_summary}`);
    }
    lines.push("");
  }

  if (trace.runs.length) {
    lines.push("Runs:");
    for (const run of trace.runs) {
      lines.push(
        `  ${run.run_id} status=${run.status} started=${run.started_at}${run.ended_at ? ` ended=${run.ended_at}` : ""}${run.control_error ? ` control_error=${run.control_error.code}` : ""}`
      );
      if (run.control_error) {
        lines.push(`    ${run.control_error.message}`);
      }
    }
    lines.push("");
  }

  if (trace.operation_traces.length) {
    lines.push(`Operation traces (${trace.operation_traces.length}):`);
    for (const operationTrace of trace.operation_traces) {
      lines.push(
        `  ${operationTrace.operation_id} status=${operationTrace.status ?? "-"} action=${operationTrace.action_id}`
      );
      lines.push(`    agent=${operationTrace.agent_id} command=${operationTrace.command}`);
      if (operationTrace.domain_refs && Object.keys(operationTrace.domain_refs).length > 0) {
        lines.push(`    domain_refs: ${formatRecord(operationTrace.domain_refs)}`);
      }
      if (operationTrace.capability_refs?.length) {
        lines.push(`    capability_refs (${operationTrace.capability_refs.length}):`);
        for (const ref of operationTrace.capability_refs) {
          lines.push(
            `      provider=${ref.provider} capability_id=${ref.capability_id} provider_run_id=${ref.provider_run_id} status=${ref.status}`
          );
          const details = [
            ref.job_id ? `job_id=${ref.job_id}` : null,
            ref.profile ? `profile=${ref.profile}` : null,
            ref.operation_id ? `operation_id=${ref.operation_id}` : null,
            ref.manifest_ref ? `manifest_ref=${ref.manifest_ref}` : null,
            ref.trace_ref ? `trace_ref=${ref.trace_ref}` : null
          ].filter((item): item is string => item !== null);
          if (details.length) {
            lines.push(`        ${details.join(" ")}`);
          }
          if (ref.artifact_refs?.length) {
            lines.push(`        artifact_refs: ${ref.artifact_refs.join(", ")}`);
          }
        }
      }
      if (operationTrace.metadata && Object.keys(operationTrace.metadata).length > 0) {
        lines.push(`    metadata: ${JSON.stringify(operationTrace.metadata)}`);
      }
    }
    lines.push("");
  }

  lines.push(`Accepted events (${trace.accepted_events.length}):`);
  for (const event of trace.accepted_events) {
    lines.push(`  [${event.seq}] ${event.type}${event.message ? `: ${event.message}` : ""}`);
  }
  lines.push("");

  if (trace.interactions.length) {
    lines.push(`Interactions (${trace.interactions.length}):`);
    for (const interaction of trace.interactions) {
      lines.push(
        `  ${interaction.interaction_id} status=${interaction.status} title=${interaction.request.title}`
      );
      lines.push(`    message: ${interaction.request.message}`);
      lines.push(`    requested_at=${interaction.requested_at}`);
      if (interaction.responded_at) {
        lines.push(`    responded_at=${interaction.responded_at}`);
      }
      if (interaction.closed_at) {
        lines.push(`    closed_at=${interaction.closed_at}`);
      }
      if (interaction.request.timeout_policy) {
        const policy = interaction.request.timeout_policy;
        lines.push(
          `    timeout_policy: ${policy.timeout_seconds}s on_timeout=${policy.on_timeout}`
        );
      }
      if (interaction.timeout_triggered_at) {
        lines.push(
          `    timeout_triggered_at=${interaction.timeout_triggered_at} outcome=${interaction.timeout_outcome ?? "-"}`
        );
      }
      if (interaction.redacted_paths.length) {
        lines.push(`    redacted_paths: ${JSON.stringify(interaction.redacted_paths)}`);
      }
      if (interaction.response !== null) {
        lines.push(`    response: ${JSON.stringify(interaction.response)}`);
      }
    }
    lines.push("");
  }

  lines.push(`Rejected events (${trace.rejected_events.length}):`);
  for (const rejected of trace.rejected_events) {
    lines.push(
      `  [${rejected.seq ?? "?"}] ${rejected.type} reason=${rejected.reject_reason ?? "unknown"}`
    );
  }
  lines.push("");

  if (trace.artifact_retrievals.length) {
    lines.push(`Artifact retrievals (${trace.artifact_retrievals.length}):`);
    for (const retrieval of trace.artifact_retrievals) {
      lines.push(
        `  ${retrieval.retrieval_id} block=${retrieval.block_id} status=${retrieval.status} uri=${retrieval.artifact_uri} kind=${retrieval.kind}`
      );
      if (retrieval.error_code) {
        lines.push(`    error=${retrieval.error_code}: ${retrieval.error_message ?? ""}`);
      }
      lines.push(`    requested_at=${retrieval.requested_at} completed_at=${retrieval.completed_at ?? "-"}`);
    }
    lines.push("");
  }

  if (trace.result_blocks.length) {
    lines.push(`Result blocks (${trace.result_blocks.length}):`);
    for (const block of trace.result_blocks) {
      lines.push(`  ${summarizeRenderableBlock(block)}`);
    }
  }

  return lines.join("\n").trimEnd();
}
