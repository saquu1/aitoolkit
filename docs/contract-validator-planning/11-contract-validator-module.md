# 🔍 Contract Validator Module Documentation

## Overview

The **Contract Validator** is a one-click detection tool for identifying data mismatches between Frontend ↔ API ↔ Database layers. It is specifically designed to help non-technical AI coders catch "object mismatch" errors instantly.

---

## 📁 File Structure

```
src/
├── components/tabs/
│   └── ContractValidatorTab.tsx     # Main UI component (221 lines)
└── app/api/contract-validator/
    └── route.ts                     # API endpoint
```

---

## 🎯 Main Functionality

### Primary Purpose
Detect "invisible" mismatches between:
- **Frontend ↔ API** - What frontend sends vs what API expects
- **API ↔ Database** - What API sends vs what DB schema expects

### Problem Solved

```
┌─────────────────────────────────────────────────────────────────┐
│                     THE PROBLEM                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Frontend sends:     { patternId: "abc123" }                    │
│                              ↓                                  │
│  API expects:        { pattern: { id: "abc123", ... } }         │
│                              ↓                                  │
│  Result:             💥 Runtime Error (undefined)               │
│                                                                 │
│  This is INVISIBLE until the code runs!                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## ✨ Key Features

| Feature | Description |
|---------|-------------|
| Missing Parameter Detection | Detects when frontend sends X but API expects Y |
| Undefined Access Scanning | Finds code accessing properties on potentially undefined objects |
| Unknown Endpoint Detection | Identifies frontend calls to non-existent API routes |
| Type Mismatch Detection | Detects data format inconsistencies |
| Code Fix Suggestions | Provides actionable suggestions with code examples |

---

## 📊 Data Structures

### ContractIssue Interface

```typescript
interface ContractIssue {
  type: 'missing_param' | 'extra_param' | 'type_mismatch' | 'undefined_access' | 'unknown_endpoint'
  severity: 'error' | 'warning' | 'info'
  message: string
  frontendFile?: string
  frontendLine?: number
  apiFile?: string
  suggestion: string
}
```

### Issue Types

| Type | Description | Example |
|------|-------------|---------|
| `missing_param` | API expects a parameter not sent by frontend | API expects `pattern` but frontend sends `patternId` |
| `extra_param` | Frontend sends parameter API doesn't expect | Frontend sends `userId` but API doesn't use it |
| `type_mismatch` | Data type doesn't match expectation | Frontend sends string, API expects number |
| `undefined_access` | Accessing property on potentially undefined object | `data.pattern.name` when `pattern` could be undefined |
| `unknown_endpoint` | Frontend calls non-existent API route | `fetch('/api/non-existent')` |

### APIEndpoint Interface

```typescript
interface APIEndpoint {
  file: string                  // Route file path
  method: string                // HTTP method
  route: string                 // API route path
  expectedParams: string[]      // URL parameters expected
  expectedBody: string[]        // Body parameters expected
  actualCalls: APICall[]        // Calls found in frontend
  issues: ContractIssue[]       // Detected issues
}
```

### APICall Interface

```typescript
interface APICall {
  file: string                  // Frontend file making the call
  line: number                  // Line number of fetch()
  endpoint: string              // API endpoint called
  method: string                // HTTP method
  sentParams: string[]          // Parameters sent
  sentBody: string[]            // Body parameters sent
}
```

### ValidationResult Interface

```typescript
interface ValidationResult {
  success: boolean
  summary: {
    totalEndpoints: number
    totalCalls: number
    totalIssues: number
    errors: number
    warnings: number
  }
  endpoints: APIEndpoint[]
  issues: ContractIssue[]
}
```

---

## 🖥️ UI Components

### ContractValidatorTab Layout

```
┌─────────────────────────────────────────────────────────────────┐
│ HEADER                                                          │
│ Contract Validator - Detect API contract mismatches             │
│ [🔍 Scan for Issues]                                            │
├─────────────────────────────────────────────────────────────────┤
│ EMPTY STATE (Before Scan)                                       │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │                                                             │ │
│ │            🔍 Contract Validator                            │ │
│ │                                                             │ │
│ │  Click "Scan for Issues" to detect:                        │ │
│ │                                                             │ │
│ │  ❌ Missing parameters (API expects X, you send Y)         │ │
│ │  ⚠️ Type mismatches (string vs number)                     │ │
│ │  🔗 Unknown endpoints (calling non-existent routes)        │ │
│ │  💥 Undefined access (accessing props on undefined)        │ │
│ │                                                             │ │
│ └─────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│ LOADING STATE                                                   │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │                                                             │ │
│ │            🔄 Scanning codebase...                          │ │
│ │            ████████████████░░░░░░ 67%                       │ │
│ │                                                             │ │
│ └─────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│ SUMMARY CARDS (After Scan)                                      │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐│
│ │ API      │ │ API      │ │ Total    │ │ Errors   │ │Warnings││
│ │ Endpoints│ │ Calls    │ │ Issues   │ │          │ │        ││
│ │    45    │ │   123    │ │    12    │ │    3     │ │   9    ││
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘ └────────┘│
├─────────────────────────────────────────────────────────────────┤
│ STATUS BANNER                                                   │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ 🔴 Issues Found - 3 errors need attention                   │ │
│ │ or                                                          │ │
│ │ ✅ All Valid - No contract issues detected                  │ │
│ └─────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│ ISSUES LIST                                                     │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ [ERROR] missing_param                                       │ │
│ │ Frontend: /src/components/Panel.tsx:45                      │ │
│ │ API: /api/error-patterns/ai-resolution/route.ts             │ │
│ │ Message: API expects 'pattern' object but frontend sends    │ │
│ │          'patternId' string                                 │ │
│ │ Suggestion: Change API to accept patternId OR change        │ │
│ │             frontend to send pattern object                 │ │
│ │                                                             │ │
│ │ [WARNING] undefined_access                                  │ │
│ │ Frontend: /src/components/Dashboard.tsx:78                  │ │
│ │ Message: Accessing 'data.user.name' where 'user' could be   │ │
│ │          undefined                                          │ │
│ │ Suggestion: Add null check: data.user?.name                 │ │
│ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔌 API Endpoints

