import { describe, expect, it } from "vitest";

import { indbaseManifestFixture } from "@consoler/protocol";

import {
  defaultFormValues,
  fieldsFromCommand,
  validateFormValues
} from "../src/schema-form.js";

describe("schema form", () => {
  const command = indbaseManifestFixture.commands[0]!;

  it("renders vault_path and hard_only from manifest schema", () => {
    const fields = fieldsFromCommand(command);
    expect(fields.map((f) => f.name)).toEqual(["vault_path", "hard_only"]);
    expect(fields.find((f) => f.name === "vault_path")?.kind).toBe("string");
    expect(fields.find((f) => f.name === "hard_only")?.kind).toBe("boolean");
  });

  it("validates required vault_path", () => {
    const fields = fieldsFromCommand(command);
    const values = defaultFormValues(fields);
    expect(validateFormValues(fields, values)).toMatch(/vault_path/);
    values.vault_path = "E:\\vault";
    expect(validateFormValues(fields, values)).toBeNull();
  });
});
