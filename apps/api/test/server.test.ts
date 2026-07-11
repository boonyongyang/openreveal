import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { WebSocket } from "ws";

let databaseId = 0;

beforeEach(() => {
  process.env.NODE_ENV = "test";
  process.env.DATABASE_URL = `file:./data/test-${databaseId}.sqlite`;
  process.env.PERFORMER_PASSPHRASE = "test-passphrase";
  process.env.SESSION_SECRET = "test-secret";
  databaseId += 1;
});

afterEach(() => {
  delete process.env.DATABASE_URL;
  delete process.env.GOOGLE_PLACES_API_KEY;
  delete process.env.GOOGLE_PLACES_ENABLED;
  delete process.env.PERFORMER_PASSPHRASE;
  delete process.env.SESSION_SECRET;
});

describe("OpenReveal API", () => {
  it("sets baseline security headers on API responses", async () => {
    const { buildServer } = await import("../src/server.js");
    const app = await buildServer();

    const response = await app.inject({
      method: "GET",
      url: "/api/health"
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["x-frame-options"]).toBe("DENY");
    expect(response.headers["x-content-type-options"]).toBe("nosniff");
    expect(response.headers["referrer-policy"]).toBe("no-referrer");
    expect(response.headers["content-security-policy"]).toContain("frame-ancestors 'none'");

    await app.close();
  });

  it("rejects browser state changes from untrusted origins", async () => {
    const { buildServer } = await import("../src/server.js");
    const app = await buildServer();

    const rejected = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      headers: {
        origin: "https://evil.example"
      },
      payload: { passphrase: "test-passphrase" }
    });

    expect(rejected.statusCode).toBe(403);
    expect(rejected.json<{ error: string }>().error).toBe("csrf_origin_rejected");

    const accepted = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      headers: {
        origin: "http://localhost:5173"
      },
      payload: { passphrase: "test-passphrase" }
    });

    expect(accepted.statusCode).toBe(200);

    await app.close();
  });

  it("requires performer auth before creating sessions", async () => {
    const { buildServer } = await import("../src/server.js");
    const app = await buildServer();

    const response = await app.inject({
      method: "POST",
      url: "/api/sessions"
    });

    expect(response.statusCode).toBe(401);
    await app.close();
  });

  it("requires performer auth before returning app capabilities", async () => {
    const { buildServer } = await import("../src/server.js");
    const app = await buildServer();

    const unauthenticated = await app.inject({
      method: "GET",
      url: "/api/capabilities"
    });
    expect(unauthenticated.statusCode).toBe(401);

    const login = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { passphrase: "test-passphrase" }
    });
    const cookie = login.cookies[0];
    const capabilities = await app.inject({
      method: "GET",
      url: "/api/capabilities",
      cookies: { or_performer: cookie?.value ?? "" }
    });

    expect(capabilities.statusCode).toBe(200);
    expect(capabilities.json<{ places: { enabled: boolean } }>()).toEqual({
      places: { enabled: false }
    });

    await app.close();
  });

  it("logs in and creates a live session", async () => {
    const { buildServer } = await import("../src/server.js");
    const app = await buildServer();

    const login = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { passphrase: "test-passphrase" }
    });
    expect(login.statusCode).toBe(200);

    const cookie = login.cookies[0];
    expect(cookie?.name).toBe("or_performer");

    const created = await app.inject({
      method: "POST",
      url: "/api/sessions",
      cookies: { or_performer: cookie?.value ?? "" }
    });
    expect(created.statusCode).toBe(200);

    const body = created.json<{
      sessionCode: string;
      receiverUrl: string;
      qrSvg: string;
      expiresAt: string;
    }>();
    expect(body.sessionCode).toHaveLength(8);
    expect(body.sessionCode).toMatch(/^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{8}$/);
    expect(body.receiverUrl).toMatch(new RegExp(`/${body.sessionCode}$`));
    expect(body.qrSvg).toContain("<svg");
    expect(Date.parse(body.expiresAt)).toBeGreaterThan(Date.now());

    await app.close();
  });

  it("prepares and sends a location reveal", async () => {
    const { buildServer } = await import("../src/server.js");
    const app = await buildServer();

    const login = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { passphrase: "test-passphrase" }
    });
    const cookie = login.cookies[0];

    const created = await app.inject({
      method: "POST",
      url: "/api/sessions",
      cookies: { or_performer: cookie?.value ?? "" }
    });
    const { sessionCode } = created.json<{ sessionCode: string }>();

    const prepared = await app.inject({
      method: "POST",
      url: `/api/sessions/${sessionCode}/reveal/prepare`,
      cookies: { or_performer: cookie?.value ?? "" },
      payload: {
        kind: "location",
        input: { name: "Kuala Lumpur", country: "Malaysia" }
      }
    });

    expect(prepared.statusCode).toBe(200);
    const preparedBody = prepared.json<{
      revealId: string;
      kind: string;
      payload: { mapsUrl: string };
    }>();
    expect(preparedBody.kind).toBe("location");
    expect(preparedBody.payload.mapsUrl).toContain("google.com/maps/search");

    const sent = await app.inject({
      method: "POST",
      url: `/api/sessions/${sessionCode}/reveal/send`,
      cookies: { or_performer: cookie?.value ?? "" }
    });

    expect(sent.statusCode).toBe(200);
    expect(sent.json<{ revealId: string }>().revealId).toBe(preparedBody.revealId);

    await app.close();
  });

  it("adds query_place_id to Maps URLs for selected Places locations", async () => {
    const { buildServer } = await import("../src/server.js");
    const app = await buildServer();

    const login = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { passphrase: "test-passphrase" }
    });
    const cookie = login.cookies[0];
    const created = await app.inject({
      method: "POST",
      url: "/api/sessions",
      cookies: { or_performer: cookie?.value ?? "" }
    });
    const { sessionCode } = created.json<{ sessionCode: string }>();

    const prepared = await app.inject({
      method: "POST",
      url: `/api/sessions/${sessionCode}/reveal/prepare`,
      cookies: { or_performer: cookie?.value ?? "" },
      payload: {
        kind: "location",
        input: {
          name: "Petronas Twin Towers",
          formattedAddress: "Petronas Twin Towers, Kuala Lumpur, Malaysia",
          placeId: "ChIJH3w7GaJIzDERbvi8A3p1Y2I",
          autoOpenMaps: true
        }
      }
    });

    expect(prepared.statusCode).toBe(200);
    const body = prepared.json<{
      payload: { autoOpenMaps: boolean; mapsUrl: string; placeId: string };
    }>();
    expect(body.payload.autoOpenMaps).toBe(true);
    expect(body.payload.placeId).toBe("ChIJH3w7GaJIzDERbvi8A3p1Y2I");
    expect(body.payload.mapsUrl).toContain("query_place_id=ChIJH3w7GaJIzDERbvi8A3p1Y2I");

    await app.close();
  });

  it("requires performer auth and configured key for Places autocomplete", async () => {
    const { buildServer } = await import("../src/server.js");
    const app = await buildServer();

    const unauthenticated = await app.inject({
      method: "POST",
      url: "/api/places/autocomplete",
      payload: { input: "Kuala Lumpur", sessionToken: "places-session-token" }
    });
    expect(unauthenticated.statusCode).toBe(401);

    const login = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { passphrase: "test-passphrase" }
    });
    const cookie = login.cookies[0];
    const unavailable = await app.inject({
      method: "POST",
      url: "/api/places/autocomplete",
      cookies: { or_performer: cookie?.value ?? "" },
      payload: { input: "Kuala Lumpur", sessionToken: "places-session-token" }
    });
    expect(unavailable.statusCode).toBe(503);
    expect(unavailable.json<{ error: string }>().error).toBe("places_unavailable");

    await app.close();
  });

  it("restores the latest sent reveal when a receiver joins after send", async () => {
    const { buildServer } = await import("../src/server.js");
    const app = await buildServer();

    const login = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { passphrase: "test-passphrase" }
    });
    const cookie = login.cookies[0];
    const cookies = { or_performer: cookie?.value ?? "" };

    const created = await app.inject({
      method: "POST",
      url: "/api/sessions",
      cookies
    });
    const { sessionCode } = created.json<{ sessionCode: string }>();

    const prepared = await app.inject({
      method: "POST",
      url: `/api/sessions/${sessionCode}/reveal/prepare`,
      cookies,
      payload: {
        kind: "location",
        input: { name: "Kuala Lumpur", country: "Malaysia" }
      }
    });
    const { revealId } = prepared.json<{ revealId: string }>();

    const sent = await app.inject({
      method: "POST",
      url: `/api/sessions/${sessionCode}/reveal/send`,
      cookies
    });
    expect(sent.statusCode).toBe(200);

    await app.listen({ host: "127.0.0.1", port: 0 });
    const address = app.server.address();
    const port = typeof address === "object" && address ? address.port : 0;
    const socket = new WebSocket(`ws://127.0.0.1:${port}/ws?code=${sessionCode}&role=receiver`);
    const messages = await waitForWsMessages(socket, ["reveal_prepared", "reveal_sent"]);

    expect(messages.find((message) => message.type === "reveal_prepared")?.data).toMatchObject({
      revealId,
      kind: "location",
      payload: {
        kind: "location",
        name: "Kuala Lumpur"
      }
    });
    expect(messages.find((message) => message.type === "reveal_sent")?.data).toEqual({ revealId });

    socket.close();
    await app.close();
  });

  it("allows the same receiver device to replace its stale socket", async () => {
    const { buildServer } = await import("../src/server.js");
    const app = await buildServer();

    const login = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { passphrase: "test-passphrase" }
    });
    const cookie = login.cookies[0];
    const created = await app.inject({
      method: "POST",
      url: "/api/sessions",
      cookies: { or_performer: cookie?.value ?? "" }
    });
    const { sessionCode } = created.json<{ sessionCode: string }>();

    await app.listen({ host: "127.0.0.1", port: 0 });
    const address = app.server.address();
    const port = typeof address === "object" && address ? address.port : 0;
    const deviceId = "receiver-device-1";
    const firstSocket = new WebSocket(`ws://127.0.0.1:${port}/ws?code=${sessionCode}&role=receiver&deviceId=${deviceId}`);
    await waitForWsMessages(firstSocket, ["session_state"]);

    const sameDeviceStatus = await app.inject({
      method: "GET",
      url: `/api/receiver/${sessionCode}?deviceId=${deviceId}`
    });
    expect(sameDeviceStatus.json<{ status: string }>().status).toBe("live");

    const otherDeviceStatus = await app.inject({
      method: "GET",
      url: `/api/receiver/${sessionCode}?deviceId=other-device`
    });
    expect(otherDeviceStatus.json<{ status: string }>().status).toBe("in_use");

    const replacementSocket = new WebSocket(`ws://127.0.0.1:${port}/ws?code=${sessionCode}&role=receiver&deviceId=${deviceId}`);
    const replacementMessages = await waitForWsMessages(replacementSocket, ["session_state"]);
    expect(replacementMessages.find((message) => message.type === "session_state")?.data).toMatchObject({
      status: "live"
    });

    firstSocket.close();
    replacementSocket.close();
    await app.close();
  });

  it("expires stale sessions, clears active reveals, and blocks performer mutations", async () => {
    const { and, eq } = await import("drizzle-orm");
    const { buildServer } = await import("../src/server.js");
    const { db } = await import("../src/db.js");
    const { revealPayloads, sessionEvents, sessions } = await import("../src/schema.js");
    const app = await buildServer();

    const login = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { passphrase: "test-passphrase" }
    });
    const cookie = login.cookies[0];
    const cookies = { or_performer: cookie?.value ?? "" };

    const created = await app.inject({
      method: "POST",
      url: "/api/sessions",
      cookies
    });
    const { sessionCode } = created.json<{ sessionCode: string }>();

    const prepared = await app.inject({
      method: "POST",
      url: `/api/sessions/${sessionCode}/reveal/prepare`,
      cookies,
      payload: {
        kind: "location",
        input: { name: "Kuala Lumpur", country: "Malaysia" }
      }
    });
    const { revealId } = prepared.json<{ revealId: string }>();

    await db.update(sessions)
      .set({ expiresAt: new Date(Date.now() - 1_000).toISOString() })
      .where(eq(sessions.code, sessionCode));

    const expired = await app.inject({
      method: "GET",
      url: `/api/sessions/${sessionCode}`,
      cookies
    });

    expect(expired.statusCode).toBe(200);
    expect(expired.json<{ status: string }>().status).toBe("expired");

    const receiverStatus = await app.inject({
      method: "GET",
      url: `/api/receiver/${sessionCode}`
    });
    expect(receiverStatus.json<{ status: string }>().status).toBe("expired");

    const sendAfterExpiry = await app.inject({
      method: "POST",
      url: `/api/sessions/${sessionCode}/reveal/send`,
      cookies
    });
    expect(sendAfterExpiry.statusCode).toBe(404);

    const resetAfterExpiry = await app.inject({
      method: "POST",
      url: `/api/sessions/${sessionCode}/reset`,
      cookies
    });
    expect(resetAfterExpiry.statusCode).toBe(404);

    const endAfterExpiry = await app.inject({
      method: "POST",
      url: `/api/sessions/${sessionCode}/end`,
      cookies
    });
    expect(endAfterExpiry.statusCode).toBe(404);

    const [storedSession] = await db.select().from(sessions).where(eq(sessions.code, sessionCode)).limit(1);
    expect(storedSession?.activeRevealId).toBeNull();

    const [storedReveal] = await db.select().from(revealPayloads).where(eq(revealPayloads.id, revealId)).limit(1);
    expect(storedReveal?.status).toBe("reset");

    const expiryEvents = await db
      .select()
      .from(sessionEvents)
      .where(and(
        eq(sessionEvents.sessionId, storedSession?.id ?? ""),
        eq(sessionEvents.eventType, "session_expired")
      ));
    expect(expiryEvents).toHaveLength(1);
    expect(JSON.parse(expiryEvents[0]?.metaJson ?? "{}")).toEqual({ reason: "ttl" });

    await app.close();
  });
});

function waitForWsMessages(
  socket: WebSocket,
  expectedTypes: string[]
): Promise<Array<{ type: string; data: unknown }>> {
  return new Promise((resolve, reject) => {
    const messages: Array<{ type: string; data: unknown }> = [];
    const timeout = setTimeout(() => {
      reject(new Error(`Timed out waiting for ${expectedTypes.join(", ")}`));
    }, 2_000);

    socket.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });

    socket.on("message", (raw) => {
      const message = JSON.parse(String(raw)) as { type: string; data: unknown };
      messages.push(message);
      if (expectedTypes.every((type) => messages.some((candidate) => candidate.type === type))) {
        clearTimeout(timeout);
        resolve(messages);
      }
    });
  });
}
