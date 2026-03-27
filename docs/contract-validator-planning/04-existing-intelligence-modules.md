# 📚 Existing Intelligence Modules Documentation

## Overview

This document provides comprehensive documentation for two existing modules in the project that are already synced and operational:

1. **Intelligence Bank** (`?tab=intelligence-bank`)
2. **Intelligence** (`?tab=intelligence`)

---

## 1. INTELLIGENCE BANK MODULE

### 1.1 Purpose & Description

The **Intelligence Bank** is a **central repository for field-level intelligence data**. It serves as the "brain" of the system, storing enriched metadata about every field in your database schema through a sophisticated 12-layer enrichment pipeline.

**Key Value Propositions:**
- Single source of truth for all field intelligence
- Automated enrichment through multi-agent pipeline
- SOP (Standard Operating Procedure) compliance checking
- Consistency validation across layers
- PII/PHI detection and compliance tracking

### 1.2 File Structure

```
src/
├── components/tabs/
│   └── IntelligenceBankTab.tsx      # Main UI component
├── lib/intelligence-bank/
│   ├── index.ts                     # Module exports
│   ├── types.ts                     # TypeScript type definitions
│   ├── unified-bank.ts              # Core bank service
│   ├── enrichment-pipeline.ts       # 12-step pipeline
│   ├── sop-engine.ts                # SOP compliance engine
│   ├── consistency-engine.ts        # Cross-field validation
│   ├── autofix-engine.ts            # Auto-fix capabilities
│   ├── fk-integration.ts            # Foreign key handling
│   ├── column-intel-integration.ts  # Column intelligence
│   └── compliance-integration.ts    # Compliance scanning
├── app/api/intelligence-bank/
│   └── route.ts                     # API endpoint
└── components/
    └── SOPManagementUI.tsx          # SOP rule management UI
```

### 1.3 Core Components

#### 1.3.1 12-Layer Enrichment Pipeline

The Intelligence Bank uses a sophisticated 12-layer enrichment pipeline that progressively builds intelligence about each field:

| Layer | Name | Description | Agent |
|-------|------|-------------|-------|
| 1 | Schema Layer | Data types, constraints, defaults | SQLParserAgent |
| 2 | FK Layer | Foreign key relationships | FKResolverAgent |
| 3 | Intelligence Layer | Semantic type, business meaning | ColumnIntelAgent |
| 4 | UI Component Layer | Form controls, rendering hints | UIInferenceAgent |
| 5 | Validation Layer | Client/server validation rules | ValidationSyncAgent |
| 6 | Compliance Layer | PII/PHI detection | ComplianceScanner |
| 7 | Complexity Layer | Migration difficulty analysis | ComplexityAnalyzer |
| 8 | SOP Layer | Standard Operating Procedure compliance | SOPEngine |
| 9 | CSHTML Evidence | Legacy view analysis | CSHTMLParserAgent |
| 10 | SP Evidence | Stored procedure analysis | SPEvidenceAgent |
| 11 | Test Cases | UAT test generation | TestGeneratorAgent |
| 12 | Documentation | Data dictionary entries | DocGeneratorAgent |

#### 1.3.2 Unified Field Record

The master data structure that holds all intelligence about a field:

```typescript
interface UnifiedFieldRecord {
  // Identity
  id: string;
  projectId: string;
  tableName: string;
  fieldName: string;
  qualifiedName: string;  // "Organization.CountryId"
  
  // 12 Layers of Intelligence
  schema: SchemaLayer;           // Data types, constraints
  foreignKey: FKLayer;           // FK relationships
  intelligence: IntelligenceLayer; // Semantic meaning
  uiComponent: UIComponentLayer;  // UI rendering hints
  validation: ValidationLayer;    // Validation rules
  compliance: ComplianceLayer;    // PII/PHI flags
  complexity: ComplexityLayer;    // Migration complexity
  sop: SOPLayer;                  // SOP compliance
  cshtmlEvidence: CSHTMLEvidenceLayer; // Legacy evidence
  spEvidence: SPEvidenceLayer;    // SP evidence
  testCases: FieldTestCase[];     // Generated tests
  documentation: DocumentationLayer; // Data dictionary
  meta: MetaLayer;                // Tracking metadata
}
```

