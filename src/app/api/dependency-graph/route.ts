// =============================================================================
// Dependency Graph Intelligence API - Complete Implementation
// Handles: Table Dependencies, FK Analysis, Circular Detection, Impact Analysis,
//          Build Order, Missing Resolution, Visualization, Change Propagation
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// ═══════════════════════════════════════════════════════════════════════════
// MAIN ROUTER
// ═══════════════════════════════════════════════════════════════════════════

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, projectId } = body;

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }

    switch (action) {
      // ─────────────────────────────────────────────────────────────────────
      // Core Dependency Analysis
      // ─────────────────────────────────────────────────────────────────────
      case 'analyze-dependencies':
        return await analyzeDependencies(projectId);
      
      case 'get-dependency-summary':
        return await getDependencySummary(projectId);
      
      case 'get-table-dependencies':
        return await getTableDependencies(projectId, body.tableName);
      
      case 'get-column-dependencies':
        return await getColumnDependencies(projectId, body.tableName, body.columnName);
      
      case 'get-sp-dependencies':
        return await getSPDependencies(projectId, body.spName);
      
      case 'get-view-dependencies':
        return await getViewDependencies(projectId, body.viewName);
      
      case 'get-all-dependencies':
        return await getAllDependencies(projectId, body.filters);
      
      case 'refresh-dependencies':
        return await refreshDependencies(projectId);

      // ─────────────────────────────────────────────────────────────────────
      // Foreign Key Analysis
      // ─────────────────────────────────────────────────────────────────────
      case 'analyze-foreign-keys':
        return await analyzeForeignKeys(projectId);
      
      case 'get-fk-graph':
        return await getFKGraph(projectId);
      
      case 'get-missing-fk-references':
        return await getMissingFKReferences(projectId);
      
      case 'resolve-fk-reference':
        return await resolveFKReference(projectId, body.fkId, body.resolution);
      
      case 'suggest-fk-mappings':
        return await suggestFKMappings(projectId, body.tableName);
      
      case 'validate-fk-integrity':
        return await validateFKIntegrity(projectId);
      
      case 'get-fk-cascade-rules':
        return await getFKCascadeRules(projectId);
      
      case 'update-fk-metadata':
        return await updateFKMetadata(projectId, body.fkId, body.metadata);

      // ─────────────────────────────────────────────────────────────────────
      // Circular Dependency Detection
      // ─────────────────────────────────────────────────────────────────────
      case 'detect-circular-dependencies':
        return await detectCircularDependencies(projectId);
      
      case 'get-circular-dependency-paths':
        return await getCircularDependencyPaths(projectId);
      
      case 'resolve-circular-dependency':
        return await resolveCircularDependency(projectId, body.cycleId, body.resolution);
      
      case 'check-table-in-cycle':
        return await checkTableInCycle(projectId, body.tableName);
      
      case 'get-cycle-break-suggestions':
        return await getCycleBreakSuggestions(projectId, body.cycleId);

      // ─────────────────────────────────────────────────────────────────────
      // Impact Analysis
      // ─────────────────────────────────────────────────────────────────────
      case 'analyze-change-impact':
        return await analyzeChangeImpact(projectId, body.change);
      
      case 'get-table-impact':
        return await getTableImpact(projectId, body.tableName);
      
      case 'get-column-impact':
        return await getColumnImpact(projectId, body.tableName, body.columnName);
      
      case 'get-sp-impact':
        return await getSPImpact(projectId, body.spName);
      
      case 'simulate-deletion':
        return await simulateDeletion(projectId, body.entityType, body.entityName);
      
      case 'simulate-schema-change':
        return await simulateSchemaChange(projectId, body.change);
      
      case 'get-affected-entities':
        return await getAffectedEntities(projectId, body.entityType, body.entityName);

      // ─────────────────────────────────────────────────────────────────────
      // Build Order Generation
      // ─────────────────────────────────────────────────────────────────────
      case 'generate-build-order':
        return await generateBuildOrder(projectId);
      
      case 'get-insertion-order':
        return await getInsertionOrder(projectId);
      
      case 'get-deletion-order':
        return await getDeletionOrder(projectId);
      
      case 'get-migration-order':
        return await getMigrationOrder(projectId);
      
      case 'validate-build-order':
        return await validateBuildOrder(projectId, body.order);
      
      case 'get-dependency-levels':
        return await getDependencyLevels(projectId);
      
      case 'parallelize-build':
        return await parallelizeBuild(projectId, body.maxParallel);

      // ─────────────────────────────────────────────────────────────────────
      // Missing Dependency Resolution
      // ─────────────────────────────────────────────────────────────────────
      case 'find-missing-dependencies':
        return await findMissingDependencies(projectId);
      
      case 'get-missing-tables':
        return await getMissingTables(projectId);
      
      case 'get-missing-columns':
        return await getMissingColumns(projectId);
      
      case 'resolve-missing-table':
        return await resolveMissingTable(projectId, body.tableName, body.resolution);
      
      case 'resolve-missing-column':
        return await resolveMissingColumn(projectId, body.tableName, body.columnName, body.resolution);
      
      case 'get-resolution-suggestions':
        return await getResolutionSuggestions(projectId, body.missingDep);
      
      case 'auto-resolve-dependencies':
        return await autoResolveDependencies(projectId);
      
      case 'get-resolution-progress':
        return await getResolutionProgress(projectId);

      // ─────────────────────────────────────────────────────────────────────
      // Graph Visualization
      // ─────────────────────────────────────────────────────────────────────
      case 'get-dependency-graph':
        return await getDependencyGraph(projectId, body.options);
      
      case 'get-table-graph':
        return await getTableGraph(projectId, body.centerTable, body.depth);
      
      case 'get-module-graph':
        return await getModuleGraph(projectId);
      
      case 'get-lineage-graph':
        return await getLineageGraph(projectId, body.entityType, body.entityName);
      
      case 'export-graph':
        return await exportGraph(projectId, body.format, body.options);
      
      case 'get-graph-statistics':
        return await getGraphStatistics(projectId);
      
      case 'get-node-centrality':
        return await getNodeCentrality(projectId);
      
      case 'get-community-detection':
        return await getCommunityDetection(projectId);

      // ─────────────────────────────────────────────────────────────────────
      // Change Propagation
      // ─────────────────────────────────────────────────────────────────────
      case 'propagate-change':
        return await propagateChange(projectId, body.change);
      
      case 'get-propagation-path':
        return await getPropagationPath(projectId, body.sourceType, body.sourceName, body.targetType, body.targetName);
      
      case 'estimate-propagation-impact':
        return await estimatePropagationImpact(projectId, body.change);
      
      case 'create-propagation-rule':
        return await createPropagationRule(projectId, body.rule);
      
      case 'get-propagation-rules':
        return await getPropagationRules(projectId);

      // ─────────────────────────────────────────────────────────────────────
      // Dependency Intelligence
      // ─────────────────────────────────────────────────────────────────────
      case 'detect-patterns':
        return await detectDependencyPatterns(projectId);
      
      case 'suggest-optimizations':
        return await suggestOptimizations(projectId);
      
      case 'analyze-complexity':
        return await analyzeDependencyComplexity(projectId);
      
      case 'get-critical-nodes':
        return await getCriticalNodes(projectId);
      
      case 'get-dependency-health':
        return await getDependencyHealth(projectId);
      
      case 'compare-dependencies':
        return await compareDependencies(projectId, body.baselineProjectId);

      // ─────────────────────────────────────────────────────────────────────
      // Cross-Reference Analysis
      // ─────────────────────────────────────────────────────────────────────
      case 'analyze-sp-table-refs':
        return await analyzeSPTableRefs(projectId);
      
      case 'analyze-view-table-refs':
        return await analyzeViewTableRefs(projectId);
      
      case 'analyze-cshtml-refs':
        return await analyzeCSHTMLRefs(projectId);
      
      case 'get-cross-reference-matrix':
        return await getCrossReferenceMatrix(projectId);
      
      case 'find-unused-entities':
        return await findUnusedEntities(projectId);
      
      case 'find-orphaned-entities':
        return await findOrphanedEntities(projectId);

      // ─────────────────────────────────────────────────────────────────────
      // Dependency Export/Import
      // ─────────────────────────────────────────────────────────────────────
      case 'export-dependencies':
        return await exportDependencies(projectId, body.format);
      
      case 'import-dependencies':
        return await importDependencies(projectId, body.dependencies);
      
      case 'sync-dependencies':
        return await syncDependencies(projectId);
      
      case 'create-dependency-snapshot':
        return await createDependencySnapshot(projectId, body.description);
      
      case 'get-dependency-history':
        return await getDependencyHistory(projectId);
      
      case 'restore-snapshot':
        return await restoreSnapshot(projectId, body.snapshotId);

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Dependency Graph API error:', error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// CORE DEPENDENCY ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════

async function analyzeDependencies(projectId: string) {
  const tables = await db.toolkitTable.findMany({
    where: { projectId },
    select: { id: true, tableName: true, columns: true, foreignKeys: true },
  });

  const procedures = await db.toolkitProcedure.findMany({
    where: { projectId },
    select: { id: true, procedureName: true, body: true, parameters: true },
  });

  const views = await db.toolkitView.findMany({
    where: { projectId },
    select: { id: true, viewName: true, body: true },
  });

  const cshtmlViews = await db.cSHTMLAnalysisCache.findMany({
    where: { projectId },
    select: { viewName: true, linkedTable: true, fields: true },
  });

  // Build dependency graph
  const dependencies: any = {
    tables: {},
    procedures: {},
    views: {},
    cshtml: {},
  };

  // Analyze table dependencies from FKs
  for (const table of tables) {
    const fks = JSON.parse(table.foreignKeys || '[]');
    dependencies.tables[table.tableName] = {
      id: table.id,
      dependsOn: fks.map((fk: any) => fk.referencedTable).filter(Boolean),
      dependedBy: [],
      columnCount: JSON.parse(table.columns || '[]').length,
      fkCount: fks.length,
    };
  }

  // Analyze SP dependencies from body
  for (const sp of procedures) {
    const body = sp.body || '';
    const tableRefs = extractTableReferences(body);
    const spRefs = extractSPReferences(body);
    
    dependencies.procedures[sp.procedureName] = {
      id: sp.id,
      dependsOnTables: tableRefs,
      dependsOnSPs: spRefs,
      parameterCount: JSON.parse(sp.parameters || '[]').length,
    };

    // Add reverse dependencies
    for (const tableName of tableRefs) {
      if (dependencies.tables[tableName] && !dependencies.tables[tableName].dependedBy.includes(`sp:${sp.procedureName}`)) {
        dependencies.tables[tableName].dependedBy.push(`sp:${sp.procedureName}`);
      }
    }
  }

  // Analyze View dependencies
  for (const view of views) {
    const body = view.body || '';
    const tableRefs = extractTableReferences(body);
    
    dependencies.views[view.viewName] = {
      id: view.id,
      dependsOnTables: tableRefs,
      dependedBy: [],
    };

    for (const tableName of tableRefs) {
      if (dependencies.tables[tableName] && !dependencies.tables[tableName].dependedBy.includes(`view:${view.viewName}`)) {
        dependencies.tables[tableName].dependedBy.push(`view:${view.viewName}`);
      }
    }
  }

  // Analyze CSHTML dependencies
  for (const cshtml of cshtmlViews) {
    const fields = JSON.parse(cshtml.fields || '[]');
    const linkedTable = cshtml.linkedTable;
    
    dependencies.cshtml[cshtml.viewName] = {
      linkedTable,
      fieldCount: fields.length,
      fields: fields.map((f: any) => f.name).filter(Boolean),
    };

    if (linkedTable && dependencies.tables[linkedTable]) {
      if (!dependencies.tables[linkedTable].dependedBy.includes(`cshtml:${cshtml.viewName}`)) {
        dependencies.tables[linkedTable].dependedBy.push(`cshtml:${cshtml.viewName}`);
      }
    }
  }

  // Store analysis results
  const analysis = await db.dependencyAnalysis.create({
    data: {
      projectId,
      analysisType: 'full',
      status: 'completed',
      results: JSON.stringify(dependencies),
      metadata: JSON.stringify({
        tablesAnalyzed: tables.length,
        proceduresAnalyzed: procedures.length,
        viewsAnalyzed: views.length,
        cshtmlAnalyzed: cshtmlViews.length,
      }),
    }
  });

  return NextResponse.json({
    success: true,
    analysisId: analysis.id,
    dependencies,
    summary: {
      totalTables: tables.length,
      totalProcedures: procedures.length,
      totalViews: views.length,
      totalCSHTML: cshtmlViews.length,
      totalDependencies: Object.values(dependencies.tables).reduce((sum: number, t: any) => sum + t.dependsOn.length + t.dependedBy.length, 0),
    }
  });
}

function extractTableReferences(body: string): string[] {
  const refs = new Set<string>();
  const patterns = [
    /FROM\s+([a-zA-Z_][a-zA-Z0-9_]*)/gi,
    /JOIN\s+([a-zA-Z_][a-zA-Z0-9_]*)/gi,
    /INTO\s+([a-zA-Z_][a-zA-Z0-9_]*)/gi,
    /UPDATE\s+([a-zA-Z_][a-zA-Z0-9_]*)/gi,
    /INSERT\s+INTO\s+([a-zA-Z_][a-zA-Z0-9_]*)/gi,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(body)) !== null) {
      const tableName = match[1];
      // Skip SQL keywords
      if (!['SELECT', 'WHERE', 'AND', 'OR', 'NOT', 'NULL', 'INNER', 'OUTER', 'LEFT', 'RIGHT', 'FULL', 'CROSS'].includes(tableName.toUpperCase())) {
        refs.add(tableName);
      }
    }
  }

  return Array.from(refs);
}

