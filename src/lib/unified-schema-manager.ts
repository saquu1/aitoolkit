// =============================================================================
// Unified Schema Manager - Single Source of Truth for All Schema Intelligence
// =============================================================================
// Integrates SQL DDL, CSHTML, JavaScript, and SP parsers into unified schema
// Provides comprehensive intelligence aggregation and cross-referencing
// =============================================================================

import { PrismaClient } from '@prisma/client';
import { 
  parseSqlServer 
} from './sql-parser';
import { CSHTMLIntelligenceEngine, CSHTMLIntelligence, analyzeCSHTML } from './parsers/cshtml-intelligence';
import { SourceTracker, createSourceTracker } from './source-tracker';
import { 
  TableDef, 
  ColumnDef, 
  ForeignKeyDef, 
  StoredProcedureDef,
  ParseResult 
} from './types';

const prisma = new PrismaClient();

// =============================================================================
// Core Types
// =============================================================================

export interface UnifiedTableSchema {
  // Identity
  tableName: string;
  schemaName: string;
  
  // Source tracking
  sources: {
    primary: SchemaSource;
    secondary: SchemaSource[];
    allFiles: string[];
  };
  
  // Columns with unified intelligence
  columns: UnifiedColumnSchema[];
  
  // Foreign keys (resolved)
  foreignKeys: UnifiedForeignKey[];
  referencedBy: UnifiedForeignKey[]; // Reverse FK relationships
  
  // SP Availability
  spOperations: {
    create: SPOperation | null;
    read: SPOperation | null;
    update: SPOperation | null;
    delete: SPOperation | null;
    search: SPOperation | null;
    dropdown: SPOperation | null;
    all: SPOperation[];
  };
  
  // UI Intelligence
  uiIntelligence: {
    forms: FormIntelligenceRef[];
    dataTables: DataTableIntelligenceRef[];
    endpoints: EndpointIntelligenceRef[];
    lookupUsage: LookupUsageRef[];
  };
  
  // Verification
  verification: {
    status: 'verified' | 'partial' | 'pending' | 'conflict';
    score: number;
    verifiedBy?: string;
    verifiedAt?: Date;
    issues: VerificationIssue[];
  };
  
  // Metadata
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    version: number;
    confidenceScore: number;
    completenessScore: number;
  };
}

export interface UnifiedColumnSchema {
  name: string;
  tableName: string;
  
  // SQL-derived properties
  dataType: string;
  maxLength?: string;
  isNullable: boolean;
  isPrimaryKey: boolean;
  isIdentity: boolean;
  defaultValue?: string;
  
  // Intelligence
  intelligence: {
    semanticType?: string;
    uiType?: string;
    isPII: boolean;
    isPHI: boolean;
    isFK: boolean;
    fkTarget?: { table: string; column: string };
    isSearchable: boolean;
    isFilterable: boolean;
    isDisplayField: boolean;
    validationRules: string[];
    displayOrder?: number;
  };
  
  // Sources
  sources: {
    fromDDL: boolean;
    fromCSHTML: boolean;
    fromSP: boolean;
    ddlFile?: string;
    cshtmlFiles: string[];
    spFiles: string[];
  };
  
  // CSHTML Intelligence
  cshtmlIntelligence?: {
    label?: string;
    placeholder?: string;
    inputType?: string;
    isRequired?: boolean;
    isReadOnly?: boolean;
    defaultValue?: string;
    validations: string[];
    dropdownSource?: string;
    cascadeParent?: string;
    cascadeChild?: string;
  };
  
  // Verification
  verification: {
    status: 'verified' | 'partial' | 'pending' | 'conflict';
    score: number;
    conflicts: ColumnConflict[];
  };
}

export interface UnifiedForeignKey {
  constraintName?: string;
  columnName: string;
  referencesTable: string;
  referencesColumn: string;
  source: 'ddl' | 'sp_inference' | 'cshtml_inference';
  confidence: number;
  isVerified: boolean;
}

export interface SchemaSource {
  type: 'ddl' | 'cshtml' | 'sp_discovery' | 'manual' | 'inferred';
  fileName: string;
  confidence: number;
  discoveredAt: Date;
  details?: string;
}

export interface SPOperation {
  spName: string;
  operationType: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'EXECUTE';
  accessType: 'read' | 'write' | 'both';
  columns: string[];
  confidence: number;
  isVerified: boolean;
}

export interface FormIntelligenceRef {
  viewName: string;
  formId: string;
  action: string;
  method: string;
  fieldCount: number;
  hasAjax: boolean;
  hasValidation: boolean;
}

