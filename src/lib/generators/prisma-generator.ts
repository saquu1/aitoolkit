/**
 * Prisma Schema Generator
 * 
 * Generates Prisma schema from Unified Intelligence Bank data.
 * 
 * Features:
 * - SQL Server → Prisma type mapping
 * - Foreign key relationships
 * - Index generation
 * - Model documentation
 * - Cascade rules
 * - Audit field detection
 */

import { prisma } from '@/lib/db';
import {
  getPrismaType,
  toPrismaModelName,
  toCamelCase,
  isNumericType,
} from './type-mappings';
import type { UnifiedField } from '@prisma/client';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface PrismaGeneratorConfig {
  projectId: string;
  database: 'sqlite' | 'mysql' | 'postgresql' | 'sqlserver';
  includeAuditFields?: boolean;
  includeSoftDelete?: boolean;
  includeRelations?: boolean;
  includeIndexes?: boolean;
  includeDocumentation?: boolean;
  useNativeIds?: boolean; // Use Int @id @default(autoincrement()) vs String @id @default(cuid())
  namingConvention?: 'original' | 'snake_case' | 'camelCase';
}

export interface PrismaModel {
  name: string;
  tableName: string;
  schema?: string;
  fields: PrismaField[];
  relations: PrismaRelation[];
  indexes: PrismaIndex[];
  documentation?: string;
}

export interface PrismaField {
  name: string;
  type: string;
  isId: boolean;
  isUnique: boolean;
  isNullable: boolean;
  isList: boolean;
  default?: string;
  documentation?: string;
  dbName?: string; // Original column name if different
}

export interface PrismaRelation {
  name: string;
  type: string; // model name
  fields: string[]; // FK field names
  references: string[]; // Referenced field names
  onDelete?: 'Cascade' | 'SetNull' | 'Restrict' | 'NoAction' | 'SetDefault';
  onUpdate?: 'Cascade' | 'SetNull' | 'Restrict' | 'NoAction' | 'SetDefault';
  isOptional: boolean;
}

export interface PrismaIndex {
  fields: string[];
  isUnique: boolean;
  name?: string;
}

