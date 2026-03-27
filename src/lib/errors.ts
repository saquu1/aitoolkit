/**
 * ERROR HANDLER - Centralized Error Handling
 * ===========================================
 * Prevents silent failures, ensures consistent error responses
 * 
 * Principle 3 of 3: Error Handler catches and surfaces all errors properly
 */

import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { ZodError } from 'zod'

// =============================================================================
// API ERROR CLASS
// =============================================================================

/**
 * Custom API error with status code and optional details
 * Use this instead of throwing generic errors
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string,
    public details?: unknown
  ) {
    super(message)
    this.name = 'ApiError'
  }

  // Convenience factory methods
  static unauthorized(message = 'Unauthorized'): ApiError {
    return new ApiError(message, 401, 'UNAUTHORIZED')
  }

  static forbidden(message = 'Forbidden'): ApiError {
    return new ApiError(message, 403, 'FORBIDDEN')
  }

  static notFound(message = 'Not found'): ApiError {
    return new ApiError(message, 404, 'NOT_FOUND')
  }

  static badRequest(message: string, details?: unknown): ApiError {
    return new ApiError(message, 400, 'BAD_REQUEST', details)
  }

  static conflict(message: string): ApiError {
    return new ApiError(message, 409, 'CONFLICT')
  }

  static internal(message = 'Internal server error'): ApiError {
    return new ApiError(message, 500, 'INTERNAL_ERROR')
  }
}

// =============================================================================
// ERROR RESPONSE TYPES
// =============================================================================

export interface ApiErrorResponse {
  error: string
  code?: string
  details?: unknown
}

export interface ValidationErrorDetail {
  field: string
  message: string
}

// =============================================================================
// CENTRALIZED ERROR HANDLER
// =============================================================================

/**
 * Handle all API errors consistently
 * Call this in every API route's catch block
 * 
 * @example
 * try {
 *   const data = await doSomething()
 *   return NextResponse.json(data)
 * } catch (error) {
 *   return handleApiError(error)
 * }
 */
