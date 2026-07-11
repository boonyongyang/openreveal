import { describe, expect, it } from "vitest";

import { isValidSessionCode, normalizeSessionCode, sessionCodeFromPath } from "../src/lib/session-path.js";

describe("session code paths", () => {
  it("normalizes grouped lowercase entry into the eight-character code", () => {
    expect(normalizeSessionCode("arca 7423")).toBe("ARCA7423");
    expect(isValidSessionCode("ARCA7423")).toBe(true);
  });

  it("accepts lower-case receiver paths but excludes ambiguous characters", () => {
    expect(sessionCodeFromPath("/r/arca7423")).toBe("ARCA7423");
    expect(sessionCodeFromPath("/ABCD1234")).toBeNull();
  });
});
