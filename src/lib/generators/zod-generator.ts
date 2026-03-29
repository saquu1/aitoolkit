/**
 * Zod Schema Generator
 * 
 * Generates Zod validation schemas from Unified Intelligence Bank.
 * 
 * Features:
 * - Type validation from SQL types
 * - Required/optional from nullable
 * - String length constraints
 * - Pattern validation from semantic types
 * - Custom validation messages
 * - Cross-field validation support
 */

import { prisma } from '@/lib/db';
import {
  getZodType,
  toPrismaModelName,
  toCamelCase,
  getValidationPattern,
} from './type-mappings';
import type { UnifiedField } from '@prisma/client';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface ZodGeneratorConfig {
  projectId: string;
  tableName?: string;
  includeCreateSchema?: boolean;
  includeUpdateSchema?: boolean;
  includeIdSchema?: boolean;
  includeMessages?: boolean;
  strict?: boolean; // Use .strict() on objects
}

export interface ZodSchema {
  name: string;
  content: string;
  isExport: boolean;
  dependencies: string[];
}

export interface ZodGenerationResult {
  schemas: ZodSchema[];
  content: string;
  errors: string[];
  warnings: string[];
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN GENERATOR
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Generate Zod schemas from Unified Intelligence Bank
 */
export async function generateZodSchemas(
  config: ZodGeneratorConfig
): Promise<ZodGenerationResult> {
  const result: ZodGenerationResult = {
    schemas: [],
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
    
    // Generate schemas for each table
    for (const [tableName, tableFields] of Object.entries(tableGroups)) {
      try {
        const modelSchemas = generateModelSchemas(tableName, tableFields, config);
        result.schemas.push(...modelSchemas);
      } catch (error: any) {
        result.errors.push(`Error generating schemas for ${tableName}: ${error.message}`);
      }
    }
    
    // Build combined content
    result.content = buildFileContent(result.schemas, config);
    
  } catch (error: any) {
    result.errors.push(`Zod generation error: ${error.message}`);
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
 * Generate all schemas for a single model
 */
function generateModelSchemas(
  tableName: string,
  fields: UnifiedField[],
  config: ZodGeneratorConfig
): ZodSchema[] {
  const schemas: ZodSchema[] = [];
  const modelName = toPrismaModelName(tableName);
  
  // 1. Base schema (all fields)
  schemas.push(generateBaseSchema(tableName, fields, config));
  
  // 2. Create schema (without id/timestamps)
  if (config.includeCreateSchema) {
    schemas.push(generateCreateSchema(tableName, fields, config));
  }
  
  // 3. Update schema (partial with id)
  if (config.includeUpdateSchema) {
    schemas.push(generateUpdateSchema(tableName, fields, config));
  }
  
  // 4. ID schema (just the primary key)
  if (config.includeIdSchema) {
    schemas.push(generateIdSchema(tableName, fields, config));
  }
  
  return schemas;
}

/**
 * Generate base schema with all fields
 */
function generateBaseSchema(
  tableName: string,
  fields: UnifiedField[],
  config: ZodGeneratorConfig
): ZodSchema {
  const modelName = toPrismaModelName(tableName);
  const camelName = toCamelCase(tableName);
  const lines: string[] = [];
  const dependencies: string[] = [];
  
  lines.push('/**');
  lines.push(` * Zod schema for ${modelName}`);
  lines.push(' */');
  lines.push(`export const ${camelName}Schema = z.object({`);
  
  for (const field of fields) {
    const fieldSchema = buildFieldSchema(field, config, dependencies);
    lines.push(`  ${toCamelCase(field.fieldName)}: ${fieldSchema},`);
  }
  
  // Add audit fields
  lines.push('  createdAt: z.coerce.date(),');
  lines.push('  updatedAt: z.coerce.date(),');
  
  if (config.strict) {
    lines.push('})');
    lines.push('  .strict();');
  } else {
    lines.push('});');
  }
  
  // Export type
  lines.push('');
  lines.push(`export type ${modelName} = z.infer<typeof ${camelName}Schema>;`);
  
  return {
    name: `${camelName}Schema`,
    content: lines.join('\n'),
    isExport: true,
    dependencies,
  };
}

/**
 * Generate create schema
 */
function generateCreateSchema(
  tableName: string,
  fields: UnifiedField[],
  config: ZodGeneratorConfig
): ZodSchema {
  const modelName = toPrismaModelName(tableName);
  const camelName = toCamelCase(tableName);
  const lines: string[] = [];
  const dependencies: string[] = [`${camelName}Schema`];
  
  lines.push('/**');
  lines.push(` * Zod schema for creating ${modelName}`);
  lines.push(' */');
  lines.push(`export const create${modelName}Schema = z.object({`);
  
  for (const field of fields) {
    // Skip auto-generated fields
    if (field.schemaIsIdentity || field.schemaIsPrimaryKey) continue;
    if (field.intelIsAuditField) continue;
    
    const fieldSchema = buildFieldSchema(field, config, dependencies);
    lines.push(`  ${toCamelCase(field.fieldName)}: ${fieldSchema},`);
  }
  
  if (config.strict) {
    lines.push('})');
    lines.push('  .strict();');
  } else {
    lines.push('});');
  }
  
  lines.push('');
  lines.push(`export type Create${modelName} = z.infer<typeof create${modelName}Schema>;`);
  
  return {
    name: `create${modelName}Schema`,
    content: lines.join('\n'),
    isExport: true,
    dependencies,
  };
}

/**
 * Generate update schema
 */
function generateUpdateSchema(
  tableName: string,
  fields: UnifiedField[],
  config: ZodGeneratorConfig
): ZodSchema {
  const modelName = toPrismaModelName(tableName);
  const camelName = toCamelCase(tableName);
  const lines: string[] = [];
  const dependencies: string[] = [];
  
  lines.push('/**');
  lines.push(` * Zod schema for updating ${modelName}`);
  lines.push(' */');
  lines.push(`export const update${modelName}Schema = z.object({`);
  
  // Id is required
  const pkField = fields.find(f => f.schemaIsPrimaryKey);
  if (pkField) {
    const fieldSchema = buildFieldSchema(pkField, config, dependencies);
    lines.push(`  ${toCamelCase(pkField.fieldName)}: ${fieldSchema},`);
  }
  
  // All other fields are optional partial
  for (const field of fields) {
    if (field.schemaIsPrimaryKey) continue;
    if (field.intelIsAuditField) continue;
    
    const fieldSchema = buildFieldSchema(field, config, dependencies);
    lines.push(`  ${toCamelCase(field.fieldName)}: ${fieldSchema}.optional(),`);
  }
  
  if (config.strict) {
    lines.push('})');
    lines.push('  .strict();');
  } else {
    lines.push('});');
  }
  
  lines.push('');
  lines.push(`export type Update${modelName} = z.infer<typeof update${modelName}Schema>;`);
  
  return {
    name: `update${modelName}Schema`,
    content: lines.join('\n'),
    isExport: true,
    dependencies,
  };
}

/**
 * Generate ID schema
 */
function generateIdSchema(
  tableName: string,
  fields: UnifiedField[],
  config: ZodGeneratorConfig
): ZodSchema {
  const modelName = toPrismaModelName(tableName);
  const camelName = toCamelCase(tableName);
  const lines: string[] = [];
  const dependencies: string[] = [];
  
  const pkField = fields.find(f => f.schemaIsPrimaryKey);
  
  if (!pkField) {
    return {
      name: `${camelName}IdSchema`,
      content: `// No primary key found for ${modelName}`,
      isExport: false,
      dependencies: [],
    };
  }
  
  lines.push('/**');
  lines.push(` * Zod schema for ${modelName} ID`);
  lines.push(' */');
  lines.push(`export const ${camelName}IdSchema = z.object({`);
  
  const fieldSchema = buildFieldSchema(pkField, config, dependencies);
  lines.push(`  ${toCamelCase(pkField.fieldName)}: ${fieldSchema},`);
  lines.push('});');
  
  lines.push('');
  lines.push(`export type ${modelName}Id = z.infer<typeof ${camelName}IdSchema>;`);
  
  return {
    name: `${camelName}IdSchema`,
    content: lines.join('\n'),
    isExport: true,
    dependencies,
  };
}

/**
 * Build field schema string
 */
function buildFieldSchema(
  field: UnifiedField,
  config: ZodGeneratorConfig,
  dependencies: string[]
): string {
  // Start with base Zod type
  let schema = getZodType(field.schemaDataType || 'VARCHAR');
  
  // Apply semantic validation
  if (field.intelSemanticType) {
    const pattern = getValidationPattern(field.intelSemanticType);
    if (pattern) {
      schema = pattern.zodMethod;
    }
  }
  
  // Apply CSHTML validation rules if available
  if (field.validationClientRules && field.validationClientRules !== '[]') {
    schema = applyCSHTMLValidation(schema, field, config);
  }
  
  // Apply length constraints
  if (field.schemaMaxLength) {
    if (schema.includes('z.string()')) {
      schema = schema.replace('z.string()', `z.string().max(${field.schemaMaxLength})`);
    }
  }
  
  // Handle nullable
  if (field.schemaIsNullable) {
    schema = `${schema}.nullable()`;
  } else {
    // Required field - could add message
    if (config.includeMessages) {
      const message = `${field.fieldName} is required`;
      schema = schema.replace(')', `, { message: "${message}" })`);
    }
  }
  
  // Handle optional with default
  if (field.schemaDefaultValue && !field.schemaIsPrimaryKey) {
    const defaultVal = formatDefaultValue(field.schemaDefaultValue);
    schema = `${schema}.default(${defaultVal})`;
  }
  
  // Add description for documentation
  if (field.intelBusinessMeaning) {
    schema = `${schema}.describe("${field.intelBusinessMeaning}")`;
  }
  
  return schema;
}

/**
 * Apply CSHTML validation rules to schema
 */
function applyCSHTMLValidation(
  schema: string,
  field: UnifiedField,
  config: ZodGeneratorConfig
): string {
  try {
    const rules = JSON.parse(field.validationClientRules || '[]');
    
    for (const rule of rules) {
      switch (rule.type) {
        case 'required':
          // Already handled by nullable check
          break;
          
        case 'email':
          schema = schema.replace('z.string()', 'z.string().email()');
          break;
          
        case 'digits':
          schema = schema.replace('z.string()', 'z.string().regex(/^\\d+$/)');
          break;
          
        case 'min':
          if (rule.value && schema.includes('z.string()')) {
            schema = schema.replace('z.string()', `z.string().min(${rule.value})`);
          }
          break;
          
        case 'max':
          if (rule.value && schema.includes('z.string()')) {
            schema = schema.replace('z.string()', `z.string().max(${rule.value})`);
          }
          break;
          
        case 'pattern':
        case 'regexp':
          if (rule.value) {
            // Convert regex pattern
            const pattern = rule.value.replace(/\//g, '\\/');
            schema = schema.replace('z.string()', `z.string().regex(/${pattern}/)`);
          }
          break;
          
        case 'remote':
        case 'unique':
          // Can't validate remotely in Zod - need custom refinement
          schema = `${schema}.refine(async (val) => {
            // Remote validation placeholder
            return true;
          }, { message: "${field.fieldName} validation failed" })`;
          break;
      }
    }
  } catch (e) {
    // Invalid JSON, skip CSHTML rules
  }
  
  return schema;
}

/**
 * Format default value for Zod
 */
function formatDefaultValue(value: string): string {
  // Check for function calls
  if (value.toLowerCase().includes('getdate')) return 'new Date()';
  if (value.toLowerCase().includes('newid')) return 'crypto.randomUUID()';
  
  // Boolean
  if (value === '1' || value.toLowerCase() === 'true') return 'true';
  if (value === '0' || value.toLowerCase() === 'false') return 'false';
  
  // Number
  if (/^-?\d+(\.\d+)?$/.test(value)) return value;
  
  // String
  return `"${value.replace(/'/g, '')}"`;
}

/**
 * Build the complete file content
 */
function buildFileContent(
  schemas: ZodSchema[],
  config: ZodGeneratorConfig
): string {
  const lines: string[] = [];
  
  // Header
  lines.push('/**');
  lines.push(' * Auto-generated Zod Validation Schemas');
  lines.push(' * Generated by AI Enterprise Architect');
  lines.push(` * Generated at: ${new Date().toISOString()}`);
  lines.push(' * Do not edit manually - changes will be overwritten');
  lines.push(' */');
  lines.push('');
  
  // Import
  lines.push("import { z } from 'zod';");
  lines.push('');
  
  // Group by model
  const groupedSchemas = groupSchemasByModel(schemas);
  
  for (const [modelName, modelSchemas] of Object.entries(groupedSchemas)) {
    lines.push(`// ═════════════════════════════════════════════════════════════════`);
    lines.push(`// ${modelName.toUpperCase()}`);
    lines.push(`// ═════════════════════════════════════════════════════════════════`);
    lines.push('');
    
    for (const schema of modelSchemas) {
      lines.push(schema.content);
      lines.push('');
    }
  }
  
  // Add helper functions
  lines.push('// ═════════════════════════════════════════════════════════════════');
  lines.push('// HELPER FUNCTIONS');
  lines.push('// ═════════════════════════════════════════════════════════════════');
  lines.push('');
  lines.push('/**');
  lines.push(' * Validate data against schema with detailed errors');
  lines.push(' */');
  lines.push('export function validateWithDetails<T>(');
  lines.push('  schema: z.ZodSchema<T>,');
  lines.push('  data: unknown');
  lines.push('): { success: boolean; data?: T; errors?: Record<string, string[]> } {');
  lines.push('  const result = schema.safeParse(data);');
  lines.push('  ');
  lines.push('  if (result.success) {');
  lines.push('    return { success: true, data: result.data };');
  lines.push('  }');
  lines.push('  ');
  lines.push('  const errors: Record<string, string[]> = {};');
  lines.push('  for (const issue of result.error.issues) {');
  lines.push('    const path = issue.path.join(".") || "_root";');
  lines.push('    if (!errors[path]) errors[path] = [];');
  lines.push('    errors[path].push(issue.message);');
  lines.push('  }');
  lines.push('  ');
  lines.push('  return { success: false, errors };');
  lines.push('}');
  lines.push('');
  
  return lines.join('\n');
}

/**
 * Group schemas by their base model name
 */
function groupSchemasByModel(schemas: ZodSchema[]): Record<string, ZodSchema[]> {
  const groups: Record<string, ZodSchema[]> = {};
  
  for (const schema of schemas) {
    // Extract base model name
    const baseName = schema.name
      .replace('Schema', '')
      .replace('create', '')
      .replace('update', '')
      .replace('Id', '');
    
    if (!groups[baseName]) {
      groups[baseName] = [];
    }
    groups[baseName].push(schema);
  }
  
  return groups;
}

// ══════════════════════════════════════════════════════════════════════════════
// SINGLE MODEL GENERATOR
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Generate schemas for a single table
 */
export async function generateModelZod(
  projectId: string,
  tableName: string,
  config: Partial<ZodGeneratorConfig> = {}
): Promise<{ schemas: ZodSchema[]; content: string; errors: string[] }> {
  const fullConfig: ZodGeneratorConfig = {
    projectId,
    tableName,
    includeCreateSchema: true,
    includeUpdateSchema: true,
    includeIdSchema: true,
    ...config,
  };
  
  const fields = await prisma.unifiedField.findMany({
    where: { projectId, tableName },
    orderBy: { displayOrder: 'asc' },
  });
  
  const schemas = generateModelSchemas(tableName, fields, fullConfig);
  const content = buildFileContent(schemas, fullConfig);
  
  return { schemas, content, errors: [] };
}