### 1.4 Key Features

#### 1.4.1 Schema Layer Intelligence

Extracts and stores:
- **Data Type**: `INT`, `NVARCHAR(100)`, `DATETIME`, etc.
- **Constraints**: `NOT NULL`, `UNIQUE`, `CHECK`, `DEFAULT`
- **Identity/Computed columns**
- **Source tracking**: Where the schema info came from

```typescript
interface SchemaLayer {
  dataType: string;          // "INT", "NVARCHAR(100)"
  baseType: string;          // "int", "string"
  maxLength: number | null;
  isNullable: boolean;
  isPrimaryKey: boolean;
  isIdentity: boolean;
  defaultValue: string | null;
  checkConstraint: string | null;
  source: SchemaSource;      // Where info came from
  confidence: number;        // 0.0 - 1.0
}
```

#### 1.4.2 FK Layer Intelligence

Tracks foreign key relationships with multiple evidence sources:

```typescript
interface FKLayer {
  isForeignKey: boolean;
  referencedTable: string | null;
  referencedColumn: string | null;
  referencedTableExists: boolean;
  relationshipType: 'one_to_many' | 'many_to_many' | 'one_to_one';
  resolutionStatus: 'resolved' | 'unresolved' | 'missing_table';
  lookupValues: any[] | null;  // Cached lookup values
  cascadeChain: string[];      // ["Country", "Province", "City"]
  sources: {
    sqlDDL: boolean;           // Found in CREATE TABLE
    spReference: boolean;      // Used in SP JOINs
    cshtmlDropdown: boolean;   // Rendered as dropdown
    namingPattern: boolean;    // Ends with "Id"
  };
}
```

#### 1.4.3 Intelligence Layer

Semantic understanding of fields:

```typescript
interface IntelligenceLayer {
  semanticType: string;        // "email", "phone", "name", "code"
  semanticCategory: string;    // "contact_info", "identifier", "status"
  businessMeaning: string;     // "Organization's primary email"
  dataPattern: string | null;  // "###-###-####" for phone
  exampleValues: string[];     // Sample values found
  suggestedLabel: string;      // "Email Address"
  suggestedPlaceholder: string;// "Enter email address"
  suggestedHelpText: string;   // Help text for UI
  isSystemField: boolean;      // CreatedBy, ModifiedDate
  isAuditField: boolean;       // Audit trail fields
  isCalculated: boolean;       // Computed/derived
}
```

#### 1.4.4 UI Component Layer

Auto-suggested UI rendering:

```typescript
interface UIComponentLayer {
  componentType: string;       // "text_input", "dropdown", "datepicker"
  htmlInputType: string;       // "text", "email", "password", "number"
  renderAs: string;            // "TextInput", "Select", "DatePicker"
  gridWidth: string;           // "col-md-6", "col-md-4"
  displayOrder: number;
  groupName: string | null;    // "Organization Information"
  isHidden: boolean;           // For PK, system fields
  isReadOnly: boolean;         // For code fields on update
  dropdownConfig: {
    sourceType: 'static' | 'api' | 'sp' | 'enum';
    sourceEndpoint: string;    // "/api/organization-types/dropdown"
    valueField: string;        // "Id"
    displayField: string;      // "Name"
    cascadeParent: string;     // "CountryId"
    cascadeChild: string;      // "ProvinceId"
  };
  sopRulesApplied: string[];   // SOP rules that were applied
}
```

#### 1.4.5 Validation Layer

Client-server validation alignment:

