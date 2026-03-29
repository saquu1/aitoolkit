#!/bin/bash
set -e
cd /home/z/my-project/aitoolkit

echo "[DEV] Fixing DATABASE_URL in .env files..."
for envfile in .env .next/standalone/.env; do
  if [ -f "$envfile" ]; then
    sed -i 's|DATABASE_URL=.*|DATABASE_URL="file:/home/z/my-project/aitoolkit/db/custom.db"|' "$envfile"
  fi
done

echo "[DEV] Ensuring database is synced..."
DATABASE_URL="file:/home/z/my-project/aitoolkit/db/custom.db" npx prisma db push --accept-data-loss 2>&1 || true
DATABASE_URL="file:/home/z/my-project/aitoolkit/db/custom.db" npx prisma generate 2>&1 || true

mkdir -p .next/standalone/node_modules/.prisma/client
cp -r node_modules/.prisma/client/* .next/standalone/node_modules/.prisma/client/ 2>/dev/null || true
mkdir -p .next/standalone/node_modules/@prisma/client
cp -r node_modules/@prisma/client/* .next/standalone/node_modules/@prisma/client/ 2>/dev/null || true
cp -r .next/static .next/standalone/.next/static 2>/dev/null || true
cp -r public .next/standalone/public 2>/dev/null || true
mkdir -p .next/standalone/db
cp db/custom.db .next/standalone/db/custom.db 2>/dev/null || true

if [ -f ".next/standalone/.env" ]; then
  sed -i 's|DATABASE_URL=.*|DATABASE_URL="file:/home/z/my-project/aitoolkit/db/custom.db"|' ".next/standalone/.env"
fi

echo "[DEV] Starting standalone production server on port 3000..."
export DATABASE_URL="file:/home/z/my-project/aitoolkit/db/custom.db"
export PORT=3000 HOSTNAME=0.0.0.0 NODE_ENV=production
export NEXT_TELEMETRY_DISABLED=1 NEXTAUTH_SECRET=accubalance-dev-secret-123
export NEXTAUTH_URL=http://localhost:3000 PRISMA_CLIENT_ENGINE_TYPE=library
export NODE_OPTIONS="--max-old-space-size=256" NEXT_PRIVATE_DISABLE_WORKER=1

cd .next/standalone
exec node server.js
