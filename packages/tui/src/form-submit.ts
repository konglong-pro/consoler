import { validateFormValues, type FormField } from "./schema-form.js";

/** Lets Ink TextInput deliver its last onChange before we read form values. */
export const FORM_SUBMIT_FLUSH_MS = 0;

export function scheduleAfterInputFlush(fn: () => void, delayMs = FORM_SUBMIT_FLUSH_MS): void {
  setTimeout(fn, delayMs);
}

/** Merge a just-submitted field value ahead of the last React state commit. */
export function valuesForSubmit(
  stored: Record<string, unknown>,
  pending?: { name: string; value: unknown }
): Record<string, unknown> {
  if (!pending) return stored;
  return { ...stored, [pending.name]: pending.value };
}

export function validateFormForSubmit(
  fields: FormField[],
  stored: Record<string, unknown>,
  pending?: { name: string; value: unknown }
): string | null {
  return validateFormValues(fields, valuesForSubmit(stored, pending));
}