export interface DataTableIntelligenceRef {
  viewName: string;
  tableSelector: string;
  ajaxUrl?: string;
  columnCount: number;
  features: string[];
}

export interface EndpointIntelligenceRef {
  url: string;
  method: string;
  source: string;
  viewName: string;
  confidence: number;
}

export interface LookupUsageRef {
  viewName: string;
  field: string;
  lookupTable: string;
  lookupSP?: string;
}

export interface VerificationIssue {
  type: 'missing_ddl' | 'missing_sp' | 'column_mismatch' | 'type_conflict' | 'fk_missing';
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  suggestion: string;
}

export interface ColumnConflict {
  type: 'type_mismatch' | 'nullable_mismatch' | 'length_mismatch';
  ddlValue: string;
  otherValue: string;
  source: string;
}

// =============================================================================
// Schema Merge Input Types
// =============================================================================

export interface SchemaMergeInput {
  projectId: string;
  sqlResult?: ParseResult;
  cshtmlResults?: CSHTMLIntelligence[];
  spMappings?: SPMappingInput[];
}

export interface SPMappingInput {
  spName: string;
  tableName: string;
  operationType: string;
  columnsRead: string[];
  columnsWritten: string[];
}

// =============================================================================
// Unified Schema Manager Class
// =============================================================================

export class UnifiedSchemaManager {
  private projectId: string;
  private sourceTracker: SourceTracker;
  private cache: Map<string, UnifiedTableSchema> = new Map();

  constructor(projectId: string) {
    this.projectId = projectId;
    this.sourceTracker = createSourceTracker(projectId);
  }

  // ===========================================================================
  // Main Integration Methods
  // ===========================================================================

  /**
   * Build unified schema from all sources
   */
  async buildUnifiedSchema(): Promise<{
    tables: UnifiedTableSchema[];
    stats: BuildStats;
    issues: BuildIssue[];
  }> {
    const startTime = Date.now();
    const issues: BuildIssue[] = [];

    // Get all source data from database
    const [
      sqlTables,
      cshtmlCache,
      spMappings,
      columnIntelligence,
      tableSources,
      verificationQueue
    ] = await Promise.all([
      this.getSQLTablesFromDB(),
      this.getCSHTMLCacheFromDB(),
      this.getSPMappingsFromDB(),
      this.getColumnIntelligenceFromDB(),
      this.getTableSourcesFromDB(),
      this.getVerificationQueueFromDB()
    ]);

    // Build unified tables
    const unifiedTables: UnifiedTableSchema[] = [];

    // Process SQL-defined tables first
    for (const sqlTable of sqlTables) {
      const unified = await this.buildUnifiedTable(
        sqlTable,
        cshtmlCache.filter(c => c.linkedTable === sqlTable.tableName),
        spMappings.filter(s => s.tableName === sqlTable.tableName),
        columnIntelligence.filter(c => c.tableName === sqlTable.tableName),
        tableSources.find(t => t.tableName === sqlTable.tableName),
        verificationQueue.filter(v => v.entityName === sqlTable.tableName)
      );
      unifiedTables.push(unified);
    }

    // Add CSHTML-discovered tables not in SQL
    const sqlTableNames = new Set(sqlTables.map(t => t.tableName.toLowerCase()));
    for (const cshtml of cshtmlCache) {
      if (cshtml.linkedTable && !sqlTableNames.has(cshtml.linkedTable.toLowerCase())) {
        const unified = await this.buildUnifiedTableFromCSHTML(
          cshtml,
          spMappings.filter(s => s.tableName === cshtml.linkedTable),
          verificationQueue.filter(v => v.entityName === cshtml.linkedTable)
        );
        unifiedTables.push(unified);
        issues.push({
          type: 'cshtml_only_table',
          tableName: cshtml.linkedTable,
          severity: 'medium',
          message: `Table "${cshtml.linkedTable}" discovered from CSHTML only, no DDL found`
        });
      }
    }

    // Build reverse FK references
    this.buildReverseFKReferences(unifiedTables);

    // Calculate completeness scores
    for (const table of unifiedTables) {
      table.metadata.completenessScore = this.calculateCompletenessScore(table);
    }

    // Cache results
    unifiedTables.forEach(t => this.cache.set(t.tableName, t));

    const stats: BuildStats = {
      totalTables: unifiedTables.length,
      tablesWithDDL: sqlTables.length,
      tablesWithSPs: unifiedTables.filter(t => t.spOperations.all.length > 0).length,
      tablesWithUI: unifiedTables.filter(t => t.uiIntelligence.forms.length > 0 || t.uiIntelligence.dataTables.length > 0).length,
      verifiedTables: unifiedTables.filter(t => t.verification.status === 'verified').length,
      pendingVerification: unifiedTables.filter(t => t.verification.status === 'pending').length,
      totalFKs: unifiedTables.reduce((sum, t) => sum + t.foreignKeys.length, 0),
      buildTimeMs: Date.now() - startTime
    };

    return { tables: unifiedTables, stats, issues };
  }

