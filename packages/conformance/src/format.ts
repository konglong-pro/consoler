import type { ConformanceCheck, ConformanceReport } from "./types.js";

function statusLabel(status: ConformanceCheck["status"]): string {
  if (status === "passed") return "PASS";
  if (status === "failed") return "FAIL";
  return "SKIP";
}

export function formatConformanceReport(report: ConformanceReport): string {
  const lines = [
    `Conformance for agent ${report.agent_id}`,
    `Root: ${report.root_dir}`,
    report.command ? `Command: ${report.command}` : "Command: (none — safe default checks only)",
    "",
    ...report.checks.map(
      (check) =>
        `[${statusLabel(check.status)}] ${check.id} — ${check.name}: ${check.message}${
          check.detail ? `\n    ${check.detail}` : ""
        }`
    ),
    "",
    `Result: ${report.passed ? "PASSED" : "FAILED"} (${report.checks.filter((c) => c.status === "failed").length} failed, ${report.checks.filter((c) => c.status === "skipped").length} skipped)`
  ];
  return lines.join("\n");
}