```typescript
interface ValidationLayer {
  isRequired: boolean;
  clientSideRules: ClientValidationRule[];
  serverSideRules: ServerValidationRule[];
  crossFieldRules: CrossFieldRule[];  // "confirmPassword === password"
  databaseConstraints: DatabaseConstraint[];
  validationAlignment: 'full' | 'partial' | 'mismatch';
  missingValidations: string[];       // What's missing
  excessiveValidations: string[];     // What's extra
}
```

#### 1.4.6 Compliance Layer

PII/PHI detection and regulatory compliance:

```typescript
interface ComplianceLayer {
  sensitivityLevel: 'public' | 'internal' | 'confidential' | 'restricted';
  isPII: boolean;              // Personally Identifiable Information
  isPHI: boolean;              // Protected Health Information
  isFinancial: boolean;        // Financial data
  piiCategory: string | null;  // "name", "email", "phone", "address"
  phiCategory: string | null;  // "diagnosis", "medication", "lab_result"
  requiresEncryption: boolean;
  requiresMasking: boolean;
  maskingPattern: string;      // "***-****" for phone display
  retentionPolicy: string;     // "7 years" for medical records
  regulatoryFrameworks: string[]; // ["HIPAA", "GDPR", "HITECH"]
}
```

### 1.5 SOP (Standard Operating Procedure) Engine

The SOP Engine enforces 18+ built-in rules for UI/UX compliance:

| Category | Example Rules |
|----------|---------------|
| Alignment | Action column center alignment, grid column alignment |
| Typography | Label font consistency, required field indicators |
| Forms | Field grouping, section organization, tab ordering |
| Validation | Error message placement, validation icon usage |
| Security | Password field masking, sensitive data handling |
| Compliance | PII field indicators, PHI audit flags |

**SOP Rule Structure:**

```typescript
interface SOPRuleDefinition {
  id: string;
  sopId: string;              // "SOP-ACTION-ALIGN"
  name: string;
  description: string;
  category: 'alignment' | 'typography' | 'forms' | 'validation' | 'security' | 'compliance';
  priority: number;
  appliesTo: 'all_fields' | 'dropdown_fields' | 'date_fields' | 'pii_fields';
  condition: Record<string, any>;
  expectedValue: string;
  autoFixAction: Record<string, any> | null;  // Can be auto-fixed?
  isSystemDefault: boolean;
}
```

### 1.6 Consistency Engine

Detects and optionally auto-fixes cross-field issues:

| Check Type | Severity | Auto-Fixable |
|------------|----------|--------------|
| FK_TABLE_MISSING | Error | No |
| VALIDATION_MISMATCH | Warning | Yes |
| PII_NO_ENCRYPTION | Error | Yes |
| PHI_NO_AUDIT | Error | Yes |
| REQUIRED_NOT_NULL_MISMATCH | Warning | Yes |
| CASCADE_CHAIN_BROKEN | Warning | No |
| TEST_COVERAGE_GAP | Info | Yes |
| SOP_VIOLATION_UNFIXED | Info | Yes |

### 1.7 API Endpoints

**Base URL:** `/api/intelligence-bank`

| Method | Action | Description |
|--------|--------|-------------|
| GET | `summary` | Get intelligence summary stats |
| GET | `enrichment-sessions` | Get enrichment history |
| POST | `run-enrichment` | Execute 12-layer pipeline |
| POST | `run-consistency-checks` | Run consistency validation |
| POST | `run-all-sop-autofixes` | Auto-fix all fixable SOP violations |

**Example Request:**

```typescript
// Run enrichment
POST /api/intelligence-bank
{
  "action": "run-enrichment",
  "projectId": "proj-123"
}

// Get summary
GET /api/intelligence-bank?projectId=proj-123&action=summary
```

### 1.8 UI Features

The Intelligence Bank UI provides:

1. **Overview Tab**
   - Health score banner
   - Enrichment progress by layer
   - PII/PHI summary
   - Recent enrichment sessions

2. **Enrichment Tab**
   - Visual 12-step pipeline display
   - Run pipeline button
   - Per-agent status

3. **SOP Management Tab**
   - SOP rule list
   - Compliance percentage
   - Auto-fix controls