  /**
   * Get unified table by name
   */
  async getUnifiedTable(tableName: string): Promise<UnifiedTableSchema | null> {
    // Check cache first
    if (this.cache.has(tableName)) {
      return this.cache.get(tableName)!;
    }

    // Build from database
    const sqlTables = await this.getSQLTablesFromDB();
    const sqlTable = sqlTables.find(t => t.tableName.toLowerCase() === tableName.toLowerCase());
    
    if (!sqlTable) {
      // Check if it's a CSHTML-discovered table
      const cshtmlCache = await this.getCSHTMLCacheFromDB();
      const cshtml = cshtmlCache.find(c => c.linkedTable?.toLowerCase() === tableName.toLowerCase());
      
      if (cshtml) {
        return this.buildUnifiedTableFromCSHTML(cshtml, [], []);
      }
      return null;
    }

    const cshtmlCache = await this.getCSHTMLCacheFromDB();
    const spMappings = await this.getSPMappingsFromDB();
    const columnIntelligence = await this.getColumnIntelligenceFromDB();
    const tableSources = await this.getTableSourcesFromDB();
    const verificationQueue = await this.getVerificationQueueFromDB();

    const unified = await this.buildUnifiedTable(
      sqlTable,
      cshtmlCache.filter(c => c.linkedTable === tableName),
      spMappings.filter(s => s.tableName === tableName),
      columnIntelligence.filter(c => c.tableName === tableName),
      tableSources.find(t => t.tableName === tableName),
      verificationQueue.filter(v => v.entityName === tableName)
    );

    this.cache.set(tableName, unified);
    return unified;
  }

  // ===========================================================================
  // Table Building Methods
  // ===========================================================================

  private async buildUnifiedTable(
    sqlTable: TableDef & { id?: string },
    cshtmlData: CSHTMLCacheEntry[],
    spMappings: SPMappingEntry[],
    columnIntelligence: ColumnIntelligenceEntry[],
    tableSource: TableSourceEntry | undefined,
    verificationItems: VerificationEntry[]
  ): Promise<UnifiedTableSchema> {
    // Build columns
    const columns = await this.buildUnifiedColumns(
      sqlTable.columns,
      sqlTable.tableName,
      cshtmlData,
      columnIntelligence
    );

    // Build FKs
    const foreignKeys = this.buildForeignKeys(sqlTable.foreignKeys);

    // Build SP operations
    const spOperations = this.buildSPOperations(spMappings);

    // Build UI intelligence
    const uiIntelligence = this.buildUIIntelligence(cshtmlData);

    // Build verification
    const verification = this.buildVerification(tableSource, verificationItems, columns);

    // Build sources
    const sources = this.buildSources(tableSource, cshtmlData, spMappings);

    return {
      tableName: sqlTable.tableName,
      schemaName: sqlTable.schemaName,
      sources,
      columns,
      foreignKeys,
      referencedBy: [], // Will be populated later
      spOperations,
      uiIntelligence,
      verification,
      metadata: {
        createdAt: tableSource?.createdAt || new Date(),
        updatedAt: tableSource?.updatedAt || new Date(),
        version: 1,
        confidenceScore: this.calculateConfidenceScore(sources, spOperations, columns),
        completenessScore: 0 // Will be calculated later
      }
    };
  }

