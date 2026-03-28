// =============================================================================
// Parser Integration Layer - Unified Multi-Source Schema Intelligence
// =============================================================================
// Integrates SQL DDL, CSHTML, JavaScript, and SP parsers
// Cross-references and builds unified schema from multiple sources
// =============================================================================

import { SQLParser } from '../sql-parser';
import { CSHTMLIntelligenceEngine, CSHTMLIntelligence, analyzeCSHTML } from './cshtml-intelligence';
import { SqlViewParser, ParsedView } from './sql-view-parser';
import { SourceTracker, createSourceTracker } from '../source-tracker';
import { TableDef, ColumnDef, ForeignKeyDef, ParseResult, StoredProcedureDef, ViewDef, ComputedColumnIntelligence } from '../types';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// =============================================================================
// Types
// =============================================================================

export interface UnifiedSchemaInput {
  projectId: string;
  files: Array<{
    name: string;
    content: string;
    type: 'sql' | 'cshtml' | 'js' | 'unknown';
  }>;
}

export interface UnifiedSchemaResult {
  projectId: string;
  
  // Unified tables with combined intelligence
  tables: UnifiedTableDef[];
  
  // Cross-references
  crossReferences: {
    sqlToCSHTML: Record<string, string[]>; // tableName -> CSHTML files
    cshtmlToSQL: Record<string, string>;   // CSHTML view -> table name
    spToTables: Record<string, string[]>;  // SP name -> tables
    tableToSPs: Record<string, string[]>;  // table -> SPs
  };
  
  // Discovery summary
  discovery: {
    fromDDL: string[];
    fromCSHTML: string[];
    fromSP: string[];
    conflicts: SchemaConflict[];
  };
  
  // Verification queue
  verificationNeeded: VerificationItem[];
  
  // Statistics
  stats: {
    totalFiles: number;
    sqlFiles: number;
    cshtmlFiles: number;
    tablesDiscovered: number;
    spsDiscovered: number;
    endpointsFound: number;
    parseTime: number;
  };
}

export interface UnifiedTableDef {
  // Core identity
  tableName: string;
  schemaName: string;
  
  // Source tracking
  sources: {
    primary: TableSource;
    secondary: TableSource[];
  };
  
  // Columns with unified intelligence
  columns: UnifiedColumnDef[];
  
  // Foreign keys
  foreignKeys: ForeignKeyDef[];
  
  // Combined intelligence
  intelligence: {
    fromSQL: SQLIntelligence | null;
    fromCSHTML: CSHTMLIntelligence | null;
    fromSP: SPIntelligence | null;
  };
  
  // SP availability
  spAvailability: {
    hasCreate: boolean;
    hasRead: boolean;
    hasUpdate: boolean;
    hasDelete: boolean;
    hasSearch: boolean;
    hasDropdown: boolean;
    spList: string[];
  };
  
  // UI endpoints
  uiEndpoints: UIEndpoint[];
  
  // Verification
  verificationStatus: 'verified' | 'pending' | 'conflict' | 'partial';
  confidenceScore: number;
}

export interface UnifiedColumnDef {
  name: string;
  dataType: string;
  isNullable: boolean;
  isPrimaryKey: boolean;
  isIdentity: boolean;
  defaultValue?: string;
  
  // Source tracking
  sources: {
    fromDDL: boolean;
    fromCSHTML: boolean;
    fromSP: boolean;
  };
  
  // Combined intelligence
  intelligence: {
    semanticType?: string;
    uiType?: string;
    isPII: boolean;
    isPHI: boolean;
    isFK: boolean;
    fkTarget?: string;
    validation: string[];
    label?: string;
    placeholder?: string;
  };
}

export interface TableSource {
  type: 'ddl' | 'cshtml' | 'sp_discovery' | 'manual';
  fileName: string;
  confidence: number;
  discoveredAt: Date;
}

export interface SQLIntelligence {
  columnCount: number;
  fkCount: number;
  indexCount: number;
  constraints: string[];
}

export interface CSHTMLIntelligence {
  viewName: string;
  viewType: string;
  formFields: string[];
  ajaxEndpoints: string[];
  validations: string[];
}

export interface SPIntelligence {
  accessType: 'read' | 'write' | 'both';
  operations: string[];
  columnsRead: string[];
  columnsWritten: string[];
}

export interface UIEndpoint {
  url: string;
  method: string;
  context: string;
  sourceFile: string;
}