4. **Consistency Tab**
   - Issue counts by type
   - Auto-fix all button
   - Issue resolution status

5. **Compliance Tab**
   - HIPAA compliance tracking
   - GDPR compliance tracking
   - Regulatory framework coverage

---

## 2. INTELLIGENCE MODULE

### 2.1 Purpose & Description

The **Intelligence Module** provides **AI-driven analysis and generation features** that consume the enriched data from the Intelligence Bank to generate artifacts for development.

**Key Value Propositions:**
- AI-powered question generation for requirement gathering
- Automatic screen blueprint generation
- Business rule extraction and documentation
- User story generation for sprint planning
- Compliance report generation
- Column/SP/View intelligence viewers

### 2.2 File Structure

```
src/
├── components/tabs/
│   └── IntelligenceTab.tsx         # Main UI component
├── lib/
│   ├── intelligence-service.ts     # Core service
│   ├── project-intelligence.ts     # Project-level intelligence
│   ├── column-intelligence.ts      # Column analysis
│   ├── view-intelligence-service.ts# View analysis
│   ├── sp-intelligence-enhanced.ts # SP analysis
│   └── compliance-report-generator.ts # Compliance reports
├── app/api/intelligence/
│   └── route.ts                    # API endpoint
└── components/
    ├── ColumnIntelligenceViewer.tsx
    ├── SPIntelligenceViewer.tsx
    ├── ViewIntelligenceViewer.tsx
    └── EnhancedSPIntelligenceViewer.tsx
```

### 2.3 Core Features

#### 2.3.1 AI Question Generation

Automatically generates intelligent questions based on schema analysis:

```typescript
interface QuestionSession {
  id: string;
  groups: QuestionGroup[];
  progress: {
    total: number;
    answered: number;
    criticalTotal: number;
    criticalAnswered: number;
  };
}

interface QuestionGroup {
  id: string;
  title: string;        // "Organization Management"
  description: string;
  icon: string;         // Emoji icon
  questions: Question[];
  status: 'pending' | 'in_progress' | 'completed';
}

interface Question {
  id: string;
  question: string;     // "Should Organization.Name be unique?"
  context: string;      // "Currently no unique constraint exists"
  category: string;     // "validation", "workflow", "security"
  priority: 'critical' | 'high' | 'medium' | 'low';
  options: { value: string; label: string; recommended: boolean }[];
  answer?: string;
}
```

**Question Categories:**
- **Validation**: Unique constraints, format requirements, allowed values
- **Workflow**: Status transitions, approval processes, notifications
- **Security**: Access control, encryption, audit requirements
- **Business Logic**: Calculation rules, dependencies, defaults

#### 2.3.2 Screen Blueprint Generation

Auto-generates UI blueprints for each table:

```typescript
interface ScreenBlueprints {
  tableName: string;
  
  // List Screen
  listScreen: {
    title: string;
    columns: string[];        // Grid columns
    defaultSort: string;
    filters: FilterConfig[];
    actions: string[];        // "Create", "Edit", "Delete"
    pageSize: number;
  };
  
  // Form Screen
  formScreen: {
    title: string;
    sections: {
      name: string;
      fields: FieldConfig[];
    }[];
    actions: string[];
  };
  
  // Detail Screen
  detailScreen: {
    title: string;
    sections: {
      name: string;
      fields: FieldDisplay[];
    }[];
    relatedEntities: string[];
  };
  
  // Dashboard Widgets
  dashboardWidgets: {
    type: 'stats' | 'chart' | 'list';
    title: string;
    dataSource: string;
  }[];
}
```

#### 2.3.3 Business Rule Generation

Extracts and documents business rules:

```typescript
interface BusinessRule {
  id: string;
  code: string;           // "BR-ORG-001"
  name: string;
  description: string;
  category: 'validation' | 'workflow' | 'security' | 'business_logic';
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'draft' | 'pending_approval' | 'approved' | 'rejected';
  
  // Rule Definition
  trigger: {
    event: string;        // "before_create", "after_update"
    condition: string;
  };
  condition: {
    field: string;
    operator: string;
    value: any;
  };
  action: {
    type: string;
    parameters: Record<string, any>;
  };
}
```

