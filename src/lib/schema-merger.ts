// =============================================================================
// Schema Merger - Advanced SQL + CSHTML Schema Merging Engine
// =============================================================================
// Handles complex merge scenarios, conflict resolution, and intelligence fusion
// =============================================================================

import { 
  UnifiedTableSchema, 
  UnifiedColumnSchema, 
  UnifiedForeignKey,
  SPOperation,
  SchemaSource
} from './unified-schema-manager';
import { TableDef, ColumnDef, ForeignKeyDef } from './types';
import { CSHTMLIntelligence, FieldIntelligence } from './parsers/cshtml-intelligence';

// =============================================================================
// Merge Strategy Types
// =============================================================================

export type MergeStrategy = 
  | 'prefer_sql'      // SQL DDL takes precedence
  | 'prefer_cshtml'   // CSHTML intelligence takes precedence
  | 'prefer_sp'       // SP inference takes precedence  
  | 'prefer_latest'   // Most recent source wins
  | 'merge_all'       // Combine all sources
  | 'highest_confidence'; // Use highest confidence source

export interface MergeConfig {
  strategy: MergeStrategy;
  confidenceThreshold: number;
  resolveConflicts: boolean;
  preserveSources: boolean;
  inferMissing: boolean;
}

export interface MergeResult {
  tables: UnifiedTableSchema[];
  conflicts: MergeConflict[];
  resolutions: MergeResolution[];
  stats: MergeStats;
}

export interface MergeConflict {
  id: string;
  type: 'column_type' | 'column_nullable' | 'column_missing' | 'fk_mismatch' | 'table_missing';
  tableName: string;
  columnName?: string;
  sources: ConflictSource[];
  severity: 'critical' | 'high' | 'medium' | 'low';
  autoResolvable: boolean;
  suggestedResolution?: string;
}

export interface ConflictSource {
  type: 'sql' | 'cshtml' | 'sp';
  fileName: string;
  value: string;
  confidence: number;
}

export interface MergeResolution {
  conflictId: string;
  strategy: 'auto' | 'manual';
  chosenSource: 'sql' | 'cshtml' | 'sp';
  chosenValue: string;
  reason: string;
}

export interface MergeStats {
  tablesProcessed: number;
  columnsMerged: number;
  conflictsFound: number;
  conflictsResolved: number;
  inferredColumns: number;
  inferredFKs: number;
  mergeTimeMs: number;
}

// =============================================================================
// Schema Merger Class
// =============================================================================

export class SchemaMerger {
  private config: MergeConfig;
  private conflicts: MergeConflict[] = [];
  private resolutions: MergeResolution[] = [];

  constructor(config?: Partial<MergeConfig>) {
    this.config = {
      strategy: config?.strategy || 'prefer_sql',
      confidenceThreshold: config?.confidenceThreshold || 0.7,
      resolveConflicts: config?.resolveConflicts ?? true,
      preserveSources: config?.preserveSources ?? true,
      inferMissing: config?.inferMissing ?? true
    };
  }

  // ===========================================================================
  // Main Merge Methods
  // ===========================================================================

