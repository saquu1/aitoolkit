import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/schema/stats
// Returns real database statistics for the dashboard.
//
// Response shape:
//   { success: true, stats: DbStats, data: EnhancedStats }
//
// `stats` is kept for backward compatibility with the useSchema hook.
// `data` contains additional enriched statistics.
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')

    // ── Aggregate mode (no projectId) ──────────────────────────────────
    if (!projectId) {
      return await getAggregateStats()
    }

    // ── Per-project mode ───────────────────────────────────────────────
    return await getProjectStats(projectId)
  } catch (error) {
    console.error('Schema stats error:', error)
    return NextResponse.json(buildFallbackResponse(error))
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// AGGREGATE STATS (all projects combined)
// ═══════════════════════════════════════════════════════════════════════════

async function getAggregateStats() {
  // Run independent counts in parallel
  const [
    projects,
    moduleCount,
    linkedModuleCount,
    recentAgentRuns,
  ] = await Promise.all([
    // All toolkit projects with their tables & procedures
    db.toolkitProject.findMany({
      include: {
        ToolkitTable: true,
        ToolkitProcedure: true,
      },
      orderBy: { updatedAt: 'desc' },
    }),
    // HIS Module counts
    db.hISModule.count(),
    db.hISModule.count({ where: { status: 'linked' } }),
    // Recent agent runs for activity feed
    db.agentRun.findMany({
      take: 5,
      orderBy: { startedAt: 'desc' },
      select: {
        id: true,
        runId: true,
        agentName: true,
        status: true,
        startedAt: true,
        completedAt: true,
        itemsProcessed: true,
      },
    }),
  ])

  // ── Calculate core stats from project data ──────────────────────────
  let totalTables = 0
  let totalColumns = 0
  let totalProcedures = 0
  let totalFKs = 0
  let resolvedFKs = 0
  let lastSync: Date | null = null

  // Collect all tables with parsed column counts for top-tables ranking
  interface TableColumnData {
    tableName: string
    columnCount: number
    status: string
    linkedModule: string | null
  }
  const allTableData: TableColumnData[] = []

  for (const project of projects) {
    totalProcedures += project.ToolkitProcedure.length

    // Build a set of all table names in this project for FK resolution
    const tableNames = new Set(
      project.ToolkitTable.map((t) => t.tableName.toLowerCase()),
    )

    for (const table of project.ToolkitTable) {
      let colCount = 0
      let fkCount = 0

      try {
        const columns = JSON.parse(table.columns || '[]')
        colCount = columns.length
      } catch {
        /* skip malformed JSON */
      }

      try {
        const fks = JSON.parse(table.foreignKeys || '[]')
        fkCount = fks.length
        fks.forEach((fk: { referencesTable?: string }) => {
          totalFKs++
          if (tableNames.has(fk.referencesTable?.toLowerCase())) {
            resolvedFKs++
          }
        })
      } catch {
        /* skip malformed JSON */
      }

      totalTables++
      totalColumns += colCount

      allTableData.push({
        tableName: table.tableName,
        columnCount: colCount,
        status: table.status,
        linkedModule: table.linkedModule,
      })

      // Track most recent sync across all projects
      if (!lastSync || new Date(project.updatedAt) > lastSync) {
        lastSync = new Date(project.updatedAt)
      }
    }
  }

  // ── Top 10 tables by column count ───────────────────────────────────
  const topTables = allTableData
    .sort((a, b) => b.columnCount - a.columnCount)
    .slice(0, 10)

  // ── Build recent activity from agent runs ───────────────────────────
  const recentActivity = recentAgentRuns.map((run) => ({
    id: run.id,
    type: 'agent_run' as const,
    name: run.agentName,
    status: run.status,
    timestamp: run.startedAt.toISOString(),
    details: {
      itemsProcessed: run.itemsProcessed,
      duration: run.completedAt
        ? run.completedAt.getTime() - run.startedAt.getTime()
        : null,
    },
  }))

  // ── Count tables by status for distribution ─────────────────────────
  const tablesByStatus: Record<string, number> = {}
  for (const td of allTableData) {
    tablesByStatus[td.status] = (tablesByStatus[td.status] || 0) + 1
  }

  const fkResolvedPercent =
    totalFKs > 0 ? Math.round((resolvedFKs / totalFKs) * 100) : 0

  return NextResponse.json({
    success: true,
    stats: {
      totalProjects: projects.length,
      totalTables,
      totalColumns,
      totalProcedures,
      fkRelationships: totalFKs,
      fkResolved: resolvedFKs,
      fkResolvedPercent,
      lastSync: lastSync?.toISOString() ?? null,
    },
    data: {
      modules: moduleCount,
      linkedModules: linkedModuleCount,
      moduleLinkedPercent:
        moduleCount > 0
          ? Math.round((linkedModuleCount / moduleCount) * 100)
          : 0,
      recentActivity,
      topTables,
      tablesByStatus,
      lastSync: new Date().toISOString(),
    },
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// PER-PROJECT STATS
// ═══════════════════════════════════════════════════════════════════════════

async function getProjectStats(projectId: string) {
  const project = await db.toolkitProject.findUnique({
    where: { id: projectId },
    include: {
      ToolkitTable: true,
      ToolkitProcedure: true,
    },
  })

  if (!project) {
    return NextResponse.json(
      { error: 'Project not found' },
      { status: 404 },
    )
  }

  // Calculate FK stats
  let totalFKs = 0
  let resolvedFKs = 0
  const tableNames = new Set(
    project.ToolkitTable.map((t) => t.tableName.toLowerCase()),
  )

  // Collect table column data for top-tables ranking
  interface TableColumnData {
    tableName: string
    columnCount: number
    status: string
    linkedModule: string | null
  }
  const tableDataList: TableColumnData[] = []

  let totalColumns = 0

  for (const table of project.ToolkitTable) {
    let colCount = 0

    try {
      const columns = JSON.parse(table.columns || '[]')
      colCount = columns.length
    } catch {
      /* skip */
    }

    try {
      const fks = JSON.parse(table.foreignKeys || '[]')
      fks.forEach((fk: { referencesTable?: string }) => {
        totalFKs++
        if (tableNames.has(fk.referencesTable?.toLowerCase())) {
          resolvedFKs++
        }
      })
    } catch {
      /* skip */
    }

    totalColumns += colCount
    tableDataList.push({
      tableName: table.tableName,
      columnCount: colCount,
      status: table.status,
      linkedModule: table.linkedModule,
    })
  }

  const topTables = tableDataList
    .sort((a, b) => b.columnCount - a.columnCount)
    .slice(0, 10)

  const fkResolvedPercent =
    totalFKs > 0 ? Math.round((resolvedFKs / totalFKs) * 100) : 0

  return NextResponse.json({
    success: true,
    stats: {
      projectId: project.id,
      projectName: project.name,
      totalTables: project.ToolkitTable.length,
      totalColumns,
      totalProcedures: project.ToolkitProcedure.length,
      fkRelationships: totalFKs,
      fkResolved: resolvedFKs,
      fkResolvedPercent,
      lastSync: project.updatedAt.toISOString(),
    },
    data: {
      topTables,
      lastSync: new Date().toISOString(),
    },
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// FALLBACK – always returns a valid success response with zeroed stats
// ═══════════════════════════════════════════════════════════════════════════

function buildFallbackResponse(error: unknown) {
  const message =
    error instanceof Error ? error.message : 'Unknown error'
  return {
    success: true,
    stats: {
      totalProjects: 0,
      totalTables: 0,
      totalColumns: 0,
      totalProcedures: 0,
      fkRelationships: 0,
      fkResolved: 0,
      fkResolvedPercent: 0,
      lastSync: null,
    },
    data: {
      modules: 0,
      linkedModules: 0,
      moduleLinkedPercent: 0,
      recentActivity: [],
      topTables: [],
      tablesByStatus: {},
      lastSync: new Date().toISOString(),
    },
    fallback: true,
    error: message,
  }
}
