#!/bin/bash
# ============================================================================
# MINIMAL START SCRIPT FOR Z.AI WORKSPACE
# ============================================================================
# PID Limit: 20 processes (HARD LIMIT)
# This script starts Next.js with MINIMAL process spawning
# ============================================================================

cd /home/z/my-project

# Critical: Minimal environment variables
export PORT=3000
export HOSTNAME=0.0.0.0
export NODE_ENV=production
export DATABASE_URL=file:/home/z/my-project/db/custom.db
export NEXT_TELEMETRY_DISABLED=1
export NEXT_PRIVATE_DISABLE_WORKER=1
export PRISMA_CLIENT_ENGINE_TYPE=library
export NODE_OPTIONS="--max-old-space-size=128"

# Log file
LOG="/tmp/server-minimal.log"

echo "[$(date)] Starting minimal server..." >> "$LOG"
echo "[$(date)] PID count before: $(cat /sys/fs/cgroup/pids/pids.current 2>/dev/null)" >> "$LOG"

# Start with bun (fewer processes than node)
exec bun .next/standalone/server.js >> "$LOG" 2>&1