export interface PrismaGenerationResult {
  schema: string;
  models: PrismaModel[];
  errors: string[];
  warnings: string[];
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN GENERATOR
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Generate complete Prisma schema from Unified Intelligence Bank
 */
export async function generatePrismaSchema(
  config: PrismaGeneratorConfig
): Promise<PrismaGenerationResult> {
  const result: PrismaGenerationResult = {
    schema: '',
    models: [],
    errors: [],
    warnings: [],
  };
  
  try {
    // Get all fields grouped by table
    const fields = await prisma.unifiedField.findMany({
      where: { projectId: config.projectId },
      orderBy: [{ tableName: 'asc' }, { displayOrder: 'asc' }],
    });
    
    // Group fields by table
    const tableGroups = groupFieldsByTable(fields);
    
    // Build models
    for (const [tableName, tableFields] of Object.entries(tableGroups)) {
      try {
        const model = buildPrismaModel(tableName, tableFields, config);
        result.models.push(model);
      } catch (error: any) {
        result.errors.push(`Error building model ${tableName}: ${error.message}`);
      }
    }
    
    // Sort models by dependency order
    result.models = sortModelsByDependency(result.models);
    
    // Generate schema string
    result.schema = buildSchemaString(result.models, config);
    
  } catch (error: any) {
    result.errors.push(`Schema generation error: ${error.message}`);
  }
  
  return result;
}

/**
 * Group fields by table
 */
function groupFieldsByTable(fields: UnifiedField[]): Record<string, UnifiedField[]> {
  const groups: Record<string, UnifiedField[]> = {};
  
  for (const field of fields) {
    if (!groups[field.tableName]) {
      groups[field.tableName] = [];
    }
    groups[field.tableName].push(field);
  }
  
  return groups;
}

/**
 * Build a Prisma model from table fields
 */
function buildPrismaModel(
  tableName: string,
  fields: UnifiedField[],
  config: PrismaGeneratorConfig
): PrismaModel {
  const modelName = toPrismaModelName(tableName);
  const model: PrismaModel = {
    name: modelName,
    tableName,
    fields: [],
    relations: [],
    indexes: [],
  };
  
  // Process each field
  for (const field of fields) {
    // Skip if hidden
    if (field.uiIsHidden) continue;
    
    const prismaField = buildPrismaField(field, config);
    model.fields.push(prismaField);
    
    // Add relation for FK
    if (config.includeRelations && field.fkIsForeignKey && field.fkReferencedTable) {
      const relation = buildPrismaRelation(field, config);
      if (relation) {
        model.relations.push(relation);
      }
    }
    
    // Add index for FK fields and searchable fields
    if (config.includeIndexes && (field.fkIsForeignKey || field.intelSemanticType === 'code' || field.schemaIsPrimaryKey)) {
      model.indexes.push({
        fields: [field.fieldName],
        isUnique: false,
      });
    }
  }
  
  // Add audit fields if configured
  if (config.includeAuditFields) {
    model.fields.push(...buildAuditFields());
  }
  
  // Add soft delete if configured
  if (config.includeSoftDelete) {
    model.fields.push(buildSoftDeleteField());
  }
  
  // Add composite indexes for common query patterns
  if (config.includeIndexes) {
    // Index on FK + status/active fields
    const fkFields = fields.filter(f => f.fkIsForeignKey);
    const statusField = fields.find(f => f.fieldName.toLowerCase().includes('status'));
    const activeField = fields.find(f => f.fieldName.toLowerCase().includes('active') || f.fieldName.toLowerCase().includes('isactive'));
    
    for (const fk of fkFields) {
      if (statusField) {
        model.indexes.push({
          fields: [fk.fieldName, statusField.fieldName],
          isUnique: false,
        });
      }
      if (activeField) {
        model.indexes.push({
          fields: [fk.fieldName, activeField.fieldName],
          isUnique: false,
        });
      }
    }
  }
  
  // Add documentation
  if (config.includeDocumentation) {
    const piiFields = fields.filter(f => f.compIsPII);
    const phiFields = fields.filter(f => f.compIsPHI);
    
    model.documentation = `Model: ${modelName}\nTable: ${tableName}` +
      (piiFields.length > 0 ? `\nContains PII: ${piiFields.map(f => f.fieldName).join(', ')}` : '') +
      (phiFields.length > 0 ? `\nContains PHI: ${phiFields.map(f => f.fieldName).join(', ')}` : '');
  }
  
  return model;
}

/**
 * Build a Prisma field from UnifiedField
 */
function buildPrismaField(field: UnifiedField, config: PrismaGeneratorConfig): PrismaField {
  const prismaType = getPrismaType(field.schemaDataType || 'VARCHAR', config.database as any);
  
  const prismaField: PrismaField = {
    name: toCamelCase(field.fieldName),
    type: prismaType,
    isId: field.schemaIsPrimaryKey,
    isUnique: false,
    isNullable: field.schemaIsNullable && !field.schemaIsPrimaryKey,
    isList: false,
  };
  
  // Handle ID field
  if (field.schemaIsPrimaryKey) {
    if (config.useNativeIds) {
      prismaField.type = 'Int';
      prismaField.default = 'autoincrement()';
    } else {
      prismaField.type = 'String';
      prismaField.default = 'cuid()';
    }
    prismaField.isNullable = false;
  }
  
  // Handle unique constraint
  if (field.fieldName.toLowerCase().includes('email') ||
      field.fieldName.toLowerCase().includes('code') ||
      field.fieldName.toLowerCase().includes('username')) {
    prismaField.isUnique = true;
  }
  
  // Handle default value
  if (!prismaField.isId && field.schemaDefaultValue) {
    prismaField.default = formatDefaultValue(field.schemaDefaultValue, prismaField.type);
  }
  
  // Handle boolean defaults
  if (prismaType === 'Boolean' && !prismaField.default) {
    prismaField.default = 'false';
  }
  
  // Add documentation
  if (config.includeDocumentation && field.intelBusinessMeaning) {
    prismaField.documentation = field.intelBusinessMeaning;
  }
  
  // Handle DB name if different (for naming convention)
  if (config.namingConvention === 'camelCase' && field.fieldName !== prismaField.name) {
    prismaField.dbName = field.fieldName;
  }
  
  return prismaField;
}

/**
 * Build a Prisma relation from FK field
 */
function buildPrismaRelation(field: UnifiedField, config: PrismaGeneratorConfig): PrismaRelation | null {
  if (!field.fkReferencedTable) return null;
  
  const referencedModel = toPrismaModelName(field.fkReferencedTable);
  const relationName = `${toPrismaModelName(field.tableName)}_${referencedModel}`;
  
  return {
    name: relationName,
    type: referencedModel,
    fields: [toCamelCase(field.fieldName)],
    references: [field.fkReferencedColumn || 'id'],
    onDelete: mapCascadeAction(field.fkOnDelete),
    onUpdate: mapCascadeAction(field.fkOnUpdate),
    isOptional: field.schemaIsNullable,
  };
}

/**
 * Map cascade action to Prisma format
 */
function mapCascadeAction(action?: string | null): 'Cascade' | 'SetNull' | 'Restrict' | 'NoAction' | undefined {
  switch (action?.toUpperCase()) {
    case 'CASCADE':
      return 'Cascade';
    case 'SET NULL':
      return 'SetNull';
    case 'SET DEFAULT':
    case 'SET_DEFAULT':
      return 'SetDefault';
    case 'NO ACTION':
    case 'NO_ACTION':
      return 'NoAction';
    case 'RESTRICT':
      return 'Restrict';
    default:
      return undefined;
  }
}

/**
 * Format default value for Prisma
 */
function formatDefaultValue(value: string, prismaType: string): string {
  // Remove parentheses wrappers
  const cleanValue = value.replace(/^\((.+)\)$/, '$1');
  
  if (prismaType === 'Boolean') {
    return cleanValue === '1' || cleanValue.toLowerCase() === 'true' ? 'true' : 'false';
  }
  
  if (prismaType === 'Int' || prismaType === 'Float' || prismaType === 'Decimal') {
    return cleanValue;
  }
  
  if (prismaType === 'String') {
    // Handle function calls
    if (cleanValue.toLowerCase().includes('getdate') || cleanValue.toLowerCase().includes('now')) {
      return 'now()';
    }
    if (cleanValue.toLowerCase().includes('newid') || cleanValue.toLowerCase().includes('uuid')) {
      return 'uuid()';
    }
    // String literal
    return `"${cleanValue.replace(/'/g, '')}"`;
  }
  
  return `"${cleanValue}"`;
}

/**
 * Build audit fields (createdAt, updatedAt)
 */
function buildAuditFields(): PrismaField[] {
  return [
    {
      name: 'createdAt',
      type: 'DateTime',
      isId: false,
      isUnique: false,
      isNullable: false,
      isList: false,
      default: 'now()',
      documentation: 'Record creation timestamp',
    },
    {
      name: 'updatedAt',
      type: 'DateTime',
      isId: false,
      isUnique: false,
      isNullable: false,
      isList: false,
      default: 'now()',
      documentation: 'Record last update timestamp',
    },
  ];
}

/**
 * Build soft delete field
 */
function buildSoftDeleteField(): PrismaField {
  return {
    name: 'deletedAt',
    type: 'DateTime',
    isId: false,
    isUnique: false,
    isNullable: true,
    isList: false,
    documentation: 'Soft delete timestamp',
  };
}

/**
 * Sort models by dependency (tables referenced by FKs come first)
 */
function sortModelsByDependency(models: PrismaModel[]): PrismaModel[] {
  const modelMap = new Map(models.map(m => [m.name, m]));
  const visited = new Set<string>();
  const sorted: PrismaModel[] = [];
  
  function visit(model: PrismaModel) {
    if (visited.has(model.name)) return;
    visited.add(model.name);
    
    // Visit dependencies first
    for (const relation of model.relations) {
      const depModel = modelMap.get(relation.type);
      if (depModel && !visited.has(depModel.name)) {
        visit(depModel);
      }
    }
    
    sorted.push(model);
  }
  
  for (const model of models) {
    visit(model);
  }
  
  return sorted;
}

/**
 * Build the complete schema string
 */
function buildSchemaString(models: PrismaModel[], config: PrismaGeneratorConfig): string {
  const lines: string[] = [];
  
  // Header
  lines.push('// Prisma Schema - Auto-generated by AI Enterprise Architect');
  lines.push('// Do not edit manually - changes will be overwritten');
  lines.push(`// Generated at: ${new Date().toISOString()}`);
  lines.push('');
  
  // Generator and datasource
  lines.push('generator client {');
  lines.push('  provider = "prisma-client-js"');
  lines.push('}');
  lines.push('');
  
  lines.push('datasource db {');
  lines.push(`  provider = "${getProviderString(config.database)}"`);
  lines.push('  url      = env("DATABASE_URL")');
  lines.push('}');
  lines.push('');
  
  // Models
  for (const model of models) {
    lines.push(buildModelString(model, config));
    lines.push('');
  }
  
  return lines.join('\n');
}

/**
 * Get provider string for database type
 */
function getProviderString(database: string): string {
  switch (database) {
    case 'sqlite':
      return 'sqlite';
    case 'mysql':
      return 'mysql';
    case 'postgresql':
      return 'postgresql';
    case 'sqlserver':
      return 'sqlserver';
    default:
      return 'sqlite';
  }
}

/**
 * Build model string
 */
function buildModelString(model: PrismaModel, config: PrismaGeneratorConfig): string {
  const lines: string[] = [];
  
  // Model header with documentation
  if (model.documentation) {
    lines.push(`/// ${model.documentation.split('\n').join('\n/// ')}`);
  }
  
  lines.push(`model ${model.name} {`);
  
  // Fields
  for (const field of model.fields) {
    lines.push(`  ${buildFieldString(field)}`);
  }
  
  // Relations
  for (const relation of model.relations) {
    lines.push('');
    lines.push(`  ${buildRelationString(relation)}`);
  }
  
  // Indexes
  const uniqueIndexes = model.indexes.filter(i => i.isUnique && i.fields.length === 1);
  const compositeIndexes = model.indexes.filter(i => !i.isUnique || i.fields.length > 1);
  
  // Unique constraints
  for (const idx of uniqueIndexes) {
    lines.push('');
    lines.push(`  @@unique([${idx.fields.join(', ')}])`);
  }
  
  // Composite indexes
  for (const idx of compositeIndexes) {
    lines.push('');
    lines.push(`  @@index([${idx.fields.join(', ')}])`);
  }
  
  // Table name mapping
  if (model.tableName !== model.name) {
    lines.push('');
    lines.push(`  @@map("${model.tableName}")`);
  }
  
  lines.push('}');
  
  return lines.join('\n');
}

/**
 * Build field string
 */
function buildFieldString(field: PrismaField): string {
  const parts = [field.name, field.type];
  
  if (field.isId) parts.push('@id');
  if (field.isUnique && !field.isId) parts.push('@unique');
  if (!field.isNullable && !field.isId) parts.push('@default');
  if (field.default) parts.push(`@default(${field.default})`);
  if (field.isList) parts.push('[]');
  if (field.dbName) parts.push(`@map("${field.dbName}")`);
  if (field.documentation) parts.push(`// ${field.documentation}`);
  
  return parts.join(' ');
}

/**
 * Build relation string
 */
function buildRelationString(relation: PrismaRelation): string {
  const parts = [
    relation.name.charAt(0).toLowerCase() + relation.name.slice(1), // relation name
    relation.type,
  ];
  
  // Relation is optional if FK is nullable
  if (relation.isOptional) {
    parts.push('?');
  }
  
  // @relation
  const relationParts: string[] = [];
  relationParts.push(`fields: [${relation.fields.join(', ')}]`);
  relationParts.push(`references: [${relation.references.join(', ')}]`);
  
  if (relation.onDelete) relationParts.push(`onDelete: ${relation.onDelete}`);
  if (relation.onUpdate) relationParts.push(`onUpdate: ${relation.onUpdate}`);
  
  parts.push(`@relation(${relationParts.join(', ')})`);
  
  return parts.join(' ');
}

// ══════════════════════════════════════════════════════════════════════════════
// EXPORT FUNCTIONS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Generate Prisma schema for a single table
 */
export async function generatePrismaModel(
  projectId: string,
  tableName: string,
  config: Partial<PrismaGeneratorConfig> = {}
): Promise<{ model: PrismaModel; schema: string; errors: string[] }> {
  const fullConfig: PrismaGeneratorConfig = {
    projectId,
    tableName,
    database: config.database || 'sqlite',
    ...config,
  };
  
  const fields = await prisma.unifiedField.findMany({
    where: { projectId, tableName },
    orderBy: { displayOrder: 'asc' },
  });
  
  const model = buildPrismaModel(tableName, fields, fullConfig);
  const schema = buildModelString(model, fullConfig);
  
  return { model, schema, errors: [] };
}

/**
 * Get all FK references that are missing tables
 */
export async function getMissingFKReferences(projectId: string): Promise<string[]> {
  const missing = await prisma.unifiedField.findMany({
    where: {
      projectId,
      fkIsForeignKey: true,
      fkTableExists: false,
    },
    select: { fkReferencedTable: true },
    distinct: ['fkReferencedTable'],
  });
  
  return missing.map(f => f.fkReferencedTable).filter(Boolean) as string[];
}

/**
 * Validate that all FK references exist
 */
export async function validateFKReferences(projectId: string): Promise<{
  valid: boolean;
  missing: string[];
  errors: string[];
}> {
  const missing = await getMissingFKReferences(projectId);
  
  const errors = missing.map(table => 
    `Missing table: ${table} is referenced by foreign key but not found in project`
  );
  
  return {
    valid: missing.length === 0,
    missing,
    errors,
  };
}
