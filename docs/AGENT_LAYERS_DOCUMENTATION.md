# AI Enterprise Architect - Agent Layers Documentation

## Table of Contents
1. [Overview](#overview)
2. [Schema Layer (SQLParserAgent)](#1-schema-layer---sqlparseragent)
3. [FK Layer (FKResolverAgent)](#2-fk-layer---fkresolveragent)
4. [Intelligence Layer (ColumnIntelligenceAgent)](#3-intelligence-layer---columnintelligenceagent)
5. [Agent Pipeline Flow](#agent-pipeline-flow)
6. [Data Models & Types](#data-models--types)
7. [API Endpoints](#api-endpoints)

---

## Overview

The AI Enterprise Architect platform implements a multi-layer agent system for parsing and analyzing database schemas. Each layer builds upon the previous, creating a comprehensive intelligence pipeline:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         AGENT PIPELINE FLOW                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   ┌──────────────┐    ┌──────────────┐    ┌───────────────────────┐     │
│   │  LAYER 1     │    │  LAYER 2     │    │  LAYER 3              │     │
│   │  Schema      │───▶│  FK Layer    │───▶│  Intelligence Layer   │     │
│   │              │    │              │    │                       │     │
│   │ SQLParser    │    │ FKResolver   │    │ ColumnIntelAgent      │     │
│   │ Agent        │    │ Agent        │    │                       │     │
│   └──────────────┘    └──────────────┘    └───────────────────────┘     │
│         │                    │                      │                   │
│         ▼                    ▼                      ▼                   │
│   ┌──────────────┐    ┌──────────────┐    ┌───────────────────────┐     │
│   │ Tables       │    │ Missing      │    │ UI Types              │     │
│   │ Columns      │    │ Tables       │    │ Semantic Types        │     │
│   │ Foreign Keys │    │ Resolution   │    │ Validation Rules      │     │
│   │ Procedures   │    │ Queue        │    │ PII/PHI Detection     │     │
│   │ Views        │    │ Build Order  │    │ Display Properties    │     │
│   └──────────────┘    └──────────────┘    └───────────────────────┘     │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 1. Schema Layer - SQLParserAgent

### Overview

**Agent ID**: `sql-parser`  
**Category**: `parsing`  
**Layer**: `schema`  
**Depends On**: None (Entry Point)  
**Produces**: `parsedTables`, `parsedColumns`, `parsedFKs`, `parsedSPs`, `parsedViews`

### Purpose

The SQLParserAgent is the foundation of the pipeline. It parses raw SQL DDL scripts to extract complete database schema information including table definitions, column metadata, foreign key relationships, stored procedures, and views.

### Configuration

```typescript
{
  id: "sql-parser",
  name: "SQL Parser Agent",
  version: "1.0.0",
  category: 'parsing',
  layer: 'schema',
  dependsOn: [],
  produces: [
    "parsedTables",
    "parsedColumns", 
    "parsedFKs",
    "parsedSPs",
    "parsedViews"
  ],
  estimatedDuration: 30,  // seconds
  requiresAI: false
}
```

### Input Schema

```typescript
const SQLParserInputSchema = z.object({
  content: z.string().min(1, "SQL content is required"),
  fileName: z.string().optional(),
  fileType: z.enum(['sql', 'ddl', 'dml']).default('sql'),
  options: z.object({
    extractDefaults: z.boolean().default(true),
    extractComments: z.boolean().default(true),
    inferRelations: z.boolean().default(true)
  }).optional()
})
```

### Output Types

#### ParsedTable
```typescript
interface ParsedTable {
  tableName: string
  schemaName: string           // Default: 'dbo'
  columns: ParsedColumn[]
  primaryKey: string[]
  foreignKeys: ParsedFK[]
  indexes: ParsedIndex[]
  constraints: ParsedConstraint[]
  sourceDDL: string            // Original DDL statement
}
```

#### ParsedColumn
```typescript
interface ParsedColumn {
  columnName: string
  dataType: string             // INT, NVARCHAR, DATETIME, etc.
  maxLength?: number           // For VARCHAR, NVARCHAR
  precision?: number           // For DECIMAL, NUMERIC
  scale?: number               // For DECIMAL, NUMERIC
  isNullable: boolean
  isPrimaryKey: boolean
  isIdentity: boolean          // IDENTITY(1,1)
  defaultValue?: string
  computed?: string            // Computed column expression
  collation?: string
  position: number             // Column order
}
```

#### ParsedFK (Foreign Key)
```typescript
interface ParsedFK {
  constraintName: string
  columnName: string
  referencedTable: string
  referencedSchema: string
  referencedColumn: string
  onDelete?: string            // CASCADE, SET NULL, etc.
  onUpdate?: string
}
```

#### ParsedStoredProcedure
```typescript
interface ParsedStoredProcedure {
  spName: string
  schemaName: string
  parameters: ParsedParameter[]
  returnType?: string
  body: string
  tablesAccessed: string[]
  tablesModified: string[]
  operations: string[]         // SELECT, INSERT, UPDATE, DELETE
}
```

#### ParsedView
```typescript
interface ParsedView {
  viewName: string
  schemaName: string
  columns: string[]
  sourceTables: string[]
  sourceDDL: string
}
```

### Core Functions

#### 1. `extractCreateTables(content: string)`

Extracts all CREATE TABLE statements from SQL content.

**Pattern Recognition**:
```regex
CREATE\s+TABLE\s+(?:\[?(\w+)\]?\.)?\[?(\w+)\]?\s*\(([\s\S]*?)(?:;|(?=CREATE\s+(?:TABLE|PROC|VIEW|FUNCTION))
```

**Features**:
- Schema-aware parsing (`dbo.TableName`, `schema.TableName`)
- Handles bracketed identifiers (`[Table Name]`)
- Supports multi-line column definitions
- Extracts inline and ALTER TABLE foreign keys

#### 2. `parseCreateTable(ddl: string, tableName: string, schema: string)`

Parses individual CREATE TABLE DDL to extract:
- Column definitions with data types
- PRIMARY KEY constraints (inline and table-level)
- FOREIGN KEY constraints
- CHECK constraints
- DEFAULT values
- IDENTITY columns

**Example Input**:
```sql
CREATE TABLE [dbo].[Patient] (
    [Id] UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    [MRN] NVARCHAR(50) NOT NULL,
    [FirstName] NVARCHAR(100) NOT NULL,
    [DateOfBirth] DATE NULL,
    [IsActive] BIT NOT NULL DEFAULT 1,
    [CreatedOn] DATETIME NOT NULL DEFAULT GETDATE(),
    CONSTRAINT FK_Patient_Organization FOREIGN KEY ([OrganizationId]) 
        REFERENCES [dbo].[Organization]([Id])
)
```

**Example Output**:
```json
{
  "tableName": "Patient",
  "schemaName": "dbo",
  "columns": [
    {
      "columnName": "Id",
      "dataType": "UNIQUEIDENTIFIER",
      "isPrimaryKey": true,
      "isNullable": false,
      "defaultValue": "NEWID()"
    },
    {
      "columnName": "MRN",
      "dataType": "NVARCHAR",
      "maxLength": 50,
      "isNullable": false
    }
  ],
  "foreignKeys": [
    {
      "constraintName": "FK_Patient_Organization",
      "columnName": "OrganizationId",
      "referencedTable": "Organization",
      "referencedSchema": "dbo",
      "referencedColumn": "Id"
    }
  ]
}
```

#### 3. `extractCreateProcedures(content: string)`

Extracts all CREATE PROCEDURE statements.

**Pattern Recognition**:
```regex
CREATE\s+(?:OR\s+ALTER\s+)?PROC(?:EDURE)?\s+(?:\[?(\w+)\]?\.)?\[?(\w+)\]?\s*\(([\s\S]*?)\)\s*AS\s*([\s\S]*?)(?=GO|CREATE)
```

**Features**:
- Parameter extraction with types
- OUTPUT parameter detection
- Default value extraction
- Body extraction for analysis

#### 4. `extractCreateViews(content: string)`

Extracts CREATE VIEW statements and source tables.

### SQL Data Type Mapping

| SQL Type | Category | Default Max Length |
|----------|----------|-------------------|
| INT, INTEGER | Integer | 4 bytes |
| BIGINT | Integer | 8 bytes |
| SMALLINT | Integer | 2 bytes |
| TINYINT | Integer | 1 byte |
| BIT | Boolean | 1 byte |
| DECIMAL, NUMERIC | Decimal | Precision-dependent |
| MONEY, SMALLMONEY | Money | 8/4 bytes |
| FLOAT, REAL | Float | 8/4 bytes |
| DATE | Date | 3 bytes |
| DATETIME, DATETIME2 | DateTime | 8 bytes |
| TIME | Time | 5 bytes |
| UNIQUEIDENTIFIER | GUID | 16 bytes |
| VARCHAR, NVARCHAR | String | Specified |
| TEXT, NTEXT | Text | Unlimited |
| XML | XML | Unlimited |
| VARBINARY, IMAGE | Binary | Variable |

### Statistics Output

```typescript
interface SQLParserStatistics {
  tableCount: number
  columnCount: number
  fkCount: number
  spCount: number
  viewCount: number
  parseTime: number      // milliseconds
}
```

---

## 2. FK Layer - FKResolverAgent

### Overview

**Purpose**: Handle missing table detection, dependency analysis, and provide resolution paths  
**Category**: `resolution`  
**Layer**: `fk`  
**Depends On**: `sql-parser`  
**Produces**: `missingTables`, `resolutionQueue`, `buildOrder`

### Resolution Paths

The FK Resolver provides 3 paths to resolve missing tables:

```
┌────────────────────────────────────────────────────────────────────┐
│                    FK RESOLUTION PATHS                             │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  Path 1: Upload SQL                                                │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  User uploads SQL file containing missing table DDL          │  │
│  │  → Parse SQL                                                   │  │
│  │  → Extract table definition                                    │  │
│  │  → Update dependency graph                                     │  │
│  │  → Check for newly unblocked tables                           │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                    │
│  Path 2: Manual Design                                             │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  User defines table structure via UI                          │  │
│  │  → Accept column definitions                                   │  │
│  │  → Create table from design                                    │  │
│  │  → Update resolution status                                    │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                    │
│  Path 3: AI Design                                                 │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  System auto-generates table suggestion                       │  │
│  │  → Infer columns from referencing tables                       │  │
│  │  → Apply standard patterns (audit columns, indexes)           │  │
│  │  → User reviews and accepts/edits                              │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

### Types

#### TableStatus
```typescript
type TableStatus = 
  | 'complete'    // All FKs resolved
  | 'partial'     // Some FKs missing
  | 'missing'     // Table not found
  | 'standalone'  // No FK dependencies
```

#### MissingTableInfo
```typescript
interface MissingTableInfo {
  tableName: string
  status: TableStatus
  referencedBy: Array<{
    tableName: string
    columnName: string
    fkName?: string
  }>
  references: Array<{
    tableName: string
    columnName: string
  }>
  blocksCount: number          // How many tables this blocks
  priority: 'critical' | 'high' | 'medium' | 'low'
  resolutionPath?: ResolutionPath
  resolutionStatus: ResolutionStatus
  suggestedColumns?: ColumnDef[]
  aiSuggestion?: AITableSuggestion
  createdAt: Date
  updatedAt: Date
}
```

#### ResolutionQueue
```typescript
interface ResolutionQueue {
  items: MissingTableInfo[]
  totalMissing: number
  totalResolved: number
  totalBlocked: number
  circularDependencies: CircularDependency[]
  buildOrder: string[]         // Topological sort order
}
```

### Priority Calculation

| Priority | Criteria |
|----------|----------|
| **Critical** | Foundation tables (users, organizations, patients) OR blocks 5+ tables |
| **High** | Blocks 3-4 tables |
| **Medium** | Blocks 2 tables |
| **Low** | Blocks 1 table |

### Core Functions

#### 1. `analyzeTables(tables: TableDef[]): Promise<ResolutionQueue>`

Main analysis function that:
1. Indexes existing tables
2. Builds dependency graph
3. Detects circular dependencies
4. Identifies missing tables
5. Calculates priorities
6. Generates AI suggestions
7. Computes build order

#### 2. `buildDependencyGraph(tables: TableDef[]): Map<string, Set<string>>`

Creates a directed graph of table dependencies:
```
Patient ──────► Organization
   │
   ├──► Country
   │
   └──► Province
```

#### 3. `detectCircularDependencies(graph): CircularDependency[]`

Detects and classifies circular FK relationships:

```typescript
interface CircularDependency {
  tables: string[]
  type: 'direct' | 'chain'
  resolution: 'nullable' | 'deferred'
}
```

**Examples**:
- **Direct**: TableA → TableB → TableA
- **Chain**: TableA → TableB → TableC → TableA

#### 4. `calculateBuildOrder(graph): string[]`

Performs topological sort to determine safe table creation order:
```
Build Order:
1. Country (no dependencies)
2. Province (depends on Country)
3. Organization (depends on Country)
4. Patient (depends on Organization, Country, Province)
```

#### 5. `resolveViaUpload(tableName: string, sqlContent: string): Promise<ResolutionResult>`

Resolves missing table by parsing uploaded SQL DDL.

**Flow**:
1. Parse uploaded SQL
2. Extract table definition
3. Add to tables map
4. Check for newly unblocked tables
5. Return remaining missing tables

#### 6. `resolveViaManual(design: ManualTableDesign): Promise<ResolutionResult>`

Accepts user-defined table design:
```typescript
interface ManualTableDesign {
  tableName: string
  columns: ColumnDef[]
  primaryKeys: string[]
  foreignKeys: ForeignKeyDef[]
}
```

#### 7. `resolveViaAI(tableName: string): Promise<ResolutionResult>`

Auto-generates table structure based on context.

### AI Table Suggestion Generation

The system generates intelligent suggestions for missing tables:

```typescript
interface AITableSuggestion {
  columns: ColumnDef[]
  primaryKeys: string[]
  foreignKeys: ForeignKeyDef[]
  indexes: Array<{
    name: string
    columns: string[]
    isUnique: boolean
  }>
  confidence: number       // 0-100
  reasoning: string
}
```

**Auto-generated Columns**:

| Column | Type | Purpose |
|--------|------|---------|
| Id | UNIQUEIDENTIFIER | Primary key |
| Name | NVARCHAR(200) | Entity name (for non-lookup tables) |
| Code | NVARCHAR(50) | Short code (for lookup tables) |
| IsActive | BIT | Soft delete flag |
| CreatedOn | DATETIME | Audit timestamp |
| CreatedBy | UNIQUEIDENTIFIER | Audit user |
| ModifiedOn | DATETIME | Audit timestamp |
| ModifiedBy | UNIQUEIDENTIFIER | Audit user |

**Auto-generated Indexes**:
- Unique index on Name column

### Ripple Effect Analysis

#### `getUnlockChain(tableName: string): string[][]`

Returns what tables become buildable after creating a missing table:

```
Creating 'Organization' unlocks:
  Level 1: [Patient, User, Department]
  Level 2: [Encounter, Appointment]
  Level 3: [Order, Billing]
```

#### `getDependencyChain(tableName: string): string[][]`

Returns what must be created before a table:
```
Building 'Encounter' requires:
  Level 0: [Patient]
  Level 1: [Organization, Province]
  Level 2: [Country]
```

---

## 3. Intelligence Layer - ColumnIntelligenceAgent

### Overview

**Agent ID**: `column-intelligence`  
**Category**: `intelligence`  
**Layer**: `intelligence`  
**Depends On**: `sql-parser`  
**Produces**: `columnIntelligence`

### Purpose

Analyzes database columns to infer:
- **UI Types**: What input component to use
- **Semantic Types**: What kind of data (email, phone, name, etc.)
- **Validation Rules**: Required, format, length constraints
- **Display Properties**: Labels, placeholders, help text
- **Sensitivity**: PII/PHI detection

### Configuration

```typescript
{
  id: "column-intelligence",
  name: "Column Intelligence Agent",
  version: "1.0.0",
  category: 'intelligence',
  layer: 'intelligence',
  dependsOn: ["sql-parser"],
  produces: ["columnIntelligence"],
  estimatedDuration: 45,  // seconds
  requiresAI: false
}
```

### Output Type

```typescript
interface ColumnIntelligence {
  columnId: string
  columnName: string
  tableName: string
  
  // UI Intelligence
  uiType: UIType
  uiComponent: string          // React component name
  inputType: string           // HTML input type
  
  // Semantic Intelligence
  semanticType: SemanticType
  semanticCategory: string
  piiFlag: boolean            // Personally Identifiable Information
  phiFlag: boolean            // Protected Health Information
  
  // Validation
  validationRules: ValidationRule[]
  
  // Display
  displayName: string         // Human-readable label
  displayFormat: string       // Date/number format
  placeholder: string
  helpText: string
  
  // Confidence
  confidence: number          // 0.0 - 1.0
  reasoning: string[]         // Why this inference was made
}
```

### UI Types Supported

```typescript
type UIType = 
  | 'text_input'       // Standard text field
  | 'text_area'        // Multi-line text
  | 'number_input'     // Numeric input
  | 'dropdown'         // Select dropdown
  | 'checkbox'         // Boolean checkbox
  | 'radio'            // Radio button group
  | 'date_picker'      // Date picker
  | 'datetime_picker'  // Date and time picker
  | 'time_picker'      // Time picker
  | 'file_upload'      // File upload
  | 'color_picker'     // Color picker
  | 'slider'           // Range slider
  | 'toggle'           // Toggle switch
  | 'auto_complete'    // Autocomplete input
  | 'rich_text'        // Rich text editor
  | 'password'         // Password field
  | 'email'            // Email input
  | 'phone'            // Phone input
  | 'url'              // URL input
  | 'hidden'           // Hidden field
```

### Semantic Types Supported

```typescript
type SemanticType = 
  | 'id'           // Identifier
  | 'name'         // Person/entity name
  | 'email'        // Email address
  | 'phone'        // Phone number
  | 'address'      // Physical address
  | 'date'         // Date
  | 'datetime'     // Date and time
  | 'time'         // Time
  | 'money'        // Currency amount
  | 'percentage'   // Percentage
  | 'quantity'     // Numeric quantity
  | 'description'  // Long text
  | 'status'       // Status code
  | 'code'         // Reference code
  | 'flag'         // Boolean flag
  | 'image'        // Image URL/path
  | 'file'         // File reference
  | 'url'          // URL
  | 'password'     // Password
  | 'age'          // Age
  | 'weight'       // Weight
  | 'height'       // Height
  | 'coordinates'  // Geographic coordinates
  | 'json'         // JSON data
  | 'unknown'      // Cannot determine
```

### Pattern Recognition (16 Categories)

#### Name Patterns
```typescript
{
  patterns: [
    /^(first|last|middle|full|user|customer|patient|client|contact|employee|doctor|nurse)_?name$/i,
    /^name$/i
  ],
  uiType: 'text_input',
  semanticType: 'name',
  validation: { maxLength: 100 }
}
```

**Matches**: `FirstName`, `LastName`, `FullName`, `UserName`, `PatientName`

#### Email Patterns
```typescript
{
  patterns: [/email/i, /e_mail/i, /^e$|^mail$/i],
  uiType: 'email',
  semanticType: 'email',
  validation: { pattern: '^[^@]+@[^@]+\\.[^@]+$' }
}
```

**Matches**: `Email`, `EmailAddress`, `EmailAddress1`

#### Phone Patterns
```typescript
{
  patterns: [/phone/i, /telephone/i, /mobile/i, /cell/i, /fax/i, /^tel$/i],
  uiType: 'phone',
  semanticType: 'phone',
  validation: { pattern: '^[+]?[\\d\\s-()]+$' }
}
```

**Matches**: `Phone`, `Mobile`, `CellNo`, `TelephoneNumber`, `FaxNumber`

#### Address Patterns
```typescript
{
  patterns: [/address/i, /street/i, /city/i, /state/i, /country/i, /zip/i, /postal/i],
  uiType: 'text_input',
  semanticType: 'address',
  validation: { maxLength: 255 }
}
```

**Matches**: `Address`, `StreetAddress`, `City`, `State`, `Country`, `ZipCode`

#### Date Patterns
```typescript
{
  patterns: [
    /date$/i, /_date$/i, /^date_/i, 
    /birthday/i, /dob/i, 
    /created|updated|deleted/i
  ],
  uiType: 'date_picker',
  semanticType: 'date',
  validation: {}
}
```

**Matches**: `BirthDate`, `DateOfBirth`, `CreatedDate`, `LastUpdated`

#### Money Patterns
```typescript
{
  patterns: [
    /amount/i, /price/i, /cost/i, /fee/i, /salary/i,
    /total/i, /subtotal/i, /tax/i, /discount/i,
    /payment/i, /balance/i, /^money$/i
  ],
  uiType: 'number_input',
  semanticType: 'money',
  validation: { min: 0 }
}
```

**Matches**: `Amount`, `TotalPrice`, `Salary`, `PaymentAmount`

#### Percentage Patterns
```typescript
{
  patterns: [/percent/i, /rate/i, /^pct$/i, /_pct$/i],
  uiType: 'slider',
  semanticType: 'percentage',
  validation: { min: 0, max: 100 }
}
```

**Matches**: `TaxPercent`, `DiscountRate`, `InterestPct`

#### Quantity Patterns
```typescript
{
  patterns: [/qty$/i, /quantity/i, /count$/i, /total_/i, /number_of/i],
  uiType: 'number_input',
  semanticType: 'quantity',
  validation: { min: 0 }
}
```

**Matches**: `Quantity`, `ItemCount`, `TotalQty`, `NumberOfItems`

#### Description Patterns
```typescript
{
  patterns: [
    /description/i, /desc$/i, /notes$/i, /comment/i,
    /remark/i, /detail/i, /message/i, /content/i
  ],
  uiType: 'text_area',
  semanticType: 'description',
  validation: { maxLength: 2000 }
}
```

**Matches**: `Description`, `Notes`, `Comments`, `Message`

#### Status Patterns
```typescript
{
  patterns: [/status$/i, /state$/i, /type$/i, /category$/i, /type_id$/i, /status_id$/i],
  uiType: 'dropdown',
  semanticType: 'status',
  validation: {}
}
```

**Matches**: `Status`, `OrderStatus`, `PatientType`, `Category`

#### Code Patterns
```typescript
{
  patterns: [
    /code$/i, /^code$/i, /_code$/i, /number$/i,
    /_no$/i, /_num$/i, /account/i, /reference$/i
  ],
  uiType: 'text_input',
  semanticType: 'code',
  validation: {}
}
```

**Matches**: `MRN`, `PatientCode`, `AccountNumber`, `ReferenceNo`

#### Flag Patterns
```typescript
{
  patterns: [
    /^is_/i, /^has_/i, /^can_/i, /^should_/i,
    /^active$/i, /^enabled$/i, /^deleted$/i, /^visible$/i,
    /_flag$/i
  ],
  uiType: 'checkbox',
  semanticType: 'flag',
  validation: {}
}
```

**Matches**: `IsActive`, `HasInsurance`, `CanEdit`, `IsDeleted`

#### Image Patterns
```typescript
{
  patterns: [/image/i, /photo/i, /picture/i, /avatar/i, /logo/i, /thumbnail/i, /icon/i],
  uiType: 'file_upload',
  semanticType: 'image',
  validation: { accept: 'image/*' }
}
```

**Matches**: `ProfileImage`, `Photo`, `Logo`, `AvatarUrl`

#### File Patterns
```typescript
{
  patterns: [/file/i, /document/i, /attachment/i, /upload/i],
  uiType: 'file_upload',
  semanticType: 'file',
  validation: {}
}
```

**Matches**: `Attachment`, `DocumentFile`, `UploadPath`

#### URL Patterns
```typescript
{
  patterns: [/url$/i, /website$/i, /link$/i, /domain$/i],
  uiType: 'url',
  semanticType: 'url',
  validation: { pattern: '^https?://' }
}
```

**Matches**: `WebsiteUrl`, `ProfileLink`, `Domain`

#### Password Patterns
```typescript
{
  patterns: [/password/i, /pwd$/i, /secret$/i, /token$/i],
  uiType: 'password',
  semanticType: 'password',
  validation: { minLength: 8 }
}
```

**Matches**: `Password`, `ConfirmPwd`, `ApiSecret`, `ResetToken`

### PII Detection Patterns

The agent detects **Personally Identifiable Information** columns:

```typescript
private readonly piiPatterns = [
  /ssn/i,                    // Social Security Number
  /social.?security/i,
  /tax.?id/i,                // Tax ID
  /national.?id/i,           // National ID
  /passport/i,               // Passport number
  /license/i,                // Driver's license
  /credit.?card/i,           // Credit card
  /card.?number/i,
  /bank.?account/i,          // Bank account
  /account.?number/i,
  /medical.?record/i,        // Medical record
  /mrn/i,                    // Medical Record Number
  /patient.?id/i,
  /ip.?address/i,            // IP address
  /mac.?address/i            // MAC address
]
```

### PHI Detection Patterns

The agent detects **Protected Health Information** columns:

```typescript
private readonly phiPatterns = [
  /diagnosis/i,              // Medical diagnosis
  /icd.?code/i,              // ICD codes
  /procedure.?code/i,        // Procedure codes
  /cpt/i,                    // CPT codes
  /lab.?result/i,            // Lab results
  /test.?result/i,
  /vital/i,                  // Vital signs
  /blood/i,                  // Blood type/pressure
  /medication/i,             // Medications
  /prescription/i,
  /drug/i,
  /treatment/i,              // Treatment info
  /condition/i,              // Medical conditions
  /allergy/i,                // Allergies
  /symptom/i,                // Symptoms
  /health/i,                 // Health info
  /hipaa/i,                  // HIPAA-related
  /phi/i                     // PHI flag
]
```

### Validation Rule Generation

```typescript
interface ValidationRule {
  type: 'required' | 'minLength' | 'maxLength' | 'min' | 'max' | 'pattern' | 'email' | 'url' | 'custom'
  value?: any
  message: string
}
```

**Auto-generated Rules**:

| Condition | Rule Type | Generated |
|-----------|-----------|-----------|
| NOT NULL column | `required` | ✅ |
| Max length defined | `maxLength` | ✅ |
| Email semantic type | `email` | ✅ |
| URL semantic type | `url` | ✅ |
| Money semantic type | `min: 0` | ✅ |
| Percentage type | `min: 0, max: 100` | ✅ |
| Password type | `minLength: 8` | ✅ |

### UI Component Mapping

| UI Type | React Component | HTML Type |
|---------|-----------------|-----------|
| text_input | `Input` | `text` |
| text_area | `Textarea` | `textarea` |
| number_input | `Input[type=number]` | `number` |
| dropdown | `Select` | `select` |
| checkbox | `Checkbox` | `checkbox` |
| date_picker | `DatePicker` | `date` |
| datetime_picker | `DateTimePicker` | `datetime-local` |
| email | `Input[type=email]` | `email` |
| phone | `Input[type=tel]` | `tel` |
| password | `Input[type=password]` | `password` |
| url | `Input[type=url]` | `url` |

### Data Type to UI Type Inference

| SQL Data Type | UI Type |
|---------------|---------|
| BIT, BOOLEAN | `checkbox` |
| INT, BIGINT, SMALLINT, TINYINT | `number_input` or `dropdown` (if FK) |
| DECIMAL, NUMERIC, MONEY | `number_input` |
| FLOAT, REAL | `number_input` |
| DATE | `date_picker` |
| DATETIME, DATETIME2 | `datetime_picker` |
| TIME | `time_picker` |
| TEXT, NTEXT, XML | `text_area` |
| VARCHAR > 200 | `text_area` |
| VARCHAR <= 200 | `text_input` |
| UNIQUEIDENTIFIER | `hidden` |
| JSON | `text_area` |
| VARBINARY, IMAGE | `file_upload` |

---

## Agent Pipeline Flow

### Complete Pipeline Execution

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         COMPLETE PIPELINE FLOW                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  INPUT: Raw SQL DDL Script                                                   │
│  ─────────────────────────                                                   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐     │
│  │ LAYER 1: Schema Layer (SQLParserAgent)                              │     │
│  │                                                                      │     │
│  │ Input:  SQL content string                                          │     │
│  │ Output: Tables, Columns, FKs, Procedures, Views                    │     │
│  │                                                                      │     │
│  │ ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐     │     │
│  │ │ CREATE TABLE     │ │ CREATE PROC      │ │ CREATE VIEW      │     │     │
│  │ │ Parsing          │ │ Parsing          │ │ Parsing          │     │     │
│  │ │                  │ │                  │ │                  │     │     │
│  │ │ • Table names    │ │ • SP names       │ │ • View names     │     │     │
│  │ │ • Columns        │ │ • Parameters     │ │ • Source tables  │     │     │
│  │ │ • Data types     │ │ • Body           │ │ • Columns        │     │     │
│  │ │ • Constraints    │ │ • Tables accessed│ │                  │     │     │
│  │ │ • Foreign keys   │ │ • Operations     │ │                  │     │     │
│  │ └──────────────────┘ └──────────────────┘ └──────────────────┘     │     │
│  └─────────────────────────────────────────────────────────────────────┘     │
│                         │                                                    │
│                         ▼                                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐     │
│  │ LAYER 2: FK Layer (FKResolverAgent)                                 │     │
│  │                                                                      │     │
│  │ Input:  Parsed tables with foreign keys                             │     │
│  │ Output: Missing tables, Resolution queue, Build order               │     │
│  │                                                                      │     │
│  │ ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐     │     │
│  │ │ Dependency       │ │ Missing Table    │ │ Build Order      │     │     │
│  │ │ Graph            │ │ Detection        │ │ Calculation      │     │     │
│  │ │                  │ │                  │ │                  │     │     │
│  │ │ • Build graph    │ │ • Find missing   │ │ • Topological    │     │     │
│  │ │ • Detect cycles  │ │   referenced     │ │   sort           │     │     │
│  │ │ • Calculate deps │ │   tables         │ │ • Safe order     │     │     │
│  │ └──────────────────┘ └──────────────────┘ └──────────────────┘     │     │
│  │                                                                      │     │
│  │ Resolution Paths:                                                    │     │
│  │ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐                  │     │
│  │ │ Upload SQL   │ │ Manual Design│ │ AI Design    │                  │     │
│  │ └──────────────┘ └──────────────┘ └──────────────┘                  │     │
│  └─────────────────────────────────────────────────────────────────────┘     │
│                         │                                                    │
│                         ▼                                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐     │
│  │ LAYER 3: Intelligence Layer (ColumnIntelligenceAgent)               │     │
│  │                                                                      │     │
│  │ Input:  Parsed columns from Schema Layer                            │     │
│  │ Output: UI types, Semantic types, Validation rules                  │     │
│  │                                                                      │     │
│  │ ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐     │     │
│  │ │ Pattern          │ │ PII/PHI          │ │ Validation       │     │     │
│  │ │ Matching         │ │ Detection        │ │ Generation       │     │     │
│  │ │                  │ │                  │ │                  │     │     │
│  │ │ • 16 categories  │ │ • PII patterns   │ │ • Required       │     │     │
│  │ │ • Name patterns  │ │ • PHI patterns   │ │ • Max length     │     │     │
│  │ │ • Email patterns │ │ • Sensitivity    │ │ • Format         │     │     │
│  │ │ • Phone patterns │ │   flags          │ │ • Range          │     │     │
│  │ └──────────────────┘ └──────────────────┘ └──────────────────┘     │     │
│  └─────────────────────────────────────────────────────────────────────┘     │
│                                                                              │
│  OUTPUT: Complete Intelligence                                               │
│  ─────────────────────────                                                   │
│  • Tables with complete metadata                                             │
│  • Columns with UI/semantic types                                            │
│  • FK resolution plan                                                        │
│  • Validation rules                                                          │
│  • PII/PHI classification                                                    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Data Models & Types

### Complete Type Hierarchy

```typescript
// ============================================
// SCHEMA LAYER TYPES
// ============================================

interface ParsedTable {
  tableName: string
  schemaName: string
  columns: ParsedColumn[]
  primaryKey: string[]
  foreignKeys: ParsedFK[]
  indexes: ParsedIndex[]
  constraints: ParsedConstraint[]
  sourceDDL: string
}

interface ParsedColumn {
  columnName: string
  dataType: string
  maxLength?: number
  precision?: number
  scale?: number
  isNullable: boolean
  isPrimaryKey: boolean
  isIdentity: boolean
  defaultValue?: string
  computed?: string
  collation?: string
  position: number
}

interface ParsedFK {
  constraintName: string
  columnName: string
  referencedTable: string
  referencedSchema: string
  referencedColumn: string
  onDelete?: string
  onUpdate?: string
}

// ============================================
// FK LAYER TYPES
// ============================================

type TableStatus = 'complete' | 'partial' | 'missing' | 'standalone'
type ResolutionPath = 'upload_sql' | 'manual_design' | 'ai_design'
type ResolutionStatus = 'pending' | 'in_progress' | 'resolved' | 'failed'

interface MissingTableInfo {
  tableName: string
  status: TableStatus
  referencedBy: Array<{
    tableName: string
    columnName: string
    fkName?: string
  }>
  blocksCount: number
  priority: 'critical' | 'high' | 'medium' | 'low'
  resolutionPath?: ResolutionPath
  resolutionStatus: ResolutionStatus
  suggestedColumns?: ColumnDef[]
  aiSuggestion?: AITableSuggestion
}

interface ResolutionQueue {
  items: MissingTableInfo[]
  totalMissing: number
  totalResolved: number
  totalBlocked: number
  circularDependencies: CircularDependency[]
  buildOrder: string[]
}

// ============================================
// INTELLIGENCE LAYER TYPES
// ============================================

type UIType = 
  | 'text_input' | 'text_area' | 'number_input' 
  | 'dropdown' | 'checkbox' | 'radio' 
  | 'date_picker' | 'datetime_picker' | 'time_picker'
  | 'file_upload' | 'color_picker' | 'slider' 
  | 'toggle' | 'auto_complete' | 'rich_text'
  | 'password' | 'email' | 'phone' | 'url' | 'hidden'

type SemanticType = 
  | 'id' | 'name' | 'email' | 'phone' | 'address'
  | 'date' | 'datetime' | 'time' | 'money' | 'percentage'
  | 'quantity' | 'description' | 'status' | 'code' | 'flag'
  | 'image' | 'file' | 'url' | 'password' | 'age'
  | 'weight' | 'height' | 'coordinates' | 'json' | 'unknown'

interface ColumnIntelligence {
  columnId: string
  columnName: string
  tableName: string
  uiType: UIType
  uiComponent: string
  inputType: string
  semanticType: SemanticType
  semanticCategory: string
  piiFlag: boolean
  phiFlag: boolean
  validationRules: ValidationRule[]
  displayName: string
  displayFormat: string
  placeholder: string
  helpText: string
  confidence: number
  reasoning: string[]
}

interface ValidationRule {
  type: 'required' | 'minLength' | 'maxLength' | 'min' | 'max' | 'pattern' | 'email' | 'url' | 'custom'
  value?: any
  message: string
}
```

---

## API Endpoints

### Parser Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/parsers` | POST | Parse SQL/CSHTML files |
| `/api/parsers?action=parse-all` | POST | Parse multiple files |
| `/api/parsers?action=reparse-project` | POST | Reparse project files |
| `/api/parsers?projectId=...` | GET | Get parsing status |

### FK Resolution Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/fk-resolution` | GET | Get resolution queue |
| `/api/fk-resolution` | POST | Resolve missing table |

### Intelligence Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/intelligence` | POST | Generate column intelligence |
| `/api/intelligence-bank` | GET | Get intelligence data |

---

## Quick Reference

### Agent Execution Order

```
1. SQLParserAgent     → Parse SQL, extract tables/columns/FKs
2. FKResolverAgent    → Analyze dependencies, find missing tables
3. ColumnIntelAgent   → Infer UI types, semantic types, validation
```

### Output Artifacts

| Artifact | Layer | Consumer |
|----------|-------|----------|
| `parsedTables` | Schema | FK Resolver, UI |
| `parsedColumns` | Schema | Column Intelligence |
| `parsedFKs` | Schema | FK Resolver |
| `missingTables` | FK | Resolution UI |
| `buildOrder` | FK | Migration generator |
| `columnIntelligence` | Intelligence | Form generator |

---

*Document Version: 1.0*  
*Generated: Current Session*  
*Platform: AI Enterprise Architect*