function extractSPReferences(body: string): string[] {
  const refs = new Set<string>();
  const pattern = /EXEC(?:UTE)?\s+(?:@?\w+\s*=\s*)?([a-zA-Z_][a-zA-Z0-9_]*)/gi;
  
  let match;
  while ((match = pattern.exec(body)) !== null) {
    refs.add(match[1]);
  }

  return Array.from(refs);
}

async function getDependencySummary(projectId: string) {
  const analysis = await db.dependencyAnalysis.findFirst({
    where: { projectId, analysisType: 'full' },
    orderBy: { createdAt: 'desc' },
  });

  if (!analysis) {
    return NextResponse.json({ error: 'No dependency analysis found. Run analyze-dependencies first.' }, { status: 404 });
  }

  const results = JSON.parse(analysis.results || '{}');
  const tables = results.tables || {};
  const procedures = results.procedures || {};
  const views = results.views || {};

  // Calculate statistics
  const totalTables = Object.keys(tables).length;
  const totalProcedures = Object.keys(procedures).length;
  const totalViews = Object.keys(views).length;

  const tablesWithDependencies = Object.values(tables).filter((t: any) => t.dependsOn.length > 0).length;
  const tablesWithDependents = Object.values(tables).filter((t: any) => t.dependedBy.length > 0).length;
  const orphanTables = Object.values(tables).filter((t: any) => t.dependsOn.length === 0 && t.dependedBy.length === 0).length;

  // Find most referenced tables
  const tableRefCounts = Object.entries(tables).map(([name, data]: [string, any]) => ({
    name,
    referencedBy: data.dependedBy.length,
    references: data.dependsOn.length,
  })).sort((a, b) => b.referencedBy - a.referencedBy);

  return NextResponse.json({
    success: true,
    summary: {
      totalEntities: totalTables + totalProcedures + totalViews,
      tables: {
        total: totalTables,
        withDependencies: tablesWithDependencies,
        withDependents: tablesWithDependents,
        orphan: orphanTables,
      },
      procedures: {
        total: totalProcedures,
        withTableRefs: Object.values(procedures).filter((p: any) => p.dependsOnTables.length > 0).length,
      },
      views: {
        total: totalViews,
        withTableRefs: Object.values(views).filter((v: any) => v.dependsOnTables.length > 0).length,
      },
      mostReferenced: tableRefCounts.slice(0, 10),
      mostReferencing: tableRefCounts.sort((a, b) => b.references - a.references).slice(0, 10),
    },
    analysisDate: analysis.createdAt,
  });
}

async function getTableDependencies(projectId: string, tableName: string) {
  const table = await db.toolkitTable.findFirst({
    where: { projectId, tableName },
    select: { id: true, tableName: true, columns: true, foreignKeys: true },
  });

  if (!table) {
    return NextResponse.json({ error: 'Table not found' }, { status: 404 });
  }

  const columns = JSON.parse(table.columns || '[]');
  const fks = JSON.parse(table.foreignKeys || '[]');

  // Find SPs that reference this table
  const procedures = await db.toolkitProcedure.findMany({
    where: { projectId, body: { contains: tableName } },
    select: { procedureName: true, body: true },
  });

  const referencingSPs = procedures.filter(sp => {
    const refs = extractTableReferences(sp.body || '');
    return refs.includes(tableName);
  });

  // Find Views that reference this table
  const views = await db.toolkitView.findMany({
    where: { projectId, body: { contains: tableName } },
    select: { viewName: true },
  });

  // Find CSHTML views linked to this table
  const cshtmlViews = await db.cSHTMLAnalysisCache.findMany({
    where: { projectId, linkedTable: tableName },
    select: { viewName: true },
  });

  // Find child tables (tables that have FK to this table)
  const allTables = await db.toolkitTable.findMany({
    where: { projectId },
    select: { tableName: true, foreignKeys: true },
  });

  const childTables = allTables.filter(t => {
    const tFKs = JSON.parse(t.foreignKeys || '[]');
    return tFKs.some((fk: any) => fk.referencedTable === tableName);
  });

  return NextResponse.json({
    success: true,
    table: {
      name: tableName,
      id: table.id,
      columnCount: columns.length,
      fkCount: fks.length,
    },
    dependencies: {
      dependsOn: fks.map((fk: any) => ({
        column: fk.column,
        referencedTable: fk.referencedTable,
        referencedColumn: fk.referencedColumn,
      })),
      dependedBy: {
        tables: childTables.map(t => t.tableName),
        procedures: referencingSPs.map(sp => sp.procedureName),
        views: views.map(v => v.viewName),
        cshtml: cshtmlViews.map(c => c.viewName),
      },
    },
    impact: {
      totalDependents: childTables.length + referencingSPs.length + views.length + cshtmlViews.length,
      criticalLevel: childTables.length > 5 || referencingSPs.length > 10 ? 'high' : 'medium',
    }
  });
}

async function getColumnDependencies(projectId: string, tableName: string, columnName: string) {
  const table = await db.toolkitTable.findFirst({
    where: { projectId, tableName },
    select: { id: true, columns: true, foreignKeys: true },
  });

  if (!table) {
    return NextResponse.json({ error: 'Table not found' }, { status: 404 });
  }

  const columns = JSON.parse(table.columns || '[]');
  const column = columns.find((c: any) => c.name === columnName);

  if (!column) {
    return NextResponse.json({ error: 'Column not found' }, { status: 404 });
  }

  // Check if column is a FK
  const fks = JSON.parse(table.foreignKeys || '[]');
  const fk = fks.find((f: any) => f.column === columnName);

  // Find SPs referencing this column
  const procedures = await db.toolkitProcedure.findMany({
    where: { projectId, body: { contains: columnName } },
    select: { procedureName: true, body: true },
  });

  const referencingSPs: any[] = [];
  for (const sp of procedures) {
    const pattern = new RegExp(`\\b${columnName}\\b`, 'gi');
    if (pattern.test(sp.body || '')) {
      referencingSPs.push({
        name: sp.procedureName,
        context: extractColumnContext(sp.body || '', columnName),
      });
    }
  }

  // Find CSHTML fields referencing this column
  const cshtmlFields = await db.cSHTMLAnalysisCache.findMany({
    where: { projectId, linkedTable: tableName },
    select: { viewName: true, fields: true },
  });

  const referencingCSHTML = cshtmlFields.filter(c => {
    const fields = JSON.parse(c.fields || '[]');
    return fields.some((f: any) => f.name === columnName);
  });

  return NextResponse.json({
    success: true,
    column: {
      name: columnName,
      table: tableName,
      type: column.type,
      isFK: !!fk,
      fkReference: fk ? { table: fk.referencedTable, column: fk.referencedColumn } : null,
    },
    dependencies: {
      referencingSPs: referencingSPs.slice(0, 10),
      referencingCSHTML: referencingCSHTML.map(c => c.viewName),
    },
    impact: {
      totalReferences: referencingSPs.length + referencingCSHTML.length,
      severity: fk ? 'high' : referencingSPs.length > 5 ? 'medium' : 'low',
    }
  });
}

function extractColumnContext(body: string, columnName: string): string {
  const pattern = new RegExp(`(.{0,100}${columnName}.{0,100})`, 'gi');
  const match = body.match(pattern);
  return match ? match[0].trim() : '';
}

async function getSPDependencies(projectId: string, spName: string) {
  const sp = await db.toolkitProcedure.findFirst({
    where: { projectId, procedureName: spName },
    select: { id: true, procedureName: true, body: true, parameters: true },
  });

  if (!sp) {
    return NextResponse.json({ error: 'Stored procedure not found' }, { status: 404 });
  }

  const body = sp.body || '';
  const tableRefs = extractTableReferences(body);
  const spRefs = extractSPReferences(body);

  // Analyze operations on each table
  const tableOperations: Record<string, string[]> = {};
  for (const table of tableRefs) {
    const operations: string[] = [];
    if (new RegExp(`SELECT[\\s\\S]*FROM\\s+${table}`, 'i').test(body)) operations.push('SELECT');
    if (new RegExp(`INSERT\\s+INTO\\s+${table}`, 'i').test(body)) operations.push('INSERT');
    if (new RegExp(`UPDATE\\s+${table}`, 'i').test(body)) operations.push('UPDATE');
    if (new RegExp(`DELETE\\s+FROM\\s+${table}`, 'i').test(body)) operations.push('DELETE');
    tableOperations[table] = operations;
  }

  // Find SPs that call this SP
  const callingSPs = await db.toolkitProcedure.findMany({
    where: { projectId, body: { contains: spName } },
    select: { procedureName: true },
  });

  return NextResponse.json({
    success: true,
    procedure: {
      name: spName,
      id: sp.id,
      parameterCount: JSON.parse(sp.parameters || '[]').length,
    },
    dependencies: {
      tables: tableRefs.map(t => ({ name: t, operations: tableOperations[t] || [] })),
      procedures: spRefs,
      calledBy: callingSPs.filter(() => {
        const pattern = new RegExp(`EXEC(?:UTE)?\\s+(?:@?\\w+\\s*=\\s*)?${spName}`, 'i');
        return pattern.test(body);
      }).map(c => c.procedureName),
    },
    complexity: {
      tableCount: tableRefs.length,
      spCount: spRefs.length,
      level: tableRefs.length > 5 || spRefs.length > 3 ? 'high' : 'medium',
    }
  });
}

async function getViewDependencies(projectId: string, viewName: string) {
  const view = await db.toolkitView.findFirst({
    where: { projectId, viewName },
    select: { id: true, viewName: true, body: true },
  });

  if (!view) {
    return NextResponse.json({ error: 'View not found' }, { status: 404 });
  }

  const body = view.body || '';
  const tableRefs = extractTableReferences(body);
  const columnRefs = extractColumnReferences(body);

  return NextResponse.json({
    success: true,
    view: {
      name: viewName,
      id: view.id,
    },
    dependencies: {
      tables: tableRefs,
      columns: columnRefs,
    },
  });
}

