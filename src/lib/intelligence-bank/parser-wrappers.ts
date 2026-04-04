/**
 * Parser Wrappers for Unified Intelligence Bank
 * 
 * These wrappers connect the existing parsers (SQL, CSHTML, SP, etc.)
 * to the Unified Intelligence Bank, ensuring all extracted intelligence
 * is stored in a single, queryable location.
 * 
 * Flow:
 *   User Upload → Parser → Wrapper → UnifiedField
 */

import { prisma } from '@/lib/db';
import {
  enrichFromSQL,
  enrichFromCSHTML,
  enrichFromIntelligence,
  enrichFromFKResolver,
  enrichFromCompliance,
  calculateFieldEnrichment,
  updateField,
  getField,
  createField,
  upsertTable,
  updateTableStatistics,
} from './unified-bank';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface ParseResult {
  success: boolean;
  projectId: string;
  tablesProcessed: number;
  fieldsProcessed: number;
  errors: string[];
  warnings: string[];
}

export interface SQLParseInput {
  projectId: string;
  sqlContent: string;
  fileName?: string;
}

export interface CSHTMLParseInput {
  projectId: string;
  cshtmlContent: string;
  fileName?: string;
  linkedTable?: string; // The main table this CSHTML is for
}

// ══════════════════════════════════════════════════════════════════════════════
// SQL PARSER WRAPPER
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Parse SQL DDL and store in Unified Intelligence Bank
 * 
 * This wrapper:
 * 1. Calls the existing SQL parser
 * 2. Transforms output to UnifiedField format
 * 3. Stores in database
 */
export async function parseSQLAndStore(input: SQLParseInput): Promise<ParseResult> {
  const result: ParseResult = {
    success: false,
    projectId: input.projectId,
    tablesProcessed: 0,
    fieldsProcessed: 0,
    errors: [],
    warnings: [],
  };
  
  try {
    // Import the existing SQL parser
    const { parseSQL } = await import('@/lib/sql-parser');
    
    // Parse the SQL
    const parsed = parseSQL(input.sqlContent);
    
    if (!parsed || !parsed.tables || parsed.tables.length === 0) {
      result.warnings.push('No tables found in SQL content');
      result.success = true;
      return result;
    }
    
    // Process each table
    for (const table of parsed.tables) {
      try {
        // Create/update the UnifiedTable
        await upsertTable(input.projectId, table.name, {
          schemaName: table.schema || 'dbo',
        });
        
        // Process each column
        for (let i = 0; i < table.columns.length; i++) {
          const column = table.columns[i];
          
          // Map SQL type to base type
          const baseType = mapSQLToBaseType(column.dataType);
          
          // Enrich the field with SQL data
          await enrichFromSQL(
            input.projectId,
            table.name,
            column.name,
            {
              schemaDataType: column.dataType,
              schemaBaseType: baseType,
              schemaMaxLength: column.maxLength,
              schemaPrecision: column.precision,
              schemaScale: column.scale,
              schemaIsNullable: column.nullable ?? true,
              schemaIsPrimaryKey: column.isPrimaryKey ?? false,
              schemaIsIdentity: column.isIdentity ?? false,
              schemaIsComputed: column.isComputed ?? false,
              schemaDefaultValue: column.defaultValue,
              schemaCheckConstraint: null,
              schemaSource: input.fileName || 'sql_upload',
              schemaConfidence: 1.0, // Direct parse = high confidence
            },
            i // displayOrder
          );
          
          // Handle foreign keys
          if (column.foreignKey) {
            await enrichFromFKResolver(
              input.projectId,
              table.name,
              column.name,
              {
                fkIsForeignKey: true,
                fkReferencedTable: column.foreignKey.referencedTable,
                fkReferencedColumn: column.foreignKey.referencedColumn || 'Id',
                fkTableExists: false, // Will be checked later
                fkRelationshipType: column.foreignKey.relationshipType || 'many-to-one',
                fkOnDelete: column.foreignKey.onDelete,
                fkOnUpdate: column.foreignKey.onUpdate,
                fkResolutionStatus: 'pending',
                fkCascadeChain: '[]',
                fkSources: JSON.stringify({ source: 'ddl_explicit' }),
                fkConfidence: 1.0,
              }
            );
          }
          
          result.fieldsProcessed++;
        }
        
        // Update table statistics
        await updateTableStatistics(input.projectId, table.name);
        
        result.tablesProcessed++;
        
      } catch (tableError: any) {
        result.errors.push(`Error processing table ${table.name}: ${tableError.message}`);
      }
    }
    
    result.success = result.errors.length === 0;
    
  } catch (error: any) {
    result.errors.push(`SQL parsing error: ${error.message}`);
  }
  
  return result;
}

