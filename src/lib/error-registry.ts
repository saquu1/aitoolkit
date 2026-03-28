/**
 * ERROR REGISTRY - Persistent Error Tracking & Management
 * =========================================================
 * 
 * This module provides:
 * 1. Error classification and categorization
 * 2. Known error pattern matching
 * 3. Solution suggestions
 * 4. Persistent error logging to database
 * 5. Error occurrence tracking
 * 
 * Usage:
 * ```typescript
 * import { logError, classifyError, getErrorSuggestions } from '@/lib/error-registry'
 * 
 * // Log an error
 * const logged = await logError(error, { source: 'API_MANAGEMENT', route: '/api/analytics' })
 * 
 * // Get suggestions for fixing
 * const suggestions = await getErrorSuggestions(logged.errorCode)
 * ```
 */

import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'
import type { ErrorCategory, ErrorSeverity, ErrorSource } from '@prisma/client'

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export interface ErrorContext {
  source: ErrorSource
  route?: string
  method?: string
  sessionId?: string
  userId?: string
  requestPayload?: any
  environment?: string
}

export interface KnownErrorPattern {
  code: string
  pattern: RegExp
  category: ErrorCategory
  severity: ErrorSeverity
  defaultMessage: string
  solution: string
  autoFixAction?: string
  preventionTips: string[]
  documentationUrl?: string
}

export interface ErrorStats {
  total: number
  unresolved: number
  byCategory: Record<string, number>
  bySeverity: Record<string, number>
  topErrors: Array<{
    errorCode: string
    message: string
    count: number
  }>
  recentErrors: Array<{
    id: string
    errorCode: string
    message: string
    lastSeen: Date
  }>
}

// =============================================================================
// KNOWN ERROR PATTERNS REGISTRY
// =============================================================================

