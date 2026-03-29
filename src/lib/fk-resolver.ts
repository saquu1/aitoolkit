// =============================================================================
// FK Dependency Resolution System
// Handles missing table detection, resolution queue, and 3 resolution paths
// =============================================================================

import { TableDef, ColumnDef, ForeignKeyDef, FKDependencyAnalysis, MissingTable, ResolutionQueueItem } from './types';
import { prisma } from './db';
import { aiEngine } from './ai-engine';
import { parseSqlServer } from './sql-parser';

// =============================================================================
// TYPES
// =============================================================================

export type TableStatus = 'complete' | 'partial' | 'missing' | 'standalone';
export type ResolutionPath = 'upload_sql' | 'manual_design' | 'ai_design';
export type ResolutionStatus = 'pending' | 'in_progress' | 'resolved' | 'failed';

export interface MissingTableInfo {
  tableName: string;
  status: TableStatus;
  referencedBy: Array<{
    tableName: string;
    columnName: string;
    fkName?: string;
  }>;
  references: Array<{
    tableName: string;
    columnName: string;
  }>;
  blocksCount: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
  resolutionPath?: ResolutionPath;
  resolutionStatus: ResolutionStatus;
  suggestedColumns?: ColumnDef[];
  aiSuggestion?: AITableSuggestion;
  createdAt: Date;
  updatedAt: Date;
}

export interface AITableSuggestion {
  columns: ColumnDef[];
  primaryKeys: string[];
  foreignKeys: ForeignKeyDef[];
  indexes: Array<{ name: string; columns: string[]; isUnique: boolean }>;
  confidence: number;
  reasoning: string;
}

export interface ResolutionQueue {
  items: MissingTableInfo[];
  totalMissing: number;
  totalResolved: number;
  totalBlocked: number;
  circularDependencies: CircularDependency[];
  buildOrder: string[];
}

export interface CircularDependency {
  tables: string[];
  type: 'direct' | 'chain';
  resolution: 'nullable' | 'deferred';
}

export interface ManualTableDesign {
  tableName: string;
  columns: ColumnDef[];
  primaryKeys: string[];
  foreignKeys: ForeignKeyDef[];
}

export interface ResolutionResult {
  success: boolean;
  table?: TableDef;
  error?: string;
  remainingMissing?: string[];
  unlockedTables?: string[];
}

// =============================================================================
// FK RESOLVER CLASS
// =============================================================================

export class FKResolver {
  private projectId: string | null = null;
  private tables: Map<string, TableDef> = new Map();
  private missingTables: Map<string, MissingTableInfo> = new Map();
  private resolutionQueue: ResolutionQueue | null = null;