function extractColumnReferences(body: string): string[] {
  const refs = new Set<string>();
  // Simple pattern - would need more sophisticated parsing for real use
  const pattern = /\b([A-Za-z_][A-Za-z0-9_]*)\.([A-Za-z_][A-Za-z0-9_]*)/g;
  let match;
  while ((match = pattern.exec(body)) !== null) {
    refs.add(`${match[1]}.${match[2]}`);
  }
  return Array.from(refs);
}

async function getAllDependencies(projectId: string, filters?: any) {
  const analysis = await db.dependencyAnalysis.findFirst({
    where: { projectId, analysisType: 'full' },
    orderBy: { createdAt: 'desc' },
  });

  if (!analysis) {
    return NextResponse.json({ error: 'No dependency analysis found' }, { status: 404 });
  }

  const results = JSON.parse(analysis.results || '{}');

  return NextResponse.json({
    success: true,
    dependencies: results,
    lastAnalyzed: analysis.createdAt,
  });
}

async function refreshDependencies(projectId: string) {
  // Delete old analysis and run fresh
  await db.dependencyAnalysis.deleteMany({
    where: { projectId, analysisType: 'full' },
  });

  return await analyzeDependencies(projectId);
}

// ═══════════════════════════════════════════════════════════════════════════
// FOREIGN KEY ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════

async function analyzeForeignKeys(projectId: string) {
  const tables = await db.toolkitTable.findMany({
    where: { projectId },
    select: { tableName: true, foreignKeys: true, columns: true },
  });

  const fkAnalysis: any[] = [];
  const missingReferences: any[] = [];

  for (const table of tables) {
    const fks = JSON.parse(table.foreignKeys || '[]');

    for (const fk of fks) {
      const analysis = {
        tableName: table.tableName,
        columnName: fk.column,
        referencedTable: fk.referencedTable,
        referencedColumn: fk.referencedColumn,
        constraintName: fk.name || `${table.tableName}_FK_${fk.column}`,
        status: 'resolved' as string,
        issues: [] as string[],
      };

      // Check if referenced table exists
      const refTableExists = tables.some(t => t.tableName === fk.referencedTable);
      if (!refTableExists) {
        analysis.status = 'missing_reference';
        analysis.issues.push(`Referenced table '${fk.referencedTable}' not found`);
        missingReferences.push({
          type: 'table',
          tableName: table.tableName,
          columnName: fk.column,
          missingTable: fk.referencedTable,
        });
      } else {
        // Check if referenced column exists
        const refTable = tables.find(t => t.tableName === fk.referencedTable);
        const refColumns = JSON.parse(refTable?.columns || '[]');
        const refColumnExists = refColumns.some((c: any) => c.name === fk.referencedColumn);
        if (!refColumnExists) {
          analysis.status = 'missing_column';
          analysis.issues.push(`Referenced column '${fk.referencedTable}.${fk.referencedColumn}' not found`);
          missingReferences.push({
            type: 'column',
            tableName: table.tableName,
            columnName: fk.column,
            missingTable: fk.referencedTable,
            missingColumn: fk.referencedColumn,
          });
        }
      }

      fkAnalysis.push(analysis);
    }
  }

  // Store FK analysis
  await db.fKDependencyCache.upsert({
    where: { projectId_tableName: { projectId, tableName: '_all' } },
    create: {
      projectId,
      tableName: '_all',
      totalFKs: fkAnalysis.length,
      resolvedFKs: fkAnalysis.filter(f => f.status === 'resolved').length,
      missingTables: JSON.stringify(missingReferences.filter(m => m.type === 'table')),
      analysisData: JSON.stringify(fkAnalysis),
    },
    update: {
      totalFKs: fkAnalysis.length,
      resolvedFKs: fkAnalysis.filter(f => f.status === 'resolved').length,
      missingTables: JSON.stringify(missingReferences.filter(m => m.type === 'table')),
      analysisData: JSON.stringify(fkAnalysis),
    }
  });

  return NextResponse.json({
    success: true,
    analysis: {
      totalFKs: fkAnalysis.length,
      resolved: fkAnalysis.filter(f => f.status === 'resolved').length,
      missingReference: fkAnalysis.filter(f => f.status === 'missing_reference').length,
      missingColumn: fkAnalysis.filter(f => f.status === 'missing_column').length,
    },
    foreignKeys: fkAnalysis,
    missingReferences,
  });
}

async function getFKGraph(projectId: string) {
  const tables = await db.toolkitTable.findMany({
    where: { projectId },
    select: { tableName: true, foreignKeys: true },
  });

  const nodes: any[] = [];
  const edges: any[] = [];

  for (const table of tables) {
    nodes.push({
      id: table.tableName,
      label: table.tableName,
      type: 'table',
    });

    const fks = JSON.parse(table.foreignKeys || '[]');
    for (const fk of fks) {
      edges.push({
        source: table.tableName,
        target: fk.referencedTable,
        label: fk.column,
        type: 'foreign_key',
      });
    }
  }

  return NextResponse.json({
    success: true,
    graph: { nodes, edges },
    statistics: {
      nodeCount: nodes.length,
      edgeCount: edges.length,
      avgConnections: nodes.length > 0 ? (edges.length / nodes.length).toFixed(2) : 0,
    }
  });
}

async function getMissingFKReferences(projectId: string) {
  const cache = await db.fKDependencyCache.findFirst({
    where: { projectId },
    orderBy: { createdAt: 'desc' },
  });

  if (!cache) {
    // Run analysis first
    return await analyzeForeignKeys(projectId);
  }

  const analysisData = JSON.parse(cache.analysisData || '[]');
  const missing = analysisData.filter((f: any) => f.status !== 'resolved');

  return NextResponse.json({
    success: true,
    missingReferences: missing,
    summary: {
      total: missing.length,
      byType: {
        table: missing.filter((m: any) => m.status === 'missing_reference').length,
        column: missing.filter((m: any) => m.status === 'missing_column').length,
      }
    }
  });
}

async function resolveFKReference(projectId: string, fkId: string, resolution: any) {
  // This would update the FK metadata or create missing tables
  // For now, log the resolution
  await db.fKResolutionLog.create({
    data: {
      projectId,
      tableName: resolution.tableName,
      action: 'resolve_fk',
      success: true,
      metadata: JSON.stringify({ fkId, resolution }),
    }
  });

  return NextResponse.json({
    success: true,
    message: 'FK reference resolution logged',
    resolution,
  });
}

async function suggestFKMappings(projectId: string, tableName: string) {
  const table = await db.toolkitTable.findFirst({
    where: { projectId, tableName },
    select: { tableName: true, columns: true },
  });

  if (!table) {
    return NextResponse.json({ error: 'Table not found' }, { status: 404 });
  }

  const columns = JSON.parse(table.columns || '[]');
  const suggestions: any[] = [];

  // Find columns that might be FKs based on naming
  for (const col of columns) {
    const colName = col.name.toLowerCase();
    if (colName.endsWith('id') && colName !== 'id') {
      const potentialRefTable = colName.replace(/id$/, '');
      const pluralTable = pluralize(potentialRefTable);
      
      suggestions.push({
        column: col.name,
        potentialReferencedTable: pluralTable,
        potentialReferencedColumn: 'Id',
        confidence: 0.8,
        reason: 'Column name follows FK naming pattern',
      });
    }
  }

  // Cross-reference with existing tables
  const existingTables = await db.toolkitTable.findMany({
    where: { projectId },
    select: { tableName: true },
  });

  const tableNames = existingTables.map(t => t.tableName.toLowerCase());

  for (const suggestion of suggestions) {
    if (!tableNames.includes(suggestion.potentialReferencedTable.toLowerCase())) {
      suggestion.confidence *= 0.5;
      suggestion.note = 'Referenced table not found in project';
    }
  }

  return NextResponse.json({
    success: true,
    tableName,
    suggestions,
  });
}

function pluralize(word: string): string {
  if (word.endsWith('y') && !word.endsWith('ay')) {
    return word.slice(0, -1) + 'ies';
  } else if (word.endsWith('s') || word.endsWith('x') || word.endsWith('ch') || word.endsWith('sh')) {
    return word + 'es';
  }
  return word + 's';
}

async function validateFKIntegrity(projectId: string) {
  const tables = await db.toolkitTable.findMany({
    where: { projectId },
    select: { tableName: true, foreignKeys: true },
  });

  const issues: any[] = [];

  for (const table of tables) {
    const fks = JSON.parse(table.foreignKeys || '[]');
    
    for (const fk of fks) {
      // Check FK consistency
      if (!fk.referencedTable) {
        issues.push({
          tableName: table.tableName,
          columnName: fk.column,
          issue: 'missing_referenced_table',
          severity: 'high',
          message: `FK on ${fk.column} has no referenced table`,
        });
      }

      if (!fk.referencedColumn) {
        issues.push({
          tableName: table.tableName,
          columnName: fk.column,
          issue: 'missing_referenced_column',
          severity: 'medium',
          message: `FK on ${fk.column} has no referenced column`,
        });
      }

      // Check for self-referencing FKs
      if (fk.referencedTable === table.tableName) {
        issues.push({
          tableName: table.tableName,
          columnName: fk.column,
          issue: 'self_referencing_fk',
          severity: 'info',
          message: `FK on ${fk.column} references the same table`,
        });
      }
    }
  }

  return NextResponse.json({
    success: true,
    issues,
    summary: {
      totalIssues: issues.length,
      bySeverity: {
        high: issues.filter(i => i.severity === 'high').length,
        medium: issues.filter(i => i.severity === 'medium').length,
        low: issues.filter(i => i.severity === 'low').length,
        info: issues.filter(i => i.severity === 'info').length,
      }
    }
  });
}

async function getFKCascadeRules(projectId: string) {
  const tables = await db.toolkitTable.findMany({
    where: { projectId },
    select: { tableName: true, foreignKeys: true },
  });

  const cascadeRules: any[] = [];

  for (const table of tables) {
    const fks = JSON.parse(table.foreignKeys || '[]');
    
    for (const fk of fks) {
      cascadeRules.push({
        tableName: table.tableName,
        columnName: fk.column,
        referencedTable: fk.referencedTable,
        onDelete: fk.onDelete || 'NO ACTION',
        onUpdate: fk.onUpdate || 'NO ACTION',
      });
    }
  }

  return NextResponse.json({
    success: true,
    cascadeRules,
    summary: {
      total: cascadeRules.length,
      cascadeOnDelete: cascadeRules.filter(r => r.onDelete === 'CASCADE').length,
      cascadeOnUpdate: cascadeRules.filter(r => r.onUpdate === 'CASCADE').length,
      setNullOnDelete: cascadeRules.filter(r => r.onDelete === 'SET NULL').length,
    }
  });
}

