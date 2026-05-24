/** Cycle focused field index for multi-field schema forms. */
export function stepFieldIndex(current: number, delta: number, fieldCount: number): number {
  if (fieldCount <= 0) return 0;
  const next = (current + delta) % fieldCount;
  return next < 0 ? next + fieldCount : next;
}