export interface SchemaConflict {
  type: 'column_mismatch' | 'type_mismatch' | 'missing_fk' | 'extra_column';
  tableName: string;
  description: string;
  source1: string;
  source2: string;
  resolution?: string;
}

export interface VerificationItem {
  type: 'table' | 'column' | 'relationship' | 'endpoint';
  entityName: string;
  reason: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  suggestedAction?: string;
}

// =============================================================================
// Parser Integration Engine
// =============================================================================

export class ParserIntegrationEngine {
  private projectId: string;
  private sourceTracker: SourceTracker;

  constructor(projectId: string) {
    this.projectId = projectId;
    this.sourceTracker = createSourceTracker(projectId);
  }

  /**
   * Process multiple files and build unified schema
   */
  async processFiles(input: UnifiedSchemaInput): Promise<UnifiedSchemaResult> {
    const startTime = Date.now();
    
    // Separate files by type
    const sqlFiles = input.files.filter(f => f.type === 'sql');
    const cshtmlFiles = input.files.filter(f => f.type === 'cshtml');
    const jsFiles = input.files.filter(f => f.type === 'js');

    // Parse SQL files
    const sqlResults = await this.parseSQLFiles(sqlFiles);
    
    // Parse CSHTML files
    const cshtmlResults = await this.parseCSHTMLFiles(cshtmlFiles);
    
    // Parse JS files
    const jsResults = await this.parseJSFiles(jsFiles);

    // Build cross-references
    const crossReferences = this.buildCrossReferences(sqlResults, cshtmlResults);
    
    // Merge and unify tables
    const unifiedTables = this.unifyTables(sqlResults, cshtmlResults, jsResults, crossReferences);
    
    // Detect conflicts
    const conflicts = this.detectConflicts(unifiedTables);
    
    // Generate verification items
    const verificationNeeded = this.generateVerificationItems(unifiedTables, conflicts);

    // Record all discoveries
    await this.recordDiscoveries(unifiedTables, sqlFiles, cshtmlFiles);

    const stats = {
      totalFiles: input.files.length,
      sqlFiles: sqlFiles.length,
      cshtmlFiles: cshtmlFiles.length,
      tablesDiscovered: unifiedTables.length,
      spsDiscovered: sqlResults.sps.length,
      endpointsFound: this.countEndpoints(cshtmlResults, jsResults),
      parseTime: Date.now() - startTime,
    };

    return {
      projectId: this.projectId,
      tables: unifiedTables,
      crossReferences,
      discovery: {
        fromDDL: sqlResults.tables.map(t => t.tableName),
        fromCSHTML: cshtmlResults.discoveredTables,
        fromSP: sqlResults.spDiscoveredTables,
        conflicts,
      },
      verificationNeeded,
      stats,
    };
  }

  // ===========================================================================
  // SQL Parsing
  // ===========================================================================

