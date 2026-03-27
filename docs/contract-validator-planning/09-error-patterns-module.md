# ⚠️ Error Patterns Module Documentation

## Overview

The **Error Patterns Module** provides comprehensive error management with AI-powered analysis, pattern detection, and automatic fix capabilities. It detects recurring errors, classifies them, and can automatically generate and apply fixes.

---

## 📁 File Structure

```
src/
├── components/tabs/
│   └── ErrorPatternDashboardTab.tsx  # Main dashboard component
├── components/chat-logs/
│   └── ErrorPatternBankPanel.tsx     # Pattern management panel
├── app/api/error-patterns/
│   ├── route.ts                      # CRUD operations
│   └── ai-resolution/
│       └── route.ts                  # AI-powered auto-fix
├── lib/
│   ├── error-pattern-service.ts      # Error extraction service
│   ├── error-pattern-detection.ts    # Pattern detection
│   └── error-registry.ts             # Persistent error tracking
```

---

## 🎯 Main Functionality

### Core Capabilities

| Feature | Description |
|---------|-------------|
| Pattern Detection | Automatically identifies recurring errors from logs |
| Error Classification | Categorizes errors by type, severity, and category |
| AI-Powered Resolution | Uses AI to analyze errors and generate fixes |
| Auto-Fix Capabilities | Automatically applies code fixes to endpoints |
| Solution Storage | Saves successful fixes for future reuse |

---

## 🔍 Error Pattern Detection

### Multi-Source Extraction

The service analyzes multiple data sources:

| Source | Extraction Method |
|--------|-------------------|
| Raw JSON Data | Parses structured error objects |
| Text Content | Regex pattern matching in messages |
| Reasoning Blocks | AI reasoning analysis |
| Tool Calls | Tool execution failures |

### Pattern Matching

```typescript
// Known error patterns detected automatically:
const PATTERNS = {
  // Prisma Errors
  'P2005': /value.*not.*enum|enum.*mismatch/i,
  'P2002': /unique.*constraint|duplicate.*key/i,
  'P2003': /foreign.*key.*constraint|references.*not.*found/i,
  'P2025': /record.*not.*found|no.*result/i,
  'P1001': /cannot.*reach.*database|connection.*refused/i,
  
  // HTTP Errors
  '401': /unauthorized|not.*authenticated/i,
  '403': /forbidden|insufficient.*permissions/i,
  '404': /not.*found|does.*not.*exist/i,
  '500': /internal.*server.*error|unexpected.*error/i,
  
  // Network Errors
  'ECONNREFUSED': /connection.*refused|ECONNREFUSED/i,
  'ETIMEDOUT': /timeout|timed.*out/i,
  'ENOTFOUND': /not.*found|DNS.*error/i
}
```

### False Positive Filtering

The system filters out:
- Error handling code patterns (try/catch blocks)
- Test assertions
- Documentation examples
- Commented-out code

---

## 🏷️ Error Classification

### Error Types

| Type | Description | Examples |
|------|-------------|----------|
| `SERVER_FAILURE` | Server-side errors | 500, 502, 503 |
| `NETWORK_ERROR` | Connection issues | ECONNREFUSED, ETIMEDOUT |
| `AUTH_ERROR` | Authentication failures | 401, 403 |
| `VALIDATION_ERROR` | Input validation | 400, 422 |
| `BUSINESS_LOGIC` | Rule violations | Custom errors |
| `TOOL_ERROR` | Tool execution failures | Bash, Write failures |

### Severity Levels

| Level | Priority | Response |
|-------|----------|----------|
| `critical` | Immediate | Red alert, notify all |
| `error` | High | Yellow alert, log |
| `warning` | Medium | Log for review |
| `info` | Low | Informational only |

---

## 🤖 AI Auto-Fix Pipeline

### 5-Step Automatic Fix Process

