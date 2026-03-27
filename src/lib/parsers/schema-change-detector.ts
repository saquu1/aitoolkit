// =============================================================================
// Schema Change Detector - Detect schema changes between uploads
// =============================================================================
// Compares schema snapshots and detects:
// - Added/removed/modified tables
// - Column changes (type, nullability, constraints)
// - Foreign key changes
// - Stored procedure changes
// - Breaking changes detection
// =============================================================================

import { TableDef, ColumnDef, ForeignKeyDef, StoredProcedureDef, CheckConstraintDef } from '../types';
import { createVersion, compareVersions, getVersionHistory } from '../version-comparison';

// =============================================================================
// Types
// =============================================================================

export interface SchemaSnapshot {
  version: string;
  timestamp: Date;
  uploadId: string;
  source: 'sql_upload' | 'cshtml_upload' | 'live_db' | 'manual';
  tables: Map<string, TableSnapshot>;
  storedProcedures: Map<string, SPSnapshot>;
  foreignKeys: Map<string, FKSnapshot>;
  checksum: string;
}

export interface TableSnapshot {
  tableName: string;
  schemaName: string;
  columns: Map<string, ColumnSnapshot>;
  primaryKey: string[];
  indexes: IndexSnapshot[];
  checkConstraints: CheckConstraintSnapshot[];
  rowCount?: number;
}

export interface ColumnSnapshot {
  name: string;
  dataType: string;
  maxLength?: string;
  isNullable: boolean;
  isPrimaryKey: boolean;
  isIdentity: boolean;
  defaultValue?: string;
  position: number;
}

export interface IndexSnapshot {
  name: string;
  columns: string[];
  isUnique: boolean;
  isClustered?: boolean;
}

export interface CheckConstraintSnapshot {
  name?: string;
  expression: string;
  columns?: string[];
}

export interface SPSnapshot {
  schemaName: string;
  procedureName: string;
  parameters: Map<string, { dataType: string; isOutput: boolean; defaultValue?: string }>;
  bodyHash: string;
  tablesAccessed: string[];
  tablesModified: string[];
}

export interface FKSnapshot {
  constraintName: string;
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
  onDelete?: string;
  onUpdate?: string;
}

// =============================================================================
// Change Detection Types
// =============================================================================

export interface SchemaChangeResult {
  uploadId: string;
  previousUploadId?: string;
  comparisonDate: Date;
  summary: ChangeSummary;
  tableChanges: TableChange[];
  columnChanges: ColumnChange[];
  fkChanges: FKChange[];
  spChanges: SPChange[];
  constraintChanges: ConstraintChange[];
  breakingChanges: BreakingChange[];
  recommendations: string[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  migrationScript?: string;
}

export interface ChangeSummary {
  totalChanges: number;
  additions: number;
  modifications: number;
  deletions: number;
  tablesAdded: number;
  tablesRemoved: number;
  tablesModified: number;
  columnsAdded: number;
  columnsRemoved: number;
  columnsModified: number;
  fksAdded: number;
  fksRemoved: number;
  spsAdded: number;
  spsRemoved: number;
  spsModified: number;
}

export interface TableChange {
  changeType: 'added' | 'removed' | 'modified';
  tableName: string;
  previousState?: Partial<TableSnapshot>;
  currentState?: Partial<TableSnapshot>;
  impact: 'low' | 'medium' | 'high';
  details: string;
  affectedEntities: string[];
}

export interface ColumnChange {
  changeType: 'added' | 'removed' | 'modified';
  tableName: string;
  columnName: string;
  previousState?: Partial<ColumnSnapshot>;
  currentState?: Partial<ColumnSnapshot>;
  impact: 'low' | 'medium' | 'high';
  details: string;
  breakingChange: boolean;
}

export interface FKChange {
  changeType: 'added' | 'removed' | 'modified';
  constraintName: string;
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
  previousState?: Partial<FKSnapshot>;
  currentState?: Partial<FKSnapshot>;
  impact: 'low' | 'medium' | 'high';
  details: string;
}

export interface SPChange {
  changeType: 'added' | 'removed' | 'modified';
  procedureName: string;
  previousState?: Partial<SPSnapshot>;
  currentState?: Partial<SPSnapshot>;
  impact: 'low' | 'medium' | 'high';
  details: string;
  parameterChanges: ParameterChange[];
}

export interface ParameterChange {
  changeType: 'added' | 'removed' | 'modified';
  parameterName: string;
  previousType?: string;
  currentType?: string;
}

export interface ConstraintChange {
  changeType: 'added' | 'removed' | 'modified';
  constraintName?: string;
  tableName: string;
  type: 'check' | 'unique' | 'primary_key' | 'foreign_key';
  previousExpression?: string;
  currentExpression?: string;
  impact: 'low' | 'medium' | 'high';
  details: string;
}

export interface BreakingChange {
  type: 'table_removed' | 'column_removed' | 'column_type_changed' | 
        'nullable_to_nonnullable' | 'fk_removed' | 'sp_removed' | 
        'sp_parameter_changed' | 'constraint_removed';
  entity: string;
  details: string;
  affectedAPIs: string[];
  affectedSPs: string[];
  suggestedMigration: string;
  rollbackScript: string;
}

// =============================================================================
// Schema Change Detector Class
// =============================================================================

export class SchemaChangeDetector {
  private projectId: string;
  private previousSnapshot: SchemaSnapshot | null = null;