  private async parseSQLFiles(files: Array<{ name: string; content: string }>): Promise<{
    tables: TableDef[];
    views: ViewDef[];
    sps: StoredProcedureDef[];
    spDiscoveredTables: string[];
    computedColumns: ComputedColumnIntelligence[];
    fileResults: Map<string, { tables: string[]; views: string[]; sps: string[] }>;
  }> {
    const tables: TableDef[] = [];
    const views: ViewDef[] = [];
    const sps: StoredProcedureDef[] = [];
    const spDiscoveredTables: string[] = [];
    const computedColumns: ComputedColumnIntelligence[] = [];
    const fileResults = new Map<string, { tables: string[]; views: string[]; sps: string[] }>();

    for (const file of files) {
      // Register source file
      const { id: sourceFileId } = await this.sourceTracker.registerSourceFile({
        projectId: this.projectId,
        fileName: file.name,
        fileType: 'sql',
        content: file.content,
      });

      // Parse SQL
      const parser = new SQLParser(file.content);
      const result = parser.parse();

      // Record tables
      for (const table of result.tables) {
        await this.sourceTracker.recordTableDiscovery({
          projectId: this.projectId,
          tableName: table.tableName,
          schemaName: table.schemaName,
          sourceFileId,
          sourceFile: file.name,
          discoveryMethod: 'ddl',
          columns: table.columns.map(col => ({
            projectId: this.projectId,
            tableName: table.tableName,
            columnName: col.name,
            discoveryMethod: 'ddl',
            sourceFileId,
            sourceFile: file.name,
          })),
        });

        // Record FK relationships
        for (const fk of table.foreignKeys) {
          await this.sourceTracker.recordColumnDiscoveries([{
            projectId: this.projectId,
            tableName: table.tableName,
            columnName: fk.columnName,
            discoveryMethod: 'ddl',
            isFK: true,
            fkTargetTable: fk.referencesTable,
            fkTargetColumn: fk.referencesColumn,
          }]);
        }
      }

      tables.push(...result.tables);
      views.push(...result.views);
      sps.push(...result.storedProcedures);
      computedColumns.push(...result.computedColumns);
      
      // Store views to database
      for (const view of result.views) {
        await this.storeViewIntelligence(view, sourceFileId, file.name);
      }

      // Track SP-discovered tables
      for (const sp of result.storedProcedures) {
        const spTables = this.extractTablesFromSP(sp);
        spDiscoveredTables.push(...spTables);

        // Record SP-table mappings
        for (const tableName of spTables) {
          await this.sourceTracker.recordSPTableMapping({
            projectId: this.projectId,
            spName: sp.procedureName,
            tableName,
            operationType: this.inferOperationType(sp, tableName),
            accessType: this.inferAccessType(sp, tableName),
            confidence: 0.9,
          });
        }
      }

      // Update file parse status
      await this.sourceTracker.updateParseStatus(sourceFileId, 'parsed', {
        tablesExtracted: result.tables.length,
        spsExtracted: result.storedProcedures.length,
        parseDuration: result.stats?.parseTimeMs || 0,
      });

      fileResults.set(file.name, {
        tables: result.tables.map(t => t.tableName),
        views: result.views.map(v => v.viewName),
        sps: result.storedProcedures.map(s => s.procedureName),
      });
    }

    return {
      tables,
      views,
      sps,
      spDiscoveredTables: [...new Set(spDiscoveredTables)],
      computedColumns,
      fileResults,
    };
  }
  
