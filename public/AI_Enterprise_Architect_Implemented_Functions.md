# AI Enterprise Architect - Currently Implemented Functions

## Document Overview

This document provides a comprehensive overview of all implemented functions, modules, and capabilities in the AI Enterprise Architect platform. The system is built on **Next.js 16**, **React 19**, **Prisma 6.11**, and **SQLite**.

---

## 1. Core Technology Stack

### 1.1 Frontend Stack
| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 16 | Full-stack framework |
| React | 19 | UI library |
| TypeScript | Latest | Type safety |
| Tailwind CSS | 4 | Styling framework |
| shadcn/ui | Latest | UI component library |

### 1.2 Backend Stack
| Technology | Version | Purpose |
|------------|---------|---------|
| Prisma | 6.11 | ORM |
| SQLite | Default | Database |
| NextAuth.js | Latest | Authentication |
| Zod | Latest | Schema validation |

### 1.3 AI Integration
| Capability | SDK | Usage |
|------------|-----|-------|
| Chat Completions | z-ai-web-dev-sdk | AI conversations |
| Image Generation | z-ai-web-dev-sdk | AI image creation |
| Web Search | z-ai-web-dev-sdk | Real-time data |
| Vector Embeddings | Custom | Knowledge graph |

---

## 2. Database Models (Prisma Schema)

### 2.1 User Management Models

