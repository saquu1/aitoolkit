// =============================================================================
// SP-Driven Code Generator
// =============================================================================
// Generates complete Next.js application components from SP Intelligence:
// 1. Prisma Schema (with soft delete, multi-tenant, audit patterns)
// 2. TypeScript Types
// 3. Zod Validation Schemas (with SP-extracted validation rules)
// 4. API Routes (with error code mappings, uniqueness checks)
// 5. React Form Components (only editable fields from SP)
// 6. React Data Table Components (grid config from SP SELECT)
// =============================================================================

import type { EnhancedSPIntelligence, ExtractedValidationRule, UIComponentSuggestion, IndexRecommendation, MissingConstraintSuggestion, WorkflowStep, TransactionPattern } from './sp-intelligence-enhanced';
import type { TableDef, ColumnDef } from './types';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export interface SPDrivenGenerationResult {
  tableName: string;
  moduleName: string;
  
  // Generated artifacts
  prisma: {
    schema: string;
    discoveredRelations: string[];
    softDeleteField: string | null;
    multiTenantField: string | null;
    auditFields: string[];
  };
  
  typescript: {
    interface: string;
    createInput: string;
    updateInput: string;
    filterInput: string;
  };
  
  zod: {
    createSchema: string;
    updateSchema: string;
    filterSchema: string;
    validationComments: string[];
  };
  
  api: {
    route: string;
    errorMappings: Record<number, { status: number; message: string }>;
    uniquenessChecks: string[];
    softDeleteImplementation: string | null;
    multiTenantImplementation: string | null;
  };
  
  form: {
    component: string;
    fields: FormFieldDefinition[];
    systemFields: string[];
    excludedFields: string[];
  };
  
  table: {
    component: string;
    columns: TableColumnDefinition[];
    sortableColumns: string[];
    searchableColumns: string[];
    defaultSort: { column: string; direction: 'asc' | 'desc' } | null;
    serverSidePagination: boolean;
  };
  
  // Intelligence summary
  intelligence: {
    validationRules: ExtractedValidationRule[];
    formMode: string;
    indexRecommendations: IndexRecommendation[];
    missingConstraints: MissingConstraintSuggestion[];
    workflowSteps: WorkflowStep[];
    transactionPattern: TransactionPattern;
    discoveredTables: string[];
  };
}

export interface FormFieldDefinition {
  name: string;
  label: string;
  type: string;
  required: boolean;
  editable: boolean;
  defaultValue?: string;
  placeholder?: string;
  options?: { label: string; value: string }[];
  validation: string[];
  order: number;
}

export interface TableColumnDefinition {
  name: string;
  header: string;
  type: string;
  sortable: boolean;
  searchable: boolean;
  visible: boolean;
  isRelation: boolean;
  relationField?: string;
  width?: number;
}

export interface UnifiedFieldRecord {
  columnName: string;
  dataType: string;
  isNullable: boolean;
  isPrimaryKey: boolean;
  
  // From DDL
  isIdentity: boolean;
  defaultValue?: string;
  foreignKey?: {
    table: string;
    column: string;
  };
  
  // From SP Intelligence
  isEditable: boolean;
  isSystemField: boolean;
  isAuditField: boolean;
  isSoftDelete: boolean;
  isMultiTenant: boolean;
  
  // Validation from SP
  validations: ExtractedValidationRule[];
  isRequired: boolean;
  uniqueCheck: boolean;
  
  // UI hints from SP
  uiComponent: UIComponentSuggestion['suggestedComponent'];
  displayOrder: number;
  isGridColumn: boolean;
  isSortable: boolean;
  isSearchable: boolean;
}

// =============================================================================
// SP-DRIVEN CODE GENERATOR
// =============================================================================

export class SPDrivenCodeGenerator {
  
  /**
   * Generate all components from SP Intelligence
   */
  generateFromIntelligence(
    spIntelligence: EnhancedSPIntelligence,
    table: TableDef,
    allTables: TableDef[]
  ): SPDrivenGenerationResult {
    
    // Step 1: Build Unified Field Records (merge DDL + SP intelligence)
    const unifiedFields = this.buildUnifiedFieldRecords(spIntelligence, table);
    
    // Step 2: Generate Prisma Schema with SP patterns
    const prisma = this.generatePrismaFromSP(table, unifiedFields, spIntelligence, allTables);
    
    // Step 3: Generate TypeScript Types
    const typescript = this.generateTypesFromSP(table, unifiedFields, spIntelligence);
    
    // Step 4: Generate Zod Schemas with SP validations
    const zod = this.generateZodFromSP(table, unifiedFields, spIntelligence);
    
    // Step 5: Generate API Routes with SP patterns
    const api = this.generateAPIFromSP(table, unifiedFields, spIntelligence);
    
    // Step 6: Generate React Form (only editable fields)
    const form = this.generateFormFromSP(table, unifiedFields, spIntelligence);
    
    // Step 7: Generate React Data Table (grid config from SP)
    const dataTable = this.generateDataTableFromSP(table, unifiedFields, spIntelligence);
    
    return {
      tableName: table.tableName,
      moduleName: spIntelligence.moduleName,
      prisma,
      typescript,
      zod,
      api,
      form,
      table: dataTable,
      intelligence: {
        validationRules: spIntelligence.validationRules,
        formMode: spIntelligence.formMode.mode,
        indexRecommendations: spIntelligence.indexRecommendations,
        missingConstraints: spIntelligence.missingConstraints,
        workflowSteps: spIntelligence.workflowSteps,
        transactionPattern: spIntelligence.transactionPattern,
        discoveredTables: spIntelligence.discoveredTables,
      }
    };
  }
  
  // ===========================================================================
  // UNIFIED FIELD RECORD BUILDER
  // ===========================================================================
  
