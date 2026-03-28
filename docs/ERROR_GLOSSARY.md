# Error Glossary - Schema Architect

Quick reference for common errors and their meanings.

---

## Authentication Errors (NextAuth v5)

### UntrustedHost

```
[auth][error] UntrustedHost: Host must be trusted. URL was: http://xxx/api/auth/session
```

| Field | Value |
|-------|-------|
| **Category** | Authentication |
| **Severity** | High |
| **Cause** | NextAuth v5 requires explicit host trust in production |
| **Impact** | Login fails, session unavailable |
| **Fix** | Add `AUTH_TRUST_HOST=true` to `.env` |

**Technical Details:**
- NextAuth v5 validates the host header against trusted hosts
- Required to prevent host header injection attacks
- Default behavior: reject all non-localhost requests

**Environment:**
```bash
AUTH_TRUST_HOST=true
```

---

### MissingSecret

```
[auth][error] MissingSecret: Please define a `secret`
```

| Field | Value |
|-------|-------|
| **Category** | Authentication |
| **Severity** | High |
| **Cause** | AUTH_SECRET not defined for JWT encryption |
| **Impact** | Sessions cannot be created/verified |
| **Fix** | Generate and add AUTH_SECRET |

**Environment:**
```bash
# Generate secret
openssl rand -base64 32

# Add to .env
AUTH_SECRET="your-generated-secret-here"
```

---

### InvalidCallbackUrl

```
[auth][error] InvalidCallbackUrl: URL not allowed as callback URL
```

| Field | Value |
|-------|-------|
| **Category** | Authentication |
| **Severity** | Medium |
| **Cause** | Callback URL not in allowed list |
| **Impact** | Redirect after login fails |
| **Fix** | Add URL to AUTH_CALLBACK_URLS |

**Environment:**
```bash
AUTH_CALLBACK_URLS=https://your-domain.com,https://your-domain.com/dashboard
```

---

## Build/Chunk Errors

### ChunkLoadError

```
Error [ChunkLoadError]: Failed to load chunk server/chunks/ssr/[...].js from module XXXXXX
```

| Field | Value |
|-------|-------|
| **Category** | Build/Deployment |
| **Severity** | High |
| **Cause** | Stale or missing build artifacts |
| **Impact** | Application fails to load |
| **Fix** | Clean rebuild |

**Solutions:**
```bash
# Option 1: Quick fix
rm -rf .next && npm run build

# Option 2: Full reset
rm -rf .next node_modules/.cache
npm run build

# Option 3: Use fix script
./scripts/fix-common-issues.sh --fix-chunks
```

**Common Causes:**
1. Old build after code update
2. Incomplete build process
3. Server restart with stale chunks
4. CDN caching issues

---

### ModuleNotFound

```
Module not found: Can't resolve 'module-name'
```

| Field | Value |
|-------|-------|
| **Category** | Build |
| **Severity** | High |
| **Cause** | Missing dependency |
| **Impact** | Build fails |
| **Fix** | Install missing module |

**Common Missing Modules:**

| Module | Install | Purpose |
|--------|---------|---------|
| `ioredis` | `npm install ioredis` | Redis caching (optional) |
| `sharp` | `npm install sharp` | Image processing |
| `bcrypt` | `npm install bcrypt` | Password hashing |
| `@prisma/client` | `npx prisma generate` | Database client |

---

## Hydration Errors

### HydrationMismatch

```
Hydration failed because the server rendered HTML didn't match the client
```

| Field | Value |
|-------|-------|
| **Category** | React |
| **Severity** | Medium |
| **Cause** | SSR/CSR content mismatch |
| **Impact** | UI flicker, broken interactivity |
| **Fix** | Use hydration-safe rendering |

**Common Causes:**
1. Theme stored in localStorage (different SSR/CSR)
2. Date/time values rendered differently
3. Random values in initial render
4. Browser extensions modifying DOM

**Solutions:**

```tsx
// Option 1: suppressHydrationWarning
<div suppressHydrationWarning>
  {value}
</div>

// Option 2: Client-only rendering
'use client';
import { useEffect, useState } from 'react';

function ClientOnly({ children }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted ? children : null;
}

// Option 3: Use project's hydration hook
import { useHydrationSettings } from '@/hooks/useHydrationSettings';
const { safeValue } = useHydrationSettings();
```

---

## Database Errors

### PrismaClientInitializationError

```
PrismaClientInitializationError: Can't reach database server
```

| Field | Value |
|-------|-------|
| **Category** | Database |
| **Severity** | High |
| **Cause** | Database connection failure |
| **Impact** | All data operations fail |
| **Fix** | Check connection string and server |

**Checklist:**
- [ ] Database server running
- [ ] Connection string correct
- [ ] Network accessible
- [ ] Credentials valid

**Common Solutions:**
```bash
# Test connection
npx prisma db pull

# Reset database (WARNING: data loss)
npx prisma migrate reset

# Generate client
npx prisma generate
```

---

### PrismaClientKnownRequestError

```
PrismaClientKnownRequestError: Unique constraint failed
```

| Field | Value |
|-------|-------|
| **Category** | Database |
| **Severity** | Medium |
| **Cause** | Duplicate entry on unique field |
| **Impact** | Insert/update fails |
| **Fix** | Check for existing records |

---

## Environment Errors

### MissingEnvVar

```
Error: NEXT_PUBLIC_* environment variable is required
```

| Field | Value |
|-------|-------|
| **Category** | Configuration |
| **Severity** | High |
| **Cause** | Missing required environment variable |
| **Impact** | Feature fails |
| **Fix** | Add to `.env` file |

**Required Variables:**

| Variable | Purpose | Required |
|----------|---------|----------|
| `DATABASE_URL` | Database connection | Yes |
| `AUTH_SECRET` | JWT encryption | Yes |
| `AUTH_TRUST_HOST` | Host validation | Production |
| `NEXT_PUBLIC_APP_URL` | Public app URL | Optional |

---

## API Errors

### RateLimitExceeded

```
Error: Rate limit exceeded
```

| Field | Value |
|-------|-------|
| **Category** | Security |
| **Severity** | Low |
| **Cause** | Too many requests |
| **Impact** | Request blocked |
| **Fix** | Wait or increase limit |

---

### UnauthorizedAccess

```
Error: Unauthorized
```

| Field | Value |
|-------|-------|
| **Category** | Security |
| **Severity** | Medium |
| **Cause** | Invalid or missing authentication |
| **Impact** | Request denied |
| **Fix** | Login or refresh session |

---

## Quick Reference Card

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      ERROR QUICK REFERENCE                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ERROR                    FIX                                           │
│  ─────────────────────   ───────────────────────────────────────────    │
│  UntrustedHost           AUTH_TRUST_HOST=true                           │
│  MissingSecret           AUTH_SECRET=$(openssl rand -base64 32)         │
│  ChunkLoadError          rm -rf .next && npm run build                  │
│  ModuleNotFound          npm install <module>                           │
│  HydrationMismatch       suppressHydrationWarning or ClientOnly         │
│  PrismaInitError         npx prisma generate                            │
│  DatabaseConnection      Check DATABASE_URL and server status           │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ONE-COMMAND FIX:                                                       │
│  ./scripts/fix-common-issues.sh --fix-all                               │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

*Last updated: 2026-03-20*
