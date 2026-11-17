// Contact photos (headshots), stored in the database so backups of crm.sqlite include them.
// Browsers re-encode uploads to JPEG before sending (src/lib/image.js), so only JPEG is accepted.
import { db } from './db.js';
import { ValidationError } from './records.js';

export const MAX_BYTES = 3 * 1024 * 1024;

/** Decode a `data:image/jpeg;base64,...` string, or throw a ValidationError. */
export function parseImage(dataUrl) {
  const m = typeof dataUrl === 'string' && /^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!m) throw new ValidationError('The photo must be a JPEG image.');
  const data = Buffer.from(m[1], 'base64');
  if (data.length > MAX_BYTES) throw new ValidationError('The photo is too large (3 MB max).');
  // JPEG files start with FF D8 FF.
  if (data.length < 4 || data[0] !== 0xff || data[1] !== 0xd8 || data[2] !== 0xff) {
    throw new ValidationError("That file doesn't look like a JPEG image.");
  }
  return { mime: 'image/jpeg', data };
}

const owns = (contactId, userId) =>
  !!db.prepare('SELECT 1 FROM contacts WHERE id = ? AND user_id = ?').get(contactId, userId);

/** Save (or replace) a contact's photo. Returns the new timestamp, or null if the contact isn't the user's. */
export function saveHeadshot(contactId, userId, { mime, data }) {
  if (!owns(contactId, userId)) return null;
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO headshots (contact_id, user_id, mime, data, updated_at) VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(contact_id) DO UPDATE SET mime = excluded.mime, data = excluded.data, updated_at = excluded.updated_at`
  ).run(contactId, userId, mime, data, now);
  return now;
}

export function getHeadshot(contactId, userId) {
  return db.prepare('SELECT mime, data FROM headshots WHERE contact_id = ? AND user_id = ?').get(contactId, userId);
}

export function deleteHeadshot(contactId, userId) {
  db.prepare('DELETE FROM headshots WHERE contact_id = ? AND user_id = ?').run(contactId, userId);
}
