# AI Enterprise Architect - End-to-End Application Generation Roadmap

## Executive Summary

**Goal**: Generate working Next.js/React applications from CSHTML + SQL + Manual Table definitions

**Target Architecture**:
- Frontend: Next.js 15 + React 19 + Tailwind CSS + shadcn/ui
- Database: Prisma ORM + SQLite (Phase 1) → MySQL/PostgreSQL (Phase 2+)
- Validation: Zod schemas
- Forms: React Hook Form

**Current State**:
- ✅ SQL Parser (800+ lines) - Works
- ✅ CSHTML Parser (700+ lines) - Works
- ✅ Column Intelligence (600+ lines) - Works (~60% accuracy)
- ✅ FK Resolver (500+ lines) - Works
- ✅ PII/PHI Detector - Works
- ✅ Module Matcher - Works
- ❌ Code Generation - **NOT IMPLEMENTED**
- ❌ Quality Gate - **NOT IMPLEMENTED**
- ❌ Unified Intelligence Bank - **NOT IMPLEMENTED**

---

## PHASE 1: UNIFIED INTELLIGENCE BANK (Week 1-2)

### Goal
Create a single source of truth that all modules read from and write to.

### 1.1 Create UnifiedField Prisma Model

**File**: `/prisma/schema.prisma`

```prisma
model UnifiedField {
  id                    String   @id @default(cuid())
  projectId             String
  tableName             String
  fieldName             String
  qualifiedName         String   // "Organization.CountryId"
  displayOrder          Int      @default(0)
  
  // === SOURCE: SQL PARSER ===
  schemaDataType        String?  // VARCHAR, INT, BIT, DATETIME
  schemaBaseType        String?  // string, number, boolean, Date
  schemaMaxLength       Int?
  schemaPrecision       Int?
  schemaScale           Int?
  schemaIsNullable      Boolean  @default(true)
  schemaIsPrimaryKey    Boolean  @default(false)
  schemaIsIdentity      Boolean  @default(false)
  schemaIsComputed      Boolean  @default(false)
  schemaDefaultValue    String?
  schemaCheckConstraint String?
  schemaSource          String   @default("sql")
  schemaConfidence      Float    @default(0.0)
  
  // === SOURCE: COLUMN INTELLIGENCE ===
  intelSemanticType     String?  // name, email, phone, address, money, date, etc.
  intelSemanticCategory String?  // identity, contact, location, financial, clinical
  intelBusinessMeaning  String?  // Human-readable description
  intelDataPattern      String?  // Detected pattern
  intelSuggestedLabel   String?  // "Organization Name"
  intelSuggestedPlaceholder String?
  intelSuggestedHelpText String?
  intelIsSystemField    Boolean  @default(false)
  intelIsAuditField     Boolean  @default(false)
  intelConfidence       Float    @default(0.0)
  
  // === SOURCE: CSHTML PARSER ===
  cshtmlInputType       String?  // text, select, checkbox, radio, file, textarea
  cshtmlValidationRules String   @default("[]")  // JSON array of rules
  cshtmlIsRequired      Boolean  @default(false)
  cshtmlIsReadonly      Boolean  @default(false)
  cshtmlMaxLength       Int?
  cshtmlMinLength       Int?
  cshtmlPattern         String?  // Regex pattern
  cshtmlErrorMessage    String?
  cshtmlDropdownTable   String?  // For dropdowns: referenced table
  cshtmlDropdownColumn  String?  // For dropdowns: display column
  cshtmlCascadeParent   String?  // Parent field for cascade
  cshtmlCascadeChild    String?  // Child field for cascade
  cshtmlPermission      String?  // CanView, CanEdit, CanAdd
  cshtmlConfidence      Float    @default(0.0)
  
  // === SOURCE: FK RESOLVER ===
  fkIsForeignKey        Boolean  @default(false)
  fkReferencedTable     String?
  fkReferencedColumn    String?
  fkTableExists         Boolean  @default(false)
  fkResolutionStatus    String   @default("not_fk")  // resolved, missing_table, missing_column
  fkCascadeChain        String   @default("[]")  // JSON array
  fkConfidence          Float    @default(0.0)
  
  // === SOURCE: COMPLIANCE ===
  compIsPII             Boolean  @default(false)
  compIsPHI             Boolean  @default(false)
  compIsFinancial       Boolean  @default(false)
  compSensitivityLevel  String   @default("public")  // public, internal, confidential, restricted
  compRequiresEncryption Boolean @default(false)
  compRequiresMasking   Boolean  @default(false)
  compMaskingPattern    String?
  compConfidence        Float    @default(0.0)
  
  // === SOURCE: BUSINESS RULES ===
  businessRules         String   @default("[]")  // JSON array of extracted rules
  validationRules       String   @default("[]")  // JSON array of validations
  
  // === GENERATED OUTPUTS ===
  generatedType         String?  // TypeScript type
  generatedZodSchema    String?  // Zod validation schema
  generatedUIComponent  String?  // React component type
  generatedDefaultValue String?  // Default value for forms
  
  // === QUALITY TRACKING ===
  enrichmentProgress    Float    @default(0.0)  // 0-100%
  overallConfidence     Float    @default(0.0)
  needsReview           Boolean  @default(false)
  reviewReason          String?
  consistencyStatus     String   @default("not_checked")  // valid, warning, error
  
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
  
  @@unique([projectId, tableName, fieldName])
  @@index([projectId])
  @@index([tableName])
  @@index([fkIsForeignKey])
  @@index([compIsPII])
  @@index([needsReview])
}

model UnifiedTable {
  id                    String   @id @default(cuid())
  projectId             String
  tableName             String
  moduleAssignment      String?  // HIS module
  moduleConfidence      Float    @default(0.0)
  
  // Table-level intelligence
  tableType             String?  // master, transaction, lookup, audit, config
  primaryTablePurpose   String?  // What this table stores
  estimatedRecordCount  Int?
  
  // FK summary
  fkCount               Int      @default(0)
  fkResolvedCount       Int      @default(0)
  fkMissingCount        Int      @default(0)
  
  // Compliance summary
  piiFieldCount         Int      @default(0)
  phiFieldCount         Int      @default(0)
  
  // Generation status
  generationStatus      String   @default("pending")  // pending, in_progress, completed, error
  generatedAt           DateTime?
  
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
  
  @@unique([projectId, tableName])
}

model GenerationArtifact {
  id                    String   @id @default(cuid())
  projectId             String
  tableName             String
  artifactType          String   // prisma_model, typescript_type, zod_schema, api_route, react_component, react_form
  artifactPath          String   // File path in generated project
  artifactContent       String   // Generated code
  artifactLanguage      String   // typescript, prisma, json
  generatedAt           DateTime @default(now())
  generationVersion     Int      @default(1)
  isLatest              Boolean  @default(true)
  
  @@index([projectId])
  @@index([tableName])
  @@index([artifactType])
}
```

