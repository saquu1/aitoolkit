/**
 * ERROR REGISTRY API
 * ==================
 * REST API for error management
 * 
 * Endpoints:
 * - GET  ?action=stats          - Get error statistics
 * - GET  ?action=list           - List errors with filtering
 * - GET  ?action=get&id=xxx     - Get single error
 * - GET  ?action=suggestions    - Get suggestions for error message
 * - POST ?action=log            - Log a new error
 * - POST ?action=resolve        - Resolve an error
 * - POST ?action=bulk-resolve   - Bulk resolve errors
 * - POST ?action=cleanup        - Clean up old errors
 */

import { NextRequest, NextResponse } from 'next/server'
import { errorRegistry } from '@/lib/error-management/error-registry'
import { ErrorCategory, ErrorSeverity, ErrorSource } from '@prisma/client'

// =============================================================================
// GET HANDLER
// =============================================================================

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action') || 'stats'

  try {
    switch (action) {
      case 'stats':
        return handleGetStats()
      
      case 'list':
        return handleListErrors(searchParams)
      
      case 'get':
        return handleGetError(searchParams)
      
      case 'suggestions':
        return handleGetSuggestions(searchParams)
      
      case 'categories':
        return handleGetCategories()
      
      case 'severities':
        return handleGetSeverities()
      
      case 'sources':
        return handleGetSources()
      
      default:
        return NextResponse.json({ 
          success: false, 
          error: 'Unknown action' 
        }, { status: 400 })
    }
  } catch (error) {
    console.error('Error Registry API error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// =============================================================================
// POST HANDLER
// =============================================================================

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action') || 'log'

  try {
    const body = await request.json()

    switch (action) {
      case 'log':
        return handleLogError(body)
      
      case 'resolve':
        return handleResolveError(body)
      
      case 'bulk-resolve':
        return handleBulkResolve(body)
      
      case 'cleanup':
        return handleCleanup(body)
      
      case 'log-from-error':
        return handleLogFromError(body)
      
      default:
        return NextResponse.json({ 
          success: false, 
          error: 'Unknown action' 
        }, { status: 400 })
    }
  } catch (error) {
    console.error('Error Registry API error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// =============================================================================
// HANDLERS
// =============================================================================

async function handleGetStats() {
  const stats = await errorRegistry.getStats()
  return NextResponse.json({ success: true, data: stats })
}

async function handleListErrors(searchParams: URLSearchParams) {
  const query = {
    category: searchParams.get('category') as ErrorCategory | undefined,
    severity: searchParams.get('severity') as ErrorSeverity | undefined,
    source: searchParams.get('source') as ErrorSource | undefined,
    resolved: searchParams.get('resolved') === 'true' ? true : 
              searchParams.get('resolved') === 'false' ? false : undefined,
    errorCode: searchParams.get('errorCode') || undefined,
    search: searchParams.get('search') || undefined,
    limit: parseInt(searchParams.get('limit') || '50'),
    offset: parseInt(searchParams.get('offset') || '0'),
    sortBy: (searchParams.get('sortBy') || 'lastSeen') as 'lastSeen' | 'occurrenceCount' | 'severity' | 'firstSeen',
    sortOrder: (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc'
  }

  const result = await errorRegistry.getErrors(query)
  return NextResponse.json({ success: true, data: result })
}

async function handleGetError(searchParams: URLSearchParams) {
  const id = searchParams.get('id')
  if (!id) {
    return NextResponse.json({ 
      success: false, 
      error: 'id parameter required' 
    }, { status: 400 })
  }

  const error = await errorRegistry.getError(id)
  if (!error) {
    return NextResponse.json({ 
      success: false, 
      error: 'Error not found' 
    }, { status: 404 })
  }

  return NextResponse.json({ success: true, data: error })
}

async function handleGetSuggestions(searchParams: URLSearchParams) {
  const message = searchParams.get('message')
  if (!message) {
    return NextResponse.json({ 
      success: false, 
      error: 'message parameter required' 
    }, { status: 400 })
  }

  const suggestions = await errorRegistry.getSuggestions(message)
  return NextResponse.json({ success: true, data: suggestions })
}

async function handleGetCategories() {
  const categories = Object.values(ErrorCategory)
  return NextResponse.json({ success: true, data: categories })
}

async function handleGetSeverities() {
  const severities = Object.values(ErrorSeverity)
  return NextResponse.json({ success: true, data: severities })
}

async function handleGetSources() {
  const sources = Object.values(ErrorSource)
  return NextResponse.json({ success: true, data: sources })
}

async function handleLogError(body: any) {
  if (!body.message) {
    return NextResponse.json({ 
      success: false, 
      error: 'message is required' 
    }, { status: 400 })
  }

  const error = await errorRegistry.log({
    message: body.message,
    category: body.category || 'UNKNOWN',
    severity: body.severity || 'MEDIUM',
    source: body.source || 'API_MANAGEMENT',
    ...body
  })

  return NextResponse.json({ 
    success: true, 
    data: error 
  })
}

async function handleResolveError(body: { id: string; userId?: string; resolution?: string }) {
  if (!body.id) {
    return NextResponse.json({ 
      success: false, 
      error: 'id is required' 
    }, { status: 400 })
  }

  const error = await errorRegistry.resolve(body.id, body.userId, body.resolution)
  return NextResponse.json({ success: true, data: error })
}

async function handleBulkResolve(body: { ids: string[]; userId?: string }) {
  if (!body.ids || !Array.isArray(body.ids)) {
    return NextResponse.json({ 
      success: false, 
      error: 'ids array is required' 
    }, { status: 400 })
  }

  const result = await errorRegistry.bulkResolve(body.ids, body.userId)
  return NextResponse.json({ 
    success: true, 
    data: { count: result.count } 
  })
}

async function handleCleanup(body: { daysToKeep?: number }) {
  const result = await errorRegistry.cleanup(body.daysToKeep || 30)
  return NextResponse.json({ 
    success: true, 
    data: { deleted: result.count } 
  })
}

/**
 * Special handler for logging caught errors with full context
 */
async function handleLogFromError(body: {
  error: {
    message: string
    stack?: string
    code?: string
  }
  context?: {
    route?: string
    method?: string
    body?: any
    query?: Record<string, string>
    userId?: string
  }
}) {
  const { error, context } = body

  // Determine category from error
  let category: ErrorCategory = 'UNKNOWN'
  let severity: ErrorSeverity = 'MEDIUM'
  let errorCode = error.code || 'UNKNOWN'

  // Check for Prisma errors
  if (error.message.includes('Prisma') || error.code?.startsWith('P')) {
    if (error.message.includes('Invalid value')) {
      category = 'PRISMA_ENUM'
      errorCode = 'P2005'
    } else if (error.message.includes('Unique constraint')) {
      category = 'PRISMA_CONSTRAINT'
      errorCode = 'P2002'
      severity = 'MEDIUM'
    } else if (error.message.includes('Foreign key')) {
      category = 'PRISMA_CONSTRAINT'
      errorCode = 'P2003'
      severity = 'HIGH'
    } else if (error.message.includes('Record') && error.message.includes('not found')) {
      category = 'PRISMA_QUERY'
      errorCode = 'P2025'
      severity = 'LOW'
    } else if (error.message.includes("Can't reach database")) {
      category = 'PRISMA_CONNECTION'
      errorCode = 'P1001'
      severity = 'CRITICAL'
    } else {
      category = 'PRISMA_QUERY'
    }
  }

  const logged = await errorRegistry.log({
    message: error.message,
    stackTrace: error.stack,
    errorCode,
    category,
    severity,
    source: 'API_MANAGEMENT',
    route: context?.route,
    method: context?.method,
    requestPayload: context?.body ? JSON.stringify(context.body) : undefined,
    userId: context?.userId
  })

  // Get suggestions for this error
  const suggestions = await errorRegistry.getSuggestions(error.message)

  return NextResponse.json({
    success: true,
    data: {
      logged,
      suggestions
    }
  })
}
