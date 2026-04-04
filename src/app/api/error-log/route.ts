/**
 * ERROR LOG API
 * =============
 * Stores and retrieves error logs for analysis with Prisma
 *
 * Features:
 * - Log errors from frontend
 * - Query error history
 * - Error statistics
 * - Pattern detection integration
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// =============================================================================
// TYPES
// =============================================================================

interface ErrorLogInput {
  id: string
  timestamp: string
  status: number
  statusText: string
  type: string
  severity: string
  message: string
  hint?: string
  endpoint: string
  method: string
  requestId: string
  duration?: number
  context?: Record<string, any>
  retryable: boolean
  retryCount?: number
  userAgent?: string
  url?: string
}

// =============================================================================
// POST - Log error
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))

    // Validate required fields - return early if essential fields are missing
    if (!body.endpoint || !body.message || !body.status) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: endpoint, message, status',
      }, { status: 400 })
    }

    const error: ErrorLogInput = {
      id: body.id || `err_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      timestamp: body.timestamp || new Date().toISOString(),
      status: Number(body.status) || 500,
      statusText: body.statusText || 'Internal Server Error',
      type: body.type || 'SERVER_FAILURE',
      severity: body.severity || 'medium',
      message: body.message || 'Unknown error',
      endpoint: body.endpoint || '',
      method: body.method || 'POST',
      requestId: body.requestId || '',
      retryable: body.retryable ?? false,
      retryCount: body.retryCount || 0,
      userAgent: body.userAgent || null,
      url: body.url || null,
      hint: body.hint || null,
      duration: body.duration || null,
      context: body.context || {},
    }

    // Check for pattern match first
    const existingPattern = await findMatchingPattern(error)

    // Store error log in database
    const errorLog = await db.errorLog.create({
      data: {
        id: error.id,
        requestId: error.requestId,
        timestamp: new Date(error.timestamp),
        status: error.status,
        statusText: error.statusText,
        type: error.type,
        severity: error.severity,
        message: error.message,
        hint: error.hint || null,
        endpoint: error.endpoint,
        method: error.method,
        duration: error.duration || null,
        context: JSON.stringify(error.context || {}),
        retryable: error.retryable,
        retryCount: error.retryCount || 0,
        userAgent: error.userAgent || null,
        url: error.url || null,
        patternId: existingPattern?.id || null,
      }
    })

    // Update pattern occurrence count if matched
    if (existingPattern) {
      await db.errorPattern.update({
        where: { id: existingPattern.id },
        data: {
          occurrenceCount: { increment: 1 },
          lastOccurrence: new Date(),
        }
      })
    } else {
      // Check if we should create a new pattern (3+ similar errors)
      await checkAndCreatePattern(error)
    }

    console.log('📝 ERROR LOG:', {
      type: error.type,
      severity: error.severity,
      status: error.status,
      endpoint: error.endpoint,
      message: error.message,
      patternMatched: !!existingPattern,
    })

    return NextResponse.json({
      success: true,
      logged: true,
      errorId: errorLog.id,
      patternMatched: !!existingPattern,
      patternId: existingPattern?.id || null,
    })

  } catch (err: any) {
    console.error('Error logging API error:', err?.message || err)
    console.error('Stack:', err?.stack)
    return NextResponse.json({
      success: false,
      error: 'Failed to log error',
      detail: err?.message || String(err),
    }, { status: 500 })
  }
}

// =============================================================================
// GET - Query error logs
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const severity = searchParams.get('severity')
    const type = searchParams.get('type')
    const endpoint = searchParams.get('endpoint')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Get error statistics
    if (action === 'stats') {
      const stats = await getErrorStats()
      return NextResponse.json({
        success: true,
        stats,
      })
    }

    // Get errors by pattern
    if (action === 'patterns') {
      const patterns = await getErrorPatterns()
      return NextResponse.json({
        success: true,
        patterns,
      })
    }

    // Get recent errors
    if (action === 'recent') {
      const errors = await getRecentErrors(limit)
      return NextResponse.json({
        success: true,
        errors,
      })
    }

    // Get unacknowledged errors count
    if (action === 'unacknowledged') {
      const count = await db.errorLog.count({
        where: { acknowledged: false }
      })
      return NextResponse.json({
        success: true,
        count,
      })
    }

    // Default: list errors with filters
    const errors = await getErrors({ severity, type, endpoint, limit, offset })

    return NextResponse.json({
      success: true,
      errors,
    })

  } catch (error) {
    console.error('Error in error log GET:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve error logs',
    }, { status: 500 })
  }
}

// =============================================================================
// PUT - Acknowledge errors
// =============================================================================

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, errorId, patternId } = body

    if (action === 'acknowledge' && errorId) {
      await db.errorLog.update({
        where: { id: errorId },
        data: {
          acknowledged: true,
          acknowledgedAt: new Date()
        }
      })
      return NextResponse.json({ success: true })
    }

    if (action === 'acknowledge-all') {
      await db.errorLog.updateMany({
        where: { acknowledged: false },
        data: {
          acknowledged: true,
          acknowledgedAt: new Date()
        }
      })
      return NextResponse.json({ success: true })
    }

    if (action === 'resolve-pattern' && patternId) {
      await db.errorPattern.update({
        where: { id: patternId },
        data: { patternStatus: 'RESOLVED' }
      })
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({
      success: false,
      error: 'Invalid action'
    }, { status: 400 })

  } catch (error) {
    console.error('Error in error log PUT:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to update error log',
    }, { status: 500 })
  }
}

// =============================================================================
// DELETE - Clear errors
// =============================================================================

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    if (action === 'clear-all') {
      await db.errorLog.deleteMany({})
      return NextResponse.json({ success: true, message: 'All errors cleared' })
    }

    if (action === 'clear-acknowledged') {
      await db.errorLog.deleteMany({
        where: { acknowledged: true }
      })
      return NextResponse.json({ success: true, message: 'Acknowledged errors cleared' })
    }

    const errorId = searchParams.get('errorId')
    if (errorId) {
      await db.errorLog.delete({
        where: { id: errorId }
      })
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({
      success: false,
      error: 'Invalid action'
    }, { status: 400 })

  } catch (error) {
    console.error('Error in error log DELETE:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to delete error log',
    }, { status: 500 })
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

async function findMatchingPattern(error: ErrorLogInput) {
  const endpointBase = (error.endpoint || '').split('?')[0]
  // Try to find an existing pattern for this error type
  const pattern = await db.errorPattern.findFirst({
    where: {
      OR: [
        // Match by endpoint + status
        {
          endpoint: error.endpoint,
          httpStatus: error.status,
          patternStatus: { in: ['ACTIVE', 'MONITORING'] }
        },
        // Match by error type + endpoint pattern
        {
          errorType: error.type,
          endpoint: { contains: endpointBase },
          patternStatus: { in: ['ACTIVE', 'MONITORING'] }
        }
      ]
    }
  })

  return pattern
}

async function checkAndCreatePattern(error: ErrorLogInput) {
  // Check if this error occurred 3+ times in the last 24 hours
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)

  const similarCount = await db.errorLog.count({
    where: {
      endpoint: error.endpoint,
      status: error.status,
      timestamp: { gte: oneDayAgo }
    }
  })

  // Create pattern if threshold reached
  if (similarCount >= 3) {
    const patternKey = `${error.type}_${error.endpoint.split('?')[0]}_${error.status}`.replace(/[^a-zA-Z0-9_]/g, '_')

    // Check if pattern already exists
    const existing = await db.errorPattern.findUnique({
      where: { patternKey }
    })

    if (!existing) {
      await db.errorPattern.create({
        data: {
          patternKey,
          patternName: `${error.type} - ${error.endpoint.split('?')[0]}`,
          errorType: error.type,
          endpoint: error.endpoint.split('?')[0],
          httpStatus: error.status,
          description: error.message || 'Unknown error',
          rootCause: error.hint || null,
          occurrenceCount: similarCount,
          severity: error.severity || 'warning',
          firstOccurrence: oneDayAgo,
          lastOccurrence: new Date(),
        }
      })

      console.log(`🔍 NEW PATTERN DETECTED: ${patternKey}`)
    }
  }
}

async function getErrorStats() {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)

  const [bySeverity, byType, topEndpoints, total, unacknowledged] = await Promise.all([
    db.errorLog.groupBy({
      by: ['severity'],
      where: { timestamp: { gte: oneDayAgo } },
      _count: true
    }),
    db.errorLog.groupBy({
      by: ['type'],
      where: { timestamp: { gte: oneDayAgo } },
      _count: true
    }),
    db.errorLog.groupBy({
      by: ['endpoint'],
      where: { timestamp: { gte: oneDayAgo } },
      _count: { endpoint: true },
      orderBy: { _count: { endpoint: 'desc' } },
      take: 10
    }),
    db.errorLog.count({
      where: { timestamp: { gte: oneDayAgo } }
    }),
    db.errorLog.count({
      where: { acknowledged: false }
    })
  ])

  return {
    total,
    unacknowledged,
    bySeverity: bySeverity.map(s => ({ severity: s.severity, count: s._count })),
    byType: byType.map(t => ({ type: t.type, count: t._count })),
    topEndpoints: topEndpoints.map(e => ({ endpoint: e.endpoint, count: e._count.endpoint })),
  }
}

async function getErrorPatterns() {
  const patterns = await db.errorPattern.findMany({
    include: {
      _count: { select: { ErrorLog: true } }
    },
    orderBy: { occurrenceCount: 'desc' },
    take: 20
  })

  return patterns.map(p => ({
    ...p,
    errorCount: p._count.ErrorLog
  }))
}

async function getRecentErrors(limit: number) {
  const errors = await db.errorLog.findMany({
    include: { ErrorPattern: true },
    orderBy: { timestamp: 'desc' },
    take: limit
  })

  return errors.map(e => ({
    ...e,
    context: JSON.parse(e.context),
    pattern: e.ErrorPattern ? {
      id: e.ErrorPattern.id,
      patternName: e.ErrorPattern.patternName,
      patternStatus: e.ErrorPattern.patternStatus
    } : null
  }))
}

async function getErrors(options: {
  severity?: string | null
  type?: string | null
  endpoint?: string | null
  limit: number
  offset: number
}) {
  const { severity, type, endpoint, limit, offset } = options

  const where: any = {}

  if (severity) where.severity = severity
  if (type) where.type = type
  if (endpoint) where.endpoint = { contains: endpoint }

  const errors = await db.errorLog.findMany({
    where,
    include: { ErrorPattern: true },
    orderBy: { timestamp: 'desc' },
    take: limit,
    skip: offset
  })

  return errors.map(e => ({
    ...e,
    context: JSON.parse(e.context),
    pattern: e.ErrorPattern ? {
      id: e.ErrorPattern.id,
      patternName: e.ErrorPattern.patternName
    } : null
  }))
}
