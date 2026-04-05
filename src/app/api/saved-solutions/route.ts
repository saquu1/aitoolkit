/**
 * SAVED SOLUTIONS API
 * ===================
 * Store and retrieve successful error fixes for reuse
 * 
 * Features:
 * - Save successful AI fixes
 * - Reuse solutions for similar errors
 * - Track confidence and success rate
 * - Search solutions by error pattern
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// =============================================================================
// GET - Retrieve Saved Solutions
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'list'
    const errorType = searchParams.get('errorType')
    const httpStatus = searchParams.get('httpStatus')
    const pattern = searchParams.get('pattern')
    const limit = parseInt(searchParams.get('limit') || '20')
    
    switch (action) {
      case 'stats':
        return await getStats()
      
      case 'search':
        return await searchSolutions({ errorType, httpStatus, pattern, limit })
      
      case 'match':
        return await findMatchingSolution(searchParams)
      
      case 'list':
      default:
        return await listSolutions(limit)
    }
  } catch (error) {
    console.error('Saved solutions GET error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve solutions' },
      { status: 500 }
    )
  }
}

// =============================================================================
// POST - Save/Update Solution
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, data, solutionId } = body
    
    switch (action) {
      case 'create':
        return await createSolution(data)
      
      case 'update':
        return await updateSolution(solutionId, data)
      
      case 'apply':
        return await applySolution(solutionId)
      
      case 'report-success':
        return await reportSuccess(solutionId)
      
      case 'report-failure':
        return await reportFailure(solutionId)
      
      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Saved solutions POST error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to process solution' },
      { status: 500 }
    )
  }
}

// =============================================================================
// DELETE - Remove Solution
// =============================================================================

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const solutionId = searchParams.get('solutionId')
    
    if (!solutionId) {
      return NextResponse.json(
        { success: false, error: 'Solution ID required' },
        { status: 400 }
      )
    }
    
    await db.savedErrorSolution.delete({
      where: { id: solutionId }
    })
    
    return NextResponse.json({
      success: true,
      message: 'Solution deleted'
    })
  } catch (error) {
    console.error('Saved solutions DELETE error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete solution' },
      { status: 500 }
    )
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

async function getStats() {
  const [total, byType, topSolutions] = await Promise.all([
    db.savedErrorSolution.count(),
    db.savedErrorSolution.groupBy({
      by: ['errorType'],
      _count: true,
      orderBy: { _count: { errorType: 'desc' } }
    }),
    db.savedErrorSolution.findMany({
      orderBy: [
        { successRate: 'desc' },
        { usageCount: 'desc' }
      ],
      take: 5,
      select: {
        id: true,
        errorType: true,
        solution: true,
        confidence: true,
        successRate: true,
        usageCount: true
      }
    })
  ])
  
  return NextResponse.json({
    success: true,
    stats: {
      total,
      byType: byType.map(t => ({ type: t.errorType, count: t._count })),
      topSolutions
    }
  })
}

async function listSolutions(limit: number) {
  const solutions = await db.savedErrorSolution.findMany({
    orderBy: [
      { successRate: 'desc' },
      { usageCount: 'desc' },
      { updatedAt: 'desc' }
    ],
    take: limit
  })
  
  return NextResponse.json({
    success: true,
    solutions: solutions.map(s => ({
      id: s.id,
      errorType: s.errorType,
      httpStatus: s.httpStatus,
      errorPattern: s.errorPattern,
      solution: s.solution,
      codeFix: s.codeFix,
      confidence: s.confidence,
      successRate: s.successRate,
      usageCount: s.usageCount,
      lastUsedAt: s.lastUsedAt?.toISOString(),
      createdAt: s.createdAt.toISOString()
    }))
  })
}

async function searchSolutions(options: {
  errorType?: string | null
  httpStatus?: string | null
  pattern?: string | null
  limit: number
}) {
  const { errorType, httpStatus, pattern, limit } = options
  
  const where: Record<string, unknown> = {}
  
  if (errorType) {
    where.errorType = { contains: errorType, mode: 'insensitive' }
  }
  if (httpStatus) {
    where.httpStatus = parseInt(httpStatus)
  }
  if (pattern) {
    where.errorPattern = { contains: pattern, mode: 'insensitive' }
  }
  
  const solutions = await db.savedErrorSolution.findMany({
    where,
    orderBy: [
      { successRate: 'desc' },
      { usageCount: 'desc' }
    ],
    take: limit
  })
  
  return NextResponse.json({
    success: true,
    solutions: solutions.map(s => ({
      id: s.id,
      errorType: s.errorType,
      httpStatus: s.httpStatus,
      errorPattern: s.errorPattern,
      solution: s.solution,
      codeFix: s.codeFix,
      confidence: s.confidence,
      successRate: s.successRate,
      usageCount: s.usageCount
    }))
  })
}

async function findMatchingSolution(searchParams: URLSearchParams) {
  const errorType = searchParams.get('errorType')
  const httpStatus = searchParams.get('httpStatus')
  const endpoint = searchParams.get('endpoint')
  
  const where: Record<string, unknown> = {
    successRate: { gte: 70 } // Only return solutions with good success rate
  }
  
  if (errorType) where.errorType = errorType
  if (httpStatus) where.httpStatus = parseInt(httpStatus)
  
  // Try to find exact match first
  let solution = await db.savedErrorSolution.findFirst({
    where,
    orderBy: [
      { successRate: 'desc' },
      { usageCount: 'desc' }
    ]
  })
  
  // If no exact match, try fuzzy match on error pattern
  if (!solution && endpoint) {
    solution = await db.savedErrorSolution.findFirst({
      where: {
        ...where,
        errorPattern: { contains: endpoint.split('?')[0], mode: 'insensitive' }
      },
      orderBy: [
        { successRate: 'desc' },
        { usageCount: 'desc' }
      ]
    })
  }
  
  return NextResponse.json({
    success: true,
    found: !!solution,
    solution: solution ? {
      id: solution.id,
      errorType: solution.errorType,
      httpStatus: solution.httpStatus,
      errorPattern: solution.errorPattern,
      solution: solution.solution,
      codeFix: solution.codeFix,
      confidence: solution.confidence,
      successRate: solution.successRate,
      usageCount: solution.usageCount
    } : null
  })
}

async function createSolution(data: Record<string, unknown>) {
  // Check if similar solution exists
  const existing = await db.savedErrorSolution.findFirst({
    where: {
      errorType: data.errorType as string,
      httpStatus: data.httpStatus as number,
      errorPattern: data.errorPattern as string
    }
  })
  
  if (existing) {
    // Update existing solution
    const updated = await db.savedErrorSolution.update({
      where: { id: existing.id },
      data: {
        solution: data.solution as string,
        codeFix: data.codeFix as string || null,
        confidence: Math.min(100, existing.confidence + 5), // Increase confidence
        successRate: Math.min(100, existing.successRate),
        updatedAt: new Date()
      }
    })
    
    return NextResponse.json({
      success: true,
      solution: updated,
      message: 'Solution updated (existing)'
    })
  }
  
  // Create new solution
  const solution = await db.savedErrorSolution.create({
    data: {
      errorType: data.errorType as string,
      httpStatus: (data.httpStatus as number) || 0,
      errorPattern: (data.errorPattern as string) || '',
      solution: data.solution as string,
      codeFix: (data.codeFix as string) || null,
      confidence: (data.confidence as number) || 80,
      successRate: 100, // Start with 100% for new solutions
      usageCount: 0
    }
  })
  
  return NextResponse.json({
    success: true,
    solution,
    message: 'Solution created'
  })
}

async function updateSolution(solutionId: string | undefined, data: Record<string, unknown>) {
  if (!solutionId) {
    return NextResponse.json(
      { success: false, error: 'Solution ID required' },
      { status: 400 }
    )
  }
  
  const solution = await db.savedErrorSolution.update({
    where: { id: solutionId },
    data: {
      ...data,
      updatedAt: new Date()
    }
  })
  
  return NextResponse.json({
    success: true,
    solution
  })
}

async function applySolution(solutionId: string | undefined) {
  if (!solutionId) {
    return NextResponse.json(
      { success: false, error: 'Solution ID required' },
      { status: 400 }
    )
  }
  
  const solution = await db.savedErrorSolution.update({
    where: { id: solutionId },
    data: {
      usageCount: { increment: 1 },
      lastUsedAt: new Date()
    }
  })
  
  return NextResponse.json({
    success: true,
    solution,
    message: 'Solution applied, usage count incremented'
  })
}

async function reportSuccess(solutionId: string | undefined) {
  if (!solutionId) {
    return NextResponse.json(
      { success: false, error: 'Solution ID required' },
      { status: 400 }
    )
  }
  
  const solution = await db.savedErrorSolution.findUnique({
    where: { id: solutionId }
  })
  
  if (!solution) {
    return NextResponse.json(
      { success: false, error: 'Solution not found' },
      { status: 404 }
    )
  }
  
  // Increase success rate (capped at 100)
  const newSuccessRate = Math.min(100, solution.successRate + 2)
  
  await db.savedErrorSolution.update({
    where: { id: solutionId },
    data: {
      successRate: newSuccessRate,
      confidence: Math.min(100, solution.confidence + 1)
    }
  })
  
  return NextResponse.json({
    success: true,
    message: 'Success reported',
    newSuccessRate
  })
}

async function reportFailure(solutionId: string | undefined) {
  if (!solutionId) {
    return NextResponse.json(
      { success: false, error: 'Solution ID required' },
      { status: 400 }
    )
  }
  
  const solution = await db.savedErrorSolution.findUnique({
    where: { id: solutionId }
  })
  
  if (!solution) {
    return NextResponse.json(
      { success: false, error: 'Solution not found' },
      { status: 404 }
    )
  }
  
  // Decrease success rate (minimum 0)
  const newSuccessRate = Math.max(0, solution.successRate - 5)
  const newConfidence = Math.max(0, solution.confidence - 3)
  
  await db.savedErrorSolution.update({
    where: { id: solutionId },
    data: {
      successRate: newSuccessRate,
      confidence: newConfidence
    }
  })
  
  return NextResponse.json({
    success: true,
    message: 'Failure reported',
    newSuccessRate,
    newConfidence
  })
}
