# CRM

A small CRM for tracking leads, companies and contacts. Svelte 5 frontend, Express API, SQLite database (Node's built-in `node:sqlite`, no native modules).

## Requirements

Node.js 22.13 or newer.

## Getting started

```sh
npm install
npm run user:create -- you@example.com   # prompts for a password (min. 10 characters)
npm run dev                              # http://localhost:5173 (API on :3001)
```

## Production

```sh
npm run build
npm start          # serves the app and API on http://127.0.0.1:3001
```

Set `HOST`, `PORT` and `CRM_DB_PATH` to change where it listens and where the database lives. If you expose it beyond your own machine, put it behind HTTPS (e.g. Caddy or nginx); session cookies are marked `Secure` automatically when the proxy forwards HTTPS.

## Managing users

```sh
npm run user:create -- you@example.com            # new user, prompts for password
npm run user:create -- you@example.com --reset    # set a new password (signs out all sessions)
npm run user:create -- you@example.com --generate # random password written to data/initial-password.txt
```

Signed-in users can also change their password from the account menu at the bottom of the sidebar.

## Email & testimonial requests

On a contact's page, **Request testimonial** emails the contact a personal link to a short public form (star rating + a few words). Their answer is saved straight to the contact's Testimonial fields and you get a notification email. Each link works once, expires after 30 days, and is replaced if you send a new request.

To send real email, copy `.env.example` to `.env` and set `SMTP_URL` and `MAIL_FROM` (any SMTP provider works), then restart. Set `APP_URL` in production so links point at your public address. Without SMTP settings, nothing is sent: emails are saved to `data/outbox/` and the app gives you the link to send yourself.

## Website connection (scottv.tech)

The website sends its contact and audit form submissions here, and copies testimonials from here so you can choose which to publish (in the website's `/admin`). Code: [`server/integration.js`](server/integration.js).

- Set `WEBSITE_API_KEY` (32+ random characters) and `WEBSITE_USER` (the CRM user who owns website contacts) in `.env`. Use the same key as `CRM_API_KEY` on the website.
- A submission adds a **Message** activity to the contact with the same email, or creates the contact with source **Website**.
- The website only receives the testimonial text and rating, plus the name, role and photo if **OK to show their name** is ticked, and the company if **OK to show their company** is ticked. Unticking either removes it from the site at the next hourly sync. Clearing a testimonial removes it from the site too.
- Without `WEBSITE_API_KEY` the connection is off and its endpoints return 404.

## Adding fields

All record fields are defined in [`shared/schema.js`](shared/schema.js). To add one, add a line to the right list, e.g.

```js
{ key: 'linkedin', column: 'linkedin', label: 'LinkedIn', type: 'url', section: 'details' },
```

On the next start the server adds the database column, validates the value and includes it in backups. Contact fields appear automatically on the contact page in their `section` (sections are listed in `CONTACT_SECTIONS`). Supported types: `text`, `textarea`, `email`, `tel`, `url`, `date`, `number`, `rating`, `select`, `ref`.

## Data

Everything is stored in `data/crm.sqlite` (git-ignored). Back it up by copying that file, or use **Data → Export backup** in the app for a JSON export.
