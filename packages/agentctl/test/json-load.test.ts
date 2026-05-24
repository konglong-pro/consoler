import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { describe, expect, it, afterEach } from "vitest";

import { loadArgsFile, loadJsonValue } from "../src/json-load.js";

describe("json-load", () => {
  let tmpDir: string;

  afterEach(() => {
    if (tmpDir) {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("loads primitive JSON values", () => {
    tmpDir = mkdtempSync(path.join(os.tmpdir(), "agentctl-json-"));
    const filePath = path.join(tmpDir, "response.json");
    writeFileSync(filePath, '"ok"', "utf8");
    expect(loadJsonValue(filePath, tmpDir)).toBe("ok");
  });

  it("requires args files to be JSON objects", () => {
    tmpDir = mkdtempSync(path.join(os.tmpdir(), "agentctl-json-"));
    const filePath = path.join(tmpDir, "args.json");
    writeFileSync(filePath, '"not-an-object"', "utf8");
    expect(() => loadArgsFile(filePath, tmpDir)).toThrow(/JSON object/);
  });
});
