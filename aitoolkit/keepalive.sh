#!/bin/bash
while true; do
    cd /home/z/my-project/aitoolkit
    export DATABASE_URL="file:/home/z/my-project/aitoolkit/db/dev.db"
    export AUTH_SECRET="accubalance-dev-secret-change-in-production-123"
    export NEXTAUTH_URL="http://localhost:3000"
    export NEXTAUTH_SECRET_KEY="accubalance-dev-key"
    export NEXT_PUBLIC_APP_URL="http://localhost:3000"
    export NEXT_PUBLIC_APP_NAME="AI Toolkit"
    
    lsof -t -i:3000 2>/dev/null | xargs kill -9 2>/dev/null
    sleep 1
    
    echo "[$(date)] Starting server..." >> /home/z/my-project/aitoolkit/server.log
    bun run next dev -p 3000 >> /home/z/my-project/aitoolkit/server.log 2>&1 &
    SERVER_PID=$!
    echo "[$(date)] PID: $SERVER_PID" >> /home/z/my-project/aitoolkit/server.log
    
    # Wait for it to die
    wait $SERVER_PID 2>/dev/null
    echo "[$(date)] Server exited, restarting in 3s..." >> /home/z/my-project/aitoolkit/server.log
    sleep 3
done
