import { describe, expect, it } from "vitest";

import { indbaseManifestV1aFixture } from "@consoler/protocol";

import { indbaseVariant } from "../src/variants/indbase.js";
import { validateVariantAgainstManifest } from "../src/variant-validation.js";

describe("Console Variant contract", () => {
  it("indbase allowedCommands and product actions are declared on the fixture manifest", () => {
    const errors = validateVariantAgainstManifest(indbaseVariant, indbaseManifestV1aFixture);
    expect(errors).toEqual([]);
  });

  it("indbase allowedCommands are a subset of fixture command names", () => {
    const manifestCommandNames = new Set(
      indbaseManifestV1aFixture.commands.map((command) => command.name)
    );
    for (const command of indbaseVariant.allowedCommands) {
      expect(manifestCommandNames.has(command)).toBe(true);
    }
  });

  it("rejects product actions outside the variant agent scope", () => {
    const errors = validateVariantAgainstManifest(
      {
        ...indbaseVariant,
        actions: [
          {
            ...indbaseVariant.actions[0]!,
            agentId: "conformance-fake"
          }
        ]
      },
      indbaseManifestV1aFixture
    );
    expect(errors).toContain(
      "product action check_vault uses conformance-fake, which is not listed in allowedAgentIds"
    );
    expect(errors).toContain(
      "product action check_vault uses conformance-fake, but manifest agent is indbase"
    );
  });

  it("indbase artifact kinds have product labels", () => {
    expect(indbaseVariant.artifactKindLabels).toMatchObject({
      "indbase.ingest_run": "File import run",
      "indbase.document": "Knowledge base document",
      "indbase.document_revision": "Document revision"
    });
  });
});