  private buildUnifiedFieldRecords(
    spIntelligence: EnhancedSPIntelligence,
    table: TableDef
  ): UnifiedFieldRecord[] {
    return table.columns.map(col => {
      const colName = col.name.toLowerCase();
      const spValidations = spIntelligence.validationRules.filter(
        r => r.columnName.toLowerCase() === colName
      );
      const uiSuggestion = spIntelligence.uiComponentSuggestions.find(
        u => u.parameterName.toLowerCase().replace('@', '') === colName
      );
      
      // Detect patterns from SP
      const isAuditField = ['createdbyid', 'createdon', 'modifiedbyid', 'modifiedon', 'createdby', 'modifiedby', 'createddate', 'modifieddate']
        .some(a => colName.includes(a));
      
      const isSoftDelete = colName === 'isdeleted' || colName === 'isactive' && 
        spIntelligence.workflowSteps.some(s => s.operation === 'UPDATE' && s.description.toLowerCase().includes('delete'));
      
      const isMultiTenant = colName === 'branchid' || colName === 'tenantid' || colName === 'organizationid';
      
      // Determine if editable from SP UPDATE analysis
      const isEditable = spIntelligence.formMode.mode === 'create' 
        ? !col.isPrimaryKey && !isAuditField && !isSoftDelete
        : spIntelligence.formMode.updateTables.length > 0
          ? this.isFieldInUpdateSet(col.name, spIntelligence)
          : !col.isPrimaryKey && !isAuditField;
      
      const isGridColumn = spIntelligence.tableRelationships.some(r => 
        r.fromColumn?.toLowerCase() === colName || r.toColumn?.toLowerCase() === colName
      ) || spValidations.length > 0;
      
      return {
        columnName: col.name,
        dataType: col.dataType,
        isNullable: col.nullable,
        isPrimaryKey: col.isPrimaryKey,
        isIdentity: col.isIdentity,
        defaultValue: col.defaultValue,
        foreignKey: table.foreignKeys.find(fk => fk.columnName === col.name) ? {
          table: table.foreignKeys.find(fk => fk.columnName === col.name)!.referencesTable,
          column: table.foreignKeys.find(fk => fk.columnName === col.name)!.referencesColumn,
        } : undefined,
        
        // SP Intelligence
        isEditable,
        isSystemField: isAuditField || isSoftDelete || isMultiTenant,
        isAuditField,
        isSoftDelete,
        isMultiTenant,
        
        // Validation
        validations: spValidations,
        isRequired: !col.nullable || spValidations.some(v => v.type === 'required'),
        uniqueCheck: spValidations.some(v => v.type === 'unique'),
        
        // UI
        uiComponent: uiSuggestion?.suggestedComponent || this.inferUIComponent(col),
        displayOrder: uiSuggestion?.displayOrder || 99,
        isGridColumn,
        isSortable: spIntelligence.indexRecommendations.some(
          i => i.columns.some(c => c.toLowerCase() === colName) && i.reason === 'order_by'
        ),
        isSearchable: spIntelligence.validationRules.some(
          v => v.columnName.toLowerCase() === colName && v.type === 'pattern'
        ),
      };
    });
  }
  
  private isFieldInUpdateSet(columnName: string, spIntelligence: EnhancedSPIntelligence): boolean {
    // Check if this field appears in UPDATE SET clause logic
    const updateSteps = spIntelligence.workflowSteps.filter(s => s.operation === 'UPDATE');
    // Simple heuristic: non-PK, non-audit fields in update tables are editable
    return updateSteps.length > 0;
  }
  
  private inferUIComponent(col: ColumnDef): UIComponentSuggestion['suggestedComponent'] {
    const nameLower = col.name.toLowerCase();
    const type = col.dataType.toUpperCase();
    
    if (nameLower.includes('password')) return 'text_input';
    if (nameLower.includes('email')) return 'text_input';
    if (nameLower.includes('phone') || nameLower.includes('mobile')) return 'text_input';
    if (nameLower.includes('date') || nameLower.includes('dob')) return 'date_picker';
    if (nameLower.includes('description') || nameLower.includes('notes')) return 'textarea';
    if (nameLower.includes('isactive') || nameLower.includes('isenabled')) return 'checkbox';
    if (nameLower.includes('status') || nameLower.includes('type')) return 'dropdown';
    if (type === 'BIT') return 'checkbox';
    if (type === 'DATE' || type === 'DATETIME') return 'date_picker';
    if (['INT', 'BIGINT', 'DECIMAL', 'MONEY'].includes(type)) return 'number_input';
    if (nameLower.endsWith('id') && !nameLower.startsWith('is')) return 'hidden';
    
    return 'text_input';
  }
  
  // ===========================================================================
  // PRISMA GENERATOR WITH SP PATTERNS
  // ===========================================================================
  
