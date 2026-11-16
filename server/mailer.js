// Sends email through SMTP when SMTP_URL is set. Otherwise (e.g. in development)
// the message is written to data/outbox/ so nothing is sent by accident.
import nodemailer from 'nodemailer';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SMTP_URL = process.env.SMTP_URL; // e.g. smtps://user:pass@smtp.example.com:465
const MAIL_FROM = process.env.MAIL_FROM; // e.g. hello@yourdomain.com
const OUTBOX = resolve(process.env.CRM_OUTBOX || 'data/outbox');

const transport = SMTP_URL ? nodemailer.createTransport(SMTP_URL) : null;

export const mailConfigured = () => !!(transport && MAIL_FROM);

/**
 * @returns {Promise<{ delivered: boolean, outboxFile?: string }>}
 */
export async function sendMail({ to, subject, text, html, fromName, replyTo }) {
  const message = {
    from: MAIL_FROM ? { name: fromName || '', address: MAIL_FROM } : undefined,
    to,
    replyTo,
    subject,
    text,
    html
  };

  if (mailConfigured()) {
    await transport.sendMail(message);
    return { delivered: true };
  }

  mkdirSync(OUTBOX, { recursive: true });
  const file = resolve(OUTBOX, `${new Date().toISOString().replace(/[:.]/g, '-')}.html`);
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  writeFileSync(
    file,
    `<!-- NOT SENT: SMTP_URL / MAIL_FROM not configured -->\n` +
      `<p><b>To:</b> ${esc(to)}<br><b>Reply-To:</b> ${esc(replyTo)}<br><b>From name:</b> ${esc(fromName)}<br><b>Subject:</b> ${esc(subject)}</p><hr>\n${html}`,
    { mode: 0o600 }
  );
  console.log(`Mail not configured — wrote email to ${file}`);
  return { delivered: false, outboxFile: file };
}