  constructor(projectId: string) {
    this.projectId = projectId;
  }

  /**
   * Create a schema snapshot from parsed SQL/CSHTML
   */
  createSnapshot(
    tables: TableDef[],
    storedProcedures: StoredProcedureDef[],
    uploadId: string,
    source: 'sql_upload' | 'cshtml_upload' | 'live_db' | 'manual' = 'sql_upload'
  ): SchemaSnapshot {
    const tableMap = new Map<string, TableSnapshot>();
    const spMap = new Map<string, SPSnapshot>();
    const fkMap = new Map<string, FKSnapshot>();

    // Process tables
    for (const table of tables) {
      const columnMap = new Map<string, ColumnSnapshot>();
      
      for (let i = 0; i < table.columns.length; i++) {
        const col = table.columns[i];
        columnMap.set(col.name, {
          name: col.name,
          dataType: col.dataType,
          maxLength: col.maxLength,
          isNullable: col.isNullable,
          isPrimaryKey: col.isPrimaryKey,
          isIdentity: col.isIdentity,
          defaultValue: col.defaultValue,
          position: i,
        });
      }

      const primaryKey = table.columns
        .filter(c => c.isPrimaryKey)
        .map(c => c.name);

      tableMap.set(table.tableName, {
        tableName: table.tableName,
        schemaName: table.schemaName,
        columns: columnMap,
        primaryKey,
        indexes: table.indexes?.map(idx => ({
          name: idx.name,
          columns: idx.columns,
          isUnique: idx.isUnique,
          isClustered: idx.isClustered,
        })) || [],
        checkConstraints: table.checkConstraints?.map(cc => ({
          name: cc.name,
          expression: cc.expression,
          columns: cc.columns,
        })) || [],
      });

      // Process FKs
      for (const fk of table.foreignKeys) {
        const key = `${fk.constraintName || `${table.tableName}_${fk.columnName}_fk`}`;
        fkMap.set(key, {
          constraintName: fk.constraintName || key,
          fromTable: table.tableName,
          fromColumn: fk.columnName,
          toTable: fk.referencesTable,
          toColumn: fk.referencesColumn,
          onDelete: fk.onDelete,
          onUpdate: fk.onUpdate,
        });
      }
    }

    // Process stored procedures
    for (const sp of storedProcedures) {
      const paramMap = new Map<string, { dataType: string; isOutput: boolean; defaultValue?: string }>();
      
      for (const param of sp.parameters) {
        paramMap.set(param.name, {
          dataType: param.dataType,
          isOutput: param.isOutput,
          defaultValue: param.defaultValue,
        });
      }

      spMap.set(sp.procedureName, {
        schemaName: sp.schemaName,
        procedureName: sp.procedureName,
        parameters: paramMap,
        bodyHash: this.hashString(sp.body),
        tablesAccessed: sp.tablesAccessed || [],
        tablesModified: sp.tablesModified || [],
      });
    }

    // Calculate checksum
    const checksum = this.calculateChecksum(tableMap, spMap, fkMap);

    return {
      version: `v${Date.now()}`,
      timestamp: new Date(),
      uploadId,
      source,
      tables: tableMap,
      storedProcedures: spMap,
      foreignKeys: fkMap,
      checksum,
    };
  }

  /**
   * Detect changes between two snapshots
   */
  detectChanges(
    currentSnapshot: SchemaSnapshot,
    previousSnapshot?: SchemaSnapshot
  ): SchemaChangeResult {
    const previous = previousSnapshot || this.previousSnapshot;
    
    if (!previous) {
      // First upload - everything is new
      return this.createInitialResult(currentSnapshot);
    }

    // Store for future comparisons
    this.previousSnapshot = currentSnapshot;

    // Detect all changes
    const tableChanges = this.detectTableChanges(previous.tables, currentSnapshot.tables);
    const columnChanges = this.detectColumnChanges(previous.tables, currentSnapshot.tables);
    const fkChanges = this.detectFKChanges(previous.foreignKeys, currentSnapshot.foreignKeys);
    const spChanges = this.detectSPChanges(previous.storedProcedures, currentSnapshot.storedProcedures);
    const constraintChanges = this.detectConstraintChanges(previous.tables, currentSnapshot.tables);
    
    // Detect breaking changes
    const breakingChanges = this.detectBreakingChanges(
      tableChanges,
      columnChanges,
      fkChanges,
      spChanges,
      previous,
      currentSnapshot
    );

    // Calculate summary
    const summary = this.calculateSummary(
      tableChanges,
      columnChanges,
      fkChanges,
      spChanges
    );

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      tableChanges,
      columnChanges,
      fkChanges,
      spChanges,
      breakingChanges
    );