  private generatePrismaFromSP(
    table: TableDef,
    unifiedFields: UnifiedFieldRecord[],
    spIntelligence: EnhancedSPIntelligence,
    allTables: TableDef[]
  ): SPDrivenGenerationResult['prisma'] {
    
    const modelName = this.toPascalSingular(table.tableName);
    const lines: string[] = [];
    
    // Header with SP-derived intelligence
    lines.push(`// Generated from DDL + SP Intelligence`);
    lines.push(`// Table: ${table.tableName}`);
    lines.push(`// Module: ${spIntelligence.moduleName}`);
    lines.push(`// Form Mode: ${spIntelligence.formMode.mode}`);
    lines.push(`// Soft Delete: ${unifiedFields.some(f => f.isSoftDelete) ? 'Yes' : 'No'}`);
    lines.push(`// Multi-Tenant: ${unifiedFields.some(f => f.isMultiTenant) ? 'Yes' : 'No'}`);
    lines.push('');
    
    lines.push(`model ${modelName} {`);
    
    // Columns with SP intelligence
    for (const field of unifiedFields) {
      const prismaType = this.sqlToPrismaType(field.dataType, field.isNullable);
      const attrs: string[] = [];
      
      if (field.isPrimaryKey) {
        attrs.push('@id');
        if (field.dataType === 'UNIQUEIDENTIFIER') {
          attrs.push('@default(uuid())');
        } else if (field.isIdentity) {
          attrs.push('@default(autoincrement())');
        }
      }
      
      // Add @@default for soft delete
      if (field.isSoftDelete) {
        attrs.push('@default(false)');
      }
      
      // Map column name
      const fieldName = this.toCamelCase(field.columnName);
      if (fieldName !== field.columnName) {
        attrs.push(`@map("${field.columnName}")`);
      }
      
      // Add comments for SP-derived intelligence
      let comment = '';
      if (field.isAuditField) comment = ' // Audit field (auto-set from SP)';
      if (field.isSoftDelete) comment = ' // Soft delete flag (from SP)';
      if (field.isMultiTenant) comment = ' // Multi-tenant field (from SP)';
      if (!field.isEditable && !field.isPrimaryKey) comment = ' // Read-only (not in SP UPDATE)';
      
      const attrStr = attrs.length ? '  ' + attrs.join(' ') : '';
      lines.push(`  ${this.padRight(fieldName, 24)} ${this.padRight(prismaType, 12)}${attrStr}${comment}`);
    }
    
    // Unique constraints from SP uniqueness checks
    const uniqueFields = unifiedFields.filter(f => f.uniqueCheck);
    for (const field of uniqueFields) {
      lines.push(`  @@unique([${this.toCamelCase(field.columnName)}]) // From SP uniqueness check`);
    }
    
    // Indexes from SP recommendations
    for (const idx of spIntelligence.indexRecommendations) {
      const fields = idx.columns.map(c => this.toCamelCase(c)).join(', ');
      lines.push(`  @@index([${fields}]) // ${idx.reason}: ${idx.estimatedImpact}`);
    }
    
    // Relations
    const relations = unifiedFields.filter(f => f.foreignKey);
    if (relations.length > 0) {
      lines.push('');
      lines.push('  // Relations (from FK + SP JOINs)');
      for (const rel of relations) {
        const refModel = this.toPascalSingular(rel.foreignKey!.table);
        const fieldName = this.toCamelCase(rel.foreignKey!.table);
        const fkField = this.toCamelCase(rel.columnName);
        lines.push(`  ${fieldName}  ${refModel}? @relation(fields: [${fkField}], references: [id])`);
      }
    }
    
    lines.push('');
    lines.push(`  @@map("${table.tableName}")`);
    lines.push('}');
    
    // Detect patterns
    const softDeleteField = unifiedFields.find(f => f.isSoftDelete)?.columnName || null;
    const multiTenantField = unifiedFields.find(f => f.isMultiTenant)?.columnName || null;
    const auditFields = unifiedFields.filter(f => f.isAuditField).map(f => f.columnName);
    const discoveredRelations = spIntelligence.tableRelationships.map(r => 
      `${r.fromTable}.${r.fromColumn} -> ${r.toTable}.${r.toColumn}`
    );
    
    return {
      schema: lines.join('\n'),
      discoveredRelations,
      softDeleteField,
      multiTenantField,
      auditFields,
    };
  }
  
  // ===========================================================================
  // TYPESCRIPT TYPES GENERATOR
  // ===========================================================================
  
  private generateTypesFromSP(
    table: TableDef,
    unifiedFields: UnifiedFieldRecord[],
    spIntelligence: EnhancedSPIntelligence
  ): SPDrivenGenerationResult['typescript'] {
    
    const typeName = this.toPascalSingular(table.tableName);
    const editableFields = unifiedFields.filter(f => f.isEditable);
    const filterFields = unifiedFields.filter(f => f.isGridColumn || f.isSearchable);
    
    // Main interface
    const interfaceLines: string[] = [];
    interfaceLines.push(`interface ${typeName} {`);
    for (const field of unifiedFields) {
      const tsType = this.sqlToTsType(field.dataType);
      const optional = field.isNullable ? '?' : '';
      const fieldName = this.toCamelCase(field.columnName);
      interfaceLines.push(`  ${fieldName}${optional}: ${tsType};`);
    }
    interfaceLines.push('}');
    
    // Create input (only editable fields, no system fields)
    const createLines: string[] = [];
    createLines.push(`interface ${typeName}CreateInput {`);
    for (const field of editableFields) {
      if (field.isSystemField) continue;
      const tsType = this.sqlToTsType(field.dataType);
      const optional = !field.isRequired ? '?' : '';
      const fieldName = this.toCamelCase(field.columnName);
      createLines.push(`  ${fieldName}${optional}: ${tsType};`);
    }
    createLines.push('}');
    
    // Update input (only fields in SP UPDATE SET clause)
    const updateLines: string[] = [];
    updateLines.push(`interface ${typeName}UpdateInput {`);
    updateLines.push(`  id: string; // PK`);
    for (const field of editableFields) {
      if (field.isSystemField || field.isPrimaryKey) continue;
      const tsType = this.sqlToTsType(field.dataType);
      const fieldName = this.toCamelCase(field.columnName);
      updateLines.push(`  ${fieldName}?: ${tsType}; // Optional for partial updates`);
    }
    updateLines.push('}');
    
    // Filter input for data table
    const filterLines: string[] = [];
    filterLines.push(`interface ${typeName}FilterInput {`);
    for (const field of filterFields) {
      const tsType = this.sqlToTsType(field.dataType);
      const fieldName = this.toCamelCase(field.columnName);
      filterLines.push(`  ${fieldName}?: ${tsType};`);
    }
    filterLines.push(`  page?: number;`);
    filterLines.push(`  pageSize?: number;`);
    filterLines.push(`  sortBy?: string;`);
    filterLines.push(`  sortOrder?: 'asc' | 'desc';`);
    filterLines.push('}');
    
    return {
      interface: interfaceLines.join('\n'),
      createInput: createLines.join('\n'),
      updateInput: updateLines.join('\n'),
      filterInput: filterLines.join('\n'),
    };
  }
  