  /**
   * Merge SQL tables with CSHTML intelligence
   */
  mergeSchemas(
    sqlTables: TableDef[],
    cshtmlIntelligence: CSHTMLIntelligence[],
    spMappings?: SPMapping[]
  ): MergeResult {
    const startTime = Date.now();
    this.conflicts = [];
    this.resolutions = [];

    const mergedTables: UnifiedTableSchema[] = [];
    let columnsMerged = 0;
    let inferredColumns = 0;
    let inferredFKs = 0;

    // Create lookup maps
    const cshtmlByTable = this.groupCSHTMLByTable(cshtmlIntelligence);
    const spByTable = this.groupSPByTable(spMappings || []);

    // Process SQL tables first
    for (const sqlTable of sqlTables) {
      const tableName = sqlTable.tableName;
      const cshtmlData = cshtmlByTable.get(tableName.toLowerCase()) || [];
      const spData = spByTable.get(tableName.toLowerCase()) || [];

      const merged = this.mergeTable(sqlTable, cshtmlData, spData);
      mergedTables.push(merged);
      columnsMerged += merged.columns.length;
      inferredColumns += merged.columns.filter(c => 
        c.sources.fromCSHTML && !c.sources.fromDDL
      ).length;
      inferredFKs += merged.foreignKeys.filter(fk => 
        fk.source !== 'ddl'
      ).length;
    }

    // Add CSHTML-only tables
    const sqlTableNames = new Set(sqlTables.map(t => t.tableName.toLowerCase()));
    for (const entry of Array.from(cshtmlByTable.entries())) {
      const [tableName, cshtmlData] = entry;
      if (!sqlTableNames.has(tableName.toLowerCase())) {
        const merged = this.createTableFromCSHTML(cshtmlData);
        mergedTables.push(merged);
        inferredColumns += merged.columns.length;
      }
    }

    // Build reverse FK references
    this.buildReverseFKs(mergedTables);

    // Resolve conflicts if enabled
    if (this.config.resolveConflicts) {
      this.resolveAllConflicts(mergedTables);
    }

    const stats: MergeStats = {
      tablesProcessed: mergedTables.length,
      columnsMerged,
      conflictsFound: this.conflicts.length,
      conflictsResolved: this.resolutions.length,
      inferredColumns,
      inferredFKs,
      mergeTimeMs: Date.now() - startTime
    };

    return {
      tables: mergedTables,
      conflicts: this.conflicts,
      resolutions: this.resolutions,
      stats
    };
  }

  /**
   * Merge a single table
   */
  private mergeTable(
    sqlTable: TableDef,
    cshtmlData: CSHTMLIntelligence[],
    spData: SPMapping[]
  ): UnifiedTableSchema {
    // Merge columns
    const columns = this.mergeColumns(sqlTable.columns, sqlTable.tableName, cshtmlData);
    
    // Merge foreign keys
    const foreignKeys = this.mergeForeignKeys(
      sqlTable.foreignKeys, 
      sqlTable.tableName,
      cshtmlData,
      spData
    );

    // Build sources
    const sources = this.buildSources(sqlTable, cshtmlData);

    // Build SP operations
    const spOperations = this.buildSPOperations(spData);

    // Build UI intelligence
    const uiIntelligence = this.buildUIIntelligence(cshtmlData);

    // Calculate verification
    const verification = this.calculateVerification(sqlTable, cshtmlData, columns);

    // Calculate metadata
    const metadata = this.calculateMetadata(sources, spOperations, columns);

    return {
      tableName: sqlTable.tableName,
      schemaName: sqlTable.schemaName,
      sources,
      columns,
      foreignKeys,
      referencedBy: [],
      spOperations,
      uiIntelligence,
      verification,
      metadata
    };
  }

  /**
   * Merge columns from SQL and CSHTML
   */
  private mergeColumns(
    sqlColumns: ColumnDef[],
    tableName: string,
    cshtmlData: CSHTMLIntelligence[]
  ): UnifiedColumnSchema[] {
    const mergedColumns: UnifiedColumnSchema[] = [];
    const processedColumns = new Set<string>();

    // Process SQL columns
    for (const sqlCol of sqlColumns) {
      const cshtmlField = this.findCSHTMLField(sqlCol.name, cshtmlData);
      
      const merged = this.mergeColumn(sqlCol, cshtmlField, tableName);
      mergedColumns.push(merged);
      processedColumns.add(sqlCol.name.toLowerCase());
    }

    // Add CSHTML-only columns if inference is enabled
    if (this.config.inferMissing) {
      for (const cshtml of cshtmlData) {
        for (const form of cshtml.forms) {
          for (const field of form.fields) {
            if (!processedColumns.has(field.name.toLowerCase())) {
              const inferred = this.inferColumnFromCSHTML(field, tableName);
              mergedColumns.push(inferred);
              processedColumns.add(field.name.toLowerCase());

              // Record conflict for missing DDL column
              this.conflicts.push({
                id: `${tableName}-${field.name}-missing-ddl`,
                type: 'column_missing',
                tableName,
                columnName: field.name,
                sources: [{
                  type: 'cshtml',
                  fileName: cshtml.viewName,
                  value: `${field.type} (inferred)`,
                  confidence: 0.6
                }],
                severity: 'medium',
                autoResolvable: true,
                suggestedResolution: `Add column "${field.name}" to DDL or remove from CSHTML`
              });
            }
          }
        }
      }
    }

    return mergedColumns;
  }

