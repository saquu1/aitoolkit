/**
 * API ERROR HANDLER
 * ==================
 * Connects API management to error registry
 * 
 * Features:
 * - Automatic error logging to registry
 * - Pre-query enum validation
 * - Structured error responses
 * - Request context tracking
 */

import { NextRequest, NextResponse } from 'next/server'
import { errorRegistry } from './error-registry'
import { validateEnum, isValidEnum, PrismaEnumName, PRISMA_ENUMS } from './enum-validator'

// =============================================================================
// TYPES
// =============================================================================

export interface ApiErrorContext {
  route: string
  method: string
  userId?: string
  sessionId?: string
  requestId?: string
  body?: any
  query?: Record<string, string>
}

export interface ApiErrorResponse {
  success: false
  error: {
    code: string
    message: string
    details?: any
    suggestion?: string
    documentation?: string
  }
  requestId?: string
}

export interface WrappedHandler {
  (req: NextRequest, context?: any): Promise<NextResponse>
}

// =============================================================================
// ERROR CODE REGISTRY
// =============================================================================

export const API_ERROR_CODES = {
  // Validation Errors (1xxx)
  VALIDATION_ERROR: { code: 'E1000', message: 'Validation failed', status: 400 },
  INVALID_ENUM: { code: 'E1001', message: 'Invalid enum value', status: 400 },
  MISSING_PARAMETER: { code: 'E1002', message: 'Missing required parameter', status: 400 },
  INVALID_FORMAT: { code: 'E1003', message: 'Invalid format', status: 400 },
  
  // Authentication Errors (2xxx)
  UNAUTHORIZED: { code: 'E2000', message: 'Unauthorized', status: 401 },
  FORBIDDEN: { code: 'E2001', message: 'Forbidden', status: 403 },
  INVALID_TOKEN: { code: 'E2002', message: 'Invalid token', status: 401 },
  TOKEN_EXPIRED: { code: 'E2003', message: 'Token expired', status: 401 },
  
  // Not Found Errors (3xxx)
  NOT_FOUND: { code: 'E3000', message: 'Resource not found', status: 404 },
  RECORD_NOT_FOUND: { code: 'E3001', message: 'Record not found', status: 404 },
  
  // Database Errors (4xxx)
  DATABASE_ERROR: { code: 'E4000', message: 'Database error', status: 500 },
  PRISMA_ERROR: { code: 'E4001', message: 'Database query error', status: 500 },
  UNIQUE_VIOLATION: { code: 'E4002', message: 'Record already exists', status: 409 },
  FK_VIOLATION: { code: 'E4003', message: 'Foreign key constraint violation', status: 400 },
  
  // Server Errors (5xxx)
  INTERNAL_ERROR: { code: 'E5000', message: 'Internal server error', status: 500 },
  SERVICE_UNAVAILABLE: { code: 'E5001', message: 'Service unavailable', status: 503 },
  TIMEOUT: { code: 'E5002', message: 'Request timeout', status: 504 },
} as const

// =============================================================================
// ERROR HANDLER
// =============================================================================

/**
 * Log an API error to the registry and return structured response
 */
