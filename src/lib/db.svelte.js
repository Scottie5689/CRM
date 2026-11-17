// Central data store: an in-memory copy of the signed-in user's data, kept in
// sync with the SQLite database through the API.
import { api } from './api.js';
import { COLLECTIONS } from '../../shared/schema.js';

export const STAGES = [
  { id: 'new', label: 'New', color: '#64748b' },
  { id: 'contacted', label: 'Contacted', color: '#0ea5e9' },
  { id: 'proposal', label: 'Proposal sent', color: '#8b5cf6' },
  { id: 'negotiation', label: 'Negotiation', color: '#f59e0b' },
  { id: 'won', label: 'Won', color: '#10b981' },
  { id: 'lost', label: 'Lost', color: '#ef4444' }
];

export const CLOSED = ['won', 'lost'];

export const stageOf = (id) => STAGES.find((s) => s.id === id) ?? STAGES[0];

const uid = () => crypto.randomUUID();
const now = () => new Date().toISOString();

function daysFromToday(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toLocaleDateString('en-CA'); // YYYY-MM-DD in local time
}

function empty() {
  return Object.fromEntries(COLLECTIONS.map((c) => [c, []]));
}

export function sampleData() {
  const acme = uid(), northwind = uid(), bloom = uid();
  const jane = uid(), raj = uid(), maria = uid(), tom = uid();
  const t = now();
  return {
    companies: [
      { id: acme, name: 'Acme Studio', website: 'https://acme.example', industry: 'Design agency', notes: 'Sends overflow work most quarters.', createdAt: t },
      { id: northwind, name: 'Northwind Traders', website: 'https://northwind.example', industry: 'E-commerce', notes: '', createdAt: t },
      { id: bloom, name: 'Bloom & Co', website: '', industry: 'Retail', notes: 'Met at the local business meetup.', createdAt: t }
    ],
    contacts: [
      { id: jane, firstName: 'Jane', lastName: 'Cooper', email: 'jane@acme.example', phone: '555-0101', role: 'Creative Director', companyId: acme, notes: '', testimonialRating: 5, testimonial: 'Fast, thoughtful and a genuine pleasure to work with. Our go-to for overflow design work.', createdAt: t },
      { id: raj, firstName: 'Raj', lastName: 'Patel', email: 'raj@northwind.example', phone: '555-0144', role: 'Head of Product', companyId: northwind, notes: 'Prefers calls over email.', createdAt: t },
      { id: maria, firstName: 'Maria', lastName: 'Lopez', email: 'maria@bloom.example', phone: '', role: 'Owner', companyId: bloom, notes: '', createdAt: t },
      { id: tom, firstName: 'Tom', lastName: 'Becker', email: 'tom@gmail.example', phone: '555-0199', role: 'Founder', companyId: '', notes: 'Solo founder, referral from Jane.', createdAt: t }
    ],
    leads: [
      { id: uid(), title: 'Website redesign', companyId: northwind, contactId: raj, value: 12000, stage: 'proposal', source: 'Referral', followUp: daysFromToday(2), notes: 'Proposal sent, awaiting feedback.', createdAt: t },
      { id: uid(), title: 'Brand refresh – phase 2', companyId: acme, contactId: jane, value: 6500, stage: 'negotiation', source: 'Existing client', followUp: daysFromToday(-1), notes: '', createdAt: t },
      { id: uid(), title: 'Shopify store setup', companyId: bloom, contactId: maria, value: 4000, stage: 'contacted', source: 'Meetup', followUp: daysFromToday(5), notes: '', createdAt: t },
      { id: uid(), title: 'MVP landing page', companyId: '', contactId: tom, value: 2500, stage: 'new', source: 'Referral', followUp: '', notes: '', createdAt: t },
      { id: uid(), title: 'Q2 illustration package', companyId: acme, contactId: jane, value: 3200, stage: 'won', source: 'Existing client', followUp: '', notes: 'Invoiced.', createdAt: t }
    ],
    activities: [
      { id: uid(), contactId: raj, type: 'Meeting', date: daysFromToday(-6), notes: 'Discovery call about the website redesign. Main goal: faster checkout.', createdAt: t },
      { id: uid(), contactId: raj, type: 'Email', date: daysFromToday(-2), notes: 'Sent the proposal and timeline.', createdAt: t },
      { id: uid(), contactId: jane, type: 'Call', date: daysFromToday(-1), notes: 'Talked through phase 2 scope; she will confirm budget next week.', createdAt: t }
    ]
  };
}