  /**
   * Merge a single column
   */
  private mergeColumn(
    sqlCol: ColumnDef,
    cshtmlField: FieldIntelligence | null,
    tableName: string
  ): UnifiedColumnSchema {
    // Check for conflicts
    if (cshtmlField && this.config.strategy !== 'prefer_sql') {
      this.detectColumnConflicts(sqlCol, cshtmlField, tableName);
    }

    // Merge based on strategy
    const merged: UnifiedColumnSchema = {
      name: sqlCol.name,
      tableName,
      dataType: sqlCol.dataType,
      maxLength: sqlCol.maxLength,
      isNullable: sqlCol.isNullable,
      isPrimaryKey: sqlCol.isPrimaryKey,
      isIdentity: sqlCol.isIdentity,
      defaultValue: sqlCol.defaultValue,
      intelligence: {
        semanticType: sqlCol.semanticType,
        uiType: sqlCol.uiType || cshtmlField?.type,
        isPII: sqlCol.sensitivity === 'pii' || sqlCol.sensitivity === 'phi',
        isPHI: sqlCol.sensitivity === 'phi',
        isFK: sqlCol.semanticType === 'foreign_key',
        fkTarget: sqlCol.semanticType === 'foreign_key' ? {
          table: sqlCol.fkTargetTable || '',
          column: sqlCol.fkTargetColumn || 'Id'
        } : undefined,
        isSearchable: this.inferSearchable(sqlCol),
        isFilterable: this.inferFilterable(sqlCol),
        isDisplayField: true,
        validationRules: sqlCol.validation?.map(v => v.type) || []
      },
      sources: {
        fromDDL: true,
        fromCSHTML: !!cshtmlField,
        fromSP: false,
        ddlFile: undefined,
        cshtmlFiles: cshtmlField ? [cshtmlField.name] : [],
        spFiles: []
      },
      cshtmlIntelligence: cshtmlField ? {
        label: cshtmlField.label,
        placeholder: cshtmlField.placeholder,
        inputType: cshtmlField.type,
        isRequired: cshtmlField.isRequired,
        isReadOnly: cshtmlField.isReadOnly,
        defaultValue: cshtmlField.defaultValue,
        validations: cshtmlField.validation,
        dropdownSource: cshtmlField.dataSource,
        cascadeParent: cshtmlField.dependsOn?.[0],
      } : undefined,
      verification: {
        status: 'verified',
        score: cshtmlField ? 95 : 90,
        conflicts: []
      }
    };

    return merged;
  }