  private async buildUnifiedTableFromCSHTML(
    cshtmlData: CSHTMLCacheEntry,
    spMappings: SPMappingEntry[],
    verificationItems: VerificationEntry[]
  ): Promise<UnifiedTableSchema> {
    // Parse fields from CSHTML
    const fields = cshtmlData.fields ? JSON.parse(cshtmlData.fields) : [];
    
    // Build columns from CSHTML fields
    const columns: UnifiedColumnSchema[] = fields.map((field: {
      name: string;
      type?: string;
      isRequired?: boolean;
      validation?: string[];
    }) => ({
      name: field.name,
      tableName: cshtmlData.linkedTable!,
      dataType: this.inferDataTypeFromCSHTML(field.type || 'text'),
      isNullable: !field.isRequired,
      isPrimaryKey: field.name.toLowerCase() === 'id',
      isIdentity: field.name.toLowerCase() === 'id',
      intelligence: {
        isPII: false,
        isPHI: false,
        isFK: /Id$/i.test(field.name),
        isSearchable: false,
        isFilterable: false,
        isDisplayField: true,
        validationRules: field.validation || []
      },
      sources: {
        fromDDL: false,
        fromCSHTML: true,
        fromSP: false,
        ddlFile: undefined,
        cshtmlFiles: [cshtmlData.viewName],
        spFiles: []
      },
      cshtmlIntelligence: {
        inputType: field.type,
        isRequired: field.isRequired,
        validations: field.validation || []
      },
      verification: {
        status: 'pending',
        score: 50,
        conflicts: []
      }
    }));

    // Add Id column if not present
    if (!columns.some(c => c.name.toLowerCase() === 'id')) {
      columns.unshift({
        name: 'Id',
        tableName: cshtmlData.linkedTable!,
        dataType: 'INT',
        isNullable: false,
        isPrimaryKey: true,
        isIdentity: true,
        intelligence: {
          isPII: false,
          isPHI: false,
          isFK: false,
          isSearchable: true,
          isFilterable: true,
          isDisplayField: false,
          validationRules: []
        },
        sources: {
          fromDDL: false,
          fromCSHTML: false,
          fromSP: false,
          ddlFile: undefined,
          cshtmlFiles: [],
          spFiles: []
        },
        verification: {
          status: 'pending',
          score: 30,
          conflicts: []
        }
      });
    }

    const spOperations = this.buildSPOperations(spMappings);
    const uiIntelligence = this.buildUIIntelligence([cshtmlData]);

    return {
      tableName: cshtmlData.linkedTable!,
      schemaName: 'dbo',
      sources: {
        primary: {
          type: 'cshtml',
          fileName: cshtmlData.viewName,
          confidence: 0.7,
          discoveredAt: cshtmlData.createdAt
        },
        secondary: [],
        allFiles: [cshtmlData.viewName]
      },
      columns,
      foreignKeys: [],
      referencedBy: [],
      spOperations,
      uiIntelligence,
      verification: {
        status: 'pending',
        score: 50,
        issues: [{
          type: 'missing_ddl',
          severity: 'high',
          description: 'Table discovered from CSHTML only, no SQL DDL definition found',
          suggestion: 'Upload SQL DDL file or verify table structure'
        }]
      },
      metadata: {
        createdAt: cshtmlData.createdAt,
        updatedAt: cshtmlData.updatedAt,
        version: 1,
        confidenceScore: 50,
        completenessScore: 30
      }
    };
  }

  private async buildUnifiedColumns(
    sqlColumns: ColumnDef[],
    tableName: string,
    cshtmlData: CSHTMLCacheEntry[],
    columnIntelligence: ColumnIntelligenceEntry[]
  ): Promise<UnifiedColumnSchema[]> {
    return sqlColumns.map(col => {
      // Find CSHTML intelligence for this column
      const cshtmlField = this.findCSHTMLField(col.name, cshtmlData);
      
      // Find column intelligence
      const intel = columnIntelligence.find(
        i => i.columnName.toLowerCase() === col.name.toLowerCase()
      );

      // Build unified column
      const unified: UnifiedColumnSchema = {
        name: col.name,
        tableName,
        dataType: col.dataType,
        maxLength: col.maxLength,
        isNullable: col.isNullable,
        isPrimaryKey: col.isPrimaryKey,
        isIdentity: col.isIdentity,
        defaultValue: col.defaultValue,
        intelligence: {
          semanticType: intel?.semanticType || col.semanticType,
          uiType: intel?.uiType || col.uiType,
          isPII: intel?.sensitivity === 'pii' || col.sensitivity === 'pii',
          isPHI: intel?.sensitivity === 'phi' || col.sensitivity === 'phi',
          isFK: col.semanticType === 'foreign_key',
          fkTarget: col.semanticType === 'foreign_key' ? {
            table: col.fkTargetTable || '',
            column: col.fkTargetColumn || 'Id'
          } : undefined,
          isSearchable: intel?.isSearchable ?? false,
          isFilterable: intel?.isFilterable ?? false,
          isDisplayField: intel?.displayInList ?? true,
          validationRules: intel?.validationRules ? JSON.parse(intel.validationRules) : []
        },
        sources: {
          fromDDL: true,
          fromCSHTML: !!cshtmlField,
          fromSP: false,
          ddlFile: undefined,
          cshtmlFiles: cshtmlField ? cshtmlData.map(c => c.viewName) : [],
          spFiles: []
        },
        cshtmlIntelligence: cshtmlField ? {
          label: cshtmlField.label,
          placeholder: cshtmlField.placeholder,
          inputType: cshtmlField.inputType,
          isRequired: cshtmlField.isRequired,
          isReadOnly: cshtmlField.isReadOnly,
          defaultValue: cshtmlField.defaultValue,
          validations: cshtmlField.validation || [],
          dropdownSource: cshtmlField.dropdownSource
        } : undefined,
        verification: {
          status: 'verified',
          score: 90,
          conflicts: []
        }
      };

      return unified;
    });
  }

