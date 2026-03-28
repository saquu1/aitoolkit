// =============================================================================
// Gap Detection Module - Cross-Reference Intelligence Analyzer
// =============================================================================
// Detects mismatches between C# models, SQL tables, and CSHTML views
// Provides comprehensive gap analysis for migration planning
// =============================================================================

import {
  TableDef,
  ColumnDef,
  ForeignKeyDef,
  ValidationRule,
} from '../types';
import {
  CSharpParseResult,
  CSharpProperty,
  ValidationAttributeInfo,
} from './csharp-parser';
import {
  ParsedCSHTMLView,
  ParsedFormField,
  FieldValidation,
} from '../cshtml-parser';

// =============================================================================
// Gap Detection Types
// =============================================================================

/**
 * Gap Severity Level
 */
export type GapSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

/**
 * Gap Category
 */
export type GapCategory =
  | 'missing_table'        // Table exists in C#/CSHTML but not in SQL
  | 'missing_column'       // Column exists in C#/CSHTML but not in SQL
  | 'missing_fk'           // FK relationship missing in SQL
  | 'type_mismatch'        // Data type mismatch between layers
  | 'nullable_mismatch'    // Required/Nullable mismatch
  | 'length_mismatch'      // String length constraint mismatch
  | 'validation_gap'       // Validation exists in C# but not in SQL
  | 'ui_db_mismatch'       // UI field doesn't match DB column
  | 'orphan_field'         // Field in UI has no DB/Model backing
  | 'missing_validation'   // SQL constraint not reflected in C#/UI
  | 'compliance_risk'      // PII/PHI field missing encryption/protection
  | 'documentation_gap';   // Missing XML docs or comments

/**
 * Detected Gap
 */
export interface DetectedGap {
  id: string;
  category: GapCategory;
  severity: GapSeverity;
  title: string;
  description: string;
  
  // Source tracking
  source: {
    csharp?: CSharpGapSource;
    sql?: SQLGapSource;
    cshtml?: CSHTMLGapSource;
  };
  
  // Resolution
  resolution: GapResolution;
  
  // Impact
  impact: {
    tables: string[];
    fields: string[];
    operations: string[];
    migrationEffort: 'trivial' | 'simple' | 'moderate' | 'complex';
  };
  
  // Metadata
  confidence: number;
  autoFixable: boolean;
  detectedAt: Date;
}

/**
 * C# Gap Source
 */
export interface CSharpGapSource {
  file: string;
  className: string;
  propertyName?: string;
  lineNumber?: number;
  attribute?: string;
  value?: string;
}

/**
 * SQL Gap Source
 */
export interface SQLGapSource {
  tableName: string;
  columnName?: string;
  dataType?: string;
  constraint?: string;
  lineInDDL?: number;
}

/**
 * CSHTML Gap Source
 */
export interface CSHTMLGapSource {
  file: string;
  viewName: string;
  fieldName?: string;
  inputType?: string;
  validationRule?: string;
}

/**
 * Gap Resolution
 */
export interface GapResolution {
  strategy: 'add_missing' | 'modify_existing' | 'remove_redundant' | 'sync_all' | 'manual_review';
  description: string;
  sqlAction?: string;
  csharpAction?: string;
  uiAction?: string;
  priority: number;
  estimatedTime: number; // minutes
}

/**
 * Gap Detection Result
 */
export interface GapDetectionResult {
  // Gaps by category
  gaps: DetectedGap[];
  
  // Summary statistics
  summary: GapSummary;
  
  // Cross-reference maps
  crossReference: CrossReferenceMaps;
  
  // Recommendations
  recommendations: GapRecommendation[];
  
  // Migration priority order
  migrationQueue: MigrationQueueItem[];
  
  // Metadata
  analysisTimeMs: number;
  confidence: number;
}

/**
 * Gap Summary
 */
export interface GapSummary {
  totalGaps: number;
  byCategory: Record<GapCategory, number>;
  bySeverity: Record<GapSeverity, number>;
  criticalGaps: number;
  autoFixable: number;
  estimatedFixTime: number; // minutes
  
  // Completeness scores
  completeness: {
    csharpToSql: number;  // How well C# matches SQL
    cshtmlToSql: number;  // How well CSHTML matches SQL
    csharpToCshtml: number;
    overall: number;
  };
}

/**
 * Cross-Reference Maps
 */
export interface CrossReferenceMaps {
  // C# class -> SQL table
  modelToTable: Map<string, ModelTableMapping>;
  
  // CSHTML view -> SQL table
  viewToTable: Map<string, ViewTableMapping>;
  
  // Field-level mappings
  fieldMappings: FieldMapping[];
  
  // Unmapped elements
  unmapped: {
    csharpModels: string[];
    sqlTables: string[];
    cshtmlViews: string[];
  };
}

/**
 * Model to Table Mapping
 */
export interface ModelTableMapping {
  modelName: string;
  tableName: string;
  confidence: number;
  matchedFields: FieldMatch[];
  unmatchedCSharpFields: string[];
  unmatchedSqlColumns: string[];
  hasGaps: boolean;
}

/**
 * View to Table Mapping
 */
export interface ViewTableMapping {
  viewName: string;
  tableName: string;
  confidence: number;
  matchedFields: FieldMatch[];
  unmatchedViewFields: string[];
  unmatchedSqlColumns: string[];
  hasGaps: boolean;
}

/**
 * Field Match
 */
export interface FieldMatch {
  csharpName?: string;
  sqlName?: string;
  cshtmlName?: string;
  matchType: 'exact' | 'normalized' | 'inferred';
  hasMismatch: boolean;
  mismatches: FieldMismatchDetail[];
}

/**
 * Field Mismatch Detail
 */
export interface FieldMismatchDetail {
  type: GapCategory;
  csharpValue?: string;
  sqlValue?: string;
  cshtmlValue?: string;
  severity: GapSeverity;
}

/**
 * Field Mapping
 */
export interface FieldMapping {
  tableName: string;
  columnName: string;
  csharpProperty?: string;
  cshtmlField?: string;
  dataType: string;
  isRequired: {
    sql: boolean;
    csharp: boolean;
    cshtml: boolean;
  };
  maxLength: {
    sql?: number;
    csharp?: number;
    cshtml?: number;
  };
  validations: {
    csharp: ValidationAttributeInfo[];
    cshtml: FieldValidation[];
    sql: string[];
  };
}

/**
 * Gap Recommendation
 */
export interface GapRecommendation {
  id: string;
  priority: number;
  title: string;
  description: string;
  affectedGaps: string[];
  action: string;
  impact: string;
}

/**
 * Migration Queue Item
 */
export interface MigrationQueueItem {
  order: number;
  tableName: string;
  gaps: string[];
  dependencies: string[];
  estimatedEffort: number;
  canProceed: boolean;
}

// =============================================================================
// Gap Detection Engine
// =============================================================================

/**
 * Gap Detection Engine
 */
