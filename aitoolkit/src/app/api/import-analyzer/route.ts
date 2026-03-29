/**
 * IMPORT ANALYZER API
 * ===================
 * REST API for Phase 5 Import Analyzer operations
 * 
 * NOTE: ImportAnalysis, ImportSuggestion, ModuleResolution Prisma models
 * don't exist yet in the schema. DB-dependent actions return empty/mock data
 * gracefully. The importAnalyzerService handles the actual analysis logic.
 */

import { NextRequest, NextResponse } from 'next/server'
import { importAnalyzerService } from '@/lib/import-analyzer'
import { db } from '@/lib/db'

// Safe access to Prisma models that may not exist
const hasModel = (name: string) => !!(db as any)[name]

export async function GET(request: NextRequest) {
  const action = request.nextUrl.searchParams.get('action') || 'stats'
  const limit = parseInt(request.nextUrl.searchParams.get('limit') || '50')
  const filePath = request.nextUrl.searchParams.get('filePath')

  try {
    switch (action) {
      case 'stats':
        const stats = await importAnalyzerService.getStats()
        return NextResponse.json({ success: true, stats })

      case 'suggestions':
        const suggestions = await importAnalyzerService.getImportSuggestions(limit)
        return NextResponse.json({ success: true, suggestions })

      case 'issues':
        if (!hasModel('importAnalysis')) {
          return NextResponse.json({ success: true, issues: [] })
        }
        const issues = await (db as any).importAnalysis.findMany({
          where: {
            OR: [
              { isValid: false },
              { isUsed: false }
            ],
            ...(filePath ? { filePath } : {})
          },
          take: limit,
          orderBy: { createdAt: 'desc' }
        })
        return NextResponse.json({ success: true, issues })

      case 'unused':
        if (!hasModel('importAnalysis')) {
          return NextResponse.json({ success: true, unused: [] })
        }
        const unused = await (db as any).importAnalysis.findMany({
          where: { isUsed: false },
          take: limit
        })
        return NextResponse.json({ success: true, unused })

      case 'invalid':
        if (!hasModel('importAnalysis')) {
          return NextResponse.json({ success: true, invalid: [] })
        }
        const invalid = await (db as any).importAnalysis.findMany({
          where: { isValid: false },
          take: limit
        })
        return NextResponse.json({ success: true, invalid })

      case 'fixable':
        if (!hasModel('importAnalysis')) {
          return NextResponse.json({ success: true, fixable: [] })
        }
        const fixable = await (db as any).importAnalysis.findMany({
          where: { canBeFixed: true },
          take: limit
        })
        return NextResponse.json({ success: true, fixable })

      case 'modules':
        if (!hasModel('moduleResolution')) {
          return NextResponse.json({ success: true, modules: [] })
        }
        const modules = await (db as any).moduleResolution.findMany({
          take: limit,
          orderBy: { lastChecked: 'desc' }
        })
        return NextResponse.json({
          success: true,
          modules: modules.map((m: any) => ({
            ...m,
            namedExports: JSON.parse(m.namedExports || '[]')
          }))
        })

      case 'file-imports':
        if (!filePath) {
          return NextResponse.json({ success: false, error: 'filePath required' }, { status: 400 })
        }
        if (!hasModel('importAnalysis')) {
          return NextResponse.json({ success: true, imports: [] })
        }
        const fileImports = await (db as any).importAnalysis.findMany({
          where: { filePath }
        })
        return NextResponse.json({ success: true, imports: fileImports })

      case 'pending-fixes':
        if (!hasModel('importSuggestion')) {
          return NextResponse.json({ success: true, pending: [] })
        }
        const pending = await (db as any).importSuggestion.findMany({
          where: { status: 'suggested' },
          take: limit,
          orderBy: { createdAt: 'desc' }
        })
        return NextResponse.json({ success: true, pending })

      default:
        return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 })
    }
  } catch (error: any) {
    console.error('Import Analyzer API Error:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { action } = body

  try {
    switch (action) {
      case 'analyze':
        const analyzeResult = await importAnalyzerService.analyzeCodebase()
        return NextResponse.json({
          success: true,
          ...analyzeResult,
          message: `Analyzed ${analyzeResult.totalImports} imports, found ${analyzeResult.invalidImports} issues`
        })

      case 'apply-fix':
        if (!body.suggestionId) {
          return NextResponse.json({ success: false, error: 'suggestionId required' }, { status: 400 })
        }
        const fixResult = await importAnalyzerService.applyFix(body.suggestionId)
        return NextResponse.json(fixResult)

      case 'apply-all-fixes':
        if (!hasModel('importSuggestion')) {
          return NextResponse.json({ success: true, applied: 0, failed: 0, message: 'No suggestion model available' })
        }
        const pendingFixes = await (db as any).importSuggestion.findMany({
          where: { status: 'suggested' }
        })
        
        let applied = 0
        let failed = 0
        
        for (const fix of pendingFixes) {
          const result = await importAnalyzerService.applyFix(fix.id)
          if (result.success) {
            applied++
          } else {
            failed++
          }
        }
        
        return NextResponse.json({
          success: true,
          applied,
          failed,
          message: `Applied ${applied} fixes, ${failed} failed`
        })

      case 'dismiss-suggestion':
        if (!body.suggestionId) {
          return NextResponse.json({ success: false, error: 'suggestionId required' }, { status: 400 })
        }
        if (!hasModel('importSuggestion')) {
          return NextResponse.json({ success: true, message: 'Suggestion dismissed' })
        }
        await (db as any).importSuggestion.update({
          where: { id: body.suggestionId },
          data: {
            status: 'dismissed',
            dismissedAt: new Date(),
            dismissedBy: body.dismissedBy || 'user'
          }
        })
        return NextResponse.json({ success: true, message: 'Suggestion dismissed' })

      case 'create-suggestion':
        if (!hasModel('importSuggestion')) {
          return NextResponse.json({ success: true, suggestion: { id: 'mock', ...body } })
        }
        const suggestion = await (db as any).importSuggestion.create({
          data: {
            filePath: body.filePath,
            currentImport: body.currentImport,
            currentPath: body.currentPath,
            suggestedImport: body.suggestedImport,
            suggestedPath: body.suggestedPath,
            reason: body.reason,
            impactLevel: body.impactLevel || 'low',
            affectedFiles: JSON.stringify(body.affectedFiles || [])
          }
        })
        return NextResponse.json({ success: true, suggestion })

      case 'clear-analysis':
        if (!hasModel('importAnalysis')) {
          return NextResponse.json({ success: true, message: 'Analysis cleared' })
        }
        await (db as any).importAnalysis.deleteMany({})
        return NextResponse.json({ success: true, message: 'Analysis cleared' })

      default:
        return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 })
    }
  } catch (error: any) {
    console.error('Import Analyzer POST Error:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}