  /**
   * Store view intelligence to database
   */
  private async storeViewIntelligence(view: ViewDef, sourceFileId: string, sourceFile: string): Promise<void> {
    try {
      const now = new Date();
      
      // Store in SQLViewModel
      await prisma.sQLViewModel.upsert({
        where: {
          projectId_viewName: {
            projectId: this.projectId,
            viewName: view.fullName,
          }
        },
        create: {
          id: `sqlview-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          projectId: this.projectId,
          viewName: view.fullName,
          schemaName: view.schemaName,
          fullName: view.fullName,
          definition: view.definition,
          selectStatement: view.selectStatement,
          viewType: view.viewType,
          isSchemaBound: view.isSchemaBound,
          isEncrypted: view.isEncrypted,
          columns: JSON.stringify(view.columns),
          sourceTables: JSON.stringify(view.sourceTables),
          dependencies: JSON.stringify(view.dependencies),
          joins: JSON.stringify(view.joins),
          whereClause: view.whereClause || null,
          groupByColumns: JSON.stringify(view.groupByColumns),
          havingClause: view.havingClause || null,
          orderByColumns: JSON.stringify(view.orderByColumns),
          ctes: JSON.stringify(view.ctes),
          hasDistinct: view.hasDistinct,
          hasUnion: view.hasUnion,
          hasSubqueries: view.hasSubqueries,
          hasCTEs: view.hasCTEs,
          complexityScore: view.complexityScore,
          computedColumns: JSON.stringify(view.columns.filter(c => c.isComputed)),
          aggregateColumns: JSON.stringify(view.columns.filter(c => c.isAggregate)),
          parseStatus: 'parsed',
          updatedAt: now,
        },
        update: {
          definition: view.definition,
          selectStatement: view.selectStatement,
          columns: JSON.stringify(view.columns),
          sourceTables: JSON.stringify(view.sourceTables),
          dependencies: JSON.stringify(view.dependencies),
          joins: JSON.stringify(view.joins),
          computedColumns: JSON.stringify(view.columns.filter(c => c.isComputed)),
          complexityScore: view.complexityScore,
          parseStatus: 'parsed',
          updatedAt: now,
        }
      });
      
      // Create knowledge graph node for view
      await prisma.kGNode.upsert({
        where: {
          projectId_nodeType_name: {
            projectId: this.projectId,
            nodeType: 'view',
            name: view.fullName,
          }
        },
        create: {
          id: `kgn-view-${view.fullName}`,
          projectId: this.projectId,
          nodeType: 'view',
          name: view.fullName,
          displayName: view.viewName,
          description: `SQL View: ${view.columns.length} columns, ${view.sourceTables.length} sources`,
          properties: JSON.stringify({
            schemaName: view.schemaName,
            complexityScore: view.complexityScore,
            isSchemaBound: view.isSchemaBound,
            hasSubqueries: view.hasSubqueries,
            hasCTEs: view.hasCTEs,
            computedColumnCount: view.columns.filter(c => c.isComputed).length,
            aggregateCount: view.columns.filter(c => c.isAggregate).length,
          }),
          updatedAt: now,
        },
        update: {
          displayName: view.viewName,
          description: `SQL View: ${view.columns.length} columns, ${view.sourceTables.length} sources`,
          properties: JSON.stringify({
            schemaName: view.schemaName,
            complexityScore: view.complexityScore,
            isSchemaBound: view.isSchemaBound,
            hasSubqueries: view.hasSubqueries,
            hasCTEs: view.hasCTEs,
            computedColumnCount: view.columns.filter(c => c.isComputed).length,
            aggregateCount: view.columns.filter(c => c.isAggregate).length,
          }),
          updatedAt: now,
        }
      });
      
      // Create edges to source tables
      for (const sourceTable of view.sourceTables) {
        const tableNode = await prisma.kGNode.findFirst({
          where: {
            projectId: this.projectId,
            nodeType: 'table',
            name: { contains: sourceTable.tableName, mode: 'insensitive' },
          }
        });
        
        if (tableNode) {
          await prisma.kGEdge.upsert({
            where: {
              projectId_sourceNodeId_targetNodeId_edgeType: {
                projectId: this.projectId,
                sourceNodeId: `kgn-view-${view.fullName}`,
                targetNodeId: tableNode.id,
                edgeType: 'view_depends_on',
              }
            },
            create: {
              id: `kge-view-${view.fullName}-${tableNode.id}`,
              projectId: this.projectId,
              sourceNodeId: `kgn-view-${view.fullName}`,
              targetNodeId: tableNode.id,
              edgeType: 'view_depends_on',
              label: sourceTable.joinType || 'SELECT',
              weight: sourceTable.isPrimary ? 1.0 : 0.8,
              updatedAt: now,
            },
            update: {
              label: sourceTable.joinType || 'SELECT',
              updatedAt: now,
            }
          });
        }
      }
    } catch (error) {
      console.error(`Failed to store view ${view.fullName}:`, error);
    }
  }

  private extractTablesFromSP(sp: StoredProcedureDef): string[] {
    const tables = new Set<string>();
    const body = sp.body.toLowerCase();

    // Extract from FROM clauses
    const fromMatches = body.matchAll(/from\s+(?:\[?(\w+)\]?\.)?\[?(\w+)\]?/gi);
    for (const match of fromMatches) {
      tables.add(match[2]);
    }

    // Extract from JOIN clauses
    const joinMatches = body.matchAll(/join\s+(?:\[?(\w+)\]?\.)?\[?(\w+)\]?/gi);
    for (const match of joinMatches) {
      tables.add(match[2]);
    }

    // Extract from INSERT INTO
    const insertMatches = body.matchAll(/insert\s+into\s+(?:\[?(\w+)\]?\.)?\[?(\w+)\]?/gi);
    for (const match of insertMatches) {
      tables.add(match[2]);
    }

    // Extract from UPDATE
    const updateMatches = body.matchAll(/update\s+(?:\[?(\w+)\]?\.)?\[?(\w+)\]?/gi);
    for (const match of updateMatches) {
      tables.add(match[2]);
    }

    // Extract from DELETE FROM
    const deleteMatches = body.matchAll(/delete\s+from\s+(?:\[?(\w+)\]?\.)?\[?(\w+)\]?/gi);
    for (const match of deleteMatches) {
      tables.add(match[2]);
    }

    return Array.from(tables);
  }

  private inferOperationType(sp: StoredProcedureDef, tableName: string): 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'EXECUTE' {
    const body = sp.body.toLowerCase();
    const tableLower = tableName.toLowerCase();

    if (new RegExp(`insert\\s+into\\s+.*${tableLower}`).test(body)) return 'INSERT';
    if (new RegExp(`update\\s+.*${tableLower}`).test(body)) return 'UPDATE';
    if (new RegExp(`delete\\s+from\\s+.*${tableLower}`).test(body)) return 'DELETE';
    if (new RegExp(`from\\s+.*${tableLower}`).test(body)) return 'SELECT';

    return 'SELECT';
  }

  private inferAccessType(sp: StoredProcedureDef, tableName: string): 'read' | 'write' | 'both' {
    const body = sp.body.toLowerCase();
    const tableLower = tableName.toLowerCase();

    const hasRead = new RegExp(`from\\s+.*${tableLower}|join\\s+.*${tableLower}`).test(body);
    const hasWrite = new RegExp(`insert\\s+into\\s+.*${tableLower}|update\\s+.*${tableLower}|delete\\s+from\\s+.*${tableLower}`).test(body);

    if (hasRead && hasWrite) return 'both';
    if (hasWrite) return 'write';
    return 'read';
  }

  // ===========================================================================
  // CSHTML Parsing
  // ===========================================================================

  private async parseCSHTMLFiles(files: Array<{ name: string; content: string }>): Promise<{
    intelligence: CSHTMLIntelligence[];
    discoveredTables: string[];
    ajaxEndpoints: Array<{ url: string; method: string; sourceFile: string }>;
  }> {
    const intelligence: CSHTMLIntelligence[] = [];
    const discoveredTables = new Set<string>();
    const ajaxEndpoints: Array<{ url: string; method: string; sourceFile: string }> = [];

    for (const file of files) {
      // Register source file
      const { id: sourceFileId } = await this.sourceTracker.registerSourceFile({
        projectId: this.projectId,
        fileName: file.name,
        fileType: 'cshtml',
        content: file.content,
      });

      // Parse CSHTML
      const result = analyzeCSHTML(file.content, file.name);
      intelligence.push(result);

      // Extract discovered tables
      if (result.model?.linkedTable) {
        discoveredTables.add(result.model.linkedTable);
      }

      // Extract tables from forms
      for (const form of result.forms) {
        if (form.controller) {
          // Controller often maps to table
          discoveredTables.add(this.pluralize(form.controller));
        }
      }

      // Extract AJAX endpoints
      for (const endpoint of result.endpoints) {
        ajaxEndpoints.push({
          url: endpoint.url,
          method: endpoint.method,
          sourceFile: file.name,
        });

        // Extract table from endpoint URL
        const tableMatch = endpoint.url.match(/\/api\/(\w+)/);
        if (tableMatch) {
          discoveredTables.add(tableMatch[1]);
        }
      }

      // Extract tables from cascades
      for (const cascade of result.cascades) {
        // Cascade endpoint often references lookup tables
        const tableMatch = cascade.endpoint.match(/\/api\/(\w+)/);
        if (tableMatch) {
          discoveredTables.add(tableMatch[1]);
        }
      }

      // Update file parse status
      await this.sourceTracker.updateParseStatus(sourceFileId, 'parsed', {
        tablesExtracted: discoveredTables.size,
        endpointsFound: result.endpoints.length,
        parseDuration: 0,
      });
    }

    return {
      intelligence,
      discoveredTables: Array.from(discoveredTables),
      ajaxEndpoints,
    };
  }

  // ===========================================================================
  // JS Parsing
  // ===========================================================================

  private async parseJSFiles(files: Array<{ name: string; content: string }>): Promise<{
    ajaxCalls: Array<{ url: string; method: string; sourceFile: string }>;
    eventHandlers: Array<{ eventType: string; selector: string; sourceFile: string }>;
  }> {
    const ajaxCalls: Array<{ url: string; method: string; sourceFile: string }> = [];
    const eventHandlers: Array<{ eventType: string; selector: string; sourceFile: string }> = [];

    for (const file of files) {
      // Register source file
      await this.sourceTracker.registerSourceFile({
        projectId: this.projectId,
        fileName: file.name,
        fileType: 'js',
        content: file.content,
      });

      // JS parsing is integrated with CSHTML intelligence
      // Extract from inline scripts
      const urlMatches = file.content.matchAll(/url\s*:\s*["'`]([^"'`]+)["'`]/gi);
      for (const match of urlMatches) {
        ajaxCalls.push({
          url: match[1],
          method: 'POST',
          sourceFile: file.name,
        });
      }
    }

    return { ajaxCalls, eventHandlers };
  }

  // ===========================================================================
  // Cross-Reference Building
  // ===========================================================================

  private buildCrossReferences(
    sqlResults: Awaited<ReturnType<typeof this.parseSQLFiles>>,
    cshtmlResults: Awaited<ReturnType<typeof this.parseCSHTMLFiles>>
  ): UnifiedSchemaResult['crossReferences'] {
    const sqlToCSHTML: Record<string, string[]> = {};
    const cshtmlToSQL: Record<string, string> = {};
    const spToTables: Record<string, string[]> = {};
    const tableToSPs: Record<string, string[]> = {};

    // Build SQL table to CSHTML mappings
    const sqlTableNames = new Set(sqlResults.tables.map(t => t.tableName.toLowerCase()));
    
    for (const intel of cshtmlResults.intelligence) {
      const viewName = intel.viewName;
      
      // Check model linkage
      if (intel.model?.linkedTable) {
        const tableName = intel.model.linkedTable;
        if (!sqlToCSHTML[tableName]) sqlToCSHTML[tableName] = [];
        sqlToCSHTML[tableName].push(viewName);
        cshtmlToSQL[viewName] = tableName;
      }

      // Check form controller linkage
      for (const form of intel.forms) {
        if (form.controller) {
          const tableName = this.pluralize(form.controller);
          if (sqlTableNames.has(tableName.toLowerCase())) {
            if (!sqlToCSHTML[tableName]) sqlToCSHTML[tableName] = [];
            sqlToCSHTML[tableName].push(`${viewName}#${form.id}`);
          }
        }
      }
    }

    // Build SP to table mappings
    for (const sp of sqlResults.sps) {
      const tables = this.extractTablesFromSP(sp);
      spToTables[sp.procedureName] = tables;

      for (const table of tables) {
        if (!tableToSPs[table]) tableToSPs[table] = [];
        if (!tableToSPs[table].includes(sp.procedureName)) {
          tableToSPs[table].push(sp.procedureName);
        }
      }
    }

    return { sqlToCSHTML, cshtmlToSQL, spToTables, tableToSPs };
  }

  // ===========================================================================
  // Table Unification
  // ===========================================================================

  private unifyTables(
    sqlResults: Awaited<ReturnType<typeof this.parseSQLFiles>>,
    cshtmlResults: Awaited<ReturnType<typeof this.parseCSHTMLFiles>>,
    jsResults: Awaited<ReturnType<typeof this.parseJSFiles>>,
    crossReferences: UnifiedSchemaResult['crossReferences']
  ): UnifiedTableDef[] {
    const unifiedMap = new Map<string, UnifiedTableDef>();

    // Start with SQL tables
    for (const table of sqlResults.tables) {
      const tableName = table.tableName;
      const spList = crossReferences.tableToSPs[tableName] || [];
      const cshtmlRefs = crossReferences.sqlToCSHTML[tableName] || [];

      const unified: UnifiedTableDef = {
        tableName,
        schemaName: table.schemaName,
        sources: {
          primary: {
            type: 'ddl',
            fileName: table.sourceDDL || 'unknown',
            confidence: 1.0,
            discoveredAt: new Date(),
          },
          secondary: cshtmlRefs.map(ref => ({
            type: 'cshtml' as const,
            fileName: ref,
            confidence: 0.7,
            discoveredAt: new Date(),
          })),
        },
        columns: table.columns.map(col => this.unifyColumn(col, tableName, cshtmlResults)),
        foreignKeys: table.foreignKeys,
        intelligence: {
          fromSQL: {
            columnCount: table.columns.length,
            fkCount: table.foreignKeys.length,
            indexCount: table.indexes?.length || 0,
            constraints: table.checkConstraints?.map(c => c.expression || '') || [],
          },
          fromCSHTML: null,
          fromSP: null,
        },
        spAvailability: {
          hasCreate: spList.some(sp => /add|create|insert/i.test(sp)),
          hasRead: spList.some(sp => /get|read|fetch|ddl/i.test(sp)),
          hasUpdate: spList.some(sp => /update|edit|modify/i.test(sp)),
          hasDelete: spList.some(sp => /delete|remove/i.test(sp)),
          hasSearch: spList.some(sp => /search|find|filter/i.test(sp)),
          hasDropdown: spList.some(sp => /ddl|dropdown|list/i.test(sp)),
          spList,
        },
        uiEndpoints: this.findUIEndpoints(tableName, cshtmlResults, jsResults),
        verificationStatus: 'verified',
        confidenceScore: 95,
      };

      unifiedMap.set(tableName, unified);
    }

    // Add CSHTML-discovered tables not in SQL
    for (const tableName of cshtmlResults.discoveredTables) {
      if (!unifiedMap.has(tableName)) {
        // Find which CSHTML file discovered this
        const cshtmlIntel = cshtmlResults.intelligence.find(i => 
          i.model?.linkedTable === tableName ||
          i.forms.some(f => this.pluralize(f.controller || '') === tableName)
        );

        unifiedMap.set(tableName, {
          tableName,
          schemaName: 'dbo',
          sources: {
            primary: {
              type: 'cshtml',
              fileName: cshtmlIntel?.viewName || 'unknown',
              confidence: 0.7,
              discoveredAt: new Date(),
            },
            secondary: [],
          },
          columns: [], // Unknown columns
          foreignKeys: [],
          intelligence: {
            fromSQL: null,
            fromCSHTML: cshtmlIntel ? {
              viewName: cshtmlIntel.viewName,
              viewType: cshtmlIntel.viewType,
              formFields: cshtmlIntel.forms.flatMap(f => f.fields.map(ff => ff.name)),
              ajaxEndpoints: cshtmlIntel.endpoints.map(e => e.url),
              validations: [],
            } : null,
            fromSP: null,
          },
          spAvailability: {
            hasCreate: false,
            hasRead: false,
            hasUpdate: false,
            hasDelete: false,
            hasSearch: false,
            hasDropdown: false,
            spList: [],
          },
          uiEndpoints: this.findUIEndpoints(tableName, cshtmlResults, jsResults),
          verificationStatus: 'pending',
          confidenceScore: 50,
        });
      }
    }

    // Add SP-discovered tables
    for (const tableName of sqlResults.spDiscoveredTables) {
      if (!unifiedMap.has(tableName)) {
        unifiedMap.set(tableName, {
          tableName,
          schemaName: 'dbo',
          sources: {
            primary: {
              type: 'sp_discovery',
              fileName: 'stored_procedure',
              confidence: 0.85,
              discoveredAt: new Date(),
            },
            secondary: [],
          },
          columns: [],
          foreignKeys: [],
          intelligence: {
            fromSQL: null,
            fromCSHTML: null,
            fromSP: {
              accessType: 'read',
              operations: ['SELECT'],
              columnsRead: [],
              columnsWritten: [],
            },
          },
          spAvailability: {
            hasCreate: false,
            hasRead: true,
            hasUpdate: false,
            hasDelete: false,
            hasSearch: false,
            hasDropdown: false,
            spList: crossReferences.tableToSPs[tableName] || [],
          },
          uiEndpoints: [],
          verificationStatus: 'pending',
          confidenceScore: 70,
        });
      }
    }

    return Array.from(unifiedMap.values());
  }

  private unifyColumn(
    col: ColumnDef,
    tableName: string,
    cshtmlResults: Awaited<ReturnType<typeof this.parseCSHTMLFiles>>
  ): UnifiedColumnDef {
    // Find CSHTML intelligence for this table
    const cshtmlIntel = cshtmlResults.intelligence.find(i => 
      i.model?.linkedTable === tableName
    );

    // Find field in CSHTML forms
    const cshtmlField = cshtmlIntel?.forms
      .flatMap(f => f.fields)
      .find(f => f.name === col.name);

    return {
      name: col.name,
      dataType: col.dataType,
      isNullable: col.isNullable,
      isPrimaryKey: col.isPrimaryKey,
      isIdentity: col.isIdentity,
      defaultValue: col.defaultValue,
      sources: {
        fromDDL: true,
        fromCSHTML: !!cshtmlField,
        fromSP: false,
      },
      intelligence: {
        semanticType: col.semanticType,
        uiType: col.uiType,
        isPII: col.sensitivity === 'pii' || col.sensitivity === 'phi',
        isPHI: col.sensitivity === 'phi',
        isFK: col.semanticType === 'foreign_key',
        validation: col.validation?.map(v => v.type) || [],
        label: cshtmlField?.label,
        placeholder: cshtmlField?.placeholder,
      },
    };
  }

  private findUIEndpoints(
    tableName: string,
    cshtmlResults: Awaited<ReturnType<typeof this.parseCSHTMLFiles>>,
    jsResults: Awaited<ReturnType<typeof this.parseJSFiles>>
  ): UIEndpoint[] {
    const endpoints: UIEndpoint[] = [];
    const tableLower = tableName.toLowerCase();

    // From CSHTML
    for (const intel of cshtmlResults.intelligence) {
      for (const endpoint of intel.endpoints) {
        if (endpoint.url.toLowerCase().includes(tableLower)) {
          endpoints.push({
            url: endpoint.url,
            method: endpoint.method,
            context: endpoint.context,
            sourceFile: intel.viewName,
          });
        }
      }
    }

    // From JS
    for (const call of jsResults.ajaxCalls) {
      if (call.url.toLowerCase().includes(tableLower)) {
        endpoints.push({
          url: call.url,
          method: call.method,
          context: 'ajax',
          sourceFile: call.sourceFile,
        });
      }
    }

    return endpoints;
  }

  // ===========================================================================
  // Conflict Detection
  // ===========================================================================

  private detectConflicts(tables: UnifiedTableDef[]): SchemaConflict[] {
    const conflicts: SchemaConflict[] = [];

    for (const table of tables) {
      // Check for tables without DDL source
      if (!table.sources.primary || table.sources.primary.type !== 'ddl') {
        conflicts.push({
          type: 'missing_fk',
          tableName: table.tableName,
          description: `Table "${table.tableName}" was discovered from ${table.sources.primary?.type || 'unknown'} but no DDL definition found`,
          source1: table.sources.primary?.fileName || 'unknown',
          source2: 'DDL files',
        });
      }

      // Check for tables with no columns
      if (table.columns.length === 0 && table.sources.primary?.type !== 'ddl') {
        conflicts.push({
          type: 'extra_column',
          tableName: table.tableName,
          description: `Table "${table.tableName}" has no column information`,
          source1: table.sources.primary?.fileName || 'unknown',
          source2: 'DDL files',
        });
      }
    }

    return conflicts;
  }

  // ===========================================================================
  // Verification Generation
  // ===========================================================================

  private generateVerificationItems(
    tables: UnifiedTableDef[],
    conflicts: SchemaConflict[]
  ): VerificationItem[] {
    const items: VerificationItem[] = [];

    // Add items for conflicts
    for (const conflict of conflicts) {
      items.push({
        type: 'table',
        entityName: conflict.tableName,
        reason: conflict.description,
        priority: conflict.type === 'missing_fk' ? 'high' : 'medium',
        suggestedAction: conflict.type === 'missing_fk' 
          ? 'Upload SQL DDL file or verify table structure'
          : 'Review and add missing columns',
      });
    }

    // Add items for low-confidence tables
    for (const table of tables) {
      if (table.confidenceScore < 70) {
        items.push({
          type: 'table',
          entityName: table.tableName,
          reason: `Low confidence score (${table.confidenceScore}%) for table discovery`,
          priority: 'medium',
          suggestedAction: 'Verify table existence and structure',
        });
      }
    }

    return items;
  }

  // ===========================================================================
  // Recording Discoveries
  // ===========================================================================

  private async recordDiscoveries(
    tables: UnifiedTableDef[],
    sqlFiles: Array<{ name: string }>,
    cshtmlFiles: Array<{ name: string }>
  ): Promise<void> {
    for (const table of tables) {
      // Add to verification queue if needed
      if (table.verificationStatus === 'pending') {
        await this.sourceTracker.addToVerificationQueue({
          projectId: this.projectId,
          entityType: 'table',
          entityId: table.tableName,
          entityName: table.tableName,
          verificationType: 'source',
          priority: table.confidenceScore < 70 ? 'high' : 'medium',
          triggerSource: 'auto_discovery',
          triggerDetails: `Discovered from ${table.sources.primary?.type}`,
          aiConfidence: table.confidenceScore / 100,
        });
      }
    }
  }

  // ===========================================================================
  // Helpers
  // ===========================================================================

  private pluralize(word: string): string {
    if (!word) return word;
    if (word.endsWith('s') || word.endsWith('S')) return word;
    if (word.endsWith('y') && !'aeiou'.includes(word.slice(-2, -1).toLowerCase())) {
      return word.slice(0, -1) + 'ies';
    }
    if (word.endsWith('s') || word.endsWith('sh') || word.endsWith('ch') || word.endsWith('x') || word.endsWith('z')) {
      return word + 'es';
    }
    return word + 's';
  }

  private countEndpoints(
    cshtmlResults: Awaited<ReturnType<typeof this.parseCSHTMLFiles>>,
    jsResults: Awaited<ReturnType<typeof this.parseJSFiles>>
  ): number {
    return cshtmlResults.ajaxEndpoints.length + jsResults.ajaxCalls.length;
  }
}

// =============================================================================
// Export convenience functions
// =============================================================================

export function createParserIntegration(projectId: string): ParserIntegrationEngine {
  return new ParserIntegrationEngine(projectId);
}

export async function processProjectFiles(input: UnifiedSchemaInput): Promise<UnifiedSchemaResult> {
  const engine = new ParserIntegrationEngine(input.projectId);
  return engine.processFiles(input);
}
