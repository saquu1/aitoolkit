#!/bin/bash
# Kill memory-hungry background processes
pkill -f "MainThread" 2>/dev/null || true
pkill -f "npm run build" 2>/dev/null || true
pkill -f "bun" 2>/dev/null || true

# Wait for memory to free up
sleep 2

# Start Next.js production server
cd /home/z/my-project/.next/standalone
export PORT=3000
export HOSTNAME=0.0.0.0
export NODE_OPTIONS="--max-old-space-size=512"

# Keep restarting if it crashes
while true; do
    echo "[$(date)] Starting Next.js server..." >> /tmp/server-watchdog.log
    node server.js
    EXIT_CODE=$?
    echo "[$(date)] Server exited with code $EXIT_CODE" >> /tmp/server-watchdog.log
    
    # If OOM killed, wait a bit for memory to stabilize
    if [ $EXIT_CODE -eq 137 ]; then
        echo "[$(date)] OOM detected, waiting 30s..." >> /tmp/server-watchdog.log
        sleep 30
    else
        sleep 5
    fi
done
