import { describe, expect, it } from "vitest";

import { formatConnectionState } from "../src/lib/status.js";
import { receiverRetryDelayMs } from "../src/routes/receiver-route.js";

describe("formatConnectionState", () => {
  it("formats the canonical receiver states", () => {
    expect(formatConnectionState("foregrounded")).toBe("Foregrounded");
    expect(formatConnectionState("backgrounded")).toBe("Backgrounded");
    expect(formatConnectionState("connecting")).toBe("Connecting");
    expect(formatConnectionState("disconnected")).toBe("Disconnected");
  });
});

describe("receiverRetryDelayMs", () => {
  it("backs off receiver retries and caps the delay", () => {
    expect(receiverRetryDelayMs(-1)).toBe(1200);
    expect(receiverRetryDelayMs(0)).toBe(1200);
    expect(receiverRetryDelayMs(1)).toBe(2400);
    expect(receiverRetryDelayMs(4)).toBe(15000);
    expect(receiverRetryDelayMs(99)).toBe(15000);
  });
});
