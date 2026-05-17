import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";

import { config } from "./config.js";
import * as schema from "./schema.js";

function ensureSqliteDirectory(url: string) {
  if (!url.startsWith("file:")) return;
  const filePath = url.slice("file:".length);
  if (!filePath || filePath.startsWith(":")) return;
  mkdirSync(dirname(filePath), { recursive: true });
}

ensureSqliteDirectory(config.databaseUrl);

export const client = createClient({ url: config.databaseUrl });
export const db = drizzle(client, { schema });

export async function migrate() {
  await client.batch(
    [
      `CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        code TEXT NOT NULL UNIQUE,
        status TEXT NOT NULL,
        active_reveal_id TEXT,
        created_at TEXT NOT NULL,
        expires_at TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS receiver_devices (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        connection_id TEXT NOT NULL,
        ua_summary TEXT NOT NULL,
        state TEXT NOT NULL,
        joined_at TEXT NOT NULL,
        last_seen_at TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS reveal_payloads (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        kind TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        seq INTEGER NOT NULL,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        sent_at TEXT,
        acked_at TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS session_events (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        event_type TEXT NOT NULL,
        actor TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        meta_json TEXT NOT NULL
      )`
    ],
    "write"
  );
}
