#!/bin/bash
while true; do
  if ! fuser 3000/tcp >/dev/null 2>&1; then
    echo "[$(date)] Server not running, starting..." >> /home/z/my-project/daemon.log
    cd /home/z/my-project/aitoolkit
    export PORT=3000 HOSTNAME=0.0.0.0 NODE_ENV=production
    export DATABASE_URL=file:/home/z/my-project/aitoolkit/db/dev.db
    export NEXT_TELEMETRY_DISABLED=1
    export NEXTAUTH_SECRET=accubalance-dev-secret-123
    export NEXTAUTH_URL=http://localhost:3000
    export PRISMA_CLIENT_ENGINE_TYPE=library
    export NODE_OPTIONS="--max-old-space-size=256"
    export NEXT_PRIVATE_DISABLE_WORKER=1
    node .next/standalone/server.js >> /home/z/my-project/daemon.log 2>&1
    echo "[$(date)] Server exited, restarting in 3s..." >> /home/z/my-project/daemon.log
    sleep 3
  fi
  sleep 5
done
