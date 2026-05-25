import { describe, expect, it } from "vitest";

import type { InteractionRequest } from "@consoler/protocol";

import {
  coerceFieldValue,
  DeferInteractionToRuntimeError,
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

  it("defers to runtime when stdin is not a TTY and timeout_policy is set", async () => {
    const timeoutRequest: InteractionRequest = {
      interaction_id: "ix_timeout",
      title: "Wait",
      message: "Runtime owns timeout",
      choices: [{ id: "never", label: "Never" }],
      timeout_policy: { timeout_seconds: 0.5, on_timeout: "skip" }
    };
    await expect(
      promptInteractionResponse(timeoutRequest, {
        isTTY: false,
        readLine: async () => "",
        writeStderr: () => {},
        takeSeededResponse: () => undefined
      })
    ).rejects.toBeInstanceOf(DeferInteractionToRuntimeError);
  });

  it("does not apply default_response client-side when timeout_policy is set", async () => {
    const useDefaultRequest: InteractionRequest = {
      interaction_id: "ix_use_default",
      title: "Default later",
      message: "Runtime sends default on timeout",
      prompt_schema: {
        type: "object",
        additionalProperties: false,
        required: ["picked"],
        properties: { picked: { type: "boolean" } }
      },
      default_response: { picked: true },
      timeout_policy: { timeout_seconds: 0.5, on_timeout: "use_default" }
    };
    await expect(
      promptInteractionResponse(useDefaultRequest, {
        isTTY: false,
        readLine: async () => "",
        writeStderr: () => {},
        takeSeededResponse: () => undefined
      })
    ).rejects.toBeInstanceOf(DeferInteractionToRuntimeError);
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
