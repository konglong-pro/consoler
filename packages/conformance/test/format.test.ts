import { describe, expect, it } from "vitest";

import { formatConformanceReport, type ConformanceReport } from "../src/index.js";

describe("formatConformanceReport", () => {
  it("renders PASS/FAIL/SKIP lines", () => {
    const report: ConformanceReport = {
      agent_id: "demo",
      root_dir: "/tmp/x",
      checks: [
        { id: "a", name: "A", status: "passed", message: "ok" },
        { id: "b", name: "B", status: "failed", message: "nope" },
        { id: "c", name: "C", status: "skipped", message: "later" }
      ],
      passed: false,
      started_at: "t0",
      ended_at: "t1"
    };
    const text = formatConformanceReport(report);
    expect(text).toContain("[PASS]");
    expect(text).toContain("[FAIL]");
    expect(text).toContain("[SKIP]");
    expect(text).toContain("FAILED");
  });
});
