# 🗄️ Database Schema Plan: Unified Intelligence Bank

**Document Version:** 1.0  
**Created:** 2026-03-27  
**Status:** Implementation Ready

---

## 📊 Schema Design Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        DATABASE SCHEMA LAYERS                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  LAYER 1: Project Management                                                │
│  ├── Project (existing, enhanced)                                           │
│  ├── ProjectContextSettings (new)                                           │
│  └── ProjectScopeConfig (new)                                               │
│                                                                             │
│  LAYER 2: Intelligence Bank (Enhanced)                                      │
│  ├── IntelligenceEntity (projectId nullable)                                │
│  ├── EntityRelation (with project scope)                                    │
│  ├── EntityUsage (with project scope)                                       │
│  └── EntityInheritance (new - for Global→Child)                             │
│                                                                             │
│  LAYER 3: Error & Pattern Intelligence                                      │
│  ├── ErrorPattern (projectId nullable)                                      │
│  ├── ErrorPatternInstance (projectId required)                              │
│  └── PatternPromotion (new - Child→Global)                                  │
│                                                                             │
│  LAYER 4: Contract Validator                                                │
│  ├── ContractScan (existing, enhanced)                                      │
│  ├── ContractIssue (projectId required)                                     │
│  └── ContractTest (projectId nullable)                                      │
│                                                                             │
│  LAYER 5: Shared Services                                                   │
│  ├── ChatLog (projectId nullable)                                           │
│  ├── ScanHistory (projectId nullable)                                       │
│  └── GlobalRule (new - shared rules)                                        │
│                                                                             │
│  LAYER 6: Data Flow & Promotion                                             │
│  ├── DataPromotionRequest (new)                                             │
│  ├── InheritanceOverride (new)                                              │
│  └── ProjectDataShare (new - Cross-Project)                                 │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 📋 New Models to Add

### Layer 1: Project Management

```prisma
// Project Context Settings - Per-project configuration
model ProjectContextSettings {
  id                String   @id @default(cuid())
  projectId         String   @unique
  project           Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  
  // Context Mode
  contextMode       String   @default("global")  // "global" | "isolated"
  
  // Inheritance Settings
  inheritEntities   Boolean  @default(true)
  inheritPatterns   Boolean  @default(true)
  inheritRules      Boolean  @default(true)
  inheritTests      Boolean  @default(false)
  
  // Promotion Settings
  canPromoteToGlobal Boolean @default(false)
  requireApproval    Boolean @default(true)
  
  // Data Sharing
  allowSharing      Boolean  @default(false)
  sharedWithProjects String[] @default([])
  
  // Error Patterns Scope
  errorPatternScope String   @default("project") // "global" | "project" | "both"
  
  // Intelligence Scope
  intelligenceScope String   @default("inherit") // "inherit" | "isolated" | "extend"
  
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  @@map("project_context_settings")
}

// Project Scope Config - Filter/scope preferences
model ProjectScopeConfig {
  id                String   @id @default(cuid())
  userId            String
  user              User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  // Active Scope
  activeScope       String   @default("all") // "all" | "project" | "multi"
  activeProjectId   String?
  
  // Multi-select projects
  selectedProjects  String[] @default([])
  
  // UI Preferences
  defaultModule     String?
  rememberScope     Boolean  @default(true)
  
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  @@unique([userId])
  @@map("project_scope_config")
}
```

### Layer 2: Intelligence Bank Enhanced

```prisma
// Entity Inheritance - Tracks Global→Child inheritance
model EntityInheritance {
  id                String   @id @default(cuid())
  
  // Source (Global)
  sourceEntityId    String
  sourceProjectId   String?  // NULL = Global
  
  // Target (Project)
  targetEntityId    String
  targetProjectId   String
  
  // Inheritance Details
  inheritanceType   String   @default("full") // "full" | "partial" | "reference"
  inheritedFields   String[] @default([])     // Which fields are inherited
  overriddenFields  String[] @default([])     // Which fields are overridden
  
  // Status
  status            String   @default("active") // "active" | "deprecated" | "deleted"
  lastSyncedAt      DateTime @default(now())
  
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  @@unique([sourceEntityId, targetProjectId])
  @@index([targetProjectId])
  @@map("entity_inheritance")
}
```

### Layer 3: Error Pattern Enhanced

