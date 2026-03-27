import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id

    // Fetch views from ViewIntelligenceCache
    const views = await db.viewIntelligenceCache.findMany({
      where: { projectId },
      orderBy: { viewName: 'asc' }
    })

    // Transform the data for the IntelligenceTab
    const transformedViews = views.map(v => ({
      id: v.id,
      viewName: v.viewName,
      schemaName: v.schemaName || 'dbo',
      sourceTables: v.sourceTables || '[]',
      joinRelationships: v.joinRelationships || '[]',
      columns: v.columns || '[]',
      calculatedFields: v.calculatedFields || '[]',
      caseStatements: v.caseStatements || '[]',
      purpose: v.purpose || 'unknown',
      businessContext: v.businessContext,
      suggestedReportType: v.suggestedReportType,
      suggestedWidgets: v.suggestedWidgets || '[]',
      enumSuggestions: v.enumSuggestions || '[]',
      apiEndpoints: v.apiEndpoints || '[]',
      complexity: v.complexity || 0,
      hiddenRelationships: v.hiddenRelationships || '[]'
    }))

    // Calculate stats
    let totalSourceTables = 0
    let totalColumns = 0
    views.forEach(v => {
      try {
        const tables = JSON.parse(v.sourceTables || '[]')
        const cols = JSON.parse(v.columns || '[]')
        totalSourceTables += tables.length
        totalColumns += cols.length
      } catch (e) {
        // ignore parse errors
      }
    })

    return NextResponse.json({
      views: transformedViews,
      stats: {
        totalViews: views.length,
        totalSourceTables,
        totalColumns
      }
    })
  } catch (error: any) {
    console.error('Error fetching views:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
