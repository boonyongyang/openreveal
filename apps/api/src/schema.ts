import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  code: text("code").notNull().unique(),
  status: text("status", { enum: ["live", "expired"] }).notNull(),
  activeRevealId: text("active_reveal_id"),
  createdAt: text("created_at").notNull(),
  expiresAt: text("expires_at").notNull()
});

export const receiverDevices = sqliteTable("receiver_devices", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  connectionId: text("connection_id").notNull(),
  uaSummary: text("ua_summary").notNull(),
  state: text("state", { enum: ["foregrounded", "backgrounded"] }).notNull(),
  joinedAt: text("joined_at").notNull(),
  lastSeenAt: text("last_seen_at").notNull()
});

export const revealPayloads = sqliteTable("reveal_payloads", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  kind: text("kind").notNull(),
  payloadJson: text("payload_json").notNull(),
  seq: integer("seq").notNull(),
  status: text("status", { enum: ["prepared", "sent", "acked", "reset"] }).notNull(),
  createdAt: text("created_at").notNull(),
  sentAt: text("sent_at"),
  ackedAt: text("acked_at")
});

export const sessionEvents = sqliteTable("session_events", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  eventType: text("event_type").notNull(),
  actor: text("actor", { enum: ["performer", "receiver", "system"] }).notNull(),
  timestamp: text("timestamp").notNull(),
  metaJson: text("meta_json").notNull()
});