### 1.2 Create Intelligence Bank Service

**File**: `/src/lib/intelligence-bank/unified-bank.ts`

```typescript
// IMPLEMENTATION TASKS:
// 1. createField() - Create new UnifiedField record
// 2. updateField() - Update specific columns
// 3. getField() - Get single field by table+name
// 4. getTableFields() - Get all fields for a table
// 5. getProjectFields() - Get all fields for a project
// 6. enrichFromSQL() - Write SQL parser output to UnifiedField
// 7. enrichFromCSHTML() - Write CSHTML parser output to UnifiedField
// 8. enrichFromIntelligence() - Write column intelligence to UnifiedField
// 9. enrichFromFKResolver() - Write FK data to UnifiedField
// 10. enrichFromCompliance() - Write PII/PHI data to UnifiedField
// 11. calculateEnrichmentProgress() - Calculate % complete
// 12. calculateOverallConfidence() - Aggregate confidence scores
// 13. getFieldsNeedingReview() - Get low-confidence fields
// 14. exportForGeneration() - Get all data needed for code gen
```

### 1.3 Wrap Existing Parsers

**File**: `/src/lib/intelligence-bank/parser-wrappers.ts`

```typescript
// TASK: Create wrapper functions that:
// 1. Call existing SQL parser
// 2. Transform output to UnifiedField format
// 3. Write to database

export async function parseSQLAndStore(projectId: string, sqlContent: string) {
  // 1. Call sql-parser.ts
  const parsed = parseSQL(sqlContent);
  
  // 2. For each table/column, create/update UnifiedField
  for (const table of parsed.tables) {
    for (const column of table.columns) {
      await prisma.unifiedField.upsert({
        where: { projectId_tableName_fieldName: { projectId, tableName: table.name, fieldName: column.name } },
        create: { /* SQL parser data */ },
        update: { /* SQL parser data */ }
      });
    }
  }
  
  // 3. Update enrichment progress
  await calculateEnrichmentProgress(projectId);
}
```