**Example Rules Generated:**
- `BR-ORG-001`: Organization.Name must be unique within the same country
- `BR-ORG-002`: Organization.Status transitions: Active → Inactive → Archived
- `BR-ORG-003`: Organization.Email must match email format pattern
- `BR-ORG-004`: Super Admin approval required for organization deletion

#### 2.3.4 User Story Generation

Creates user stories ready for sprint planning:

```typescript
interface UserStory {
  id: string;
  code: string;           // "US-ORG-001"
  title: string;
  
  // As a <role>, I want to <feature>, so that <benefit>
  role: string;           // "System Administrator"
  feature: string;        // "create new organizations"
  benefit: string;        // "I can manage multiple healthcare facilities"
  
  acceptanceCriteria: string[];
  priority: 'must_have' | 'should_have' | 'could_have' | 'wont_have';
  storyPoints: number;    // 1, 2, 3, 5, 8, 13, 21
  tableName: string;      // Related table
}
```

**Example User Stories:**
- `US-ORG-001`: As a System Administrator, I want to create new organizations, so that I can manage multiple healthcare facilities
- `US-ORG-002`: As a System Administrator, I want to edit organization details, so that I can keep information up to date
- `US-ORG-003`: As a User, I want to search organizations by name, so that I can quickly find the organization I need

### 2.4 Intelligence Viewers

#### 2.4.1 Column Intelligence Viewer

Displays semantic analysis for each column:

- **Semantic Type Detection**: Automatically identifies email, phone, address, status fields
- **Business Meaning**: AI-inferred purpose of each field
- **UI Suggestions**: Recommended form controls and layouts
- **Validation Rules**: Detected validation requirements
- **FK Analysis**: Foreign key relationship details

#### 2.4.2 SP Intelligence Viewer

Analyzes stored procedures:

- **Parameter Analysis**: Input/output parameters with types
- **Table Operations**: INSERT, UPDATE, DELETE, SELECT operations
- **Business Logic**: Extracted business rules from SP code
- **Error Codes**: Custom error codes and messages
- **Call Graph**: Which SPs call other SPs

#### 2.4.3 View Intelligence Viewer

Analyzes SQL views:

- **Column Mapping**: View columns to source table columns
- **Join Analysis**: Tables joined in the view
- **Filter Conditions**: WHERE clause analysis
- **Computed Columns**: Calculated/derived columns
- **Dependencies**: Tables and views this view depends on

### 2.5 Compliance Report Generator

Generates comprehensive compliance reports:

```typescript
interface ComplianceReport {
  reportId: string;
  generatedAt: Date;
  schemaName: string;
  
  summary: {
    totalTables: number;
    totalColumns: number;
    phiColumns: number;
    piiColumns: number;
    encryptedColumns: number;
    riskScore: number;       // 0-100
  };
  
  tables: TableCompliance[];
  
  recommendations: {
    priority: 'critical' | 'high' | 'medium' | 'low';
    category: string;
    description: string;
    affectedColumns: string[];
  }[];
  
  frameworks: {
    name: string;           // "HIPAA", "GDPR"
    compliant: boolean;
    coverage: number;       // percentage
    gaps: string[];
  }[];
}
```

### 2.6 API Endpoints

**Base URL:** `/api/intelligence`

| Method | Action | Description |
|--------|--------|-------------|
| POST | `generate-questions` | Generate AI questions for tables |
| POST | `answer-question` | Submit answer to a question |
| POST | `generate-blueprints` | Generate screen blueprints |
| POST | `generate-rules` | Generate business rules |
| POST | `generate-user-stories` | Generate user stories |

**Example Request:**