    // Determine risk level
    const riskLevel = this.determineRiskLevel(summary, breakingChanges);

    // Generate migration script
    const migrationScript = this.generateMigrationScript(
      tableChanges,
      columnChanges,
      fkChanges,
      currentSnapshot
    );

    return {
      uploadId: currentSnapshot.uploadId,
      previousUploadId: previous.uploadId,
      comparisonDate: new Date(),
      summary,
      tableChanges,
      columnChanges,
      fkChanges,
      spChanges,
      constraintChanges,
      breakingChanges,
      recommendations,
      riskLevel,
      migrationScript,
    };
  }

  /**
   * Create initial result for first upload
   */
  private createInitialResult(snapshot: SchemaSnapshot): SchemaChangeResult {
    const tableChanges: TableChange[] = [];
    const columnChanges: ColumnChange[] = [];
    const fkChanges: FKChange[] = [];
    const spChanges: SPChange[] = [];

    // All tables are new
    for (const [tableName, table] of snapshot.tables) {
      tableChanges.push({
        changeType: 'added',
        tableName,
        currentState: {
          tableName,
          schemaName: table.schemaName,
          columns: table.columns,
        },
        impact: 'low',
        details: `New table "${tableName}" with ${table.columns.size} columns`,
        affectedEntities: [],
      });

      // All columns are new
      for (const [colName, col] of table.columns) {
        columnChanges.push({
          changeType: 'added',
          tableName,
          columnName: colName,
          currentState: col,
          impact: 'low',
          details: `New column "${colName}" in ${tableName}`,
          breakingChange: false,
        });
      }
    }

    // All FKs are new
    for (const [fkName, fk] of snapshot.foreignKeys) {
      fkChanges.push({
        changeType: 'added',
        constraintName: fkName,
        fromTable: fk.fromTable,
        fromColumn: fk.fromColumn,
        toTable: fk.toTable,
        toColumn: fk.toColumn,
        currentState: fk,
        impact: 'medium',
        details: `New FK constraint from ${fk.fromTable}.${fk.fromColumn} to ${fk.toTable}.${fk.toColumn}`,
      });
    }

    // All SPs are new
    for (const [spName, sp] of snapshot.storedProcedures) {
      spChanges.push({
        changeType: 'added',
        procedureName: spName,
        currentState: sp,
        impact: 'medium',
        details: `New stored procedure "${spName}"`,
        parameterChanges: [],
      });
    }

    this.previousSnapshot = snapshot;

    return {
      uploadId: snapshot.uploadId,
      comparisonDate: new Date(),
      summary: {
        totalChanges: tableChanges.length + columnChanges.length + fkChanges.length + spChanges.length,
        additions: tableChanges.length + columnChanges.length + fkChanges.length + spChanges.length,
        modifications: 0,
        deletions: 0,
        tablesAdded: snapshot.tables.size,
        tablesRemoved: 0,
        tablesModified: 0,
        columnsAdded: columnChanges.length,
        columnsRemoved: 0,
        columnsModified: 0,
        fksAdded: snapshot.foreignKeys.size,
        fksRemoved: 0,
        spsAdded: snapshot.storedProcedures.size,
        spsRemoved: 0,
        spsModified: 0,
      },
      tableChanges,
      columnChanges,
      fkChanges,
      spChanges,
      constraintChanges: [],
      breakingChanges: [],
      recommendations: ['Initial schema uploaded successfully. No changes to detect.'],
      riskLevel: 'low',
    };
  }

  /**
   * Detect table-level changes
   */
  private detectTableChanges(
    previous: Map<string, TableSnapshot>,
    current: Map<string, TableSnapshot>
  ): TableChange[] {
    const changes: TableChange[] = [];
    const processed = new Set<string>();

    // Check for removed and modified tables
    for (const [tableName, prevTable] of previous) {
      processed.add(tableName);
      const currTable = current.get(tableName);

      if (!currTable) {
        // Table removed
        changes.push({
          changeType: 'removed',
          tableName,
          previousState: {
            tableName,
            schemaName: prevTable.schemaName,
            columns: prevTable.columns,
          },
          impact: 'high',
          details: `Table "${tableName}" was removed`,
          affectedEntities: this.findAffectedEntities(tableName, previous),
        });
      } else if (prevTable.checksum !== this.calculateTableChecksum(prevTable)) {
        // Check if modified (column count, PK, etc.)
        const columnDiff = prevTable.columns.size !== currTable.columns.size;
        const pkDiff = JSON.stringify(prevTable.primaryKey) !== JSON.stringify(currTable.primaryKey);
        
        if (columnDiff || pkDiff) {
          changes.push({
            changeType: 'modified',
            tableName,
            previousState: {
              tableName,
              schemaName: prevTable.schemaName,
              columns: prevTable.columns,
              primaryKey: prevTable.primaryKey,
            },
            currentState: {
              tableName,
              schemaName: currTable.schemaName,
              columns: currTable.columns,
              primaryKey: currTable.primaryKey,
            },
            impact: pkDiff ? 'high' : 'medium',
            details: `Table "${tableName}" structure changed`,
            affectedEntities: [],
          });
        }
      }
    }

    // Check for added tables
    for (const [tableName, currTable] of current) {
      if (!processed.has(tableName)) {
        changes.push({
          changeType: 'added',
          tableName,
          currentState: {
            tableName,
            schemaName: currTable.schemaName,
            columns: currTable.columns,
          },
          impact: 'low',
          details: `New table "${tableName}" with ${currTable.columns.size} columns`,
          affectedEntities: [],
        });
      }
    }

    return changes;
  }

