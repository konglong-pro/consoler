import type { InteractionRequest, InteractionTimeoutAction } from "@consoler/protocol";

import { validateInteractionResponse } from "./interaction-response.js";

export function validateInteractionTimeoutPolicy(
  request: InteractionRequest
): string | null {
  const policy = request.timeout_policy;
  if (!policy) {
    return null;
  }
  if (
    typeof policy.timeout_seconds !== "number" ||
    !Number.isFinite(policy.timeout_seconds) ||
    policy.timeout_seconds <= 0
  ) {
    return "timeout_policy.timeout_seconds must be a positive number";
  }
  const allowed: InteractionTimeoutAction[] = ["abort", "use_default", "skip", "continue"];
  if (!allowed.includes(policy.on_timeout)) {
    return "timeout_policy.on_timeout is invalid";
  }
  if (policy.on_timeout === "use_default") {
    if (request.default_response === undefined) {
      return "timeout_policy.use_default requires default_response";
    }
    try {
      validateInteractionResponse(request, request.default_response);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return `timeout_policy.use_default requires valid default_response: ${message}`;
    }
  }
  return null;
}

export function buildTimeoutControlResponse(
  request: InteractionRequest
): { response: unknown; on_timeout: InteractionTimeoutAction } {
  const onTimeout = request.timeout_policy!.on_timeout;
  if (onTimeout === "use_default") {
    return { response: request.default_response, on_timeout: onTimeout };
  }
  if (onTimeout === "abort") {
    return { response: { timed_out: true, action: "abort" }, on_timeout: onTimeout };
  }
  return { response: { timed_out: true, action: onTimeout }, on_timeout: onTimeout };
}

export function isTimeoutControlResponse(response: unknown): boolean {
  return (
    typeof response === "object" &&
    response !== null &&
    !Array.isArray(response) &&
    (response as { timed_out?: unknown }).timed_out === true
  );
}