  private findCSHTMLField(
    columnName: string, 
    cshtmlData: CSHTMLCacheEntry[]
  ): CSHTMLField | undefined {
    for (const cshtml of cshtmlData) {
      if (cshtml.fields) {
        const fields = JSON.parse(cshtml.fields);
        const field = fields.find(
          (f: { name: string }) => f.name.toLowerCase() === columnName.toLowerCase()
        );
        if (field) return field;
      }
    }
    return undefined;
  }

  private buildForeignKeys(fks: ForeignKeyDef[]): UnifiedForeignKey[] {
    return fks.map(fk => ({
      constraintName: fk.constraintName,
      columnName: fk.columnName,
      referencesTable: fk.referencesTable,
      referencesColumn: fk.referencesColumn,
      source: 'ddl' as const,
      confidence: 1.0,
      isVerified: true
    }));
  }

  private buildSPOperations(mappings: SPMappingEntry[]): UnifiedTableSchema['spOperations'] {
    const operations: SPOperation[] = mappings.map(m => ({
      spName: m.spName,
      operationType: m.operationType as SPOperation['operationType'],
      accessType: m.accessType as SPOperation['accessType'],
      columns: m.columnsRead ? JSON.parse(m.columnsRead) : [],
      confidence: m.confidence,
      isVerified: m.isVerified
    }));

    return {
      create: operations.find(o => o.operationType === 'INSERT' && /add|create|insert/i.test(o.spName)) || null,
      read: operations.find(o => o.operationType === 'SELECT' && /get|read|fetch|ddl/i.test(o.spName)) || null,
      update: operations.find(o => o.operationType === 'UPDATE' && /update|edit|modify/i.test(o.spName)) || null,
      delete: operations.find(o => o.operationType === 'DELETE' && /delete|remove/i.test(o.spName)) || null,
      search: operations.find(o => o.operationType === 'SELECT' && /search|find|filter/i.test(o.spName)) || null,
      dropdown: operations.find(o => o.operationType === 'SELECT' && /ddl|dropdown|list/i.test(o.spName)) || null,
      all: operations
    };
  }

  private buildUIIntelligence(cshtmlData: CSHTMLCacheEntry[]): UnifiedTableSchema['uiIntelligence'] {
    const forms: FormIntelligenceRef[] = [];
    const dataTables: DataTableIntelligenceRef[] = [];
    const endpoints: EndpointIntelligenceRef[] = [];
    const lookupUsage: LookupUsageRef[] = [];

    for (const cshtml of cshtmlData) {
      // Extract forms
      if (cshtml.viewType === 'form' || cshtml.viewType === 'mixed') {
        const fields = cshtml.fields ? JSON.parse(cshtml.fields) : [];
        forms.push({
          viewName: cshtml.viewName,
          formId: cshtml.viewName,
          action: cshtml.viewName,
          method: 'POST',
          fieldCount: fields.length,
          hasAjax: true,
          hasValidation: true
        });
      }

      // Extract DataTables
      if (cshtml.viewType === 'list' || cshtml.viewType === 'mixed') {
        dataTables.push({
          viewName: cshtml.viewName,
          tableSelector: `#${cshtml.viewName}Table`,
          columnCount: 0,
          features: ['paging', 'search', 'sort']
        });
      }
    }

    return { forms, dataTables, endpoints, lookupUsage };
  }