### Deliverables Phase 1:
- [ ] UnifiedField Prisma model created
- [ ] UnifiedTable Prisma model created
- [ ] GenerationArtifact Prisma model created
- [ ] Intelligence bank service implemented
- [ ] SQL parser wrapper created
- [ ] CSHTML parser wrapper created
- [ ] Column intelligence wrapper created
- [ ] FK resolver wrapper created
- [ ] PII/PHI detector wrapper created
- [ ] API endpoint: `POST /api/intelligence-bank/enrich`

---

## PHASE 2: CODE GENERATION ENGINE (Week 3-4)

### Goal
Generate actual code artifacts from unified intelligence.

### 2.1 Prisma Schema Generator

**File**: `/src/lib/generators/prisma-generator.ts`

```typescript
interface PrismaGeneratorConfig {
  projectId: string;
  outputDir: string;
  database: 'sqlite' | 'mysql' | 'postgresql';
}

export async function generatePrismaSchema(config: PrismaGeneratorConfig): Promise<string> {
  // 1. Get all tables for project
  const tables = await prisma.unifiedTable.findMany({ where: { projectId: config.projectId } });
  
  // 2. For each table, get all fields
  // 3. Generate Prisma model with:
  //    - Model name (PascalCase)
  //    - Fields with Prisma types
  //    - Primary key (@@id)
  //    - Foreign keys (@relation)
  //    - Indexes
  //    - Audit fields (createdAt, updatedAt)
  
  // 4. Handle FK relationships:
  //    - If fkTableExists = true, generate relation
  //    - If fkTableExists = false, add comment warning
  
  // 5. Generate in topological order (respect FK dependencies)
  
  // 6. Output:
  return `
// This file is auto-generated by AI Enterprise Architect
// Do not edit manually - changes will be overwritten

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "${config.database}"
  url      = env("DATABASE_URL")
}

model Organization {
  id                  Int      @id @default(autoincrement())
  code                String   @unique
  name                String
  organizationTypeId  Int
  email               String?
  telNo               String?
  // ... more fields
  
  organizationType    OrganizationType @relation(fields: [organizationTypeId], references: [id])
  
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
  
  @@index([organizationTypeId])
}
`;
}
```

**SQL Type to Prisma Type Mapping**:
```typescript
const SQL_TO_PRISMA_TYPE: Record<string, string> = {
  'INT': 'Int',
  'BIGINT': 'BigInt',
  'SMALLINT': 'Int',
  'TINYINT': 'Int',
  'BIT': 'Boolean',
  'DECIMAL': 'Decimal',
  'NUMERIC': 'Decimal',
  'FLOAT': 'Float',
  'REAL': 'Float',
  'MONEY': 'Decimal',
  'VARCHAR': 'String',
  'NVARCHAR': 'String',
  'CHAR': 'String',
  'NCHAR': 'String',
  'TEXT': 'String',
  'NTEXT': 'String',
  'DATETIME': 'DateTime',
  'DATE': 'DateTime',
  'TIME': 'String',
  'UNIQUEIDENTIFIER': 'String',
  'XML': 'String',
  'IMAGE': 'Bytes',
  'VARBINARY': 'Bytes',
};
```

### 2.2 TypeScript Type Generator

**File**: `/src/lib/generators/typescript-generator.ts`

```typescript
export async function generateTypeScriptTypes(projectId: string): Promise<string> {
  // Generate:
  // 1. Entity interfaces (Organization, Patient, etc.)
  // 2. CreateDTO (without id, createdAt, updatedAt)
  // 3. UpdateDTO (partial with id)
  // 4. API response types
  
  return `
// Auto-generated TypeScript types

