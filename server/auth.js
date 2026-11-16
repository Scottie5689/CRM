import { randomBytes, scrypt as scryptCb, timingSafeEqual, createHash, randomUUID } from 'node:crypto';
import { promisify } from 'node:util';
import { db } from './db.js';

const scrypt = promisify(scryptCb);
const KEYLEN = 64;
const PARAMS = { N: 16384, r: 8, p: 1 };

// Override when running several instances on one host (cookies ignore the port).
export const SESSION_COOKIE = process.env.CRM_COOKIE_NAME || 'crm_session';
export const SESSION_DAYS = 30;
export const MIN_PASSWORD = 10;

export async function hashPassword(password) {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, KEYLEN, PARAMS);
  return `scrypt$${salt.toString('base64')}$${hash.toString('base64')}`;
}

export async function verifyPassword(password, stored) {
  const [scheme, saltB64, hashB64] = String(stored).split('$');
  if (scheme !== 'scrypt' || !saltB64 || !hashB64) return false;
  const expected = Buffer.from(hashB64, 'base64');
  const actual = await scrypt(password, Buffer.from(saltB64, 'base64'), expected.length, PARAMS);
  return timingSafeEqual(expected, actual);
}

// Used to keep login timing the same whether or not the email exists.
const DUMMY_HASH = await hashPassword(randomBytes(16).toString('hex'));

const sha256 = (s) => createHash('sha256').update(s).digest('hex');

export function findUserByEmail(email) {
  return db.prepare('SELECT * FROM users WHERE email = ?').get(String(email).trim());
}

export async function createUser(email, password) {
  const id = randomUUID();
  db.prepare('INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)').run(
    id, email.trim().toLowerCase(), await hashPassword(password), new Date().toISOString()
  );
  return id;
}

export async function setPassword(userId, password) {
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(await hashPassword(password), userId);
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId); // sign out everywhere
}

/** Returns the user if the credentials are valid, otherwise null. */
export async function authenticate(email, password) {
  const user = findUserByEmail(email);
  const ok = await verifyPassword(String(password), user?.password_hash ?? DUMMY_HASH);
  return ok && user ? user : null;
}

/** Creates a session and returns the raw token (only its hash is stored). */
export function createSession(userId) {
  const token = randomBytes(32).toString('base64url');
  const expires = Date.now() + SESSION_DAYS * 864e5;
  db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(Date.now());
  db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)').run(sha256(token), userId, expires);
  return { token, expires: new Date(expires) };
}

export function userForToken(token) {
  if (!token) return null;
  return db
    .prepare(`SELECT u.id, u.email, u.display_name AS displayName FROM sessions s JOIN users u ON u.id = s.user_id
              WHERE s.token_hash = ? AND s.expires_at > ?`)
    .get(sha256(token), Date.now());
}

export function deleteSession(token) {
  if (token) db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(sha256(token));
}
