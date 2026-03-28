#!/bin/bash
cd /home/z/my-project
while true; do
    echo "Starting server at $(date)" >> server-restarts.log
    node .next/standalone/server.js
    echo "Server exited at $(date)" >> server-restarts.log
    sleep 2
done
