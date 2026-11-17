import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { SCHEMA } from '../shared/schema.js';

const path = resolve(process.env.CRM_DB_PATH || 'data/crm.sqlite');
mkdirSync(dirname(path), { recursive: true });

export const db = new DatabaseSync(path);

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS users (
    id            TEXT PRIMARY KEY,
    email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    created_at    TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS companies (
    id         TEXT PRIMARY KEY,
    user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name       TEXT NOT NULL,
    website    TEXT,
    industry   TEXT,
    notes      TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT
  );

  CREATE TABLE IF NOT EXISTS contacts (
    id         TEXT PRIMARY KEY,
    user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    first_name TEXT NOT NULL,
    last_name  TEXT,
    email      TEXT,
    phone      TEXT,
    role       TEXT,
    company_id TEXT REFERENCES companies(id) ON DELETE SET NULL,
    notes      TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT
  );

  CREATE TABLE IF NOT EXISTS leads (
    id         TEXT PRIMARY KEY,
    user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title      TEXT NOT NULL,
    company_id TEXT REFERENCES companies(id) ON DELETE SET NULL,
    contact_id TEXT REFERENCES contacts(id) ON DELETE SET NULL,
    value      REAL NOT NULL DEFAULT 0,
    stage      TEXT NOT NULL DEFAULT 'new',
    source     TEXT,
    follow_up  TEXT,
    notes      TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT
  );

  CREATE TABLE IF NOT EXISTS testimonial_requests (
    token_hash   TEXT PRIMARY KEY,
    user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    contact_id   TEXT NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    sender_name  TEXT,
    sent_at      TEXT NOT NULL,
    expires_at   INTEGER NOT NULL,
    submitted_at TEXT,
    revoked_at   TEXT
  );
  CREATE INDEX IF NOT EXISTS testimonial_requests_contact ON testimonial_requests(contact_id);

  -- Activity log. Other columns (type, date, notes) are added from shared/schema.js below.
  CREATE TABLE IF NOT EXISTS activities (
    id         TEXT PRIMARY KEY,
    user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    contact_id TEXT NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL,
    updated_at TEXT
  );
  CREATE INDEX IF NOT EXISTS activities_user    ON activities(user_id);
  CREATE INDEX IF NOT EXISTS activities_contact ON activities(contact_id);

  -- One photo per contact. No foreign key on contact_id on purpose: a backup import deletes
  -- and re-adds contacts with the same ids, and the photos should survive that. Orphans are
  -- removed by pruneHeadshots() in records.js.
  CREATE TABLE IF NOT EXISTS headshots (
    contact_id TEXT PRIMARY KEY,
    user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    mime       TEXT NOT NULL,
    data       BLOB NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS companies_user ON companies(user_id);
  CREATE INDEX IF NOT EXISTS contacts_user  ON contacts(user_id);
  CREATE INDEX IF NOT EXISTS leads_user     ON leads(user_id);
  CREATE INDEX IF NOT EXISTS sessions_user  ON sessions(user_id);
`);

// Columns added after the first release.
const userCols = new Set(db.prepare('PRAGMA table_info(users)').all().map((c) => c.name));
if (!userCols.has('display_name')) db.exec('ALTER TABLE users ADD COLUMN display_name TEXT');

// Add any columns defined in shared/schema.js that the database doesn't have yet.
const SQL_TYPE = { rating: 'INTEGER', number: 'REAL', boolean: 'INTEGER' };
for (const [table, fields] of Object.entries(SCHEMA)) {
  const have = new Set(db.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name));
  for (const f of fields) {
    if (have.has(f.column)) continue;
    if (!/^[a-z_][a-z0-9_]*$/.test(f.column)) throw new Error(`Bad column name: ${f.column}`);
    const ref = f.type === 'ref' ? ` REFERENCES ${f.ref}(id) ON DELETE SET NULL` : '';
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${f.column} ${SQL_TYPE[f.type] ?? 'TEXT'}${ref}`);
    console.log(`Database: added column ${table}.${f.column}`);
  }
}

export function transaction(fn) {
  db.exec('BEGIN');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}