  // ===========================================================================
  // ZOD VALIDATION GENERATOR WITH SP VALIDATIONS
  // ===========================================================================
  
  private generateZodFromSP(
    table: TableDef,
    unifiedFields: UnifiedFieldRecord[],
    spIntelligence: EnhancedSPIntelligence
  ): SPDrivenGenerationResult['zod'] {
    
    const typeName = this.toPascalSingular(table.tableName);
    const editableFields = unifiedFields.filter(f => f.isEditable && !f.isSystemField);
    const filterFields = unifiedFields.filter(f => f.isGridColumn || f.isSearchable);
    const validationComments: string[] = [];
    
    // Create schema with SP validations
    const createLines: string[] = [];
    createLines.push(`const ${typeName}CreateSchema = z.object({`);
    for (const field of editableFields) {
      const zodType = this.sqlToZodType(field.dataType, field.isNullable);
      const fieldName = this.toCamelCase(field.columnName);
      let fieldDef = `  ${fieldName}: ${zodType}`;
      
      // Add SP-derived validations
      for (const rule of field.validations) {
        if (rule.type === 'required') {
          fieldDef += `.min(1, "${rule.description}")`;
          validationComments.push(`// ${fieldName}: Required - ${rule.description}`);
        } else if (rule.type === 'range' && rule.condition) {
          validationComments.push(`// ${fieldName}: Range validation - ${rule.description}`);
        } else if (rule.type === 'pattern') {
          validationComments.push(`// ${fieldName}: Pattern validation - ${rule.description}`);
        } else if (rule.type === 'unique') {
          validationComments.push(`// ${fieldName}: Uniqueness check required server-side - ${rule.description}`);
        }
      }
      
      createLines.push(`${fieldDef},`);
    }
    createLines.push('});');
    
    // Update schema (all optional except PK)
    const updateLines: string[] = [];
    updateLines.push(`const ${typeName}UpdateSchema = z.object({`);
    updateLines.push(`  id: z.string().uuid(), // PK required`);
    for (const field of editableFields) {
      if (field.isPrimaryKey) continue;
      const zodType = this.sqlToZodType(field.dataType, true);
      const fieldName = this.toCamelCase(field.columnName);
      updateLines.push(`  ${fieldName}: ${zodType}.optional(),`);
    }
    updateLines.push('});');
    
    // Filter schema
    const filterLines: string[] = [];
    filterLines.push(`const ${typeName}FilterSchema = z.object({`);
    for (const field of filterFields) {
      const zodType = this.sqlToZodType(field.dataType, true);
      const fieldName = this.toCamelCase(field.columnName);
      filterLines.push(`  ${fieldName}: ${zodType}.optional(),`);
    }
    filterLines.push(`  page: z.number().int().positive().optional(),`);
    filterLines.push(`  pageSize: z.number().int().positive().max(100).optional(),`);
    filterLines.push(`  sortBy: z.string().optional(),`);
    filterLines.push(`  sortOrder: z.enum(['asc', 'desc']).optional(),`);
    filterLines.push('});');
    
    return {
      createSchema: createLines.join('\n'),
      updateSchema: updateLines.join('\n'),
      filterSchema: filterLines.join('\n'),
      validationComments,
    };
  }
  
  // ===========================================================================
  // API ROUTE GENERATOR WITH SP PATTERNS
  // ===========================================================================
  
  private generateAPIFromSP(
    table: TableDef,
    unifiedFields: UnifiedFieldRecord[],
    spIntelligence: EnhancedSPIntelligence
  ): SPDrivenGenerationResult['api'] {
    
    const typeName = this.toPascalSingular(table.tableName);
    const varName = this.toCamelCase(table.tableName);
    const pkField = unifiedFields.find(f => f.isPrimaryKey)!;
    const softDeleteField = unifiedFields.find(f => f.isSoftDelete);
    const multiTenantField = unifiedFields.find(f => f.isMultiTenant);
    const editableFields = unifiedFields.filter(f => f.isEditable && !f.isSystemField);
    
    // Build error mappings from SP RETURN codes
    const errorMappings: Record<number, { status: number; message: string }> = {};
    for (const rule of spIntelligence.validationRules) {
      if (rule.type === 'unique') {
        errorMappings[-5] = { status: 409, message: `${rule.columnName} already exists` };
      }
    }
    errorMappings[-1] = { status: 400, message: 'Operation failed' };
    errorMappings[2] = { status: 200, message: 'Success' };
    
    // Build uniqueness check code
    const uniquenessChecks: string[] = [];
    for (const field of unifiedFields.filter(f => f.uniqueCheck)) {
      const fieldName = this.toCamelCase(field.columnName);
      uniquenessChecks.push(`
    // Uniqueness check for ${fieldName} (from SP)
    const existing${fieldName} = await prisma.${varName}.findFirst({
      where: { 
        ${fieldName}: data.${fieldName},
        ${pkField ? `${this.toCamelCase(pkField.columnName)}: { not: data.${this.toCamelCase(pkField.columnName)} }` : ''}
        ${softDeleteField ? `, ${this.toCamelCase(softDeleteField.columnName)}: false` : ''}
      }
    });
    if (existing${fieldName}) {
      return NextResponse.json({ error: '${fieldName} already exists' }, { status: 409 });
    }
`);
    }
    
    // Soft delete implementation
    const softDeleteImplementation = softDeleteField ? `
    // Soft delete (from SP pattern)
    const result = await prisma.${varName}.update({
      where: { ${this.toCamelCase(pkField.columnName)}: id },
      data: { ${this.toCamelCase(softDeleteField.columnName)}: true }
    });` : null;
    
    // Multi-tenant implementation
    const multiTenantImplementation = multiTenantField ? `
    // Multi-tenant filter (from SP pattern)
    const branchId = req.headers.get('x-branch-id');
    if (!branchId) {
      return NextResponse.json({ error: 'Branch ID required' }, { status: 400 });
    }` : null;
    
    // Generate complete API route
    const route = this.generateAPIRouteCode(
      typeName, varName, unifiedFields, spIntelligence,
      softDeleteField, multiTenantField, editableFields, errorMappings
    );
    
    return {
      route,
      errorMappings,
      uniquenessChecks,
      softDeleteImplementation,
      multiTenantImplementation,
    };
  }
  
