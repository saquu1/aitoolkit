import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    // Get all tables with their foreign keys
    const tables = await db.toolkitTable.findMany({
      orderBy: { tableName: 'asc' },
    })

    // Parse and analyze FK data
    let totalFKs = 0
    let resolvedFKs = 0
    let unresolvedFKs = 0
    const fkDetails: Array<{
      table: string
      column: string
      referencesTable: string
      status: 'resolved' | 'unresolved'
      project: string
    }> = []

    // Get all table names for resolution checking
    const allTableNames = new Set(tables.map(t => t.tableName))

    for (const table of tables) {
      let fks: Array<any> = []
      try { fks = JSON.parse(table.foreignKeys || '[]') } catch { /* skip */ }

      for (const fk of fks) {
        totalFKs++
        const isResolved = allTableNames.has(fk.referencesTable)
        if (isResolved) { resolvedFKs++ } else { unresolvedFKs++ }
        fkDetails.push({
          table: table.tableName,
          column: fk.column,
          referencesTable: fk.referencesTable,
          status: isResolved ? 'resolved' : 'unresolved',
          project: table.projectId === 'proj-his-core-001' ? 'HIS Core' : 'LIS',
        })
      }
    }

    // Get recent agent runs related to FK resolution
    const agentRuns = await db.agentRun.findMany({
      where: {
        agentName: { contains: 'fk' }
      },
      orderBy: { startedAt: 'desc' },
      take: 5,
    })

    return NextResponse.json({
      success: true,
      stats: {
        totalFKs,
        resolvedFKs,
        unresolvedFKs,
        resolutionPercent: totalFKs > 0 ? Math.round((resolvedFKs / totalFKs) * 100) : 0,
        totalTables: tables.length,
        tablesWithFKs: tables.filter(t => {
          try { return JSON.parse(t.foreignKeys || '[]').length > 0 } catch { return false }
        }).length,
      },
      fkDetails: fkDetails.slice(0, 50), // Limit to 50 for performance
      recentAgentRuns: agentRuns.map(r => ({
        id: r.id,
        agentName: r.agentName,
        status: r.status,
        startedAt: r.startedAt,
        completedAt: r.completedAt,
        itemsProcessed: r.itemsProcessed,
      })),
    })
  } catch (error: any) {
    return NextResponse.json({
      success: true,
      stats: { totalFKs: 0, resolvedFKs: 0, unresolvedFKs: 0, resolutionPercent: 0, totalTables: 0, tablesWithFKs: 0 },
      fkDetails: [],
      recentAgentRuns: [],
      fallback: true,
    })
  }
}