export interface Organization {
  id: number;
  code: string;
  name: string;
  organizationTypeId: number;
  email: string | null;
  telNo: string | null;
  cellNoOne: string | null;
  countryId: number | null;
  provinceId: number | null;
  cityId: number | null;
  address: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateOrganizationDTO {
  code: string;
  name: string;
  organizationTypeId: number;
  email?: string;
  telNo?: string;
  cellNoOne?: string;
  countryId?: number;
  provinceId?: number;
  cityId?: number;
  address?: string;
  isActive?: boolean;
}

export interface UpdateOrganizationDTO extends Partial<CreateOrganizationDTO> {
  id: number;
}

export interface OrganizationWithRelations extends Organization {
  organizationType?: OrganizationType;
  country?: Country;
  province?: Province;
  city?: City;
}
`;
}
```

### 2.3 Zod Schema Generator

**File**: `/src/lib/generators/zod-generator.ts`

```typescript
export async function generateZodSchemas(projectId: string): Promise<string> {
  // Generate Zod validation schemas based on:
  // 1. SQL data types (number, string, boolean, Date)
  // 2. Nullable/required status
  // 3. Max length constraints
  // 4. CSHTML validation rules
  // 5. PII/PHI flags (add sanitization)
  
  return `
import { z } from 'zod';

export const organizationSchema = z.object({
  code: z.string()
    .min(1, 'Organization Code is required')
    .max(50, 'Code must be 50 characters or less')
    .regex(/^[A-Za-z0-9]+$/, 'Code must be alphanumeric'),
    
  name: z.string()
    .min(1, 'Organization Name is required')
    .max(200, 'Name must be 200 characters or less'),
    
  organizationTypeId: z.number().int().positive('Organization Type is required'),
  
  email: z.string().email('Invalid email format').optional().or(z.literal('')),
  
  telNo: z.string().max(20).optional().or(z.literal('')),
  
  cellNoOne: z.string().max(20).optional().or(z.literal('')),
  
  countryId: z.number().int().positive().optional().nullable(),
  provinceId: z.number().int().positive().optional().nullable(),
  cityId: z.number().int().positive().optional().nullable(),
  
  address: z.string().max(500).optional().or(z.literal('')),
  
  isActive: z.boolean().default(true),
});

export const createOrganizationSchema = organizationSchema;
export const updateOrganizationSchema = organizationSchema.partial().extend({ id: z.number() });
`;
}
```

### Deliverables Phase 2:
- [ ] Prisma schema generator implemented
- [ ] TypeScript type generator implemented
- [ ] Zod schema generator implemented
- [ ] Type mapping tables created
- [ ] API endpoint: `POST /api/generate/prisma`
- [ ] API endpoint: `POST /api/generate/types`
- [ ] API endpoint: `POST /api/generate/zod`

---

## PHASE 3: REACT COMPONENT GENERATOR (Week 5-6)

### Goal
Generate React form components from unified intelligence.

### 3.1 Form Component Generator

**File**: `/src/lib/generators/react-form-generator.ts`

```typescript
export async function generateReactForm(tableName: string, projectId: string): Promise<string> {
  const fields = await prisma.unifiedField.findMany({
    where: { projectId, tableName },
    orderBy: { displayOrder: 'asc' }
  });
  
  // Generate form with:
  // 1. React Hook Form integration
  // 2. Zod resolver
  // 3. Proper input types based on semantic type
  // 4. Dropdown for FK fields
  // 5. Cascade dropdown support
  // 6. PII masking
  // 7. Required field indicators
  
  return `
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createOrganizationSchema, type CreateOrganizationDTO } from '@/lib/validations/organization';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

export function OrganizationForm({ onSuccess, initialData }: OrganizationFormProps) {
  const form = useForm<CreateOrganizationDTO>({
    resolver: zodResolver(createOrganizationSchema),
    defaultValues: initialData || {
      code: '',
      name: '',
      organizationTypeId: undefined,
      email: '',
      isActive: true,
    },
  });
  
  const { toast } = useToast();
  
  async function onSubmit(data: CreateOrganizationDTO) {
    try {
      const response = await fetch('/api/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      if (response.ok) {
        toast({ title: 'Success', description: 'Organization created successfully' });
        onSuccess?.();
      } else {
        const error = await response.json();
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to create organization', variant: 'destructive' });
    }
  }
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Code <span className="text-destructive">*</span></FormLabel>
                <FormControl>
                  <Input placeholder="Enter code" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="organizationTypeId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Type <span className="text-destructive">*</span></FormLabel>
                <Select onValueChange={(v) => field.onChange(Number(v))} defaultValue={String(field.value)}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {/* TODO: Fetch from /api/organization-types */}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          
          {/* Cascade Dropdowns: Country → Province → City */}
          <FormField name="countryId" ... />
          <FormField name="provinceId" ... />
          <FormField name="cityId" ... />
        </div>
        
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline">Cancel</Button>
          <Button type="submit">Save Organization</Button>
        </div>
      </form>
    </Form>
  );
}
`;
}
```