```typescript
// Generate questions
POST /api/intelligence
{
  "action": "generate-questions",
  "modules": ["Organization", "User", "Patient"]
}

// Generate blueprints
POST /api/intelligence
{
  "action": "generate-blueprints",
  "tables": ["Organization", "User"]
}
```

### 2.7 UI Features

The Intelligence UI provides:

1. **Column Intelligence Tab**
   - Table-by-table column analysis
   - Semantic type indicators
   - FK relationship visualization
   - UI suggestions

2. **Compliance Tab**
   - PII/PHI column summary
   - Risk score display
   - Regulatory framework coverage
   - Export to JSON/Markdown

3. **AI Questions Tab**
   - Question groups by module
   - Progress tracking
   - Priority indicators
   - Option selection interface

4. **Screen Blueprints Tab**
   - Per-table blueprint cards
   - List/Form/Detail screen previews
   - Widget suggestions

5. **Business Rules Tab**
   - Rule list with filtering
   - Priority categorization
   - Approval workflow status

6. **User Stories Tab**
   - Story list with acceptance criteria
   - Story point totals
   - Export to Jira format

7. **SP Intelligence Tab**
   - Stored procedure list
   - Parameter analysis
   - Business logic extraction

8. **View Intelligence Tab**
   - View analysis
   - Dependency tracking
   - Column mapping

---

## 3. MODULE INTEGRATION

### 3.1 Data Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          INTEGRATION ARCHITECTURE                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐                                                        │
│  │  SQL DDL Files  │                                                        │
│  │  CSHTML Views   │                                                        │
│  │  Stored Procs   │                                                        │
│  └────────┬────────┘                                                        │
│           │                                                                 │
│           ▼                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        PARSER LAYER                                  │   │
│  │  SQL Parser │ CSHTML Parser │ SP Parser │ Legacy Analyzer           │   │
│  └────────┬────────────────────────────────────────────────────────────┘   │
│           │                                                                 │
│           ▼                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    INTELLIGENCE BANK                                 │   │
│  │  ┌─────────────────────────────────────────────────────────────┐   │   │
│  │  │              12-Layer Enrichment Pipeline                   │   │   │
│  │  │  Schema → FK → Intel → UI → Validation → Compliance        │   │   │
│  │  │  → Complexity → SOP → CSHTML → SP → Tests → Docs           │   │   │
│  │  └─────────────────────────────────────────────────────────────┘   │   │
│  │                                                                      │   │
│  │  Output: UnifiedFieldRecord (per field)                             │   │
│  └────────┬────────────────────────────────────────────────────────────┘   │
│           │                                                                 │
│           ▼                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    INTELLIGENCE MODULE                               │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐               │   │
│  │  │ Questions│ │Blueprints│ │  Rules   │ │ Stories  │               │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘               │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐                            │   │
│  │  │ Column   │ │   SP     │ │  View    │ │ Compliance│              │   │
│  │  │ Intel    │ │ Intel    │ │ Intel    │ │ Reports   │              │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └───────────┘              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Shared State

Both modules connect to the shared `useSchema` hook:

```typescript
const {
  activeProject,       // Current project
  totalTables,         // Table count
  totalColumns,        // Column count
  parseResult,         // Parsed schema data
  linkedModules,       // Module linking status
  modulesLinked,       // Number of linked modules
  fkResolvedPercent,   // FK resolution progress
  refreshDbStats       // Refresh function
} = useSchema()
```

### 3.3 Database Models Used

**Intelligence Bank:**
- `UnifiedField` - Master field records
- `UnifiedTable` - Aggregated table metrics
- `UnifiedSOPRule` - SOP rule definitions
- `UnifiedConsistencyCheck` - Issue tracking
- `UnifiedEnrichmentSession` - Pipeline execution
- `UnifiedEnrichmentLog` - Audit trail
- `UnifiedFieldSOPCompliance` - SOP compliance per field
- `UnifiedFieldTestCase` - Generated test cases
- `UnifiedFieldDocumentation` - Generated docs