// ---- Server sync ---------------------------------------------------------
// Changes are applied locally right away (so the UI feels instant) and then
// sent to the API. If the server rejects a change we show the error and
// reload from the server so the screen matches the database again.

export const db = $state(empty());
export const notice = $state({ message: '' });

let noticeTimer;
export function flash(message) {
  notice.message = message;
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => (notice.message = ''), 6000);
}

function setLocal(data) {
  for (const k of COLLECTIONS) db[k] = data[k] ?? [];
}

export const resetLocal = () => setLocal(empty());

export async function loadData() {
  setLocal(await api('GET', '/api/data'));
}

// Pull fresh data (e.g. when the window regains focus) so testimonials that
// arrive while the app is open show up. Throttled to once every 30 seconds.
let lastRefresh = 0;
export async function refresh() {
  if (Date.now() - lastRefresh < 30_000) return;
  lastRefresh = Date.now();
  await loadData().catch(() => {});
}

function sync(request) {
  request.catch(async (err) => {
    if (err.status === 401) return;
    flash(`Couldn't save: ${err.message}`);
    await loadData().catch(() => {});
  });
}

/** Create (no id) or update (has id) a record in a collection. Returns the id. */
export function save(collection, record) {
  const list = db[collection];
  const id = record.id || uid();
  const i = list.findIndex((r) => r.id === id);
  const next = i === -1 ? { ...record, id, createdAt: now() } : { ...list[i], ...record, updatedAt: now() };
  if (i === -1) list.push(next);
  else list[i] = next;
  sync(api('PUT', `/api/${collection}/${id}`, next));
  return id;
}

/** Save and wait for the server to confirm. Returns the saved record; throws on failure. */
export async function saveNow(collection, record) {
  const id = record.id || uid();
  const saved = await api('PUT', `/api/${collection}/${id}`, { ...record, id });
  const list = db[collection];
  const i = list.findIndex((r) => r.id === id);
  if (i === -1) list.push(saved);
  else list[i] = saved;
  return saved;
}

/** Delete a record and unlink anything that pointed at it. */
export function remove(collection, id) {
  db[collection] = db[collection].filter((r) => r.id !== id);
  if (collection === 'companies') {
    for (const c of db.contacts) if (c.companyId === id) c.companyId = '';
    for (const l of db.leads) if (l.companyId === id) l.companyId = '';
  }
  if (collection === 'contacts') {
    for (const l of db.leads) if (l.contactId === id) l.contactId = '';
    db.activities = db.activities.filter((a) => a.contactId !== id); // deleted with the contact
  }
  sync(api('DELETE', `/api/${collection}/${id}`));
}

/** Replace everything on the server (backup import, sample data, reset). */
export async function replaceAll(data) {
  for (const k of COLLECTIONS) {
    if (data[k] !== undefined && !Array.isArray(data[k])) throw new Error(`Invalid file: "${k}" must be a list`);
  }
  setLocal(await api('POST', '/api/import', { ...empty(), ...data }));
}

export const clearAll = () => replaceAll(empty());

// Lookup helpers
export const companyById = (id) => db.companies.find((c) => c.id === id);
export const contactById = (id) => db.contacts.find((c) => c.id === id);
export const fullName = (c) => (c ? `${c.firstName} ${c.lastName}`.trim() : '');
