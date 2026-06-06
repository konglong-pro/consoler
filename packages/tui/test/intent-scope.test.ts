import { describe, expect, it } from "vitest";

import { buildIntentScopeFromVariant } from "../src/intent-scope.js";
import { indbaseVariant } from "../src/variants/indbase.js";
import { validateVariantAgainstManifest } from "../src/variant-validation.js";
import { indbaseSourceTrustManifestFixture } from "./fixtures/indbase-source-trust-manifest.js";

describe("buildIntentScopeFromVariant", () => {
  it("maps variant actions to IntentScope with product and field hints", () => {
    const scope = buildIntentScopeFromVariant(
      indbaseSourceTrustManifestFixture,
      indbaseVariant
    );
    expect(scope.commands).toHaveLength(10);

    const doctor = scope.commands.find((entry) => entry.command === "indbase.doctor");
    expect(doctor).toMatchObject({
      agent_id: "indbase",
      product_action_id: "check_vault",
      product_label: "Check knowledge base status",
      product_description: "Run a read-only health check on a vault",
      action_hints: indbaseVariant.actions[0]!.intentHints
    });
    expect(doctor?.field_hints?.vault_path).toEqual(
      indbaseVariant.fieldLabels["indbase.doctor"]!.vault_path.intentHints
    );
    expect(doctor?.field_labels?.vault_path).toEqual({
      label: "Vault location",
      help: "Path to the indbase vault directory"
    });

    const ingest = scope.commands.find((entry) => entry.command === "indbase.ingest_file");
    expect(ingest?.field_hints?.source_path).toEqual(
      indbaseVariant.fieldLabels["indbase.ingest_file"]!.source_path.intentHints
    );
  });

  it("only includes commands allowed by the variant and present in the manifest", () => {
    const manifest = {
      ...indbaseSourceTrustManifestFixture,
      commands: indbaseSourceTrustManifestFixture.commands.filter(
        (command) => command.name === "indbase.doctor"
      )
    };
    const scope = buildIntentScopeFromVariant(manifest, indbaseVariant);
    expect(scope.commands.map((entry) => entry.command)).toEqual(["indbase.doctor"]);
  });

  it("does not include actions outside the variant agent scope", () => {
    const scope = buildIntentScopeFromVariant(indbaseSourceTrustManifestFixture, {
      ...indbaseVariant,
      actions: [
        {
          ...indbaseVariant.actions[0]!,
          agentId: "conformance-fake"
        }
      ]
    });
    expect(scope.commands).toEqual([]);
  });

  it("indbase variant validates against the Source Trust fixture manifest", () => {
    expect(
      validateVariantAgainstManifest(indbaseVariant, indbaseSourceTrustManifestFixture)
    ).toEqual([]);
  });
});
