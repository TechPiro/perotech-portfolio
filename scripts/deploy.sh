#!/usr/bin/env bash
# Update the live site with the latest code (run on the VPS, from the repo root).
# Usage:  bash scripts/deploy.sh
set -euo pipefail
cd "$(dirname "$0")/.."

echo "→ Pulling latest code..."
git pull --ff-only

echo "→ Installing backend dependencies..."
( cd backend && npm install --omit=dev )

echo "→ Reloading app (zero-downtime)..."
pm2 reload ecosystem.config.js || pm2 start ecosystem.config.js
pm2 save

echo "✅ Deploy complete. Live data and uploads were left untouched."
