import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const modules = await db.hISModule.findMany({
      orderBy: { priority: 'asc' },
    })

    return NextResponse.json({
      success: true,
      modules: modules.map(m => ({
        id: m.id,
        moduleKey: m.moduleKey || '',
        moduleName: m.moduleName || '',
        description: m.description || '',
        layer: m.layer || 0,
        layerName: m.layerName || '',
        priority: m.priority || 'medium',
        estimatedDays: m.estimatedDays || 0,
        status: m.status || 'pending',
        progress: m.progress || 0,
        assignedTo: m.assignedTo || '',
        revenue: m.revenue ?? false,
        notes: m.notes || '',
        createdAt: m.createdAt,
      })),
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, modules: [], error: error.message }, { status: 500 })
  }
}
