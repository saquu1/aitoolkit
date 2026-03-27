# 📚 Data Dictionary Module Documentation

## Overview

The **Living Data Dictionary** is a comprehensive schema documentation system that provides real-time visualization and documentation of database schemas, foreign key relationships, and business module mappings.

---

## 📁 File Structure

```
src/
├── components/tabs/
│   └── LivingDataDictionaryTab.tsx    # Main UI component (520+ lines)
├── hooks/
│   └── useSchema.tsx                  # Schema context provider
├── lib/
│   ├── doc-generator.ts               # Documentation generator
│   └── intelligence-bank/
│       ├── types.ts                   # Field record types
│       ├── enrichment-pipeline.ts     # Enrichment pipeline
│       └── unified-bank.ts            # Core bank service
├── app/api/intelligence-bank/
│   └── route.ts                       # API endpoint
└── app/page.tsx                       # Integration point (line 175, 460)
```

---

## 🎯 Main Functionality

### Primary Purpose
Serves as a **living documentation hub** that:
- Displays parsed SQL schema data with table definitions
- Tracks foreign key resolution status
- Links tables to business modules
- Generates exportable documentation

### Key Capabilities

| Feature | Description |
|---------|-------------|
| Schema Visualization | Tables with expandable column details, data types, constraints |
| FK Resolution Tracking | Shows resolved/unresolved foreign keys with percentage metrics |
| Missing Tables Detection | Identifies tables referenced by FKs but not present in schema |
| Module Linking | Maps tables to 35+ HIS business modules |
| Search & Filter | Filter tables/columns by search term; expand/collapse all |
| Export to Markdown | Generates structured `.md` documentation |
| Export to JSON | Generates structured `.json` for programmatic use |
| Copy to Clipboard | Quick copy of generated documentation |
| Statistics Dashboard | Total tables, columns, FKs, resolved %, missing, modules linked |

---

## 📊 Data Structures

### Core Types

```typescript
interface ParsedColumn {
  name: string
  dataType: string              // "INT", "NVARCHAR(100)", "DATETIME"
  maxLength?: string
  nullable: boolean
  isPrimaryKey: boolean
  isIdentity: boolean
  defaultValue?: string
}

interface ParsedFK {
  constraintName?: string
  columnName: string
  referencesTable: string
  referencesColumn: string
}

interface ParsedTable {
  schemaName: string
  tableName: string
  columns: ParsedColumn[]
  foreignKeys: ParsedFK[]
  sourceDDL?: string            // Original CREATE TABLE statement
}
```

### Intelligence Bank Integration

The Data Dictionary integrates with the 12-layer enrichment system:

| Layer | Provides |
|-------|----------|
| Schema Layer | Data types, constraints, defaults |
| FK Layer | Foreign key relationships and resolution |
| Intelligence Layer | Semantic type, business meaning |
| UI Component Layer | Component type, input type, grid width |
| Validation Layer | Client/server validation rules |
| Compliance Layer | PII/PHI detection, sensitivity |
| Complexity Layer | Development estimates, migration risk |
| SOP Layer | Standard Operating Procedure compliance |
| CSHTML Evidence | View evidence, AJAX endpoints |
| SP Evidence | Stored procedure usage |
| Test Cases | Auto-generated test cases |
| Documentation | Data dictionary entries |

---

## 🖥️ UI Components

### LivingDataDictionaryTab

