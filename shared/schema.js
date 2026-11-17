// Single source of truth for record fields, shared by the server and the app.
//
// To add a field: add one line to the right list below. On next start the
// server adds the database column automatically, validates the value, and
// (for contacts) the field appears on the contact page in its `section`.
//
// Field types: text | textarea | email | tel | url | date | number | rating | select | ref | boolean
//   ref:    links to another record   -> { ref: 'companies' }
//   select: one of a list of values   -> { options: [...], default }
//   rating: whole number 1..max (empty = not rated)
//   boolean: a checkbox, true/false (stored as 1/0)
//            stamp: key of a read-only date the server keeps for it (e.g. when consent was given)
// Optional: required, full (span both columns), placeholder, rows, max, min, maxLength

export const SCHEMA = {
  companies: [
    { key: 'name', column: 'name', label: 'Name', type: 'text', required: true },
    { key: 'industry', column: 'industry', label: 'Industry', type: 'text' },
    { key: 'website', column: 'website', label: 'Website', type: 'url' },
    { key: 'notes', column: 'notes', label: 'Notes', type: 'textarea' }
  ],

  contacts: [
    { key: 'firstName', column: 'first_name', label: 'First name', type: 'text', required: true, section: 'details' },
    { key: 'lastName', column: 'last_name', label: 'Last name', type: 'text', section: 'details' },
    { key: 'email', column: 'email', label: 'Email', type: 'email', section: 'details' },
    { key: 'phone', column: 'phone', label: 'Phone', type: 'tel', section: 'details' },
    { key: 'role', column: 'role', label: 'Role', type: 'text', section: 'details' },
    { key: 'companyId', column: 'company_id', label: 'Company', type: 'ref', ref: 'companies', section: 'details' },
    { key: 'source', column: 'source', label: 'Source', type: 'select', section: 'details',
      options: ['Referral', 'LinkedIn', 'Networking Event', 'Upwork', 'Website', 'Other'] },

    { key: 'testimonialRating', column: 'testimonial_rating', label: 'Rating', type: 'rating', max: 5, section: 'testimonial', full: true },
    { key: 'testimonial', column: 'testimonial', label: 'Testimonial', type: 'textarea', rows: 5, section: 'testimonial',
      placeholder: 'What they said about working with you…' },
    { key: 'consentName', column: 'consent_name', label: 'OK to show their name in marketing', type: 'boolean', section: 'testimonial', stamp: 'consentNameAt' },
    { key: 'consentCompany', column: 'consent_company', label: 'OK to show their company in marketing', type: 'boolean', section: 'testimonial', stamp: 'consentCompanyAt' },

    { key: 'notes', column: 'notes', label: 'Notes', type: 'textarea', rows: 5, section: 'notes' }
  ],

  leads: [
    { key: 'title', column: 'title', label: 'Title', type: 'text', required: true },
    { key: 'companyId', column: 'company_id', label: 'Company', type: 'ref', ref: 'companies' },
    { key: 'contactId', column: 'contact_id', label: 'Contact', type: 'ref', ref: 'contacts' },
    { key: 'value', column: 'value', label: 'Value', type: 'number', min: 0 },
    { key: 'stage', column: 'stage', label: 'Stage', type: 'select', default: 'new',
      options: ['new', 'contacted', 'proposal', 'negotiation', 'won', 'lost'] },
    { key: 'source', column: 'source', label: 'Source', type: 'text' },
    { key: 'followUp', column: 'follow_up', label: 'Next follow-up', type: 'date' },
    { key: 'notes', column: 'notes', label: 'Notes', type: 'textarea' }
  ],

  // Activity log on the contact page. Deleting a contact deletes its activity.
  activities: [
    { key: 'contactId', column: 'contact_id', label: 'Contact', type: 'ref', ref: 'contacts', required: true },
    { key: 'type', column: 'type', label: 'Type', type: 'select', default: 'Call',
      options: ['Call', 'Email', 'Meeting', 'Message', 'Note', 'Testimonial'] },
    { key: 'date', column: 'date', label: 'Date', type: 'date', required: true },
    { key: 'notes', column: 'notes', label: 'What happened', type: 'textarea', maxLength: 5000 }
  ]
};

// Collections in the order they must be created so links between records resolve.
export const COLLECTIONS = ['companies', 'contacts', 'leads', 'activities'];

// Sections on the contact page, in display order.
export const CONTACT_SECTIONS = [
  { id: 'details', title: 'Details' },
  { id: 'testimonial', title: 'Testimonial' },
  { id: 'notes', title: 'Notes' }
];

const EMPTY = { number: 0, rating: 0, boolean: false };

/** A blank record for a collection, with every field present. */
export function blank(collection) {
  return Object.fromEntries(SCHEMA[collection].map((f) => [f.key, f.default ?? EMPTY[f.type] ?? '']));
}