  private buildVerification(
    tableSource: TableSourceEntry | undefined,
    verificationItems: VerificationEntry[],
    columns: UnifiedColumnSchema[]
  ): UnifiedTableSchema['verification'] {
    const issues: VerificationIssue[] = [];
    
    // Check for missing DDL
    if (!tableSource || tableSource.discoveryMethod !== 'ddl') {
      issues.push({
        type: 'missing_ddl',
        severity: 'high',
        description: 'No SQL DDL definition found for this table',
        suggestion: 'Upload SQL DDL file to provide complete table definition'
      });
    }

    // Check for missing SPs
    if (columns.length > 0 && !tableSource?.hasCRUD_SPs) {
      issues.push({
        type: 'missing_sp',
        severity: 'medium',
        description: 'No CRUD stored procedures found for this table',
        suggestion: 'Consider creating stored procedures for data operations'
      });
    }

    // Add verification items
    for (const item of verificationItems) {
      if (item.status === 'pending') {
        issues.push({
          type: 'column_mismatch',
          severity: item.priority === 'critical' ? 'critical' : 
                    item.priority === 'high' ? 'high' : 'medium',
          description: item.triggerDetails || 'Verification pending',
          suggestion: 'Review and verify the table structure'
        });
      }
    }

    // Calculate overall status
    const hasCritical = issues.some(i => i.severity === 'critical');
    const hasHigh = issues.some(i => i.severity === 'high');
    const pendingColumns = columns.filter(c => c.verification.status === 'pending').length;

    let status: UnifiedTableSchema['verification']['status'];
    if (hasCritical) {
      status = 'conflict';
    } else if (hasHigh || pendingColumns > columns.length / 2) {
      status = 'pending';
    } else if (issues.length > 0) {
      status = 'partial';
    } else {
      status = 'verified';
    }

    return {
      status,
      score: tableSource?.verificationScore || 50,
      verifiedBy: tableSource?.verifiedBy || undefined,
      verifiedAt: tableSource?.verifiedAt || undefined,
      issues
    };
  }

  private buildSources(
    tableSource: TableSourceEntry | undefined,
    cshtmlData: CSHTMLCacheEntry[],
    spMappings: SPMappingEntry[]
  ): UnifiedTableSchema['sources'] {
    const primary: SchemaSource = tableSource ? {
      type: tableSource.discoveryMethod as SchemaSource['type'],
      fileName: tableSource.primarySourceFile || 'unknown',
      confidence: tableSource.discoveryConfidence,
      discoveredAt: tableSource.createdAt
    } : {
      type: 'inferred',
      fileName: 'unknown',
      confidence: 0.5,
      discoveredAt: new Date()
    };

    const secondary: SchemaSource[] = cshtmlData.map(cshtml => ({
      type: 'cshtml' as const,
      fileName: cshtml.viewName,
      confidence: 0.7,
      discoveredAt: cshtml.createdAt
    }));

    const allFiles = [
      primary.fileName,
      ...secondary.map(s => s.fileName)
    ].filter(f => f !== 'unknown');

    return { primary, secondary, allFiles };
  }

  // ===========================================================================
  // Helper Methods
  // ===========================================================================

  private buildReverseFKReferences(tables: UnifiedTableSchema[]): void {
    // Build reverse FK references
    for (const table of tables) {
      for (const fk of table.foreignKeys) {
        const refTable = tables.find(
          t => t.tableName.toLowerCase() === fk.referencesTable.toLowerCase()
        );
        if (refTable) {
          refTable.referencedBy.push({
            ...fk,
            columnName: fk.columnName,
            referencesTable: table.tableName,
            referencesColumn: fk.columnName
          });
        }
      }
    }
  }

  private calculateConfidenceScore(
    sources: UnifiedTableSchema['sources'],
    spOperations: UnifiedTableSchema['spOperations'],
    columns: UnifiedColumnSchema[]
  ): number {
    let score = 0;

    // Source confidence
    score += sources.primary.confidence * 50;

    // SP coverage
    const spCount = spOperations.all.length;
    if (spCount >= 4) score += 20;
    else if (spCount >= 2) score += 10;
    else if (spCount >= 1) score += 5;

    // Column completeness
    const columnsWithSources = columns.filter(
      c => c.sources.fromDDL || c.sources.fromCSHTML
    ).length;
    score += (columnsWithSources / Math.max(columns.length, 1)) * 30;

    return Math.min(100, Math.round(score));
  }

