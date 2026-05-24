import { describe, expect, it } from "vitest";

import { stepFieldIndex } from "../src/form-nav.js";

describe("form field navigation", () => {
  it("steps forward and wraps", () => {
    expect(stepFieldIndex(0, 1, 2)).toBe(1);
    expect(stepFieldIndex(1, 1, 2)).toBe(0);
  });

  it("steps backward and wraps", () => {
    expect(stepFieldIndex(0, -1, 2)).toBe(1);
    expect(stepFieldIndex(1, -1, 2)).toBe(0);
  });
});
