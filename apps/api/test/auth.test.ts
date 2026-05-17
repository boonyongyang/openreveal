import { describe, expect, it } from "vitest";

import { createPerformerToken, verifyPerformerToken } from "../src/auth.js";

describe("performer token", () => {
  it("verifies tokens signed by the same secret", () => {
    const token = createPerformerToken("secret", 60);
    expect(verifyPerformerToken(token, "secret")).toBe(true);
    expect(verifyPerformerToken(token, "wrong")).toBe(false);
  });
});
