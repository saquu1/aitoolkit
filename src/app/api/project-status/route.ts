import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 })
    }

    // Get project basic info
    const project = await prisma.toolkitProject.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        name: true,
        softwareType: true,
        status: true,
        createdAt: true,
        updatedAt: true
      }
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Get counts
    const [
      files,
      tables,
      procedures,
      cshtmlViews,
      storedProcCache,
      viewCache,
      discoveredTables
    ] = await Promise.all([
      prisma.toolkitFile.count({ where: { projectId } }),
      prisma.toolkitTable.count({ where: { projectId } }),
      prisma.toolkitProcedure.count({ where: { projectId } }),
      prisma.cSHTMLAnalysisCache.count({ where: { projectId } }),
      prisma.storedProcedureCache.count({ where: { projectId } }),
      prisma.viewIntelligenceCache.count({ where: { projectId } }),
      prisma.discoveredTableCache.count({ where: { projectId } })
    ])

    // Get file status counts
    const fileStats = await prisma.toolkitFile.groupBy({
      by: ['parseStatus'],
      where: { projectId },
      _count: true
    })

    const fileStatusCounts = {
      total: files,
      parsed: fileStats.find(s => s.parseStatus === 'parsed')?._count || 0,
      pending: fileStats.find(s => s.parseStatus === 'pending')?._count || 0,
      error: fileStats.find(s => s.parseStatus === 'error')?._count || 0
    }

    // Get tables with columns
    const tablesData = await prisma.toolkitTable.findMany({
      where: { projectId },
      select: {
        id: true,
        tableName: true,
        columns: true,
        foreignKeys: true,
        status: true
      }
    })

    const parsedTables = tablesData.map(t => ({
      ...t,
      columns: typeof t.columns === 'string' ? JSON.parse(t.columns) : t.columns,
      foreignKeys: typeof t.foreignKeys === 'string' ? JSON.parse(t.foreignKeys) : t.foreignKeys
    }))

    // Get procedures
    const proceduresData = await prisma.toolkitProcedure.findMany({
      where: { projectId },
      select: {
        id: true,
        procedureName: true,
        schemaName: true,
        parameters: true,
        tablesAccessed: true,
        complexity: true,
        body: true
      }
    })

    const parsedProcedures = proceduresData.map(p => ({
      ...p,
      parameters: typeof p.parameters === 'string' ? JSON.parse(p.parameters) : p.parameters,
      tablesAccessed: typeof p.tablesAccessed === 'string' ? JSON.parse(p.tablesAccessed) : p.tablesAccessed
    }))

    // Get CSHTML views
    const cshtmlViewsData = await prisma.cSHTMLAnalysisCache.findMany({
      where: { projectId },
      select: {
        id: true,
        viewName: true,
        viewType: true,
        modelName: true,
        linkedTable: true,
        fields: true,
        title: true,
        layout: true,
        sections: true,
        permissions: true,
        scripts: true,
        rawContent: true
      }
    })

    const parsedCshtmlViews = cshtmlViewsData.map(v => ({
      id: v.id,
      viewName: v.viewName,
      viewType: v.viewType,
      modelName: v.modelName,
      linkedTable: v.linkedTable,
      fields: typeof v.fields === 'string' ? JSON.parse(v.fields) : v.fields,
      title: v.title,
      layout: v.layout ? (typeof v.layout === 'string' ? JSON.parse(v.layout) : v.layout) : null,
      sections: v.sections ? (typeof v.sections === 'string' ? JSON.parse(v.sections) : v.sections) : [],
      permissions: v.permissions ? (typeof v.permissions === 'string' ? JSON.parse(v.permissions) : v.permissions) : [],
      scripts: v.scripts ? (typeof v.scripts === 'string' ? JSON.parse(v.scripts) : v.scripts) : [],
      body: v.rawContent
    }))

    // Get recent files
    const recentFiles = await prisma.toolkitFile.findMany({
      where: { projectId },
      select: {
        id: true,
        fileName: true,
        fileType: true,
        parseStatus: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    })

    // FK Analysis summary - include FKs from both SQL tables and CSHTML views
    // 1. FKs from SQL DDL tables
    const sqlFKs = parsedTables.reduce((sum, t) => sum + (t.foreignKeys?.length || 0), 0)
    
    // 2. FKs from CSHTML views (fields with isFK=true)
    const cshtmlFKs = parsedCshtmlViews.reduce((sum, v) => {
      const fields = v.fields || []
      return sum + fields.filter((f: any) => f.isFK).length
    }, 0)
    
    // 3. Get discovered tables to check if referenced tables exist (full data for later use)
    const discoveredTablesFullData = await prisma.discoveredTableCache.findMany({
      where: { projectId },
      select: {
        id: true,
        tableName: true,
        discoveredInSP: true,
        accessType: true,
        columns: true,
        suggestedModule: true,
        priority: true,
        isResolved: true
      }
    })
    const discoveredTableNames = discoveredTablesFullData.map(t => t.tableName)
    
    // 4. Get all known table names (SQL + Discovered)
    const knownTableNames = new Set([
      ...parsedTables.map(t => t.tableName),
      ...discoveredTableNames
    ])
    
    // 5. Find missing tables from SQL FKs
    const missingFromSQL = parsedTables.flatMap(t =>
      (t.foreignKeys || [])
        .filter((fk: any) => {
          const refTable = fk.referencedTable || fk.references
          return refTable && !knownTableNames.has(refTable)
        })
        .map((fk: any) => fk.referencedTable || fk.references)
        .filter((name: any) => name != null)
    )
    
    // 6. Find missing tables from CSHTML FKs
    const missingFromCSHTML = parsedCshtmlViews.flatMap(v => 
      (v.fields || [])
        .filter((f: any) => f.isFK && f.fkTable && !knownTableNames.has(f.fkTable))
        .map((f: any) => f.fkTable)
    )
    
    const allMissingTables = [...new Set([...missingFromSQL, ...missingFromCSHTML])].filter(name => name != null)
    
    // 7. Count resolved FKs (where referenced table exists)
    const resolvedFromSQL = parsedTables.reduce((sum, t) => {
      return sum + (t.foreignKeys || []).filter((fk: any) => {
        const refTable = fk.referencedTable || fk.references
        return refTable && knownTableNames.has(refTable)
      }).length
    }, 0)
    
    const resolvedFromCSHTML = parsedCshtmlViews.reduce((sum, v) => {
      return sum + (v.fields || []).filter((f: any) => 
        f.isFK && f.fkTable && knownTableNames.has(f.fkTable)
      ).length
    }, 0)
    
    const fkAnalysis = {
      totalFKs: sqlFKs + cshtmlFKs,
      resolvedFKs: resolvedFromSQL + resolvedFromCSHTML,
      missingTables: allMissingTables,
      summary: {
        fromSQL: sqlFKs,
        fromCSHTML: cshtmlFKs,
        knownTables: knownTableNames.size,
        discoveredTables: discoveredTableNames.length
      }
    }

    // Use already-fetched discovered tables data for display (from line 160)
    const parsedDiscoveredTables = discoveredTablesFullData.map(t => ({
      ...t,
      columns: typeof t.columns === 'string' ? JSON.parse(t.columns) : t.columns,
      isDiscovered: true
    }))

    // Combine SQL tables and discovered tables
    const allTables = [
      ...parsedTables.map(t => ({ ...t, isDiscovered: false })),
      ...parsedDiscoveredTables.map(t => ({
        id: t.id,
        tableName: t.tableName,
        columns: Array.isArray(t.columns) && t.columns.length > 0 && typeof t.columns[0] === 'object' 
          ? t.columns 
          : (typeof t.columns === 'string' ? JSON.parse(t.columns) : t.columns || []),
        foreignKeys: [],
        status: t.isResolved ? 'complete' : 'pending',
        source: t.discoveredInSP,
        isDiscovered: true,
        accessType: t.accessType,
        suggestedModule: t.suggestedModule,
        priority: t.priority
      }))
    ]

    return NextResponse.json({
      project,
      counts: {
        files,
        tables,
        procedures,
        cshtmlViews,
        storedProcCache,
        viewCache,
        discoveredTables
      },
      files: fileStatusCounts,
      tables: allTables,
      procedures: parsedProcedures,
      cshtmlViews: parsedCshtmlViews,
      recentFiles,
      fkAnalysis
    })
  } catch (error) {
    console.error('Error fetching project status:', error)
    return NextResponse.json(
      { error: 'Failed to fetch project status' },
      { status: 500 }
    )
  }
}