/**
 * Map SQL data types to TypeScript base types
 */
function mapSQLToBaseType(sqlType: string): string {
  const upper = sqlType.toUpperCase();
  
  // Integer types
  if (['INT', 'INTEGER', 'BIGINT', 'SMALLINT', 'TINYINT', 'BIT'].includes(upper)) {
    return upper === 'BIT' ? 'boolean' : 'number';
  }
  
  // Decimal types
  if (['DECIMAL', 'NUMERIC', 'MONEY', 'SMALLMONEY', 'FLOAT', 'REAL'].includes(upper)) {
    return 'number';
  }
  
  // Date types
  if (['DATE', 'DATETIME', 'DATETIME2', 'SMALLDATETIME', 'TIME', 'DATETIMEOFFSET'].includes(upper)) {
    return 'Date';
  }
  
  // String types
  if (['VARCHAR', 'NVARCHAR', 'CHAR', 'NCHAR', 'TEXT', 'NTEXT', 'XML'].includes(upper)) {
    return 'string';
  }
  
  // Unique identifier
  if (upper === 'UNIQUEIDENTIFIER') {
    return 'string';
  }
  
  // Binary types
  if (['VARBINARY', 'BINARY', 'IMAGE'].includes(upper)) {
    return 'Buffer';
  }
  
  return 'string'; // Default to string
}

// ══════════════════════════════════════════════════════════════════════════════
// CSHTML PARSER WRAPPER
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Parse CSHTML and store in Unified Intelligence Bank
 * 
 * This wrapper:
 * 1. Calls the existing CSHTML parser
 * 2. Transforms output to UnifiedField format
 * 3. Stores in database
 */
export async function parseCSHTMLAndStore(input: CSHTMLParseInput): Promise<ParseResult> {
  const result: ParseResult = {
    success: false,
    projectId: input.projectId,
    tablesProcessed: 0,
    fieldsProcessed: 0,
    errors: [],
    warnings: [],
  };
  
  try {
    // Import the existing CSHTML parser
    const { parseCSHTML } = await import('@/lib/cshtml-parser');
    
    // Parse the CSHTML
    const parsed = parseCSHTML(input.cshtmlContent);
    
    if (!parsed || !parsed.fields || parsed.fields.length === 0) {
      result.warnings.push('No fields found in CSHTML content');
      result.success = true;
      return result;
    }
    
    // Determine the linked table
    const tableName = input.linkedTable || parsed.linkedTable || extractTableFromViewName(input.fileName);
    
    if (!tableName) {
      result.warnings.push('Could not determine linked table for CSHTML');
      result.success = true;
      return result;
    }
    
    // Process each field
    for (let i = 0; i < parsed.fields.length; i++) {
      const field = parsed.fields[i];
      const fieldName = field.name || field.id;
      
      if (!fieldName) continue;
      
      try {
        // Build CSHTML data for enrichment
        const cshtmlData = {
          uiComponentType: mapCSHTMLToComponent(field.type),
          uiHtmlInputType: field.type,
          uiRenderAs: field.renderAs,
          uiGridWidth: field.gridWidth || 'col-md-6',
          uiLabelPosition: 'left',
          uiGroupName: field.group,
          uiTabName: field.tab,
          uiSectionName: field.section,
          uiIsHidden: field.isHidden ?? false,
          uiIsReadOnly: field.isReadonly ?? false,
          uiIsDisabled: field.isDisabled ?? false,
          uiConditionalDisplay: field.conditionalDisplay,
          uiDropdownConfig: field.dropdownConfig ? JSON.stringify(field.dropdownConfig) : null,
          uiDateConfig: field.dateConfig ? JSON.stringify(field.dateConfig) : null,
          uiFileConfig: field.fileConfig ? JSON.stringify(field.fileConfig) : null,
          uiConfidence: 0.8,
          
          validationIsRequired: field.required ?? false,
          validationClientRules: field.validationRules ? JSON.stringify(field.validationRules) : '[]',
          validationConfidence: 0.7,
          
          cshtmlFoundInViews: JSON.stringify([{ viewName: input.fileName, fieldName }]),
          cshtmlAjaxEndpoints: field.ajaxEndpoints ? JSON.stringify(field.ajaxEndpoints) : '[]',
          cshtmlJsValidation: field.jsValidation ? JSON.stringify(field.jsValidation) : '[]',
          cshtmlCssClasses: field.cssClasses ? JSON.stringify(field.cssClasses) : '[]',
          cshtmlInlineStyles: field.inlineStyles ? JSON.stringify(field.inlineStyles) : '[]',
          cshtmlDataAttributes: field.dataAttributes ? JSON.stringify(field.dataAttributes) : '{}',
        };
        
        await enrichFromCSHTML(
          input.projectId,
          tableName,
          fieldName,
          cshtmlData
        );
        
        result.fieldsProcessed++;
        
      } catch (fieldError: any) {
        result.errors.push(`Error processing field ${fieldName}: ${fieldError.message}`);
      }
    }
    
    // Update table statistics
    if (tableName) {
      await updateTableStatistics(input.projectId, tableName);
    }
    
    result.success = result.errors.length === 0;
    
  } catch (error: any) {
    result.errors.push(`CSHTML parsing error: ${error.message}`);
  }
  
  return result;
}

