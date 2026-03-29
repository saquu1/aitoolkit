#!/bin/bash
cd /home/z/my-project/aitoolkit
export PORT=3000 HOSTNAME=0.0.0.0 NODE_ENV=production
export DATABASE_URL=file:/home/z/my-project/aitoolkit/db/dev.db
export NEXT_TELEMETRY_DISABLED=1 NEXTAUTH_SECRET=accubalance-dev-secret-123
export NEXTAUTH_URL=http://localhost:3000 AUTH_TRUST_HOST=true
export PRISMA_CLIENT_ENGINE_TYPE=library NODE_OPTIONS="--max-old-space-size=256"

lsof -t -i:3000 2>/dev/null | xargs kill -9 2>/dev/null
sleep 1

while true; do
  echo "[$(date)] Starting server..." >> /tmp/aitoolkit.log
  node .next/standalone/server.js >> /tmp/aitoolkit.log 2>&1
  echo "[$(date)] Exited, restarting in 2s..." >> /tmp/aitoolkit.log
  sleep 2
done