  private generateAPIRouteCode(
    typeName: string,
    varName: string,
    unifiedFields: UnifiedFieldRecord[],
    spIntelligence: EnhancedSPIntelligence,
    softDeleteField: UnifiedFieldRecord | undefined,
    multiTenantField: UnifiedFieldRecord | undefined,
    editableFields: UnifiedFieldRecord[],
    errorMappings: Record<number, { status: number; message: string }>
  ): string {
    
    const pkField = unifiedFields.find(f => f.isPrimaryKey)!;
    
    return `// ============================================
// ${typeName} API Route
// Generated from SP Intelligence
// Form Mode: ${spIntelligence.formMode.mode}
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ${typeName}CreateSchema, ${typeName}UpdateSchema, ${typeName}FilterSchema } from '@/lib/validations/${varName}';

// Error mappings from SP RETURN codes
const ERROR_CODES: Record<number, { status: number; message: string }> = ${JSON.stringify(errorMappings, null, 2)};

// ============================================
// GET /api/${varName} - List with pagination
// ============================================
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    
    // Parse filter params
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';
    
    // Build where clause
    const where: any = {};
    
    ${softDeleteField ? `// Soft delete filter (from SP)
    where.${this.toCamelCase(softDeleteField.columnName)} = false;` : ''}
    
    ${multiTenantField ? `// Multi-tenant filter (from SP)
    const branchId = req.headers.get('x-branch-id');
    if (branchId) {
      where.${this.toCamelCase(multiTenantField.columnName)} = branchId;
    }` : ''}
    
    // Get total count
    const total = await prisma.${varName}.count({ where });
    
    // Get paginated results
    const items = await prisma.${varName}.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { [sortBy]: sortOrder },
      include: {
        ${unifiedFields.filter(f => f.foreignKey).map(f => 
          `${this.toCamelCase(f.foreignKey!.table)}: { select: { id: true, name: true } }`
        ).join(',\n        ')}
      }
    });
    
    return NextResponse.json({
      items,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch ${varName}' }, { status: 500 });
  }
}

// ============================================
// POST /api/${varName} - Create
// ============================================
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = ${typeName}CreateSchema.parse(body);
    
    ${unifiedFields.filter(f => f.uniqueCheck).map(field => {
      const fieldName = this.toCamelCase(field.columnName);
      return `// Uniqueness check for ${fieldName} (from SP)
    const existing${fieldName} = await prisma.${varName}.findFirst({
      where: { 
        ${fieldName}: data.${fieldName},
        ${softDeleteField ? `${this.toCamelCase(softDeleteField.columnName)}: false` : ''}
      }
    });
    if (existing${fieldName}) {
      return NextResponse.json({ error: '${fieldName} already exists' }, { status: 409 });
    }`;
    }).join('\n    ')}
    
    ${multiTenantField ? `// Inject multi-tenant field (from SP)
    const branchId = req.headers.get('x-branch-id');
    if (branchId) {
      data.${this.toCamelCase(multiTenantField.columnName)} = branchId;
    }` : ''}
    
    // Inject audit fields (from SP)
    const userId = req.headers.get('x-user-id');
    
    const item = await prisma.${varName}.create({
      data: {
        ...data,
        ${unifiedFields.filter(f => f.isAuditField).map(f => {
          const fieldName = this.toCamelCase(f.columnName);
          if (fieldName.toLowerCase().includes('created')) {
            if (fieldName.toLowerCase().includes('on') || fieldName.toLowerCase().includes('date')) {
              return `${fieldName}: new Date()`;
            } else {
              return `${fieldName}: userId`;
            }
          }
          return '';
        }).filter(Boolean).join(',\n        ')}
      }
    });
    
    return NextResponse.json({ id: item.${this.toCamelCase(pkField.columnName)}, message: '${typeName} created successfully' }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create ${typeName}' }, { status: 500 });
  }
}

// ============================================
// PUT /api/${varName}/[id] - Update
// ============================================
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const data = ${typeName}UpdateSchema.parse(body);
    const id = data.id;
    
    // Inject audit fields (from SP)
    const userId = req.headers.get('x-user-id');
    
    const item = await prisma.${varName}.update({
      where: { ${this.toCamelCase(pkField.columnName)}: id },
      data: {
        ...data,
        ${unifiedFields.filter(f => f.isAuditField && f.columnName.toLowerCase().includes('modified')).map(f => {
          const fieldName = this.toCamelCase(f.columnName);
          if (fieldName.toLowerCase().includes('on') || fieldName.toLowerCase().includes('date')) {
            return `${fieldName}: new Date()`;
          } else {
            return `${fieldName}: userId`;
          }
        }).join(',\n        ')}
      }
    });
    
    return NextResponse.json({ id: item.${this.toCamelCase(pkField.columnName)}, message: '${typeName} updated successfully' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update ${typeName}' }, { status: 500 });
  }
}

// ============================================
// DELETE /api/${varName}/[id] - ${softDeleteField ? 'Soft Delete' : 'Delete'}
// ============================================
export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'ID required' }, { status: 400 });
    }
    
    ${softDeleteField ? `// Soft delete (from SP pattern)
    await prisma.${varName}.update({
      where: { ${this.toCamelCase(pkField.columnName)}: id },
      data: { ${this.toCamelCase(softDeleteField.columnName)}: true }
    });` : `// Hard delete
    await prisma.${varName}.delete({
      where: { ${this.toCamelCase(pkField.columnName)}: id }
    });`}
    
    return NextResponse.json({ message: '${typeName} deleted successfully' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete ${typeName}' }, { status: 500 });
  }
}
`;
  }
  
