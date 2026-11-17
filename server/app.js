import express from 'express';
import {
  SESSION_COOKIE, MIN_PASSWORD, authenticate, createSession, userForToken, deleteSession,
  verifyPassword, setPassword
} from './auth.js';
import { db } from './db.js';
import { TABLES, ValidationError, listAll, upsert, remove, replaceAll } from './records.js';
import { LIMITS, createRequest, latestRequest, publicView, submit } from './testimonials.js';
import { mailConfigured } from './mailer.js';
import { parseImage, saveHeadshot, getHeadshot, deleteHeadshot } from './headshots.js';

export const app = express();
app.set('trust proxy', 'loopback');
app.disable('x-powered-by');

// Private app: ask search engines and AI crawlers not to index, follow or reuse anything,
// including the public testimonial pages and API responses.
app.use((req, res, next) => {
  res.set('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet, noimageindex, noai, noimageai');
  next();
});

const api = express.Router();
api.use(express.json({ limit: '5mb' }));

// Basic CSRF protection: state-changing requests must be JSON (which forces a CORS preflight cross-site).
api.use((req, res, next) => {
  if (['POST', 'PUT', 'PATCH'].includes(req.method) && !req.is('application/json')) {
    return res.status(415).json({ error: 'Expected JSON' });
  }
  next();
});

function readCookie(req, name) {
  for (const part of (req.headers.cookie ?? '').split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return null;
}

const cookieOpts = (req) => ({ httpOnly: true, sameSite: 'lax', secure: req.secure, path: '/' });

// --- Login rate limiting (in memory, per IP) ---
const attempts = new Map();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 10;

function rateLimited(key, max = MAX_ATTEMPTS) {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || entry.reset < now) {
    attempts.set(key, { count: 1, reset: now + WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > max;
}

// --- Public auth routes ---
api.post('/login', async (req, res) => {
  if (rateLimited(req.ip)) {
    return res.status(429).json({ error: 'Too many sign-in attempts. Try again in 15 minutes.' });
  }
  const { email, password } = req.body ?? {};
  if (typeof email !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'Username and password are required' });
  }
  const user = await authenticate(email, password);
  if (!user) return res.status(401).json({ error: 'Incorrect username or password' });

  attempts.delete(req.ip);
  const { token, expires } = createSession(user.id);
  res.cookie(SESSION_COOKIE, token, { ...cookieOpts(req), expires });
  res.json({ user: { id: user.id, email: user.email, displayName: user.display_name } });
});

api.post('/logout', (req, res) => {
  deleteSession(readCookie(req, SESSION_COOKIE));
  res.clearCookie(SESSION_COOKIE, cookieOpts(req));
  res.status(204).end();
});

// --- Public testimonial form (no session; the link token is the credential) ---
api.get('/public/testimonials/:token', (req, res) => {
  if (rateLimited(`pub:${req.ip}`, 120)) return res.status(429).json({ error: 'Too many requests. Try again later.' });
  res.json(publicView(req.params.token));
});

api.post('/public/testimonials/:token', async (req, res) => {
  if (rateLimited(`pub:${req.ip}`, 120)) return res.status(429).json({ error: 'Too many requests. Try again later.' });
  const result = await submit(req.params.token, req.body ?? {});
  if (result.error) return res.status(result.status).json({ error: result.error });
  res.json({ ok: true });
});

// --- Everything below requires a session ---
api.use((req, res, next) => {
  const user = userForToken(readCookie(req, SESSION_COOKIE));
  if (!user) return res.status(401).json({ error: 'Not signed in' });
  req.user = user;
  next();
});

api.get('/me', (req, res) => res.json({ user: req.user }));

api.post('/password', async (req, res) => {
  const { current, next } = req.body ?? {};
  const row = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.user.id);
  if (typeof current !== 'string' || !(await verifyPassword(current, row.password_hash))) {
    return res.status(400).json({ error: 'Current password is incorrect' });
  }
  if (typeof next !== 'string' || next.length < MIN_PASSWORD) {
    return res.status(400).json({ error: `New password must be at least ${MIN_PASSWORD} characters` });
  }
  await setPassword(req.user.id, next); // also ends all sessions
  const { token, expires } = createSession(req.user.id);
  res.cookie(SESSION_COOKIE, token, { ...cookieOpts(req), expires });
  res.status(204).end();
});