### 3.2 Semantic Type to Component Mapping

```typescript
const SEMANTIC_TO_COMPONENT: Record<string, ComponentConfig> = {
  'name': { component: 'Input', props: { type: 'text' } },
  'email': { component: 'Input', props: { type: 'email' } },
  'phone': { component: 'Input', props: { type: 'tel' } },
  'address': { component: 'Textarea', props: { rows: 3 } },
  'money': { component: 'Input', props: { type: 'number', step: '0.01' } },
  'date': { component: 'DatePicker', props: {} },
  'datetime': { component: 'DateTimePicker', props: {} },
  'boolean': { component: 'Switch', props: {} },
  'status': { component: 'Select', props: {} },
  'fk_reference': { component: 'Select', props: {} },
  'cascade_fk': { component: 'CascadeSelect', props: {} },
  'file': { component: 'FileUpload', props: {} },
  'image': { component: 'ImageUpload', props: {} },
  'password': { component: 'Input', props: { type: 'password' } },
  'url': { component: 'Input', props: { type: 'url' } },
  'color': { component: 'ColorPicker', props: {} },
  'markdown': { component: 'MarkdownEditor', props: {} },
  'code': { component: 'CodeEditor', props: {} },
};
```

### 3.3 List/DataTable Component Generator

**File**: `/src/lib/generators/react-list-generator.ts`

```typescript
export async function generateDataTable(tableName: string, projectId: string): Promise<string> {
  // Generate TanStack Table / DataTable component with:
  // 1. Column definitions from UnifiedField
  // 2. FK lookups (show name instead of id)
  // 3. Date formatting
  // 4. Boolean badges
  // 5. Action column (view, edit, delete)
  // 6. Search/filter
  // 7. Pagination
  // 8. Export functionality
}
```

### Deliverables Phase 3:
- [ ] React form generator implemented
- [ ] Semantic type mapping created
- [ ] Cascade dropdown logic implemented
- [ ] Data table generator implemented
- [ ] API endpoint: `POST /api/generate/form/:tableName`
- [ ] API endpoint: `POST /api/generate/table/:tableName`

---

## PHASE 4: API ROUTE GENERATOR (Week 7-8)

### Goal
Generate Next.js API routes for CRUD operations.

### 4.1 API Route Generator

**File**: `/src/lib/generators/api-route-generator.ts`

```typescript
export async function generateAPIRoutes(tableName: string, projectId: string): Promise<{
  routeFile: string;
  types: string;
}> {
  // Generate Next.js 15 App Router API routes:
  // GET /api/:table - List with pagination, filter, search
  // GET /api/:table/:id - Get by ID
  // POST /api/:table - Create
  // PUT /api/:table/:id - Update
  // DELETE /api/:table/:id - Delete
  
  return {
    routeFile: `
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { create${tableName}Schema, update${tableName}Schema } from '@/lib/validations/${tableName.toLowerCase()}';

// GET /api/${tableName.toLowerCase()}
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '10');
  const search = searchParams.get('search') || '';
  
  const where = search ? {
    OR: [
      { name: { contains: search } },
      { code: { contains: search } },
    ],
  } : {};
  
  const [data, total] = await Promise.all([
    prisma.${tableName.toLowerCase()}.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        organizationType: true,
        country: true,
        province: true,
        city: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.${tableName.toLowerCase()}.count({ where }),
  ]);
  
  return NextResponse.json({
    data,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

// POST /api/${tableName.toLowerCase()}
export async function POST(request: NextRequest) {
  const body = await request.json();
  const validated = create${tableName}Schema.parse(body);
  
  const created = await prisma.${tableName.toLowerCase()}.create({
    data: validated,
  });
  
  return NextResponse.json(created, { status: 201 });
}

// PUT /api/${tableName.toLowerCase()}/:id
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const body = await request.json();
  const validated = update${tableName}Schema.parse({ ...body, id: parseInt(params.id) });
  
  const updated = await prisma.${tableName.toLowerCase()}.update({
    where: { id: validated.id },
    data: validated,
  });
  
  return NextResponse.json(updated);
}

// DELETE /api/${tableName.toLowerCase()}/:id
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  await prisma.${tableName.toLowerCase()}.delete({
    where: { id: parseInt(params.id) },
  });
  
  return NextResponse.json({ success: true });
}
`,
  };
}
```