export class GapDetectionEngine {
  private gaps: DetectedGap[] = [];
  private modelToTableMap: Map<string, ModelTableMapping> = new Map();
  private viewToTableMap: Map<string, ViewTableMapping> = new Map();
  private fieldMappings: FieldMapping[] = [];
  private gapIdCounter: number = 0;
  
  // Input data
  private csharpResults: CSharpParseResult[] = [];
  private sqlTables: TableDef[] = [];
  private cshtmlResults: ParsedCSHTMLView[] = [];
  
  // Lookup maps
  private tableMap: Map<string, TableDef> = new Map();
  private columnMap: Map<string, ColumnDef> = new Map();
  
  /**
   * Analyze gaps between C#, SQL, and CSHTML
   */
  analyze(
    csharpResults: CSharpParseResult[],
    sqlTables: TableDef[],
    cshtmlResults: ParsedCSHTMLView[]
  ): GapDetectionResult {
    const startTime = Date.now();
    
    // Store inputs
    this.csharpResults = csharpResults;
    this.sqlTables = sqlTables;
    this.cshtmlResults = cshtmlResults;
    
    // Build lookup maps
    this.buildLookupMaps();
    
    // Clear previous results
    this.gaps = [];
    this.modelToTableMap.clear();
    this.viewToTableMap.clear();
    this.fieldMappings = [];
    this.gapIdCounter = 0;
    
    // Step 1: Map C# models to SQL tables
    this.mapModelsToTables();
    
    // Step 2: Map CSHTML views to SQL tables
    this.mapViewsToTables();
    
    // Step 3: Detect field-level gaps
    this.detectFieldGaps();
    
    // Step 4: Detect validation gaps
    this.detectValidationGaps();
    
    // Step 5: Detect FK/relationship gaps
    this.detectRelationshipGaps();
    
    // Step 6: Detect orphan fields
    this.detectOrphanFields();
    
    // Step 7: Detect compliance risks
    this.detectComplianceRisks();
    
    // Build result
    const summary = this.buildSummary();
    const crossReference = this.buildCrossReference();
    const recommendations = this.generateRecommendations();
    const migrationQueue = this.buildMigrationQueue();
    
    return {
      gaps: this.gaps,
      summary,
      crossReference,
      recommendations,
      migrationQueue,
      analysisTimeMs: Date.now() - startTime,
      confidence: this.calculateOverallConfidence(),
    };
  }
  
  /**
   * Build lookup maps for fast access
   */
  private buildLookupMaps(): void {
    this.tableMap.clear();
    this.columnMap.clear();
    
    for (const table of this.sqlTables) {
      const tableKey = table.tableName.toLowerCase();
      this.tableMap.set(tableKey, table);
      
      for (const col of table.columns) {
        const colKey = `${tableKey}.${col.name.toLowerCase()}`;
        this.columnMap.set(colKey, col);
      }
    }
  }
  
  /**
   * Map C# models to SQL tables
   */
  private mapModelsToTables(): void {
    for (const csharp of this.csharpResults) {
      if (csharp.fileType !== 'model' && csharp.fileType !== 'dto' && csharp.fileType !== 'viewmodel') {
        continue;
      }
      
      // Infer table name
      const tableName = this.inferTableName(csharp);
      if (!tableName) continue;
      
      const tableKey = tableName.toLowerCase();
      const table = this.tableMap.get(tableKey);
      
      const mapping: ModelTableMapping = {
        modelName: csharp.className,
        tableName: table ? table.tableName : tableName,
        confidence: table ? 90 : 50,
        matchedFields: [],
        unmatchedCSharpFields: [],
        unmatchedSqlColumns: table ? table.columns.map(c => c.name) : [],
        hasGaps: false,
      };
      
      if (table) {
        // Match properties to columns
        for (const prop of csharp.properties) {
          const colMatch = this.findMatchingColumn(prop.name, table.columns);
          
          if (colMatch) {
            const match: FieldMatch = {
              csharpName: prop.name,
              sqlName: colMatch.name,
              matchType: colMatch.exact ? 'exact' : 'normalized',
              hasMismatch: false,
              mismatches: [],
            };
            
            // Check for mismatches
            this.checkFieldMismatch(prop, colMatch, match);
            
            if (match.hasMismatch) {
              mapping.hasGaps = true;
            }
            
            mapping.matchedFields.push(match);
            
            // Remove from unmatched
            mapping.unmatchedSqlColumns = mapping.unmatchedSqlColumns.filter(
              c => c.toLowerCase() !== colMatch.name.toLowerCase()
            );
          } else {
            mapping.unmatchedCSharpFields.push(prop.name);
            
            // Check if this is a missing column gap
            if (!prop.isCollection && !prop.isVirtual) {
              this.addMissingColumnGap(csharp, prop, tableName);
            }
          }
        }
      } else {
        // Table doesn't exist - critical gap
        this.addMissingTableGap(csharp, tableName);
      }
      
      this.modelToTableMap.set(csharp.className.toLowerCase(), mapping);
    }
  }
  
  /**
   * Map CSHTML views to SQL tables
   */
  private mapViewsToTables(): void {
    for (const cshtml of this.cshtmlResults) {
      const tableName = this.inferTableFromView(cshtml);
      if (!tableName) continue;
      
      const tableKey = tableName.toLowerCase();
      const table = this.tableMap.get(tableKey);
      
      const mapping: ViewTableMapping = {
        viewName: cshtml.viewName,
        tableName: table ? table.tableName : tableName,
        confidence: table ? 85 : 40,
        matchedFields: [],
        unmatchedViewFields: [],
        unmatchedSqlColumns: table ? table.columns.map(c => c.name) : [],
        hasGaps: false,
      };
      
      if (table) {
        // Match fields to columns
        for (const field of cshtml.fields) {
          const colMatch = this.findMatchingColumn(field.name, table.columns);
          
          if (colMatch) {
            const match: FieldMatch = {
              cshtmlName: field.name,
              sqlName: colMatch.name,
              matchType: colMatch.exact ? 'exact' : 'normalized',
              hasMismatch: false,
              mismatches: [],
            };
            
            // Check for UI/DB mismatches
            this.checkUIViewMismatch(field, colMatch, match);
            
            if (match.hasMismatch) {
              mapping.hasGaps = true;
            }
            
            mapping.matchedFields.push(match);
            
            // Remove from unmatched
            mapping.unmatchedSqlColumns = mapping.unmatchedSqlColumns.filter(
              c => c.toLowerCase() !== colMatch.name.toLowerCase()
            );
          } else {
            mapping.unmatchedViewFields.push(field.name);
          }
        }
      } else {
        // Table doesn't exist
        this.addViewMissingTableGap(cshtml, tableName);
      }
      
      this.viewToTableMap.set(cshtml.viewName.toLowerCase(), mapping);
    }
  }
  