api.get('/mail-status', (req, res) => res.json({ configured: mailConfigured() }));

api.get('/contacts/:id/testimonial-request', (req, res) => {
  res.json({ request: latestRequest(req.params.id, req.user.id) });
});

api.post('/contacts/:id/testimonial-request', async (req, res) => {
  const { senderName, subject, message, localDate } = req.body ?? {};
  const clean = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
  const fields = {
    senderName: clean(senderName, LIMITS.senderName),
    subject: clean(subject, LIMITS.subject).replace(/[\r\n]+/g, ' '),
    message: clean(message, LIMITS.message)
  };
  if (!fields.senderName || !fields.subject || !fields.message) {
    return res.status(400).json({ error: 'Your name, a subject and a message are all required' });
  }
  if (rateLimited(`mail:${req.user.id}`, 30)) {
    return res.status(429).json({ error: 'Too many emails sent recently. Try again in a few minutes.' });
  }
  // Public link points at this app. Set APP_URL in production (e.g. https://crm.example.com).
  const baseUrl = (process.env.APP_URL || req.get('origin') || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
  const result = await createRequest({ user: req.user, contactId: req.params.id, baseUrl, localDate, ...fields });
  if (result.error) return res.status(result.status).json({ error: result.error });
  res.json({
    delivered: result.delivered,
    link: result.link,
    to: result.to,
    request: result.request,
    activity: result.activity
  });
});

// --- Contact photos ---
api.get('/contacts/:id/headshot', (req, res) => {
  const photo = getHeadshot(req.params.id, req.user.id);
  if (!photo) return res.status(404).json({ error: 'No photo' });
  res.set({
    'Content-Type': photo.mime,
    'Content-Length': photo.data.length,
    // The app adds ?v=<updated time>, so a new photo gets a new URL.
    'Cache-Control': 'private, max-age=31536000, immutable',
    'X-Content-Type-Options': 'nosniff',
    'Content-Security-Policy': "default-src 'none'; sandbox"
  });
  res.end(photo.data);
});

api.put('/contacts/:id/headshot', (req, res) => {
  const headshotAt = saveHeadshot(req.params.id, req.user.id, parseImage(req.body?.image));
  if (!headshotAt) return res.status(404).json({ error: 'Contact not found' });
  res.json({ headshotAt });
});

api.delete('/contacts/:id/headshot', (req, res) => {
  deleteHeadshot(req.params.id, req.user.id);
  res.status(204).end();
});

api.get('/data', (req, res) => res.json(listAll(req.user.id)));

api.post('/import', (req, res) => res.json(replaceAll(req.user.id, req.body ?? {})));

api.param('collection', (req, res, next, name) => {
  if (!Object.hasOwn(TABLES, name)) return res.status(404).json({ error: 'Unknown collection' });
  next();
});

api.put('/:collection/:id', (req, res) => {
  const saved = upsert(req.params.collection, req.params.id, req.body ?? {}, req.user.id);
  if (!saved) return res.status(404).json({ error: 'Not found' });
  res.json(saved);
});

api.delete('/:collection/:id', (req, res) => {
  remove(req.params.collection, req.params.id, req.user.id);
  res.status(204).end();
});

api.use((req, res) => res.status(404).json({ error: 'Not found' }));

api.use((err, req, res, _next) => {
  if (err instanceof ValidationError) return res.status(400).json({ error: err.message });
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON' });
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Payload too large' });
  console.error(err);
  res.status(500).json({ error: 'Something went wrong' });
});

app.use('/api', api);
