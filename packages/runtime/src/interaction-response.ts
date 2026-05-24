import { validateCommandArgs, type InteractionRequest } from "@consoler/protocol";

export function validateInteractionResponse(
  request: InteractionRequest,
  response: unknown
): void {
  if (request.choices && request.choices.length > 0) {
    if (typeof response !== "string") {
      throw new Error("Interaction response must be a choice id string");
    }
    const valid = request.choices.some((choice) => choice.id === response);
    if (!valid) {
      throw new Error(`Unknown choice id: ${response}`);
    }
    return;
  }

  if (request.prompt_schema) {
    const result = validateCommandArgs(request.prompt_schema, response);
    if (!result.ok) {
      throw new Error("Interaction response failed schema validation");
    }
    return;
  }

  throw new Error("Interaction request has neither choices nor prompt_schema");
}