/**
 * Extract table name from CSHTML file name
 * e.g., "Organization.cshtml" → "Organization"
 */
function extractTableFromViewName(fileName?: string): string | null {
  if (!fileName) return null;
  
  // Remove path and extension
  const baseName = fileName.split('/').pop()?.split('\\').pop()?.replace('.cshtml', '');
  
  return baseName || null;
}

/**
 * Map CSHTML input types to component types
 */
function mapCSHTMLToComponent(cshtmlType: string): string {
  const typeMap: Record<string, string> = {
    'text': 'text_input',
    'password': 'password_input',
    'email': 'email_input',
    'number': 'number_input',
    'tel': 'phone_input',
    'url': 'url_input',
    'date': 'date_picker',
    'datetime-local': 'datetime_picker',
    'time': 'time_picker',
    'checkbox': 'checkbox',
    'radio': 'radio_group',
    'select': 'dropdown',
    'textarea': 'textarea',
    'file': 'file_upload',
    'hidden': 'hidden_field',
  };
  
  return typeMap[cshtmlType] || 'text_input';
}

// ══════════════════════════════════════════════════════════════════════════════
// COLUMN INTELLIGENCE WRAPPER
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Run Column Intelligence on all fields and store results
 * 
 * This wrapper:
 * 1. Gets all fields for a project
 * 2. Runs column intelligence on each
 * 3. Stores results in UnifiedField
 */
export async function runColumnIntelligenceAndStore(projectId: string): Promise<ParseResult> {
  const result: ParseResult = {
    success: false,
    projectId,
    tablesProcessed: 0,
    fieldsProcessed: 0,
    errors: [],
    warnings: [],
  };
  
  try {
    // Import the column intelligence module
    const { analyzeColumn } = await import('@/lib/column-intelligence');
    
    // Get all fields for this project
    const fields = await prisma.unifiedField.findMany({
      where: { projectId },
    });
    
    const processedTables = new Set<string>();
    
    for (const field of fields) {
      try {
        // Skip fields that already have intelligence
        if (field.intelSemanticType && field.intelConfidence >= 0.8) {
          continue;
        }
        
        // Analyze the column
        const analysis = analyzeColumn(field.fieldName, field.schemaDataType || undefined);
        
        // Enrich with intelligence
        await enrichFromIntelligence(
          projectId,
          field.tableName,
          field.fieldName,
          {
            intelSemanticType: analysis.semanticType,
            intelSemanticCategory: analysis.category,
            intelBusinessMeaning: analysis.businessMeaning,
            intelDataPattern: analysis.dataPattern,
            intelExampleValues: analysis.examples ? JSON.stringify(analysis.examples) : '[]',
            intelSuggestedLabel: analysis.suggestedLabel,
            intelSuggestedPlaceholder: analysis.suggestedPlaceholder,
            intelSuggestedHelpText: analysis.suggestedHelpText,
            intelIsSystemField: analysis.isSystemField,
            intelIsAuditField: analysis.isAuditField,
            intelIsCalculated: analysis.isCalculated,
            intelConfidence: analysis.confidence || 0.6,
          }
        );
        
        processedTables.add(field.tableName);
        result.fieldsProcessed++;
        
      } catch (fieldError: any) {
        result.errors.push(`Error analyzing ${field.qualifiedName}: ${fieldError.message}`);
      }
    }
    
    // Update statistics for all processed tables
    for (const tableName of processedTables) {
      await updateTableStatistics(projectId, tableName);
    }
    
    result.tablesProcessed = processedTables.size;
    result.success = true;
    
  } catch (error: any) {
    result.errors.push(`Column intelligence error: ${error.message}`);
  }
  
  return result;
}

