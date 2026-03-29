#!/bin/bash
# =============================================================================
# AITOOLKIT WATCHDOG - Keeps the Next.js server alive
# Run this in a Bash tool with max timeout (600s) to keep server alive
# =============================================================================
# Usage: Just run this script. It monitors port 3000 and restarts if dead.
# =============================================================================

SERVER_CMD="node /home/z/my-project/aitoolkit/.next/standalone/server.js -p 3000"
LOG="/tmp/aitoolkit-watchdog.log"
STATIC_SRC="/home/z/my-project/aitoolkit/.next/static"
STATIC_DST="/home/z/my-project/aitoolkit/.next/standalone/.next/static"

echo "[$(date)] Watchdog started" | tee -a "$LOG"

# Ensure static assets
if [ -d "$STATIC_SRC" ] && [ ! -d "$STATIC_DST" ] || [ "$(ls "$STATIC_DST/chunks/" 2>/dev/null | wc -l)" -eq 0 ]; then
  rm -rf "$STATIC_DST"
  cp -r "$STATIC_SRC" "$STATIC_DST"
  echo "[$(date)] Static assets ensured" | tee -a "$LOG"
fi

while true; do
  # Check if port 3000 is listening
  if ! ss -tlnp 2>/dev/null | grep -q ":3000 "; then
    echo "[$(date)] Port 3000 not listening, starting server..." | tee -a "$LOG"
    cd /home/z/my-project/aitoolkit/.next/standalone
    AUTH_TRUST_HOST=true \
    DATABASE_URL="file:/home/z/my-project/db/custom.db" \
    AUTH_SECRET="accubalance-dev-secret-change-in-production-123" \
    NEXTAUTH_URL="http://localhost:3000" \
    NEXTAUTH_SECRET_KEY="accubalance-dev-key" \
    NEXT_PUBLIC_APP_URL="http://localhost:3000" \
    NEXT_PUBLIC_APP_NAME="AI Toolkit" \
    NODE_ENV=production \
    $SERVER_CMD >> "$LOG" 2>&1 &
    SRV_PID=$!
    echo "[$(date)] Started server PID=$SRV_PID" | tee -a "$LOG"
    sleep 5
    
    # Verify it came up
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ 2>/dev/null | grep -q "200"; then
      echo "[$(date)] Server verified OK" | tee -a "$LOG"
    else
      echo "[$(date)] WARNING: Server may not be ready" | tee -a "$LOG"
    fi
  fi
  sleep 10
done
