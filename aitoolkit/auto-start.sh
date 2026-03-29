#!/bin/bash
cd /home/z/my-project/aitoolkit
export AUTH_TRUST_HOST=true

# Ensure static assets are available for standalone build
if [ -d ".next/static" ] && [ ! -d ".next/standalone/.next/static" ]; then
  cp -r .next/static .next/standalone/.next/static
  echo "$(date): Copied static assets to standalone" >> /tmp/auto-start.log
fi

while true; do
  node .next/standalone/server.js -p 3000 2>/tmp/server.log
  echo "$(date): Server died, restarting in 2s..." >> /tmp/auto-start.log
  sleep 2
done