#### User
```prisma
model User {
  id              String   @id @default(cuid())
  email           String   @unique
  name            String?
  passwordHash    String?
  firstName       String?
  lastName        String?
  displayName     String?
  avatar          String?
  timezone        String   @default("UTC")
  locale          String   @default("en")
  isActive        Boolean  @default(true)
  emailVerified   Boolean  @default(false)
  preferences     String   @default("{}")
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

### 2.2 Agent System Models

#### AgentDefinition
```prisma
model AgentDefinition {
  id              String   @id @default(cuid())
  agentId         String   @unique
  name            String
  layer           String   // schema, intelligence, module, requirements, generation
  description     String
  version         String   @default("1.0.0")
  tags            String   // JSON array
  dependencies    String   @default("[]")
  requiresAI      Boolean  @default(false)
  estimatedDuration Int    @default(60)
  enabled         Boolean  @default(true)
}
```

#### PipelineExecution
```prisma
model PipelineExecution {
  id              String   @id @default(cuid())
  executionId     String   @unique
  pipelineId      String
  pipelineName    String
  status          String   // idle, initializing, running, paused, completed, failed
  startTime       DateTime @default(now())
  endTime         DateTime?
  duration        Int?
  totalAgents     Int      @default(0)
  completedAgents Int      @default(0)
  failedAgents    Int      @default(0)
  outputFiles     String   @default("[]")
  errors          String   @default("[]")
}
```

#### AgentExecution
```prisma
model AgentExecution {
  id              String   @id @default(cuid())
  executionId     String
  agentId         String
  agentName       String
  status          String   // idle, running, completed, failed, skipped
  startTime       DateTime @default(now())
  endTime         DateTime?
  duration        Int?
  output          String?
  error           String?
  itemsProcessed  Int      @default(0)
  retryCount      Int      @default(0)
}
```

### 2.3 Schema Toolkit Models

#### ToolkitProject
```prisma
model ToolkitProject {
  id              String   @id @default(cuid())
  name            String
  description     String?
  softwareType    String   @default("Custom") // HIS, ERP, CRM, E-Commerce, LMS
  rawSql          String
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  tables          ToolkitTable[]
  procedures      ToolkitProcedure[]
}
```

#### ToolkitTable
```prisma
model ToolkitTable {
  id              String   @id @default(cuid())
  projectId       String
  tableName       String
  schemaName      String   @default("dbo")
  columns         String   // JSON columns definition
  foreignKeys     String   @default("[]")
  indexes         String   @default("[]")
  constraints     String   @default("[]")
  sourceDDL       String?
  status          String   @default("standalone") // complete, partial, missing, standalone
}
```

### 2.4 Multi-Tenant Architecture Models

#### Company
```prisma
model Company {
  id                  String    @id @default(cuid())
  name                String
  slug                String    @unique
  subscriptionTier    String    @default("free")
  subscriptionStatus  String    @default("trialing")
  stripeCustomerId    String?
  isActive            Boolean   @default(true)
  settings            String    @default("{}")
  limits              String    @default("{}")
  usage               String    @default("{}")
}
```

#### Workspace
```prisma
model Workspace {
  id              String    @id @default(cuid())
  companyId       String
  name            String
  slug            String
  description     String?
  isActive        Boolean   @default(true)
}
```

### 2.5 SP Intelligence Models

#### StoredProcedureCache
```prisma
model StoredProcedureCache {
  id                    String   @id @default(cuid())
  projectId             String
  procedureName         String
  schemaName            String   @default("dbo")
  actionType            String   @default("unknown")
  moduleName            String?
  moduleConfidence      Int      @default(0)
  tablesReferenced      String   @default("[]")
  implicitJoins         String   @default("[]")
  discoveredTables      String   @default("[]")
  businessRules         String   @default("[]")
  complexity            Int      @default(0)
  riskLevel             String   @default("low")
  suggestedEndpoint     String?
}
```

#### CSHTMLAnalysisCache
```prisma
model CSHTMLAnalysisCache {
  id                String   @id @default(cuid())
  projectId         String
  viewName          String
  viewType          String   @default("unknown")
  modelName         String?
  linkedTable       String?
  fields            String   @default("[]")
  listConfig        String   @default("{}")
  sections          String   @default("[]")
  permissions       String   @default("[]")
  reactBlueprint    String   @default("{}")
}
```

---

## 3. SQL Parser Implementation

### 3.1 Core Parser (`/src/lib/sql-parser.ts`)

#### Main Function: `parseSqlServer(sql: string): ParseResult`

**Purpose**: Parse SQL Server DDL scripts to extract complete database schema information.

**Input Parameters**:
- `sql: string` - Raw SQL DDL script content

**Output Structure**:
```typescript
interface ParseResult {
  tables: TableDef[];
  storedProcedures: StoredProcedureDef[];
  insertStatements: InsertStatementDef[];
  seedDataSummaries: SeedDataSummary[];
  errors: string[];
  warnings: string[];
  stats: ParseStats;
}
```

**Key Features Implemented**:

1. **CREATE TABLE Parsing**
   - Extracts table names with schema support
   - Parses column definitions with data types
   - Handles PRIMARY KEY constraints
   - Extracts FOREIGN KEY relationships
   - Identifies IDENTITY columns
   - Parses DEFAULT values
   - Handles CHECK constraints

2. **ALTER TABLE FK Parsing**
   - Extracts foreign keys added via ALTER TABLE statements
   - Parses constraint names and references
   - Handles multi-part table names

3. **CREATE INDEX Parsing**
   - Extracts clustered/non-clustered indexes
   - Identifies unique constraints
   - Parses index columns

4. **CREATE PROCEDURE Parsing**
   - Extracts procedure names and schemas
   - Parses parameter definitions
   - Extracts procedure body
   - Identifies SQL operations (SELECT, INSERT, UPDATE, DELETE)
   - Calculates complexity scores

5. **INSERT Statement Parsing (Seed Data)**
   - Extracts INSERT statements
   - Tracks IDENTITY_INSERT state
   - Groups inserts by table
   - Detects lookup tables

**Example Usage**:
```typescript
const result = parseSqlServer(sqlContent);
console.log(`Parsed ${result.stats.totalTables} tables`);
console.log(`Found ${result.stats.totalForeignKeys} foreign keys`);
console.log(`Extracted ${result.stats.totalStoredProcedures} procedures`);
```

### 3.2 FK Dependency Analysis

#### Function: `analyzeFKDependencies(tables: TableDef[])`

**Purpose**: Analyze foreign key dependencies and generate resolution order.

**Output Structure**:
```typescript
interface FKDependencyAnalysis {
  missingTables: string[];
  dependencyGraph: Map<string, string[]>;
  resolutionOrder: string[];
}
```

**Features**:
- Builds dependency graph from FK relationships
- Detects missing referenced tables
- Topological sort for migration order
- Identifies circular dependencies

---

## 4. Stored Procedure Intelligence Engine

### 4.1 SP Parser Engine (`/src/lib/sp-parser.ts`)

#### Class: `SPParserEngine`

**Purpose**: Advanced analysis of stored procedures for behavior extraction.

**Constructor**:
```typescript
constructor(tables: TableDef[] = [], modules: Record<string, string[]> = {})
```

#### Main Method: `analyzeProcedure(sp: StoredProcedureDef): SPIntelligenceResult`

**Output Structure**:
```typescript
interface SPIntelligenceResult {
  procedureName: string;
  schemaName: string;
  
  // Classification
  actionType: SPActionType;
  moduleIdentification: SPModuleIdentification;
  
  // Dependencies
  tablesReferenced: TableDependency[];
  implicitJoins: SPJoinRelationship[];
  discoveredTables: DiscoveredTable[];
  
  // Business Logic
  businessRules: BusinessFilterRule[];
  writeOperations: SQLOperation[];
  readOperations: SQLOperation[];
  
  // API Schema
  apiInputSchema: APIInputSchema;
  
  // Analysis
  complexity: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  suggestedEndpoint: string;
}
```

#### SP Action Type Classification

**Supported Patterns (21 types)**:
```typescript
type SPActionType =
  | 'dropdown'      // SP_DDL_*
  | 'read'          // SP_Get*
  | 'create'        // SP_Add*, SP_Create*, SP_Insert*
  | 'update'        // SP_Update*, SP_Edit*
  | 'delete'        // SP_Delete*, SP_Remove*
  | 'search'        // SP_Search*, SP_Find*
  | 'report'        // SP_Report*, SP_Rpt*
  | 'validate'      // SP_Validate*, SP_Check*
  | 'process'       // SP_Process*
  | 'import'        // SP_Import*
  | 'export'        // SP_Export*
  | 'calculate'     // SP_Calculate*, SP_Compute*
  | 'workflow'      // SP_Workflow*
  | 'unknown';