### 4.2 Dropdown/Reference API Generator

```typescript
// Generate endpoints for FK dropdowns
// GET /api/organization-types/dropdown
export async function generateDropdownAPI(tableName: string, displayField: string): Promise<string> {
  return `
export async function GET() {
  const data = await prisma.${tableName}.findMany({
    select: { id: true, ${displayField}: true },
    orderBy: { ${displayField}: 'asc' },
  });
  
  return NextResponse.json(data.map(item => ({
    value: item.id,
    label: item.${displayField},
  })));
}
`;
}
```

### Deliverables Phase 4:
- [ ] CRUD API route generator implemented
- [ ] Dropdown API generator implemented
- [ ] Search/filter logic implemented
- [ ] Pagination implemented
- [ ] Error handling implemented
- [ ] API endpoint: `POST /api/generate/api/:tableName`

---

## PHASE 4B: QUALITY GATE ENGINE (Week 8-9)

### Goal
Validate all intelligence before code generation.

### 4B.1 Consistency Validator

**File**: `/src/lib/validation/consistency-validator.ts`

```typescript
interface ConsistencyCheck {
  checkId: string;
  checkName: string;
  severity: 'error' | 'warning' | 'info';
  passed: boolean;
  message: string;
  affectedFields: string[];
}

export async function runConsistencyChecks(projectId: string): Promise<ConsistencyCheck[]> {
  const checks: ConsistencyCheck[] = [];
  const fields = await prisma.unifiedField.findMany({ where: { projectId } });
  
  // CHECK 1: FK Table Exists
  for (const field of fields.filter(f => f.fkIsForeignKey)) {
    const tableExists = await prisma.unifiedTable.findFirst({
      where: { projectId, tableName: field.fkReferencedTable }
    });
    
    checks.push({
      checkId: 'CHK-020',
      checkName: 'FK Table Exists',
      severity: tableExists ? 'info' : 'error',
      passed: !!tableExists,
      message: tableExists 
        ? `FK ${field.fieldName} references existing table ${field.fkReferencedTable}`
        : `FK ${field.fieldName} references missing table ${field.fkReferencedTable}`,
      affectedFields: [field.qualifiedName],
    });
  }
  
  // CHECK 2: Required Field Alignment (CSHTML required = SQL NOT NULL)
  for (const field of fields) {
    if (field.cshtmlIsRequired && field.schemaIsNullable) {
      checks.push({
        checkId: 'CHK-001',
        checkName: 'Required Field Alignment',
        severity: 'warning',
        passed: false,
        message: `${field.qualifiedName}: CSHTML required but SQL nullable`,
        affectedFields: [field.qualifiedName],
      });
    }
  }
  
  // CHECK 3: FK Field has Dropdown UI
  for (const field of fields.filter(f => f.fkIsForeignKey)) {
    if (field.cshtmlInputType !== 'select') {
      checks.push({
        checkId: 'CHK-002',
        checkName: 'FK Field UI Type',
        severity: 'warning',
        passed: false,
        message: `${field.qualifiedName}: FK should use dropdown/select`,
        affectedFields: [field.qualifiedName],
      });
    }
  }
  
  // CHECK 4: PII Fields Need Encryption
  for (const field of fields.filter(f => f.compIsPII)) {
    if (!field.compRequiresEncryption) {
      checks.push({
        checkId: 'CHK-010',
        checkName: 'PII Encryption',
        severity: 'error',
        passed: false,
        message: `${field.qualifiedName}: PII field should have encryption`,
        affectedFields: [field.qualifiedName],
      });
    }
  }
  
  // CHECK 5: Enrichment Completeness
  const avgEnrichment = fields.reduce((sum, f) => sum + f.enrichmentProgress, 0) / fields.length;
  checks.push({
    checkId: 'CHK-100',
    checkName: 'Enrichment Completeness',
    severity: avgEnrichment < 80 ? 'warning' : 'info',
    passed: avgEnrichment >= 80,
    message: `Average enrichment: ${avgEnrichment.toFixed(1)}%`,
    affectedFields: [],
  });
  
  return checks;
}
```

### 4B.2 Quality Gate

**File**: `/src/lib/validation/quality-gate.ts`