  constructor(projectId?: string) {
    this.projectId = projectId || null;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MAIN ANALYSIS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Analyze tables and build resolution queue
   */
  async analyzeTables(tables: TableDef[]): Promise<ResolutionQueue> {
    this.tables.clear();
    this.missingTables.clear();

    // Index existing tables
    for (const table of tables) {
      this.tables.set(table.tableName.toLowerCase(), table);
    }

    // Find missing tables and build dependency graph
    const dependencyGraph = this.buildDependencyGraph(tables);
    
    // Detect circular dependencies
    const circularDeps = this.detectCircularDependencies(dependencyGraph);

    // Build missing table info
    for (const table of tables) {
      for (const fk of table.foreignKeys) {
        const refTableLower = fk.referencesTable.toLowerCase();
        if (!this.tables.has(refTableLower)) {
          this.addMissingTable(fk.referencesTable, table.tableName, fk.columnName, fk.constraintName);
        }
      }
    }

    // Calculate priorities and blocks count
    this.calculatePriorities();

    // Generate AI suggestions for all missing tables
    await this.generateAISuggestions();

    // Calculate build order (topological sort)
    const buildOrder = this.calculateBuildOrder(dependencyGraph);

    // Build final queue
    const queue: ResolutionQueue = {
      items: Array.from(this.missingTables.values()).sort((a, b) => {
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }),
      totalMissing: this.missingTables.size,
      totalResolved: 0,
      totalBlocked: this.countTotalBlocked(),
      circularDependencies: circularDeps,
      buildOrder
    };

    this.resolutionQueue = queue;
    return queue;
  }

  /**
   * Build dependency graph
   */
  private buildDependencyGraph(tables: TableDef[]): Map<string, Set<string>> {
    const graph = new Map<string, Set<string>>();

    for (const table of tables) {
      const deps = new Set<string>();
      for (const fk of table.foreignKeys) {
        deps.add(fk.referencesTable.toLowerCase());
      }
      graph.set(table.tableName.toLowerCase(), deps);
    }

    // Add missing tables to graph
    for (const tableName of this.missingTables.keys()) {
      if (!graph.has(tableName)) {
        graph.set(tableName, new Set());
      }
    }

    return graph;
  }

  /**
   * Detect circular dependencies
   */
  private detectCircularDependencies(graph: Map<string, Set<string>>): CircularDependency[] {
    const circular: CircularDependency[] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const dfs = (node: string, path: string[]): boolean => {
      visited.add(node);
      recursionStack.add(node);

      const deps = graph.get(node);
      if (deps) {
        for (const dep of deps) {
          if (!visited.has(dep)) {
            if (dfs(dep, [...path, dep])) {
              return true;
            }
          } else if (recursionStack.has(dep)) {
            // Found cycle
            const cycleStart = path.indexOf(dep);
            const cycle = path.slice(cycleStart);
            circular.push({
              tables: cycle,
              type: cycle.length === 2 ? 'direct' : 'chain',
              resolution: 'nullable'
            });
          }
        }
      }

      recursionStack.delete(node);
      return false;
    };

    for (const node of graph.keys()) {
      if (!visited.has(node)) {
        dfs(node, [node]);
      }
    }

    return circular;
  }

  /**
   * Add missing table info
   */
  private addMissingTable(tableName: string, referencedBy: string, columnName: string, fkName?: string): void {
    const key = tableName.toLowerCase();
    const existing = this.missingTables.get(key);

    if (existing) {
      existing.referencedBy.push({
        tableName: referencedBy,
        columnName,
        fkName
      });
      existing.blocksCount = existing.referencedBy.length;
    } else {
      this.missingTables.set(key, {
        tableName,
        status: 'missing',
        referencedBy: [{
          tableName: referencedBy,
          columnName,
          fkName
        }],
        references: [],
        blocksCount: 1,
        priority: 'medium',
        resolutionStatus: 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
  }

  /**
   * Calculate priorities based on impact
   */
  private calculatePriorities(): void {
    for (const [key, info] of this.missingTables) {
      // Critical: Foundation tables or blocks 5+ tables
      const criticalTables = ['users', 'organizations', 'countries', 'patients', 'persons'];
      if (criticalTables.includes(key) || info.blocksCount >= 5) {
        info.priority = 'critical';
      }
      // High: Blocks 3-4 tables
      else if (info.blocksCount >= 3) {
        info.priority = 'high';
      }
      // Medium: Blocks 2 tables
      else if (info.blocksCount >= 2) {
        info.priority = 'medium';
      }
      // Low: Blocks 1 table
      else {
        info.priority = 'low';
      }
    }
  }

  /**
   * Count total blocked tables
   */
  private countTotalBlocked(): number {
    let count = 0;
    for (const table of this.tables.values()) {
      const hasMissingFK = table.foreignKeys.some(fk => 
        this.missingTables.has(fk.referencesTable.toLowerCase())
      );
      if (hasMissingFK) count++;
    }
    return count;
  }

  /**
   * Calculate build order using topological sort
   */
  private calculateBuildOrder(graph: Map<string, Set<string>>): string[] {
    const visited = new Set<string>();
    const order: string[] = [];
    const temp = new Set<string>();

    const visit = (node: string) => {
      if (temp.has(node)) return; // Circular dependency
      if (visited.has(node)) return;

      temp.add(node);

      const deps = graph.get(node);
      if (deps) {
        for (const dep of deps) {
          visit(dep);
        }
      }

      temp.delete(node);
      visited.add(node);
      order.push(node);
    };

    // Start with missing tables (they have no dependencies typically)
    for (const tableName of this.missingTables.keys()) {
      visit(tableName);
    }

    // Then process existing tables
    for (const tableName of this.tables.keys()) {
      visit(tableName);
    }

    return order;
  }

  /**
   * Generate AI suggestions for missing tables
   */
  private async generateAISuggestions(): Promise<void> {
    for (const [key, info] of this.missingTables) {
      try {
        const suggestion = await this.generateTableSuggestion(info);
        info.aiSuggestion = suggestion;
        info.suggestedColumns = suggestion.columns;
      } catch (error) {
        console.error(`Failed to generate AI suggestion for ${key}:`, error);
      }
    }
  }

  /**
   * Generate table suggestion based on context
   */
  private async generateTableSuggestion(info: MissingTableInfo): Promise<AITableSuggestion> {
    const tableName = info.tableName;
    const columns: ColumnDef[] = [];
    const foreignKeys: ForeignKeyDef[] = [];
    const indexes: Array<{ name: string; columns: string[]; isUnique: boolean }> = [];

    // Analyze referencing tables to infer required columns
    const requiredColumns = new Map<string, string>(); // columnName -> dataType
    
    for (const ref of info.referencedBy) {
      const refTable = this.tables.get(ref.tableName.toLowerCase());
      if (refTable) {
        const fk = refTable.foreignKeys.find(f => 
          f.columnName === ref.columnName && 
          f.referencesTable.toLowerCase() === tableName.toLowerCase()
        );
        if (fk) {
          // Find the column data type
          const col = refTable.columns.find(c => c.name === fk.columnName);
          if (col) {
            requiredColumns.set(fk.referencesColumn, col.dataType);
          }
        }
      }
    }

    // Generate standard columns based on table name patterns
    const nameLower = tableName.toLowerCase();

    // Primary key (always include)
    columns.push({
      name: 'Id',
      dataType: 'UNIQUEIDENTIFIER',
      isPrimaryKey: true,
      isIdentity: false,
      isNullable: false
    });

    // Name column for entity tables
    if (!nameLower.endsWith('types') && !nameLower.endsWith('status') && !nameLower.endsWith('values')) {
      columns.push({
        name: 'Name',
        dataType: 'NVARCHAR',
        maxLength: '200',
        isPrimaryKey: false,
        isIdentity: false,
        isNullable: false
      });
    }

    // Code column for lookup tables
    if (nameLower.endsWith('types') || nameLower.endsWith('status') || nameLower.endsWith('categories')) {
      columns.push({
        name: 'Code',
        dataType: 'NVARCHAR',
        maxLength: '50',
        isPrimaryKey: false,
        isIdentity: false,
        isNullable: true
      });
    }

    // Add required FK reference columns
    for (const [colName, colType] of requiredColumns) {
      if (!columns.some(c => c.name === colName)) {
        columns.push({
          name: colName,
          dataType: colType,
          isPrimaryKey: colName.toLowerCase() === 'id',
          isIdentity: false,
          isNullable: colName.toLowerCase() !== 'id'
        });
      }
    }

    // Standard audit columns
    columns.push(
      {
        name: 'IsActive',
        dataType: 'BIT',
        isPrimaryKey: false,
        isIdentity: false,
        isNullable: false,
        defaultValue: '1'
      },
      {
        name: 'CreatedOn',
        dataType: 'DATETIME',
        isPrimaryKey: false,
        isIdentity: false,
        isNullable: false,
        defaultValue: 'GETDATE()'
      },
      {
        name: 'CreatedBy',
        dataType: 'UNIQUEIDENTIFIER',
        isPrimaryKey: false,
        isIdentity: false,
        isNullable: true
      },
      {
        name: 'ModifiedOn',
        dataType: 'DATETIME',
        isPrimaryKey: false,
        isIdentity: false,
        isNullable: true
      },
      {
        name: 'ModifiedBy',
        dataType: 'UNIQUEIDENTIFIER',
        isPrimaryKey: false,
        isIdentity: false,
        isNullable: true
      }
    );

    // Add unique index on Name
    indexes.push({
      name: `IX_${tableName}_Name`,
      columns: ['Name'],
      isUnique: true
    });

    return {
      columns,
      primaryKeys: ['Id'],
      foreignKeys,
      indexes,
      confidence: 75,
      reasoning: `Generated based on ${info.referencedBy.length} referencing table(s) and standard naming conventions`
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RESOLUTION PATHS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Resolve via Upload SQL
   */
  async resolveViaUpload(tableName: string, sqlContent: string): Promise<ResolutionResult> {
    try {
      const parseResult = parseSqlServer(sqlContent);
      
      if (parseResult.errors.length > 0) {
        return {
          success: false,
          error: `Parse errors: ${parseResult.errors.join(', ')}`
        };
      }

      const table = parseResult.tables.find(t => 
        t.tableName.toLowerCase() === tableName.toLowerCase()
      );

      if (!table) {
        return {
          success: false,
          error: `Table ${tableName} not found in uploaded SQL`
        };
      }

      // Add to tables map
      this.tables.set(tableName.toLowerCase(), table);

      // Update missing tables
      const missingInfo = this.missingTables.get(tableName.toLowerCase());
      if (missingInfo) {
        missingInfo.status = 'complete';
        missingInfo.resolutionStatus = 'resolved';
        missingInfo.resolutionPath = 'upload_sql';
        missingInfo.updatedAt = new Date();
      }

      // Check for new missing tables introduced by this table's FKs
      const newMissing: string[] = [];
      for (const fk of table.foreignKeys) {
        if (!this.tables.has(fk.referencesTable.toLowerCase())) {
          newMissing.push(fk.referencesTable);
          this.addMissingTable(fk.referencesTable, table.tableName, fk.columnName, fk.constraintName);
        }
      }

      // Find tables that are now unblocked
      const unlocked = this.findUnlockedTables();

      return {
        success: true,
        table,
        remainingMissing: newMissing,
        unlockedTables: unlocked
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Resolve via Manual Design
   */
  async resolveViaManual(design: ManualTableDesign): Promise<ResolutionResult> {
    try {
      const table: TableDef = {
        schemaName: 'dbo',
        tableName: design.tableName,
        columns: design.columns,
        foreignKeys: design.foreignKeys,
        indexes: [],
        checkConstraints: [],
        sourceDDL: `-- Manually designed table: ${design.tableName}`,
        status: 'complete'
      };

      // Add to tables map
      this.tables.set(design.tableName.toLowerCase(), table);

      // Update missing tables
      const missingInfo = this.missingTables.get(design.tableName.toLowerCase());
      if (missingInfo) {
        missingInfo.status = 'complete';
        missingInfo.resolutionStatus = 'resolved';
        missingInfo.resolutionPath = 'manual_design';
        missingInfo.updatedAt = new Date();
      }

      // Check for new missing tables
      const newMissing: string[] = [];
      for (const fk of design.foreignKeys) {
        if (!this.tables.has(fk.referencesTable.toLowerCase())) {
          newMissing.push(fk.referencesTable);
          this.addMissingTable(fk.referencesTable, design.tableName, fk.columnName, fk.constraintName);
        }
      }

      const unlocked = this.findUnlockedTables();

      return {
        success: true,
        table,
        remainingMissing: newMissing,
        unlockedTables: unlocked
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Resolve via AI Design
   */
  async resolveViaAI(tableName: string): Promise<ResolutionResult> {
    try {
      const missingInfo = this.missingTables.get(tableName.toLowerCase());
      
      if (!missingInfo) {
        return {
          success: false,
          error: `Table ${tableName} not found in missing tables queue`
        };
      }

      if (!missingInfo.aiSuggestion) {
        // Generate suggestion if not already done
        missingInfo.aiSuggestion = await this.generateTableSuggestion(missingInfo);
      }

      const suggestion = missingInfo.aiSuggestion;

      // Create table from suggestion
      const table: TableDef = {
        schemaName: 'dbo',
        tableName: tableName,
        columns: suggestion.columns,
        foreignKeys: suggestion.foreignKeys,
        indexes: suggestion.indexes?.map(idx => ({
          name: idx.name,
          columns: idx.columns,
          isUnique: idx.isUnique,
          isClustered: false
        })) || [],
        checkConstraints: [],
        sourceDDL: `-- AI-generated table: ${tableName}\n-- ${suggestion.reasoning}`,
        status: 'complete'
      };

      // Add to tables map
      this.tables.set(tableName.toLowerCase(), table);

      // Update missing tables
      missingInfo.status = 'complete';
      missingInfo.resolutionStatus = 'resolved';
      missingInfo.resolutionPath = 'ai_design';
      missingInfo.updatedAt = new Date();

      // Check for new missing tables
      const newMissing: string[] = [];
      for (const fk of suggestion.foreignKeys) {
        if (!this.tables.has(fk.referencesTable.toLowerCase())) {
          newMissing.push(fk.referencesTable);
          this.addMissingTable(fk.referencesTable, tableName, fk.columnName, fk.constraintName);
        }
      }

      const unlocked = this.findUnlockedTables();

      return {
        success: true,
        table,
        remainingMissing: newMissing,
        unlockedTables: unlocked
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Find tables that are now unblocked
   */
  private findUnlockedTables(): string[] {
    const unlocked: string[] = [];
    
    for (const table of this.tables.values()) {
      const allFKsResolved = table.foreignKeys.every(fk => 
        this.tables.has(fk.referencesTable.toLowerCase())
      );
      
      if (allFKsResolved && table.status === 'partial') {
        table.status = 'complete';
        unlocked.push(table.tableName);
      }
    }

    return unlocked;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RIPPLE EFFECT & UNLOCK CHAIN
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get what a table unlocks when created
   */
  getUnlockChain(tableName: string): string[][] {
    const levels: string[][] = [];
    const created = new Set<string>();
    created.add(tableName.toLowerCase());

    let currentLevel = [tableName.toLowerCase()];
    
    while (currentLevel.length > 0) {
      const nextLevel: string[] = [];
      
      for (const table of this.tables.values()) {
        if (created.has(table.tableName.toLowerCase())) continue;
        
        const allDepsMet = table.foreignKeys.every(fk => 
          created.has(fk.referencesTable.toLowerCase())
        );
        
        if (allDepsMet) {
          nextLevel.push(table.tableName.toLowerCase());
        }
      }

      if (nextLevel.length > 0) {
        levels.push(nextLevel);
        nextLevel.forEach(t => created.add(t));
      }
      
      currentLevel = nextLevel;
    }

    return levels;
  }

  /**
   * Get dependency chain for a table
   */
  getDependencyChain(tableName: string): string[][] {
    const levels: string[][] = [];
    const visited = new Set<string>();
    
    const collectDeps = (name: string, level: number) => {
      if (visited.has(name.toLowerCase())) return;
      visited.add(name.toLowerCase());

      const table = this.tables.get(name.toLowerCase());
      if (!table) {
        // It's a missing table
        const missing = this.missingTables.get(name.toLowerCase());
        if (missing) {
          if (!levels[level]) levels[level] = [];
          levels[level].push(name);
          // Missing tables have no further deps typically
        }
        return;
      }

      for (const fk of table.foreignKeys) {
        if (!this.tables.has(fk.referencesTable.toLowerCase())) {
          if (!levels[level]) levels[level] = [];
          levels[level].push(fk.referencesTable);
        }
        collectDeps(fk.referencesTable, level + 1);
      }
    };

    collectDeps(tableName, 0);
    return levels.filter(l => l && l.length > 0);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STATUS & TABLE STATUS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get table status
   */
  getTableStatus(tableName: string): TableStatus {
    const table = this.tables.get(tableName.toLowerCase());
    
    if (!table) {
      return 'missing';
    }

    if (table.foreignKeys.length === 0) {
      return 'standalone';
    }

    const allResolved = table.foreignKeys.every(fk => 
      this.tables.has(fk.referencesTable.toLowerCase())
    );

    return allResolved ? 'complete' : 'partial';
  }

  /**
   * Get resolution queue
   */
  getQueue(): ResolutionQueue | null {
    return this.resolutionQueue;
  }

  /**
   * Get all tables
   */
  getAllTables(): TableDef[] {
    return Array.from(this.tables.values());
  }

  /**
   * Get all missing tables
   */
  getMissingTables(): MissingTableInfo[] {
    return Array.from(this.missingTables.values());
  }

  /**
   * Get statistics
   */
  getStatistics(): {
    totalTables: number;
    complete: number;
    partial: number;
    missing: number;
    standalone: number;
    fkCompletion: number;
  } {
    let complete = 0;
    let partial = 0;
    let standalone = 0;

    for (const table of this.tables.values()) {
      const status = this.getTableStatus(table.tableName);
      switch (status) {
        case 'complete': complete++; break;
        case 'partial': partial++; break;
        case 'standalone': standalone++; break;
      }
    }

    const missing = this.missingTables.size;
    const totalTables = this.tables.size;
    const fkCompletion = totalTables > 0 
      ? Math.round((complete + standalone) / totalTables * 100) 
      : 0;

    return {
      totalTables,
      complete,
      partial,
      missing,
      standalone,
      fkCompletion
    };
  }
}

// Export singleton
export const fkResolver = new FKResolver();