// ══════════════════════════════════════════════════════════════════════════════
// FK RESOLVER WRAPPER
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Run FK Resolver on all fields and store results
 * 
 * This wrapper:
 * 1. Gets all FK fields for a project
 * 2. Checks if referenced tables exist
 * 3. Updates FK resolution status
 */
export async function runFKResolverAndStore(projectId: string): Promise<ParseResult> {
  const result: ParseResult = {
    success: false,
    projectId,
    tablesProcessed: 0,
    fieldsProcessed: 0,
    errors: [],
    warnings: [],
  };
  
  try {
    // Import the FK resolver
    const { resolveFKs } = await import('@/lib/fk-resolver');
    
    // Get all tables for this project
    const tables = await prisma.toolkitTable.findMany({
      where: { projectId },
    });
    
    // Get all fields that are FKs or potential FKs
    const fields = await prisma.unifiedField.findMany({
      where: {
        projectId,
        OR: [
          { fkIsForeignKey: true },
          { fieldName: { endsWith: 'Id' } },
        ],
      },
    });
    
    // Build list of known tables
    const knownTables = new Set(tables.map(t => t.tableName));
    
    const processedTables = new Set<string>();
    
    for (const field of fields) {
      try {
        // If already marked as FK with table exists, skip
        if (field.fkIsForeignKey && field.fkTableExists) {
          continue;
        }
        
        // Determine referenced table
        let referencedTable = field.fkReferencedTable;
        let confidence = field.fkConfidence;
        
        if (!referencedTable && field.fieldName.endsWith('Id')) {
          // Infer from field name
          referencedTable = field.fieldName.replace(/Id$/, '');
          confidence = 0.6; // Lower confidence for inferred
        }
        
        if (!referencedTable) {
          continue; // Not an FK
        }
        
        // Check if table exists
        const tableExists = knownTables.has(referencedTable);
        
        // Update the field
        await enrichFromFKResolver(
          projectId,
          field.tableName,
          field.fieldName,
          {
            fkIsForeignKey: true,
            fkReferencedTable: referencedTable,
            fkReferencedColumn: 'Id', // Standard assumption
            fkTableExists: tableExists,
            fkRelationshipType: 'many-to-one',
            fkOnDelete: null,
            fkOnUpdate: null,
            fkResolutionStatus: tableExists ? 'resolved' : 'missing_table',
            fkCascadeChain: '[]',
            fkSources: JSON.stringify({ source: field.fkIsForeignKey ? 'ddl' : 'inferred' }),
            fkConfidence: confidence,
          }
        );
        
        processedTables.add(field.tableName);
        result.fieldsProcessed++;
        
      } catch (fieldError: any) {
        result.errors.push(`Error resolving FK for ${field.qualifiedName}: ${fieldError.message}`);
      }
    }
    
    // Update statistics
    for (const tableName of processedTables) {
      await updateTableStatistics(projectId, tableName);
    }
    
    result.tablesProcessed = processedTables.size;
    result.success = true;
    
  } catch (error: any) {
    result.errors.push(`FK resolver error: ${error.message}`);
  }
  
  return result;
}

// ══════════════════════════════════════════════════════════════════════════════
// COMPLIANCE WRAPPER
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Run PII/PHI detection on all fields and store results
 * 
 * This wrapper:
 * 1. Gets all fields for a project
 * 2. Runs PII/PHI detection
 * 3. Stores compliance flags in UnifiedField
 */
