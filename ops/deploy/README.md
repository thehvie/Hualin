# Auto-deploy from GitHub (production server)

One-time setup so every push to `main` on GitHub auto-deploys via webhook,
same pattern as the `haulin` marketing site's `deploy/` folder — just Node
instead of PHP.

> **Monorepo note**: this app lives at `ops/` inside the same repo as the
> PHP marketing site (`thehvie/Hualin`). It deploys to its own directory
> on the server, completely independent of the marketing site's checkout
> at `/var/www/hlnjks` — a separate `git clone` of the same repo, with
> this app built and run from its `ops/` subfolder.

## 1. Clone the repo into its own directory

```bash
mkdir -p /var/www/haulin-ops   # adjust path to wherever this should live
cd /var/www/haulin-ops

git clone https://github.com/thehvie/Hualin.git .
cd ops
```

Everything from here on runs **inside `ops/`** — that's this app's root.

## 2. Install dependencies and configure secrets

```bash
npm ci
cp .env.example .env
# edit .env: DATABASE_URL (production Postgres), NEXTAUTH_URL, NEXTAUTH_SECRET
# (openssl rand -hex 32), MAILGUN_API_KEY/DOMAIN, TWILIO_*, and:
# DEPLOY_WEBHOOK_SECRET — generate with: openssl rand -hex 32

npx prisma migrate deploy
npx prisma generate
npm run build

chmod +x deploy/deploy.sh
```

## 3. Start it under PM2

```bash
npm install -g pm2   # if not already installed
pm2 start ecosystem.config.js
pm2 save
pm2 startup   # follow its printed instructions to survive reboots
```

The app listens on port `3010` (set in `ecosystem.config.js`) — proxy to it
from nginx same as any other self-hosted Next.js app:

```nginx
location / {
    proxy_pass http://127.0.0.1:3010;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
}
```

## 4. Add the webhook on GitHub

Go to `https://github.com/thehvie/Hualin/settings/hooks` → **Add webhook**
(this is a *second* webhook alongside the marketing site's — GitHub sends
every push to both, and each deploy script only touches its own directory):

- **Payload URL**: `https://your-ops-domain.com/api/deploy-webhook`
- **Content type**: `application/json`
- **Secret**: the same value you put in `.env` as `DEPLOY_WEBHOOK_SECRET`
- **Which events**: "Just the push event"
- **Active**: checked

Push a commit — GitHub's webhook page shows delivery status for both
webhooks, and `deploy/deploy.log` here shows the actual pull/build/reload
output for this app specifically.

## Manual deploy (fallback)

```bash
bash deploy/deploy.sh
```
