import { describe, expect, it } from "vitest";

import type { InteractionRequest } from "@consoler/protocol";

import { validateInteractionResponse } from "../src/interaction-response.js";

describe("validateInteractionResponse", () => {
  const choiceRequest: InteractionRequest = {
    interaction_id: "ix_1",
    title: "Pick",
    message: "Choose",
    choices: [
      { id: "ok", label: "OK" },
      { id: "no", label: "No" }
    ]
  };

  it("accepts valid choice id", () => {
    expect(() => validateInteractionResponse(choiceRequest, "ok")).not.toThrow();
  });

  it("rejects unknown choice id", () => {
    expect(() => validateInteractionResponse(choiceRequest, "missing")).toThrow(/Unknown choice/);
  });

  it("validates object schema responses", () => {
    const schemaRequest: InteractionRequest = {
      interaction_id: "ix_2",
      title: "Form",
      message: "Fill in",
      prompt_schema: {
        type: "object",
        additionalProperties: false,
        required: ["name"],
        properties: {
          name: { type: "string", minLength: 1 },
          confirm: { type: "boolean" }
        }
      }
    };
    expect(() =>
      validateInteractionResponse(schemaRequest, { name: "alice", confirm: true })
    ).not.toThrow();
    expect(() => validateInteractionResponse(schemaRequest, { confirm: true })).toThrow(
      /schema validation/
    );
  });
});
