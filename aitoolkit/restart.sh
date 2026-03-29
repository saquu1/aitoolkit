#!/bin/bash
# =============================================================================
# AITOOLKIT QUICK RESTART
# Usage: bash /home/z/my-project/aitoolkit/restart.sh
# =============================================================================

PROJECT_DIR="/home/z/my-project/aitoolkit"
STANDALONE_DIR="$PROJECT_DIR/.next/standalone"

echo "=== AITOOLKIT RESTART ==="

# Kill any existing server
pkill -f "node.*server.js.*3000" 2>/dev/null || true
sleep 1

# Ensure static assets
if [ -d "$PROJECT_DIR/.next/static" ]; then
  rm -rf "$STANDALONE_DIR/.next/static"
  cp -r "$PROJECT_DIR/.next/static" "$STANDALONE_DIR/.next/static"
  echo "[OK] Static assets copied"
fi

# Start server
cd "$STANDALONE_DIR"
export AUTH_TRUST_HOST=true
export DATABASE_URL="file:/home/z/my-project/db/custom.db"
export AUTH_SECRET="accubalance-dev-secret-change-in-production-123"
export NEXTAUTH_URL="http://localhost:3000"
export NEXTAUTH_SECRET_KEY="accubalance-dev-key"
export NEXT_PUBLIC_APP_URL="http://localhost:3000"
export NEXT_PUBLIC_APP_NAME="AI Toolkit"
export NODE_ENV=production

nohup node server.js -p 3000 > /tmp/aitoolkit-server.log 2>&1 &
echo "[OK] Server started as PID $!"

# Wait and verify
sleep 5
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ | grep -q "200"; then
  echo "[OK] Server is running on port 3000"
else
  echo "[WARN] Server may not be ready yet, check: tail -20 /tmp/aitoolkit-server.log"
fi
