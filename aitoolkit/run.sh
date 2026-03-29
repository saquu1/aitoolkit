#!/bin/bash
cd /home/z/my-project/aitoolkit
export PORT=3000
export HOSTNAME=0.0.0.0
export NODE_ENV=production
export DATABASE_URL=file:/home/z/my-project/aitoolkit/db/dev.db
export NEXT_TELEMETRY_DISABLED=1
export NEXTAUTH_SECRET=accubalance-dev-secret-123
export NEXTAUTH_URL=http://localhost:3000
export PRISMA_CLIENT_ENGINE_TYPE=library
export NODE_OPTIONS="--max-old-space-size=256"

# Kill existing
lsof -t -i:3000 2>/dev/null | xargs kill -9 2>/dev/null
sleep 1

echo "Starting standalone server..."
exec node .next/standalone/server.js