  /**
   * Infer column from CSHTML field
   */
  private inferColumnFromCSHTML(
    field: FieldIntelligence,
    tableName: string
  ): UnifiedColumnSchema {
    return {
      name: field.name,
      tableName,
      dataType: this.inferDataType(field.type, field.maxLength),
      isNullable: !field.isRequired,
      isPrimaryKey: false,
      isIdentity: false,
      intelligence: {
        isPII: this.inferPII(field.name),
        isPHI: this.inferPHI(field.name),
        isFK: this.isFKField(field.name),
        fkTarget: this.isFKField(field.name) ? {
          table: field.name.replace(/Id$/i, ''),
          column: 'Id'
        } : undefined,
        isSearchable: false,
        isFilterable: this.isFKField(field.name),
        isDisplayField: true,
        validationRules: field.validation
      },
      sources: {
        fromDDL: false,
        fromCSHTML: true,
        fromSP: false,
        ddlFile: undefined,
        cshtmlFiles: [tableName],
        spFiles: []
      },
      cshtmlIntelligence: {
        label: field.label,
        inputType: field.type,
        isRequired: field.isRequired,
        isReadOnly: field.isReadOnly,
        defaultValue: field.defaultValue,
        validations: field.validation,
        dropdownSource: field.dataSource
      },
      verification: {
        status: 'pending',
        score: 50,
        conflicts: [{
          type: 'type_mismatch',
          ddlValue: 'unknown',
          otherValue: field.type || 'text',
          source: 'cshtml'
        }]
      }
    };
  }

  /**
   * Merge foreign keys from SQL and SP inference
   */
  private mergeForeignKeys(
    sqlFKs: ForeignKeyDef[],
    tableName: string,
    cshtmlData: CSHTMLIntelligence[],
    spData: SPMapping[]
  ): UnifiedForeignKey[] {
    const merged: UnifiedForeignKey[] = [];
    const processedColumns = new Set<string>();

    // Add SQL FKs
    for (const fk of sqlFKs) {
      merged.push({
        constraintName: fk.constraintName,
        columnName: fk.columnName,
        referencesTable: fk.referencesTable,
        referencesColumn: fk.referencesColumn,
        source: 'ddl',
        confidence: 1.0,
        isVerified: true
      });
      processedColumns.add(fk.columnName.toLowerCase());
    }

    // Infer FKs from CSHTML if enabled
    if (this.config.inferMissing) {
      for (const cshtml of cshtmlData) {
        for (const form of cshtml.forms) {
          for (const field of form.fields) {
            if (field.isForeignKey && 
                field.foreignKeyTarget && 
                !processedColumns.has(field.name.toLowerCase())) {
              merged.push({
                columnName: field.name,
                referencesTable: field.foreignKeyTarget,
                referencesColumn: 'Id',
                source: 'cshtml_inference',
                confidence: 0.7,
                isVerified: false
              });
              processedColumns.add(field.name.toLowerCase());

              this.conflicts.push({
                id: `${tableName}-${field.name}-fk-inferred`,
                type: 'fk_mismatch',
                tableName,
                columnName: field.name,
                sources: [{
                  type: 'cshtml',
                  fileName: cshtml.viewName,
                  value: `FK to ${field.foreignKeyTarget}`,
                  confidence: 0.7
                }],
                severity: 'medium',
                autoResolvable: true,
                suggestedResolution: `Verify FK relationship to ${field.foreignKeyTarget}`
              });
            }
          }
        }
      }
    }

    return merged;
  }

  // ===========================================================================
  // Conflict Detection and Resolution
  // ===========================================================================

  /**
   * Detect conflicts between SQL and CSHTML column definitions
   */
  private detectColumnConflicts(
    sqlCol: ColumnDef,
    cshtmlField: FieldIntelligence,
    tableName: string
  ): void {
    // Type mismatch detection
    const expectedType = this.mapCSHTMLTypeToSQL(cshtmlField.type);
    if (expectedType && !this.typesAreCompatible(sqlCol.dataType, expectedType)) {
      this.conflicts.push({
        id: `${tableName}-${sqlCol.name}-type-mismatch`,
        type: 'column_type',
        tableName,
        columnName: sqlCol.name,
        sources: [
          { type: 'sql', fileName: 'DDL', value: sqlCol.dataType, confidence: 1.0 },
          { type: 'cshtml', fileName: 'CSHTML', value: cshtmlField.type || 'text', confidence: 0.8 }
        ],
        severity: 'high',
        autoResolvable: false,
        suggestedResolution: `SQL type ${sqlCol.dataType} vs CSHTML ${cshtmlField.type}`
      });
    }

    // Nullable mismatch
    if (sqlCol.isNullable && cshtmlField.isRequired) {
      this.conflicts.push({
        id: `${tableName}-${sqlCol.name}-nullable-mismatch`,
        type: 'column_nullable',
        tableName,
        columnName: sqlCol.name,
        sources: [
          { type: 'sql', fileName: 'DDL', value: 'NULLABLE', confidence: 1.0 },
          { type: 'cshtml', fileName: 'CSHTML', value: 'REQUIRED', confidence: 0.8 }
        ],
        severity: 'medium',
        autoResolvable: true,
        suggestedResolution: 'Mark column as NOT NULL or remove required validation'
      });
    }
  }

