#!/bin/bash
# Pulls the latest commit of the deploy branch from GitHub, installs deps,
# runs migrations, builds, and reloads the PM2 process. Invoked by the webhook
# API route, or run by hand.
#
# The branch comes from DEPLOY_BRANCH in .env (default: main).
set -e
cd "$(dirname "$0")/.."

exec >> deploy/deploy.log 2>&1

deploy() {
  BRANCH=$(grep -E '^DEPLOY_BRANCH=' .env 2>/dev/null | tail -1 | cut -d= -f2- | tr -d "\"' \r")
  BRANCH=${BRANCH:-main}

  echo "=== Deploy started: $(date) (branch: $BRANCH) ==="
  git fetch origin "$BRANCH"
  git checkout -B "$BRANCH" "origin/$BRANCH"
  git reset --hard "origin/$BRANCH"
  npm ci
  npx prisma migrate deploy
  npx prisma generate
  # Webpack + a heap cap: the default Turbopack build gets OOM-killed on the
  # 2 GB droplet. Drop these once the server has more memory.
  NODE_OPTIONS=--max-old-space-size=1536 npx next build --webpack
  pm2 reload ecosystem.config.js --only haulin-ops
  echo "=== Deploy finished: $(date) ==="
}

# Everything runs inside a function, and the script exits right after it, so
# bash never reads past this point if the checkout above rewrites this file.
deploy
exit 0