```prisma
// Pattern Promotion - Child→Global promotion requests
model PatternPromotion {
  id                String   @id @default(cuid())
  
  // Source Pattern
  patternId         String
  sourceProjectId   String   // From which project
  
  // Promotion Details
  promotionReason   String
  suggestedScope    String   @default("global") // "global" | "shared"
  targetProjectIds  String[] @default([])       // If shared, which projects
  
  // Approval
  status            String   @default("pending") // "pending" | "approved" | "rejected"
  reviewedBy        String?
  reviewedAt        DateTime?
  reviewNotes       String?
  
  // Metrics
  occurrenceCount   Int      @default(0)
  affectedProjects  Int      @default(1)
  
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  @@index([status, sourceProjectId])
  @@map("pattern_promotion")
}
```

### Layer 4: Data Flow & Promotion

```prisma
// Data Promotion Request - Generic promotion system
model DataPromotionRequest {
  id                String   @id @default(cuid())
  
  // Source
  sourceProjectId   String
  sourceEntityType  String   // "entity" | "pattern" | "rule" | "test"
  sourceEntityId    String
  
  // Target
  targetType        String   @default("global") // "global" | "projects"
  targetProjectIds  String[] @default([])
  
  // Request Details
  requestType       String   // "promote" | "share" | "copy"
  reason            String
  dataSnapshot      Json     // Snapshot of data being promoted
  
  // Approval Workflow
  status            String   @default("pending")
  requestedBy       String
  reviewedBy        String?
  reviewedAt        DateTime?
  approvalNotes     String?
  
  // Audit
  promotedAt        DateTime?
  
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  @@index([status, sourceProjectId])
  @@index([sourceEntityType, sourceEntityId])
  @@map("data_promotion_request")
}

// Project Data Share - Cross-project sharing
model ProjectDataShare {
  id                String   @id @default(cuid())
  
  // Owner
  ownerProjectId    String
  
  // Shared With
  targetProjectId   String
  
  // What is shared
  entityType        String   // "entity" | "pattern" | "rule" | "test"
  entityId          String
  
  // Permissions
  permission        String   @default("read") // "read" | "write" | "admin"
  canReshare        Boolean  @default(false)
  
  // Status
  status            String   @default("active") // "active" | "revoked" | "expired"
  expiresAt         DateTime?
  
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  @@unique([ownerProjectId, targetProjectId, entityType, entityId])
  @@index([targetProjectId, entityType])
  @@map("project_data_share")
}

// Inheritance Override - Track overridden inherited values
model InheritanceOverride {
  id                String   @id @default(cuid())
  
  // Inheritance Reference
  inheritanceId     String
  
  // Override Details
  fieldName         String
  inheritedValue    Json
  overrideValue     Json
  
  // Reason
  overrideReason    String?
  
  // Audit
  overriddenBy      String
  overriddenAt      DateTime @default(now())
  
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  @@unique([inheritanceId, fieldName])
  @@map("inheritance_override")
}
```

### Layer 5: Global Rules

```prisma
// Global Rule - Shared rules across all projects
model GlobalRule {
  id                String   @id @default(cuid())
  
  // Rule Definition
  ruleType          String   // "validation" | "naming" | "relation" | "business"
  ruleName          String
  ruleKey           String   @unique
  
  // Rule Content
  description       String
  ruleDefinition    Json
  severity          String   @default("warning") // "info" | "warning" | "error" | "critical"
  
  // Scope
  appliesTo         String[] @default([]) // Entity types this applies to
  
  // Project Overrides
  allowOverride     Boolean  @default(true)
  overrideProjects  String[] @default([]) // Projects that have overridden this
  
  // Status
  isActive          Boolean  @default(true)
  deprecatedAt      DateTime?
  
  // Metrics
  usageCount        Int      @default(0)
  
  createdBy         String?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  @@index([ruleType, isActive])
  @@map("global_rule")
}

// Project Rule Override - Per-project rule overrides
model ProjectRuleOverride {
  id                String   @id @default(cuid())
  
  // References
  projectId         String
  globalRuleId      String
  
  // Override
  overrideType      String   // "modify" | "disable" | "replace"
  overrideConfig    Json
  
  // Reason
  overrideReason    String?
  
  // Audit
  createdBy         String
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  @@unique([projectId, globalRuleId])
  @@index([projectId])
  @@map("project_rule_override")
}
```

---

## 📋 Existing Models to Modify

### IntelligenceEntity (Add projectId)

```prisma
model IntelligenceEntity {
  id                String   @id @default(cuid())
  
  // Project Scope (NEW)
  projectId         String?  // NULL = Global entity
  project           Project? @relation(fields: [projectId], references: [id])
  
  // ... existing fields ...
  
  // Inheritance (NEW)
  inheritsFromId    String?  // If inherited from global
  isInherited       Boolean  @default(false)
  inheritanceStatus String?  // "active" | "overridden" | "detached"
  
  // Scope (NEW)
  scope             String   @default("project") // "global" | "project" | "shared"
  sharedWith        String[] @default([])
  
  // ... rest of existing fields ...
  
  @@index([projectId])
  @@index([scope, projectId])
}
```

