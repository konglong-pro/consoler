import type { AgentCommand, AgentManifest, PreviewPolicy } from "@consoler/protocol";

export function getCommandDef(manifest: AgentManifest, commandName: string): AgentCommand {
  const command = manifest.commands.find((item) => item.name === commandName);
  if (!command) {
    throw new Error(`Unknown command: ${commandName}`);
  }
  return command;
}

export function previewPolicy(command: AgentCommand): PreviewPolicy {
  return command.preview_policy;
}

export function requiresPreviewApproval(command: AgentCommand): boolean {
  return command.preview_policy.requires_approval_before_preview;
}

export function isProbeReadonlyPreview(command: AgentCommand): boolean {
  return command.preview_policy.preview_kind === "probe_readonly";
}

export function isStaticPreview(command: AgentCommand): boolean {
  return command.preview_policy.preview_kind === "static";
}
