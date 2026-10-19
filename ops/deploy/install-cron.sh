#!/usr/bin/env bash
# Installs the app's two scheduled jobs on the server. Run once as root, from anywhere:
#   bash /var/www/haulin-ops/ops/deploy/install-cron.sh
# Safe to run again: it rewrites the same two files.
#
#   every 15 minutes   rental reminders (drafts or sends reminders for dumpsters whose pickup is near)
#   every 15 minutes   review requests (asks customers for a review a few days after an invoice is paid)
#   1st of the month   usage billing for the previous month (needs Stripe; until then it logs an error and does nothing)
#
# The jobs read CRON_SECRET from the app's .env, so the secret never sits in the crontab.
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/haulin-ops/ops}"
PORT="${PORT:-3010}"
ENV_FILE="$APP_DIR/.env"

if [ ! -f "$ENV_FILE" ]; then
  echo "Can't find $ENV_FILE. Set APP_DIR if the app lives somewhere else." >&2
  exit 1
fi
if ! grep -q '^CRON_SECRET=..*' "$ENV_FILE"; then
  echo "CRON_SECRET is missing from $ENV_FILE." >&2
  echo "Add a line like:  CRON_SECRET=\"$(openssl rand -hex 32)\"" >&2
  echo "then run: pm2 restart haulin-ops --update-env   and run this script again." >&2
  exit 1
fi

cat > /usr/local/bin/haulin-ops-cron <<EOS
#!/usr/bin/env bash
# Calls one of the app's cron endpoints. Usage: haulin-ops-cron /api/cron/rental-reminders
SECRET=\$(grep '^CRON_SECRET=' "$ENV_FILE" | head -1 | cut -d= -f2- | tr -d '"')
echo "\$(date -u +%FT%TZ) \$1 \$(curl -sS -m 120 -X POST -H "Authorization: Bearer \$SECRET" "http://127.0.0.1:$PORT\$1" | head -c 300)"
EOS
chmod 700 /usr/local/bin/haulin-ops-cron

cat > /etc/cron.d/haulin-ops <<'EOC'
# Haulin Ops scheduled jobs (installed by deploy/install-cron.sh)
*/15 * * * * root /usr/local/bin/haulin-ops-cron /api/cron/rental-reminders >> /var/log/haulin-ops-cron.log 2>&1
*/15 * * * * root /usr/local/bin/haulin-ops-cron /api/cron/review-requests >> /var/log/haulin-ops-cron.log 2>&1
10 6 1 * * root /usr/local/bin/haulin-ops-cron /api/cron/usage-billing >> /var/log/haulin-ops-cron.log 2>&1
EOC
chmod 644 /etc/cron.d/haulin-ops

echo "Installed. Test it now:"
echo "  /usr/local/bin/haulin-ops-cron /api/cron/rental-reminders"
echo "A healthy run prints JSON like {\"companies\":...}. 'Unauthorized' means the app hasn't picked up CRON_SECRET yet: pm2 restart haulin-ops --update-env"
echo "Watch it later with: tail -f /var/log/haulin-ops-cron.log"
