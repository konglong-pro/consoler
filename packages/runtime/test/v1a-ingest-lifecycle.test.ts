import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";

import { indbaseManifestV1aFixture } from "@consoler/protocol";

import { buildApprovalToken, buildPreviewApprovalToken } from "../src/approval.js";
import { computePreviewHash } from "../src/plan-hash.js";

import { ConsolerRuntime } from "../src/runtime.js";
import { getCommandDef } from "../src/command-policy.js";

const ingestCommand = indbaseManifestV1aFixture.commands.find(
  (command) => command.name === "indbase.ingest_file"
)!;

describe("V1a preview approval", () => {
  let tmpRoot: string;
  let runtime: ConsolerRuntime;

  beforeEach(() => {
    tmpRoot = path.join(os.tmpdir(), `consoler-v1a-${Date.now()}`);
    mkdirSync(path.join(tmpRoot, ".consoler"), { recursive: true });
    runtime = new ConsolerRuntime({ rootDir: tmpRoot });
    runtime.store.saveManifest(indbaseManifestV1aFixture);
  });

  afterEach(() => {
    runtime.store.db.close();
    rmSync(tmpRoot, { recursive: true, force: true });
  });

  it("returns preview approval without calling agent preview", async () => {
    const spy = vi.spyOn(runtime as never, "fetchAgentPreview" as never);
    const result = await runtime.preview({
      agentId: "indbase",
      command: "indbase.ingest_file",
      args: { vault_path: "/tmp/v", source_path: "/tmp/source.txt" }
    });
    expect(result.awaiting_preview_approval).toBe(true);
    expect(result.preview_approval?.scope).toBe("preview");
    expect(spy).not.toHaveBeenCalled();
  });

  it("probe preview path does not persist actions or plans", async () => {
    const beforeActions = runtime.store.db.prepare("SELECT COUNT(*) AS c FROM actions").get() as {
      c: number;
    };
    vi.spyOn(runtime as never, "fetchAgentPreview" as never).mockResolvedValue({
      preview_kind: "probe_readonly",
      summary: "probe"
    });
    await runtime.preview(
      {
        agentId: "indbase",
        command: "indbase.ingest_file",
        args: { vault_path: "/tmp/v", source_path: "/tmp/s.txt" }
      },
      { approvePreview: true }
    );
    const afterActions = runtime.store.db.prepare("SELECT COUNT(*) AS c FROM actions").get() as {
      c: number;
    };
    const afterPlans = runtime.store.db.prepare("SELECT COUNT(*) AS c FROM plans").get() as { c: number };
    expect(afterActions.c).toBe(beforeActions.c);
    expect(afterPlans.c).toBe(0);
  });
});

describe("V1a execution approval", () => {
  it("execution approval records execute scope and preview hash", () => {
    const command = getCommandDef(indbaseManifestV1aFixture, "indbase.ingest_file");
    expect(command.preview_policy.preview_kind).toBe("probe_readonly");
    const preview = { preview_kind: "probe_readonly", summary: "probe" };
    const token = buildPreviewApprovalToken({
      manifest: indbaseManifestV1aFixture,
      commandName: "indbase.ingest_file",
      args: { vault_path: "/v", source_path: "/s" }
    });
    expect(token.scope).toBe("preview");
    expect(token.plan_hash).toBeUndefined();

    const plan = {
      plan_id: "plan_1",
      action_id: "act_1",
      agent_id: "indbase",
      command: "indbase.ingest_file",
      steps: [{ step_id: "inspect", title: "Inspect" }],
      context_snapshot_id: "snap_1",
      context_snapshot: {
        snapshot_id: "snap_1",
        kind: "composite" as const,
        summary: "vault + source",
        details: { source_content_hash: "sha256:abc" },
        created_at: new Date().toISOString()
      },
      side_effects: command.side_effects,
      created_at: new Date().toISOString()
    };
    const executeToken = buildApprovalToken({
      actionId: "act_1",
      manifest: indbaseManifestV1aFixture,
      commandName: "indbase.ingest_file",
      args: { vault_path: "/v", source_path: "/s" },
      plan,
      preview
    });
    expect(executeToken.scope).toBe("execute");
    expect(executeToken.preview_hash).toBe(computePreviewHash(preview));
  });
});

describe("V1a source context drift", () => {
  let tmpRoot: string;
  let sourceFile: string;

  beforeEach(() => {
    tmpRoot = path.join(os.tmpdir(), `consoler-v1a-src-${Date.now()}`);
    mkdirSync(tmpRoot, { recursive: true });
    sourceFile = path.join(tmpRoot, "source.txt");
    writeFileSync(sourceFile, "version-one\n");
  });

  afterEach(() => {
    rmSync(tmpRoot, { recursive: true, force: true });
  });

  it("detects source file content changes", async () => {
    const { buildContextSnapshot, contextDrift } = await import("../src/context-snapshot.js");
    const manifest = indbaseManifestV1aFixture;
    const entry = {
      agent_id: "indbase",
      name: "indbase",
      cwd: tmpRoot,
      command: "uv",
      args: [],
      enabled: true
    };
    const before = buildContextSnapshot({
      entry,
      manifest,
      args: { vault_path: tmpRoot, source_path: sourceFile }
    });
    writeFileSync(sourceFile, "version-two\n");
    const after = buildContextSnapshot({
      entry,
      manifest,
      args: { vault_path: tmpRoot, source_path: sourceFile }
    });
    expect(contextDrift(before, after)).toBe(true);
  });
});
