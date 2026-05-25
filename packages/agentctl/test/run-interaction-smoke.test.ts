import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { describe, expect, it, afterEach } from "vitest";

import {
  cleanupTempRoot,
  createTempConformanceRoot,
  fakeAgentRegistryEntry,
  FAKE_AGENT_ID
} from "@consoler/conformance";
import { ConsolerRuntime, replayAction } from "@consoler/runtime";

import { loadJsonValue } from "../src/json-load.js";
import { NonInteractiveInteractionError } from "../src/interaction-cli.js";
import { runApprovedWithInteractions } from "../src/run-approved.js";

describe("agentctl run live interactions", () => {
  let rootDir: string;

  afterEach(() => {
    if (rootDir) {
      cleanupTempRoot(rootDir);
    }
  });

  it("completes conformance.interactive_choice with a seeded response file", async () => {
    rootDir = createTempConformanceRoot({
      agentId: FAKE_AGENT_ID,
      registryEntry: fakeAgentRegistryEntry()
    });
    const tmpDir = mkdtempSync(path.join(os.tmpdir(), "agentctl-run-ix-"));
    const argsPath = path.join(tmpDir, "args.json");
    const responsePath = path.join(tmpDir, "response.json");
    writeFileSync(argsPath, JSON.stringify({ message: "pick" }), "utf8");
    writeFileSync(responsePath, '"ok"', "utf8");

    const runtime = new ConsolerRuntime({ rootDir });
    const seeded = loadJsonValue(responsePath, tmpDir);
    const result = await runApprovedWithInteractions(
      runtime,
      {
        agentId: FAKE_AGENT_ID,
        command: "conformance.interactive_choice",
        args: { message: "pick" }
      },
      {
        approve: true,
        interactionPrompt: {
          isTTY: false,
          readLine: async () => "",
          writeStderr: () => {},
          takeSeededResponse: () => seeded
        }
      }
    );
    runtime.store.db.close();
    rmSync(tmpDir, { recursive: true, force: true });

    expect(result.run_id).toBeTruthy();
    const readRuntime = new ConsolerRuntime({ rootDir });
    const trace = readRuntime.getActionTrace(result.action_id);
    expect(trace.interactions).toHaveLength(1);
    expect(trace.interactions[0]?.status).toBe("responded");
    expect(trace.interactions[0]?.response).toBe("ok");

    const replay = replayAction(readRuntime.store, result.action_id);
    expect(replay.events.some((event) => event.type === "interaction.required")).toBe(true);
    expect(replay.events.every((event) => event.type !== "interaction.response")).toBe(true);
    readRuntime.store.db.close();
  }, 60_000);

  it("waits for runtime timeout on non-TTY when timeout_policy is set", async () => {
    rootDir = createTempConformanceRoot({
      agentId: FAKE_AGENT_ID,
      registryEntry: fakeAgentRegistryEntry()
    });
    const runtime = new ConsolerRuntime({ rootDir });
    try {
      const result = await runApprovedWithInteractions(
        runtime,
        {
          agentId: FAKE_AGENT_ID,
          command: "conformance.interactive_timeout",
          args: { message: "use_default", mode: "use_default" }
        },
        {
          approve: true,
          interactionPrompt: {
            isTTY: false,
            readLine: async () => "",
            writeStderr: () => {},
            takeSeededResponse: () => undefined
          }
        }
      );

      expect(result.run_id).toBeTruthy();
      const trace = runtime.getActionTrace(result.action_id);
      expect(trace.interactions).toHaveLength(1);
      expect(trace.interactions[0]?.timeout_triggered_at).toBeTruthy();
      expect(trace.interactions[0]?.timeout_outcome).toBe("use_default");
      expect(trace.interactions[0]?.response).toEqual({ picked: true });
    } finally {
      runtime.store.db.close();
    }
  }, 60_000);

  it("fails fast without a seeded response when stdin is not a TTY", async () => {
    rootDir = createTempConformanceRoot({
      agentId: FAKE_AGENT_ID,
      registryEntry: fakeAgentRegistryEntry()
    });
    const runtime = new ConsolerRuntime({ rootDir });
    await expect(
      runApprovedWithInteractions(
        runtime,
        {
          agentId: FAKE_AGENT_ID,
          command: "conformance.interactive_choice",
          args: { message: "pick" }
        },
        {
          approve: true,
          interactionPrompt: {
            isTTY: false,
            readLine: async () => "",
            writeStderr: () => {},
            takeSeededResponse: () => undefined
          }
        }
      )
    ).rejects.toBeInstanceOf(NonInteractiveInteractionError);
    runtime.store.db.close();
  }, 15_000);
});