export async function handleApiError(
  error: Error | unknown,
  context: ApiErrorContext
): Promise<NextResponse<ApiErrorResponse>> {
  const requestId = context.requestId || generateRequestId()
  
  // Determine error type and map to code
  let errorCode = API_ERROR_CODES.INTERNAL_ERROR
  let errorCategory = 'RUNTIME_ERROR'
  let errorSeverity = 'HIGH'
  let details: any = {}

  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    
    // Prisma errors
    if (message.includes('prisma') || error.message.match(/^P\d+/)) {
      errorCode = API_ERROR_CODES.PRISMA_ERROR
      errorCategory = 'PRISMA_QUERY'
      
      if (message.includes('unique constraint') || message.includes('P2002')) {
        errorCode = API_ERROR_CODES.UNIQUE_VIOLATION
        errorCategory = 'PRISMA_CONSTRAINT'
        errorSeverity = 'MEDIUM'
      } else if (message.includes('foreign key') || message.includes('P2003')) {
        errorCode = API_ERROR_CODES.FK_VIOLATION
        errorCategory = 'PRISMA_CONSTRAINT'
        errorSeverity = 'HIGH'
      } else if (message.includes('invalid value') || message.includes('expected')) {
        errorCode = API_ERROR_CODES.INVALID_ENUM
        errorCategory = 'ENUM_MISMATCH'
        errorSeverity = 'MEDIUM'
      } else if (message.includes('not found') || message.includes('P2025')) {
        errorCode = API_ERROR_CODES.RECORD_NOT_FOUND
        errorCategory = 'PRISMA_QUERY'
        errorSeverity = 'LOW'
      }
    }
    // Validation errors
    else if (message.includes('validation') || message.includes('invalid')) {
      errorCode = API_ERROR_CODES.VALIDATION_ERROR
      errorCategory = 'INPUT_VALIDATION'
      errorSeverity = 'MEDIUM'
    }
    // Auth errors
    else if (message.includes('unauthorized') || message.includes('auth')) {
      errorCode = API_ERROR_CODES.UNAUTHORIZED
      errorCategory = 'API_UNAUTHORIZED'
      errorSeverity = 'HIGH'
    }
    // Not found
    else if (message.includes('not found')) {
      errorCode = API_ERROR_CODES.NOT_FOUND
      errorCategory = 'API_NOT_FOUND'
      errorSeverity = 'LOW'
    }

    details.originalMessage = error.message
  }

  // Log to error registry
  try {
    await errorRegistry.log({
      message: error instanceof Error ? error.message : 'Unknown error',
      category: errorCategory,
      severity: errorSeverity,
      source: 'API_MANAGEMENT',
      errorCode: errorCode.code,
      details: JSON.stringify(details),
      stackTrace: error instanceof Error ? error.stack : undefined,
      route: context.route,
      method: context.method,
      sessionId: context.sessionId,
      userId: context.userId,
      requestPayload: context.body ? sanitizePayload(context.body) : undefined,
      solution: getSolutionSuggestion(errorCode.code),
      preventionTips: getPreventionTips(errorCode.code)
    })
  } catch (logError) {
    console.error('Failed to log error to registry:', logError)
  }

  // Return structured error response
  const response: ApiErrorResponse = {
    success: false,
    error: {
      code: errorCode.code,
      message: error instanceof Error ? error.message : errorCode.message,
      details: process.env.NODE_ENV === 'development' ? details : undefined,
      suggestion: getSolutionSuggestion(errorCode.code),
      documentation: getDocumentationUrl(errorCode.code)
    },
    requestId
  }

  return NextResponse.json(response, { status: errorCode.status })
}

// =============================================================================
// API WRAPPER
// =============================================================================

/**
 * Wrap an API handler with automatic error handling
 * 
 * @example
 * export const GET = withErrorHandler(async (req) => {
 *   const data = await db.users.findMany()
 *   return NextResponse.json({ success: true, data })
 * })
 */
export function withErrorHandler(
  handler: WrappedHandler,
  options?: {
    route?: string
    requireAuth?: boolean
    validateEnums?: Record<string, PrismaEnumName>
  }
): WrappedHandler {
  return async (req: NextRequest, context?: any) => {
    const startTime = Date.now()
    const requestId = generateRequestId()
    
    // Build context
    const apiContext: ApiErrorContext = {
      route: options?.route || req.nextUrl.pathname,
      method: req.method,
      requestId
    }

    try {
      // Parse body for POST/PUT/PATCH
      if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
        try {
          apiContext.body = await req.clone().json()
        } catch {
          // Body might not be JSON
        }
      }

      // Parse query params
      apiContext.query = Object.fromEntries(req.nextUrl.searchParams.entries())

      // Validate enums if specified
      if (options?.validateEnums && apiContext.body) {
        for (const [field, enumName] of Object.entries(options.validateEnums)) {
          if (apiContext.body[field]) {
            if (!isValidEnum(enumName, apiContext.body[field])) {
              const validValues = getEnumValuesString(enumName)
              throw new Error(
                `Invalid value "${apiContext.body[field]}" for ${field}. ` +
                `Valid values: ${validValues}`
              )
            }
          }
        }
      }

      // Execute handler
      const response = await handler(req, context)
      
      // Log slow requests
      const duration = Date.now() - startTime
      if (duration > 5000) {
        console.warn(`Slow API request: ${apiContext.route} took ${duration}ms`)
      }

      return response

    } catch (error) {
      return handleApiError(error, apiContext)
    }
  }
}