  // ===========================================================================
  // REACT FORM GENERATOR
  // ===========================================================================
  
  private generateFormFromSP(
    table: TableDef,
    unifiedFields: UnifiedFieldRecord[],
    spIntelligence: EnhancedSPIntelligence
  ): SPDrivenGenerationResult['form'] {
    
    const typeName = this.toPascalSingular(table.tableName);
    const varName = this.toCamelCase(table.tableName);
    const editableFields = unifiedFields.filter(f => f.isEditable && !f.isSystemField);
    const systemFields = unifiedFields.filter(f => f.isSystemField).map(f => f.columnName);
    const excludedFields = unifiedFields.filter(f => !f.isEditable).map(f => f.columnName);
    
    const formFields: FormFieldDefinition[] = editableFields.map((field, idx) => ({
      name: this.toCamelCase(field.columnName),
      label: this.generateLabel(field.columnName),
      type: field.uiComponent,
      required: field.isRequired,
      editable: field.isEditable,
      defaultValue: field.defaultValue,
      placeholder: `Enter ${this.generateLabel(field.columnName).toLowerCase()}`,
      validation: field.validations.map(v => v.description),
      order: field.displayOrder || idx,
    }));
    
    // Sort by display order
    formFields.sort((a, b) => a.order - b.order);
    
    const component = this.generateFormComponent(
      typeName, varName, formFields, spIntelligence
    );
    
    return {
      component,
      fields: formFields,
      systemFields,
      excludedFields,
    };
  }
  
  private generateFormComponent(
    typeName: string,
    varName: string,
    fields: FormFieldDefinition[],
    spIntelligence: EnhancedSPIntelligence
  ): string {
    
    return `"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ${typeName}CreateSchema, ${typeName}UpdateSchema } from '@/lib/validations/${varName}';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { DatePicker } from '@/components/ui/date-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';

// Form Mode: ${spIntelligence.formMode.mode} (detected from SP)
// Editable Fields: ${fields.length} (excludes system fields)
// System Fields Auto-Set: CreatedBy, CreatedOn, ModifiedBy, ModifiedOn

interface ${typeName}FormProps {
  initialData?: Partial<${typeName}Input>;
  onSubmit: (data: ${typeName}Input) => Promise<void>;
  isEditing?: boolean;
}

export function ${typeName}Form({ initialData, onSubmit, isEditing = false }: ${typeName}FormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  
  const form = useForm<${typeName}Input>({
    resolver: zodResolver(isEditing ? ${typeName}UpdateSchema : ${typeName}CreateSchema),
    defaultValues: initialData || {
      ${fields.filter(f => f.defaultValue).map(f => `${f.name}: ${f.defaultValue}`).join(',\n      ')}
    }
  });
  
  const handleSubmit = async (data: ${typeName}Input) => {
    setIsSubmitting(true);
    try {
      await onSubmit(data);
      toast({
        title: isEditing ? '${typeName} Updated' : '${typeName} Created',
        description: \`The ${typeName.toLowerCase()} has been \${isEditing ? 'updated' : 'created'} successfully.\`,
      });
    } catch (error: any) {
      // Handle SP error codes
      if (error.message?.includes('-5')) {
        toast({
          title: 'Duplicate Entry',
          description: 'A record with this name already exists.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Error',
          description: error.message || 'An unexpected error occurred.',
          variant: 'destructive',
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        ${fields.map(field => this.generateFormField(field)).join('\n        ')}
        
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : isEditing ? 'Update' : 'Create'}
        </Button>
      </form>
    </Form>
  );
}
`;
  }
  
  private generateFormField(field: FormFieldDefinition): string {
    const fieldName = field.name;
    const label = field.label;
    
    switch (field.type) {
      case 'textarea':
        return `<FormField
          control={form.control}
          name="${fieldName}"
          render={({ field }) => (
            <FormItem>
              <FormLabel>${label}${field.required ? ' *' : ''}</FormLabel>
              <FormControl>
                <Textarea placeholder="${field.placeholder}" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />`;
        
      case 'checkbox':
        return `<FormField
          control={form.control}
          name="${fieldName}"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
              <FormControl>
                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>${label}</FormLabel>
              </div>
            </FormItem>
          )}
        />`;
        
      case 'date_picker':
        return `<FormField
          control={form.control}
          name="${fieldName}"
          render={({ field }) => (
            <FormItem>
              <FormLabel>${label}${field.required ? ' *' : ''}</FormLabel>
              <FormControl>
                <DatePicker date={field.value} onChange={field.onChange} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />`;
        
      case 'dropdown':
        return `<FormField
          control={form.control}
          name="${fieldName}"
          render={({ field }) => (
            <FormItem>
              <FormLabel>${label}${field.required ? ' *' : ''}</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select ${label.toLowerCase()}" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {/* Options loaded from API */}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />`;
        
      case 'number_input':
        return `<FormField
          control={form.control}
          name="${fieldName}"
          render={({ field }) => (
            <FormItem>
              <FormLabel>${label}${field.required ? ' *' : ''}</FormLabel>
              <FormControl>
                <Input type="number" placeholder="${field.placeholder}" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />`;
        
      default:
        return `<FormField
          control={form.control}
          name="${fieldName}"
          render={({ field }) => (
            <FormItem>
              <FormLabel>${label}${field.required ? ' *' : ''}</FormLabel>
              <FormControl>
                <Input placeholder="${field.placeholder}" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />`;
    }
  }
  
