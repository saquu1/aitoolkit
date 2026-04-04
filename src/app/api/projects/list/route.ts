import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const projects = await db.toolkitProject.findMany({
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: { select: { ToolkitTable: true, ToolkitProcedure: true } }
      }
    })

    // Also get module count per project from HISModule
    const modules = await db.hISModule.findMany({
      select: { id: true, moduleName: true }
    })

    return NextResponse.json({
      success: true,
      projects: projects.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description || '',
        softwareType: p.softwareType || '',
        status: p.status || 'unknown',
        color: p.color || '#6366f1',
        icon: p.icon || 'Database',
        tableCount: p._count.ToolkitTable,
        procedureCount: p._count.ToolkitProcedure,
        lastUpdated: p.updatedAt,
        createdAt: p.createdAt,
      })),
      totalModules: modules.length,
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, projects: [], error: error.message }, { status: 500 })
  }
}
