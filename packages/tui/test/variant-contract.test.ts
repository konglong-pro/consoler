import { describe, expect, it } from "vitest";

import { indbaseVariant } from "../src/variants/indbase.js";
import { validateVariantAgainstManifest } from "../src/variant-validation.js";
import { indbaseSourceTrustManifestFixture } from "./fixtures/indbase-source-trust-manifest.js";

const SOURCE_TRUST_COMMANDS = [
  "indbase.doctor",
  "indbase.ingest_file",
  "indbase.search_sources",
  "indbase.doc_show",
  "indbase.review_list",
  "indbase.review_show",
  "indbase.task_list",
  "indbase.task_show",
  "indbase.error_list",
  "indbase.error_show"
] as const;

const SOURCE_TRUST_ACTION_LABELS = [
  "Check knowledge base status",
  "Import a file",
  "Search trusted sources",
  "Open document by id",
  "Review queue",
  "Review item",
  "Task list",
  "Task details",
  "Error list",
  "Error details"
] as const;

describe("Console Variant contract", () => {
  it("indbase allowedCommands and product actions are declared on the fixture manifest", () => {
    const errors = validateVariantAgainstManifest(
      indbaseVariant,
      indbaseSourceTrustManifestFixture
    );
    expect(errors).toEqual([]);
  });

  it("indbase allowedCommands are a subset of fixture command names", () => {
    const manifestCommandNames = new Set(
      indbaseSourceTrustManifestFixture.commands.map((command) => command.name)
    );
    for (const command of indbaseVariant.allowedCommands) {
      expect(manifestCommandNames.has(command)).toBe(true);
    }
  });

  it("indbase Source Trust action surface uses the walkthrough order", () => {
    expect(indbaseVariant.allowedCommands).toEqual(SOURCE_TRUST_COMMANDS);
    expect(indbaseVariant.actions.map((action) => action.command)).toEqual(
      SOURCE_TRUST_COMMANDS
    );
    expect(indbaseVariant.actions.map((action) => action.label)).toEqual(
      SOURCE_TRUST_ACTION_LABELS
    );
    expect(indbaseVariant.sessionPrefillFields).toEqual(["vault_path"]);
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
      indbaseSourceTrustManifestFixture
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
      "indbase.document_revision": "Document revision",
      "indbase.review_item": "Review item",
      "indbase.task": "Task",
      "indbase.error": "Error record",
      "indbase.doctor_report": "Doctor report"
    });
  });

  it("indbase operation trace labels are presentation-only configuration", () => {
    expect(indbaseVariant.operationTraceLabels?.domainRefs).toMatchObject({
      task_id: "Task id",
      doc_id: "Document id",
      revision_id: "Revision id"
    });
    expect(indbaseVariant.operationTraceLabels?.capabilityRefs).toMatchObject({
      provider: "Provider",
      provider_run_id: "Provider run",
      artifact_refs: "Artifact refs"
    });
  });

  it("indbase variant copy does not contain known mojibake fragments", () => {
    const payload = JSON.stringify(indbaseVariant);
    for (const fragment of [
      "妫€",
      "鐭",
      "瀵",
      "婧",
      "鈥",
      "鏂",
      "鎼",
      "瀹",
      "鍒",
      "澶",
      "姝",
      "鏍",
      "閿"
    ]) {
      expect(payload).not.toContain(fragment);
    }
  });
});