### ErrorPattern (Add projectId)

```prisma
model ErrorPattern {
  id                String   @id @default(cuid())
  
  // Project Scope (NEW)
  projectId         String?  // NULL = Global pattern
  project           Project? @relation(fields: [projectId], references: [id])
  
  // ... existing fields ...
  
  // Scope (NEW)
  scope             String   @default("project") // "global" | "project"
  occurrenceCount   Int      @default(1)
  affectedProjects  String[] @default([])
  
  // Promotion (NEW)
  canPromote        Boolean  @default(false)
  promotedFrom      String?  // projectId if promoted
  
  // ... rest of existing fields ...
  
  @@index([projectId])
  @@index([scope])
}
```

### ContractScan (Add projectId)

```prisma
model ContractScan {
  id                String   @id @default(cuid())
  scanId            String   @unique
  
  // Project Scope (NEW)
  projectId         String?  // NULL = Main app scan
  project           Project? @relation(fields: [projectId], references: [id])
  
  // ... existing fields ...
  
  // Scope (NEW)
  scanScope         String   @default("project") // "global" | "project" | "comparison"
  comparedProjects  String[] @default([])
  
  // ... rest of existing fields ...
  
  @@index([projectId])
  @@index([scanScope])
}
```

---

## 📊 Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          ENTITY RELATIONSHIPS                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐       ┌────────────────────────┐                           │
│  │   Project   │──1:1──│ ProjectContextSettings │                           │
│  └──────┬──────┘       └────────────────────────┘                           │
│         │                                                                   │
│         │ 1:N                                                              │
│         ▼                                                                   │
│  ┌──────────────────┐     ┌───────────────────┐                            │
│  │IntelligenceEntity│────▶│EntityInheritance  │                            │
│  │  (projectId?)    │     │ (source→target)   │                            │
│  └──────────────────┘     └───────────────────┘                            │
│         │                                                                   │
│         │ N:M (sharing)                                                    │
│         ▼                                                                   │
│  ┌──────────────────┐                                                      │
│  │ ProjectDataShare │                                                      │
│  └──────────────────┘                                                      │
│                                                                             │
│  ┌─────────────┐       ┌───────────────────┐                               │
│  │ ErrorPattern│──────▶│ PatternPromotion  │                               │
│  │(projectId?) │       │(Child→Global)     │                               │
│  └─────────────┘       └───────────────────┘                               │
│                                                                             │
│  ┌─────────────┐       ┌───────────────────┐                               │
│  │  GlobalRule │──────▶│ProjectRuleOverride│                               │
│  │   (shared)  │       │  (per-project)    │                               │
│  └─────────────┘       └───────────────────┘                               │
│                                                                             │
│  ┌─────────────┐       ┌───────────────────┐                               │
│  │    User     │──1:1──│ ProjectScopeConfig│                               │
│  └─────────────┘       │  (preferences)    │                               │
│                        └───────────────────┘                               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 📋 Implementation Order

| Step | Task | Tables Affected |
|------|------|-----------------|
| 1 | Add projectId to existing models | IntelligenceEntity, ErrorPattern, ContractScan |
| 2 | Create ProjectContextSettings | New table |
| 3 | Create ProjectScopeConfig | New table |
| 4 | Create EntityInheritance | New table |
| 5 | Create PatternPromotion | New table |
| 6 | Create DataPromotionRequest | New table |
| 7 | Create ProjectDataShare | New table |
| 8 | Create InheritanceOverride | New table |
| 9 | Create GlobalRule | New table |
| 10 | Create ProjectRuleOverride | New table |
| 11 | Update relations and indexes | All affected tables |

---

## 🗄️ Database Query Patterns

### Global Scope (All projects + Global)

```sql
SELECT * FROM IntelligenceEntity 
WHERE projectId IS NULL OR projectId IN (selectedProjects)
```

### Project Scope Only

```sql
SELECT * FROM IntelligenceEntity 
WHERE projectId = 'selectedProjectId'
```

### With Inheritance (Global + Project)

```sql
SELECT 
  e.*,
  i.inheritanceType,
  i.overriddenFields
FROM IntelligenceEntity e
LEFT JOIN EntityInheritance i ON e.id = i.targetEntityId
WHERE e.projectId = 'selectedProjectId' 
   OR e.projectId IS NULL
```

---

## 📝 Related Documents

- [Architecture Plan](./unified-intelligence-bank.md)
- [Implementation Report](./implementation-report-unified-intelligence.md)

---

*Last Updated: 2026-03-27*