const KNOWN_ERROR_PATTERNS: KnownErrorPattern[] = [
  // Prisma Database Errors
  {
    code: 'P1000',
    pattern: /Can't reach database server/i,
    category: 'PRISMA_CONNECTION',
    severity: 'CRITICAL',
    defaultMessage: 'Cannot reach database server',
    solution: 'Check if the database server is running and the connection string is correct.',
    preventionTips: [
      'Always verify DATABASE_URL in .env before starting',
      'Use connection pooling for production',
      'Implement health checks for database connectivity'
    ]
  },
  {
    code: 'P2002',
    pattern: /Unique constraint failed/i,
    category: 'PRISMA_CONSTRAINT',
    severity: 'MEDIUM',
    defaultMessage: 'Unique constraint violation',
    solution: 'Check if the record already exists before creating. Use upsert() for idempotent operations.',
    autoFixAction: 'check-duplicate',
    preventionTips: [
      'Use upsert() instead of create() for idempotent operations',
      'Check existence before creating with findUnique()',
      'Implement proper error handling for duplicate entries'
    ]
  },
  {
    code: 'P2003',
    pattern: /Foreign key constraint failed/i,
    category: 'PRISMA_CONSTRAINT',
    severity: 'MEDIUM',
    defaultMessage: 'Foreign key constraint violation',
    solution: 'Ensure the referenced record exists before creating a relation.',
    preventionTips: [
      'Verify parent record exists before creating child records',
      'Use transactions for operations affecting multiple tables',
      'Check cascade delete settings'
    ]
  },
  {
    code: 'P2005',
    pattern: /Invalid value for argument.*Expected/i,
    category: 'PRISMA_ENUM',
    severity: 'HIGH',
    defaultMessage: 'Invalid enum value provided',
    solution: 'Use the correct enum value from the Prisma schema. Import enums from @prisma/client.',
    autoFixAction: 'validate-enum',
    preventionTips: [
      'Import enum types from @prisma/client',
      'Use z.nativeEnum() in Zod schemas for validation',
      'Never hardcode string values for enum fields',
      'Run `npx prisma generate` after schema changes'
    ],
    documentationUrl: '/docs/error-management/prisma-enum'
  },
  {
    code: 'P2006',
    pattern: /Invalid value for field/i,
    category: 'PRISMA_VALIDATION',
    severity: 'HIGH',
    defaultMessage: 'Invalid field value',
    solution: 'Check the field type and provide a valid value.',
    preventionTips: [
      'Validate input data before database operations',
      'Use TypeScript strict mode',
      'Check Prisma schema for field constraints'
    ]
  },
  {
    code: 'P2011',
    pattern: /Null constraint violation/i,
    category: 'PRISMA_CONSTRAINT',
    severity: 'MEDIUM',
    defaultMessage: 'Required field cannot be null',
    solution: 'Provide a value for the required field.',
    preventionTips: [
      'Mark optional fields as nullable in schema',
      'Validate required fields before saving',
      'Use default values where appropriate'
    ]
  },
  {
    code: 'P2016',
    pattern: /Query interpretation error/i,
    category: 'PRISMA_QUERY',
    severity: 'HIGH',
    defaultMessage: 'Query interpretation error',
    solution: 'Check your Prisma query syntax and field names.',
    preventionTips: [
      'Verify field names match the Prisma schema',
      'Use TypeScript for query validation',
      'Check relation names in include/select'
    ]
  },
  {
    code: 'P2025',
    pattern: /Record not found/i,
    category: 'PRISMA_QUERY',
    severity: 'LOW',
    defaultMessage: 'Record not found',
    solution: 'Check if the record exists before operating on it.',
    preventionTips: [
      'Use findUnique() with null checks',
      'Implement proper 404 handling',
      'Verify ID format and existence'
    ]
  },
  {
    code: 'P2021',
    pattern: /Table does not exist/i,
    category: 'PRISMA_CONNECTION',
    severity: 'CRITICAL',
    defaultMessage: 'Table does not exist',
    solution: 'Run prisma db push or prisma migrate to sync the database.',
    autoFixAction: 'run-migrations',
    preventionTips: [
      'Run migrations after schema changes',
      'Use prisma db push in development',
      'Check database connection and schema'
    ]
  },

  // API Errors
  {
    code: 'API_401',
    pattern: /Unauthorized|not authenticated/i,
    category: 'API_UNAUTHORIZED',
    severity: 'MEDIUM',
    defaultMessage: 'Authentication required',
    solution: 'Ensure user is logged in. Create dev user for testing.',
    autoFixAction: 'create-dev-user',
    preventionTips: [
      'Check session before protected operations',
      'Use requireAuth() helper in API routes',
      'Test with dev user in development'
    ]
  },
  {
    code: 'API_403',
    pattern: /Forbidden|not allowed|access denied/i,
    category: 'API_FORBIDDEN',
    severity: 'MEDIUM',
    defaultMessage: 'Access denied',
    solution: 'Check user permissions and role requirements.',
    preventionTips: [
      'Implement role-based access control',
      'Check permissions before operations',
      'Use requireProjectAccess() helper'
    ]
  },
  {
    code: 'API_404',
    pattern: /not found/i,
    category: 'API_NOT_FOUND',
    severity: 'LOW',
    defaultMessage: 'Resource not found',
    solution: 'Check the URL and resource ID.',
    preventionTips: [
      'Verify resource exists before operations',
      'Use proper 404 responses',
      'Check route configuration'
    ]
  },
  {
    code: 'API_429',
    pattern: /rate limit|too many requests/i,
    category: 'API_RATE_LIMIT',
    severity: 'MEDIUM',
    defaultMessage: 'Rate limit exceeded',
    solution: 'Wait before retrying. Implement exponential backoff.',
    preventionTips: [
      'Implement client-side rate limiting',
      'Use exponential backoff for retries',
      'Cache responses to reduce API calls'
    ]
  },

  // Type Errors
  {
    code: 'TYPE_001',
    pattern: /Cannot read propert.*of undefined|undefined is not an object/i,
    category: 'NULL_REFERENCE',
    severity: 'HIGH',
    defaultMessage: 'Null or undefined reference',
    solution: 'Add null checks and optional chaining (?.) before accessing properties.',
    preventionTips: [
      'Use optional chaining (?.) for nested properties',
      'Add null checks before operations',
      'Use TypeScript strict null checks',
      'Initialize variables with default values'
    ]
  },
  {
    code: 'TYPE_002',
    pattern: /is not a function|TypeError.*not a function/i,
    category: 'TYPE_MISMATCH',
    severity: 'HIGH',
    defaultMessage: 'Type mismatch - expected function',
    solution: 'Verify the object type before calling methods.',
    preventionTips: [
      'Check object type before method calls',
      'Use type guards in TypeScript',
      'Validate API response shapes'
    ]
  },
  {
    code: 'TYPE_003',
    pattern: /JSON.*parse|Unexpected token/i,
    category: 'JSON_PARSE',
    severity: 'MEDIUM',
    defaultMessage: 'JSON parsing error',
    solution: 'Validate JSON before parsing. Use try-catch around JSON.parse().',
    preventionTips: [
      'Always wrap JSON.parse in try-catch',
      'Validate API responses before parsing',
      'Use Zod for JSON validation'
    ]
  },

  // External Service Errors
  {
    code: 'EXT_001',
    pattern: /fetch failed|network error|ECONNREFUSED/i,
    category: 'NETWORK_ERROR',
    severity: 'HIGH',
    defaultMessage: 'Network connection error',
    solution: 'Check network connectivity and external service availability.',
    preventionTips: [
      'Implement retry logic with backoff',
      'Add timeout to fetch requests',
      'Have fallback for external services'
    ]
  },
  {
    code: 'EXT_002',
    pattern: /timeout|ETIMEDOUT/i,
    category: 'API_TIMEOUT',
    severity: 'MEDIUM',
    defaultMessage: 'Request timeout',
    solution: 'Increase timeout or optimize the operation.',
    preventionTips: [
      'Set appropriate timeouts',
      'Implement request cancellation',
      'Use streaming for large responses'
    ]
  },

  // Default fallback
  {
    code: 'UNKNOWN',
    pattern: /.*/s,
    category: 'UNKNOWN',
    severity: 'MEDIUM',
    defaultMessage: 'An unexpected error occurred',
    solution: 'Check the error details and stack trace for more information.',
    preventionTips: [
      'Implement comprehensive error handling',
      'Log errors for debugging',
      'Use TypeScript for type safety'
    ]
  }
]