```

#### Module Keyword Detection

**Supported Modules (16 modules)**:
```typescript
const MODULE_KEYWORDS = {
  'Patient': ['patient', 'mrn', 'demographic', 'registration'],
  'Appointment': ['appointment', 'schedule', 'booking', 'slot'],
  'Billing': ['billing', 'invoice', 'payment', 'charge', 'receipt'],
  'Pharmacy': ['pharmacy', 'medication', 'drug', 'prescription', 'dispense'],
  'Laboratory': ['lab', 'test', 'specimen', 'result', 'sample'],
  'Radiology': ['radiology', 'imaging', 'xray', 'ct', 'mri', 'ultrasound'],
  'Nursing': ['nursing', 'care', 'vital', 'nursing_note'],
  'OperatingRoom': ['surgery', 'operation', 'or_', 'theatre', 'procedure'],
  'Emergency': ['emergency', 'er_', 'trauma', 'urgent'],
  'Inventory': ['inventory', 'stock', 'item', 'supply', 'reorder'],
  'HR': ['employee', 'staff', 'payroll', 'attendance', 'leave'],
  'Finance': ['finance', 'account', 'journal', 'ledger', 'budget'],
  'Insurance': ['insurance', 'claim', 'coverage', 'policy'],
  'Reports': ['report', 'rpt', 'dashboard', 'statistics'],
  'Admin': ['user', 'role', 'permission', 'config', 'setting'],
  'ADT': ['admission', 'discharge', 'transfer', 'bed', 'adt'],
};
```

#### Table Dependency Extraction

**Methods Implemented**:

1. **`extractTableDependencies(body: string): TableDependency[]`**
   - Extracts tables from SELECT statements
   - Parses JOIN clauses (INNER, LEFT, RIGHT, FULL, CROSS)
   - Identifies INSERT target tables
   - Detects UPDATE and DELETE operations
   - Maps column access per table

2. **`extractJoinRelationships(body: string): SPJoinRelationship[]`**
   - Discovers implicit FK relationships from JOINs
   - Extracts join columns
   - Calculates confidence scores

3. **`extractBusinessRules(body: string): BusinessFilterRule[]`**
   - Parses WHERE clause conditions
   - Identifies parameterized filters
   - Maps business logic patterns

### 4.2 Enhanced SP Parser (`/src/lib/sp-parser-enhanced.ts`)

#### Class: `EnhancedSPParser`

**Purpose**: Comprehensive stored procedure parsing with full parameter extraction.

**Key Features**:

1. **Parameter Extraction**
```typescript
interface SPParameter {
  name: string;
  type: string;
  maxLength?: number;
  precision?: number;
  scale?: number;
  isOutput: boolean;
  isReadOnly: boolean;
  isNullable: boolean;
  defaultValue?: string;
  description?: string;
}
```

2. **Table Access Analysis**
```typescript
interface TableAccess {
  tableName: string;
  schema?: string;
  alias?: string;
  operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'MERGE' | 'TRUNCATE';
  columns?: string[];
  joinType?: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL' | 'CROSS';
  joinCondition?: string;
}
```

3. **SP Intelligence Metrics**
```typescript
interface SPIntelligence {
  purpose: 'dropdown' | 'crud' | 'report' | 'workflow' | 'batch' | 'utility' | 'api' | 'trigger';
  returnType: 'table' | 'scalar' | 'none' | 'multiple';
  estimatedRuntime: 'fast' | 'medium' | 'slow' | 'unknown';
  complexity: number;
  riskLevel: 'low' | 'medium' | 'high';
  containsDynamicSQL: boolean;
  usesTransactions: boolean;
  usesCursors: boolean;
  hasErrorHandling: boolean;
  hasLogging: boolean;
}
```

---

## 5. Column Intelligence Engine

### 5.1 Core Implementation (`/src/lib/column-intelligence.ts`)

#### Class: `ColumnIntelligenceEngine`

**Purpose**: Infer UI types, semantic types, validation rules, and display properties from column metadata.

**Constructor**:
```typescript
constructor(config: Partial<ColumnIntelligenceConfig> = {})
```

**Configuration Options**:
```typescript
interface ColumnIntelligenceConfig {
  strictMode: boolean;
  inferRelations: boolean;
  detectPII: boolean;
  detectPHI: boolean;
  suggestIndexes: boolean;
}
```

#### Main Method: `analyzeColumn(column: ColumnDef, tableName: string): ColumnIntelligenceResult`

**Output Structure**:
```typescript
interface ColumnIntelligence {
  columnName: string;
  tableName: string;
  inferredUIType: UIComponentType;
  inferredSemanticType: SemanticType;
  sensitivityLevel: SensitivityLevel;
  validationRules: ValidationRule[];
  confidence: number; // 0-100
  suggestions: string[];
  isSearchable: boolean;
  isFilterable: boolean;
  displayInList: boolean;
  placeholder?: string;
  label?: string;
  icon?: string;
}
```

### 5.2 Pattern Recognition (60+ Patterns)

#### Identity Patterns
| Pattern | Semantic Type | UI Type | Sensitivity |
|---------|--------------|---------|-------------|
| `id`, `pk`, `_id` | id | hidden | internal |
| `*_id`, `*Id`, `*ID` | foreign_key | dropdown | internal |

#### Contact Patterns
| Pattern | Semantic Type | UI Type | Sensitivity |
|---------|--------------|---------|-------------|
| `email`, `email_address` | email | email_input | pii |
| `phone`, `mobile`, `tel` | phone | phone_input | pii |

#### Name Patterns
| Pattern | Semantic Type | UI Type | Sensitivity |
|---------|--------------|---------|-------------|
| `first_name`, `fname` | name | text_input | pii |
| `last_name`, `lname` | name | text_input | pii |
| `full_name`, `name` | name | text_input | pii |

#### Financial Patterns
| Pattern | Semantic Type | UI Type | Sensitivity |
|---------|--------------|---------|-------------|
| `amount`, `price`, `cost` | amount | currency_input | confidential |
| `salary`, `wage` | salary | currency_input | confidential |
| `percentage`, `rate`, `_pct` | percentage | percentage_input | internal |

#### Date/Time Patterns
| Pattern | Semantic Type | UI Type | Sensitivity |
|---------|--------------|---------|-------------|
| `date_of_birth`, `dob` | date | date_picker | pii |
| `*_date`, `date_*` | date | date_picker | internal |
| `datetime`, `timestamp` | datetime | datetime_picker | internal |

#### Boolean Patterns
| Pattern | Semantic Type | UI Type | Sensitivity |
|---------|--------------|---------|-------------|
| `is_*`, `has_*` | boolean_flag | toggle | internal |
| `can_*`, `allow_*` | boolean_flag | toggle | internal |

#### Medical/Clinical Patterns
| Pattern | Semantic Type | UI Type | Sensitivity |
|---------|--------------|---------|-------------|
| `mrn`, `medical_record` | medical_record_number | text_input | phi |
| `diagnosis`, `icd_code` | diagnosis | dropdown | phi |
| `prescription`, `medication` | treatment | dropdown | phi |
| `allergy`, `allergic` | diagnosis | textarea | phi |

### 5.3 Validation Rule Generation

**Automatically Generated Rules**:
1. **Required Validation**: For non-nullable, non-PK columns
2. **Email Validation**: Pattern `^[^@]+@[^@]+\\.[^@]+$`
3. **Phone Validation**: Pattern `^[+]?[\\d\\s-()]+$`
4. **URL Validation**: Pattern `^https?://`
5. **Max Length**: From column maxLength property
6. **National ID**: Pattern `^[0-9]{5}-[0-9]{7}-[0-9]$`