export async function runComplianceScanAndStore(projectId: string): Promise<ParseResult> {
  const result: ParseResult = {
    success: false,
    projectId,
    tablesProcessed: 0,
    fieldsProcessed: 0,
    errors: [],
    warnings: [],
  };
  
  try {
    // Import the PII/PHI detector
    const { detectPIIPHI } = await import('@/lib/pii-phi-detector');
    
    // Get all fields for this project
    const fields = await prisma.unifiedField.findMany({
      where: { projectId },
    });
    
    const processedTables = new Set<string>();
    
    for (const field of fields) {
      try {
        // Skip fields already scanned with high confidence
        if (field.compConfidence >= 0.9) {
          continue;
        }
        
        // Detect PII/PHI
        const analysis = detectPIIPHI(field.fieldName, {
          dataType: field.schemaDataType || undefined,
          tableName: field.tableName,
        });
        
        // Determine sensitivity level
        let sensitivityLevel = 'public';
        if (analysis.isPHI) {
          sensitivityLevel = 'restricted';
        } else if (analysis.isPII) {
          sensitivityLevel = 'confidential';
        } else if (field.intelSemanticType === 'financial') {
          sensitivityLevel = 'internal';
        }
        
        // Enrich with compliance data
        await enrichFromCompliance(
          projectId,
          field.tableName,
          field.fieldName,
          {
            compSensitivityLevel: sensitivityLevel,
            compIsPII: analysis.isPII,
            compIsPHI: analysis.isPHI,
            compIsFinancial: field.intelSemanticType === 'financial',
            compPiiCategory: analysis.piiCategory,
            compPhiCategory: analysis.phiCategory,
            compRequiresEncryption: analysis.isPII || analysis.isPHI,
            compRequiresMasking: analysis.isPII,
            compMaskingPattern: analysis.maskingPattern,
            compRetentionPolicy: analysis.retentionPolicy,
            compConsentRequired: analysis.isPHI,
            compAuditRequired: analysis.isPHI,
            compAccessRestrictions: analysis.accessRestrictions ? JSON.stringify(analysis.accessRestrictions) : '[]',
            compRegulatoryFrameworks: analysis.regulations ? JSON.stringify(analysis.regulations) : '[]',
            compConfidence: analysis.confidence || 0.8,
          }
        );
        
        processedTables.add(field.tableName);
        result.fieldsProcessed++;
        
      } catch (fieldError: any) {
        result.errors.push(`Error scanning ${field.qualifiedName}: ${fieldError.message}`);
      }
    }
    
    // Update statistics
    for (const tableName of processedTables) {
      await updateTableStatistics(projectId, tableName);
    }
    
    result.tablesProcessed = processedTables.size;
    result.success = true;
    
  } catch (error: any) {
    result.errors.push(`Compliance scan error: ${error.message}`);
  }
  
  return result;
}

// ══════════════════════════════════════════════════════════════════════════════
// FULL PIPELINE RUNNER
// ══════════════════════════════════════════════════════════════════════════════

export interface PipelineRunResult {
  success: boolean;
  projectId: string;
  steps: {
    name: string;
    success: boolean;
    fieldsProcessed: number;
    duration: number;
    errors: string[];
  }[];
  totalFieldsProcessed: number;
  totalDuration: number;
  errors: string[];
}

/**
 * Run the full enrichment pipeline on a project
 * 
 * Pipeline order:
 * 1. SQL Parser (if SQL files exist)
 * 2. Column Intelligence
 * 3. FK Resolver
 * 4. Compliance Scan
 * 5. (Optional) CSHTML Parser (if CSHTML files exist)
 */
export async function runFullPipeline(projectId: string): Promise<PipelineRunResult> {
  const startTime = Date.now();
  const result: PipelineRunResult = {
    success: false,
    projectId,
    steps: [],
    totalFieldsProcessed: 0,
    totalDuration: 0,
    errors: [],
  };
  
  // Step 1: Column Intelligence
  let stepStart = Date.now();
  let stepResult = await runColumnIntelligenceAndStore(projectId);
  result.steps.push({
    name: 'Column Intelligence',
    success: stepResult.success,
    fieldsProcessed: stepResult.fieldsProcessed,
    duration: Date.now() - stepStart,
    errors: stepResult.errors,
  });
  result.totalFieldsProcessed += stepResult.fieldsProcessed;
  
  // Step 2: FK Resolver
  stepStart = Date.now();
  stepResult = await runFKResolverAndStore(projectId);
  result.steps.push({
    name: 'FK Resolver',
    success: stepResult.success,
    fieldsProcessed: stepResult.fieldsProcessed,
    duration: Date.now() - stepStart,
    errors: stepResult.errors,
  });
  result.totalFieldsProcessed += stepResult.fieldsProcessed;
  
  // Step 3: Compliance Scan
  stepStart = Date.now();
  stepResult = await runComplianceScanAndStore(projectId);
  result.steps.push({
    name: 'Compliance Scan',
    success: stepResult.success,
    fieldsProcessed: stepResult.fieldsProcessed,
    duration: Date.now() - stepStart,
    errors: stepResult.errors,
  });
  result.totalFieldsProcessed += stepResult.fieldsProcessed;
  
  // Finalize
  result.totalDuration = Date.now() - startTime;
  result.success = result.steps.every(s => s.success);
  result.errors = result.steps.flatMap(s => s.errors);
  
  return result;
}