// =============================================================================
// ERROR CLASSIFICATION
// =============================================================================

/**
 * Classify an error based on its message and properties
 */
export function classifyError(error: unknown): {
  code: string
  category: ErrorCategory
  severity: ErrorSeverity
  message: string
  pattern?: KnownErrorPattern
} {
  // Get error message
  let message = 'Unknown error'
  let prismaCode: string | undefined

  if (error instanceof Error) {
    message = error.message

    // Check for Prisma error code
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      prismaCode = error.code
    }
  } else if (typeof error === 'string') {
    message = error
  }

  // If it's a known Prisma error code, use that directly
  if (prismaCode) {
    const knownPattern = KNOWN_ERROR_PATTERNS.find(p => p.code === prismaCode)
    if (knownPattern) {
      return {
        code: knownPattern.code,
        category: knownPattern.category,
        severity: knownPattern.severity,
        message: message || knownPattern.defaultMessage,
        pattern: knownPattern
      }
    }
  }

  // Pattern match against known errors
  for (const pattern of KNOWN_ERROR_PATTERNS) {
    if (pattern.pattern.test(message)) {
      return {
        code: pattern.code,
        category: pattern.category,
        severity: pattern.severity,
        message: message || pattern.defaultMessage,
        pattern
      }
    }
  }

  // Return unknown classification
  const unknownPattern = KNOWN_ERROR_PATTERNS.find(p => p.code === 'UNKNOWN')!
  return {
    code: 'UNKNOWN',
    category: 'UNKNOWN',
    severity: 'MEDIUM',
    message,
    pattern: unknownPattern
  }
}

// =============================================================================
// ERROR LOGGING
// =============================================================================

/**
 * Log an error to the database
 */
