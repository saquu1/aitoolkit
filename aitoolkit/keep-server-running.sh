#!/bin/bash
# Keep-Alive Script for Z.AI Workspace
# Uses bun for lower process count

cd /home/z/my-project

# Environment variables
export PORT=3000
export HOSTNAME=0.0.0.0
export NODE_ENV=production
export DATABASE_URL=file:/home/z/my-project/db/custom.db
export NEXT_TELEMETRY_DISABLED=1

LOG_FILE="/tmp/server-keepalive.log"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

log "Starting keep-alive script with bun..."

while true; do
    # Check if server is running
    if pgrep -f "bun.*server.js" > /dev/null; then
        # Server is running, check if it's responding
        HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health 2>/dev/null)
        if [ "$HEALTH" = "200" ]; then
            # Server is healthy, wait and check again
            sleep 30
            continue
        else
            log "Server not responding (HTTP $HEALTH), restarting..."
            pkill -f "bun.*server.js" 2>/dev/null || true
            sleep 2
        fi
    fi
    
    # Kill any zombie processes
    pkill -f "server.js" 2>/dev/null || true
    sleep 2
    
    # Start the server with bun
    log "Starting Next.js production server with bun..."
    bun .next/standalone/server.js >> /tmp/server.log 2>&1 &
    
    # Wait for server to start
    sleep 5
    
    # Verify server started
    if pgrep -f "bun.*server.js" > /dev/null; then
        log "Server started successfully"
    else
        log "ERROR: Server failed to start"
    fi
    
    sleep 30
done