  /**
   * Detect field-level gaps (type, nullable, length)
   */
  private detectFieldGaps(): void {
    for (const csharp of this.csharpResults) {
      if (csharp.fileType !== 'model') continue;
      
      const tableName = this.inferTableName(csharp);
      if (!tableName) continue;
      
      const table = this.tableMap.get(tableName.toLowerCase());
      if (!table) continue;
      
      for (const prop of csharp.properties) {
        const colMatch = this.findMatchingColumn(prop.name, table.columns);
        if (!colMatch) continue;
        
        const col = colMatch.column;
        
        // Check nullable mismatch
        const csharpRequired = prop.isRequired || prop.validationAttributes.some(v => v.type === 'required');
        const sqlRequired = !col.isNullable;
        
        if (csharpRequired !== sqlRequired) {
          this.addNullableMismatchGap(csharp, prop, col, tableName);
        }
        
        // Check length mismatch
        if (prop.maxLength && col.maxLength) {
          const sqlLength = parseInt(col.maxLength);
          if (prop.maxLength !== sqlLength) {
            this.addLengthMismatchGap(csharp, prop, col, tableName, sqlLength);
          }
        }
        
        // Check type mismatch
        const inferredDbType = this.inferSqlType(prop.type);
        if (inferredDbType && !this.typesMatch(inferredDbType, col.dataType)) {
          this.addTypeMismatchGap(csharp, prop, col, tableName, inferredDbType);
        }
      }
    }
  }
  
  /**
   * Detect validation gaps
   */
  private detectValidationGaps(): void {
    for (const csharp of this.csharpResults) {
      if (csharp.fileType !== 'model') continue;
      
      const tableName = this.inferTableName(csharp);
      if (!tableName) continue;
      
      const table = this.tableMap.get(tableName.toLowerCase());
      
      for (const prop of csharp.properties) {
        // Check for validations in C# not in SQL
        for (const validation of prop.validationAttributes) {
          if (validation.type === 'range') {
            // Range constraint - might need CHECK constraint in SQL
            if (table) {
              const colMatch = this.findMatchingColumn(prop.name, table.columns);
              if (colMatch && !colMatch.column.defaultValue) {
                // Check if there's a CHECK constraint
                const hasCheckConstraint = table.checkConstraints?.some(cc =>
                  cc.columns?.some(c => c.toLowerCase() === prop.name.toLowerCase())
                );
                
                if (!hasCheckConstraint) {
                  this.addValidationGapGap(csharp, prop, validation, tableName, 'range');
                }
              }
            }
          }
          
          if (validation.type === 'regex') {
            // Regex pattern - needs CHECK constraint
            this.addValidationGapGap(csharp, prop, validation, tableName, 'regex');
          }
        }
      }
    }
    
    // Check CSHTML validations
    for (const cshtml of this.cshtmlResults) {
      for (const field of cshtml.fields) {
        if (field.validation.length === 0) continue;
        
        const tableName = this.inferTableFromView(cshtml);
        if (!tableName) continue;
        
        const table = this.tableMap.get(tableName.toLowerCase());
        if (!table) continue;
        
        const colMatch = this.findMatchingColumn(field.name, table.columns);
        if (!colMatch) continue;
        
        // Check if SQL constraints cover the validations
        for (const val of field.validation) {
          if (val.type === 'required' && colMatch.column.isNullable) {
            // Validation requires but SQL allows null
            this.addUIValidationGap(cshtml, field, val, tableName);
          }
          
          if (val.type === 'max_length' && colMatch.column.maxLength) {
            const sqlLength = parseInt(colMatch.column.maxLength);
            if (val.value && Number(val.value) !== sqlLength) {
              this.addUILengthGap(cshtml, field, val, tableName, sqlLength);
            }
          }
        }
      }
    }
  }
  
  /**
   * Detect relationship/FK gaps
   */
  private detectRelationshipGaps(): void {
    for (const csharp of this.csharpResults) {
      if (csharp.fileType !== 'model') continue;
      
      const tableName = this.inferTableName(csharp);
      if (!tableName) continue;
      
      const table = this.tableMap.get(tableName.toLowerCase());
      
      // Check navigation properties
      for (const navProp of csharp.navigationProperties) {
        const targetTable = this.singularize(navProp.targetType);
        const targetTablePlural = this.pluralize(targetTable);
        
        const targetExists = this.tableMap.has(targetTablePlural.toLowerCase()) ||
                             this.tableMap.has(targetTable.toLowerCase());
        
        if (!targetExists) {
          // FK target table doesn't exist
          this.addMissingFKTableGap(csharp, navProp.name, targetTablePlural, tableName);
        }
        
        // Check if FK exists in SQL
        if (table && navProp.foreignKeyProperty) {
          const fkExists = table.foreignKeys.some(fk =>
            fk.columnName.toLowerCase() === navProp.foreignKeyProperty!.toLowerCase()
          );
          
          if (!fkExists) {
            this.addMissingFKGap(csharp, navProp.foreignKeyProperty, targetTablePlural, tableName);
          }
        }
      }
      
      // Check FK properties
      for (const prop of csharp.properties) {
        if (prop.isForeignKey && prop.foreignKeyTarget) {
          const targetTable = this.singularize(prop.foreignKeyTarget);
          const targetTablePlural = this.pluralize(targetTable);
          
          const targetExists = this.tableMap.has(targetTablePlural.toLowerCase()) ||
                               this.tableMap.has(targetTable.toLowerCase());
          
          if (!targetExists) {
            this.addMissingFKTableGap(csharp, prop.name, targetTablePlural, tableName);
          }
        }
      }
    }
  }
  
  /**
   * Detect orphan fields (UI fields with no DB backing)
   */
  private detectOrphanFields(): void {
    for (const cshtml of this.cshtmlResults) {
      const tableName = this.inferTableFromView(cshtml);
      
      // Find C# model for this view
      const modelName = cshtml.model?.name;
      const csharp = this.csharpResults.find(c =>
        c.className.toLowerCase() === modelName?.toLowerCase()
      );
      
      for (const field of cshtml.fields) {
        // Check if field exists in C# model
        const inCSharp = csharp?.properties.some(p =>
          p.name.toLowerCase() === field.name.toLowerCase()
        );
        
        // Check if field exists in SQL table
        const inSql = tableName ? (() => {
          const table = this.tableMap.get(tableName.toLowerCase());
          return table?.columns.some(c =>
            c.name.toLowerCase() === field.name.toLowerCase()
          );
        })() : false;
        
        if (!inCSharp && !inSql && field.inputType !== 'hidden') {
          this.addOrphanFieldGap(cshtml, field, tableName);
        }
      }
    }
  }
  
