import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { 
  SqlViewParser, 
  parseViews, 
  parseView,
  ParsedView
} from '@/lib/parsers/sql-view-parser'

// GET - Get views for a project or get view details
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'list'
    const projectId = searchParams.get('projectId')
    const viewId = searchParams.get('viewId')
    const viewName = searchParams.get('viewName')

    switch (action) {
      case 'list':
        return await listViews(projectId)
      
      case 'get':
        return await getView(viewId)
      
      case 'dependencies':
        return await getViewDependencies(projectId, viewName)
      
      case 'dependency-graph':
        return await getDependencyGraph(projectId)
      
      case 'issues':
        return await getViewIssues(projectId)
      
      case 'source-tables':
        return await getViewSourceTables(projectId, viewName)
      
      case 'statistics':
        return await getViewStatistics(projectId)
      
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error) {
    console.error('View API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Parse and store views
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, projectId, sqlContent, viewDefinition, knownTables } = body

    switch (action) {
      case 'parse':
        return await parseAndStoreViews(projectId, sqlContent, knownTables)
      
      case 'parse-single':
        return await parseSingleView(viewDefinition, knownTables)
      
      case 'analyze':
        return await analyzeViewDefinition(viewDefinition, knownTables)
      
      case 'update-lineage':
        return await updateViewLineage(projectId)
      
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error) {
    console.error('View API POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ============================================================================
// GET HANDLERS
// ============================================================================

async function listViews(projectId: string | null) {
  if (!projectId) {
    return NextResponse.json({ error: 'projectId required' }, { status: 400 })
  }

  const views = await prisma.cSHTMLAnalysisCache.findMany({
    where: {
      projectId,
      viewType: 'sql_view'
    },
    orderBy: { viewName: 'asc' }
  })

  return NextResponse.json({ views })
}

async function getView(viewId: string | null) {
  if (!viewId) {
    return NextResponse.json({ error: 'viewId required' }, { status: 400 })
  }

  const view = await prisma.cSHTMLAnalysisCache.findUnique({
    where: { id: viewId }
  })

  if (!view) {
    return NextResponse.json({ error: 'View not found' }, { status: 404 })
  }

  let parsedView: ParsedView | null = null
  if (view.rawContent) {
    parsedView = parseView(view.rawContent)
  }

  return NextResponse.json({ view, parsedView })
}

async function getViewDependencies(projectId: string | null, viewName: string | null) {
  if (!projectId || !viewName) {
    return NextResponse.json({ error: 'projectId and viewName required' }, { status: 400 })
  }

  const view = await prisma.cSHTMLAnalysisCache.findFirst({
    where: { projectId, viewName }
  })

  if (!view) {
    return NextResponse.json({ error: 'View not found' }, { status: 404 })
  }

  const dependencies = await prisma.kGEdge.findMany({
    where: {
      sourceNodeId: view.id,
      edgeType: 'view_depends_on'
    }
  })

  const targetNodeIds = dependencies.map(d => d.targetNodeId)
  const targetNodes = await prisma.kGNode.findMany({
    where: { id: { in: targetNodeIds } }
  })

  const nodeMap = new Map(targetNodes.map(n => [n.id, n]))

  return NextResponse.json({ 
    view: view.viewName,
    dependencies: dependencies.map(d => ({
      id: d.targetNodeId,
      name: nodeMap.get(d.targetNodeId)?.name,
      type: nodeMap.get(d.targetNodeId)?.nodeType,
      edgeType: d.edgeType
    }))
  })
}

async function getDependencyGraph(projectId: string | null) {
  if (!projectId) {
    return NextResponse.json({ error: 'projectId required' }, { status: 400 })
  }

  const viewNodes = await prisma.kGNode.findMany({
    where: { projectId, nodeType: 'view' }
  })

  const edges = await prisma.kGEdge.findMany({
    where: {
      projectId,
      edgeType: { in: ['view_depends_on', 'view_references'] }
    }
  })

  return NextResponse.json({
    nodes: viewNodes.map(n => ({
      id: n.id,
      name: n.name,
      type: n.nodeType,
      position: { x: n.positionX, y: n.positionY }
    })),
    edges: edges.map(e => ({
      id: e.id,
      source: e.sourceNodeId,
      target: e.targetNodeId,
      type: e.edgeType
    }))
  })
}

async function getViewIssues(projectId: string | null) {
  if (!projectId) {
    return NextResponse.json({ error: 'projectId required' }, { status: 400 })
  }

  const views = await prisma.cSHTMLAnalysisCache.findMany({
    where: { projectId, viewType: 'sql_view' }
  })

  const parser = new SqlViewParser()
  const allIssues: { viewName: string; issues: any[] }[] = []

  for (const view of views) {
    if (view.rawContent) {
      const parsed = parser.parseSingle(view.rawContent)
      if (parsed) {
        const issues = parser.analyzeViewIssues(parsed)
        if (issues.length > 0) {
          allIssues.push({ viewName: view.viewName, issues })
        }
      }
    }
  }

  return NextResponse.json({ 
    totalViews: views.length,
    viewsWithIssues: allIssues.length,
    issues: allIssues
  })
}

async function getViewSourceTables(projectId: string | null, viewName: string | null) {
  if (!projectId || !viewName) {
    return NextResponse.json({ error: 'projectId and viewName required' }, { status: 400 })
  }

  const view = await prisma.cSHTMLAnalysisCache.findFirst({
    where: { projectId, viewName }
  })

  if (!view || !view.rawContent) {
    return NextResponse.json({ error: 'View not found or no definition' }, { status: 404 })
  }

  const parsed = parseView(view.rawContent)
  
  if (!parsed) {
    return NextResponse.json({ error: 'Could not parse view' }, { status: 500 })
  }

  const tableNames = parsed.sourceTables.map(t => t.tableName.toLowerCase())
  
  const existingTables = await prisma.toolkitTable.findMany({
    where: {
      projectId,
      tableName: { in: tableNames }
    },
    select: { tableName: true, id: true }
  })

  const tableMap = new Map(existingTables.map(t => [t.tableName.toLowerCase(), t]))

  return NextResponse.json({
    viewName: parsed.viewName,
    sourceTables: parsed.sourceTables.map(st => ({
      ...st,
      exists: tableMap.has(st.tableName.toLowerCase()),
      tableId: tableMap.get(st.tableName.toLowerCase())?.id
    })),
    joins: parsed.joins,
    columns: parsed.columns
  })
}

async function getViewStatistics(projectId: string | null) {
  if (!projectId) {
    return NextResponse.json({ error: 'projectId required' }, { status: 400 })
  }

  const views = await prisma.cSHTMLAnalysisCache.findMany({
    where: { projectId, viewType: 'sql_view' }
  })

  const parser = new SqlViewParser()
  
  let totalColumns = 0
  let totalSourceTables = 0
  let totalJoins = 0
  let avgComplexity = 0
  let withSchemaBinding = 0
  let withSubqueries = 0
  let withCTEs = 0

  for (const view of views) {
    if (view.rawContent) {
      const parsed = parser.parseSingle(view.rawContent)
      if (parsed) {
        totalColumns += parsed.columns.length
        totalSourceTables += parsed.sourceTables.length
        totalJoins += parsed.joins.length
        avgComplexity += parsed.complexityScore
        if (parsed.isSchemaBound) withSchemaBinding++
        if (parsed.hasSubqueries) withSubqueries++
        if (parsed.hasCTEs) withCTEs++
      }
    }
  }

  const viewCount = views.length

  return NextResponse.json({
    totalViews: viewCount,
    totalColumns,
    totalSourceTables,
    totalJoins,
    averageComplexity: viewCount > 0 ? Math.round(avgComplexity / viewCount * 10) / 10 : 0,
    withSchemaBinding,
    withSubqueries,
    withCTEs,
    sourceTablesPerView: viewCount > 0 ? Math.round(totalSourceTables / viewCount * 10) / 10 : 0,
    joinsPerView: viewCount > 0 ? Math.round(totalJoins / viewCount * 10) / 10 : 0
  })
}

// ============================================================================
// POST HANDLERS
// ============================================================================

async function parseAndStoreViews(
  projectId: string, 
  sqlContent: string,
  knownTables?: { tableName: string; columns: { name: string; dataType: string }[] }[]
) {
  let tablesForInference = knownTables || []
  
  if (!knownTables && projectId) {
    const tables = await prisma.toolkitTable.findMany({
      where: { projectId },
      select: { tableName: true, columns: true }
    })
    
    tablesForInference = tables.map(t => ({
      tableName: t.tableName,
      columns: JSON.parse(t.columns).map((c: any) => ({
        name: c.name || c.columnName,
        dataType: c.dataType || c.type
      }))
    }))
  }

  const parser = new SqlViewParser(tablesForInference)
  const result = parser.parse(sqlContent)
  
  const storedViews = []
  const storedSQLViews = []
  
  for (const view of result.views) {
    try {
      // Store in CSHTMLAnalysisCache (legacy)
      const stored = await prisma.cSHTMLAnalysisCache.upsert({
        where: {
          projectId_viewName: {
            projectId,
            viewName: view.fullName
          }
        },
        create: {
          id: `view-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          projectId,
          viewName: view.fullName,
          viewType: 'sql_view',
          modelName: view.schemaName,
          filePath: null,
          title: view.viewName,
          fields: JSON.stringify(view.columns),
          sections: JSON.stringify(view.sourceTables),
          permissions: JSON.stringify(view.dependencies),
          scripts: JSON.stringify(view.joins),
          rawContent: view.definition,
          suggestedPath: view.selectStatement,
          estimatedEffort: view.complexityScore
        },
        update: {
          viewType: 'sql_view',
          fields: JSON.stringify(view.columns),
          sections: JSON.stringify(view.sourceTables),
          permissions: JSON.stringify(view.dependencies),
          scripts: JSON.stringify(view.joins),
          rawContent: view.definition,
          suggestedPath: view.selectStatement,
          estimatedEffort: view.complexityScore
        }
      })
      
      // Store in new SQLViewModel with computed column intelligence
      const computedColumns = view.columns
        .filter(col => col.isComputed)
        .map(col => ({
          columnName: col.name,
          sourceColumn: col.sourceColumn,
          sourceTable: col.sourceTable,
          expression: col.expression,
          expressionType: classifyExpression(col.expression || ''),
          inferredDataType: col.dataType,
          isAggregate: col.isAggregate,
          aggregateFunction: col.aggregateFunction
        }))
      
      const sqlView = await prisma.sQLViewModel.upsert({
        where: {
          projectId_viewName: {
            projectId,
            viewName: view.fullName
          }
        },
        create: {
          id: `sqlview-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          projectId,
          viewName: view.fullName,
          schemaName: view.schemaName,
          fullName: view.fullName,
          definition: view.definition,
          selectStatement: view.selectStatement,
          viewType: view.viewType,
          isSchemaBound: view.isSchemaBound,
          isEncrypted: view.isEncrypted,
          checkOption: view.checkOption,
          columns: JSON.stringify(view.columns),
          sourceTables: JSON.stringify(view.sourceTables),
          dependencies: JSON.stringify(view.dependencies),
          joins: JSON.stringify(view.joins),
          whereClause: view.whereClause?.rawText,
          groupByColumns: JSON.stringify(view.groupByColumns),
          havingClause: view.havingClause,
          orderByColumns: JSON.stringify(view.orderByColumns),
          ctes: JSON.stringify(view.ctes),
          hasDistinct: view.hasDistinct,
          hasUnion: view.hasUnion,
          hasSubqueries: view.hasSubqueries,
          hasCTEs: view.hasCTEs,
          hints: JSON.stringify(view.hints),
          complexityScore: view.complexityScore,
          computedColumns: JSON.stringify(computedColumns),
          aggregateColumns: JSON.stringify(view.columns.filter(c => c.isAggregate)),
          parseStatus: 'parsed'
        },
        update: {
          definition: view.definition,
          selectStatement: view.selectStatement,
          columns: JSON.stringify(view.columns),
          sourceTables: JSON.stringify(view.sourceTables),
          dependencies: JSON.stringify(view.dependencies),
          joins: JSON.stringify(view.joins),
          computedColumns: JSON.stringify(computedColumns),
          complexityScore: view.complexityScore,
          parseStatus: 'parsed'
        }
      })
      
      // Create knowledge graph node
      await prisma.kGNode.upsert({
        where: {
          projectId_nodeType_name: {
            projectId,
            nodeType: 'view',
            name: view.fullName
          }
        },
        create: {
          id: `kgn-view-${view.fullName}`,
          projectId,
          nodeType: 'view',
          name: view.fullName,
          displayName: view.viewName,
          description: `SQL View: ${view.columns.length} columns, ${view.sourceTables.length} sources`,
          properties: JSON.stringify({
            schemaName: view.schemaName,
            complexityScore: view.complexityScore,
            isSchemaBound: view.isSchemaBound,
            hasSubqueries: view.hasSubqueries,
            hasCTEs: view.hasCTEs
          })
        },
        update: {
          displayName: view.viewName,
          description: `SQL View: ${view.columns.length} columns, ${view.sourceTables.length} sources`,
          properties: JSON.stringify({
            schemaName: view.schemaName,
            complexityScore: view.complexityScore,
            isSchemaBound: view.isSchemaBound,
            hasSubqueries: view.hasSubqueries,
            hasCTEs: view.hasCTEs
          })
        }
      })
      
      storedViews.push(stored)
      storedSQLViews.push(sqlView)
    } catch (storeError) {
      console.error(`Failed to store view ${view.fullName}:`, storeError)
    }
  }
  
  return NextResponse.json({
    success: true,
    parsed: result.stats,
    stored: storedViews.length,
    sqlViews: storedSQLViews.length,
    errors: result.errors,
    warnings: result.warnings
  })
}

// Helper function to classify expression type
function classifyExpression(expression: string): string {
  if (/\b(SUM|AVG|COUNT|MIN|MAX|STDEV|VAR)\s*\(/i.test(expression)) {
    return 'aggregate'
  }
  if (/\b(CASE|WHEN|IIF|NULLIF|COALESCE|ISNULL)\b/i.test(expression)) {
    return 'conditional'
  }
  if (/\b(GETDATE|DATEADD|DATEDIFF|CONVERT.*DATE|FORMAT.*DATE|YEAR|MONTH|DAY)\b/i.test(expression)) {
    return 'date'
  }
  if (/\b(SUBSTRING|CONCAT|LEFT|RIGHT|LTRIM|RTRIM|REPLACE|UPPER|LOWER|LEN|CHARINDEX)\b/i.test(expression)) {
    return 'string'
  }
  if (/[\+\-\*\/]/.test(expression)) {
    return 'arithmetic'
  }
  return 'function'
}

async function parseSingleView(
  viewDefinition: string,
  knownTables?: { tableName: string; columns: { name: string; dataType: string }[] }[]
) {
  const parser = new SqlViewParser(knownTables)
  const result = parser.parseSingle(viewDefinition)
  
  if (!result) {
    return NextResponse.json({ error: 'Could not parse view definition' }, { status: 400 })
  }
  
  const issues = parser.analyzeViewIssues(result)
  
  return NextResponse.json({
    view: result,
    issues,
    summary: {
      name: result.fullName,
      columns: result.columns.length,
      sourceTables: result.sourceTables.length,
      joins: result.joins.length,
      dependencies: result.dependencies.length,
      complexity: result.complexityScore
    }
  })
}

async function analyzeViewDefinition(
  viewDefinition: string,
  knownTables?: { tableName: string; columns: { name: string; dataType: string }[] }[]
) {
  const parser = new SqlViewParser(knownTables)
  const result = parser.parseSingle(viewDefinition)
  
  if (!result) {
    return NextResponse.json({ error: 'Could not parse view definition' }, { status: 400 })
  }
  
  const issues = parser.analyzeViewIssues(result)
  
  const analysis = {
    overview: {
      name: result.fullName,
      complexity: result.complexityScore,
      type: result.viewType,
      schemaBound: result.isSchemaBound
    },
    columns: {
      total: result.columns.length,
      computed: result.columns.filter(c => c.isComputed).length,
      aggregates: result.columns.filter(c => c.isAggregate).length,
      wildcard: result.columns.filter(c => c.name === '*' || c.name.endsWith('.*')).length
    },
    sources: {
      tables: result.sourceTables,
      dependencies: result.dependencies
    },
    joins: result.joins,
    queryFeatures: {
      distinct: result.hasDistinct,
      top: result.hasTop ? result.topValue : null,
      union: result.hasUnion,
      subqueries: result.hasSubqueries,
      ctes: result.hasCTEs ? result.ctes.length : 0,
      groupBy: result.groupByColumns.length,
      orderBy: result.orderByColumns.length
    },
    recommendations: issues
  }
  
  return NextResponse.json({ analysis })
}

async function updateViewLineage(projectId: string) {
  const views = await prisma.cSHTMLAnalysisCache.findMany({
    where: { projectId, viewType: 'sql_view' }
  })
  
  let edgesCreated = 0
  
  for (const view of views) {
    if (!view.rawContent) continue
    
    const parsed = parseView(view.rawContent)
    if (!parsed) continue
    
    for (const sourceTable of parsed.sourceTables) {
      try {
        const tableNode = await prisma.kGNode.findFirst({
          where: {
            projectId,
            nodeType: 'table',
            name: { contains: sourceTable.tableName, mode: 'insensitive' }
          }
        })
        
        if (tableNode) {
          await prisma.kGEdge.upsert({
            where: {
              projectId_sourceNodeId_targetNodeId_edgeType: {
                projectId,
                sourceNodeId: view.id,
                targetNodeId: tableNode.id,
                edgeType: 'view_depends_on'
              }
            },
            create: {
              id: `kge-${view.id}-${tableNode.id}`,
              projectId,
              sourceNodeId: view.id,
              targetNodeId: tableNode.id,
              edgeType: 'view_depends_on',
              label: sourceTable.joinType || 'SELECT',
              weight: sourceTable.isPrimary ? 1.0 : 0.8
            },
            update: {
              label: sourceTable.joinType || 'SELECT'
            }
          })
          edgesCreated++
        }
      } catch (e) {
        // Skip constraint errors
      }
    }
  }
  
  return NextResponse.json({
    success: true,
    viewsProcessed: views.length,
    edgesCreated
  })
}