  // ===========================================================================
  // REACT DATA TABLE GENERATOR
  // ===========================================================================
  
  private generateDataTableFromSP(
    table: TableDef,
    unifiedFields: UnifiedFieldRecord[],
    spIntelligence: EnhancedSPIntelligence
  ): SPDrivenGenerationResult['table'] {
    
    const typeName = this.toPascalSingular(table.tableName);
    const varName = this.toCamelCase(table.tableName);
    
    // Determine grid columns from SP (SELECT columns)
    const gridColumns: TableColumnDefinition[] = unifiedFields
      .filter(f => f.isGridColumn || !f.isSystemField)
      .map((field, idx) => ({
        name: this.toCamelCase(field.columnName),
        header: this.generateLabel(field.columnName),
        type: field.uiComponent,
        sortable: field.isSortable,
        searchable: field.isSearchable,
        visible: !field.isSystemField,
        isRelation: !!field.foreignKey,
        relationField: field.foreignKey ? this.toCamelCase(field.foreignKey.table) : undefined,
        width: this.getColumnWidth(field.dataType),
      }));
    
    // Find sortable columns from SP ORDER BY
    const sortableColumns = unifiedFields
      .filter(f => f.isSortable)
      .map(f => this.toCamelCase(f.columnName));
    
    // Find searchable columns from SP WHERE LIKE
    const searchableColumns = unifiedFields
      .filter(f => f.isSearchable)
      .map(f => this.toCamelCase(f.columnName));
    
    // Default sort from SP
    const defaultSort = spIntelligence.indexRecommendations
      .filter(i => i.reason === 'order_by')
      .map(i => ({
        column: this.toCamelCase(i.columns[0]),
        direction: 'desc' as const,
      }))[0] || null;
    
    const serverSidePagination = spIntelligence.apiEndpoint.parameters
      .some(p => p.name.includes('page') || p.name.includes('offset'));
    
    const component = this.generateDataTableComponent(
      typeName, varName, gridColumns, sortableColumns, 
      searchableColumns, defaultSort, serverSidePagination, spIntelligence
    );
    
    return {
      component,
      columns: gridColumns,
      sortableColumns,
      searchableColumns,
      defaultSort,
      serverSidePagination,
    };
  }
  