**Intelligence Module:**
- `AIQuestionRecord` - Question tracking
- `QuestionSessionRecord` - Question session state
- `BusinessRuleRecord` - Business rules
- `UserStoryRecord` - User stories

---

## 4. CONNECTION TO CONTRACT VALIDATOR

The existing Intelligence modules provide foundational capabilities that the Contract Validator will leverage:

### 4.1 What Intelligence Bank Provides

| Contract Validator Need | Intelligence Bank Feature |
|------------------------|---------------------------|
| Entity tracking | `EntityRegistry` = `UnifiedField` |
| Field variations | `SchemaLayer.dataType` + naming patterns |
| API contract detection | `SPEvidenceLayer` + `CSHTMLEvidenceLayer` |
| Usage tracking | `EntityUsage` = `UnifiedFieldMeta.enrichedBy` |
| Relationship graph | `FKLayer` + `EntityRelationships` |

### 4.2 Integration Points

```
┌─────────────────────────────────────────────────────────────────┐
│              CONTRACT VALIDATOR INTEGRATION                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  INTELLIGENCE BANK                    CONTRACT VALIDATOR        │
│  ──────────────────                   ──────────────────────   │
│                                                                 │
│  UnifiedField.schema          ─────▶  Field type comparison    │
│  UnifiedField.foreignKey      ─────▶  FK contract validation   │
│  UnifiedField.validation      ─────▶  Client-server alignment  │
│  UnifiedField.cshtmlEvidence  ─────▶  Legacy contract evidence │
│  UnifiedField.spEvidence      ─────▶  SP contract evidence     │
│                                                                 │
│  NEW TABLES FOR CONTRACT VALIDATOR:                            │
│  ─────────────────────────────────────                         │
│  • EntityRelationships (link tracking)                         │
│  • APIContracts (endpoint contracts)                           │
│  • ContractMismatches (issue tracking)                         │
│  • ScanHistory (scan tracking)                                 │
│  • ScanIssues (issue details)                                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 4.3 Recommended Extension Strategy

1. **Reuse Existing Infrastructure**
   - Use Intelligence Bank's enrichment pipeline for initial field analysis
   - Leverage existing SOP engine for consistency checks
   - Build on existing API patterns

2. **Add Contract-Specific Tables**
   - `APIContracts` - Track frontend→API→DB contracts
   - `ContractMismatches` - Store detected issues
   - `ScanHistory` - Track scan sessions

3. **Integrate with Existing Viewers**
   - Add "Contract" tab to ColumnIntelligenceViewer
   - Show contract status in existing dashboards
   - Use existing export mechanisms

---

## 5. SUMMARY COMPARISON

| Aspect | Intelligence Bank | Intelligence Module |
|--------|------------------|---------------------|
| **Primary Focus** | Field data repository | AI generation |
| **Main Output** | Enriched field records | Questions, blueprints, rules, stories |
| **Data Flow** | Bottom-up (parse → enrich) | Top-down (intelligence → artifacts) |
| **User Actions** | Run enrichment, check SOP, fix issues | Generate, review, export |
| **Database Tables** | Unified* models | Question, Rule, Story models |
| **API Endpoint** | `/api/intelligence-bank` | `/api/intelligence` |
| **UI Tab** | `?tab=intelligence-bank` | `?tab=intelligence` |

---

## 6. FILES QUICK REFERENCE

### Intelligence Bank Files
- Main Component: `/src/components/tabs/IntelligenceBankTab.tsx`
- Types: `/src/lib/intelligence-bank/types.ts`
- Pipeline: `/src/lib/intelligence-bank/enrichment-pipeline.ts`
- API: `/src/app/api/intelligence-bank/route.ts`

### Intelligence Module Files
- Main Component: `/src/components/tabs/IntelligenceTab.tsx`
- Service: `/src/lib/intelligence-service.ts`
- Column Intel: `/src/lib/column-intelligence.ts`
- API: `/src/app/api/intelligence/route.ts`

---

*Document created: 2026-03-27*