  /**
   * Detect column-level changes
   */
  private detectColumnChanges(
    previous: Map<string, TableSnapshot>,
    current: Map<string, TableSnapshot>
  ): ColumnChange[] {
    const changes: ColumnChange[] = [];

    for (const [tableName, currTable] of current) {
      const prevTable = previous.get(tableName);
      
      if (!prevTable) continue; // New table - handled in table changes

      const processed = new Set<string>();

      // Check for removed and modified columns
      for (const [colName, prevCol] of prevTable.columns) {
        processed.add(colName);
        const currCol = currTable.columns.get(colName);

        if (!currCol) {
          // Column removed
          changes.push({
            changeType: 'removed',
            tableName,
            columnName: colName,
            previousState: prevCol,
            impact: 'high',
            details: `Column "${colName}" removed from ${tableName}`,
            breakingChange: true,
          });
        } else {
          // Check for modifications
          const modifications: string[] = [];
          
          if (prevCol.dataType !== currCol.dataType) {
            modifications.push(`type: ${prevCol.dataType} → ${currCol.dataType}`);
          }
          if (prevCol.isNullable !== currCol.isNullable) {
            modifications.push(`nullable: ${prevCol.isNullable} → ${currCol.isNullable}`);
          }
          if (prevCol.isPrimaryKey !== currCol.isPrimaryKey) {
            modifications.push(`primaryKey: ${prevCol.isPrimaryKey} → ${currCol.isPrimaryKey}`);
          }
          if (prevCol.defaultValue !== currCol.defaultValue) {
            modifications.push(`default: ${prevCol.defaultValue} → ${currCol.defaultValue}`);
          }

          if (modifications.length > 0) {
            const isBreaking = this.isBreakingColumnChange(prevCol, currCol);
            changes.push({
              changeType: 'modified',
              tableName,
              columnName: colName,
              previousState: prevCol,
              currentState: currCol,
              impact: isBreaking ? 'high' : 'medium',
              details: `Column "${colName}" modified: ${modifications.join(', ')}`,
              breakingChange: isBreaking,
            });
          }
        }
      }

      // Check for added columns
      for (const [colName, currCol] of currTable.columns) {
        if (!processed.has(colName)) {
          changes.push({
            changeType: 'added',
            tableName,
            columnName: colName,
            currentState: currCol,
            impact: currCol.isNullable || currCol.defaultValue ? 'low' : 'medium',
            details: `New column "${colName}" added to ${tableName}`,
            breakingChange: !currCol.isNullable && !currCol.defaultValue,
          });
        }
      }
    }

    return changes;
  }

  /**
   * Detect foreign key changes
   */
  private detectFKChanges(
    previous: Map<string, FKSnapshot>,
    current: Map<string, FKSnapshot>
  ): FKChange[] {
    const changes: FKChange[] = [];
    const processed = new Set<string>();

    // Check for removed and modified FKs
    for (const [fkName, prevFK] of previous) {
      processed.add(fkName);
      const currFK = current.get(fkName);

      if (!currFK) {
        changes.push({
          changeType: 'removed',
          constraintName: fkName,
          fromTable: prevFK.fromTable,
          fromColumn: prevFK.fromColumn,
          toTable: prevFK.toTable,
          toColumn: prevFK.toColumn,
          previousState: prevFK,
          impact: 'high',
          details: `FK constraint "${fkName}" removed`,
        });
      } else {
        // Check for modifications
        if (
          prevFK.toTable !== currFK.toTable ||
          prevFK.toColumn !== currFK.toColumn ||
          prevFK.onDelete !== currFK.onDelete ||
          prevFK.onUpdate !== currFK.onUpdate
        ) {
          changes.push({
            changeType: 'modified',
            constraintName: fkName,
            fromTable: prevFK.fromTable,
            fromColumn: prevFK.fromColumn,
            toTable: currFK.toTable,
            toColumn: currFK.toColumn,
            previousState: prevFK,
            currentState: currFK,
            impact: 'high',
            details: `FK "${fkName}" modified`,
          });
        }
      }
    }

    // Check for added FKs
    for (const [fkName, currFK] of current) {
      if (!processed.has(fkName)) {
        changes.push({
          changeType: 'added',
          constraintName: fkName,
          fromTable: currFK.fromTable,
          fromColumn: currFK.fromColumn,
          toTable: currFK.toTable,
          toColumn: currFK.toColumn,
          currentState: currFK,
          impact: 'medium',
          details: `New FK from ${currFK.fromTable}.${currFK.fromColumn} to ${currFK.toTable}.${currFK.toColumn}`,
        });
      }
    }

    return changes;
  }