  /**
   * Resolve all conflicts
   */
  private resolveAllConflicts(tables: UnifiedTableSchema[]): void {
    for (const conflict of this.conflicts) {
      if (conflict.autoResolvable) {
        const resolution = this.resolveConflict(conflict);
        if (resolution) {
          this.resolutions.push(resolution);
          this.applyResolution(tables, resolution);
        }
      }
    }
  }

  /**
   * Resolve a single conflict
   */
  private resolveConflict(conflict: MergeConflict): MergeResolution | null {
    switch (this.config.strategy) {
      case 'prefer_sql':
        const sqlSource = conflict.sources.find(s => s.type === 'sql');
        if (sqlSource) {
          return {
            conflictId: conflict.id,
            strategy: 'auto',
            chosenSource: 'sql',
            chosenValue: sqlSource.value,
            reason: 'SQL DDL takes precedence'
          };
        }
        break;

      case 'prefer_cshtml':
        const cshtmlSource = conflict.sources.find(s => s.type === 'cshtml');
        if (cshtmlSource) {
          return {
            conflictId: conflict.id,
            strategy: 'auto',
            chosenSource: 'cshtml',
            chosenValue: cshtmlSource.value,
            reason: 'CSHTML intelligence takes precedence'
          };
        }
        break;

      case 'highest_confidence':
        const highest = conflict.sources.reduce((best, s) => 
          s.confidence > best.confidence ? s : best
        );
        return {
          conflictId: conflict.id,
          strategy: 'auto',
          chosenSource: highest.type,
          chosenValue: highest.value,
          reason: `Highest confidence: ${highest.confidence}`
        };
    }

    return null;
  }

  /**
   * Apply resolution to tables
   */
  private applyResolution(tables: UnifiedTableSchema[], resolution: MergeResolution): void {
    // Find the affected table and column
    const conflict = this.conflicts.find(c => c.id === resolution.conflictId);
    if (!conflict) return;

    const table = tables.find(t => t.tableName === conflict.tableName);
    if (!table) return;

    const column = table.columns.find(c => c.name === conflict.columnName);
    if (!column) return;

    // Apply resolution
    switch (conflict.type) {
      case 'column_nullable':
        if (resolution.chosenSource === 'sql') {
          column.isNullable = true;
        } else {
          column.isNullable = false;
        }
        column.verification.conflicts = column.verification.conflicts.filter(
          c => c.type !== 'nullable_mismatch'
        );
        break;
    }
  }

  // ===========================================================================
  // Helper Methods
  // ===========================================================================

  private groupCSHTMLByTable(
    cshtmlData: CSHTMLIntelligence[]
  ): Map<string, CSHTMLIntelligence[]> {
    const map = new Map<string, CSHTMLIntelligence[]>();
    
    for (const cshtml of cshtmlData) {
      if (cshtml.model?.linkedTable) {
        const key = cshtml.model.linkedTable.toLowerCase();
        if (!map.has(key)) {
          map.set(key, []);
        }
        map.get(key)!.push(cshtml);
      }
    }

    return map;
  }

  private groupSPByTable(spMappings: SPMapping[]): Map<string, SPMapping[]> {
    const map = new Map<string, SPMapping[]>();
    
    for (const sp of spMappings) {
      const key = sp.tableName.toLowerCase();
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(sp);
    }

    return map;
  }

