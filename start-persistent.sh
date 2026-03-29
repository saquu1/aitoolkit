#!/bin/bash
# Persistent Next.js Server Startup Script

export PORT=3000 
export HOSTNAME=0.0.0.0 
export NODE_ENV=production 
export DATABASE_URL=file:/home/z/my-project/db/custom.db 
export NEXT_TELEMETRY_DISABLED=1 
export NEXT_PRIVATE_DISABLE_WORKER=1 
export PRISMA_CLIENT_ENGINE_TYPE=library
export NODE_OPTIONS=--max-old-space-size=256

cd /home/z/my-project

# Log startup
echo "Starting server at $(date)" >> /home/z/my-project/server-persistent.log

# Start server with nohup to survive shell exit
nohup bun .next/standalone/server.js >> /home/z/my-project/server-persistent.log 2>&1 &

echo "Server started with PID $!"
echo $! > /home/z/my-project/server.pid