  /**
   * Detect stored procedure changes
   */
  private detectSPChanges(
    previous: Map<string, SPSnapshot>,
    current: Map<string, SPSnapshot>
  ): SPChange[] {
    const changes: SPChange[] = [];
    const processed = new Set<string>();

    // Check for removed and modified SPs
    for (const [spName, prevSP] of previous) {
      processed.add(spName);
      const currSP = current.get(spName);

      if (!currSP) {
        changes.push({
          changeType: 'removed',
          procedureName: spName,
          previousState: prevSP,
          impact: 'high',
          details: `Stored procedure "${spName}" removed`,
          parameterChanges: [],
        });
      } else {
        // Check for modifications
        const parameterChanges: ParameterChange[] = [];
        const paramProcessed = new Set<string>();

        // Check parameter changes
        for (const [paramName, prevParam] of prevSP.parameters) {
          paramProcessed.add(paramName);
          const currParam = currSP.parameters.get(paramName);

          if (!currParam) {
            parameterChanges.push({
              changeType: 'removed',
              parameterName: paramName,
              previousType: prevParam.dataType,
            });
          } else if (
            prevParam.dataType !== currParam.dataType ||
            prevParam.isOutput !== currParam.isOutput
          ) {
            parameterChanges.push({
              changeType: 'modified',
              parameterName: paramName,
              previousType: prevParam.dataType,
              currentType: currParam.dataType,
            });
          }
        }

        // New parameters
        for (const [paramName, currParam] of currSP.parameters) {
          if (!paramProcessed.has(paramName)) {
            parameterChanges.push({
              changeType: 'added',
              parameterName: paramName,
              currentType: currParam.dataType,
            });
          }
        }

        // Body change
        const bodyChanged = prevSP.bodyHash !== currSP.bodyHash;

        if (parameterChanges.length > 0 || bodyChanged) {
          changes.push({
            changeType: 'modified',
            procedureName: spName,
            previousState: prevSP,
            currentState: currSP,
            impact: parameterChanges.length > 0 ? 'high' : 'medium',
            details: bodyChanged 
              ? `SP "${spName}" body modified${parameterChanges.length > 0 ? ' with parameter changes' : ''}`
              : `SP "${spName}" parameters changed`,
            parameterChanges,
          });
        }
      }
    }

    // Check for added SPs
    for (const [spName, currSP] of current) {
      if (!processed.has(spName)) {
        changes.push({
          changeType: 'added',
          procedureName: spName,
          currentState: currSP,
          impact: 'medium',
          details: `New stored procedure "${spName}"`,
          parameterChanges: [],
        });
      }
    }

    return changes;
  }

  /**
   * Detect constraint changes
   */
  private detectConstraintChanges(
    previous: Map<string, TableSnapshot>,
    current: Map<string, TableSnapshot>
  ): ConstraintChange[] {
    const changes: ConstraintChange[] = [];

    for (const [tableName, currTable] of current) {
      const prevTable = previous.get(tableName);
      if (!prevTable) continue;

      // Check constraints
      const prevConstraints = new Map(
        prevTable.checkConstraints.map(c => [c.name || c.expression, c])
      );
      const currConstraints = new Map(
        currTable.checkConstraints.map(c => [c.name || c.expression, c])
      );

      for (const [name, prevCC] of prevConstraints) {
        if (!currConstraints.has(name)) {
          changes.push({
            changeType: 'removed',
            constraintName: name,
            tableName,
            type: 'check',
            previousExpression: prevCC.expression,
            details: `Check constraint "${name}" removed from ${tableName}`,
            impact: 'medium',
          });
        }
      }

      for (const [name, currCC] of currConstraints) {
        if (!prevConstraints.has(name)) {
          changes.push({
            changeType: 'added',
            constraintName: name,
            tableName,
            type: 'check',
            currentExpression: currCC.expression,
            details: `New check constraint "${name}" on ${tableName}`,
            impact: 'low',
          });
        }
      }
    }

    return changes;
  }

