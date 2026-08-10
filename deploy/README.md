# Auto-deploy from GitHub (production server)

One-time setup on the production server, so every push to `main` on
GitHub auto-deploys via webhook.

> **Monorepo note**: this repo also contains `ops/` — the separate
> Next.js CRM/quoting/invoicing app (see `ops/deploy/README.md`). It
> deploys independently, to its own directory, via its own webhook.
> This checkout (`/var/www/hlnjks`) will still receive the `ops/`
> source files on every pull since it's the same repo — step 3 below
> blocks public access to that folder so it's never served.

## 1. Point the live directory at the GitHub repo

Run these **on the production server**, in the site's document root
(assumes Linux + git already installed — `git --version` to check,
`apt install git` / `yum install git` if not):

```bash
cd /var/www/hlnjks

# Back up first, just in case anything doesn't match GitHub
tar -czf ~/haulin-backup-$(date +%Y%m%d%H%M%S).tar.gz .

git init
git remote add origin https://github.com/thehvie/Hualin.git
git fetch origin

# See what would change before committing to it
git diff --stat origin/main

# Adopt origin/main as the source of truth for tracked files.
# Untracked files (uploads/, vendor/, config.local.php, etc. — anything
# in .gitignore) are left alone.
git checkout -f main
git branch -u origin/main main
```

If `git diff --stat` shows unexpected changes (i.e. prod has drifted
from what's in GitHub), stop and reconcile before running `checkout -f`
— it will overwrite any tracked file that differs from GitHub with the
GitHub version.

## 2. Install PHP dependencies and secrets

```bash
composer install --no-dev --optimize-autoloader

cp config.local.php.example config.local.php
# edit config.local.php and put the real Mailgun API key in it
# (or set a real MAILGUN_API_KEY env var in your php-fpm pool config instead —
# that takes priority and avoids keeping the key in a file at all)

cp deploy/webhook-secret.php.example deploy/webhook-secret.php
openssl rand -hex 32   # generate a secret, paste it into webhook-secret.php
chmod +x deploy/deploy.sh
```

## 3. Wire up nginx

Add to the site's server block (adjust the php-fpm socket/port to match
your setup):

```nginx
location = /deploy/webhook.php {
    include fastcgi_params;
    fastcgi_pass unix:/var/run/php/php8.1-fpm.sock;
    fastcgi_param SCRIPT_FILENAME /var/www/hlnjks/deploy/webhook.php;
}

# Block direct access to everything else in deploy/
location ~ ^/deploy/(webhook-secret\.php|deploy\.sh|deploy\.log)$ {
    deny all;
}

# Block public access to the ops/ subfolder entirely — it's a separate
# Next.js app's source code, not meant to be served here.
location ^~ /ops/ {
    deny all;
}
```

Reload nginx: `nginx -t && systemctl reload nginx`

## 4. Add the webhook on GitHub

Go to `https://github.com/thehvie/Hualin/settings/hooks` → **Add webhook**:

- **Payload URL**: `https://yourdomain.com/deploy/webhook.php`
- **Content type**: `application/json`
- **Secret**: the same value you put in `deploy/webhook-secret.php`
- **Which events**: "Just the push event"
- **Active**: checked

Save it, then push a commit — GitHub's webhook page shows recent
deliveries with response codes, and `deploy/deploy.log` on the server
shows the actual `git pull` / `composer install` output.

## Manual deploy (fallback)

If you ever need to deploy without waiting on the webhook:

```bash
bash deploy/deploy.sh
```
