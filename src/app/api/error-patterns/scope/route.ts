/**
 * ERROR PATTERNS SCOPE-AWARE API
 * ==============================
 * Provides scope-aware operations for error pattern management
 * Supports: All Projects, Single Project, Multi-Project modes
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  parseScopeFromRequest,
  buildScopeContext,
  buildErrorPatternFilter,
  ScopeAwareQueryBuilder,
  isValidScope,
  getScopeDescription
} from '@/lib/api/scope-utils'

// =============================================================================
// GET - Fetch Error Patterns with Scope
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    const scope = parseScopeFromRequest(request)
    
    if (!isValidScope(scope)) {
      return NextResponse.json(
        { error: 'Invalid scope parameters', scope },
        { status: 400 }
      )
    }
    
    const scopeContext = await buildScopeContext(scope)
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'list'
    const severity = searchParams.get('severity')
    const type = searchParams.get('type')
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')
    
    console.log(`[Error Patterns] Scope: ${getScopeDescription(scope)}`)
    
    switch (action) {
      case 'stats':
        return await getStats(scopeContext)
      
      case 'list':
        return await getPatterns(scopeContext, { severity, type, status, limit, offset })
      
      case 'detail':
        return await getPatternDetail(scopeContext, searchParams.get('id'))
      
      case 'analysis':
        return await getAnalysis(scopeContext)
      
      default:
        return await getPatterns(scopeContext, { severity, type, status, limit, offset })
    }
  } catch (error) {
    console.error('Error patterns scope API error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}

// =============================================================================
// POST - Manage Error Patterns with Scope
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const scope = parseScopeFromRequest(request)
    const body = await request.json()
    const { action, data, patternId } = body
    
    if (!isValidScope(scope)) {
      return NextResponse.json(
        { error: 'Invalid scope parameters' },
        { status: 400 }
      )
    }
    
    const scopeContext = await buildScopeContext(scope)
    
    switch (action) {
      case 'create':
        return await createPattern(scopeContext, data)
      
      case 'resolve':
        return await resolvePattern(scopeContext, patternId)
      
      case 'ignore':
        return await ignorePattern(scopeContext, patternId)
      
      case 'update':
        return await updatePattern(scopeContext, patternId, data)
      
      case 'bulk-resolve':
        return await bulkResolve(scopeContext, body.patternIds)
      
      default:
        return NextResponse.json(
          { error: 'Unknown action' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Error patterns POST error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

async function getStats(scopeContext: Awaited<ReturnType<typeof buildScopeContext>>) {
  const filter = buildErrorPatternFilter(scopeContext)
  
  const [total, bySeverity, byStatus, byType] = await Promise.all([
    db.errorPattern.count({ where: filter }),
    db.errorPattern.groupBy({
      by: ['severity'],
      where: filter,
      _count: true
    }),
    db.errorPattern.groupBy({
      by: ['patternStatus'],
      where: filter,
      _count: true
    }),
    db.errorPattern.groupBy({
      by: ['errorType'],
      where: filter,
      _count: true
    })
  ])
  
  const stats = {
    total,
    bySeverity: bySeverity.reduce((acc, item) => {
      acc[item.severity || 'unknown'] = item._count
      return acc
    }, {} as Record<string, number>),
    byStatus: byStatus.reduce((acc, item) => {
      acc[item.patternStatus || 'unknown'] = item._count
      return acc
    }, {} as Record<string, number>),
    byType: byType.reduce((acc, item) => {
      acc[item.errorType || 'unknown'] = item._count
      return acc
    }, {} as Record<string, number>),
    critical: bySeverity.find(s => s.severity === 'critical')?._count || 0,
    error: bySeverity.find(s => s.severity === 'error')?._count || 0,
    warning: bySeverity.find(s => s.severity === 'warning')?._count || 0,
    info: bySeverity.find(s => s.severity === 'info')?._count || 0,
    resolved: byStatus.find(s => s.patternStatus === 'RESOLVED')?._count || 0,
    active: byStatus.find(s => s.patternStatus === 'ACTIVE')?._count || 0
  }
  
  return NextResponse.json({
    success: true,
    stats,
    scope: {
      type: scopeContext.scope.type,
      projectId: scopeContext.scope.projectId,
      description: getScopeDescription(scopeContext.scope)
    }
  })
}

async function getPatterns(
  scopeContext: Awaited<ReturnType<typeof buildScopeContext>>,
  options: {
    severity?: string | null
    type?: string | null
    status?: string | null
    limit: number
    offset: number
  }
) {
  const filter = buildErrorPatternFilter(scopeContext)
  
  const where: Record<string, unknown> = { ...filter }
  
  if (options.severity && options.severity !== 'all') {
    where.severity = options.severity
  }
  if (options.type && options.type !== 'all') {
    where.errorType = options.type
  }
  if (options.status && options.status !== 'all') {
    where.patternStatus = options.status
  }
  
  const [patterns, total] = await Promise.all([
    db.errorPattern.findMany({
      where,
      orderBy: { occurrenceCount: 'desc' },
      take: options.limit,
      skip: options.offset
    }),
    db.errorPattern.count({ where })
  ])
  
  return NextResponse.json({
    success: true,
    patterns: patterns.map(p => ({
      id: p.id,
      patternKey: p.patternKey,
      patternName: p.patternName,
      errorType: p.errorType,
      endpoint: p.endpoint,
      httpStatus: p.httpStatus,
      description: p.description,
      occurrenceCount: p.occurrenceCount,
      severity: p.severity,
      rootCause: p.rootCause,
      preventionStrategy: p.preventionStrategy,
      autoFixSolution: p.autoFixSolution,
      firstOccurrence: p.firstOccurrence?.toISOString(),
      lastOccurrence: p.lastOccurrence?.toISOString(),
      patternStatus: p.patternStatus,
      projectId: p.projectId,
      isGlobal: p.projectId === null
    })),
    pagination: {
      total,
      limit: options.limit,
      offset: options.offset,
      hasMore: options.offset + options.limit < total
    },
    scope: {
      type: scopeContext.scope.type,
      projectId: scopeContext.scope.projectId
    }
  })
}

async function getPatternDetail(
  scopeContext: Awaited<ReturnType<typeof buildScopeContext>>,
  patternId: string | null
) {
  if (!patternId) {
    return NextResponse.json(
      { error: 'Pattern ID is required' },
      { status: 400 }
    )
  }
  
  const pattern = await db.errorPattern.findUnique({
    where: { id: patternId }
  })
  
  if (!pattern) {
    return NextResponse.json(
      { error: 'Pattern not found' },
      { status: 404 }
    )
  }
  
  // Verify scope access
  if (scopeContext.scope.type === 'project' && pattern.projectId && pattern.projectId !== scopeContext.scope.projectId) {
    return NextResponse.json(
      { error: 'Pattern not accessible in current scope' },
      { status: 403 }
    )
  }
  
  return NextResponse.json({
    success: true,
    pattern: {
      ...pattern,
      firstOccurrence: pattern.firstOccurrence?.toISOString(),
      lastOccurrence: pattern.lastOccurrence?.toISOString(),
      isGlobal: pattern.projectId === null
    }
  })
}

async function getAnalysis(scopeContext: Awaited<ReturnType<typeof buildScopeContext>>) {
  const filter = buildErrorPatternFilter(scopeContext)
  
  // Get patterns for analysis
  const patterns = await db.errorPattern.findMany({
    where: filter,
    orderBy: { occurrenceCount: 'desc' },
    take: 50
  })
  
  // Analyze patterns
  const analysis = {
    topErrors: patterns.slice(0, 5).map(p => ({
      name: p.patternName,
      count: p.occurrenceCount,
      type: p.errorType
    })),
    errorTypeDistribution: patterns.reduce((acc, p) => {
      acc[p.errorType || 'unknown'] = (acc[p.errorType || 'unknown'] || 0) + 1
      return acc
    }, {} as Record<string, number>),
    endpointErrors: patterns.reduce((acc, p) => {
      if (p.endpoint) {
        acc[p.endpoint] = (acc[p.endpoint] || 0) + p.occurrenceCount
      }
      return acc
    }, {} as Record<string, number>),
    resolutionRate: 0,
    averageOccurrences: 0
  }
  
  const total = patterns.length
  const resolved = patterns.filter(p => p.patternStatus === 'RESOLVED').length
  analysis.resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 0
  analysis.averageOccurrences = total > 0 
    ? Math.round(patterns.reduce((sum, p) => sum + p.occurrenceCount, 0) / total) 
    : 0
  
  return NextResponse.json({
    success: true,
    analysis,
    scope: {
      type: scopeContext.scope.type,
      projectId: scopeContext.scope.projectId
    }
  })
}

async function createPattern(
  scopeContext: Awaited<ReturnType<typeof buildScopeContext>>,
  data: Record<string, unknown>
) {
  // Determine project ID
  const projectId = scopeContext.scope.type === 'project'
    ? scopeContext.scope.projectId
    : data.projectId as string | null
  
  const pattern = await db.errorPattern.create({
    data: {
      patternKey: data.patternKey as string,
      patternName: data.patternName as string,
      errorType: data.errorType as string,
      endpoint: data.endpoint as string,
      httpStatus: data.httpStatus as number,
      description: data.description as string,
      severity: (data.severity as string) || 'info',
      rootCause: data.rootCause as string,
      preventionStrategy: data.preventionStrategy as string,
      autoFixSolution: data.autoFixSolution as string,
      occurrenceCount: 1,
      firstOccurrence: new Date(),
      lastOccurrence: new Date(),
      patternStatus: 'ACTIVE',
      projectId
    }
  })
  
  return NextResponse.json({
    success: true,
    pattern: {
      id: pattern.id,
      name: pattern.patternName,
      isGlobal: pattern.projectId === null,
      projectId: pattern.projectId
    }
  })
}

async function resolvePattern(
  scopeContext: Awaited<ReturnType<typeof buildScopeContext>>,
  patternId: string | undefined
) {
  if (!patternId) {
    return NextResponse.json(
      { error: 'Pattern ID is required' },
      { status: 400 }
    )
  }
  
  const pattern = await db.errorPattern.findUnique({
    where: { id: patternId }
  })
  
  if (!pattern) {
    return NextResponse.json(
      { error: 'Pattern not found' },
      { status: 404 }
    )
  }
  
  // Verify scope access
  if (scopeContext.scope.type === 'project' && pattern.projectId && pattern.projectId !== scopeContext.scope.projectId) {
    return NextResponse.json(
      { error: 'Cannot modify pattern from different project' },
      { status: 403 }
    )
  }
  
  await db.errorPattern.update({
    where: { id: patternId },
    data: {
      patternStatus: 'RESOLVED',
      resolvedAt: new Date()
    }
  })
  
  return NextResponse.json({
    success: true,
    message: 'Pattern marked as resolved'
  })
}

async function ignorePattern(
  scopeContext: Awaited<ReturnType<typeof buildScopeContext>>,
  patternId: string | undefined
) {
  if (!patternId) {
    return NextResponse.json(
      { error: 'Pattern ID is required' },
      { status: 400 }
    )
  }
  
  const pattern = await db.errorPattern.findUnique({
    where: { id: patternId }
  })
  
  if (!pattern) {
    return NextResponse.json(
      { error: 'Pattern not found' },
      { status: 404 }
    )
  }
  
  // Verify scope access
  if (scopeContext.scope.type === 'project' && pattern.projectId && pattern.projectId !== scopeContext.scope.projectId) {
    return NextResponse.json(
      { error: 'Cannot modify pattern from different project' },
      { status: 403 }
    )
  }
  
  await db.errorPattern.update({
    where: { id: patternId },
    data: {
      patternStatus: 'IGNORED'
    }
  })
  
  return NextResponse.json({
    success: true,
    message: 'Pattern ignored'
  })
}

async function updatePattern(
  scopeContext: Awaited<ReturnType<typeof buildScopeContext>>,
  patternId: string | undefined,
  data: Record<string, unknown>
) {
  if (!patternId) {
    return NextResponse.json(
      { error: 'Pattern ID is required' },
      { status: 400 }
    )
  }
  
  const pattern = await db.errorPattern.findUnique({
    where: { id: patternId }
  })
  
  if (!pattern) {
    return NextResponse.json(
      { error: 'Pattern not found' },
      { status: 404 }
    )
  }
  
  // Verify scope access
  if (scopeContext.scope.type === 'project' && pattern.projectId && pattern.projectId !== scopeContext.scope.projectId) {
    return NextResponse.json(
      { error: 'Cannot modify pattern from different project' },
      { status: 403 }
    )
  }
  
  const updated = await db.errorPattern.update({
    where: { id: patternId },
    data: {
      ...data,
      lastOccurrence: new Date()
    }
  })
  
  return NextResponse.json({
    success: true,
    pattern: updated
  })
}

async function bulkResolve(
  scopeContext: Awaited<ReturnType<typeof buildScopeContext>>,
  patternIds: string[] | undefined
) {
  if (!patternIds || !Array.isArray(patternIds)) {
    return NextResponse.json(
      { error: 'Pattern IDs array is required' },
      { status: 400 }
    )
  }
  
  const filter = buildErrorPatternFilter(scopeContext)
  
  // Only resolve patterns in current scope
  const result = await db.errorPattern.updateMany({
    where: {
      id: { in: patternIds },
      ...filter
    },
    data: {
      patternStatus: 'RESOLVED',
      resolvedAt: new Date()
    }
  })
  
  return NextResponse.json({
    success: true,
    resolvedCount: result.count,
    message: `${result.count} patterns resolved`
  })
}
