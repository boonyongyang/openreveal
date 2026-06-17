import { randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";
import { access, stat } from "node:fs/promises";
import path from "node:path";

import cookie from "@fastify/cookie";
import rateLimit from "@fastify/rate-limit";
import websocket from "@fastify/websocket";
import { eq } from "drizzle-orm";
import Fastify, { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import QRCode from "qrcode";

import type { ConsoleSessionState, EffectKind, PrepareRevealRequest, RevealPayload } from "@openreveal/shared";
import {
  LoginRequestSchema,
  PlacesAutocompleteRequestSchema,
  PrepareRevealRequestSchema
} from "@openreveal/shared";

import { createPerformerToken, PERFORMER_COOKIE, verifyPerformerToken } from "./auth.js";
import { config, validateRuntimeConfig } from "./config.js";
import { db, migrate } from "./db.js";
import { registerBuiltInServerEffects, serverEffects } from "./effects/index.js";
import { autocompletePlaces, getPlaceDetails, placesConfigured } from "./places.js";
import { RealtimeHub } from "./realtime.js";
import { createSessionCode } from "./session-codes.js";
import { revealPayloads, sessionEvents, sessions } from "./schema.js";

const hub = new RealtimeHub();

const apiSecurityHeaders = {
  "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY"
};

const webSecurityHeaders = {
  "Content-Security-Policy": [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "img-src 'self' data:",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "connect-src 'self' ws: wss:"
  ].join("; "),
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY"
};

const stateChangingMethods = new Set(["DELETE", "PATCH", "POST", "PUT"]);

function headerValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function originOf(value: string) {
  try {
    return new URL(value).origin;
  } catch {
    return "";
  }
}

function trustedOrigins() {
  return new Set([originOf(config.appBaseUrl), originOf(config.apiBaseUrl)].filter(Boolean));
}

function hasTrustedBrowserOrigin(request: FastifyRequest) {
  if (!request.url.startsWith("/api/") || !stateChangingMethods.has(request.method)) {
    return true;
  }

  const origin = headerValue(request.headers.origin);
  if (origin) {
    return trustedOrigins().has(origin);
  }

  const referer = headerValue(request.headers.referer);
  if (referer) {
    return trustedOrigins().has(originOf(referer));
  }

  return true;
}

async function findSession(code: string) {
  const [session] = await db.select().from(sessions).where(eq(sessions.code, code)).limit(1);
  if (!session) return undefined;
  if (session.status === "live" && new Date(session.expiresAt).getTime() <= Date.now()) {
    await expireSession(session, "ttl", "system");
    return { ...session, status: "expired" as const, activeRevealId: null };
  }
  return session;
}

async function logSessionEvent(
  sessionId: string,
  eventType: string,
  actor: "performer" | "receiver" | "system",
  meta: Record<string, unknown> = {}
) {
  await db.insert(sessionEvents).values({
    id: randomUUID(),
    sessionId,
    eventType,
    actor,
    timestamp: new Date().toISOString(),
    metaJson: JSON.stringify(meta)
  });
}

async function restoreActiveRevealForReceiver(session: typeof sessions.$inferSelect) {
  if (!session.activeRevealId) return;

  const [reveal] = await db
    .select()
    .from(revealPayloads)
    .where(eq(revealPayloads.id, session.activeRevealId))
    .limit(1);

  if (!reveal || reveal.status === "reset") return;

  const payload = JSON.parse(reveal.payloadJson) as RevealPayload;
  hub.restoreReveal(session.code, {
    revealId: reveal.id,
    kind: reveal.kind,
    payload,
    sent: reveal.status === "sent" || reveal.status === "acked"
  });
}

async function expireSession(
  session: typeof sessions.$inferSelect,
  reason: "ttl" | "ended_by_performer" | "admin",
  actor: "performer" | "system"
) {
  await db.update(sessions)
    .set({ status: "expired", activeRevealId: null })
    .where(eq(sessions.code, session.code));

  if (session.activeRevealId) {
    await db.update(revealPayloads)
      .set({ status: "reset" })
      .where(eq(revealPayloads.id, session.activeRevealId));
  }

  await logSessionEvent(session.id, "session_expired", actor, { reason });
  hub.expire(session.code, reason);
}

function isPerformer(request: FastifyRequest) {
  return verifyPerformerToken(request.cookies[PERFORMER_COOKIE], config.sessionSecret);
}

async function requirePerformer(request: FastifyRequest, reply: FastifyReply) {
  if (isPerformer(request)) return;
  return reply.status(401).send({ error: "performer_auth_required" });
}

function buildConsoleState(session: typeof sessions.$inferSelect): ConsoleSessionState {
  const receiver = hub.getReceiver(session.code);
  return {
    sessionCode: session.code,
    receiverUrl: `${config.appBaseUrl}/r/${session.code}`,
    expiresAt: session.expiresAt,
    status: session.status,
    connectionState: hub.getConnectionState(session.code),
    receiver: receiver
      ? {
          deviceId: receiver.deviceId,
          ua: receiver.ua,
          lastSeenAt: receiver.lastSeenAt
        }
      : undefined
  };
}

async function fileExists(filePath: string) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function contentTypeFor(filePath: string) {
  switch (path.extname(filePath)) {
    case ".css":
      return "text/css; charset=utf-8";
    case ".html":
      return "text/html; charset=utf-8";
    case ".ico":
      return "image/x-icon";
    case ".js":
      return "text/javascript; charset=utf-8";
    case ".json":
      return "application/json; charset=utf-8";
    case ".map":
      return "application/json; charset=utf-8";
    case ".png":
      return "image/png";
    case ".svg":
      return "image/svg+xml";
    case ".txt":
      return "text/plain; charset=utf-8";
    case ".webp":
      return "image/webp";
    default:
      return "application/octet-stream";
  }
}

async function registerWebAppFallback(app: FastifyInstance) {
  if (!config.webDistDir) return;

  const root = path.resolve(config.webDistDir);
  const indexPath = path.join(root, "index.html");
  if (!(await fileExists(indexPath))) {
    app.log.warn({ webDistDir: root }, "WEB_DIST_DIR does not contain index.html; static web serving disabled");
    return;
  }

  app.setNotFoundHandler(async (request, reply) => {
    if (request.url.startsWith("/api/") || request.url.startsWith("/ws")) {
      await reply.status(404).send({ error: "not_found" });
      return;
    }
    if (request.method !== "GET" && request.method !== "HEAD") {
      await reply.status(405).send({ error: "method_not_allowed" });
      return;
    }

    for (const [name, value] of Object.entries(webSecurityHeaders)) {
      reply.header(name, value);
    }

    const pathname = decodeURIComponent(new URL(request.url, config.appBaseUrl).pathname);
    const requestedPath = path.resolve(root, `.${pathname}`);
    const safePath = requestedPath === root || requestedPath.startsWith(`${root}${path.sep}`)
      ? requestedPath
      : indexPath;
    const filePath = await resolveStaticPath(safePath, indexPath);

    reply.type(contentTypeFor(filePath));
    if (request.method === "HEAD") {
      await reply.send();
      return;
    }
    await reply.send(createReadStream(filePath));
  });
}

async function resolveStaticPath(requestedPath: string, indexPath: string) {
  try {
    const fileStat = await stat(requestedPath);
    if (fileStat.isFile()) return requestedPath;
  } catch {
    return indexPath;
  }
  return indexPath;
}

export async function buildServer() {
  validateRuntimeConfig(config);
  await migrate();
  registerBuiltInServerEffects();

  const app = Fastify({
    logger: process.env.NODE_ENV !== "test"
  });

  await app.register(cookie, {
    secret: config.sessionSecret
  });
  await app.register(rateLimit, {
    max: config.rateLimitMax,
    timeWindow: "1 minute"
  });
  await app.register(websocket);

  app.addHook("onRequest", async (request, reply) => {
    for (const [name, value] of Object.entries(apiSecurityHeaders)) {
      reply.header(name, value);
    }

    if (!hasTrustedBrowserOrigin(request)) {
      await reply.status(403).send({ error: "csrf_origin_rejected" });
      return;
    }

    if (
      request.url.startsWith("/api/auth/login") ||
      request.url.startsWith("/api/receiver") ||
      request.url.startsWith("/api/health")
    ) {
      return;
    }
    if (request.url.startsWith("/api/")) {
      return requirePerformer(request, reply);
    }
  });

  app.post("/api/auth/login", {
    schema: {
      body: LoginRequestSchema
    }
  }, async (request, reply) => {
    const body = request.body as { passphrase: string };
    if (body.passphrase !== config.performerPassphrase) {
      await reply.status(401).send({ error: "invalid_passphrase" });
      return;
    }

    const token = createPerformerToken(config.sessionSecret);
    reply.setCookie(PERFORMER_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: config.appBaseUrl.startsWith("https://"),
      path: "/",
      maxAge: 60 * 60 * 8
    });
    await reply.send({ ok: true });
  });

  app.post("/api/auth/logout", async (_request, reply) => {
    reply.clearCookie(PERFORMER_COOKIE, { path: "/" });
    await reply.send({ ok: true });
  });

  app.get("/api/auth/session", async (request, reply) => {
    await reply.send({ authenticated: isPerformer(request) });
  });

  app.get("/api/capabilities", async (_request, reply) => {
    await reply.send({
      places: {
        enabled: placesConfigured()
      }
    });
  });

  app.post("/api/places/autocomplete", {
    schema: {
      body: PlacesAutocompleteRequestSchema
    },
    config: {
      rateLimit: {
        max: 40,
        timeWindow: "1 minute"
      }
    }
  }, async (request, reply) => {
    const body = request.body as { input: string; sessionToken: string };
    try {
      const predictions = await autocompletePlaces(body.input.trim(), body.sessionToken.trim());
      await reply.send({ ok: true, predictions });
    } catch (error) {
      const message = error instanceof Error ? error.message : "places_failed";
      await reply.status(message === "places_unavailable" ? 503 : 502).send({ error: message });
    }
  });

  app.get("/api/places/:placeId", {
    config: {
      rateLimit: {
        max: 60,
        timeWindow: "1 minute"
      }
    }
  }, async (request, reply) => {
    const { placeId } = request.params as { placeId: string };
    try {
      const place = await getPlaceDetails(placeId);
      await reply.send({ ok: true, place });
    } catch (error) {
      const message = error instanceof Error ? error.message : "place_details_failed";
      await reply.status(message === "places_unavailable" ? 503 : 502).send({ error: message });
    }
  });

  app.post("/api/sessions", async (_request, reply) => {
    let code = createSessionCode();
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const existing = await findSession(code);
      if (!existing) break;
      code = createSessionCode();
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + config.sessionTtlMinutes * 60_000);
    const receiverUrl = `${config.appBaseUrl}/r/${code}`;
    const qrSvg = await QRCode.toString(receiverUrl, {
      type: "svg",
      margin: 1,
      color: {
        dark: "#101114",
        light: "#ffffff"
      }
    });
    const id = randomUUID();

    await db.insert(sessions).values({
      id,
      code,
      status: "live",
      activeRevealId: null,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString()
    });
    await logSessionEvent(id, "session_created", "performer");
    hub.ensure(code);

    await reply.send({
      sessionCode: code,
      receiverUrl,
      qrSvg,
      expiresAt: expiresAt.toISOString()
    });
  });

  app.get("/api/sessions/:code", async (request, reply) => {
    const { code } = request.params as { code: string };
    const session = await findSession(code);
    if (!session) {
      await reply.status(404).send({ error: "session_not_found" });
      return;
    }
    await reply.send(buildConsoleState(session));
  });

  app.post("/api/sessions/:code/reset", async (request, reply) => {
    const { code } = request.params as { code: string };
    const session = await findSession(code);
    if (!session || session.status !== "live") {
      await reply.status(404).send({ error: "live_session_not_found" });
      return;
    }
    await db.update(sessions).set({ activeRevealId: null }).where(eq(sessions.code, code));
    if (session.activeRevealId) {
      await db.update(revealPayloads).set({ status: "reset" }).where(eq(revealPayloads.id, session.activeRevealId));
    }
    await logSessionEvent(session.id, "session_reset", "performer");
    hub.reset(code);
    await reply.send({ ok: true });
  });

  app.post("/api/sessions/:code/reveal/prepare", {
    schema: {
      body: PrepareRevealRequestSchema
    }
  }, async (request, reply) => {
    const { code } = request.params as { code: string };
    const session = await findSession(code);
    if (!session || session.status !== "live") {
      await reply.status(404).send({ error: "live_session_not_found" });
      return;
    }

    const body = request.body as PrepareRevealRequest;
    const effect = serverEffects.get(body.kind as EffectKind);
    if (!effect) {
      await reply.status(400).send({ error: "effect_not_registered" });
      return;
    }

    let payload: RevealPayload;
    try {
      const validated = effect.validate(body.input);
      payload = effect.enrich ? await effect.enrich(validated) : validated;
    } catch (validationError) {
      await reply.status(400).send({
        error: validationError instanceof Error ? validationError.message : "payload_invalid"
      });
      return;
    }

    const revealId = randomUUID();
    const now = new Date().toISOString();
    await db.insert(revealPayloads).values({
      id: revealId,
      sessionId: session.id,
      kind: payload.kind,
      payloadJson: JSON.stringify(payload),
      seq: 0,
      status: "prepared",
      createdAt: now,
      sentAt: null,
      ackedAt: null
    });
    await db.update(sessions).set({ activeRevealId: revealId }).where(eq(sessions.code, code));
    await logSessionEvent(session.id, "reveal_prepared", "performer", {
      kind: payload.kind,
      revealId
    });
    hub.prepareReveal(code, {
      revealId,
      kind: payload.kind,
      payload
    });

    await reply.send({
      ok: true,
      revealId,
      kind: payload.kind,
      payload
    });
  });

  app.post("/api/sessions/:code/reveal/send", async (request, reply) => {
    const { code } = request.params as { code: string };
    const session = await findSession(code);
    if (!session || session.status !== "live" || !session.activeRevealId) {
      await reply.status(404).send({ error: "prepared_reveal_not_found" });
      return;
    }

    const [reveal] = await db
      .select()
      .from(revealPayloads)
      .where(eq(revealPayloads.id, session.activeRevealId))
      .limit(1);

    if (!reveal || reveal.status === "reset") {
      await reply.status(404).send({ error: "prepared_reveal_not_found" });
      return;
    }

    const now = new Date().toISOString();
    await db.update(revealPayloads).set({ status: "sent", sentAt: now }).where(eq(revealPayloads.id, reveal.id));
    await logSessionEvent(session.id, "reveal_sent", "performer", {
      kind: reveal.kind,
      revealId: reveal.id
    });
    hub.sendReveal(code, reveal.id);

    await reply.send({
      ok: true,
      revealId: reveal.id,
      kind: reveal.kind
    });
  });

  app.post("/api/sessions/:code/end", async (request, reply) => {
    const { code } = request.params as { code: string };
    const session = await findSession(code);
    if (!session || session.status !== "live") {
      await reply.status(404).send({ error: "live_session_not_found" });
      return;
    }
    await expireSession(session, "ended_by_performer", "performer");
    await reply.send({ ok: true });
  });

  app.get("/api/receiver/:code", {
    config: {
      rateLimit: {
        max: 60,
        timeWindow: "1 minute"
      }
    }
  }, async (request, reply) => {
    const { code } = request.params as { code: string };
    const { deviceId = "" } = request.query as { deviceId?: string };
    const session = await findSession(code);
    if (!session || session.status !== "live") {
      await reply.send({ status: "expired" });
      return;
    }
    await reply.send({ status: hub.canAcceptReceiver(code, deviceId) ? "live" : "in_use" });
  });

  app.get("/api/health", async () => ({
    ok: true,
    name: "OpenReveal",
    version: "0.1.0"
  }));

  app.get("/ws", { websocket: true }, async (socket, request) => {
    const url = new URL(request.url, config.apiBaseUrl);
    const code = url.searchParams.get("code") ?? "";
    const role = url.searchParams.get("role");
    const session = await findSession(code);
    if (!session || session.status !== "live") {
      socket.close(1008, "session not live");
      return;
    }

    if (role === "performer") {
      if (!isPerformer(request)) {
        socket.close(1008, "performer auth required");
        return;
      }
      hub.joinPerformer(code, socket);
      socket.on("close", () => hub.leavePerformer(code, socket));
      return;
    }

    if (role !== "receiver") {
      socket.close(1008, "invalid role");
      return;
    }

    const deviceId = url.searchParams.get("deviceId") ?? randomUUID();

    if (!hub.canAcceptReceiver(code, deviceId)) {
      hub.rejectReceiver(code, socket);
      return;
    }

    const ua = request.headers["user-agent"]?.slice(0, 160) ?? "unknown";
    hub.joinReceiver(code, {
      deviceId,
      socket,
      ua,
      state: "foregrounded",
      lastSeenAt: new Date().toISOString()
    });
    await restoreActiveRevealForReceiver(session);
    await logSessionEvent(session.id, "receiver_joined", "receiver", { deviceId });

    socket.on("message", (raw) => {
      try {
        const message = JSON.parse(String(raw)) as {
          type?: string;
          data?: {
            revealId?: string;
            renderedAtMs?: number;
            latencyMs?: number;
            visibility?: "visible" | "hidden";
          };
        };
        if (message.type === "receiver.heartbeat") {
          hub.updateReceiverState(code, deviceId, message.data?.visibility === "hidden" ? "backgrounded" : "foregrounded");
          return;
        }
        if (message.type === "receiver.prepared_ack" && message.data?.revealId) {
          hub.acknowledgePrepared(code, message.data.revealId);
        }
        if (message.type === "receiver.reveal_ack" && message.data?.revealId) {
          hub.acknowledgeReveal(
            code,
            message.data.revealId,
            message.data.renderedAtMs ?? Date.now(),
            message.data.latencyMs
          );
          void db.update(revealPayloads)
            .set({ status: "acked", ackedAt: new Date().toISOString() })
            .where(eq(revealPayloads.id, message.data.revealId));
        }
      } catch {
        // Ignore malformed receiver messages. The receiver cannot mutate state.
      }
    });

    socket.on("close", () => {
      hub.leaveReceiver(code, deviceId, "closed", socket);
      void logSessionEvent(session.id, "receiver_left", "receiver", { deviceId });
    });
  });

  await registerWebAppFallback(app);

  return app;
}
