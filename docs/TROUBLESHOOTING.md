# Troubleshooting Guide - Schema Architect

This guide covers common errors and their solutions for the Schema Architect application.

---

## Quick Fix Script

Run the auto-fix script to resolve common issues:

```bash
./scripts/fix-common-issues.sh
```

---

## Common Errors

### 1. ChunkLoadError

**Error Message:**
```
Error [ChunkLoadError]: Failed to load chunk server/chunks/ssr/[...].js from module XXXXXX
```

**Causes:**
- Stale build artifacts from previous deployments
- Incomplete build process
- Missing files in `.next/standalone` directory
- Server restart without proper cleanup

**Solutions:**

| Solution | Command |
|----------|---------|
| **Quick Fix** | `./scripts/fix-common-issues.sh --fix-chunks` |
| **Manual Fix** | `rm -rf .next && npm run build` |
| **Restart Server** | `pkill -f "server.js" && npm run start` |

**Prevention:**
- Always run `npm run build` after pulling new code
- Use `rm -rf .next` before rebuild if issues persist
- Ensure `.next/standalone` has all required files

---

### 2. UntrustedHost (NextAuth v5)

**Error Message:**
```
[auth][error] UntrustedHost: Host must be trusted. URL was: http://xxx/api/auth/session
```

**Causes:**
- Missing `AUTH_TRUST_HOST=true` in environment
- NextAuth v5 requires explicit host trust configuration
- Running behind proxy/load balancer with different host

**Solutions:**

| Solution | Command |
|----------|---------|
| **Quick Fix** | `./scripts/fix-common-issues.sh --fix-auth` |
| **Manual Fix** | Add `AUTH_TRUST_HOST=true` to `.env` |

**Required Environment Variables:**
```bash
AUTH_TRUST_HOST=true
AUTH_SECRET=<your-secret-key>
NEXTAUTH_URL=https://your-domain.com  # Optional for production
```

---

### 3. MissingSecret (NextAuth v5)

**Error Message:**
```
[auth][error] MissingSecret: Please define a `secret`
```

**Causes:**
- Missing `AUTH_SECRET` in environment
- Required for JWT encryption in NextAuth v5

**Solutions:**

| Solution | Command |
|----------|---------|
| **Quick Fix** | `./scripts/fix-common-issues.sh --fix-auth` |
| **Generate Secret** | `openssl rand -base64 32` |
| **Add to .env** | `AUTH_SECRET=<generated-secret>` |

---

### 4. Hydration Mismatch

**Error Message:**
```
Hydration failed because the server rendered HTML didn't match the client
```

**Causes:**
- Server and client render different content
- Theme/color scheme differences between SSR and CSR
- Time-based or random values rendered differently

**Solutions:**

| Solution | Location |
|----------|----------|
| **Use Hydration Settings** | Settings → Hydration Settings |
| **Strategy: Defer** | Recommended for theme issues |
| **Strategy: CSS Variables** | Best performance |

---

### 5. Database Connection Errors

**Error Message:**
```
Can't reach database server at `localhost:5432`
PrismaClientInitializationError
```

**Causes:**
- Database not running
- Wrong connection string
- Network issues

**Solutions:**

```bash
# Check database status
npx prisma db pull

# Reset database
npx prisma migrate reset

# Generate client
npx prisma generate
```

---

### 6. Module Not Found

**Error Message:**
```
Module not found: Can't resolve 'ioredis'
```

**Causes:**
- Optional dependency not installed
- Feature flag enabled without dependency

**Solutions:**

| Dependency | Install Command | Notes |
|------------|-----------------|-------|
| `ioredis` | `npm install ioredis` | Redis caching (optional) |
| `sharp` | `npm install sharp` | Image processing |
| `bcrypt` | `npm install bcrypt` | Password hashing |

---

## Error Detection Patterns

### Log Analysis Commands

```bash
# Check for ChunkLoadError
tail -100 server.log | grep -i "ChunkLoadError"

# Check for Auth errors
tail -100 server.log | grep -i "\[auth\]\[error\]"

# Check for database errors
tail -100 server.log | grep -i "PrismaClient"

# Check all errors
tail -100 server.log | grep -iE "error|exception|failed"
```

---

## Environment Variables Reference

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | SQLite/PostgreSQL connection | `file:./dev.db` |
| `AUTH_SECRET` | NextAuth JWT secret | Random base64 string |
| `AUTH_TRUST_HOST` | Trust all hosts | `true` |

### Optional Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXTAUTH_URL` | Production URL | `https://app.example.com` |
| `ENCRYPTION_KEY` | Data encryption key | Random 32-byte hex |
| `REDIS_URL` | Redis connection | `redis://localhost:6379` |

---

## Recovery Procedures

### Full Reset

```bash
# Stop server
pkill -f "server.js"

# Clean build
rm -rf .next node_modules/.cache

# Rebuild
npm run build

# Restart
npm run start
```

### Database Reset

```bash
# Reset database (WARNING: deletes all data)
npx prisma migrate reset --force

# Or just regenerate client
npx prisma generate
```

### Environment Reset

```bash
# Backup current .env
cp .env .env.backup

# Run fix script
./scripts/fix-common-issues.sh --fix-all

# Restore custom settings if needed
# Edit .env manually
```

---

## Health Check Endpoints

| Endpoint | Purpose | Expected Response |
|----------|---------|-------------------|
| `/api/health` | Full health check | `{"status": "ok"}` |
| `/api/auth/session` | Auth status | Session object or null |
| `/api/projects` | API availability | JSON array |

---

## Support Escalation

1. **Check logs**: `tail -100 server.log`
2. **Run fix script**: `./scripts/fix-common-issues.sh --fix-all`
3. **Full rebuild**: `rm -rf .next && npm run build`
4. **Check environment**: Compare `.env` with required variables
5. **Database check**: `npx prisma db pull`
6. **Contact support**: Include server.log and .env (redact secrets)

---

## Prevention Checklist

- [ ] Run `npm run build` after code changes
- [ ] Ensure `.env` has all required variables
- [ ] Check `AUTH_TRUST_HOST=true` for production
- [ ] Generate fresh `AUTH_SECRET` for each environment
- [ ] Run `npx prisma generate` after schema changes
- [ ] Monitor `server.log` for warnings

---

*Last updated: 2026-03-20*