```typescript
export interface QualityGateResult {
  canGenerate: boolean;
  blockingIssues: ConsistencyCheck[];
  warnings: ConsistencyCheck[];
  certification: 'CERTIFIED' | 'CONDITIONAL' | 'NOT_READY';
}

export async function evaluateQualityGate(projectId: string): Promise<QualityGateResult> {
  const checks = await runConsistencyChecks(projectId);
  
  const blockingIssues = checks.filter(c => c.severity === 'error' && !c.passed);
  const warnings = checks.filter(c => c.severity === 'warning' && !c.passed);
  
  // Calculate overall confidence
  const fields = await prisma.unifiedField.findMany({ where: { projectId } });
  const avgConfidence = fields.reduce((sum, f) => sum + f.overallConfidence, 0) / fields.length;
  
  let certification: 'CERTIFIED' | 'CONDITIONAL' | 'NOT_READY';
  
  if (blockingIssues.length === 0 && avgConfidence >= 0.85) {
    certification = 'CERTIFIED';
  } else if (blockingIssues.length === 0) {
    certification = 'CONDITIONAL';
  } else {
    certification = 'NOT_READY';
  }
  
  return {
    canGenerate: certification !== 'NOT_READY',
    blockingIssues,
    warnings,
    certification,
  };
}
```

### Deliverables Phase 4B:
- [ ] Consistency validator implemented (20 checks)
- [ ] Quality gate implemented
- [ ] Certification logic implemented
- [ ] API endpoint: `POST /api/quality/check`
- [ ] API endpoint: `GET /api/quality/gate-status`

---

## PHASE 5: PROJECT EXPORT & DOWNLOAD (Week 9-10)

### Goal
Package generated code into downloadable project.

### 5.1 Project Scaffold Generator

**File**: `/src/lib/generators/project-scaffold.ts`

```typescript
export async function generateProjectScaffold(config: ProjectConfig): Promise<FileMap> {
  return {
    // Package configuration
    'package.json': generatePackageJson(config),
    'tsconfig.json': generateTsConfig(),
    'tailwind.config.ts': generateTailwindConfig(),
    'next.config.ts': generateNextConfig(),
    '.env.example': generateEnvExample(config.database),
    
    // Prisma
    'prisma/schema.prisma': await generatePrismaSchema(config.projectId),
    
    // Lib
    'lib/db.ts': generateDbClient(),
    'lib/utils.ts': generateUtils(),
    
    // Components (shadcn/ui setup)
    'components/ui/button.tsx': shadcnButton,
    'components/ui/input.tsx': shadcnInput,
    'components/ui/form.tsx': shadcnForm,
    'components/ui/select.tsx': shadcnSelect,
    // ... more shadcn components
    
    // Generated entities
    ...await generateAllEntityFiles(config.projectId),
    
    // App routes
    'app/layout.tsx': generateRootLayout(),
    'app/page.tsx': generateHomePage(),
    'app/globals.css': generateGlobalStyles(),
    
    // Auth (if needed)
    'lib/auth.ts': generateAuthConfig(),
    'middleware.ts': generateMiddleware(),
  };
}
```

### 5.2 ZIP Export

**File**: `/src/lib/export/project-export.ts`

```typescript
import archiver from 'archiver';
import { Readable } from 'stream';

export async function exportProjectAsZip(projectId: string): Promise<Readable> {
  const scaffold = await generateProjectScaffold({ projectId, database: 'sqlite' });
  
  const archive = archiver('zip', { zlib: { level: 9 } });
  
  for (const [path, content] of Object.entries(scaffold)) {
    archive.append(content, { name: path });
  }
  
  archive.finalize();
  return archive;
}
```

### Deliverables Phase 5:
- [ ] Package.json generator
- [ ] Config files generator
- [ ] Shadcn/ui components setup
- [ ] ZIP export functionality
- [ ] API endpoint: `GET /api/export/project/:projectId`

---

## IMPLEMENTATION ORDER (Priority Queue)

### Week 1: Foundation
```
Day 1-2: 
  □ Add UnifiedField, UnifiedTable, GenerationArtifact models to Prisma
  □ Run prisma migrate
  □ Create /src/lib/intelligence-bank/unified-bank.ts (base functions)

Day 3-4:
  □ Create SQL parser wrapper (write to UnifiedField)
  □ Create CSHTML parser wrapper (write to UnifiedField)
  □ Create Column Intelligence wrapper (write to UnifiedField)

Day 5:
  □ Create FK Resolver wrapper (write to UnifiedField)
  □ Create PII/PHI Detector wrapper (write to UnifiedField)
  □ Create enrichment progress calculation
```