### 5.4 Index Suggestions

**Auto-suggested Indexes**:
1. FK columns: Standard index for join performance
2. Code/MRN/Email fields: Unique constraint
3. Status/Type columns: Standard index for WHERE clauses

---

## 6. CSHTML Parser Implementation

### 6.1 Core Parser (`/src/lib/cshtml-parser.ts`)

#### Class: `CSHTMLParser`

**Purpose**: Convert ASP.NET Razor views to React blueprints.

**Constructor**:
```typescript
constructor(content: string, fileName?: string)
```

#### Main Method: `parse(): ParsedCSHTMLView`

**Output Structure**:
```typescript
interface ParsedCSHTMLView {
  viewName: string;
  viewType: ViewType;
  model?: CSHTMLModel;
  title?: string;
  layout?: string;
  fields: ParsedFormField[];
  list?: ParsedListView;
  sections: ViewSection[];
  scripts: string[];
  styles: string[];
  permissions: PermissionRequirement[];
  rawContent: string;
  
  // Enhanced extraction
  jsValidations?: JavaScriptValidation[];
  cascadingDropdowns?: CascadingDropdown[];
  ajaxEndpoints?: AjaxEndpoint[];
  formInfo?: FormInfo;
  
  // Advanced Intelligence
  schemaIntelligence?: SchemaIntelligence;
  securityAnalysis?: SecurityAnalysis;
  rbacPermissions?: RBACPermissions;
  gapAnalysis?: GapAnalysisResult;
  lookupTables?: LookupTable[];
  errorCodes?: ErrorCodeMapping[];
  componentMap?: ComponentMapping[];
}
```

### 6.2 View Type Detection

**Supported View Types**:
```typescript
type ViewType = 'form' | 'list' | 'details' | 'dashboard' | 'mixed' | 'unknown';
```

**Detection Logic**:
- `form`: Contains `<form>` or `Html.BeginForm`
- `list`: Contains `<table>` with `@foreach`
- `details`: Contains `<dl class="dl-horizontal">` or DisplayFor
- `dashboard`: Contains 'chart', 'dashboard', 'statistics' keywords
- `mixed`: Combination of form and list

