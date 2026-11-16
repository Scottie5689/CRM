import { randomBytes, createHash } from 'node:crypto';
import { db } from './db.js';
import { sendMail } from './mailer.js';

const sha256 = (s) => createHash('sha256').update(s).digest('hex');
const LINK_DAYS = 30;
export const LIMITS = { subject: 200, message: 5000, senderName: 100, testimonial: 5000 };

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/** Latest request for a contact (for the status line on the contact page). */
export function latestRequest(contactId, userId) {
  const r = db
    .prepare(
      `SELECT sent_at, submitted_at, expires_at, revoked_at FROM testimonial_requests
       WHERE contact_id = ? AND user_id = ? ORDER BY sent_at DESC LIMIT 1`
    )
    .get(contactId, userId);
  return r
    ? { sentAt: r.sent_at, submittedAt: r.submitted_at, expiresAt: new Date(r.expires_at).toISOString() }
    : null;
}

function emailHtml({ message, link, senderName }) {
  const paragraphs = esc(message)
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 16px">${p.replace(/\n/g, '<br>')}</p>`)
    .join('');
  return `<!doctype html><html><body style="margin:0;padding:24px;background:#f6f7f9;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1a1d23">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center">
    <table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:12px;border:1px solid #e2e5ea" cellspacing="0" cellpadding="0">
      <tr><td style="padding:32px 32px 8px;font-size:16px;line-height:1.55">${paragraphs}</td></tr>
      <tr><td align="center" style="padding:8px 32px 28px">
        <a href="${esc(link)}" style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;font-weight:600;font-size:16px;padding:12px 24px;border-radius:8px">Share your feedback</a>
        <p style="margin:12px 0 0;font-size:13px;color:#6b7280">It takes about a minute — just a star rating and a few words.</p>
      </td></tr>
      <tr><td style="padding:16px 32px 28px;border-top:1px solid #e2e5ea;font-size:12px;color:#6b7280;line-height:1.5">
        Button not working? Copy this link into your browser:<br><a href="${esc(link)}" style="color:#4f46e5;word-break:break-all">${esc(link)}</a><br><br>
        Sent by ${esc(senderName)}. The link is personal to you and expires in ${LINK_DAYS} days.
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;
}

/** Create a request link for a contact and email it. */
export async function createRequest({ user, contactId, senderName, subject, message, baseUrl }) {
  const contact = db.prepare('SELECT * FROM contacts WHERE id = ? AND user_id = ?').get(contactId, user.id);
  if (!contact) return { error: 'Contact not found', status: 404 };
  if (!contact.email) return { error: 'This contact has no email address', status: 400 };

  const token = randomBytes(32).toString('base64url');
  const now = new Date();
  const expires = now.getTime() + LINK_DAYS * 864e5;
  const link = `${baseUrl}/#/t/${token}`;

  // Only the newest link for a contact stays valid.
  db.prepare(
    `UPDATE testimonial_requests SET revoked_at = ? WHERE contact_id = ? AND submitted_at IS NULL AND revoked_at IS NULL`
  ).run(now.toISOString(), contactId);
  db.prepare(
    `INSERT INTO testimonial_requests (token_hash, user_id, contact_id, sender_name, sent_at, expires_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(sha256(token), user.id, contactId, senderName, now.toISOString(), expires);
  db.prepare('UPDATE users SET display_name = ? WHERE id = ?').run(senderName, user.id);

  const text = `${message}\n\nShare your feedback: ${link}\n\nThe link is personal to you and expires in ${LINK_DAYS} days.`;
  const result = await sendMail({
    to: contact.email,
    subject,
    text,
    html: emailHtml({ message, link, senderName }),
    fromName: senderName,
    replyTo: user.email
  });

  return { ...result, link, to: contact.email, request: latestRequest(contactId, user.id) };
}

function findByToken(token) {
  if (typeof token !== 'string' || token.length < 20) return null;
  return db
    .prepare(
      `SELECT r.*, c.first_name, c.email AS contact_email, c.id AS cid, u.email AS user_email
       FROM testimonial_requests r
       JOIN contacts c ON c.id = r.contact_id
       JOIN users u ON u.id = r.user_id
       WHERE r.token_hash = ?`
    )
    .get(sha256(token));
}

function linkState(r) {
  if (!r || r.revoked_at) return 'invalid';
  if (r.submitted_at) return 'submitted';
  if (r.expires_at < Date.now()) return 'expired';
  return 'open';
}

/** What the public form needs to render. Reveals nothing beyond first names. */
export function publicView(token) {
  const r = findByToken(token);
  const state = linkState(r);
  if (state === 'invalid') return { state };
  return { state, firstName: r.first_name, senderName: r.sender_name };
}

export async function submit(token, { rating, testimonial }) {
  const r = findByToken(token);
  const state = linkState(r);
  if (state !== 'open') return { error: state === 'submitted' ? 'This link has already been used.' : 'This link is no longer valid.', status: 410 };

  const n = Math.round(Number(rating));
  if (!(n >= 1 && n <= 5)) return { error: 'Please choose a rating from 1 to 5 stars.', status: 400 };
  const text = typeof testimonial === 'string' ? testimonial.trim().slice(0, LIMITS.testimonial) : '';
  if (!text) return { error: 'Please write a few words.', status: 400 };

  const now = new Date().toISOString();
  db.exec('BEGIN');
  try {
    // Mark used first; the WHERE guards against a double submit racing in.
    const used = db
      .prepare('UPDATE testimonial_requests SET submitted_at = ? WHERE token_hash = ? AND submitted_at IS NULL')
      .run(now, r.token_hash);
    if (used.changes === 0) throw Object.assign(new Error('used'), { used: true });
    db.prepare(
      `UPDATE contacts SET testimonial = ?, testimonial_rating = ?, updated_at = ? WHERE id = ? AND user_id = ?`
    ).run(text, n, now, r.contact_id, r.user_id);
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    if (err.used) return { error: 'This link has already been used.', status: 410 };
    throw err;
  }

  // Let the account owner know (best effort).
  sendMail({
    to: r.user_email,
    subject: `New testimonial from ${r.first_name}: ${'★'.repeat(n)}${'☆'.repeat(5 - n)}`,
    text: `${r.first_name} left you a ${n}-star testimonial:\n\n"${text}"\n\nIt has been saved to their contact in your CRM.`,
    html: `<p>${esc(r.first_name)} left you a <b>${n}-star</b> testimonial:</p><blockquote style="border-left:3px solid #4f46e5;margin:0;padding:4px 12px">${esc(text).replace(/\n/g, '<br>')}</blockquote><p>It has been saved to their contact in your CRM.</p>`,
    fromName: 'CRM'
  }).catch((err) => console.error('Notification email failed:', err.message));

  return { ok: true };
}
