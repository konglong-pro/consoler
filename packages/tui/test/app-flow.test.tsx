import { describe, expect, it } from "vitest";

import { indbaseManifestFixture } from "@consoler/protocol";

import { blocksFromEvents } from "../src/blocks.js";
import {
  validateFormForSubmit,
  valuesForSubmit
} from "../src/form-submit.js";
import { defaultFormValues, fieldsFromCommand, validateFormValues } from "../src/schema-form.js";

describe("TUI flow helpers", () => {
  it("form defaults include hard_only false", () => {
    const fields = fieldsFromCommand(indbaseManifestFixture.commands[0]!);
    const values = defaultFormValues(fields);
    expect(values.hard_only).toBe(false);
    expect(values.vault_path).toBe("");
  });

  it("submit flush merges pending vault_path before validation", () => {
    const fields = fieldsFromCommand(indbaseManifestFixture.commands[0]!);
    const stored = defaultFormValues(fields);
    expect(validateFormValues(fields, stored)).toMatch(/vault_path/);
    expect(
      validateFormForSubmit(fields, stored, {
        name: "vault_path",
        value: "E:\\consoler\\fixtures\\sample-vault"
      })
    ).toBeNull();
    expect(
      valuesForSubmit(stored, { name: "vault_path", value: "E:\\consoler\\fixtures\\sample-vault" })
        .vault_path
    ).toBe("E:\\consoler\\fixtures\\sample-vault");
  });

  it("result blocks come from terminal succeeded event", () => {
    const blocks = blocksFromEvents([
      {
        event_id: "e1",
        run_id: "r1",
        action_id: "a1",
        agent_id: "indbase",
        command: "indbase.doctor",
        type: "action.started",
        seq: 1,
        epoch: 0,
        timestamp: "t"
      },
      {
        event_id: "e2",
        run_id: "r1",
        action_id: "a1",
        agent_id: "indbase",
        command: "indbase.doctor",
        type: "action.succeeded",
        seq: 2,
        epoch: 0,
        timestamp: "t",
        blocks: [
          {
            block_id: "b1",
            type: "markdown",
            content: "# ok"
          }
        ]
      }
    ]);
    expect(blocks).toHaveLength(1);
    expect(blocks[0]?.type).toBe("markdown");
  });

});