export async function logError(
  error: unknown,
  context: ErrorContext
): Promise<{
  id: string
  errorCode: string
  isNew: boolean
  occurrenceCount: number
}> {
  const classification = classifyError(error)
  const pattern = classification.pattern

  // Get stack trace
  const stackTrace = error instanceof Error ? error.stack : undefined

  // Sanitize request payload
  const sanitizedPayload = context.requestPayload
    ? JSON.stringify(sanitizePayload(context.requestPayload))
    : undefined

  // Check if similar error exists (by code and message)
  const existingError = await db.errorLog.findFirst({
    where: {
      errorCode: classification.code,
      message: classification.message,
      resolved: false
    },
    orderBy: { lastSeen: 'desc' }
  })

  if (existingError) {
    // Update occurrence count
    const updated = await db.errorLog.update({
      where: { id: existingError.id },
      data: {
        occurrenceCount: { increment: 1 },
        lastSeen: new Date(),
        route: context.route || existingError.route,
        method: context.method || existingError.method,
        sessionId: context.sessionId || existingError.sessionId,
        userId: context.userId || existingError.userId
      }
    })

    return {
      id: updated.id,
      errorCode: classification.code,
      isNew: false,
      occurrenceCount: updated.occurrenceCount
    }
  }

  // Create new error log
  const newError = await db.errorLog.create({
    data: {
      errorCode: classification.code,
      errorCategory: classification.category,
      severity: classification.severity,
      message: classification.message,
      stackTrace,
      source: context.source,
      route: context.route,
      method: context.method,
      sessionId: context.sessionId,
      userId: context.userId,
      requestPayload: sanitizedPayload,
      environment: context.environment || process.env.NODE_ENV || 'development',
      solution: pattern?.solution,
      autoFixAction: pattern?.autoFixAction,
      preventionTips: pattern?.preventionTips
        ? JSON.stringify(pattern.preventionTips)
        : undefined,
      documentationUrl: pattern?.documentationUrl
    }
  })

  return {
    id: newError.id,
    errorCode: classification.code,
    isNew: true,
    occurrenceCount: 1
  }
}

/**
 * Sanitize payload to remove sensitive data
 */
function sanitizePayload(payload: any): any {
  if (!payload || typeof payload !== 'object') {
    return payload
  }

  const sensitiveKeys = [
    'password', 'token', 'secret', 'apiKey', 'api_key',
    'authorization', 'credit_card', 'ssn', 'auth'
  ]

  const sanitized: any = Array.isArray(payload) ? [] : {}

  for (const key of Object.keys(payload)) {
    if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
      sanitized[key] = '[REDACTED]'
    } else if (typeof payload[key] === 'object' && payload[key] !== null) {
      sanitized[key] = sanitizePayload(payload[key])
    } else {
      sanitized[key] = payload[key]
    }
  }

  return sanitized
}

// =============================================================================
// ERROR MANAGEMENT
// =============================================================================

/**
 * Get error suggestions based on error code
 */
export async function getErrorSuggestions(errorCode: string): Promise<{
  solution?: string
  preventionTips: string[]
  autoFixAction?: string
  documentationUrl?: string
  similarErrors: Array<{ id: string; message: string; occurrenceCount: number }>
}> {
  const pattern = KNOWN_ERROR_PATTERNS.find(p => p.code === errorCode)

  // Find similar unresolved errors
  const similarErrors = await db.errorLog.findMany({
    where: {
      errorCode,
      resolved: false
    },
    select: {
      id: true,
      message: true,
      occurrenceCount: true
    },
    orderBy: { occurrenceCount: 'desc' },
    take: 5
  })

  return {
    solution: pattern?.solution,
    preventionTips: pattern?.preventionTips || [],
    autoFixAction: pattern?.autoFixAction,
    documentationUrl: pattern?.documentationUrl,
    similarErrors
  }
}

/**
 * Mark an error as resolved
 */
