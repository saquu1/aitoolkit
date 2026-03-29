#!/bin/bash
set -e
cd /home/z/my-project/aitoolkit

# Fix DATABASE_URL in all .env files
echo 'DATABASE_URL="file:./db/custom.db"' > .env
echo 'DATABASE_URL="file:./db/custom.db"' > .next/standalone/.env

# Run DB sync
bun run db:push

# Copy public and static assets
cp -r public .next/standalone/ 2>/dev/null || true
cp -r .next/static .next/standalone/.next/ 2>/dev/null || true

# Start the production server (exec replaces the shell process)
cd .next/standalone
exec node server.js