  /**
   * Detect compliance risks (PII/PHI fields)
   */
  private detectComplianceRisks(): void {
    const piiPatterns = [
      { pattern: /ssn|social.?security/i, type: 'SSN', severity: 'critical' as GapSeverity },
      { pattern: /credit.?card|card.?number/i, type: 'Credit Card', severity: 'critical' as GapSeverity },
      { pattern: /password|passwd/i, type: 'Password', severity: 'high' as GapSeverity },
      { pattern: /email/i, type: 'Email', severity: 'medium' as GapSeverity },
      { pattern: /phone|mobile|tel/i, type: 'Phone', severity: 'medium' as GapSeverity },
      { pattern: /address|street|city|zip|postal/i, type: 'Address', severity: 'medium' as GapSeverity },
      { pattern: /dob|birth.?date|birthday/i, type: 'DOB', severity: 'medium' as GapSeverity },
      { pattern: /first.?name|last.?name|full.?name/i, type: 'Name', severity: 'low' as GapSeverity },
    ];
    
    for (const csharp of this.csharpResults) {
      if (csharp.fileType !== 'model') continue;
      
      for (const prop of csharp.properties) {
        for (const { pattern, type, severity } of piiPatterns) {
          if (pattern.test(prop.name)) {
            // Check if compliance flag exists
            const hasComplianceFlag = csharp.complianceFlags.some(f =>
              f.propertyName.toLowerCase() === prop.name.toLowerCase()
            );
            
            if (!hasComplianceFlag) {
              this.addComplianceRiskGap(csharp, prop, type, severity);
            }
          }
        }
      }
    }
  }
  
  // ===========================================================================
  // Gap Addition Methods
  // ===========================================================================
  
  private addMissingTableGap(csharp: CSharpParseResult, tableName: string): void {
    this.gaps.push({
      id: `GAP-${++this.gapIdCounter}`,
      category: 'missing_table',
      severity: 'critical',
      title: `Missing SQL Table: ${tableName}`,
      description: `C# model '${csharp.className}' expects table '${tableName}' which does not exist in the SQL schema.`,
      source: {
        csharp: {
          file: csharp.fileName,
          className: csharp.className,
        },
        sql: { tableName },
      },
      resolution: {
        strategy: 'add_missing',
        description: `Create SQL table '${tableName}' based on C# model properties.`,
        sqlAction: this.generateCreateTableSQL(csharp),
        csharpAction: 'Verify table name mapping is correct',
        priority: 1,
        estimatedTime: 30,
      },
      impact: {
        tables: [tableName],
        fields: csharp.properties.map(p => p.name),
        operations: ['create', 'read', 'update', 'delete'],
        migrationEffort: 'moderate',
      },
      confidence: 85,
      autoFixable: true,
      detectedAt: new Date(),
    });
  }
  
  private addViewMissingTableGap(cshtml: ParsedCSHTMLView, tableName: string): void {
    this.gaps.push({
      id: `GAP-${++this.gapIdCounter}`,
      category: 'missing_table',
      severity: 'critical',
      title: `Missing SQL Table for View: ${tableName}`,
      description: `CSHTML view '${cshtml.viewName}' references table '${tableName}' which does not exist in the SQL schema.`,
      source: {
        cshtml: {
          file: cshtml.viewName,
          viewName: cshtml.viewName,
        },
        sql: { tableName },
      },
      resolution: {
        strategy: 'add_missing',
        description: `Create SQL table '${tableName}' or verify the view's model mapping.`,
        priority: 1,
        estimatedTime: 30,
      },
      impact: {
        tables: [tableName],
        fields: cshtml.fields.map(f => f.name),
        operations: ['read'],
        migrationEffort: 'moderate',
      },
      confidence: 75,
      autoFixable: false,
      detectedAt: new Date(),
    });
  }
  
  private addMissingColumnGap(csharp: CSharpParseResult, prop: CSharpProperty, tableName: string): void {
    this.gaps.push({
      id: `GAP-${++this.gapIdCounter}`,
      category: 'missing_column',
      severity: 'high',
      title: `Missing Column: ${tableName}.${prop.name}`,
      description: `C# property '${prop.name}' in '${csharp.className}' does not exist in SQL table '${tableName}'.`,
      source: {
        csharp: {
          file: csharp.fileName,
          className: csharp.className,
          propertyName: prop.name,
          lineNumber: prop.lineNumber,
        },
        sql: {
          tableName,
          columnName: prop.name,
        },
      },
      resolution: {
        strategy: 'add_missing',
        description: `Add column '${prop.name}' to SQL table '${tableName}'.`,
        sqlAction: this.generateAddColumnSQL(tableName, prop),
        priority: 2,
        estimatedTime: 10,
      },
      impact: {
        tables: [tableName],
        fields: [prop.name],
        operations: ['create', 'update'],
        migrationEffort: 'simple',
      },
      confidence: 80,
      autoFixable: true,
      detectedAt: new Date(),
    });
  }
  
  private addNullableMismatchGap(
    csharp: CSharpParseResult,
    prop: CSharpProperty,
    col: ColumnDef,
    tableName: string
  ): void {
    const csharpRequired = prop.isRequired || prop.validationAttributes.some(v => v.type === 'required');
    
    this.gaps.push({
      id: `GAP-${++this.gapIdCounter}`,
      category: 'nullable_mismatch',
      severity: 'high',
      title: `Required/Nullable Mismatch: ${tableName}.${prop.name}`,
      description: `C# property '${prop.name}' is ${csharpRequired ? 'required' : 'nullable'}, but SQL column is ${col.isNullable ? 'nullable' : 'NOT NULL'}.`,
      source: {
        csharp: {
          file: csharp.fileName,
          className: csharp.className,
          propertyName: prop.name,
          attribute: csharpRequired ? '[Required]' : 'nullable',
        },
        sql: {
          tableName,
          columnName: col.name,
          dataType: col.dataType,
        },
      },
      resolution: {
        strategy: 'sync_all',
        description: `Align nullable settings. ${csharpRequired ? 'Make SQL column NOT NULL' : 'Make SQL column nullable'}.`,
        sqlAction: csharpRequired
          ? `ALTER TABLE [${tableName}] ALTER COLUMN [${col.name}] ${col.dataType} NOT NULL;`
          : `ALTER TABLE [${tableName}] ALTER COLUMN [${col.name}] ${col.dataType} NULL;`,
        priority: 3,
        estimatedTime: 5,
      },
      impact: {
        tables: [tableName],
        fields: [prop.name],
        operations: ['create', 'update'],
        migrationEffort: 'trivial',
      },
      confidence: 90,
      autoFixable: true,
      detectedAt: new Date(),
    });
  }
  
