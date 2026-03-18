import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { 
  calculateConfidence, 
  scoreEntity, 
  batchScoreEntities,
  getConfidenceScore,
  verifyEntity,
  getLowConfidenceEntities,
  calculateQualityMetrics,
  initializeDefaultFactors
} from '@/lib/confidence-engine'
import {
  detectConflicts,
  getPendingConflicts,
  getConflictStats,
  initializeDefaultRules
} from '@/lib/conflict-detector'
import {
  resolveConflict,
  autoResolveConflicts,
  getResolutionStats,
  dismissConflict
} from '@/lib/conflict-resolver'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, ...params } = body

    switch (action) {
      // ============================================================
      // CONFIDENCE SCORING ACTIONS
      // ============================================================
      
      case 'score-entity': {
        const result = await scoreEntity(params)
        return NextResponse.json({ success: true, result })
      }

      case 'batch-score': {
        const { entities } = params
        const results = await batchScoreEntities(entities)
        return NextResponse.json({ 
          success: true, 
          results: Array.from(results.entries()) 
        })
      }

      case 'get-score': {
        const { entityType, entityId } = params
        const result = await getConfidenceScore(entityType, entityId)
        return NextResponse.json({ success: true, result })
      }

      case 'verify-entity': {
        const { entityType, entityId, verifiedBy, notes } = params
        const result = await verifyEntity(entityType, entityId, verifiedBy, notes)
        return NextResponse.json({ success: true, result })
      }

      // ============================================================
      // CONFLICT DETECTION ACTIONS
      // ============================================================

      case 'detect-conflicts': {
        const conflicts = await detectConflicts(params)
        return NextResponse.json({ success: true, conflicts })
      }

      case 'get-pending-conflicts': {
        const { projectId, limit } = params
        const conflicts = await getPendingConflicts(projectId, limit)
        return NextResponse.json({ success: true, conflicts })
      }

      // ============================================================
      // CONFLICT RESOLUTION ACTIONS
      // ============================================================

      case 'resolve-conflict': {
        const result = await resolveConflict(params)
        return NextResponse.json(result)
      }

      case 'auto-resolve': {
        const result = await autoResolveConflicts()
        return NextResponse.json({ success: true, ...result })
      }

      case 'dismiss-conflict': {
        const { conflictId, dismissedBy, reason } = params
        const success = await dismissConflict(conflictId, dismissedBy, reason)
        return NextResponse.json({ success })
      }

      // ============================================================
      // INITIALIZATION ACTIONS
      // ============================================================

      case 'initialize': {
        await initializeDefaultFactors()
        await initializeDefaultRules()
        return NextResponse.json({ success: true, message: 'Quality system initialized' })
      }

      default:
        return NextResponse.json(
          { error: 'Unknown action', message: `Action '${action}' is not supported` },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('[Quality API] Error:', error)
    return NextResponse.json(
      { error: 'Internal Server Error', message: String(error) },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    switch (action) {
      // ============================================================
      // STATISTICS ACTIONS
      // ============================================================

      case 'quality-metrics': {
        const projectId = searchParams.get('projectId') || undefined
        const metrics = await calculateQualityMetrics(projectId!)
        return NextResponse.json({ success: true, metrics })
      }

      case 'conflict-stats': {
        const projectId = searchParams.get('projectId') || undefined
        const stats = await getConflictStats(projectId)
        return NextResponse.json({ success: true, stats })
      }

      case 'resolution-stats': {
        const projectId = searchParams.get('projectId') || undefined
        const stats = await getResolutionStats(projectId)
        return NextResponse.json({ success: true, stats })
      }

      // ============================================================
      // LIST ACTIONS
      // ============================================================

      case 'low-confidence': {
        const projectId = searchParams.get('projectId') || undefined
        const limit = parseInt(searchParams.get('limit') || '50')
        const entities = await getLowConfidenceEntities(projectId, limit)
        return NextResponse.json({ success: true, entities })
      }

      case 'pending-conflicts': {
        const projectId = searchParams.get('projectId') || undefined
        const limit = parseInt(searchParams.get('limit') || '50')
        const conflicts = await getPendingConflicts(projectId, limit)
        return NextResponse.json({ success: true, conflicts })
      }

      default:
        return NextResponse.json(
          { error: 'Unknown action', message: `GET action '${action}' is not supported` },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('[Quality API] Error:', error)
    return NextResponse.json(
      { error: 'Internal Server Error', message: String(error) },
      { status: 500 }
    )
  }
}
