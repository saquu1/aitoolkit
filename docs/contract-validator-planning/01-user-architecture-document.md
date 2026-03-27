# 🧠 Enhanced Architecture: Intelligence-Driven Contract Validator

## Your Brilliant Insight Summary

```
┌─────────────────────────────────────────────────────────────┐
│                    THE INTELLIGENCE FLOW                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  STEP 1: Validator Engine (Scan & Extract)                 │
│              ↓                                              │
│  STEP 2: Intelligence Bank (Store & Link)                  │
│              ↓                                              │
│  STEP 3: Smart Fixer (Analyze & Suggest Best Fix)          │
│                                                             │
│  Example: "pakistan" used 47 times, "Pak_istan" used 3x    │
│           → Suggest: Fix the 3, not the 47!                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 Complete System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        CONTRACT VALIDATOR SYSTEM                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌───────────────┐     ┌───────────────┐     ┌───────────────┐             │
│  │   VALIDATOR   │────▶│ INTELLIGENCE  │────▶│    SMART      │             │
│  │    ENGINE     │     │     BANK      │     │    FIXER      │             │
│  └───────────────┘     └───────────────┘     └───────────────┘             │
│         │                     │                     │                       │
│         ▼                     ▼                     ▼                       │
│  ┌───────────────┐     ┌───────────────┐     ┌───────────────┐             │
│  │ Scan Files    │     │ Store Links   │     │ Find Best Fix │             │
│  │ Extract Data  │     │ Track Usage   │     │ Minimal Impact│             │
│  │ Find Mismatches│    │ Build Graph   │     │ Auto-Apply    │             │
│  └───────────────┘     └───────────────┘     └───────────────┘             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🗄️ Intelligence Bank Schema Design

### Core Tables Structure

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    INTELLIGENCE BANK DATABASE                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ TABLE: EntityRegistry                                               │   │
│  │ ─────────────────────────────────────────────────────────────────── │   │
│  │ id              │ Primary Key                                       │   │
│  │ entityName      │ "ErrorPattern", "User", "ApiKey"                  │   │
│  │ entityType      │ "prisma_model" | "api_route" | "component" | etc  │   │
│  │ filePath        │ "/prisma/schema.prisma:45"                        │   │
│  │ variations      │ ["error_pattern", "errorPattern", "ErrorPattern"] │   │
│  │ canonicalName   │ "ErrorPattern" (the correct one)                  │   │
│  │ usageCount      │ 47                                                │   │
│  │ createdAt       │ timestamp                                         │   │
│  │ updatedAt       │ timestamp                                         │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ TABLE: EntityUsage                                                  │   │
│  │ ─────────────────────────────────────────────────────────────────── │   │
│  │ id              │ Primary Key                                       │   │
│  │ entityId        │ FK → EntityRegistry                               │   │
│  │ usedName        │ "pakistan" or "Pak_istan" (actual usage)          │   │
│  │ usedInFile      │ "/src/components/Dashboard.tsx"                   │   │
│  │ usedInLine      │ 145                                               │   │
│  │ usageContext    │ "fetch_body" | "api_param" | "db_query" | etc     │   │
│  │ isCorrect       │ true/false (matches canonical?)                   │   │
│  │ suggestedFix    │ "Change to 'pakistan'"                            │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ TABLE: EntityRelationships                                          │   │
│  │ ─────────────────────────────────────────────────────────────────── │   │
│  │ id              │ Primary Key                                       │   │
│  │ sourceEntityId  │ FK → EntityRegistry (e.g., API route)             │   │
│  │ targetEntityId  │ FK → EntityRegistry (e.g., Prisma model)          │   │
│  │ relationshipType│ "calls" | "imports" | "extends" | "uses"          │   │
│  │ sourceFile      │ "/api/users/route.ts"                             │   │
│  │ targetFile      │ "/prisma/schema.prisma"                           │   │
│  │ contractMatch   │ true/false (do they agree on shape?)              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ TABLE: FieldRegistry                                                │   │
│  │ ─────────────────────────────────────────────────────────────────── │   │
│  │ id              │ Primary Key                                       │   │
│  │ entityId        │ FK → EntityRegistry                               │   │
│  │ fieldName       │ "patternId", "userId", "createdAt"                │   │
│  │ fieldType       │ "string", "number", "object", "array"             │   │
│  │ isRequired      │ true/false                                        │   │
│  │ variations      │ ["pattern_id", "patternId", "PatternID"]          │   │
│  │ canonicalName   │ "patternId"                                       │   │
│  │ usageCount      │ 23                                                │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ TABLE: ContractMismatches                                           │   │
│  │ ─────────────────────────────────────────────────────────────────── │   │
│  │ id              │ Primary Key                                       │   │
│  │ sourceFile      │ "/src/components/Dashboard.tsx"                   │   │
│  │ sourceLine      │ 45                                                │   │
│  │ targetFile      │ "/api/patterns/route.ts"                          │   │
│  │ targetLine      │ 12                                                │   │
│  │ mismatchType    │ "field_name" | "field_type" | "missing_field"     │   │
│  │ sourceValue     │ "patternId"                                       │   │
│  │ targetValue     │ "pattern"                                         │   │
│  │ severity        │ "error" | "warning" | "info"                      │   │
│  │ status          │ "open" | "fixed" | "ignored"                      │   │
│  │ fixSuggestion   │ "Change source to 'pattern'"                      │   │
│  │ fixDifficulty   │ 3 (change 3 files) vs 47 (change 47 files)        │   │
│  │ autoFixable     │ true/false                                        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ TABLE: FileRegistry                                                 │   │
│  │ ─────────────────────────────────────────────────────────────────── │   │
│  │ id              │ Primary Key                                       │   │
│  │ filePath        │ "/src/components/Dashboard.tsx"                   │   │
│  │ fileType        │ "component" | "api" | "hook" | "util" | "prisma"  │   │
│  │ lastScanned     │ timestamp                                         │   │
│  │ fileHash        │ "abc123" (to detect changes)                      │   │
│  │ dependencies    │ JSON array of dependent file IDs                  │   │
│  │ dependents      │ JSON array of files that depend on this           │   │
│  │ entityCount     │ 5 (how many entities defined/used)                │   │
│  │ hasErrors       │ true/false                                        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ TABLE: APIContracts                                                 │   │
│  │ ─────────────────────────────────────────────────────────────────── │   │
│  │ id              │ Primary Key                                       │   │
│  │ endpoint        │ "/api/error-patterns/analyze"                     │   │
│  │ method          │ "POST" | "GET" | "PUT" | "DELETE"                 │   │
│  │ requestSchema   │ JSON: { action: string, patternId: string }       │   │
│  │ responseSchema  │ JSON: { success: boolean, data: object }          │   │
│  │ routeFile       │ "/api/error-patterns/analyze/route.ts"            │   │
│  │ calledFrom      │ JSON array of component file IDs                  │   │
│  │ callCount       │ 12 (how many places call this)                    │   │
│  │ lastValidated   │ timestamp                                         │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔗 Relationship Visualization

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    INTELLIGENCE RELATIONSHIP MAP                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                         ┌──────────────────┐                                │
│                         │  Prisma Schema   │                                │
│                         │  ErrorPattern    │                                │
│                         │  - id: String    │                                │
│                         │  - endpoint: Str │                                │
│                         │  - method: Str   │                                │
│                         └────────┬─────────┘                                │
│                                  │                                          │
│                    ┌─────────────┼─────────────┐                            │
│                    │             │             │                            │
│                    ▼             ▼             ▼                            │
│         ┌──────────────┐ ┌──────────────┐ ┌──────────────┐                  │
│         │ API Route 1  │ │ API Route 2  │ │ API Route 3  │                  │
│         │ /api/patterns│ │ /api/analyze │ │ /api/resolve │                  │
│         │ GET/POST     │ │ POST         │ │ POST         │                  │
│         └──────┬───────┘ └──────┬───────┘ └──────┬───────┘                  │
│                │                │                │                          │
│       ┌────────┼────────┬───────┼────────┬───────┼────────┐                 │
│       │        │        │       │        │       │        │                 │
│       ▼        ▼        ▼       ▼        ▼       ▼        ▼                 │
│   ┌────────┐┌────────┐┌────────┐┌────────┐┌────────┐┌────────┐              │
│   │Comp A  ││Comp B  ││Comp C  ││Page 1  ││Page 2  ││Hook 1  │              │
│   │Dashboard││Panel  ││Modal  ││Main   ││Detail ││useAPI  │              │
│   │        ││        ││        ││        ││        ││        │              │
│   │FK:     ││FK:     ││FK:     ││FK:     ││FK:     ││FK:     │              │
│   │pakistan││pakistan││Pak_istan││pakistan││Pak_istan││pakistan│              │
│   │  ✅    ││  ✅    ││  ❌    ││  ✅    ││  ❌    ││  ✅    │              │
│   └────────┘└────────┘└────────┘└────────┘└────────┘└────────┘              │
│                                                                             │
│   Usage Analysis:                                                           │
│   ─────────────────────────────────────────────────────────────────────     │
│   "pakistan"   → Used in 4 places ✅                                       │
│   "Pak_istan"  → Used in 2 places ❌                                       │
│                                                                             │
│   Recommendation: Fix "Pak_istan" → "pakistan" (2 changes vs 4 changes)    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🖥️ Enhanced UI Design - Option A (File Selector)

### Main Scanner Interface

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  🔍 Contract Validator                                    [⚙️] [📊] [❓]   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                       SELECT FILE TO SCAN                           │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │                                                                     │   │
│  │  📁 File Type:    [Components ▼]                                    │   │
│  │                                                                     │   │
│  │  📄 Select File:  [ErrorPatternDashboardTab.tsx ▼]                  │   │
│  │                                                                     │   │
│  │  ┌─────────────────────────────────────────────────────────────┐   │   │
│  │  │ 📋 Quick Actions:                                           │   │   │
│  │  │                                                             │   │   │
│  │  │ [🔍 Scan File Only]  [🔗 Scan With Dependencies]            │   │   │
│  │  │                                                             │   │   │
│  │  │ [📊 View Flow Map]   [🧠 Check Intelligence Bank]           │   │   │
│  │  └─────────────────────────────────────────────────────────────┘   │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    SCAN CONFIGURATION                               │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │                                                                     │   │
│  │  ☑️ Check API Contracts (fetch calls → API routes)                  │   │
│  │  ☑️ Check Database Contracts (API → Prisma schema)                  │   │
│  │  ☑️ Check Type Consistency (TypeScript types)                       │   │
│  │  ☑️ Check Naming Conventions (camelCase, snake_case)                │   │
│  │  ☐ Deep Scan (include node_modules) - Slow                         │   │
│  │                                                                     │   │
│  │  Depth Level: [2 ▼] (How many dependency levels to scan)           │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────┐     │
│  │                                                                   │     │
│  │              [ 🚀 START SCAN ]                                    │     │
│  │                                                                   │     │
│  └───────────────────────────────────────────────────────────────────┘     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Scan Results View

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  🔍 Scan Results: ErrorPatternDashboardTab.tsx             [Export] [Share] │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ SCAN SUMMARY                                              ⏱️ 1.2s   │  │
│  ├──────────────────────────────────────────────────────────────────────┤  │
│  │                                                                      │  │
│  │  Files Scanned: 8        Entities Found: 15       Relations: 23     │  │
│  │                                                                      │  │
│  │  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐                     │  │
│  │  │ ❌ 2   │  │ ⚠️ 5   │  │ ℹ️ 3   │  │ ✅ 13  │                     │  │
│  │  │ Errors │  │Warnings│  │  Info  │  │Passed  │                     │  │
│  │  └────────┘  └────────┘  └────────┘  └────────┘                     │  │
│  │                                                                      │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ DEPENDENCY CHAIN                                         [Expand All]│  │
│  ├──────────────────────────────────────────────────────────────────────┤  │
│  │                                                                      │  │
│  │  📄 ErrorPatternDashboardTab.tsx (Selected)                          │  │
│  │    │                                                                 │  │
│  │    ├─📡 /api/error-patterns/ai-resolution/route.ts                   │  │
│  │    │   └─🗄️ prisma.errorPattern (Prisma Model)                       │  │
│  │    │                                                                 │  │
│  │    ├─📡 /api/error-patterns/route.ts                                 │  │
│  │    │   └─🗄️ prisma.errorPattern (Prisma Model)                       │  │
│  │    │                                                                 │  │
│  │    ├─🧩 ErrorPatternBankPanel.tsx (Component)                        │  │
│  │    │   └─📡 /api/error-patterns/bank/route.ts                        │  │
│  │    │                                                                 │  │
│  │    └─🪝 useApiError.ts (Hook)                                        │  │
│  │        └─📡 Multiple API routes                                      │  │
│  │                                                                      │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Detailed Mismatch View

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ❌ ERROR #1: Contract Mismatch                                    [Fix ▼] │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │ MISMATCH DETAILS                                                   │    │
│  ├────────────────────────────────────────────────────────────────────┤    │
│  │                                                                    │    │
│  │  Type: Field Name Mismatch                                         │    │
│  │  Severity: 🔴 Error (Will cause runtime failure)                   │    │
│  │                                                                    │    │
│  │  ┌─────────────────────┐          ┌─────────────────────┐          │    │
│  │  │    SOURCE FILE      │    ≠     │    TARGET FILE      │          │    │
│  │  ├─────────────────────┤          ├─────────────────────┤          │    │
│  │  │ ErrorPattern...tsx  │          │ api/.../route.ts    │          │    │
│  │  │ Line: 145           │          │ Line: 23            │          │    │
│  │  │                     │          │                     │          │    │
│  │  │ fetch('/api/...', { │          │ const { pattern }   │          │    │
│  │  │   body: {           │          │   = await req.json()│          │    │
│  │  │     patternId: id   │   🔴     │                     │          │    │
│  │  │   }                 │          │ pattern.endpoint    │          │    │
│  │  │ })                  │          │ // undefined!       │          │    │
│  │  └─────────────────────┘          └─────────────────────┘          │    │
│  │                                                                    │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │ 🧠 INTELLIGENCE ANALYSIS                                           │    │
│  ├────────────────────────────────────────────────────────────────────┤    │
│  │                                                                    │    │
│  │  Usage Statistics:                                                 │    │
│  │  ─────────────────────────────────────────────────────────────     │    │
│  │  "patternId" (string) is used in:                                  │    │
│  │    • 12 components ✅                                              │    │
│  │    • 3 API routes expecting it                                     │    │
│  │                                                                    │    │
│  │  "pattern" (object) is expected in:                                │    │
│  │    • 2 API routes ⚠️                                               │    │
│  │    • 1 component sending it                                        │    │
│  │                                                                    │    │
│  │  📊 Recommendation:                                                │    │
│  │  ┌──────────────────────────────────────────────────────────────┐  │    │
│  │  │ FIX THE API (2 files) not the frontend (12 files)            │  │    │
│  │  │                                                              │  │    │
│  │  │ Effort: 🟢 Low (2 changes)                                   │  │    │
│  │  │ vs                                                           │  │    │
│  │  │ Effort: 🔴 High (12 changes)                                 │  │    │
│  │  └──────────────────────────────────────────────────────────────┘  │    │
│  │                                                                    │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │ 🔧 FIX OPTIONS                                                     │    │
│  ├────────────────────────────────────────────────────────────────────┤    │
│  │                                                                    │    │
│  │  Option A: Fix API to accept patternId                ⭐ RECOMMENDED│    │
│  │  ┌──────────────────────────────────────────────────────────────┐  │    │
│  │  │ // In api/.../route.ts                                       │  │    │
│  │  │ const { patternId, pattern } = await req.json()              │  │    │
│  │  │ const actualPattern = pattern ||                             │  │    │
│  │  │   await prisma.errorPattern.findUnique({                     │  │    │
│  │  │     where: { id: patternId }                                 │  │    │
│  │  │   })                                                         │  │    │
│  │  └──────────────────────────────────────────────────────────────┘  │    │
│  │  [Apply This Fix] [Preview Changes]                                │    │
│  │                                                                    │    │
│  │  Option B: Fix all frontend to send pattern object                 │    │
│  │  Files to change: 12                                               │    │
│  │  [Show All Files] [Apply to All]                                   │    │
│  │                                                                    │    │
│  │  Option C: Create adapter middleware                               │    │
│  │  [Generate Adapter] [Learn More]                                   │    │
│  │                                                                    │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  [← Previous Error]  [Ignore This]  [Mark as Fixed]  [Next Error →]       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🗺️ Flow Map Visualization

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  📊 Flow Map: ErrorPattern Entity                          [Export] [Zoom] │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                              ┌─────────────────┐                            │
│                              │   PRISMA MODEL  │                            │
│                              │   ErrorPattern  │                            │
│                              │                 │                            │
│                              │ • id: String    │                            │
│                              │ • endpoint: Str │                            │
│                              │ • method: Str   │                            │
│                              │ • statusCode:Int│                            │
│                              │ • createdAt:Date│                            │
│                              └────────┬────────┘                            │
│                                       │                                     │
│            ┌──────────────────────────┼──────────────────────────┐          │
│            │                          │                          │          │
│            ▼                          ▼                          ▼          │
│  ┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐      │
│  │   API ROUTE     │      │   API ROUTE     │      │   API ROUTE     │      │
│  │   /api/error-   │      │   /api/error-   │      │   /api/error-   │      │
│  │   patterns      │      │   patterns/     │      │   patterns/     │      │
│  │                 │      │   analyze       │      │   ai-resolution │      │
│  │  GET/POST/PUT   │      │   POST          │      │   POST          │      │
│  │                 │      │                 │      │                 │      │
│  │ Expects:        │      │ Expects:        │      │ Expects:        │      │
│  │ • patternId ✅  │      │ • pattern ❌    │      │ • patternId ✅  │      │
│  │                 │      │   (object)      │      │ • action        │      │
│  │ Returns:        │      │                 │      │                 │      │
│  │ • patterns[]    │      │ Returns:        │      │ Returns:        │      │
│  │                 │      │ • analysis      │      │ • resolution    │      │
│  └────────┬────────┘      └────────┬────────┘      └────────┬────────┘      │
│           │                        │                        │               │
│     ┌─────┴─────┐            ┌─────┴─────┐            ┌─────┴─────┐         │
│     │           │            │           │            │           │         │
│     ▼           ▼            ▼           ▼            ▼           ▼         │
│  ┌──────┐  ┌──────┐     ┌──────┐  ┌──────┐     ┌──────┐  ┌──────┐          │
│  │Comp1 │  │Comp2 │     │Comp3 │  │Page1 │     │Comp4 │  │Hook1 │          │
│  │      │  │      │     │      │  │      │     │      │  │      │          │
│  │Sends:│  │Sends:│     │Sends:│  │Sends:│     │Sends:│  │Sends:│          │
│  │patt- │  │patt- │     │patt- │  │patt- │     │patt- │  │patt- │          │
│  │ernId │  │ernId │     │ernId │  │ernId │     │ernId │  │ernId │          │
│  │  ✅  │  │  ✅  │     │  ❌  │  │  ✅  │     │  ✅  │  │  ✅  │          │
│  └──────┘  └──────┘     └──────┘  └──────┘     └──────┘  └──────┘          │
│                                                                             │
│  LEGEND:                                                                    │
│  ─────────────────────────────────────────────────────────────────────      │
│  ✅ Contract matches       ❌ Contract mismatch       ⚠️ Warning            │
│                                                                             │
│  Click any node to see details                                              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🧠 Intelligence Bank Dashboard

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  🧠 Intelligence Bank                                      [Refresh] [⚙️]  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ ENTITY OVERVIEW                                                      │  │
│  ├──────────────────────────────────────────────────────────────────────┤  │
│  │                                                                      │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐     │  │
│  │  │ Prisma     │  │ API        │  │ Components │  │ Total      │     │  │
│  │  │ Models     │  │ Routes     │  │            │  │ Relations  │     │  │
│  │  │            │  │            │  │            │  │            │     │  │
│  │  │   12       │  │   34       │  │   67       │  │   189      │     │  │
│  │  └────────────┘  └────────────┘  └────────────┘  └────────────┘     │  │
│  │                                                                      │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ NAMING VARIATIONS DETECTED                              [Fix All ▼] │  │
│  ├──────────────────────────────────────────────────────────────────────┤  │
│  │                                                                      │  │
│  │  ┌─────────────────────────────────────────────────────────────────┐│  │
│  │  │ Entity: ErrorPattern                                            ││  │
│  │  │ ─────────────────────────────────────────────────────────────── ││  │
│  │  │ Canonical: "ErrorPattern"                                       ││  │
│  │  │                                                                 ││  │
│  │  │ Variations Found:                                               ││  │
│  │  │ • "ErrorPattern"  → 45 usages ⭐ (canonical)                    ││  │
│  │  │ • "errorPattern"  → 12 usages ⚠️                                ││  │
│  │  │ • "error_pattern" → 3 usages ❌                                 ││  │
│  │  │ • "Errorpattern"  → 1 usage ❌                                  ││  │
│  │  │                                                                 ││  │
│  │  │ [View All Usages] [Auto-Fix to Canonical] [Set New Canonical]  ││  │
│  │  └─────────────────────────────────────────────────────────────────┘│  │
│  │                                                                      │  │
│  │  ┌─────────────────────────────────────────────────────────────────┐│  │
│  │  │ Entity: patternId                                               ││  │
│  │  │ ─────────────────────────────────────────────────────────────── ││  │
│  │  │ Canonical: "patternId"                                          ││  │
│  │  │                                                                 ││  │
│  │  │ Variations Found:                                               ││  │
│  │  │ • "patternId"     → 47 usages ⭐ (canonical)                    ││  │
│  │  │ • "pattern_id"    → 5 usages ⚠️                                 ││  │
│  │  │ • "PatternID"     → 2 usages ❌                                 ││  │
│  │  │ • "patternID"     → 1 usage ❌                                  ││  │
│  │  │                                                                 ││  │
│  │  │ [View All Usages] [Auto-Fix to Canonical] [Set New Canonical]  ││  │
│  │  └─────────────────────────────────────────────────────────────────┘│  │
│  │                                                                      │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ MOST CONNECTED ENTITIES                                              │  │
│  ├──────────────────────────────────────────────────────────────────────┤  │
│  │                                                                      │  │
│  │  #  Entity          Type      Used In    Relations   Issues          │  │
│  │  ── ─────────────── ───────── ────────── ──────────  ──────          │  │
│  │  1  ErrorPattern    Model     67 files   89 links    3 ⚠️           │  │
│  │  2  User            Model     45 files   56 links    0 ✅           │  │
│  │  3  ApiKey          Model     34 files   41 links    1 ⚠️           │  │
│  │  4  /api/patterns   Route     23 calls   34 links    2 ❌           │  │
│  │  5  useApiError     Hook      19 imports 27 links    0 ✅           │  │
│  │                                                                      │  │
│  │  [View All Entities] [Export Report]                                 │  │
│  │                                                                      │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔄 System Workflow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      COMPLETE SYSTEM WORKFLOW                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  PHASE 1: SCAN & EXTRACT                                                    │
│  ═══════════════════════════════════════════════════════════════════════   │
│                                                                             │
│  User Selects File                                                          │
│        │                                                                    │
│        ▼                                                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ VALIDATOR ENGINE                                                    │   │
│  │                                                                     │   │
│  │  1. Parse selected file                                             │   │
│  │  2. Extract:                                                        │   │
│  │     • Import statements                                             │   │
│  │     • fetch() calls                                                 │   │
│  │     • Component usages                                              │   │
│  │     • Hook usages                                                   │   │
│  │     • Type references                                               │   │
│  │  3. Find dependent files                                            │   │
│  │  4. Parse dependent files recursively (up to depth level)           │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│        │                                                                    │
│        ▼                                                                    │
│  PHASE 2: STORE & LINK                                                      │
│  ═══════════════════════════════════════════════════════════════════════   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ INTELLIGENCE BANK                                                   │   │
│  │                                                                     │   │
│  │  1. Store entities in EntityRegistry                                │   │
│  │  2. Record usages in EntityUsage                                    │   │
│  │  3. Create relationships in EntityRelationships                     │   │
│  │  4. Store field info in FieldRegistry                               │   │
│  │  5. Track API contracts in APIContracts                             │   │
│  │  6. Calculate canonical names based on usage frequency              │   │
│  │  7. Detect variations and inconsistencies                          │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│        │                                                                    │
│        ▼                                                                    │
│  PHASE 3: ANALYZE & COMPARE                                                 │
│  ═══════════════════════════════════════════════════════════════════════   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ CONTRACT ANALYZER                                                   │   │
│  │                                                                     │   │
│  │  1. Compare frontend sends vs API expects                           │   │
│  │  2. Compare API queries vs Prisma schema                            │   │
│  │  3. Compare API returns vs frontend expects                         │   │
│  │  4. Check naming consistency across layers                          │   │
│  │  5. Generate mismatch report                                        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│        │                                                                    │
│        ▼                                                                    │
│  PHASE 4: SUGGEST & FIX                                                     │
│  ═══════════════════════════════════════════════════════════════════════   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ SMART FIXER                                                         │   │
│  │                                                                     │   │
│  │  For each mismatch:                                                 │   │
│  │  1. Query Intelligence Bank for usage statistics                    │   │
│  │  2. Calculate "fix difficulty" for each option                      │   │
│  │  3. Recommend lowest-effort fix                                     │   │
│  │  4. Generate fix code                                               │   │
│  │  5. Apply fix if user approves                                      │   │
│  │  6. Update Intelligence Bank with fix                               │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 📋 Implementation Phases (Enhanced)

### Phase 1: Basic Validator Engine
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ PHASE 1: VALIDATOR ENGINE (2-3 weeks)                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ Features:                                                                   │
│ □ File selector UI (Option A)                                               │
│ □ Parse TypeScript/JavaScript files                                         │
│ □ Extract import statements                                                 │
│ □ Extract fetch() calls with body parsing                                   │
│ □ Find API route files from fetch URLs                                      │
│ □ Parse API route request expectations                                      │
│ □ Basic mismatch detection (field names)                                    │
│ □ Display results in simple list                                            │
│                                                                             │
│ Output:                                                                     │
│ "Line 45: Sends patternId but API expects pattern object"                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Phase 2: Intelligence Bank
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ PHASE 2: INTELLIGENCE BANK (2-3 weeks)                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ Features:                                                                   │
│ □ Create database schema (EntityRegistry, EntityUsage, etc.)                │
│ □ Store scan results in database                                            │
│ □ Track entity usage counts                                                 │
│ □ Detect naming variations                                                  │
│ □ Calculate canonical names                                                 │
│ □ Build relationship graph                                                  │
│ □ Intelligence Bank dashboard UI                                            │
│                                                                             │
│ Output:                                                                     │
│ "patternId used 47 times, pattern_id used 3 times"                          │
│ "Recommend: Change 3 files, not 47"                                         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Phase 3: Smart Fixer
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ PHASE 3: SMART FIXER (2-3 weeks)                                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ Features:                                                                   │
│ □ Generate multiple fix options                                             │
│ □ Calculate fix difficulty (files to change)                                │
│ □ Recommend optimal fix                                                     │
│ □ Preview changes before applying                                           │
│ □ Apply fixes automatically                                                 │
│ □ Update Intelligence Bank after fix                                        │
│ □ Undo/rollback capability                                                  │
│                                                                             │
│ Output:                                                                     │
│ "Applying Fix A: Updating 2 API files..."                                   │
│ "✅ Fix applied. 0 mismatches remaining."                                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Phase 4: Flow Map Visualization
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ PHASE 4: FLOW MAP (2-3 weeks)                                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ Features:                                                                   │
│ □ Visual graph of entity relationships                                      │
│ □ Interactive nodes (click to see details)                                  │
│ □ Color coding (green=ok, red=error, yellow=warning)                        │
│ □ Filter by entity type                                                     │
│ □ Export as image/PDF                                                       │
│ □ Drill-down from map to fix UI                                             │
│                                                                             │
│ Output:                                                                     │
│ Beautiful visual map showing all connections                                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Phase 5: Option B & C (Future)
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ PHASE 5: SIDEBAR & ERROR MONITOR INTEGRATION (Future)                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ Option B: Sidebar Integration                                               │
│ □ "Scan This Page" button on every tab                                      │
│ □ Automatic context detection                                               │
│ □ Quick-access mini-report                                                  │
│                                                                             │
│ Option C: Error Monitor Integration                                         │
│ □ When error occurs, show "Scan Related Files" button                       │
│ □ Auto-detect likely cause from error message                               │
│ □ Pre-fill scan with relevant files                                         │
│                                                                             │
│ Admin Features:                                                             │
│ □ Permission levels (who can scan, who can fix)                             │
│ □ Audit log of all changes                                                  │
│ □ Scheduled scans                                                           │
│ □ Email reports                                                             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔐 Permission System (For Future Options B & C)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        PERMISSION MATRIX                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Role          │ Scan │ View Results │ Apply Fix │ Admin Settings          │
│  ──────────────│──────│──────────────│───────────│─────────────────────    │
│  Developer     │  ✅  │      ✅      │     ✅    │        ❌               │
│  Tech Lead     │  ✅  │      ✅      │     ✅    │        ✅               │
│  Admin         │  ✅  │      ✅      │     ✅    │        ✅               │
│  Viewer        │  ❌  │      ✅      │     ❌    │        ❌               │
│  AI Assistant  │  ✅  │      ✅      │  ⚠️ Review│        ❌               │
│                                                                             │
│  ⚠️ = Requires approval from Tech Lead/Admin                               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```
