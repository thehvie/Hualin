#!/bin/bash
# Pulls the latest main from GitHub, installs deps, runs migrations, builds,
# and reloads the PM2 process. Invoked by the webhook API route, or run by hand.
set -e
cd "$(dirname "$0")/.."

exec >> deploy/deploy.log 2>&1

echo "=== Deploy started: $(date) ==="
git fetch origin main
git reset --hard origin/main
npm ci
npx prisma migrate deploy
npx prisma generate
npm run build
pm2 reload ecosystem.config.js --only haulin-ops
echo "=== Deploy finished: $(date) ==="
