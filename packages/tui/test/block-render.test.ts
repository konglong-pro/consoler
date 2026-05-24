import { describe, expect, it } from "vitest";

import { diffLineColor } from "../src/blocks.js";

describe("diff line coloring", () => {
  it("colors unified diff prefixes", () => {
    expect(diffLineColor("@@ -1 +1 @@")).toBe("cyan");
    expect(diffLineColor("+added")).toBe("green");
    expect(diffLineColor("-removed")).toBe("red");
    expect(diffLineColor("+++ b/file")).toBeUndefined();
    expect(diffLineColor("--- a/file")).toBeUndefined();
    expect(diffLineColor(" context")).toBeUndefined();
  });
});