  private calculateCompletenessScore(table: UnifiedTableSchema): number {
    let score = 0;
    const weights = {
      hasDDL: 30,
      hasColumns: 20,
      hasPK: 10,
      hasSPs: 20,
      hasUI: 10,
      hasFKs: 10
    };

    if (table.sources.primary.type === 'ddl') score += weights.hasDDL;
    if (table.columns.length > 0) score += weights.hasColumns;
    if (table.columns.some(c => c.isPrimaryKey)) score += weights.hasPK;
    if (table.spOperations.all.length > 0) score += weights.hasSPs;
    if (table.uiIntelligence.forms.length > 0 || table.uiIntelligence.dataTables.length > 0) {
      score += weights.hasUI;
    }
    if (table.foreignKeys.length > 0 || table.referencedBy.length > 0) {
      score += weights.hasFKs;
    }

    return score;
  }

  private inferDataTypeFromCSHTML(inputType: string): string {
    const typeMap: Record<string, string> = {
      'text_input': 'NVARCHAR(255)',
      'email_input': 'NVARCHAR(255)',
      'password_input': 'NVARCHAR(255)',
      'number_input': 'INT',
      'currency_input': 'DECIMAL(18,2)',
      'date_picker': 'DATE',
      'time_picker': 'TIME',
      'datetime_picker': 'DATETIME',
      'textarea': 'NVARCHAR(MAX)',
      'checkbox': 'BIT',
      'dropdown': 'INT',
      'file_upload': 'NVARCHAR(500)'
    };
    return typeMap[inputType] || 'NVARCHAR(255)';
  }

  // ===========================================================================
  // Database Query Methods
  // ===========================================================================

  private async getSQLTablesFromDB(): Promise<(TableDef & { id?: string })[]> {
    // Get tables from ToolkitTable cache
    const cachedTables = await prisma.toolkitTable.findMany({
      where: { projectId: this.projectId }
    });

    if (cachedTables.length > 0) {
      return cachedTables.map(t => {
        // Parse columns from JSON string
        let columns: Array<{
          name: string;
          dataType: string;
          maxLength?: string;
          isNullable: boolean;
          isPrimaryKey: boolean;
          isIdentity: boolean;
          defaultValue?: string;
        }> = [];
        
        try {
          columns = JSON.parse(t.columns || '[]');
        } catch {
          columns = [];
        }

        return {
          tableName: t.tableName,
          schemaName: t.schemaName || 'dbo',
          columns: columns.map(c => ({
            name: c.name,
            dataType: c.dataType || 'NVARCHAR',
            maxLength: c.maxLength,
            isNullable: c.isNullable ?? true,
            isPrimaryKey: c.isPrimaryKey ?? false,
            isIdentity: c.isIdentity ?? false,
            defaultValue: c.defaultValue || undefined
          })),
          foreignKeys: [],
          indexes: [],
          checkConstraints: [],
          sourceDDL: t.sourceDDL || undefined
        };
      });
    }

    return [];
  }

  private async getCSHTMLCacheFromDB(): Promise<CSHTMLCacheEntry[]> {
    return prisma.cSHTMLAnalysisCache.findMany({
      where: { projectId: this.projectId }
    }) as Promise<CSHTMLCacheEntry[]>;
  }

  private async getSPMappingsFromDB(): Promise<SPMappingEntry[]> {
    return prisma.sPTableMapping.findMany({
      where: { projectId: this.projectId }
    }) as Promise<SPMappingEntry[]>;
  }

  private async getColumnIntelligenceFromDB(): Promise<ColumnIntelligenceEntry[]> {
    return prisma.columnIntelligenceCache.findMany() as Promise<ColumnIntelligenceEntry[]>;
  }

  private async getTableSourcesFromDB(): Promise<TableSourceEntry[]> {
    // Check if TableSourceRecord model exists
    try {
      return prisma.tableSourceRecord.findMany({
        where: { projectId: this.projectId }
      }) as Promise<TableSourceEntry[]>;
    } catch {
      return [];
    }
  }

  private async getVerificationQueueFromDB(): Promise<VerificationEntry[]> {
    try {
      return prisma.verificationQueue.findMany({
        where: { projectId: this.projectId }
      }) as Promise<VerificationEntry[]>;
    } catch {
      return [];
    }
  }

  // ===========================================================================
  // Utility Methods
  // ===========================================================================

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Export unified schema to JSON
   */
  async exportToJSON(): Promise<string> {
    const { tables, stats } = await this.buildUnifiedSchema();
    return JSON.stringify({ tables, stats }, null, 2);
  }