export async function resolveError(
  errorId: string,
  resolvedBy?: string,
  resolution?: string
): Promise<boolean> {
  try {
    await db.errorLog.update({
      where: { id: errorId },
      data: {
        resolved: true,
        resolvedAt: new Date(),
        resolvedBy,
        solution: resolution
      }
    })
    return true
  } catch {
    return false
  }
}

/**
 * Get error statistics
 */
export async function getErrorStats(days: number = 30): Promise<ErrorStats> {
  const since = new Date()
  since.setDate(since.getDate() - days)

  const [total, unresolved, byCategory, bySeverity, topErrors, recentErrors] = await Promise.all([
    // Total errors
    db.errorLog.count({
      where: { firstSeen: { gte: since } }
    }),

    // Unresolved errors
    db.errorLog.count({
      where: { resolved: false, firstSeen: { gte: since } }
    }),

    // By category
    db.errorLog.groupBy({
      by: ['errorCategory'],
      where: { firstSeen: { gte: since } },
      _count: { id: true }
    }),

    // By severity
    db.errorLog.groupBy({
      by: ['severity'],
      where: { firstSeen: { gte: since } },
      _count: { id: true }
    }),

    // Top errors
    db.errorLog.groupBy({
      by: ['errorCode', 'message'],
      where: { firstSeen: { gte: since } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10
    }),

    // Recent errors
    db.errorLog.findMany({
      where: { firstSeen: { gte: since } },
      select: {
        id: true,
        errorCode: true,
        message: true,
        lastSeen: true
      },
      orderBy: { lastSeen: 'desc' },
      take: 10
    })
  ])

  return {
    total,
    unresolved,
    byCategory: Object.fromEntries(
      byCategory.map(c => [c.errorCategory, c._count.id])
    ),
    bySeverity: Object.fromEntries(
      bySeverity.map(s => [s.severity, s._count.id])
    ),
    topErrors: topErrors.map(e => ({
      errorCode: e.errorCode,
      message: e.message,
      count: e._count.id
    })),
    recentErrors
  }
}

/**
 * Get paginated error list
 */
export async function getErrors(options: {
  resolved?: boolean
  category?: ErrorCategory
  severity?: ErrorSeverity
  source?: ErrorSource
  search?: string
  limit?: number
  offset?: number
} = {}): Promise<{
  errors: Array<any>
  total: number
  hasMore: boolean
}> {
  const { resolved, category, severity, source, search, limit = 20, offset = 0 } = options

  const where: any = {}
  if (resolved !== undefined) where.resolved = resolved
  if (category) where.errorCategory = category
  if (severity) where.severity = severity
  if (source) where.source = source
  if (search) {
    where.OR = [
      { message: { contains: search } },
      { errorCode: { contains: search } }
    ]
  }

  const [errors, total] = await Promise.all([
    db.errorLog.findMany({
      where,
      orderBy: { lastSeen: 'desc' },
      take: limit,
      skip: offset
    }),
    db.errorLog.count({ where })
  ])

  return {
    errors,
    total,
    hasMore: offset + limit < total
  }
}

/**
 * Clean up old resolved errors
 */
export async function cleanupOldErrors(daysToKeep: number = 90): Promise<number> {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - daysToKeep)

  const result = await db.errorLog.deleteMany({
    where: {
      resolved: true,
      resolvedAt: { lt: cutoff }
    }
  })

  return result.count
}

// =============================================================================
// ENUM VALIDATION HELPER
// =============================================================================

/**
 * Validate if a value is a valid enum value
 */
export function isValidEnum<T extends Record<string, string>>(
  value: string,
  enumObj: T
): value is T[keyof T] {
  return Object.values(enumObj).includes(value)
}

/**
 * Get valid enum values for display
 */
export function getValidEnumValues<T extends Record<string, string>>(
  enumObj: T
): string[] {
  return Object.values(enumObj)
}

/**
 * Safe enum value with fallback
 */
export function safeEnum<T extends Record<string, string>>(
  value: string | undefined | null,
  enumObj: T,
  fallback: T[keyof T]
): T[keyof T] {
  if (value && isValidEnum(value, enumObj)) {
    return value
  }
  return fallback
}