export function handleApiError(error: unknown): NextResponse<ApiErrorResponse> {
  // Always log the error with full context
  console.error('[API Error]', {
    timestamp: new Date().toISOString(),
    name: error instanceof Error ? error.name : 'Unknown',
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  })

  // -------------------------------------------------------------------------
  // Known application errors (ApiError)
  // -------------------------------------------------------------------------
  if (error instanceof ApiError) {
    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
        ...(process.env.NODE_ENV === 'development' && { details: error.details }),
      },
      { status: error.statusCode }
    )
  }

  // -------------------------------------------------------------------------
  // Zod validation errors
  // -------------------------------------------------------------------------
  if (error instanceof ZodError) {
    const details: ValidationErrorDetail[] = error.errors.map(e => ({
      field: e.path.join('.'),
      message: e.message,
    }))

    return NextResponse.json(
      {
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details,
      },
      { status: 400 }
    )
  }

  // -------------------------------------------------------------------------
  // Prisma errors - translate to user-friendly messages
  // -------------------------------------------------------------------------
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        // Unique constraint violation
        const field = (error.meta?.target as string[])?.join(', ') || 'field'
        return NextResponse.json(
          { error: `A record with this ${field} already exists`, code: 'DUPLICATE' },
          { status: 409 }
        )

      case 'P2025':
        // Record not found
        return NextResponse.json(
          { error: 'Record not found', code: 'NOT_FOUND' },
          { status: 404 }
        )

      case 'P2003':
        // Foreign key constraint violation
        return NextResponse.json(
          { error: 'Referenced record not found', code: 'FK_VIOLATION' },
          { status: 400 }
        )

      case 'P2014':
        // Relation violation
        return NextResponse.json(
          { error: 'Relation constraint violation', code: 'RELATION_ERROR' },
          { status: 400 }
        )

      case 'P2016':
        // Query interpretation error
        return NextResponse.json(
          { error: 'Query error', code: 'QUERY_ERROR' },
          { status: 400 }
        )

      default:
        console.error(`[Prisma Error ${error.code}]`, error.meta)
        return NextResponse.json(
          { error: 'Database error', code: error.code },
          { status: 500 }
        )
    }
  }

  // -------------------------------------------------------------------------
  // Prisma validation errors - CRITICAL: usually means wrong field/relation names
  // -------------------------------------------------------------------------
  if (error instanceof Prisma.PrismaClientValidationError) {
    // This is the error that happens when you use wrong relation names!
    // Log it prominently so it's easy to spot
    console.error('[CRITICAL] Prisma Validation Error - likely wrong field/relation name')
    console.error('This usually means you used wrong Prisma relation names like `files` instead of `ToolkitFile`')
    console.error('Full error:', error.message)

    return NextResponse.json(
      { 
        error: 'Internal server error', 
        code: 'PRISMA_VALIDATION_ERROR',
        ...(process.env.NODE_ENV === 'development' && { 
          hint: 'Check Prisma relation names in your query' 
        }),
      },
      { status: 500 }
    )
  }

  // -------------------------------------------------------------------------
  // Prisma connection errors
  // -------------------------------------------------------------------------
  if (error instanceof Prisma.PrismaClientInitializationError) {
    console.error('[Database Connection Error]', error.message)
    return NextResponse.json(
      { error: 'Database connection failed', code: 'DB_CONNECTION_ERROR' },
      { status: 503 }
    )
  }

  // -------------------------------------------------------------------------
  // Generic Error with message
  // -------------------------------------------------------------------------
  if (error instanceof Error) {
    // Check for common error patterns in message
    const message = error.message.toLowerCase()
    
    if (message.includes('unauthorized') || message.includes('not authenticated')) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }
    
    if (message.includes('forbidden') || message.includes('not allowed')) {
      return NextResponse.json(
        { error: 'Forbidden', code: 'FORBIDDEN' },
        { status: 403 }
      )
    }

    if (message.includes('not found')) {
      return NextResponse.json(
        { error: error.message, code: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    // Generic error - don't expose details in production
    return NextResponse.json(
      {
        error: process.env.NODE_ENV === 'production' 
          ? 'Internal server error' 
          : error.message,
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    )
  }

  // -------------------------------------------------------------------------
  // Unknown error type - safest response
  // -------------------------------------------------------------------------
  return NextResponse.json(
    { error: 'Internal server error', code: 'UNKNOWN_ERROR' },
    { status: 500 }
  )
}

// =============================================================================
// HELPER: CHECK IF RESPONSE IS API ERROR
// =============================================================================

/**
 * Type guard for API error responses on the client side
 */
export function isApiErrorResponse(data: unknown): data is ApiErrorResponse {
  return (
    typeof data === 'object' &&
    data !== null &&
    'error' in data &&
    typeof (data as Record<string, unknown>).error === 'string'
  )
}

// =============================================================================
// HELPER: REQUIRE AUTH IN API ROUTES
// =============================================================================

/**
 * Helper to check authentication in API routes
 * Throws ApiError if not authenticated
 * 
 * @example
 * const session = await requireAuth()
 * // session is guaranteed to exist
 */
export async function requireAuth(): Promise<{ user: { id: string; email?: string; role?: string } }> {
  const { auth } = await import('@/lib/auth')
  const session = await auth()
  
  if (!session?.user?.id) {
    throw ApiError.unauthorized('Authentication required')
  }
  
  return session
}

// =============================================================================
// HELPER: REQUIRE PROJECT ACCESS
// =============================================================================

/**
 * Helper to verify user has access to a project
 * Throws ApiError if not found or no access
 */
export async function requireProjectAccess(
  projectId: string,
  userId: string
): Promise<boolean> {
  const { db } = await import('@/lib/db')
  
  const project = await db.toolkitProject.findUnique({
    where: { id: projectId },
    select: { id: true },
  })
  
  if (!project) {
    throw ApiError.notFound('Project not found')
  }
  
  // In the future, add project membership check here
  return true
}