// =============================================================================
// PRISMA QUERY WRAPPER
// =============================================================================

/**
 * Wrap Prisma queries with automatic error handling
 * 
 * @example
 * const result = await safeQuery(
 *   () => db.aIPattern.findMany({ where: { status: 'ACTIVE' } }),
 *   { enumValidations: { status: 'PatternStatus' } }
 * )
 */
export async function safeQuery<T>(
  queryFn: () => Promise<T>,
  options?: {
    enumValidations?: Record<string, PrismaEnumName>
    context?: Partial<ApiErrorContext>
  }
): Promise<T> {
  try {
    return await queryFn()
  } catch (error) {
    // Log to registry
    if (error instanceof Error) {
      errorRegistry.log({
        message: error.message,
        category: categorizePrismaError(error),
        severity: 'MEDIUM',
        source: 'API_MANAGEMENT',
        errorCode: extractPrismaErrorCode(error),
        stackTrace: error.stack,
        route: options?.context?.route,
        method: options?.context?.method,
        solution: getSolutionForPrismaError(error)
      }).catch(() => {})
    }
    
    throw error
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

function sanitizePayload(payload: any): string {
  const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'authorization', 'credential']
  const sanitized = { ...payload }
  
  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]'
    }
  }
  
  return JSON.stringify(sanitized)
}

function getSolutionSuggestion(code: string): string {
  const solutions: Record<string, string> = {
    'E1001': 'Check the valid enum values and use the correct one from @prisma/client',
    'E1002': 'Provide all required parameters in your request',
    'E2000': 'Include valid authentication credentials',
    'E2001': 'You do not have permission to access this resource',
    'E3001': 'The requested record does not exist or has been deleted',
    'E4002': 'A record with this value already exists. Use a different value or update existing.',
    'E4003': 'The referenced record does not exist. Create it first or use a valid reference.',
  }
  
  return solutions[code] || 'Check your request and try again'
}

function getPreventionTips(code: string): string[] {
  const tips: Record<string, string[]> = {
    'E1001': [
      'Import enum types from @prisma/client',
      'Use validateEnum() before database queries',
      'Add TypeScript type checking',
      'Use Zod schema validation with z.nativeEnum()'
    ],
    'E4002': [
      'Use upsert() instead of create() for potentially duplicate records',
      'Check for existence before creating',
      'Use unique constraints in your schema'
    ],
    'E4003': [
      'Create parent records before child records',
      'Use transactions for related operations',
      'Validate foreign key references before insert'
    ]
  }
  
  return tips[code] || []
}

function getDocumentationUrl(code: string): string {
  return `/docs/errors/${code}`
}

function getEnumValuesString(enumName: PrismaEnumName): string {
  return PRISMA_ENUMS[enumName]?.join(', ') || 'unknown'
}

function categorizePrismaError(error: Error): string {
  const message = error.message.toLowerCase()
  
  if (message.includes('unique')) return 'PRISMA_CONSTRAINT'
  if (message.includes('foreign key')) return 'PRISMA_CONSTRAINT'
  if (message.includes('invalid value') || message.includes('expected')) return 'ENUM_MISMATCH'
  if (message.includes('not found')) return 'PRISMA_QUERY'
  if (message.includes("can't reach")) return 'PRISMA_CONNECTION'
  
  return 'PRISMA_QUERY'
}

function extractPrismaErrorCode(error: Error): string {
  const match = error.message.match(/P\d+/)
  return match ? match[0] : 'P0000'
}

function getSolutionForPrismaError(error: Error): string {
  const code = extractPrismaErrorCode(error)
  
  const solutions: Record<string, string> = {
    'P2002': 'Use upsert() or check for existence before creating',
    'P2003': 'Create the referenced record first',
    'P2005': 'Use the correct enum value from @prisma/client',
    'P2025': 'Check if the record exists before updating/deleting',
    'P1001': 'Check DATABASE_URL and ensure database server is running',
  }
  
  return solutions[code] || 'Review the error message and fix the query'
}

// =============================================================================
// EXPORTS
// =============================================================================

export {
  handleApiError,
  withErrorHandler,
  safeQuery,
  API_ERROR_CODES
}
