import type { ConsoleVariantConfig } from "../variant-types.js";
import { indbaseVariant } from "./indbase.js";

const VARIANTS: Record<string, ConsoleVariantConfig> = {
  [indbaseVariant.id]: indbaseVariant
};

export function getVariantById(id: string): ConsoleVariantConfig | undefined {
  return VARIANTS[id];
}

export function listVariantIds(): string[] {
  return Object.keys(VARIANTS);
}

export { indbaseVariant };