  private addLengthMismatchGap(
    csharp: CSharpParseResult,
    prop: CSharpProperty,
    col: ColumnDef,
    tableName: string,
    sqlLength: number
  ): void {
    this.gaps.push({
      id: `GAP-${++this.gapIdCounter}`,
      category: 'length_mismatch',
      severity: 'medium',
      title: `Length Mismatch: ${tableName}.${prop.name}`,
      description: `C# property '${prop.name}' has max length ${prop.maxLength}, but SQL column has ${sqlLength}.`,
      source: {
        csharp: {
          file: csharp.fileName,
          className: csharp.className,
          propertyName: prop.name,
          value: prop.maxLength.toString(),
        },
        sql: {
          tableName,
          columnName: col.name,
          dataType: `${col.dataType}(${sqlLength})`,
        },
      },
      resolution: {
        strategy: 'sync_all',
        description: `Align max lengths. Use the larger value: ${Math.max(prop.maxLength!, sqlLength)}.`,
        sqlAction: `ALTER TABLE [${tableName}] ALTER COLUMN [${col.name}] NVARCHAR(${Math.max(prop.maxLength!, sqlLength)});`,
        priority: 4,
        estimatedTime: 5,
      },
      impact: {
        tables: [tableName],
        fields: [prop.name],
        operations: ['create', 'update'],
        migrationEffort: 'trivial',
      },
      confidence: 85,
      autoFixable: true,
      detectedAt: new Date(),
    });
  }
  
  private addTypeMismatchGap(
    csharp: CSharpParseResult,
    prop: CSharpProperty,
    col: ColumnDef,
    tableName: string,
    inferredType: string
  ): void {
    this.gaps.push({
      id: `GAP-${++this.gapIdCounter}`,
      category: 'type_mismatch',
      severity: 'medium',
      title: `Type Mismatch: ${tableName}.${prop.name}`,
      description: `C# property '${prop.name}' infers SQL type '${inferredType}', but actual column is '${col.dataType}'.`,
      source: {
        csharp: {
          file: csharp.fileName,
          className: csharp.className,
          propertyName: prop.name,
          value: prop.type,
        },
        sql: {
          tableName,
          columnName: col.name,
          dataType: col.dataType,
        },
      },
      resolution: {
        strategy: 'manual_review',
        description: `Review type mismatch. C# '${prop.type}' maps to '${inferredType}', SQL uses '${col.dataType}'.`,
        priority: 4,
        estimatedTime: 15,
      },
      impact: {
        tables: [tableName],
        fields: [prop.name],
        operations: ['create', 'read', 'update'],
        migrationEffort: 'simple',
      },
      confidence: 70,
      autoFixable: false,
      detectedAt: new Date(),
    });
  }
  
  private addValidationGapGap(
    csharp: CSharpParseResult,
    prop: CSharpProperty,
    validation: ValidationAttributeInfo,
    tableName: string,
    type: string
  ): void {
    this.gaps.push({
      id: `GAP-${++this.gapIdCounter}`,
      category: 'validation_gap',
      severity: 'low',
      title: `Validation Not in SQL: ${tableName}.${prop.name} (${type})`,
      description: `C# property '${prop.name}' has ${type} validation that is not enforced at the SQL level.`,
      source: {
        csharp: {
          file: csharp.fileName,
          className: csharp.className,
          propertyName: prop.name,
          attribute: validation.attribute,
        },
        sql: { tableName },
      },
      resolution: {
        strategy: 'add_missing',
        description: `Add CHECK constraint to SQL to enforce ${type} validation.`,
        sqlAction: this.generateCheckConstraintSQL(tableName, prop, validation),
        priority: 5,
        estimatedTime: 10,
      },
      impact: {
        tables: [tableName],
        fields: [prop.name],
        operations: ['create', 'update'],
        migrationEffort: 'simple',
      },
      confidence: 80,
      autoFixable: true,
      detectedAt: new Date(),
    });
  }
  
  private addMissingFKTableGap(
    csharp: CSharpParseResult,
    propName: string,
    targetTable: string,
    sourceTable: string
  ): void {
    this.gaps.push({
      id: `GAP-${++this.gapIdCounter}`,
      category: 'missing_fk',
      severity: 'high',
      title: `Missing FK Target Table: ${targetTable}`,
      description: `C# model '${csharp.className}' references table '${targetTable}' via property '${propName}', but this table does not exist in SQL.`,
      source: {
        csharp: {
          file: csharp.fileName,
          className: csharp.className,
          propertyName: propName,
        },
        sql: { tableName: targetTable },
      },
      resolution: {
        strategy: 'add_missing',
        description: `Create the referenced table '${targetTable}' or verify the FK relationship.`,
        priority: 2,
        estimatedTime: 30,
      },
      impact: {
        tables: [sourceTable, targetTable],
        fields: [propName],
        operations: ['create', 'read', 'update'],
        migrationEffort: 'moderate',
      },
      confidence: 85,
      autoFixable: false,
      detectedAt: new Date(),
    });
  }
  
  private addMissingFKGap(
    csharp: CSharpParseResult,
    fkProperty: string,
    targetTable: string,
    sourceTable: string
  ): void {
    this.gaps.push({
      id: `GAP-${++this.gapIdCounter}`,
      category: 'missing_fk',
      severity: 'medium',
      title: `Missing FK Constraint: ${sourceTable}.${fkProperty}`,
      description: `C# model indicates FK relationship from '${sourceTable}.${fkProperty}' to '${targetTable}', but SQL constraint is missing.`,
      source: {
        csharp: {
          file: csharp.fileName,
          className: csharp.className,
          propertyName: fkProperty,
        },
        sql: {
          tableName: sourceTable,
          columnName: fkProperty,
        },
      },
      resolution: {
        strategy: 'add_missing',
        description: `Add FK constraint from '${sourceTable}.${fkProperty}' to '${targetTable}.Id'.`,
        sqlAction: `ALTER TABLE [${sourceTable}] ADD CONSTRAINT [FK_${sourceTable}_${targetTable}_${fkProperty}] FOREIGN KEY ([${fkProperty}]) REFERENCES [${targetTable}] ([Id]);`,
        priority: 3,
        estimatedTime: 10,
      },
      impact: {
        tables: [sourceTable, targetTable],
        fields: [fkProperty],
        operations: ['create', 'delete'],
        migrationEffort: 'simple',
      },
      confidence: 80,
      autoFixable: true,
      detectedAt: new Date(),
    });
  }
  
  private addOrphanFieldGap(
    cshtml: ParsedCSHTMLView,
    field: ParsedFormField,
    tableName?: string
  ): void {
    this.gaps.push({
      id: `GAP-${++this.gapIdCounter}`,
      category: 'orphan_field',
      severity: 'medium',
      title: `Orphan UI Field: ${field.name}`,
      description: `CSHTML field '${field.name}' has no corresponding C# property or SQL column.${tableName ? ` Table: ${tableName}` : ''}`,
      source: {
        cshtml: {
          file: cshtml.viewName,
          viewName: cshtml.viewName,
          fieldName: field.name,
          inputType: field.inputType,
        },
      },
      resolution: {
        strategy: 'manual_review',
        description: `Determine if field should be added to model/table or removed from UI.`,
        uiAction: 'Verify field necessity',
        priority: 4,
        estimatedTime: 15,
      },
      impact: {
        tables: tableName ? [tableName] : [],
        fields: [field.name],
        operations: ['create', 'update'],
        migrationEffort: 'simple',
      },
      confidence: 70,
      autoFixable: false,
      detectedAt: new Date(),
    });
  }
  
