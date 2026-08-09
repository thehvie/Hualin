#!/bin/bash
# Pulls the latest main from GitHub and reinstalls PHP deps.
# Invoked by webhook.php after signature verification, or can be run by hand.
set -e
cd "$(dirname "$0")/.."

echo "=== Deploy started: $(date) ==="
git fetch origin main
git reset --hard origin/main
composer install --no-dev --optimize-autoloader
echo "=== Deploy finished: $(date) ==="
