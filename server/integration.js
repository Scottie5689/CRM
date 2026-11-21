// Connection to the public website (scottv.tech).
//
// The website calls these endpoints server-to-server with a shared secret:
//   POST /api/integrations/website/contacts               form submission -> contact + activity
//   GET  /api/integrations/website/testimonials           testimonials, limited to what each person consented to share
//   GET  /api/integrations/website/testimonials/:id/photo the contact's photo, only with name consent
//
// Settings (in .env):
//   WEBSITE_API_KEY  the shared secret, at least 32 characters (same value as CRM_API_KEY on the website)
//   WEBSITE_USER     email of the CRM user that owns contacts created by the website
// Without WEBSITE_API_KEY the endpoints answer 404, as if they didn't exist.
import { createHash, timingSafeEqual } from 'node:crypto';
import { db } from './db.js';
import { upsert, ValidationError } from './records.js';
import { findUserByEmail } from './auth.js';

const MIN_KEY_LENGTH = 32;
const sha256 = (s) => createHash('sha256').update(s).digest();

export function integrationEnabled() {
  return (process.env.WEBSITE_API_KEY ?? '').length >= MIN_KEY_LENGTH;
}

if (process.env.WEBSITE_API_KEY && !integrationEnabled()) {
  console.warn(`WEBSITE_API_KEY is shorter than ${MIN_KEY_LENGTH} characters, so the website connection is off.`);
}

/** True if the request carries `Authorization: Bearer <WEBSITE_API_KEY>`. Constant-time comparison. */
export function validKey(header) {
  const m = /^Bearer (.+)$/.exec(header ?? '');
  if (!m || !integrationEnabled()) return false;
  return timingSafeEqual(sha256(m[1]), sha256(process.env.WEBSITE_API_KEY));
}

/** The CRM user that website records belong to, or null if WEBSITE_USER isn't a user. */
export function websiteUser() {
  const email = process.env.WEBSITE_USER;
  return email ? (findUserByEmail(email) ?? null) : null;
}

const FORMS = {
  contact: 'Contact form',
  audit: 'Website audit request'
};

const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

/**
 * Record a website form submission: find the contact by email (or create one with
 * source "Website"), then log the submission as an activity on it.
 * Safe to retry: the activity id comes from the submission id, so a repeat is a no-op.
 */
export function recordSubmission(userId, body) {
  const submissionId = str(body.submissionId, 64);
  if (!/^[A-Za-z0-9-]{8,64}$/.test(submissionId)) throw new ValidationError('Missing or invalid submissionId');
  const formLabel = FORMS[body.form];
  if (!formLabel) throw new ValidationError('Unknown form');

  const name = str(body.name, 200);
  const email = str(body.email, 320).toLowerCase();
  if (!name) throw new ValidationError('Name is required');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ValidationError('A valid email is required');
  const website = str(body.website, 500);
  const message = str(body.message, 5000);
  const submittedAt = !isNaN(Date.parse(body.submittedAt)) ? new Date(body.submittedAt) : new Date();

  const activityId = `web-${submissionId}`;
  const done = db.prepare('SELECT contact_id FROM activities WHERE id = ? AND user_id = ?').get(activityId, userId);
  if (done) return { contactId: done.contact_id, created: false, duplicate: true };

  let contact = db
    .prepare('SELECT id FROM contacts WHERE user_id = ? AND email = ? COLLATE NOCASE ORDER BY created_at LIMIT 1')
    .get(userId, email);
  const created = !contact;
  if (created) {
    const [firstName, ...rest] = name.split(/\s+/);
    contact = upsert('contacts', crypto.randomUUID(), {
      firstName,
      lastName: rest.join(' '),
      email,
      source: 'Website',
      createdAt: submittedAt.toISOString()
    }, userId);
  }

  const notes = [
    `${formLabel} on scottv.tech`,
    website && `Website: ${website}`,
    message && `\n${message}`
  ].filter(Boolean).join('\n');

  upsert('activities', activityId, {
    contactId: contact.id,
    type: 'Message',
    date: submittedAt.toLocaleDateString('en-CA'), // YYYY-MM-DD in the server's time zone (TZ)
    notes,
    createdAt: submittedAt.toISOString()
  }, userId);

  return { contactId: contact.id, created, duplicate: false };
}

/**
 * Every contact with a testimonial, reduced to what may be shown publicly:
 * the name, role and photo only with name consent, the company only with company consent.
 */
export function listTestimonials(userId) {
  const rows = db.prepare(
    `SELECT c.id, c.first_name, c.last_name, c.role, c.testimonial, c.testimonial_rating,
            c.consent_name, c.consent_company, c.created_at,
            co.name AS company, h.updated_at AS photo_at,
            (SELECT MAX(submitted_at) FROM testimonial_requests r WHERE r.contact_id = c.id) AS submitted_at
       FROM contacts c
       LEFT JOIN companies co ON co.id = c.company_id
       LEFT JOIN headshots h ON h.contact_id = c.id
      WHERE c.user_id = ? AND TRIM(COALESCE(c.testimonial, '')) <> ''
      ORDER BY c.created_at`
  ).all(userId);

  return rows.map((r) => {
    const named = !!r.consent_name;
    return {
      id: r.id,
      text: r.testimonial.trim(),
      rating: r.testimonial_rating || null,
      name: named ? [r.first_name, r.last_name].filter(Boolean).join(' ') : null,
      role: named ? r.role || null : null,
      company: r.consent_company ? r.company || null : null,
      photoAt: named ? r.photo_at || null : null,
      givenAt: r.submitted_at || r.created_at
    };
  });
}

/** A contact's photo, only if they have a testimonial and consented to their name being shown. */
export function testimonialPhoto(userId, contactId) {
  return db.prepare(
    `SELECT h.mime, h.data, h.updated_at FROM headshots h
       JOIN contacts c ON c.id = h.contact_id
      WHERE h.contact_id = ? AND c.user_id = ? AND c.consent_name = 1
        AND TRIM(COALESCE(c.testimonial, '')) <> ''`
  ).get(contactId, userId);
}
