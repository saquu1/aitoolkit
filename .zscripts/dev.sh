#!/bin/bash
# Persistent server startup - uses C daemonizer to survive container process cleanup
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

# Compile daemonizer if not exists
if [ ! -f /tmp/daemonize ]; then
  cat > /tmp/daemonize.c << 'DAEMONC'
#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include <sys/types.h>
#include <sys/stat.h>
#include <fcntl.h>
int main(int argc, char *argv[]) {
    if (argc < 2) { fprintf(stderr, "Usage: daemonize <cmd> [args...]\n"); return 1; }
    pid_t pid = fork();
    if (pid < 0) return 1;
    if (pid > 0) { printf("%d\n", pid); return 0; }
    setsid();
    pid = fork();
    if (pid < 0) return 1;
    if (pid > 0) return 0;
    close(0); close(1); close(2);
    open("/dev/null", O_RDWR); dup(0); dup(0);
    chdir("/home/z/my-project/aitoolkit/.next/standalone");
    execvp(argv[1], &argv[1]);
    return 1;
}
DAEMONC
  gcc /tmp/daemonize.c -o /tmp/daemonize 2>/dev/null || true
fi

# Start the production server as a true daemon
cd .next/standalone
export DATABASE_URL="file:/home/z/my-project/aitoolkit/db/custom.db"
/tmp/daemonize node server.js
echo "Next.js server daemonized"

# Wait briefly for server to start, then verify
for i in 1 2 3 4 5 6 7 8 9 10; do
  if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ 2>/dev/null | grep -q "200"; then
    echo "Server is ready on port 3000"
    exit 0
  fi
  sleep 1
done
echo "Warning: Server may not be ready yet"
exit 0
