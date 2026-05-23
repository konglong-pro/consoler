import { describe, expect, it } from "vitest";

import type { ActionHistoryEntry } from "@consoler/runtime";

import { historyItemDetail, historyItemLabel } from "../src/history-label.js";

const sampleEntry: ActionHistoryEntry = {
  action_id: "act_sample_12345678",
  agent_id: "indbase",
  command: "indbase.ingest_file",
  created_at: "2026-05-01T00:00:00.000Z",
  status: "succeeded",
  args_summary: "vault_path=/tmp, source_path=/src",
  latest_run_id: "run_sample_99",
  latest_run_status: "succeeded",
  accepted_event_count: 8,
  rejected_event_count: 1,
  has_plan: true,
  has_context: true,
  has_approval: true,
  terminal_state: "succeeded"
};

describe("history labels", () => {
  it("renders command, short id, status, and event counts", () => {
    const label = historyItemLabel(sampleEntry);
    expect(label).toContain("indbase.ingest_file");
    expect(label).toContain("succeeded");
    expect(label).toContain("+8/-1");
    expect(label).toContain("12345678");
  });

  it("renders created time and args summary", () => {
    expect(historyItemDetail(sampleEntry)).toContain("vault_path=/tmp");
    expect(historyItemDetail(sampleEntry)).toContain("2026-05-01");
  });
});