### 6.3 Form Field Parsing

**Supported Input Patterns (13 patterns)**:

1. `<input asp-for="Field" />`
2. `<input name="field" />`
3. `<textarea asp-for="Field">`
4. `<select asp-for="Field">`
5. `@Html.EditorFor(m => m.Field)`
6. `@Html.TextBoxFor(m => m.Field)`
7. `@Html.DropDownListFor(m => m.Field, ...)`
8. `@Html.DropDownList("FieldName", ...)`
9. `@Html.CheckBoxFor(m => m.Field)`
10. `@Html.PasswordFor(m => m.Field)`
11. `<input type="file" name="field">`
12. `<textarea name="field">`
13. `<select name="field">`

**Field Intelligence Extraction**:
```typescript
interface ParsedFormField {
  name: string;
  label: string;
  inputType: ReactInputType;
  aspFor: string;
  isRequired: boolean;
  isReadOnly: boolean;
  placeholder?: string;
  defaultValue?: string;
  cssClass?: string;
  layout: FieldLayout;
  validation: FieldValidation[];
  permission?: PermissionRequirement;
  dropdownSource?: string;
  colSpan: number;
}
```

### 6.4 React Input Type Mapping

**Supported Types**:
```typescript
type ReactInputType =
  | 'text_input'
  | 'email_input'
  | 'password_input'
  | 'number_input'
  | 'currency_input'
  | 'date_picker'
  | 'time_picker'
  | 'datetime_picker'
  | 'textarea'
  | 'checkbox'
  | 'toggle'
  | 'dropdown'
  | 'multi_select'
  | 'file_upload'
  | 'hidden'
  | 'radio_group';
```

### 6.5 Schema Intelligence Extraction

**Output Structure**:
```typescript
interface SchemaIntelligence {
  primaryTable: InferredTable;
  nestedTables: InferredTable[];
  relationships: TableRelationship[];
  indexes: InferredIndex[];
  confidence: number;
}
```

**Inference Methods**:
1. Model directive parsing (`@model`)
2. Controller name extraction
3. Table/ListView pattern analysis
4. DisplayFor/EditorFor field mapping

### 6.6 Security Analysis

**Security Features Detected**:
```typescript
interface SecurityAnalysis {
  risks: SecurityRisk[];
  piiFields: PIIField[];
  hasCSRFProtection: boolean;
  hasPasswordFields: boolean;
  hasFileUpload: boolean;
  httpsRequired: boolean;
  xssRisks: string[];
}
```

**PII Types Detected**:
- email
- phone
- ssn
- credit_card
- dob
- address
- name
- other

### 6.7 RBAC Permission Extraction

**Permission Detection**:
```typescript
interface RBACPermissions {
  permissions: RBACPermission[];
  canAdd: boolean;
  canView: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  missingPermissions: string[];
}
```

**Detection Patterns**:
- `User.IsInRole("RoleName")`
- `asp-authorize` attributes
- Action link visibility conditions

---

## 7. Agent System Implementation

### 7.1 Agent Interface (`/src/agents/core/agent-interface.ts`)

#### Base Interface: `IAgent`

```typescript
interface IAgent {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly description: string;
  readonly category: AgentCategory;
  readonly layer: AgentLayer;
  
  readonly dependsOn: string[];
  readonly produces: string[];
  
  readonly inputSchema?: z.ZodSchema;
  readonly outputSchema?: z.ZodSchema;
  readonly estimatedDuration: number;
  readonly requiresAI: boolean;
  readonly retryable: boolean;
  readonly maxRetries: number;
  
  canRun(context: AgentContext): Promise<boolean>;
  execute(context: AgentContext): Promise<AgentResult>;
  
  // Lifecycle hooks
  initialize?(): Promise<void>;
  cleanup?(): Promise<void>;
  onBeforeExecute?(context: AgentContext): Promise<void>;
  onAfterExecute?(context: AgentContext, result: AgentResult): Promise<void>;
  onError?(context: AgentContext, error: Error): Promise<void>;
}
```

#### Agent Categories
```typescript
type AgentCategory = 
  | 'parsing'
  | 'intelligence'
  | 'resolution'
  | 'matching'
  | 'generation'
  | 'validation'
  | 'orchestration';
```

#### Agent Layers
```typescript
type AgentLayer =
  | 'schema'
  | 'intelligence'
  | 'module'
  | 'requirements'
  | 'generation'
  | 'migration'
  | 'management';
```

### 7.2 Base Agent Class

#### Class: `BaseAgent`

**Key Methods**:
- `createSuccessResult()`: Create successful execution result
- `createErrorResult()`: Create failed execution result
- `validateInput()`: Validate against Zod schema
- `validateOutput()`: Validate output schema
- `getSharedState()`: Access shared pipeline state
- `setSharedState()`: Update shared state

### 7.3 SQL Parser Agent (`/src/agents/parsing/SQLParserAgent.ts`)

