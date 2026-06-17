import { describe, expect, it } from "vitest";

import {
  createMessageRateLimiter,
  LivenessReaper,
  MAX_WS_PER_IP,
  MESSAGE_BURST,
  releaseConnection,
  tryRegisterConnection
} from "../src/ws-guard.js";

describe("per-IP connection cap", () => {
  it("allows up to MAX_WS_PER_IP and rejects beyond it", () => {
    const ip = "203.0.113.1";
    for (let index = 0; index < MAX_WS_PER_IP; index += 1) {
      expect(tryRegisterConnection(ip)).toBe(true);
    }
    expect(tryRegisterConnection(ip)).toBe(false);

    releaseConnection(ip);
    expect(tryRegisterConnection(ip)).toBe(true);

    for (let index = 0; index < MAX_WS_PER_IP; index += 1) {
      releaseConnection(ip);
    }
    // Fully drained: a fresh slot is available again.
    expect(tryRegisterConnection(ip)).toBe(true);
    releaseConnection(ip);
  });

  it("tracks IPs independently", () => {
    const a = "203.0.113.2";
    const b = "203.0.113.3";
    for (let index = 0; index < MAX_WS_PER_IP; index += 1) tryRegisterConnection(a);
    expect(tryRegisterConnection(a)).toBe(false);
    expect(tryRegisterConnection(b)).toBe(true);
    for (let index = 0; index < MAX_WS_PER_IP; index += 1) releaseConnection(a);
    releaseConnection(b);
  });
});

describe("per-socket message rate limiter", () => {
  it("permits the burst then blocks within the window", () => {
    let clock = 1_000;
    const allow = createMessageRateLimiter(() => clock);
    for (let index = 0; index < MESSAGE_BURST; index += 1) {
      expect(allow()).toBe(true);
    }
    expect(allow()).toBe(false);
  });

  it("resets after the window elapses", () => {
    let clock = 0;
    const allow = createMessageRateLimiter(() => clock);
    for (let index = 0; index < MESSAGE_BURST; index += 1) allow();
    expect(allow()).toBe(false);

    clock += 10_000;
    expect(allow()).toBe(true);
  });
});

describe("liveness reaper", () => {
  function fakeSocket() {
    const handlers: Record<string, Array<() => void>> = {};
    return {
      pinged: 0,
      terminated: false,
      on(event: string, handler: () => void) {
        (handlers[event] ??= []).push(handler);
      },
      emit(event: string) {
        for (const handler of handlers[event] ?? []) handler();
      },
      ping() {
        this.pinged += 1;
      },
      terminate() {
        this.terminated = true;
      }
    };
  }

  it("pings live sockets and terminates ones that miss a pong", () => {
    const reaper = new LivenessReaper(60_000);
    const socket = fakeSocket();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    reaper.register(socket as any);

    // First sweep: socket was alive, gets pinged and marked pending.
    (reaper as unknown as { sweep(): void }).sweep();
    expect(socket.pinged).toBe(1);
    expect(socket.terminated).toBe(false);

    // No pong arrived: next sweep terminates it.
    (reaper as unknown as { sweep(): void }).sweep();
    expect(socket.terminated).toBe(true);

    reaper.stop();
  });

  it("keeps a socket alive when it answers pongs", () => {
    const reaper = new LivenessReaper(60_000);
    const socket = fakeSocket();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    reaper.register(socket as any);

    (reaper as unknown as { sweep(): void }).sweep();
    socket.emit("pong");
    (reaper as unknown as { sweep(): void }).sweep();
    expect(socket.terminated).toBe(false);

    reaper.stop();
  });
});
