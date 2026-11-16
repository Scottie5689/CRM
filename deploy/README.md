# Deploying to crm.scottv.tech (WHM/cPanel)

Every push to `main` runs `.github/workflows/deploy.yml`: type-check, build, rsync to
`~/crm-app` on the cPanel account, `npm ci --omit=dev`, then `touch tmp/restart.txt`
so Passenger restarts the app. It also runs from the Actions tab ("Run workflow").

## One-time setup

### 1. WHM (as root)

- **EasyApache 4 → Customize**: enable `ea-ruby27-mod_passenger`, `ea-apache24-mod_env`
  and **`ea-nodejs22`** (the app needs Node 22.13+). Provision.
- Make sure the cPanel account that owns scottv.tech has **shell access**
  (Manage Shell Access → Normal or Jailed shell).
- Check the Node version over SSH: `/opt/cpanel/ea-nodejs22/bin/node --version` (must be ≥ 22.13).

### 2. DNS + subdomain

- Create the subdomain `crm.scottv.tech` in cPanel (Domains). Document root: `crm.scottv.tech`
  (keep it different from the app folder).
- Point the `crm` A record at the server if DNS lives elsewhere.
- Run **SSL/TLS Status → Run AutoSSL** once DNS resolves.

### 3. Deploy key

On your Mac:

```sh
ssh-keygen -t ed25519 -f ~/.ssh/crm_deploy -N "" -C github-deploy-crm
```

cPanel → **SSH Access → Manage SSH Keys → Import Key**: paste `~/.ssh/crm_deploy.pub`, then **Authorize** it.

### 4. GitHub secrets

Repo → Settings → Environments → create `production` → add secrets:

| Secret | Value |
|---|---|
| `DEPLOY_HOST` | server hostname or IP |
| `DEPLOY_PORT` | SSH port (omit if 22) |
| `DEPLOY_USER` | the cPanel username |
| `DEPLOY_SSH_KEY` | contents of `~/.ssh/crm_deploy` (private key) |
| `DEPLOY_KNOWN_HOSTS` | output of `ssh-keyscan -p PORT HOST` |

### 5. First deploy, then register the app

1. Push to `main` (or run the workflow). The upload and install succeed, but the final URL
   check fails until step 2 is done; that's expected the first time.
2. cPanel → **Application Manager → Register Application**:
   - Name: `CRM` · Deployment domain: `crm.scottv.tech` · Base URL: `/`
   - Application path: `crm-app` · Environment: **Production**
   - Environment variables:

     | Name | Value |
     |---|---|
     | `APP_URL` | `https://crm.scottv.tech` |
     | `CRM_DB_PATH` | `/home/CPANELUSER/crm-data/crm.sqlite` |
     | `CRM_OUTBOX` | `/home/CPANELUSER/crm-data/outbox` |
     | `SMTP_URL` | `smtps://you%40scottv.tech:APPPASSWORD@smtp.gmail.com:465` |
     | `MAIL_FROM` | `you@scottv.tech` |

   Leave "Ensure dependencies" alone; the workflow installs them.
3. Create your login over SSH:

   ```sh
   export PATH=/opt/cpanel/ea-nodejs22/bin:$PATH
   mkdir -p ~/crm-data && chmod 700 ~/crm-data
   cd ~/crm-app && CRM_DB_PATH=~/crm-data/crm.sqlite node server/create-user.js you@scottv.tech
   ```

Keep the database in `~/crm-data`, **not** inside `~/crm-app`; deploys replace that folder.

## Gmail (Google Workspace) SMTP

1. Turn on 2-Step Verification for the sending account.
   (Workspace admin: Security → Authentication → 2-Step Verification must be allowed.)
2. Create an app password at https://myaccount.google.com/apppasswords.
3. Put it in `SMTP_URL` without the spaces. Write `@` in the username as `%40`.
4. `MAIL_FROM` must be that account's address or a "Send mail as" alias, or Gmail
   rewrites the From header.
5. In Google Admin → Apps → Gmail → **Authenticate email**, turn on DKIM for scottv.tech and add the
   TXT record. Check the domain's SPF includes `include:_spf.google.com`.

Limits: about 2,000 messages/day for Workspace, plenty for testimonial requests.

## Backups

The whole CRM is `~/crm-data/crm.sqlite`. cPanel's account backups include it. For extra safety, add a
cron job (cPanel → Cron Jobs) that runs `sqlite3 ~/crm-data/crm.sqlite ".backup ~/crm-data/backup-$(date +\%a).sqlite"`.
