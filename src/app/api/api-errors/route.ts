/**
 * API ERROR REGISTRY ENDPOINT
 * ============================
 * Connects API Management to Error Registry
 * 
 * Endpoints:
 * - GET: Get errors from registry with filtering
 * - POST: Log a new API error
 * - PATCH: Resolve errors
 * - DELETE: Clear resolved errors
 */

import { NextRequest, NextResponse } from 'next/server'
import { errorRegistry } from '@/lib/error-management/error-registry'
import { withErrorHandler } from '@/lib/error-management/api-error-handler'
import { validateEnum, getEnumValues } from '@/lib/error-management/enum-validator'

// String-based enum values (Prisma uses strings, not enum types)
type ErrorCategory = string
type ErrorSeverity = string
type ErrorSource = string

// =============================================================================
// GET - Retrieve errors from registry
// =============================================================================

const getHandler = async (req: NextRequest) => {
  const searchParams = req.nextUrl.searchParams
  
  // Build query with enum validation
  const query = {
    category: searchParams.get('category') || undefined,
    severity: searchParams.get('severity') || undefined,
    source: searchParams.get('source') || undefined,
    resolved: searchParams.get('resolved') === 'true' ? true : 
              searchParams.get('resolved') === 'false' ? false : undefined,
    errorCode: searchParams.get('errorCode') || undefined,
    search: searchParams.get('search') || undefined,
    limit: parseInt(searchParams.get('limit') || '50'),
    offset: parseInt(searchParams.get('offset') || '0'),
    sortBy: (searchParams.get('sortBy') as 'lastSeen' | 'occurrenceCount' | 'severity' | 'firstSeen') || 'lastSeen',
    sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc'
  }

  // Validate enum parameters if provided
  if (query.category && !validateEnum('ErrorCategory', query.category, undefined, { route: '/api/api-errors' })) {
    // Use safe fallback
    query.category = undefined
  }
  if (query.severity && !validateEnum('ErrorSeverity', query.severity, undefined, { route: '/api/api-errors' })) {
    query.severity = undefined
  }
  if (query.source && !validateEnum('ErrorSource', query.source, undefined, { route: '/api/api-errors' })) {
    query.source = undefined
  }

  const [errorsResult, stats] = await Promise.all([
    errorRegistry.getErrors(query),
    errorRegistry.getStats()
  ])

  return NextResponse.json({
    success: true,
    data: {
      errors: errorsResult.errors,
      total: errorsResult.total,
      stats,
      filters: {
        categories: getEnumValues('ErrorCategory'),
        severities: getEnumValues('ErrorSeverity'),
        sources: getEnumValues('ErrorSource')
      }
    }
  })
}

// =============================================================================
// POST - Log a new API error
// =============================================================================

const postHandler = async (req: NextRequest) => {
  const body = await req.json()
  
  // Validate required fields
  if (!body.message) {
    return NextResponse.json({
      success: false,
      error: 'Message is required'
    }, { status: 400 })
  }

  // Validate enums if provided
  const category = body.category ? 
    validateEnum('ErrorCategory', body.category, 'UNKNOWN', { route: '/api/api-errors' }) : 
    'UNKNOWN'
  
  const severity = body.severity ? 
    validateEnum('ErrorSeverity', body.severity, 'MEDIUM', { route: '/api/api-errors' }) : 
    'MEDIUM'
  
  const source = body.source ? 
    validateEnum('ErrorSource', body.source, 'API_MANAGEMENT', { route: '/api/api-errors' }) : 
    'API_MANAGEMENT'

  const error = await errorRegistry.log({
    message: body.message,
    category,
    severity,
    source,
    errorCode: body.errorCode,
    details: body.details ? JSON.stringify(body.details) : undefined,
    stackTrace: body.stackTrace,
    route: body.route,
    method: body.method,
    sessionId: body.sessionId,
    userId: body.userId,
    requestPayload: body.requestPayload ? JSON.stringify(body.requestPayload) : undefined,
    solution: body.solution,
    preventionTips: body.preventionTips
  })

  return NextResponse.json({
    success: true,
    data: error
  })
}

// =============================================================================
// PATCH - Resolve errors
// =============================================================================

const patchHandler = async (req: NextRequest) => {
  const body = await req.json()
  
  if (body.action === 'resolve' && body.ids) {
    // Bulk resolve
    const result = await errorRegistry.bulkResolve(body.ids, body.userId)
    return NextResponse.json({
      success: true,
      data: { resolved: result.count }
    })
  } else if (body.action === 'resolve' && body.id) {
    // Single resolve
    const result = await errorRegistry.resolve(body.id, body.userId, body.resolution)
    return NextResponse.json({
      success: true,
      data: result
    })
  } else if (body.action === 'get-suggestions' && body.message) {
    // Get fix suggestions
    const suggestions = await errorRegistry.getSuggestions(body.message)
    return NextResponse.json({
      success: true,
      data: { suggestions }
    })
  }

  return NextResponse.json({
    success: false,
    error: 'Invalid action'
  }, { status: 400 })
}

// =============================================================================
// DELETE - Clean up resolved errors
// =============================================================================

const deleteHandler = async (req: NextRequest) => {
  const searchParams = req.nextUrl.searchParams
  const daysToKeep = parseInt(searchParams.get('daysToKeep') || '30')
  
  const result = await errorRegistry.cleanup(daysToKeep)
  
  return NextResponse.json({
    success: true,
    data: { deleted: result.count }
  })
}

// =============================================================================
// EXPORT HANDLERS WITH ERROR WRAPPER
// =============================================================================

export const GET = withErrorHandler(getHandler, { route: '/api/api-errors' })
export const POST = withErrorHandler(postHandler, { route: '/api/api-errors' })
export const PATCH = withErrorHandler(patchHandler, { route: '/api/api-errors' })
export const DELETE = withErrorHandler(deleteHandler, { route: '/api/api-errors' })