#### Agent ID: `sql-parser`

**Configuration**:
```typescript
{
  id: "sql-parser",
  name: "SQL Parser Agent",
  version: "1.0.0",
  category: 'parsing',
  layer: 'schema',
  dependsOn: [],
  produces: ["parsedTables", "parsedColumns", "parsedFKs", "parsedSPs", "parsedViews"],
  estimatedDuration: 30,
  requiresAI: false
}
```

**Input Schema**:
```typescript
z.object({
  content: z.string().min(1),
  fileName: z.string().optional(),
  fileType: z.enum(['sql', 'ddl', 'dml']).default('sql'),
  options: z.object({
    extractDefaults: z.boolean().default(true),
    extractComments: z.boolean().default(true),
    inferRelations: z.boolean().default(true)
  }).optional()
})
```

**Output Types**:
- `ParsedTable[]`
- `ParsedStoredProcedure[]`
- `ParsedView[]`
- `Parse statistics`

### 7.4 Column Intelligence Agent (`/src/agents/intelligence/ColumnIntelligenceAgent.ts`)

#### Agent ID: `column-intelligence`

**Configuration**:
```typescript
{
  id: "column-intelligence",
  name: "Column Intelligence Agent",
  version: "1.0.0",
  category: 'intelligence',
  layer: 'intelligence',
  dependsOn: ["sql-parser"],
  produces: ["columnIntelligence"],
  estimatedDuration: 45,
  requiresAI: false
}
```

**Pattern Definitions** (16 patterns):
- name, email, phone, address
- date, money, percentage, quantity
- description, status, code, flag
- image, file, url, password, age

**PII Detection Patterns**:
- SSN, Tax ID, National ID
- Passport, License, Credit Card
- Bank Account, Medical Record
- IP Address, MAC Address

**PHI Detection Patterns**:
- Diagnosis, ICD Code, CPT
- Lab Result, Vital, Blood
- Medication, Prescription, Drug
- Condition, Allergy, Symptom

### 7.5 Agent Orchestrator (`/src/agents/core/orchestrator.ts`)

#### Class: `AgentOrchestrator`

**Purpose**: Manage multi-agent pipeline execution with dependency resolution.

**Key Methods**:

1. **`registerAgent(agent: IAgent): void`**
   - Register a new agent with the orchestrator

2. **`run(config: OrchestratorConfig): Promise<OrchestratorResult>`**
   - Execute the complete agent pipeline

3. **`cancel(): Promise<void>`**
   - Cancel the current pipeline run

**Execution Modes**:
- Sequential: Agents run one after another
- Parallel: Independent agents run concurrently

**Configuration**:
```typescript
interface OrchestratorConfig {
  projectId: string;
  companyId?: string;
  userId?: string;
  input: Record<string, any>;
  agents: IAgent[];
  parallel?: boolean;
  stopOnError?: boolean;
  maxConcurrency?: number;
  timeout?: number;
  onProgress?: (agentId: string, progress: number, message: string) => void;
  onAgentComplete?: (agentId: string, result: AgentResult) => void;
  onAgentError?: (agentId: string, error: Error) => void;
}
```

**Dependency Resolution**:
- Topological sort for execution order
- Circular dependency detection
- Missing dependency warnings

---

## 8. FK Resolution System

### 8.1 FK Resolver (`/src/lib/fk-resolver.ts`)

#### Class: `FKResolver`

**Purpose**: Handle missing table detection and resolution with 3 resolution paths.

#### Main Method: `analyzeTables(tables: TableDef[]): Promise<ResolutionQueue>`

**Resolution Queue Structure**:
```typescript
interface ResolutionQueue {
  items: MissingTableInfo[];
  totalMissing: number;
  totalResolved: number;
  totalBlocked: number;
  circularDependencies: CircularDependency[];
  buildOrder: string[];
}
```

#### Missing Table Info
```typescript
interface MissingTableInfo {
  tableName: string;
  status: TableStatus;
  referencedBy: Array<{
    tableName: string;
    columnName: string;
    fkName?: string;
  }>;
  references: Array<{
    tableName: string;
    columnName: string;
  }>;
  blocksCount: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
  resolutionPath?: ResolutionPath;
  resolutionStatus: ResolutionStatus;
  suggestedColumns?: ColumnDef[];
  aiSuggestion?: AITableSuggestion;
}
```

### 8.2 Resolution Paths

#### Path 1: Upload SQL
```typescript
async resolveViaUpload(tableName: string, sqlContent: string): Promise<ResolutionResult>
```
- Parse uploaded SQL
- Extract table definition
- Update dependency graph
- Check for newly unblocked tables

#### Path 2: Manual Design
```typescript
async resolveViaManual(design: ManualTableDesign): Promise<ResolutionResult>
```
- Accept user-defined columns
- Create table from design
- Update resolution status

#### Path 3: AI Design
```typescript
async resolveViaAI(tableName: string): Promise<ResolutionResult>
```
- Generate table suggestion from context
- Infer columns from referencing tables
- Apply standard patterns (audit columns, indexes)

