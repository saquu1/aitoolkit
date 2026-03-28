import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')

    if (projectId) {
      // Get stats for a specific project
      const project = await prisma.toolkitProject.findUnique({
        where: { id: projectId },
        include: {
          ToolkitTable: true,
          ToolkitProcedure: true,
          _count: {
            select: {
              ToolkitTable: true,
              ToolkitProcedure: true
            }
          }
        }
      })

      if (!project) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 })
      }

      // Calculate FK stats
      let totalFKs = 0
      let resolvedFKs = 0
      const tableNames = new Set(project.ToolkitTable.map(t => t.tableName.toLowerCase()))

      project.ToolkitTable.forEach(table => {
        try {
          const fks = JSON.parse(table.foreignKeys || '[]')
          fks.forEach((fk: any) => {
            totalFKs++
            if (tableNames.has(fk.referencesTable?.toLowerCase())) {
              resolvedFKs++
            }
          })
        } catch (e) {}
      })

      // Calculate total columns
      let totalColumns = 0
      project.ToolkitTable.forEach(table => {
        try {
          const columns = JSON.parse(table.columns || '[]')
          totalColumns += columns.length
        } catch (e) {}
      })

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
          fkResolvedPercent: totalFKs > 0 ? Math.round((resolvedFKs / totalFKs) * 100) : 0,
          lastSync: project.updatedAt
        }
      })
    }

    // Get aggregate stats across all projects
    const projects = await prisma.toolkitProject.findMany({
      include: {
        ToolkitTable: true,
        ToolkitProcedure: true
      }
    })

    let totalTables = 0
    let totalColumns = 0
    let totalProcedures = 0
    let totalFKs = 0
    let resolvedFKs = 0
    let lastSync: Date | null = null

    projects.forEach(project => {
      totalTables += project.ToolkitTable.length
      totalProcedures += project.ToolkitProcedure.length

      // Get all table names for FK resolution
      const tableNames = new Set(project.ToolkitTable.map(t => t.tableName.toLowerCase()))

      project.ToolkitTable.forEach(table => {
        try {
          const columns = JSON.parse(table.columns || '[]')
          totalColumns += columns.length

          const fks = JSON.parse(table.foreignKeys || '[]')
          fks.forEach((fk: any) => {
            totalFKs++
            if (tableNames.has(fk.referencesTable?.toLowerCase())) {
              resolvedFKs++
            }
          })
        } catch (e) {}
      })

      // Track most recent sync
      if (!lastSync || new Date(project.updatedAt) > lastSync) {
        lastSync = new Date(project.updatedAt)
      }
    })

    return NextResponse.json({
      success: true,
      stats: {
        totalProjects: projects.length,
        totalTables,
        totalColumns,
        totalProcedures,
        fkRelationships: totalFKs,
        fkResolved: resolvedFKs,
        fkResolvedPercent: totalFKs > 0 ? Math.round((resolvedFKs / totalFKs) * 100) : 0,
        lastSync: lastSync?.toISOString() || null
      }
    })
  } catch (error: any) {
    console.error('Error getting schema stats:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get schema stats' },
      { status: 500 }
    )
  }
}
