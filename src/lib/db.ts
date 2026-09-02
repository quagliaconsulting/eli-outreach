import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import {
  DEFAULT_SENDER_NAME,
  DEFAULT_SENDER_PHONE,
  FROM_EMAIL,
  PACKET_URL,
  REPLY_TO_EMAIL,
  TIMEZONE,
} from "./constants";
import { seedIfEmpty } from "./seed";

declare global {
  // eslint-disable-next-line no-var
  var __eliOutreachDb: Database.Database | undefined;
}

export function resolveDataDir(): string {
  const override = process.env.ELI_DATA_DIR?.trim();
  if (override) {
    fs.mkdirSync(override, { recursive: true });
    return override;
  }
  if (fs.existsSync("/data") && fs.statSync("/data").isDirectory()) {
    return "/data";
  }
  const local = path.join(process.cwd(), "data");
  fs.mkdirSync(local, { recursive: true });
  return local;
}

export function getDb(): Database.Database {
  if (global.__eliOutreachDb) return global.__eliOutreachDb;

  const dir = resolveDataDir();
  const file = path.join(dir, "outreach.db");
  const db = new Database(file);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  migrate(db);
  seedIfEmpty(db);
  global.__eliOutreachDb = db;
  return db;
}

function migrate(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      sender_name TEXT NOT NULL,
      sender_email TEXT NOT NULL,
      reply_to_email TEXT NOT NULL,
      sender_phone TEXT NOT NULL,
      timezone TEXT NOT NULL,
      packet_url TEXT NOT NULL,
      fleet_counts_enabled INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS companies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      industry TEXT NOT NULL,
      city TEXT NOT NULL,
      state TEXT NOT NULL,
      phone TEXT,
      website TEXT,
      notes TEXT NOT NULL DEFAULT '',
      stage TEXT NOT NULL,
      is_example INTEGER NOT NULL DEFAULT 1,
      next_action_type TEXT NOT NULL DEFAULT 'call',
      next_action_at TEXT,
      last_touch_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      title TEXT NOT NULL DEFAULT '',
      phone TEXT,
      email TEXT,
      is_primary INTEGER NOT NULL DEFAULT 0,
      is_example INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS drafts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      contact_id INTEGER NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
      kind TEXT NOT NULL,
      subject TEXT NOT NULL,
      body TEXT NOT NULL,
      hook_line TEXT NOT NULL,
      status TEXT NOT NULL,
      blocked_reason TEXT,
      created_at TEXT NOT NULL,
      approved_at TEXT,
      copied_at TEXT,
      sent_at TEXT
    );

    CREATE TABLE IF NOT EXISTS dnc (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER REFERENCES companies(id) ON DELETE SET NULL,
      contact_id INTEGER REFERENCES contacts(id) ON DELETE SET NULL,
      company_name TEXT,
      email TEXT,
      phone TEXT,
      reason TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      contact_id INTEGER REFERENCES contacts(id) ON DELETE SET NULL,
      type TEXT NOT NULL,
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS crm_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL UNIQUE REFERENCES companies(id) ON DELETE CASCADE,
      freight_profile TEXT NOT NULL DEFAULT '',
      decision_notes TEXT NOT NULL DEFAULT '',
      next_meeting_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  const settings = db.prepare("SELECT id FROM settings WHERE id = 1").get();
  if (!settings) {
    db.prepare(
      `INSERT INTO settings (
        id, sender_name, sender_email, reply_to_email, sender_phone,
        timezone, packet_url, fleet_counts_enabled
      ) VALUES (1, ?, ?, ?, ?, ?, ?, 0)`,
    ).run(
      DEFAULT_SENDER_NAME,
      FROM_EMAIL,
      REPLY_TO_EMAIL,
      DEFAULT_SENDER_PHONE,
      TIMEZONE,
      PACKET_URL,
    );
  }
}