### 8.3 Priority Calculation

**Priority Levels**:
| Priority | Criteria |
|----------|----------|
| Critical | Foundation tables (users, organizations, patients) OR blocks 5+ tables |
| High | Blocks 3-4 tables |
| Medium | Blocks 2 tables |
| Low | Blocks 1 table |

### 8.4 AI Table Suggestion

**Auto-generated Columns**:
1. Primary Key (`Id` - UNIQUEIDENTIFIER)
2. Name column (for entity tables)
3. Code column (for lookup tables)
4. Required FK reference columns
5. Audit columns (IsActive, CreatedOn, CreatedBy, ModifiedOn, ModifiedBy)

**Auto-generated Indexes**:
- Unique index on Name column

---

## 9. API Routes Implementation

### 9.1 Core API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/parsers` | POST | Parse SQL/CSHTML files |
| `/api/schema` | POST | Upload and parse schema |
| `/api/intelligence` | POST | Generate intelligence |
| `/api/fk-resolution` | POST | Resolve FK dependencies |
| `/api/generators` | POST | Generate code artifacts |
| `/api/agents` | POST | Execute agent pipeline |
| `/api/ai-engine` | POST | AI question engine |
| `/api/export` | POST | Export generated content |

### 9.2 Authentication Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/auth/[...nextauth]` | ALL | NextAuth.js handler |
| `/api/auth/register` | POST | User registration |

### 9.3 Multi-Tenant Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/multi-tenant` | GET/POST | Tenant management |
| `/api/multi-db` | POST | Multi-database operations |

