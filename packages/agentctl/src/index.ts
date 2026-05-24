export function formatAgentctlHelp(): string {
  return [
    "consoler agentctl",
    "",
    "Commands:",
    "  discover <agent_id>",
    "  test <agent_id> [--command <name>] [--args <path>] [--approve-preview] [--approve] [--json]",
    "  plan <agent_id> <command> --args <path>",
    "  preview <agent_id> <command> --args <path> [--approve-preview]",
    "  run <agent_id> <command> --args <path> [--approve-preview] [--approve] [--interaction-response <path>]",
    "  replay <action_id>",
    "  history [--limit 20] [--command <name>] [--status <status>] [--json]",
    "  trace <action_id> [--json]",
    "",
    "Examples:",
    "  pnpm agentctl -- test indbase",
    "  pnpm agentctl -- test indbase --command indbase.doctor --args fixtures/doctor-args.json",
    "  pnpm agentctl -- discover indbase",
    "  pnpm agentctl -- run indbase indbase.doctor --args args.json --approve",
    "  pnpm agentctl -- preview indbase indbase.ingest_file --args ingest-args.json",
    "  pnpm agentctl -- run indbase indbase.ingest_file --args ingest-args.json --approve-preview --approve",
    "  pnpm agentctl -- replay act_<uuid>",
    "  pnpm agentctl -- history --limit 10",
    "  pnpm agentctl -- trace act_<uuid> --json"
  ].join("\n");
}