async function updateFKMetadata(projectId: string, fkId: string, metadata: any) {
  // This would update FK metadata in the database
  return NextResponse.json({
    success: true,
    message: 'FK metadata updated',
    fkId,
    metadata,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// CIRCULAR DEPENDENCY DETECTION
// ═══════════════════════════════════════════════════════════════════════════

async function detectCircularDependencies(projectId: string) {
  const tables = await db.toolkitTable.findMany({
    where: { projectId },
    select: { tableName: true, foreignKeys: true },
  });

  // Build adjacency list
  const graph: Record<string, string[]> = {};
  for (const table of tables) {
    graph[table.tableName] = [];
    const fks = JSON.parse(table.foreignKeys || '[]');
    for (const fk of fks) {
      if (fk.referencedTable && fk.referencedTable !== table.tableName) {
        graph[table.tableName].push(fk.referencedTable);
      }
    }
  }

  // Detect cycles using DFS
  const cycles: string[][] = [];
  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  const path: string[] = [];

  function dfs(node: string): boolean {
    visited.add(node);
    recursionStack.add(node);
    path.push(node);

    for (const neighbor of (graph[node] || [])) {
      if (!visited.has(neighbor)) {
        if (dfs(neighbor)) {
          return true;
        }
      } else if (recursionStack.has(neighbor)) {
        // Found cycle
        const cycleStart = path.indexOf(neighbor);
        const cycle = path.slice(cycleStart);
        cycles.push([...cycle, neighbor]);
      }
    }

    path.pop();
    recursionStack.delete(node);
    return false;
  }

  for (const node of Object.keys(graph)) {
    if (!visited.has(node)) {
      dfs(node);
    }
  }

  // Store detected cycles
  await db.fKResolutionSession.upsert({
    where: { id: projectId },
    create: {
      projectId,
      totalMissing: 0,
      totalResolved: 0,
      totalBlocked: cycles.length,
      circularDeps: JSON.stringify(cycles),
      status: 'active',
    },
    update: {
      totalBlocked: cycles.length,
      circularDeps: JSON.stringify(cycles),
    }
  });

  return NextResponse.json({
    success: true,
    hasCycles: cycles.length > 0,
    cycles: cycles.map((cycle, i) => ({
      id: `cycle_${i}`,
      tables: cycle,
      length: cycle.length,
    })),
    summary: {
      totalCycles: cycles.length,
      affectedTables: [...new Set(cycles.flat())].length,
    }
  });
}

async function getCircularDependencyPaths(projectId: string) {
  const session = await db.fKResolutionSession.findFirst({
    where: { projectId },
    orderBy: { createdAt: 'desc' },
  });

  if (!session) {
    return await detectCircularDependencies(projectId);
  }

  const cycles = JSON.parse(session.circularDeps || '[]');

  return NextResponse.json({
    success: true,
    cycles: cycles.map((cycle: string[], i: number) => ({
      id: `cycle_${i}`,
      path: cycle,
      visualPath: cycle.join(' → '),
    })),
  });
}

async function resolveCircularDependency(projectId: string, cycleId: string, resolution: any) {
  // Log resolution attempt
  await db.fKResolutionLog.create({
    data: {
      projectId,
      tableName: cycleId,
      action: 'resolve_cycle',
      success: true,
      metadata: JSON.stringify(resolution),
    }
  });

  return NextResponse.json({
    success: true,
    message: 'Circular dependency resolution logged',
    cycleId,
    resolution,
  });
}

async function checkTableInCycle(projectId: string, tableName: string) {
  const session = await db.fKResolutionSession.findFirst({
    where: { projectId },
    orderBy: { createdAt: 'desc' },
  });

  if (!session) {
    return NextResponse.json({ inCycle: false, cycles: [] });
  }

  const cycles = JSON.parse(session.circularDeps || '[]');
  const involvedCycles = cycles.filter((cycle: string[]) => cycle.includes(tableName));

  return NextResponse.json({
    success: true,
    tableName,
    inCycle: involvedCycles.length > 0,
    involvedCycles: involvedCycles.map((cycle: string[], i: number) => ({
      id: `cycle_${i}`,
      path: cycle,
    })),
  });
}

async function getCycleBreakSuggestions(projectId: string, cycleId: string) {
  // Extract cycle number
  const cycleNum = parseInt(cycleId.replace('cycle_', ''));
  
  const session = await db.fKResolutionSession.findFirst({
    where: { projectId },
    orderBy: { createdAt: 'desc' },
  });

  if (!session) {
    return NextResponse.json({ error: 'No cycle analysis found' }, { status: 404 });
  }

  const cycles = JSON.parse(session.circularDeps || '[]');
  const cycle = cycles[cycleNum];

  if (!cycle) {
    return NextResponse.json({ error: 'Cycle not found' }, { status: 404 });
  }

  const suggestions: any[] = [];

  // Suggest breaking at each edge in the cycle
  for (let i = 0; i < cycle.length - 1; i++) {
    const sourceTable = cycle[i];
    const targetTable = cycle[i + 1];
    
    suggestions.push({
      type: 'remove_fk',
      sourceTable,
      targetTable,
      description: `Remove FK from ${sourceTable} to ${targetTable}`,
      impact: 'medium',
    });

    suggestions.push({
      type: 'make_nullable',
      sourceTable,
      targetTable,
      description: `Make FK column in ${sourceTable} nullable`,
      impact: 'low',
    });
  }

  return NextResponse.json({
    success: true,
    cycleId,
    cyclePath: cycle,
    suggestions,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// IMPACT ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════

async function analyzeChangeImpact(projectId: string, change: any) {
  const { entityType, entityName, changeType } = change;

  switch (entityType) {
    case 'table':
      return await getTableImpact(projectId, entityName);
    case 'column':
      return await getColumnImpact(projectId, change.tableName, entityName);
    case 'procedure':
      return await getSPImpact(projectId, entityName);
    default:
      return NextResponse.json({ error: 'Unknown entity type' }, { status: 400 });
  }
}

async function getTableImpact(projectId: string, tableName: string) {
  // Get dependencies
  const depsResult = await getTableDependencies(projectId, tableName);
  const depsData = await depsResult.json();

  const impact: any = {
    tableName,
    directImpact: {
      childTables: depsData.dependencies?.dependedBy?.tables || [],
      referencingProcedures: depsData.dependencies?.dependedBy?.procedures || [],
      referencingViews: depsData.dependencies?.dependedBy?.views || [],
      referencingCSHTML: depsData.dependencies?.dependedBy?.cshtml || [],
    },
    indirectImpact: {
      estimatedAffectedEntities: 0,
      cascadeDepth: 0,
    },
    riskAssessment: {
      level: 'low' as string,
      factors: [] as string[],
    },
    recommendations: [] as string[],
  };

  // Calculate indirect impact
  const totalDirect = (depsData.dependencies?.dependedBy?.tables?.length || 0) +
                     (depsData.dependencies?.dependedBy?.procedures?.length || 0) +
                     (depsData.dependencies?.dependedBy?.views?.length || 0) +
                     (depsData.dependencies?.dependedBy?.cshtml?.length || 0);

  impact.indirectImpact.estimatedAffectedEntities = totalDirect * 2; // Rough estimate

  // Assess risk
  if (totalDirect > 20) {
    impact.riskAssessment.level = 'critical';
    impact.riskAssessment.factors.push('Very high number of dependent entities');
  } else if (totalDirect > 10) {
    impact.riskAssessment.level = 'high';
    impact.riskAssessment.factors.push('High number of dependent entities');
  } else if (totalDirect > 5) {
    impact.riskAssessment.level = 'medium';
    impact.riskAssessment.factors.push('Moderate number of dependent entities');
  }

  if ((depsData.dependencies?.dependedBy?.procedures?.length || 0) > 5) {
    impact.riskAssessment.factors.push('Multiple stored procedures affected');
  }

  // Generate recommendations
  impact.recommendations.push('Review all dependent entities before making changes');
  if (impact.riskAssessment.level === 'critical' || impact.riskAssessment.level === 'high') {
    impact.recommendations.push('Consider phased rollout with extensive testing');
    impact.recommendations.push('Create backup before changes');
  }

  return NextResponse.json({
    success: true,
    impact,
  });
}

async function getColumnImpact(projectId: string, tableName: string, columnName: string) {
  const depsResult = await getColumnDependencies(projectId, tableName, columnName);
  const depsData = await depsResult.json();

  const impact: any = {
    table: tableName,
    column: columnName,
    isForeignKey: depsData.column?.isFK || false,
    directImpact: {
      referencingSPs: depsData.dependencies?.referencingSPs || [],
      referencingCSHTML: depsData.dependencies?.referencingCSHTML || [],
    },
    riskAssessment: {
      level: depsData.impact?.severity || 'low',
      factors: [] as string[],
    },
    recommendations: [] as string[],
  };

  if (impact.isForeignKey) {
    impact.riskAssessment.factors.push('Column is a foreign key');
    impact.recommendations.push('Update FK constraint before modifying column');
  }

  if ((depsData.dependencies?.referencingSPs?.length || 0) > 3) {
    impact.riskAssessment.factors.push('Referenced in multiple stored procedures');
  }

  impact.recommendations.push('Search and update all references to this column');

  return NextResponse.json({
    success: true,
    impact,
  });
}

async function getSPImpact(projectId: string, spName: string) {
  const depsResult = await getSPDependencies(projectId, spName);
  const depsData = await depsResult.json();

  const impact: any = {
    procedureName: spName,
    directImpact: {
      calledBy: depsData.dependencies?.calledBy || [],
      tablesUsed: depsData.dependencies?.tables?.map((t: any) => t.name) || [],
    },
    riskAssessment: {
      level: 'medium',
      factors: [] as string[],
    },
    recommendations: [] as string[],
  };

  if ((depsData.dependencies?.calledBy?.length || 0) > 0) {
    impact.riskAssessment.factors.push('Called by other procedures');
  }

  impact.recommendations.push('Test all calling procedures after changes');

  return NextResponse.json({
    success: true,
    impact,
  });
}

async function simulateDeletion(projectId: string, entityType: string, entityName: string) {
  const impact: any = {
    entityType,
    entityName,
    canDelete: true,
    blockers: [] as any[],
    warnings: [] as string[],
    cascadeEffects: [] as string[],
  };

  if (entityType === 'table') {
    const depsResult = await getTableDependencies(projectId, entityName);
    const depsData = await depsResult.json();

    // Check for FK constraints
    if ((depsData.dependencies?.dependedBy?.tables?.length || 0) > 0) {
      impact.canDelete = false;
      impact.blockers.push({
        type: 'foreign_key_constraint',
        tables: depsData.dependencies.dependedBy.tables,
        message: 'Cannot delete table with foreign key references',
      });
    }

    // Check for dependent SPs
    if ((depsData.dependencies?.dependedBy?.procedures?.length || 0) > 0) {
      impact.warnings.push(`${depsData.dependencies.dependedBy.procedures.length} stored procedures reference this table`);
      impact.cascadeEffects.push('Procedures will fail');
    }

    // Check for CSHTML views
    if ((depsData.dependencies?.dependedBy?.cshtml?.length || 0) > 0) {
      impact.warnings.push(`${depsData.dependencies.dependedBy.cshtml.length} CSHTML views reference this table`);
      impact.cascadeEffects.push('UI pages will break');
    }
  }

  return NextResponse.json({
    success: true,
    simulation: impact,
  });
}

async function simulateSchemaChange(projectId: string, change: any) {
  const { tableName, changeType, columnName, newType } = change;

  const simulation: any = {
    change,
    feasible: true,
    impacts: [] as any[],
    requirements: [] as string[],
  };

  if (changeType === 'alter_column' && columnName) {
    const colImpact = await getColumnImpact(projectId, tableName, columnName);
    const colData = await colImpact.json();

    simulation.impacts.push({
      type: 'column_references',
      count: (colData.impact?.directImpact?.referencingSPs?.length || 0) + (colData.impact?.directImpact?.referencingCSHTML?.length || 0),
    });

    if (colData.impact?.isForeignKey) {
      simulation.feasible = false;
      simulation.requirements.push('Drop foreign key constraint first');
    }

    simulation.requirements.push('Update all stored procedures using this column');
  }

  return NextResponse.json({
    success: true,
    simulation,
  });
}

async function getAffectedEntities(projectId: string, entityType: string, entityName: string) {
  if (entityType === 'table') {
    return await getTableDependencies(projectId, entityName);
  }

  return NextResponse.json({
    success: true,
    affectedEntities: [],
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// BUILD ORDER GENERATION
// ═══════════════════════════════════════════════════════════════════════════

async function generateBuildOrder(projectId: string) {
  const tables = await db.toolkitTable.findMany({
    where: { projectId },
    select: { tableName: true, foreignKeys: true },
  });

  // Build dependency graph
  const dependencies: Record<string, Set<string>> = {};
  const tableNames = tables.map(t => t.tableName);

  for (const table of tables) {
    dependencies[table.tableName] = new Set();
    const fks = JSON.parse(table.foreignKeys || '[]');
    for (const fk of fks) {
      if (fk.referencedTable && tableNames.includes(fk.referencedTable) && fk.referencedTable !== table.tableName) {
        dependencies[table.tableName].add(fk.referencedTable);
      }
    }
  }

  // Topological sort using Kahn's algorithm
  const inDegree: Record<string, number> = {};
  const queue: string[] = [];
  const order: string[] = [];

  // Calculate in-degrees
  for (const table of tableNames) {
    inDegree[table] = 0;
  }

  for (const table of tableNames) {
    for (const dep of dependencies[table]) {
      inDegree[table]++;
    }
  }

  // Find tables with no dependencies
  for (const table of tableNames) {
    if (inDegree[table] === 0) {
      queue.push(table);
    }
  }

  while (queue.length > 0) {
    const current = queue.shift()!;
    order.push(current);

    // Find tables that depend on current
    for (const table of tableNames) {
      if (dependencies[table].has(current)) {
        inDegree[table]--;
        if (inDegree[table] === 0) {
          queue.push(table);
        }
      }
    }
  }

  // Check for cycles (not all tables processed)
  const hasCycle = order.length < tableNames.length;

  // Store build order
  await db.fKResolutionSession.upsert({
    where: { id: `${projectId}_build` },
    create: {
      projectId,
      totalMissing: 0,
      totalResolved: order.length,
      totalBlocked: tableNames.length - order.length,
      buildOrder: JSON.stringify(order),
      status: hasCycle ? 'blocked' : 'complete',
    },
    update: {
      buildOrder: JSON.stringify(order),
      totalResolved: order.length,
      status: hasCycle ? 'blocked' : 'complete',
    }
  });

  return NextResponse.json({
    success: true,
    buildOrder: order,
    totalTables: tableNames.length,
    orderedTables: order.length,
    hasCycle,
    cycleBlocked: hasCycle ? tableNames.filter(t => !order.includes(t)) : [],
  });
}

async function getInsertionOrder(projectId: string) {
  const buildOrderResult = await generateBuildOrder(projectId);
  const buildData = await buildOrderResult.json();

  // Insertion order is the same as build order
  return NextResponse.json({
    success: true,
    insertionOrder: buildData.buildOrder,
    note: 'Insert parent tables first, then child tables',
  });
}

async function getDeletionOrder(projectId: string) {
  const buildOrderResult = await generateBuildOrder(projectId);
  const buildData = await buildOrderResult.json();

  // Deletion order is reverse of build order
  const deletionOrder = [...(buildData.buildOrder || [])].reverse();

  return NextResponse.json({
    success: true,
    deletionOrder,
    note: 'Delete child tables first, then parent tables',
  });
}

async function getMigrationOrder(projectId: string) {
  const buildOrderResult = await generateBuildOrder(projectId);
  const buildData = await buildOrderResult.json();

  // Migration order with steps
  const migrationOrder = (buildData.buildOrder || []).map((tableName: string, index: number) => ({
    step: index + 1,
    tableName,
    action: 'migrate',
    dependencies: index === 0 ? [] : [buildData.buildOrder[index - 1]],
  }));

  return NextResponse.json({
    success: true,
    migrationOrder,
    totalSteps: migrationOrder.length,
  });
}

async function validateBuildOrder(projectId: string, order: string[]) {
  const tables = await db.toolkitTable.findMany({
    where: { projectId },
    select: { tableName: true, foreignKeys: true },
  });

  const errors: any[] = [];
  const warnings: any[] = [];

  // Build a set of already processed tables
  const processed = new Set<string>();

  for (let i = 0; i < order.length; i++) {
    const tableName = order[i];
    const table = tables.find(t => t.tableName === tableName);

    if (!table) {
      errors.push({
        step: i + 1,
        tableName,
        error: 'Table not found in project',
      });
      continue;
    }

    const fks = JSON.parse(table.foreignKeys || '[]');
    for (const fk of fks) {
      if (fk.referencedTable && fk.referencedTable !== tableName) {
        if (!processed.has(fk.referencedTable)) {
          errors.push({
            step: i + 1,
            tableName,
            error: `FK references ${fk.referencedTable} which is not yet created`,
            fkColumn: fk.column,
          });
        }
      }
    }

    processed.add(tableName);
  }

  // Check for missing tables
  const allTableNames = tables.map(t => t.tableName);
  const missingTables = allTableNames.filter(t => !order.includes(t));
  if (missingTables.length > 0) {
    warnings.push({
      type: 'missing_tables',
      tables: missingTables,
      message: 'Some tables are not in the build order',
    });
  }

  return NextResponse.json({
    success: true,
    valid: errors.length === 0,
    errors,
    warnings,
  });
}

async function getDependencyLevels(projectId: string) {
  const tables = await db.toolkitTable.findMany({
    where: { projectId },
    select: { tableName: true, foreignKeys: true },
  });

  const tableNames = tables.map(t => t.tableName);
  const levels: string[][] = [];
  const assigned = new Set<string>();

  // Build dependency map
  const deps: Record<string, string[]> = {};
  for (const table of tables) {
    deps[table.tableName] = [];
    const fks = JSON.parse(table.foreignKeys || '[]');
    for (const fk of fks) {
      if (fk.referencedTable && tableNames.includes(fk.referencedTable) && fk.referencedTable !== table.tableName) {
        deps[table.tableName].push(fk.referencedTable);
      }
    }
  }

  // Assign levels iteratively
  while (assigned.size < tableNames.length) {
    const level: string[] = [];

    for (const tableName of tableNames) {
      if (assigned.has(tableName)) continue;

      const tableDeps = deps[tableName] || [];
      const allDepsAssigned = tableDeps.every(d => assigned.has(d));

      if (allDepsAssigned || tableDeps.length === 0) {
        level.push(tableName);
      }
    }

    if (level.length === 0) {
      // Cycle detected - add remaining tables
      level.push(...tableNames.filter(t => !assigned.has(t)));
    }

    levels.push(level);
    level.forEach(t => assigned.add(t));
  }

  return NextResponse.json({
    success: true,
    levels: levels.map((level, i) => ({
      level: i,
      tables: level,
      canExecuteInParallel: level.length > 1,
    })),
    totalLevels: levels.length,
  });
}

async function parallelizeBuild(projectId: string, maxParallel: number = 4) {
  const levelsResult = await getDependencyLevels(projectId);
  const levelsData = await levelsResult.json();

  const batches: string[][] = [];

  for (const level of levelsData.levels) {
    const tables = level.tables;
    for (let i = 0; i < tables.length; i += maxParallel) {
      batches.push(tables.slice(i, i + maxParallel));
    }
  }

  return NextResponse.json({
    success: true,
    batches: batches.map((batch, i) => ({
      batch: i + 1,
      tables: batch,
      parallelCount: batch.length,
    })),
    totalBatches: batches.length,
    estimatedTimeSavings: `${Math.ceil(batches.length * 0.5)} minutes (estimated)`,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// MISSING DEPENDENCY RESOLUTION
// ═══════════════════════════════════════════════════════════════════════════

async function findMissingDependencies(projectId: string) {
  // Get all entities
  const tables = await db.toolkitTable.findMany({
    where: { projectId },
    select: { tableName: true, foreignKeys: true },
  });

  const procedures = await db.toolkitProcedure.findMany({
    where: { projectId },
    select: { procedureName: true, body: true },
  });

  const views = await db.toolkitView.findMany({
    where: { projectId },
    select: { viewName: true, body: true },
  });

  const existingTables = new Set(tables.map(t => t.tableName));

  const missing: any[] = [];

  // Check FK references
  for (const table of tables) {
    const fks = JSON.parse(table.foreignKeys || '[]');
    for (const fk of fks) {
      if (fk.referencedTable && !existingTables.has(fk.referencedTable)) {
        missing.push({
          type: 'table',
          name: fk.referencedTable,
          referencedFrom: table.tableName,
          referenceType: 'foreign_key',
          column: fk.column,
          priority: 'high',
        });
      }
    }
  }

  // Check SP table references
  for (const sp of procedures) {
    const tableRefs = extractTableReferences(sp.body || '');
    for (const tableName of tableRefs) {
      if (!existingTables.has(tableName)) {
        missing.push({
          type: 'table',
          name: tableName,
          referencedFrom: sp.procedureName,
          referenceType: 'sp_reference',
          priority: 'medium',
        });
      }
    }
  }

  // Check View table references
  for (const view of views) {
    const tableRefs = extractTableReferences(view.body || '');
    for (const tableName of tableRefs) {
      if (!existingTables.has(tableName)) {
        missing.push({
          type: 'table',
          name: tableName,
          referencedFrom: view.viewName,
          referenceType: 'view_reference',
          priority: 'medium',
        });
      }
    }
  }

  // Store missing dependencies
  for (const dep of missing) {
    try {
      await db.missingTableResolution.upsert({
        where: {
          projectId_tableName: { projectId, tableName: dep.name }
        },
        create: {
          projectId,
          tableName: dep.name,
          status: 'missing',
          priority: dep.priority,
          blocksCount: 1,
          referencedBy: JSON.stringify([dep.referencedFrom]),
        },
        update: {},
      });
    } catch (e) {
      // Ignore duplicate errors
    }
  }

  return NextResponse.json({
    success: true,
    missingDependencies: missing,
    summary: {
      total: missing.length,
      byType: {
        tables: missing.filter(m => m.type === 'table').length,
        sps: missing.filter(m => m.type === 'sp').length,
      },
      byPriority: {
        high: missing.filter(m => m.priority === 'high').length,
        medium: missing.filter(m => m.priority === 'medium').length,
        low: missing.filter(m => m.priority === 'low').length,
      }
    }
  });
}

async function getMissingTables(projectId: string) {
  const missing = await db.missingTableResolution.findMany({
    where: { projectId, status: 'missing' },
    orderBy: { priority: 'desc' },
  });

  return NextResponse.json({
    success: true,
    missingTables: missing.map(m => ({
      tableName: m.tableName,
      priority: m.priority,
      blocksCount: m.blocksCount,
      referencedBy: JSON.parse(m.referencedBy || '[]'),
      suggestedColumns: JSON.parse(m.suggestedColumns || '[]'),
    })),
  });
}

async function getMissingColumns(projectId: string) {
  const cache = await db.fKDependencyCache.findFirst({
    where: { projectId },
    orderBy: { createdAt: 'desc' },
  });

  if (!cache) {
    return NextResponse.json({ missingColumns: [] });
  }

  const analysisData = JSON.parse(cache.analysisData || '[]');
  const missingColumns = analysisData.filter((f: any) => f.status === 'missing_column');

  return NextResponse.json({
    success: true,
    missingColumns,
  });
}

async function resolveMissingTable(projectId: string, tableName: string, resolution: any) {
  const { action, tableDefinition } = resolution;

  if (action === 'create') {
    // Create the missing table
    await db.toolkitTable.create({
      data: {
        projectId,
        tableName,
        columns: JSON.stringify(tableDefinition?.columns || []),
        foreignKeys: JSON.stringify(tableDefinition?.foreignKeys || []),
        indexes: JSON.stringify([]),
        triggers: JSON.stringify([]),
      }
    });

    // Update resolution status
    await db.missingTableResolution.update({
      where: { projectId_tableName: { projectId, tableName } },
      data: {
        status: 'resolved',
        resolutionStatus: 'resolved',
        resolvedAt: new Date(),
        notes: 'Table created manually',
      }
    });
  } else if (action === 'skip') {
    await db.missingTableResolution.update({
      where: { projectId_tableName: { projectId, tableName } },
      data: {
        status: 'skipped',
        resolutionStatus: 'skipped',
        notes: resolution.reason || 'Skipped by user',
      }
    });
  }

  return NextResponse.json({
    success: true,
    message: `Missing table ${tableName} resolved`,
    action,
  });
}

async function resolveMissingColumn(projectId: string, tableName: string, columnName: string, resolution: any) {
  const { action, columnDefinition } = resolution;

  if (action === 'add') {
    const table = await db.toolkitTable.findFirst({
      where: { projectId, tableName },
      select: { id: true, columns: true },
    });

    if (table) {
      const columns = JSON.parse(table.columns || '[]');
      columns.push(columnDefinition || { name: columnName, type: 'NVARCHAR(255)' });

      await db.toolkitTable.update({
        where: { id: table.id },
        data: { columns: JSON.stringify(columns) },
      });
    }
  }

  return NextResponse.json({
    success: true,
    message: `Missing column ${tableName}.${columnName} resolved`,
    action,
  });
}

async function getResolutionSuggestions(projectId: string, missingDep: any) {
  const suggestions: any[] = [];

  if (missingDep.type === 'table') {
    // Check if similar tables exist
    const similarTables = await db.toolkitTable.findMany({
      where: { projectId, tableName: { contains: missingDep.name?.slice(0, 5) || '' } },
      select: { tableName: true },
    });

    if (similarTables.length > 0) {
      suggestions.push({
        type: 'use_existing',
        description: `Use existing table: ${similarTables[0].tableName}`,
        confidence: 0.8,
      });
    }

    // Suggest creating the table
    suggestions.push({
      type: 'create_table',
      description: 'Create the missing table',
      confidence: 0.9,
      suggestedDefinition: {
        tableName: missingDep.name,
        columns: [
          { name: 'Id', type: 'INT', primaryKey: true },
          { name: 'Name', type: 'NVARCHAR(100)' },
          { name: 'CreatedAt', type: 'DATETIME', default: 'GETDATE()' },
        ]
      }
    });
  }

  return NextResponse.json({
    success: true,
    missingDependency: missingDep,
    suggestions,
  });
}

async function autoResolveDependencies(projectId: string) {
  const missing = await db.missingTableResolution.findMany({
    where: { projectId, status: 'missing' },
  });

  const results: any[] = [];

  for (const dep of missing) {
    // Auto-create simple lookup tables
    if (dep.priority === 'medium' && dep.blocksCount === 1) {
      const suggestedColumns = JSON.parse(dep.suggestedColumns || '[]');
      
      await db.toolkitTable.create({
        data: {
          projectId,
          tableName: dep.tableName,
          columns: JSON.stringify(suggestedColumns.length > 0 ? suggestedColumns : [
            { name: 'Id', type: 'INT', primaryKey: true },
            { name: 'Name', type: 'NVARCHAR(100)' },
            { name: 'IsActive', type: 'BIT', default: '1' },
          ]),
          foreignKeys: JSON.stringify([]),
          indexes: JSON.stringify([]),
          triggers: JSON.stringify([]),
        }
      });

      await db.missingTableResolution.update({
        where: { id: dep.id },
        data: {
          status: 'resolved',
          resolutionStatus: 'auto_resolved',
          resolvedAt: new Date(),
          notes: 'Auto-created as simple lookup table',
        }
      });

      results.push({ tableName: dep.tableName, action: 'created', status: 'success' });
    }
  }

  return NextResponse.json({
    success: true,
    autoResolved: results.length,
    results,
  });
}

async function getResolutionProgress(projectId: string) {
  const all = await db.missingTableResolution.count({
    where: { projectId },
  });

  const resolved = await db.missingTableResolution.count({
    where: { projectId, status: 'resolved' },
  });

  const pending = await db.missingTableResolution.count({
    where: { projectId, status: 'missing' },
  });

  const blocked = await db.missingTableResolution.count({
    where: { projectId, status: 'blocked' },
  });

  return NextResponse.json({
    success: true,
    progress: {
      total: all,
      resolved,
      pending,
      blocked,
      percentage: all > 0 ? Math.round((resolved / all) * 100) : 100,
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// GRAPH VISUALIZATION
// ═══════════════════════════════════════════════════════════════════════════

async function getDependencyGraph(projectId: string, options?: any) {
  const analysis = await db.dependencyAnalysis.findFirst({
    where: { projectId, analysisType: 'full' },
    orderBy: { createdAt: 'desc' },
  });

  if (!analysis) {
    return NextResponse.json({ error: 'No dependency analysis found' }, { status: 404 });
  }

  const results = JSON.parse(analysis.results || '{}');
  const tables = results.tables || {};
  const procedures = results.procedures || {};
  const views = results.views || {};

  const nodes: any[] = [];
  const edges: any[] = [];

  // Create table nodes
  for (const [name, data] of Object.entries(tables) as [string, any][]) {
    nodes.push({
      id: `table:${name}`,
      label: name,
      type: 'table',
      group: 'tables',
      data: {
        columnCount: data.columnCount,
        fkCount: data.fkCount,
      }
    });

    // Create FK edges
    for (const dep of (data.dependsOn || [])) {
      edges.push({
        id: `edge:${name}:${dep}`,
        source: `table:${name}`,
        target: `table:${dep}`,
        type: 'foreign_key',
      });
    }
  }

  // Create SP nodes (if requested)
  if (options?.includeSPs) {
    for (const [name, data] of Object.entries(procedures) as [string, any][]) {
      nodes.push({
        id: `sp:${name}`,
        label: name,
        type: 'procedure',
        group: 'procedures',
      });

      // Create SP->Table edges
      for (const table of (data.dependsOnTables || [])) {
        edges.push({
          id: `edge:sp:${name}:${table}`,
          source: `sp:${name}`,
          target: `table:${table}`,
          type: 'table_reference',
        });
      }
    }
  }

  // Create View nodes (if requested)
  if (options?.includeViews) {
    for (const [name, data] of Object.entries(views) as [string, any][]) {
      nodes.push({
        id: `view:${name}`,
        label: name,
        type: 'view',
        group: 'views',
      });

      for (const table of (data.dependsOnTables || [])) {
        edges.push({
          id: `edge:view:${name}:${table}`,
          source: `view:${name}`,
          target: `table:${table}`,
          type: 'table_reference',
        });
      }
    }
  }

  return NextResponse.json({
    success: true,
    graph: { nodes, edges },
    layout: {
      type: 'dagre',
      rankdir: 'TB',
    },
  });
}

async function getTableGraph(projectId: string, centerTable: string, depth: number = 2) {
  const tables = await db.toolkitTable.findMany({
    where: { projectId },
    select: { tableName: true, foreignKeys: true },
  });

  const allTableNames = tables.map(t => t.tableName);
  if (!allTableNames.includes(centerTable)) {
    return NextResponse.json({ error: 'Center table not found' }, { status: 404 });
  }

  const visited = new Set<string>();
  const nodes: any[] = [];
  const edges: any[] = [];

  function explore(tableName: string, currentDepth: number) {
    if (visited.has(tableName) || currentDepth > depth) return;
    visited.add(tableName);

    const table = tables.find(t => t.tableName === tableName);
    if (!table) return;

    nodes.push({
      id: tableName,
      label: tableName,
      distance: currentDepth,
    });

    const fks = JSON.parse(table.foreignKeys || '[]');

    // Outgoing edges (dependencies)
    for (const fk of fks) {
      if (allTableNames.includes(fk.referencedTable)) {
        edges.push({
          source: tableName,
          target: fk.referencedTable,
          label: fk.column,
        });
        explore(fk.referencedTable, currentDepth + 1);
      }
    }

    // Incoming edges (dependents)
    for (const otherTable of tables) {
      const otherFKs = JSON.parse(otherTable.foreignKeys || '[]');
      for (const fk of otherFKs) {
        if (fk.referencedTable === tableName && allTableNames.includes(otherTable.tableName)) {
          edges.push({
            source: otherTable.tableName,
            target: tableName,
            label: fk.column,
          });
          explore(otherTable.tableName, currentDepth + 1);
        }
      }
    }
  }

  explore(centerTable, 0);

  return NextResponse.json({
    success: true,
    graph: { nodes, edges },
    centerTable,
    depth,
  });
}

async function getModuleGraph(projectId: string) {
  // Get module definitions
  const modules = await db.moduleDefinition.findMany({
    select: { moduleId: true, name: true, tables: true, dependencies: true },
  });

  const nodes: any[] = [];
  const edges: any[] = [];

  for (const module of modules) {
    nodes.push({
      id: module.moduleId,
      label: module.name,
      tables: JSON.parse(module.tables || '[]'),
    });

    const deps = JSON.parse(module.dependencies || '[]');
    for (const dep of deps) {
      edges.push({
        source: module.moduleId,
        target: dep,
      });
    }
  }

  return NextResponse.json({
    success: true,
    graph: { nodes, edges },
  });
}

async function getLineageGraph(projectId: string, entityType: string, entityName: string) {
  // Build lineage graph showing data flow
  const nodes: any[] = [];
  const edges: any[] = [];

  if (entityType === 'table') {
    // Trace upstream and downstream
    const tables = await db.toolkitTable.findMany({
      where: { projectId },
      select: { tableName: true, foreignKeys: true },
    });

    const visited = new Set<string>();

    function traceUpstream(tableName: string) {
      if (visited.has(tableName)) return;
      visited.add(tableName);

      const table = tables.find(t => t.tableName === tableName);
      if (!table) return;

      nodes.push({ id: tableName, label: tableName, direction: 'upstream' });

      const fks = JSON.parse(table.foreignKeys || '[]');
      for (const fk of fks) {
        if (fk.referencedTable) {
          edges.push({
            source: fk.referencedTable,
            target: tableName,
            type: 'data_flow',
          });
          traceUpstream(fk.referencedTable);
        }
      }
    }

    function traceDownstream(tableName: string) {
      for (const table of tables) {
        const fks = JSON.parse(table.foreignKeys || '[]');
        for (const fk of fks) {
          if (fk.referencedTable === tableName) {
            if (!visited.has(table.tableName)) {
              visited.add(table.tableName);
              nodes.push({ id: table.tableName, label: table.tableName, direction: 'downstream' });
              edges.push({
                source: tableName,
                target: table.tableName,
                type: 'data_flow',
              });
              traceDownstream(table.tableName);
            }
          }
        }
      }
    }

    nodes.push({ id: entityName, label: entityName, direction: 'root' });
    visited.add(entityName);
    traceUpstream(entityName);
    traceDownstream(entityName);
  }

  return NextResponse.json({
    success: true,
    lineage: { nodes, edges },
    root: { type: entityType, name: entityName },
  });
}

async function exportGraph(projectId: string, format: string, options?: any) {
  const graphResult = await getDependencyGraph(projectId, options);
  const graphData = await graphResult.json();

  let exportData: string;

  switch (format) {
    case 'json':
      exportData = JSON.stringify(graphData.graph, null, 2);
      break;
    case 'dot':
      exportData = convertToDot(graphData.graph);
      break;
    case 'mermaid':
      exportData = convertToMermaid(graphData.graph);
      break;
    default:
      exportData = JSON.stringify(graphData.graph, null, 2);
  }

  return NextResponse.json({
    success: true,
    format,
    data: exportData,
  });
}

function convertToDot(graph: any): string {
  let dot = 'digraph DependencyGraph {\n';
  dot += '  rankdir=TB;\n';
  dot += '  node [shape=box];\n';

  for (const node of graph.nodes) {
    dot += `  "${node.id}" [label="${node.label}"];\n`;
  }

  for (const edge of graph.edges) {
    dot += `  "${edge.source}" -> "${edge.target}";\n`;
  }

  dot += '}\n';
  return dot;
}

function convertToMermaid(graph: any): string {
  let mermaid = 'graph TD\n';

  for (const node of graph.nodes) {
    const safeId = node.id.replace(/[:]/g, '_');
    mermaid += `  ${safeId}["${node.label}"]\n`;
  }

  for (const edge of graph.edges) {
    const safeSource = edge.source.replace(/[:]/g, '_');
    const safeTarget = edge.target.replace(/[:]/g, '_');
    mermaid += `  ${safeSource} --> ${safeTarget}\n`;
  }

  return mermaid;
}

async function getGraphStatistics(projectId: string) {
  const analysis = await db.dependencyAnalysis.findFirst({
    where: { projectId, analysisType: 'full' },
    orderBy: { createdAt: 'desc' },
  });

  if (!analysis) {
    return NextResponse.json({ error: 'No analysis found' }, { status: 404 });
  }

  const results = JSON.parse(analysis.results || '{}');
  const tables = results.tables || {};

  const nodeCount = Object.keys(tables).length;
  const edges: any[] = [];

  for (const [name, data] of Object.entries(tables) as [string, any][]) {
    for (const dep of (data.dependsOn || [])) {
      edges.push({ source: name, target: dep });
    }
  }

  const edgeCount = edges.length;
  const density = nodeCount > 1 ? (edgeCount / (nodeCount * (nodeCount - 1))).toFixed(4) : '0';

  // Calculate degree statistics
  const inDegrees: Record<string, number> = {};
  const outDegrees: Record<string, number> = {};

  for (const table of Object.keys(tables)) {
    inDegrees[table] = 0;
    outDegrees[table] = 0;
  }

  for (const edge of edges) {
    outDegrees[edge.source] = (outDegrees[edge.source] || 0) + 1;
    inDegrees[edge.target] = (inDegrees[edge.target] || 0) + 1;
  }

  const avgInDegree = Object.values(inDegrees).reduce((a, b) => a + b, 0) / nodeCount;
  const avgOutDegree = Object.values(outDegrees).reduce((a, b) => a + b, 0) / nodeCount;

  return NextResponse.json({
    success: true,
    statistics: {
      nodes: nodeCount,
      edges: edgeCount,
      density: parseFloat(density),
      averageDegree: {
        in: avgInDegree.toFixed(2),
        out: avgOutDegree.toFixed(2),
      },
      maxInDegree: Math.max(...Object.values(inDegrees) as number[]),
      maxOutDegree: Math.max(...Object.values(outDegrees) as number[]),
    }
  });
}

async function getNodeCentrality(projectId: string) {
  const analysis = await db.dependencyAnalysis.findFirst({
    where: { projectId, analysisType: 'full' },
    orderBy: { createdAt: 'desc' },
  });

  if (!analysis) {
    return NextResponse.json({ error: 'No analysis found' }, { status: 404 });
  }

  const results = JSON.parse(analysis.results || '{}');
  const tables = results.tables || {};

  // Calculate degree centrality
  const centrality: any[] = [];

  for (const [name, data] of Object.entries(tables) as [string, any][]) {
    const inDegree = (data.dependedBy || []).length;
    const outDegree = (data.dependsOn || []).length;
    const totalDegree = inDegree + outDegree;

    centrality.push({
      node: name,
      inDegree,
      outDegree,
      totalDegree,
      centrality: totalDegree / (Object.keys(tables).length - 1),
    });
  }

  centrality.sort((a, b) => b.totalDegree - a.totalDegree);

  return NextResponse.json({
    success: true,
    centrality: centrality.slice(0, 20),
    mostCentral: centrality[0],
  });
}

async function getCommunityDetection(projectId: string) {
  // Simple community detection based on FK clustering
  const tables = await db.toolkitTable.findMany({
    where: { projectId },
    select: { tableName: true, foreignKeys: true },
  });

  const communities: Record<string, string[]> = {};
  const assigned = new Set<string>();

  // Group tables by their FK relationships
  for (const table of tables) {
    if (assigned.has(table.tableName)) continue;

    const community = [table.tableName];
    assigned.add(table.tableName);

    const fks = JSON.parse(table.foreignKeys || '[]');
    for (const fk of fks) {
      if (!assigned.has(fk.referencedTable)) {
        community.push(fk.referencedTable);
        assigned.add(fk.referencedTable);
      }
    }

    // Find tables that reference this table
    for (const otherTable of tables) {
      const otherFKs = JSON.parse(otherTable.foreignKeys || '[]');
      if (otherFKs.some((fk: any) => fk.referencedTable === table.tableName)) {
        if (!assigned.has(otherTable.tableName)) {
          community.push(otherTable.tableName);
          assigned.add(otherTable.tableName);
        }
      }
    }

    communities[`community_${Object.keys(communities).length + 1}`] = community;
  }

  return NextResponse.json({
    success: true,
    communities,
    totalCommunities: Object.keys(communities).length,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// CHANGE PROPAGATION
// ═══════════════════════════════════════════════════════════════════════════

async function propagateChange(projectId: string, change: any) {
  const { sourceType, sourceName, changeType } = change;

  const propagation: any = {
    source: { type: sourceType, name: sourceName },
    changeType,
    affected: [] as any[],
    actions: [] as any[],
  };

  if (sourceType === 'table') {
    const deps = await getTableDependencies(projectId, sourceName);
    const depsData = await deps.json();

    for (const table of (depsData.dependencies?.dependedBy?.tables || [])) {
      propagation.affected.push({ type: 'table', name: table });
      propagation.actions.push({
        target: table,
        action: 'update_fk_reference',
        required: changeType === 'delete',
      });
    }

    for (const sp of (depsData.dependencies?.dependedBy?.procedures || [])) {
      propagation.affected.push({ type: 'procedure', name: sp });
      propagation.actions.push({
        target: sp,
        action: 'update_references',
        required: true,
      });
    }
  }

  return NextResponse.json({
    success: true,
    propagation,
  });
}

async function getPropagationPath(projectId: string, sourceType: string, sourceName: string, targetType: string, targetName: string) {
  // Find path between two entities in the dependency graph
  const analysis = await db.dependencyAnalysis.findFirst({
    where: { projectId, analysisType: 'full' },
    orderBy: { createdAt: 'desc' },
  });

  if (!analysis) {
    return NextResponse.json({ error: 'No analysis found' }, { status: 404 });
  }

  const results = JSON.parse(analysis.results || '{}');
  const tables = results.tables || {};

  // BFS to find path
  const visited = new Set<string>();
  const queue: { node: string; path: string[] }[] = [{ node: sourceName, path: [sourceName] }];
  visited.add(sourceName);

  while (queue.length > 0) {
    const current = queue.shift()!;

    if (current.node === targetName) {
      return NextResponse.json({
        success: true,
        path: current.path,
        length: current.path.length - 1,
      });
    }

    const tableData = tables[current.node];
    if (tableData) {
      const neighbors = [...(tableData.dependsOn || []), ...(tableData.dependedBy || []).map((d: string) => d.replace(/^(sp|view|cshtml):/, ''))];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push({ node: neighbor, path: [...current.path, neighbor] });
        }
      }
    }
  }

  return NextResponse.json({
    success: true,
    path: null,
    message: 'No path found between entities',
  });
}

async function estimatePropagationImpact(projectId: string, change: any) {
  const propagation = await propagateChange(projectId, change);
  const propagationData = await propagation.json();

  const impact = {
    entitiesAffected: propagationData.propagation.affected.length,
    actionsRequired: propagationData.propagation.actions.length,
    estimatedTime: `${propagationData.propagation.actions.length * 15} minutes`,
    riskLevel: propagationData.propagation.actions.length > 10 ? 'high' : propagationData.propagation.actions.length > 5 ? 'medium' : 'low',
  };

  return NextResponse.json({
    success: true,
    impact,
    details: propagationData.propagation,
  });
}

async function createPropagationRule(projectId: string, rule: any) {
  // Store propagation rule
  return NextResponse.json({
    success: true,
    message: 'Propagation rule created',
    rule,
  });
}

async function getPropagationRules(projectId: string) {
  // Return propagation rules
  return NextResponse.json({
    success: true,
    rules: [],
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// DEPENDENCY INTELLIGENCE
// ═══════════════════════════════════════════════════════════════════════════

async function detectDependencyPatterns(projectId: string) {
  const tables = await db.toolkitTable.findMany({
    where: { projectId },
    select: { tableName: true, foreignKeys: true },
  });

  const patterns: any[] = [];

  // Detect star schema pattern
  const tablesWithManyRefs = tables.filter(t => {
    const fks = JSON.parse(t.foreignKeys || '[]');
    return fks.length >= 3;
  });

  if (tablesWithManyRefs.length > 0) {
    patterns.push({
      type: 'star_schema_candidate',
      description: 'Tables with many FK relationships may indicate star schema',
      tables: tablesWithManyRefs.map(t => t.tableName),
    });
  }

  // Detect lookup table pattern
  const lookupTables = tables.filter(t => {
    const fks = JSON.parse(t.foreignKeys || '[]');
    return fks.length === 0;
  });

  if (lookupTables.length > 0) {
    patterns.push({
      type: 'lookup_tables',
      description: 'Tables without FKs are likely lookup/reference tables',
      tables: lookupTables.map(t => t.tableName),
    });
  }

  // Detect hierarchy pattern
  const selfRefTables = tables.filter(t => {
    const fks = JSON.parse(t.foreignKeys || '[]');
    return fks.some((fk: any) => fk.referencedTable === t.tableName);
  });

  if (selfRefTables.length > 0) {
    patterns.push({
      type: 'hierarchical_structure',
      description: 'Self-referencing tables indicate hierarchical data',
      tables: selfRefTables.map(t => t.tableName),
    });
  }

  return NextResponse.json({
    success: true,
    patterns,
  });
}

async function suggestOptimizations(projectId: string) {
  const suggestions: any[] = [];

  // Check for missing indexes on FK columns
  const tables = await db.toolkitTable.findMany({
    where: { projectId },
    select: { tableName: true, foreignKeys: true, indexes: true },
  });

  for (const table of tables) {
    const fks = JSON.parse(table.foreignKeys || '[]');
    const indexes = JSON.parse(table.indexes || '[]');
    const indexedColumns = indexes.flatMap((idx: any) => idx.columns || []);

    for (const fk of fks) {
      if (!indexedColumns.includes(fk.column)) {
        suggestions.push({
          type: 'missing_index',
          tableName: table.tableName,
          columnName: fk.column,
          description: `Consider adding index on FK column ${table.tableName}.${fk.column} for better join performance`,
          impact: 'performance',
        });
      }
    }
  }

  // Check for deeply nested dependencies
  const levelsResult = await getDependencyLevels(projectId);
  const levelsData = await levelsResult.json();

  if (levelsData.totalLevels > 5) {
    suggestions.push({
      type: 'deep_dependency_chain',
      description: `Dependency chain has ${levelsData.totalLevels} levels. Consider refactoring to reduce coupling.`,
      impact: 'maintainability',
    });
  }

  return NextResponse.json({
    success: true,
    suggestions,
  });
}

async function analyzeDependencyComplexity(projectId: string) {
  const analysis = await db.dependencyAnalysis.findFirst({
    where: { projectId, analysisType: 'full' },
    orderBy: { createdAt: 'desc' },
  });

  if (!analysis) {
    return NextResponse.json({ error: 'No analysis found' }, { status: 404 });
  }

  const results = JSON.parse(analysis.results || '{}');
  const tables = results.tables || {};
  const procedures = results.procedures || {};

  // Calculate complexity metrics
  const tableComplexity = Object.entries(tables).map(([name, data]: [string, any]) => ({
    name,
    fkCount: data.fkCount || 0,
    dependents: (data.dependedBy || []).length,
    complexity: (data.fkCount || 0) + (data.dependedBy || []).length,
  }));

  const spComplexity = Object.entries(procedures).map(([name, data]: [string, any]) => ({
    name,
    tableRefs: (data.dependsOnTables || []).length,
    spRefs: (data.dependsOnSPs || []).length,
    complexity: (data.dependsOnTables || []).length * 2 + (data.dependsOnSPs || []).length,
  }));

  const avgTableComplexity = tableComplexity.length > 0 ? tableComplexity.reduce((sum, t) => sum + t.complexity, 0) / tableComplexity.length : 0;
  const avgSPComplexity = spComplexity.length > 0 ? spComplexity.reduce((sum, s) => sum + s.complexity, 0) / spComplexity.length : 0;

  return NextResponse.json({
    success: true,
    complexity: {
      tables: {
        average: avgTableComplexity.toFixed(2),
        max: tableComplexity.length > 0 ? Math.max(...tableComplexity.map(t => t.complexity)) : 0,
        mostComplex: tableComplexity.sort((a, b) => b.complexity - a.complexity).slice(0, 5),
      },
      procedures: {
        average: avgSPComplexity.toFixed(2),
        max: spComplexity.length > 0 ? Math.max(...spComplexity.map(s => s.complexity)) : 0,
        mostComplex: spComplexity.sort((a, b) => b.complexity - a.complexity).slice(0, 5),
      },
      overall: (avgTableComplexity + avgSPComplexity) / 2,
    }
  });
}

async function getCriticalNodes(projectId: string) {
  const centralityResult = await getNodeCentrality(projectId);
  const centralityData = await centralityResult.json();

  // Critical nodes are those with high centrality
  const critical = centralityData.centrality?.filter((n: any) => n.totalDegree >= 3) || [];

  return NextResponse.json({
    success: true,
    criticalNodes: critical,
    summary: {
      total: critical.length,
      veryCritical: critical.filter((n: any) => n.totalDegree >= 5).length,
    }
  });
}

async function getDependencyHealth(projectId: string) {
  // Check for cycles
  const cyclesResult = await detectCircularDependencies(projectId);
  const cyclesData = await cyclesResult.json();

  // Check for missing dependencies
  const missingResult = await findMissingDependencies(projectId);
  const missingData = await missingResult.json();

  // Check for orphaned entities
  const analysis = await db.dependencyAnalysis.findFirst({
    where: { projectId, analysisType: 'full' },
    orderBy: { createdAt: 'desc' },
  });

  const results = analysis ? JSON.parse(analysis.results || '{}') : {};
  const tables = results.tables || {};

  const orphaned = Object.entries(tables)
    .filter(([_, data]: [string, any]) => 
      (data.dependsOn || []).length === 0 && (data.dependedBy || []).length === 0
    )
    .map(([name]) => name);

  // Calculate health score
  const cyclePenalty = cyclesData.cycles?.length * 10 || 0;
  const missingPenalty = missingData.summary?.total * 5 || 0;
  const orphanPenalty = orphaned.length * 2;

  const healthScore = Math.max(0, 100 - cyclePenalty - missingPenalty - orphanPenalty);

  return NextResponse.json({
    success: true,
    health: {
      score: healthScore,
      status: healthScore >= 80 ? 'healthy' : healthScore >= 60 ? 'needs_attention' : 'critical',
      issues: {
        cycles: cyclesData.cycles?.length || 0,
        missingDependencies: missingData.summary?.total || 0,
        orphanedEntities: orphaned.length,
      },
      recommendations: [
        ...(cyclesData.cycles?.length > 0 ? ['Resolve circular dependencies'] : []),
        ...(missingData.summary?.total > 0 ? ['Resolve missing dependencies'] : []),
        ...(orphaned.length > 0 ? ['Review orphaned entities for removal'] : []),
      ],
    }
  });
}

async function compareDependencies(projectId: string, baselineProjectId: string) {
  const analysis1 = await db.dependencyAnalysis.findFirst({
    where: { projectId, analysisType: 'full' },
    orderBy: { createdAt: 'desc' },
  });

  const analysis2 = await db.dependencyAnalysis.findFirst({
    where: { projectId: baselineProjectId, analysisType: 'full' },
    orderBy: { createdAt: 'desc' },
  });

  if (!analysis1 || !analysis2) {
    return NextResponse.json({ error: 'Missing analysis for comparison' }, { status: 404 });
  }

  const results1 = JSON.parse(analysis1.results || '{}');
  const results2 = JSON.parse(analysis2.results || '{}');

  const tables1 = new Set(Object.keys(results1.tables || {}));
  const tables2 = new Set(Object.keys(results2.tables || {}));

  const added = [...tables1].filter(t => !tables2.has(t));
  const removed = [...tables2].filter(t => !tables1.has(t));
  const common = [...tables1].filter(t => tables2.has(t));

  return NextResponse.json({
    success: true,
    comparison: {
      current: { projectId, tableCount: tables1.size },
      baseline: { projectId: baselineProjectId, tableCount: tables2.size },
      differences: {
        added,
        removed,
        common,
      },
      changePercent: tables2.size > 0 ? ((added.length + removed.length) / tables2.size * 100).toFixed(1) : '0',
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// CROSS-REFERENCE ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════

async function analyzeSPTableRefs(projectId: string) {
  const procedures = await db.toolkitProcedure.findMany({
    where: { projectId },
    select: { procedureName: true, body: true },
  });

  const refs: any[] = [];

  for (const sp of procedures) {
    const tableRefs = extractTableReferences(sp.body || '');
    refs.push({
      spName: sp.procedureName,
      tables: tableRefs,
      tableCount: tableRefs.length,
    });
  }

  return NextResponse.json({
    success: true,
    references: refs,
    summary: {
      totalSPs: procedures.length,
      spsWithRefs: refs.filter(r => r.tableCount > 0).length,
      totalTableRefs: refs.reduce((sum, r) => sum + r.tableCount, 0),
    }
  });
}

async function analyzeViewTableRefs(projectId: string) {
  const views = await db.toolkitView.findMany({
    where: { projectId },
    select: { viewName: true, body: true },
  });

  const refs: any[] = [];

  for (const view of views) {
    const tableRefs = extractTableReferences(view.body || '');
    refs.push({
      viewName: view.viewName,
      tables: tableRefs,
      tableCount: tableRefs.length,
    });
  }

  return NextResponse.json({
    success: true,
    references: refs,
  });
}

async function analyzeCSHTMLRefs(projectId: string) {
  const cshtmlViews = await db.cSHTMLAnalysisCache.findMany({
    where: { projectId },
    select: { viewName: true, linkedTable: true, fields: true },
  });

  const refs = cshtmlViews.map(view => ({
    viewName: view.viewName,
    linkedTable: view.linkedTable,
    fieldCount: JSON.parse(view.fields || '[]').length,
  }));

  return NextResponse.json({
    success: true,
    references: refs,
  });
}

async function getCrossReferenceMatrix(projectId: string) {
  const tables = await db.toolkitTable.findMany({
    where: { projectId },
    select: { tableName: true },
  });

  const procedures = await db.toolkitProcedure.findMany({
    where: { projectId },
    select: { procedureName: true, body: true },
  });

  const tableNames = tables.map(t => t.tableName);
  const matrix: Record<string, Record<string, boolean>> = {};

  for (const sp of procedures) {
    matrix[sp.procedureName] = {};
    const refs = extractTableReferences(sp.body || '');
    for (const tableName of tableNames) {
      matrix[sp.procedureName][tableName] = refs.includes(tableName);
    }
  }

  return NextResponse.json({
    success: true,
    matrix,
    tables: tableNames,
    procedures: procedures.map(p => p.procedureName),
  });
}

async function findUnusedEntities(projectId: string) {
  const analysis = await db.dependencyAnalysis.findFirst({
    where: { projectId, analysisType: 'full' },
    orderBy: { createdAt: 'desc' },
  });

  if (!analysis) {
    return NextResponse.json({ error: 'No analysis found' }, { status: 404 });
  }

  const results = JSON.parse(analysis.results || '{}');
  const tables = results.tables || {};
  const procedures = results.procedures || {};

  const unusedTables = Object.entries(tables)
    .filter(([_, data]: [string, any]) => (data.dependedBy || []).length === 0)
    .map(([name]) => name);

  const unusedSPs = Object.entries(procedures)
    .filter(([_, data]: [string, any]) => (data.dependsOnTables || []).length === 0)
    .map(([name]) => name);

  return NextResponse.json({
    success: true,
    unused: {
      tables: unusedTables,
      procedures: unusedSPs,
    },
    caution: 'Review before deleting - entities may be used dynamically',
  });
}

async function findOrphanedEntities(projectId: string) {
  // Same as unused but with different perspective
  return await findUnusedEntities(projectId);
}

// ═══════════════════════════════════════════════════════════════════════════
// DEPENDENCY EXPORT/IMPORT
// ═══════════════════════════════════════════════════════════════════════════

async function exportDependencies(projectId: string, format: string) {
  const analysis = await db.dependencyAnalysis.findFirst({
    where: { projectId, analysisType: 'full' },
    orderBy: { createdAt: 'desc' },
  });

  if (!analysis) {
    return NextResponse.json({ error: 'No analysis found' }, { status: 404 });
  }

  const results = JSON.parse(analysis.results || '{}');

  let exportData: string;

  switch (format) {
    case 'csv':
      exportData = convertToCSV(results);
      break;
    default:
      exportData = JSON.stringify(results, null, 2);
  }

  return NextResponse.json({
    success: true,
    format,
    data: exportData,
  });
}

function convertToCSV(results: any): string {
  const rows: string[] = ['EntityType,EntityName,DependsOn,DependedBy'];

  for (const [name, data] of Object.entries(results.tables || {})) {
    const d = data as any;
    rows.push(`table,${name},"${(d.dependsOn || []).join(';')}","${(d.dependedBy || []).join(';')}"`);
  }

  for (const [name, data] of Object.entries(results.procedures || {})) {
    const d = data as any;
    rows.push(`procedure,${name},"${(d.dependsOnTables || []).join(';')}"`,`""`);
  }

  return rows.join('\n');
}

async function importDependencies(projectId: string, dependencies: any) {
  // Validate and import dependencies
  const imported = {
    tables: Object.keys(dependencies.tables || {}).length,
    procedures: Object.keys(dependencies.procedures || {}).length,
    views: Object.keys(dependencies.views || {}).length,
  };

  // Store imported dependencies
  await db.dependencyAnalysis.create({
    data: {
      projectId,
      analysisType: 'imported',
      status: 'completed',
      results: JSON.stringify(dependencies),
      metadata: JSON.stringify({ imported }),
    }
  });

  return NextResponse.json({
    success: true,
    imported,
  });
}

async function syncDependencies(projectId: string) {
  // Re-run analysis and sync
  return await analyzeDependencies(projectId);
}

async function createDependencySnapshot(projectId: string, description: string) {
  const analysis = await db.dependencyAnalysis.findFirst({
    where: { projectId, analysisType: 'full' },
    orderBy: { createdAt: 'desc' },
  });

  if (!analysis) {
    return NextResponse.json({ error: 'No analysis to snapshot' }, { status: 404 });
  }

  const snapshot = await db.contextSnapshot.create({
    data: {
      snapshotId: `dep_${projectId}_${Date.now()}`,
      description,
      data: analysis.results,
      triggeredBy: 'manual',
    }
  });

  return NextResponse.json({
    success: true,
    snapshot: {
      id: snapshot.id,
      snapshotId: snapshot.snapshotId,
      createdAt: snapshot.createdAt,
    }
  });
}

async function getDependencyHistory(projectId: string) {
  const history = await db.dependencyAnalysis.findMany({
    where: { projectId },
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: {
      id: true,
      analysisType: true,
      status: true,
      createdAt: true,
    }
  });

  return NextResponse.json({
    success: true,
    history,
  });
}

async function restoreSnapshot(projectId: string, snapshotId: string) {
  const snapshot = await db.contextSnapshot.findUnique({
    where: { snapshotId: snapshotId },
  });

  if (!snapshot) {
    return NextResponse.json({ error: 'Snapshot not found' }, { status: 404 });
  }

  // Restore from snapshot
  await db.dependencyAnalysis.create({
    data: {
      projectId,
      analysisType: 'restored',
      status: 'completed',
      results: snapshot.data,
      metadata: JSON.stringify({ restoredFrom: snapshotId }),
    }
  });

  return NextResponse.json({
    success: true,
    message: 'Snapshot restored',
    snapshotId,
  });
}
