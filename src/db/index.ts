import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

const dbFile =
  process.env.DATABASE_FILE ?? path.join(process.cwd(), "data", "tipulog.db");

const globalForDb = globalThis as unknown as {
  tipulogSqlite?: Database.Database;
};

function createConnection() {
  fs.mkdirSync(path.dirname(dbFile), { recursive: true });
  const sqlite = new Database(dbFile);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  bootstrap(sqlite);
  return sqlite;
}

// Idempotent schema bootstrap so a fresh clone works with plain `npm run dev`,
// no migration step required. Keep in sync with src/db/schema.ts.
function bootstrap(sqlite: Database.Database) {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      clinic_name TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS patients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      id_number TEXT,
      phone TEXT,
      email TEXT,
      birth_date TEXT,
      address TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      referral_source TEXT,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS appointments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      patient_id INTEGER NOT NULL REFERENCES patients(id),
      date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      duration_min INTEGER NOT NULL DEFAULT 50,
      type TEXT NOT NULL DEFAULT 'session',
      location TEXT,
      status TEXT NOT NULL DEFAULT 'scheduled',
      price REAL NOT NULL DEFAULT 0,
      note TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS session_notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      patient_id INTEGER NOT NULL REFERENCES patients(id),
      appointment_id INTEGER REFERENCES appointments(id),
      date TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS note_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      name TEXT NOT NULL,
      body TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      patient_id INTEGER NOT NULL REFERENCES patients(id),
      appointment_id INTEGER REFERENCES appointments(id),
      amount REAL NOT NULL,
      method TEXT NOT NULL DEFAULT 'cash',
      date TEXT NOT NULL,
      receipt_number INTEGER NOT NULL,
      note TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      patient_id INTEGER NOT NULL REFERENCES patients(id),
      file_name TEXT NOT NULL,
      stored_key TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      size INTEGER NOT NULL,
      storage TEXT NOT NULL DEFAULT 'local',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS settings (
      user_id INTEGER PRIMARY KEY REFERENCES users(id),
      whatsapp_enabled INTEGER NOT NULL DEFAULT 0,
      whatsapp_number TEXT,
      work_start TEXT NOT NULL DEFAULT '09:00',
      work_end TEXT NOT NULL DEFAULT '17:00',
      slot_minutes INTEGER NOT NULL DEFAULT 60,
      default_price REAL NOT NULL DEFAULT 350,
      reminder_enabled INTEGER NOT NULL DEFAULT 0,
      reminder_hours_before INTEGER NOT NULL DEFAULT 24,
      reminder_template TEXT
    );
    CREATE TABLE IF NOT EXISTS reminders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      appointment_id INTEGER NOT NULL UNIQUE REFERENCES appointments(id),
      patient_id INTEGER NOT NULL REFERENCES patients(id),
      phone TEXT NOT NULL,
      message TEXT NOT NULL,
      status TEXT NOT NULL,
      detail TEXT,
      sent_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS whatsapp_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      phone TEXT NOT NULL,
      state TEXT NOT NULL DEFAULT '{}',
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_documents_patient ON documents(patient_id);
    CREATE INDEX IF NOT EXISTS idx_wa_sessions_user_phone ON whatsapp_sessions(user_id, phone);
    CREATE INDEX IF NOT EXISTS idx_patients_user ON patients(user_id);
    CREATE INDEX IF NOT EXISTS idx_appointments_user_date ON appointments(user_id, date);
    CREATE INDEX IF NOT EXISTS idx_notes_patient ON session_notes(patient_id);
    CREATE INDEX IF NOT EXISTS idx_payments_user_date ON payments(user_id, date);
  `);
  // Lightweight migrations for databases created before these columns existed.
  const addMissing = (table: string, column: string, ddl: string) => {
    const cols = sqlite
      .prepare(`PRAGMA table_info(${table})`)
      .all() as { name: string }[];
    if (!cols.some((c) => c.name === column)) {
      sqlite.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
    }
  };
  addMissing("appointments", "source", "source TEXT NOT NULL DEFAULT 'manual'");
  addMissing("settings", "reminder_enabled", "reminder_enabled INTEGER NOT NULL DEFAULT 0");
  addMissing("settings", "reminder_hours_before", "reminder_hours_before INTEGER NOT NULL DEFAULT 24");
  addMissing("settings", "reminder_template", "reminder_template TEXT");
}

const sqlite = globalForDb.tipulogSqlite ?? createConnection();
globalForDb.tipulogSqlite = sqlite;

export const db = drizzle(sqlite, { schema });