  private findCSHTMLField(
    columnName: string,
    cshtmlData: CSHTMLIntelligence[]
  ): FieldIntelligence | null {
    for (const cshtml of cshtmlData) {
      for (const form of cshtml.forms) {
        const field = form.fields.find(
          f => f.name.toLowerCase() === columnName.toLowerCase()
        );
        if (field) return field;
      }
    }
    return null;
  }

  private buildSources(
    sqlTable: TableDef,
    cshtmlData: CSHTMLIntelligence[]
  ): UnifiedTableSchema['sources'] {
    const primary: SchemaSource = {
      type: 'ddl',
      fileName: sqlTable.sourceDDL || 'unknown',
      confidence: 1.0,
      discoveredAt: new Date()
    };

    const secondary: SchemaSource[] = cshtmlData.map(cshtml => ({
      type: 'cshtml' as const,
      fileName: cshtml.viewName,
      confidence: 0.7,
      discoveredAt: new Date()
    }));

    return {
      primary,
      secondary,
      allFiles: [primary.fileName, ...secondary.map(s => s.fileName)].filter(f => f !== 'unknown')
    };
  }

  private buildSPOperations(spData: SPMapping[]): UnifiedTableSchema['spOperations'] {
    const operations: SPOperation[] = spData.map(sp => ({
      spName: sp.spName,
      operationType: sp.operationType as SPOperation['operationType'],
      accessType: sp.accessType as SPOperation['accessType'],
      columns: sp.columnsRead || [],
      confidence: sp.confidence,
      isVerified: sp.isVerified
    }));

    return {
      create: operations.find(o => o.operationType === 'INSERT') || null,
      read: operations.find(o => o.operationType === 'SELECT') || null,
      update: operations.find(o => o.operationType === 'UPDATE') || null,
      delete: operations.find(o => o.operationType === 'DELETE') || null,
      search: null,
      dropdown: null,
      all: operations
    };
  }

  private buildUIIntelligence(cshtmlData: CSHTMLIntelligence[]): UnifiedTableSchema['uiIntelligence'] {
    return {
      forms: cshtmlData.flatMap(c => c.forms.map(f => ({
        viewName: c.viewName,
        formId: f.id,
        action: f.action,
        method: f.method,
        fieldCount: f.fields.length,
        hasAjax: f.hasAjaxSubmit,
        hasValidation: f.hasClientValidation
      }))),
      dataTables: cshtmlData.flatMap(c => c.tables.map(t => ({
        viewName: c.viewName,
        tableSelector: t.selector,
        ajaxUrl: t.ajaxUrl,
        columnCount: t.columns.length,
        features: []
      }))),
      endpoints: cshtmlData.flatMap(c => c.endpoints.map(e => ({
        url: e.url,
        method: e.method,
        source: e.source,
        viewName: c.viewName,
        confidence: e.confidence
      }))),
      lookupUsage: []
    };
  }

  private calculateVerification(
    sqlTable: TableDef,
    cshtmlData: CSHTMLIntelligence[],
    columns: UnifiedColumnSchema[]
  ): UnifiedTableSchema['verification'] {
    const pendingColumns = columns.filter(c => c.verification.status === 'pending').length;
    const columnConflicts = columns.filter(c => c.verification.conflicts.length > 0).length;

    let status: UnifiedTableSchema['verification']['status'] = 'verified';
    if (columnConflicts > 0 || this.conflicts.some(c => c.tableName === sqlTable.tableName && c.severity === 'high')) {
      status = 'conflict';
    } else if (pendingColumns > 0) {
      status = 'partial';
    }

    const issues = this.conflicts
      .filter(c => c.tableName === sqlTable.tableName)
      .map(c => ({
        type: c.type as 'missing_ddl' | 'missing_sp' | 'column_mismatch' | 'type_conflict' | 'fk_missing',
        severity: c.severity,
        description: `Column ${c.columnName}: ${c.type}`,
        suggestion: c.suggestedResolution || ''
      }));

    return {
      status,
      score: status === 'verified' ? 95 : status === 'partial' ? 75 : 50,
      issues
    };
  }

