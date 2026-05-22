export function formatAgentctlHelp(): string {
  return [
    "consoler agentctl",
    "",
    "Commands:",
    "  discover <agent_id>",
    "  plan <agent_id> <command> --args <path>",
    "  preview <agent_id> <command> --args <path> [--approve-preview]",
    "  run <agent_id> <command> --args <path> [--approve-preview] [--approve]",
    "  replay <action_id>",
    "",
    "Examples:",
    "  pnpm agentctl -- discover indbase",
    "  pnpm agentctl -- run indbase indbase.doctor --args args.json --approve",
    "  pnpm agentctl -- preview indbase indbase.ingest_file --args ingest-args.json",
    "  pnpm agentctl -- run indbase indbase.ingest_file --args ingest-args.json --approve-preview --approve",
    "  pnpm agentctl -- replay act_<uuid>"
  ].join("\n");
}
