# 🔌 API Management Module Documentation

## Overview

The **API Management Module** provides comprehensive API monitoring, authentication management, error tracking, and route management capabilities for the application.

---

## 📁 File Structure

```
src/
├── components/tabs/
│   └── ApiManagementTab.tsx         # Main tab component
├── components/api-management/
│   ├── ApiErrorRegistryPanel.tsx    # Error registry panel
│   ├── ApiErrorHelpSection.tsx      # Error help section
│   └── index.ts                     # Barrel export
├── app/api/
│   ├── api-errors/
│   │   └── route.ts                 # Error CRUD operations
│   └── api-status/
│       └── route.ts                 # API health status
├── lib/error-management/
│   ├── error-registry.ts            # Centralized error storage
│   ├── api-error-handler.ts         # API error wrapper
│   ├── enum-validator.ts            # Pre-query enum validation
│   ├── chat-log-error-detector.ts   # Auto-detect errors from logs
│   └── index.ts                     # Module exports
├── config/
│   └── routes.ts                    # Route registry
└── hooks/
    └── useApiError.ts               # React hook for error handling
```

---

## 🎯 Main Functionality

### Core Capabilities

| Feature | Description |
|---------|-------------|
| API Health Monitoring | Real-time status of database, authentication, and endpoints |
| Authentication Management | Dev user creation, auth configuration, route access control |
| Error Tracking | Centralized error registry with pattern detection |
| Route Management | Add/remove public API routes dynamically |
| Quick Fixes | One-click solutions for common errors |

---

## 🐛 API Error Tracking

### Error Registry Service

```typescript
class ErrorRegistry {
  // Log new error
  async log(error: ErrorLogInput): Promise<ErrorLog>
  
  // Query errors with filters
  async query(filters: ErrorFilters): Promise<ErrorLog[]>
  
  // Resolve errors
  async resolve(ids: string[]): Promise<void>
  
  // Get pattern suggestions
  async suggestPattern(error: ErrorLog): Promise<ErrorPattern | null>
}
```

### Error Classification

**Error Types:**
- `SERVER_FAILURE` - Server-side errors (5xx)
- `NETWORK_ERROR` - Connection/CORS issues
- `AUTH_ERROR` - Authentication failures (401/403)
- `VALIDATION_ERROR` - Input validation errors
- `BUSINESS_LOGIC` - Business rule violations
- `TOOL_ERROR` - Tool execution failures

**Severity Levels:**
- `LOW` - Informational, no impact
- `MEDIUM` - Warning, potential issues
- `HIGH` - Error, affects functionality
- `CRITICAL` - System failure
- `FATAL` - Complete breakdown

**Categories:**
- `PRISMA_ENUM` - Prisma enum mismatch
- `PRISMA_CONSTRAINT` - Unique/FK constraint violation
- `PRISMA_QUERY` - Query execution error
- `PRISMA_CONNECTION` - Database connection failure
- `API_ERROR` - General API error
- `RUNTIME_ERROR` - JavaScript runtime error
- `UNKNOWN` - Uncategorized

### Known Error Patterns

```typescript
// Auto-detected patterns:
{
  P2005: {
    name: "Prisma Enum Mismatch",
    solution: "Value not recognized as enum. Check Prisma schema enum values.",
    autoFix: true
  },
  P2002: {
    name: "Unique Constraint Violation",
    solution: "Duplicate value for unique field. Check for existing records.",
    autoFix: false
  },
  P2003: {
    name: "Foreign Key Constraint",
    solution: "Referenced record not found. Ensure FK target exists.",
    autoFix: false
  },
  P2025: {
    name: "Record Not Found",
    solution: "No record found for the query criteria.",
    autoFix: false
  },
  P1001: {
    name: "Database Connection Failed",
    solution: "Cannot reach database server. Check connection string.",
    autoFix: false
  },
  ECONNREFUSED: {
    name: "Connection Refused",
    solution: "Target server refused connection. Check if service is running.",
    autoFix: false
  }
}
```

---

## 📚 Error Documentation

### Pre-defined Error Definitions (12 Types)