```
┌─────────────────────────────────────────────────────────────────┐
│                    AI AUTO-FIX PIPELINE                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  STEP 1: ANALYZE                                                │
│  ─────────────────────────────────────────────────────────────  │
│  • AI analyzes error pattern                                    │
│  • Identifies root cause                                        │
│  • Determines affected files                                    │
│                                                                 │
│  STEP 2: READ CODE                                              │
│  ─────────────────────────────────────────────────────────────  │
│  • Reads problematic endpoint's source code                     │
│  • Analyzes related files                                       │
│  • Extracts context                                             │
│                                                                 │
│  STEP 3: GENERATE FIX                                           │
│  ─────────────────────────────────────────────────────────────  │
│  • AI generates code fix                                        │
│  • Calculates confidence score                                  │
│  • Creates backup of original file                              │
│                                                                 │
│  STEP 4: APPLY FIX                                              │
│  ─────────────────────────────────────────────────────────────  │
│  • Writes fix to file (with backup)                             │
│  • Updates pattern status                                       │
│  • Logs the change                                              │
│                                                                 │
│  STEP 5: TEST                                                   │
│  ─────────────────────────────────────────────────────────────  │
│  • Tests the fix by hitting endpoint                            │
│  • Verifies error is resolved                                   │
│  • Reports success/failure                                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📊 Data Structures

### ErrorPattern Interface

```typescript
interface ErrorPattern {
  id: string
  patternKey: string              // Unique identifier
  patternName: string             // Human-readable name
  errorType: string               // Error category
  endpoint: string                // API endpoint
  httpStatus: number              // HTTP status code
  description: string             // Error description
  occurrenceCount: number         // Times occurred
  severity: 'critical' | 'error' | 'warning' | 'info'
  rootCause?: string              // AI-identified root cause
  preventionStrategy?: string
  autoFixSolution?: string
  firstOccurrence: string
  lastOccurrence: string
  patternStatus: 'ACTIVE' | 'MONITORING' | 'RESOLVED' | 'IGNORED'
}
```

### ExtractedError Interface

```typescript
interface ExtractedError {
  errorType: string
  errorCategory: string
  errorCode: string | null
  errorTitle: string
  errorMessage: string
  errorStack: string | null
  toolName: string | null
  functionName: string | null
  arguments: string | null
  filePath: string | null
  sourceBlock: string
  sourceMessageId: string | null
  confidence: number
  patternSignature: string        // For deduplication
}
```

### AIResolutionResult Interface

```typescript
interface AIResolutionResult {
  success: boolean
  patternId: string
  rootCause: string
  solution: string
  codeFix?: string
  confidence: number              // 0-100
  appliedAt?: string
  testResult?: {
    passed: boolean
    responseTime: number
    statusCode: number
  }
}
```

---

## 🖥️ UI Components

### ErrorPatternDashboardTab Layout

```
┌─────────────────────────────────────────────────────────────────┐
│ STATS SUMMARY                                                   │
│ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐        │
│ │ Total  │ │Critical│ │ Errors │ │Warnings│ │ Info   │        │
│ │  156   │ │   3    │ │   45   │ │   67   │ │   41   │        │
│ └────────┘ └────────┘ └────────┘ └────────┘ └────────┘        │
│                                                                 │
│ ┌──────────────────────────────────────────────────────────┐   │
│ │ CRITICAL ALERT: 3 critical patterns detected!            │   │
│ │ [View Critical] [Auto-Fix All]                           │   │
│ └──────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────┤
│ TABS: [Patterns] [Quick Solutions] [Analysis]                   │
├─────────────────────────────────────────────────────────────────┤
│ PATTERNS TAB                                                    │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Search: [__________] Filter: [All Types ▼] [All Severity]  │ │
│ ├─────────────────────────────────────────────────────────────┤ │
│ │ [CRITICAL] P2005 - Prisma Enum Mismatch                    │ │
│ │ Endpoint: /api/users | Occurrences: 45 | Status: ACTIVE    │ │
│ │ Root Cause: Enum value "ACTIVE_STATUS" not in schema       │ │
│ │ [View Details] [AI Resolution] [Mark Resolved]             │ │
│ │                                                             │ │
│ │ [ERROR] 401 - Unauthorized                                 │ │
│ │ Endpoint: /api/projects | Occurrences: 23 | Status: ACTIVE │ │
│ │ [View Details] [AI Resolution] [Mark Resolved]             │ │
│ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Quick Solutions Tab

```
┌─────────────────────────────────────────────────────────────────┐
│ QUICK SOLUTIONS BY ERROR TYPE                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ AUTH_ERROR                                                      │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ [Refresh Session] [Clear Tokens] [Re-login]                │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ NETWORK_ERROR                                                   │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ [Retry Request] [Clear Cache] [Check Connection]           │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ SERVER_FAILURE                                                  │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ [Check Health] [Clear Error Log] [Restart Service]         │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ VALIDATION_ERROR                                                │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ [Reset Form] [Show Validation Rules] [Fix Data]            │ │
│ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### AI Resolution Dialog

```
┌─────────────────────────────────────────────────────────────────┐
│ AI RESOLUTION: P2005 - Prisma Enum Mismatch                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ PROCESSING STEPS                                                │
│ ✓ Analyzing error pattern...                                    │
│ ✓ Reading source code from /api/users/route.ts                  │
│ ✓ Generating fix...                                             │
│ ✓ Applying fix...                                               │
│ ◷ Testing fix...                                                │
│                                                                 │
│ ─────────────────────────────────────────────────────────────── │
│                                                                 │
│ ROOT CAUSE                                                      │
│ The enum value "ACTIVE_STATUS" is not defined in Prisma schema. │
│ The User.status field expects: ACTIVE, INACTIVE, PENDING.      │
│                                                                 │
│ SOLUTION                                                        │
│ Change "ACTIVE_STATUS" to "ACTIVE" in the API code.            │
│                                                                 │
│ CODE FIX                                                        │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ - status: "ACTIVE_STATUS"                                   │ │
│ │ + status: "ACTIVE"                                          │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ CONFIDENCE: 95%                                                 │
│                                                                 │
│ [Apply Fix] [View Full Diff] [Cancel]                           │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔌 API Endpoints

### `/api/error-patterns`

| Method | Action | Description |
|--------|--------|-------------|
| GET | - | Fetches all error patterns |
| GET | `?sessionId=X` | Filter by session |
| GET | `?severity=critical` | Filter by severity |
| GET | `?type=SERVER_FAILURE` | Filter by type |
| POST | `createFromError` | Create pattern from error |
| POST | `resolve` | Mark pattern as resolved |
| POST | `ignore` | Mark pattern as ignored |
| POST | `create` | Create new pattern manually |

### `/api/error-patterns/ai-resolution`

| Method | Action | Description |
|--------|--------|-------------|
| POST | `analyze` | AI analysis only (no fix) |
| POST | `auto_fix` | Analyze and fix automatically |
| POST | `full_resolution` | Complete 5-step pipeline |
| POST | `save_solution` | Save successful solution |
| GET | - | Get saved solutions |

---

## 📈 Statistics Tracked

| Metric | Description |
|--------|-------------|
| Total Patterns | All detected patterns |
| Critical | Patterns with critical severity |
| Errors | Patterns with error severity |
| Warnings | Patterns with warning severity |
| Info | Informational patterns |
| Occurrences | Total error occurrences |
| Resolved | Successfully resolved patterns |
| Active Rate | Percentage of active patterns |

---

*Document created: 2026-03-27*