  /**
   * Detect breaking changes
   */
  private detectBreakingChanges(
    tableChanges: TableChange[],
    columnChanges: ColumnChange[],
    fkChanges: FKChange[],
    spChanges: SPChange[],
    previous: SchemaSnapshot,
    current: SchemaSnapshot
  ): BreakingChange[] {
    const breaking: BreakingChange[] = [];

    // Removed tables
    for (const tc of tableChanges) {
      if (tc.changeType === 'removed') {
        breaking.push({
          type: 'table_removed',
          entity: tc.tableName,
          details: `Table "${tc.tableName}" was removed`,
          affectedAPIs: this.findAffectedAPIs(tc.tableName, current),
          affectedSPs: this.findAffectedSPs(tc.tableName, previous),
          suggestedMigration: `-- DROP TABLE [${tc.tableName}] was already executed\n-- Consider data backup if needed`,
          rollbackScript: `-- Cannot auto-generate rollback for table removal\n-- Restore from backup or re-run original DDL`,
        });
      }
    }

    // Removed or breaking column changes
    for (const cc of columnChanges) {
      if (cc.changeType === 'removed') {
        breaking.push({
          type: 'column_removed',
          entity: `${cc.tableName}.${cc.columnName}`,
          details: `Column "${cc.columnName}" removed from ${cc.tableName}`,
          affectedAPIs: [`${cc.tableName} CRUD operations`],
          affectedSPs: this.findSPsUsingColumn(cc.tableName, cc.columnName, previous),
          suggestedMigration: `ALTER TABLE [${cc.tableName}] DROP COLUMN [${cc.columnName}]`,
          rollbackScript: `ALTER TABLE [${cc.tableName}] ADD [${cc.columnName}] ${cc.previousState?.dataType} ${cc.previousState?.isNullable ? 'NULL' : 'NOT NULL'}`,
        });
      } else if (cc.breakingChange && cc.changeType === 'modified') {
        breaking.push({
          type: 'column_type_changed',
          entity: `${cc.tableName}.${cc.columnName}`,
          details: `Column "${cc.columnName}" in ${cc.tableName} has breaking change`,
          affectedAPIs: [`${cc.tableName} CRUD operations`],
          affectedSPs: this.findSPsUsingColumn(cc.tableName, cc.columnName, previous),
          suggestedMigration: `-- Review data compatibility before type change\nALTER TABLE [${cc.tableName}] ALTER COLUMN [${cc.columnName}] ${cc.currentState?.dataType}`,
          rollbackScript: `ALTER TABLE [${cc.tableName}] ALTER COLUMN [${cc.columnName}] ${cc.previousState?.dataType}`,
        });
      }
    }

    // Removed FKs
    for (const fc of fkChanges) {
      if (fc.changeType === 'removed') {
        breaking.push({
          type: 'fk_removed',
          entity: fc.constraintName,
          details: `FK constraint "${fc.constraintName}" removed`,
          affectedAPIs: [],
          affectedSPs: [],
          suggestedMigration: `ALTER TABLE [${fc.fromTable}] DROP CONSTRAINT [${fc.constraintName}]`,
          rollbackScript: `ALTER TABLE [${fc.fromTable}] ADD CONSTRAINT [${fc.constraintName}] FOREIGN KEY ([${fc.fromColumn}]) REFERENCES [${fc.toTable}]([${fc.toColumn}])`,
        });
      }
    }

    // Removed SPs
    for (const sc of spChanges) {
      if (sc.changeType === 'removed') {
        breaking.push({
          type: 'sp_removed',
          entity: sc.procedureName,
          details: `Stored procedure "${sc.procedureName}" removed`,
          affectedAPIs: this.findAPIsCallingSP(sc.procedureName, previous),
          affectedSPs: [],
          suggestedMigration: `DROP PROCEDURE [${sc.procedureName}]`,
          rollbackScript: `-- Restore SP from version control or backup`,
        });
      }
    }

    return breaking;
  }

