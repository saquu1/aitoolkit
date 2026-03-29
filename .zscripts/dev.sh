#!/bin/bash
set -e
cd /home/z/my-project/aitoolkit

# Fix DATABASE_URL in all .env files
echo 'DATABASE_URL="file:/home/z/my-project/aitoolkit/db/custom.db"' > .env
echo 'DATABASE_URL="file:/home/z/my-project/aitoolkit/db/custom.db"' > .next/standalone/.env
echo 'DATABASE_URL="file:/home/z/my-project/aitoolkit/db/custom.db"' > .next/standalone/aitoolkit/.env

# Run DB sync
bun run db:push

# Copy public and static assets
cp -r public .next/standalone/ 2>/dev/null || true
cp -r .next/static .next/standalone/.next/ 2>/dev/null || true

# Auto-restart wrapper
cd .next/standalone
while true; do
  echo "[$(date)] Starting Next.js server..."
  NODE_OPTIONS="--max-old-space-size=256" node server.js || true
  echo "[$(date)] Server stopped, restarting in 2s..."
  sleep 2
done
