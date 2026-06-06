import { describe, expect, it } from "vitest";

import { formatAgentctlHelp } from "../src/index.js";
import { formatArtifactViewResult } from "../src/artifact-view.js";
import type { FetchArtifactViewResult } from "@consoler/runtime";

describe("agentctl artifact-view", () => {
  it("lists artifact-view in help", () => {
    expect(formatAgentctlHelp()).toContain("artifact-view");
  });

  it("formats human output with uri, kind, title, and block summaries", () => {
    const result: FetchArtifactViewResult = {
      ok: true,
      retrieval: {
        retrieval_id: "retr_test",
        action_id: "act_test",
        agent_id: "conformance-fake",
        block_id: "conformance-artifact",
        artifact_uri: "fake://artifacts/conformance-fixture",
        kind: "conformance.fixture",
        status: "succeeded",
        error_code: null,
        error_message: null,
        requested_at: "2026-05-26T00:00:00.000Z",
        completed_at: "2026-05-26T00:00:01.000Z"
      },
      view: {
        artifact_uri: "fake://artifacts/conformance-fixture",
        kind: "conformance.fixture",
        title: "Conformance fixture artifact",
        blocks: [
          {
            block_id: "b1",
            type: "markdown",
            title: "view",
            content: "# Fixture artifact"
          }
        ]
      }
    };
    const text = formatArtifactViewResult(result);
    expect(text).toContain("fake://artifacts/conformance-fixture");
    expect(text).toContain("conformance.fixture");
    expect(text).toContain("Conformance fixture artifact");
    expect(text).toContain("markdown");
  });
});