  private calculateMetadata(
    sources: UnifiedTableSchema['sources'],
    spOperations: UnifiedTableSchema['spOperations'],
    columns: UnifiedColumnSchema[]
  ): UnifiedTableSchema['metadata'] {
    let confidence = sources.primary.confidence * 50;
    
    if (spOperations.all.length >= 4) confidence += 20;
    else if (spOperations.all.length >= 2) confidence += 10;

    const completeColumns = columns.filter(c => c.sources.fromDDL).length;
    confidence += (completeColumns / Math.max(columns.length, 1)) * 30;

    return {
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1,
      confidenceScore: Math.min(100, Math.round(confidence)),
      completenessScore: Math.round((completeColumns / Math.max(columns.length, 1)) * 100)
    };
  }

  private createTableFromCSHTML(cshtmlData: CSHTMLIntelligence[]): UnifiedTableSchema {
    // Use first CSHTML as primary source
    const primary = cshtmlData[0];
    
    // Collect all fields
    const allFields = cshtmlData.flatMap(c => c.forms.flatMap(f => f.fields));
    const uniqueFields = new Map<string, FieldIntelligence>();
    for (const field of allFields) {
      if (!uniqueFields.has(field.name)) {
        uniqueFields.set(field.name, field);
      }
    }

    const columns = Array.from(uniqueFields.values()).map(field => 
      this.inferColumnFromCSHTML(field, primary.model?.linkedTable || 'Unknown')
    );

    // Add Id if not present
    if (!columns.some(c => c.name.toLowerCase() === 'id')) {
      columns.unshift({
        name: 'Id',
        tableName: primary.model?.linkedTable || 'Unknown',
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

    return {
      tableName: primary.model?.linkedTable || 'Unknown',
      schemaName: 'dbo',
      sources: {
        primary: {
          type: 'cshtml',
          fileName: primary.viewName,
          confidence: 0.7,
          discoveredAt: new Date()
        },
        secondary: cshtmlData.slice(1).map(c => ({
          type: 'cshtml' as const,
          fileName: c.viewName,
          confidence: 0.7,
          discoveredAt: new Date()
        })),
        allFiles: cshtmlData.map(c => c.viewName)
      },
      columns,
      foreignKeys: [],
      referencedBy: [],
      spOperations: {
        create: null,
        read: null,
        update: null,
        delete: null,
        search: null,
        dropdown: null,
        all: []
      },
      uiIntelligence: this.buildUIIntelligence(cshtmlData),
      verification: {
        status: 'pending',
        score: 50,
        issues: [{
          type: 'missing_ddl',
          severity: 'high',
          description: 'Table discovered from CSHTML only',
          suggestion: 'Upload SQL DDL file'
        }]
      },
      metadata: {
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
        confidenceScore: 50,
        completenessScore: 30
      }
    };
  }

  private buildReverseFKs(tables: UnifiedTableSchema[]): void {
    for (const table of tables) {
      for (const fk of table.foreignKeys) {
        const refTable = tables.find(
          t => t.tableName.toLowerCase() === fk.referencesTable.toLowerCase()
        );
        if (refTable) {
          refTable.referencedBy.push({
            ...fk,
            referencesTable: table.tableName
          });
        }
      }
    }
  }

  private inferDataType(cshtmlType?: string, maxLength?: number): string {
    const typeMap: Record<string, string> = {
      'text_input': `NVARCHAR(${maxLength || 255})`,
      'email_input': 'NVARCHAR(255)',
      'password_input': 'NVARCHAR(255)',
      'number_input': 'INT',
      'currency_input': 'DECIMAL(18,2)',
      'date_picker': 'DATE',
      'datetime_picker': 'DATETIME',
      'textarea': 'NVARCHAR(MAX)',
      'checkbox': 'BIT',
      'dropdown': 'INT'
    };
    return typeMap[cshtmlType || 'text_input'] || 'NVARCHAR(255)';
  }

  private inferPII(columnName: string): boolean {
    const piiPatterns = [
      /email/i, /phone/i, /ssn/i, /social.?security/i,
      /credit.?card/i, /password/i, /address/i,
      /firstname/i, /lastname/i, /name$/i
    ];
    return piiPatterns.some(p => p.test(columnName));
  }

  private inferPHI(columnName: string): boolean {
    const phiPatterns = [
      /patient/i, /diagnosis/i, /medical/i, /health/i,
      /disease/i, /treatment/i, /prescription/i,
      /lab.?result/i, /condition/i
    ];
    return phiPatterns.some(p => p.test(columnName));
  }

  private isFKField(columnName: string): boolean {
    return /Id$/i.test(columnName) && columnName.toLowerCase() !== 'id';
  }

  private inferSearchable(col: ColumnDef): boolean {
    const searchableTypes = ['NVARCHAR', 'VARCHAR', 'TEXT', 'NT'];
    const isText = searchableTypes.some(t => col.dataType.toUpperCase().includes(t));
    const notSensitive = col.sensitivity !== 'pii' && col.sensitivity !== 'phi';
    return isText && notSensitive && !col.isPrimaryKey;
  }

  private inferFilterable(col: ColumnDef): boolean {
    return col.semanticType === 'foreign_key' || 
           col.isPrimaryKey ||
           ['INT', 'DATE', 'DATETIME', 'BIT', 'BOOLEAN'].some(t => 
             col.dataType.toUpperCase().includes(t)
           );
  }

  private mapCSHTMLTypeToSQL(cshtmlType?: string): string | null {
    const map: Record<string, string> = {
      'text_input': 'NVARCHAR',
      'email_input': 'NVARCHAR',
      'number_input': 'INT',
      'currency_input': 'DECIMAL',
      'date_picker': 'DATE',
      'datetime_picker': 'DATETIME',
      'checkbox': 'BIT'
    };
    return map[cshtmlType || ''] || null;
  }

  private typesAreCompatible(sqlType: string, expectedType: string): boolean {
    const sqlUpper = sqlType.toUpperCase();
    const expectedUpper = expectedType.toUpperCase();
    
    // Exact match
    if (sqlUpper.includes(expectedUpper)) return true;
    
    // Compatible types
    const compatibleGroups = [
      ['NVARCHAR', 'VARCHAR', 'TEXT', 'CHAR', 'NCHAR'],
      ['INT', 'BIGINT', 'SMALLINT', 'TINYINT'],
      ['DECIMAL', 'NUMERIC', 'FLOAT', 'MONEY'],
      ['DATE', 'DATETIME', 'DATETIME2', 'SMALLDATETIME']
    ];

    return compatibleGroups.some(group => 
      group.some(t => sqlUpper.includes(t)) && group.some(t => expectedUpper.includes(t))
    );
  }
}

// =============================================================================
// Supporting Types
// =============================================================================

interface SPMapping {
  spName: string;
  tableName: string;
  operationType: string;
  accessType: string;
  columnsRead?: string[];
  columnsWritten?: string[];
  confidence: number;
  isVerified: boolean;
}

// =============================================================================
// Export Functions
// =============================================================================

export function createSchemaMerger(config?: Partial<MergeConfig>): SchemaMerger {
  return new SchemaMerger(config);
}

export function mergeSchemas(
  sqlTables: TableDef[],
  cshtmlIntelligence: CSHTMLIntelligence[],
  spMappings?: SPMapping[],
  config?: Partial<MergeConfig>
): MergeResult {
  const merger = new SchemaMerger(config);
  return merger.mergeSchemas(sqlTables, cshtmlIntelligence, spMappings);
}
