#!/bin/bash
cd /home/z/my-project
while true; do
    echo "Starting server at $(date)"
    NODE_OPTIONS="--max-old-space-size=1536" node .next/standalone/server.js
    EXIT_CODE=$?
    echo "Server exited with code $EXIT_CODE"
    sleep 5
done