### Week 2: Intelligence Pipeline
```
Day 1-2:
  □ Create API endpoint: POST /api/intelligence-bank/enrich
  □ Create API endpoint: GET /api/intelligence-bank/status
  □ Build enrichment dashboard UI

Day 3-4:
  □ Create Manual Table Input UI (for manual field definitions)
  □ Connect all parsers to unified pipeline
  □ Test end-to-end enrichment

Day 5:
  □ Implement confidence calculation
  □ Create low-confidence field review UI
```

### Week 3: Prisma & Types
```
Day 1-2:
  □ Implement Prisma schema generator
  □ Implement SQL→Prisma type mapping
  □ Test generated Prisma schema compiles

Day 3-4:
  □ Implement TypeScript type generator
  □ Implement Zod schema generator
  □ Create API endpoints for generators

Day 5:
  □ Test generated types with sample data
  □ Create generated code preview UI
```

### Week 4: Quality Gate
```
Day 1-2:
  □ Implement consistency validator (first 10 checks)
  □ Implement quality gate evaluation
  □ Create quality dashboard UI

Day 3-4:
  □ Add remaining consistency checks
  □ Implement auto-fix for common issues
  □ Create issue resolution UI

Day 5:
  □ Integrate quality gate with generation pipeline
  □ Block generation if quality gate fails
```

### Week 5-6: React Components
```
Week 5:
  □ Implement form component generator
  □ Implement semantic type to component mapping
  □ Implement cascade dropdown logic
  □ Test generated forms

Week 6:
  □ Implement data table generator
  □ Implement page generator (list + form modal)
  □ Create generated component preview
```

### Week 7-8: API Routes
```
Week 7:
  □ Implement CRUD API route generator
  □ Implement search/filter/pagination logic
  □ Test generated APIs

Week 8:
  □ Implement dropdown API generator
  □ Implement cascade dropdown API
  □ Create API testing UI
```

### Week 9-10: Export & Polish
```
Week 9:
  □ Implement project scaffold generator
  □ Implement ZIP export
  □ Test generated project runs

Week 10:
  □ Integration testing
  □ Performance optimization
  □ Documentation
  □ Demo deployment
```

---

## SUCCESS METRICS

### Phase 1 Complete When:
- [ ] Upload SQL → All tables/columns in UnifiedField
- [ ] Upload CSHTML → All fields enriched with CSHTML data
- [ ] Enrichment progress > 80% for all fields
- [ ] Overall confidence > 0.70

### Phase 2 Complete When:
- [ ] Generated Prisma schema compiles without errors
- [ ] Generated TypeScript types are valid
- [ ] Generated Zod schemas validate correctly

### Phase 3 Complete When:
- [ ] Generated form renders without errors
- [ ] Form validation works
- [ ] FK dropdowns populate correctly
- [ ] Cascade dropdowns work

### Phase 4 Complete When:
- [ ] All CRUD operations work via generated APIs
- [ ] Search/filter works
- [ ] Pagination works
- [ ] Quality gate blocks bad data

### Phase 5 Complete When:
- [ ] Downloaded ZIP extracts correctly
- [ ] `npm install && npm run dev` works
- [ ] Generated app is fully functional

---

## FILE STRUCTURE (Target)

```
generated-project/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── globals.css
│   ├── (dashboard)/
│   │   ├── organizations/
│   │   │   ├── page.tsx          # List page
│   │   │   ├── new/
│   │   │   │   └── page.tsx      # Create page
│   │   │   └── [id]/
│   │   │       └── page.tsx      # Edit page
│   │   └── ...
│   └── api/
│       ├── organizations/
│       │   └── route.ts          # CRUD API
│       ├── organization-types/
│       │   └── route.ts          # Dropdown API
│       └── ...
├── components/
│   ├── ui/                       # shadcn/ui
│   ├── forms/
│   │   ├── organization-form.tsx
│   │   └── ...
│   └── tables/
│       ├── organization-table.tsx
│       └── ...
├── lib/
│   ├── db.ts                     # Prisma client
│   ├── utils.ts
│   └── validations/
│       ├── organization.ts       # Zod schemas
│       └── ...
├── types/
│   ├── organization.ts           # TypeScript types
│   └── ...
├── prisma/
│   └── schema.prisma
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── next.config.ts
```
