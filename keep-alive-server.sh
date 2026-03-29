#!/bin/bash
# Next.js Server Keep-Alive Script
# Run this script to ensure the server stays running

LOG_FILE="/home/z/my-project/server-keepalive.log"
PID_FILE="/home/z/my-project/server.pid"
CHECK_INTERVAL=10

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

start_server() {
    log "Starting Next.js server..."
    
    export PORT=3000
    export HOSTNAME=0.0.0.0
    export NODE_ENV=production
    export DATABASE_URL=file:/home/z/my-project/db/custom.db
    export NEXT_TELEMETRY_DISABLED=1
    export NEXT_PRIVATE_DISABLE_WORKER=1
    export PRISMA_CLIENT_ENGINE_TYPE=library
    export NODE_OPTIONS=--max-old-space-size=256
    
    cd /home/z/my-project
    
    # Kill any existing server
    pkill -f "bun.*server" 2>/dev/null
    sleep 2
    
    # Start with nohup for persistence
    nohup bun .next/standalone/server.js >> "$LOG_FILE" 2>&1 &
    echo $! > "$PID_FILE"
    
    log "Server started with PID $(cat $PID_FILE)"
}

check_server() {
    # Check if process exists
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if ps -p "$PID" > /dev/null 2>&1; then
            # Process running, check if responding
            if curl -s -o /dev/null -w "" http://localhost:3000 > /dev/null 2>&1; then
                return 0  # Server is healthy
            else
                log "Server process running but not responding"
                return 1
            fi
        fi
    fi
    return 1  # Server not running
}

# Main loop
log "=== Keep-alive started ==="

while true; do
    if ! check_server; then
        log "Server not responding, restarting..."
        start_server
        sleep 5
    fi
    sleep $CHECK_INTERVAL
done
