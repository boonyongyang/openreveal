import { randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";

beforeEach(() => {
  process.env.NODE_ENV = "test";
  process.env.DATABASE_URL = `file:./data/maintenance-test-${randomUUID()}.sqlite`;
  process.env.PERFORMER_PASSPHRASE = "test-passphrase";
  process.env.SESSION_SECRET = "test-secret";
});

describe("cleanupExpiredData", () => {
  it("expires stale live sessions and prunes expired data after retention", async () => {
    const { db, migrate } = await import("../src/db.js");
    const { cleanupExpiredData } = await import("../src/maintenance.js");
    const { receiverDevices, revealPayloads, sessionEvents, sessions } = await import("../src/schema.js");

    await migrate();

    const now = new Date("2026-05-09T12:00:00.000Z");
    const staleLiveSessionId = randomUUID();
    const staleLiveRevealId = randomUUID();
    const oldExpiredSessionId = randomUUID();
    const freshExpiredSessionId = randomUUID();

    await db.insert(sessions).values([
      {
        id: staleLiveSessionId,
        code: "STALE001",
        status: "live",
        activeRevealId: staleLiveRevealId,
        createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
        expiresAt: new Date(now.getTime() - 60 * 1000).toISOString()
      },
      {
        id: oldExpiredSessionId,
        code: "OLD00001",
        status: "expired",
        activeRevealId: null,
        createdAt: new Date(now.getTime() - 30 * 60 * 60 * 1000).toISOString(),
        expiresAt: new Date(now.getTime() - 25 * 60 * 60 * 1000).toISOString()
      },
      {
        id: freshExpiredSessionId,
        code: "FRESH001",
        status: "expired",
        activeRevealId: null,
        createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
        expiresAt: new Date(now.getTime() - 60 * 60 * 1000).toISOString()
      }
    ]);

    await db.insert(revealPayloads).values([
      {
        id: staleLiveRevealId,
        sessionId: staleLiveSessionId,
        kind: "location",
        payloadJson: "{}",
        seq: 0,
        status: "prepared",
        createdAt: now.toISOString(),
        sentAt: null,
        ackedAt: null
      },
      {
        id: randomUUID(),
        sessionId: oldExpiredSessionId,
        kind: "celebrity",
        payloadJson: "{}",
        seq: 0,
        status: "reset",
        createdAt: now.toISOString(),
        sentAt: null,
        ackedAt: null
      }
    ]);

    await db.insert(receiverDevices).values({
      id: randomUUID(),
      sessionId: oldExpiredSessionId,
      connectionId: randomUUID(),
      uaSummary: "test",
      state: "foregrounded",
      joinedAt: now.toISOString(),
      lastSeenAt: now.toISOString()
    });

    await db.insert(sessionEvents).values([
      {
        id: randomUUID(),
        sessionId: oldExpiredSessionId,
        eventType: "session_expired",
        actor: "system",
        timestamp: now.toISOString(),
        metaJson: "{}"
      },
      {
        id: randomUUID(),
        sessionId: freshExpiredSessionId,
        eventType: "session_expired",
        actor: "system",
        timestamp: now.toISOString(),
        metaJson: "{}"
      }
    ]);

    const result = await cleanupExpiredData({ now, retentionHours: 24 });

    expect(result).toEqual({
      expiredSessions: 1,
      resetRevealPayloads: 1,
      deletedSessions: 1,
      deletedReceiverDevices: 1,
      deletedRevealPayloads: 1,
      deletedSessionEvents: 1
    });

    const [staleLiveSession] = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, staleLiveSessionId))
      .limit(1);
    expect(staleLiveSession?.status).toBe("expired");
    expect(staleLiveSession?.activeRevealId).toBeNull();

    const [staleLiveReveal] = await db
      .select()
      .from(revealPayloads)
      .where(eq(revealPayloads.id, staleLiveRevealId))
      .limit(1);
    expect(staleLiveReveal?.status).toBe("reset");

    const oldExpiredSessions = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, oldExpiredSessionId));
    expect(oldExpiredSessions).toHaveLength(0);

    const freshExpiredSessions = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, freshExpiredSessionId));
    expect(freshExpiredSessions).toHaveLength(1);

    const ttlEvents = await db
      .select()
      .from(sessionEvents)
      .where(eq(sessionEvents.sessionId, staleLiveSessionId));
    expect(ttlEvents.some((event) => event.eventType === "session_expired")).toBe(true);
  });
});
