/**
 * TypeScript Type Generator
 * 
 * Generates TypeScript interfaces and types from Unified Intelligence Bank.
 * 
 * Outputs:
 * - Entity interface
 * - CreateDTO (without id, timestamps)
 * - UpdateDTO (partial with id)
 * - API response types
 * - Query/filter types
 */

import { prisma } from '@/lib/db';
import {
  getTypeScriptType,
  toPrismaModelName,
  toCamelCase,
} from './type-mappings';
import type { UnifiedField } from '@prisma/client';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface TypeScriptGeneratorConfig {
  projectId: string;
  tableName?: string; // Generate for single table
  includeRelations?: boolean;
  includeEnums?: boolean;
  includeUtils?: boolean;
  useNullish?: boolean; // Use null | undefined instead of just nullable
  exportAll?: boolean;
}

export interface TypeScriptType {
  name: string;
  content: string;
  isExport: boolean;
  dependencies: string[];
}

export interface TypeScriptGenerationResult {
  types: TypeScriptType[];
  content: string; // Combined file content
  errors: string[];
  warnings: string[];
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN GENERATOR
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Generate TypeScript types from Unified Intelligence Bank
 */
export async function generateTypeScriptTypes(
  config: TypeScriptGeneratorConfig
): Promise<TypeScriptGenerationResult> {
  const result: TypeScriptGenerationResult = {
    types: [],
    content: '',
    errors: [],
    warnings: [],
  };
  
  try {
    // Get fields
    const where: any = { projectId: config.projectId };
    if (config.tableName) where.tableName = config.tableName;
    
    const fields = await prisma.unifiedField.findMany({
      where,
      orderBy: [{ tableName: 'asc' }, { displayOrder: 'asc' }],
    });
    
    // Group by table
    const tableGroups = groupFieldsByTable(fields);
    
    // Generate types for each table
    for (const [tableName, tableFields] of Object.entries(tableGroups)) {
      try {
        const modelTypes = generateModelTypes(tableName, tableFields, config);
        result.types.push(...modelTypes);
      } catch (error: any) {
        result.errors.push(`Error generating types for ${tableName}: ${error.message}`);
      }
    }
    
    // Build combined content
    result.content = buildFileContent(result.types, config);
    
  } catch (error: any) {
    result.errors.push(`TypeScript generation error: ${error.message}`);
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
 * Generate all types for a single model
 */
function generateModelTypes(
  tableName: string,
  fields: UnifiedField[],
  config: TypeScriptGeneratorConfig
): TypeScriptType[] {
  const types: TypeScriptType[] = [];
  const modelName = toPrismaModelName(tableName);
  const camelName = toCamelCase(tableName);
  
  // 1. Main Entity Interface
  types.push(generateEntityInterface(tableName, fields, config));
  
  // 2. Create DTO (without id, timestamps)
  types.push(generateCreateDTO(tableName, fields, config));
  
  // 3. Update DTO (partial with id)
  types.push(generateUpdateDTO(tableName, fields, config));
  
  // 4. Query/Filter types
  types.push(generateQueryTypes(tableName, fields, config));
  
  // 5. API Response types
  types.push(generateResponseTypes(tableName, fields, config));
  
  // 6. With Relations type (if relations enabled)
  if (config.includeRelations) {
    types.push(generateWithRelations(tableName, fields, config));
  }
  
  return types;
}

/**
 * Generate main entity interface
 */
function generateEntityInterface(
  tableName: string,
  fields: UnifiedField[],
  config: TypeScriptGeneratorConfig
): TypeScriptType {
  const modelName = toPrismaModelName(tableName);
  const lines: string[] = [];
  const dependencies: string[] = [];
  
  lines.push('/**');
  lines.push(` * ${modelName} Entity`);
  lines.push(` * Table: ${tableName}`);
  lines.push(' */');
  lines.push(`export interface ${modelName} {`);
  
  for (const field of fields) {
    const tsType = getFieldType(field, dependencies);
    const optional = field.schemaIsNullable ? '?' : '';
    const comment = field.intelBusinessMeaning 
      ? ` // ${field.intelBusinessMeaning}` 
      : '';
    
    lines.push(`  ${toCamelCase(field.fieldName)}${optional}: ${tsType};${comment}`);
  }
  
  // Add audit fields
  lines.push('  createdAt: Date;');
  lines.push('  updatedAt: Date;');
  
  lines.push('}');
  
  return {
    name: modelName,
    content: lines.join('\n'),
    isExport: config.exportAll ?? true,
    dependencies,
  };
}

/**
 * Generate Create DTO
 */
function generateCreateDTO(
  tableName: string,
  fields: UnifiedField[],
  config: TypeScriptGeneratorConfig
): TypeScriptType {
  const modelName = toPrismaModelName(tableName);
  const lines: string[] = [];
  const dependencies: string[] = [];
  
  lines.push('/**');
  lines.push(` * DTO for creating ${modelName}`);
  lines.push(' */');
  lines.push(`export interface Create${modelName}DTO {`);
  
  for (const field of fields) {
    // Skip auto-generated fields
    if (field.schemaIsIdentity || field.schemaIsPrimaryKey) continue;
    if (field.intelIsAuditField) continue;
    
    const tsType = getFieldType(field, dependencies);
    const optional = field.schemaIsNullable || field.schemaDefaultValue ? '?' : '';
    
    lines.push(`  ${toCamelCase(field.fieldName)}${optional}: ${tsType};`);
  }
  
  lines.push('}');
  
  return {
    name: `Create${modelName}DTO`,
    content: lines.join('\n'),
    isExport: config.exportAll ?? true,
    dependencies,
  };
}

/**
 * Generate Update DTO
 */
function generateUpdateDTO(
  tableName: string,
  fields: UnifiedField[],
  config: TypeScriptGeneratorConfig
): TypeScriptType {
  const modelName = toPrismaModelName(tableName);
  const lines: string[] = [];
  const dependencies: string[] = [];
  
  lines.push('/**');
  lines.push(` * DTO for updating ${modelName}`);
  lines.push(' */');
  lines.push(`export interface Update${modelName}DTO {`);
  
  // Id is required for update
  const pkField = fields.find(f => f.schemaIsPrimaryKey);
  if (pkField) {
    const tsType = getFieldType(pkField, dependencies);
    lines.push(`  ${toCamelCase(pkField.fieldName)}: ${tsType}; // Required for update`);
  }
  
  // All other fields are optional partial
  for (const field of fields) {
    if (field.schemaIsPrimaryKey) continue;
    if (field.intelIsAuditField) continue;
    
    const tsType = getFieldType(field, dependencies);
    lines.push(`  ${toCamelCase(field.fieldName)}?: ${tsType};`);
  }
  
  lines.push('}');
  
  return {
    name: `Update${modelName}DTO`,
    content: lines.join('\n'),
    isExport: config.exportAll ?? true,
    dependencies,
  };
}

/**
 * Generate query/filter types
 */
function generateQueryTypes(
  tableName: string,
  fields: UnifiedField[],
  config: TypeScriptGeneratorConfig
): TypeScriptType {
  const modelName = toPrismaModelName(tableName);
  const lines: string[] = [];
  
  lines.push('/**');
  lines.push(` * Query parameters for ${modelName} list`);
  lines.push(' */');
  lines.push(`export interface ${modelName}Query {`);
  lines.push('  page?: number;');
  lines.push('  limit?: number;');
  lines.push('  search?: string;');
  lines.push('  sortBy?: string;');
  lines.push('  sortOrder?: "asc" | "desc";');
  
  // Add filter fields for searchable/filterable fields
  const filterFields = fields.filter(f => 
    f.fkIsForeignKey || 
    f.intelSemanticType === 'status' ||
    f.intelSemanticType === 'active' ||
    f.intelSemanticType === 'date' ||
    f.intelSemanticType === 'boolean'
  );
  
  for (const field of filterFields) {
    const tsType = getTypeScriptType(field.schemaDataType || 'VARCHAR');
    lines.push(`  ${toCamelCase(field.fieldName)}?: ${tsType};`);
  }
  
  lines.push('}');
  lines.push('');
  lines.push('/**');
  lines.push(` * Pagination result for ${modelName}`);
  lines.push(' */');
  lines.push(`export interface ${modelName}PaginatedResult {`);
  lines.push(`  data: ${modelName}[];`);
  lines.push('  pagination: {');
  lines.push('    page: number;');
  lines.push('    limit: number;');
  lines.push('    total: number;');
  lines.push('    totalPages: number;');
  lines.push('  };');
  lines.push('}');
  
  return {
    name: `${modelName}Query`,
    content: lines.join('\n'),
    isExport: config.exportAll ?? true,
    dependencies: [modelName],
  };
}

/**
 * Generate API response types
 */
function generateResponseTypes(
  tableName: string,
  fields: UnifiedField[],
  config: TypeScriptGeneratorConfig
): TypeScriptType {
  const modelName = toPrismaModelName(tableName);
  const lines: string[] = [];
  
  lines.push('/**');
  lines.push(` * API response wrapper for ${modelName}`);
  lines.push(' */');
  lines.push(`export interface ${modelName}Response {`);
  lines.push('  success: boolean;');
  lines.push('  data: {');
  lines.push(`    ${toCamelCase(tableName)}: ${modelName};`);
  lines.push('  };');
  lines.push('  message?: string;');
  lines.push('}');
  lines.push('');
  lines.push('/**');
  lines.push(` * API response for ${modelName} list`);
  lines.push(' */');
  lines.push(`export interface ${modelName}ListResponse {`);
  lines.push('  success: boolean;');
  lines.push('  data: {');
  lines.push(`    ${toCamelCase(tableName)}s: ${modelName}[];`);
  lines.push('    pagination: {');
  lines.push('      page: number;');
  lines.push('      limit: number;');
  lines.push('      total: number;');
  lines.push('      totalPages: number;');
  lines.push('    };');
  lines.push('  };');
  lines.push('}');
  lines.push('');
  lines.push('/**');
  lines.push(` * API error response`);
  lines.push(' */');
  lines.push('export interface ApiErrorResponse {');
  lines.push('  success: false;');
  lines.push('  error: {');
  lines.push('    code: string;');
  lines.push('    message: string;');
  lines.push('    details?: Record<string, string>;');
  lines.push('  };');
  lines.push('}');
  
  return {
    name: `${modelName}Response`,
    content: lines.join('\n'),
    isExport: config.exportAll ?? true,
    dependencies: [modelName],
  };
}

/**
 * Generate type with relations
 */
function generateWithRelations(
  tableName: string,
  fields: UnifiedField[],
  config: TypeScriptGeneratorConfig
): TypeScriptType {
  const modelName = toPrismaModelName(tableName);
  const lines: string[] = [];
  const dependencies: string[] = [modelName];
  
  // Find FK fields
  const fkFields = fields.filter(f => f.fkIsForeignKey && f.fkReferencedTable);
  
  if (fkFields.length === 0) {
    // No relations, just return the base type
    return {
      name: `${modelName}WithRelations`,
      content: `export type ${modelName}WithRelations = ${modelName};`,
      isExport: config.exportAll ?? true,
      dependencies,
    };
  }
  
  lines.push('/**');
  lines.push(` * ${modelName} with loaded relations`);
  lines.push(' */');
  lines.push(`export interface ${modelName}WithRelations extends ${modelName} {`);
  
  for (const fkField of fkFields) {
    const refModel = toPrismaModelName(fkField.fkReferencedTable!);
    const optional = fkField.schemaIsNullable ? '?' : '';
    dependencies.push(refModel);
    
    lines.push(`  ${toCamelCase(fkField.fkReferencedTable!)}${optional}: ${refModel};`);
  }
  
  lines.push('}');
  
  return {
    name: `${modelName}WithRelations`,
    content: lines.join('\n'),
    isExport: config.exportAll ?? true,
    dependencies,
  };
}

/**
 * Get TypeScript type for a field
 */
function getFieldType(field: UnifiedField, dependencies: string[]): string {
  // If it's an FK, use the referenced model type
  if (field.fkIsForeignKey && field.fkReferencedTable) {
    const refModel = toPrismaModelName(field.fkReferencedTable);
    dependencies.push(refModel);
    return field.schemaIsNullable ? `${refModel} | null` : refModel;
  }
  
  // Use base TypeScript type
  let tsType = getTypeScriptType(field.schemaDataType || 'VARCHAR');
  
  // Apply semantic type overrides
  if (field.intelSemanticType) {
    tsType = getSemanticTypeOverride(field.intelSemanticType, tsType);
  }
  
  // Handle nullable
  if (field.schemaIsNullable && tsType !== 'any') {
    tsType = config.useNullish ? `${tsType} | null | undefined` : `${tsType} | null`;
  }
  
  return tsType;
}

/**
 * Get type override based on semantic type
 */
function getSemanticTypeOverride(semanticType: string, baseType: string): string {
  const overrides: Record<string, string> = {
    'status': 'string',
    'active': 'boolean',
    'email': 'string',
    'phone': 'string',
    'url': 'string',
    'json': 'Record<string, any>',
    'array': 'any[]',
    'object': 'Record<string, any>',
  };
  
  return overrides[semanticType.toLowerCase()] || baseType;
}

/**
 * Build the complete file content
 */
function buildFileContent(
  types: TypeScriptType[],
  config: TypeScriptGeneratorConfig
): string {
  const lines: string[] = [];
  
  // Header
  lines.push('/**');
  lines.push(' * Auto-generated TypeScript Types');
  lines.push(' * Generated by AI Enterprise Architect');
  lines.push(` * Generated at: ${new Date().toISOString()}`);
  lines.push(' * Do not edit manually - changes will be overwritten');
  lines.push(' */');
  lines.push('');
  
  // Imports
  const allDeps = new Set<string>();
  for (const type of types) {
    for (const dep of type.dependencies) {
      if (!types.find(t => t.name === dep)) {
        allDeps.add(dep);
      }
    }
  }
  
  if (allDeps.size > 0 && config.includeRelations) {
    lines.push('// Relations may import types from other files');
    lines.push('// import type { ... } from "./relations";');
    lines.push('');
  }
  
  // Types grouped by model
  const groupedTypes = groupTypesByModel(types);
  
  for (const [modelName, modelTypes] of Object.entries(groupedTypes)) {
    lines.push(`// ═════════════════════════════════════════════════════════════════`);
    lines.push(`// ${modelName.toUpperCase()}`);
    lines.push(`// ═════════════════════════════════════════════════════════════════`);
    lines.push('');
    
    for (const type of modelTypes) {
      lines.push(type.content);
      lines.push('');
    }
  }
  
  return lines.join('\n');
}

/**
 * Group types by their base model name
 */
function groupTypesByModel(types: TypeScriptType[]): Record<string, TypeScriptType[]> {
  const groups: Record<string, TypeScriptType[]> = {};
  
  for (const type of types) {
    // Extract base model name
    const baseName = type.name
      .replace('Create', '')
      .replace('Update', '')
      .replace('Query', '')
      .replace('Response', '')
      .replace('ListResponse', '')
      .replace('WithRelations', '')
      .replace('PaginatedResult', '')
      .replace('DTO', '');
    
    if (!groups[baseName]) {
      groups[baseName] = [];
    }
    groups[baseName].push(type);
  }
  
  return groups;
}

// ══════════════════════════════════════════════════════════════════════════════
// SINGLE MODEL GENERATOR
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Generate types for a single table
 */
export async function generateModelTypeScript(
  projectId: string,
  tableName: string,
  config: Partial<TypeScriptGeneratorConfig> = {}
): Promise<{ types: TypeScriptType[]; content: string; errors: string[] }> {
  const fullConfig: TypeScriptGeneratorConfig = {
    projectId,
    tableName,
    ...config,
  };
  
  const fields = await prisma.unifiedField.findMany({
    where: { projectId, tableName },
    orderBy: { displayOrder: 'asc' },
  });
  
  const types = generateModelTypes(tableName, fields, fullConfig);
  const content = buildFileContent(types, fullConfig);
  
  return { types, content, errors: [] };
}
