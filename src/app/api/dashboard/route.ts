// =============================================================================
// UNIFIED REAL-TIME DASHBOARD API
// =============================================================================
// Aggregates data from all parser cache tables for real-time dashboard display
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// =============================================================================
// GET /api/dashboard - Get Real-Time Dashboard Data
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const action = searchParams.get('action') || 'summary';

    // Get or create default project
    let targetProjectId = projectId;
    if (!targetProjectId) {
      const defaultProject = await db.toolkitProject.findFirst({
        where: { name: 'Default Project' }
      });
      if (defaultProject) {
        targetProjectId = defaultProject.id;
      } else {
        const anyProject = await db.toolkitProject.findFirst();
        if (anyProject) {
          targetProjectId = anyProject.id;
        }
      }
    }

    switch (action) {
      case 'summary':
        return await getDashboardSummary(targetProjectId);
      
      case 'parser-stats':
        return await getParserStats(targetProjectId);
      
      case 'table-intelligence':
        return await getTableIntelligence(targetProjectId);
      
      case 'sp-intelligence':
        return await getSPIntelligence(targetProjectId);
      
      case 'cshtml-intelligence':
        return await getCSHTMLIntelligence(targetProjectId);
      
      case 'js-intelligence':
        return await getJSIntelligence(targetProjectId);
      
      case 'fk-resolution':
        return await getFKResolutionData(targetProjectId);
      
      case 'compliance':
        return await getComplianceData(targetProjectId);
      
      case 'modules':
        return await getModuleData(targetProjectId);
      
      case 'activity':
        return await getActivityData(targetProjectId);
      
      case 'files':
        return await getFilesData(targetProjectId);
      
      case 'all':
        return await getAllData(targetProjectId);
      
      default:
        return await getDashboardSummary(targetProjectId);
    }
  } catch (error) {
    console.error('Dashboard API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// =============================================================================
// DASHBOARD SUMMARY
// =============================================================================

async function getDashboardSummary(projectId: string | null | undefined) {
  if (!projectId) {
    return NextResponse.json({
      success: true,
      hasProject: false,
      summary: getEmptySummary(),
    });
  }

  // Run all count queries in parallel for performance
  const [
    tables,
    procedures,
    cshtmlViews,
    jsFiles,
    discoveredTables,
    classifiedFiles,
    toolkitFiles,
    fkDependencyCaches,
    qualityMetrics,
  ] = await Promise.all([
    // Tables
    db.toolkitTable.findMany({
      where: { projectId },
      select: { 
        id: true, 
        tableName: true, 
        columns: true, 
        foreignKeys: true,
        linkedModule: true,
      },
    }),
    // Stored Procedures
    db.storedProcedureCache.findMany({
      where: { projectId },
      select: {
        id: true,
        procedureName: true,
        actionType: true,
        moduleName: true,
        complexity: true,
        riskLevel: true,
        tablesReferenced: true,
        businessRules: true,
      },
    }),
    // CSHTML Views
    db.cSHTMLAnalysisCache.findMany({
      where: { projectId },
      select: {
        id: true,
        viewName: true,
        viewType: true,
        linkedTable: true,
        fields: true,
      },
    }),
    // JS Files
    db.jSIntelligenceCache.findMany({
      where: { projectId },
      select: {
        id: true,
        fileName: true,
        ajaxCalls: true,
        eventHandlers: true,
        discoveredEndpoints: true,
        complexity: true,
      },
    }),
    // Discovered Tables (from SPs)
    db.discoveredTableCache.findMany({
      where: { projectId },
      select: { tableName: true, isResolved: true, priority: true },
    }),
    // File Classifications
    db.fileClassificationCache.findMany({
      where: { projectId },
      select: { fileType: true, language: true, confidence: true },
    }),
    // Toolkit Files
    db.toolkitFile.findMany({
      where: { projectId },
      select: { 
        id: true, 
        fileName: true, 
        fileType: true, 
        tablesFound: true, 
        proceduresFound: true,
        parseStatus: true,
        createdAt: true,
      },
    }),
    // FK Dependencies
    db.fKDependencyCache.findMany({
      where: { projectId },
      select: { tableName: true, totalFKs: true, resolvedFKs: true, missingTables: true },
    }),
    // Quality Metrics
    db.qualityMetrics.findUnique({
      where: { projectId },
    }),
  ]);

  // Calculate statistics
  const totalTables = tables.length;
  const totalColumns = tables.reduce((sum, t) => {
    try {
      const cols = JSON.parse(t.columns || '[]');
      return sum + cols.length;
    } catch {
      return sum;
    }
  }, 0);

  const totalFKs = tables.reduce((sum, t) => {
    try {
      const fks = JSON.parse(t.foreignKeys || '[]');
      return sum + fks.length;
    } catch {
      return sum;
    }
  }, 0);

  // Calculate FK resolution
  const fkStats = calculateFKResolution(tables, discoveredTables);

  // Calculate SP statistics
  const spStats = {
    total: procedures.length,
    byActionType: {} as Record<string, number>,
    byModule: {} as Record<string, number>,
    highRisk: procedures.filter(p => p.riskLevel === 'high' || p.riskLevel === 'critical').length,
    avgComplexity: procedures.length > 0 
      ? Math.round(procedures.reduce((sum, p) => sum + (p.complexity || 0), 0) / procedures.length) 
      : 0,
  };

  procedures.forEach(p => {
    spStats.byActionType[p.actionType || 'unknown'] = (spStats.byActionType[p.actionType || 'unknown'] || 0) + 1;
    if (p.moduleName) {
      spStats.byModule[p.moduleName] = (spStats.byModule[p.moduleName] || 0) + 1;
    }
  });

  // Calculate CSHTML statistics
  const cshtmlStats = {
    total: cshtmlViews.length,
    byViewType: {} as Record<string, number>,
    totalFields: cshtmlViews.reduce((sum, v) => {
      try {
        const fields = JSON.parse(v.fields || '[]');
        return sum + fields.length;
      } catch {
        return sum;
      }
    }, 0),
    linkedToTables: cshtmlViews.filter(v => v.linkedTable).length,
  };

  cshtmlViews.forEach(v => {
    cshtmlStats.byViewType[v.viewType || 'unknown'] = (cshtmlStats.byViewType[v.viewType || 'unknown'] || 0) + 1;
  });

  // Calculate JS statistics
  const jsStats = {
    total: jsFiles.length,
    totalAjaxCalls: jsFiles.reduce((sum, j) => {
      try {
        const calls = JSON.parse(j.ajaxCalls || '[]');
        return sum + calls.length;
      } catch {
        return sum;
      }
    }, 0),
    totalEventHandlers: jsFiles.reduce((sum, j) => {
      try {
        const handlers = JSON.parse(j.eventHandlers || '[]');
        return sum + handlers.length;
      } catch {
        return sum;
      }
    }, 0),
    totalEndpoints: jsFiles.reduce((sum, j) => {
      try {
        const endpoints = JSON.parse(j.discoveredEndpoints || '[]');
        return sum + endpoints.length;
      } catch {
        return sum;
      }
    }, 0),
    avgComplexity: jsFiles.length > 0
      ? Math.round(jsFiles.reduce((sum, j) => sum + (j.complexity || 0), 0) / jsFiles.length)
      : 0,
  };

  // Calculate module coverage
  const moduleStats = calculateModuleCoverage(tables);

  // File statistics
  const fileStats = {
    total: toolkitFiles.length,
    byType: {} as Record<string, number>,
    parsed: toolkitFiles.filter(f => f.parseStatus === 'parsed').length,
    pending: toolkitFiles.filter(f => f.parseStatus === 'pending').length,
    failed: toolkitFiles.filter(f => f.parseStatus === 'failed').length,
  };

  toolkitFiles.forEach(f => {
    fileStats.byType[f.fileType || 'unknown'] = (fileStats.byType[f.fileType || 'unknown'] || 0) + 1;
  });

  // Classification statistics
  const classificationStats = {
    total: classifiedFiles.length,
    byFileType: {} as Record<string, number>,
    byLanguage: {} as Record<string, number>,
    avgConfidence: classifiedFiles.length > 0
      ? Math.round(classifiedFiles.reduce((sum, c) => sum + (c.confidence || 0), 0) / classifiedFiles.length)
      : 0,
  };

  classifiedFiles.forEach(c => {
    classificationStats.byFileType[c.fileType || 'unknown'] = (classificationStats.byFileType[c.fileType || 'unknown'] || 0) + 1;
    classificationStats.byLanguage[c.language || 'unknown'] = (classificationStats.byLanguage[c.language || 'unknown'] || 0) + 1;
  });

  // Calculate health score
  const healthScore = calculateHealthScore({
    totalTables,
    totalFKs,
    fkResolved: fkStats.resolved,
    fkTotal: fkStats.total,
    modulesLinked: moduleStats.linked,
    modulesTotal: moduleStats.total,
    spsAnalyzed: procedures.length,
    viewsAnalyzed: cshtmlViews.length,
    qualityScore: qualityMetrics?.qualityScore,
  });

  return NextResponse.json({
    success: true,
    hasProject: true,
    projectId,
    summary: {
      healthScore,
      totalTables,
      totalColumns,
      totalFKs,
      totalSPs: procedures.length,
      totalViews: cshtmlViews.length,
      totalFiles: toolkitFiles.length,
    },
    fkResolution: {
      total: fkStats.total,
      resolved: fkStats.resolved,
      percent: fkStats.percent,
      missing: fkStats.missing,
    },
    spStats,
    cshtmlStats,
    jsStats,
    moduleStats,
    fileStats,
    classificationStats,
    discoveredTables: {
      total: discoveredTables.length,
      resolved: discoveredTables.filter(d => d.isResolved).length,
      highPriority: discoveredTables.filter(d => d.priority === 'high').length,
    },
    quality: qualityMetrics || null,
    lastUpdated: new Date().toISOString(),
  });
}

// =============================================================================
// PARSER STATISTICS
// =============================================================================

async function getParserStats(projectId: string | null | undefined) {
  if (!projectId) {
    return NextResponse.json({ success: true, stats: {} });
  }

  const [jsIntelligence, spIntelligence, cshtmlIntelligence, fileClassifications] = await Promise.all([
    db.jSIntelligenceCache.findMany({ where: { projectId } }),
    db.storedProcedureCache.findMany({ where: { projectId } }),
    db.cSHTMLAnalysisCache.findMany({ where: { projectId } }),
    db.fileClassificationCache.findMany({ where: { projectId } }),
  ]);

  // Aggregate AJAX calls from JS intelligence
  const allAjaxCalls: any[] = [];
  const allEventHandlers: any[] = [];
  const allEndpoints: any[] = [];

  jsIntelligence.forEach(js => {
    try {
      const ajaxCalls = JSON.parse(js.ajaxCalls || '[]');
      const handlers = JSON.parse(js.eventHandlers || '[]');
      const endpoints = JSON.parse(js.discoveredEndpoints || '[]');
      
      ajaxCalls.forEach((call: any) => allAjaxCalls.push({ ...call, sourceFile: js.fileName }));
      handlers.forEach((h: any) => allEventHandlers.push({ ...h, sourceFile: js.fileName }));
      endpoints.forEach((e: any) => allEndpoints.push({ ...e, sourceFile: js.fileName }));
    } catch (e) {
      // Skip parsing errors
    }
  });

  // Aggregate SP data
  const spTablesReferenced = new Set<string>();
  const spBusinessRules: any[] = [];

  spIntelligence.forEach(sp => {
    try {
      const tables = JSON.parse(sp.tablesReferenced || '[]');
      tables.forEach((t: any) => spTablesReferenced.add(typeof t === 'string' ? t : t.tableName || t.name));
      
      const rules = JSON.parse(sp.businessRules || '[]');
      rules.forEach((r: any) => spBusinessRules.push({ ...r, sourceSP: sp.procedureName }));
    } catch (e) {
      // Skip parsing errors
    }
  });

  return NextResponse.json({
    success: true,
    stats: {
      javascript: {
        totalFiles: jsIntelligence.length,
        ajaxCalls: allAjaxCalls,
        eventHandlers: allEventHandlers,
        endpoints: allEndpoints,
        summary: {
          totalAjaxCalls: allAjaxCalls.length,
          totalEventHandlers: allEventHandlers.length,
          totalEndpoints: allEndpoints.length,
          byMethod: groupBy(allAjaxCalls, 'method'),
          byDataType: groupBy(allAjaxCalls, 'dataType'),
        },
      },
      storedProcedures: {
        total: spIntelligence.length,
        tablesReferenced: Array.from(spTablesReferenced),
        businessRules: spBusinessRules,
        byActionType: groupBy(spIntelligence, 'actionType'),
        byModule: groupBy(spIntelligence, 'moduleName'),
        byRiskLevel: groupBy(spIntelligence, 'riskLevel'),
      },
      cshtml: {
        total: cshtmlIntelligence.length,
        byViewType: groupBy(cshtmlIntelligence, 'viewType'),
      },
      classifications: {
        total: fileClassifications.length,
        byFileType: groupBy(fileClassifications, 'fileType'),
        byLanguage: groupBy(fileClassifications, 'language'),
      },
    },
  });
}

// =============================================================================
// TABLE INTELLIGENCE
// =============================================================================

async function getTableIntelligence(projectId: string | null | undefined) {
  if (!projectId) {
    return NextResponse.json({ success: true, tables: [], columns: [] });
  }

  const [tables, columnIntelligence, discoveredTables] = await Promise.all([
    db.toolkitTable.findMany({
      where: { projectId },
      orderBy: { tableName: 'asc' },
    }),
    db.columnIntelligenceCache.findMany(),
    db.discoveredTableCache.findMany({
      where: { projectId },
      orderBy: { priority: 'desc' },
    }),
  ]);

  // Parse JSON fields in tables
  const parsedTables = tables.map(t => ({
    ...t,
    columns: safeParseJSON(t.columns, []),
    foreignKeys: safeParseJSON(t.foreignKeys, []),
    indexes: safeParseJSON(t.indexes, []),
    constraints: safeParseJSON(t.constraints, []),
  }));

  // Flatten columns with table context
  const allColumns: any[] = [];
  parsedTables.forEach((t: any) => {
    const cols = t.columns || [];
    cols.forEach((col: any) => {
      const intel = columnIntelligence.find(
        c => c.tableName === t.tableName && c.columnName === col.name
      );
      allColumns.push({
        tableName: t.tableName,
        columnName: col.name,
        dataType: col.dataType,
        nullable: col.nullable,
        isPrimaryKey: col.isPrimaryKey,
        isIdentity: col.isIdentity,
        defaultValue: col.defaultValue,
        ...intel ? {
          semanticType: intel.semanticType,
          uiType: intel.uiType,
          sensitivity: intel.sensitivity,
          confidence: intel.confidence,
          isSearchable: intel.isSearchable,
          isFilterable: intel.isFilterable,
          displayInList: intel.displayInList,
        } : {},
      });
    });
  });

  return NextResponse.json({
    success: true,
    tables: parsedTables,
    columns: allColumns,
    discoveredTables,
    summary: {
      totalTables: tables.length,
      totalColumns: allColumns.length,
      totalDiscovered: discoveredTables.length,
      modulesLinked: tables.filter((t: any) => t.linkedModule).length,
    },
  });
}

// =============================================================================
// SP INTELLIGENCE
// =============================================================================

async function getSPIntelligence(projectId: string | null | undefined) {
  if (!projectId) {
    return NextResponse.json({ success: true, procedures: [] });
  }

  const procedures = await db.storedProcedureCache.findMany({
    where: { projectId },
    orderBy: { procedureName: 'asc' },
  });

  const parsedProcedures = procedures.map(p => ({
    ...p,
    tablesReferenced: safeParseJSON(p.tablesReferenced, []),
    implicitJoins: safeParseJSON(p.implicitJoins, []),
    discoveredTables: safeParseJSON(p.discoveredTables, []),
    businessRules: safeParseJSON(p.businessRules, []),
    writeOperations: safeParseJSON(p.writeOperations, []),
    readOperations: safeParseJSON(p.readOperations, []),
    parameters: safeParseJSON(p.parameters, []),
    apiInputSchema: safeParseJSON(p.apiInputSchema, {}),
  }));

  return NextResponse.json({
    success: true,
    procedures: parsedProcedures,
    summary: {
      total: procedures.length,
      byActionType: groupBy(procedures, 'actionType'),
      byModule: groupBy(procedures, 'moduleName'),
      byRiskLevel: groupBy(procedures, 'riskLevel'),
      avgComplexity: procedures.length > 0
        ? Math.round(procedures.reduce((sum, p) => sum + (p.complexity || 0), 0) / procedures.length)
        : 0,
    },
  });
}

// =============================================================================
// CSHTML INTELLIGENCE
// =============================================================================

async function getCSHTMLIntelligence(projectId: string | null | undefined) {
  if (!projectId) {
    return NextResponse.json({ success: true, views: [] });
  }

  const views = await db.cSHTMLAnalysisCache.findMany({
    where: { projectId },
    orderBy: { viewName: 'asc' },
  });

  const parsedViews = views.map(v => ({
    ...v,
    fields: safeParseJSON(v.fields, []),
    listConfig: safeParseJSON(v.listConfig, {}),
    sections: safeParseJSON(v.sections, []),
    permissions: safeParseJSON(v.permissions, []),
    scripts: safeParseJSON(v.scripts, []),
    styles: safeParseJSON(v.styles, []),
    reactBlueprint: safeParseJSON(v.reactBlueprint, {}),
  }));

  // Get CSHTML-specific intelligence
  const [ajaxEndpoints, formIntelligences, dropdownMappings] = await Promise.all([
    db.cSHTMLAjaxEndpoint.findMany({ where: { projectId } }),
    db.cSHTMLFormIntelligence.findMany({ where: { projectId } }),
    db.dropdownMapping.findMany({ where: { projectId } }),
  ]);

  return NextResponse.json({
    success: true,
    views: parsedViews,
    ajaxEndpoints,
    formIntelligences,
    dropdownMappings,
    summary: {
      totalViews: views.length,
      byViewType: groupBy(views, 'viewType'),
      totalFields: parsedViews.reduce((sum, v) => sum + (v.fields?.length || 0), 0),
      totalAjaxEndpoints: ajaxEndpoints.length,
      totalForms: formIntelligences.length,
      totalDropdowns: dropdownMappings.length,
    },
  });
}

// =============================================================================
// JS INTELLIGENCE
// =============================================================================

async function getJSIntelligence(projectId: string | null | undefined) {
  if (!projectId) {
    return NextResponse.json({ success: true, files: [] });
  }

  const files = await db.jSIntelligenceCache.findMany({
    where: { projectId },
    orderBy: { fileName: 'asc' },
  });

  const parsedFiles = files.map(f => ({
    ...f,
    ajaxCalls: safeParseJSON(f.ajaxCalls, []),
    eventHandlers: safeParseJSON(f.eventHandlers, []),
    dependencies: safeParseJSON(f.dependencies, []),
    formValidations: safeParseJSON(f.formValidations, []),
    discoveredEndpoints: safeParseJSON(f.discoveredEndpoints, []),
    jqueryPlugins: safeParseJSON(f.jqueryPlugins, []),
    bootstrapComponents: safeParseJSON(f.bootstrapComponents, []),
  }));

  // Get related caches
  const [ajaxCallCaches, eventHandlerCaches, formValidationCaches] = await Promise.all([
    db.ajaxCallCache.findMany({ where: { projectId } }),
    db.eventHandlerCache.findMany({ where: { projectId } }),
    db.formValidationCache.findMany({ where: { projectId } }),
  ]);

  return NextResponse.json({
    success: true,
    files: parsedFiles,
    ajaxCallCaches,
    eventHandlerCaches,
    formValidationCaches,
    summary: {
      totalFiles: files.length,
      byFramework: groupBy(files, 'framework'),
      totalAjaxCalls: ajaxCallCaches.length,
      totalEventHandlers: eventHandlerCaches.length,
      totalFormValidations: formValidationCaches.length,
      avgComplexity: files.length > 0
        ? Math.round(files.reduce((sum, f) => sum + (f.complexity || 0), 0) / files.length)
        : 0,
    },
  });
}

// =============================================================================
// FK RESOLUTION DATA
// =============================================================================

async function getFKResolutionData(projectId: string | null | undefined) {
  if (!projectId) {
    return NextResponse.json({ success: true, data: {} });
  }

  const [tables, discoveredTables, fkDependencyCaches, fkResolutionSessions, missingTableResolutions] = await Promise.all([
    db.toolkitTable.findMany({
      where: { projectId },
      select: { tableName: true, foreignKeys: true },
    }),
    db.discoveredTableCache.findMany({ where: { projectId } }),
    db.fKDependencyCache.findMany({ where: { projectId } }),
    db.fKResolutionSession.findMany({ where: { projectId } }),
    db.missingTableResolution.findMany({ where: { projectId } }),
  ]);

  // Calculate FK resolution
  const tableNames = new Set(tables.map(t => t.tableName.toLowerCase()));
  let totalFKs = 0;
  let resolvedFKs = 0;
  const missingTables = new Map<string, { referencedBy: string[], count: number }>();

  tables.forEach(t => {
    const fks = safeParseJSON(t.foreignKeys, []);
    fks.forEach((fk: any) => {
      totalFKs++;
      const refTable = fk.referencesTable?.toLowerCase();
      if (tableNames.has(refTable)) {
        resolvedFKs++;
      } else {
        const existing = missingTables.get(refTable) || { referencedBy: [], count: 0 };
        existing.referencedBy.push(t.tableName);
        existing.count++;
        missingTables.set(refTable, existing);
      }
    });
  });

  return NextResponse.json({
    success: true,
    data: {
      totalFKs,
      resolvedFKs,
      unresolvedFKs: totalFKs - resolvedFKs,
      resolutionPercent: totalFKs > 0 ? Math.round((resolvedFKs / totalFKs) * 100) : 0,
      missingTables: Array.from(missingTables.entries()).map(([name, data]) => ({
        tableName: name,
        referencedBy: data.referencedBy,
        referenceCount: data.count,
      })),
      discoveredTables,
      dependencyCaches: fkDependencyCaches,
      sessions: fkResolutionSessions,
      resolutions: missingTableResolutions,
    },
  });
}

// =============================================================================
// COMPLIANCE DATA
// =============================================================================

async function getComplianceData(projectId: string | null | undefined) {
  if (!projectId) {
    return NextResponse.json({ success: true, data: {} });
  }

  const columnIntelligence = await db.columnIntelligenceCache.findMany();

  const piiColumns = columnIntelligence.filter(c => c.sensitivity === 'PII');
  const phiColumns = columnIntelligence.filter(c => c.sensitivity === 'PHI');
  const sensitiveColumns = columnIntelligence.filter(c => 
    c.sensitivity === 'PII' || c.sensitivity === 'PHI' || c.sensitivity === 'Sensitive'
  );

  return NextResponse.json({
    success: true,
    data: {
      pii: {
        columns: piiColumns,
        count: piiColumns.length,
        byTable: groupBy(piiColumns, 'tableName'),
      },
      phi: {
        columns: phiColumns,
        count: phiColumns.length,
        byTable: groupBy(phiColumns, 'tableName'),
      },
      sensitive: {
        columns: sensitiveColumns,
        count: sensitiveColumns.length,
        byTable: groupBy(sensitiveColumns, 'tableName'),
      },
      bySemanticType: groupBy(columnIntelligence, 'semanticType'),
      bySensitivity: groupBy(columnIntelligence, 'sensitivity'),
    },
  });
}

// =============================================================================
// MODULE DATA
// =============================================================================

async function getModuleData(projectId: string | null | undefined) {
  if (!projectId) {
    return NextResponse.json({ success: true, modules: [] });
  }

  const [tables, procedures, hisModules] = await Promise.all([
    db.toolkitTable.findMany({ where: { projectId } }),
    db.storedProcedureCache.findMany({ where: { projectId } }),
    db.hISModule.findMany({ orderBy: { layer: 'asc' } }),
  ]);

  // Group tables by module
  const tablesByModule: Record<string, typeof tables> = {};
  tables.forEach(t => {
    const module = t.linkedModule || 'Unassigned';
    if (!tablesByModule[module]) tablesByModule[module] = [];
    tablesByModule[module].push(t);
  });

  // Group SPs by module
  const spsByModule: Record<string, typeof procedures> = {};
  procedures.forEach(p => {
    const module = p.moduleName || 'Unassigned';
    if (!spsByModule[module]) spsByModule[module] = [];
    spsByModule[module].push(p);
  });

  return NextResponse.json({
    success: true,
    modules: hisModules,
    tablesByModule,
    spsByModule,
    summary: {
      totalHISModules: hisModules.length,
      modulesWithTables: Object.keys(tablesByModule).length,
      modulesWithSPs: Object.keys(spsByModule).length,
      byLayer: groupBy(hisModules, 'layer'),
    },
  });
}

// =============================================================================
// ACTIVITY DATA
// =============================================================================

async function getActivityData(projectId: string | null | undefined) {
  if (!projectId) {
    return NextResponse.json({ success: true, activities: [] });
  }

  // Get recent files, runs, executions
  const [recentFiles, recentRuns, recentExecutions] = await Promise.all([
    db.toolkitFile.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
    db.agentRun.findMany({
      where: { projectId },
      orderBy: { startedAt: 'desc' },
      take: 20,
    }),
    db.pipelineRun.findMany({
      where: { projectId },
      orderBy: { startTime: 'desc' },
      take: 20,
    }),
  ]);

  // Combine and sort by time
  const activities: any[] = [];

  recentFiles.forEach(f => {
    activities.push({
      type: 'file_upload',
      timestamp: f.createdAt,
      data: { fileName: f.fileName, fileType: f.fileType, parseStatus: f.parseStatus },
    });
  });

  recentRuns.forEach(r => {
    activities.push({
      type: 'agent_run',
      timestamp: r.startedAt,
      data: { agentName: r.agentName, status: r.status, itemsProcessed: r.itemsProcessed },
    });
  });

  recentExecutions.forEach(e => {
    activities.push({
      type: 'pipeline_run',
      timestamp: e.startTime,
      data: { pipelineName: e.runName, status: e.status },
    });
  });

  // Sort by timestamp descending
  activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return NextResponse.json({
    success: true,
    activities: activities.slice(0, 50),
  });
}

// =============================================================================
// FILES DATA
// =============================================================================

async function getFilesData(projectId: string | null | undefined) {
  if (!projectId) {
    return NextResponse.json({ success: true, files: [] });
  }

  const files = await db.toolkitFile.findMany({
    where: { projectId },
    orderBy: { createdAt: 'desc' },
    include: {
      versions: {
        orderBy: { version: 'desc' },
        take: 5,
      },
    },
  });

  return NextResponse.json({
    success: true,
    files,
    summary: {
      total: files.length,
      byType: groupBy(files, 'fileType'),
      byStatus: groupBy(files, 'parseStatus'),
      duplicates: files.filter(f => f.isDuplicate).length,
      totalSize: files.reduce((sum, f) => sum + (f.fileSize || 0), 0),
      totalLines: files.reduce((sum, f) => sum + (f.lineCount || 0), 0),
    },
  });
}

// =============================================================================
// ALL DATA
// =============================================================================

async function getAllData(projectId: string | null | undefined) {
  const [summary, parserStats, tableIntel, spIntel, cshtmlIntel, jsIntel, fkData, complianceData, moduleData, activityData, filesData] = await Promise.all([
    getDashboardSummary(projectId),
    getParserStats(projectId),
    getTableIntelligence(projectId),
    getSPIntelligence(projectId),
    getCSHTMLIntelligence(projectId),
    getJSIntelligence(projectId),
    getFKResolutionData(projectId),
    getComplianceData(projectId),
    getModuleData(projectId),
    getActivityData(projectId),
    getFilesData(projectId),
  ]);

  return NextResponse.json({
    success: true,
    projectId,
    data: {
      summary: await summary.json(),
      parserStats: await parserStats.json(),
      tableIntelligence: await tableIntel.json(),
      spIntelligence: await spIntel.json(),
      cshtmlIntelligence: await cshtmlIntel.json(),
      jsIntelligence: await jsIntel.json(),
      fkResolution: await fkData.json(),
      compliance: await complianceData.json(),
      modules: await moduleData.json(),
      activity: await activityData.json(),
      files: await filesData.json(),
    },
  });
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function getEmptySummary() {
  return {
    healthScore: 0,
    totalTables: 0,
    totalColumns: 0,
    totalFKs: 0,
    totalSPs: 0,
    totalViews: 0,
    totalFiles: 0,
  };
}

function calculateFKResolution(tables: any[], discoveredTables: any[]) {
  const tableNames = new Set(tables.map((t: any) => t.tableName.toLowerCase()));
  let total = 0;
  let resolved = 0;
  const missing: string[] = [];

  tables.forEach((t: any) => {
    try {
      const fks = JSON.parse(t.foreignKeys || '[]');
      fks.forEach((fk: any) => {
        total++;
        if (tableNames.has(fk.referencesTable?.toLowerCase())) {
          resolved++;
        } else {
          missing.push(fk.referencesTable);
        }
      });
    } catch (e) {
      // Skip
    }
  });

  return {
    total,
    resolved,
    percent: total > 0 ? Math.round((resolved / total) * 100) : 0,
    missing: [...new Set(missing)],
  };
}

function calculateModuleCoverage(tables: any[]) {
  const HIS_MODULE_COUNT = 35; // Standard HIS module count
  const modulesWithTables = new Set<string>();

  tables.forEach((t: any) => {
    if (t.linkedModule) {
      modulesWithTables.add(t.linkedModule);
    }
  });

  return {
    linked: modulesWithTables.size,
    total: HIS_MODULE_COUNT,
    percent: Math.round((modulesWithTables.size / HIS_MODULE_COUNT) * 100),
  };
}

function calculateHealthScore(data: {
  totalTables: number;
  totalFKs: number;
  fkResolved: number;
  fkTotal: number;
  modulesLinked: number;
  modulesTotal: number;
  spsAnalyzed: number;
  viewsAnalyzed: number;
  qualityScore: number | null | undefined;
}): number {
  if (data.totalTables === 0) return 0;

  const weights = {
    fkResolution: 0.3,
    moduleCoverage: 0.25,
    spAnalysis: 0.2,
    viewAnalysis: 0.15,
    quality: 0.1,
  };

  const fkScore = data.fkTotal > 0 ? (data.fkResolved / data.fkTotal) * 100 : 100;
  const moduleScore = (data.modulesLinked / data.modulesTotal) * 100;
  const spScore = data.totalTables > 0 ? Math.min(100, (data.spsAnalyzed / data.totalTables) * 50) : 0;
  const viewScore = data.totalTables > 0 ? Math.min(100, (data.viewsAnalyzed / data.totalTables) * 50) : 0;
  const qualityScore = data.qualityScore ? data.qualityScore * 100 : 50;

  const healthScore = 
    fkScore * weights.fkResolution +
    moduleScore * weights.moduleCoverage +
    spScore * weights.spAnalysis +
    viewScore * weights.viewAnalysis +
    qualityScore * weights.quality;

  return Math.round(healthScore);
}

function safeParseJSON(str: string | null | undefined, defaultValue: any) {
  if (!str) return defaultValue;
  try {
    return JSON.parse(str);
  } catch {
    return defaultValue;
  }
}

function groupBy(arr: any[], key: string): Record<string, number> {
  const result: Record<string, number> = {};
  arr.forEach(item => {
    const k = (item as any)[key] || 'unknown';
    result[k] = (result[k] || 0) + 1;
  });
  return result;
}