**Layout Structure:**
```
┌─────────────────────────────────────────────────────────────────┐
│ STATISTICS CARDS                                                 │
│ [Total Tables] [Total Columns] [FKs] [Resolved %] [Missing]     │
├─────────────────────────────────────────────────────────────────┤
│ CONTROLS                                                         │
│ [Search Input] [Expand All] [Collapse All] [Export MD] [Export JSON] │
├─────────────────────────────────────────────────────────────────┤
│ TABLE LIST (Scrollable)                                          │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ 📊 TableName                          [PK] [FK] Module Badge │ │
│ │ Columns: 15 | FKs: 3 | Source: DDL                         │ │
│ │ ┌─────────────────────────────────────────────────────────┐ │ │
│ │ │ EXPANDED COLUMN DETAILS                                 │ │ │
│ │ │ Col Name    Type        Nullable  PK  FK  Default       │ │ │
│ │ │ ─────────────────────────────────────────────────────── │ │ │
│ │ │ Id          INT         No        ✓       AUTO          │ │ │
│ │ │ Name        NVARCHAR(100) No            ORG_NAME        │ │ │
│ │ │ CountryId   INT         No            ✓ Country.Id      │ │ │
│ │ └─────────────────────────────────────────────────────────┘ │ │
│ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

**Component Props:**
```typescript
interface LivingDataDictionaryTabProps {
  projectId?: string
}
```

---

## 🔌 API Endpoints

### `/api/intelligence-bank`

| Action | Method | Description |
|--------|--------|-------------|
| `summary` | GET | Get field counts, confidence, compliance stats |
| `fields` | GET | Get paginated field records |
| `field` | GET | Get single field with all enrichment data |
| `tables` | GET | Get unified table records |
| `sop-rules` | GET | Get SOP compliance rules |
| `sop-violations` | GET | Get SOP violation records |
| `consistency-checks` | GET | Get consistency check results |
| `run-enrichment` | POST | Run 12-step enrichment pipeline |
| `apply-sop-autofix` | POST | Apply SOP auto-fix to a field |
| `run-all-sop-autofixes` | POST | Apply all available auto-fixes |
| `resolve-consistency` | POST | Resolve a consistency check |
| `create-sop-rule` | POST | Create custom SOP rule |

---

## 💾 Database Models

| Model | Purpose |
|-------|---------|
| `UnifiedField` | Master field record with all enrichment layers |
| `UnifiedTable` | Aggregated table metrics |
| `UnifiedSOPRule` | Standard Operating Procedure rules |
| `UnifiedEnrichmentSession` | Pipeline execution tracking |
| `UnifiedEnrichmentLog` | Per-field enrichment history |
| `UnifiedConsistencyCheck` | Consistency validation results |
| `UnifiedFieldSOPCompliance` | SOP compliance per field |
| `ToolkitTable` | Parsed table data |
| `ColumnIntelligenceCache` | Semantic analysis cache |
| `FKDependencyCache` | FK resolution cache |

---

## 🎨 Visual Indicators

### Column Type Badges

| Badge | Meaning |
|-------|---------|
| `PK` | Primary Key |
| `FK` | Foreign Key |
| `AI` | Auto Increment (Identity) |
| `NULL` | Nullable column |
| `DEF` | Has default value |

### FK Status Colors

| Color | Status |
|-------|--------|
| 🟢 Green | Resolved (referenced table exists) |
| 🔴 Red | Unresolved (missing table) |
| 🟡 Yellow | Partial (some issues) |

### Module Linking Status

| Status | Description |
|--------|-------------|
| Linked | Table matched to HIS module |
| Unlinked | No module match found |
| Multiple | Multiple potential matches |

---

## 📤 Export Formats

### Markdown Export

```markdown
# Data Dictionary

Generated: 2026-03-27
Tables: 45 | Columns: 312 | FKs: 67

## Table: Organization

| Column | Type | Nullable | PK | FK | Default |
|--------|------|----------|----|----|---------|
| Id | INT | No | ✓ | | AUTO |
| Name | NVARCHAR(100) | No | | | |
| CountryId | INT | No | | ✓ Country.Id | |

### Foreign Keys
- FK_Organization_Country: CountryId → Country.Id

### Module
- Module: Organization Management
- Business Area: Administration
```

### JSON Export

```json
{
  "generatedAt": "2026-03-27T10:00:00Z",
  "statistics": {
    "totalTables": 45,
    "totalColumns": 312,
    "totalFKs": 67,
    "fkResolvedPercent": 94
  },
  "tables": [
    {
      "tableName": "Organization",
      "columns": [...],
      "foreignKeys": [...],
      "module": "Organization Management"
    }
  ]
}
```

---

## 🔗 Integration Points

1. **Navigation** - Integrated via `data-dictionary` tab
2. **Schema Context** - Uses `SchemaProvider` via `useSchema()` hook
3. **Theme** - Uses `useTheme()` hook for consistent styling
4. **Module Matcher** - Links tables to HIS modules

---

## 📈 Statistics Displayed

| Metric | Description |
|--------|-------------|
| Total Tables | Number of parsed tables |
| Total Columns | Sum of all columns across tables |
| Total FKs | Number of foreign key constraints |
| FK Resolved % | Percentage of FKs with existing target tables |
| Missing Tables | Tables referenced by FKs but not found |
| Modules Linked | Tables matched to business modules |

---

*Document created: 2026-03-27*