### 9.4 Monitoring & Health

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/health` | GET | System health check |
| `/api/monitoring` | GET | Performance metrics |
| `/api/notifications` | GET/POST | Notification service |

---

## 10. UI Components

### 10.1 Core Components (shadcn/ui)

Located in `/src/components/ui/`:

- `button.tsx` - Button component
- `input.tsx` - Input component
- `textarea.tsx` - Textarea component
- `select.tsx` - Select/Dropdown component
- `checkbox.tsx` - Checkbox component
- `dialog.tsx` - Modal dialog
- `table.tsx` - Data table
- `tabs.tsx` - Tab navigation
- `card.tsx` - Card container
- `form.tsx` - Form components
- `toast.tsx` - Toast notifications
- `progress.tsx` - Progress bar
- `badge.tsx` - Badge/Tag component
- `tooltip.tsx` - Tooltip component

### 10.2 Feature Components

Located in `/src/components/`:

| Component | Purpose |
|-----------|---------|
| `WorkspacePanel.tsx` | Main workspace container |
| `AgentMonitorDashboard.tsx` | Agent execution monitoring |
| `ColumnIntelligenceViewer.tsx` | Display column intelligence |
| `SPIntelligenceViewer.tsx` | Display SP intelligence |
| `ViewIntelligenceViewer.tsx` | Display view analysis |
| `ConflictResolutionCenter.tsx` | FK conflict resolution UI |
| `VerificationCenter.tsx` | Schema verification |
| `GenerationStudio.tsx` | Code generation interface |
| `KnowledgeGraphViewer.tsx` | Knowledge graph visualization |
| `PermissionMatrix.tsx` | Permission management |

### 10.3 Tab Components

Located in `/src/components/tabs/`:

| Tab | Purpose |
|-----|---------|
| `DashboardTab.tsx` | Main dashboard |
| `UploadTab.tsx` | File upload interface |
| `UniversalUploadTab.tsx` | Multi-format upload |
| `IntelligenceTab.tsx` | Intelligence display |
| `ModulesTab.tsx` | Module management |
| `FKResolutionTab.tsx` | FK resolution UI |
| `PipelineTab.tsx` | Pipeline execution |
| `SettingsTab.tsx` | Application settings |
| `LegacyMigrationTab.tsx` | CSHTML migration |
| `MultiTenantTab.tsx` | Tenant management |

---

## 11. Generated Outputs

### 11.1 Prisma Schema Generation

**Method**: `generatePrismaSchema(tables: TableDef[], options: GeneratorOptions)`

**Output**: Prisma schema file with:
- Model definitions
- Field types and constraints
- Relations (FK mappings)
- Indexes
- Audit fields

### 11.2 UAT Test Case Generation

**Structure**:
```typescript
interface UATTestCase {
  id: string;
  module: string;
  testCase: string;
  description: string;
  preconditions: string;
  steps: string[];
  expectedResult: string;
  priority: 'High' | 'Medium' | 'Low';
  status: 'Not Started' | 'In Progress' | 'Passed' | 'Failed' | 'Blocked';
}
```

### 11.3 User Story Generation

**Structure**:
```typescript
interface UserStory {
  id: string;
  title: string;
  role: string;
  feature: string;
  benefit: string;
  acceptanceCriteria: string[];
  priority: 'must_have' | 'should_have' | 'could_have' | 'wont_have';
  storyPoints: number;
  tables: string[];
  moduleId?: string;
}
```

### 11.4 Screen Blueprint Generation

**Structure**:
```typescript
interface ScreenBlueprint {
  screenType: 'list' | 'form' | 'detail' | 'dashboard';
  tableName: string;
  title: string;
  fields: ScreenField[];
  actions: ScreenAction[];
  sections?: ScreenSection[];
  filters?: ScreenFilter[];
  layout?: 'single_column' | 'two_column' | 'tabs';
}
```

### 11.5 API Endpoint Specification

**Structure**:
```typescript
interface APIEndpointSpec {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  summary: string;
  tableName: string;
  operation: 'list' | 'get' | 'create' | 'update' | 'delete' | 'custom';
  parameters?: APIParameter[];
  requestBody?: APIRequestBody;
  responses?: APIResponse[];
  authentication?: boolean;
  permissions?: string[];
}
```

---

## 12. Supporting Libraries

### 12.1 Utilities

| File | Purpose |
|------|---------|
| `/src/lib/utils.ts` | General utilities |
| `/src/lib/db.ts` | Prisma client |
| `/src/lib/auth.ts` | Authentication helpers |
| `/src/lib/sanitizer.ts` | Input sanitization |
| `/src/lib/rate-limiter.ts` | Rate limiting |
| `/src/lib/audit-logger.ts` | Audit logging |

### 12.2 Intelligence Libraries

| File | Purpose |
|------|---------|
| `/src/lib/confidence-engine.ts` | Confidence calculation |
| `/src/lib/dependency-intelligence.ts` | Dependency analysis |
| `/src/lib/business-rule-engine.ts` | Rule extraction |
| `/src/lib/pii-phi-detector.ts` | PII/PHI detection |

### 12.3 Generation Libraries

| File | Purpose |
|------|---------|
| `/src/lib/prisma-generator.ts` | Prisma schema generation |
| `/src/lib/erd-generator.ts` | ERD diagram generation |
| `/src/lib/doc-generator.ts` | Documentation generation |
| `/src/lib/uat-generator.ts` | UAT test generation |
| `/src/lib/user-story-generator.ts` | User story generation |
| `/src/lib/screen-blueprint-generator.ts` | Screen blueprints |

### 12.4 WebSocket Support

| File | Purpose |
|------|---------|
| `/src/lib/websocket/websocket-server.ts` | WebSocket server |
| `/src/lib/websocket/progress-broadcaster.ts` | Progress updates |
| `/src/lib/websocket/use-websocket.ts` | React hook |

---

## 13. Test Coverage

### 13.1 Test Files

| File | Purpose |
|------|---------|
| `/src/lib/sql-parser.test.ts` | SQL parser tests |
| `/src/lib/column-intelligence.test.ts` | Column intelligence tests |
| `/src/lib/file-validator.test.ts` | File validation tests |
| `/src/lib/secrets.test.ts` | Secrets management tests |

### 13.2 Test Setup

Located in `/src/tests/setup.ts`

---

## 14. File Statistics

### Codebase Overview

| Category | Count |
|----------|-------|
| TypeScript Files | ~95 |
| TSX Components | ~75 |
| Prisma Models | 40+ |
| API Routes | 20+ |
| Agent Classes | 4+ |
| Parser Classes | 5+ |
| UI Components | 40+ |

### Key Implementation Sizes

| File | Lines | Purpose |
|------|-------|---------|
| `sql-parser.ts` | ~700 | SQL DDL parsing |
| `cshtml-parser.ts` | ~1400 | CSHTML to React |
| `sp-parser.ts` | ~860 | SP intelligence |
| `sp-parser-enhanced.ts` | ~890 | Enhanced SP parsing |
| `column-intelligence.ts` | ~1060 | Column analysis |
| `fk-resolver.ts` | ~860 | FK resolution |
| `schema.prisma` | ~1200 | Database models |

---

## 15. Known Limitations

### Current Constraints

1. **Database Support**
   - Primary: SQLite (current)
   - SQL Server SP execution requires `mssql` package directly

2. **File Upload Limits**
   - Large SQL files may require chunked processing
   - Memory constraints for very large schemas

3. **AI Integration**
   - Requires z-ai-web-dev-sdk for AI features
   - Image generation, chat, web search need SDK

4. **Browser-based DLL Analysis**
   - Limited decompilation capabilities
   - Requires server-side processing for full analysis

---

## 16. Future Planned Features

### In Development

1. **CSHTML↔SP Correlation Engine**
   - 9-step correlation algorithm
   - Frontend-to-backend mapping

2. **API Route Generation**
   - Next.js API route templates
   - Zod validation schemas
   - Prisma raw query execution

3. **DLL Intelligence**
   - C# decompilation analysis
   - Controller action extraction
   - Model property mapping

4. **Migration Validation Framework**
   - Data integrity checks
   - Rollback procedures
   - Performance benchmarking

---

*Document Version: 1.0*
*Last Updated: Current Session*
*Platform: AI Enterprise Architect*