  private addUIValidationGap(
    cshtml: ParsedCSHTMLView,
    field: ParsedFormField,
    validation: FieldValidation,
    tableName: string
  ): void {
    this.gaps.push({
      id: `GAP-${++this.gapIdCounter}`,
      category: 'validation_gap',
      severity: 'medium',
      title: `UI-DB Validation Mismatch: ${tableName}.${field.name}`,
      description: `UI field '${field.name}' requires input but SQL column allows NULL.`,
      source: {
        cshtml: {
          file: cshtml.viewName,
          viewName: cshtml.viewName,
          fieldName: field.name,
          validationRule: validation.type,
        },
        sql: {
          tableName,
          columnName: field.name,
        },
      },
      resolution: {
        strategy: 'sync_all',
        description: `Make SQL column NOT NULL to match UI requirement.`,
        sqlAction: `ALTER TABLE [${tableName}] ALTER COLUMN [${field.name}] <TYPE> NOT NULL;`,
        priority: 3,
        estimatedTime: 5,
      },
      impact: {
        tables: [tableName],
        fields: [field.name],
        operations: ['create', 'update'],
        migrationEffort: 'trivial',
      },
      confidence: 85,
      autoFixable: true,
      detectedAt: new Date(),
    });
  }
  
  private addUILengthGap(
    cshtml: ParsedCSHTMLView,
    field: ParsedFormField,
    validation: FieldValidation,
    tableName: string,
    sqlLength: number
  ): void {
    this.gaps.push({
      id: `GAP-${++this.gapIdCounter}`,
      category: 'length_mismatch',
      severity: 'low',
      title: `UI-DB Length Mismatch: ${tableName}.${field.name}`,
      description: `UI max length (${validation.value}) differs from SQL column length (${sqlLength}).`,
      source: {
        cshtml: {
          file: cshtml.viewName,
          viewName: cshtml.viewName,
          fieldName: field.name,
          validationRule: `max_length=${validation.value}`,
        },
        sql: {
          tableName,
          columnName: field.name,
          dataType: `NVARCHAR(${sqlLength})`,
        },
      },
      resolution: {
        strategy: 'sync_all',
        description: `Align max lengths between UI and database.`,
        priority: 5,
        estimatedTime: 5,
      },
      impact: {
        tables: [tableName],
        fields: [field.name],
        operations: ['create', 'update'],
        migrationEffort: 'trivial',
      },
      confidence: 80,
      autoFixable: true,
      detectedAt: new Date(),
    });
  }
  
  private addComplianceRiskGap(
    csharp: CSharpParseResult,
    prop: CSharpProperty,
    piiType: string,
    severity: GapSeverity
  ): void {
    this.gaps.push({
      id: `GAP-${++this.gapIdCounter}`,
      category: 'compliance_risk',
      severity,
      title: `Compliance Risk: ${prop.name} (${piiType})`,
      description: `C# property '${prop.name}' appears to be ${piiType} data but lacks compliance flags (PII/PHI/GDPR).`,
      source: {
        csharp: {
          file: csharp.fileName,
          className: csharp.className,
          propertyName: prop.name,
        },
      },
      resolution: {
        strategy: 'add_missing',
        description: `Add appropriate compliance attributes and ensure encryption at rest.`,
        csharpAction: `[PersonalData] or [ProtectedPersonalData] attribute`,
        priority: severity === 'critical' ? 1 : severity === 'high' ? 2 : 3,
        estimatedTime: 20,
      },
      impact: {
        tables: [],
        fields: [prop.name],
        operations: [],
        migrationEffort: 'moderate',
      },
      confidence: 60,
      autoFixable: false,
      detectedAt: new Date(),
    });
  }
  
  // ===========================================================================
  // Helper Methods
  // ===========================================================================
  
  private inferTableName(csharp: CSharpParseResult): string | undefined {
    if (csharp.inferredTable) return csharp.inferredTable;
    
    // Infer from class name
    let name = csharp.className;
    name = name.replace(/Model$/, '').replace(/DTO$/, '').replace(/Dto$/, '').replace(/ViewModel$/, '').replace(/VM$/, '');
    
    return this.pluralize(name);
  }
  
  private inferTableFromView(cshtml: ParsedCSHTMLView): string | undefined {
    if (cshtml.model?.linkedTable) return cshtml.model.linkedTable;
    
    // Try to infer from view name
    let name = cshtml.viewName;
    name = name.replace(/View$/, '').replace(/Edit$/, '').replace(/Create$/, '').replace(/Index$/, '').replace(/Details$/, '').replace(/Delete$/, '');
    
    return this.pluralize(name);
  }
  
  private findMatchingColumn(
    propName: string,
    columns: ColumnDef[]
  ): { column: ColumnDef; exact: boolean } | null {
    const propLower = propName.toLowerCase();
    
    // Exact match
    const exact = columns.find(c => c.name.toLowerCase() === propLower);
    if (exact) return { column: exact, exact: true };
    
    // Try without "Id" suffix
    if (propLower.endsWith('id')) {
      const withoutId = propLower.slice(0, -2);
      const match = columns.find(c => c.name.toLowerCase() === withoutId);
      if (match) return { column: match, exact: false };
    }
    
    // Try with "Id" suffix
    const withId = columns.find(c => c.name.toLowerCase() === `${propLower}id`);
    if (withId) return { column: withId, exact: false };
    
    // Try snake_case conversion
    const snakeCase = propLower.replace(/([A-Z])/g, '_$1').toLowerCase();
    const snakeMatch = columns.find(c => c.name.toLowerCase() === snakeCase);
    if (snakeMatch) return { column: snakeMatch, exact: false };
    
    return null;
  }
  
  private checkFieldMismatch(
    prop: CSharpProperty,
    col: ColumnDef,
    match: FieldMatch
  ): void {
    // Check nullable
    const propRequired = prop.isRequired || prop.validationAttributes.some(v => v.type === 'required');
    if (propRequired !== !col.isNullable) {
      match.hasMismatch = true;
      match.mismatches.push({
        type: 'nullable_mismatch',
        csharpValue: propRequired ? 'required' : 'nullable',
        sqlValue: col.isNullable ? 'NULL' : 'NOT NULL',
        severity: 'high',
      });
    }
    
    // Check length
    if (prop.maxLength && col.maxLength) {
      const sqlLength = parseInt(col.maxLength);
      if (prop.maxLength !== sqlLength) {
        match.hasMismatch = true;
        match.mismatches.push({
          type: 'length_mismatch',
          csharpValue: prop.maxLength.toString(),
          sqlValue: sqlLength.toString(),
          severity: 'medium',
        });
      }
    }
  }
  
