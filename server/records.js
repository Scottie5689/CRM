// Maps the frontend's camelCase records to SQLite rows, scoped per user.
import { db, transaction } from './db.js';
import { SCHEMA } from '../shared/schema.js';

export const TABLES = SCHEMA;

export class ValidationError extends Error {}

const owns = (table, id, userId) =>
  !!id && !!db.prepare(`SELECT 1 FROM ${table} WHERE id = ? AND user_id = ?`).get(id, userId);

/** Coerce one incoming value to what the column should hold (null = empty). */
function clean(f, v, userId) {
  switch (f.type) {
    case 'rating': {
      const n = Math.round(Number(v));
      return n >= 1 && n <= (f.max ?? 5) ? n : null;
    }
    case 'boolean':
      return v === true || v === 1 || v === 'true' ? 1 : 0;
    case 'number':
      return Math.max(f.min ?? -Infinity, Number(v) || 0);
    case 'date':
      return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
    case 'select':
      return f.options.includes(v) ? v : (f.default ?? null);
    case 'ref':
      return typeof v === 'string' && owns(f.ref, v, userId) ? v : null;
    default: {
      if (v === null || v === undefined) return null;
      const s = String(v).trim().slice(0, f.maxLength ?? 10_000);
      return s || null;
    }
  }
}

function toRow(collection, record, userId) {
  const row = {};
  for (const f of SCHEMA[collection]) {
    row[f.column] = clean(f, record[f.key], userId);
    if (f.required && row[f.column] === null) throw new ValidationError(`"${f.label}" is required`);
  }
  return row;
}

const EMPTY = { number: 0, rating: 0 };

const headshotStmt = db.prepare('SELECT updated_at FROM headshots WHERE contact_id = ?');

function fromRow(collection, row) {
  const out = { id: row.id, createdAt: row.created_at };
  if (row.updated_at) out.updatedAt = row.updated_at;
  for (const f of SCHEMA[collection]) {
    out[f.key] = f.type === 'boolean' ? !!row[f.column] : (row[f.column] ?? EMPTY[f.type] ?? '');
  }
  // Read-only: set by uploading a photo, never by saving the record.
  if (collection === 'contacts') out.headshotAt = headshotStmt.get(row.id)?.updated_at ?? '';
  return out;
}

export function listAll(userId) {
  const data = {};
  for (const c of Object.keys(TABLES)) {
    data[c] = db
      .prepare(`SELECT * FROM ${c} WHERE user_id = ? ORDER BY created_at`)
      .all(userId)
      .map((r) => fromRow(c, r));
  }
  return data;
}

/** Insert or update. Returns the saved record, or null if the id belongs to someone else. */
export function upsert(collection, id, record, userId) {
  const row = toRow(collection, record, userId);
  const cols = Object.keys(row);
  const now = new Date().toISOString();
  const createdAt = typeof record.createdAt === 'string' ? record.createdAt : now;

  const result = db
    .prepare(
      `INSERT INTO ${collection} (id, user_id, created_at, ${cols.join(', ')})
       VALUES (:id, :user_id, :created_at, ${cols.map((c) => ':' + c).join(', ')})
       ON CONFLICT(id) DO UPDATE SET ${cols.map((c) => `${c} = excluded.${c}`).join(', ')}, updated_at = :now
       WHERE ${collection}.user_id = excluded.user_id`
    )
    .run({ ...row, id, user_id: userId, created_at: createdAt, now });

  if (result.changes === 0) return null;
  return fromRow(collection, db.prepare(`SELECT * FROM ${collection} WHERE id = ?`).get(id));
}

export function remove(collection, id, userId) {
  const removed = db.prepare(`DELETE FROM ${collection} WHERE id = ? AND user_id = ?`).run(id, userId).changes > 0;
  if (removed && collection === 'contacts') pruneHeadshots(userId);
  return removed;
}

/** Delete photos whose contact no longer exists. */
export function pruneHeadshots(userId) {
  db.prepare(
    `DELETE FROM headshots WHERE user_id = ?
     AND contact_id NOT IN (SELECT id FROM contacts WHERE user_id = ?)`
  ).run(userId, userId);
}

/** Replace all of a user's data (used for backup import / reset / sample data). */
export function replaceAll(userId, data) {
  for (const c of Object.keys(TABLES)) {
    if (data[c] !== undefined && !Array.isArray(data[c])) throw new ValidationError(`"${c}" must be a list`);
  }
  transaction(() => {
    for (const c of ['leads', 'contacts', 'companies']) db.prepare(`DELETE FROM ${c} WHERE user_id = ?`).run(userId);
    // Order matters so links between imported records resolve.
    for (const c of ['companies', 'contacts', 'leads']) {
      for (const record of data[c] ?? []) {
        const id = typeof record.id === 'string' && record.id ? record.id : crypto.randomUUID();
        if (!upsert(c, id, record, userId)) throw new ValidationError(`Record ${id} conflicts with existing data`);
      }
    }
    // Photos of contacts that are in the backup are kept; the rest are removed.
    pruneHeadshots(userId);
  });
  return listAll(userId);
}
