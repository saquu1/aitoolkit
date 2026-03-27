// =============================================================================
// PROJECT INTELLIGENCE API - REAL DATA ONLY
// Returns ONLY actual database records, no generated/synthetic data
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { matchTablesToModules } from '@/lib/module-matcher'

// =============================================================================
// MAIN GET ENDPOINT - Fetch Real Data Only
// =============================================================================

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get('projectId')
  const action = searchParams.get('action')

  if (!projectId) {
    return NextResponse.json({ error: 'projectId required' }, { status: 400 })
  }

  try {
    switch (action) {
      case 'summary':
        return await getSummary(projectId)
      case 'tables':
        return await getTables(projectId)
      case 'views':
        return await getViews(projectId)
      case 'procedures':
        return await getProcedures(projectId)
      case 'modules':
        return await getModules(projectId)
      case 'files':
        return await getFiles(projectId)
      case 'all':
      default:
        return await getAllData(projectId)
    }
  } catch (error: any) {
    console.error('Project intelligence error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// =============================================================================
// GET ALL REAL DATA
// =============================================================================

async function getAllData(projectId: string) {
  // Fetch ONLY real data from database
  const [
    tables,
    views,
    procedures,
    discoveredTables,
    modules,
    files
  ] = await Promise.all([
    prisma.toolkitTable.findMany({ where: { projectId } }),
    prisma.cSHTMLAnalysisCache.findMany({ where: { projectId } }),
    prisma.storedProcedureCache.findMany({ where: { projectId } }),
    prisma.discoveredTableCache.findMany({ where: { projectId } }),
    prisma.projectModule.findMany({ where: { projectId } }),
    prisma.toolkitFile.findMany({ where: { projectId } })
  ])

  // Parse JSON fields safely
  const parsedTables = tables.map(t => ({
    ...t,
    columns: safeParseJSON(t.columns, []),
    foreignKeys: safeParseJSON(t.foreignKeys, []),
    indexes: safeParseJSON(t.indexes, []),
    constraints: safeParseJSON(t.constraints, [])
  }))

  const parsedViews = views.map(v => ({
    ...v,
    fields: safeParseJSON(v.fields, []),
    listConfig: safeParseJSON(v.listConfig, {}),
    sections: safeParseJSON(v.sections, []),
    scripts: safeParseJSON(v.scripts, []),
    styles: safeParseJSON(v.styles, []),
    reactBlueprint: safeParseJSON(v.reactBlueprint, {}),
    permissions: safeParseJSON(v.permissions, [])
  }))

  const parsedProcedures = procedures.map(sp => ({
    ...sp,
    parameters: safeParseJSON(sp.parameters, []),
    tablesReferenced: safeParseJSON(sp.tablesReferenced, []),
    tablesModified: [],
    implicitJoins: safeParseJSON(sp.implicitJoins, []),
    discoveredTables: safeParseJSON(sp.discoveredTables, []),
    businessRules: safeParseJSON(sp.businessRules, []),
    writeOperations: safeParseJSON(sp.writeOperations, []),
    readOperations: safeParseJSON(sp.readOperations, []),
    apiInputSchema: safeParseJSON(sp.apiInputSchema, {})
  }))

  const parsedDiscoveredTables = discoveredTables.map(dt => ({
    ...dt,
    columns: safeParseJSON(dt.columns, [])
  }))

  const parsedModules = modules.map(m => ({
    ...m,
    matchedTables: safeParseJSON(m.matchedTables, [])
  }))

  // Calculate REAL statistics only
  const statistics = {
    totalTables: tables.length,
    totalViews: views.length,
    totalProcedures: procedures.length,
    totalDiscoveredTables: discoveredTables.length,
    totalModules: modules.length,
    totalFiles: files.length,
    totalColumns: parsedTables.reduce((sum, t) => sum + (t.columns?.length || 0), 0),
    totalForeignKeys: parsedTables.reduce((sum, t) => sum + (t.foreignKeys?.length || 0), 0),
    totalFields: parsedViews.reduce((sum, v) => sum + (v.fields?.length || 0), 0)
  }

  // Calculate module coverage from REAL data
  const moduleCoverage = calculateModuleCoverage(parsedTables, parsedModules)

  return NextResponse.json({
    success: true,
    projectId,
    timestamp: new Date().toISOString(),
    
    // REAL data only
    tables: parsedTables,
    views: parsedViews,
    procedures: parsedProcedures,
    discoveredTables: parsedDiscoveredTables,
    modules: parsedModules,
    files: files.map(f => ({
      id: f.id,
      fileName: f.fileName,
      fileType: f.fileType,
      fileSize: f.fileSize,
      lineCount: f.lineCount,
      parseStatus: f.parseStatus,
      parseError: f.parseError,
      tablesFound: f.tablesFound,
      proceduresFound: f.proceduresFound,
      createdAt: f.createdAt
    })),
    
    // Statistics
    statistics,
    
    // Module coverage
    moduleCoverage,
    
    // Unmatched tables (real)
    unmatchedTables: findUnmatchedTables(parsedTables, parsedModules)
  })
}

// =============================================================================
// INDIVIDUAL ENDPOINTS
// =============================================================================

async function getSummary(projectId: string) {
  const [tables, views, procedures, files, modules] = await Promise.all([
    prisma.toolkitTable.count({ where: { projectId } }),
    prisma.cSHTMLAnalysisCache.count({ where: { projectId } }),
    prisma.storedProcedureCache.count({ where: { projectId } }),
    prisma.toolkitFile.count({ where: { projectId } }),
    prisma.projectModule.count({ where: { projectId } })
  ])

  return NextResponse.json({
    projectId,
    tables,
    views,
    procedures,
    files,
    modules,
    timestamp: new Date().toISOString()
  })
}

async function getTables(projectId: string) {
  const tables = await prisma.toolkitTable.findMany({ where: { projectId } })
  
  return NextResponse.json({
    tables: tables.map(t => ({
      ...t,
      columns: safeParseJSON(t.columns, []),
      foreignKeys: safeParseJSON(t.foreignKeys, []),
      indexes: safeParseJSON(t.indexes, []),
      constraints: safeParseJSON(t.constraints, [])
    }))
  })
}

async function getViews(projectId: string) {
  const views = await prisma.cSHTMLAnalysisCache.findMany({ where: { projectId } })
  
  return NextResponse.json({
    views: views.map(v => ({
      ...v,
      fields: safeParseJSON(v.fields, []),
      listConfig: safeParseJSON(v.listConfig, {}),
      sections: safeParseJSON(v.sections, []),
      scripts: safeParseJSON(v.scripts, []),
      reactBlueprint: safeParseJSON(v.reactBlueprint, {})
    }))
  })
}

async function getProcedures(projectId: string) {
  const procedures = await prisma.storedProcedureCache.findMany({ where: { projectId } })
  
  return NextResponse.json({
    procedures: procedures.map(sp => ({
      ...sp,
      parameters: safeParseJSON(sp.parameters, []),
      tablesReferenced: safeParseJSON(sp.tablesReferenced, []),
      businessRules: safeParseJSON(sp.businessRules, []),
      writeOperations: safeParseJSON(sp.writeOperations, []),
      readOperations: safeParseJSON(sp.readOperations, [])
    }))
  })
}

async function getModules(projectId: string) {
  const modules = await prisma.projectModule.findMany({ where: { projectId } })
  const tables = await prisma.toolkitTable.findMany({ where: { projectId } })
  
  const parsedModules = modules.map(m => ({
    ...m,
    matchedTables: safeParseJSON(m.matchedTables, [])
  }))

  const coverage = calculateModuleCoverage(tables, parsedModules)

  return NextResponse.json({
    modules: parsedModules,
    coverage,
    unmatched: findUnmatchedTables(tables, parsedModules)
  })
}

async function getFiles(projectId: string) {
  const files = await prisma.toolkitFile.findMany({ 
    where: { projectId },
    orderBy: { createdAt: 'desc' }
  })
  
  return NextResponse.json({ files })
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function calculateModuleCoverage(tables: any[], modules: any[]): any {
  if (tables.length === 0) {
    return { percentage: 0, matched: 0, total: 0, unmatchedCount: 0 }
  }

  const matchedTableNames = new Set(
    modules.flatMap(m => {
      const matched = safeParseJSON(m.matchedTables, [])
      return Array.isArray(matched) ? matched : []
    })
  )

  const matched = tables.filter(t => matchedTableNames.has(t.tableName)).length
  const total = tables.length

  return {
    percentage: total > 0 ? Math.round((matched / total) * 100) : 0,
    matched,
    total,
    unmatchedCount: total - matched
  }
}

function findUnmatchedTables(tables: any[], modules: any[]): string[] {
  const matchedTableNames = new Set(
    modules.flatMap(m => {
      const matched = safeParseJSON(m.matchedTables, [])
      return Array.isArray(matched) ? matched : []
    })
  )

  return tables
    .filter(t => !matchedTableNames.has(t.tableName))
    .map(t => t.tableName)
}

function safeParseJSON(str: string | null | undefined, fallback: any): any {
  if (!str) return fallback
  try {
    return JSON.parse(str)
  } catch {
    return fallback
  }
}

// =============================================================================
// POST ENDPOINT - Link Modules to Tables
// =============================================================================

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { action, projectId } = body

  if (!projectId) {
    return NextResponse.json({ error: 'projectId required' }, { status: 400 })
  }

  try {
    switch (action) {
      case 'link-modules':
        return await linkModules(projectId)
      case 'refresh-intelligence':
        return await getAllData(projectId)
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error: any) {
    console.error('Project intelligence POST error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

async function linkModules(projectId: string) {
  // Get all tables for the project
  const tables = await prisma.toolkitTable.findMany({ where: { projectId } })
  const tableNames = tables.map(t => t.tableName)

  if (tableNames.length === 0) {
    return NextResponse.json({
      success: true,
      modulesLinked: 0,
      modules: [],
      message: 'No tables found to link'
    })
  }

  // Match tables to modules
  const matchedModules = matchTablesToModules(tableNames)

  // Delete existing module links for this project
  await prisma.projectModule.deleteMany({ where: { projectId } })

  // Store new module links
  for (const match of matchedModules) {
    await prisma.projectModule.create({
      data: {
        projectId,
        moduleKey: match.moduleKey,
        moduleName: match.moduleName,
        layerNumber: match.layerNumber || 1,
        matchedTables: JSON.stringify(match.matchedTables),
        coverage: match.coverage || 0,
        status: match.coverage === 100 ? 'complete' : 'partial'
      }
    })
  }

  // Get updated modules
  const modules = await prisma.projectModule.findMany({ where: { projectId } })

  return NextResponse.json({
    success: true,
    modulesLinked: matchedModules.length,
    modules: modules.map(m => ({
      ...m,
      matchedTables: safeParseJSON(m.matchedTables, [])
    }))
  })
}
