import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'




// =============================================================================
// GET /api/ai-suggestions - List AI suggestion sessions or suggestions
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    const sessionId = searchParams.get('sessionId')
    const status = searchParams.get('status')
    const targetEntity = searchParams.get('targetEntity')
    const targetType = searchParams.get('targetType')
    const minConfidence = searchParams.get('minConfidence')

    // If sessionId provided, get suggestions for that session
    if (sessionId) {
      const suggestions = await prisma.aISuggestion.findMany({
        where: {
          sessionId,
          ...(status && { status }),
          ...(targetEntity && { targetEntity }),
          ...(targetType && { targetType }),
          ...(minConfidence && { aiConfidence: { gte: parseInt(minConfidence) } })
        },
        orderBy: [
          { riskLevel: 'desc' },
          { aiConfidence: 'desc' }
        ]
      })

      return NextResponse.json({ suggestions })
    }

    // If projectId provided, get sessions for that project
    if (projectId) {
      const sessions = await prisma.aISuggestionSession.findMany({
        where: { projectId },
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { suggestions: true }
          }
        }
      })

      return NextResponse.json({ sessions })
    }

    // Otherwise return all recent sessions
    const sessions = await prisma.aISuggestionSession.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        _count: {
          select: { suggestions: true }
        }
      }
    })

    return NextResponse.json({ sessions })

  } catch (error: any) {
    console.error('Error fetching AI suggestions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch AI suggestions', message: error.message },
      { status: 500 }
    )
  }
}

// =============================================================================
// POST /api/ai-suggestions - Create new AI suggestion session
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      projectId, 
      scope = 'filtered',
      scopeConfig = {},
      triggeredBy,
      suggestions 
    } = body

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      )
    }

    // Create session
    const session = await prisma.aISuggestionSession.create({
      data: {
        projectId,
        scope,
        scopeConfig: JSON.stringify(scopeConfig),
        triggeredBy,
        status: suggestions ? 'completed' : 'pending',
        startedAt: suggestions ? new Date() : null,
        completedAt: suggestions ? new Date() : null,
        totalSuggestions: suggestions?.length || 0,
        pendingCount: suggestions?.length || 0
      }
    })

    // If suggestions provided, create them
    if (suggestions && suggestions.length > 0) {
      await prisma.aISuggestion.createMany({
        data: suggestions.map((s: any) => ({
          sessionId: session.id,
          targetType: s.targetType,
          targetEntity: s.targetEntity,
          targetField: s.targetField,
          targetId: s.targetId,
          currentValue: JSON.stringify(s.currentValue || {}),
          suggestedValue: JSON.stringify(s.suggestedValue || {}),
          aiConfidence: s.aiConfidence || 0,
          aiReason: s.aiReason,
          aiEvidence: JSON.stringify(s.aiEvidence || []),
          aiModel: s.aiModel,
          riskLevel: s.riskLevel || 'low',
          changeCategory: s.changeCategory || 'type_inference',
          status: 'pending'
        }))
      })
    }

    return NextResponse.json({ 
      success: true, 
      session,
      message: `Created session with ${suggestions?.length || 0} suggestions`
    })

  } catch (error: any) {
    console.error('Error creating AI suggestion session:', error)
    return NextResponse.json(
      { error: 'Failed to create AI suggestion session', message: error.message },
      { status: 500 }
    )
  }
}

// =============================================================================
// PUT /api/ai-suggestions - Bulk update suggestions (batch approve/reject)
// =============================================================================

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      action, 
      sessionIds, 
      suggestionIds,
      decisionBy 
    } = body

    if (action === 'approve_all' && sessionIds?.length > 0) {
      // Approve all pending suggestions in specified sessions
      const result = await prisma.aISuggestion.updateMany({
        where: {
          sessionId: { in: sessionIds },
          status: 'pending'
        },
        data: {
          status: 'approved',
          decisionBy,
          decisionAt: new Date()
        }
      })

      // Update session counts
      for (const sessionId of sessionIds) {
        await updateSessionCounts(sessionId)
      }

      return NextResponse.json({ 
        success: true, 
        message: `Approved ${result.count} suggestions`,
        count: result.count
      })
    }

    if (action === 'reject_all' && sessionIds?.length > 0) {
      const result = await prisma.aISuggestion.updateMany({
        where: {
          sessionId: { in: sessionIds },
          status: 'pending'
        },
        data: {
          status: 'rejected',
          decisionBy,
          decisionAt: new Date()
        }
      })

      for (const sessionId of sessionIds) {
        await updateSessionCounts(sessionId)
      }

      return NextResponse.json({ 
        success: true, 
        message: `Rejected ${result.count} suggestions`,
        count: result.count
      })
    }

    return NextResponse.json(
      { error: 'Invalid action or missing parameters' },
      { status: 400 }
    )

  } catch (error: any) {
    console.error('Error updating AI suggestions:', error)
    return NextResponse.json(
      { error: 'Failed to update AI suggestions', message: error.message },
      { status: 500 }
    )
  }
}

// =============================================================================
// DELETE /api/ai-suggestions - Delete session and all suggestions
// =============================================================================

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      )
    }

    // Delete all suggestions first (cascade should handle this, but be explicit)
    await prisma.aISuggestion.deleteMany({
      where: { sessionId }
    })

    // Delete session
    await prisma.aISuggestionSession.delete({
      where: { id: sessionId }
    })

    return NextResponse.json({ 
      success: true,
      message: 'Session deleted successfully'
    })

  } catch (error: any) {
    console.error('Error deleting AI suggestion session:', error)
    return NextResponse.json(
      { error: 'Failed to delete AI suggestion session', message: error.message },
      { status: 500 }
    )
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

async function updateSessionCounts(sessionId: string) {
  const counts = await prisma.aISuggestion.groupBy({
    by: ['status'],
    where: { sessionId },
    _count: true
  })

  const countMap = Object.fromEntries(
    counts.map(c => [c.status, c._count])
  )

  await prisma.aISuggestionSession.update({
    where: { id: sessionId },
    data: {
      pendingCount: countMap['pending'] || 0,
      approvedCount: countMap['approved'] || 0,
      rejectedCount: countMap['rejected'] || 0,
      appliedCount: countMap['applied'] || 0,
      revertedCount: countMap['reverted'] || 0
    }
  })
}