  // ===========================================================================
  // Helper Methods
  // ===========================================================================

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(16);
  }

  private calculateChecksum(
    tables: Map<string, TableSnapshot>,
    sps: Map<string, SPSnapshot>,
    fks: Map<string, FKSnapshot>
  ): string {
    const tableCount = tables.size;
    const spCount = sps.size;
    const fkCount = fks.size;
    const columnCount = Array.from(tables.values()).reduce((sum, t) => sum + t.columns.size, 0);
    return `${tableCount}-${columnCount}-${fkCount}-${spCount}-${Date.now()}`;
  }

  private calculateTableChecksum(table: TableSnapshot): string {
    return `${table.columns.size}-${table.primaryKey.length}`;
  }

  private isBreakingColumnChange(prev: ColumnSnapshot, curr: ColumnSnapshot): boolean {
    // Type change
    if (prev.dataType !== curr.dataType) return true;
    // Nullable to non-nullable
    if (prev.isNullable && !curr.isNullable) return true;
    // Primary key change
    if (prev.isPrimaryKey !== curr.isPrimaryKey) return true;
    return false;
  }

  private findAffectedEntities(tableName: string, tables: Map<string, TableSnapshot>): string[] {
    const affected: string[] = [];
    for (const [name, table] of tables) {
      for (const [colName, col] of table.columns) {
        if (col.name.toLowerCase().endsWith('id') && 
            col.name.toLowerCase().includes(tableName.toLowerCase().replace(/s$/, ''))) {
          affected.push(`${name}.${colName}`);
        }
      }
    }
    return affected;
  }

  private findAffectedAPIs(tableName: string, current: SchemaSnapshot): string[] {
    return [
      `GET /api/${tableName.toLowerCase()}`,
      `POST /api/${tableName.toLowerCase()}`,
      `PUT /api/${tableName.toLowerCase()}/:id`,
      `DELETE /api/${tableName.toLowerCase()}/:id`,
    ];
  }

  private findAffectedSPs(tableName: string, previous: SchemaSnapshot): string[] {
    const sps: string[] = [];
    for (const [spName, sp] of previous.storedProcedures) {
      if (sp.tablesAccessed.includes(tableName) || sp.tablesModified.includes(tableName)) {
        sps.push(spName);
      }
    }
    return sps;
  }

  private findSPsUsingColumn(tableName: string, columnName: string, previous: SchemaSnapshot): string[] {
    // Simplified - would need to parse SP body for accurate detection
    return this.findAffectedSPs(tableName, previous);
  }

  private findAPIsCallingSP(spName: string, previous: SchemaSnapshot): string[] {
    return [`/api/endpoint calling ${spName}`];
  }

  private calculateSummary(
    tableChanges: TableChange[],
    columnChanges: ColumnChange[],
    fkChanges: FKChange[],
    spChanges: SPChange[]
  ): ChangeSummary {
    return {
      totalChanges: tableChanges.length + columnChanges.length + fkChanges.length + spChanges.length,
      additions: 
        tableChanges.filter(c => c.changeType === 'added').length +
        columnChanges.filter(c => c.changeType === 'added').length +
        fkChanges.filter(c => c.changeType === 'added').length +
        spChanges.filter(c => c.changeType === 'added').length,
      modifications:
        tableChanges.filter(c => c.changeType === 'modified').length +
        columnChanges.filter(c => c.changeType === 'modified').length +
        fkChanges.filter(c => c.changeType === 'modified').length +
        spChanges.filter(c => c.changeType === 'modified').length,
      deletions:
        tableChanges.filter(c => c.changeType === 'removed').length +
        columnChanges.filter(c => c.changeType === 'removed').length +
        fkChanges.filter(c => c.changeType === 'removed').length +
        spChanges.filter(c => c.changeType === 'removed').length,
      tablesAdded: tableChanges.filter(c => c.changeType === 'added').length,
      tablesRemoved: tableChanges.filter(c => c.changeType === 'removed').length,
      tablesModified: tableChanges.filter(c => c.changeType === 'modified').length,
      columnsAdded: columnChanges.filter(c => c.changeType === 'added').length,
      columnsRemoved: columnChanges.filter(c => c.changeType === 'removed').length,
      columnsModified: columnChanges.filter(c => c.changeType === 'modified').length,
      fksAdded: fkChanges.filter(c => c.changeType === 'added').length,
      fksRemoved: fkChanges.filter(c => c.changeType === 'removed').length,
      spsAdded: spChanges.filter(c => c.changeType === 'added').length,
      spsRemoved: spChanges.filter(c => c.changeType === 'removed').length,
      spsModified: spChanges.filter(c => c.changeType === 'modified').length,
    };
  }

  private generateRecommendations(
    tableChanges: TableChange[],
    columnChanges: ColumnChange[],
    fkChanges: FKChange[],
    spChanges: SPChange[],
    breakingChanges: BreakingChange[]
  ): string[] {
    const recommendations: string[] = [];

    if (breakingChanges.length > 0) {
      recommendations.push(`⚠️ ${breakingChanges.length} breaking changes detected. Review carefully before applying.`);
    }

    const removedTables = tableChanges.filter(c => c.changeType === 'removed');
    if (removedTables.length > 0) {
      recommendations.push(`Backup data before removing tables: ${removedTables.map(t => t.tableName).join(', ')}`);
    }

    const nullableToNonNullable = columnChanges.filter(
      c => c.changeType === 'modified' && 
      c.previousState?.isNullable && 
      !c.currentState?.isNullable
    );
    if (nullableToNonNullable.length > 0) {
      recommendations.push(`Update existing NULL values before making columns non-nullable: ${nullableToNonNullable.map(c => `${c.tableName}.${c.columnName}`).join(', ')}`);
    }

    const removedSPs = spChanges.filter(c => c.changeType === 'removed');
    if (removedSPs.length > 0) {
      recommendations.push(`Update API endpoints that call removed SPs: ${removedSPs.map(s => s.procedureName).join(', ')}`);
    }

    const newFKs = fkChanges.filter(c => c.changeType === 'added');
    if (newFKs.length > 0) {
      recommendations.push(`Verify data integrity before adding FK constraints: ${newFKs.map(f => f.constraintName).join(', ')}`);
    }

    return recommendations;
  }

  private determineRiskLevel(summary: ChangeSummary, breakingChanges: BreakingChange[]): 'low' | 'medium' | 'high' | 'critical' {
    if (breakingChanges.length > 5) return 'critical';
    if (breakingChanges.length > 2 || summary.tablesRemoved > 0) return 'high';
    if (breakingChanges.length > 0 || summary.columnsRemoved > 0 || summary.spsRemoved > 0) return 'medium';
    return 'low';
  }

  private generateMigrationScript(
    tableChanges: TableChange[],
    columnChanges: ColumnChange[],
    fkChanges: FKChange[],
    current: SchemaSnapshot
  ): string {
    const lines: string[] = [
      '-- =============================================',
      '-- Auto-generated Migration Script',
      `-- Generated: ${new Date().toISOString()}`,
      '-- =============================================',
      '',
      'BEGIN TRANSACTION;',
      '',
    ];

    // Drop FKs first
    const removedFKs = fkChanges.filter(c => c.changeType === 'removed');
    for (const fk of removedFKs) {
      lines.push(`-- Drop FK: ${fk.constraintName}`);
      lines.push(`ALTER TABLE [${fk.fromTable}] DROP CONSTRAINT [${fk.constraintName}];`);
      lines.push('');
    }

    // Drop columns
    const removedColumns = columnChanges.filter(c => c.changeType === 'removed');
    for (const col of removedColumns) {
      lines.push(`-- Drop column: ${col.tableName}.${col.columnName}`);
      lines.push(`ALTER TABLE [${col.tableName}] DROP COLUMN [${col.columnName}];`);
      lines.push('');
    }

    // Drop tables
    const removedTables = tableChanges.filter(c => c.changeType === 'removed');
    for (const table of removedTables) {
      lines.push(`-- Drop table: ${table.tableName}`);
      lines.push(`DROP TABLE [${table.tableName}];`);
      lines.push('');
    }

    // Add new tables
    const addedTables = tableChanges.filter(c => c.changeType === 'added');
    for (const table of addedTables) {
      const tableSnapshot = current.tables.get(table.tableName);
      if (tableSnapshot) {
        lines.push(`-- Create table: ${table.tableName}`);
        lines.push(this.generateCreateTableScript(tableSnapshot));
        lines.push('');
      }
    }

    // Add new columns
    const addedColumns = columnChanges.filter(c => c.changeType === 'added');
    for (const col of addedColumns) {
      lines.push(`-- Add column: ${col.tableName}.${col.columnName}`);
      const nullStr = col.currentState?.isNullable ? 'NULL' : 'NOT NULL';
      const defaultStr = col.currentState?.defaultValue ? ` DEFAULT ${col.currentState.defaultValue}` : '';
      lines.push(`ALTER TABLE [${col.tableName}] ADD [${col.columnName}] ${col.currentState?.dataType}${defaultStr} ${nullStr};`);
      lines.push('');
    }

    // Modify columns
    const modifiedColumns = columnChanges.filter(c => c.changeType === 'modified');
    for (const col of modifiedColumns) {
      lines.push(`-- Modify column: ${col.tableName}.${col.columnName}`);
      lines.push(`ALTER TABLE [${col.tableName}] ALTER COLUMN [${col.columnName}] ${col.currentState?.dataType} ${col.currentState?.isNullable ? 'NULL' : 'NOT NULL'};`);
      lines.push('');
    }

    // Add FKs
    const addedFKs = fkChanges.filter(c => c.changeType === 'added');
    for (const fk of addedFKs) {
      lines.push(`-- Add FK: ${fk.constraintName}`);
      lines.push(`ALTER TABLE [${fk.fromTable}] ADD CONSTRAINT [${fk.constraintName}] FOREIGN KEY ([${fk.fromColumn}]) REFERENCES [${fk.toTable}]([${fk.toColumn}]);`);
      lines.push('');
    }

    lines.push('COMMIT TRANSACTION;');
    lines.push('');
    lines.push('-- =============================================');
    lines.push('-- End of Migration Script');
    lines.push('-- =============================================');

    return lines.join('\n');
  }

  private generateCreateTableScript(table: TableSnapshot): string {
    const columns: string[] = [];
    
    for (const [colName, col] of table.columns) {
      let colDef = `[${colName}] ${col.dataType}`;
      if (col.isIdentity) colDef += ' IDENTITY(1,1)';
      if (!col.isNullable) colDef += ' NOT NULL';
      if (col.defaultValue) colDef += ` DEFAULT ${col.defaultValue}`;
      if (col.isPrimaryKey) colDef += ' PRIMARY KEY';
      columns.push(colDef);
    }

    return `CREATE TABLE [${table.tableName}] (\n  ${columns.join(',\n  ')}\n);`;
  }

  /**
   * Set previous snapshot for comparison
   */
  setPreviousSnapshot(snapshot: SchemaSnapshot): void {
    this.previousSnapshot = snapshot;
  }

  /**
   * Get previous snapshot
   */
  getPreviousSnapshot(): SchemaSnapshot | null {
    return this.previousSnapshot;
  }
}

// =============================================================================
// Export convenience functions
// =============================================================================

export function createSchemaChangeDetector(projectId: string): SchemaChangeDetector {
  return new SchemaChangeDetector(projectId);
}

export function detectSchemaChanges(
  projectId: string,
  tables: TableDef[],
  storedProcedures: StoredProcedureDef[],
  uploadId: string,
  previousSnapshot?: SchemaSnapshot
): SchemaChangeResult {
  const detector = new SchemaChangeDetector(projectId);
  const currentSnapshot = detector.createSnapshot(tables, storedProcedures, uploadId);
  
  if (previousSnapshot) {
    detector.setPreviousSnapshot(previousSnapshot);
  }
  
  return detector.detectChanges(currentSnapshot, previousSnapshot);
}