  private generateDataTableComponent(
    typeName: string,
    varName: string,
    columns: TableColumnDefinition[],
    sortableColumns: string[],
    searchableColumns: string[],
    defaultSort: { column: string; direction: 'asc' | 'desc' } | null,
    serverSidePagination: boolean,
    spIntelligence: EnhancedSPIntelligence
  ): string {
    
    return `"use client";

import { useState, useEffect } from 'react';
import { useTable, useSortBy, usePagination } from 'react-table';
import { ${typeName}FilterSchema } from '@/lib/validations/${varName}';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

// Grid Configuration from SP:
// - Visible Columns: ${columns.filter(c => c.visible).length}
// - Sortable: ${sortableColumns.join(', ') || 'None'}
// - Searchable: ${searchableColumns.join(', ') || 'None'}
// - Default Sort: ${defaultSort ? defaultSort.column + ' ' + defaultSort.direction : 'None'}
// - Server Pagination: ${serverSidePagination ? 'Yes' : 'No'}

interface ${typeName}TableProps {
  initialData?: ${typeName}[];
}

export function ${typeName}Table({ initialData = [] }: ${typeName}TableProps) {
  const [data, setData] = useState<${typeName}[]>(initialData);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [sortBy, setSortBy] = useState('${defaultSort?.column || 'createdAt'}');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('${defaultSort?.direction || 'desc'}');
  
  // Fetch data with server-side pagination
  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        sortBy,
        sortOrder,
        ${searchableColumns.length > 0 ? `search,` : ''}
      });
      
      const res = await fetch(\`/api/${varName}?\${params}\`);
      const json = await res.json();
      
      setData(json.items);
      setTotal(json.pagination.total);
    } catch (error) {
      console.error('Failed to fetch ${varName}:', error);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchData();
  }, [page, pageSize, sortBy, sortOrder]);
  
  // Column definitions (from SP SELECT)
  const columns = React.useMemo(() => [
    ${columns.filter(c => c.visible).map(col => `{
      Header: '${col.header}',
      accessor: '${col.name}'${col.sortable ? `,
      sortable: true` : ''}${col.isRelation ? `,
      Cell: ({ value, row }) => row.original.${col.relationField}?.name || value` : ''}
    }`).join(',\n    ')}
  ], []);
  
  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    rows,
    prepareRow,
    canPreviousPage,
    canNextPage,
    pageCount,
    gotoPage,
    nextPage,
    previousPage,
    setPageSize: setTablePageSize,
    state: { pageIndex }
  } = useTable(
    {
      columns,
      data,
      initialState: { 
        pageSize: 20,
        sortBy: [{ id: '${defaultSort?.column || 'createdAt'}', desc: ${defaultSort?.direction === 'desc' ? 'true' : 'false'} }]
      },
      manualPagination: ${serverSidePagination},
      manualSortBy: true,
      pageCount: Math.ceil(total / pageSize)
    },
    useSortBy,
    usePagination
  );
  
  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      ${searchableColumns.length > 0 ? `<div className="flex gap-4">
        <Input
          placeholder="Search ${varName}..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>` : ''}
      
      {/* Table */}
      <div className="rounded-md border">
        <Table {...getTableProps()}>
          <TableHeader>
            {headerGroups.map(headerGroup => (
              <TableRow {...headerGroup.getHeaderGroupProps()}>
                {headerGroup.headers.map(column => (
                  <TableHead 
                    {...column.getHeaderProps(column.getSortByToggleProps())}
                    className="cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      {column.render('Header')}
                      {column.sortable && (
                        <span>
                          {column.isSorted ? (
                            column.isSortedDesc ? <ArrowDown className="h-4 w-4" /> : <ArrowUp className="h-4 w-4" />
                          ) : (
                            <ArrowUpDown className="h-4 w-4" />
                          )}
                        </span>
                      )}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody {...getTableBodyProps()}>
            {loading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center py-8">
                  Loading...
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center py-8">
                  No ${varName} found
                </TableCell>
              </TableRow>
            ) : (
              rows.map(row => {
                prepareRow(row);
                return (
                  <TableRow {...row.getRowProps()}>
                    {row.cells.map(cell => (
                      <TableCell {...cell.getCellProps()}>
                        {cell.render('Cell')}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
      
      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, total)} of {total}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setPage(1)} disabled={page === 1}>
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setPage(p => p - 1)} disabled={page === 1}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm">Page {page} of {Math.ceil(total / pageSize)}</span>
          <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(total / pageSize)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setPage(Math.ceil(total / pageSize))} disabled={page >= Math.ceil(total / pageSize)}>
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
`;
  }
  
  // ===========================================================================
  // HELPER METHODS
  // ===========================================================================
  
  private generateLabel(columnName: string): string {
    return columnName
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .replace(/\b\w/g, c => c.toUpperCase())
      .replace(/Id$/i, '')
      .trim();
  }
  
  private getColumnWidth(dataType: string): number {
    switch (dataType.toUpperCase()) {
      case 'UNIQUEIDENTIFIER': return 200;
      case 'NVARCHAR':
      case 'VARCHAR': return 150;
      case 'INT':
      case 'BIGINT': return 80;
      case 'BIT': return 60;
      case 'DATETIME':
      case 'DATE': return 120;
      case 'DECIMAL':
      case 'MONEY': return 100;
      default: return 150;
    }
  }
  
  private sqlToPrismaType(sqlType: string, nullable: boolean): string {
    const type = sqlType.toUpperCase().replace(/\([^)]*\)/g, '');
    const typeMap: Record<string, string> = {
      'UNIQUEIDENTIFIER': 'String',
      'NVARCHAR': 'String',
      'VARCHAR': 'String',
      'CHAR': 'String',
      'NCHAR': 'String',
      'TEXT': 'String',
      'NTEXT': 'String',
      'INT': 'Int',
      'BIGINT': 'BigInt',
      'SMALLINT': 'Int',
      'TINYINT': 'Int',
      'BIT': 'Boolean',
      'DECIMAL': 'Decimal',
      'NUMERIC': 'Decimal',
      'MONEY': 'Decimal',
      'FLOAT': 'Float',
      'REAL': 'Float',
      'DATETIME': 'DateTime',
      'DATETIME2': 'DateTime',
      'DATE': 'DateTime',
      'TIME': 'String',
    };
    
    let prismaType = typeMap[type] || 'String';
    if (nullable && !prismaType.endsWith('?')) {
      prismaType += '?';
    }
    return prismaType;
  }
  
  private sqlToTsType(sqlType: string): string {
    const type = sqlType.toUpperCase().replace(/\([^)]*\)/g, '');
    const typeMap: Record<string, string> = {
      'UNIQUEIDENTIFIER': 'string',
      'NVARCHAR': 'string',
      'VARCHAR': 'string',
      'INT': 'number',
      'BIGINT': 'number',
      'BIT': 'boolean',
      'DECIMAL': 'number',
      'FLOAT': 'number',
      'DATETIME': 'Date',
      'DATETIME2': 'Date',
      'DATE': 'Date',
    };
    return typeMap[type] || 'string';
  }
  
  private sqlToZodType(sqlType: string, nullable: boolean): string {
    const type = sqlType.toUpperCase().replace(/\([^)]*\)/g, '');
    const typeMap: Record<string, string> = {
      'UNIQUEIDENTIFIER': 'z.string().uuid()',
      'NVARCHAR': 'z.string()',
      'VARCHAR': 'z.string()',
      'INT': 'z.number().int()',
      'BIGINT': 'z.number().int()',
      'BIT': 'z.boolean()',
      'DECIMAL': 'z.number()',
      'FLOAT': 'z.number()',
      'DATETIME': 'z.coerce.date()',
      'DATE': 'z.coerce.date()',
    };
    
    let zodType = typeMap[type] || 'z.string()';
    if (nullable) {
      zodType += '.nullable()';
    }
    return zodType;
  }
  
  private toPascalSingular(name: string): string {
    let singular = name;
    if (singular.endsWith('ies')) {
      singular = singular.slice(0, -3) + 'y';
    } else if (singular.endsWith('s') && !singular.endsWith('ss')) {
      singular = singular.slice(0, -1);
    }
    return singular.charAt(0).toUpperCase() + singular.slice(1);
  }
  
  private toCamelCase(name: string): string {
    return name.charAt(0).toLowerCase() + name.slice(1);
  }
  
  private padRight(str: string, len: number): string {
    return str + ' '.repeat(Math.max(0, len - str.length));
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export const spDrivenCodeGenerator = new SPDrivenCodeGenerator();

export function generateFromSPIntelligence(
  spIntelligence: EnhancedSPIntelligence,
  table: TableDef,
  allTables: TableDef[]
): SPDrivenGenerationResult {
  return spDrivenCodeGenerator.generateFromIntelligence(spIntelligence, table, allTables);
}