  private checkUIViewMismatch(
    field: ParsedFormField,
    col: ColumnDef,
    match: FieldMatch
  ): void {
    // Check required
    if (field.isRequired !== !col.isNullable) {
      match.hasMismatch = true;
      match.mismatches.push({
        type: 'nullable_mismatch',
        cshtmlValue: field.isRequired ? 'required' : 'optional',
        sqlValue: col.isNullable ? 'NULL' : 'NOT NULL',
        severity: 'medium',
      });
    }
    
    // Check length from validations
    const maxLenVal = field.validation.find(v => v.type === 'max_length');
    if (maxLenVal && col.maxLength) {
      const sqlLength = parseInt(col.maxLength);
      if (maxLenVal.value && Number(maxLenVal.value) !== sqlLength) {
        match.hasMismatch = true;
        match.mismatches.push({
          type: 'length_mismatch',
          cshtmlValue: maxLenVal.value.toString(),
          sqlValue: sqlLength.toString(),
          severity: 'low',
        });
      }
    }
  }
  
  private inferSqlType(csharpType: string): string | undefined {
    const typeMap: Record<string, string> = {
      'string': 'NVARCHAR',
      'int': 'INT',
      'long': 'BIGINT',
      'short': 'SMALLINT',
      'byte': 'TINYINT',
      'bool': 'BIT',
      'decimal': 'DECIMAL',
      'double': 'FLOAT',
      'float': 'FLOAT',
      'DateTime': 'DATETIME',
      'DateTimeOffset': 'DATETIMEOFFSET',
      'Guid': 'UNIQUEIDENTIFIER',
      'byte[]': 'VARBINARY',
    };
    
    const cleanType = csharpType.replace('?', '').toLowerCase();
    return typeMap[cleanType];
  }
  
  private typesMatch(inferred: string, actual: string): boolean {
    const actualUpper = actual.toUpperCase();
    const inferredUpper = inferred.toUpperCase();
    
    // Direct match
    if (actualUpper === inferredUpper) return true;
    
    // NVARCHAR matches VARCHAR
    if ((actualUpper === 'NVARCHAR' || actualUpper === 'VARCHAR') &&
        (inferredUpper === 'NVARCHAR' || inferredUpper === 'VARCHAR')) {
      return true;
    }
    
    // DECIMAL matches NUMERIC
    if ((actualUpper === 'DECIMAL' || actualUpper === 'NUMERIC') &&
        (inferredUpper === 'DECIMAL' || inferredUpper === 'NUMERIC')) {
      return true;
    }
    
    // FLOAT matches REAL
    if ((actualUpper === 'FLOAT' || actualUpper === 'REAL') &&
        (inferredUpper === 'FLOAT' || inferredUpper === 'REAL')) {
      return true;
    }
    
    return false;
  }
  
  private pluralize(word: string): string {
    if (!word) return word;
    
    const irregulars: Record<string, string> = {
      'person': 'People',
      'child': 'Children',
      'man': 'Men',
      'woman': 'Women',
      'data': 'Data',
    };
    
    const lower = word.toLowerCase();
    if (irregulars[lower]) return irregulars[lower];
    
    if (word.endsWith('s')) return word;
    if (word.endsWith('y') && !'aeiou'.includes(word.slice(-2, -1).toLowerCase())) {
      return word.slice(0, -1) + 'ies';
    }
    if (word.endsWith('s') || word.endsWith('x') || word.endsWith('ch') || word.endsWith('sh')) {
      return word + 'es';
    }
    
    return word + 's';
  }
  
  private singularize(word: string): string {
    if (!word) return word;
    
    if (word.endsWith('ies')) return word.slice(0, -3) + 'y';
    if (word.endsWith('es') && (word.endsWith('ses') || word.endsWith('xes') || word.endsWith('ches'))) {
      return word.slice(0, -2);
    }
    if (word.endsWith('s') && !word.endsWith('ss')) {
      return word.slice(0, -1);
    }
    
    return word;
  }
  
  private generateCreateTableSQL(csharp: CSharpParseResult): string {
    const lines: string[] = [];
    const tableName = this.inferTableName(csharp) || csharp.className;
    
    lines.push(`CREATE TABLE [dbo].[${tableName}] (`);
    
    const columns = csharp.properties
      .filter(p => !p.isCollection && !p.isVirtual)
      .map(p => {
        const dbType = this.inferSqlType(p.type) || 'NVARCHAR';
        const length = p.maxLength ? `(${p.maxLength})` : dbType === 'NVARCHAR' ? '(MAX)' : '';
        const nullable = p.isRequired || p.validationAttributes.some(v => v.type === 'required') ? ' NOT NULL' : ' NULL';
        const identity = p.isPrimaryKey && p.type.toLowerCase() === 'int' ? ' IDENTITY(1,1)' : '';
        const pk = p.isPrimaryKey ? ' PRIMARY KEY' : '';
        
        return `    [${p.name}] ${dbType}${length}${identity}${nullable}${pk}`;
      });
    
    lines.push(columns.join(',\n'));
    lines.push(');');
    
    return lines.join('\n');
  }
  
  private generateAddColumnSQL(tableName: string, prop: CSharpProperty): string {
    const dbType = this.inferSqlType(prop.type) || 'NVARCHAR';
    const length = prop.maxLength ? `(${prop.maxLength})` : dbType === 'NVARCHAR' ? '(MAX)' : '';
    const nullable = prop.isRequired ? ' NOT NULL' : ' NULL';
    
    return `ALTER TABLE [${tableName}] ADD [${prop.name}] ${dbType}${length}${nullable};`;
  }
  
  private generateCheckConstraintSQL(
    tableName: string,
    prop: CSharpProperty,
    validation: ValidationAttributeInfo
  ): string {
    if (validation.type === 'range') {
      const min = validation.parameters.minimum;
      const max = validation.parameters.maximum;
      return `ALTER TABLE [${tableName}] ADD CONSTRAINT [CK_${tableName}_${prop.name}_Range] CHECK ([${prop.name}] BETWEEN ${min} AND ${max});`;
    }
    
    if (validation.type === 'regex') {
      const pattern = validation.parameters.pattern;
      return `-- Regex CHECK constraints require SQL Server specific implementation\n-- Pattern: ${pattern}`;
    }
    
    return `-- CHECK constraint for ${validation.type}`;
  }
  
  private buildSummary(): GapSummary {
    const byCategory: Record<GapCategory, number> = {
      missing_table: 0,
      missing_column: 0,
      missing_fk: 0,
      type_mismatch: 0,
      nullable_mismatch: 0,
      length_mismatch: 0,
      validation_gap: 0,
      ui_db_mismatch: 0,
      orphan_field: 0,
      missing_validation: 0,
      compliance_risk: 0,
      documentation_gap: 0,
    };
    
    const bySeverity: Record<GapSeverity, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      info: 0,
    };
    
    for (const gap of this.gaps) {
      byCategory[gap.category]++;
      bySeverity[gap.severity]++;
    }
    
    const criticalGaps = this.gaps.filter(g => g.severity === 'critical').length;
    const autoFixable = this.gaps.filter(g => g.autoFixable).length;
    const estimatedFixTime = this.gaps.reduce((sum, g) => sum + g.resolution.estimatedTime, 0);
    
