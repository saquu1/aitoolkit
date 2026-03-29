#!/bin/bash
set -e
cd /home/z/my-project/aitoolkit

# Fix DATABASE_URL in all .env files (MUST be absolute path)
echo 'DATABASE_URL="file:/home/z/my-project/aitoolkit/db/custom.db"' > .env
echo 'DATABASE_URL="file:/home/z/my-project/aitoolkit/db/custom.db"' > .next/standalone/.env

# Copy public and static assets
cp -r public .next/standalone/ 2>/dev/null || true
cp -r .next/static .next/standalone/.next/ 2>/dev/null || true

# Copy Prisma client to standalone
mkdir -p .next/standalone/node_modules/.prisma/client
cp -r node_modules/.prisma/client/* .next/standalone/node_modules/.prisma/client/ 2>/dev/null || true
mkdir -p .next/standalone/node_modules/@prisma/client
cp -r node_modules/@prisma/client/* .next/standalone/node_modules/@prisma/client/ 2>/dev/null || true

# Start the production server
cd .next/standalone
exec node server.js
