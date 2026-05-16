#!/usr/bin/env bash
#
# Idempotent deploy script. Run from the VM after `git pull` (or invoke locally
# via ssh). Reloads pm2 in-place so SSE connections only drop briefly.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

echo "==> git pull"
git pull --ff-only

echo "==> build api"
(
  cd api
  npm ci
  npx prisma migrate deploy
  npx prisma generate
  npm run build
)

echo "==> build web"
(
  cd web
  npm ci
  npm run build
)

echo "==> publish web bundle"
sudo rsync -a --delete web/dist/ /var/www/web/

echo "==> reload api"
if pm2 describe homecare-api >/dev/null 2>&1; then
  pm2 reload homecare-api --update-env
else
  pm2 start api/dist/index.js \
    --name homecare-api \
    --cwd "$REPO_ROOT/api" \
    --update-env
  pm2 save
fi

echo "==> done"