| Code | Name | Description | Auto-Fix |
|------|------|-------------|----------|
| 500 | Internal Server Error | Unexpected server-side error | No |
| ROUTE_AUTH | Route Requires Auth | Endpoint requires authentication | Yes |
| PUBLIC_ROUTE_401 | Public Route Auth Issue | Route marked public but still requires auth | Yes |
| ROUTE_NOT_FOUND | Route Not Found After Add | Added route but 404 persists | Yes |
| 401 | Unauthorized | Authentication required | Yes |
| 403 | Forbidden | Insufficient permissions | No |
| 404 | Not Found | Resource does not exist | No |
| ECONNREFUSED | Connection Refused | Cannot connect to service | No |
| P2002 | Unique Constraint | Duplicate value for unique field | No |
| P2021 | Table Not Exist | Database table does not exist | No |
| ENV_MISSING | Missing Environment | Required env variable not set | No |
| TIMEOUT | Request Timeout | Request took too long | No |

---

## 📊 Data Structures

### ErrorLog Model

```prisma
model ErrorLog {
  id              String    @id @default(cuid())
  requestId       String
  timestamp       DateTime  @default(now())
  status          Int       @default(0)
  statusText      String    @default("")
  type            String    @default("UNKNOWN")
  severity        String    @default("error")
  message         String
  hint            String?
  endpoint        String
  method          String    @default("GET")
  duration        Int?
  context         String    @default("{}")  // JSON
  retryable       Boolean   @default(false)
  retryCount      Int       @default(0)
  userAgent       String?
  url             String?
  acknowledged    Boolean   @default(false)
  patternId       String?
}
```

### ErrorPattern Model

```prisma
model ErrorPattern {
  id                  String    @id @default(cuid())
  patternKey          String    @unique
  patternName         String
  errorType           String
  endpoint            String?
  httpStatus          Int?
  description         String
  rootCause           String?
  autoFixSolution     String?
  occurrenceCount     Int       @default(0)
  patternStatus       String    @default("ACTIVE")
  severity            String    @default("warning")
}
```

### SavedErrorSolution Model

```prisma
model SavedErrorSolution {
  id          String    @id @default(cuid())
  errorType   String
  httpStatus  Int
  errorPattern String
  solution    String
  codeFix     String?
  confidence  Int       @default(80)
  successRate Int       @default(100)
  usageCount  Int       @default(0)
}
```

### TypeScript Interfaces

```typescript
interface ErrorLog {
  id: string
  message: string
  errorCode: string
  errorCategory: string
  severity: string
  source: string
  route?: string
  method?: string
  solution?: string
  preventionTips?: string
  occurrenceCount: number
  firstSeen: string
  lastSeen: string
  resolved: boolean
  stackTrace?: string
  details?: string
}
```

---

## 🖥️ UI Components

### ApiManagementTab Layout

```
┌─────────────────────────────────────────────────────────────────┐
│ STATUS OVERVIEW CARDS                                           │
│ ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐    │
│ │ Auth       │ │ Database   │ │ Endpoints  │ │ Errors     │    │
│ │ ✓ Active   │ │ ✓ Online   │ │ 45 Active  │ │ 3 Today    │    │
│ └────────────┘ └────────────┘ └────────────┘ └────────────┘    │
├─────────────────────────────────────────────────────────────────┤
│ AUTHENTICATION SETTINGS                                         │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Dev User: test@test.com                                     │ │
│ │ Password: ••••••••                                          │ │
│ │ [Create Dev User] [Reset Password]                          │ │
│ └─────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│ PUBLIC ROUTES MANAGEMENT                                        │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Current Public Routes:                                      │ │
│ │ • /api/health                                               │ │
│ │ • /api/auth/callback                                        │ │
│ │ • /api/autopilot                                            │ │
│ │                                                             │ │
│ │ [+ Add Route]  [- Remove Route]                             │ │
│ └─────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│ RECENT ERRORS                                                   │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ [ERROR] P2005 - Prisma Enum Mismatch                        │ │
│ │ Endpoint: /api/users  |  Time: 2 mins ago                   │ │
│ │                                                             │ │
│ │ [WARNING] 401 - Unauthorized                                │ │
│ │ Endpoint: /api/projects  |  Time: 15 mins ago              │ │
│ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### ApiErrorRegistryPanel Features

```
┌─────────────────────────────────────────────────────────────────┐
│ STATISTICS DASHBOARD                                            │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐            │
│ │ Total    │ │Unresolved│ │ Last 24h │ │ Resolved │            │
│ │   156    │ │    23    │ │    12    │ │   133    │            │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘            │
├─────────────────────────────────────────────────────────────────┤
│ SEARCH & FILTERS                                                │
│ [Search...] [Category ▼] [Severity ▼] [Source ▼] [Status ▼]    │
├─────────────────────────────────────────────────────────────────┤
│ ERROR LIST                                                      │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ [CRITICAL] P2005 - Enum Mismatch                           │ │
│ │ Category: PRISMA_ENUM | Source: API_MANAGEMENT             │ │
│ │ Occurred: 5 times | First: 2026-03-20 | Last: 2 mins ago  │ │
│ │ Solution: Check Prisma schema enum values...               │ │
│ │ [View Details] [Resolve] [Mark as Fixed]                   │ │
│ └─────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│ TOP ERROR PATTERNS                                              │
│ ████████████ P2005 (45)                                         │
│ ██████ 401 (23)                                                 │
│ ████ P2002 (12)                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔌 API Endpoints

