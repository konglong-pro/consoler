export function formatAgentctlHelp(): string {
  return [
    "consoler agentctl",
    "",
    "Commands:",
    "  discover <agent_id>",
    "  plan <agent_id> <command> --args <path>",
    "  preview <agent_id> <command> --args <path>",
    "  run <agent_id> <command> --args <path> [--approve]",
    "  replay <action_id>",
    "",
    "Examples:",
    "  pnpm agentctl -- discover indbase",
    "  pnpm agentctl -- run indbase indbase.doctor --args args.json --approve",
    "  pnpm agentctl -- replay act_<uuid>"
  ].join("\n");
}