### `GET /api/contract-validator`

**Purpose:** Run full contract validation scan

**Query Parameters:**
- `action` - (default: 'validate')

**Response:**
```typescript
{
  success: boolean,
  summary: {
    totalEndpoints: number,
    totalCalls: number,
    totalIssues: number,
    errors: number,
    warnings: number
  },
  endpoints: APIEndpoint[],
  issues: ContractIssue[]
}
```

### `POST /api/contract-validator`

**Actions:**

| Action | Description |
|--------|-------------|
| `validate_endpoint` | Validate a single endpoint |
| `fix_issue` | Get fix suggestions for an issue |
| (default) | Run full validation |

**Request Example:**
```typescript
// Validate single endpoint
{
  action: 'validate_endpoint',
  endpoint: '/api/error-patterns'
}

// Get fix suggestion
{
  action: 'fix_issue',
  issueId: 'issue-123'
}
```

---

## 🔧 Core Validation Functions

| Function | Purpose |
|----------|---------|
| `validateAllContracts()` | Main orchestrator - scans all API routes and frontend calls |
| `findAPIRoutes()` | Recursively finds all `route.ts/tsx` files in `/app/api/` |
| `analyzeAPIRoute()` | Extracts HTTP methods, expected params/body from route code |
| `findFrontendCalls()` | Scans all `.ts/.tsx` files for `fetch()` calls |
| `extractAPICalls()` | Parses fetch patterns to extract endpoint, method, sent params |
| `validateCallAgainstEndpoint()` | Compares sent params vs expected params |
| `scanForUndefinedAccess()` | Scans for potential undefined object access patterns |
| `validateSingleEndpoint()` | Validate specific endpoint only |
| `suggestFix()` | Generate fix suggestions with code examples |

---

## 📝 Example Detection

### Before Fix

```typescript
// Frontend: ErrorPanel.tsx
const response = await fetch('/api/error-patterns/ai-resolution', {
  method: 'POST',
  body: JSON.stringify({ patternId: id })  // ❌ Sends patternId
})

// API: route.ts
const { pattern } = await req.json()  // ❌ Expects pattern object
const result = pattern.endpoint  // 💥 undefined!
```

### Detection Result

```typescript
{
  type: 'missing_param',
  severity: 'error',
  message: "API expects 'pattern' object but frontend sends 'patternId' string",
  frontendFile: '/src/components/ErrorPanel.tsx',
  frontendLine: 45,
  apiFile: '/src/app/api/error-patterns/ai-resolution/route.ts',
  suggestion: "Option A: Fix API to accept patternId\nOption B: Fix frontend to send pattern object"
}
```

---

## 🔗 Integration Points

1. **Navigation** - Registered in `NAV_ITEMS` with slug `contract-validator`
2. **Lazy Loading** - Dynamically imported for memory optimization
3. **Route** - Accessible via `/?tab=contract-validator`

---

## ⚠️ Important Notes

| Aspect | Note |
|--------|------|
| Database | No database models - performs real-time file scanning |
| External Services | None - uses native `fs` module |
| Self-Contained | All logic is in the component and API route files |
| Memory Optimized | Loaded on-demand via Next.js dynamic import |

---

## 🚀 Future Enhancements (Planned)

Based on the planning documents, the Contract Validator will be enhanced with:

1. **Intelligence Bank Integration** - Link with existing field records
2. **Scan History Storage** - Track issues over time
3. **Auto-Fix with Backup** - Apply fixes with one-click restore
4. **Flow Map Visualization** - Visual contract relationships
5. **Pre-commit Hook** - Catch issues before commit

---

*Document created: 2026-03-27*
