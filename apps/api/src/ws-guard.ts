import type { WebSocket } from "ws";

// Abuse limits for the anonymous WebSocket surface. A receiver only needs a
// session code to connect, so every long-lived socket is treated as hostile
// until proven otherwise: capped per source IP, rate-limited per message, and
// reaped if it stops answering liveness pings.

export const MAX_WS_PER_IP = 20;
export const MESSAGE_BURST = 30;
export const MESSAGE_WINDOW_MS = 10_000;
export const LIVENESS_INTERVAL_MS = 30_000;

const connectionsByIp = new Map<string, number>();

/**
 * Reserve a concurrent-connection slot for an IP. Returns false when the IP is
 * already holding `MAX_WS_PER_IP` live sockets. Call only for sockets that are
 * about to be kept open; pair every success with `releaseConnection`.
 */
export function tryRegisterConnection(ip: string): boolean {
  const current = connectionsByIp.get(ip) ?? 0;
  if (current >= MAX_WS_PER_IP) return false;
  connectionsByIp.set(ip, current + 1);
  return true;
}

export function releaseConnection(ip: string): void {
  const current = connectionsByIp.get(ip) ?? 0;
  if (current <= 1) {
    connectionsByIp.delete(ip);
  } else {
    connectionsByIp.set(ip, current - 1);
  }
}

/**
 * Per-socket sliding-window message limiter. Returns false once a socket sends
 * more than `MESSAGE_BURST` messages inside `MESSAGE_WINDOW_MS`, which the
 * caller should treat as a flood and close the socket.
 */
export function createMessageRateLimiter(now: () => number = Date.now) {
  let count = 0;
  let windowStart = now();
  return function allow(): boolean {
    const current = now();
    if (current - windowStart >= MESSAGE_WINDOW_MS) {
      windowStart = current;
      count = 0;
    }
    count += 1;
    return count <= MESSAGE_BURST;
  };
}

interface LivenessState {
  alive: boolean;
}

/**
 * Ping/pong liveness reaper. Half-open or zombie sockets (no TCP FIN, no pong)
 * otherwise leak file descriptors and hub slots indefinitely. Each interval
 * terminates sockets that did not answer the previous ping, then re-pings the
 * survivors.
 */
export class LivenessReaper {
  private readonly sockets = new Map<WebSocket, LivenessState>();
  private timer: ReturnType<typeof setInterval> | undefined;

  constructor(private readonly intervalMs: number = LIVENESS_INTERVAL_MS) {}

  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => this.sweep(), this.intervalMs);
    // Do not keep the event loop alive for the reaper alone.
    this.timer.unref?.();
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
    this.sockets.clear();
  }

  register(socket: WebSocket): void {
    this.sockets.set(socket, { alive: true });
    socket.on("pong", () => {
      const state = this.sockets.get(socket);
      if (state) state.alive = true;
    });
    socket.on("close", () => this.sockets.delete(socket));
  }

  private sweep(): void {
    for (const [socket, state] of this.sockets) {
      if (!state.alive) {
        this.sockets.delete(socket);
        try {
          socket.terminate();
        } catch {
          // Already gone.
        }
        continue;
      }
      state.alive = false;
      try {
        socket.ping();
      } catch {
        this.sockets.delete(socket);
      }
    }
  }
}
