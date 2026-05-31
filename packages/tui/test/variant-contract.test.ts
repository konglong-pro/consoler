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

  it("indbase artifact kinds have product labels", () => {
    expect(indbaseVariant.artifactKindLabels).toMatchObject({
      "indbase.ingest_run": "File import run",
      "indbase.document": "Knowledge base document",
      "indbase.document_revision": "Document revision"
    });
  });
});