  /**
   * Get schema summary for dashboard
   */
  async getSchemaSummary(): Promise<SchemaSummary> {
    const { tables, stats } = await this.buildUnifiedSchema();

    return {
      totalTables: stats.totalTables,
      totalColumns: tables.reduce((sum, t) => sum + t.columns.length, 0),
      totalFKs: stats.totalFKs,
      totalSPs: stats.tablesWithSPs,
      totalEndpoints: tables.reduce(
        (sum, t) => sum + t.uiIntelligence.endpoints.length, 0
      ),
      verificationStats: {
        verified: stats.verifiedTables,
        pending: stats.pendingVerification,
        partial: tables.filter(t => t.verification.status === 'partial').length,
        conflict: tables.filter(t => t.verification.status === 'conflict').length
      },
      completenessDistribution: {
        high: tables.filter(t => t.metadata.completenessScore >= 80).length,
        medium: tables.filter(t => 
          t.metadata.completenessScore >= 50 && t.metadata.completenessScore < 80
        ).length,
        low: tables.filter(t => t.metadata.completenessScore < 50).length
      },
      tableList: tables.map(t => ({
        name: t.tableName,
        columns: t.columns.length,
        fks: t.foreignKeys.length,
        sps: t.spOperations.all.length,
        verification: t.verification.status,
        completeness: t.metadata.completenessScore
      }))
    };
  }
}

// =============================================================================
// Types for Database Queries
// =============================================================================

interface CSHTMLCacheEntry {
  id: string;
  projectId: string;
  viewName: string;
  viewType: string;
  linkedTable: string | null;
  fields: string | null;
  modelName?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface SPMappingEntry {
  id: string;
  spName: string;
  tableName: string;
  operationType: string;
  accessType: string;
  columnsRead: string | null;
  columnsWritten: string | null;
  confidence: number;
  isVerified: boolean;
}

interface ColumnIntelligenceEntry {
  tableName: string;
  columnName: string;
  semanticType: string | null;
  uiType: string | null;
  sensitivity: string | null;
  isSearchable: boolean;
  isFilterable: boolean;
  displayInList: boolean;
  validationRules: string | null;
}

interface TableSourceEntry {
  id: string;
  tableName: string;
  primarySourceFile: string | null;
  discoveryMethod: string;
  discoveryConfidence: number;
  hasCRUD_SPs: boolean;
  verificationStatus: string;
  verificationScore: number;
  verifiedBy: string | null;
  verifiedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface VerificationEntry {
  id: string;
  entityType: string;
  entityName: string;
  status: string;
  priority: string;
  triggerDetails: string | null;
  triggerSource?: string | null;
}

interface CSHTMLField {
  name: string;
  label?: string;
  placeholder?: string;
  inputType?: string;
  isRequired?: boolean;
  isReadOnly?: boolean;
  defaultValue?: string;
  validation?: string[];
  dropdownSource?: string;
}

interface BuildStats {
  totalTables: number;
  tablesWithDDL: number;
  tablesWithSPs: number;
  tablesWithUI: number;
  verifiedTables: number;
  pendingVerification: number;
  totalFKs: number;
  buildTimeMs: number;
}

interface BuildIssue {
  type: string;
  tableName: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
}

interface SchemaSummary {
  totalTables: number;
  totalColumns: number;
  totalFKs: number;
  totalSPs: number;
  totalEndpoints: number;
  verificationStats: {
    verified: number;
    pending: number;
    partial: number;
    conflict: number;
  };
  completenessDistribution: {
    high: number;
    medium: number;
    low: number;
  };
  tableList: Array<{
    name: string;
    columns: number;
    fks: number;
    sps: number;
    verification: string;
    completeness: number;
  }>;
}

// =============================================================================
// Export Convenience Functions
// =============================================================================

export function createUnifiedSchemaManager(projectId: string): UnifiedSchemaManager {
  return new UnifiedSchemaManager(projectId);
}

export async function getUnifiedSchema(projectId: string): Promise<{
  tables: UnifiedTableSchema[];
  stats: BuildStats;
  issues: BuildIssue[];
}> {
  const manager = new UnifiedSchemaManager(projectId);
  return manager.buildUnifiedSchema();
}

export async function getUnifiedTable(projectId: string, tableName: string): Promise<UnifiedTableSchema | null> {
  const manager = new UnifiedSchemaManager(projectId);
  return manager.getUnifiedTable(tableName);
}

export async function getSchemaSummary(projectId: string): Promise<SchemaSummary> {
  const manager = new UnifiedSchemaManager(projectId);
  return manager.getSchemaSummary();
}
