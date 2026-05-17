import { randomUUID } from "node:crypto";

import { eq, inArray, lt, lte } from "drizzle-orm";

import { db } from "./db.js";
import { receiverDevices, revealPayloads, sessionEvents, sessions } from "./schema.js";

export interface CleanupExpiredDataOptions {
  now?: Date;
  retentionHours?: number;
}

export interface CleanupExpiredDataResult {
  expiredSessions: number;
  resetRevealPayloads: number;
  deletedSessions: number;
  deletedReceiverDevices: number;
  deletedRevealPayloads: number;
  deletedSessionEvents: number;
}

const DEFAULT_RETENTION_HOURS = 24;

export async function cleanupExpiredData(options: CleanupExpiredDataOptions = {}): Promise<CleanupExpiredDataResult> {
  const now = options.now ?? new Date();
  const retentionHours = options.retentionHours ?? DEFAULT_RETENTION_HOURS;
  const cutoff = new Date(now.getTime() - retentionHours * 60 * 60 * 1000);

  const result: CleanupExpiredDataResult = {
    expiredSessions: 0,
    resetRevealPayloads: 0,
    deletedSessions: 0,
    deletedReceiverDevices: 0,
    deletedRevealPayloads: 0,
    deletedSessionEvents: 0
  };

  const staleLiveSessions = await db
    .select()
    .from(sessions)
    .where(lte(sessions.expiresAt, now.toISOString()));

  for (const session of staleLiveSessions.filter((session) => session.status === "live")) {
    await db
      .update(sessions)
      .set({ status: "expired", activeRevealId: null })
      .where(eq(sessions.id, session.id));

    if (session.activeRevealId) {
      await db
        .update(revealPayloads)
        .set({ status: "reset" })
        .where(eq(revealPayloads.id, session.activeRevealId));
      result.resetRevealPayloads += 1;
    }

    await db.insert(sessionEvents).values({
      id: randomUUID(),
      sessionId: session.id,
      eventType: "session_expired",
      actor: "system",
      timestamp: now.toISOString(),
      metaJson: JSON.stringify({ reason: "ttl" })
    });
    result.expiredSessions += 1;
  }

  const expiredSessionsToDelete = await db
    .select()
    .from(sessions)
    .where(lt(sessions.expiresAt, cutoff.toISOString()));

  const deletableSessionIds = expiredSessionsToDelete
    .filter((session) => session.status === "expired")
    .map((session) => session.id);

  if (!deletableSessionIds.length) {
    return result;
  }

  result.deletedReceiverDevices = (await db
    .select()
    .from(receiverDevices)
    .where(inArray(receiverDevices.sessionId, deletableSessionIds))).length;
  result.deletedRevealPayloads = (await db
    .select()
    .from(revealPayloads)
    .where(inArray(revealPayloads.sessionId, deletableSessionIds))).length;
  result.deletedSessionEvents = (await db
    .select()
    .from(sessionEvents)
    .where(inArray(sessionEvents.sessionId, deletableSessionIds))).length;
  result.deletedSessions = deletableSessionIds.length;

  await db.delete(receiverDevices).where(inArray(receiverDevices.sessionId, deletableSessionIds));
  await db.delete(revealPayloads).where(inArray(revealPayloads.sessionId, deletableSessionIds));
  await db.delete(sessionEvents).where(inArray(sessionEvents.sessionId, deletableSessionIds));
  await db.delete(sessions).where(inArray(sessions.id, deletableSessionIds));

  return result;
}