    return {
      totalGaps: this.gaps.length,
      byCategory,
      bySeverity,
      criticalGaps,
      autoFixable,
      estimatedFixTime,
      completeness: {
        csharpToSql: this.calculateCompleteness('csharp-sql'),
        cshtmlToSql: this.calculateCompleteness('cshtml-sql'),
        csharpToCshtml: this.calculateCompleteness('csharp-cshtml'),
        overall: this.calculateOverallCompleteness(),
      },
    };
  }
  
  private calculateCompleteness(type: 'csharp-sql' | 'cshtml-sql' | 'csharp-cshtml'): number {
    if (type === 'csharp-sql') {
      const total = this.csharpResults.filter(c => c.fileType === 'model').length;
      const mapped = Array.from(this.modelToTableMap.values()).filter(m => m.matchedFields.length > 0).length;
      return total > 0 ? Math.round((mapped / total) * 100) : 100;
    }
    
    if (type === 'cshtml-sql') {
      const total = this.cshtmlResults.length;
      const mapped = Array.from(this.viewToTableMap.values()).filter(v => v.matchedFields.length > 0).length;
      return total > 0 ? Math.round((mapped / total) * 100) : 100;
    }
    
    return 100;
  }
  
  private calculateOverallCompleteness(): number {
    const scores = [
      this.calculateCompleteness('csharp-sql'),
      this.calculateCompleteness('cshtml-sql'),
      this.calculateCompleteness('csharp-cshtml'),
    ];
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  }
  
  private buildCrossReference(): CrossReferenceMaps {
    const unmapped = {
      csharpModels: this.csharpResults
        .filter(c => c.fileType === 'model' && !this.modelToTableMap.has(c.className.toLowerCase()))
        .map(c => c.className),
      sqlTables: this.sqlTables
        .filter(t => !Array.from(this.modelToTableMap.values()).some(m => m.tableName.toLowerCase() === t.tableName.toLowerCase()))
        .map(t => t.tableName),
      cshtmlViews: this.cshtmlResults
        .filter(c => !this.viewToTableMap.has(c.viewName.toLowerCase()))
        .map(c => c.viewName),
    };
    
    return {
      modelToTable: this.modelToTableMap,
      viewToTable: this.viewToTableMap,
      fieldMappings: this.fieldMappings,
      unmapped,
    };
  }
  
  private generateRecommendations(): GapRecommendation[] {
    const recommendations: GapRecommendation[] = [];
    
    // Group gaps by category
    const missingTables = this.gaps.filter(g => g.category === 'missing_table');
    if (missingTables.length > 0) {
      recommendations.push({
        id: 'REC-1',
        priority: 1,
        title: 'Create Missing SQL Tables',
        description: `${missingTables.length} tables are referenced but don't exist in SQL. Create these tables before proceeding.`,
        affectedGaps: missingTables.map(g => g.id),
        action: 'Run SQL generation for missing tables',
        impact: 'Blocks all CRUD operations for affected entities',
      });
    }
    
    const nullableMismatches = this.gaps.filter(g => g.category === 'nullable_mismatch');
    if (nullableMismatches.length > 0) {
      recommendations.push({
        id: 'REC-2',
        priority: 2,
        title: 'Align Nullable Settings',
        description: `${nullableMismatches.length} fields have nullable mismatches between C# and SQL. This can cause runtime errors.`,
        affectedGaps: nullableMismatches.map(g => g.id),
        action: 'Update SQL columns or C# properties to align',
        impact: 'Data integrity issues, validation errors',
      });
    }
    
    const complianceRisks = this.gaps.filter(g => g.category === 'compliance_risk');
    if (complianceRisks.length > 0) {
      recommendations.push({
        id: 'REC-3',
        priority: 1,
        title: 'Address Compliance Risks',
        description: `${complianceRisks.length} fields with potential PII/PHI data lack proper compliance flags.`,
        affectedGaps: complianceRisks.map(g => g.id),
        action: 'Add compliance attributes and encryption',
        impact: 'Regulatory compliance (GDPR, HIPAA, PCI-DSS)',
      });
    }
    
    return recommendations.sort((a, b) => a.priority - b.priority);
  }
  
  private buildMigrationQueue(): MigrationQueueItem[] {
    // Group gaps by table
    const tableGaps = new Map<string, DetectedGap[]>();
    
    for (const gap of this.gaps) {
      for (const table of gap.impact.tables) {
        if (!tableGaps.has(table)) {
          tableGaps.set(table, []);
        }
        tableGaps.get(table)!.push(gap);
      }
    }
    
    // Sort by priority
    const items: MigrationQueueItem[] = [];
    let order = 1;
    
    // First: tables with critical gaps
    for (const [table, gaps] of tableGaps) {
      if (gaps.some(g => g.severity === 'critical')) {
        items.push({
          order: order++,
          tableName: table,
          gaps: gaps.map(g => g.id),
          dependencies: this.findTableDependencies(table),
          estimatedEffort: gaps.reduce((sum, g) => sum + g.resolution.estimatedTime, 0),
          canProceed: true,
        });
      }
    }
    
    // Then: tables with high severity gaps
    for (const [table, gaps] of tableGaps) {
      if (!items.some(i => i.tableName === table) && gaps.some(g => g.severity === 'high')) {
        items.push({
          order: order++,
          tableName: table,
          gaps: gaps.map(g => g.id),
          dependencies: this.findTableDependencies(table),
          estimatedEffort: gaps.reduce((sum, g) => sum + g.resolution.estimatedTime, 0),
          canProceed: true,
        });
      }
    }
    
    // Finally: other tables
    for (const [table, gaps] of tableGaps) {
      if (!items.some(i => i.tableName === table)) {
        items.push({
          order: order++,
          tableName: table,
          gaps: gaps.map(g => g.id),
          dependencies: this.findTableDependencies(table),
          estimatedEffort: gaps.reduce((sum, g) => sum + g.resolution.estimatedTime, 0),
          canProceed: true,
        });
      }
    }
    
    return items;
  }
  
  private findTableDependencies(tableName: string): string[] {
    const table = this.tableMap.get(tableName.toLowerCase());
    if (!table) return [];
    
    return table.foreignKeys.map(fk => fk.referencesTable);
  }
  
  private calculateOverallConfidence(): number {
    if (this.gaps.length === 0) return 100;
    
    const avgConfidence = this.gaps.reduce((sum, g) => sum + g.confidence, 0) / this.gaps.length;
    return Math.round(avgConfidence);
  }
}

// =============================================================================
// Exports
// =============================================================================

export const gapDetector = new GapDetectionEngine();

export function detectGaps(
  csharpResults: CSharpParseResult[],
  sqlTables: TableDef[],
  cshtmlResults: ParsedCSHTMLView[]
): GapDetectionResult {
  return gapDetector.analyze(csharpResults, sqlTables, cshtmlResults);
}
