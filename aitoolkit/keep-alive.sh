#!/bin/bash
cd /home/z/my-project

while true; do
    # Check if dev server is running
    if ! pgrep -f "next dev" > /dev/null; then
        echo "[$(date)] Starting dev server..." >> /tmp/keep-alive.log
        bun run dev >> dev.log 2>&1 &
        sleep 5
    fi
    sleep 10
done
