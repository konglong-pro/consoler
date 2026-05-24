import { describe, expect, it } from "vitest";

import type { InteractionRequest } from "@consoler/protocol";

import {
  coerceFieldValue,
  fieldsFromObjectSchema,
  isSupportedInteractionRequest,
  parseChoiceInput,
  promptInteractionResponse,
  NonInteractiveInteractionError,
  unsupportedInteractionMessage
} from "../src/interaction-cli.js";

describe("interaction-cli", () => {
  const choiceRequest: InteractionRequest = {
    interaction_id: "ix_choice",
    title: "Pick",
    message: "Choose one",
    choices: [
      { id: "ok", label: "OK" },
      { id: "alt", label: "Alternate" }
    ]
  };

  it("maps choice numbers and ids", () => {
    expect(parseChoiceInput("1", choiceRequest.choices!)).toBe("ok");
    expect(parseChoiceInput("2", choiceRequest.choices!)).toBe("alt");
    expect(parseChoiceInput("ok", choiceRequest.choices!)).toBe("ok");
  });

  it("coerces object schema field values", () => {
    expect(coerceFieldValue("yes", "boolean")).toBe(true);
    expect(coerceFieldValue("42", "number")).toBe(42);
    expect(coerceFieldValue("hello", "string")).toBe("hello");
  });

  it("rejects unsupported interaction schemas", () => {
    const unsupported: InteractionRequest = {
      interaction_id: "ix_bad",
      title: "Bad",
      message: "Unsupported",
      prompt_schema: {
        type: "object",
        properties: {
          nested: { type: "object" }
        }
      }
    };
    expect(isSupportedInteractionRequest(unsupported)).toBe(false);
    expect(unsupportedInteractionMessage()).toMatch(/--interaction-response/);
  });

  it("fails fast when stdin is not a TTY and no seeded response exists", async () => {
    await expect(
      promptInteractionResponse(choiceRequest, {
        isTTY: false,
        readLine: async () => "",
        writeStderr: () => {},
        takeSeededResponse: () => undefined
      })
    ).rejects.toBeInstanceOf(NonInteractiveInteractionError);
  });

  it("uses seeded responses without prompting", async () => {
    const response = await promptInteractionResponse(choiceRequest, {
      isTTY: false,
      readLine: async () => {
        throw new Error("should not prompt");
      },
      writeStderr: () => {},
      takeSeededResponse: () => "ok"
    });
    expect(response).toBe("ok");
  });

  it("builds supported object schema fields", () => {
    const fields = fieldsFromObjectSchema({
      type: "object",
      required: ["name", "confirm"],
      properties: {
        name: { type: "string" },
        confirm: { type: "boolean" },
        count: { type: "integer" }
      }
    });
    expect(fields.map((field) => field.kind)).toEqual(["string", "boolean", "number"]);
  });
});