### `/api/api-errors`

| Method | Action | Description |
|--------|--------|-------------|
| GET | `getErrors` | Query errors with filters |
| POST | `log` | Log new error to registry |
| PATCH | `resolve` | Resolve single or bulk errors |
| DELETE | `cleanup` | Delete resolved errors older than N days |

**Query Parameters (GET):**
- `category` - Filter by error category
- `severity` - Filter by severity level
- `source` - Filter by error source
- `resolved` - Filter by resolution status
- `search` - Search in message/details

### `/api/api-status`

| Method | Action | Description |
|--------|--------|-------------|
| GET | `status` | Returns auth, database, endpoints, recent errors |
| GET | `diagnostics` | Full system diagnostics |
| POST | `create-dev-user` | Create development user |
| POST | `add-public-route` | Add route to PUBLIC_API_ROUTES |
| POST | `remove-public-route` | Remove route from PUBLIC_API_ROUTES |
| POST | `check-database` | Verify database connection |
| POST | `check-env` | Validate environment variables |
| POST | `run-migrations` | Execute Prisma migrations |
| POST | `regenerate-prisma` | Regenerate Prisma client |

---

## 🔗 Integration Points

### 1. Route Registry (`src/config/routes.ts`)

```typescript
// Public routes (no auth required)
export const PUBLIC_API_ROUTES = [
  '/api/health',
  '/api/auth/callback',
  '/api/autopilot',
  // ...
]

// Protected routes (auth required)
export const PROTECTED_ROUTES = [
  '/api/projects',
  '/api/analytics',
  // ...
]
```

### 2. Middleware Integration

```typescript
// Middleware uses PUBLIC_API_ROUTES for authentication bypass
if (PUBLIC_API_ROUTES.some(route => pathname.startsWith(route))) {
  return next()
}
// Check authentication for protected routes
```

### 3. Error Management Module Exports

```typescript
// src/lib/error-management/index.ts
export { ErrorRegistry } from './error-registry'
export { ApiErrorHandler } from './api-error-handler'
export { EnumValidator } from './enum-validator'
export { ChatLogErrorDetector } from './chat-log-error-detector'
```

### 4. useApiError Hook

```typescript
const {
  error,
  isLoading,
  handleError,
  clearError,
  retry
} = useApiError()
```

---

## 🛠️ Quick Fix Solutions

### One-Click Fixes by Error Type

| Error Type | Quick Fix |
|------------|-----------|
| AUTH_ERROR | Refresh session, clear tokens |
| NETWORK_ERROR | Retry request, clear cache |
| SERVER_FAILURE | Check health, clear error log |
| VALIDATION_ERROR | Reset form |
| BUSINESS_LOGIC | Force refresh data |
| ENV_MISSING | Show required env vars |

---

*Document created: 2026-03-27*
